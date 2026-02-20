import { useState, useEffect, useMemo, useRef } from 'react';
import { checkAdmin } from './permissions';

type StatusFilter = 'tutte' | 'live' | 'da_giocare' | 'finite' | 'centrate' | 'mancate';

// --- TEMA (identico ad AppDev) ---
const theme = {
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
  gold: '#ffd700',
  orange: '#ff6b35',
  font: '"Inter", "Segoe UI", sans-serif'
};

// --- HELPER: normalizza score per confronto ---
const normalizeScore = (s: string): string => s.replace(/\s/g, '').replace(':', '-');

// --- URL BASE STEMMI ---
const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

// --- API BASE ---
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// --- MAPPA LEGA → CARTELLA STEMMI ---
const LEAGUE_TO_FOLDER: Record<string, string> = {
  'Serie A': 'Italy', 'Serie B': 'Italy', 'Serie C - Girone A': 'Italy', 'Serie C - Girone B': 'Italy', 'Serie C - Girone C': 'Italy',
  'Premier League': 'England', 'Championship': 'England',
  'La Liga': 'Spain', 'LaLiga 2': 'Spain',
  'Bundesliga': 'Germany', '2. Bundesliga': 'Germany',
  'Ligue 1': 'France', 'Ligue 2': 'France',
  'Liga Portugal': 'Portugal', 'Primeira Liga': 'Portugal',
  'Eredivisie': 'Netherlands',
  'Scottish Prem.': 'Scotland', 'Scottish Premiership': 'Scotland',
  'Allsvenskan': 'Sweden',
  'Eliteserien': 'Norway',
  'Superligaen': 'Denmark',
  'Jupiler Pro': 'Belgium', 'Jupiler Pro League': 'Belgium',
  'Süper Lig': 'Turkey', 'Super Lig': 'Turkey',
  'League of Ireland': 'Ireland', 'League of Ireland Premier Division': 'Ireland',
  'Brasileirão': 'Brazil', 'Brasileirao': 'Brazil', 'Brasileirão Serie A': 'Brazil', 'Brasileirao Serie A': 'Brazil',
  'Primera División': 'Argentina',
  'MLS': 'USA',
  'J1 League': 'Japan',
  'Champions League': 'Champions_League',
  'Europa League': 'Europa_League',
};

const LEAGUE_TO_LOGO: Record<string, string> = {
    'Serie A': 'serie_a', 'Serie B': 'serie_b',
    'Serie C - Girone A': 'serie_c', 'Serie C - Girone B': 'serie_c', 'Serie C - Girone C': 'serie_c',
    'Premier League': 'premier_league', 'Championship': 'championship',
    'La Liga': 'la_liga', 'LaLiga 2': 'la_liga_2',
    'Bundesliga': 'bundesliga', '2. Bundesliga': 'bundesliga_2',
    'Ligue 1': 'ligue_1', 'Ligue 2': 'ligue_2',
    'Liga Portugal': 'liga_portugal', 'Primeira Liga': 'liga_portugal',
    'Eredivisie': 'eredivisie',
    'Scottish Prem.': 'scottish_premiership', 'Scottish Premiership': 'scottish_premiership',
    'Allsvenskan': 'allsvenskan',
    'Eliteserien': 'eliteserien',
    'Superligaen': 'superligaen',
    'Jupiler Pro': 'jupiler_pro_league', 'Jupiler Pro League': 'jupiler_pro_league',
    'Süper Lig': 'super_lig', 'Super Lig': 'super_lig',
    'League of Ireland': 'league_of_ireland', 'League of Ireland Premier Division': 'league_of_ireland',
    'Brasileirão': 'brasileirao', 'Brasileirao': 'brasileirao', 'Brasileirão Serie A': 'brasileirao', 'Brasileirao Serie A': 'brasileirao',
    'Primera División': 'primera_division_arg',
    'MLS': 'mls',
    'J1 League': 'j1_league',
  };

  const CUP_LOGOS: Record<string, string> = {
    'Champions League': 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2Fcoppe%2Fucl.png?alt=media&token=bfd5e2d6-ae85-4e9e-88e9-834fce430465',
    'Europa League': 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2Fcoppe%2Fuel.png?alt=media&token=82b3a3ab-e37e-4afe-9130-d0db3ab1f680',
  };

  const getLeagueLogoUrl = (league: string): string => {
    if (CUP_LOGOS[league]) return CUP_LOGOS[league];
    const file = LEAGUE_TO_LOGO[league];
    if (!file) return '';
    return `https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2Fcampionati%2F${file}.png?alt=media`;
  };

const getStemmaUrl = (mongoId: string | undefined, league: string): string => {
  if (!mongoId) return '';
  const folder = LEAGUE_TO_FOLDER[league] || 'Altro';
  return `${STEMMI_BASE}squadre%2F${folder}%2F${mongoId}.png?alt=media`;
};

const LEAGUE_TO_COUNTRY_CODE: Record<string, string> = {
    'Serie A': 'it', 'Serie B': 'it',
    'Serie C - Girone A': 'it', 'Serie C - Girone B': 'it', 'Serie C - Girone C': 'it',
    'Premier League': 'gb-eng', 'Championship': 'gb-eng',
    'La Liga': 'es', 'LaLiga 2': 'es',
    'Bundesliga': 'de', '2. Bundesliga': 'de',
    'Ligue 1': 'fr', 'Ligue 2': 'fr',
    'Liga Portugal': 'pt', 'Primeira Liga': 'pt',
    'Eredivisie': 'nl',
    'Scottish Prem.': 'gb-sct', 'Scottish Premiership': 'gb-sct',
    'Allsvenskan': 'se',
    'Eliteserien': 'no',
    'Superligaen': 'dk',
    'Jupiler Pro': 'be', 'Jupiler Pro League': 'be',
    'Süper Lig': 'tr', 'Super Lig': 'tr',
    'League of Ireland': 'ie', 'League of Ireland Premier Division': 'ie',
    'Brasileirão': 'br', 'Brasileirao': 'br','Brasileirão Serie A': 'br', 'Brasileirao Serie A': 'br',
    'Primera División': 'ar',
    'MLS': 'us',
    'J1 League': 'jp',
  };

// --- INTERFACCE ---
interface Prediction {
  date: string;
  home: string;
  away: string;
  league: string;
  match_time: string;
  home_mongo_id?: string;
  away_mongo_id?: string;
  decision: string;
  pronostici: Array<{
    tipo: string; pronostico: string; confidence: number; stars: number; quota?: number; hit?: boolean | null;
    probabilita_stimata?: number | null; stake?: number; edge?: number; profit_loss?: number | null;
    prob_mercato?: number | null; prob_modello?: number | null; has_odds?: boolean;
  }>;
  confidence_segno: number;
  confidence_gol: number;
  stars_segno: number;
  stars_gol: number;
  comment: string | { segno?: string; gol?: string; doppia_chance?: string; gol_extra?: string };
  odds: { '1': number; '2': number; 'X': number; src?: string;
    over_15?: number; under_15?: number; over_25?: number; under_25?: number;
    over_35?: number; under_35?: number; gg?: number; ng?: number;
    src_ou_gg?: string; };
  segno_dettaglio: Record<string, number>;
  gol_dettaglio: Record<string, number>;
  gol_directions?: Record<string, string>;
  segno_dettaglio_raw?: {
    bvs?: { home: number; away: number; scala: string };
    quote?: { home: number; away: number; scala: string };
    lucifero?: { home: number; away: number; scala: string };
    affidabilita?: { home: string; away: string; home_num: number; away_num: number; scala: string };
    dna?: { home: number; away: number; scala: string };
    motivazioni?: { home: number; away: number; scala: string };
    h2h?: { home: number; away: number; matches: number; scala: string };
    campo?: { home: number; away: number; scala: string };
  };
  expected_total_goals?: number;
  league_avg_goals?: number;
  // Strisce (curva a campana)
  streak_home?: Record<string, number>;
  streak_away?: Record<string, number>;
  streak_home_context?: Record<string, number>;
  streak_away_context?: Record<string, number>;
  streak_adjustment_segno?: number;
  streak_adjustment_gol?: number;
  streak_adjustment_ggng?: number;
  // Risultati reali (dal backend)
  real_score?: string | null;
  real_sign?: string | null;
  match_finished?: boolean;
  hit?: boolean | null;
  // Live scores (polling)
  live_score?: string | null;
  live_status?: string | null;
  live_minute?: number | null;
  // X Factor
  is_x_factor?: boolean;
  x_factor_signals?: string[];
  x_factor_n_signals?: number;
  x_factor_raw_score?: number;
  // Risultato Esatto
  is_exact_score?: boolean;
  exact_score_top3?: Array<{ score: string; prob: number }>;
  exact_score_gap?: number;
  // Analisi del Match (22 checker contraddizioni)
  analysis_free?: string;
  analysis_alerts?: Array<{ id: string; severity: number; text: string }>;
  analysis_score?: number;
  analysis_premium?: string;
}

interface Bomb {
  date: string;
  home: string;
  away: string;
  league: string;
  match_time: string;
  sfavorita: string;
  segno_bomba: string;
  confidence: number;
  stars: number;
  dettaglio: Record<string, number>;
  odds: { '1': number; '2': number; 'X': number; src?: string;
    over_15?: number; under_15?: number; over_25?: number; under_25?: number;
    over_35?: number; under_35?: number; gg?: number; ng?: number;
    src_ou_gg?: string; };
  comment: string;
  // Risultati reali (dal backend)
  real_score?: string | null;
  real_sign?: string | null;
  match_finished?: boolean;
  hit?: boolean | null;
  // Live scores (polling)
  live_score?: string | null;
  live_status?: string | null;
  live_minute?: number | null;
}

// --- HELPERS ---
const getGolQuota = (pronostico: string, odds: any): number | null => {
  const map: Record<string, string> = {
    'Over 1.5': 'over_15', 'Under 1.5': 'under_15',
    'Over 2.5': 'over_25', 'Under 2.5': 'under_25',
    'Over 3.5': 'over_35', 'Under 3.5': 'under_35',
    'Goal': 'gg', 'NoGoal': 'ng',
  };
  const key = map[pronostico];
  return key && odds[key] != null ? odds[key] : null;
};

const getConfidenceColor = (conf: number): string => {
  if (conf >= 70) return theme.success;
  if (conf >= 55) return theme.cyan;
  if (conf >= 40) return theme.warning;
  return theme.danger;
};

const getStakeLabel = (stake: number): string => {
  if (stake === 0) return 'No Value';
  if (stake === 1) return 'Prudenziale';
  if (stake === 2) return 'Standard';
  if (stake === 3) return 'Buona';
  if (stake >= 4 && stake <= 5) return 'Alta';
  return 'Top Bet';
};

const getStakeColor = (stake: number): string => {
  if (stake === 0) return '#666';
  if (stake <= 2) return '#4dd0e1';
  if (stake <= 3) return '#66bb6a';
  if (stake <= 5) return '#ffa726';
  return '#ff5252';
};

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shiftDate = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Etichette leggibili per i dettagli
const SEGNO_LABELS: Record<string, string> = {
  bvs: 'MAP Index',
  quote: 'Quote',
  lucifero: 'Forma Recente',
  affidabilita: 'Coerenza Squadre',
  dna: 'DNA Tecnico',
  motivazioni: 'Motivazioni',
  h2h: 'Scontri Diretti',
  campo: 'Fattore Campo',
  // Coppe UCL/UEL
  forma: 'Forma Coppa',
  potenza: 'Potenza',
  rendimento: 'Rendimento Coppa',
  solidita: 'Solidità',
};
const GOL_LABELS: Record<string, string> = {
  media_gol: 'Media Gol', att_vs_def: 'Att vs Def', xg: 'xG',
  h2h_gol: 'H2H Gol', media_lega: 'Media Lega', dna_off_def: 'DNA Off/Def',
  // Coppe UCL/UEL
  quote_ou: 'Quote O/U', over_pct: 'Over% Storico', fragilita: 'Fragilità Difensiva',
  gg_prob_segna_home: 'Prob. Gol Casa', gg_prob_segna_away: 'Prob. Gol Trasferta',
  gg_quote_ggng: 'Quote GG/NG', gg_h2h_media: 'H2H + Media Gol',
};

// --- COMPONENTE PRINCIPALE ---
interface UnifiedPredictionsProps {
  onBack: () => void;
  onNavigateToLeague?: (leagueName: string) => void;
}

export default function UnifiedPredictions({ onBack, onNavigateToLeague }: UnifiedPredictionsProps) {
  const [date, setDate] = useState(getToday());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'pronostici' | 'alto_rendimento'>('pronostici');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [bombStats] = useState<{total:number,finished:number,pending:number,hits:number,misses:number,hit_rate:number|null}>({total:0,finished:0,pending:0,hits:0,misses:0,hit_rate:null});
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection2 = (id: string) => setCollapsedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isAdmin = checkAdmin();
  const [premiumAnalysis, setPremiumAnalysis] = useState<Record<string, string>>({});
  const [premiumLoading, setPremiumLoading] = useState<Record<string, boolean>>({});
  const [analysisTab, setAnalysisTab] = useState<Record<string, 'free' | 'premium'>>({});

  // --- Premium Unlock (sequenza segreta P-F-P-F-P-F-P-P-P-P-P, max 2s tra click) ---
  const UNLOCK_SEQ = 'pfpfpfppppp';
  const PREMIUM_HASH = 'a39607';  // hash offuscato
  const [tabSeq, setTabSeq] = useState('');
  const [showPwPrompt, setShowPwPrompt] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [isPremiumUser] = useState(() => localStorage.getItem('pp_pu') === '1');
  const lastClickRef = useRef(0);
  const trackTabClick = (tab: 'f' | 'p') => {
    const now = Date.now();
    const elapsed = now - lastClickRef.current;
    lastClickRef.current = now;
    // Reset se più di 2 secondi dall'ultimo click
    const base = elapsed > 2000 ? '' : tabSeq;
    const next = (base + tab).slice(-11);
    setTabSeq(next);
    if (next === UNLOCK_SEQ) { setShowPwPrompt(true); setTabSeq(''); }
  };
  const verifyPw = (input: string) => {
    // Simple hash: somma charCode * posizione, poi hex troncato
    let h = 0; for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    const hex = (h >>> 0).toString(16).slice(-6);
    if (hex === PREMIUM_HASH) {
      localStorage.setItem('pp_pu', '1');
      window.location.reload();
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 2000);
    }
  };
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tutte');
  // Reset filtro al cambio data
  useEffect(() => {
    setStatusFilter('tutte');
  }, [date]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chiudi date picker al click fuori
  useEffect(() => {
    if (!datePickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [datePickerOpen]);

  // --- FETCH DATA (Unified endpoint) ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const predRes = await fetch(`${API_BASE}/simulation/daily-predictions-unified?date=${date}`);
        const predData = await predRes.json();

        if (predData.success) {
          setPredictions(predData.predictions || []);
        } else {
          setPredictions([]);
        }
        // Unified non ha bombe separate
        setBombs([]);
      } catch (err: any) {
        console.error('Errore fetch pronostici unified:', err);
        setError(err.message || 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  // --- POLLING LIVE SCORES (solo data di oggi) ---
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) return;

    const mergeLive = <T extends { home: string; away: string }>(items: T[], scores: Array<{ home: string; away: string; live_score: string; live_status: string; live_minute: number }>): T[] =>
      items.map(item => {
        const live = scores.find(s => s.home === item.home && s.away === item.away);
        return live ? { ...item, live_score: live.live_score, live_status: live.live_status, live_minute: live.live_minute } : item;
      });

    const pollLive = async () => {
      try {
        const res = await fetch(`${API_BASE}/live-scores?date=${today}`);
        const data = await res.json();
        if (data.success && data.scores?.length > 0) {
          const scores = data.scores;
          setPredictions(prev => mergeLive(prev, scores));
          setBombs(prev => mergeLive(prev, scores));
        }
      } catch { /* silenzioso */ }
    };

    pollLive();
    const interval = setInterval(pollLive, 15000);
    return () => clearInterval(interval);
  }, [date]);

  const toggleSection = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Chiudi popover tip quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = () => {
      setExpandedSections(prev => {
        let changed = false;
        const next = new Set(prev);
        for (const key of next) {
          if (key.endsWith('-tips')) {
            next.delete(key);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // --- RENDER DETTAGLIO ESPANDIBILE ---
  const renderDetailBar = (value: number, label: string, maxVal = 100) => {
    const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
    const color = value >= 70 ? theme.success : value >= 50 ? theme.cyan : value >= 35 ? theme.warning : theme.danger;
    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
          <span style={{ color: theme.textDim }}>{label}</span>
          <span style={{ color, fontWeight: 'bold' }}>{value.toFixed(1)}</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
      </div>
    );
  };

  // --- RENDER DETTAGLIO CON CONFRONTO SQUADRE ---
  const renderDetailBarWithTeams = (
    label: string,
    homeValue: number | string,
    awayValue: number | string,
    affidabilita: number,
    scala: string,
    homeName: string,
    awayName: string
  ) => {
    // Determina i valori numerici per le barre
    let homeNum = typeof homeValue === 'number' ? homeValue : 0;
    let awayNum = typeof awayValue === 'number' ? awayValue : 0;
    
    // Per affidabilità lettera (A=10, B=7, C=4, D=1)
    if (typeof homeValue === 'string' && scala === 'A-D') {
      const letterToNum: Record<string, number> = { 'A': 10, 'B': 7, 'C': 4, 'D': 1 };
      homeNum = letterToNum[homeValue] || 5;
      awayNum = letterToNum[awayValue as string] || 5;
    }
    
    // Calcola il max per la scala
    let maxVal = 100;
    if (scala === '/25') maxVal = 25;
    else if (scala === '/15') maxVal = 15;
    else if (scala === '/10') maxVal = 10;
    else if (scala === '/7') maxVal = 7;
    else if (scala === '±7') maxVal = 7;
    else if (scala === 'A-D') maxVal = 10;
    
    // Percentuali per le barre
    const homePct = Math.min(100, Math.max(0, (Math.abs(homeNum) / maxVal) * 100));
    const awayPct = Math.min(100, Math.max(0, (Math.abs(awayNum) / maxVal) * 100));
    
    // Calcola chi è favorito e di quanto
    let diffPct = 0;
    let favored = '';
    if (scala === '%') {
      diffPct = Math.abs(homeNum - awayNum);
      favored = homeNum > awayNum ? homeName : awayNum > homeNum ? awayName : '';
    } else if (scala === '±7') {
      // BVS: valore positivo = favorisce quella squadra
      diffPct = Math.abs(homeNum - awayNum) / 14 * 100;
      favored = homeNum > awayNum ? homeName : awayNum > homeNum ? awayName : '';
    } else {
      const total = homeNum + awayNum;
      if (total > 0) {
        diffPct = Math.abs(homeNum - awayNum) / total * 100;
      }
      favored = homeNum > awayNum ? homeName : awayNum > homeNum ? awayName : '';
    }
    
    // Colore barra affidabilità
    const affColor = affidabilita >= 70 ? theme.success : affidabilita >= 50 ? theme.cyan : affidabilita >= 35 ? theme.warning : theme.danger;
    
    // Frasi per equilibrio
    const frasi_equilibrio = ['Equilibrio', 'Alla pari', 'Nessun vantaggio', 'Situazione bilanciata', 'Pari condizioni'];
    const frase_random = frasi_equilibrio[Math.floor(Math.random() * frasi_equilibrio.length)];
    
    return (
      <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: label === 'Fattore Campo' ? 'none' : '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        {/* Linea verticale divisoria - solo desktop */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            right: '105px',
            top: '25px',
            bottom: '12px',
            width: '1px',
            background: 'rgba(255,255,255,0.1)'
          }} />
        )}
        {/* Titolo metrica + Vantaggio su mobile */}
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: theme.text }}>
            {label}
          </span>
          {isMobile && (
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '800',
              color: favored ? theme.success : theme.textDim,
              background: favored ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {favored ? `+${diffPct.toFixed(0)}% ${favored}` : frase_random}
            </span>
          )}
        </div>
        
        {/* Barra Affidabilità */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', color: theme.text, width: '85px', minWidth: '85px', maxWidth: '85px', position: 'relative', top: '-2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Affidabilità:</span>
          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '500px', alignSelf: 'center' }}>
            <div style={{ height: '100%', width: `${affidabilita}%`, background: affColor, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '14px', color: affColor, fontWeight: 'bold', minWidth: '35px' }}>{affidabilita.toFixed(1)}</span>
        </div>
        
        {/* Barra squadra casa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', color: theme.text, width: '85px', minWidth: '85px', maxWidth: '85px', position: 'relative', top: '-2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeName}:</span>
          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '500px' }}>
            <div style={{ height: '100%', width: `${homePct}%`, background: theme.cyan, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '14px', color: theme.text, fontWeight: 'bold', minWidth: '35px' }}>{typeof homeValue === 'number' ? homeValue.toFixed(1) : homeValue}</span>
          </div>
        
        {/* Barra squadra trasferta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: theme.text, width: '85px', minWidth: '85px', maxWidth: '85px', position: 'relative', top: '-2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayName}:</span>
          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '500px', alignSelf: 'center' }}>
            <div style={{ height: '100%', width: `${awayPct}%`, background: theme.purple, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '14px', color: theme.text, fontWeight: 'bold', minWidth: '35px' }}>{typeof awayValue === 'number' ? awayValue.toFixed(1) : awayValue}</span>
        </div>
        {/* Vantaggio posizionato a destra */}
        {!isMobile && (
        <span style={{ 
          position: 'absolute',
          right: '0',
          top: '55%',
          transform: 'translateY(-50%)',
          fontSize: '13px', 
          fontWeight: '800',
          color: 'rgb(48 203 9)',
          background: 'rgb(72 67 64 / 15%)',
          padding: favored ? '30px 0px' : '0',
          borderRadius: '4px',
          width: '100px',
          textAlign: 'center'
        }}>
          {favored ? `+${diffPct.toFixed(0)}% ${favored}` : frase_random}
        </span>
               )}
          </div>
          )}
           
        

