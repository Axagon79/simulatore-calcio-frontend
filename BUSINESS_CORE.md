# BUSINESS_CORE.md — AI Simulator

> Documento di riferimento per individuare il cuore business del progetto.
> NON sostituisce il grafo Graphify né la wiki: serve quando l'agente AI
> deve sapere "cosa è davvero importante" e non confondersi con la
> classifica god-node del grafo (che è strutturale, non semantica).
>
> Quando consultarlo:
> - Quando l'utente chiede priorità o roadmap
> - Quando si sta per definire qualcosa come "centrale" basandosi sul grafo
> - Prima di refactor importanti
> - Quando si valuta urgenza di un bug fix
>
> Ultimo aggiornamento: 23/05/2026

---

## Indice

**Cuore del prodotto** (le 8 cose senza le quali AI Simulator non esiste):
1. Pagina Pronostici (Best Picks)
2. Ecosistema di generazione pronostici
3. Pagina Calendario + Dettaglio Partita + Simulazione
4. Bollette
5. Pagina News
6. Odds Monitor / Quote Anomale
7. Integrazione AI trasversale

**Qualità trasversali** (caratteristiche che attraversano tutte le sezioni):
8. Coerenza grafica + AI specializzata per contesto

---

## 1. Pagina Pronostici (Best Picks)

Servita da due rotte parallele, divise per tipo di tab:

**`/best-picks` → `src/UnifiedPredictions.tsx`**
Tab: Pronostici, Elite, Alto Rendimento

**`/best-picks-v2` → `src/MixerPredictions.tsx`**
Tab: Mixer, Super Selection, AI OST

⚠️ Trappola importante per Claude:
Il tab "AI OST" che l'utente vede è **internamente ancora chiamato 'pme'** nel codice. Lo state React è `activeView === 'pme'`, l'URL è `?tab=pme`. Il rename è stato fatto il 14/05/2026 senza toccare le stringhe interne. Quindi:
- Se l'utente dice "AI OST" → cerca `'pme'` nel codice
- Se vedi `'pme'` nel codice → ricordati che l'utente lo chiama AI OST
- La sorgente dati di AI OST è **Sistema Z** (non più PME originale): endpoint `/simulation/sistema-z-predictions`

Routing definito in `src/main.tsx:111-112`:
```tsx
<Route path="/best-picks" element={<ProtectedRoute><UnifiedPredictions /></ProtectedRoute>} />
<Route path="/best-picks-v2" element={<ProtectedRoute><MixerPredictions /></ProtectedRoute>} />
```

File satelliti chiave:
- `src/components/ScoutAnalysis.tsx` — capsula Scout LITE/DEEP (presente in entrambe le rotte)
- `src/AppDev/BarraLaterale.tsx` — sidebar che instrada tra le due rotte
- `src/utils/routingRules.ts` — regole di routing

---

## 2. Ecosistema di generazione pronostici

I 4 motori (A, S, C, Z) producono pronostici che convergono nell'orchestratore MoE, poi finiscono in `daily_predictions_unified` (la collezione che alimenta `/best-picks`).

⚠️ **Limiti del grafo:** il flusso passa attraverso MongoDB e API HTTP, quindi il grafo NON vede le connessioni reali tra scrapers, calculators, motori. Le catene qui sotto sono ricostruite combinando grafo + wiki + memoria storica.

### Coordinatore della pipeline notturna

- `ai_engine/update_manager.py` — orchestratore della pipeline notturna a 52 step. Lancia in sequenza: scrape → A → S → C → Z → MoE → tag → snapshot. Single point of failure dell'intera generazione notturna (gira sul PC locale dell'utente).

### Sistema A — algoritmo statistico "scrematura"
- `ai_engine/scrapers/scrape_snai_odds.py` — scraping quote SNAI
- `ai_engine/scrapers/scrape_fbref_*.py` (4 scraper paralleli) — xG/forma in `team_seasonal_stats`
- `ai_engine/Aggiornamenti/standings_scraper.py` — classifiche
- `functions_python/ai_engine/calculators/bulk_manager.py` — pre-carica match cache da Mongo
- `functions_python/ai_engine/calculators/run_daily_predictions.py` — applica 9 fattori (BVS, quote, Lucifero, motivazioni, H2H, strisce, xG, ecc.) → decide SEGNO/GOL/SCARTA → `daily_predictions`
- `functions_python/ai_engine/calculators/orchestrate_experts.py` — `route_predictions()` seleziona A per i mercati assegnati → applica 28 filtri + Kelly Unificato → `daily_predictions_unified`

