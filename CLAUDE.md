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
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Regola vincolante — uso obbligatorio di Graphify

Quando in un progetto esiste il file `graphify-out/graph.json`, valgono questi obblighi non negoziabili:

**Prima di qualunque Grep, Glob, o ricerca esplorativa nel codice**, è OBBLIGATORIO eseguire almeno una di queste interrogazioni del grafo, con argomenti pertinenti alla domanda:
- `graphify query "..."` per esplorare relazioni semantiche
- `graphify path "A" "B"` per trovare percorsi tra entità
- `graphify explain "X"` per capire un singolo nodo

Solo dopo aver ricevuto e letto il risultato del grafo, è permesso usare Grep/Glob se il grafo non ha risposto in modo sufficiente.

**Vietato:**
- Eseguire Grep/Glob senza prima interrogare il grafo
- Ignorare il suggerimento dell'hook PreToolUse "graphify: knowledge graph disponibile" e procedere comunque con grep
- Giustificare il salto del grafo con "andavo più veloce a grepare"

**Procedura corretta:**
1. Ricevuta una domanda sul codice → interroga il grafo
2. Il grafo restituisce risultati → li leggi e li usi
3. Se i risultati del grafo sono insufficienti → spieghi all'utente perché, e propone esplicitamente di passare a Grep come fallback
4. L'utente conferma → solo allora esegui Grep

Se ti accorgi di stare per eseguire Grep senza aver consultato il grafo, FERMATI e fai prima l'interrogazione.

Contesto: sessione 22/05/2026, hai eseguito 8 Grep consecutivi su una domanda dove `graphify query "tab AI OST"` avrebbe dato risposta diretta. Hai dichiarato di aver visto il suggerimento dell'hook e averlo ignorato. Questa regola esiste perché quel comportamento è inaccettabile.

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
