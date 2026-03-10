# BENCHMARK & CALIBRAZIONE MOTORE SIMULAZIONE — AI SIMULATOR

**Data analisi:** 10 Marzo 2026
**Autore:** Lorenzo Casciano + Claude (Anthropic)
**Scopo:** Documentazione completa dell'analisi di benchmark Monte Carlo, diagnosi dei problemi e piano di calibrazione

---

## 1. CONTESTO E OBIETTIVO

### 1.1 Cosa abbiamo fatto
Abbiamo creato uno script di benchmark interattivo (`ai_engine/benchmark_convergenza.py`) per analizzare il comportamento della simulazione Monte Carlo al variare del numero di cicli, per ogni algoritmo di predizione.

### 1.2 Perché lo abbiamo fatto
Lorenzo ha osservato che cambiando il numero di cicli nella simulazione Monte Carlo, i risultati cambiano significativamente. L'obiettivo era capire:
- Come la varianza cambia al variare dei cicli
- Qual è il "sweet spot" tra accuratezza statistica e imprevedibilità realistica (~30% nel calcio reale)
- Quali algoritmi producono risultati realistici e quali no
- Come calibrare il motore per migliorare la qualità delle predizioni

---

## 2. ARCHITETTURA DEL SISTEMA (CRITICO)

### 2.1 I 6 Algoritmi
| ID | Nome | Comportamento |
|----|------|---------------|
| 1 | Statistico | Algoritmo singolo con pesi ALGO_1 |
| 2 | Dinamico | Algoritmo singolo con pesi ALGO_2 |
| 3 | Tattico | Algoritmo singolo con pesi ALGO_3 |
| 4 | Caos | Algoritmo singolo con pesi ALGO_4 |
| 5 | Master | Ensemble: esegue algo 1+2+3+4+GLOBAL, fa media dei 5 risultati |
| 6 | MonteCarlo/ALGO_C | Algoritmo singolo con pesi ALGO_C (NON è un ensemble) |

### 2.2 Due sistemi separati

#### Simulazione Web (con animazione grafica)
- **File:** `functions_python/ai_engine/web_simulator_A.py`
- **Usa:** `predict_match` + `calculate_goals_from_engine`
- **Cicli:** 500 (default)
- **Algoritmi:** mode 1-5 (MAI mode 6)
- **Configurazione:** pesi GLOBAL + ALGO_1/2/3/4/5 da `tuning_settings.json`

#### Sistema C (pronostici pubblicati)
- **File:** `functions_python/ai_engine/calculators/run_daily_predictions_engine_c.py`
- **Usa:** `predict_match` + `calculate_goals_from_engine` (stesso motore)
- **Cicli:** 100
- **Algoritmo:** mode 6 (sempre)
- **Configurazione:** pesi ALGO_C da `tuning_settings.json`
- **Output:** salvato in collection MongoDB `daily_predictions_engine_c`
- **Override:** documento MongoDB `{"_id": "algo_c_config"}` nella collection `tuning_settings` sovrascrive il JSON locale

#### Sistemi A e S (NON toccati)
- Usano pesi fissi / pesi da DB
- NON usano Monte Carlo
- NON usano `predict_match` + `calculate_goals_from_engine`
- Qualsiasi modifica al motore MC NON li impatta

#### MoE (Master of Experts)
- Combina A + S + C tramite routing
- Non fa calcoli propri

### 2.3 Il Mixer (`calculate_goals_from_engine`)
Il mixer è l'architettura di `goals_converter.py` + `tuning_settings.json`. Ha due motori interni:

#### Motore WIN (chi vince)
9 pesi che producono un `win_shift`:
- Rating Rosa, Forma Recente, Motivazione, Fattore Campo, Storia H2H, BVS Quote, Affidabilità, Valore Rosa, Streak

#### Motore GOL (quanti gol)
- Base FBRef + modificatori (Lucifero, H2H, tattico) → produce `raw_lambda`
- Fusione: `final_lambda = raw_lambda * (1 ± win_shift)`
- Poisson genera i gol dal lambda finale

