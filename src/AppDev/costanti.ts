import type { League } from '../types';

// --- CONFIGURAZIONE API ---

// 1. API Node.js
export const API_BASE = 'https://api-6b34yfzjia-uc.a.run.app';

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
  { id: 'LEAGUE_ONE', name: 'League One', country: 'England' },
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

  // NUOVI CAMPIONATI (24/03/2026)
  { id: 'LEAGUE_TWO', name: 'League Two', country: 'England' },
  { id: 'VEIKKAUSLIIGA', name: 'Veikkausliiga', country: 'Finland' },
  { id: 'LIGA_3', name: '3. Liga', country: 'Germany' },
  { id: 'LIGA_MX', name: 'Liga MX', country: 'Mexico' },
  { id: 'EERSTE_DIVISIE', name: 'Eerste Divisie', country: 'Netherlands' },
  { id: 'LIGA_PORTUGAL_2', name: 'Liga Portugal 2', country: 'Portugal' },
  { id: 'BIR_LIG', name: '1. Lig', country: 'Turkey' },
  { id: 'SAUDI_PRO_LEAGUE', name: 'Saudi Pro League', country: 'Saudi Arabia' },
  { id: 'SCOTTISH_CHAMPIONSHIP', name: 'Scottish Champ.', country: 'Scotland' },
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
  'LEAGUE_ONE': `${STEMMI_BASE}campionati%2Fleague_one.png?alt=media`,
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
  // Nuovi campionati (24/03/2026)
  'LEAGUE_TWO': `${STEMMI_BASE}campionati%2Fleague_two.png?alt=media`,
  'VEIKKAUSLIIGA': `${STEMMI_BASE}campionati%2Fveikkausliiga.png?alt=media`,
  'LIGA_3': `${STEMMI_BASE}campionati%2F3_liga.png?alt=media`,
  'LIGA_MX': `${STEMMI_BASE}campionati%2Fliga_mx.png?alt=media`,
  'EERSTE_DIVISIE': `${STEMMI_BASE}campionati%2Feerste_divisie.png?alt=media`,
  'LIGA_PORTUGAL_2': `${STEMMI_BASE}campionati%2Fliga_portugal_2.png?alt=media`,
  'BIR_LIG': `${STEMMI_BASE}campionati%2F1_lig.png?alt=media`,
  'SAUDI_PRO_LEAGUE': `${STEMMI_BASE}campionati%2Fsaudi_pro_league.png?alt=media`,
  'SCOTTISH_CHAMPIONSHIP': `${STEMMI_BASE}campionati%2Fscottish_championship.png?alt=media`,
};

export const STEMMI_COPPE: Record<string, string> = {
  'UCL': `${STEMMI_BASE}coppe%2Fucl.png?alt=media`,
  'UEL': `${STEMMI_BASE}coppe%2Fuel.png?alt=media`,
};


// --- TEMI ---
export type ThemeMode = 'dark' | 'light';

export const themeDark = {
  bg: '#05070a',
  panel: 'rgba(25, 28, 45, 0.95)',
  panelSolid: '#0d0f1a',
  panelBorder: '1px solid rgba(0, 240, 255, 0.2)',
  cyan: '#00f0ff',
  purple: '#bc13fe',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6',
  warning: '#ff9f43',
  gold: '#ffd700',
  orange: '#ff6b35',
  font: '"Inter", "Segoe UI", sans-serif',
  // Spreadsheet/tabelle
  cellBorder: '1px solid rgba(255,255,255,0.06)',
  headerBg: 'rgba(0, 240, 255, 0.06)',
  rowEven: 'rgba(255,255,255,0.04)',
  rowOdd: 'rgba(255,255,255,0.015)',
  rowHover: 'rgba(0,240,255,0.04)',
  // Dashboard/card
  cardBg: 'rgba(20, 22, 35, 0.6)',
  cardHoverBg: 'rgba(30, 35, 50, 0.8)',
  borderSubtle: 'rgba(255,255,255,0.2)',
  surfaceSubtle: '#1e2337',
  // Superfici graduali
  surface05: 'rgba(255,255,255,0.12)',
  surface08: 'rgba(255,255,255,0.15)',
  surface15: 'rgba(255,255,255,0.15)',
  // Hit/Miss (pronostici)
  hitText: '#00ff88',
  hitBg: 'rgba(0,255,136,0.15)',
  hitBgSoft: 'rgba(0,255,136,0.10)',
  hitBorder: 'rgba(0,255,136,0.3)',
  missText: '#ff4466',
  missBg: 'rgba(255,68,102,0.15)',
  missBgSoft: 'rgba(255,68,102,0.10)',
  missBorder: 'rgba(255,68,102,0.3)',
  // LIVE badge
  liveText: '#ff1744',
  liveBg: 'rgba(255,23,68,0.12)',
  liveBorder: 'rgba(255,23,68,0.3)',
  // Popover/Card espandibile
  popoverBg: '#1a1a24',
  // Testo secondario extra
  textMuted: '#aaa',
  textFaint: '#999',
  textDisabled: '#666',
  // Finanza
  financePositive: '#69f0ae',
  financeNegative: '#ff4466',
  quotaText: '#4dd0e1',
};

