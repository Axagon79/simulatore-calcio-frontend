import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { checkAdmin } from './permissions';
import AddBetPopup from './components/AddBetPopup';
import { useAuth } from './contexts/AuthContext';

type StatusFilter = 'tutte' | 'live' | 'da_giocare' | 'finite' | 'centrate' | 'mancate';
type MarketFilter = 'tutti' | 'segno' | 'dc' | 'ou15' | 'ou25' | 'ou35' | 'ggng' | 'mg' | 're' | 'nobet';

// --- TEMA (centralizzato) ---
import { getTheme, getThemeMode, API_BASE } from './AppDev/costanti';
import { sharePrediction } from './utils/shareCard';
import StemmaImg from './components/StemmaImg';
import LogoVirgo from './components/LogoVirgo';
const theme = getTheme();
const isLight = getThemeMode() === 'light';

// --- HELPER: normalizza score per confronto ---
const normalizeScore = (s: string): string => s.replace(/\s/g, '').replace(':', '-');

// --- URL BASE STEMMI ---
const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

// --- API BASE ---


// --- MAPPA LEGA → CARTELLA STEMMI ---
const LEAGUE_TO_FOLDER: Record<string, string> = {
  'Serie A': 'Italy', 'Serie B': 'Italy', 'Serie C - Girone A': 'Italy', 'Serie C - Girone B': 'Italy', 'Serie C - Girone C': 'Italy',
  'Premier League': 'England', 'Championship': 'England', 'League One': 'England',
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
  'MLS': 'USA', 'Major League Soccer': 'USA',
  'J1 League': 'Japan',
  // NUOVI CAMPIONATI (24/03/2026)
  'League Two': 'England', 'Veikkausliiga': 'Finland', '3. Liga': 'Germany',
  'Liga MX': 'Mexico', 'Eerste Divisie': 'Netherlands', 'Liga Portugal 2': 'Portugal',
  '1. Lig': 'Turkey', 'Saudi Pro League': 'Saudi_Arabia', 'Scottish Championship': 'Scotland',
  'Champions League': 'Champions_League',
  'Europa League': 'Europa_League',
};

