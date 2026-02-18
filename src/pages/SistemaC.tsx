import { useState, useEffect, useMemo } from 'react';

// --- TEMA ---
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

// --- API BASE ---
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// --- STEMMI ---
const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

const LEAGUE_TO_FOLDER: Record<string, string> = {
  'Serie A': 'Italy', 'Serie B': 'Italy', 'Serie C - Girone A': 'Italy', 'Serie C - Girone B': 'Italy', 'Serie C - Girone C': 'Italy',
  'Premier League': 'England', 'Championship': 'England',
  'La Liga': 'Spain', 'LaLiga 2': 'Spain',
  'Bundesliga': 'Germany', '2. Bundesliga': 'Germany',
  'Ligue 1': 'France', 'Ligue 2': 'France',
  'Liga Portugal': 'Portugal', 'Primeira Liga': 'Portugal',
  'Eredivisie': 'Netherlands',
  'Scottish Prem.': 'Scotland', 'Scottish Premiership': 'Scotland',
  'Allsvenskan': 'Sweden', 'Eliteserien': 'Norway', 'Superligaen': 'Denmark',
  'Jupiler Pro': 'Belgium', 'Jupiler Pro League': 'Belgium',
  'Süper Lig': 'Turkey', 'Super Lig': 'Turkey',
  'Brasileirão': 'Brazil', 'Brasileirao': 'Brazil', 'Brasileirão Serie A': 'Brazil', 'Brasileirao Serie A': 'Brazil',
  'Primera División': 'Argentina', 'MLS': 'USA', 'J1 League': 'Japan',
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
  'Allsvenskan': 'allsvenskan', 'Eliteserien': 'eliteserien', 'Superligaen': 'superligaen',
  'Jupiler Pro': 'jupiler_pro_league', 'Jupiler Pro League': 'jupiler_pro_league',
  'Süper Lig': 'super_lig', 'Super Lig': 'super_lig',
  'Brasileirão': 'brasileirao', 'Brasileirao': 'brasileirao', 'Brasileirão Serie A': 'brasileirao', 'Brasileirao Serie A': 'brasileirao',
  'Primera División': 'primera_division_arg', 'MLS': 'mls', 'J1 League': 'j1_league',
};