// --- RENDER DETTAGLIO GOL CON DIREZIONE ---
const renderGolDetailBar = (value: number, label: string, direction?: string) => {
  const pct = Math.min(100, Math.max(0, value));
  const color = value >= 70 ? theme.success : value >= 50 ? theme.cyan : value >= 35 ? theme.warning : theme.danger;

  // Direzione compatta
  let dirText = '■ Neutro';
  let dirColor = theme.textDim;
  if (direction === 'over') {
    dirText = '▲ Over';
    dirColor = theme.success;
  } else if (direction === 'under') {
    dirText = '▼ Under';
    dirColor = theme.purple;
  } else if (direction === 'goal') {
    dirText = '⚽ Goal';
    dirColor = theme.success;
  } else if (direction === 'nogoal') {
    dirText = '🚫 NoGoal';
    dirColor = theme.warning;
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 55px 1px 40px',
        columnGap: '12px',
        fontSize: '11px',
        marginBottom: '3px',
        alignItems: 'center'
      }}>
        <span style={{ color: theme.textDim }}>{label}</span>
        <span style={{ color: dirColor, fontWeight: 'bold', fontSize: '10px', textAlign: 'left' }}>{dirText}</span>
        <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)' }} />
        <span style={{ color, fontWeight: 'bold', textAlign: 'right' }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

  

  const toggleLeague = (leagueName: string) => {
    setCollapsedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(leagueName)) next.delete(leagueName);
      else next.add(leagueName);
      return next;
    });
  };

  // --- HR% COLOR SCALE (5 livelli) ---
  const getHRColor = (hr: number, threshold: number): string => {
    if (hr < threshold * 0.5) return '#ff4466';      // rosso
    if (hr < threshold * 0.8) return '#ff9800';      // arancione
    if (hr < threshold) return '#cddc39';             // giallo-verdino
    if (hr < threshold * 1.4) return '#69f0ae';      // verde chiaro
    return '#00c853';                                  // verde scuro
  };

  // --- HELPERS STATUS FILTRO ---
  const getMatchStatus = (item: { date: string; match_time: string; real_score?: string | null; live_status?: string | null }): 'finished' | 'live' | 'to_play' => {
    if (item.real_score != null) return 'finished';
    if (item.live_status === 'Live' || item.live_status === 'HT') return 'live';
    if (item.live_status === 'Finished') return 'finished';
    if (item.date && item.match_time) {
      const kickoff = new Date(`${item.date}T${item.match_time}:00`);
      const now = new Date();
      if (kickoff <= now) {
        const hoursElapsed = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60);
        return hoursElapsed > 3 ? 'finished' : 'live';
      }
    }
    return 'to_play';
  };

  const predMatchesFilter = (pred: Prediction, filter: StatusFilter): boolean => {
    if (filter === 'tutte') return true;
    const status = getMatchStatus(pred);
    if (filter === 'live') return status === 'live';
    if (filter === 'da_giocare') return status === 'to_play';
    if (filter === 'finite') return status === 'finished';
    if (filter === 'centrate') return pred.pronostici?.some(p => p.hit === true) ?? false;
    if (filter === 'mancate') return pred.pronostici?.some(p => p.hit === false) ?? false;
    return true;
  };

  const bombMatchesFilter = (bomb: Bomb, filter: StatusFilter): boolean => {
    if (filter === 'tutte') return true;
    const status = getMatchStatus(bomb);
    if (filter === 'live') return status === 'live';
    if (filter === 'da_giocare') return status === 'to_play';
    if (filter === 'finite') return status === 'finished';
    if (filter === 'centrate') return bomb.hit === true;
    if (filter === 'mancate') return bomb.hit === false;
    return true;
  };

  // --- HELPER: quota di un singolo pronostico ---
  const getPronosticoQuota = (p: any, pred: Prediction): number | null => {
    return p.quota || (p.tipo === 'SEGNO' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
      || (p.tipo === 'DOPPIA_CHANCE' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
      || (p.tipo === 'GOL' && pred.odds ? getGolQuota(p.pronostico, pred.odds) : null);
  };

  // --- PARTIZIONAMENTO: Pronostici (<=2.50) vs Alto Rendimento (>2.50) ---
  const allNormalPreds = useMemo(() => predictions.filter(p => !p.is_x_factor && !p.is_exact_score), [predictions]);

  const normalPredictions = useMemo(() => {
    return allNormalPreds
      .map(p => {
        const lowQuota = p.pronostici?.filter(pr => {
          const q = getPronosticoQuota(pr, p);
          return !q || q <= 2.50;
        }) || [];
        return lowQuota.length > 0 ? { ...p, pronostici: lowQuota } : null;
      })
      .filter(Boolean) as Prediction[];
  }, [allNormalPreds]);

  const altoRendimentoPreds = useMemo(() => {
    return allNormalPreds
      .map(p => {
        const highQuota = p.pronostici?.filter(pr => {
          const q = getPronosticoQuota(pr, p);
          return q != null && q > 2.50;
        }) || [];
        return highQuota.length > 0 ? { ...p, pronostici: highQuota } : null;
      })
      .filter(Boolean) as Prediction[];
  }, [allNormalPreds]);

  const xFactorPredictions = useMemo(() => predictions.filter(p => p.is_x_factor), [predictions]);
  const exactScorePredictions = useMemo(() => predictions.filter(p => p.is_exact_score), [predictions]);

  // Auto-collapse sezioni High Risk se >=5 elementi
  useEffect(() => {
    const collapsed = new Set<string>();
    if (exactScorePredictions.length >= 5) collapsed.add('sec_exact_score');
    if (xFactorPredictions.length >= 5) collapsed.add('sec_x_factor');
    if (bombs.length >= 5) collapsed.add('sec_bombs');
    setCollapsedSections(collapsed);
  }, [exactScorePredictions.length, xFactorPredictions.length, bombs.length]);

  // --- DATI FILTRATI ---
  const filteredPredictions = statusFilter === 'tutte' ? normalPredictions : normalPredictions.filter(p => predMatchesFilter(p, statusFilter));
  const filteredXFactor = statusFilter === 'tutte' ? xFactorPredictions : xFactorPredictions.filter(p => predMatchesFilter(p, statusFilter));
  const filteredExactScore = statusFilter === 'tutte' ? exactScorePredictions : exactScorePredictions.filter(p => predMatchesFilter(p, statusFilter));
  const filteredBombs = statusFilter === 'tutte' ? bombs : bombs.filter(b => bombMatchesFilter(b, statusFilter));
  const filteredGroupedByLeague = filteredPredictions.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});
  const filteredAltoRendimento = statusFilter === 'tutte' ? altoRendimentoPreds : altoRendimentoPreds.filter(p => predMatchesFilter(p, statusFilter));
  const filteredAltoRendimentoByLeague = filteredAltoRendimento.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});

  // --- CONTEGGI FILTRI ---
  const filterCounts = useMemo(() => {
    const counts = { tutte: 0, live: 0, da_giocare: 0, finite: 0, centrate: 0, mancate: 0 };
    const countItem = (item: Prediction & { hit?: boolean | null }, mode: 'normal' | 'xf' | 're' | 'bomb') => {
      counts.tutte++;
      const s = getMatchStatus(item);
      if (s === 'live') counts.live++;
      else if (s === 'to_play') counts.da_giocare++;
      else {
        counts.finite++;
        if (mode === 'bomb') {
          if (item.hit === true) counts.centrate++;
          else if (item.hit === false) counts.mancate++;
        } else if (mode === 'xf') {
          if (item.real_score) {
            if (item.real_sign === 'X') counts.centrate++;
            else counts.mancate++;
          }
        } else if (mode === 're') {
          if (item.real_score) {
            const hit = (item.exact_score_top3 || []).some(t => t.score === item.real_score);
            if (hit) counts.centrate++;
            else counts.mancate++;
          }
        } else {
          item.pronostici?.forEach(p => {
            if (p.hit === true) counts.centrate++;
            if (p.hit === false) counts.mancate++;
          });
        }
      }
    };
    if (activeTab === 'pronostici') {
      normalPredictions.forEach(p => countItem(p, 'normal'));
    } else {
      altoRendimentoPreds.forEach(p => countItem(p, 'normal'));
    }
    return counts;
  }, [predictions, bombs, activeTab]);

  // --- RENDER CARD PRONOSTICO ---
  const renderPredictionCard = (pred: Prediction) => {
    const cardKey = `pred-${pred.home}-${pred.away}`;
    const commentKey = `${cardKey}-comment`;
    const detailKey = `${cardKey}-detail`;
    const isCommentOpen = !expandedSections.has(commentKey);
    const isDetailOpen = expandedSections.has(detailKey);
    const hasComment = typeof pred.comment === 'string'
      ? pred.comment.length > 0
      : (pred.comment?.segno || pred.comment?.gol || pred.comment?.doppia_chance || pred.comment?.gol_extra);
    const hasDetail = !!(pred.segno_dettaglio || pred.gol_dettaglio || (pred.streak_home && pred.streak_away));
    const bestConf = Math.max(pred.confidence_segno || 0, pred.confidence_gol || 0);
    const barColor = pred.real_score ? (pred.hit ? '#00ff88' : '#ff4466') : getConfidenceColor(bestConf);
    const isCardExpanded = expandedCards.has(cardKey);
    const tipsKey = `${cardKey}-tips`;
    const isTipsOpen = expandedSections.has(tipsKey);
    const matchId = `${pred.home}-${pred.away}-${pred.date}`;
    const currentAnalysisTab = analysisTab[matchId];
    const isPremiumLoaded = !!premiumAnalysis[matchId] || !!pred.analysis_premium;
    const isPremiumBusy = !!premiumLoading[matchId];
    const hasAnalysis = !!pred.analysis_free && pred.analysis_score !== undefined;
    const analysisScore = pred.analysis_score ?? 0;
    const analysisScoreColor = analysisScore >= 70 ? theme.success : analysisScore >= 40 ? '#facc15' : theme.danger;

    const fetchPremium = async () => {
      if (isPremiumLoaded || isPremiumBusy) return;
      setPremiumLoading(prev => ({ ...prev, [matchId]: true }));
      try {
        const resp = await fetch(`${API_BASE}/chat/match-analysis-premium`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ home: pred.home, away: pred.away, date: pred.date, isAdmin: 'true' }),
        });
        const data = await resp.json();
        if (data.success) {
          setPremiumAnalysis(prev => ({ ...prev, [matchId]: data.analysis }));
        }
      } catch (err) {
        console.error('Premium analysis error:', err);
      } finally {
        setPremiumLoading(prev => ({ ...prev, [matchId]: false }));
      }
    };

    return (
      <div
        key={cardKey}
        style={{
          background: theme.panel,
          border: theme.panelBorder,
          borderRadius: '10px',
          padding: isMobile ? '6px 10px' : '8px 14px',
          marginBottom: '4px',
          position: 'relative',
          zIndex: isTipsOpen ? 50 : 'auto' as any
        }}
      >
        {/* BARRA LATERALE */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: barColor
        }} />

        {/* RIGA UNICA COMPATTA — click ovunque espande */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: isMobile ? '4px' : '8px', cursor: 'pointer' }}
          onClick={() => setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(cardKey)) next.delete(cardKey);
            else next.add(cardKey);
            return next;
          })}
        >
          <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>{isMobile ? pred.match_time : `🕐 ${pred.match_time}`}</span>

          {/* Squadre — larghezza naturale, si restringe se serve */}
          <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', marginRight: isMobile ? '25px' : undefined }}>
            <img
              src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt=""
              style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pred.home}
            </span>
            <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>vs</span>
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pred.away}
            </span>
            <img
              src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt=""
              style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Risultato + Freccia — spinto a destra */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {pred.real_score ? (
              <span style={{ fontSize: '13px', fontWeight: '900', color: pred.hit ? '#00ff88' : '#ff4466' }}>
                {pred.real_score.replace(':', ' - ')}
              </span>
            ) : getMatchStatus(pred) === 'live' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: pred.live_status !== 'HT' ? 'pulse 1.5s ease-in-out infinite' : undefined }}>
                  {pred.live_score || '– : –'}
                </span>
                {(!isMobile || pred.live_status === 'HT') && <span style={{ fontSize: '8px', fontWeight: 900, color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444' }}>
                  {pred.live_status === 'HT' ? 'INT' : `${pred.live_minute || ''}'`}
                </span>}
              </span>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: '900', color: theme.textDim }}>– : –</span>
            )}
            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>

        {/* Badge "Tip" — ABSOLUTE, sganciato dal flex */}
        <div
          style={{
            position: 'absolute', top: isMobile ? '3px' : '4px', right: isMobile ? '65px' : '100px',
            zIndex: 5
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'baseline', gap: isMobile ? '3px' : '6px', cursor: 'pointer',
              background: isTipsOpen ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.06)',
              border: `1px solid ${isTipsOpen ? 'rgba(0,240,255,0.4)' : 'rgba(0,240,255,0.18)'}`,
              borderRadius: '4px', padding: isMobile ? '3px 6px' : '4px 12px',
              transition: 'all 0.2s', userSelect: 'none' as const
            }}
            onClick={(e) => { e.stopPropagation(); toggleSection(tipsKey, e); }}
          >
            <span style={{ fontSize: '9px', fontWeight: '600', color: theme.cyan, letterSpacing: '0.3px' }}>
              {pred.pronostici?.length || 0} tip
            </span>
            <span style={{ fontSize: '9px', color: theme.cyan, transition: 'transform 0.2s', transform: isTipsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>

          {/* POPOVER FLOTTANTE */}
          {isTipsOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-75%)', zIndex: 1000,
              background: '#1a1a24', border: '1px solid rgba(0,240,255,0.45)',
              borderRadius: '8px', padding: '8px 10px',
              boxShadow: '0 0 12px rgba(0,240,255,0.15), 0 6px 24px rgba(0,0,0,0.9)',
              minWidth: '160px', whiteSpace: 'nowrap' as const
            }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {pred.pronostici?.map((p, i) => {
                  const isHit = pred.real_score ? p.hit : null;
                  const pillBg = isHit === true ? 'rgba(0,255,136,0.15)' : isHit === false ? 'rgba(255,68,102,0.15)' : 'rgba(255,255,255,0.06)';
                  const pillBorder = isHit === true ? 'rgba(0,255,136,0.3)' : isHit === false ? 'rgba(255,68,102,0.3)' : 'rgba(255,255,255,0.12)';
                  const nameColor = isHit === true ? '#00ff88' : isHit === false ? '#ff4466' : theme.cyan;
                  const quota = p.quota || (p.tipo === 'SEGNO' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
                    || (p.tipo === 'GOL' && pred.odds ? getGolQuota(p.pronostico, pred.odds) : null);
                  return (
                    <span key={i} style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: '4px', padding: '2px 8px',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px'
                    }}>
                      <span style={{ fontWeight: '800', color: nameColor }}>{p.pronostico}</span>
                      {quota && <span style={{ fontWeight: '700', color: '#4dd0e1' }}>@{Number(quota).toFixed(2)}</span>}
                      {isHit !== null && <span>{isHit ? '✅' : '❌'}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* DETTAGLIO ESPANSO (identico a prima) */}
        {isCardExpanded && (
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', animation: 'fadeIn 0.3s ease' }}>

            {/* Pronostici — sempre aperto, stile sobrio */}
            {(() => {
              const segnoPreds = pred.pronostici?.filter(p => p.tipo === 'SEGNO' || p.tipo === 'DOPPIA_CHANCE') || [];
              const golPreds = pred.pronostici?.filter(p => p.tipo === 'GOL') || [];

              const renderPill = (p: typeof pred.pronostici[0], idx: number) => {
                const isHit = pred.real_score ? p.hit : null;
                const pillBg = isHit === true ? 'rgba(0,255,136,0.1)' : isHit === false ? 'rgba(255,68,102,0.1)' : 'rgba(17, 56, 93, 0.45)';
                const pillBorder = isHit === true ? 'rgba(0,255,136,0.3)' : isHit === false ? 'rgba(255,68,102,0.3)' : 'rgba(17, 56, 93, 0.7)';
                const nameColor = isHit === true ? '#00ff88' : isHit === false ? '#ff4466' : theme.cyan;
                const quota = p.quota || (p.tipo === 'SEGNO' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
                  || (p.tipo === 'DOPPIA_CHANCE' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
                  || (p.tipo === 'GOL' && pred.odds ? getGolQuota(p.pronostico, pred.odds) : null);
                const source = (p as any).source;
                return (
                  <div key={idx} style={{
                    background: pillBg, border: `1px solid ${pillBorder}`,
                    borderRadius: '5px', padding: '3px 8px', marginBottom: '3px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    ...(isMobile ? { flexWrap: 'wrap' as const } : {})
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: nameColor }}>
                      {p.tipo === 'DOPPIA_CHANCE' ? `DC: ${p.pronostico}` : p.pronostico}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: getConfidenceColor(p.confidence) }}>{p.confidence?.toFixed(0)}%</span>
                    {quota && <span style={{ fontSize: '11px', fontWeight: '700', color: '#4dd0e1' }}>@{Number(quota).toFixed(2)}</span>}
                    {source && (
                      <span style={{
                        fontSize: '8px', fontWeight: '700', color: '#a78bfa',
                        background: 'rgba(167,139,250,0.12)', borderRadius: '3px', padding: '1px 4px',
                      }}>
                        {source}
                      </span>
                    )}
                    {isAdmin && p.edge != null && p.edge > 0 && (
                      <span style={{ fontSize: '8px', color: '#888' }} title={`Prob: ${p.probabilita_stimata}% | Mkt: ${p.prob_mercato}% | Mod: ${p.prob_modello}%`}>
                        E:+{p.edge?.toFixed(1)}%
                      </span>
                    )}
                    {p.stake != null && p.stake > 0 && (
                      <span style={{
                        fontSize: '9px', fontWeight: '800', color: getStakeColor(p.stake),
                        background: 'rgba(255,255,255,0.05)', borderRadius: '3px', padding: '1px 4px',
                      }} title={`Stake: ${p.stake}/10 (${getStakeLabel(p.stake)})`}>
                        Stake:{p.stake}
                      </span>
                    )}
                    {isHit !== null && <span style={{ fontSize: '11px', marginLeft: 'auto' }}>{isHit ? '✅' : '❌'}</span>}
                  </div>
                );
              };

              return (
                <div style={{
                  marginLeft: '8px', marginBottom: '8px',
                  padding: '10px 12px',
                  background: 'rgba(140, 90, 0, 0.22)',
                  border: '2px solid rgba(140, 90, 0, 0.35)',
                  borderRadius: '8px',
                }}>
                  {/* Titolo centrato */}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '8px', textAlign: 'center' as const }}>
                    Pronostici
                  </div>
                  {/* Tabella 2 colonne */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Colonna SEGNO */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Segno:</div>
                      {segnoPreds.length > 0 ? segnoPreds.map((p, i) => renderPill(p, i)) : (
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', padding: '4px 0' }}>—</div>
                      )}
                    </div>
                    {/* Separatore verticale */}
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />
                    {/* Colonna GOL */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Gol:</div>
                      {golPreds.length > 0 ? golPreds.map((p, i) => renderPill(p, i)) : (
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', padding: '4px 0' }}>—</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Quote — sezione dedicata sopra i pronostici */}
            <div style={{
              paddingLeft: '8px', marginBottom: '8px',
            }}>
              <div style={{
                display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, alignItems: isMobile ? undefined : 'stretch',
                background: 'rgb(17 56 93 / 45%)',
                border: '2px solid rgba(17, 56, 93, 0.6)',
                borderRadius: '6px', overflow: 'hidden',
              }}>
                {/* Parte superiore/sinistra — Quote */}
                <div style={{ padding: '8px 12px', ...(isMobile ? {} : {}) }}>
                  <div style={{ fontSize: '9px', color: theme.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                    Quote
                  </div>
                  <div style={{ display: 'flex', gap: '10px', color: theme.textDim, flexWrap: 'wrap', fontSize: '11px' }}>
                    <span>1: <span style={{ color: theme.text, fontWeight: 600 }}>{pred.odds?.['1'] != null ? Number(pred.odds['1']).toFixed(2) : '-'}</span></span>
                    <span>X: <span style={{ color: theme.text, fontWeight: 600 }}>{pred.odds?.['X'] != null ? Number(pred.odds['X']).toFixed(2) : '-'}</span></span>
                    <span>2: <span style={{ color: theme.text, fontWeight: 600 }}>{pred.odds?.['2'] != null ? Number(pred.odds['2']).toFixed(2) : '-'}</span></span>
                    {pred.odds?.over_25 != null && <>
                      <span style={{ color: 'rgba(255,255,255,0.12)' }}>│</span>
                      <span>O2.5: <span style={{ color: theme.text, fontWeight: 600 }}>{Number(pred.odds.over_25).toFixed(2)}</span></span>
                      <span>U2.5: <span style={{ color: theme.text, fontWeight: 600 }}>{Number(pred.odds.under_25).toFixed(2)}</span></span>
                    </>}
                    {pred.odds?.gg != null && <>
                      <span style={{ color: 'rgba(255,255,255,0.12)' }}>│</span>
                      <span>GG: <span style={{ color: theme.text, fontWeight: 600 }}>{Number(pred.odds.gg).toFixed(2)}</span></span>
                      <span>NG: <span style={{ color: theme.text, fontWeight: 600 }}>{Number(pred.odds.ng).toFixed(2)}</span></span>
                    </>}
                  </div>
                </div>
                {/* Separatore */}
                {hasAnalysis && <div style={isMobile ? { height: '2px', background: 'rgba(17, 56, 93, 0.6)' } : { width: '2px', background: 'rgba(17, 56, 93, 0.6)' }} />}
                {/* Parte destra — Bottoni Analisi */}
                {hasAnalysis && (
                  <div style={{ ...(isMobile ? {} : { flex: 1 }), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '6px 12px' : '8px 14px', gap: '6px', background: 'rgba(140, 90, 0, 0.22)' }}>
                    <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', textShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>
                      Analisi Match
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalysisTab(prev => {
                          const next = { ...prev };
                          if (next[matchId] === 'free') delete next[matchId];
                          else next[matchId] = 'free';
                          return next;
                        });
                        trackTabClick('f');
                      }}
                      className={`analysis-tab-free${currentAnalysisTab === 'free' ? ' active' : ''}`}
                      style={{
                        cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                        padding: '6px 20px', borderRadius: '16px', whiteSpace: 'nowrap' as const,
                        background: currentAnalysisTab === 'free' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.15)',
                        color: currentAnalysisTab === 'free' ? '#fff' : 'rgba(180, 230, 240, 0.9)',
                        border: currentAnalysisTab === 'free' ? '1px solid rgba(6, 182, 212, 0.7)' : '1px solid rgba(6, 182, 212, 0.3)',
                        boxShadow: currentAnalysisTab === 'free' ? '0 0 12px rgba(6, 182, 212, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 0 6px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >📊 Free</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalysisTab(prev => {
                          const next = { ...prev };
                          if (next[matchId] === 'premium') delete next[matchId];
                          else next[matchId] = 'premium';
                          return next;
                        });
                        trackTabClick('p');
                        if ((isAdmin || isPremiumUser) && !isPremiumBusy) fetchPremium();
                      }}
                      className={`analysis-tab-premium${currentAnalysisTab === 'premium' ? ' active' : ''}`}
                      style={{
                        cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                        padding: '6px 20px', borderRadius: '16px', whiteSpace: 'nowrap' as const,
                        background: currentAnalysisTab === 'premium' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.15)',
                        color: currentAnalysisTab === 'premium' ? '#fff' : 'rgba(210, 180, 250, 0.9)',
                        border: currentAnalysisTab === 'premium' ? '1px solid rgba(168, 85, 247, 0.7)' : '1px solid rgba(168, 85, 247, 0.3)',
                        boxShadow: currentAnalysisTab === 'premium' ? '0 0 12px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 0 6px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >{(isAdmin || isPremiumUser) ? '🤖 Premium' : '🔒 Premium'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Score — risultati più probabili dalla simulazione */}
            {(pred as any).simulation_data?.top_scores && (() => {
              const isLive = !pred.real_score && getMatchStatus(pred) === 'live';
              return (
                <div style={{
                  marginTop: '0', marginBottom: '8px', marginLeft: '8px',
                  padding: '7px 12px',
                  background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15), rgba(30, 64, 175, 0.15))',
                  border: '1px solid rgba(5, 150, 105, 0.2)',
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '11px', color: theme.textDim, fontWeight: 600 }}>Top Score:</span>
                  {((pred as any).simulation_data.top_scores as Array<[string, number]>).slice(0, 3).map(([score, count], i, arr) => {
                    const normS = normalizeScore(score);
                    const reHit = pred.real_score && normS === normalizeScore(pred.real_score);
                    const liveHit = isLive && pred.live_score && normS === normalizeScore(pred.live_score);
                    return (
                      <span key={i} style={{
                        fontSize: '13px',
                        color: reHit ? theme.success : liveHit ? theme.success : 'rgba(255,255,255,0.6)',
                        fontWeight: 600,
                        animation: liveHit ? 'pulse 1.5s ease-in-out infinite' : undefined,
                      }}>
                        {score} ({count}){reHit ? ' ✅' : ''}{i < arr.length - 1 ? '  ·' : ''}
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {/* ═══ ANALISI DEL MATCH (tra quote e pronostici) ═══ */}
            {hasAnalysis && currentAnalysisTab && (
              <div style={{
                margin: '0 0 8px 8px', padding: '12px',
                background: analysisScore < 40 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(250, 204, 21, 0.06)',
                border: `2px solid ${analysisScore < 40 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(250, 204, 21, 0.35)'}`,
                borderRadius: '6px',
                animation: 'fadeIn 0.3s ease',
              }}>
                {/* Header con X per chiudere */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: analysisScoreColor }}>
                    {analysisScore < 50 ? '⚠️' : '🔍'} Analisi del Match · Coerenza {analysisScore}/100
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnalysisTab(prev => { const next = { ...prev }; delete next[matchId]; return next; });
                    }}
                    style={{ cursor: 'pointer', fontSize: '14px', color: theme.textDim, padding: '2px 6px', borderRadius: '4px', lineHeight: 1 }}
                    title="Chiudi analisi"
                  >✕</span>
                </div>

                {/* Barra coerenza con gradiente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', lineHeight: 1 }} title="Rischio alto">⚠️</span>
                  <div style={{ flex: 1, position: 'relative' as const }}>
                    <div style={{
                      height: '8px', borderRadius: '4px', overflow: 'hidden',
                      background: 'linear-gradient(to right, #ef4444, #f97316 25%, #facc15 50%, #4ade80 75%, #22c55e)',
                      opacity: 0.35,
                    }} />
                    <div style={{
                      position: 'absolute' as const, top: 0, left: 0,
                      height: '8px', borderRadius: '4px', overflow: 'hidden',
                      width: `${analysisScore}%`, transition: 'width 0.5s',
                    }}>
                      <div style={{
                        width: `${10000 / Math.max(analysisScore, 1)}%`, height: '100%',
                        background: 'linear-gradient(to right, #ef4444, #f97316 25%, #facc15 50%, #4ade80 75%, #22c55e)',
                      }} />
                    </div>
                    {[33, 66].map(pct => (
                      <div key={pct} style={{
                        position: 'absolute' as const, top: -1, left: `${pct}%`,
                        width: '1px', height: '10px',
                        background: 'rgba(255,255,255,0.3)',
                      }} />
                    ))}
                    <div style={{
                      position: 'absolute' as const, top: '-3px',
                      left: `${analysisScore}%`, transform: 'translateX(-50%)',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: analysisScoreColor,
                      border: '2px solid rgba(0,0,0,0.5)',
                      boxShadow: `0 0 6px ${analysisScoreColor}`,
                      transition: 'left 0.5s',
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', lineHeight: 1 }} title="Coerenza alta">✅</span>
                </div>

                {/* Tab switch Free/Premium dentro contenitore */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', justifyContent: 'center' }}>
                  <button
                    className={`analysis-tab-free${currentAnalysisTab === 'free' ? ' active' : ''}`}
                    onClick={() => { setAnalysisTab(prev => ({ ...prev, [matchId]: 'free' })); trackTabClick('f'); }}
                    style={{
                      padding: '4px 14px', borderRadius: '12px',
                      border: currentAnalysisTab === 'free' ? '1px solid rgba(6, 182, 212, 0.6)' : '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                      background: currentAnalysisTab === 'free' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255,255,255,0.06)',
                      color: currentAnalysisTab === 'free' ? theme.cyan : theme.textDim,
                    }}
                  >Analisi Free</button>
                  <button
                    className={`analysis-tab-premium${currentAnalysisTab === 'premium' ? ' active' : ''}`}
                    onClick={() => {
                      setAnalysisTab(prev => ({ ...prev, [matchId]: 'premium' }));
                      trackTabClick('p');
                      if ((isAdmin || isPremiumUser) && !isPremiumBusy) fetchPremium();
                    }}
                    style={{
                      padding: '4px 14px', borderRadius: '12px',
                      border: currentAnalysisTab === 'premium' ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                      background: currentAnalysisTab === 'premium' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.06)',
                      color: currentAnalysisTab === 'premium' ? '#a855f7' : theme.textDim,
                    }}
                  >{(isAdmin || isPremiumUser) ? 'Analisi AI Premium' : '🔒 Premium'}</button>
                </div>

                {/* Contenuto */}
                {currentAnalysisTab === 'free' && (
                  <div style={{
                    fontSize: '11px', lineHeight: '1.7', color: theme.text,
                    padding: '8px 10px', whiteSpace: 'pre-wrap' as const,
                    background: 'rgba(255,255,255,0.03)', borderRadius: '4px',
                  }}>
                    {pred.analysis_free}
                  </div>
                )}

                {currentAnalysisTab === 'premium' && (
                  <div style={{
                    fontSize: '11px', lineHeight: '1.7', color: theme.text,
                    padding: '8px 10px',
                    background: 'rgba(168, 85, 247, 0.04)', borderRadius: '4px',
                    border: '1px solid rgba(168, 85, 247, 0.1)',
                  }}>
                    {(!isAdmin && !isPremiumUser) ? (
                      <div style={{ textAlign: 'center', padding: '12px', color: theme.textDim }}>
                        🔒 Disponibile nella versione Premium
                      </div>
                    ) : isPremiumBusy ? (
                      <div style={{ textAlign: 'center', padding: '12px', color: '#a855f7' }}>
                        🤖 Analisi in corso...
                      </div>
                    ) : isPremiumLoaded ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{premiumAnalysis[matchId] || pred.analysis_premium}</div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px', color: theme.textDim, fontSize: '11px' }}>
                        Premi il tab Premium per generare l'analisi
                      </div>
                    )}
                  </div>
                )}

                {/* Pill contraddizioni */}
                {pred.analysis_alerts && pred.analysis_alerts.length > 0 && (() => {
                  const n = pred.analysis_alerts.length;
                  const pillBg = n >= 4 ? 'rgba(239,68,68,0.18)' : n >= 2 ? 'rgba(245,158,11,0.18)' : 'rgba(34,197,94,0.18)';
                  const pillColor = n >= 4 ? '#f87171' : n >= 2 ? '#fbbf24' : '#4ade80';
                  return (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
                        fontSize: '10px', fontWeight: 600,
                        background: pillBg, color: pillColor,
                      }}>
                        ⚠️ {n} contraddizion{n === 1 ? 'e rilevata' : 'i rilevate'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}


            {/* Monte Carlo — identico a SistemaC, collassabile */}
            {(pred as any).simulation_data && (() => {
              const sim = (pred as any).simulation_data;
              const mcKey = `${cardKey}-montecarlo`;
              const isMCOpen = expandedSections.has(mcKey);
              const isLive = !pred.real_score && getMatchStatus(pred) === 'live';
              const renderMCBar = (label: string, values: Array<{ name: string; pct: number; color: string }>) => (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.textDim, marginBottom: '4px', fontWeight: 600 }}>{label}</div>
                  <div style={{ display: 'flex', height: '22px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                    {values.map((v, i) => (
                      <div key={i} style={{
                        width: `${v.pct}%`,
                        background: v.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: '#000',
                        minWidth: v.pct > 5 ? 'auto' : '0',
                        transition: 'width 0.3s',
                      }}>
                        {v.pct >= 10 ? `${v.name} ${v.pct}%` : v.pct >= 5 ? `${v.pct}%` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              );
              return (
                <div style={{
                  margin: '0 0 8px 8px', padding: '7px 12px',
                  background: 'rgba(255, 107, 53, 0.06)',
                  border: '1px solid rgba(255, 107, 53, 0.2)',
                  borderRadius: '6px',
                }}>
                  {/* Header collassabile */}
                  <div
                    className="collapsible-header"
                    onClick={(e) => toggleSection(mcKey, e)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', userSelect: 'none' as const,
                      marginBottom: isMCOpen ? '10px' : '0',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: theme.orange }}>
                      🎲 Stochastic Engine · {sim.cycles}x
                    </span>
                    <span style={{ fontSize: '10px', color: theme.orange, transition: 'transform 0.2s', transform: isMCOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </div>
                  {/* Contenuto collassabile */}
                  {isMCOpen && (
                    <>
                      {renderMCBar('1X2', [
                        { name: '1', pct: sim.home_win_pct, color: '#4fc3f7' },
                        { name: 'X', pct: sim.draw_pct, color: '#ffb74d' },
                        { name: '2', pct: sim.away_win_pct, color: '#e57373' },
                      ])}
                      {renderMCBar('Over/Under 2.5', [
                        { name: 'Over', pct: sim.over_25_pct, color: '#81c784' },
                        { name: 'Under', pct: sim.under_25_pct, color: '#9575cd' },
                      ])}
                      {renderMCBar('GG/NG', [
                        { name: 'GG', pct: sim.gg_pct, color: '#4dd0e1' },
                        { name: 'NG', pct: sim.ng_pct, color: '#f06292' },
                      ])}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: theme.textDim }}>Score Predetto</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: theme.orange }}>{sim.predicted_score}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: theme.textDim }}>Media Gol</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text }}>
                            🏠 {sim.avg_goals_home} — ✈️ {sim.avg_goals_away}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: theme.textDim, marginBottom: '2px' }}>Top Scores</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[...(sim.top_scores || [])].slice(0, 4).map(([score, count]: [string, number], i: number) => {
                              const normS = normalizeScore(score);
                              const isHit = pred.real_score && normS === normalizeScore(pred.real_score);
                              const isLiveHit = !pred.real_score && isLive && pred.live_score && normS === normalizeScore(pred.live_score);
                              const highlighted = isHit || isLiveHit;
                              return (
                                <span key={i} style={{
                                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                  background: highlighted ? 'rgba(5, 249, 182, 0.2)' : i === 0 ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255,255,255,0.06)',
                                  color: highlighted ? theme.success : i === 0 ? theme.orange : theme.textDim,
                                  border: highlighted ? '1px solid rgba(5, 249, 182, 0.4)' : i === 0 ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                                  animation: isLiveHit ? 'pulse 1.5s ease-in-out infinite' : undefined,
                                }}>
                                  {score} ({count}) {isHit ? '✅' : ''}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Bottoni Commento + Dettaglio */}
            <div style={{
              display: 'flex', gap: '12px', paddingLeft: '8px', paddingTop: '8px', marginTop: '6px',
              borderTop: '1px solid rgba(255,255,255,0.04)'
            }}>
              {hasComment && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: theme.textDim, userSelect: 'none' as const }}
                  onClick={(e) => toggleSection(commentKey, e)}
                >
                  <span>💬 Commento</span>
                  <span style={{ transition: 'transform 0.2s', transform: isCommentOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              )}
              {hasDetail && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: theme.textDim, userSelect: 'none' as const }}
                  onClick={(e) => toggleSection(detailKey, e)}
                >
                  <span>📊 Dettaglio</span>
                  <span style={{ transition: 'transform 0.2s', transform: isDetailOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              )}
            </div>

            {/* SEZIONE COMMENTO (espandibile indipendente) */}
            {isCommentOpen && hasComment && (
              <div style={{
                marginTop: '8px', paddingLeft: '8px', paddingTop: '8px',
                borderTop: `1px solid ${theme.cyan}20`,
                animation: 'fadeIn 0.3s ease', fontSize: '11px', color: theme.textDim, fontStyle: 'italic', lineHeight: '1.5'
              }}>
                {typeof pred.comment === 'string'
                  ? <div>🔹 {pred.comment.replace(/BVS/g, 'MAP')}</div>
                  : <>
                      {pred.comment?.segno && <div>🔹 {pred.comment.segno.replace(/BVS/g, 'MAP')}</div>}
                      {pred.comment?.gol && <div style={{ marginTop: '4px' }}>🔹 {pred.comment.gol.replace(/BVS/g, 'MAP')}</div>}
                      {pred.comment?.doppia_chance && <div style={{ marginTop: '4px' }}>🔹 {pred.comment.doppia_chance.replace(/BVS/g, 'MAP')}</div>}
                      {pred.comment?.gol_extra && <div style={{ marginTop: '4px' }}>🔹 {pred.comment.gol_extra.replace(/BVS/g, 'MAP')}</div>}
                    </>
                }
              </div>
            )}

            {/* SEZIONE DETTAGLIO (espandibile indipendente) */}
            {isDetailOpen && (
              <div style={{
                marginTop: '8px', paddingLeft: '8px', paddingTop: '8px',
                borderTop: `1px solid ${theme.cyan}20`,
                animation: 'fadeIn 0.3s ease'
              }}>

                {/* TABELLA STRISCE STORICHE — in cima per dare contesto */}
                {pred.streak_home && pred.streak_away && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.cyan, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      🔥 Strisce Attive
                    </div>
                    {(() => {
                      const STREAK_LABELS: Record<string, string> = {
                        vittorie: 'Vittorie', sconfitte: 'Sconfitte', imbattibilita: 'Imbattibilità',
                        pareggi: 'Pareggi', senza_vittorie: 'Senza vittorie',
                        over25: 'Over 2.5', under25: 'Under 2.5',
                        gg: 'GG (entrambe segnano)', clean_sheet: 'Clean sheet',
                        senza_segnare: 'Senza segnare', gol_subiti: 'Gol subiti',
                      };
                      const STREAK_CURVES: Record<string, Record<string, number>> = {
                        vittorie: {'3': 2, '4': 3, '5': 0, '6': -1, '7': -3, '8': -6, '9': -10},
                        sconfitte: {'4': -1, '5': -2, '6': -5},
                        imbattibilita: {'5': 2, '6': 2, '7': 2, '8': 0, '9': 0, '10': 0, '11': -3},
                        pareggi: {'3': -1, '4': 0, '5': 1, '6': -3},
                        senza_vittorie: {'3': -1, '4': -2, '5': 0, '6': 1, '7': 2},
                        over25: {'3': 3, '4': 3, '5': 0, '6': -1, '7': -4},
                        under25: {'3': 3, '4': 3, '5': 0, '6': -1, '7': -4},
                        gg: {'3': 2, '4': 2, '5': 0, '6': -3},
                        clean_sheet: {'3': 2, '4': 3, '5': 0, '6': -1, '7': -4},
                        senza_segnare: {'2': 1, '3': 2, '4': 0, '5': -1, '6': -3},
                        gol_subiti: {'3': 2, '4': 3, '5': 2, '6': 1, '7': -2},
                      };
                      const getCurveVal = (type: string, n: number): number => {
                        const curve = STREAK_CURVES[type];
                        if (!curve) return 0;
                        if (curve[String(n)]) return curve[String(n)];
                        const keys = Object.keys(curve).map(Number).sort((a, b) => a - b);
                        const maxKey = keys[keys.length - 1];
                        if (n >= maxKey) return curve[String(maxKey)];
                        return 0;
                      };
                      const getColor = (val: number) => val > 0 ? theme.success : val < 0 ? theme.danger : theme.textDim;

                      const TICK_COLORS = [
                        '#22c55e', '#4ade80', '#a3e635', '#facc15', '#eab308',
                        '#f59e0b', '#f97316', '#ea580c', '#ef4444', '#dc2626'
                      ];
                      const renderStreakBar = (n: number) => {
                        const capped = Math.min(n, 10);
                        return (
                          <div style={{ display: 'inline-flex', gap: '1.5px', alignItems: 'flex-end' }}>
                            {Array.from({ length: 10 }, (_, i) => {
                              const active = i < capped;
                              return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: i === 9 ? (isMobile ? '8px' : '10px') : (isMobile ? '4px' : '6px') }}>
                                  <div style={{
                                    width: isMobile ? '7px' : '14px',
                                    height: '5px',
                                    borderRadius: '1.5px',
                                    background: active ? TICK_COLORS[i] : 'rgba(255,255,255,0.08)',
                                    border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                    boxSizing: 'border-box' as const,
                                  }} />
                                  <span style={{
                                    fontSize: '5px',
                                    color: active ? TICK_COLORS[i] : 'rgba(255,255,255,0.2)',
                                    marginTop: '1px',
                                    lineHeight: 1,
                                    fontWeight: active ? 600 : 400,
                                  }}>
                                    {i < 9 ? i + 1 : '10+'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      };

                      const allTypes = Object.keys(STREAK_LABELS);
                      const active = allTypes.filter(t =>
                        (pred.streak_home?.[t] ?? 0) >= 2 || (pred.streak_away?.[t] ?? 0) >= 2
                      );
                      if (active.length === 0) return <div style={{ fontSize: '10px', color: theme.textDim }}>Nessuna striscia significativa</div>;

                      // Mappatura: striscia → quale pronostico supporta
                      const SUPPORTS_SEGNO: Record<string, { home: string[], away: string[] }> = {
                        vittorie:       { home: ['1', '1X'], away: ['2', 'X2'] },
                        sconfitte:      { home: ['2', 'X2'], away: ['1', '1X'] },
                        imbattibilita:  { home: ['1', 'X', '1X'], away: ['2', 'X', 'X2'] },
                        pareggi:        { home: ['X'], away: ['X'] },
                        senza_vittorie: { home: ['2', 'X', 'X2'], away: ['1', 'X', '1X'] },
                      };
                      const SUPPORTS_GOL: Record<string, string[]> = {
                        over25: ['Over'], under25: ['Under'],
                        gg: ['GG'], clean_sheet: ['NG'], senza_segnare: ['NG'], gol_subiti: ['GG'],
                      };

                      return (
                        <>
                        <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${theme.cyan}20` }}>
                              <th style={{ textAlign: 'left', padding: '3px 4px', color: theme.textDim, fontWeight: 'normal', width: '22%' }}>Striscia</th>
                              <th style={{ textAlign: 'left', padding: '3px 8px', color: theme.cyan, fontWeight: 'bold', fontSize: '9px' }}>{pred.home}</th>
                              <th style={{ textAlign: 'left', padding: '3px 8px 3px 16px', color: theme.purple, fontWeight: 'bold', fontSize: '9px' }}>{pred.away}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {active.map(type => {
                              const hN = pred.streak_home?.[type] ?? 0;
                              const aN = pred.streak_away?.[type] ?? 0;
                              const hCurve = getCurveVal(type, hN);
                              const aCurve = getCurveVal(type, aN);
                              return (
                                <tr key={type} style={{ borderBottom: `1px solid ${theme.cyan}10` }}>
                                  <td style={{ padding: '4px 4px', color: theme.text, verticalAlign: 'middle' }}>{STREAK_LABELS[type]}</td>
                                  <td style={{ textAlign: 'left', padding: '4px 8px', verticalAlign: 'middle' }}>
                                    {hN >= 2 ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {renderStreakBar(hN)}
                                        <span style={{ color: getColor(hCurve), fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                          {hN} <span style={{ fontSize: '7px', opacity: 0.7 }}>({hCurve > 0 ? '+' : ''}{hCurve})</span>
                                        </span>
                                      </div>
                                    ) : <span style={{ color: theme.textDim }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'left', padding: '4px 8px 4px 16px', verticalAlign: 'middle' }}>
                                    {aN >= 2 ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {renderStreakBar(aN)}
                                        <span style={{ color: getColor(aCurve), fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                          {aN} <span style={{ fontSize: '7px', opacity: 0.7 }}>({aCurve > 0 ? '+' : ''}{aCurve})</span>
                                        </span>
                                      </div>
                                    ) : <span style={{ color: theme.textDim }}>—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            {(() => {
                              const MARKET_GROUPS: [string, string[]][] = [
                                ['1X2', ['vittorie', 'sconfitte', 'imbattibilita', 'pareggi', 'senza_vittorie']],
                                ['O/U', ['over25', 'under25']],
                                ['GG', ['gg', 'clean_sheet', 'senza_segnare', 'gol_subiti']],
                              ];
                              const calcMarket = (types: string[], team: 'home' | 'away') => {
                                let tot = 0;
                                const data = team === 'home' ? pred.streak_home : pred.streak_away;
                                types.forEach(t => {
                                  const n = data?.[t] ?? 0;
                                  if (n >= 2) tot += getCurveVal(t, n);
                                });
                                return tot;
                              };
                              return MARKET_GROUPS.map(([label, types]) => {
                                const hVal = calcMarket(types, 'home');
                                const aVal = calcMarket(types, 'away');
                                if (hVal === 0 && aVal === 0) return null;
                                return (
                                  <tr key={label} style={{ borderTop: `1px solid ${theme.cyan}20` }}>
                                    <td style={{ padding: '3px 4px', color: theme.textDim, fontWeight: 'bold', fontSize: '9px' }}>{label}</td>
                                    <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                                      <span style={{ color: getColor(hVal), fontWeight: 'bold' }}>{hVal > 0 ? '+' : ''}{hVal}</span>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                                      <span style={{ color: getColor(aVal), fontWeight: 'bold' }}>{aVal > 0 ? '+' : ''}{aVal}</span>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tfoot>
                        </table>

                        {/* Frasi descrittive — contestualizzate al pronostico */}
                        {(() => {
                          const segnoTip = pred.pronostici?.find((p: any) => p.tipo === 'SEGNO' || p.tipo === 'DOPPIA_CHANCE');
                          const golTip = pred.pronostici?.find((p: any) => p.tipo === 'GOL');
                          if (!segnoTip && !golTip) return null;

                          const PHRASES_GOOD = [
                            (sq: string, n: number, tipo: string, pr: string) => `${sq}: ${n} ${tipo} di fila, buon segnale per ${pr}`,
                            (sq: string, n: number, tipo: string, pr: string) => `Il trend di ${tipo} (${n}) del ${sq} sostiene ${pr}`,
                            (sq: string, n: number, tipo: string, pr: string) => `${sq} con ${n} ${tipo}: in linea con ${pr}`,
                          ];
                          const PHRASES_GOOD_REG = [
                            (sq: string, n: number, tipo: string, pr: string) => `${sq}: ${n} ${tipo} sono troppi, la regressione favorisce ${pr}`,
                            (sq: string, n: number, tipo: string, pr: string) => `La serie di ${n} ${tipo} del ${sq} potrebbe interrompersi: aiuta ${pr}`,
                            (sq: string, n: number, tipo: string, pr: string) => `${sq} con ${n} ${tipo}: trend al limite, la svolta favorirebbe ${pr}`,
                          ];
                          const PHRASES_BAD = [
                            (sq: string, n: number, tipo: string, pr: string) => `${sq}: ${n} ${tipo} di fila, va contro ${pr}`,
                            (sq: string, n: number, tipo: string, pr: string) => `Il trend di ${tipo} (${n}) del ${sq} contraddice ${pr}`,
                            (sq: string, n: number, tipo: string, pr: string) => `${sq} con ${n} ${tipo}: direzione opposta a ${pr}`,
                          ];
                          const PHRASES_BAD_REG = [
                            (sq: string, n: number, tipo: string, pr: string) => `${sq}: i ${n} ${tipo} sostenevano ${pr}, ma la regressione incombe`,
                            (sq: string, n: number, tipo: string, pr: string) => `La serie di ${n} ${tipo} del ${sq} è al limite, ${pr} a rischio`,
                            (sq: string, n: number, tipo: string, pr: string) => `${sq} con ${n} ${tipo}: il trend per ${pr} rischia di interrompersi`,
                          ];

                          const pick = (arr: ((sq: string, n: number, tipo: string, pr: string) => string)[], seed: string) =>
                            arr[Math.abs([...seed].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % arr.length];

                          const insights: { text: string; isGood: boolean }[] = [];

                          const analyzeTeam = (team: 'home' | 'away') => {
                            const streaks = team === 'home' ? pred.streak_home : pred.streak_away;
                            const squadra = team === 'home' ? pred.home : pred.away;
                            if (!streaks) return;

                            for (const [tipo, rawN] of Object.entries(streaks)) {
                              const n = rawN as number;
                              if (typeof n !== 'number' || n < 2) continue;
                              const cv = getCurveVal(tipo, n);
                              if (cv === 0) continue;
                              const label = STREAK_LABELS[tipo] || tipo;

                              // SEGNO
                              if (segnoTip && SUPPORTS_SEGNO[tipo]) {
                                const supported = SUPPORTS_SEGNO[tipo][team];
                                const pr = segnoTip.pronostico;
                                const supports = supported.some((s: string) => pr.includes(s));
                                const isGood = (supports && cv > 0) || (!supports && cv < 0);
                                let pool;
                                if (supports && cv > 0) pool = PHRASES_GOOD;
                                else if (!supports && cv < 0) pool = PHRASES_GOOD_REG;
                                else if (!supports && cv > 0) pool = PHRASES_BAD;
                                else pool = PHRASES_BAD_REG;
                                insights.push({ text: pick(pool, squadra + tipo)(squadra, n, label, pr), isGood });
                              }

                              // GOL
                              if (golTip && SUPPORTS_GOL[tipo]) {
                                const supported = SUPPORTS_GOL[tipo];
                                const pr = golTip.pronostico;
                                const supports = supported.some((s: string) => pr.startsWith(s));
                                const isGood = (supports && cv > 0) || (!supports && cv < 0);
                                let pool;
                                if (supports && cv > 0) pool = PHRASES_GOOD;
                                else if (!supports && cv < 0) pool = PHRASES_GOOD_REG;
                                else if (!supports && cv > 0) pool = PHRASES_BAD;
                                else pool = PHRASES_BAD_REG;
                                insights.push({ text: pick(pool, squadra + tipo)(squadra, n, label, pr), isGood });
                              }
                            }
                          };

                          analyzeTeam('home');
                          analyzeTeam('away');
                          if (insights.length === 0) return null;

                          return (
                            <div style={{ marginTop: '6px', fontSize: '9px', lineHeight: '1.6' }}>
                              {insights.slice(0, 4).map((ins, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '2px' }}>
                                  <span style={{ flexShrink: 0, fontSize: '10px' }}>{ins.isGood ? '✅' : '⚠️'}</span>
                                  <span style={{ color: ins.isGood ? theme.success : theme.warning }}>{ins.text}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        </>
                      );
                    })()}

                    {/* Alert strisce significative */}
                    {(() => {
                      const alerts: string[] = [];
                      const sh = pred.streak_home ?? {};
                      const sa = pred.streak_away ?? {};
                      if ((sh.vittorie ?? 0) >= 7) alerts.push(`${pred.home}: ${sh.vittorie} vittorie consecutive → regressione probabile`);
                      if ((sa.vittorie ?? 0) >= 7) alerts.push(`${pred.away}: ${sa.vittorie} vittorie consecutive → regressione probabile`);
                      if ((sh.sconfitte ?? 0) >= 5) alerts.push(`${pred.home}: ${sh.sconfitte} sconfitte consecutive → possibile reazione`);
                      if ((sa.sconfitte ?? 0) >= 5) alerts.push(`${pred.away}: ${sa.sconfitte} sconfitte consecutive → possibile reazione`);
                      if ((sh.over25 ?? 0) >= 6) alerts.push(`${pred.home}: ${sh.over25} Over 2.5 consecutivi → Under probabile`);
                      if ((sa.over25 ?? 0) >= 6) alerts.push(`${pred.away}: ${sa.over25} Over 2.5 consecutivi → Under probabile`);
                      if ((sh.clean_sheet ?? 0) >= 5) alerts.push(`${pred.home}: ${sh.clean_sheet} clean sheet consecutivi → prima o poi subirà`);
                      if (alerts.length === 0) return null;
                      return (
                        <div style={{ marginTop: '6px', padding: '4px 8px', background: `${theme.warning}15`, borderRadius: '4px', fontSize: '9px', color: theme.warning }}>
                          {alerts.map((a, i) => <div key={i}>⚠️ {a}</div>)}
                        </div>
                      );
                    })()}

                    {/* Barre conferma strisce — con pronostico specifico */}
                    {(pred.segno_dettaglio?.strisce != null || pred.gol_dettaglio?.strisce != null) && (() => {
                      const segnoTip = pred.pronostici?.find(p => p.tipo === 'SEGNO' || p.tipo === 'DOPPIA_CHANCE');
                      const golTip = pred.pronostici?.find(p => p.tipo === 'GOL');
                      return (
                        <div style={{ marginTop: '8px' }}>
                          {pred.segno_dettaglio?.strisce != null && segnoTip && (() => {
                            const val = pred.segno_dettaglio.strisce as number;
                            const pct = Math.min(100, Math.max(0, val));
                            const color = val >= 70 ? theme.success : val >= 50 ? theme.cyan : val >= 35 ? theme.warning : theme.danger;
                            return (
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
                                  <span style={{ color: theme.textDim }}>Le strisce confermano <span style={{ color: theme.cyan, fontWeight: 'bold' }}>{segnoTip.pronostico}</span>?</span>
                                  <span style={{ color, fontWeight: 'bold' }}>{val.toFixed(1)}</span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginTop: '2px', opacity: 0.5 }}>
                                  <span style={{ color: theme.danger }}>No</span>
                                  <span style={{ color: theme.success }}>Si</span>
                                </div>
                              </div>
                            );
                          })()}
                          {pred.gol_dettaglio?.strisce != null && golTip && (() => {
                            const val = pred.gol_dettaglio.strisce as number;
                            const pct = Math.min(100, Math.max(0, val));
                            const color = val >= 70 ? theme.success : val >= 50 ? theme.cyan : val >= 35 ? theme.warning : theme.danger;
                            return (
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
                                  <span style={{ color: theme.textDim }}>Le strisce confermano <span style={{ color: theme.cyan, fontWeight: 'bold' }}>{golTip.pronostico}</span>?</span>
                                  <span style={{ color, fontWeight: 'bold' }}>{val.toFixed(1)}</span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginTop: '2px', opacity: 0.5 }}>
                                  <span style={{ color: theme.danger }}>No</span>
                                  <span style={{ color: theme.success }}>Si</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                    {(pred.streak_adjustment_segno || pred.streak_adjustment_gol || pred.streak_adjustment_ggng) ? (
                      <div style={{ marginTop: '3px', fontSize: '9px', color: theme.textDim, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {pred.streak_adjustment_segno ? <span>Adj Segno: <span style={{ color: pred.streak_adjustment_segno > 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{pred.streak_adjustment_segno > 0 ? '+' : ''}{pred.streak_adjustment_segno.toFixed(1)}%</span></span> : null}
                        {pred.streak_adjustment_gol ? <span>Adj O/U: <span style={{ color: pred.streak_adjustment_gol > 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{pred.streak_adjustment_gol > 0 ? '+' : ''}{pred.streak_adjustment_gol.toFixed(1)}%</span></span> : null}
                        {pred.streak_adjustment_ggng ? <span>Adj GG/NG: <span style={{ color: pred.streak_adjustment_ggng > 0 ? theme.success : theme.danger, fontWeight: 'bold' }}>{pred.streak_adjustment_ggng > 0 ? '+' : ''}{pred.streak_adjustment_ggng.toFixed(1)}%</span></span> : null}
                      </div>
                    ) : null}
                  </div>
                )}

                {pred.segno_dettaglio && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.cyan, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    📊 Dettaglio Segno
                  </div>
                  {pred.segno_dettaglio_raw ? (
                    Object.entries(pred.segno_dettaglio).filter(([key]) => key !== 'strisce').map(([key, affidabilita]) => {
                      const raw = pred.segno_dettaglio_raw?.[key as keyof typeof pred.segno_dettaglio_raw];
                      if (!raw) return <div key={key}>{renderDetailBar(affidabilita, SEGNO_LABELS[key] || key)}</div>;
                      const homeVal = key === 'affidabilita' ? (raw as any).home_num : raw.home;
                      const awayVal = key === 'affidabilita' ? (raw as any).away_num : raw.away;
                      return (
                        <div key={key}>
                          {renderDetailBarWithTeams(
                            SEGNO_LABELS[key] || key,
                            homeVal,
                            awayVal,
                            affidabilita,
                            raw.scala,
                            pred.home,
                            pred.away
                          )}
                        </div>
                      );
                    })
                  ) : (
                    Object.entries(pred.segno_dettaglio).filter(([key]) => key !== 'strisce').map(([key, val]) => (
                      <div key={key}>{renderDetailBar(val, SEGNO_LABELS[key] || key)}</div>
                    ))
                  )}
                </div>
              )}
                {pred.gol_dettaglio && pred.confidence_gol > 0 && (
                <div style={{ marginBottom: '8px', marginTop: '20px' }}>
                  <div style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 15%, rgba(255,255,255,0.3) 85%, transparent 100%)',
                    marginBottom: '20px',
                    marginTop: '0px',
                    marginLeft: isMobile ? '-10px' : '-14px',
                    marginRight: isMobile ? '-10px' : '-14px'
                  }} />
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.cyan, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ⚽ Dettaglio Gol
                  </div>
                  {Object.entries(pred.gol_dettaglio).filter(([key]) => key !== 'strisce').map(([key, val]) => (
                    <div key={key}>
                      {renderGolDetailBar(val, GOL_LABELS[key] || key, pred.gol_directions?.[key])}
                    </div>
                  ))}
                    {pred.expected_total_goals && (
                      <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '10px' }}>
                        <span style={{ color: theme.textDim }}>Gol attesi: <span style={{ color: theme.text, fontWeight: 'bold' }}>{pred.expected_total_goals.toFixed(1)}</span></span>
                        <span style={{ color: theme.textDim }}>Media lega: <span style={{ color: theme.text, fontWeight: 'bold' }}>{pred.league_avg_goals?.toFixed(1)}</span></span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- RENDER CARD BOMBA ---
  const renderBombCard = (bomb: Bomb) => {
    const cardKey = `bomb-${bomb.home}-${bomb.away}`;
    const commentKey = `${cardKey}-comment`;
    const detailKey = `${cardKey}-detail`;
    const isCommentOpen = !expandedSections.has(commentKey);
    const isDetailOpen = expandedSections.has(detailKey);
    const isCardExpanded = expandedCards.has(cardKey);
    const tipsKey = `${cardKey}-tips`;
    const isTipsOpen = expandedSections.has(tipsKey);

    return (
      <div
        key={cardKey}
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.04), rgba(255,42,109,0.04))',
          border: `1px solid ${theme.gold}40`,
          borderRadius: '10px',
          padding: isMobile ? '6px 10px' : '8px 14px',
          marginBottom: '4px',
          position: 'relative',
          zIndex: isTipsOpen ? 50 : 'auto' as any
        }}
      >
        {/* BARRA LATERALE */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: bomb.real_score ? (bomb.hit ? '#00ff88' : '#ff4466') : `linear-gradient(180deg, ${theme.gold}, ${theme.danger})`
        }} />

        {/* RIGA UNICA COMPATTA — click ovunque espande */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: isMobile ? '4px' : '8px', cursor: 'pointer' }}
          onClick={() => setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(cardKey)) next.delete(cardKey);
            else next.add(cardKey);
            return next;
          })}
        >
          <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>{isMobile ? bomb.match_time : `🕐 ${bomb.match_time}`}</span>

          {/* Squadre — larghezza naturale, si restringe se serve */}
          <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', marginRight: isMobile ? '25px' : undefined }}>
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bomb.home}
            </span>
            <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>vs</span>
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bomb.away}
            </span>
          </div>

          {/* Risultato + Freccia — spinto a destra */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {bomb.real_score ? (
              <span style={{ fontSize: '13px', fontWeight: '900', color: bomb.hit ? '#00ff88' : '#ff4466' }}>
                {bomb.real_score.replace(':', ' - ')}
              </span>
            ) : getMatchStatus(bomb) === 'live' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: bomb.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: bomb.live_status !== 'HT' ? 'pulse 1.5s ease-in-out infinite' : undefined }}>
                  {bomb.live_score || '– : –'}
                </span>
                {(!isMobile || bomb.live_status === 'HT') && <span style={{ fontSize: '8px', fontWeight: 900, color: bomb.live_status === 'HT' ? '#f59e0b' : '#ef4444' }}>
                  {bomb.live_status === 'HT' ? 'INT' : `${bomb.live_minute || ''}'`}
                </span>}
              </span>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: '900', color: theme.textDim }}>– : –</span>
            )}
            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>

        {/* Badge Bomba — ABSOLUTE, sganciato dal flex */}
        <div
          style={{
            position: 'absolute', top: isMobile ? '3px' : '4px', right: isMobile ? '65px' : '100px',
            zIndex: 5
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'baseline', gap: isMobile ? '3px' : '6px', cursor: 'pointer',
              background: isTipsOpen ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.06)',
              border: `1px solid ${isTipsOpen ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.18)'}`,
              borderRadius: '4px', padding: isMobile ? '3px 6px' : '4px 12px',
              transition: 'all 0.2s', userSelect: 'none' as const
            }}
            onClick={(e) => { e.stopPropagation(); toggleSection(tipsKey, e); }}
          >
            {!isMobile && <span style={{ fontSize: '9px' }}>💣</span>}
            <span style={{ fontSize: '9px', fontWeight: '600', color: theme.gold, letterSpacing: '0.3px' }}>tip</span>
            <span style={{ fontSize: '9px', color: theme.gold, transition: 'transform 0.2s', transform: isTipsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>

          {/* POPOVER FLOTTANTE */}
          {isTipsOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-75%)', zIndex: 1000,
              background: '#1a1a24', border: '1px solid rgba(255,215,0,0.45)',
              borderRadius: '8px', padding: '8px 10px',
              boxShadow: '0 0 12px rgba(255,215,0,0.15), 0 6px 24px rgba(0,0,0,0.9)',
              minWidth: '160px', whiteSpace: 'nowrap' as const
            }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(() => {
                  const isHit = bomb.real_score ? bomb.hit : null;
                  const pillBg = isHit === true ? 'rgba(0,255,136,0.15)' : isHit === false ? 'rgba(255,68,102,0.15)' : 'rgba(255,215,0,0.1)';
                  const pillBorder = isHit === true ? 'rgba(0,255,136,0.3)' : isHit === false ? 'rgba(255,68,102,0.3)' : `${theme.gold}30`;
                  const nameColor = isHit === true ? '#00ff88' : isHit === false ? '#ff4466' : theme.gold;
                  return (
                    <span style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: '4px', padding: '2px 8px',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px'
                    }}>
                      <span style={{ fontWeight: '800', color: nameColor }}>{bomb.segno_bomba}</span>
                      {bomb.odds?.[bomb.segno_bomba as keyof typeof bomb.odds] != null && <span style={{ fontWeight: '700', color: '#4dd0e1' }}>@{Number(bomb.odds[bomb.segno_bomba as keyof typeof bomb.odds]).toFixed(2)}</span>}
                      {isHit !== null && <span>{isHit ? '✅' : '❌'}</span>}
                    </span>
                  );
                })()}
                <span style={{ fontSize: '10px', color: theme.gold }}>⚡ {bomb.sfavorita}</span>
              </div>
            </div>
          )}
        </div>

        {/* DETTAGLIO ESPANSO (identico a prima) */}
        {isCardExpanded && (
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,215,0,0.08)', paddingTop: '10px', animation: 'fadeIn 0.3s ease' }}>

            {/* Pronostico bomba completo con stelle + confidence */}
            <div style={{ paddingLeft: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pronostico</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  const isHit = bomb.real_score ? bomb.hit : null;
                  const pillBg = isHit === true ? 'rgba(0,255,136,0.1)' : isHit === false ? 'rgba(255,68,102,0.1)' : 'rgba(255,215,0,0.08)';
                  const pillBorder = isHit === true ? 'rgba(0,255,136,0.3)' : isHit === false ? 'rgba(255,68,102,0.3)' : `${theme.gold}30`;
                  const nameColor = isHit === true ? '#00ff88' : isHit === false ? '#ff4466' : theme.gold;
                  return (
                    <div style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: '6px', padding: '4px 10px',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: nameColor }}>{bomb.segno_bomba}</span>
                      <span style={{ position: 'relative', display: 'inline-block', fontSize: '14px', lineHeight: 1 }}>
                        <span style={{ color: 'rgba(255,255,255,0.12)' }}>★</span>
                        <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${bomb.confidence || 0}%`, color: theme.gold }}>★</span>
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: getConfidenceColor(bomb.confidence) }}>{bomb.confidence.toFixed(0)}%</span>
                      {bomb.odds?.[bomb.segno_bomba as keyof typeof bomb.odds] != null && <span style={{ fontSize: '11px', fontWeight: '700', color: '#4dd0e1' }}>@{Number(bomb.odds[bomb.segno_bomba as keyof typeof bomb.odds]).toFixed(2)}</span>}
                      {isHit !== null && <span style={{ fontSize: '12px' }}>{isHit ? '✅' : '❌'}</span>}
                    </div>
                  );
                })()}
                <span style={{ fontSize: '10px', color: theme.gold }}>⚡ {bomb.sfavorita}</span>
              </div>
            </div>

            {/* Quote */}
            <div style={{
              display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingTop: '6px',
              borderTop: '1px solid rgba(255,215,0,0.06)', fontSize: '11px'
            }}>
              <div style={{ display: 'flex', gap: '10px', color: theme.textDim, flexWrap: 'wrap' }}>
                <span>1: <span style={{ color: theme.text }}>{bomb.odds?.['1'] != null ? Number(bomb.odds['1']).toFixed(2) : '-'}</span></span>
                <span>X: <span style={{ color: theme.text }}>{bomb.odds?.['X'] != null ? Number(bomb.odds['X']).toFixed(2) : '-'}</span></span>
                <span>2: <span style={{ color: theme.text }}>{bomb.odds?.['2'] != null ? Number(bomb.odds['2']).toFixed(2) : '-'}</span></span>
                {bomb.odds?.over_25 != null && <>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>│</span>
                  <span>O2.5: <span style={{ color: theme.text }}>{Number(bomb.odds.over_25).toFixed(2)}</span></span>
                  <span>U2.5: <span style={{ color: theme.text }}>{Number(bomb.odds.under_25).toFixed(2)}</span></span>
                </>}
                {bomb.odds?.gg != null && <>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>│</span>
                  <span>GG: <span style={{ color: theme.text }}>{Number(bomb.odds.gg).toFixed(2)}</span></span>
                  <span>NG: <span style={{ color: theme.text }}>{Number(bomb.odds.ng).toFixed(2)}</span></span>
                </>}
              </div>
            </div>

            {/* Bottoni Commento + Dettaglio */}
            <div style={{
              display: 'flex', gap: '12px', paddingLeft: '8px', paddingTop: '8px', marginTop: '6px',
              borderTop: '1px solid rgba(255,215,0,0.06)'
            }}>
              {bomb.comment && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: theme.textDim, userSelect: 'none' as const }}
                  onClick={(e) => toggleSection(commentKey, e)}
                >
                  <span>💬 Commento</span>
                  <span style={{ transition: 'transform 0.2s', transform: isCommentOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              )}
              {bomb.dettaglio && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: theme.textDim, userSelect: 'none' as const }}
                  onClick={(e) => toggleSection(detailKey, e)}
                >
                  <span>🔍 Dettaglio</span>
                  <span style={{ transition: 'transform 0.2s', transform: isDetailOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
              )}
            </div>

            {/* SEZIONE COMMENTO */}
            {isCommentOpen && bomb.comment && (
              <div style={{
                marginTop: '8px', paddingLeft: '8px', paddingTop: '8px',
                borderTop: `1px solid ${theme.gold}20`,
                animation: 'fadeIn 0.3s ease', fontSize: '11px', color: theme.textDim, fontStyle: 'italic'
              }}>
                💬 {typeof bomb.comment === 'string' ? bomb.comment.replace(/BVS/g, 'MAP') : bomb.comment}
              </div>
            )}

            {/* SEZIONE DETTAGLIO */}
            {isDetailOpen && bomb.dettaglio && (
              <div style={{
                marginTop: '8px', paddingLeft: '8px', paddingTop: '8px',
                borderTop: `1px solid ${theme.gold}20`,
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.gold, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  🔍 Dettaglio Bomba
                </div>
                {Object.entries(bomb.dettaglio).map(([key, val]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return renderDetailBar(val, label);
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- RENDER CARD RISULTATO ESATTO ---
  const renderExactScoreCard = (pred: Prediction) => {
    const cardKey = `es-${pred.home}-${pred.away}`;
    const isCardExpanded = expandedCards.has(cardKey);
    const top3 = pred.exact_score_top3 || [];
    const maxProb = top3.length > 0 ? top3[0].prob : 1;
    const conf = pred.confidence_segno || 0;

    // Hit/Miss: controlla se il risultato reale è uno dei top-3
    const realScore = pred.real_score;
    const isHitExact = realScore ? top3.some(t => t.score === realScore) : null;
    const barColor = realScore ? (isHitExact ? '#00ff88' : '#ff4466') : '#ff9800';

    return (
      <div
        key={cardKey}
        style={{
          background: 'linear-gradient(135deg, rgba(255,152,0,0.06), rgba(255,87,34,0.04))',
          border: '1px solid rgba(255,152,0,0.25)',
          borderRadius: '10px',
          padding: isMobile ? '6px 10px' : '8px 14px',
          marginBottom: '4px',
          position: 'relative'
        }}
      >
        {/* BARRA LATERALE arancione */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: barColor, borderRadius: '3px 0 0 3px'
        }} />

        {/* RIGA COMPATTA */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: isMobile ? '4px' : '8px', cursor: 'pointer' }}
          onClick={() => setExpandedCards(prev => {
            const next = new Set(prev);
            next.has(cardKey) ? next.delete(cardKey) : next.add(cardKey);
            return next;
          })}
        >
          <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>{isMobile ? pred.match_time : `🕐 ${pred.match_time}`}</span>

          {/* Squadre */}
          <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
            <img src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pred.home}</span>
            <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>vs</span>
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pred.away}</span>
            <img src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>

          {/* Badge RE */}
          <span style={{
            background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.4)',
            borderRadius: '4px', padding: '2px 6px', fontSize: '9px', fontWeight: '800', color: '#ff9800', flexShrink: 0
          }}>RE</span>

          {/* Risultato + Freccia */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {pred.real_score ? (
              <span style={{ fontSize: '13px', fontWeight: '900', color: isHitExact ? '#00ff88' : '#ff4466' }}>
                {pred.real_score.replace(':', ' - ')} {isHitExact ? '✅' : '❌'}
              </span>
            ) : getMatchStatus(pred) === 'live' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: pred.live_status !== 'HT' ? 'pulse 1.5s ease-in-out infinite' : undefined }}>
                  {pred.live_score || '– : –'}
                </span>
                {(!isMobile || pred.live_status === 'HT') && <span style={{ fontSize: '8px', fontWeight: 900, color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444' }}>
                  {pred.live_status === 'HT' ? 'INT' : `${pred.live_minute || ''}'`}
                </span>}
              </span>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: '900', color: theme.textDim }}>– : –</span>
            )}
            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>

        {/* DETTAGLIO ESPANSO */}
        {isCardExpanded && (
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,152,0,0.15)', paddingTop: '10px', paddingLeft: '8px', animation: 'fadeIn 0.3s ease' }}>
            {/* Top 3 con barre */}
            <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top 3 Risultati</div>
            {top3.map((t, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const isThisHit = realScore === t.score;
              const barWidth = maxProb > 0 ? (t.prob / maxProb) * 100 : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', width: '22px', textAlign: 'center' }}>{medals[i] || ''}</span>
                  <span style={{
                    fontSize: '13px', fontWeight: '900', color: isThisHit ? '#00ff88' : '#fff',
                    width: '36px', textAlign: 'center',
                    background: isThisHit ? 'rgba(0,255,136,0.15)' : 'transparent',
                    borderRadius: '4px', padding: '1px 0'
                  }}>{t.score}</span>
                  {/* Barra */}
                  <div style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${barWidth}%`, height: '100%',
                      background: isThisHit
                        ? 'linear-gradient(90deg, rgba(0,255,136,0.4), rgba(0,255,136,0.6))'
                        : `linear-gradient(90deg, rgba(255,152,0,0.3), rgba(255,87,34,0.5))`,
                      borderRadius: '4px', transition: 'width 0.5s ease'
                    }} />
                    <span style={{
                      position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '10px', fontWeight: '800', color: isThisHit ? '#00ff88' : '#ff9800'
                    }}>{t.prob.toFixed(1)}%</span>
                  </div>
                  {isThisHit && <span style={{ fontSize: '12px' }}>✅</span>}
                </div>
              );
            })}
            {/* Confidence + gap */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,152,0,0.1)' }}>
              <span style={{ fontSize: '10px', color: theme.textDim }}>
                Confidence: <span style={{ fontWeight: '700', color: getConfidenceColor(conf) }}>{conf.toFixed(0)}%</span>
              </span>
              {pred.exact_score_gap != null && (
                <span style={{ fontSize: '10px', color: theme.textDim }}>
                  Gap: <span style={{ fontWeight: '700', color: '#ff9800' }}>{pred.exact_score_gap.toFixed(1)}%</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER CARD X FACTOR ---
  const renderXFactorCard = (pred: Prediction) => {
    const cardKey = `xf-${pred.home}-${pred.away}`;
    const isCardExpanded = expandedCards.has(cardKey);
    const tipsKey = `${cardKey}-tips`;
    const isTipsOpen = expandedSections.has(tipsKey);
    const conf = pred.confidence_segno || 0;
    const quotaX = pred.odds?.['X'];

    // Hit/Miss: real_sign === 'X'
    const isHitXF = pred.real_score ? pred.real_sign === 'X' : null;
    const barColor = pred.real_score ? (isHitXF ? '#00ff88' : '#ff4466') : theme.purple;

    return (
      <div
        key={cardKey}
        style={{
          background: 'linear-gradient(135deg, rgba(188,19,254,0.06), rgba(123,31,162,0.04))',
          border: '1px solid rgba(188,19,254,0.25)',
          borderRadius: '10px',
          padding: isMobile ? '6px 10px' : '8px 14px',
          marginBottom: '4px',
          position: 'relative',
          zIndex: isTipsOpen ? 50 : 'auto' as any
        }}
      >
        {/* BARRA LATERALE viola */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: barColor, borderRadius: '3px 0 0 3px'
        }} />

        {/* RIGA COMPATTA */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: isMobile ? '4px' : '8px', cursor: 'pointer' }}
          onClick={() => setExpandedCards(prev => {
            const next = new Set(prev);
            next.has(cardKey) ? next.delete(cardKey) : next.add(cardKey);
            return next;
          })}
        >
          <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>{isMobile ? pred.match_time : `🕐 ${pred.match_time}`}</span>

          {/* Squadre */}
          <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', marginRight: isMobile ? '25px' : undefined }}>
            <img src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pred.home}</span>
            <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>vs</span>
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pred.away}</span>
            <img src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>

          {/* Risultato + Freccia */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {pred.real_score ? (
              <span style={{ fontSize: '13px', fontWeight: '900', color: isHitXF ? '#00ff88' : '#ff4466' }}>
                {pred.real_score.replace(':', ' - ')} {isHitXF ? '✅' : '❌'}
              </span>
            ) : getMatchStatus(pred) === 'live' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: pred.live_status !== 'HT' ? 'pulse 1.5s ease-in-out infinite' : undefined }}>
                  {pred.live_score || '– : –'}
                </span>
                {(!isMobile || pred.live_status === 'HT') && <span style={{ fontSize: '8px', fontWeight: 900, color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444' }}>
                  {pred.live_status === 'HT' ? 'INT' : `${pred.live_minute || ''}'`}
                </span>}
              </span>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: '900', color: theme.textDim }}>– : –</span>
            )}
            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>

        {/* Badge Tip — ABSOLUTE, come bomb/normal */}
        <div
          style={{
            position: 'absolute', top: isMobile ? '3px' : '4px', right: isMobile ? '65px' : '100px',
            zIndex: 5
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'baseline', gap: isMobile ? '3px' : '6px', cursor: 'pointer',
              background: isTipsOpen ? 'rgba(188,19,254,0.15)' : 'rgba(188,19,254,0.06)',
              border: `1px solid ${isTipsOpen ? 'rgba(188,19,254,0.4)' : 'rgba(188,19,254,0.18)'}`,
              borderRadius: '4px', padding: isMobile ? '3px 6px' : '4px 12px',
              transition: 'all 0.2s', userSelect: 'none' as const
            }}
            onClick={(e) => { e.stopPropagation(); toggleSection(tipsKey, e); }}
          >
            {!isMobile && <span style={{ fontSize: '9px' }}>🔮</span>}
            <span style={{ fontSize: '9px', fontWeight: '600', color: theme.purple, letterSpacing: '0.3px' }}>tip</span>
            <span style={{ fontSize: '9px', color: theme.purple, transition: 'transform 0.2s', transform: isTipsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>

          {/* POPOVER FLOTTANTE */}
          {isTipsOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-75%)', zIndex: 1000,
              background: '#1a1a24', border: '1px solid rgba(188,19,254,0.45)',
              borderRadius: '8px', padding: '8px 10px',
              boxShadow: '0 0 12px rgba(188,19,254,0.15), 0 6px 24px rgba(0,0,0,0.9)',
              minWidth: '160px', whiteSpace: 'nowrap' as const
            }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(() => {
                  const pillBg = isHitXF === true ? 'rgba(0,255,136,0.15)' : isHitXF === false ? 'rgba(255,68,102,0.15)' : 'rgba(188,19,254,0.1)';
                  const pillBorder = isHitXF === true ? 'rgba(0,255,136,0.3)' : isHitXF === false ? 'rgba(255,68,102,0.3)' : 'rgba(188,19,254,0.3)';
                  const nameColor = isHitXF === true ? '#00ff88' : isHitXF === false ? '#ff4466' : theme.purple;
                  return (
                    <span style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: '4px', padding: '2px 8px',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px'
                    }}>
                      <span style={{ fontWeight: '800', color: nameColor }}>X</span>
                      {quotaX != null && <span style={{ fontWeight: '700', color: '#4dd0e1' }}>@{Number(quotaX).toFixed(2)}</span>}
                      {isHitXF !== null && <span>{isHitXF ? '✅' : '❌'}</span>}
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* DETTAGLIO ESPANSO */}
        {isCardExpanded && (
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(188,19,254,0.15)', paddingTop: '10px', paddingLeft: '8px', animation: 'fadeIn 0.3s ease' }}>
            {/* Pronostico X con stelle + confidence + quota */}
            <div style={{ paddingBottom: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pronostico</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  const pillBg = isHitXF === true ? 'rgba(0,255,136,0.1)' : isHitXF === false ? 'rgba(255,68,102,0.1)' : 'rgba(188,19,254,0.08)';
                  const pillBorder = isHitXF === true ? 'rgba(0,255,136,0.3)' : isHitXF === false ? 'rgba(255,68,102,0.3)' : 'rgba(188,19,254,0.3)';
                  const nameColor = isHitXF === true ? '#00ff88' : isHitXF === false ? '#ff4466' : theme.purple;
                  return (
                    <div style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: '6px', padding: '4px 10px',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: nameColor }}>X</span>
                      <span style={{ position: 'relative', display: 'inline-block', fontSize: '14px', lineHeight: 1 }}>
                        <span style={{ color: 'rgba(255,255,255,0.12)' }}>★</span>
                        <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${conf}%`, color: theme.purple }}>★</span>
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: getConfidenceColor(conf) }}>{conf.toFixed(0)}%</span>
                      {quotaX != null && <span style={{ fontSize: '11px', fontWeight: '700', color: '#4dd0e1' }}>@{Number(quotaX).toFixed(2)}</span>}
                      {isHitXF !== null && <span style={{ fontSize: '12px' }}>{isHitXF ? '✅' : '❌'}</span>}
                    </div>
                  );
                })()}
                {pred.x_factor_n_signals != null && (
                  <span style={{ fontSize: '10px', color: theme.textDim }}>
                    Segnali: <span style={{ fontWeight: '700', color: theme.purple }}>{pred.x_factor_n_signals}</span>
                  </span>
                )}
              </div>
            </div>
            {/* Quote */}
            <div style={{
              display: 'flex', gap: '10px', paddingTop: '6px', flexWrap: 'wrap',
              borderTop: '1px solid rgba(188,19,254,0.1)', fontSize: '11px', color: theme.textDim
            }}>
              <span>1: <span style={{ color: theme.text }}>{pred.odds?.['1'] != null ? Number(pred.odds['1']).toFixed(2) : '-'}</span></span>
              <span>X: <span style={{ color: theme.purple, fontWeight: '700' }}>{pred.odds?.['X'] != null ? Number(pred.odds['X']).toFixed(2) : '-'}</span></span>
              <span>2: <span style={{ color: theme.text }}>{pred.odds?.['2'] != null ? Number(pred.odds['2']).toFixed(2) : '-'}</span></span>
              {pred.odds?.over_25 != null && <>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>│</span>
                <span>O2.5: <span style={{ color: theme.text }}>{Number(pred.odds.over_25).toFixed(2)}</span></span>
                <span>U2.5: <span style={{ color: theme.text }}>{Number(pred.odds.under_25).toFixed(2)}</span></span>
              </>}
              {pred.odds?.gg != null && <>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>│</span>
                <span>GG: <span style={{ color: theme.text }}>{Number(pred.odds.gg).toFixed(2)}</span></span>
                <span>NG: <span style={{ color: theme.text }}>{Number(pred.odds.ng).toFixed(2)}</span></span>
              </>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER PRINCIPALE ---
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: isMobile ? '#1a1d2e' : theme.bg,
      backgroundImage: isMobile
        ? 'radial-gradient(circle at 50% 0%, #2a2d4a 0%, #1a1d2e 70%)'
        : 'radial-gradient(circle at 50% 0%, #1a1d2e 0%, #05070a 70%)',
      zIndex: 9999,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: isMobile ? '15px' : '20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: theme.font
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .analysis-tab-free, .analysis-tab-premium {
          transition: all 0.25s ease;
        }
        .analysis-tab-free:hover {
          background: rgba(6, 182, 212, 0.35) !important;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.2);
          transform: scale(1.04);
        }
        .analysis-tab-free.active {
          border: 1px solid rgba(6, 182, 212, 0.6) !important;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.4), 0 0 16px rgba(6, 182, 212, 0.15);
        }
        .analysis-tab-premium:hover {
          background: rgba(168, 85, 247, 0.35) !important;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.2);
          transform: scale(1.04);
        }
        .analysis-tab-premium.active {
          border: 1px solid rgba(168, 85, 247, 0.6) !important;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.4), 0 0 16px rgba(168, 85, 247, 0.15);
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '800px', paddingBottom: '40px' }}>

        {/* HEADER STICKY (solo mobile) */}
        <div style={{
          ...(isMobile ? {
            position: 'sticky' as const,
            top: -16,
            zIndex: 100,
            backgroundColor: '#1a1d2e',
            margin: '-15px -20px 0',
            padding: '14px 20px 10px',
          } : {})
        }}>

        {/* MOBILE: riga unica bottone + titolo */}
        {isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: theme.textDim,
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex', alignItems: 'center',
                flexShrink: 0,
                position: 'absolute' as const, left: '15px'
              }}
            >
              ← Dashboard
            </button>
            <h1 style={{
              fontSize: '16px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px', flex: 1, textAlign: 'center'
            }}>
              <span>🏆</span>
              <span style={{
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}> Best Picks</span>
            </h1>
            <button
              onClick={() => window.location.href = '/bankroll'}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: theme.textDim,
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex', alignItems: 'center',
                flexShrink: 0,
                position: 'absolute' as const, right: '15px'
              }}
            >
              Bankroll →
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP: layout originale */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button
                onClick={onBack}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: theme.textDim,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.cyan; e.currentTarget.style.borderColor = theme.cyan; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textDim; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                ← Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/bankroll'}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: theme.textDim,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.cyan; e.currentTarget.style.borderColor = theme.cyan; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textDim; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                Bankroll →
              </button>
            </div>

            {/* Banner modalità rimossi — Unified non ha SANDBOX/CONFRONTO */}
          </>
        )}

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '6px' : '30px' }}>
          {!isMobile && (
            <h1 style={{
              fontSize: '40px', fontWeight: '900', margin: '0 0 8px 0',
              letterSpacing: '-1px'
            }}>
              <span>🏆</span>
              <span style={{
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}> Best Picks</span>
            </h1>
          )}
          {activeTab === 'alto_rendimento' ? (
            <p style={{
              color: '#ffb74d', fontSize: isMobile ? '12px' : '14px', fontWeight: '600', margin: 0, marginTop: '8px',
              ...(isMobile ? {} : {
                background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.15)',
                borderRadius: '20px', padding: '5px 16px'
              }),
              display: 'inline-block'
            }}>
              <span style={{ fontSize: isMobile ? '13px' : '16px', filter: 'saturate(3) brightness(1.3)' }}>💎</span> <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(230,81,0,0.6)', textUnderlineOffset: '3px' }}>{isMobile ? 'Quote alte' : 'Pronostici ad alto rendimento'}</span> — <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(230,81,0,0.6)', textUnderlineOffset: '3px' }}>{isMobile ? 'value picks selezionati' : 'value picks con quota elevata'}</span>
            </p>
          ) : (
            !isMobile && (
              <p style={{ color: theme.textDim, fontSize: '14px', margin: 0 }}>
                Mixture of Experts — i migliori pronostici da 3 sistemi AI
              </p>
            )
          )}

          {/* Toggle PROD/SANDBOX/CONFRONTO rimosso — Unified non ha modalità */}
        </div>

        {/* NAVIGAZIONE DATA */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '10px' : '15px',
          marginTop: isMobile ? (activeTab === 'alto_rendimento' ? '5px' : '15px') : undefined,
          marginBottom: isMobile ? '10px' : '25px'
        }}>
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: theme.text, padding: '8px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.cyan; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            ◀
          </button>

          <div ref={datePickerRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setDatePickerOpen(!datePickerOpen)}
              style={{
                background: theme.panel, border: datePickerOpen ? `1px solid ${theme.cyan}` : theme.panelBorder,
                borderRadius: isMobile ? '8px' : '10px', padding: isMobile ? '6px 16px' : '10px 20px', textAlign: 'center', minWidth: isMobile ? '160px' : '220px',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '800', color: theme.text }}>
                {formatDateLabel(date)}
              </div>
              {date === getToday() && (
                <div style={{ fontSize: '10px', color: theme.success, fontWeight: 'bold', marginTop: '2px' }}>
                  ● OGGI
                </div>
              )}
            </div>

            {/* Mini-calendario lista verticale */}
            {datePickerOpen && (() => {
              const today = getToday();
              const days: string[] = [];
              for (let i = -7; i <= 7; i++) days.push(shiftDate(today, i));
              const weekDaysShort = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
              return (
                <div style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginTop: '6px', zIndex: 200,
                  background: '#1a1d2e', border: `1px solid ${theme.cyan}33`,
                  borderRadius: '10px', padding: '6px 0',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  width: '180px', maxHeight: '340px', overflowY: 'auto',
                  scrollbarWidth: 'thin' as const,
                  scrollbarColor: `${theme.cyan}40 transparent`
                }}>
                  {days.map(d => {
                    const dd = new Date(d + 'T12:00:00');
                    const dayNum = String(dd.getDate()).padStart(2, '0');
                    const month = String(dd.getMonth() + 1).padStart(2, '0');
                    const dayName = weekDaysShort[dd.getDay()];
                    const isToday = d === today;
                    const isSelected = d === date;
                    return (
                      <button
                        key={d}
                        onClick={() => { setDate(d); setDatePickerOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'center',
                          background: isSelected
                            ? `linear-gradient(90deg, ${theme.cyan}22, ${theme.cyan}44)`
                            : isToday
                              ? 'rgba(0, 200, 83, 0.12)'
                              : 'transparent',
                          border: 'none', borderLeft: isSelected ? `3px solid ${theme.cyan}` : '3px solid transparent',
                          padding: '9px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: isToday || isSelected ? 700 : 500,
                          color: isSelected ? theme.cyan : isToday ? theme.success : theme.text,
                          transition: 'all 0.15s',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {isToday ? 'OGGI' : `${dayNum}/${month} ${dayName}`}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <button
            onClick={() => setDate(shiftDate(date, 1))}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: theme.text, padding: '8px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.cyan; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            ▶
          </button>
        </div>

        </div>{/* FINE HEADER STICKY */}
        {isMobile && <div style={{ height: '15px' }} />}

        {/* ==================== VISTA PRINCIPALE ==================== */}
        {(<>
        {/* TAB SWITCHER: Pronostici | Alto Rendimento */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px'
        }}>
          {[
            { id: 'pronostici' as const, label: `Pronostici (${normalPredictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)})`, icon: '🏆', color: theme.cyan },
            { id: 'alto_rendimento' as const, label: `Alto Rendimento (${altoRendimentoPreds.reduce((s, p) => s + (p.pronostici?.length || 0), 0)})`, icon: '💎', color: '#ffd700' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? `${tab.color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.08)'}`,
                color: activeTab === tab.id ? tab.color : theme.textDim,
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? '700' : '500',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* STATUS FILTERS — riga unica */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px',
          flexWrap: 'wrap' as const
        }}>
          {([
            { id: 'tutte' as StatusFilter, label: 'Tutte', icon: '📋', color: theme.purple },
            { id: 'live' as StatusFilter, label: 'LIVE', icon: '🔴', color: theme.danger },
            { id: 'da_giocare' as StatusFilter, label: 'Da giocare', icon: '⏳', color: theme.textDim },
            { id: 'finite' as StatusFilter, label: 'Finite', icon: '✅', color: theme.success },
            { id: 'centrate' as StatusFilter, label: 'Centrate', icon: '✓', color: '#00ff88' },
            { id: 'mancate' as StatusFilter, label: 'Mancate', icon: '✗', color: '#ff4466' },
          ]).map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                background: statusFilter === f.id ? `${f.color}20` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${statusFilter === f.id ? f.color : 'rgba(255,255,255,0.06)'}`,
                color: statusFilter === f.id ? f.color : theme.textDim,
                padding: '5px 12px', borderRadius: '16px', cursor: 'pointer',
                fontSize: '11px', fontWeight: statusFilter === f.id ? '700' : '500',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {f.icon} {f.label}
              {filterCounts[f.id] > 0 && (
                <span style={{
                  fontSize: '9px', fontWeight: '800',
                  background: statusFilter === f.id ? `${f.color}30` : 'rgba(255,255,255,0.06)',
                  padding: '1px 6px', borderRadius: '10px', marginLeft: '2px'
                }}>
                  {filterCounts[f.id]}
                </span>
              )}
            </button>
          ))}
          {/* Badge HR% — non cliccabile */}
          {(() => {
            const verified = filterCounts.centrate + filterCounts.mancate;
            const hr = verified > 0 ? Math.round((filterCounts.centrate / verified) * 1000) / 10 : null;
            if (hr === null) return null;
            const hrThreshold = activeTab === 'alto_rendimento' ? 25 : 50;
            const hrColor = getHRColor(hr, hrThreshold);
            // HR Partite (almeno 1 pronostico corretto)
            const matchesFinished = (activeTab === 'pronostici' ? normalPredictions : [...xFactorPredictions, ...exactScorePredictions, ...bombs]).filter(p => !!p.real_score);
            const matchHits = matchesFinished.filter(p => p.hit === true).length;
            const matchHR = matchesFinished.length > 0 ? Math.round((matchHits / matchesFinished.length) * 1000) / 10 : null;
            const matchHRColor = matchHR !== null ? getHRColor(matchHR, hrThreshold) : hrColor;

            return (
              <>
                <div style={{
                  background: `${hrColor}15`,
                  border: `1px solid ${hrColor}40`,
                  padding: '5px 14px', borderRadius: '16px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: '900', color: hrColor,
                  marginLeft: '4px'
                }}>
                  HR% <span style={{ fontSize: '13px' }}>{hr}%</span>
                </div>
                {matchHR !== null && (
                  <div style={{
                    background: `${matchHRColor}15`,
                    border: `1px solid ${matchHRColor}40`,
                    padding: '5px 10px', borderRadius: '16px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: '800', color: matchHRColor,
                  }} title="HR Partite: almeno 1 pronostico corretto per partita">
                    Partite <span style={{ fontSize: '12px' }}>{matchHR}%</span>
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>({matchHits}/{matchesFinished.length})</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        {/* 3 capsule HR% per sezione — NASCOSTO (vecchio XF/RE/Bombe) */}
        {false && activeTab === 'alto_rendimento' && (() => {
          const esAll = exactScorePredictions.filter(p => !!p.real_score);
          const esHits = esAll.filter(p => (p.exact_score_top3 || []).some(t => t.score === p.real_score)).length;
          const esHR = esAll.length > 0 ? Math.round((esHits / esAll.length) * 1000) / 10 : null;
          const xfAll = xFactorPredictions.filter(p => !!p.real_score);
          const xfHits = xfAll.filter(p => p.real_sign === 'X').length;
          const xfHR = xfAll.length > 0 ? Math.round((xfHits / xfAll.length) * 1000) / 10 : null;
          const bHR = bombStats.hit_rate;
          if (esAll.length === 0 && xfAll.length === 0 && bombStats.finished === 0) return null;
          const pill = (label: string, hr: number | null, color: string, finished: number, threshold: number) => {
            if (finished === 0) return null;
            const c = hr !== null ? getHRColor(hr, threshold) : '#ff4466';
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: `${color}10`, border: `1px solid ${color}30`,
                borderRadius: '12px', padding: '4px 12px'
              }}>
                <span style={{ fontSize: '10px', color, fontWeight: '700' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: '900', color: c }}>{hr ?? '—'}%</span>
              </div>
            );
          };
          return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
              {pill('RE', esHR, '#ff9800', esAll.length, 18)}
              {pill('XF', xfHR, '#bc13fe', xfAll.length, 32)}
              {pill('Bombe', bHR, '#ffd700', bombStats.finished, 30)}
            </div>
          );
        })()}
        {/* Capsule HR% per tipo — solo Pronostici (soglie dinamiche da quote + mercato) */}
        {activeTab === 'pronostici' && (() => {
          // Margini per sotto-mercato (dal documento soglie_minime_mercati_betting.md)
          const MARGINS: Record<string, number> = {
            '1': 7, 'X': 3, '2': 6,
            'over_1.5': 4, 'under_1.5': 4, 'over_2.5': 3, 'under_2.5': 3,
            'over_3.5': 5, 'under_3.5': 3, 'goal': 5, 'nogoal': 4, 'dc': 4
          };
          // Fallback senza quota (midpoint Hit Rate Minimo dal documento)
          const FALLBACKS: Record<string, number> = {
            '1': 67.5, 'X': 32.5, '2': 40,
            'over_1.5': 77.5, 'under_1.5': 35, 'over_2.5': 55, 'under_2.5': 56,
            'over_3.5': 40, 'under_3.5': 74, 'goal': 58.5, 'nogoal': 54, 'dc': 75
          };
          const getSubMarket = (t: any): string => {
            if (t.tipo === 'SEGNO') return t.pronostico;
            if (t.tipo === 'DOPPIA_CHANCE') return 'dc';
            const p = (t.pronostico || '').toLowerCase();
            const m = p.match(/^(over|under)\s+(\d+\.5)$/);
            if (m) return `${m[1]}_${m[2]}`;
            if (p === 'goal') return 'goal';
            if (p === 'nogoal') return 'nogoal';
            return '';
          };
          const getTipThreshold = (t: any): number => {
            const sm = getSubMarket(t);
            const q = t._quota;
            if (q && q > 1) return (100 / q) + (MARGINS[sm] || 4);
            return FALLBACKS[sm] || 55;
          };
          // FlatMap con quota inclusa
          const allTips = normalPredictions.flatMap(p =>
            (p.pronostici || []).map(t => ({
              ...t,
              _quota: t.quota
                || (t.tipo === 'SEGNO' && p.odds ? (p.odds as any)[t.pronostico] : null)
                || (t.tipo === 'GOL' && p.odds ? getGolQuota(t.pronostico, p.odds) : null)
                || null
            }))
          );
          // Calcolo per gruppo capsula
          const capsuleData = (label: string, filter: (t: any) => boolean, color: string) => {
            const tips = allTips.filter(filter);
            const verified = tips.filter(t => t.hit === true || t.hit === false);
            const hits = tips.filter(t => t.hit === true).length;
            const hr = verified.length > 0 ? Math.round((hits / verified.length) * 1000) / 10 : null;
            const thresholds = verified.map(t => getTipThreshold(t));
            const avgTh = thresholds.length > 0 ? Math.round(thresholds.reduce((a, b) => a + b, 0) / thresholds.length * 10) / 10 : 55;
            return { label, color, finished: verified.length, hr, threshold: avgTh };
          };
          const capsules = [
            capsuleData('Segno', t => t.tipo === 'SEGNO', theme.cyan),
            capsuleData('O/U 1.5', t => t.tipo === 'GOL' && /^(over|under)\s+1\.5$/i.test(t.pronostico), '#4fc3f7'),
            capsuleData('O/U 2.5', t => t.tipo === 'GOL' && /^(over|under)\s+2\.5$/i.test(t.pronostico), '#29b6f6'),
            capsuleData('O/U 3.5', t => t.tipo === 'GOL' && /^(over|under)\s+3\.5$/i.test(t.pronostico), '#0288d1'),
            capsuleData('GG/NG', t => t.tipo === 'GOL' && /^(goal|nogoal)$/i.test(t.pronostico), theme.success),
            capsuleData('DC', t => t.tipo === 'DOPPIA_CHANCE', '#ab47bc'),
          ];
          if (!capsules.some(c => c.finished > 0)) return null;
          return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
              {capsules.map(c => {
                if (c.finished === 0) return null;
                const clr = c.hr !== null ? getHRColor(c.hr, c.threshold) : '#ff4466';
                return (
                  <div key={c.label} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: `${c.color}10`, border: `1px solid ${c.color}30`,
                    borderRadius: '12px', padding: '4px 12px'
                  }}>
                    <span style={{ fontSize: '10px', color: c.color, fontWeight: '700' }}>{c.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: clr }}>{c.hr ?? '—'}%</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        </>)}

        {/* LOADING */}
        {loading && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: theme.cyan, fontSize: '14px',
            animation: 'pulse 1.5s infinite'
          }}>
            ⏳ Caricamento pronostici...
          </div>
        )}

        {/* ERRORE */}
        {error && (
          <div style={{
            background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`,
            borderRadius: '10px', padding: '15px', textAlign: 'center',
            color: theme.danger, fontSize: '13px', marginBottom: '20px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* NESSUN DATO */}
        {!loading && !error && predictions.length === 0 && bombs.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: theme.textDim, fontSize: '14px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
            Nessun pronostico disponibile per questa data.
            <br />
            <span style={{ fontSize: '12px' }}>Prova a selezionare un altro giorno.</span>
          </div>
        )}

        {/* NESSUN RISULTATO PER FILTRO */}
        {!loading && !error && statusFilter !== 'tutte' && (
          activeTab === 'pronostici'
            ? filteredPredictions.length === 0 && normalPredictions.length > 0
            : filteredExactScore.length === 0 && filteredXFactor.length === 0 && filteredBombs.length === 0 && (exactScorePredictions.length > 0 || xFactorPredictions.length > 0 || bombs.length > 0)
        ) && (
          <div style={{
            textAlign: 'center', padding: '40px 0', color: theme.textDim, fontSize: '13px'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
            Nessun pronostico corrisponde al filtro selezionato.
            <br />
            <button
              onClick={() => setStatusFilter('tutte')}
              style={{
                marginTop: '10px', background: `${theme.purple}20`, border: `1px solid ${theme.purple}`,
                color: theme.purple, padding: '6px 16px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600'
              }}
            >
              Mostra tutte
            </button>
          </div>
        )}

        {/* CONTENUTO PRINCIPALE */}
        {!loading && !error && (
          <>
            {/* ==================== HIGH RISK: RE + XF + Bombe ==================== */}

            {/* SEZIONE RISULTATO ESATTO */}
            {false && activeTab === 'alto_rendimento' && filteredExactScore.length > 0 && (() => {
              const esFinished = filteredExactScore.filter(p => getMatchStatus(p) === 'finished').length;
              const esLive = filteredExactScore.filter(p => getMatchStatus(p) === 'live').length;
              const esToPlay = filteredExactScore.length - esFinished - esLive;
              const esWithScore = filteredExactScore.filter(p => !!p.real_score);
              const esHits = esWithScore.filter(p => (p.exact_score_top3 || []).some(t => t.score === p.real_score)).length;
              const esMisses = esWithScore.length - esHits;
              const esHR = esWithScore.length > 0 ? Math.round((esHits / esWithScore.length) * 1000) / 10 : null;
              const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
              return (
              <div style={{ marginBottom: '30px', animation: 'fadeIn 0.4s ease' }}>
                <h2
                  onClick={() => toggleSection2('sec_exact_score')}
                  style={{
                    fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#ff9800',
                    margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', userSelect: 'none' as const,
                    background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.18)',
                    borderRadius: '10px', padding: '10px 14px', flexWrap: 'wrap' as const
                  }}
                >
                  <span style={{ fontSize: '12px', color: theme.textDim, transition: 'transform 0.2s', transform: collapsedSections.has('sec_exact_score') ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                  🎯 Risultato Esatto
                  <span style={{
                    fontSize: '11px', background: 'rgba(255,152,0,0.15)', color: '#ff9800',
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    {filteredExactScore.length}
                  </span>
                  {esLive > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {esLive} LIVE</span>}
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px' }}>
                    {esFinished > 0 && <><span style={{ color: theme.success, fontWeight: '600' }}>✅ {esFinished} {esFinished === 1 ? 'finita' : 'finite'}</span>{sep}</>}
                    {esToPlay > 0 && <><span style={{ color: theme.textDim, fontWeight: '600' }}>⏳ {esToPlay} da giocare</span>{sep}</>}
                    {esWithScore.length > 0 && <>
                      <span style={{ color: '#00ff88', fontWeight: '700' }}>✓ {esHits}</span>{sep}
                      <span style={{ color: '#ff4466', fontWeight: '700' }}>✗ {esMisses}</span>{sep}
                      <span style={{
                        fontWeight: '800',
                        color: esHR !== null && esHR >= 20 ? '#00ff88' : '#ff4466',
                        background: esHR !== null && esHR >= 20 ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)',
                        padding: '1px 8px', borderRadius: '10px'
                      }}>{esHR}%</span>
                    </>}
                  </span>
                </h2>
                {!collapsedSections.has('sec_exact_score') && (() => {
                  const grouped: Record<string, Prediction[]> = {};
                  filteredExactScore.forEach(p => { (grouped[p.league] = grouped[p.league] || []).push(p); });
                  return Object.entries(grouped).map(([leagueName, preds]) => {
                    const key = `es-${leagueName}`;
                    const isCollapsed = !collapsedLeagues.has(key);
                    const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                    const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                    const toPlay = preds.length - finished - live;
                    const withScore = preds.filter(p => !!p.real_score);
                    const hits = withScore.filter(p => (p.exact_score_top3 || []).some(t => t.score === p.real_score)).length;
                    const misses = withScore.length - hits;
                    const verified = hits + misses;
                    const hitRate = verified > 0 ? Math.round((hits / verified) * 1000) / 10 : null;
                    const hrHue = hitRate !== null ? Math.min(130, hitRate * 6.5) : 0;
                    const hrColor = hitRate !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                    const hrBg = hitRate !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : 'rgba(255,255,255,0.05)';
                    const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
                    const statsEls = (
                      <>
                        <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>Partite:</span>
                        <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '700', background: 'rgba(255,152,0,0.1)', padding: '1px 6px', borderRadius: '4px' }}>⚽ {preds.length}</span>
                        {finished > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.success, fontWeight: '600' }}>✅ {finished} {finished === 1 ? 'finita' : 'finite'}</span></>}
                                                {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                        {sep}
                        <span style={{ fontSize: '9px', color: hits > 0 ? theme.success : theme.textDim, fontWeight: '700' }}>✓ {hits}</span>
                        {sep}
                        <span style={{ fontSize: '9px', color: misses > 0 ? '#ff4466' : theme.textDim, fontWeight: '700' }}>✗ {misses}</span>
                        {verified > 0 && <>{sep}<span style={{ fontSize: '9px', color: hrColor, fontWeight: '800', background: hrBg, padding: '1px 8px', borderRadius: '10px' }}>{hitRate}%</span></>}
                      </>
                    );
                    return (
                      <div key={key} style={{ marginBottom: '16px' }}>
                        <div
                          style={{
                            padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                            background: 'rgba(255,152,0,0.04)', borderRadius: '8px',
                            cursor: 'pointer', userSelect: 'none' as const,
                            border: '1px solid rgba(255,152,0,0.12)'
                          }}
                          onClick={() => toggleLeague(key)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                                <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span
                                  onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                                  style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? '#ff9800' : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                                >{leagueName}</span>
                                {isMobile && live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                              </div>
                              {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                                                            {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '8px' }}>{sep}{statsEls}</div>}
                            </div>
                            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                          </div>
                          {isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' as const }}>
                              {statsEls}
                            </div>
                          )}
                        </div>
                        {!isCollapsed && preds.map(p => renderExactScoreCard(p))}
                      </div>
                    );
                  });
                })()}
              </div>
              );
            })()}

            {/* SEZIONE X FACTOR */}
            {false && activeTab === 'alto_rendimento' && filteredXFactor.length > 0 && (() => {
              const xfFinishedN = filteredXFactor.filter(p => getMatchStatus(p) === 'finished').length;
              const xfLive = filteredXFactor.filter(p => getMatchStatus(p) === 'live').length;
              const xfToPlay = filteredXFactor.length - xfFinishedN - xfLive;
              const xfWithScore = filteredXFactor.filter(p => !!p.real_score);
              const xfHits = xfWithScore.filter(p => p.real_sign === 'X').length;
              const xfMisses = xfWithScore.length - xfHits;
              const xfHR = xfWithScore.length > 0 ? Math.round((xfHits / xfWithScore.length) * 1000) / 10 : null;
              const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
              return (
              <div style={{ marginBottom: '30px', animation: 'fadeIn 0.4s ease' }}>
                <h2
                  onClick={() => toggleSection2('sec_x_factor')}
                  style={{
                    fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: theme.purple,
                    margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', userSelect: 'none' as const,
                    background: `${theme.purple}08`, border: `1px solid ${theme.purple}25`,
                    borderRadius: '10px', padding: '10px 14px', flexWrap: 'wrap' as const
                  }}
                >
                  <span style={{ fontSize: '12px', color: theme.textDim, transition: 'transform 0.2s', transform: collapsedSections.has('sec_x_factor') ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                  🔮 X Factor
                  <span style={{
                    fontSize: '11px', background: `${theme.purple}20`, color: theme.purple,
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    {filteredXFactor.length}
                  </span>
                  {xfLive > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {xfLive} LIVE</span>}
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px' }}>
                    {xfFinishedN > 0 && <><span style={{ color: theme.success, fontWeight: '600' }}>✅ {xfFinishedN} {xfFinishedN === 1 ? 'finita' : 'finite'}</span>{sep}</>}
                    {xfToPlay > 0 && <><span style={{ color: theme.textDim, fontWeight: '600' }}>⏳ {xfToPlay} da giocare</span>{sep}</>}
                    {xfWithScore.length > 0 && <>
                      <span style={{ color: '#00ff88', fontWeight: '700' }}>✓ {xfHits}</span>{sep}
                      <span style={{ color: '#ff4466', fontWeight: '700' }}>✗ {xfMisses}</span>{sep}
                      <span style={{
                        fontWeight: '800',
                        color: xfHR !== null && xfHR >= 25 ? '#00ff88' : '#ff4466',
                        background: xfHR !== null && xfHR >= 25 ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)',
                        padding: '1px 8px', borderRadius: '10px'
                      }}>{xfHR}%</span>
                    </>}
                  </span>
                </h2>
                {!collapsedSections.has('sec_x_factor') && (() => {
                  const grouped: Record<string, Prediction[]> = {};
                  filteredXFactor.forEach(p => { (grouped[p.league] = grouped[p.league] || []).push(p); });
                  return Object.entries(grouped).map(([leagueName, preds]) => {
                    const key = `xf-${leagueName}`;
                    const isCollapsed = !collapsedLeagues.has(key);
                    const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                    const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                    const toPlay = preds.length - finished - live;
                    const withScore = preds.filter(p => !!p.real_score);
                    const hits = withScore.filter(p => p.real_sign === 'X').length;
                    const misses = withScore.length - hits;
                    const verified = hits + misses;
                    const hitRate = verified > 0 ? Math.round((hits / verified) * 1000) / 10 : null;
                    const hrHue = hitRate !== null ? Math.min(130, hitRate * 4) : 0;
                    const hrColor = hitRate !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                    const hrBg = hitRate !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : 'rgba(255,255,255,0.05)';
                    const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
                    const statsEls = (
                      <>
                        <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>Partite:</span>
                        <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '700', background: `${theme.purple}15`, padding: '1px 6px', borderRadius: '4px' }}>⚽ {preds.length}</span>
                        {finished > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.success, fontWeight: '600' }}>✅ {finished} {finished === 1 ? 'finita' : 'finite'}</span></>}
                                                {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                        {sep}
                        <span style={{ fontSize: '9px', color: hits > 0 ? theme.success : theme.textDim, fontWeight: '700' }}>✓ {hits}</span>
                        {sep}
                        <span style={{ fontSize: '9px', color: misses > 0 ? '#ff4466' : theme.textDim, fontWeight: '700' }}>✗ {misses}</span>
                        {verified > 0 && <>{sep}<span style={{ fontSize: '9px', color: hrColor, fontWeight: '800', background: hrBg, padding: '1px 8px', borderRadius: '10px' }}>{hitRate}%</span></>}
                      </>
                    );
                    return (
                      <div key={key} style={{ marginBottom: '16px' }}>
                        <div
                          style={{
                            padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                            background: 'rgba(188,19,254,0.04)', borderRadius: '8px',
                            cursor: 'pointer', userSelect: 'none' as const,
                            border: '1px solid rgba(188,19,254,0.12)'
                          }}
                          onClick={() => toggleLeague(key)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                                <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span
                                  onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                                  style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? theme.purple : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                                >{leagueName}</span>
                                {isMobile && live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                              </div>
                              {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                                                            {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '8px' }}>{sep}{statsEls}</div>}
                            </div>
                            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                          </div>
                          {isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' as const }}>
                              {statsEls}
                            </div>
                          )}
                        </div>
                        {!isCollapsed && preds.map(p => renderXFactorCard(p))}
                      </div>
                    );
                  });
                })()}
              </div>
              );
            })()}

            {/* SEZIONE BOMBE */}
            {false && activeTab === 'alto_rendimento' && filteredBombs.length > 0 && (() => {
              const bmFinishedN = filteredBombs.filter(b => getMatchStatus(b) === 'finished').length;
              const bmLive = filteredBombs.filter(b => getMatchStatus(b) === 'live').length;
              const bmToPlay = filteredBombs.length - bmFinishedN - bmLive;
              const bmWithScore = filteredBombs.filter(b => !!b.real_score);
              const bmHits = bmWithScore.filter(b => b.hit === true).length;
              const bmMisses = bmWithScore.length - bmHits;
              const bmHR = bmWithScore.length > 0 ? Math.round((bmHits / bmWithScore.length) * 1000) / 10 : null;
              const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
              return (
              <div style={{ marginBottom: '30px', animation: 'fadeIn 0.4s ease' }}>
                <h2
                  onClick={() => toggleSection2('sec_bombs')}
                  style={{
                    fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: theme.gold,
                    margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', userSelect: 'none' as const,
                    background: 'rgba(255,215,0,0.04)', border: `1px solid ${theme.gold}25`,
                    borderRadius: '10px', padding: '10px 14px', flexWrap: 'wrap' as const
                  }}
                >
                  <span style={{ fontSize: '12px', color: theme.textDim, transition: 'transform 0.2s', transform: collapsedSections.has('sec_bombs') ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                  💣 Bombe del Giorno
                  <span style={{
                    fontSize: '11px', background: `${theme.gold}20`, color: theme.gold,
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    {filteredBombs.length}
                  </span>
                  {bmLive > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {bmLive} LIVE</span>}
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px' }}>
                    {bmFinishedN > 0 && <><span style={{ color: theme.success, fontWeight: '600' }}>✅ {bmFinishedN} {bmFinishedN === 1 ? 'finita' : 'finite'}</span>{sep}</>}
                    {bmToPlay > 0 && <><span style={{ color: theme.textDim, fontWeight: '600' }}>⏳ {bmToPlay} da giocare</span>{sep}</>}
                    {bmWithScore.length > 0 && <>
                      <span style={{ color: '#00ff88', fontWeight: '700' }}>✓ {bmHits}</span>{sep}
                      <span style={{ color: '#ff4466', fontWeight: '700' }}>✗ {bmMisses}</span>{sep}
                      <span style={{
                        fontWeight: '800',
                        color: bmHR !== null && bmHR >= 30 ? '#00ff88' : '#ff4466',
                        background: bmHR !== null && bmHR >= 30 ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)',
                        padding: '1px 8px', borderRadius: '10px'
                      }}>{bmHR}%</span>
                    </>}
                  </span>
                </h2>
                {!collapsedSections.has('sec_bombs') && (() => {
                  const groupedBombs: Record<string, Bomb[]> = {};
                  filteredBombs.forEach(b => { (groupedBombs[b.league] = groupedBombs[b.league] || []).push(b); });
                  return Object.entries(groupedBombs).map(([leagueName, lBombs]) => {
                    const key = `bomb-${leagueName}`;
                    const isCollapsed = !collapsedLeagues.has(key);
                    const finished = lBombs.filter(b => getMatchStatus(b) === 'finished').length;
                    const live = lBombs.filter(b => getMatchStatus(b) === 'live').length;
                    const toPlay = lBombs.length - finished - live;
                    const hits = lBombs.filter(b => b.hit === true).length;
                    const misses = lBombs.filter(b => b.hit === false).length;
                    const verifiedB = hits + misses;
                    const hitRateB = verifiedB > 0 ? Math.round((hits / verifiedB) * 1000) / 10 : null;
                    const statusBg = finished === 0 ? 'rgba(255,255,255,0.05)' : finished === lBombs.length ? `${theme.success}30` : `${theme.warning}30`;
                    const statusColor = finished === 0 ? theme.textDim : finished === lBombs.length ? theme.success : theme.warning;
                    const missRate = verifiedB > 0 ? misses / verifiedB : 0;
                    const hitColor = hits === 0 ? theme.textDim : theme.success;
                    const missColor = misses === 0 ? theme.textDim : missRate <= 0.25 ? '#FFA726' : missRate <= 0.5 ? '#F4511E' : theme.danger;
                    // Colore progressivo hit rate: 0%=rosso, 50%=giallo-verde, 100%=verde
                    const hrHueB = hitRateB !== null ? Math.min(130, hitRateB * 1.3) : 0;
                    const hrColorB = hitRateB !== null ? `hsl(${Math.round(hrHueB)}, 85%, 48%)` : theme.textDim;
                    const hrBgB = hitRateB !== null ? `hsla(${Math.round(hrHueB)}, 85%, 48%, 0.15)` : 'rgba(255,255,255,0.05)';
                    const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
                    const statsEls = (
                      <>
                        <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>Partite:</span>
                        <span style={{ fontSize: '9px', color: statusColor, fontWeight: '700', background: statusBg, padding: '1px 6px', borderRadius: '4px' }}>⚽ {lBombs.length}</span>
                        {finished > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.success, fontWeight: '600' }}>✅ {finished} {finished === 1 ? 'finita' : 'finite'}</span></>}
                                                {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                        {sep}
                        <span style={{ fontSize: '9px', color: hitColor, fontWeight: '700' }}>✓ {hits}{!isMobile && ` ${hits === 1 ? 'centrato' : 'centrati'}`}</span>
                        {sep}
                        <span style={{ fontSize: '9px', color: missColor, fontWeight: '700' }}>✗ {misses}{!isMobile && ` ${misses === 1 ? 'mancato' : 'mancati'}`}</span>
                        {verifiedB > 0 && <>{sep}<span style={{ fontSize: '9px', color: hrColorB, fontWeight: '800', background: hrBgB, padding: '1px 8px', borderRadius: '10px' }}>{hitRateB}%</span></>}
                      </>
                    );
                    return (
                      <div key={key} style={{ marginBottom: '16px' }}>
                        <div
                          style={{
                            padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                            background: 'rgba(255,215,0,0.03)', borderRadius: '8px',
                            cursor: 'pointer', userSelect: 'none' as const,
                            border: `1px solid ${theme.gold}15`
                          }}
                          onClick={() => toggleLeague(key)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                                <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span
                                  onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                                  style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? theme.cyan : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                                >{leagueName}</span>
                                {isMobile && live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                              </div>
                              {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                                                            {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '8px' }}><span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>{statsEls}</div>}
                            </div>
                            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                          </div>
                          {isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' as const }}>
                              {statsEls}
                            </div>
                          )}
                        </div>
                        {!isCollapsed && lBombs.map((bomb) => renderBombCard(bomb))}
                      </div>
                    );
                  });
                })()}
              </div>
              );
            })()}

            {/* SEZIONE PRONOSTICI (raggruppati per lega) */}
            {/* ==================== ALTO RENDIMENTO: Pronostici quota > 2.50 ==================== */}
            {activeTab === 'alto_rendimento' && filteredAltoRendimento.length > 0 && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <h2 style={{
                  fontSize: isMobile ? '18px' : '22px', fontWeight: '800', color: '#ffd700',
                  margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  💎 Alto Rendimento
                  <span style={{
                    fontSize: '11px', background: 'rgba(255, 215, 0, 0.15)', color: '#ffd700',
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    {filteredAltoRendimento.reduce((s, p) => s + (p.pronostici?.length || 0), 0)}
                  </span>
                </h2>

                {Object.entries(filteredAltoRendimentoByLeague).map(([leagueName, preds]) => {
                  const isCollapsed = !collapsedLeagues.has(leagueName);
                  const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                  const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                  const toPlay = preds.length - finished - live;
                  const allP = preds.flatMap(p => p.pronostici || []);
                  const hits = allP.filter(x => x.hit === true).length;
                  const misses = allP.filter(x => x.hit === false).length;
                  const verifiedP = hits + misses;
                  const hitRateVal = verifiedP > 0 ? Math.round((hits / verifiedP) * 1000) / 10 : null;
                  const statusBg = finished === 0 ? 'rgba(255,255,255,0.05)' : finished === preds.length ? `${theme.success}30` : `${theme.warning}30`;
                  const statusColor = finished === 0 ? theme.textDim : finished === preds.length ? theme.success : theme.warning;
                  const missRate = verifiedP > 0 ? misses / verifiedP : 0;
                  const hitColor = hits === 0 ? theme.textDim : theme.success;
                  const missColor = misses === 0 ? theme.textDim : missRate <= 0.25 ? '#FFA726' : missRate <= 0.5 ? '#F4511E' : theme.danger;
                  const hrHue = hitRateVal !== null ? Math.min(130, hitRateVal * 1.3) : 0;
                  const hrColor = hitRateVal !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                  const hrBg = hitRateVal !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : 'rgba(255,255,255,0.05)';
                  const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
                  const statsEls = (
                    <>
                      <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>Partite:</span>
                      <span style={{ fontSize: '9px', color: statusColor, fontWeight: '700', background: statusBg, padding: '1px 6px', borderRadius: '4px' }}>⚽ {preds.length}</span>
                      {finished > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.success, fontWeight: '600' }}>✅ {finished} {finished === 1 ? 'finita' : 'finite'}</span></>}
                      {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                      {sep}
                      <span style={{ fontSize: '9px', color: hitColor, fontWeight: '700' }}>✓ {hits}{!isMobile && ` ${hits === 1 ? 'centrato' : 'centrati'}`}</span>
                      {sep}
                      <span style={{ fontSize: '9px', color: missColor, fontWeight: '700' }}>✗ {misses}{!isMobile && ` ${misses === 1 ? 'mancato' : 'mancati'}`}</span>
                      {verifiedP > 0 && <>{sep}<span style={{ fontSize: '9px', color: hrColor, fontWeight: '800', background: hrBg, padding: '1px 8px', borderRadius: '10px' }}>{hitRateVal}%</span></>}
                    </>
                  );
                  return (
                  <div key={leagueName} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                        background: 'rgba(255, 215, 0, 0.04)', borderRadius: '8px',
                        cursor: 'pointer', userSelect: 'none' as const,
                        border: '1px solid rgba(255, 215, 0, 0.12)'
                      }}
                      onClick={() => toggleLeague(leagueName)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                            <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <span
                              onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                              style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? '#ffd700' : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                            >{leagueName}</span>
                            {isMobile && live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                          </div>
                          {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                          {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '8px' }}><span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>{statsEls}</div>}
                        </div>
                        <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                      </div>
                      {isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' as const }}>
                          {statsEls}
                        </div>
                      )}
                    </div>
                    {!isCollapsed && preds.map((pred) => renderPredictionCard(pred))}
                  </div>
                  );
                })}
              </div>
            )}

            {/* ==================== PRONOSTICI: quota <= 2.50 ==================== */}
            {activeTab === 'pronostici' && filteredPredictions.length > 0 && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <h2 style={{
                  fontSize: isMobile ? '18px' : '22px', fontWeight: '800', color: theme.cyan,
                  margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  🔮 Pronostici
                  <span style={{
                    fontSize: '11px', background: `${theme.cyan}20`, color: theme.cyan,
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    {filteredPredictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)}
                  </span>
                </h2>

                {Object.entries(filteredGroupedByLeague).map(([leagueName, preds]) => {
                  const isCollapsed = !collapsedLeagues.has(leagueName);
                  const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                  const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                  const toPlay = preds.length - finished - live;
                  // Conteggio per singolo pronostico
                  const allP = preds.flatMap(p => p.pronostici || []);
                  const hits = allP.filter(x => x.hit === true).length;
                  const misses = allP.filter(x => x.hit === false).length;
                  const verifiedP = hits + misses;
                  const hitRateVal = verifiedP > 0 ? Math.round((hits / verifiedP) * 1000) / 10 : null;
                  const statusBg = finished === 0 ? 'rgba(255,255,255,0.05)' : finished === preds.length ? `${theme.success}30` : `${theme.warning}30`;
                  const statusColor = finished === 0 ? theme.textDim : finished === preds.length ? theme.success : theme.warning;
                  const missRate = verifiedP > 0 ? misses / verifiedP : 0;
                  const hitColor = hits === 0 ? theme.textDim : theme.success;
                  const missColor = misses === 0 ? theme.textDim : missRate <= 0.25 ? '#FFA726' : missRate <= 0.5 ? '#F4511E' : theme.danger;
                  // Colore progressivo hit rate: 0%=rosso, 50%=giallo-verde, 100%=verde
                  const hrHue = hitRateVal !== null ? Math.min(130, hitRateVal * 1.3) : 0;
                  const hrColor = hitRateVal !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                  const hrBg = hitRateVal !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : 'rgba(255,255,255,0.05)';
                  const sep = <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>;
                  const statsEls = (
                    <>
                      <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>Partite:</span>
                      <span style={{ fontSize: '9px', color: statusColor, fontWeight: '700', background: statusBg, padding: '1px 6px', borderRadius: '4px' }}>⚽ {preds.length}</span>
                      {finished > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.success, fontWeight: '600' }}>✅ {finished} {finished === 1 ? 'finita' : 'finite'}</span></>}
                                            {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                      {sep}
                      <span style={{ fontSize: '9px', color: hitColor, fontWeight: '700' }}>✓ {hits}{!isMobile && ` ${hits === 1 ? 'centrato' : 'centrati'}`}</span>
                      {sep}
                      <span style={{ fontSize: '9px', color: missColor, fontWeight: '700' }}>✗ {misses}{!isMobile && ` ${misses === 1 ? 'mancato' : 'mancati'}`}</span>
                      {verifiedP > 0 && <>{sep}<span style={{ fontSize: '9px', color: hrColor, fontWeight: '800', background: hrBg, padding: '1px 8px', borderRadius: '10px' }}>{hitRateVal}%</span></>}
                    </>
                  );
                  return (
                  <div key={leagueName} style={{ marginBottom: '16px' }}>
                    {/* HEADER LEGA - CLICCABILE */}
                    <div
                      style={{
                        padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                        background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                        cursor: 'pointer', userSelect: 'none' as const,
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}
                      onClick={() => toggleLeague(leagueName)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                            <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <span
                              onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                              style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? theme.cyan : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                            >{leagueName}</span>
                            {isMobile && live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                          </div>
                          {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: '#ff1744', fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                          {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '8px' }}><span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>{statsEls}</div>}
                        </div>
                        <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                      </div>
                      {isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' as const }}>
                          {statsEls}
                        </div>
                      )}
                    </div>

                    {/* CARDS */}
                    {!isCollapsed && preds.map((pred) => renderPredictionCard(pred))}
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Password Premium Unlock */}
      {showPwPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPwPrompt(false)}>
          <div style={{
            background: '#1e2235', borderRadius: '16px', padding: '28px',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 30px rgba(168,85,247,0.2)',
            minWidth: '280px', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔐</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
              Inserisci codice di accesso
            </div>
            <input
              type="password"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') verifyPw(pwInput); }}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: pwError ? '1px solid #ef4444' : '1px solid rgba(168,85,247,0.4)',
                background: 'rgba(255,255,255,0.05)', color: 'white',
                fontSize: '16px', textAlign: 'center', outline: 'none',
                boxSizing: 'border-box' as const,
              }}
              placeholder="••••••"
            />
            {pwError && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '8px' }}>
                Codice non valido
              </div>
            )}
            <button
              onClick={() => verifyPw(pwInput)}
              style={{
                marginTop: '16px', padding: '8px 28px', borderRadius: '12px',
                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                background: 'rgba(168,85,247,0.3)', color: '#a855f7',
              }}
            >
              Conferma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}