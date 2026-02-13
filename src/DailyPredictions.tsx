import { useState, useEffect, useMemo, useRef } from 'react';
import { checkAdmin } from './permissions';

type StatusFilter = 'tutte' | 'live' | 'da_giocare' | 'finite' | 'centrate' | 'mancate';
type ConfrontoFilter = 'tutte' | 'identiche' | 'diverse' | 'parziali' | 'solo_prod' | 'solo_sandbox';

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
  font: '"Inter", "Segoe UI", sans-serif'
};

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
  
  const getLeagueLogoUrl = (league: string): string => {
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
  pronostici: Array<{ tipo: string; pronostico: string; confidence: number; stars: number; quota?: number; hit?: boolean | null }>;
  confidence_segno: number;
  confidence_gol: number;
  stars_segno: number;
  stars_gol: number;
  comment: { segno?: string; gol?: string; doppia_chance?: string; gol_extra?: string };
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
  campo: 'Fattore Campo'
};
const GOL_LABELS: Record<string, string> = {
  media_gol: 'Media Gol', att_vs_def: 'Att vs Def', xg: 'xG',
  h2h_gol: 'H2H Gol', media_lega: 'Media Lega', dna_off_def: 'DNA Off/Def'
};

// --- COMPONENTE PRINCIPALE ---
interface DailyPredictionsProps {
  onBack: () => void;
  onNavigateToLeague?: (leagueName: string) => void;
}

