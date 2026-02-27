// ============================================================
// variantiCommenti.ts
// Varianti testuali per rendere il report meno monotono.
// Port TypeScript di varianti_commenti.js
// ============================================================

function varianteRandom(arr: string[]): string {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- SEZIONE 1 — HR GLOBALE ---

const HR_ECCELLENTE = [
  "risultato eccellente — nella fascia élite del settore",
  "performance di altissimo livello — pochi sistemi raggiungono questa soglia stabilmente",
  "risultato straordinario — ampiamente sopra la media professionale",
  "top performer — siamo nella fascia che solo i sistemi più raffinati raggiungono",
  "risultato fuori scala rispetto alla media del settore",
];

const HR_OTTIMO = [
  "risultato molto solido — sopra la media professionale",
  "performance consistente — il sistema è in ottima salute",
  "ottimo livello — ben al di sopra della soglia di profittabilità",
  "risultato di qualità — conferma la solidità del modello",
  "sistema in forma — performance che pochi raggiungono nel lungo periodo",
];

const HR_BUONO = [
  "risultato positivo — sistema in buona salute",
  "performance nella fascia verde — margini di miglioramento disponibili",
  "risultato incoraggiante — buona base su cui lavorare",
  "sistema solido — qualche ottimizzazione può portarlo al livello successivo",
];

const HR_SUFFICIENTE = [
  "risultato nella norma — margini di miglioramento disponibili",
  "performance accettabile — analisi più profonda consigliata",
  "nella media del settore — il sistema può dare di più con i giusti aggiustamenti",
  "risultato sufficiente — monitorare nelle prossime settimane",
];

const HR_NEGATIVO = [
  "risultato sotto le aspettative — analisi approfondita necessaria",
  "performance al di sotto della soglia — rivedere i parametri del sistema",
  "periodo difficile — identificare le cause prima di procedere",
  "risultato da analizzare con attenzione — possibile varianza o segnale strutturale",
];

// --- SEZIONE 1 — ROI ---

const ROI_OTTIMO = [
  "Rendimento economico ottimo",
  "P/L eccellente per il periodo",
  "Risultato economico di alto livello",
  "Rendimento che pochi sistemi replicano nel lungo periodo",
];

const ROI_BUONO = [
  "Rendimento economico positivo",
  "P/L solido nel periodo",
  "Buon ritorno economico sull'investimento",
  "Risultato economico soddisfacente",
];

const ROI_MODESTO = [
  "Rendimento economico modesto ma positivo",
  "P/L in territorio positivo — margini da ampliare",
  "Rendimento contenuto ma nella direzione giusta",
];

const ROI_NEGATIVO = [
  "Rendimento economico negativo — rivedere la strategia di staking",
  "P/L sotto zero — analizzare le cause prima del prossimo ciclo",
  "Periodo in perdita economica — intervento consigliato",
];

// --- SEZIONE 1 — SIGNIFICATIVITA' ---

const SIG_ALTISSIMA = [
  "con confidenza superiore al 99.99% — non spiegabile dalla fortuna",
  "statisticamente inattaccabile — la probabilità che sia fortuna è trascurabile",
  "solidissimo dal punto di vista statistico — nessun dubbio sull'edge reale",
  "il dato parla chiaro: questo non è un caso",
];

const SIG_ALTA = [
  "statisticamente significativo (p < 0.01)",
  "dato robusto — la significatività è alta",
  "l'edge è reale con alta confidenza statistica",
];

const SIG_MEDIA = [
  "statisticamente significativo (p < 0.05)",
  "significativo ma con margine — aumentare il campione per consolidare",
];

const SIG_BASSA = [
  "non ancora statisticamente significativo — servono più dati",
  "campione ancora insufficiente per conclusioni definitive",
  "trend positivo ma da confermare con più partite",
];

// --- SEZIONE 2 — SETTIMANE ---

const SETTIMANE_STABILE = [
  "L'andamento settimanale è molto stabile — buon segnale di consistenza del sistema.",
  "Ottima consistenza settimana per settimana — il sistema non ha picchi e valli marcati.",
  "Stabilità esemplare nell'arco del periodo — conferma la robustezza del modello.",
];

const SETTIMANE_VARIABILE = [
  "L'andamento settimanale è nella norma con variabilità moderata.",
  "Qualche oscillazione settimana per settimana — nella media del settore.",
  "Variabilità accettabile — il football porta sempre un po' di rumore nel breve periodo.",
];

const SETTIMANE_ALTA_VARIABILITA = [
  "L'andamento settimanale mostra un'alta variabilità — normale per periodi brevi ma da monitorare.",
  "Oscillazioni marcate tra le settimane — cercare la causa nei dati prima di allarmarsi.",
  "Alta variabilità nel periodo — il sistema ha mostrato picchi e valli significativi.",
];

// --- SEZIONE 3 — CORRELAZIONI ---

const CORR_INTRO = [
  "Le correlazioni con il risultato (WIN) sono moderate — normale nel football dove la varianza intrinseca limita strutturalmente i valori.",
  "Come atteso nel calcio, le correlazioni sono moderate: nessuna variabile predice perfettamente il risultato, ma insieme costruiscono un segnale solido.",
  "Nel football nessuna singola variabile domina — le correlazioni moderate che vediamo sono fisiologiche e non un limite del sistema.",
  "Le correlazioni sono nell'ordine tipico del settore: il calcio è uno sport ad alta varianza e valori sopra 0.20 sarebbero quasi impossibili da mantenere nel tempo.",
];

// --- SEZIONE 3 — FEATURE IMPORTANCE ---

const FEATURE_DISTRIBUITA = [
  "L'assenza di una feature dominante è un segnale positivo: il sistema integra genuinamente più fonti di segnale — più robusto e meno soggetto a overfitting.",
  "Nessuna variabile domina da sola: è esattamente quello che vogliamo vedere in un sistema ben calibrato.",
  "Il peso distribuito tra le feature indica un sistema maturo che non dipende da un singolo segnale fragile.",
  "Importanza distribuita tra le variabili — il sistema non ha punti di rottura singoli. Ottimo segnale di robustezza.",
];

const FEATURE_CONCENTRATA = [
  "Una feature domina con importanza elevata — verificare che non ci sia dipendenza eccessiva da una singola variabile.",
  "Attenzione alla concentrazione su una sola variabile — se questa dovesse degradarsi, l'intero sistema ne risentirebbe.",
];

// --- SEZIONE 4 — CLUSTERING ---

const CLUSTER_INTRO = [
  "Il K-Means ha identificato segmenti naturali con caratteristiche e strategie distinte.",
  "L'analisi cluster ha rivelato tipologie di pronostici con profili completamente diversi.",
  "Il clustering mostra che non tutti i pronostici sono uguali — esistono segmenti con logiche differenti che meritano strategie di staking separate.",
  "I cluster identificati confermano che il sistema produce implicitamente più strategie diverse. Renderle esplicite permette un bankroll management più preciso.",
];

// --- SEZIONE 5 — CAMPIONATI ---

const CAMPIONATI_INTRO = [
  "La differenza di performance tra campionati è marcata.",
  "Non tutti i campionati sono uguali per il sistema — alcuni producono edge reale, altri no.",
  "L'analisi per campionato rivela dove il sistema ha vero vantaggio e dove fatica strutturalmente.",
  "Le leghe non sono intercambiabili: il sistema performa in modo molto diverso a seconda del contesto.",
];

const CAMPIONATI_TUTTI_OK = [
  "Tutti i campionati con campione sufficiente mostrano performance positive — ottimo segnale.",
  "Nessun campionato significativo in territorio negativo — il sistema è robusto su più contesti.",
  "Risultati positivi trasversali a tutte le leghe principali — la copertura geografica funziona.",
];

// --- SEZIONE 6 — MELE MARCE ---

const MELE_INTRO = [
  "La ricerca esaustiva ha identificato combinazioni con HR sistematicamente sotto la media globale.",
  "L'analisi negativa ha scovato le sacche di perdita sistematica nascoste nei dati.",
  "Cercando attivamente i pattern che precedono gli errori, sono emerse combinazioni da evitare.",
  "La negative pattern detection ha fatto il suo lavoro: ecco le combinazioni da escludere dal prossimo ciclo.",
];

// --- SEZIONE 7 — FILTRI ---

const FILTRI_NESSUNO_POSITIVO = [
  "Tutti i filtri testati singolarmente producono un P/L netto inferiore al baseline — normale, perché eliminare pronostici significa perdere anche quelli vincenti.",
  "Nessun filtro migliora immediatamente il P/L: è il risultato atteso. Il valore dei filtri è nel lungo periodo, non nell'immediato.",
  "I filtri non producono magia nel breve termine — eliminano sistematicamente le perdite ricorrenti, e il beneficio si vede sui mesi successivi.",
];

// --- SEZIONE 8 — RACCOMANDAZIONI ---

const RACCOMANDAZIONI_CHIUSURA = [
  "L'obiettivo realistico è un aumento di +1-2pp di HR nei prossimi 2-3 mesi applicando i filtri ad alta priorità senza stravolgere il sistema.",
  "Piccoli passi, grandi risultati: +1-2pp di HR nel trimestre è un obiettivo concreto e misurabile con questi filtri.",
  "Non si tratta di rivoluzionare il sistema ma di eliminare chirurgicamente le sacche di perdita. Il +1-2pp di HR atteso nei prossimi mesi è realistico e sostenibile.",
  "Implementare gradualmente, misurare ogni settimana, aggiustare se necessario. Il sistema è già buono — si tratta solo di levigarlo.",
];

// --- SEZIONE 9 — SINTESI ---

const SINTESI_ECCELLENTE = [
  "Il sistema Puppals dimostra un edge reale e misurabile di altissimo livello nel periodo.",
  "Mese eccellente per Puppals — i numeri parlano chiaro e la statistica li supporta.",
  "Risultati di altissimo livello: il sistema ha funzionato esattamente come progettato.",
  "Un periodo da incorniciare — HR, ROI e significatività statistica tutti nella fascia top.",
];

const SINTESI_OTTIMA = [
  "Il sistema Puppals dimostra un edge reale e misurabile, confermato statisticamente.",
  "Buon periodo per Puppals — il sistema continua a dimostrare il suo valore.",
  "I numeri confermano ciò che sappiamo: il sistema ha un vantaggio reale sul mercato.",
  "Performance solida nel periodo — il sistema è in salute e i dati lo dimostrano.",
];

const SINTESI_BUONA = [
  "Il sistema Puppals mostra un edge positivo, non spiegabile dalla fortuna.",
  "Periodo positivo — il sistema sta facendo il suo lavoro, c'è margine per migliorare ulteriormente.",
  "Edge reale confermato, con spazio per ottimizzazioni che i filtri identificati possono portare.",
];

const SINTESI_DIFFICILE = [
  "Il sistema Puppals mostra segnali positivi ma il periodo richiede analisi più approfondita.",
  "Periodo sotto tono — analizzare le cause prima del prossimo ciclo per evitare che si ripeta.",
  "Un passo indietro per prenderne due in avanti: l'analisi di questo periodo è preziosa per migliorare.",
];

const SINTESI_CHIUSURA = [
  "La fase successiva deve concentrarsi sull'implementazione selettiva dei filtri mele marce identificati — non per rivoluzionare il sistema, ma per eliminare chirurgicamente le sacche di perdita sistematica.",
  "Il lavoro del prossimo mese è chiaro: applicare i filtri, misurare l'impatto, affinare. Il sistema è già buono — si tratta di renderlo eccellente.",
  "Avanti con i filtri identificati — piccoli aggiustamenti mirati valgono più di grandi rivoluzioni.",
  "I dati hanno parlato. Ora si tratta di ascoltarli e agire di conseguenza con i filtri del piano operativo.",
];

// --- EXPORT ---

export const getHREccellente   = () => varianteRandom(HR_ECCELLENTE);
export const getHROttimo       = () => varianteRandom(HR_OTTIMO);
export const getHRBuono        = () => varianteRandom(HR_BUONO);
export const getHRSufficiente  = () => varianteRandom(HR_SUFFICIENTE);
export const getHRNegativo     = () => varianteRandom(HR_NEGATIVO);

export const getROIOttimo      = () => varianteRandom(ROI_OTTIMO);
export const getROIBuono       = () => varianteRandom(ROI_BUONO);
export const getROIModesto     = () => varianteRandom(ROI_MODESTO);
export const getROINegativo    = () => varianteRandom(ROI_NEGATIVO);

export const getSigAltissima   = () => varianteRandom(SIG_ALTISSIMA);
export const getSigAlta        = () => varianteRandom(SIG_ALTA);
export const getSigMedia       = () => varianteRandom(SIG_MEDIA);
export const getSigBassa       = () => varianteRandom(SIG_BASSA);

export const getSettimaneStabile    = () => varianteRandom(SETTIMANE_STABILE);
export const getSettimaneVariabile  = () => varianteRandom(SETTIMANE_VARIABILE);
export const getSettimaneAltaVariab = () => varianteRandom(SETTIMANE_ALTA_VARIABILITA);

export const getCorrIntro           = () => varianteRandom(CORR_INTRO);

export const getFeatureDistribuita  = () => varianteRandom(FEATURE_DISTRIBUITA);
export const getFeatureConcentrata  = () => varianteRandom(FEATURE_CONCENTRATA);

export const getClusterIntro        = () => varianteRandom(CLUSTER_INTRO);

export const getCampionatiIntro     = () => varianteRandom(CAMPIONATI_INTRO);
export const getCampionatiTuttiOK   = () => varianteRandom(CAMPIONATI_TUTTI_OK);

export const getMeleIntro           = () => varianteRandom(MELE_INTRO);

export const getFiltriNessunoPositivo   = () => varianteRandom(FILTRI_NESSUNO_POSITIVO);

export const getRaccomandazioniChiusura = () => varianteRandom(RACCOMANDAZIONI_CHIUSURA);

export const getSintesiEccellente   = () => varianteRandom(SINTESI_ECCELLENTE);
export const getSintesiOttima       = () => varianteRandom(SINTESI_OTTIMA);
export const getSintesiBuona        = () => varianteRandom(SINTESI_BUONA);
export const getSintesiDifficile    = () => varianteRandom(SINTESI_DIFFICILE);
export const getSintesiChiusura     = () => varianteRandom(SINTESI_CHIUSURA);
