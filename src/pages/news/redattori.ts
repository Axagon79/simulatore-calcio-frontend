// redattori.ts
// =============
// Anagrafica redattori AI della pagina News.
//
// Concept: la "redazione" e' una finzione narrativa che umanizza il prodotto.
// Ogni partita viene assegnata a un redattore (80% allo specialista della lega,
// 20% a un altro a caso), che firma sia l'articolo che i pronostici mostrati
// nel sidecar "Le nostre preferenze". I pronostici sono scelti algoritmicamente
// per confidence (la specializzazione di mercato e' solo colore narrativo).

export type MercatoPreferito =
  | 'Segno (1X2/DC)'
  | 'Over/Under'
  | 'Gol/No Gol'
  | 'Risultato esatto'
  | 'Pre-partita / Interpretazione tattica'
  | 'Statistico puro'
  | 'Mente aperta (tutti)';

export interface Redattore {
  id: string;             // slug, usato come hash chiave
  nome: string;
  classe: number;         // anno di nascita
  citta: string;
  paese_origine?: string; // se diverso da citta (es. Valentina: Italia -> Argentina)
  squadra_cuore: string;
  leghe_specialista: string[]; // nomi lega come in daily_predictions_unified.league
  mercati_preferiti: MercatoPreferito[]; // 1+ mercati (puo' essere "Mente aperta")
  bio: string;
}

// Direttore: figura unica sopra ai redattori.
export const DIRETTORE: Redattore = {
  id: 'lorenzo',
  nome: 'Lorenzo',
  classe: 1979,
  citta: 'Trieste',
  squadra_cuore: 'Triestina',
  leghe_specialista: [], // il direttore non firma partite specifiche
  mercati_preferiti: ['Mente aperta (tutti)'],
  bio: 'Triestino, classe 1979. Fondatore di AI Simulator. Esperto conoscitore del mondo delle scommesse sportive e della tecnologia. Dirige la prima redazione di calcio interamente AI.',
};

