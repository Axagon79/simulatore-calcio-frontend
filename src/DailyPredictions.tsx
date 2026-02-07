import { useState, useEffect } from 'react';

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
  'Brasileirão': 'Brazil', 'Brasileirao': 'Brazil',
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
}

export default function DailyPredictions({ onBack }: DailyPredictionsProps) {
  const [date, setDate] = useState(getToday());
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'predictions' | 'bombs'>('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [predStats, setPredStats] = useState<{total:number,finished:number,pending:number,hits:number,misses:number,hit_rate:number|null}>({total:0,finished:0,pending:0,hits:0,misses:0,hit_rate:null});
  const [bombStats, setBombStats] = useState<{total:number,finished:number,pending:number,hits:number,misses:number,hit_rate:number|null}>({total:0,finished:0,pending:0,hits:0,misses:0,hit_rate:null});
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'prod' | 'sandbox'>('prod');

  // Reset UI state al cambio modalità PROD/SANDBOX
  useEffect(() => {
    setExpandedSections(new Set());
    setCollapsedLeagues(new Set());
    setActiveTab('all');
  }, [mode]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
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

      } catch (err: any) {
        console.error('Errore fetch pronostici:', err);
        setError(err.message || 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date, mode]);

  // Raggruppamento per lega
  const groupedByLeague = predictions.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});

  const toggleSection = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

    return (
      <div
        key={cardKey}
        style={{
          background: theme.panel,
          border: theme.panelBorder,
          borderRadius: '10px',
          padding: isMobile ? '10px 12px' : '12px 16px',
          marginBottom: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* BARRA LATERALE */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: barColor
        }} />

        {/* RIGA 1: Orario + Lega */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: '8px' }}>
          <span style={{ fontSize: '10px', color: theme.textDim }}>🕐 {pred.match_time}</span>
          <span style={{ fontSize: '10px', color: theme.textDim, opacity: 0.6 }}>|</span>
          <span style={{ fontSize: '10px', color: theme.textDim }}>{pred.league}</span>
        </div>

        {/* RIGA 2: Squadre + Finale */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '8px', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <img
              src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt=""
              style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pred.home}
            </span>
            <span style={{ fontSize: '11px', color: theme.textDim, margin: '0 2px' }}>vs</span>
            <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pred.away}
            </span>
            <img
              src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt=""
              style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: theme.textDim, marginRight: '6px' }}>Finale:</span>
            {pred.real_score ? (
              <span style={{
                fontSize: '15px', fontWeight: '900',
                color: pred.hit ? '#00ff88' : '#ff4466',
              }}>
                {pred.real_score.replace(':', ' - ')}
              </span>
            ) : (
              <span style={{ fontSize: '15px', fontWeight: '900', color: theme.textDim }}>–</span>
            )}
          </div>
        </div>

        {/* RIGA 3: Pronostici (pillole con stelle + confidence) */}
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

        {/* RIGA 4: Quote */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingLeft: '8px', paddingTop: '6px',
          borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '11px'
        }}>
          <div style={{ display: 'flex', gap: '10px', color: theme.textDim, flexWrap: 'wrap' }}>
            <span>1: <span style={{ color: theme.text }}>{pred.odds?.['1']}</span></span>
            <span>X: <span style={{ color: theme.text }}>{pred.odds?.['X']}</span></span>
            <span>2: <span style={{ color: theme.text }}>{pred.odds?.['2']}</span></span>
            {pred.odds?.over_25 != null && <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>│</span>
              <span>O2.5: <span style={{ color: theme.text }}>{pred.odds.over_25}</span></span>
              <span>U2.5: <span style={{ color: theme.text }}>{pred.odds.under_25}</span></span>
            </>}
            {pred.odds?.gg != null && <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>│</span>
              <span>GG: <span style={{ color: theme.text }}>{pred.odds.gg}</span></span>
              <span>NG: <span style={{ color: theme.text }}>{pred.odds.ng}</span></span>
            </>}
          </div>
        </div>

        {/* RIGA 5: Bottoni Commento + Dettaglio */}
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
            {pred.segno_dettaglio && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.cyan, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                📊 Dettaglio Segno
              </div>
              {pred.segno_dettaglio_raw ? (
                // Nuovo layout con confronto squadre
                Object.entries(pred.segno_dettaglio).map(([key, affidabilita]) => {
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
                // Fallback vecchio layout
                Object.entries(pred.segno_dettaglio).map(([key, val]) => (
                  <div key={key}>{renderDetailBar(val, SEGNO_LABELS[key] || key)}</div>
                ))
              )}
            </div>
          )}
            {pred.gol_dettaglio && pred.confidence_gol > 0 && (
            <div style={{ marginBottom: '14px' }}>
              {/* Divisore tra Segno e Gol */}
              <div style={{ 
                height: '5px', 
                background: `linear-gradient(90deg, transparent, ${theme.gold}, transparent)`,
                marginBottom: '20px',
                marginTop: '-10px'
              }} />
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.cyan, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ⚽ Dettaglio Gol
              </div>
              {Object.entries(pred.gol_dettaglio).map(([key, val]) => (
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
    );
  };

  // --- RENDER CARD BOMBA ---
  const renderBombCard = (bomb: Bomb) => {
    const cardKey = `bomb-${bomb.home}-${bomb.away}`;
    const commentKey = `${cardKey}-comment`;
    const detailKey = `${cardKey}-detail`;
    const isCommentOpen = !expandedSections.has(commentKey);
    const isDetailOpen = expandedSections.has(detailKey);

    return (
      <div
        key={cardKey}
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.04), rgba(255,42,109,0.04))',
          border: `1px solid ${theme.gold}40`,
          borderRadius: '10px',
          padding: isMobile ? '10px 12px' : '12px 16px',
          marginBottom: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* BARRA LATERALE */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: bomb.real_score ? (bomb.hit ? '#00ff88' : '#ff4466') : `linear-gradient(180deg, ${theme.gold}, ${theme.danger})`
        }} />

        {/* RIGA 1: Orario + Lega + Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingLeft: '8px' }}>
          <span style={{ fontSize: '10px', color: theme.textDim }}>🕐 {bomb.match_time}</span>
          <span style={{ fontSize: '10px', color: theme.textDim, opacity: 0.6 }}>|</span>
          <span style={{ fontSize: '10px', color: theme.textDim }}>{bomb.league}</span>
          <span style={{
            background: `linear-gradient(135deg, ${theme.gold}, #ff8c00)`,
            color: '#000', fontSize: '9px', fontWeight: '900',
            padding: '1px 7px', borderRadius: '10px'
          }}>💣</span>
        </div>

        {/* RIGA 2: Squadre + Finale */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '8px', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bomb.home}
            </span>
            <span style={{ fontSize: '11px', color: theme.textDim, margin: '0 2px' }}>vs</span>
            <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bomb.away}
            </span>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: theme.textDim, marginRight: '6px' }}>Finale:</span>
            {bomb.real_score ? (
              <span style={{
                fontSize: '15px', fontWeight: '900',
                color: bomb.hit ? '#00ff88' : '#ff4466',
              }}>
                {bomb.real_score.replace(':', ' - ')}
              </span>
            ) : (
              <span style={{ fontSize: '15px', fontWeight: '900', color: theme.textDim }}>–</span>
            )}
          </div>
        </div>

        {/* RIGA 3: Pronostico bomba (pillola con stelle + confidence) */}
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

        {/* RIGA 4: Quote */}
        <div style={{
          display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingTop: '6px',
          borderTop: '1px solid rgba(255,215,0,0.06)', fontSize: '11px'
        }}>
          <div style={{ display: 'flex', gap: '10px', color: theme.textDim }}>
            <span>1: <span style={{ color: theme.text }}>{bomb.odds?.['1']}</span></span>
            <span>X: <span style={{ color: theme.text }}>{bomb.odds?.['X']}</span></span>
            <span>2: <span style={{ color: theme.text }}>{bomb.odds?.['2']}</span></span>
          </div>
        </div>

        {/* RIGA 5: Bottoni Commento + Dettaglio */}
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
    );
  };

  // --- RENDER PRINCIPALE ---
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: theme.bg,
      backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1d2e 0%, #05070a 70%)',
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

        {/* BOTTONE TORNA */}
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

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: isMobile ? '28px' : '40px', fontWeight: '900', margin: '0 0 8px 0',
            letterSpacing: '-1px'
          }}>
            <span>🔮</span>
            <span style={{
              background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}> Pronostici del Giorno</span>
          </h1>
          <p style={{ color: theme.textDim, fontSize: '14px', margin: 0 }}>
            Analisi automatica basata su AI multi-indicatore
          </p>

          {/* Toggle PROD/SANDBOX — solo DEV */}
          {import.meta.env.DEV && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
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
            </div>
          )}
        </div>

        {/* NAVIGAZIONE DATA */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px',
          marginBottom: '25px'
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

          <div style={{
            background: theme.panel, border: theme.panelBorder,
            borderRadius: '10px', padding: '10px 20px', textAlign: 'center', minWidth: isMobile ? '180px' : '220px'
          }}>
            <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '800', color: theme.text }}>
              {formatDateLabel(date)}
            </div>
            {date === getToday() && (
              <div style={{ fontSize: '10px', color: theme.success, fontWeight: 'bold', marginTop: '2px' }}>
                ● OGGI
              </div>
            )}
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

        {/* CONTATORI RIEPILOGO */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '25px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: theme.panel, border: theme.panelBorder, borderRadius: '10px',
            padding: '12px 20px', textAlign: 'center', minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: theme.cyan }}>{predictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)}</div>
            <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', fontWeight: 'bold' }}>Pronostici</div>
          </div>
          <div style={{
            background: 'rgba(255,215,0,0.05)', border: `1px solid ${theme.gold}30`, borderRadius: '10px',
            padding: '12px 20px', textAlign: 'center', minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: theme.gold }}>{bombs.length}</div>
            <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', fontWeight: 'bold' }}>Bombe 💣</div>
          </div>
          <div style={{
            background: theme.panel, border: theme.panelBorder, borderRadius: '10px',
            padding: '12px 20px', textAlign: 'center', minWidth: '120px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: theme.purple }}>{Object.keys(groupedByLeague).length}</div>
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

        {/* CONTENUTO PRINCIPALE */}
        {!loading && !error && (
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
            {(activeTab === 'all' || activeTab === 'bombs') && bombs.length > 0 && (
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
                    {bombs.length}
                  </span>
                </h2>
                {(() => {
                  const groupedBombs: Record<string, Bomb[]> = {};
                  bombs.forEach(b => { (groupedBombs[b.league] = groupedBombs[b.league] || []).push(b); });
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '240px', minWidth: '240px', flexShrink: 0 }) }}>
                                <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{leagueName}</span>
                              </div>
                              {!isMobile && <><span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>{statsEls}</>}
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
            {(activeTab === 'all' || activeTab === 'predictions') && predictions.length > 0 && (
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
                    {predictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)}
                  </span>
                </h2>

                {Object.entries(groupedByLeague).map(([leagueName, preds]) => {
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '240px', minWidth: '240px', flexShrink: 0 }) }}>
                            <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <img src={getLeagueLogoUrl(leagueName)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{leagueName}</span>
                          </div>
                          {!isMobile && <><span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>│</span>{statsEls}</>}
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