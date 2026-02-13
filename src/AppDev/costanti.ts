import type { League } from '../types';

// --- CONFIGURAZIONE API ---

// 1. API Node.js
export const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// 2. API PYTHON AI -> FORZIAMO IL CLOUD!
export const AI_ENGINE_URL = 'https://run-simulation-6b34yfzjia-uc.a.run.app';


// --- MAPPA CAMPIONATI ---
export const LEAGUES_MAP: League[] = [
  // ITALIA
  { id: 'SERIE_A', name: 'Serie A', country: 'Italy' },
  { id: 'SERIE_B', name: 'Serie B', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_A', name: 'Serie C - Gir A', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_B', name: 'Serie C - Gir B', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_C', name: 'Serie C - Gir C', country: 'Italy' },

  // EUROPA TOP
  { id: 'PREMIER_LEAGUE', name: 'Premier League', country: 'England' },
  { id: 'LA_LIGA', name: 'La Liga', country: 'Spain' },
  { id: 'BUNDESLIGA', name: 'Bundesliga', country: 'Germany' },
  { id: 'LIGUE_1', name: 'Ligue 1', country: 'France' },
  { id: 'EREDIVISIE', name: 'Eredivisie', country: 'Netherlands' },
  { id: 'LIGA_PORTUGAL', name: 'Liga Portugal', country: 'Portugal' },

  // EUROPA SERIE B
  { id: 'CHAMPIONSHIP', name: 'Championship', country: 'England' },
  { id: 'LA_LIGA_2', name: 'LaLiga 2', country: 'Spain' },
  { id: 'BUNDESLIGA_2', name: '2. Bundesliga', country: 'Germany' },
  { id: 'LIGUE_2', name: 'Ligue 2', country: 'France' },

  // EUROPA NORDICI + EXTRA
  { id: 'SCOTTISH_PREMIERSHIP', name: 'Scottish Prem.', country: 'Scotland' },
  { id: 'ALLSVENSKAN', name: 'Allsvenskan', country: 'Sweden' },
  { id: 'ELITESERIEN', name: 'Eliteserien', country: 'Norway' },
  { id: 'SUPERLIGAEN', name: 'Superligaen', country: 'Denmark' },
  { id: 'JUPILER_PRO_LEAGUE', name: 'Jupiler Pro', country: 'Belgium' },
  { id: 'SUPER_LIG', name: 'Süper Lig', country: 'Turkey' },
  { id: 'LEAGUE_OF_IRELAND', name: 'League of Ireland', country: 'Ireland' },

  // AMERICHE
  { id: 'BRASILEIRAO', name: 'Brasileirão', country: 'Brazil' },
  { id: 'PRIMERA_DIVISION_ARG', name: 'Primera División', country: 'Argentina' },
  { id: 'MLS', name: 'MLS', country: 'USA' },

  // ASIA
  { id: 'J1_LEAGUE', name: 'J1 League', country: 'Japan' },
];


// --- URL BASE STEMMI ---
export const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

export const STEMMI_CAMPIONATI: Record<string, string> = {
  'SERIE_A': `${STEMMI_BASE}campionati%2Fserie_a.png?alt=media`,
  'SERIE_B': `${STEMMI_BASE}campionati%2Fserie_b.png?alt=media`,
  'SERIE_C_A': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'SERIE_C_B': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'SERIE_C_C': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'PREMIER_LEAGUE': `${STEMMI_BASE}campionati%2Fpremier_league.png?alt=media`,
  'LA_LIGA': `${STEMMI_BASE}campionati%2Fla_liga.png?alt=media`,
  'BUNDESLIGA': `${STEMMI_BASE}campionati%2Fbundesliga.png?alt=media`,
  'LIGUE_1': `${STEMMI_BASE}campionati%2Fligue_1.png?alt=media`,
  'LIGA_PORTUGAL': `${STEMMI_BASE}campionati%2Fliga_portugal.png?alt=media`,
  'CHAMPIONSHIP': `${STEMMI_BASE}campionati%2Fchampionship.png?alt=media`,
  'LA_LIGA_2': `${STEMMI_BASE}campionati%2Fla_liga_2.png?alt=media`,
  'BUNDESLIGA_2': `${STEMMI_BASE}campionati%2Fbundesliga_2.png?alt=media`,
  'LIGUE_2': `${STEMMI_BASE}campionati%2Fligue_2.png?alt=media`,
  'EREDIVISIE': `${STEMMI_BASE}campionati%2Feredivisie.png?alt=media`,
  'SCOTTISH_PREMIERSHIP': `${STEMMI_BASE}campionati%2Fscottish_premiership.png?alt=media`,
  'ALLSVENSKAN': `${STEMMI_BASE}campionati%2Fallsvenskan.png?alt=media`,
  'ELITESERIEN': `${STEMMI_BASE}campionati%2Feliteserien.png?alt=media`,
  'SUPERLIGAEN': `${STEMMI_BASE}campionati%2Fsuperligaen.png?alt=media`,
  'JUPILER_PRO_LEAGUE': `${STEMMI_BASE}campionati%2Fjupiler_pro_league.png?alt=media`,
  'SUPER_LIG': `${STEMMI_BASE}campionati%2Fsuper_lig.png?alt=media`,
  'LEAGUE_OF_IRELAND': `${STEMMI_BASE}campionati%2Fleague_of_ireland.png?alt=media`,
  'BRASILEIRAO': `${STEMMI_BASE}campionati%2Fbrasileirao.png?alt=media`,
  'PRIMERA_DIVISION_ARG': `${STEMMI_BASE}campionati%2Fprimera_division_arg.png?alt=media`,
  'MLS': `${STEMMI_BASE}campionati%2Fmls.png?alt=media`,
  'J1_LEAGUE': `${STEMMI_BASE}campionati%2Fj1_league.png?alt=media`,
};

export const STEMMI_COPPE: Record<string, string> = {
  'UCL': `${STEMMI_BASE}coppe%2Fucl.png?alt=media`,
  'UEL': `${STEMMI_BASE}coppe%2Fuel.png?alt=media`,
};


// --- TEMA NEON / SCI-FI ---
export const theme = {
  bg: '#05070a',
  panel: 'rgba(18, 20, 35, 0.85)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.2)',
  cyan: '#00f0ff',
  purple: '#bc13fe',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6',
  warning: '#ff9f43',
  font: '"Inter", "Segoe UI", sans-serif'
};

// --- TEMA MOBILE (più chiaro, solo < 768px) ---
export const themeMobile = {
  bg: '#1a1d2e',
  panel: 'rgba(37, 40, 54, 0.92)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.15)',
  sidebarBg: 'rgba(26, 29, 46, 0.98)',
};


// --- PRESET VELOCITA' ---
export const SPEED_PRESETS = [
  { id: 1, label: '⚡ TURBO', cycles: 100, desc: '~3 sec/match' },
  { id: 2, label: '🏃 RAPIDO', cycles: 250, desc: '~6 sec/match' },
  { id: 3, label: '🚶 VELOCE', cycles: 500, desc: '~12 sec/match' },
  { id: 4, label: '⚖️ STANDARD', cycles: 20, desc: '🚀 RAPIDO' },
  { id: 5, label: '🎯 ACCURATO', cycles: 2500, desc: '~60 sec/match' },
  { id: 6, label: '🔬 PRECISO', cycles: 5000, desc: '~2 min/match' },
  { id: 7, label: '💎 ULTRA', cycles: 12500, desc: '~5 min/match' },
  { id: 8, label: '✏️ CUSTOM', cycles: 0, desc: 'Manuale' },
];