// Lista dei 12 redattori della redazione AI.
// L'ordine determina anche l'ordine di display nella pagina "Redazione".
export const REDATTORI: Redattore[] = [
  {
    id: 'luca',
    nome: 'Luca',
    classe: 1981,
    citta: 'Milano',
    squadra_cuore: 'Milan',
    leghe_specialista: ['Serie A', 'Serie B', 'Serie C', 'Serie C - Girone A', 'Serie C - Girone B', 'Serie C - Girone C', 'Coppa Italia'],
    mercati_preferiti: ['Mente aperta (tutti)'],
    bio: 'Milanese, classe 1981. Esperto di Serie A da oltre 15 anni. Tifoso del Milan.',
  },
  {
    id: 'sofia',
    nome: 'Sofia',
    classe: 1990,
    citta: 'Londra',
    squadra_cuore: 'Barcellona',
    leghe_specialista: ['Premier League', 'Championship', 'League One', 'League Two', 'Scottish Premiership', 'Scottish Championship', 'FA Cup', 'Carabao Cup'],
    mercati_preferiti: ['Over/Under'],
    bio: 'Britannica, classe 1990. Si occupa di calcio inglese e scozzese. Tifosa del Barcellona.',
  },
  {
    id: 'francesca',
    nome: 'Francesca',
    classe: 1988,
    citta: 'Roma',
    squadra_cuore: 'Arsenal',
    leghe_specialista: ['La Liga', 'LaLiga 2', 'Liga Portugal', 'Primeira Liga', 'Liga Portugal 2', 'Copa del Rey'],
    mercati_preferiti: ['Pre-partita / Interpretazione tattica'],
    bio: 'Romana, classe 1988. Segue La Liga e la Liga Portugal. Tifosa dell’Arsenal.',
  },
  {
    id: 'klaus',
    nome: 'Klaus',
    classe: 1976,
    citta: 'Monaco di Baviera',
    squadra_cuore: 'Bayern Monaco',
    leghe_specialista: ['Bundesliga', '2. Bundesliga', '3. Liga', 'DFB Pokal'],
    mercati_preferiti: ['Statistico puro', 'Gol/No Gol'],
    bio: 'Bavarese, classe 1976. Specializzato sul calcio tedesco. Tifoso del Bayern Monaco.',
  },
  {
    id: 'camille',
    nome: 'Camille',
    classe: 1992,
    citta: 'Parigi',
    squadra_cuore: 'Paris Saint-Germain',
    leghe_specialista: ['Ligue 1', 'Ligue 2', 'Coupe de France', 'Jupiler Pro League'],
    mercati_preferiti: ['Gol/No Gol'],
    bio: 'Parigina, classe 1992. Si occupa di Ligue 1, Ligue 2 e Jupiler Pro League. Tifosa del Paris Saint-Germain.',
  },
  {
    id: 'lars',
    nome: 'Lars',
    classe: 1985,
    citta: 'Stoccolma',
    squadra_cuore: 'Göteborg',
    leghe_specialista: ['Allsvenskan', 'Eliteserien', 'Superligaen', 'Veikkausliiga'],
    mercati_preferiti: ['Mente aperta (tutti)'],
    bio: 'Svedese, classe 1985. Esperto dei campionati nordici. Tifoso del Göteborg.',
  },
  {
    id: 'hans',
    nome: 'Hans',
    classe: 1979,
    citta: 'Amsterdam',
    squadra_cuore: 'Ajax',
    leghe_specialista: ['Eredivisie', 'Eerste Divisie'],
    mercati_preferiti: ['Gol/No Gol'],
    bio: 'Olandese, classe 1979. Segue l’Eredivisie e l’Eerste Divisie. Tifoso dell’Ajax.',
  },
  {
    id: 'joao',
    nome: 'João',
    classe: 1983,
    citta: 'Porto Alegre',
    squadra_cuore: 'Internacional Porto Alegre',
    leghe_specialista: ['Brasileirão Serie A', 'Brasileirao Serie A', 'Brasileirão Serie B', 'Brasileirao Serie B', 'Copa do Brasil'],
    mercati_preferiti: ['Segno (1X2/DC)'],
    bio: 'Brasiliano, classe 1983. Si occupa di Brasileirão Serie A e B. Tifoso dell’Internacional Porto Alegre.',
  },
  {
    id: 'valentina',
    nome: 'Valentina',
    classe: 1989,
    citta: 'Buenos Aires',
    paese_origine: 'Italia',
    squadra_cuore: 'Nazionale Argentina',
    leghe_specialista: ['Primera División', 'Liga MX', 'MLS', 'Major League Soccer'],
    mercati_preferiti: ['Risultato esatto'],
    bio: 'Italiana, classe 1989, si è trasferita in Argentina da giovane. Esperta di calcio sudamericano e MLS. Tifa solo la nazionale argentina.',
  },
  {
    id: 'ahmet',
    nome: 'Ahmet',
    classe: 1982,
    citta: 'Istanbul',
    squadra_cuore: 'Fenerbahçe',
    leghe_specialista: ['Süper Lig', 'Super Lig', '1. Lig', 'Saudi Pro League'],
    mercati_preferiti: ['Statistico puro'],
    bio: 'Turco, classe 1982. Segue Süper Lig, 1. Lig e Saudi Pro League. Tifoso del Fenerbahçe.',
  },
  {
    id: 'sean',
    nome: 'Sean',
    classe: 1987,
    citta: 'Dublino',
    squadra_cuore: 'Torino',
    leghe_specialista: ['League of Ireland Premier Division', 'League of Ireland'],
    mercati_preferiti: ['Pre-partita / Interpretazione tattica'],
    bio: 'Irlandese, classe 1987. Si occupa della League of Ireland. Tifoso del Torino.',
  },
  {
    id: 'marco',
    nome: 'Marco',
    classe: 1980,
    citta: 'Torino',
    squadra_cuore: 'Juventus',
    // Marco e' il "tappabuchi": copre Champions, Europa League e tutte le leghe
    // non coperte da nessuno specialista. Il sistema di assegnazione lo usa
    // come fallback (vedi assegnaRedattore in assegnazione.ts).
    leghe_specialista: ['Champions League', 'Europa League'],
    mercati_preferiti: ['Segno (1X2/DC)', 'Over/Under'],
    bio: 'Italiano, classe 1980. Si occupa di Champions League, Europa League e dei campionati minori non coperti dagli altri redattori. Tifoso della Juventus.',
  },
];

// Indice rapido id -> redattore (per lookup nei componenti).
export const REDATTORI_BY_ID: Record<string, Redattore> = Object.fromEntries(
  REDATTORI.map(r => [r.id, r])
);

// Indice lega -> redattore specialista (primo che la copre).
export const SPECIALISTA_LEGA: Record<string, Redattore> = {};
for (const r of REDATTORI) {
  for (const lega of r.leghe_specialista) {
    if (!SPECIALISTA_LEGA[lega]) SPECIALISTA_LEGA[lega] = r;
  }
}