### Sistema S — sandbox (gemello di A con pesi tuning live)
- (stessi scraper di Sistema A — input condivisi)
- `functions_python/ai_engine/calculators/bulk_manager.py` — condiviso con A
- `tuning_settings` (collection MongoDB) — sorgente pesi
- `functions_python/ai_engine/calculators/run_daily_predictions_sandbox.py` — identico ad A ma legge pesi da Mongo invece che hardcoded → `daily_predictions_sandbox`
- `orchestrate_experts.py` — usa S in consensus_both con A su DC/O1.5/O2.5, in priority_chain su GG

### Sistema C — Monte Carlo (motore di simulazione)
- (stessi scraper di A — input condivisi)
- `functions_python/ai_engine/calculators/bulk_manager_c.py` — pre-carica cache dedicata C
- `ai_engine/engine/engine_core.py` — `predict_match()` + `calculate_base_goals()` + `apply_randomness()` + curve B/identity card (motore simulazione condiviso anche dalla UI manuale)
- `functions_python/ai_engine/calculators/run_daily_predictions_engine_c.py` — `run_monte_carlo()` 100 cicli per partita → `decidi_segno_dc()` + `decidi_over_under()` + `decidi_gg_ng()` + `apply_kelly()` → `daily_predictions_engine_c`
- `orchestrate_experts.py` — usa C come unico esperto per 1X2 (SEGNO) e O3.5

### Sistema Z — Scout LITE + Mistral (qualitativo, due fasi)
- `functions/services/youService.js` (Cloud Functions Node.js) — endpoint `/chat/match-deepdive`, chiama You.com per Scout LITE/DEEP
- `daily_predictions_unified` (collection) — sorgente partite (output MoE già completato)
- `functions_python/ai_engine/calculators/sistema_z_phase1.py` — Fase 1 notturna: Scout LITE + endpoint premium + Mistral → verdetto qualitativo + Kelly → `predictions_sistema_z`
- `functions_python/ai_engine/calculators/pre_match_sistema_z.py` — Fase 2 pre-match (cron 15 min, T-2h): Scout DEEP + odds_monitor delta quote → Mistral con `confronta_verdetti()` vs F1
- `functions/routes/predictionsRoutes.js` endpoint `/simulation/sistema-z-predictions` — espone al frontend
- `src/MixerPredictions.tsx` tab "AI OST" — UI admin

### Nota su engine_core.py

È a **doppio uso**: motore di Sistema C **e** della simulazione interattiva manuale (AppDev + Cloud Function `run_simulation`).

---

## 3. Pagina Calendario + Dettaglio Partita + Simulazione

Pagina ricca, organizzata in tre sotto-aree concatenate dal flusso utente: (1) calendario navigabile, (2) dettaglio partita statistico, (3) simulazione con animazione.

### 3.1 Ancoraggio giornate per lega

⚠️ **Non è un file Python — è uno stato MongoDB.** L'ancoraggio "lega X è alla giornata N" vive nella collezione `league_current_rounds` (doc per lega con `{league, current_round, updated_at}`).

- `ai_engine/Aggiornamenti/frequenti/nowgoal_scraper.py` — scraper NowGoal che legge l'attributo HTML del round e scrive `current_round` in `league_current_rounds`
- 10 file leggono `league_current_rounds` per sapere quale round processare:
  - `scraper_quote_betexplorer.py`
  - `db_updater_bvs.py`
  - `update_affidabilita.py`
  - `update_fattore_campo.py`
  - `cron_update_lucifero.py`
  - `scraper_date_orari_nowgoal.py`
  - `aggiorna_risultati_mirati.py`
  - `per_agg_pianificato_update_results_only.py`
  - (e altri 2)

### 3.2 Dettaglio partita (frontend)

Catena di click "calendario → dettaglio":
- `src/AppDev/ElementoPartita.tsx` — card singola partita nella lista calendario
- `src/AppDev/VistaPrePartita.tsx` — schermata dettaglio statistiche/radar/formazioni/scelta modalità simulazione
- `src/AppDev/PopupFormazioni.tsx` — popup formazioni titolari
- `src/AppDev/SelettoreGiornata.tsx` — navigazione giornata precedente/successiva

### 3.3 Simulazione con animazione

Catena end-to-end frontend → backend → frontend:

**Frontend (utente lancia):**
- `src/AppDev/VistaPrePartita.tsx` — utente sceglie modalità + parametri, preme "Simula"
- `src/AppDev/ImpostazioniSimulazione.tsx` — pannello tuning parametri MC

**Backend (cascata via subprocess):**
- `functions_python/main.py:28` — `run_simulation()` Cloud Function HTTP entry point. NON chiama direttamente il motore, ma fa subprocess spawn dell'entry point Python appropriato
- `functions_python/ai_engine/web_simulator_A.py` (per campionati) — entry point subprocess che riceve args CLI, lancia la simulazione. Esiste anche copia in `ai_engine/web_simulator_A.py` (ROOT)
- `functions_python/ai_engine/cups/cups_engine/web_simulator_CUPS.py` — variante per partite di coppa (UCL, UEL, Conference). Attivato quando `is_cup=True`
- `functions_python/ai_engine/universal_simulator.py` — libreria a basso livello che espone i 6 algoritmi in modo uniforme (`preload_match_data`, `run_single_algo`, `run_monte_carlo_verdict_detailed`). Esiste anche copia in `ai_engine/universal_simulator.py` (ROOT)
- `ai_engine/engine/engine_core.py` — motore base (`predict_match`, `calculate_base_goals`, `apply_randomness`)
- `ai_engine/calculators/bulk_manager.py` — `get_all_data_bulk` cache match
- `ai_engine/deep_analysis.py` — `DeepAnalyzer`

**Frontend (riceve risultato):**
- `src/AppDev/AnimazionePartita.tsx` — riceve `SimulationResult` + `Formations`, anima la partita in tempo reale
- `src/CupAnimatedField.tsx` — variante per partite di coppa
- `src/components/SimulationResultView.tsx` — vista riepilogo post-simulazione

⚠️ **Trappola per Claude:** la catena passa per `subprocess.spawn` non per `import`. Il grafo Graphify NON vede questi collegamenti perché estrae solo import statici. Stesso problema vale per le connessioni "via MongoDB" (es. `league_current_rounds`). Per ricostruire la catena reale: leggere `main.py` riga 84 (subprocess args) + i due `web_simulator_*.py`.

---

## 4. Bollette

### 4.1 Catena generazione notturna automatica

- `ai_engine/update_manager.py:222` — pipeline notturna lancia `generate_bollette_2.py` come step [38/39] "🎫 Generazione Bollette"
- `functions_python/ai_engine/calculators/generate_bollette_2.py` — entry point:
  - `main()` → `build_pool()` pesca pronostici da `daily_predictions_unified` filtrati con pattern Mixer + EXTRA
  - `_generate_all_v2()` orchestratore per sezione
  - `enrich_pool_with_stats()` arricchimento per LLM
  - `serialize_pool_for_prompt_v2()` + `_call_llm_v2()` / `_call_llm_with_fallback()` → DeepSeek (primario) + Mistral (fallback)
  - `validate_with_errors()` + `_sanitize_and_parse_json()` parsing risposta
  - Salva su collezione `bollette` (3 bollette per sezione: Selettiva 2/3/4 selezioni, Bilanciata 3/5/7, Ambiziosa 4/6/8)
- `functions_python/ai_engine/calculators/tag_mixer.py` — dipendenza per pattern Mixer + identificazione selezioni EXTRA S01–S11
- `functions_python/ai_engine/calculators/bollette_config.py` — configurazione URL/modelli DeepSeek + Mistral

### 4.2 Bolletta on-demand via chat AI

- `functions/routes/bolletteRoutes.js` (endpoint `POST /bollette/generate`) — autenticato, Cloud Functions Node.js. Riceve richiesta utente dalla chat, costruisce prompt Mistral inline, chiama Mistral, parsa risposta JSON (`type: 'bolletta'` o `type: 'messaggio'`), valida selezioni, gestisce retry con warnings, ritorna al frontend
- Collezione MongoDB `bollette` come storage condiviso tra automatica e on-demand. Bollette utente generate via chat sono salvate come `tipo: 'custom'`

⚠️ Il flusso chat AI NON chiama `generate_bollette_2.py` (Python). È un percorso indipendente in Node che parla direttamente con Mistral con prompt diverso (più libero, accetta `type: 'messaggio'` come fallback conversazionale).

### 4.3 Frontend pagina Bollette

- `src/pages/Bollette.tsx` — pagina unica (~3000 righe)