export const themeLight = {
  bg: '#f0f2f5',
  panel: '#ffffff',
  panelSolid: '#ffffff',
  panelBorder: '1px solid rgba(0, 0, 0, 0.20)',
  cyan: '#0077cc',
  purple: '#7c3aed',
  text: '#1a1a2e',
  textDim: '#5a6377',
  danger: '#dc2626',
  success: '#059669',
  warning: '#d97706',
  gold: '#b8860b',
  orange: '#ea580c',
  font: '"Inter", "Segoe UI", sans-serif',
  // Spreadsheet/tabelle
  cellBorder: '1px solid rgba(0,0,0,0.08)',
  headerBg: 'rgba(0, 119, 204, 0.06)',
  rowEven: 'rgba(0,0,0,0.05)',
  rowOdd: 'rgba(0,0,0,0.02)',
  rowHover: 'rgba(0,119,204,0.04)',
  // Dashboard/card
  cardBg: 'rgba(255, 255, 255, 0.85)',
  cardHoverBg: 'rgba(235, 238, 248, 0.95)',
  borderSubtle: 'rgba(0,0,0,0.1)',
  surfaceSubtle: 'rgba(255,255,255,0.85)',
  // Superfici graduali
  surface05: 'rgba(0,0,0,0.04)',
  surface08: 'rgba(0,0,0,0.07)',
  surface15: 'rgba(0,0,0,0.12)',
  // Hit/Miss (pronostici)
  hitText: '#059669',
  hitBg: '#bbf7d0',
  hitBgSoft: '#dcfce7',
  hitBorder: '#86efac',
  missText: '#dc2626',
  missBg: '#fecaca',
  missBgSoft: '#fee2e2',
  missBorder: '#fca5a5',
  // LIVE badge
  liveText: '#dc2626',
  liveBg: 'rgba(220,38,38,0.08)',
  liveBorder: 'rgba(220,38,38,0.25)',
  // Popover/Card espandibile
  popoverBg: '#ffffff',
  // Testo secondario extra
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  textDisabled: '#d1d5db',
  // Finanza
  financePositive: '#059669',
  financeNegative: '#dc2626',
  quotaText: '#0077cc',
};

export function getThemeMode(): ThemeMode {
  return (localStorage.getItem('puppals_theme') || 'dark') as ThemeMode;
}

export function getTheme(): typeof themeDark {
  return getThemeMode() === 'light' ? themeLight : themeDark;
}

// Compatibilità — usato da componenti che importano `theme` direttamente
export const theme = themeDark;

// --- TEMA MOBILE (più chiaro, solo < 768px) ---
export const themeMobileDark = {
  bg: '#1a1d2e',
  panel: 'rgba(37, 40, 54, 0.92)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.15)',
  sidebarBg: 'rgba(26, 29, 46, 0.98)',
};

export const themeMobileLight = {
  bg: '#e8eaf0',
  panel: 'rgba(255, 255, 255, 0.95)',
  panelBorder: '1px solid rgba(0, 0, 0, 0.18)',
  sidebarBg: 'rgba(245, 246, 250, 0.98)',
};

// Compatibilità
export const themeMobile = themeMobileDark;

export function getMobileTheme(): typeof themeMobileDark {
  return getThemeMode() === 'light' ? themeMobileLight : themeMobileDark;
}


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