#### Parametri chiave del Motore GOL
| Parametro | Effetto |
|-----------|---------|
| DIVISORE_MEDIA_GOL | Più basso = più gol generati |
| POTENZA_WINSHIFT | Più alto = favorita più dominante |
| IMPATTO_DIFESA_TATTICA | Più alto = difesa frena di più i gol |
| TETTO_MAX_GOL_ATTESI | Limite massimo gol per squadra |

### 2.4 File duplicati — ATTENZIONE
`calculate_goals_from_engine` esiste in DUE copie:
1. `ai_engine/engine/` (versione locale, usata dal benchmark per algo 1-6)
2. `functions_python/ai_engine/engine/` (versione produzione, usata dal Sistema C e dall'algo 7 del benchmark)

**IMPORTANTE — Divergenze tra locale e produzione:**
- La versione locale di `goals_converter.py` **divide le medie lega per 2** (`LEAGUE_AVERAGES = val / 2.0`), quella di produzione **no**. Questo impatta il `base_lambda` e quindi i gol generati dagli algoritmi 1-6 nel benchmark.
- Il benchmark algo 7 (Sistema C) usa `importlib.util` per caricare direttamente i moduli di produzione, bypassando questa divergenza.
- I valori ALGO_C nel `tuning_settings.json` locale sono **obsoleti e sbagliati** (es. DIVISORE=0.50). NON usarli mai come riferimento. I valori reali vengono da MongoDB.

### 2.5 Configurazione ALGO_C — Fonte dati (⚠️ CRITICO)
I parametri del Sistema C vengono da **MongoDB** (collection `tuning_settings`, documento `algo_c_config`), **NON** dal file `tuning_settings.json`.

**Valori REALI (MongoDB `algo_c_config`):**
| Parametro | Valore Reale (MongoDB) | Valore Obsoleto (JSON) |
|-----------|----------------------|----------------------|
| DIVISORE_MEDIA_GOL | **1.75** | 0.50 ❌ |
| IMPATTO_DIFESA_TATTICA | **17.0** | 22.0 ❌ |
| TETTO_MAX_GOL_ATTESI | **4.0** | 4.5 ❌ |
| POTENZA_FAVORITA_WINSHIFT | **0.4** | 0.35 ❌ |

**Regola:** per qualsiasi ragionamento su ALGO_C, usare SEMPRE i valori MongoDB. Il JSON locale è inaffidabile.

---

## 3. RISULTATI DEL BENCHMARK

### 3.1 Partite testate
1. **Milan vs Inter** (Giornata 28) — Risultato reale: 1-0 (upset, Milan sfavorito)
2. **Bologna vs Verona** (Giornata 28) — Risultato reale: 1-2 (upset, Verona sfavorito)

### 3.2 Riepilogo Milan vs Inter (100 cicli, 5 ripetizioni)

| Algoritmo | Prob 1 | Prob X | Prob 2 | Media Gol Casa | Media Gol Ospite | Media Gol Totali |
|-----------|--------|--------|--------|----------------|------------------|------------------|
| 1-Statistico | ~13% | ~8% | ~79% | ~1.3 | ~3.8 | ~4.8 |
| **2-Dinamico** | **~20%** | **~16%** | **~63%** | **~1.5** | **~2.0** | **~3.5** |
| 3-Tattico | ~11% | ~12% | ~77% | ~1.3 | ~3.4 | ~4.7 |
| 4-Caos | ~9% | ~10% | ~81% | ~1.4 | ~3.8 | ~5.1 |
| 5-Master | ~11% | ~10% | ~79% | ~1.7 | ~3.9 | ~5.6 |
| 6-MonteCarlo* | ~9% | ~8% | ~83% | ~1.5 | ~3.9 | ~5.4 |

*\*Algo 6 nel benchmark usa pesi GLOBAL, non ALGO_C*

**Quote reali pre-partita:** 1: 3.20, X: 3.25, 2: 2.15 (≈ Milan 28%, X 25%, Inter 47%)

### 3.3 Sistema C reale (ALGO_C) per Milan vs Inter
Dati dallo Stochastic Engine (pre-calcolato dalla pipeline notturna):
- **1X2:** Milan 28%, X 20%, Inter 52%
- **Score Predetto:** 2-2
- **Media Gol:** Casa 2.09, Ospite 2.62, Totale 4.71
- **Over 2.5:** 86%, **GG:** 81%
- **Top Scores:** 2-2 (10), 2-4 (8), 1-2 (7), 3-2 (6)

### 3.4 Convergenza
La deviazione standard (σ) cala correttamente all'aumentare dei cicli per tutti gli algoritmi:
- 10 cicli: σ ≈ 8-16%
- 50 cicli: σ ≈ 3-7%
- 100 cicli: σ ≈ 2-4%

**La convergenza funziona. Il problema NON è nei cicli.**

---

## 4. DIAGNOSI DEI PROBLEMI

### 4.1 Problema principale: `calculate_goals_from_engine` genera troppi gol
- Su Milan-Inter, 5 algoritmi su 6 generano media gol totali tra 4.7 e 5.6
- Risultati esatti frequenti: 1-4, 0-5, 2-6, 1-5 — irrealistici per un derby
- Max gol ospite fino a 12-13 in singole simulazioni
- Solo il Dinamico (algo 2) produce media gol realistiche (~3.5)

### 4.2 Il motore sovrastima il favorito
- Non è un bias casa/ospite, è un bias favorito/sfavorito
- Milan-Inter: gonfia i gol dell'Inter (ospite ma favorita)
- Bologna-Verona: gonfia i gol del Bologna (casa e favorito)
- Il `win_shift` amplifica troppo il divario nella formula `final_lambda = raw_lambda * (1 ± win_shift)`

### 4.3 Il pareggio è sistematicamente sottostimato
- Media reale Serie A: pareggio ~25-28%
- Tutti gli algoritmi (tranne Dinamico): pareggio tra 8% e 12%
- Dinamico: pareggio ~16% (migliore ma ancora basso)

### 4.4 Perché il Dinamico funziona meglio
Il Dinamico (ALGO_2) ha:
- `DIVISORE_MEDIA_GOL = 1.3` (il più alto di tutti → frena i gol)
- `POTENZA_WINSHIFT = -0.3` (negativo! → riduce il dominio del favorito)
- Combinazione che produce probabilità più equilibrate e gol più realistici

### 4.5 Problema specifico di ALGO_C (Sistema C)

**⚠️ SCOPERTA CRITICA (10/03/2026):** I valori REALI di ALGO_C in produzione vengono da **MongoDB** (documento `algo_c_config`), NON dal file `tuning_settings.json`. I valori nel JSON sono obsoleti.

**Valori REALI (MongoDB `algo_c_config`):**
- `DIVISORE_MEDIA_GOL = 1.75`
- `IMPATTO_DIFESA_TATTICA = 17.0`
- `TETTO_MAX_GOL_ATTESI = 4.0`
- `POTENZA_FAVORITA_WINSHIFT = 0.4`

**Valori OBSOLETI (tuning_settings.json — NON usati in produzione):**
- `DIVISORE_MEDIA_GOL = 0.50` ← SBAGLIATO, il vero è 1.75
- `IMPATTO_DIFESA = 22.0` ← SBAGLIATO, il vero è 17.0
- `TETTO_MAX_GOL = 4.5` ← SBAGLIATO, il vero è 4.0
- `POTENZA_WINSHIFT = 0.35` ← SBAGLIATO, il vero è 0.4

La diagnosi iniziale sull'effetto forbice era basata sui valori JSON errati. Con i valori reali da MongoDB, ALGO_C è molto più equilibrato e vicino al Dinamico (ALGO_2).

**Evidenza dalla pipeline notturna (19 partite):**
- 12 partite su 19 hanno media gol totali sotto 2.0
- Partite come Cremonese-Fiorentina: 1.40 gol totali (irrealistico)
- Albacete-Las Palmas: 1.23 gol totali (irrealistico)
- Media reale nei campionati: 2.4-2.8 gol

### 4.6 Nonostante i problemi, il Sistema C ha HR 65% sui segni
Spiegazione: il motore WIN (chi vince) funziona bene. Sbaglia le percentuali assolute ma azzecca l'ordine (chi è favorito). La scrematura filtra le partite più chiare. Il 65% viene dalla direzione del pronostico, non dalla calibrazione fine delle probabilità.

---

## 5. PESI COMPLETI — CONFRONTO PARAMETRO PER PARAMETRO

### 5.1 Pesi WIN (chi vince)
| Parametro | GLOBAL | ALGO_1 | ALGO_2 | ALGO_3 | ALGO_4 | ALGO_5 | ALGO_C |
|-----------|--------|--------|--------|--------|--------|--------|--------|
| RATING_ROSA | 1.3 | 1.4 | 1.4 | 1.1 | - | 1.0 | 1.3 |
| FORMA_RECENTE | 2.0 | 3.2 | 2.0 | 1.8 | 3.8 | 2.2 | 2.0 |
| MOTIVAZIONE | 1.2 | 1.8 | 1.5 | 0.9 | 3.5 | 1.3 | 1.2 |
| FATTORE_CAMPO | 1.4 | 1.6 | 1.5 | 1.3 | 0.3 | 1.5 | 1.4 |
| STORIA_H2H | -0.5 | 0.1 | 0.1 | 0.1 | 0.3 | 0.1 | -0.5 |
| BVS_QUOTE | 1.5 | 1.6 | 2.0 | 1.7 | 2.5 | 1.6 | 1.5 |
| AFFIDABILITA | 1.0 | 1.0 | 1.2 | 1.3 | 2.3 | 1.1 | 1.0 |
| VALORE_ROSA | 1.0 | 1.2 | 1.0 | 1.1 | 0.6 | 1.2 | 1.0 |
| STREAK | 2.0 | — | — | — | — | — | 2.0 |

**Nota:** ALGO_C ha pesi WIN identici a GLOBAL.

### 5.2 Parametri GOL (quanti gol)
| Parametro | GLOBAL | ALGO_1 | ALGO_2 | ALGO_3 | ALGO_4 | ALGO_5 | ALGO_C |
|-----------|--------|--------|--------|--------|--------|--------|--------|
| DIVISORE_MEDIA_GOL | 1.1 | 0.9 | **1.3** | 1.2 | 1.1 | 1.0 | **1.75** ⚠️ |
| POTENZA_WINSHIFT | 0.45 | 0.5 | **-0.3** | 0.35 | 0.3 | 0.4 | **0.4** ⚠️ |
| IMPATTO_DIFESA | 18.0 | 19.0 | 17.0 | 16.0 | 17.5 | 17.5 | **17.0** ⚠️ |
| TETTO_MAX_GOL | 4.2 | 4.0 | 3.8 | 3.8 | 3.8 | 4.0 | **4.0** ⚠️ |

*⚠️ Valori ALGO_C letti da MongoDB `algo_c_config` (sovrascrivono il JSON)*

---

## 6. PIANO DI CALIBRAZIONE

### 6.1 Strategia (FONDAMENTALE)
**Modifichiamo SOLO GLOBAL** (simulazione grafica). **NON tocchiamo ALGO_C** (Sistema C, pronostici pubblicati con 65% HR).

Sequenza:
1. Calibrare GLOBAL per la simulazione grafica
2. Testare con il benchmark sulle stesse partite (Milan-Inter, Bologna-Verona)
3. Verificare che i risultati siano migliorati
4. Solo quando soddisfatti, valutare se portare le correzioni su ALGO_C
5. Se l'HR del Sistema C scende dopo la modifica di ALGO_C → rollback immediato

### 6.2 Cosa correggere in GLOBAL
Il Dinamico (ALGO_2) è il riferimento. I suoi parametri GOL producono i risultati più realistici.

**Direzione delle modifiche:**
1. **DIVISORE_MEDIA_GOL:** aumentare (da 1.1 verso 1.2-1.3) per ridurre i gol totali
2. **POTENZA_WINSHIFT:** ridurre (da 0.45 verso 0.1-0.2 o anche negativo) per ridurre il dominio del favorito
3. **TETTO_MAX_GOL:** ridurre (da 4.2 verso 3.8-4.0) per evitare risultati estremi
4. **IMPATTO_DIFESA:** valutare se aumentare leggermente per frenare i gol

### 6.3 Risultati attesi dopo calibrazione
- Media gol totali: da 4.7-5.6 → verso 2.5-3.5
- Probabilità pareggio: da 8-12% → verso 20-28%
- Risultati esatti: meno 1-5, 2-6 → più 1-0, 2-1, 1-1
- Probabilità upset (vittoria sfavorito): da 9-13% → verso 20-30%
- HR sui segni della simulazione: dovrebbe migliorare (più pareggi e upset intercettati)

### 6.4 Come misurare il successo
Usare il benchmark (`benchmark_convergenza.py`) sulle stesse partite:
- Milan-Inter: le probabilità devono avvicinarsi alle quote reali (Milan ~28%, X ~25%, Inter ~47%)
- Bologna-Verona: idem, con il Verona non troppo sottostimato
- Media gol totali: deve stare tra 2.4 e 3.2 per partite normali
- Pareggio: deve stare tra 20% e 30%

---

## 7. TOOL CREATI

### 7.1 Benchmark Convergenza
- **File:** `ai_engine/benchmark_convergenza.py`
- **Output:** `ai_engine/benchmark_output/`
- **Funzionalità:**
  - Menù interattivo: scelta campionato → giornata → partita
  - Scelta personalizzabile dei livelli di cicli e ripetizioni
  - Test separato per ogni algoritmo (1-6 + Algoritmo C)
  - Tabella dettagliata con: prob 1X2, RE, Top 4 risultati esatti per ogni ripetizione
  - Statistiche aggregate: media gol casa/ospite/totali, Over/Under, GG/NG, RE più frequente
  - Grafici convergenza 1X2 (σ vs cicli) e convergenza gol (medie + barre errore)
  - File .txt dettagliato con tutti i singoli risultati
  - Possibilità di analizzare più partite nella stessa sessione
  - Grafico comparativo finale tra tutte le partite analizzate

---

## 8. NOTE IMPORTANTI

### 8.1 Algoritmo 7 — Sistema C nel benchmark (ALLINEATO ALLA PRODUZIONE ✅)
L'Algoritmo 7 nel benchmark è il Sistema C **identico alla produzione**. NON usa i file locali: carica direttamente i moduli di produzione (`functions_python/ai_engine/engine/`) tramite `importlib.util.spec_from_file_location`, e legge i parametri da MongoDB (`algo_c_config`).

**Verifica di allineamento (10/03/2026):** test su Portsmouth vs Swansea (Championship) ha prodotto media gol casa **0.79**, coerente con la produzione. Le piccole differenze tra ripetizioni sono dovute al 15% di randomness negli algoritmi (Lucifero, streaks, ecc.).

**Algo 6 vs Algo 7:** L'algo 6 (MonteCarlo) usa la versione locale con pesi GLOBAL. L'algo 7 (Sistema C) usa la versione produzione con pesi ALGO_C da MongoDB. Sono due cose diverse.

### 8.2 Rischio zero sui pronostici
Modificando GLOBAL si impatta SOLO la simulazione grafica (algo 1-5). Il Sistema C (algo 7/ALGO_C) resta intatto. I pronostici pubblicati continuano a funzionare con il 65% HR.

### 8.3 Fix motivazioni None (10/03/2026)
Per squadre come Portsmouth/Swansea la motivazione in MongoDB è `None`. Il `.get("motivation", 5.0)` non copre questo caso (la chiave esiste ma il valore è None). Fix applicato: `h_data.get("motivation") or 5.0` — fallback anche su None.

### 8.4 Futuro: cicli adattivi
Una volta calibrato il motore gol, si può implementare un algoritmo che determina automaticamente il numero di cicli in base al tipo di partita:
- Partite equilibrate (quote simili): meno cicli (1.000-3.000) per preservare varianza
- Partite sbilanciate (favorita netta): più cicli (5.000-10.000) per convergenza
- Il "coefficiente di caos" dipenderà da: divario classifica, differenza quote, forma recente, importanza partita

### 8.5 Indice MongoDB creato
È stato creato un indice `{last_updated: -1}` sulla collection `h2h_by_round` per risolvere il problema di sort in memoria su Atlas. L'indice non modifica nessun dato e non cambia il comportamento del progetto.