**5 categorie principali renderizzate come quadranti visibili in pagina** (struttura `CATEGORIE` riga 228-234), organizzate in due righe:

| key | label visibile | sottotitolo |
|---|---|---|
| `oggi` | Start | "Solo partite di oggi" |
| `elite` | Elite | "Pattern vincenti" |
| `selettiva` | Selettiva | "Quota max 5.00" |
| `bilanciata` | Bilanciata | "Quota 5.00 — 8.0" |
| `ambiziosa` | Ambiziosa | "Quota 8.0+" |

Prima riga: Start / Elite / Selettiva. Seconda riga: Bilanciata / Ambiziosa.

6ª categoria `custom` esiste separatamente: bollette generate via chat AI dall'utente, mostrata con accesso diverso.

---

## 5. Pagina News

Sezione magazine generata da You.com con sistema redazione umanizzata.

### 5.1 Frontend pagina

- `src/pages/News.tsx` — pagina indice news (lista articoli del giorno raggruppati per lega, ticker testuale, navigazione cascata Nazione→Lega→Partita)
- `src/pages/NewsArticolo.tsx` — pagina dettaglio singolo articolo (rendering magazine-style con header stemmi, prosa Scout, sezione pronostici, fonti, schede team/player)
- `src/pages/news/SguardoVeloce.tsx` — popup laterale che si apre cliccando il box stats a destra del titolo. Contiene 3 tab:
  - **Classifica**
  - **Tendenze** (grafico a ragnatela: forma, attacco, difesa, ecc.)
  - **Radar squadre** (due gauge lancetta: uno segno 1/X/2, uno Over/Under)
- `src/pages/news/TeamScheda.tsx` — scheda squadra cliccabile inline

### 5.2 Sistema redazione umanizzata

L'articolo è firmato da un personaggio fittizio (non da "AI generico"). 13 firme totali: 12 redattori + 1 direttore.

- `src/pages/news/redattori.ts` — anagrafica completa: 12 redattori con nome, anno nascita, città, squadra del cuore, leghe di specializzazione, mercato preferito, bio. Esempi: Luca (Milano, Milan, Serie A/B/C), Sofia (Londra, Barcellona, calcio inglese/scozzese, Over/Under), Francesca (Roma, Arsenal, La Liga + Liga Portugal, tattica), Marco (tappabuchi per coppe). Sopra di loro c'è il direttore "Lorenzo" (Trieste, classe 1979, tifoso Triestina, "Mente aperta").

- `src/pages/news/assegnazione.ts` — `assegnaRedattore(home, away, date, league)`: hash deterministico FNV-1a 32 bit su `home__away__date` → 80% specialista della lega + 20% random tra gli altri 11. Mappa `SPECIALISTA_LEGA` (es. Serie A → Luca, Premier → Sofia, La Liga → Francesca). Stessa partita = sempre stesso redattore su qualunque dispositivo. Assegnazione lato client, non salvata su MongoDB.

- `src/pages/news/RedattoreProfilo.tsx` — modale che si apre cliccando sul nome del firmatario. Mostra avatar a iniziali colorate (gradient deterministico, 12 palette), nome, età, città, squadra del cuore, leghe di specializzazione, bio.

⚠️ Nota: i mercati_preferiti dei redattori sono solo colorazione narrativa. I pronostici reali sono scelti per confidence algoritmica, non per specializzazione del firmatario.

### 5.3 Backend generazione articoli

- `functions_python/ai_engine/calculators/scout_nightly_lite.py` — fetch notturno per le partite di domani + dopodomani. Chiama endpoint Node `/chat/match-deepdive` con `effort='standard'` (dal 18/05/2026 non più 'lite' perché produceva articoli da 1500 char incoerenti — adesso 6000+ char). Sovrascrive sempre la cache della notte prima, tranne se il campo `analysis_deepdive_effort='deep'` esiste già.

- `functions_python/ai_engine/calculators/scout_prematch_deep.py` — fetch DEEP a T-6h dalla partita. Lanciato da Task Scheduler Windows ogni 10-15 min per partite nella finestra kickoff -5h45m..-6h15m. Sovrascrive la cache lite della notturna con DEEP completo ($0.10 vs $0.01). Idempotenza via `scout_prematch_run_log` su MongoDB. Riusa parser/mapping di `scout_nightly_lite.py`.

