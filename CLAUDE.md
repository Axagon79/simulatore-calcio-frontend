# Istruzioni per Claude Code

## Lingua
- Rispondi sempre in italiano
- Prima di ogni operazione che richiede conferma (comandi, modifiche file), spiega in italiano cosa stai per fare
- Quando appare un messaggio di conferma in inglese, traduci brevemente il significato

## Progetto
Questo è un simulatore di calcio con:
- Backend Python (ai_engine) con 22 scraper per dati calcistici
- Firebase Functions (Node.js + Python)
- MongoDB come database
- 6 algoritmi di simulazione: Statistico, Dinamico, Tattico, Caos, Master, Monte Carlo

Frontend del simulatore di calcio con:
- React + TypeScript + Vite
- Componenti per simulazioni, predictions e classifiche
- Integrazione con Firebase Functions (API backend)
- Gestione loghi squadre e dati real-time da MongoDB
- Struttura: /components (UI), /services (API), /types (TypeScript), /utils (helper functions)

## Regole operative
- Non modificare MAI nessun file senza chiedere prima conferma esplicita
- Prima di ogni modifica, mostra cosa intendi cambiare e aspetta l'approvazione
- Non eseguire comandi nel terminale senza spiegare prima cosa faranno

## Preferenze
- Non creare file README o documentazione se non richiesto esplicitamente
- Mantieni sempre le spiegazioni brevi e concise
- Prima di scrivere un file completo chiedi sempre prima l'autorizzazione da parte mia
- Quando non sai qualcosa chiedi o fai una ricerca sul web

## Regola diagnostica — etichettatura affermazioni

Per OGNI affermazione fatta in diagnosi, debug, o analisi di dati,
etichettare esplicitamente:

- [OSSERVATO] = output diretto di una query mostrata nella chat
- [DEDOTTO] = inferenza logica da dati osservati (esplicitare da quali)
- [IPOTESI] = spiegazione possibile ma non verificata
- [NON RICOSTRUIBILE] = dato passato non più accessibile nel DB

Divieti:
- Vietato presentare ricostruzioni narrative come fatti
- Vietato inventare valori specifici (numeri, date, stringhe di pronostici)
  per rendere coerente una spiegazione
- Se uno stato passato non è più nel DB, dichiararlo apertamente,
  non inferire "probabilmente era X"

Contesto: questa regola nasce dopo sessione 20/04/2026 dove ho inventato
pl_storico[20/04] +74u alle 06:31 (documento inesistente in quel momento)
e pronostico SEGNO 1 @1.87 su Talleres (mai esistito nello storico),
presentando entrambi come fatti verificati.

## Regola diagnostica — osservazioni dell'utente

Le osservazioni dirette dell'utente (screenshot, valori letti sul sito,
cose viste dal vivo) sono DATI primari, al pari dei dati nel DB.

Divieti:
- Vietato chiedere all'utente di "riconfermare" un'osservazione che ha
  già riportato, se non c'è nuovo motivo tecnico per dubitarne.
- Vietato spostare il dubbio sulla correttezza dell'osservazione
  dell'utente come via d'uscita quando non si riesce a spiegare un
  fenomeno coi dati del DB.
- Se non si riesce a spiegare un fenomeno, scrivere "non so spiegare
  questo fenomeno con i dati che ho" è la risposta corretta.