const LEAGUE_TO_COUNTRY_CODE: Record<string, string> = {
  'Serie A': 'it', 'Serie B': 'it', 'Serie C - Girone A': 'it', 'Serie C - Girone B': 'it', 'Serie C - Girone C': 'it',
  'Premier League': 'gb-eng', 'Championship': 'gb-eng',
  'La Liga': 'es', 'LaLiga 2': 'es',
  'Bundesliga': 'de', '2. Bundesliga': 'de',
  'Ligue 1': 'fr', 'Ligue 2': 'fr',
  'Liga Portugal': 'pt', 'Primeira Liga': 'pt',
  'Eredivisie': 'nl',
  'Scottish Prem.': 'gb-sct', 'Scottish Premiership': 'gb-sct',
  'Allsvenskan': 'se', 'Eliteserien': 'no', 'Superligaen': 'dk',
  'Jupiler Pro': 'be', 'Jupiler Pro League': 'be',
  'Süper Lig': 'tr', 'Super Lig': 'tr',
  'Brasileirão': 'br', 'Brasileirao': 'br', 'Brasileirão Serie A': 'br', 'Brasileirao Serie A': 'br',
  'Primera División': 'ar', 'MLS': 'us', 'J1 League': 'jp',
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

// --- HELPERS ---
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

const getStakeColor = (stake: number): string => {
  if (stake === 0) return '#666';
  if (stake <= 2) return '#4dd0e1';
  if (stake <= 3) return '#66bb6a';
  if (stake <= 5) return '#ffa726';
  return '#ff5252';
};

// --- INTERFACCE ---
interface SimulationData {
  cycles: number;
  home_win_pct: number;
  draw_pct: number;
  away_win_pct: number;
  over_25_pct: number;
  under_25_pct: number;
  gg_pct: number;
  ng_pct: number;
  avg_goals_home: number;
  avg_goals_away: number;
  predicted_score: string;
  top_scores: Array<[string, number]>;
}

interface Pronostico {
  tipo: string;
  pronostico: string;
  confidence: number;
  stars: number;
  quota?: number | null;
  hit?: boolean | null;
  probabilita_stimata?: number | null;
  stake?: number;
  edge?: number;
  prob_mercato?: number | null;
  prob_modello?: number | null;
  has_odds?: boolean;
}

interface EngineCPrediction {
  date: string;
  home: string;
  away: string;
  league: string;
  match_time: string;
  home_mongo_id?: string;
  away_mongo_id?: string;
  decision: string;
  pronostici: Pronostico[];
  confidence_segno: number;
  confidence_gol: number;
  stars_segno: number;
  stars_gol: number;
  comment: string;
  odds: Record<string, any>;
  simulation_data?: SimulationData;
  real_score?: string | null;
  real_sign?: string | null;
  hit?: boolean | null;
}

interface Stats {
  total: number;
  total_matches: number;
  finished: number;
  hits: number;
  misses: number;
  pending: number;
  hit_rate: number | null;
  matches_finished: number;
  matches_hits: number;
  matches_hit_rate: number | null;
}

// ==================== COMPONENTE ====================

export default function SistemaC() {
  const [date, setDate] = useState(getToday());
  const [predictions, setPredictions] = useState<EngineCPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Responsive
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/simulation/daily-predictions-engine-c?date=${date}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setPredictions(data.predictions || []);
          setStats(data.stats || null);
        } else {
          setPredictions([]);
          setStats(null);
        }
      } catch (err: any) {
        setError(err.message || 'Errore di connessione');
        setPredictions([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  // Raggruppamento per lega
  const groupedByLeague = useMemo(() => {
    return predictions.reduce<Record<string, EngineCPrediction[]>>((acc, p) => {
      if (!acc[p.league]) acc[p.league] = [];
      acc[p.league].push(p);
      return acc;
    }, {});
  }, [predictions]);

  // Conteggi per tipo
  const typeCounts = useMemo(() => {
    const counts = { SEGNO: 0, DOPPIA_CHANCE: 0, GOL: 0 };
    for (const p of predictions) {
      for (const pr of (p.pronostici || [])) {
        if (pr.tipo === 'SEGNO') counts.SEGNO++;
        else if (pr.tipo === 'DOPPIA_CHANCE') counts.DOPPIA_CHANCE++;
        else if (pr.tipo === 'GOL') counts.GOL++;
      }
    }
    return counts;
  }, [predictions]);

  const toggleLeague = (league: string) => {
    setCollapsedLeagues(prev => {
      const next = new Set(prev);
      next.has(league) ? next.delete(league) : next.add(league);
      return next;
    });
  };

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // --- RENDER: Barra percentuale MC ---
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

  // --- RENDER: Sezione MC ---
  const renderMCSection = (sim: SimulationData) => (
    <div style={{
      margin: '12px 0 0', padding: '12px',
      background: 'rgba(255, 107, 53, 0.06)',
      border: '1px solid rgba(255, 107, 53, 0.2)',
      borderRadius: '8px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: theme.orange, marginBottom: '10px' }}>
        🎲 Monte Carlo ({sim.cycles} cicli)
      </div>

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
            {(sim.top_scores || []).slice(0, 4).map(([score, count], i) => (
              <span key={i} style={{
                padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                background: i === 0 ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255,255,255,0.06)',
                color: i === 0 ? theme.orange : theme.textDim,
                border: i === 0 ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>
                {score} ({count})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDER: Card partita ---
  const renderCard = (pred: EngineCPrediction) => {
    const key = `${pred.home}|||${pred.away}|||${pred.date}`;
    const isExpanded = expandedCards.has(key);
    const bestConf = Math.max(pred.confidence_segno || 0, pred.confidence_gol || 0);
    const barColor = pred.real_score
      ? (pred.hit ? theme.success : theme.danger)
      : getConfidenceColor(bestConf);

    return (
      <div key={key} style={{
        background: theme.panel,
        border: theme.panelBorder,
        borderRadius: '10px',
        marginBottom: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }} onClick={() => toggleCard(key)}>
        {/* Header */}
        <div style={{ display: 'flex', minHeight: '52px' }}>
          {/* Barra laterale */}
          <div style={{ width: '4px', background: barColor, flexShrink: 0 }} />

          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            {/* Squadre + orario */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '11px', color: theme.textDim, fontWeight: 600, minWidth: '38px' }}>
                {pred.match_time || '--:--'}
              </span>
              <img src={getStemmaUrl(pred.home_mongo_id, pred.league)} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pred.home}
              </span>
              <span style={{ fontSize: '11px', color: theme.textDim }}>vs</span>
              <img src={getStemmaUrl(pred.away_mongo_id, pred.league)} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pred.away}
              </span>
            </div>

            {/* Risultato reale */}
            {pred.real_score && (
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                background: pred.hit ? 'rgba(5,249,182,0.15)' : 'rgba(255,42,109,0.15)',
                color: pred.hit ? theme.success : theme.danger,
              }}>
                {pred.real_score}
              </span>
            )}

            {/* Conteggio pronostici */}
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(255, 107, 53, 0.1)', color: theme.orange,
            }}>
              {pred.pronostici?.filter((p: any) => p.tipo !== 'RISULTATO_ESATTO').length || 0} tip
            </span>
          </div>
        </div>

        {/* Contenuto espanso */}
        {isExpanded && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Pronostici (esclusi RE) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {(pred.pronostici || []).filter((p: any) => p.tipo !== 'RISULTATO_ESATTO').map((p: any, i: number) => {
                const hitColor = p.hit === true ? theme.success : p.hit === false ? theme.danger : theme.textDim;
                return (
                  <div key={i} style={{
                    padding: '6px 10px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${p.hit !== null && p.hit !== undefined ? (p.hit ? 'rgba(5,249,182,0.3)' : 'rgba(255,42,109,0.3)') : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ fontSize: '9px', color: theme.textDim, fontWeight: 600, textTransform: 'uppercase' }}>{p.tipo === 'DOPPIA_CHANCE' ? 'DC' : p.tipo}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: hitColor }}>{p.pronostico}</span>
                    {p.quota && <span style={{ fontSize: '11px', color: theme.gold }}>@{Number(p.quota).toFixed(2)}</span>}
                    <span style={{ fontSize: '10px', color: theme.textDim }}>{p.confidence}%</span>
                    {p.stake != null && p.stake > 0 && (
                      <span style={{ fontSize: '9px', fontWeight: 700, color: getStakeColor(p.stake), padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,0,0,0.3)' }}>
                        S:{p.stake}
                      </span>
                    )}
                    {p.hit === true && <span>✅</span>}
                    {p.hit === false && <span>❌</span>}
                  </div>
                );
              })}
            </div>

            {/* Risultato Esatto — sezione separata */}
            {(pred.pronostici || []).some((p: any) => p.tipo === 'RISULTATO_ESATTO') && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', color: theme.textDim, fontWeight: 600 }}>Risultato MC:</span>
                {(pred.pronostici || []).filter((p: any) => p.tipo === 'RISULTATO_ESATTO').map((p: any, i: number) => (
                  <span key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {p.pronostico} ({p.confidence}%){i < (pred.pronostici || []).filter((q: any) => q.tipo === 'RISULTATO_ESATTO').length - 1 ? '  ·' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Quote */}
            {pred.odds && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {pred.odds['1'] && <span style={{ fontSize: '10px', color: theme.textDim, background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '3px' }}>1: {pred.odds['1']}</span>}
                {pred.odds['X'] && <span style={{ fontSize: '10px', color: theme.textDim, background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '3px' }}>X: {pred.odds['X']}</span>}
                {pred.odds['2'] && <span style={{ fontSize: '10px', color: theme.textDim, background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '3px' }}>2: {pred.odds['2']}</span>}
              </div>
            )}

            {/* Monte Carlo */}
            {pred.simulation_data && renderMCSection(pred.simulation_data)}

            {/* Commento */}
            {pred.comment && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: theme.textDim, fontStyle: 'italic' }}>
                {typeof pred.comment === 'string' ? pred.comment : ''}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER PRINCIPALE ====================
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: isMobile ? '#1a1d2e' : theme.bg,
      backgroundImage: isMobile
        ? 'radial-gradient(circle at 50% 0%, #2a2d4a 0%, #1a1d2e 70%)'
        : 'radial-gradient(circle at 50% 0%, #1a1d2e 0%, #05070a 70%)',
      color: theme.text,
      fontFamily: theme.font,
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={() => window.history.back()} style={{
            background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '14px', padding: '8px',
          }}>
            ← Indietro
          </button>
          <button onClick={() => window.location.href = '/'} style={{
            background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#00f0ff', cursor: 'pointer', fontSize: '11px', padding: '5px 12px', borderRadius: '6px', fontWeight: 600,
          }}>
            🔮 Pronostici
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: isMobile ? '18px' : '22px', fontWeight: 800,
              background: 'linear-gradient(135deg, #ff6b35, #ff9f43)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              🎲 Sistema C
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim }}>Monte Carlo Predictions</div>
          </div>
          <div style={{ width: '60px' }} />
        </div>

        {/* Navigazione data */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px',
          background: theme.panel, border: theme.panelBorder, borderRadius: '10px', padding: '10px',
        }}>
          <button onClick={() => setDate(shiftDate(date, -1))} style={{
            background: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.3)',
            borderRadius: '6px', color: theme.orange, cursor: 'pointer', padding: '6px 12px', fontSize: '14px', fontWeight: 700,
          }}>◀</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: theme.text }}>{formatDateLabel(date)}</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
              background: 'transparent', border: 'none', color: theme.textDim, fontSize: '11px', cursor: 'pointer', textAlign: 'center',
            }} />
          </div>
          <button onClick={() => setDate(shiftDate(date, 1))} style={{
            background: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.3)',
            borderRadius: '6px', color: theme.orange, cursor: 'pointer', padding: '6px 12px', fontSize: '14px', fontWeight: 700,
          }}>▶</button>
        </div>

        {/* Stats summary */}
        {stats && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap',
          }}>
            <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: theme.orange }}>{stats.total_matches}</div>
              <div style={{ fontSize: '10px', color: theme.textDim }}>Partite</div>
            </div>
            <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: theme.text }}>{typeCounts.SEGNO + typeCounts.DOPPIA_CHANCE + typeCounts.GOL}</div>
              <div style={{ fontSize: '10px', color: theme.textDim }}>Tips</div>
            </div>
            {typeCounts.SEGNO > 0 && (
              <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.cyan }}>{typeCounts.SEGNO}</div>
                <div style={{ fontSize: '10px', color: theme.textDim }}>Segno</div>
              </div>
            )}
            {typeCounts.DOPPIA_CHANCE > 0 && (
              <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.purple }}>{typeCounts.DOPPIA_CHANCE}</div>
                <div style={{ fontSize: '10px', color: theme.textDim }}>DC</div>
              </div>
            )}
            {typeCounts.GOL > 0 && (
              <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: theme.success }}>{typeCounts.GOL}</div>
                <div style={{ fontSize: '10px', color: theme.textDim }}>Gol</div>
              </div>
            )}
            {stats.hit_rate !== null && (
              <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: stats.hit_rate >= 60 ? theme.success : stats.hit_rate >= 50 ? theme.warning : theme.danger }}>
                  {stats.hit_rate}%
                </div>
                <div style={{ fontSize: '10px', color: theme.textDim }}>HR ({stats.hits}/{stats.finished})</div>
              </div>
            )}
          </div>
        )}

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
            Caricamento...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.danger, background: 'rgba(255,42,109,0.1)', borderRadius: '8px', marginBottom: '16px' }}>
            ❌ {error}
          </div>
        )}

        {!loading && !error && predictions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            Nessun pronostico MC per questa data.
          </div>
        )}

        {/* Lista per lega */}
        {!loading && Object.entries(groupedByLeague).map(([league, preds]) => {
          const isCollapsed = collapsedLeagues.has(league);
          const countryCode = LEAGUE_TO_COUNTRY_CODE[league];
          const leagueLogo = getLeagueLogoUrl(league);

          return (
            <div key={league} style={{ marginBottom: '12px' }}>
              {/* Header lega */}
              <div
                onClick={() => toggleLeague(league)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', marginBottom: '6px',
                  background: 'rgba(255, 107, 53, 0.06)',
                  border: '1px solid rgba(255, 107, 53, 0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {leagueLogo ? (
                  <img src={leagueLogo} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                ) : countryCode ? (
                  <img src={`https://flagcdn.com/w40/${countryCode}.png`} alt="" style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: '2px' }} />
                ) : null}
                <span style={{ fontSize: '13px', fontWeight: 700, color: theme.orange, flex: 1 }}>{league}</span>
                <span style={{ fontSize: '11px', color: theme.textDim }}>{preds.length} partite</span>
                <span style={{ fontSize: '12px', color: theme.textDim }}>{isCollapsed ? '▶' : '▼'}</span>
              </div>

              {/* Cards */}
              {!isCollapsed && preds.map(pred => renderCard(pred))}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '10px', color: theme.textDim }}>
          Sistema C — Monte Carlo Engine (100 cicli, Master mode 5)
        </div>
      </div>
    </div>
  );
}