- `functions/routes/chatRoutes.js` — endpoint Cloud Functions Node `POST /chat/match-deepdive` che fa il vero fetch You.com con prompt `DEEPDIVE_PROMPT_LITE` e salva `analysis_deepdive*` in MongoDB.

⚠️ Mistral NON viene usato nella catena News. L'articolo è prodotto interamente da You.com via `chatRoutes.js`. Mistral è usato altrove (Sistema Z F1/F2) per il verdetto qualitativo della capsula pronostico — asset distinto dall'articolo magazine.

### 5.4 Storage MongoDB

Gli articoli non vivono in una collezione separata. Sono **campi dentro `daily_predictions_unified`** (collezione principale Sistema A/MoE):
- `analysis_deepdive` — testo prosa + JSON pronostico + citazioni `[[N]]`
- `analysis_deepdive_sources` — array URL+snippets
- `analysis_deepdive_effort` — `'standard'` (notturna) o `'deep'` (T-6h o T-2h)
- `analysis_deepdive_ts` — timestamp pubblicazione (= firma data/ora articolo)

Anche `predictions_sistema_z` riceve gli stessi campi (Fase 1/2 hanno cache propria).

### 5.5 Endpoint API frontend

- `functions/routes/predictionsRoutes.js` — endpoint che il frontend News chiama per ricevere lista articoli del giorno + stats laterali
- `/gauge-data` — usato dal popup SguardoVeloce per i due gauge segno/over-under

---

## 6. Odds Monitor / Quote Anomale

### 6.1 Frontend

- `src/pages/QuoteAnomale.tsx` — pagina principale lista partite con indicatori sintetici (~1100 righe). Routing `/quote-anomale`. Contiene infrastruttura AI: `useState` per `aiAnalysis`, `aiLoading`, `aiPhase` (riga 1085), funzione `fetchAiAnalysis()` (riga 1089) che chiama l'endpoint Mistral, componente `<AiAnalysisBlock>` che mostra l'analisi nella card.
- `src/pages/QuoteAnomaleDetail.tsx` — pagina dettaglio singola partita con storico completo e grafici evoluzione quote.

Componenti chiave (interni a QuoteAnomale.tsx, non file separati): `PredictionRow`, `MobileCard`, `Semaforo`, `AlertBE`, `VIndex`, `Rendimento`, `QuoteSet`.

### 6.2 Backend rilevamento quote

- `ai_engine/Aggiornamenti/frequenti/scraper_quote_anomale_lucksport.py` — scraper Selenium che scarica quote 1X2 medie da `1x2.lucksport.com`. Quote apertura scritte una sola volta via `$setOnInsert`, quote live aggiornate ad ogni run.
- `ai_engine/Aggiornamenti/frequenti/calcola_indicatori_quote_anomale.py` — motore di calcolo dei 6 indicatori: Semaforo scostamento, Alert Break-even, Direzione movimento, V-Index Relativo, V-Index Assoluto, Rendimento + HWR/DR/AWR + aggio.
- `ai_engine/Aggiornamenti/frequenti/pre_match_quote_anomale.py` — scheduler che orchestra scrape + calcolo. Doppia modalità: orari fissi (09/12/15/18/21/23) + pre-match a -3h e -1h. Cron ogni 15 min (09:00-23:30).
- `ai_engine/Aggiornamenti/frequenti/patch_real_score_quote_anomale.py` — patch real_score post-partita per calcolo a posteriori HWR/DR/AWR.

### 6.3 Sistema analisi AI Mistral

- `functions/routes/quoteAnomaleRoutes.js` (righe 246-368) — endpoint `POST /quote-anomale/analysis-premium`. Riceve `match_key + date + isAdmin + phase + preferPhase + force`. Legge `quote_anomale` + pronostici da `daily_predictions_unified`, compone JSON con indicatori + pronostici, chiama Mistral, salva risultato firmato in `analysis_premium_nightly` o `analysis_premium_prematch`.
- `functions/services/llmService.js` — esporta `generateOddsMonitorAnalysis()`. Wrapper Mistral con prompt v2 "ODDS MONITOR ANALYSIS".
- `functions_python/ai_engine/calculators/sistema_z_phase1.py` (step 48/52 pipeline notturna) — scheduler della rigenerazione notturna: per ogni partita di oggi presente sia in `daily_predictions_unified` sia in `quote_anomale`, chiama `/quote-anomale/analysis-premium` con `phase=nightly + force=true`.
- `functions_python/ai_engine/calculators/pre_match_sistema_z.py` (T-2h) — analogo per `analysis_premium_prematch` con quote fresche pre-partita.