Contesto: sessione 20/04/2026, dopo aver inventato dati, ho tentato di
spostare il dubbio sulla data dello screenshot dell'utente quando non
riuscivo a spiegare +74u di P/L.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` (sub-comando, AST-only, no LLM/API cost) to keep the graph current. **SEMPRE dalla root del repo**, mai da sotto-cartelle (es. `graphify update ./functions` crea un grafo "fantasma" parallelo non sincronizzato). Esiste UN solo grafo per repo, in `<repo-root>/graphify-out/`. **Importante**: NON usare `graphify <path> --update` (flag) — quello richiede LLM key (Gemini di default) e fallisce se non c'è.

## Gerarchia delle fonti — wiki prima, grafo per navigare il codice, grep ultimo

Quando serve capire o trovare qualcosa nel progetto, l'ordine è **vincolante**:

1. **Wiki Obsidian (vault `G:\AI_Simulator_vault\wiki\`) — prima fonte SEMPRE.** Cattura il *perché*, il contesto di prodotto, lo stato (vivo/sospetto/stale), le decisioni (ADR), le trappole, le citazioni dell'utente. È memoria ragionata. Per "cosa fa X", "perché Y", priorità, dipendenze → si parte da qui. Questa è la fonte con cui Claude lavora meglio (verificato su sessioni reali: il grafo non conosce il contesto business, la wiki sì).

2. **Grafo Graphify — navigazione del codice sorgente.** Quando per rispondere serve guardare il **codice** e la wiki non basta, **prima di qualunque Grep/Glob è obbligatorio** interrogare il grafo per individuare il punto giusto:
   - `graphify query "..."` per relazioni semantiche
   - `graphify path "A" "B"` per percorsi tra entità
   - `graphify explain "X"` per un singolo nodo
   Il grafo è una **mappa per orientarsi**, non una fonte di verità né di importanza. God-node, betweenness, surprising connections, PageRank = rumore topologico, **ignorarli** come argomento di importanza business (consultare invece `BUSINESS_CORE.md`).

3. **Grep/Glob — ultimo.** Solo se wiki + grafo non bastano, dichiarando esplicitamente perché si passa al grep.

4. **Codice sorgente = fonte di verità definitiva.** Wiki e grafo sono strumenti per arrivarci più in fretta; in caso di conflitto **vince il codice** (*"non puoi credere ai database, l'unica fonte di verità è il codice"*).

**Vietato:**
- Grepare senza aver prima consultato wiki e (per il codice) grafo.
- Ignorare il suggerimento dell'hook PreToolUse "graphify: knowledge graph disponibile" e procedere comunque con grep.
- Giustificare il salto con "andavo più veloce a grepare".
- Usare metriche topologiche del grafo come argomento di importanza/priorità.

Se ti accorgi di stare per eseguire Grep senza aver consultato wiki + grafo, FERMATI e fai prima l'interrogazione.

Contesto storico: sessione 22/05/2026, eseguiti 8 Grep consecutivi dove `graphify query "tab AI OST"` avrebbe dato risposta diretta. Questa regola nasce per impedire quel comportamento; la revisione 30/05/2026 ha messo esplicitamente la **wiki come prima fonte** sopra il grafo, riflettendo come Claude lavora meglio.

## Regola — divieto di concludere "non esiste" senza verifica multipla

Prima di dichiarare che un file/feature/sistema "non esiste" o "non c'è" 
nel progetto AI Simulator, è OBBLIGATORIO:

1. Cercare in almeno 4 modi diversi: glob su nome, glob su pattern correlati, 
   grep su parole chiave del dominio, grep su nomi di funzioni/variabili 
   correlate
2. Cercare in TUTTE le cartelle pertinenti, non solo quella che sembra ovvia 
   (es. Mistral può vivere in functions/routes/ Node, non solo in 
   ai_engine/Aggiornamenti/ Python)
3. Cercare nei log e nei file di test (es. log/test_*.txt sono prove 
   dell'esistenza di un sistema)
4. Se anche dopo le 4 strategie non emerge nulla, NON dichiarare "non esiste" 
   con sicurezza. Formulare invece: "non ho trovato evidenza dopo X 
   ricerche, ma potrebbe esistere in posizione non standard. Vuoi che 
   verifichi ancora?"

Quando Lorenzo afferma di ricordare l'esistenza di una funzionalità, 
la sua memoria del progetto (§1.2) ha priorità su un singolo grep negativo. 
Trattare la sua affermazione come fonte autorevole, non come ipotesi 
da contraddire.

Le scuse e l'ammissione di errore sono inutili se l'errore si ripete. 
Cambiare comportamento è l'unica cosa che conta.

## Regola — uso di BUSINESS_CORE.md

Esiste in radice del progetto un file `BUSINESS_CORE.md` che documenta:
- Le 8 voci cuore del prodotto (pagine + sistemi + integrazione AI)
- Le 2 qualità trasversali (coerenza grafica + AI specializzata)
- I file chiave di ogni voce
- Le trappole specifiche (rinominazioni, doppioni, flussi che il grafo non vede)

CONSULTARE BUSINESS_CORE.md prima di:
1. Definire qualcosa come "centrale/importante/cuore" basandosi sul grafo Graphify
2. Rispondere a domande di priorità o roadmap dell'utente
3. Proporre refactor di parti che potrebbero essere nel cuore
4. Concludere che un sistema "non esiste" — verifica prima nel BUSINESS_CORE

La classifica god-node del grafo NON corrisponde all'importanza business.
Esempio: PME è in cima al grafo per densità di connessioni, ma è admin-only
e in shadow mode. Il BUSINESS_CORE riflette la realtà di prodotto.

## Regola — allineamento wiki immediato su incongruenza rilevata

Se durante una sessione (ricerca, query, lettura codice, qualunque momento) trovo
nella wiki Obsidian (`G:\AI_Simulator_vault\wiki\`) qualcosa di **incongruente,
disallineato, obsoleto, non più valido o da aggiornare**, lo allineo **subito**,
nel momento in cui lo rilevo — non a fine sessione, non "dopo".

Procedura: verifico la verità sul **codice reale** (mai a memoria, mai presumendo
l'esistenza di una pagina — prima Glob/Read per accertarmi che esista davvero),
poi correggo la pagina aggiornando `ultimo_ingest` e `fonti`. Se la correzione è
grande o ambigua, la propongo e aspetto OK; se è un fix fattuale netto, la applico
e lo dichiaro in chat.

**Why:** una wiki con errori non corretti sul momento propaga decisioni sbagliate
nelle sessioni successive. Rimandare = dimenticare.

## Regola — allineamento wiki immediato su incongruenza rilevata

Se durante una sessione (ricerca, query, lettura codice, qualunque momento) trovo
nella wiki Obsidian (`G:\AI_Simulator_vault\wiki\`) qualcosa di **incongruente,
disallineato, obsoleto, non più valido o da aggiornare**, lo allineo **subito**,
nel momento in cui lo rilevo — non a fine sessione, non "dopo".

Procedura: verifico la verità sul **codice reale** (mai a memoria, mai presumendo
l'esistenza di una pagina — prima Glob/Read per accertarmi che esista davvero),
poi correggo la pagina aggiornando `ultimo_ingest` e `fonti`. Se la correzione è
grande o ambigua, la propongo e aspetto OK; se è un fix fattuale netto, la applico
e lo dichiaro in chat.

**Why:** una wiki con errori non corretti sul momento propaga decisioni sbagliate
nelle sessioni successive. Rimandare = dimenticare.