export default function DailyPredictions({ onBack, onNavigateToLeague }: DailyPredictionsProps) {
  const [date, setDate] = useState(getToday());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'predictions' | 'bombs'>('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [predStats, setPredStats] = useState<{total:number,finished:number,pending:number,hits:number,misses:number,hit_rate:number|null}>({total:0,finished:0,pending:0,hits:0,misses:0,hit_rate:null});
  const [bombStats, setBombStats] = useState<{total:number,finished:number,pending:number,hits:number,misses:number,hit_rate:number|null}>({total:0,finished:0,pending:0,hits:0,misses:0,hit_rate:null});
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const isAdmin = checkAdmin();
  const [mode, setMode] = useState<'prod' | 'sandbox' | 'confronto'>('prod');
  const [statusFilters, setStatusFilters] = useState<Record<'prod' | 'sandbox', StatusFilter>>({ prod: 'tutte', sandbox: 'tutte' });
  const statusFilter = mode !== 'confronto' ? statusFilters[mode] : 'tutte';
  const setStatusFilter = (f: StatusFilter) => { if (mode !== 'confronto') setStatusFilters(prev => ({ ...prev, [mode]: f })); };
  const [confrontoData, setConfrontoData] = useState<{
    prodPredictions: Prediction[]; prodBombs: Bomb[];
    sandboxPredictions: Prediction[]; sandboxBombs: Bomb[];
  }>({ prodPredictions: [], prodBombs: [], sandboxPredictions: [], sandboxBombs: [] });
  const [confrontoFilter, setConfrontoFilter] = useState<ConfrontoFilter>('tutte');

  // Reset UI state al cambio modalità PROD/SANDBOX
  useEffect(() => {
    setExpandedSections(new Set());
    setCollapsedLeagues(new Set());
    setActiveTab('all');
    setConfrontoFilter('tutte');
  }, [mode]);

  // Reset filtro al cambio data (solo modalità corrente)
  useEffect(() => {
    setStatusFilter('tutte');
    setConfrontoFilter('tutte');
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

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === 'confronto') {
          // Fetch parallelo di ENTRAMBI i sistemi
          const [ppRes, pbRes, spRes, sbRes] = await Promise.all([
            fetch(`${API_BASE}/simulation/daily-predictions?date=${date}`),
            fetch(`${API_BASE}/simulation/daily-bombs?date=${date}`),
            fetch(`${API_BASE}/simulation/daily-predictions-sandbox?date=${date}`),
            fetch(`${API_BASE}/simulation/daily-bombs-sandbox?date=${date}`)
          ]);
          const [ppData, pbData, spData, sbData] = await Promise.all([
            ppRes.json(), pbRes.json(), spRes.json(), sbRes.json()
          ]);
          setConfrontoData({
            prodPredictions: ppData.success ? (ppData.predictions || []) : [],
            prodBombs: pbData.success ? (pbData.bombs || []) : [],
            sandboxPredictions: spData.success ? (spData.predictions || []) : [],
            sandboxBombs: sbData.success ? (sbData.bombs || []) : []
          });
        } else {
          const predEndpoint = mode === 'sandbox' ? 'daily-predictions-sandbox' : 'daily-predictions';
          const bombEndpoint = mode === 'sandbox' ? 'daily-bombs-sandbox' : 'daily-bombs';
          const [predRes, bombRes] = await Promise.all([
            fetch(`${API_BASE}/simulation/${predEndpoint}?date=${date}`),
            fetch(`${API_BASE}/simulation/${bombEndpoint}?date=${date}`)
          ]);

          const predData = await predRes.json();
          const bombData = await bombRes.json();

          if (predData.success) {
            setPredictions(predData.predictions || []);
            if (predData.stats) setPredStats(predData.stats);
          } else {
            setPredictions([]);
          }

          if (bombData.success) {
            setBombs(bombData.bombs || []);
            if (bombData.stats) setBombStats(bombData.stats);
          } else {
            setBombs([]);
          }
        }
      } catch (err: any) {
        console.error('Errore fetch pronostici:', err);
        setError(err.message || 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date, mode]);

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
  
  // Icona direzione
  let dirIcon = '';
  let dirColor = theme.textDim;
  if (direction === 'over') {
    dirIcon = '▲ Over';
    dirColor = theme.success;
  } else if (direction === 'under') {
    dirIcon = '▼ Under';
    dirColor = theme.purple;
  } else if (direction === 'goal') {
    dirIcon = '⚽ Goal';
    dirColor = theme.success;
  } else if (direction === 'nogoal') {
    dirIcon = '🚫 NoGoal';
    dirColor = theme.warning;
  }
  
  return (
    <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
     
      {/* Linea verticale divisoria - solo desktop */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          right: '105px',
          top: '5px',
          bottom: '12px',
          width: '1px',
          background: 'rgba(255,255,255,0.1)'
        }} />
      )}
      
      {/* Titolo metrica + Direzione su mobile */}
      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '15px', fontWeight: 'bold', color: theme.text }}>
          {label}
        </span>
        {isMobile && (
        <span style={{ 
          fontSize: '11px', 
          fontWeight: '800',
          color: dirColor,
          background: 'rgba(255,255,255,0.05)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {dirIcon || 'Neutro'}
        </span>
      )}
      </div>
      
      {/* Barra valore */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: theme.text, width: '85px', minWidth: '85px', maxWidth: '85px', position: 'relative', top: '-2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Indice:</span>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', maxWidth: '500px', alignSelf: 'center' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
        </div>
        <span style={{ fontSize: '14px', color: color, fontWeight: 'bold', minWidth: '35px' }}>{value.toFixed(1)}</span>
      </div>
      
      {/* Direzione posizionata a destra */}
      {!isMobile && (
      <span style={{ 
        position: 'absolute',
        right: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '13px', 
        fontWeight: '800',
        color: dirColor,
        background: direction ? 'rgba(255,255,255,0.05)' : 'transparent',
        padding: direction ? '20px 0px' : '0',
        borderRadius: '4px',
        width: '100px',
        textAlign: 'center'
      }}>
        {dirIcon || 'Neutro'}
      </span>
      )}
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

  // --- HELPERS STATUS FILTRO ---
  const getMatchStatus = (item: { date: string; match_time: string; real_score?: string | null }): 'finished' | 'live' | 'to_play' => {
    if (item.real_score != null) return 'finished';
    if (item.date && item.match_time) {
      const kickoff = new Date(`${item.date}T${item.match_time}:00`);
      if (kickoff <= new Date()) return 'live';
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

  // --- HELPERS CONFRONTO ---
  type MatchComparison = {
    home: string; away: string; league: string; date: string; match_time: string;
    home_mongo_id?: string; away_mongo_id?: string;
    prodPred?: Prediction; sandboxPred?: Prediction;
    prodBomb?: Bomb; sandboxBomb?: Bomb;
    status: 'both' | 'prod_only' | 'sandbox_only';
    predsDifferent: boolean; bombsDifferent: boolean;
    predsChangedMarkets: { tipo: string; prod: string; sandbox: string }[];
    predsExtraProd: string[];
    predsExtraSandbox: string[];
  };

  const compareMatches = useMemo(() => {
    if (mode !== 'confronto') return [];
    const { prodPredictions: pp, sandboxPredictions: sp, prodBombs: pb, sandboxBombs: sb } = confrontoData;
    const map = new Map<string, MatchComparison>();
    const key = (h: string, a: string, l: string) => `${l}|${h}|${a}`;

    pp.forEach(p => {
      const k = key(p.home, p.away, p.league);
      map.set(k, { home: p.home, away: p.away, league: p.league, date: p.date, match_time: p.match_time,
        home_mongo_id: p.home_mongo_id, away_mongo_id: p.away_mongo_id,
        prodPred: p, status: 'prod_only', predsDifferent: false, bombsDifferent: false,
        predsChangedMarkets: [], predsExtraProd: [], predsExtraSandbox: [] });
    });
    pb.forEach(b => {
      const k = key(b.home, b.away, b.league);
      const e = map.get(k);
      if (e) { e.prodBomb = b; }
      else map.set(k, { home: b.home, away: b.away, league: b.league, date: b.date, match_time: b.match_time,
        prodBomb: b, status: 'prod_only', predsDifferent: false, bombsDifferent: false,
        predsChangedMarkets: [], predsExtraProd: [], predsExtraSandbox: [] });
    });
    sp.forEach(p => {
      const k = key(p.home, p.away, p.league);
      const e = map.get(k);
      if (e) {
        e.sandboxPred = p; e.status = 'both';
        if (!e.home_mongo_id) e.home_mongo_id = p.home_mongo_id;
        if (!e.away_mongo_id) e.away_mongo_id = p.away_mongo_id;
        // Confronto per-mercato: stesso tipo → pronostico diverso?
        const prodTips = e.prodPred?.pronostici || [];
        const sandTips = p.pronostici || [];
        const prodByTipo = new Map(prodTips.map(t => [t.tipo, t.pronostico]));
        const sandByTipo = new Map(sandTips.map(t => [t.tipo, t.pronostico]));
        const allTipi = new Set([...prodByTipo.keys(), ...sandByTipo.keys()]);
        e.predsChangedMarkets = [];
        e.predsExtraProd = [];
        e.predsExtraSandbox = [];
        allTipi.forEach(tipo => {
          const inProd = prodByTipo.has(tipo);
          const inSand = sandByTipo.has(tipo);
          if (inProd && inSand) {
            if (prodByTipo.get(tipo) !== sandByTipo.get(tipo)) {
              e.predsChangedMarkets.push({ tipo, prod: prodByTipo.get(tipo)!, sandbox: sandByTipo.get(tipo)! });
            }
          } else if (inProd) {
            e.predsExtraProd.push(tipo);
          } else {
            e.predsExtraSandbox.push(tipo);
          }
        });
        e.predsDifferent = e.predsChangedMarkets.length > 0 || e.predsExtraProd.length > 0 || e.predsExtraSandbox.length > 0;
      } else {
        map.set(k, { home: p.home, away: p.away, league: p.league, date: p.date, match_time: p.match_time,
          home_mongo_id: p.home_mongo_id, away_mongo_id: p.away_mongo_id,
          sandboxPred: p, status: 'sandbox_only', predsDifferent: false, bombsDifferent: false,
          predsChangedMarkets: [], predsExtraProd: [], predsExtraSandbox: [] });
      }
    });
    sb.forEach(b => {
      const k = key(b.home, b.away, b.league);
      const e = map.get(k);
      if (e) {
        e.sandboxBomb = b;
        if (e.status === 'prod_only') e.status = 'both';
        e.bombsDifferent = !e.prodBomb || e.prodBomb.segno_bomba !== b.segno_bomba;
      } else {
        map.set(k, { home: b.home, away: b.away, league: b.league, date: b.date, match_time: b.match_time,
          sandboxBomb: b, status: 'sandbox_only', predsDifferent: false, bombsDifferent: false,
          predsChangedMarkets: [], predsExtraProd: [], predsExtraSandbox: [] });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.league.localeCompare(b.league) || a.match_time.localeCompare(b.match_time));
  }, [mode, confrontoData]);

  const confrontoStats = useMemo(() => {
    if (mode !== 'confronto') return null;
    const { prodPredictions: pp, prodBombs: pb, sandboxPredictions: sp, sandboxBombs: sb } = confrontoData;
    const prodPredCount = pp.reduce((s, p) => s + (p.pronostici?.length || 0), 0);
    const sandPredCount = sp.reduce((s, p) => s + (p.pronostici?.length || 0), 0);

    const calcHR = (preds: Prediction[]) => {
      const tips = preds.flatMap(p => p.pronostici || []).filter(t => t.hit != null);
      if (tips.length === 0) return null;
      return Math.round((tips.filter(t => t.hit === true).length / tips.length) * 1000) / 10;
    };

    const identiche = compareMatches.filter(c => c.status === 'both' && !c.predsDifferent && !c.bombsDifferent).length;
    const diverse = compareMatches.filter(c => c.status === 'both' && (c.predsChangedMarkets.length > 0 || c.bombsDifferent)).length;
    const parziali = compareMatches.filter(c => c.status === 'both' && c.predsChangedMarkets.length === 0 && !c.bombsDifferent && (c.predsExtraProd.length > 0 || c.predsExtraSandbox.length > 0)).length;
    const soloProd = compareMatches.filter(c => c.status === 'prod_only').length;
    const soloSandbox = compareMatches.filter(c => c.status === 'sandbox_only').length;

    return { prodPredCount, sandPredCount, prodBombs: pb.length, sandBombs: sb.length,
      prodHR: calcHR(pp), sandHR: calcHR(sp), identiche, diverse, parziali, soloProd, soloSandbox };
  }, [mode, confrontoData, compareMatches]);

  // --- FILTRI CONFRONTO ---
  const confrontoFilterCounts = useMemo(() => {
    const counts: Record<ConfrontoFilter, number> = { tutte: 0, identiche: 0, diverse: 0, parziali: 0, solo_prod: 0, solo_sandbox: 0 };
    compareMatches.forEach(c => {
      counts.tutte++;
      if (c.status === 'both' && !c.predsDifferent && !c.bombsDifferent) counts.identiche++;
      else if (c.status === 'both' && (c.predsChangedMarkets.length > 0 || c.bombsDifferent)) counts.diverse++;
      else if (c.status === 'both' && c.predsChangedMarkets.length === 0 && !c.bombsDifferent && (c.predsExtraProd.length > 0 || c.predsExtraSandbox.length > 0)) counts.parziali++;
      else if (c.status === 'prod_only') counts.solo_prod++;
      else if (c.status === 'sandbox_only') counts.solo_sandbox++;
    });
    return counts;
  }, [compareMatches]);

  const filteredCompareMatches = useMemo(() => {
    if (confrontoFilter === 'tutte') return compareMatches;
    return compareMatches.filter(c => {
      if (confrontoFilter === 'identiche') return c.status === 'both' && !c.predsDifferent && !c.bombsDifferent;
      if (confrontoFilter === 'diverse') return c.status === 'both' && (c.predsChangedMarkets.length > 0 || c.bombsDifferent);
      if (confrontoFilter === 'parziali') return c.status === 'both' && c.predsChangedMarkets.length === 0 && !c.bombsDifferent && (c.predsExtraProd.length > 0 || c.predsExtraSandbox.length > 0);
      if (confrontoFilter === 'solo_prod') return c.status === 'prod_only';
      if (confrontoFilter === 'solo_sandbox') return c.status === 'sandbox_only';
      return true;
    });
  }, [compareMatches, confrontoFilter]);

  // --- DATI FILTRATI ---
  const filteredPredictions = statusFilter === 'tutte' ? predictions : predictions.filter(p => predMatchesFilter(p, statusFilter));
  const filteredBombs = statusFilter === 'tutte' ? bombs : bombs.filter(b => bombMatchesFilter(b, statusFilter));
  const filteredGroupedByLeague = filteredPredictions.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});

  // --- CONTEGGI FILTRI ---
  const filterCounts = useMemo(() => {
    const counts = { tutte: 0, live: 0, da_giocare: 0, finite: 0, centrate: 0, mancate: 0 };
    const includePreds = activeTab === 'all' || activeTab === 'predictions';
    const includeBombs = activeTab === 'all' || activeTab === 'bombs';
    if (includePreds) {
      predictions.forEach(pred => {
        counts.tutte++;
        const s = getMatchStatus(pred);
        if (s === 'live') counts.live++;
        else if (s === 'to_play') counts.da_giocare++;
        else counts.finite++;
        pred.pronostici?.forEach(p => {
          if (p.hit === true) counts.centrate++;
          if (p.hit === false) counts.mancate++;
        });
      });
    }
    if (includeBombs) {
      bombs.forEach(bomb => {
        counts.tutte++;
        const s = getMatchStatus(bomb);
        if (s === 'live') counts.live++;
        else if (s === 'to_play') counts.da_giocare++;
        else counts.finite++;
        if (bomb.hit === true) counts.centrate++;
        if (bomb.hit === false) counts.mancate++;
      });
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
    const hasComment = pred.comment?.segno || pred.comment?.gol || pred.comment?.doppia_chance || pred.comment?.gol_extra;
    const bestConf = Math.max(pred.confidence_segno || 0, pred.confidence_gol || 0);
    const barColor = pred.real_score ? (pred.hit ? '#00ff88' : '#ff4466') : getConfidenceColor(bestConf);
    const isCardExpanded = expandedCards.has(cardKey);
    const tipsKey = `${cardKey}-tips`;
    const isTipsOpen = expandedSections.has(tipsKey);

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

            {/* Pronostici completi con stelle + confidence */}
            <div style={{ paddingLeft: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pronostici</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {pred.pronostici?.map((p, i) => {
                  const isHit = pred.real_score ? p.hit : null;
                  const pillBg = isHit === true ? 'rgba(0,255,136,0.1)' : isHit === false ? 'rgba(255,68,102,0.1)' : 'rgba(255,255,255,0.04)';
                  const pillBorder = isHit === true ? 'rgba(0,255,136,0.3)' : isHit === false ? 'rgba(255,68,102,0.3)' : 'rgba(255,255,255,0.1)';
                  const nameColor = isHit === true ? '#00ff88' : isHit === false ? '#ff4466' : theme.cyan;
                  const quota = p.quota || (p.tipo === 'SEGNO' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
                    || (p.tipo === 'GOL' && pred.odds ? getGolQuota(p.pronostico, pred.odds) : null);
                  return (
                    <div key={i} style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: '6px', padding: '4px 10px',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: nameColor }}>{p.pronostico}</span>
                      <span style={{ position: 'relative', display: 'inline-block', fontSize: '14px', lineHeight: 1 }}>
                        <span style={{ color: 'rgba(255,255,255,0.12)' }}>★</span>
                        <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${p.confidence || 0}%`, color: theme.gold }}>★</span>
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: getConfidenceColor(p.confidence) }}>{p.confidence?.toFixed(0)}%</span>
                      {quota && <span style={{ fontSize: '11px', fontWeight: '700', color: '#4dd0e1' }}>@{Number(quota).toFixed(2)}</span>}
                      {isHit !== null && <span style={{ fontSize: '12px' }}>{isHit ? '✅' : '❌'}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quote */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingLeft: '8px', paddingTop: '6px',
              borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '11px'
            }}>
              <div style={{ display: 'flex', gap: '10px', color: theme.textDim, flexWrap: 'wrap' }}>
                <span>1: <span style={{ color: theme.text }}>{pred.odds?.['1'] != null ? Number(pred.odds['1']).toFixed(2) : '-'}</span></span>
                <span>X: <span style={{ color: theme.text }}>{pred.odds?.['X'] != null ? Number(pred.odds['X']).toFixed(2) : '-'}</span></span>
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
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: theme.textDim, userSelect: 'none' as const }}
                onClick={(e) => toggleSection(detailKey, e)}
              >
                <span>📊 Dettaglio</span>
                <span style={{ transition: 'transform 0.2s', transform: isDetailOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </div>
            </div>

            {/* SEZIONE COMMENTO (espandibile indipendente) */}
            {isCommentOpen && (
              <div style={{
                marginTop: '8px', paddingLeft: '8px', paddingTop: '8px',
                borderTop: `1px solid ${theme.cyan}20`,
                animation: 'fadeIn 0.3s ease', fontSize: '11px', color: theme.textDim, fontStyle: 'italic', lineHeight: '1.5'
              }}>
                {pred.comment?.segno && <div>🔹 {pred.comment.segno.replace(/BVS/g, 'MAP')}</div>}
                {pred.comment?.gol && <div style={{ marginTop: '4px' }}>🔹 {pred.comment.gol.replace(/BVS/g, 'MAP')}</div>}
                {pred.comment?.doppia_chance && <div style={{ marginTop: '4px' }}>🔹 {pred.comment.doppia_chance.replace(/BVS/g, 'MAP')}</div>}
                {pred.comment?.gol_extra && <div style={{ marginTop: '4px' }}>🔹 {pred.comment.gol_extra.replace(/BVS/g, 'MAP')}</div>}
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
                              <th style={{ textAlign: 'left', padding: '3px 4px', color: theme.textDim, fontWeight: 'normal' }}>Striscia</th>
                              <th style={{ textAlign: 'center', padding: '3px 4px', color: theme.cyan, fontWeight: 'bold', fontSize: '9px' }}>{pred.home}</th>
                              <th style={{ textAlign: 'center', padding: '3px 4px', color: theme.purple, fontWeight: 'bold', fontSize: '9px' }}>{pred.away}</th>
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
                                  <td style={{ padding: '3px 4px', color: theme.text }}>{STREAK_LABELS[type]}</td>
                                  <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                                    {hN >= 2 ? (
                                      <span style={{ color: getColor(hCurve), fontWeight: 'bold' }}>
                                        {hN} <span style={{ fontSize: '8px', opacity: 0.7 }}>({hCurve > 0 ? '+' : ''}{hCurve})</span>
                                      </span>
                                    ) : <span style={{ color: theme.textDim }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                                    {aN >= 2 ? (
                                      <span style={{ color: getColor(aCurve), fontWeight: 'bold' }}>
                                        {aN} <span style={{ fontSize: '8px', opacity: 0.7 }}>({aCurve > 0 ? '+' : ''}{aCurve})</span>
                                      </span>
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
                <div style={{ marginBottom: '14px' }}>
                  <div style={{
                    height: '5px',
                    background: `linear-gradient(90deg, transparent, ${theme.gold}, transparent)`,
                    marginBottom: '20px',
                    marginTop: '-10px'
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
              <div style={{ display: 'flex', gap: '10px', color: theme.textDim }}>
                <span>1: <span style={{ color: theme.text }}>{bomb.odds?.['1'] != null ? Number(bomb.odds['1']).toFixed(2) : '-'}</span></span>
                <span>X: <span style={{ color: theme.text }}>{bomb.odds?.['X'] != null ? Number(bomb.odds['X']).toFixed(2) : '-'}</span></span>
                <span>2: <span style={{ color: theme.text }}>{bomb.odds?.['2'] != null ? Number(bomb.odds['2']).toFixed(2) : '-'}</span></span>
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
              <span>🔮</span>
              <span style={{
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}> Pronostici del Giorno</span>
            </h1>
            {/* Badge modalità inline */}
            {mode === 'sandbox' && (
              <span style={{ fontSize: '10px', color: '#ff9800', fontWeight: 700, padding: '2px 8px', background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.3)', borderRadius: '6px' }}>🧪 SANDBOX</span>
            )}
            {mode === 'confronto' && (
              <span style={{ fontSize: '10px', color: theme.purple, fontWeight: 700, padding: '2px 8px', background: 'rgba(188,19,254,0.15)', border: '1px solid rgba(188,19,254,0.3)', borderRadius: '6px' }}>⚖️ CONFRONTO</span>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP: layout originale */}
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
                marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.cyan; e.currentTarget.style.borderColor = theme.cyan; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textDim; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              ← Dashboard
            </button>

            {/* BANNER SANDBOX */}
            {mode === 'sandbox' && (
              <div style={{
                background: 'rgba(255, 152, 0, 0.15)',
                border: '1px solid rgba(255, 152, 0, 0.4)',
                borderRadius: '8px',
                padding: '10px 20px',
                textAlign: 'center',
                marginBottom: '15px',
                color: '#ff9800',
                fontWeight: '700',
                fontSize: '13px',
                letterSpacing: '1px'
              }}>
                🧪 MODALITA SANDBOX — Dati da daily_predictions_sandbox
              </div>
            )}
            {/* BANNER CONFRONTO */}
            {mode === 'confronto' && (
              <div style={{
                background: 'rgba(188, 19, 254, 0.15)',
                border: '1px solid rgba(188, 19, 254, 0.4)',
                borderRadius: '8px',
                padding: '10px 20px',
                textAlign: 'center',
                marginBottom: '15px',
                color: theme.purple,
                fontWeight: '700',
                fontSize: '13px',
                letterSpacing: '1px'
              }}>
                ⚖️ MODALITA CONFRONTO — Produzione vs Sandbox
              </div>
            )}
          </>
        )}

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '6px' : '30px' }}>
          {!isMobile && (
            <h1 style={{
              fontSize: '40px', fontWeight: '900', margin: '0 0 8px 0',
              letterSpacing: '-1px'
            }}>
              <span>🔮</span>
              <span style={{
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}> Pronostici del Giorno</span>
            </h1>
          )}
          {!isMobile && (
            <p style={{ color: theme.textDim, fontSize: '14px', margin: 0 }}>
              Analisi automatica basata su AI multi-indicatore
            </p>
          )}

          {/* Toggle PROD/SANDBOX/CONFRONTO + Mixer — solo Admin */}
          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '5px' : '8px', marginTop: isMobile ? '6px' : '12px', flexWrap: 'wrap' as const }}>
              <button
                onClick={() => setMode('prod')}
                style={{
                  background: mode === 'prod' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${mode === 'prod' ? theme.cyan : 'rgba(255,255,255,0.1)'}`,
                  color: mode === 'prod' ? theme.cyan : theme.textDim,
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase' as const,
                  transition: 'all 0.2s'
                }}
              >
                PROD
              </button>
              <button
                onClick={() => setMode('sandbox')}
                style={{
                  background: mode === 'sandbox' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${mode === 'sandbox' ? '#ff9800' : 'rgba(255,255,255,0.1)'}`,
                  color: mode === 'sandbox' ? '#ff9800' : theme.textDim,
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase' as const,
                  transition: 'all 0.2s'
                }}
              >
                SANDBOX
              </button>
              <button
                onClick={() => setMode('confronto')}
                style={{
                  background: mode === 'confronto' ? 'rgba(188, 19, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${mode === 'confronto' ? theme.purple : 'rgba(255,255,255,0.1)'}`,
                  color: mode === 'confronto' ? theme.purple : theme.textDim,
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase' as const,
                  transition: 'all 0.2s'
                }}
              >
                CONFRONTO
              </button>
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
              <button
                onClick={() => window.location.href = '/predictions-mixer'}
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  color: '#f97316',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase' as const,
                  transition: 'all 0.2s'
                }}
              >
                🎛️ MIXER
              </button>
            </div>
          )}
        </div>

        {/* NAVIGAZIONE DATA */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '10px' : '15px',
          marginTop: isMobile ? '15px' : undefined,
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

        {/* ==================== VISTA CONFRONTO v2 ==================== */}
        {mode === 'confronto' && !loading && !error && confrontoStats && (() => {
          const s = confrontoStats;
          const byLeague = filteredCompareMatches.reduce<Record<string, MatchComparison[]>>((acc, c) => {
            if (!acc[c.league]) acc[c.league] = [];
            acc[c.league].push(c);
            return acc;
          }, {});
          const hrDelta = (s.prodHR != null && s.sandHR != null) ? s.prodHR - s.sandHR : null;

          return (
            <>
              {/* ===== DASHBOARD PROD vs SANDBOX ===== */}
              <div style={{
                display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
                gap: isMobile ? '12px' : '16px', marginBottom: '20px', alignItems: 'stretch'
              }}>
                {/* Card PRODUZIONE */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(0,240,255,0.02))',
                  border: `1px solid ${theme.cyan}30`, borderRadius: '14px', padding: '16px 20px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: theme.cyan, textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '10px' }}>Produzione</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: theme.text }}>{s.prodPredCount}</div>
                      <div style={{ fontSize: '9px', color: theme.textDim, textTransform: 'uppercase' as const }}>Pronostici</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: theme.gold }}>{s.prodBombs}</div>
                      <div style={{ fontSize: '9px', color: theme.textDim, textTransform: 'uppercase' as const }}>Bombe</div>
                    </div>
                  </div>
                  {s.prodHR != null && (
                    <div>
                      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '4px' }}>HIT RATE</div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, s.prodHR)}%`, background: s.prodHR >= 50 ? theme.success : theme.danger, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: s.prodHR >= 50 ? theme.success : theme.danger }}>{s.prodHR}%</div>
                    </div>
                  )}
                </div>

                {/* Cerchio VS + Delta */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '0 8px', minWidth: isMobile ? 'auto' : '80px' }}>
                  <div style={{
                    fontSize: '18px', fontWeight: '900', color: theme.purple,
                    background: `${theme.purple}15`, borderRadius: '50%',
                    width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${theme.purple}40`, marginBottom: '8px'
                  }}>VS</div>
                  {hrDelta != null && (
                    <div style={{ fontSize: '11px', fontWeight: '800', textAlign: 'center',
                      color: hrDelta > 0 ? theme.cyan : hrDelta < 0 ? '#ff9800' : theme.textDim
                    }}>
                      {hrDelta > 0 ? `PROD +${hrDelta.toFixed(1)}%` : hrDelta < 0 ? `SAND +${Math.abs(hrDelta).toFixed(1)}%` : 'PARI'}
                    </div>
                  )}
                </div>

                {/* Card SANDBOX */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,152,0,0.08), rgba(255,152,0,0.02))',
                  border: '1px solid rgba(255,152,0,0.3)', borderRadius: '14px', padding: '16px 20px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#ff9800', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '10px' }}>Sandbox</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: theme.text }}>{s.sandPredCount}</div>
                      <div style={{ fontSize: '9px', color: theme.textDim, textTransform: 'uppercase' as const }}>Pronostici</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: theme.gold }}>{s.sandBombs}</div>
                      <div style={{ fontSize: '9px', color: theme.textDim, textTransform: 'uppercase' as const }}>Bombe</div>
                    </div>
                  </div>
                  {s.sandHR != null && (
                    <div>
                      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '4px' }}>HIT RATE</div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, s.sandHR)}%`, background: s.sandHR >= 50 ? theme.success : theme.danger, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: s.sandHR >= 50 ? theme.success : theme.danger }}>{s.sandHR}%</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== CONTATORI DIFFERENZE ===== */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
                {[
                  { count: s.identiche, label: 'Identiche', color: theme.success },
                  { count: s.diverse, label: 'Diverse', color: theme.warning },
                  ...(s.parziali > 0 ? [{ count: s.parziali, label: 'Parziali', color: '#ab47bc' as string }] : []),
                  ...(s.soloProd > 0 ? [{ count: s.soloProd, label: 'Solo Prod', color: theme.cyan }] : []),
                  ...(s.soloSandbox > 0 ? [{ count: s.soloSandbox, label: 'Solo Sandbox', color: '#ff9800' as string }] : []),
                ].map((item) => (
                  <div key={item.label} style={{
                    background: `${item.color}10`, border: `1px solid ${item.color}30`,
                    borderRadius: '10px', padding: '8px 16px', textAlign: 'center', minWidth: '80px'
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: item.color }}>{item.count}</div>
                    <div style={{ fontSize: '9px', color: theme.textDim, textTransform: 'uppercase' as const, fontWeight: '700' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* ===== FILTRI CONFRONTO (pillole) ===== */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
                {([
                  { id: 'tutte' as ConfrontoFilter, label: 'Tutte', color: theme.purple },
                  { id: 'identiche' as ConfrontoFilter, label: 'Identiche', color: theme.success },
                  { id: 'diverse' as ConfrontoFilter, label: 'Diverse', color: theme.warning },
                  { id: 'parziali' as ConfrontoFilter, label: 'Parziali', color: '#ab47bc' },
                  { id: 'solo_prod' as ConfrontoFilter, label: 'Solo Prod', color: theme.cyan },
                  { id: 'solo_sandbox' as ConfrontoFilter, label: 'Solo Sandbox', color: '#ff9800' },
                ]).map(f => (
                  <button key={f.id} onClick={() => setConfrontoFilter(f.id)} style={{
                    background: confrontoFilter === f.id ? `${f.color}20` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${confrontoFilter === f.id ? f.color : 'rgba(255,255,255,0.06)'}`,
                    color: confrontoFilter === f.id ? f.color : theme.textDim,
                    padding: '5px 12px', borderRadius: '16px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: confrontoFilter === f.id ? '700' : '500',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {f.label}
                    {confrontoFilterCounts[f.id] > 0 && (
                      <span style={{
                        fontSize: '9px', fontWeight: '800',
                        background: confrontoFilter === f.id ? `${f.color}30` : 'rgba(255,255,255,0.06)',
                        padding: '1px 6px', borderRadius: '10px', marginLeft: '2px'
                      }}>{confrontoFilterCounts[f.id]}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Contatore filtrato */}
              {confrontoFilter !== 'tutte' && (
                <div style={{ textAlign: 'center', fontSize: '11px', color: theme.textDim, marginBottom: '12px' }}>
                  Mostrando <span style={{ fontWeight: '800', color: theme.text }}>{filteredCompareMatches.length}</span> di <span style={{ fontWeight: '800', color: theme.text }}>{compareMatches.length}</span> partite
                </div>
              )}

              {/* Nessun risultato per filtro */}
              {confrontoFilter !== 'tutte' && filteredCompareMatches.length === 0 && compareMatches.length > 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textDim, fontSize: '13px' }}>
                  Nessuna partita corrisponde al filtro selezionato.
                  <br />
                  <button onClick={() => setConfrontoFilter('tutte')} style={{
                    marginTop: '10px', background: `${theme.purple}20`, border: `1px solid ${theme.purple}`,
                    color: theme.purple, padding: '6px 16px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                  }}>Mostra tutte</button>
                </div>
              )}

              {/* ===== TABELLA CONFRONTO PER LEGA ===== */}
              {filteredCompareMatches.length === 0 && compareMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textDim }}>Nessuna partita da confrontare per questa data.</div>
              ) : Object.entries(byLeague).map(([league, matches]) => {
                const isCollapsed = collapsedLeagues.has(league);
                const leagueLogoUrl = getLeagueLogoUrl(league);
                const countryCode = LEAGUE_TO_COUNTRY_CODE[league];
                const lIdent = matches.filter(m => m.status === 'both' && !m.predsDifferent && !m.bombsDifferent).length;
                const lDiv = matches.filter(m => m.status === 'both' && (m.predsChangedMarkets.length > 0 || m.bombsDifferent)).length;
                const lParz = matches.filter(m => m.status === 'both' && m.predsChangedMarkets.length === 0 && !m.bombsDifferent && (m.predsExtraProd.length > 0 || m.predsExtraSandbox.length > 0)).length;
                const lSP = matches.filter(m => m.status === 'prod_only').length;
                const lSS = matches.filter(m => m.status === 'sandbox_only').length;

                return (
                  <div key={`comp-${league}`} style={{ marginBottom: '16px' }}>
                    {/* Header Lega con mini-summary */}
                    <div
                      onClick={() => setCollapsedLeagues(prev => { const n = new Set(prev); n.has(league) ? n.delete(league) : n.add(league); return n; })}
                      style={{
                        background: theme.panel, border: theme.panelBorder, borderRadius: '10px',
                        padding: '10px 14px', marginBottom: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s'
                      }}
                    >
                      {leagueLogoUrl && <img src={leagueLogoUrl} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                      {countryCode && <img src={`https://flagcdn.com/w40/${countryCode}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                      <span style={{ fontSize: '13px', fontWeight: '800', color: theme.text, flex: 1 }}>{league}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '10px' }}>
                        {lIdent > 0 && <span style={{ color: theme.success, fontWeight: '700' }}>{lIdent}=</span>}
                        {lDiv > 0 && <span style={{ color: theme.warning, fontWeight: '700' }}>{lDiv}~</span>}
                        {lParz > 0 && <span style={{ color: '#ab47bc', fontWeight: '700' }}>{lParz}±</span>}
                        {lSP > 0 && <span style={{ color: theme.cyan, fontWeight: '700' }}>+{lSP}P</span>}
                        {lSS > 0 && <span style={{ color: '#ff9800', fontWeight: '700' }}>+{lSS}S</span>}
                      </div>
                      <span style={{ fontSize: '11px', color: theme.textDim }}>{matches.length}</span>
                      <span style={{ fontSize: '11px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>

                    {/* Card partite — layout a due colonne */}
                    {!isCollapsed && matches.map((m) => {
                      const isDiverse = m.predsChangedMarkets.length > 0 || m.bombsDifferent;
                      const isParziale = !isDiverse && (m.predsExtraProd.length > 0 || m.predsExtraSandbox.length > 0);
                      const barColor = m.status === 'prod_only' ? theme.cyan : m.status === 'sandbox_only' ? '#ff9800'
                        : isDiverse ? theme.warning : isParziale ? '#ab47bc' : theme.success;
                      const badgeLabel = m.status === 'prod_only' ? 'SOLO PROD' : m.status === 'sandbox_only' ? 'SOLO SANDBOX'
                        : isDiverse ? 'DIVERSI' : isParziale ? 'PARZIALE' : 'IDENTICI';
                      const prodTips = m.prodPred?.pronostici || [];
                      const sandTips = m.sandboxPred?.pronostici || [];
                      const prodTipSet = new Set(prodTips.map(p => `${p.tipo}-${p.pronostico}`));
                      const sandTipSet = new Set(sandTips.map(p => `${p.tipo}-${p.pronostico}`));

                      const renderTip = (p: any, odds: any, accent: string, isDiff: boolean) => {
                        const q = p.quota || (p.tipo === 'SEGNO' && odds ? (odds as any)[p.pronostico] : null)
                          || (p.tipo === 'GOL' && odds ? getGolQuota(p.pronostico, odds) : null);
                        const hc = p.hit === true ? '#00ff88' : p.hit === false ? '#ff4466' : accent;
                        return (
                          <span style={{
                            background: isDiff ? 'rgba(255,159,67,0.15)' : `${hc}12`,
                            border: `1px solid ${isDiff ? theme.warning : hc}30`,
                            borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '700', color: hc,
                            display: 'inline-flex', alignItems: 'center', gap: '2px'
                          }}>
                            {isDiff && <span style={{ color: theme.warning, fontSize: '8px' }}>*</span>}
                            {p.pronostico}{q ? ` @${Number(q).toFixed(2)}` : ''}{p.hit != null && (p.hit ? ' ✓' : ' ✗')}
                          </span>
                        );
                      };

                      return (
                        <div key={`comp-${m.home}-${m.away}`} style={{
                          background: theme.panel, border: theme.panelBorder, borderRadius: '10px',
                          marginBottom: '4px', position: 'relative', overflow: 'hidden'
                        }}>
                          {/* Barra laterale */}
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: barColor, borderRadius: '10px 0 0 10px' }} />

                          {/* HEADER PARTITA */}
                          <div style={{ padding: isMobile ? '8px 10px 6px 14px' : '10px 14px 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
                              <span style={{ fontSize: '10px', color: theme.textDim }}>{m.match_time}</span>
                              {(m.prodPred?.real_score || m.sandboxPred?.real_score) && (
                                <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: '900', color: theme.text }}>
                                  {(m.prodPred?.real_score || m.sandboxPred?.real_score || '').replace(':', ' - ')}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <img src={getStemmaUrl(m.home_mongo_id, m.league)} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <span style={{ fontSize: '13px', fontWeight: '800', color: theme.text }}>{m.home}</span>
                              <span style={{ fontSize: '11px', color: theme.textDim, fontWeight: '600' }}>vs</span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: theme.text }}>{m.away}</span>
                              <img src={getStemmaUrl(m.away_mongo_id, m.league)} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                          </div>

                          {/* BADGE STATO CENTRATO */}
                          <div style={{
                            display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '6px 0',
                            background: `${barColor}10`, borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '4px'
                          }}>
                            <span style={{
                              fontSize: '12px', fontWeight: '900', color: barColor, letterSpacing: '1px',
                              background: `${barColor}20`, padding: '4px 16px', borderRadius: '6px',
                              border: `1px solid ${barColor}40`, textTransform: 'uppercase' as const,
                            }}>{badgeLabel}</span>
                            {/* Dettaglio differenze */}
                            {(m.predsChangedMarkets.length > 0 || m.predsExtraProd.length > 0 || m.predsExtraSandbox.length > 0) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: '4px', fontSize: '10px' }}>
                                {m.predsChangedMarkets.map(c => (
                                  <span key={c.tipo} style={{ color: theme.warning, fontWeight: '700' }}>
                                    {c.tipo}: {c.prod} → {c.sandbox}
                                  </span>
                                ))}
                                {m.predsExtraProd.map(t => (
                                  <span key={`ep-${t}`} style={{ color: '#ab47bc', fontWeight: '600' }}>
                                    {t}: solo PROD
                                  </span>
                                ))}
                                {m.predsExtraSandbox.map(t => (
                                  <span key={`es-${t}`} style={{ color: '#ab47bc', fontWeight: '600' }}>
                                    {t}: solo SANDBOX
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* DUE COLONNE: PROD | SANDBOX */}
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1px 1fr' }}>
                            {/* Colonna PROD */}
                            <div style={{ padding: isMobile ? '8px 10px 4px 14px' : '10px 14px 10px 16px' }}>
                              <div style={{ fontSize: '9px', fontWeight: '800', color: theme.cyan, textTransform: 'uppercase' as const, marginBottom: '6px', letterSpacing: '0.5px' }}>
                                PROD {m.prodPred?.hit != null && (m.prodPred.hit ? '✅' : '❌')}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '3px', marginBottom: '4px' }}>
                                {prodTips.length > 0 ? prodTips.map((p, i) => (
                                  <span key={i}>{renderTip(p, m.prodPred?.odds, theme.cyan, !sandTipSet.has(`${p.tipo}-${p.pronostico}`))}</span>
                                )) : <span style={{ color: theme.textDim, fontStyle: 'italic', fontSize: '10px' }}>—</span>}
                              </div>
                              {m.prodBomb && (
                                <div style={{ marginTop: '4px' }}>
                                  <span style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '800', color: theme.gold }}>
                                    💣 {m.prodBomb.segno_bomba}{m.prodBomb.hit != null && (m.prodBomb.hit ? ' ✓' : ' ✗')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Separatore */}
                            {!isMobile && <div style={{ background: 'rgba(255,255,255,0.08)' }} />}
                            {isMobile && <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 10px' }} />}

                            {/* Colonna SANDBOX */}
                            <div style={{ padding: isMobile ? '4px 10px 8px 14px' : '10px 14px 10px 16px' }}>
                              <div style={{ fontSize: '9px', fontWeight: '800', color: '#ff9800', textTransform: 'uppercase' as const, marginBottom: '6px', letterSpacing: '0.5px' }}>
                                SANDBOX {m.sandboxPred?.hit != null && (m.sandboxPred.hit ? '✅' : '❌')}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '3px', marginBottom: '4px' }}>
                                {sandTips.length > 0 ? sandTips.map((p, i) => (
                                  <span key={i}>{renderTip(p, m.sandboxPred?.odds, '#ff9800', !prodTipSet.has(`${p.tipo}-${p.pronostico}`))}</span>
                                )) : <span style={{ color: theme.textDim, fontStyle: 'italic', fontSize: '10px' }}>—</span>}
                              </div>
                              {m.sandboxBomb && (
                                <div style={{ marginTop: '4px' }}>
                                  <span style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '800', color: theme.gold }}>
                                    💣 {m.sandboxBomb.segno_bomba}{m.sandboxBomb.hit != null && (m.sandboxBomb.hit ? ' ✓' : ' ✗')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* ==================== VISTA NORMALE (PROD/SANDBOX) ==================== */}
        {mode !== 'confronto' && (<>
        {/* CONTATORI RIEPILOGO */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: theme.panel, border: theme.panelBorder, borderRadius: '10px',
            padding: '12px 20px', textAlign: 'center', minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: theme.cyan }}>{filteredPredictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)}</div>
            <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', fontWeight: 'bold' }}>Pronostici</div>
          </div>
          <div style={{
            background: 'rgba(255,215,0,0.05)', border: `1px solid ${theme.gold}30`, borderRadius: '10px',
            padding: '12px 20px', textAlign: 'center', minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: theme.gold }}>{filteredBombs.length}</div>
            <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', fontWeight: 'bold' }}>Bombe 💣</div>
          </div>
          <div style={{
            background: theme.panel, border: theme.panelBorder, borderRadius: '10px',
            padding: '12px 20px', textAlign: 'center', minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: theme.purple }}>{Object.keys(filteredGroupedByLeague).length}</div>
            <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', fontWeight: 'bold' }}>Leghe</div>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px'
        }}>
          {[
            { id: 'all' as const, label: 'Tutto', icon: '📋' },
            { id: 'predictions' as const, label: 'Pronostici', icon: '🔮' },
            { id: 'bombs' as const, label: 'Bombe', icon: '💣' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? `${theme.cyan}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeTab === tab.id ? theme.cyan : 'rgba(255,255,255,0.08)'}`,
                color: activeTab === tab.id ? theme.cyan : theme.textDim,
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

        {/* STATUS FILTERS — Due sezioni: Partite + Pronostici */}
        {(() => {
          const renderFilterBtn = (f: { id: StatusFilter; label: string; icon: string; color: string }) => (
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
          );
          const capsuleStyle: React.CSSProperties = {
            fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px',
            color: theme.textDim, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
            padding: '3px 10px', marginBottom: '8px', textAlign: 'center'
          };
          const boxStyle: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '10px 14px'
          };
          return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const, alignItems: 'stretch' }}>
              {/* Box Partite */}
              <div style={boxStyle}>
                <span style={capsuleStyle}>Partite</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                  {renderFilterBtn({ id: 'tutte', label: 'Tutte', icon: '📋', color: theme.purple })}
                  {renderFilterBtn({ id: 'live', label: 'LIVE', icon: '🔴', color: theme.danger })}
                  {renderFilterBtn({ id: 'da_giocare', label: 'Da giocare', icon: '⏳', color: theme.textDim })}
                  {renderFilterBtn({ id: 'finite', label: 'Finite', icon: '✅', color: theme.success })}
                </div>
              </div>
              {/* Box Pronostici */}
              <div style={boxStyle}>
                <span style={capsuleStyle}>Pronostici</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                  {renderFilterBtn({ id: 'centrate', label: 'Centrati', icon: '✓', color: '#00ff88' })}
                  {renderFilterBtn({ id: 'mancate', label: 'Mancati', icon: '✗', color: '#ff4466' })}
                </div>
              </div>
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
        {mode !== 'confronto' && !loading && !error && predictions.length === 0 && bombs.length === 0 && (
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
        {mode !== 'confronto' && !loading && !error && statusFilter !== 'tutte' && filteredPredictions.length === 0 && filteredBombs.length === 0 && (predictions.length > 0 || bombs.length > 0) && (
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
        {mode !== 'confronto' && !loading && !error && (
          <>
            {/* BARRA STATISTICHE RISULTATI */}
            {(predStats.finished > 0 || bombStats.finished > 0) && (
              <div style={{
                display: 'flex', gap: '10px', marginBottom: '20px',
                flexWrap: 'wrap', animation: 'fadeIn 0.4s ease'
              }}>
                {/* Stats Pronostici */}
                {predStats.finished > 0 && (activeTab === 'all' || activeTab === 'predictions') && (
                  <div style={{
                    flex: 1, minWidth: '200px',
                    background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,255,136,0.02))',
                    border: '1px solid rgba(0,255,136,0.2)', borderRadius: '12px',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: '12px', color: theme.textDim }}>
                      🔮 Pronostici
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: '700' }}>
                        ✅ {predStats.hits}
                      </span>
                      <span style={{ fontSize: '13px', color: '#ff4466', fontWeight: '700' }}>
                        ❌ {predStats.misses}
                      </span>
                      <span style={{
                        fontSize: '14px', fontWeight: '900',
                        color: (predStats.hit_rate || 0) >= 50 ? '#00ff88' : '#ff4466',
                        background: (predStats.hit_rate || 0) >= 50 ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)',
                        padding: '2px 8px', borderRadius: '6px'
                      }}>
                        {predStats.hit_rate ?? '—'}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Stats Bombe */}
                {bombStats.finished > 0 && (activeTab === 'all' || activeTab === 'bombs') && (
                  <div style={{
                    flex: 1, minWidth: '200px',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02))',
                    border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: '12px', color: theme.textDim }}>
                      💣 Bombe
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: '700' }}>
                        ✅ {bombStats.hits}
                      </span>
                      <span style={{ fontSize: '13px', color: '#ff4466', fontWeight: '700' }}>
                        ❌ {bombStats.misses}
                      </span>
                      <span style={{
                        fontSize: '14px', fontWeight: '900',
                        color: (bombStats.hit_rate || 0) >= 30 ? '#00ff88' : '#ff4466',
                        background: (bombStats.hit_rate || 0) >= 30 ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)',
                        padding: '2px 8px', borderRadius: '6px'
                      }}>
                        {bombStats.hit_rate ?? '—'}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* SEZIONE BOMBE (in alto se presenti) */}
            {(activeTab === 'all' || activeTab === 'bombs') && filteredBombs.length > 0 && (
              <div style={{ marginBottom: '30px', animation: 'fadeIn 0.4s ease' }}>
                <h2 style={{
                  fontSize: isMobile ? '18px' : '22px', fontWeight: '800', color: theme.gold,
                  margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  💣 Bombe del Giorno
                  <span style={{
                    fontSize: '11px', background: `${theme.gold}20`, color: theme.gold,
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    {filteredBombs.length}
                  </span>
                </h2>
                {(() => {
                  const groupedBombs: Record<string, Bomb[]> = {};
                  filteredBombs.forEach(b => { (groupedBombs[b.league] = groupedBombs[b.league] || []).push(b); });
                  return Object.entries(groupedBombs).map(([leagueName, lBombs]) => {
                    const key = `bomb-${leagueName}`;
                    const isCollapsed = !collapsedLeagues.has(key);
                    const now = new Date();
                    const finished = lBombs.filter(b => b.real_score != null).length;
                    const live = lBombs.filter(b => b.real_score == null && b.date && b.match_time && new Date(`${b.date}T${b.match_time}:00`) <= now).length;
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
                        {live > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.danger, fontWeight: '700', animation: 'pulse 1.5s ease-in-out infinite' }}>🔴 {live} LIVE</span></>}
                        {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                        {sep}
                        <span style={{ fontSize: '9px', color: hitColor, fontWeight: '700' }}>✓ {hits} {hits === 1 ? 'centrato' : 'centrati'}</span>
                        {sep}
                        <span style={{ fontSize: '9px', color: missColor, fontWeight: '700' }}>✗ {misses} {misses === 1 ? 'mancato' : 'mancati'}</span>
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
                              </div>
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
            )}

            {/* SEZIONE PRONOSTICI (raggruppati per lega) */}
            {(activeTab === 'all' || activeTab === 'predictions') && filteredPredictions.length > 0 && (
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
                  const now = new Date();
                  const finished = preds.filter(p => p.real_score != null).length;
                  const live = preds.filter(p => p.real_score == null && p.date && p.match_time && new Date(`${p.date}T${p.match_time}:00`) <= now).length;
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
                      {live > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.danger, fontWeight: '700', animation: 'pulse 1.5s ease-in-out infinite' }}>🔴 {live} LIVE</span></>}
                      {toPlay > 0 && <>{sep}<span style={{ fontSize: '9px', color: theme.textDim, fontWeight: '600' }}>⏳ {toPlay} da giocare</span></>}
                      {sep}
                      <span style={{ fontSize: '9px', color: hitColor, fontWeight: '700' }}>✓ {hits} {hits === 1 ? 'centrato' : 'centrati'}</span>
                      {sep}
                      <span style={{ fontSize: '9px', color: missColor, fontWeight: '700' }}>✗ {misses} {misses === 1 ? 'mancato' : 'mancati'}</span>
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
                          </div>
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
    </div>
  );
}