Modalità chiave:
- `preferPhase`: utente pubblico legge solo cache, mai trigger Mistral al volo
- `force`: admin + scheduler possono rigenerare

### 6.4 Storage MongoDB

Una sola collezione: `quote_anomale`, contiene:
- Quote apertura (immutabili dopo primo write)
- Quote live (sovrascritte ad ogni scrape)
- Indicatori calcolati (6 indicatori)
- Sottocampo storico (~serie temporale, escluso dalla projection lista per peso)
- `real_score` post-partita
- `analysis_premium_nightly`: `{text, fase: "nightly", ts, model}` — retention 60 giorni
- `analysis_premium_prematch`: `{text, fase: "pre_match", ts, model}` — retention 365 giorni

Cleanup: `cleanup_commenti_old.py` (step 52/52 pipeline notturna) gestisce retention.

⚠️ Il campo legacy `analysis_premium` (stringa) è stato rimosso dal 20/05/2026.

### 6.5 Endpoint API frontend

- `GET /quote-anomale/matches?date=&league=` — lista partite con indicatori (proiezione esclude storico)
- `GET /quote-anomale/leagues?date=` — lista campionati per dropdown filtro
- `GET /quote-anomale/detail?date=&match_key=` — dettaglio singola partita con storico completo per grafici (consumato da `QuoteAnomaleDetail.tsx`)
- `POST /quote-anomale/analysis-premium` — generazione/lettura analisi AI Mistral

---

## 7. Integrazione AI trasversale

> "In qualsiasi cosa tu fai, bene o male, puoi sentirlo dinamico, vivo.
> Come se il sito ti stesse comunicando qualcosa, e tu potessi interagire."
> — Lorenzo, sulla filosofia AI di AI Simulator (23/05/2026)

L'AI in AI Simulator non è una feature concentrata, è una presenza diffusa. 17 punti di integrazione, ognuno con un modello scelto per quel contesto specifico. La trasversalità non è ridondanza: è la scelta deliberata di rendere il prodotto vivo in ogni sua sezione.

### Modelli usati

| Provider | Modello | Uso principale |
|---|---|---|
| **DeepSeek** | `deepseek-chat` (V3.2) | Bollette notturne (provider primario) |
| **Mistral** | `mistral-medium-2508` | Coach AI, Premium, Odds Monitor, Sistema Z, Post-match, Feedback loop, Bollette (fallback) |
| **Mistral** | `mistral-embed` (1024 dim) | RAG su raw vault + wiki vault |
| **You.com** | (search) | Scout LITE/DEEP, articoli News |
| **Tavily / Brave / Google CSE / Serper** | (search) | Function-calling tool del Coach AI |

⚠️ Entry point Mistral unico: tutto Mistral passa per `functions/services/llmService.js`. Fetch nativo Node, zero SDK.

### 17 punti di integrazione AI