const LEAGUE_TO_LOGO: Record<string, string> = {
    'Serie A': 'serie_a', 'Serie B': 'serie_b',
    'Serie C - Girone A': 'serie_c', 'Serie C - Girone B': 'serie_c', 'Serie C - Girone C': 'serie_c',
    'Premier League': 'premier_league', 'Championship': 'championship', 'League One': 'league_one',
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
    'MLS': 'mls', 'Major League Soccer': 'mls',
    'J1 League': 'j1_league',
    // NUOVI CAMPIONATI (24/03/2026)
    'League Two': 'league_two', 'Veikkausliiga': 'veikkausliiga', '3. Liga': '3_liga',
    'Liga MX': 'liga_mx', 'Eerste Divisie': 'eerste_divisie', 'Liga Portugal 2': 'liga_portugal_2',
    '1. Lig': '1_lig', 'Saudi Pro League': 'saudi_pro_league', 'Scottish Championship': 'scottish_championship',
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
    'Premier League': 'gb-eng', 'Championship': 'gb-eng', 'League One': 'gb-eng',
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
    'MLS': 'us', 'Major League Soccer': 'us',
    'J1 League': 'jp',
    // NUOVI CAMPIONATI (24/03/2026)
    'League Two': 'gb-eng', 'Veikkausliiga': 'fi', '3. Liga': 'de',
    'Liga MX': 'mx', 'Eerste Divisie': 'nl', 'Liga Portugal 2': 'pt',
    '1. Lig': 'tr', 'Saudi Pro League': 'sa', 'Scottish Championship': 'gb-sct',
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
    mc_position?: number; mc_count?: number; mc_sum?: number; elite?: boolean;
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
  // Risultato Esatto
  is_exact_score?: boolean;
  exact_score_top3?: Array<{ score: string; prob: number }>;
  exact_score_gap?: number;
  // Analisi del Match (22 checker contraddizioni)
  analysis_free?: string;
  analysis_alerts?: Array<{ id: string; severity: number; text: string }>;
  analysis_score?: number;
  analysis_premium?: string;
  analysis_deepdive?: string;
  analysis_deepdive_ts?: string;
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
  if (stake === 0) return theme.textDisabled;
  if (stake <= 2) return theme.quotaText;
  if (stake <= 3) return theme.success;
  if (stake <= 5) return theme.warning;
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

/** Controlla se una prediction ha almeno un pronostico reale (non NO BET) */
const hasRealTip = (p: Prediction) => p.pronostici?.some((pr: any) => pr.pronostico && pr.pronostico !== 'NO BET') ?? false;

export default function UnifiedPredictions({ onBack, onNavigateToLeague }: UnifiedPredictionsProps) {
  const [date, setDate] = useState(getToday());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const predCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTab, setActiveTab] = useState<'pronostici' | 'alto_rendimento' | 'elite'>('pronostici');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const [dailyPLData, setDailyPLData] = useState<Record<string, { pl: number; bets: number; wins: number; hr: number; roi: number; staked: number }>>({});
  const [monthlyPLData, setMonthlyPLData] = useState<Record<string, { pl: number; bets: number; wins: number; hr: number; roi: number; staked: number }>>({});
  const [totalPLData, setTotalPLData] = useState<Record<string, { pl: number; bets: number; wins: number; hr: number; roi: number; staked: number }>>({});
  const isAdmin = checkAdmin();
  const [premiumAnalysis, setPremiumAnalysis] = useState<Record<string, string>>({});
  const [premiumLoading, setPremiumLoading] = useState<Record<string, boolean>>({});
  const [analysisTab, setAnalysisTab] = useState<Record<string, 'free' | 'premium' | 'deepdive'>>({});
  const [deepdiveAnalysis, setDeepdiveAnalysis] = useState<Record<string, string>>({});
  const [deepdiveLoading, setDeepdiveLoading] = useState<Record<string, boolean>>({});

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
  // --- Sistema Acquisti Pronostici ---
  const { user, credits, shields, subscription, getIdToken, refreshWallet } = useAuth();
  const [purchasedMatches, setPurchasedMatches] = useState<Set<string>>(new Set());
  const [shieldedMatches, setShieldedMatches] = useState<Set<string>>(new Set());
  const [purchaseModal, setPurchaseModal] = useState<{ matchKey: string; home: string; away: string; league: string; matchTime: string } | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const canSeeAll = isAdmin || isPremiumUser;
  const predictionCost = subscription ? 1 : 3;
  const [versionCache, setVersionCache] = useState<Record<string, any[]>>({});
  const [versionOpen, setVersionOpen] = useState<Set<string>>(new Set());
  const [versionLoading, setVersionLoading] = useState<Set<string>>(new Set());

  const toggleVersionHistory = async (pillKey: string, fetchKey: string) => {
    const newOpen = new Set(versionOpen);
    if (newOpen.has(pillKey)) {
      newOpen.delete(pillKey);
      setVersionOpen(newOpen);
      return;
    }
    newOpen.add(pillKey);
    setVersionOpen(newOpen);

    if (versionCache[fetchKey]) return;

    setVersionLoading(prev => new Set([...prev, fetchKey]));
    try {
      const res = await fetch(`${API_BASE}/prediction-versions?date=${date}&match_key=${encodeURIComponent(fetchKey)}`);
      if (res.ok) {
        const data = await res.json();
        setVersionCache(prev => ({ ...prev, [fetchKey]: data.versions || [] }));
      }
    } catch { /* silent */ }
    setVersionLoading(prev => { const s = new Set(prev); s.delete(fetchKey); return s; });
  };

  // Carica acquisti utente
  useEffect(() => {
    const el = mainContainerRef.current;
    if (!el) return;
    const check = () => setHasScrollbar(el.scrollHeight > el.clientHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener('scroll', check);
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  });

  useEffect(() => {
    if (!user || canSeeAll) return;
    const loadPurchases = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`${API_BASE}/wallet/purchases?date=${date}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPurchasedMatches(new Set((data.purchases || []).map((p: any) => p.match_key)));
        }
      } catch { /* silent */ }
    };
    loadPurchases();
  }, [user, date, canSeeAll]);

  const canSeePrediction = useCallback((matchKey: string) => {
    return canSeeAll || purchasedMatches.has(matchKey);
  }, [canSeeAll, purchasedMatches]);

  // Helper: blur selettivo dei pronostici nel testo per utenti non premium
  const blurPronostici = useCallback((text: string, tips: string[], canSee: boolean) => {
    if (canSee || !text) return text;
    // Pattern di mercato fissi + pronostici specifici della partita
    const marketPatterns = [
      'Over 2\\.5', 'Under 2\\.5', 'Over 1\\.5', 'Under 1\\.5', 'Over 3\\.5', 'Under 3\\.5',
      'Over 0\\.5', 'Under 0\\.5',
      'NoGoal', 'No Goal', 'Goal',
    ];
    const allTerms = [...tips.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), ...marketPatterns];
    // Aggiungi segni come word-boundary match per evitare falsi positivi
    const segni = ['1X', 'X2', '12', 'GG', 'NG'];
    segni.forEach(s => allTerms.push(`(?<=\\s|,|—|:|^)${s}(?=\\s|,|—|$|\\b)`));
    if (!allTerms.length) return text;
    const regex = new RegExp(`(${allTerms.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part: string, j: number) => {
      if (regex.test(part)) {
        regex.lastIndex = 0;
        return <span key={j} style={{ filter: 'blur(5px)', userSelect: 'none' as const }}>{part}</span>;
      }
      regex.lastIndex = 0;
      return part;
    });
  }, []);

  const [purchaseSnapshots, setPurchaseSnapshots] = useState<Record<string, any>>({});

  const activateShield = async (matchKey: string, home: string, away: string) => {
    if ((shields ?? 0) < 1) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/wallet/transaction`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shield_attivato',
          credits_delta: 0,
          shields_delta: -1,
          amount_eur: 0,
          description: `Shield su ${home} vs ${away}`,
          metadata: { match_key: matchKey },
        }),
      });
      if (res.ok) {
        setShieldedMatches(prev => new Set([...prev, matchKey]));
        window.dispatchEvent(new Event('wallet-changed'));
        await refreshWallet();
      }
    } catch { /* silent */ }
  };

  const handleUnlock = (pred: Prediction) => {
    if (!user) {
      window.dispatchEvent(new Event('open-settings'));
      return;
    }
    const matchKey = `${pred.date}_${pred.home}_${pred.away}`;
    // Salva snapshot per confronto post-acquisto
    setPurchaseSnapshots(prev => ({
      ...prev,
      [matchKey]: {
        pronostici: pred.pronostici?.map(p => ({ pronostico: p.pronostico, tipo: p.tipo, stake: p.stake, confidence: p.confidence })),
        purchased_at: new Date().toISOString(),
      },
    }));
    setPurchaseModal({ matchKey, home: pred.home, away: pred.away, league: pred.league, matchTime: pred.match_time });
  };

  const confirmUnlock = async () => {
    if (!purchaseModal) return;
    setPurchaseLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/wallet/transaction`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pronostico_sbloccato',
          credits_delta: -predictionCost,
          shields_delta: 0,
          amount_eur: 0,
          description: `${purchaseModal.home} vs ${purchaseModal.away}`,
          metadata: {
            match_key: purchaseModal.matchKey, date, cost: predictionCost,
            snapshot_at_purchase: purchaseSnapshots[purchaseModal.matchKey]?.pronostici || [],
          },
        }),
      });
      if (res.ok) {
        setPurchasedMatches(prev => new Set([...prev, purchaseModal.matchKey]));
        window.dispatchEvent(new Event('wallet-changed'));
        await refreshWallet();
        setPurchaseSuccess(`Pronostico sbloccato! ${purchaseModal.home} vs ${purchaseModal.away}`);
        setPurchaseModal(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setPurchaseSuccess(err.error || 'Errore. Crediti insufficienti?');
      }
    } catch {
      setPurchaseSuccess('Errore di rete. Riprova.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tutte');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('tutti');
  const [sourceFilter, setSourceFilter] = useState<string>('tutti');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [addBetPopup, setAddBetPopup] = useState<{isOpen: boolean, home: string, away: string, market: string, prediction: string, odds: number, confidence?: number, probabilitaStimata?: number, systemStake?: number}>({isOpen: false, home: '', away: '', market: '', prediction: '', odds: 0});
  const [financeOpen, setFinanceOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  const [reHitFilter, setReHitFilter] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [finLegendOpen, setFinLegendOpen] = useState(false);
  const [filtersStatsOpen, setFiltersStatsOpen] = useState(false);
  // Definizioni mercati (per capsule + filtraggio)
  const MARKET_DEFS: { id: MarketFilter; label: string; filter: (t: any) => boolean; color: string }[] = [
    { id: 'segno', label: '1X2', filter: t => t.tipo === 'SEGNO', color: theme.cyan },
    { id: 'ou15', label: 'O/U 1.5', filter: t => t.tipo === 'GOL' && /^(over|under)\s+1\.5$/i.test(t.pronostico), color: isLight ? '#0284c7' : '#4fc3f7' },
    { id: 'ou25', label: 'O/U 2.5', filter: t => t.tipo === 'GOL' && /^(over|under)\s+2\.5$/i.test(t.pronostico), color: isLight ? '#0369a1' : '#29b6f6' },
    { id: 'ou35', label: 'O/U 3.5', filter: t => t.tipo === 'GOL' && /^(over|under)\s+3\.5$/i.test(t.pronostico), color: isLight ? '#075985' : '#0288d1' },
    { id: 'ggng', label: 'GG/NG', filter: t => t.tipo === 'GOL' && /^(goal|nogoal)$/i.test(t.pronostico), color: theme.success },
    { id: 'dc', label: 'DC', filter: t => t.tipo === 'DOPPIA_CHANCE', color: isLight ? '#9333ea' : '#ab47bc' },
    { id: 'mg', label: 'MG', filter: t => t.tipo === 'GOL' && /^mg\s/i.test(t.pronostico), color: isLight ? '#b45309' : '#f59e0b' },
    { id: 're', label: 'RE', filter: t => t.tipo === 'RISULTATO_ESATTO', color: isLight ? '#0891b2' : '#22d3ee' },
    { id: 'nobet', label: 'NO BET', filter: t => t.pronostico === 'NO BET', color: isLight ? '#dc2626' : '#ef4444' },
  ];

  // Funzione filtraggio mercato su prediction
  const predMatchesMarket = (p: Prediction): boolean => {
    if (marketFilter === 'tutti') return true;
    if (marketFilter === 'nobet') return !hasRealTip(p);
    const mf = MARKET_DEFS.find(m => m.id === marketFilter);
    if (!mf) return true;
    return p.pronostici?.some(mf.filter) ?? false;
  };

  // Definizioni gruppi source (per capsule origine)
  const SOURCE_DEFS: { id: string; label: string; color: string; match: (s: string) => boolean }[] = [
    { id: 'A',    label: 'A',    color: isLight ? '#c2410c' : '#f97316', match: s => s === 'A' },
    { id: 'C',    label: 'C',    color: isLight ? '#0e7490' : '#06b6d4', match: s => s === 'C' },
    { id: 'S',    label: 'S',    color: isLight ? '#7e22ce' : '#a855f7', match: s => s === 'S' },
    { id: 'A+S',  label: 'A+S',  color: isLight ? '#be185d' : '#ec4899', match: s => s === 'A+S' },
    { id: 'flip', label: 'Flip', color: isLight ? '#b91c1c' : '#ef4444', match: s => s.includes('flip') },
    { id: 'mg',   label: 'MG',   color: isLight ? '#b45309' : '#f59e0b', match: s => s.includes('_mg') },
    { id: 'c96',  label: 'C96',  color: isLight ? '#047857' : '#10b981', match: s => s.includes('combo96') },
    { id: 'xd',   label: 'XD',   color: isLight ? '#4338ca' : '#6366f1', match: s => s.includes('xdraw') },
    { id: 'hw',   label: 'HW',   color: isLight ? '#15803d' : '#22c55e', match: s => s.includes('_hw') },
    { id: 's8f',  label: 'S8F',  color: isLight ? '#9333ea' : '#c084fc', match: s => s.includes('_screm') },
  ];

  // Funzione filtraggio source su prediction
  const predMatchesSource = (p: Prediction): boolean => {
    if (sourceFilter === 'tutti') return true;
    const sg = SOURCE_DEFS.find(s => s.id === sourceFilter);
    if (!sg) return true;
    return p.pronostici?.some((t: any) => sg.match(t.source || '')) ?? false;
  };

  // Reset filtri al cambio data
  useEffect(() => {
    setStatusFilter('tutte');
    setMarketFilter('tutti');
    setSourceFilter('tutti');
    setReHitFilter(false);
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

  // --- FETCH DATA (Unified + prediction_versions per partite ritirate) ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch parallelo: pronostici unified + versioni + P/L mensile
        const [predRes, versionsRes, monthlyRes] = await Promise.all([
          fetch(`${API_BASE}/simulation/daily-predictions-unified?date=${date}`),
          fetch(`${API_BASE}/prediction-versions?date=${date}`).catch(() => null),
          fetch(`${API_BASE}/simulation/monthly-pl?date=${date}`).catch(() => null),
        ]);

        // P/L mensile (tutti + elite + alto_rendimento)
        if (monthlyRes && monthlyRes.ok) {
          try {
            const mData = await monthlyRes.json();
            if (mData.success) {
              if (mData.giorno) setDailyPLData(mData.giorno);
              if (mData.sezioni) setMonthlyPLData(mData.sezioni);
              if (mData.totale) setTotalPLData(mData.totale);
            }
          } catch { /* ignore */ }
        }

        const predData = await predRes.json();
        const unified: Prediction[] = predData.success ? (predData.predictions || []) : [];

        // Merge: aggiungi partite ritirate da prediction_versions che non sono in unified
        if (versionsRes && versionsRes.ok) {
          try {
            const versData = await versionsRes.json();
            const versions = versData.versions || [];
            // Normalizza come fa il backend: lowercase + spazi → underscore
            const normalizeKey = (d: string, h: string, a: string) =>
              `${d}_${h.trim().toLowerCase().replace(/\s+/g, '_')}_${a.trim().toLowerCase().replace(/\s+/g, '_')}`;
            const unifiedKeys = new Set(unified.map(p => normalizeKey(p.date, p.home, p.away)));

            // Raggruppa versioni per match_key
            const versionsByMatch: Record<string, any[]> = {};
            for (const v of versions) {
              if (!versionsByMatch[v.match_key]) versionsByMatch[v.match_key] = [];
              versionsByMatch[v.match_key].push(v);
            }

            // Aggiungi partite che sono solo in prediction_versions (ritirate)
            // Solo se almeno una versione aveva pronostici (= è stata selezionata almeno una volta)
            for (const [matchKey, matchVersions] of Object.entries(versionsByMatch)) {
              if (unifiedKeys.has(matchKey)) continue;
              // Skip se nessuna versione ha mai avuto pronostici (mai entrata nella selezione)
              const everHadPicks = matchVersions.some((v: any) => v.pronostici && v.pronostici.length > 0);
              if (!everHadPicks) continue;
              // Prendi la versione più recente per i dati base
              const latest = matchVersions[matchVersions.length - 1];
              if (!latest) continue;
              // Crea entry fantasma con badge NO BET
              // Recupera i tipi di mercato che avevano pronostici nelle versioni precedenti
              const allPrevTypes = new Set<string>();
              for (const v of matchVersions) {
                for (const pr of (v.pronostici || [])) {
                  if (pr.tipo === 'SEGNO' || pr.tipo === 'DOPPIA_CHANCE') allPrevTypes.add('SEGNO');
                  else if (pr.tipo === 'GOL' || pr.tipo === 'RISULTATO_ESATTO') allPrevTypes.add('GOL');
                }
              }
              // Almeno SEGNO come fallback
              if (allPrevTypes.size === 0) allPrevTypes.add('SEGNO');

              const ghostPronostici: any[] = [];
              if (allPrevTypes.has('SEGNO')) ghostPronostici.push({ tipo: 'SEGNO', pronostico: 'NO BET', confidence: 0, stars: 0 });
              if (allPrevTypes.has('GOL')) ghostPronostici.push({ tipo: 'GOL', pronostico: 'NO BET', confidence: 0, stars: 0 });

              const ghostPred: Prediction = {
                date: latest.date || date,
                home: latest.home || matchKey.split('_')[1] || '?',
                away: latest.away || matchKey.split('_')[2] || '?',
                league: latest.league || '',
                match_time: latest.match_time || '',
                home_mongo_id: latest.home_mongo_id,
                away_mongo_id: latest.away_mongo_id,
                decision: 'NO_BET',
                pronostici: ghostPronostici,
                confidence_segno: 0,
                confidence_gol: 0,
                stars_segno: 0,
                stars_gol: 0,
                comment: 'Pronostico ritirato',
                odds: latest.odds || [...matchVersions].reverse().find((v: any) => v.odds)?.odds || { '1': 0, '2': 0, 'X': 0 },
                segno_dettaglio: {},
                gol_dettaglio: {},
              };
              unified.push(ghostPred);
            }
          } catch {
            // Errore parsing versioni — ignora silenziosamente
          }
        }

        setPredictions(unified);

      } catch (err: any) {
        console.error('Errore fetch pronostici unified:', err);
        setError(err.message || 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  // --- POLLING LIVE SCORES (per la data visualizzata) ---
  useEffect(() => {
    const mergeLive = <T extends { home: string; away: string }>(items: T[], scores: Array<{ home: string; away: string; live_score: string; live_status: string; live_minute: number }>): T[] =>
      items.map(item => {
        const live = scores.find(s => s.home === item.home && s.away === item.away);
        return live ? { ...item, live_score: live.live_score, live_status: live.live_status, live_minute: live.live_minute } : item;
      });

    const pollLive = async () => {
      try {
        const res = await fetch(`${API_BASE}/live-scores?date=${date}`);
        const data = await res.json();
        if (data.success && data.scores?.length > 0) {
          const scores = data.scores;
          setPredictions(prev => mergeLive(prev, scores));
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
    const handleClickOutside = (e: MouseEvent) => {
      // Non chiudere se il click è dentro un popover tip o bottone tip
      const target = e.target as HTMLElement;
      if (target.closest?.('[data-tip-area]')) return;
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <div style={{ height: '4px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden' }}>
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
      <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: label === 'Fattore Campo' ? 'none' : `1px solid ${theme.surface05}`, position: 'relative' }}>
        {/* Linea verticale divisoria - solo desktop */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            right: '105px',
            top: '25px',
            bottom: '12px',
            width: '1px',
            background: theme.borderSubtle
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
              background: favored ? theme.hitBg : theme.surface05,
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
          <div style={{ flex: 1, height: '6px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden', maxWidth: '500px', alignSelf: 'center' }}>
            <div style={{ height: '100%', width: `${affidabilita}%`, background: affColor, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '14px', color: affColor, fontWeight: 'bold', minWidth: '35px' }}>{affidabilita.toFixed(1)}</span>
        </div>
        
        {/* Barra squadra casa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', color: theme.text, width: '85px', minWidth: '85px', maxWidth: '85px', position: 'relative', top: '-2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeName}:</span>
          <div style={{ flex: 1, height: '6px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden', maxWidth: '500px' }}>
            <div style={{ height: '100%', width: `${homePct}%`, background: theme.cyan, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '14px', color: theme.text, fontWeight: 'bold', minWidth: '35px' }}>{typeof homeValue === 'number' ? homeValue.toFixed(1) : homeValue}</span>
          </div>
        
        {/* Barra squadra trasferta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: theme.text, width: '85px', minWidth: '85px', maxWidth: '85px', position: 'relative', top: '-2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayName}:</span>
          <div style={{ flex: 1, height: '6px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden', maxWidth: '500px', alignSelf: 'center' }}>
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
        <span style={{ width: '1px', height: '12px', background: theme.surface15 }} />
        <span style={{ color, fontWeight: 'bold', textAlign: 'right' }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: '4px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden' }}>
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
    if (hr < threshold * 0.5) return theme.missText;
    if (hr < threshold * 0.8) return theme.warning;
    if (hr < threshold) return isLight ? '#a3a723' : '#cddc39';
    if (hr < threshold * 1.4) return theme.financePositive;
    return isLight ? '#047857' : '#00c853';
  };

  // --- CALCOLO HIT DA LIVE SCORE (quando real_score non è ancora disponibile) ---
  const calculateHitFromScore = (score: string, pronostico: string, tipo: string): boolean | null => {
    if (!score) return null;
    const parts = score.split(':');
    if (parts.length !== 2) return null;
    const home = parseInt(parts[0]), away = parseInt(parts[1]);
    if (isNaN(home) || isNaN(away)) return null;
    const total = home + away;
    if (tipo === 'SEGNO') {
      const sign = home > away ? '1' : home === away ? 'X' : '2';
      return pronostico === sign;
    }
    if (tipo === 'DOPPIA_CHANCE') {
      const sign = home > away ? '1' : home === away ? 'X' : '2';
      if (pronostico === '1X') return sign === '1' || sign === 'X';
      if (pronostico === 'X2') return sign === 'X' || sign === '2';
      if (pronostico === '12') return sign === '1' || sign === '2';
      return null;
    }
    if (tipo === 'RISULTATO_ESATTO') {
      const normalized = pronostico.replace('-', ':');
      return `${home}:${away}` === normalized;
    }
    if (tipo === 'GOL') {
      const p = pronostico.toLowerCase();
      if (p.startsWith('over')) { const thr = parseFloat(pronostico.split(' ')[1]); return total > thr; }
      if (p.startsWith('under')) { const thr = parseFloat(pronostico.split(' ')[1]); return total < thr; }
      if (p === 'gg' || p === 'goal' || p === 'gol') return home > 0 && away > 0;
      if (p === 'ng' || p === 'no goal' || p === 'no gol' || p === 'nogoal') return home === 0 || away === 0;
      const mg = pronostico.match(/^MG\s+(\d+)-(\d+)/i);
      if (mg) return total >= parseInt(mg[1]) && total <= parseInt(mg[2]);
      return null;
    }
    return null;
  };

  const isMatchOver = (pred: { date: string; match_time: string; live_status?: string | null }): boolean => {
    if (pred.live_status === 'Finished') return true;
    if (pred.date && pred.match_time) {
      const kickoff = new Date(`${pred.date}T${pred.match_time}:00`);
      const minutesElapsed = (Date.now() - kickoff.getTime()) / (1000 * 60);
      if (minutesElapsed > 130) return true;
    }
    return false;
  };

  const getEffectiveScore = (pred: { date: string; match_time: string; real_score?: string | null; live_score?: string | null; live_status?: string | null }): string | null => {
    if (pred.real_score) return pred.real_score;
    if (pred.live_score && isMatchOver(pred)) return pred.live_score;
    return null;
  };

  const getEffectiveHit = (pred: { date: string; match_time: string; real_score?: string | null; live_score?: string | null; live_status?: string | null }, p: { hit?: boolean | null; pronostico: string; tipo: string }): boolean | null => {
    if (p.hit === true || p.hit === false) return p.hit;
    if (pred.real_score) return p.hit ?? null;
    if (pred.live_score && isMatchOver(pred)) return calculateHitFromScore(pred.live_score, p.pronostico, p.tipo);
    return null;
  };

  // --- HELPERS STATUS FILTRO ---
  const getMatchStatus = (item: { date: string; match_time: string; real_score?: string | null; live_status?: string | null }): 'finished' | 'live' | 'to_play' => {
    if (item.real_score != null) return 'finished';
    if (item.date && item.match_time) {
      const kickoff = new Date(`${item.date}T${item.match_time}:00`);
      const now = new Date();
      if (kickoff <= now) {
        const minutesElapsed = (now.getTime() - kickoff.getTime()) / (1000 * 60);
        if (minutesElapsed > 130) return 'finished';
      }
    }
    if (item.live_status === 'Finished') return 'finished';
    if (item.live_status === 'Live' || item.live_status === 'HT') return 'live';
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
    if (filter === 'centrate') return pred.pronostici?.some(p => getEffectiveHit(pred, p) === true) ?? false;
    if (filter === 'mancate') return pred.pronostici?.some(p => getEffectiveHit(pred, p) === false) ?? false;
    return true;
  };


  // --- HELPER: quota di un singolo pronostico ---
  const getPronosticoQuota = (p: any, pred: Prediction): number | null => {
    return p.quota || (p.tipo === 'SEGNO' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
      || (p.tipo === 'DOPPIA_CHANCE' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
      || (p.tipo === 'GOL' && pred.odds ? getGolQuota(p.pronostico, pred.odds) : null);
  };

  // --- PARTIZIONAMENTO: Pronostici (<=2.50) vs Alto Rendimento (>2.50) ---
  const allNormalPreds = useMemo(() => predictions.filter(p => !p.is_exact_score).map(p => {
    return p.pronostici && p.pronostici.length > 0 ? p : null;
  }).filter(Boolean) as typeof predictions, [predictions]);

  const normalPredictions = useMemo(() => {
    return allNormalPreds
      .map(p => {
        const lowQuota = p.pronostici?.filter(pr => {
          if (pr.tipo === 'RISULTATO_ESATTO') return false;
          const q = getPronosticoQuota(pr, p);
          const soglia = pr.tipo === 'DOPPIA_CHANCE' ? 2.00 : 2.51;
          return !q || q < soglia;
        }) || [];
        return lowQuota.length > 0 ? { ...p, pronostici: lowQuota } : null;
      })
      .filter(Boolean) as Prediction[];
  }, [allNormalPreds]);

  const altoRendimentoPreds = useMemo(() => {
    return allNormalPreds
      .map(p => {
        const highQuota = p.pronostici?.filter(pr => {
          if (pr.tipo === 'RISULTATO_ESATTO') return true;
          const q = getPronosticoQuota(pr, p);
          const soglia = pr.tipo === 'DOPPIA_CHANCE' ? 2.00 : 2.51;
          return q != null && q >= soglia;
        }) || [];
        return highQuota.length > 0 ? { ...p, pronostici: highQuota } : null;
      })
      .filter(Boolean) as Prediction[];
  }, [allNormalPreds]);

  const elitePredictions = useMemo(() => {
    return allNormalPreds
      .map(p => {
        const elitePronostici = p.pronostici?.filter((pr: any) => pr.elite === true) || [];
        return elitePronostici.length > 0 ? { ...p, pronostici: elitePronostici } : null;
      })
      .filter(Boolean) as Prediction[];
  }, [allNormalPreds]);

  const exactScorePredictions = useMemo(() => predictions.filter(p => p.is_exact_score), [predictions]);

  // --- RISULTATO ESATTO MC (admin-only bonus) ---
  const rePredictions = useMemo(() => {
    return predictions
      .filter(p => p.pronostici?.some((pr: any) => pr.tipo === 'RISULTATO_ESATTO'))
      .map(p => ({
        ...p,
        _rePreds: (p.pronostici || []).filter((pr: any) => pr.tipo === 'RISULTATO_ESATTO'),
      }));
  }, [predictions]);


  // --- DATI FILTRATI (status + mercato combinati) ---
  const reHitMatch = (p: Prediction): boolean => {
    if (!reHitFilter) return true;
    const es = getEffectiveScore(p);
    if (!es) return false;
    const ts = (p as any).simulation_data?.top_scores;
    return ts && ts.slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(es));
  };
  const filteredPredictions = normalPredictions
    .filter(p => statusFilter === 'tutte' || predMatchesFilter(p, statusFilter))
    .filter(predMatchesMarket)
    .filter(predMatchesSource)
    .filter(reHitMatch);
  const filteredExactScore = exactScorePredictions
    .filter(p => statusFilter === 'tutte' || predMatchesFilter(p, statusFilter));
  const filteredGroupedByLeague = filteredPredictions.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});
  const filteredAltoRendimento = altoRendimentoPreds
    .filter(p => statusFilter === 'tutte' || predMatchesFilter(p, statusFilter))
    .filter(predMatchesMarket)
    .filter(predMatchesSource)
    .filter(reHitMatch);
  const filteredAltoRendimentoByLeague = filteredAltoRendimento.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});
  const filteredElite = elitePredictions
    .filter(p => statusFilter === 'tutte' || predMatchesFilter(p, statusFilter))
    .filter(predMatchesMarket)
    .filter(predMatchesSource);
  const filteredEliteByLeague = filteredElite.reduce<Record<string, Prediction[]>>((acc, p) => {
    if (!acc[p.league]) acc[p.league] = [];
    acc[p.league].push(p);
    return acc;
  }, {});

  // --- CONTEGGI FILTRI (rispettano market filter) ---
  const filterCounts = useMemo(() => {
    const counts = { tutte: 0, live: 0, da_giocare: 0, finite: 0, centrate: 0, mancate: 0 };
    const source = activeTab === 'elite' ? elitePredictions : activeTab === 'pronostici' ? normalPredictions : altoRendimentoPreds;
    const marketFiltered = source.filter(p => hasRealTip(p)).filter(predMatchesMarket).filter(predMatchesSource);
    const countItem = (item: Prediction & { hit?: boolean | null }, mode: 'normal' | 're') => {
      counts.tutte++;
      const s = getMatchStatus(item);
      if (s === 'live') counts.live++;
      else if (s === 'to_play') counts.da_giocare++;
      else {
        counts.finite++;
        if (mode === 're') {
          const es = getEffectiveScore(item);
          if (es) {
            const hit = ((item as any).simulation_data?.top_scores || []).slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(es));
            if (hit) counts.centrate++;
            else counts.mancate++;
          }
        } else {
          item.pronostici?.forEach(p => {
            const h = getEffectiveHit(item, p);
            if (h === true) counts.centrate++;
            if (h === false) counts.mancate++;
          });
        }
      }
    };
    marketFiltered.forEach(p => countItem(p, 'normal'));
    return counts;
  }, [predictions, activeTab, marketFilter, sourceFilter]);

  // Set partite con RE (per icona 💎 admin)
  const reMatchKeys = useMemo(() => new Set(rePredictions.map(p => `${p.home}|${p.away}`)), [rePredictions]);

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
    const effScore = getEffectiveScore(pred);
    const reScoresForCard = new Set(
      (rePredictions.find(rp => rp.home === pred.home && rp.away === pred.away)?._rePreds || []).map((pr: any) => normalizeScore(pr.pronostico))
    );
    const effPredHit = effScore ? pred.pronostici?.some(p => {
      if (pred.real_score) return p.hit === true;
      return calculateHitFromScore(pred.live_score!, p.pronostico, p.tipo) === true;
    }) ?? null : null;
    const isNoBet = !hasRealTip(pred);
    const barColor = effScore ? (isNoBet ? theme.textDim : effPredHit ? theme.hitText : theme.missText) : getConfidenceColor(bestConf);
    const isCardExpanded = expandedCards.has(cardKey);
    const tipsKey = `${cardKey}-tips`;
    const isTipsOpen = expandedSections.has(tipsKey);
    const matchKey = `${pred.date}_${pred.home}_${pred.away}`;
    const isFinished = !!pred.match_finished || !!pred.real_score || pred.live_status === 'Finished';
    const canSee = canSeePrediction(matchKey) || isFinished;
    const matchId = `${pred.home}-${pred.away}-${pred.date}`;
    const currentAnalysisTab = analysisTab[matchId];
    const isPremiumLoaded = !!premiumAnalysis[matchId] || !!pred.analysis_premium;
    const isPremiumBusy = !!premiumLoading[matchId];
    const isDeepDiveLoaded = !!deepdiveAnalysis[matchId] || !!pred.analysis_deepdive;
    const isDeepDiveBusy = !!deepdiveLoading[matchId];
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
          body: JSON.stringify({ home: pred.home, away: pred.away, date: pred.date, isAdmin: 'true', section: activeTab === 'alto_rendimento' ? 'Alto Rendimento' : 'Pronostici' }),
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

    const fetchDeepDive = async (forceRefresh = false) => {
      if (isDeepDiveBusy) return;
      if (isDeepDiveLoaded && !forceRefresh) return;
      setDeepdiveLoading(prev => ({ ...prev, [matchId]: true }));
      try {
        const resp = await fetch(`${API_BASE}/chat/match-deepdive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ home: pred.home, away: pred.away, date: pred.date, league: pred.league || '', isAdmin: 'true', forceRefresh }),
        });
        const data = await resp.json();
        if (data.success) {
          // Normalizza: Mistral può salvare {type,text} invece di stringa
          const text = typeof data.analysis === 'string' ? data.analysis
            : data.analysis?.text || data.analysis?.content || JSON.stringify(data.analysis);
          setDeepdiveAnalysis(prev => ({ ...prev, [matchId]: text }));
        } else {
          setDeepdiveAnalysis(prev => ({ ...prev, [matchId]: `\u26a0\ufe0f ${data.error || 'Errore durante la ricerca web. Riprova tra qualche minuto.'}` }));
        }
      } catch (err) {
        console.error('DeepDive analysis error:', err);
        setDeepdiveAnalysis(prev => ({ ...prev, [matchId]: '\u26a0\ufe0f Connessione fallita. Verifica la connessione e riprova.' }));
      } finally {
        setDeepdiveLoading(prev => ({ ...prev, [matchId]: false }));
      }
    };

    return (
      <div
        key={cardKey}
        ref={(el) => { predCardRefs.current[cardKey] = el; }}
        style={{
          background: theme.panel,
          border: theme.panelBorder,
          borderRadius: '10px',
          padding: isMobile ? '6px 18px 6px 10px' : '8px 14px',
          marginBottom: '4px',
          position: 'relative',
          zIndex: isTipsOpen ? 50 : 'auto' as any,
          transition: 'background 0.15s'
        }}
        onMouseEnter={isLight ? (e) => { e.currentTarget.style.background = '#eee'; } : undefined}
        onMouseLeave={isLight ? (e) => { e.currentTarget.style.background = theme.panel; } : undefined}
      >
        {/* BARRA LATERALE */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: getMatchStatus(pred) === 'live' ? '#fbbf24' : barColor,
          animation: getMatchStatus(pred) === 'live' ? `${isMobile ? 'pulseBar' : 'pulseBarDesktop'} ${isMobile ? '1.5s' : '2.8s'} ease-in-out infinite` : undefined
        }} />

        {/* RIGA UNICA COMPATTA — click ovunque espande */}
        <div
          className="card-expand-row"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: isMobile ? '4px' : '8px', cursor: 'pointer' }}
          onClick={() => setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(cardKey)) next.delete(cardKey);
            else next.add(cardKey);
            return next;
          })}
        >
          {getMatchStatus(pred) === 'live' ? (
            <span style={{ fontSize: '13px', fontWeight: 900, flexShrink: 0, width: isMobile ? '32px' : '50px', textAlign: 'center', color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: pred.live_status !== 'HT' ? `${isMobile ? 'pulse' : 'pulseLiveScore'} 1.5s ease-in-out infinite` : undefined }}>
              {pred.live_status === 'HT' ? 'HT' : `${pred.live_minute || ''}'`}
            </span>
          ) : (
            <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0, width: isMobile ? '32px' : '50px', textAlign: 'center' }}>{isMobile ? pred.match_time : `🕐 ${pred.match_time}`}</span>
          )}

          {/* Squadre — larghezza naturale, si restringe se serve */}
          <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', marginRight: isMobile ? '35px' : undefined, ...(isMobile ? { maxWidth: 'calc(100% - 150px)' } : {}) }}>
            <img src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(isMobile ? { maxWidth: '80px', display: 'inline-block' } : {}) }}>
              {pred.home}
            </span>
            <span style={{ fontSize: '10px', color: theme.textDim, flexShrink: 0 }}>vs</span>
            <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(isMobile ? { maxWidth: '80px', display: 'inline-block' } : {}) }}>
              {pred.away}
            </span>
            <img src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>

          {/* Diamante RE + Risultato + Freccia — spinto a destra */}
          <div style={{ marginLeft: 'auto', marginRight: isMobile ? '-12px' : undefined, display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexShrink: 0 }}>
            {/* 💎 RE badge: pre-match = diamante, hit = diamante+check, miss = sparisce */}
            {reMatchKeys.has(`${pred.home}|${pred.away}`) && (() => {
              const reHit = effScore && (pred.pronostici || []).some((pr: any) => pr.tipo === 'RISULTATO_ESATTO' && normalizeScore(pr.pronostico) === normalizeScore(effScore));
              const reMiss = effScore && !reHit;
              if (reMiss) return null; // miss: diamante sparisce
              return reHit
                ? <span style={{ fontSize: isMobile ? '7px' : '8px', fontWeight: 700, color: theme.hitText, background: theme.hitBg, borderRadius: '3px', padding: '1px 3px 0.5px 3px', lineHeight: 1, height: '15.5px', display: 'inline-flex', alignItems: 'center', position: 'relative', top: '1.5px', border: `1px solid ${theme.hitBorder}` }}>💎✓RE</span>
                : <span style={{ fontSize: isMobile ? '9px' : '10px', lineHeight: 1, height: '16px', display: 'inline-flex', alignItems: 'center', position: 'relative', top: '1.5px' }}>💎</span>;
            })()}
            {effScore ? (
              <span style={{ fontSize: '13px', fontWeight: '900', color: isNoBet ? theme.textDim : effPredHit ? theme.hitText : theme.missText, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {effScore.replace(':', ' - ')}
                {!reMatchKeys.has(`${pred.home}|${pred.away}`) && ((pred as any).simulation_data?.top_scores || []).slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(effScore!)) &&
                  <span style={{ fontSize: isMobile ? '8px' : '9px', fontWeight: 700, color: theme.hitText, background: theme.hitBg, borderRadius: '3px', padding: '1px 3px', lineHeight: 1 }}>✓RE</span>}
              </span>
            ) : getMatchStatus(pred) === 'live' ? (
              <span style={{ fontSize: '13px', fontWeight: '900', color: pred.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: pred.live_status !== 'HT' ? `${isMobile ? 'pulse' : 'pulseLiveScore'} 1.5s ease-in-out infinite` : undefined, display: 'inline-block' }}>
                {pred.live_score ? pred.live_score.replace(':', ' - ') : '– : –'}
              </span>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: '900', color: theme.textDim }}>– : –</span>
            )}
            <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
        </div>

        {/* Badge "NB" (mobile: bollino tondo, desktop: rettangolino) al posto del tasto Tip */}
        {/* Guarda pronostici[] reali, non decision (che può essere stale dopo pre-match update) */}
        {!(pred.pronostici?.some((p: any) => p.pronostico && p.pronostico !== 'NO BET')) && (
        <div
          style={{
            position: 'absolute', top: isMobile ? '1px' : '4px', right: isMobile ? '90px' : '100px',
            zIndex: 5
          }}
        >
          {isMobile ? (
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e53e3e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#fff' }}>NB</span>
          ) : (
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: '#e53e3e', borderRadius: '4px', padding: '4px 10px' }}>NO BET</span>
          )}
        </div>
        )}
        {/* Badge "Tip" — solo per partite con pronostico */}
        {pred.pronostici?.some((p: any) => p.pronostico && p.pronostico !== 'NO BET') && (
        <div
          style={{
            position: 'absolute', top: isMobile ? '3px' : '4px', right: isMobile ? '84px' : '100px',
            zIndex: 5
          }}
          onClick={(e) => e.stopPropagation()}
          data-tip-area
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'baseline', gap: isMobile ? '3px' : '6px', cursor: 'pointer',
              background: isTipsOpen ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.06)',
              border: `1px solid ${isTipsOpen ? 'rgba(0,240,255,0.4)' : 'rgba(0,240,255,0.18)'}`,
              borderRadius: '4px', padding: isMobile ? '2px 2px' : '4px 7px',
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
              background: theme.popoverBg, border: '1px solid rgba(0,240,255,0.45)',
              borderRadius: '8px', padding: '8px 10px',
              boxShadow: `0 0 12px rgba(0,240,255,0.15), 0 6px 24px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.9)'}`,
              minWidth: '160px', whiteSpace: 'nowrap' as const
            }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', position: 'relative' }}>
                {!canSee && (
                  <div
                    onClick={(e) => { e.stopPropagation(); handleUnlock(pred); }}
                    style={{
                      position: 'absolute', inset: 0, zIndex: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', borderRadius: '4px',
                    }}
                    title="Sblocca pronostico"
                  >
                    <span style={{ fontSize: '16px' }}>🔒</span>
                  </div>
                )}
                <div style={{ filter: canSee ? 'none' : 'blur(6px)', pointerEvents: canSee ? 'auto' as const : 'none' as const, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {pred.pronostici?.map((p, i) => {
                  const isHit = getEffectiveHit(pred, p);
                  const pillBg = isHit === true ? theme.hitBg : isHit === false ? theme.missBg : theme.surface05;
                  const pillBorder = isHit === true ? theme.hitBorder : isHit === false ? theme.missBorder : theme.surface15;
                  const nameColor = isHit === true ? theme.hitText : isHit === false ? theme.missText : theme.cyan;
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
                      {activeTab !== 'elite' && p.elite && <span title="Elite" style={{ fontSize: '10px', marginLeft: '2px' }}>👑</span>}
                      {quota && <span style={{ fontWeight: '700', color: theme.quotaText }}>@{Number(quota).toFixed(2)}</span>}
                      {isHit !== null && <span>{isHit ? '✅' : '❌'}</span>}
                      <span
                        onClick={(e) => { e.stopPropagation(); sharePrediction({ home: pred.home, away: pred.away, league: pred.league, matchTime: pred.match_time, date: pred.date, pronostico: p.pronostico, tipo: p.tipo, quota: quota ? Number(quota) : undefined, confidence: p.confidence, hit: isHit }); }}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '4px', background: isLight ? 'rgba(0,119,204,0.12)' : 'rgba(6,182,212,0.15)', borderRadius: '4px', padding: '2px 4px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = isLight ? 'rgba(0,119,204,0.25)' : 'rgba(6,182,212,0.35)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isLight ? 'rgba(0,119,204,0.12)' : 'rgba(6,182,212,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        title="Condividi"
                      >
                        <img src="/share-icon.png" alt="" style={{ width: '14px', height: '14px', filter: isLight ? 'brightness(0) saturate(100%) invert(30%) sepia(90%) saturate(600%) hue-rotate(190deg)' : 'brightness(0) saturate(100%) invert(65%) sepia(90%) saturate(600%) hue-rotate(150deg)', verticalAlign: 'middle' }} />
                      </span>
                    </span>
                  );
                })}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* DETTAGLIO ESPANSO (identico a prima) */}
        {isCardExpanded && (
          <div style={{ marginTop: '10px', borderTop: `1px solid ${theme.surface05}`, paddingTop: '10px', animation: 'fadeIn 0.3s ease' }}>

            {/* Pronostici — sempre aperto, stile sobrio */}
            {(() => {
              const segnoPreds = pred.pronostici?.filter(p => p.tipo === 'SEGNO' || p.tipo === 'DOPPIA_CHANCE') || [];
              const golPreds = pred.pronostici?.filter(p => p.tipo === 'GOL' || p.tipo === 'RISULTATO_ESATTO') || [];
              let pillCounter = 0;

              const renderPill = (p: typeof pred.pronostici[0], idx: number) => {
                const isFirstPill = pillCounter === 0;
                pillCounter++;
                const isHit = getEffectiveHit(pred, p);
                const pillBg = isHit === true ? theme.hitBgSoft : isHit === false ? theme.missBgSoft : (isLight ? '#e0f2fe' : 'rgba(17, 56, 93, 0.45)');
                const pillBorder = isHit === true ? theme.hitBorder : isHit === false ? theme.missBorder : (isLight ? '#7dd3fc' : 'rgba(17, 56, 93, 0.7)');
                const nameColor = isHit === true ? theme.hitText : isHit === false ? theme.missText : theme.cyan;
                const quota = p.quota || (p.tipo === 'SEGNO' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
                  || (p.tipo === 'DOPPIA_CHANCE' && pred.odds ? (pred.odds as any)[p.pronostico] : null)
                  || (p.tipo === 'GOL' && pred.odds ? getGolQuota(p.pronostico, pred.odds) : null);
                const source = (p as any).source;
                const pillKey = `${matchKey}_${p.tipo}_${p.pronostico}`;
                const isExpanded = versionOpen.has(pillKey);
                return (
                  <div key={idx} className={isFirstPill ? 'first-pronostico-pill' : ''} style={{ marginBottom: '3px' }}>
                    <div style={{
                      background: pillBg, border: `1px solid ${pillBorder}`,
                      borderRadius: isExpanded ? '5px 5px 0 0' : '5px', padding: '3px 8px',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      cursor: 'pointer',
                      ...(isMobile ? { flexWrap: 'wrap' as const } : {})
                    }}
                      onClick={(e) => { e.stopPropagation(); toggleVersionHistory(pillKey, matchKey); }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '800', color: nameColor }}>
                        {p.tipo === 'DOPPIA_CHANCE' ? `DC: ${p.pronostico}` : p.tipo === 'RISULTATO_ESATTO' ? `RE ${p.pronostico.replace(':', '-')}` : p.pronostico}
                      </span>
                      {activeTab !== 'elite' && p.elite && <span title="Elite" style={{ fontSize: '10px' }}>👑</span>}
                      <span style={{ fontSize: '10px', fontWeight: '700', color: getConfidenceColor(p.confidence) }}>{p.confidence?.toFixed(0)}%</span>
                      {quota && <span style={{ fontSize: '11px', fontWeight: '700', color: theme.quotaText }}>@{Number(quota).toFixed(2)}</span>}
                      {source && (
                        <span style={{
                          fontSize: '8px', fontWeight: '700',
                          color: source.includes('_screm') ? (isLight ? '#9333ea' : '#c084fc') : '#a78bfa',
                          background: source.includes('_screm') ? 'rgba(192,132,252,0.12)' : 'rgba(167,139,250,0.12)',
                          borderRadius: '3px', padding: '1px 4px',
                        }}>
                          {source.includes('_screm') ? 'S8F' : source}
                        </span>
                      )}
                      {isAdmin && p.edge != null && p.edge > 0 && (
                        <span style={{ fontSize: '8px', color: theme.textFaint }} title={`Prob: ${p.probabilita_stimata}% | Mkt: ${p.prob_mercato}% | Mod: ${p.prob_modello}%`}>
                          E:+{p.edge?.toFixed(1)}%
                        </span>
                      )}
                      {p.stake != null && p.stake > 0 && (
                        <span style={{
                          fontSize: '9px', fontWeight: '800', color: getStakeColor(p.stake),
                          background: theme.surface05, borderRadius: '3px', padding: '1px 4px',
                        }} title={`Stake: ${p.stake}/10 (${getStakeLabel(p.stake)})`}>
                          Stake:{p.stake}
                        </span>
                      )}
                      <span
                        className={isFirstPill ? 'first-pill-arrow' : ''}
                        onClick={(e) => { e.stopPropagation(); toggleVersionHistory(pillKey, matchKey); }}
                        style={{
                          fontSize: '8px', color: theme.textDim, cursor: 'pointer',
                          transition: 'transform 0.2s', display: 'inline-block',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          opacity: 0.6, marginLeft: '5px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                        title="Storico versioni"
                      >▼</span>
                      {isHit !== null && <span style={{ fontSize: '11px', marginLeft: 'auto' }}>{isHit ? '✅' : '❌'}</span>}
                      {!effScore && quota && (
                        <span
                          onClick={(e) => { e.stopPropagation(); setAddBetPopup({isOpen: true, home: pred.home, away: pred.away, market: p.tipo, prediction: p.pronostico, odds: Number(quota), confidence: p.confidence, probabilitaStimata: (p as any).probabilita_stimata, systemStake: p.stake}); }}
                          style={{ fontSize: '11px', cursor: 'pointer', color: theme.gold, marginLeft: isHit !== null ? '4px' : 'auto', opacity: 0.7, transition: 'opacity 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                          title="Salva nel Tracker"
                        >💰+</span>
                      )}
                    </div>
                    {/* Storico inline sotto la pill */}
                    {isExpanded && (
                      <div style={{
                        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${pillBorder}`, borderTop: 'none',
                        borderRadius: '0 0 5px 5px', padding: '6px 8px',
                      }}>
                        {versionLoading.has(matchKey) ? (
                          <div style={{ fontSize: '10px', color: theme.textDim }}>Caricamento...</div>
                        ) : (versionCache[matchKey] || []).length === 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${theme.surface05}` }}>
                                <th style={{ textAlign: 'left', padding: '2px 4px', color: theme.textDim, fontWeight: 600 }}>Pronostico</th>
                                <th style={{ textAlign: 'left', padding: '2px 4px', color: theme.textDim, fontWeight: 600 }}>Versione</th>
                                <th style={{ textAlign: 'center', padding: '2px 4px', color: theme.textDim, fontWeight: 600 }}>Stake</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td style={{ padding: '3px 4px', color: theme.cyan, fontWeight: 700 }}>{p.pronostico}</td>
                                <td style={{ padding: '3px 4px', color: theme.cyan, fontWeight: 700 }}>Attuale</td>
                                <td style={{ padding: '3px 4px', textAlign: 'center', color: theme.text, fontWeight: 600 }}>{p.stake || '—'}</td>
                              </tr>
                            </tbody>
                          </table>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${theme.surface05}` }}>
                                <th style={{ textAlign: 'left', padding: '2px 4px', color: theme.textDim, fontWeight: 600 }}>Pronostico</th>
                                <th style={{ textAlign: 'left', padding: '2px 4px', color: theme.textDim, fontWeight: 600 }}>Versione</th>
                                <th style={{ textAlign: 'center', padding: '2px 4px', color: theme.textDim, fontWeight: 600 }}>Stake</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Tutte le versioni ordinate: più recente prima
                                const allVersions = (versionCache[matchKey] || [])
                                  .slice()
                                  .sort((a: any, b: any) => {
                                    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                                    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                                    return tb - ta;
                                  });
                                const rows: React.ReactNode[] = [];
                                allVersions.forEach((doc: any, verIdx: number) => {
                                  const ver = doc.version || 'nightly';
                                  const isNB = doc.status === 'NO_BET' || !doc.pronostici?.length;
                                  const isCurrent = verIdx === 0;
                                  const ts = doc.created_at ? new Date(doc.created_at) : null;
                                  const tsLabel = ts ? `${ts.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ${ts.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : '';
                                  // Label versione
                                  let verTypeLabel = 'Notte';
                                  if (ver.startsWith('nightly')) verTypeLabel = 'Notte';
                                  else if (ver === 'update_3h') verTypeLabel = '-3h';
                                  else if (ver === 'update_1h') verTypeLabel = '-1h';
                                  const verLabel = isCurrent ? `Attuale${tsLabel ? ` (${tsLabel})` : ''}` : `${verTypeLabel}${tsLabel ? ` · ${tsLabel}` : ''}`;
                                  if (isNB) {
                                    rows.push(
                                      <tr key={`${ver}_${verIdx}`} style={{ borderBottom: `1px solid ${theme.surface05}` }}>
                                        <td style={{ padding: '3px 4px', color: theme.danger, fontWeight: 700 }}>NO BET</td>
                                        <td style={{ padding: '3px 4px', color: isCurrent ? theme.cyan : theme.textDim, fontWeight: isCurrent ? 700 : 400 }}>{verLabel}</td>
                                        <td style={{ padding: '3px 4px', textAlign: 'center', color: theme.textDim, fontWeight: 600 }}>—</td>
                                      </tr>
                                    );
                                  } else {
                                    const isSegnoCol = p.tipo === 'SEGNO' || p.tipo === 'DOPPIA_CHANCE';
                                    const filtered = (doc.pronostici || []).filter((pr: any) =>
                                      isSegnoCol ? (pr.tipo === 'SEGNO' || pr.tipo === 'DOPPIA_CHANCE') : (pr.tipo === 'GOL' || pr.tipo === 'RISULTATO_ESATTO')
                                    );
                                    if (filtered.length === 0) {
                                      rows.push(
                                        <tr key={`${ver}_${verIdx}`} style={{ borderBottom: `1px solid ${theme.surface05}` }}>
                                          <td style={{ padding: '3px 4px', color: theme.textDim, fontWeight: 700 }}>—</td>
                                          <td style={{ padding: '3px 4px', color: isCurrent ? theme.cyan : theme.textDim, fontWeight: isCurrent ? 700 : 400 }}>{verLabel}</td>
                                          <td style={{ padding: '3px 4px', textAlign: 'center', color: theme.textDim, fontWeight: 600 }}>—</td>
                                        </tr>
                                      );
                                    }
                                    filtered.forEach((pr: any, prIdx: number) => {
                                      rows.push(
                                        <tr key={`${ver}_${verIdx}_${prIdx}`} style={{ borderBottom: `1px solid ${theme.surface05}` }}>
                                          <td style={{ padding: '3px 4px', color: theme.cyan, fontWeight: 700 }}>{pr.pronostico || '—'}{pr.elite && <span title="Elite" style={{ fontSize: '9px', marginLeft: '3px' }}>👑</span>}</td>
                                          <td style={{ padding: '3px 4px', color: isCurrent ? theme.cyan : theme.textDim, fontWeight: isCurrent ? 700 : 400 }}>{prIdx === 0 ? verLabel : ''}</td>
                                          <td style={{ padding: '3px 4px', textAlign: 'center', color: theme.text, fontWeight: 600 }}>{pr.stake || '—'}</td>
                                        </tr>
                                      );
                                    });
                                  }
                                });
                                return rows;
                              })()}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                {/* Capsula nomi squadre */}
                <div style={{
                  marginLeft: '8px', marginBottom: '6px',
                  padding: isMobile ? '8px 10px' : '10px 16px',
                  background: isLight
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(241,245,249,0.95))'
                    : 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.8))',
                  border: `1px solid ${isLight ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)'}`,
                  borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: 500, color: theme.textDim, letterSpacing: '0.3px' }}>{pred.match_time} · {pred.league}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '6px' : '10px' }}>
                    <img src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt="" style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 700, color: theme.text }}>{pred.home}</span>
                    <span style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 500, color: theme.textDim }}>vs</span>
                    <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 700, color: theme.text }}>{pred.away}</span>
                    <img src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt="" style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                </div>
                <div style={{
                  marginLeft: '8px', marginBottom: '8px',
                  padding: '10px 12px',
                  background: 'rgba(140, 90, 0, 0.22)',
                  border: '2px solid rgba(140, 90, 0, 0.35)',
                  borderRadius: '8px',
                  position: 'relative',
                }}>
                  {/* Titolo centrato */}
                  <div style={{ fontSize: '12px', fontWeight: 800, color: isLight ? '#b45309' : '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '8px', textAlign: 'center' as const }}>
                    Pronostici
                  </div>
                  {/* Lock overlay */}
                  {!canSee && (
                    <div
                      onClick={(e) => { e.stopPropagation(); handleUnlock(pred); }}
                      style={{
                        position: 'absolute', inset: 0, zIndex: 2, borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', background: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      <span style={{ fontSize: '24px', marginBottom: '4px' }}>🔒</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isLight ? '#b45309' : '#fbbf24' }}>
                        Sblocca con {predictionCost} crediti
                      </span>
                    </div>
                  )}
                  {/* Tabella 2 colonne */}
                  <div style={{ display: 'flex', gap: '8px', filter: canSee ? 'none' : 'blur(6px)', pointerEvents: canSee ? 'auto' as const : 'none' as const }}>
                    {/* Colonna SEGNO */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Segno:</div>
                      {segnoPreds.length > 0 ? segnoPreds.map((p, i) => renderPill(p, i)) : (
                        <div style={{ fontSize: '10px', color: theme.surface15, padding: '4px 0' }}>—</div>
                      )}
                    </div>
                    {/* Separatore verticale */}
                    <div style={{ width: '1px', background: theme.surface05, alignSelf: 'stretch' }} />
                    {/* Colonna GOL */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', color: theme.textDim, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Gol:</div>
                      {golPreds.length > 0 ? golPreds.map((p, i) => renderPill(p, i)) : (
                        <div style={{ fontSize: '10px', color: theme.surface15, padding: '4px 0' }}>—</div>
                      )}
                    </div>
                  </div>
                </div>
                </>
              );
            })()}
            {/* Shield Badge + Attivazione */}
            {canSee && !canSeeAll && purchasedMatches.has(matchKey) && (
              <div style={{ marginLeft: '8px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {shieldedMatches.has(matchKey) ? (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, color: '#f0c040',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '4px',
                    background: 'rgba(240,192,64,0.12)', border: '1px solid rgba(240,192,64,0.2)',
                  }}>
                    Protetto
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); activateShield(matchKey, pred.home, pred.away); }}
                    disabled={(shields ?? 0) < 1}
                    style={{
                      fontSize: '11px', fontWeight: 600, cursor: (shields ?? 0) < 1 ? 'default' : 'pointer',
                      color: (shields ?? 0) < 1 ? theme.textDim : '#f0c040',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '4px',
                      background: (shields ?? 0) < 1 ? theme.surface05 : 'rgba(240,192,64,0.08)',
                      border: `1px solid ${(shields ?? 0) < 1 ? theme.surface15 : 'rgba(240,192,64,0.2)'}`,
                      fontFamily: 'inherit',
                    }}
                    title={(shields ?? 0) < 1 ? 'Nessun Shield disponibile' : 'Se il pronostico perde, crediti rimborsati'}
                  >
                    Attiva Shield ({shields ?? 0})
                  </button>
                )}
              </div>
            )}

            {/* Banner Aggiornamento Pronostico (casi A/B/C/D) */}
            {canSee && !canSeeAll && purchasedMatches.has(matchKey) && (() => {
              const snap = purchaseSnapshots[matchKey]?.pronostici;
              if (!snap || snap.length === 0) return null;
              const currentTips = pred.pronostici || [];
              // Caso C: pronostico ritirato (partita non più in daily_predictions_unified)
              if (currentTips.length === 0) {
                return (
                  <div style={{ marginLeft: '8px', marginBottom: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '12px', color: theme.danger, fontWeight: 700, marginBottom: '4px' }}>
                      {snap.map((s: any) => s.pronostico).join(', ')} — <s>Stake {snap[0]?.stake}</s> → NO BET
                    </div>
                    <div style={{ fontSize: '11px', color: theme.textDim, lineHeight: 1.5 }}>
                      Questo pronostico è stato ritirato. I tuoi {predictionCost} crediti sono stati rimborsati automaticamente.
                    </div>
                  </div>
                );
              }
              // Confronta tip principale
              const snapMain = snap[0];
              const currMain = currentTips[0];
              if (!snapMain || !currMain) return null;
              const tipChanged = snapMain.pronostico !== currMain.pronostico;
              const stakeChanged = snapMain.stake !== currMain.stake;
              if (!tipChanged && !stakeChanged) return null; // Caso D: nessuna modifica
              if (tipChanged) {
                // Caso A: pronostico cambiato
                return (
                  <div style={{ marginLeft: '8px', marginBottom: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '12px', color: theme.cyan, fontWeight: 700, marginBottom: '4px' }}>
                      <s>{snapMain.pronostico} — Stake {snapMain.stake}</s> → <strong>{currMain.pronostico} — Stake {currMain.stake}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.textDim, lineHeight: 1.5 }}>
                      Il pronostico è stato aggiornato con dati più recenti. Puoi scegliere quale versione seguire — consigliamo quella aggiornata. Nessun rimborso previsto per aggiornamenti del tip.
                    </div>
                  </div>
                );
              }
              // Caso B: solo stake cambiato
              return (
                <div style={{ marginLeft: '8px', marginBottom: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontSize: '12px', color: isLight ? '#b45309' : '#fbbf24', fontWeight: 700, marginBottom: '4px' }}>
                    <s>Stake: {snapMain.stake}</s> → <strong>Stake: {currMain.stake}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textDim, lineHeight: 1.5 }}>
                    La fiducia del sistema su questo pronostico è cambiata. Si consiglia di rivalutare l'importo della puntata.
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
                  <div style={{ fontSize: '11px', color: theme.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                    Quote
                  </div>
                  <div style={{ display: 'flex', gap: '10px', color: theme.textDim, flexWrap: 'wrap', fontSize: '12px' }}>
                    <span>1: <span style={{ color: theme.text, fontWeight: 700 }}>{pred.odds?.['1'] != null ? Number(pred.odds['1']).toFixed(2) : '-'}</span></span>
                    <span>X: <span style={{ color: theme.text, fontWeight: 700 }}>{pred.odds?.['X'] != null ? Number(pred.odds['X']).toFixed(2) : '-'}</span></span>
                    <span>2: <span style={{ color: theme.text, fontWeight: 700 }}>{pred.odds?.['2'] != null ? Number(pred.odds['2']).toFixed(2) : '-'}</span></span>
                    {pred.odds?.over_25 != null && <>
                      <span style={{ color: theme.surface15 }}>│</span>
                      <span>O2.5: <span style={{ color: theme.text, fontWeight: 700 }}>{Number(pred.odds.over_25).toFixed(2)}</span></span>
                      <span>U2.5: <span style={{ color: theme.text, fontWeight: 700 }}>{Number(pred.odds.under_25).toFixed(2)}</span></span>
                    </>}
                    {pred.odds?.gg != null && <>
                      <span style={{ color: theme.surface15 }}>│</span>
                      <span>GG: <span style={{ color: theme.text, fontWeight: 700 }}>{Number(pred.odds.gg).toFixed(2)}</span></span>
                      <span>NG: <span style={{ color: theme.text, fontWeight: 700 }}>{Number(pred.odds.ng).toFixed(2)}</span></span>
                    </>}
                  </div>
                </div>
                {/* Separatore */}
                {hasAnalysis && <div style={isMobile ? { height: '2px', background: 'rgba(17, 56, 93, 0.6)' } : { width: '2px', background: 'rgba(17, 56, 93, 0.6)' }} />}
                {/* Parte destra — Bottoni Analisi */}
                {hasAnalysis && (
                  <div className="analysis-match-section" style={{ ...(isMobile ? {} : { flex: 1 }), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '6px 12px' : '8px 14px', gap: '6px', background: 'rgba(140, 90, 0, 0.22)' }}>
                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '1px', textShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>
                      Analisi Match
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
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
                        background: currentAnalysisTab === 'free'
                          ? (isLight ? '#cffafe' : 'rgba(6,182,212,0.4)')
                          : (isLight ? '#ecfeff' : 'rgba(6,182,212,0.15)'),
                        color: currentAnalysisTab === 'free'
                          ? (isLight ? '#0891b2' : '#fff')
                          : (isLight ? '#0891b2' : 'rgba(180,230,240,0.9)'),
                        border: currentAnalysisTab === 'free'
                          ? (isLight ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(6,182,212,0.7)')
                          : (isLight ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(6,182,212,0.3)'),
                        boxShadow: isLight ? 'none'
                          : (currentAnalysisTab === 'free' ? '0 0 12px rgba(6,182,212,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 0 6px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'),
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
                        background: currentAnalysisTab === 'premium'
                          ? (isLight ? '#ede9fe' : 'rgba(168,85,247,0.4)')
                          : (isLight ? '#f5f3ff' : 'rgba(168,85,247,0.15)'),
                        color: currentAnalysisTab === 'premium'
                          ? (isLight ? '#7c3aed' : '#fff')
                          : (isLight ? '#7c3aed' : 'rgba(210,180,250,0.9)'),
                        border: currentAnalysisTab === 'premium'
                          ? (isLight ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(168,85,247,0.7)')
                          : (isLight ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(168,85,247,0.3)'),
                        boxShadow: isLight ? 'none'
                          : (currentAnalysisTab === 'premium' ? '0 0 12px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 0 6px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'),
                      }}
                    >{(isAdmin || isPremiumUser) ? '🤖 Premium' : '🔒 Premium'}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalysisTab(prev => {
                          const next = { ...prev };
                          if (next[matchId] === 'deepdive') delete next[matchId];
                          else next[matchId] = 'deepdive';
                          return next;
                        });
                        if ((isAdmin || isPremiumUser) && !isDeepDiveBusy) fetchDeepDive();
                      }}
                      className={`analysis-tab-deepdive${currentAnalysisTab === 'deepdive' ? ' active' : ''}`}
                      style={{
                        cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                        padding: '6px 20px', borderRadius: '16px', whiteSpace: 'nowrap' as const,
                        background: currentAnalysisTab === 'deepdive'
                          ? (isLight ? '#d1fae5' : 'rgba(16,185,129,0.4)')
                          : (isLight ? '#ecfdf5' : 'rgba(16,185,129,0.15)'),
                        color: currentAnalysisTab === 'deepdive'
                          ? (isLight ? '#059669' : '#fff')
                          : (isLight ? '#059669' : 'rgba(110,231,183,0.9)'),
                        border: currentAnalysisTab === 'deepdive'
                          ? (isLight ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(16,185,129,0.7)')
                          : (isLight ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(16,185,129,0.3)'),
                        boxShadow: isLight ? 'none'
                          : (currentAnalysisTab === 'deepdive' ? '0 0 12px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 0 6px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'),
                      }}
                    >{(isAdmin || isPremiumUser) ? '🔎 Scout' : '🔒 Scout'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Score — risultati più probabili dalla simulazione */}
            {(pred as any).simulation_data?.top_scores && (() => {
              const isLive = !pred.real_score && (getMatchStatus(pred) === 'live' || (pred.live_status === 'Finished' && !!pred.live_score));
              return (
                <div style={{
                  marginTop: '0', marginBottom: '8px', marginLeft: '8px',
                  padding: '7px 12px',
                  background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15), rgba(30, 64, 175, 0.15))',
                  border: '1px solid rgba(5, 150, 105, 0.2)',
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                  filter: canSee ? 'none' : 'blur(5px)', userSelect: canSee ? 'auto' as const : 'none' as const,
                }}>
                  <span style={{ fontSize: '11px', color: theme.textDim, fontWeight: 600 }}>Top Score:</span>
                  {((pred as any).simulation_data.top_scores as Array<[string, number]>).slice(0, 3).map(([score, count], i, arr) => {
                    const normS = normalizeScore(score);
                    const es = getEffectiveScore(pred);
                    const reHit = es && normS === normalizeScore(es);
                    const liveHit = !es && isLive && pred.live_score && normS === normalizeScore(pred.live_score);
                    const isRePick = reScoresForCard.has(normS);
                    return (
                      <span key={i} style={{
                        fontSize: '13px',
                        color: reHit ? theme.success : liveHit ? theme.success : isRePick ? theme.warning : theme.textDim,
                        fontWeight: 600,
                        animation: liveHit ? 'pulse 1.5s ease-in-out infinite' : undefined,
                        ...(isRePick ? {
                          background: 'rgba(255,152,0,0.12)',
                          border: '1px solid rgba(255,152,0,0.35)',
                          borderRadius: '5px',
                          padding: '2px 7px',
                        } : {}),
                      }}>
                        {isRePick && '💎 '}{score} ({count}){reHit ? ' ✅' : ''}{i < arr.length - 1 ? '  ·' : ''}
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
                        background: theme.surface15,
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
                      border: currentAnalysisTab === 'free'
                        ? (isLight ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(6,182,212,0.6)')
                        : `1px solid ${theme.surface15}`,
                      cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                      background: currentAnalysisTab === 'free'
                        ? (isLight ? '#cffafe' : 'rgba(6,182,212,0.25)')
                        : theme.surface05,
                      color: currentAnalysisTab === 'free' ? (isLight ? '#0891b2' : theme.cyan) : theme.textDim,
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
                      border: currentAnalysisTab === 'premium'
                        ? (isLight ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(168,85,247,0.6)')
                        : `1px solid ${theme.surface15}`,
                      cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                      background: currentAnalysisTab === 'premium'
                        ? (isLight ? '#ede9fe' : 'rgba(168,85,247,0.25)')
                        : theme.surface05,
                      color: currentAnalysisTab === 'premium' ? (isLight ? '#7c3aed' : theme.purple) : theme.textDim,
                    }}
                  >{(isAdmin || isPremiumUser) ? 'Analisi AI Premium' : '🔒 Premium'}</button>
                  <button
                    className={`analysis-tab-deepdive${currentAnalysisTab === 'deepdive' ? ' active' : ''}`}
                    onClick={() => {
                      setAnalysisTab(prev => ({ ...prev, [matchId]: 'deepdive' }));
                      if ((isAdmin || isPremiumUser) && !isDeepDiveBusy) fetchDeepDive();
                    }}
                    style={{
                      padding: '4px 14px', borderRadius: '12px',
                      border: currentAnalysisTab === 'deepdive'
                        ? (isLight ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(16,185,129,0.6)')
                        : `1px solid ${theme.surface15}`,
                      cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                      background: currentAnalysisTab === 'deepdive'
                        ? (isLight ? '#d1fae5' : 'rgba(16,185,129,0.25)')
                        : theme.surface05,
                      color: currentAnalysisTab === 'deepdive' ? (isLight ? '#059669' : '#6ee7b7') : theme.textDim,
                    }}
                  >{(isAdmin || isPremiumUser) ? '🔎 Scout' : '🔒 Scout'}</button>
                </div>

                {/* Contenuto */}
                {currentAnalysisTab === 'free' && (
                  <div style={{
                    fontSize: '11px', lineHeight: '1.7', color: theme.text,
                    padding: '8px 10px', whiteSpace: 'pre-wrap' as const,
                    background: theme.surfaceSubtle, borderRadius: '4px',
                  }}>
                    {blurPronostici(pred.analysis_free || '', (pred.pronostici || []).map((pr: any) => pr.pronostico as string).filter(Boolean), canSee)}
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
                      <div style={{ textAlign: 'center', padding: '12px', color: theme.purple }}>
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

                {currentAnalysisTab === 'deepdive' && (
                  <div style={{
                    fontSize: '11px', lineHeight: '1.7', color: theme.text,
                    padding: '8px 10px',
                    background: isLight ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.06)',
                    borderRadius: '4px',
                    border: '1px solid rgba(16,185,129,0.1)',
                  }}>
                    {(!isAdmin && !isPremiumUser) ? (
                      <div style={{ textAlign: 'center', padding: '12px', color: theme.textDim }}>
                        🔒 Disponibile nella versione Premium
                      </div>
                    ) : isDeepDiveBusy ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: isLight ? '#059669' : '#6ee7b7' }}>
                        <div>🔎 Ricerca web in corso...</div>
                        <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '4px' }}>
                          Potrebbero servire 15-30 secondi
                        </div>
                      </div>
                    ) : isDeepDiveLoaded ? (
                      <div>
                        <div style={{ whiteSpace: 'pre-wrap' as const }}>{(() => {
                          const raw: any = deepdiveAnalysis[matchId] || pred.analysis_deepdive;
                          return typeof raw === 'string' ? raw : raw?.text || raw?.content || '';
                        })()}</div>
                        <div style={{ textAlign: 'right' as const, marginTop: '8px' }}>
                          <span
                            onClick={(e) => { e.stopPropagation(); fetchDeepDive(true); }}
                            style={{
                              cursor: 'pointer', fontSize: '10px', color: theme.textDim,
                              padding: '2px 8px', borderRadius: '8px',
                              border: `1px solid ${theme.surface15}`,
                            }}
                          >🔄 Aggiorna</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px', color: theme.textDim, fontSize: '11px' }}>
                        🔎 Avvio ricerca web...
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
              const isLive = !pred.real_score && (getMatchStatus(pred) === 'live' || (pred.live_status === 'Finished' && !!pred.live_score));
              const renderMCBar = (label: string, values: Array<{ name: string; pct: number; color: string }>) => (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.textDim, marginBottom: '4px', fontWeight: 600 }}>{label}</div>
                  <div style={{ display: 'flex', height: '22px', borderRadius: '4px', overflow: 'hidden', background: theme.surface05 }}>
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
                    className="collapsible-header stochastic-engine-header"
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
                        { name: 'GG', pct: sim.gg_pct, color: theme.quotaText },
                        { name: 'NG', pct: sim.ng_pct, color: '#f06292' },
                      ])}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ textAlign: 'center', filter: canSee ? 'none' : 'blur(5px)', userSelect: canSee ? 'auto' as const : 'none' as const }}>
                          <div style={{ fontSize: '10px', color: theme.textDim }}>Score Predetto</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: theme.orange }}>{sim.predicted_score}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: theme.textDim }}>Media Gol</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text }}>
                            🏠 {sim.avg_goals_home} — ✈️ {sim.avg_goals_away}
                          </div>
                        </div>
                        <div style={{ filter: canSee ? 'none' : 'blur(5px)', userSelect: canSee ? 'auto' as const : 'none' as const }}>
                          <div style={{ fontSize: '10px', color: theme.textDim, marginBottom: '2px' }}>Top Scores</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[...(sim.top_scores || [])].slice(0, 4).map(([score, count]: [string, number], i: number) => {
                              const normS = normalizeScore(score);
                              const es = getEffectiveScore(pred);
                              const isHit = es && normS === normalizeScore(es);
                              const isLiveHit = !es && isLive && pred.live_score && normS === normalizeScore(pred.live_score);
                              const highlighted = isHit || isLiveHit;
                              const isRePick = reScoresForCard.has(normS);
                              return (
                                <span key={i} style={{
                                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                  background: isRePick ? 'rgba(255,152,0,0.18)' : highlighted ? 'rgba(5, 249, 182, 0.2)' : i === 0 ? 'rgba(255, 107, 53, 0.2)' : theme.surface05,
                                  color: isRePick ? theme.warning : highlighted ? theme.success : i === 0 ? theme.orange : theme.textDim,
                                  border: isRePick ? '1px solid rgba(255,152,0,0.5)' : highlighted ? '1px solid rgba(5, 249, 182, 0.4)' : i === 0 ? '1px solid rgba(255, 107, 53, 0.3)' : `1px solid ${theme.surface08}`,
                                  animation: isLiveHit ? 'pulse 1.5s ease-in-out infinite' : undefined,
                                }}>
                                  {isRePick && '💎 '}{score} ({count}) {isHit ? '✅' : ''}
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
              borderTop: `1px solid ${theme.surfaceSubtle}`
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
                  className="detail-section-header"
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
                {(() => {
                  const tips = (pred.pronostici || []).map((pr: any) => pr.pronostico as string).filter(Boolean);
                  const bt = (text: string) => blurPronostici(text.replace(/BVS/g, 'MAP'), tips, canSee);
                  return typeof pred.comment === 'string'
                    ? <div>🔹 {bt(pred.comment)}</div>
                    : <>
                        {pred.comment?.segno && <div>🔹 {bt(pred.comment.segno)}</div>}
                        {pred.comment?.gol && <div style={{ marginTop: '4px' }}>🔹 {bt(pred.comment.gol)}</div>}
                        {pred.comment?.doppia_chance && <div style={{ marginTop: '4px' }}>🔹 {bt(pred.comment.doppia_chance)}</div>}
                        {pred.comment?.gol_extra && <div style={{ marginTop: '4px' }}>🔹 {bt(pred.comment.gol_extra)}</div>}
                      </>;
                })()}
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
                        vittorie: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -3, '9': -5},
                        sconfitte: {'2': -1, '3': -2, '4': -3, '5': 0, '6': 1, '7': 2, '8': 3, '9': 5},
                        imbattibilita: {'3': 1, '4': 1, '5': 2, '6': 2, '7': 0, '8': 0, '9': -1, '10': -2, '11': -3, '12': -5},
                        pareggi: {'2': -1, '3': -1, '4': -2, '5': -3, '6': -2, '7': -1, '8': -2},
                        senza_vittorie: {'3': -1, '4': -1, '5': -2, '6': -2, '7': 0, '8': 0, '9': 1, '10': 2, '11': 3, '12': 4},
                        over25: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -4},
                        under25: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -4},
                        gg: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -4},
                        clean_sheet: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -4},
                        senza_segnare: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -4},
                        gol_subiti: {'2': 1, '3': 2, '4': 3, '5': 0, '6': -1, '7': -2, '8': -4},
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
                                    background: active ? TICK_COLORS[i] : theme.surface08,
                                    border: active ? 'none' : `1px solid ${theme.surface05}`,
                                    boxSizing: 'border-box' as const,
                                  }} />
                                  <span style={{
                                    fontSize: '5px',
                                    color: active ? TICK_COLORS[i] : theme.surface15,
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
                        sconfitte:      { home: ['1', '1X'], away: ['2', 'X2'] },
                        imbattibilita:  { home: ['1', 'X', '1X'], away: ['2', 'X', 'X2'] },
                        pareggi:        { home: ['X'], away: ['X'] },
                        senza_vittorie: { home: ['1', '1X'], away: ['2', 'X2'] },
                      };
                      const SUPPORTS_GOL: Record<string, string[]> = {
                        over25: ['Over'], under25: ['Under'],
                        gg: ['GG'], clean_sheet: ['NG'], senza_segnare: ['Under'], gol_subiti: ['Over'],
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
                              {insights.slice(0, 4).map((ins, i) => {
                                const tips = [segnoTip?.pronostico, golTip?.pronostico].filter(Boolean) as string[];
                                return (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '2px' }}>
                                  <span style={{ flexShrink: 0, fontSize: '10px' }}>{ins.isGood ? '✅' : '⚠️'}</span>
                                  <span style={{ color: ins.isGood ? theme.success : theme.warning }}>{blurPronostici(ins.text, tips, canSee)}</span>
                                </div>
                                );
                              })}
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
                                  <span style={{ color: theme.textDim }}>Le strisce confermano <span style={{ color: theme.cyan, fontWeight: 'bold', filter: canSee ? 'none' : 'blur(5px)', userSelect: canSee ? 'auto' as const : 'none' as const }}>{segnoTip.pronostico}</span>?</span>
                                  <span style={{ color, fontWeight: 'bold' }}>{val.toFixed(1)}</span>
                                </div>
                                <div style={{ height: '4px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden' }}>
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
                                  <span style={{ color: theme.textDim }}>Le strisce confermano <span style={{ color: theme.cyan, fontWeight: 'bold', filter: canSee ? 'none' : 'blur(5px)', userSelect: canSee ? 'auto' as const : 'none' as const }}>{golTip.pronostico}</span>?</span>
                                  <span style={{ color, fontWeight: 'bold' }}>{val.toFixed(1)}</span>
                                </div>
                                <div style={{ height: '4px', background: theme.surface08, borderRadius: '2px', overflow: 'hidden' }}>
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
                    background: `linear-gradient(90deg, transparent 0%, ${theme.surface15} 15%, ${theme.surface15} 85%, transparent 100%)`,
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


  // --- RENDER PRINCIPALE ---
  return (
    <div ref={mainContainerRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'transparent',
      backgroundImage: isLight
        ? 'none'
        : isMobile
          ? 'radial-gradient(circle at 50% 0%, rgba(42,45,74,0.3) 0%, transparent 70%)'
          : 'radial-gradient(circle at 50% 0%, rgba(26,29,46,0.3) 0%, transparent 70%)',
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
        @keyframes pulseLiveScore { 0% { opacity: 0.4; color: #c53030; } 50% { opacity: 1; color: #ff3333; text-shadow: 0 0 8px #ff3333; } 100% { opacity: 0.4; color: #c53030; } }
        @keyframes pulseBar { 0% { background: #7a4d00; } 50% { background: #fbbf24; } 100% { background: #7a4d00; } }
        @keyframes pulseBarDesktop { 0% { background: #f0d030; } 50% { background: #fff44f; box-shadow: 0 0 10px #fff44f, 0 0 3px #fff44f; } 100% { background: #f0d030; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-dot { 0%, 100% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }
        .capsula-main-cyan::before, .capsula-main-gold::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          padding: 1px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
        }
        .capsula-main-cyan::before {
          background: linear-gradient(135deg, rgba(0,188,212,0.8) 0%, rgba(0,188,212,0.35) 8%, transparent 14%);
        }
        .capsula-main-gold::before {
          background: linear-gradient(135deg, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0.35) 8%, transparent 14%);
        }
        .analysis-tab-free, .analysis-tab-premium, .analysis-tab-deepdive {
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
        .analysis-tab-deepdive:hover {
          background: rgba(16, 185, 129, 0.35) !important;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.2);
          transform: scale(1.04);
        }
        .analysis-tab-deepdive.active {
          border: 1px solid rgba(16, 185, 129, 0.6) !important;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.4), 0 0 16px rgba(16, 185, 129, 0.15);
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '800px', paddingBottom: '40px' }}>

        {/* HEADER STICKY (solo mobile) */}
        <div style={{
          ...(isMobile ? {
            position: 'sticky' as const,
            top: -16,
            zIndex: 100,
            backgroundColor: isLight ? '#f0f2f5' : '#1a1d2e',
            margin: '-15px -15px 0',
            padding: '14px 15px 10px',
            borderBottom: isLight ? '2px solid rgba(0,120,212,0.35)' : '2px solid rgba(0,240,255,0.25)',
            borderRadius: '0 0 12px 12px',
          } : {})
        }}>

        {/* MOBILE: riga unica bottone + titolo */}
        {isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <button
              data-tour="bp-back-dashboard"
              onClick={onBack}
              style={{
                background: theme.surface05,
                border: `1px solid ${theme.borderSubtle}`,
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
              <LogoVirgo size={24} style={{ marginRight: 5 }} />
              <span style={{
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}> Best Picks</span>
            </h1>
            <button
              onClick={() => window.location.href = '/bankroll'}
              style={{
                background: theme.surface05,
                border: `1px solid ${theme.borderSubtle}`,
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
            {/* DESKTOP: top bar fissa */}
            <div style={{
              position: 'fixed' as const, top: 0, left: 0, right: hasScrollbar ? '17px' : 0, zIndex: 1000,
              background: isLight ? '#f0f2f5' : '#0a0e14',
              borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)',
              padding: '16px 40px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' as const }}>
                <button
                  data-tour="bp-back-dashboard"
                  onClick={onBack}
                  style={{
                    background: theme.surface05,
                    border: `1px solid ${theme.borderSubtle}`,
                    color: theme.textDim,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.cyan; e.currentTarget.style.borderColor = theme.cyan; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = theme.textDim; e.currentTarget.style.borderColor = theme.borderSubtle; }}
                >
                  ← Dashboard
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '-900px' }}>
                  <LogoVirgo size={36} />
                  <span style={{ color: theme.textDim, fontSize: '13px', fontWeight: 500 }}>
                    Mixture of Experts — i migliori pronostici da 3 sistemi AI
                  </span>
                </div>
                <h1 style={{
                  fontSize: '30px', fontWeight: '900', margin: 0, letterSpacing: '-1px',
                  position: 'absolute' as const, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none'
                }}>
                  <span style={{
                    background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                  }}>Best Picks</span>
                </h1>
                {/* Badge P/L e Yield fissi (Tutti) — posizionati assoluti tra Best Picks e crediti */}
                {(() => {
                  const day = dailyPLData.tutti;
                  const tutti = monthlyPLData.tutti;
                  const totTutti = totalPLData.tutti;
                  if (!day && !tutti && !totTutti) return null;
                  const badge = (label: string, value: string, positive: boolean) => (
                    <div key={label} style={{
                      background: `${positive ? theme.financePositive : theme.missText}40`,
                      border: `1px solid ${positive ? theme.financePositive : theme.missText}80`,
                      borderRadius: '8px', padding: '3px 8px',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      <span style={{ fontSize: '9px', color: theme.textMuted, fontWeight: '700' }}>{label}</span>
                      <span style={{ fontSize: '9px', fontWeight: '900', color: positive ? theme.financePositive : theme.missText }}>{value}</span>
                    </div>
                  );
                  return (
                    <div style={{ position: 'absolute', right: '290px', top: '50%', transform: 'translateY(-58%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '8px', color: theme.textMuted, fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Rendimento Globale</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {badge('P/L Giorno', day && day.bets > 0 ? `${day.pl > 0 ? '+' : ''}${day.pl}u` : '—', day ? day.pl >= 0 : true)}
                      {tutti && badge('P/L Mese', `${tutti.pl > 0 ? '+' : ''}${tutti.pl}u`, tutti.pl >= 0)}
                      {tutti && tutti.staked > 0 && badge('Yield Mese', `${Math.round((tutti.pl / tutti.staked) * 1000) / 10 > 0 ? '+' : ''}${Math.round((tutti.pl / tutti.staked) * 1000) / 10}%`, tutti.pl >= 0)}
                      {totTutti && totTutti.staked > 0 && badge('Yield Totale', `${Math.round((totTutti.pl / totTutti.staked) * 1000) / 10 > 0 ? '+' : ''}${Math.round((totTutti.pl / totTutti.staked) * 1000) / 10}%`, totTutti.pl >= 0)}
                    </div>
                    </div>
                  );
                })()}
                <button
                  onClick={() => window.location.href = '/bankroll'}
                  style={{
                    background: theme.surface05,
                    border: `1px solid ${theme.borderSubtle}`,
                    color: theme.textDim,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.cyan; e.currentTarget.style.borderColor = theme.cyan; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = theme.textDim; e.currentTarget.style.borderColor = theme.borderSubtle; }}
                >
                  Bankroll →
                </button>
              </div>
{/* Mixture of Experts rimosso dalla top bar */}
            </div>
          </>
        )}

        {/* Spacer per compensare la top bar fissa desktop */}
        {!isMobile && <div style={{ height: '90px' }} />}

        {/* HEADER — subtitle only (mobile) */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '6px' : '10px' }}>
          {/* Toggle PROD/SANDBOX/CONFRONTO rimosso — Unified non ha modalità */}
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
              background: theme.surface05, border: `1px solid ${theme.borderSubtle}`,
              color: theme.text, padding: '8px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.cyan; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.borderSubtle; }}
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
                <div
                  ref={(el) => {
                    if (el) {
                      const todayBtn = el.querySelector('[data-today="true"]') as HTMLElement;
                      if (todayBtn) {
                        requestAnimationFrame(() => {
                          el.scrollTop = todayBtn.offsetTop - el.clientHeight / 2 + todayBtn.clientHeight / 2;
                        });
                      }
                    }
                  }}
                  style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginTop: '6px', zIndex: 200,
                  background: isLight ? '#f0f2f5' : '#1a1d2e', border: `1px solid ${theme.cyan}33`,
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
                        data-today={isToday || undefined}
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
              background: theme.surface05, border: `1px solid ${theme.borderSubtle}`,
              color: theme.text, padding: '8px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.cyan; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.borderSubtle; }}
          >
            ▶
          </button>
        </div>

        {/* MOBILE: badge P/L e Yield sotto il calendario */}
        {isMobile && (() => {
          const day = dailyPLData.tutti;
          const tutti = monthlyPLData.tutti;
          const totTutti = totalPLData.tutti;
          if (!day && !tutti && !totTutti) return null;
          const mbadge = (label: string, value: string, positive: boolean) => (
            <div key={label} style={{
              background: `${positive ? theme.financePositive : theme.missText}15`,
              border: `1px solid ${positive ? theme.financePositive : theme.missText}30`,
              borderRadius: '6px', padding: '2px 6px',
              display: 'flex', alignItems: 'center', gap: '3px',
            }}>
              <span style={{ fontSize: '8px', color: theme.textMuted, fontWeight: '700' }}>{label}</span>
              <span style={{ fontSize: '8px', fontWeight: '900', color: positive ? theme.financePositive : theme.missText }}>{value}</span>
            </div>
          );
          return (
            <div style={{
              display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap',
              marginTop: '6px', padding: '4px 10px',
              background: isLight ? '#e8eaed' : '#151825',
              border: isLight ? '1px solid #d0d3d8' : '1px solid #ffffff15',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '8px', color: theme.textMuted, fontWeight: '800' }}>Globale:</span>
              <span style={{ fontSize: '8px', color: theme.textMuted }}>P/L Giorno <b style={{ color: day && day.bets > 0 ? (day.pl >= 0 ? theme.financePositive : theme.missText) : theme.textDim }}>{day && day.bets > 0 ? `${day.pl > 0 ? '+' : ''}${day.pl}u` : '—'}</b></span>
              <span style={{ fontSize: '8px', color: theme.textDim }}>|</span>
              {tutti && <span style={{ fontSize: '8px', color: theme.textMuted }}>P/L Mese <b style={{ color: tutti.pl >= 0 ? theme.financePositive : theme.missText }}>{tutti.pl > 0 ? '+' : ''}{tutti.pl}u</b></span>}
              <span style={{ fontSize: '8px', color: theme.textDim }}>|</span>
              {tutti && tutti.staked > 0 && <span style={{ fontSize: '8px', color: theme.textMuted }}>Yield Mese <b style={{ color: tutti.pl >= 0 ? theme.financePositive : theme.missText }}>{Math.round((tutti.pl / tutti.staked) * 1000) / 10 > 0 ? '+' : ''}{Math.round((tutti.pl / tutti.staked) * 1000) / 10}%</b></span>}
              <span style={{ fontSize: '8px', color: theme.textDim }}>|</span>
              {totTutti && totTutti.staked > 0 && <span style={{ fontSize: '8px', color: theme.textMuted }}>Yield Tot. <b style={{ color: totTutti.pl >= 0 ? theme.financePositive : theme.missText }}>{Math.round((totTutti.pl / totTutti.staked) * 1000) / 10 > 0 ? '+' : ''}{Math.round((totTutti.pl / totTutti.staked) * 1000) / 10}%</b></span>}
            </div>
          );
        })()}

        </div>{/* FINE HEADER STICKY */}
        {isMobile && <div style={{ height: '15px' }} />}

        {/* ==================== VISTA PRINCIPALE ==================== */}
        {(<>
        {/* TAB SWITCHER: Pronostici | Alto Rendimento */}
        <div data-tour="step-4" style={{
          display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '25px'
        }}>
          {[
            { id: 'pronostici' as const, label: `Pronostici (${normalPredictions.filter(p => hasRealTip(p)).reduce((s, p) => s + (p.pronostici?.length || 0), 0)})`, icon: '🏆', color: theme.cyan },
            { id: 'elite' as const, label: `Elite (${elitePredictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)})`, icon: '👑', color: '#f59e0b' },
            { id: 'alto_rendimento' as const, label: `Alto Rendimento (${altoRendimentoPreds.filter(p => hasRealTip(p)).reduce((s, p) => s + (p.pronostici?.length || 0), 0)})`, icon: '💎', color: theme.gold }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMarketFilter('tutti'); }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = theme.surfaceSubtle; }}
              style={{
                background: activeTab === tab.id ? `${tab.color}20` : theme.surfaceSubtle,
                border: `1px solid ${activeTab === tab.id ? tab.color : theme.surface08}`,
                color: activeTab === tab.id ? tab.color : theme.textDim,
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? '700' : '500',
                transition: 'all 0.15s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Capsule filtro mercato + Rendimento */}
        {(activeTab === 'pronostici' || activeTab === 'alto_rendimento' || activeTab === 'elite') && (() => {
          // Margini per sotto-mercato (dal documento soglie_minime_mercati_betting.md)
          const MARGINS: Record<string, number> = {
            '1': 7, 'X': 3, '2': 6,
            'over_1.5': 4, 'under_1.5': 4, 'over_2.5': 3, 'under_2.5': 3,
            'over_3.5': 5, 'under_3.5': 3, 'goal': 5, 'nogoal': 4, 'dc': 4, 'mg': 4
          };
          const FALLBACKS: Record<string, number> = {
            '1': 67.5, 'X': 32.5, '2': 40,
            'over_1.5': 77.5, 'under_1.5': 35, 'over_2.5': 55, 'under_2.5': 56,
            'over_3.5': 40, 'under_3.5': 74, 'goal': 58.5, 'nogoal': 54, 'dc': 75, 'mg': 60
          };
          const getSubMarket = (t: any): string => {
            if (t.tipo === 'SEGNO') return t.pronostico;
            if (t.tipo === 'DOPPIA_CHANCE') return 'dc';
            const p = (t.pronostico || '').toLowerCase();
            const m = p.match(/^(over|under)\s+(\d+\.5)$/);
            if (m) return `${m[1]}_${m[2]}`;
            if (p === 'goal') return 'goal';
            if (p === 'nogoal') return 'nogoal';
            if (p.startsWith('mg ')) return 'mg';
            return '';
          };
          const getTipThreshold = (t: any): number => {
            const sm = getSubMarket(t);
            const q = t._quota;
            if (q && q > 1) return (100 / q) + (MARGINS[sm] || 4);
            return FALLBACKS[sm] || 55;
          };
          // FlatMap tutti i tips — filtrati per source (per rendimento dinamico)
          const sourcePreds = activeTab === 'elite' ? elitePredictions : activeTab === 'alto_rendimento' ? altoRendimentoPreds : normalPredictions;
          const sourceFilteredPreds = sourcePreds.filter(p => hasRealTip(p)).filter(predMatchesSource);
          const allTips = sourceFilteredPreds.flatMap(p =>
            (p.pronostici || []).map(t => ({
              ...t,
              _quota: t.quota
                || (t.tipo === 'SEGNO' && p.odds ? (p.odds as any)[t.pronostico] : null)
                || (t.tipo === 'GOL' && p.odds ? getGolQuota(t.pronostico, p.odds) : null)
                || null,
              _probStimata: t.probabilita_stimata || null,
              _effHit: getEffectiveHit(p, t)
            }))
          );
          // Calcolo per gruppo capsula (total + finished + hits + HR)
          const capsuleData = (def: typeof MARKET_DEFS[0]) => {
            const tips = allTips.filter(def.filter);
            const total = tips.length;
            const verified = tips.filter(t => t._effHit === true || t._effHit === false);
            const hits = tips.filter(t => t._effHit === true).length;
            const hr = verified.length > 0 ? Math.round((hits / verified.length) * 1000) / 10 : null;
            const thresholds = verified.map(t => getTipThreshold(t));
            const avgTh = thresholds.length > 0 ? Math.round(thresholds.reduce((a, b) => a + b, 0) / thresholds.length * 10) / 10 : 55;
            return { ...def, total, finished: verified.length, hits, hr, threshold: avgTh };
          };
          const capsules = MARKET_DEFS.filter(d => d.id !== 'nobet').map(def => capsuleData(def));
          // NO BET: conta prediction escluse, non tips
          const noBetPreds = sourcePreds.filter(p => !hasRealTip(p)).filter(predMatchesSource);
          if (noBetPreds.length > 0) {
            capsules.push({ id: 'nobet' as MarketFilter, label: 'NO BET', filter: () => false, color: isLight ? '#dc2626' : '#ef4444', total: noBetPreds.length, finished: 0, hits: 0, hr: null, threshold: 55 });
          }
          const totalAllTips = allTips.length;
          const reHitsTotal = sourceFilteredPreds.filter(p => {
            const es = getEffectiveScore(p);
            if (!es) return false;
            const ts = (p as any).simulation_data?.top_scores;
            return ts && ts.slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(es));
          }).length;
          // Tips filtrati per mercato selezionato (per metriche finanziarie dinamiche)
          const marketFilteredTips = marketFilter === 'tutti' ? allTips : (() => {
            const mf = MARKET_DEFS.find(m => m.id === marketFilter);
            return mf ? allTips.filter(mf.filter) : allTips;
          })();
          // Calcolo metriche finanziarie (stake REALI dal pronostico)
          const verifiedWithQuota = marketFilteredTips.filter(t => (t._effHit === true || t._effHit === false) && t._quota && t._quota > 1);
          const totalBets = verifiedWithQuota.length;
          const totalProfit = verifiedWithQuota.reduce((sum, t) => {
            const stake = t.stake || 1;
            return sum + (t._effHit ? (t._quota - 1) * stake : -stake);
          }, 0);
          const plUnits = totalBets > 0 ? Math.round(totalProfit * 100) / 100 : null;
          const avgQuota = totalBets > 0 ? Math.round(verifiedWithQuota.reduce((sum, t) => sum + t._quota, 0) / totalBets * 100) / 100 : null;
          const tipsWithProb = verifiedWithQuota.filter(t => t._probStimata && t._probStimata > 0);
          const avgEdge = tipsWithProb.length > 0 ? Math.round(tipsWithProb.reduce((sum, t) => sum + ((t._probStimata ?? 0) - (1 / t._quota * 100)), 0) / tipsWithProb.length * 10) / 10 : null;

          if (totalAllTips === 0) return null;
          return (
            <>
            {/* Box RE MC admin-only rimosso — RE ora è pronostico ufficiale in Alto Rendimento */}

            {/* Contenitore Rendimento — sempre visibile sopra Filtri & Statistiche */}
            {(() => {
              // yieldColor rimosso — sostituito da P/L mensile
              return (
                <div
                  style={{
                    background: isLight ? '#eeeeee' : '#1a1d2e',
                    border: isLight ? '1px solid #e0e2e6' : '1px solid #ffffff15',
                    borderRadius: '12px', padding: '8px 14px', marginBottom: '8px',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={isLight && !isMobile ? e => { e.currentTarget.style.background = '#c8cdcd'; } : undefined}
                  onMouseLeave={isLight && !isMobile ? e => { e.currentTarget.style.background = '#eeeeee'; } : undefined}
                  onClick={() => { if (financeOpen || finLegendOpen) { setFinanceOpen(false); setFinLegendOpen(false); } else { setFinanceOpen(true); } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>Rendimento</span>
                      <span
                        style={{ fontSize: '11px', color: theme.textDisabled, background: theme.surfaceSubtle, borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setFinLegendOpen(!finLegendOpen); }}
                      >?</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                      {(() => {
                        const verified = filterCounts.centrate + filterCounts.mancate;
                        const hr = verified > 0 ? Math.round((filterCounts.centrate / verified) * 1000) / 10 : null;
                        const hrThreshold = activeTab === 'alto_rendimento' ? 25 : 50;
                        const hrColor = hr !== null ? getHRColor(hr, hrThreshold) : theme.textDim;
                        const matchesFinished = (activeTab === 'elite' ? elitePredictions : activeTab === 'pronostici' ? normalPredictions : [...exactScorePredictions]).filter(p => hasRealTip(p)).filter(predMatchesMarket).filter(predMatchesSource).filter(p => !!getEffectiveScore(p));
                        const matchHits = matchesFinished.filter(p => p.pronostici?.some(pr => {
                          if (p.real_score) return pr.hit === true;
                          return calculateHitFromScore(p.live_score!, pr.pronostico, pr.tipo) === true;
                        })).length;
                        const matchHR = matchesFinished.length > 0 ? Math.round((matchHits / matchesFinished.length) * 1000) / 10 : null;
                        const matchHRColor = matchHR !== null ? getHRColor(matchHR, hrThreshold) : theme.textDim;
                        return (
                          <>
                            {hr !== null && (
                              <div style={{
                                background: `${hrColor}${isLight ? '55' : '15'}`, border: `1px solid ${hrColor}${isLight ? '70' : '30'}`,
                                borderRadius: '10px', padding: '2px 6px',
                                display: 'flex', alignItems: 'center', gap: '3px'
                              }}>
                                <span style={{ fontSize: '9px', color: isLight ? '#1a1a1a' : hrColor, fontWeight: '700', lineHeight: '14px' }}>HR</span>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: hrColor, lineHeight: '14px' }}>{hr}%</span>
                                <span style={{ fontSize: '8px', opacity: 0.6, color: hrColor, lineHeight: '14px' }}>{filterCounts.centrate}/{verified}</span>
                              </div>
                            )}
                            {matchHR !== null && (
                              <div style={{
                                background: `${matchHRColor}${isLight ? '55' : '15'}`, border: `1px solid ${matchHRColor}${isLight ? '70' : '30'}`,
                                borderRadius: '10px', padding: '2px 6px',
                                display: 'flex', alignItems: 'center', gap: '3px'
                              }}>
                                <span style={{ fontSize: '9px', color: isLight ? '#1a1a1a' : matchHRColor, fontWeight: '700', lineHeight: '14px' }}>Partite</span>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: matchHRColor, lineHeight: '14px' }}>{matchHR}%</span>
                                <span style={{ fontSize: '8px', opacity: 0.6, color: matchHRColor, lineHeight: '14px' }}>{matchHits}/{matchesFinished.length}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      {/* Badge Marzo rimosso — spostato nel pannello espanso */}
                    </div>
                    <span style={{ fontSize: '12px', color: theme.textDisabled, transition: 'transform 0.2s', transform: financeOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', marginLeft: isMobile ? '8px' : '30px', flexShrink: 0 }}>▼</span>
                  </div>
                  {(finLegendOpen || financeOpen) && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}>
                      <div style={{ width: '90%', height: '1px', background: isLight ? '#d0d3d8' : '#ffffff12' }} />
                    </div>
                  )}
                  {finLegendOpen && (
                    <div onClick={e => { if (!isMobile) e.stopPropagation(); }} style={{ marginTop: '8px', padding: '8px 10px', background: isLight ? '#fafafa' : theme.surfaceSubtle, border: isLight ? '1px solid #e5e7eb' : 'none', borderRadius: '8px', fontSize: '10px', color: isLight ? '#4b5563' : theme.textFaint, lineHeight: '1.6' }}>
                      <div><span style={{ color: theme.financePositive, fontWeight: '700' }}>P/L Giorno</span> — Quanto hai guadagnato o perso oggi, calcolato con gli stake reali di ogni pronostico</div>
                      <div><span style={{ color: theme.financePositive, fontWeight: '700' }}>P/L Mese</span> — Il guadagno accumulato dall'inizio del mese fino ad oggi. Il numero che deve crescere</div>
                      <div><span style={{ color: theme.financePositive, fontWeight: '700' }}>Yield Mese</span> — Quanto guadagni ogni 100 unit&agrave; scommesse questo mese. +5% = guadagni 5 per ogni 100 giocate</div>
                      <div><span style={{ color: theme.financePositive, fontWeight: '700' }}>Yield Totale</span> — La prova della bravura: il rendimento su tutto lo storico. Uno yield positivo costante dimostra che il vantaggio &egrave; reale</div>
                      <div><span style={{ color: theme.quotaText, fontWeight: '700' }}>Q.Media</span> — A che livello di difficolt&agrave; giochiamo. Pi&ugrave; &egrave; alta, pi&ugrave; &egrave; rischioso ma pi&ugrave; si pu&ograve; vincere</div>
                      <div><span style={{ color: theme.financePositive, fontWeight: '700' }}>Edge</span> — Il nostro vantaggio: se &egrave; positivo, il sistema trova opportunit&agrave; che i bookmaker sottovalutano</div>
                    </div>
                  )}
                  {financeOpen && (
                    <div onClick={e => { if (!isMobile) e.stopPropagation(); }} style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '6px' : '10px', marginTop: '10px', flexWrap: 'wrap' as const, maxWidth: isMobile ? '100%' : undefined }}>
                      {[
                        ...(() => {
                          const tabKey = activeTab === 'elite' ? 'elite' : activeTab === 'alto_rendimento' ? 'alto_rendimento' : 'pronostici';
                          const mplForLabel = monthlyPLData[tabKey];
                          const monthName = new Date(date).toLocaleString('it', { month: 'long' });
                          const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                          if (mplForLabel) {
                            return [{ label: 'P/L Mese', value: `${mplForLabel.pl > 0 ? '+' : ''}${mplForLabel.pl}u`, color: mplForLabel.pl >= 0 ? theme.financePositive : theme.missText }];
                          }
                          return [];
                        })(),
                        { label: 'P/L Giorno', value: plUnits !== null ? `${plUnits > 0 ? '+' : ''}${plUnits}u` : '—', color: plUnits !== null && plUnits >= 0 ? theme.financePositive : theme.missText },
                        ...(() => {
                          const tabKey = activeTab === 'elite' ? 'elite' : activeTab === 'alto_rendimento' ? 'alto_rendimento' : 'pronostici';
                          const mpl = monthlyPLData[tabKey];
                          const items: { label: string; value: string; color: string }[] = [];
                          // P/L Mese rimosso — è già nel badge "Marzo" sopra
                          // Yield Mese = (P/L / Somma Stake) × 100
                          const yieldSrc = mpl;
                          if (yieldSrc && yieldSrc.staked > 0) {
                            const yieldVal = Math.round((yieldSrc.pl / yieldSrc.staked) * 1000) / 10;
                            items.push({ label: 'Yield Mese', value: `${yieldVal > 0 ? '+' : ''}${yieldVal}%`, color: yieldVal >= 0 ? theme.financePositive : theme.missText });
                          }
                          // Yield Totale = (P/L totale / Somma Stake totali) × 100
                          const totSrc = totalPLData[tabKey];
                          if (totSrc && totSrc.staked > 0) {
                            const yieldTot = Math.round((totSrc.pl / totSrc.staked) * 1000) / 10;
                            items.push({ label: 'Yield Totale', value: `${yieldTot > 0 ? '+' : ''}${yieldTot}%`, color: yieldTot >= 0 ? theme.financePositive : theme.missText });
                          }
                          return items;
                        })(),
                        { label: 'Q.Media', value: avgQuota !== null ? `@${avgQuota}` : '—', color: theme.quotaText },
                        { label: 'Edge', value: avgEdge !== null ? `${avgEdge > 0 ? '+' : ''}${avgEdge}%` : '—', color: avgEdge !== null && avgEdge >= 0 ? theme.financePositive : theme.missText },
                      ].map(item => (
                        <div key={item.label} style={{
                          display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '5px',
                          background: `${item.color}${isLight ? '55' : '15'}`, border: `1px solid ${item.color}${isLight ? '70' : '30'}`,
                          borderRadius: isMobile ? '10px' : '12px', padding: isMobile ? '3px 10px' : '4px 12px'
                        }}>
                          <span style={{ fontSize: isMobile ? '9px' : '10px', color: isLight ? '#1a1a1a' : theme.textFaint, fontWeight: '700' }}>{item.label}</span>
                          <span style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '700', color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Capsula Filtri & Statistiche — contenitore collassabile */}
            <div style={{
              background: isLight ? '#eeeeee' : '#1a1d2e',
              border: isLight ? '1px solid #e0e2e6' : '1px solid #2d3045',
              borderRadius: '12px', marginBottom: '8px',
              overflow: 'hidden', transition: 'all 0.2s ease'
            }}>
              <div
                onClick={() => setFiltersStatsOpen(!filtersStatsOpen)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 14px', cursor: 'pointer', userSelect: 'none' as const
                }}
              >
                <span style={{ fontSize: '16px', color: theme.textMuted, fontWeight: '700' }}>Filtri & Statistiche</span>
                <span style={{ fontSize: '12px', color: theme.textDisabled, transition: 'transform 0.2s', transform: filtersStatsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>▼</span>
              </div>
              {filtersStatsOpen && (
                <div style={{ padding: '0 8px 8px' }}>
            {/* Contenitore Origine collassabile */}
            {(() => {
              const basePreds = (activeTab === 'elite' ? elitePredictions : activeTab === 'pronostici' ? normalPredictions : altoRendimentoPreds)
                .filter(p => statusFilter === 'tutte' || predMatchesFilter(p, statusFilter))
                .filter(predMatchesMarket);
              const sourceCounts = SOURCE_DEFS.map(g => {
                const matchingPreds = basePreds.filter(p => p.pronostici?.some((t: any) => g.match(t.source || '')));
                const total = matchingPreds.length;
                let hits = 0, finished = 0;
                matchingPreds.forEach(p => {
                  p.pronostici?.filter((t: any) => g.match(t.source || '')).forEach((t: any) => {
                    const h = getEffectiveHit(p, t);
                    if (h !== null) { finished++; if (h) hits++; }
                  });
                });
                const hr = finished > 0 ? Math.round((hits / finished) * 100) : null;
                return { ...g, total, hits, finished, hr };
              }).filter(g => g.total > 0);
              const totalAll = basePreds.length;
              let allHits = 0, allFinished = 0;
              basePreds.forEach(p => {
                p.pronostici?.forEach((t: any) => {
                  const h = getEffectiveHit(p, t);
                  if (h !== null) { allFinished++; if (h) allHits++; }
                });
              });
              const allHr = allFinished > 0 ? Math.round((allHits / allFinished) * 100) : null;
              return (
                <div
                  style={{
                    background: isLight ? '#eeeeee' : '#1a1d2e',
                    border: isLight ? '1px solid #e0e2e6' : '1px solid #ffffff15',
                    borderRadius: '12px', padding: '8px 14px', marginBottom: '8px',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={isLight && !isMobile ? e => { e.currentTarget.style.background = '#c8cdcd'; } : undefined}
                  onMouseLeave={isLight && !isMobile ? e => { e.currentTarget.style.background = '#eeeeee'; } : undefined}
                >
                  <div
                    onClick={() => setSourceOpen(!sourceOpen)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>Filtra per Algoritmo</span>
                    <span style={{ fontSize: '12px', color: theme.textDisabled, transition: 'transform 0.2s', transform: sourceOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', marginLeft: 'auto' }}>▼</span>
                  </div>
                  {sourceOpen && (
                    <>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}>
                      <div style={{ width: '90%', height: '1px', background: isLight ? '#d0d3d8' : '#ffffff12' }} />
                    </div>
                    {sourceCounts.length === 0 && totalAll === 0 ? (
                      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '11px', color: theme.textDisabled, fontStyle: 'italic' }}>
                        Nessun dato per questo filtro
                      </div>
                    ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' as const }}>
                      <button
                        onClick={() => setSourceFilter('tutti')}
                        onMouseEnter={e => { if (sourceFilter !== 'tutti') e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
                        onMouseLeave={e => { if (sourceFilter !== 'tutti') e.currentTarget.style.background = theme.surfaceSubtle; }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: sourceFilter === 'tutti' ? (isLight ? '#dbeafe' : `${theme.cyan}25`) : theme.surfaceSubtle,
                          border: `1px solid ${sourceFilter === 'tutti' ? theme.cyan : theme.surface05}`,
                          color: sourceFilter === 'tutti' ? theme.cyan : theme.textDim,
                          borderRadius: '12px', padding: '4px 12px', cursor: 'pointer',
                          fontSize: '10px', fontWeight: sourceFilter === 'tutti' ? '800' : '600',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ lineHeight: '14px' }}>Tutti</span> <span style={{ fontSize: '9px', opacity: 0.7, lineHeight: '14px' }}>{totalAll}</span>
                        {allHr !== null && <span style={{ fontSize: '9px', fontWeight: '700', color: allHr >= 50 ? theme.hitText : theme.missText, lineHeight: '14px' }}>{allHr}%</span>}
                      </button>
                      {sourceCounts.map(g => {
                        const isActive = sourceFilter === g.id;
                        return (
                          <button
                            key={g.id}
                            onClick={() => setSourceFilter(isActive ? 'tutti' : g.id)}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = theme.surfaceSubtle; }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px',
                              background: isActive ? `${g.color}${isLight ? '20' : '25'}` : theme.surfaceSubtle,
                              border: `1px solid ${isActive ? g.color : theme.surface05}`,
                              borderRadius: '12px', padding: '4px 12px', cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span style={{ fontSize: '10px', color: isActive ? g.color : theme.textDim, fontWeight: '700', lineHeight: '14px' }}>{g.label}</span>
                            <span style={{ fontSize: '10px', color: isActive ? g.color : theme.textFaint, fontWeight: '600', lineHeight: '14px' }}>{g.total}</span>
                            {g.hr !== null && <span style={{ fontSize: '10px', fontWeight: '700', color: g.hr >= 50 ? theme.hitText : theme.missText, lineHeight: '14px' }}>{g.hr}%</span>}
                          </button>
                        );
                      })}
                    </div>
                    )}
                    </>
                  )}
                </div>
              );
            })()}
            {/* Contenitore Mercati collassabile */}
            <div
              style={{
                background: isLight ? '#eeeeee' : '#1a1d2e',
                border: isLight ? '1px solid #e0e2e6' : '1px solid #ffffff15',
                borderRadius: '12px', padding: '8px 14px', marginBottom: '8px',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={isLight && !isMobile ? e => { e.currentTarget.style.background = '#c8cdcd'; } : undefined}
              onMouseLeave={isLight && !isMobile ? e => { e.currentTarget.style.background = '#eeeeee'; } : undefined}
            >
              <div
                onClick={() => setMarketsOpen(!marketsOpen)}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>Mercati</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                  {(() => {
                    const segno = capsules.find(c => c.id === 'segno');
                    const ouCaps = capsules.filter(c => c.id === 'ou15' || c.id === 'ou25' || c.id === 'ou35');
                    const ouFinished = ouCaps.reduce((a, c) => a + c.finished, 0);
                    const ouHits = ouCaps.reduce((a, c) => a + c.hits, 0);
                    const ouHr = ouFinished > 0 ? Math.round((ouHits / ouFinished) * 1000) / 10 : null;
                    const pills: { label: string; hr: number | null; hits: number; finished: number; color: string }[] = [];
                    if (segno && segno.finished > 0) pills.push({ label: '1X2', hr: segno.hr, hits: segno.hits, finished: segno.finished, color: segno.color });
                    if (ouFinished > 0) pills.push({ label: 'O/U', hr: ouHr, hits: ouHits, finished: ouFinished, color: isLight ? '#0284c7' : '#4fc3f7' });
                    return pills.map(p => {
                      const clr = p.hr !== null ? getHRColor(p.hr, 55) : theme.textDim;
                      return (
                        <div key={p.label} style={{
                          background: `${clr}${isLight ? '55' : '15'}`, border: `1px solid ${clr}${isLight ? '70' : '30'}`,
                          borderRadius: '10px', padding: '2px 6px',
                          display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                          <span style={{ fontSize: '9px', color: isLight ? '#1a1a1a' : clr, fontWeight: '700', lineHeight: '14px' }}>{p.label}</span>
                          <span style={{ fontSize: '9px', fontWeight: '900', color: clr, lineHeight: '14px' }}>{p.hr}%</span>
                          <span style={{ fontSize: '8px', opacity: 0.6, color: clr, lineHeight: '14px' }}>{p.hits}/{p.finished}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <span style={{ fontSize: '12px', color: theme.textDisabled, transition: 'transform 0.2s', transform: marketsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', marginLeft: '30px' }}>▼</span>
              </div>
              {marketsOpen && (
                <>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}>
                  <div style={{ width: '90%', height: '1px', background: isLight ? '#d0d3d8' : '#ffffff12' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' as const }}>
                  {/* Pulsante Tutti */}
                  <button
                    onClick={() => setMarketFilter('tutti')}
                    onMouseEnter={e => { if (marketFilter !== 'tutti') e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
                    onMouseLeave={e => { if (marketFilter !== 'tutti') e.currentTarget.style.background = theme.surfaceSubtle; }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: marketFilter === 'tutti' ? (isLight ? '#dbeafe' : `${theme.cyan}25`) : theme.surfaceSubtle,
                      border: `1px solid ${marketFilter === 'tutti' ? theme.cyan : theme.surface05}`,
                      color: marketFilter === 'tutti' ? theme.cyan : theme.textDim,
                      borderRadius: '12px', padding: '4px 12px', cursor: 'pointer',
                      fontSize: '10px', fontWeight: marketFilter === 'tutti' ? '800' : '600',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ lineHeight: '14px' }}>Tutti</span> <span style={{ fontSize: '9px', opacity: 0.7, lineHeight: '14px' }}>{totalAllTips}</span>
                  </button>
                  {capsules.map(c => {
                    if (c.total === 0) return null;
                    const isActive = marketFilter === c.id;
                    const clr = c.hr !== null ? getHRColor(c.hr, c.threshold) : null;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setMarketFilter(isActive ? 'tutti' : c.id)}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '' : (isLight ? theme.surfaceSubtle : theme.surfaceSubtle); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: (isActive || c.id === 'nobet') ? `${c.color}${isLight ? '20' : '25'}` : theme.surfaceSubtle,
                          border: `1px solid ${(isActive || c.id === 'nobet') ? c.color : theme.surface05}`,
                          borderRadius: '12px', padding: '4px 12px', cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ fontSize: '10px', color: (isActive || c.id === 'nobet') ? c.color : theme.textDim, fontWeight: '700', lineHeight: '14px' }}>{c.label}</span>
                        <span style={{ fontSize: '10px', color: (isActive || c.id === 'nobet') ? c.color : theme.textFaint, fontWeight: '600', lineHeight: '14px' }}>{c.total}</span>
                        {c.finished > 0 && clr && (
                          <>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: clr, lineHeight: '14px' }}>{c.hr}%</span>
                            <span style={{ fontSize: '9px', opacity: 0.6, color: clr, lineHeight: '14px' }}>{c.hits}/{c.finished}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                  {reHitsTotal > 0 && (
                    <button
                      onClick={() => setReHitFilter(!reHitFilter)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        background: reHitFilter ? `${theme.success}${isLight ? '30' : '25'}` : `${theme.success}${isLight ? '10' : '10'}`,
                        border: `1px solid ${reHitFilter ? theme.success : `${theme.success}${isLight ? '40' : '30'}`}`,
                        borderRadius: '12px', padding: '4px 12px', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: theme.success, fontWeight: '700' }}>✓RE</span>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: theme.success }}>{reHitsTotal}</span>
                    </button>
                  )}
                </div>
                </>
              )}
            </div>
                </div>
              )}
            </div>
            </>
          );
        })()}

        {/* CAPSULA FILTRI — collassabile, con titolo dentro */}
        <div data-tour="step-6" className={activeTab === 'pronostici' ? 'capsula-main-cyan' : 'capsula-main-gold'} style={{
          position: 'relative',
          background: activeTab === 'pronostici'
            ? (isLight
              ? `linear-gradient(135deg, rgba(0,188,212,0.50) 0%, rgba(0,188,212,0.28) 8%, transparent 14%), linear-gradient(315deg, #eeeeee 0%, #eeeeee 50%, rgba(0,188,212,0.12) 85%, #eeeeee 100%)`
              : `linear-gradient(135deg, rgba(0,188,212,0.45) 0%, rgba(0,188,212,0.22) 8%, transparent 14%), linear-gradient(315deg, #1a1d2e 0%, #1a1d2e 50%, rgba(0,188,212,0.08) 85%, #1a1d2e 100%)`)
            : activeTab === 'elite'
            ? (isLight
              ? `linear-gradient(135deg, rgba(245,158,11,0.50) 0%, rgba(245,158,11,0.28) 8%, transparent 14%), linear-gradient(315deg, #eeeeee 0%, #eeeeee 50%, rgba(245,158,11,0.12) 85%, #eeeeee 100%)`
              : `linear-gradient(135deg, rgba(245,158,11,0.45) 0%, rgba(245,158,11,0.22) 8%, transparent 14%), linear-gradient(315deg, #1a1d2e 0%, #1a1d2e 50%, rgba(245,158,11,0.08) 85%, #1a1d2e 100%)`)
            : (isLight
              ? `linear-gradient(135deg, rgba(255,215,0,0.50) 0%, rgba(255,215,0,0.28) 8%, transparent 14%), linear-gradient(315deg, #eeeeee 0%, #eeeeee 50%, rgba(255,215,0,0.12) 85%, #eeeeee 100%)`
              : `linear-gradient(135deg, rgba(255,215,0,0.45) 0%, rgba(255,215,0,0.22) 8%, transparent 14%), linear-gradient(315deg, #1a1d2e 0%, #1a1d2e 50%, rgba(255,215,0,0.08) 85%, #1a1d2e 100%)`),
          border: isLight ? '1px solid #e0e2e6' : '1px solid #2d3045',
          borderRadius: '12px', marginBottom: '8px',
          overflow: 'hidden', transition: 'all 0.2s ease'
        }}>
          {/* Header capsula — titolo + badge + freccia, cliccabile */}
          <div
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 14px', cursor: 'pointer',
              userSelect: 'none' as const
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {(() => {
                const tabColor = activeTab === 'pronostici' ? theme.cyan : activeTab === 'elite' ? '#f59e0b' : theme.gold;
                const tabLabel = activeTab === 'pronostici' ? 'Pronostici' : activeTab === 'elite' ? 'Elite' : 'Alto Rendimento';
                const tabCount = activeTab === 'pronostici'
                  ? filteredPredictions.filter(p => hasRealTip(p)).reduce((s, p) => s + (p.pronostici?.length || 0), 0)
                  : activeTab === 'elite'
                  ? elitePredictions.reduce((s, p) => s + (p.pronostici?.length || 0), 0)
                  : filteredAltoRendimento.filter(p => hasRealTip(p)).reduce((s, p) => s + (p.pronostici?.length || 0), 0);
                return (
                <>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
                    background: tabColor, marginRight: '8px',
                    animation: 'pulse-dot 2s ease-in-out infinite',
                    boxShadow: `0 0 4px ${tabColor}`
                  }} />
                  <span style={{ fontSize: '16px', fontWeight: '700', color: tabColor }}>
                    {tabLabel}
                  </span>
                  <span style={{
                    fontSize: '11px', background: `${tabColor}22`, color: tabColor,
                    padding: '2px 10px', borderRadius: '20px', fontWeight: '700',
                    marginLeft: '8px'
                  }}>
                    {tabCount}
                  </span>
                </>
                );
              })()}
            </div>
            <span style={{ fontSize: '12px', color: theme.textDisabled, transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>▼</span>
          </div>

          {/* Contenuto filtri — collassabile */}
          {filtersOpen && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '10px',
              padding: isMobile ? '0 10px 12px' : '0 16px 14px',
              flexWrap: 'wrap' as const
            }}>
              {/* Gruppo PARTITE */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: '600', color: theme.textDim, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Partite</span>
                <div style={{ display: 'flex', gap: isMobile ? '3px' : '5px', flexWrap: 'nowrap' as const, justifyContent: 'center' }}>
                  {([
                    { id: 'tutte' as StatusFilter, label: 'Tutte', icon: '📋', color: theme.purple },
                    { id: 'live' as StatusFilter, label: 'LIVE', icon: '🔴', color: theme.danger },
                    { id: 'da_giocare' as StatusFilter, label: 'Da giocare', icon: '⏳', color: theme.textDim },
                    { id: 'finite' as StatusFilter, label: 'Finite', icon: '✅', color: theme.success },
                  ]).map(f => (
                    <button
                      key={f.id}
                      onClick={(e) => { e.stopPropagation(); setStatusFilter(f.id); }}
                      onMouseEnter={e => { if (statusFilter !== f.id) e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
                      onMouseLeave={e => { if (statusFilter !== f.id) e.currentTarget.style.background = isLight ? '#ffffff' : theme.surfaceSubtle; }}
                      style={{
                        background: statusFilter === f.id ? `${f.color}20` : (isLight ? '#ffffff' : theme.surfaceSubtle),
                        border: `1px solid ${statusFilter === f.id ? f.color : (isLight ? '#cbd5e1' : theme.surface05)}`,
                        color: statusFilter === f.id ? f.color : theme.textDim,
                        padding: isMobile ? '4px 8px' : '5px 12px', borderRadius: '16px', cursor: 'pointer',
                        fontSize: isMobile ? '10.5px' : '11px', fontWeight: statusFilter === f.id ? '700' : '500',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '3px'
                      }}
                    >
                      {f.icon} {f.label}
                      {filterCounts[f.id] > 0 && (
                        <span style={{
                          fontSize: isMobile ? '8px' : '9px', fontWeight: '800',
                          background: statusFilter === f.id ? `${f.color}30` : theme.surface05,
                          padding: '1px 5px', borderRadius: '10px', marginLeft: '1px'
                        }}>
                          {filterCounts[f.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separatore verticale (solo desktop) */}
              {!isMobile && <div style={{ width: '1px', height: '32px', background: isLight ? '#cbd5e1' : theme.surface15, alignSelf: 'flex-end', marginBottom: '2px' }} />}

              {/* Gruppo PRONOSTICI */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: '600', color: theme.textDim, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Pronostici</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {([
                    { id: 'centrate' as StatusFilter, label: 'Centrati', icon: '✓', color: theme.hitText },
                    { id: 'mancate' as StatusFilter, label: 'Mancati', icon: '✗', color: theme.missText },
                  ]).map(f => (
                    <button
                      key={f.id}
                      onClick={(e) => { e.stopPropagation(); setStatusFilter(f.id); }}
                      onMouseEnter={e => { if (statusFilter !== f.id) e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'; }}
                      onMouseLeave={e => { if (statusFilter !== f.id) e.currentTarget.style.background = isLight ? '#ffffff' : theme.surfaceSubtle; }}
                      style={{
                        background: statusFilter === f.id ? `${f.color}20` : (isLight ? '#ffffff' : theme.surfaceSubtle),
                        border: `1px solid ${statusFilter === f.id ? f.color : (isLight ? '#cbd5e1' : theme.surface05)}`,
                        color: statusFilter === f.id ? f.color : theme.textDim,
                        padding: isMobile ? '4px 8px' : '5px 12px', borderRadius: '16px', cursor: 'pointer',
                        fontSize: isMobile ? '10.5px' : '11px', fontWeight: statusFilter === f.id ? '700' : '500',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '3px'
                      }}
                    >
                      {f.icon} {f.label}
                      {filterCounts[f.id] > 0 && (
                        <span style={{
                          fontSize: isMobile ? '8px' : '9px', fontWeight: '800',
                          background: statusFilter === f.id ? `${f.color}30` : theme.surface05,
                          padding: '1px 5px', borderRadius: '10px', marginLeft: '1px'
                        }}>
                          {filterCounts[f.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
        {!loading && !error && predictions.length === 0 && (
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
          activeTab === 'elite'
            ? filteredElite.length === 0 && elitePredictions.length > 0
            : activeTab === 'pronostici'
            ? filteredPredictions.length === 0 && normalPredictions.length > 0
            : filteredExactScore.length === 0 && exactScorePredictions.length > 0
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
            {/* ==================== HIGH RISK: RE ==================== */}

            {/* SEZIONE RISULTATO ESATTO */}



            {/* ==================== ALTO RENDIMENTO: Pronostici quota > 2.50 ==================== */}
            {activeTab === 'alto_rendimento' && filteredAltoRendimento.length > 0 && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                {Object.entries(filteredAltoRendimentoByLeague).map(([leagueName, preds]) => {
                  const isCollapsed = !collapsedLeagues.has(leagueName);
                  const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                  const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                  const toPlay = preds.length - finished - live;
                  const predsActive = preds.filter(p => hasRealTip(p));
                  const hits = predsActive.reduce((c, pred) => c + (pred.pronostici || []).filter(p => p.tipo !== 'RISULTATO_ESATTO' && getEffectiveHit(pred, p) === true).length, 0);
                  const misses = predsActive.reduce((c, pred) => c + (pred.pronostici || []).filter(p => p.tipo !== 'RISULTATO_ESATTO' && getEffectiveHit(pred, p) === false).length, 0);
                  const verifiedP = hits + misses;
                  const hitRateVal = verifiedP > 0 ? Math.round((hits / verifiedP) * 1000) / 10 : null;
                  const statusBg = finished === 0 ? theme.surface05 : finished === preds.length ? `${theme.success}30` : `${theme.warning}30`;
                  const statusColor = finished === 0 ? theme.textDim : finished === preds.length ? theme.success : theme.warning;
                  const missRate = verifiedP > 0 ? misses / verifiedP : 0;
                  const hitColor = hits === 0 ? theme.textDim : theme.success;
                  const missColor = misses === 0 ? theme.textDim : missRate <= 0.25 ? '#FFA726' : missRate <= 0.5 ? '#F4511E' : theme.danger;
                  const hrHue = hitRateVal !== null ? Math.min(130, hitRateVal * 1.3) : 0;
                  const hrColor = hitRateVal !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                  const hrBg = hitRateVal !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : theme.surface05;
                  const reHits = predsActive.filter(p => {
                    const es = getEffectiveScore(p);
                    if (!es) return false;
                    const ts = (p as any).simulation_data?.top_scores;
                    return ts && ts.slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(es));
                  }).length;
                  const reCount = predsActive.filter(p => reMatchKeys.has(`${p.home}|${p.away}`)).length;
                  const sep = <span style={{ color: theme.surface15, fontSize: '10px' }}>│</span>;
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
                      {reCount > 0 && <>{sep}<span style={{ fontSize: '9px', fontWeight: 700, color: theme.warning }}>💎 {reCount}</span></>}
                      {reHits > 0 && <>{sep}<span style={{ fontSize: '9px', fontWeight: 700, color: theme.hitText, background: theme.hitBg, borderRadius: '3px', padding: '1px 5px' }}>✓RE {reHits}</span></>}
                    </>
                  );
                  return (
                  <div key={leagueName} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                        background: isLight ? '#eef7ff' : '#1e2337', borderRadius: '8px',
                        cursor: 'pointer', userSelect: 'none' as const,
                        border: isLight ? '1px solid #e0e2e6' : '1px solid rgba(255,255,255,0.15)'
                      }}
                      onClick={() => toggleLeague(leagueName)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                            <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <StemmaImg src={getLeagueLogoUrl(leagueName)} size={18} />
                            <span
                              onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                              style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? theme.gold : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                            >{leagueName}</span>
                            {isMobile && live > 0 && <span style={{ fontSize: '8px', color: theme.liveText, fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: theme.liveBg, border: `1px solid ${theme.liveBorder}`, borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                          </div>
                          {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: theme.liveText, fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: theme.liveBg, border: `1px solid ${theme.liveBorder}`, borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                          {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '5px' }}><span style={{ color: theme.surface15, fontSize: '10px' }}>│</span>{statsEls}</div>}
                        </div>
                        <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                      </div>
                      {isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', flexWrap: 'wrap' as const }}>
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
            {activeTab === 'elite' && filteredElite.length > 0 && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                {Object.entries(filteredEliteByLeague).map(([leagueName, preds]) => {
                  const isCollapsed = !collapsedLeagues.has(leagueName);
                  const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                  const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                  const toPlay = preds.length - finished - live;
                  const predsActive = preds.filter(p => hasRealTip(p));
                  const hits = predsActive.reduce((c, pred) => c + (pred.pronostici || []).filter(p => p.tipo !== 'RISULTATO_ESATTO' && getEffectiveHit(pred, p) === true).length, 0);
                  const misses = predsActive.reduce((c, pred) => c + (pred.pronostici || []).filter(p => p.tipo !== 'RISULTATO_ESATTO' && getEffectiveHit(pred, p) === false).length, 0);
                  const verifiedP = hits + misses;
                  const hitRateVal = verifiedP > 0 ? Math.round((hits / verifiedP) * 1000) / 10 : null;
                  const statusBg = finished === 0 ? theme.surface05 : finished === preds.length ? `${theme.success}30` : `${theme.warning}30`;
                  const statusColor = finished === 0 ? theme.textDim : finished === preds.length ? theme.success : theme.warning;
                  const hitColor = hits === 0 ? theme.textDim : theme.success;
                  const missRate = verifiedP > 0 ? misses / verifiedP : 0;
                  const missColor = misses === 0 ? theme.textDim : missRate <= 0.25 ? '#FFA726' : missRate <= 0.5 ? '#F4511E' : theme.danger;
                  const hrHue = hitRateVal !== null ? Math.min(130, hitRateVal * 1.3) : 0;
                  const hrColor = hitRateVal !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                  const hrBg = hitRateVal !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : theme.surface05;
                  const reHits = predsActive.filter(p => {
                    const es = getEffectiveScore(p);
                    if (!es) return false;
                    const ts = (p as any).simulation_data?.top_scores;
                    return ts && ts.slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(es));
                  }).length;
                  const reCount = predsActive.filter(p => reMatchKeys.has(`${p.home}|${p.away}`)).length;
                  const sep = <span style={{ color: theme.surface15, fontSize: '10px' }}>│</span>;
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
                      {reCount > 0 && <>{sep}<span style={{ fontSize: '9px', fontWeight: 700, color: theme.warning }}>💎 {reCount}</span></>}
                      {reHits > 0 && <>{sep}<span style={{ fontSize: '9px', fontWeight: 700, color: theme.hitText, background: theme.hitBg, borderRadius: '3px', padding: '1px 5px' }}>✓RE {reHits}</span></>}
                    </>
                  );
                  return (
                  <div key={leagueName} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                        background: isLight ? '#fef3c7' : '#2a2518', borderRadius: '8px',
                        cursor: 'pointer', userSelect: 'none' as const,
                        border: isLight ? '1px solid #fcd34d' : '1px solid rgba(245,158,11,0.3)'
                      }}
                      onClick={() => toggleLeague(leagueName)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                            <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <StemmaImg src={getLeagueLogoUrl(leagueName)} size={18} />
                            <span
                              onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                              style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? theme.cyan : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                            >{leagueName}</span>
                            {isMobile && live > 0 && <span style={{ fontSize: '8px', color: theme.liveText, fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: theme.liveBg, border: `1px solid ${theme.liveBorder}`, borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                          </div>
                          {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: theme.liveText, fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: theme.liveBg, border: `1px solid ${theme.liveBorder}`, borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                          {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '3px' }}><span style={{ color: theme.surface15, fontSize: '10px' }}>│</span>{statsEls}</div>}
                        </div>
                        <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                      </div>
                      {isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '5px', flexWrap: 'wrap' as const }}>
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

            {activeTab === 'elite' && filteredElite.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textDim }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👑</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Nessun pronostico Elite per oggi</div>
                <div style={{ fontSize: '11px', color: theme.textFaint }}>I pronostici Elite sono rari: solo quelli che matchano i pattern storicamente vincenti (HR &gt; 80%)</div>
              </div>
            )}

            {activeTab === 'pronostici' && filteredPredictions.length > 0 && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                {Object.entries(filteredGroupedByLeague).map(([leagueName, preds], leagueIdx) => {
                  const isCollapsed = !collapsedLeagues.has(leagueName);
                  const finished = preds.filter(p => getMatchStatus(p) === 'finished').length;
                  const live = preds.filter(p => getMatchStatus(p) === 'live').length;
                  const toPlay = preds.length - finished - live;
                  // Conteggio per singolo pronostico (escludi NO BET)
                  const predsActive = preds.filter(p => hasRealTip(p));
                  const hits = predsActive.reduce((c, pred) => c + (pred.pronostici || []).filter(p => p.tipo !== 'RISULTATO_ESATTO' && getEffectiveHit(pred, p) === true).length, 0);
                  const misses = predsActive.reduce((c, pred) => c + (pred.pronostici || []).filter(p => p.tipo !== 'RISULTATO_ESATTO' && getEffectiveHit(pred, p) === false).length, 0);
                  const verifiedP = hits + misses;
                  const hitRateVal = verifiedP > 0 ? Math.round((hits / verifiedP) * 1000) / 10 : null;
                  const statusBg = finished === 0 ? theme.surface05 : finished === preds.length ? `${theme.success}30` : `${theme.warning}30`;
                  const statusColor = finished === 0 ? theme.textDim : finished === preds.length ? theme.success : theme.warning;
                  const missRate = verifiedP > 0 ? misses / verifiedP : 0;
                  const hitColor = hits === 0 ? theme.textDim : theme.success;
                  const missColor = misses === 0 ? theme.textDim : missRate <= 0.25 ? '#FFA726' : missRate <= 0.5 ? '#F4511E' : theme.danger;
                  // Colore progressivo hit rate: 0%=rosso, 50%=giallo-verde, 100%=verde
                  const hrHue = hitRateVal !== null ? Math.min(130, hitRateVal * 1.3) : 0;
                  const hrColor = hitRateVal !== null ? `hsl(${Math.round(hrHue)}, 85%, 48%)` : theme.textDim;
                  const hrBg = hitRateVal !== null ? `hsla(${Math.round(hrHue)}, 85%, 48%, 0.15)` : theme.surface05;
                  // Conteggio RE hits (top 4 Monte Carlo vs risultato reale)
                  const reHits = predsActive.filter(p => {
                    const es = getEffectiveScore(p);
                    if (!es) return false;
                    const ts = (p as any).simulation_data?.top_scores;
                    return ts && ts.slice(0, 4).some(([s]: [string, number]) => normalizeScore(s) === normalizeScore(es));
                  }).length;
                  // Conteggio partite con RE prediction (per diamante)
                  const reCount = predsActive.filter(p => reMatchKeys.has(`${p.home}|${p.away}`)).length;
                  const sep = <span style={{ color: theme.surface15, fontSize: '10px' }}>│</span>;
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
                      {reCount > 0 && <>{sep}<span style={{ fontSize: '9px', fontWeight: 700, color: theme.warning }}>💎 {reCount}</span></>}
                      {reHits > 0 && <>{sep}<span style={{ fontSize: '9px', fontWeight: 700, color: theme.hitText, background: theme.hitBg, borderRadius: '3px', padding: '1px 5px' }}>✓RE {reHits}</span></>}
                    </>
                  );
                  return (
                  <div key={leagueName} style={{ marginBottom: '16px' }}>
                    {/* HEADER LEGA - CLICCABILE */}
                    <div
                      {...(leagueIdx === 0 ? { 'data-tour': 'bp-first-league' } : {})}
                      style={{
                        padding: '8px 12px', marginBottom: isCollapsed ? '0' : '8px',
                        background: isLight ? '#eef7ff' : '#1e2337', borderRadius: '8px',
                        cursor: 'pointer', userSelect: 'none' as const,
                        border: isLight ? '1px solid #e0e2e6' : '1px solid rgba(255,255,255,0.15)'
                      }}
                      onClick={() => toggleLeague(leagueName)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(isMobile ? {} : { width: '180px', minWidth: '180px', flexShrink: 0 }) }}>
                            <img src={`https://flagcdn.com/w40/${LEAGUE_TO_COUNTRY_CODE[leagueName] || 'xx'}.png`} alt="" style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <StemmaImg src={getLeagueLogoUrl(leagueName)} size={18} />
                            <span
                              onClick={onNavigateToLeague ? (e: React.MouseEvent) => { e.stopPropagation(); onNavigateToLeague(leagueName); } : undefined}
                              style={{ fontSize: '12px', fontWeight: '700', color: onNavigateToLeague ? theme.cyan : theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1, cursor: onNavigateToLeague ? 'pointer' : 'default' }}
                            >{leagueName}</span>
                            {isMobile && live > 0 && <span style={{ fontSize: '8px', color: theme.liveText, fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0, background: theme.liveBg, border: `1px solid ${theme.liveBorder}`, borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}
                          </div>
                          {!isMobile && <div style={{ width: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{live > 0 && <span style={{ fontSize: '8px', color: theme.liveText, fontWeight: '800', animation: 'pulse 1.5s ease-in-out infinite', background: theme.liveBg, border: `1px solid ${theme.liveBorder}`, borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.5px' }}>🔴 {live} LIVE</span>}</div>}
                          {!isMobile && <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', gap: '3px' }}><span style={{ color: theme.surface15, fontSize: '10px' }}>│</span>{statsEls}</div>}
                        </div>
                        <span style={{ fontSize: '10px', color: theme.textDim, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                      </div>
                      {isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '5px', flexWrap: 'wrap' as const }}>
                          {statsEls}
                        </div>
                      )}
                    </div>

                    {/* CARDS */}
                    {!isCollapsed && preds.map((pred, predIdx) => (
                      <div key={`${pred.home}-${pred.away}-${predIdx}`} {...(leagueIdx === 0 && predIdx === 0 ? { 'data-tour': 'bp-first-card' } : {})}>
                        {renderPredictionCard(pred)}
                      </div>
                    ))}
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
            background: isLight ? '#ffffff' : '#1e2235', borderRadius: '16px', padding: '28px',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 30px rgba(168,85,247,0.2)',
            minWidth: '280px', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔐</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: theme.text, marginBottom: '16px' }}>
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
                background: theme.surface05, color: theme.text,
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
                background: 'rgba(168,85,247,0.3)', color: theme.purple,
              }}
            >
              Conferma
            </button>
          </div>
        </div>
      )}
      {/* Modal Acquisto Pronostico */}
      {purchaseModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => !purchaseLoading && setPurchaseModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: isLight ? '#fff' : '#1a1a2e', borderRadius: '12px',
            padding: '24px', maxWidth: '380px', width: '90%',
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: theme.text }}>
              Sblocca pronostico
            </h3>
            <p style={{ fontSize: '14px', color: theme.textDim, margin: '0 0 6px' }}>
              <strong style={{ color: theme.text }}>{purchaseModal.home}</strong> vs <strong style={{ color: theme.text }}>{purchaseModal.away}</strong>
            </p>
            <p style={{ fontSize: '12px', color: theme.textDim, margin: '0 0 6px' }}>
              {purchaseModal.league} — {purchaseModal.matchTime}
            </p>
            <p style={{ fontSize: '14px', color: theme.text, margin: '12px 0', fontWeight: 600 }}>
              Costo: <span style={{ color: theme.cyan }}>{predictionCost} crediti</span>
              <span style={{ fontSize: '12px', color: theme.textDim, marginLeft: '8px' }}>
                (hai {credits ?? 0} crediti)
              </span>
            </p>
            <div style={{
              padding: '10px', borderRadius: '6px', marginBottom: '16px',
              background: isLight ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${isLight ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'}`,
              fontSize: '11px', color: isLight ? '#92400e' : '#fbbf24', lineHeight: 1.5,
            }}>
              I pronostici vengono aggiornati automaticamente due volte: circa 3 ore prima e circa 1 ora prima del match. Solo in caso di ritiro definitivo all'aggiornamento di 1 ora prima, i crediti verranno rimborsati automaticamente.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setPurchaseModal(null)}
                disabled={purchaseLoading}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                  background: 'transparent', color: theme.text,
                }}
              >Annulla</button>
              <button
                onClick={confirmUnlock}
                disabled={purchaseLoading || (credits ?? 0) < predictionCost}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  border: 'none', background: (credits ?? 0) < predictionCost ? theme.surface15 : theme.cyan,
                  color: (credits ?? 0) < predictionCost ? theme.textDim : '#000',
                  opacity: purchaseLoading ? 0.6 : 1,
                }}
              >{purchaseLoading ? 'Attendi...' : (credits ?? 0) < predictionCost ? 'Crediti insufficienti' : 'Conferma'}</button>
            </div>
            {(credits ?? 0) < predictionCost && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <a href="/prezzi" style={{ fontSize: '12px', color: theme.cyan, textDecoration: 'underline' }}>
                  Acquista crediti
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Shield (post-acquisto) */}
      {/* Shield si attiva dalla card del pronostico sbloccato, non dal modal di acquisto */}

      {/* Modal Successo Acquisto */}
      {purchaseSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setPurchaseSuccess(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: isLight ? '#fff' : '#1a1a2e', borderRadius: '12px',
            padding: '24px', maxWidth: '340px', width: '90%',
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: theme.text, margin: '0 0 16px', lineHeight: 1.5 }}>
              {purchaseSuccess}
            </p>
            <button onClick={() => setPurchaseSuccess(null)} style={{
              padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
              border: 'none', background: theme.cyan, color: '#000',
            }}>OK</button>
          </div>
        </div>
      )}

      <AddBetPopup
        isOpen={addBetPopup.isOpen}
        onClose={() => setAddBetPopup(p => ({...p, isOpen: false}))}
        home={addBetPopup.home}
        away={addBetPopup.away}
        market={addBetPopup.market}
        prediction={addBetPopup.prediction}
        odds={addBetPopup.odds}
        confidence={addBetPopup.confidence}
        probabilitaStimata={addBetPopup.probabilitaStimata}
        systemStake={addBetPopup.systemStake}
      />
    </div>
  );
}