| # | Punto | Modello | File chiave |
|---|---|---|---|
| 1 | Coach AI chatbot fluttuante | Mistral + function calling | `chatRoutes.js` + `llmService.js` + `dbTools.js` + `ChatBot.tsx` |
| 2 | Premium tab card pronostico | Mistral | `generate_premium_comments.py` + `llmService.generateMatchAnalysisPremium` |
| 3 | Odds Monitor analysis | Mistral | `generate_quote_comments.py` + `llmService.generateOddsMonitorAnalysis` |
| 4 | Sistema Z F1 notturno | Mistral (AI #2) | `sistema_z_phase1.py` |
| 5 | Sistema Z F2 T-2h | Mistral | `pre_match_sistema_z.py` |
| 6 | Bollette notturna | DeepSeek + fallback Mistral | `generate_bollette_2.py` + `bollette_config.py` |
| 7 | Bolletta on-demand chat | Mistral | `bolletteRoutes.js` POST `/bollette/generate` |
| 8 | Post-match commento | Mistral | `postMatchAnalysis.js` |
| 9 | Feedback loop errori | Mistral | `feedback_loop_analyzer.py` (step 29.5 pipeline) |
| 10 | Scout LITE notturno | You.com | `scout_nightly_lite.py` |
| 11 | Scout DEEP T-6h | You.com | `scout_prematch_deep.py` |
| 12 | Parallel Quote+Scout (ottimizzazione) | Mistral + You.com | `parallel_quote_scout.py` |
| 13 | RAG su raw vault | mistral-embed | `index_raw_to_vector.py` (step 40) |
| 14 | RAG su wiki vault | mistral-embed | `index_wiki_to_vector.py` (step 41) |
| 15 | Web search function-calling | Tavily / Brave / Google / Serper | `webSearch.js` |
| 16 | Normalizzazione output Mistral | (utility) | `normalize_pronostico.py` |
| 17 | Audit Mistral periodico | Mistral | `diagnostica_motore/07_mistral_audit/` |

### Architettura dual-LLM per Bollette

⚠️ Caso speciale: le bollette usano **DeepSeek V3.2 come primario** + **Mistral come fallback**. Motivazione: DeepSeek è più economico e più preciso sul formato JSON strutturato richiesto per le bollette; Mistral fa da rete di sicurezza se DeepSeek fallisce. Cascata implementata in `_call_llm_with_fallback()` di `generate_bollette_2.py`.

### Non in produzione (consulti manuali esterni)

- `ai_engine/pattern_match/challenge_pesi_pme.md` — documento di "sfida" condiviso con LLM esterni (DeepSeek, Gemini, Opus, ChatGPT) per ottimizzare i pesi PME. Test di benchmarking, non codice di produzione.
- `log/domanda-per-deepseek-prompt.txt`, `log/domanda-deepseek-calibrazione.txt` — log di consulti manuali a DeepSeek per calibrazione e prompt design.

---

## 8. Qualità trasversali

Caratteristiche che attraversano tutte le sezioni del progetto adattandosi a ciascun contesto. Non sono "cuore" perché se cadono il prodotto funziona ancora, ma sono ciò che lo rendono coerente e riconoscibile.

### 8.1 Coerenza layout grafico

Identità visiva unificata su tutte le pagine del prodotto:
- Stesso sistema di colori (palette darkmode + lightmode)
- Stesse componenti UI ricorrenti (card, badge, popup, modal, ticker)
- Stessa logica di navigazione (sidebar `BarraLaterale.tsx` + barra superiore `BarraSuperiore.tsx`)
- Supporto completo dark mode e light mode in ogni sezione

File chiave per la coerenza grafica:
- `src/AppDev/costanti.ts` — `getTheme()`, `getThemeMode()`, palette colori centralizzate
- `src/AppDev/stili.ts` — stili condivisi tra pagine
- `src/AppDev/BarraLaterale.tsx` — sidebar navigation
- `src/AppDev/BarraSuperiore.tsx` — top bar

### 8.2 AI specializzata per contesto

Non c'è un'unica AI generica per tutto. Ogni sezione del prodotto usa il modello AI più adatto al suo compito:

- **Bollette** → DeepSeek (preciso su JSON strutturato, economico)
- **Coach AI chatbot** → Mistral con function calling (DB + web search)
- **Scout News** → You.com (specializzato in fetch + sintesi web)
- **Verdetto qualitativo Sistema Z** → Mistral
- **Analisi Quote anomale** → Mistral con prompt v2 dedicato
- **Embedding RAG vault** → mistral-embed (1024 dim per vettori semantici)
- **Web search agentico** → Tavily / Brave / Google CSE / Serper in rotazione

Vedi voce 7 per la mappa completa (17 punti, 5 provider).

Questa trasversalità è ciò che dà al prodotto la sensazione di essere "vivo": in qualsiasi sezione l'utente percepisce un'intelligenza adatta a quel contesto specifico, non un chatbot generico applicato ovunque.

---

## Note di uso del file

Questo file è la **fonte di verità positiva** del progetto: dice cosa è cuore, cosa è qualità, e dove vivono i pezzi importanti. Non sostituisce:
- Il grafo Graphify (mappa strutturale del codice)
- La wiki Obsidian (documentazione dettagliata per modulo)
- Il codice stesso (verità ultima)

Ma li **completa** dove loro sono ciechi:
- Il grafo non vede connessioni via MongoDB, subprocess, HTTP
- La wiki non gerarchizza per importanza business
- Il codice non spiega il "perché" delle scelte architetturali

⚠️ **Quando aggiornare questo file:**
- Aggiunta o rimozione di una pagina cuore
- Cambio architettura di un sistema documentato qui
- Rinominazione di file critici elencati qui

NON aggiornare per piccole refactor o aggiunte di file satelliti minori.
