import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import { shareElement } from '../utils/shareCard';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

// CSS: nascondi spinner input number + forza caret color
if (typeof document !== 'undefined' && !document.getElementById('bollette-input-css')) {
  const style = document.createElement('style');
  style.id = 'bollette-input-css';
  style.textContent = `
    .bollette-stake-input::-webkit-inner-spin-button,
    .bollette-stake-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .bollette-stake-input[type=number] { -moz-appearance: textfield; }
    .bollette-stake-input { caret-color: ${isLight ? '#1a1a1a' : '#fff'} !important; }
  `;
  document.head.appendChild(style);
}

// ============================================
// DIZIONARIO COMPETIZIONI — prefissi abbreviati
// ============================================
const LEAGUE_PREFIX: Record<string, string> = {
  'Serie A': 'ITA1',
  'Serie B': 'ITA2',
  'Serie C - Girone A': 'ITA3A',
  'Serie C - Girone B': 'ITA3B',
  'Serie C - Girone C': 'ITA3C',
  'Premier League': 'ENG1',
  'Championship': 'ENG2',
  'La Liga': 'ESP1',
  'LaLiga 2': 'ESP2',
  'Ligue 1': 'FRA1',
  'Ligue 2': 'FRA2',
  'Bundesliga': 'GER1',
  '2. Bundesliga': 'GER2',
  'Eredivisie': 'NED1',
  'Liga Portugal': 'POR1',
  'Süper Lig': 'TUR1',
  'Champions League': 'UCL',
  'Europa League': 'UEL',
  'Conference League': 'UECL',
  'Brasileirão Serie A': 'BRA1',
  'Major League Soccer': 'MLS',
  'Primera División': 'ARG1',
  'League of Ireland Premier Division': 'IRL1',
};

function getLeaguePrefix(league?: string): string {
  if (!league) return '';
  return LEAGUE_PREFIX[league] || league.substring(0, 3).toUpperCase();
}

// Formatta data YYYY-MM-DD in DD/MM/YYYY (formato italiano)
function formatDateIT(date: string): string {
  if (!date || date.length < 10) return date || '';
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

// ============================================
// LIVE SCORES — Algoritmo esito pronostico
// ============================================

interface LiveScore {
  home: string;
  away: string;
  live_score: string;
  live_status: string;
  live_minute: number;
}

type EsitoLive = 'pending' | 'win' | 'lose' | 'live_win' | 'live_lose';

function calculateHitFromScore(score: string, pronostico: string, tipo: string): boolean | null {
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
  if (tipo === 'GOL') {
    const p = pronostico.toLowerCase();
    if (p.startsWith('over')) { const thr = parseFloat(pronostico.split(' ')[1]); return total > thr; }
    if (p.startsWith('under')) { const thr = parseFloat(pronostico.split(' ')[1]); return total < thr; }
    if (p === 'goal') return home > 0 && away > 0;
    if (p === 'nogoal') return home === 0 || away === 0;
    const mg = pronostico.match(/^MG\s+(\d+)-(\d+)/i);
    if (mg) return total >= parseInt(mg[1]) && total <= parseInt(mg[2]);
    return null;
  }
  if (tipo === 'RISULTATO_ESATTO') {
    return `${home}:${away}` === pronostico.replace('-', ':');
  }
  return null;
}

function getEsitoLive(sel: Selezione, liveScores: LiveScore[]): EsitoLive {
  // Se esito già salvato in MongoDB
  if (sel.esito === true) return 'win';
  if (sel.esito === false) return 'lose';

  // Se real_score arricchito dal backend (fonte definitiva, come pagina pronostici)
  if ((sel as any).real_score) {
    const hit = calculateHitFromScore((sel as any).real_score, sel.pronostico, sel.mercato);
    if (hit !== null) return hit ? 'win' : 'lose';
  }

  // Se match_finished dal backend ma senza real_score, usa live_score arricchito
  if ((sel as any).match_finished && (sel as any).live_score) {
    const hit = calculateHitFromScore((sel as any).live_score, sel.pronostico, sel.mercato);
    if (hit !== null) return hit ? 'win' : 'lose';
  }
  if ((sel as any).live_status === 'Finished' && (sel as any).live_score) {
    const hit = calculateHitFromScore((sel as any).live_score, sel.pronostico, sel.mercato);
    if (hit !== null) return hit ? 'win' : 'lose';
  }

  // Fallback: polling live scores (per partite in corso)
  const live = liveScores.find(s => s.home === sel.home && s.away === sel.away);
  if (!live || !live.live_score) return 'pending';

  const isFinished = live.live_status === 'Finished';
  const hit = calculateHitFromScore(live.live_score, sel.pronostico, sel.mercato);

  if (hit === null) return 'pending';
  if (isFinished) return hit ? 'win' : 'lose';
  return hit ? 'live_win' : 'live_lose';
}



// ============================================
// TYPES
// ============================================

interface Selezione {
  home: string;
  away: string;
  league: string;
  match_time: string;
  match_date: string;
  mercato: string;
  pronostico: string;
  quota: number;
  confidence: number;
  stars: number;
  esito: boolean | null;
  from_pool?: boolean;
}

interface Bolletta {
  _id: string;
  date: string;
  tipo: 'oggi' | 'selettiva' | 'bilanciata' | 'ambiziosa';
  custom?: boolean;
  quota_totale: number;
  label: string;
  selezioni: Selezione[];
  esito_globale: string | null;
  saved_by: string[];
  user_stakes?: Record<string, number>;
  stake_amount?: number;
  reasoning?: string;
  pool_size: number;
}

type Categoria = 'oggi' | 'selettiva' | 'bilanciata' | 'ambiziosa' | 'custom';

// ============================================
// HELPERS
// ============================================

function formatMercato(mercato: string, pronostico: string): string {
  switch (mercato) {
    case 'SEGNO': return `1X2 ESITO FINALE: ${pronostico}`;
    case 'DOPPIA_CHANCE': return `DOPPIA CHANCE: ${pronostico}`;
    case 'GOL':
      if (pronostico === 'Goal') return 'GOAL/NOGOAL: GOAL';
      if (pronostico === 'NoGoal') return 'GOAL/NOGOAL: NO GOAL';
      if (pronostico.startsWith('Over')) return `U/O: ${pronostico.toUpperCase()}`;
      if (pronostico.startsWith('Under')) return `U/O: ${pronostico.toUpperCase()}`;
      if (pronostico.startsWith('MG')) return `MULTIGOL: ${pronostico.replace('MG ', '')}`;
      return pronostico;
    case 'RISULTATO_ESATTO': return `RE: ${pronostico}`;
    default: return `${mercato}: ${pronostico}`;
  }
}

const CATEGORIE: { key: Categoria; emoji: string; label: string; subtitle: string; gradient: string; gradientLight: string }[] = [
  { key: 'oggi', emoji: '📅', label: 'Oggi', subtitle: 'Solo partite di oggi', gradient: 'linear-gradient(135deg, #1a237e, #283593)', gradientLight: 'linear-gradient(135deg, #e3f2fd, #bbdefb)' },
  { key: 'selettiva', emoji: '🎯', label: 'Selettiva', subtitle: 'Quota 1.5 — 3.0', gradient: 'linear-gradient(135deg, #004d40, #00695c)', gradientLight: 'linear-gradient(135deg, #e0f2f1, #b2dfdb)' },
  { key: 'bilanciata', emoji: '⚖️', label: 'Bilanciata', subtitle: 'Quota 3.0 — 8.0', gradient: 'linear-gradient(135deg, #4a148c, #6a1b9a)', gradientLight: 'linear-gradient(135deg, #f3e5f5, #e1bee7)' },
  { key: 'ambiziosa', emoji: '🚀', label: 'Ambiziosa', subtitle: 'Quota 8.0+', gradient: 'linear-gradient(135deg, #b71c1c, #c62828)', gradientLight: 'linear-gradient(135deg, #fce4ec, #f8bbd0)' },
];

// ============================================
// QUADRANTE — anteprima categoria
// ============================================

function Quadrante({ cat, items, onClick, liveScores = [], height = 322, maxPreview = 3, dataTour }: {
  cat: typeof CATEGORIE[0];
  items: Bolletta[];
  onClick: () => void;
  liveScores?: LiveScore[];
  height?: number;
  maxPreview?: number;
  dataTour?: string;
}) {
  const preview = items.slice(0, maxPreview);
  const textColor = isLight ? '#333' : '#fff';
  const dimColor = isLight ? '#666' : 'rgba(255,255,255,0.6)';

  return (
    <div
      onClick={onClick}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      style={{
        background: isLight ? cat.gradientLight : cat.gradient,
        borderRadius: 16,
        padding: '12px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
        height,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = isLight ? '0 8px 24px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{cat.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: textColor }}>{cat.label}</div>
            <div style={{ fontSize: 11, color: dimColor }}>{cat.subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(() => {
            let vinte = 0, perse = 0;
            for (const b of items) {
              if (b.esito_globale === 'vinta') { vinte++; continue; }
              if (b.esito_globale === 'persa') { perse++; continue; }
              // Calcola da live scores
              const esitiLive = b.selezioni.map(s => getEsitoLive(s, liveScores));
              const hasDefinitiveLose = esitiLive.some(e => e === 'lose');
              const allDone = esitiLive.every(e => e === 'win' || e === 'lose');
              if (hasDefinitiveLose) { perse++; continue; }
              if (allDone && esitiLive.every(e => e === 'win')) { vinte++; continue; }
            }
            const showStats = vinte > 0 || perse > 0;
            return showStats ? (
              <>
                {vinte > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#4caf50', background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 6 }}>{vinte}✓</span>}
                {perse > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#f44336', background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 6 }}>{perse}✗</span>}
              </>
            ) : null;
          })()}
          <div style={{
            background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 13, fontWeight: 700, color: textColor,
          }}>
            {items.length}
          </div>
        </div>
      </div>

      {/* Anteprima bollette */}
      {items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dimColor, fontSize: 14 }}>
          Nessuna bolletta
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          {preview.map((b) => (
            <div key={b._id} style={{
              background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
              borderRadius: 8, padding: '6px 10px',
              fontSize: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: textColor, fontSize: 13 }}>{b.label}</span>
                <span style={{ fontWeight: 700, color: textColor }}>{b.quota_totale.toFixed(2)}</span>
              </div>
              {b.selezioni.slice(0, b.selezioni.length <= 2 ? 2 : 1).map((s, j) => (
                <div key={j} style={{ color: dimColor, fontSize: 11, lineHeight: 1.4 }}>
                  {s.league && <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, marginRight: 4 }}>{getLeaguePrefix(s.league)}</span>}{s.home} - {s.away} · {formatMercato(s.mercato, s.pronostico)}
                </div>
              ))}
              {b.selezioni.length > 2 && (
                <div style={{ color: dimColor, fontSize: 11, fontStyle: 'italic' }}>
                  +{b.selezioni.length - 1} altre selezioni...
                </div>
              )}
            </div>
          ))}
          {items.length > maxPreview && (
            <div style={{ color: dimColor, fontSize: 12, textAlign: 'center', marginTop: 2 }}>
              +{items.length - maxPreview} altre bollette
            </div>
          )}
        </div>
      )}

      {/* Freccia */}
      <div style={{ textAlign: 'right', color: dimColor, fontSize: 14 }}>
        Apri ›
      </div>
    </div>
  );
}

// ============================================
// LE MIE BOLLETTE — Pagina personale con storico e stats
// ============================================

function MieBollette({ onBack, liveScores, user, getIdToken }: {
  onBack: () => void;
  liveScores: LiveScore[];
  user: any;
  getIdToken: () => Promise<string | null>;
}) {
  const [myBollette, setMyBollette] = useState<Bolletta[]>([]);
  const [stats, setStats] = useState<{ vinte: number; perse: number; in_corso: number; totale: number; totale_stake: number; profitto: number } | null>(null);
  const [loadingMy, setLoadingMy] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filtroStato, setFiltroStato] = useState<'tutti' | 'vinte' | 'perse' | 'in_corso'>('tutti');
  const [filtroFascia, setFiltroFascia] = useState<'tutti' | 'selettiva' | 'bilanciata' | 'ambiziosa' | 'custom'>('tutti');
  const [ordinaData, setOrdinaData] = useState<'recenti' | 'vecchie'>('recenti');
  const myCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const textPrimary = isLight ? '#1a1a1a' : '#fff';
  const textSecondary = isLight ? '#666' : '#999';
  const cardBg = isLight ? '#ffffff' : '#1a1d2e';
  const cardBorder = isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)';
  const rowBorder = isLight ? '1px solid #eee' : '1px solid rgba(255,255,255,0.06)';
  const headerBg = isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)';

  const fetchMy = useCallback(async () => {
    if (!user) return;
    setLoadingMy(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/bollette/my`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMyBollette(data.bollette || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Errore fetch mie bollette:', err);
    }
    setLoadingMy(false);
  }, [user]);

  useEffect(() => { fetchMy(); }, [fetchMy]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo ticket?')) return;
    setDeletingId(id);
    try {
      const token = await getIdToken();
      await fetch(`${API_BASE}/bollette/${id}/remove`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setMyBollette(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      console.error('Errore eliminazione:', err);
    }
    setDeletingId(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: isLight ? '#f5f5f5' : theme.bg,
      color: textPrimary, fontFamily: theme.font,
      overflowY: 'auto', zIndex: 110,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: isLight ? '#fff' : theme.panelSolid,
        borderBottom: isLight ? '1px solid #e0e0e0' : theme.panelBorder,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none',
          color: isLight ? '#333' : theme.cyan,
          cursor: 'pointer', fontSize: 20, padding: '4px 8px',
        }}>←</button>
        <span style={{ fontSize: 22 }}>✨</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Le mie bollette</h1>
      </div>

      <div style={{ padding: '16px', maxWidth: 700, margin: '0 auto' }}>
        {/* Stats */}
        {stats && (() => {
          const chiuse = stats.vinte + stats.perse;
          const winRate = chiuse > 0 ? ((stats.vinte / chiuse) * 100).toFixed(1) : '—';
          const roi = stats.totale_stake > 0 ? ((stats.profitto / stats.totale_stake) * 100).toFixed(1) : '—';
          const quotaMedia = myBollette.length > 0
            ? (myBollette.reduce((acc, b) => acc + (b.quota_totale || 0), 0) / myBollette.length).toFixed(2)
            : '—';

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Vinte', value: stats.vinte, color: '#4caf50' },
                { label: 'Perse', value: stats.perse, color: '#f44336' },
                { label: 'In corso', value: stats.in_corso, color: '#ff9800' },
                { label: 'Win Rate', value: `${winRate}%`, color: parseFloat(winRate as string) >= 50 ? '#4caf50' : parseFloat(winRate as string) > 0 ? '#f44336' : textPrimary },
                { label: 'ROI', value: `${roi}%`, color: parseFloat(roi as string) >= 0 ? '#4caf50' : '#f44336' },
                { label: 'Quota media', value: quotaMedia, color: textPrimary },
                { label: 'Profitto', value: `€${stats.profitto >= 0 ? '+' : ''}${stats.profitto.toFixed(2)}`, color: stats.profitto >= 0 ? '#4caf50' : '#f44336', span: 3 },
              ].map(s => (
                <div key={s.label} style={{
                  background: cardBg, border: cardBorder, borderRadius: 10,
                  padding: '10px 8px', textAlign: 'center',
                  gridColumn: (s as any).span ? `span ${(s as any).span}` : undefined,
                }}>
                  <div style={{ fontSize: (s as any).span ? 24 : 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Filtri — riga 1: stato + ordine data */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          {(['tutti', 'vinte', 'perse', 'in_corso'] as const).map(f => (
            <button key={f} onClick={() => setFiltroStato(f)} style={{
              background: filtroStato === f ? (isLight ? '#333' : '#fff') : (isLight ? '#e8e8e8' : 'rgba(255,255,255,0.08)'),
              color: filtroStato === f ? (isLight ? '#fff' : '#000') : textSecondary,
              border: 'none', borderRadius: 16, padding: '5px 12px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              {f === 'tutti' ? 'Tutti' : f === 'vinte' ? '✓ Vinte' : f === 'perse' ? '✗ Perse' : '⏳ In corso'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setOrdinaData(prev => prev === 'recenti' ? 'vecchie' : 'recenti')} style={{
            background: isLight ? '#e8e8e8' : 'rgba(255,255,255,0.08)',
            color: textSecondary, border: 'none', borderRadius: 16, padding: '5px 12px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            📅 {ordinaData === 'recenti' ? '↓' : '↑'}
          </button>
        </div>
        {/* Filtri — riga 2: fascia */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['tutti', 'selettiva', 'bilanciata', 'ambiziosa', 'custom'] as const).map(f => (
            <button key={f} onClick={() => setFiltroFascia(f)} style={{
              background: filtroFascia === f ? (isLight ? '#333' : '#fff') : (isLight ? '#e8e8e8' : 'rgba(255,255,255,0.08)'),
              color: filtroFascia === f ? (isLight ? '#fff' : '#000') : textSecondary,
              border: 'none', borderRadius: 16, padding: '5px 12px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              {f === 'tutti' ? 'Tutte' : f === 'custom' ? '✨ Custom' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loadingMy ? (
          <div style={{ textAlign: 'center', padding: 40, color: textSecondary }}>Caricamento...</div>
        ) : myBollette.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: textSecondary }}>
            Nessuna bolletta salvata. Salva le bollette che ti piacciono dalla pagina principale!
          </div>
        ) : (() => {
          // Filtra e ordina
          let filtered = myBollette.filter(b => {
            const esitiLive = b.selezioni.map(s => getEsitoLive(s, liveScores));
            const hasDefinitiveLose = esitiLive.some(e => e === 'lose');
            const allWin = esitiLive.every(e => e === 'win');
            const allDone = esitiLive.every(e => e === 'win' || e === 'lose');

            if (filtroStato === 'vinte' && !(allDone && allWin)) return false;
            if (filtroStato === 'perse' && !hasDefinitiveLose) return false;
            if (filtroStato === 'in_corso' && (allDone || hasDefinitiveLose)) return false;

            if (filtroFascia !== 'tutti') {
              if (filtroFascia === 'custom' && !b.custom) return false;
              if (filtroFascia !== 'custom' && b.tipo !== filtroFascia) return false;
            }
            return true;
          });

          if (ordinaData === 'vecchie') {
            filtered = [...filtered].reverse();
          }

          if (filtered.length === 0) {
            return <div style={{ textAlign: 'center', padding: 30, color: textSecondary, fontSize: 13 }}>Nessuna bolletta con questi filtri</div>;
          }

          return filtered.map((b, bIdx) => {
            const isCollapsedB = collapsed[b._id] ?? false;
            const esitiLive = b.selezioni.map(s => getEsitoLive(s, liveScores));
            const hasLose = esitiLive.some(e => e === 'lose' || e === 'live_lose');
            const allWin = esitiLive.every(e => e === 'win');
            const allDone = esitiLive.every(e => e === 'win' || e === 'lose');
            const anyLive = esitiLive.some(e => e === 'live_win' || e === 'live_lose');
            const allPending = esitiLive.every(e => e === 'pending');

            const dotColor = allPending ? (isLight ? '#ddd' : '#444')
              : hasLose ? '#f44336' : allWin ? '#4caf50' : '#4caf50';
            const blink = anyLive && !allDone;

            const hasDefinitiveLose = esitiLive.some(e => e === 'lose');
            const hasLiveLose = esitiLive.some(e => e === 'live_lose');

            const statusLabel = allPending ? null
              : hasDefinitiveLose ? 'PERSA'
              : (allDone && allWin) ? 'VINTA!'
              : hasLiveLose ? 'A RISCHIO'
              : anyLive ? 'LIVE'
              : null;
            const statusColor = statusLabel === 'PERSA' ? '#f44336'
              : statusLabel === 'VINTA!' ? '#4caf50'
              : statusLabel === 'A RISCHIO' ? '#ff9800'
              : statusLabel === 'LIVE' ? '#ff9800'
              : undefined;

            const userStake = user ? (b.user_stakes?.[user.uid] || b.stake_amount || 0) : 0;

            return (
              <div key={b._id} {...(bIdx === 0 ? { 'data-tour': 'mia-prima-bolletta' } : {})} ref={(el) => { myCardRefs.current[b._id] = el; }} style={{
                background: cardBg, border: cardBorder,
                borderRadius: 12, marginBottom: 14, overflow: 'hidden',
                boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}>
                {/* Header */}
                <div
                  onClick={() => setCollapsed(prev => ({ ...prev, [b._id]: !prev[b._id] }))}
                  style={{
                    padding: '10px 16px', cursor: 'pointer',
                    background: headerBg, borderBottom: isCollapsedB ? 'none' : rowBorder,
                  }}
                >
                  {/* Riga 1: tondino + stato + quota + freccia */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={blink ? 'blink-dot' : ''} style={{
                        width: 12, height: 12, borderRadius: '50%', background: dotColor, flexShrink: 0,
                      }} />
                      {statusLabel && (
                        <span className={statusLabel === 'LIVE' ? 'blink-dot' : ''} style={{
                          fontSize: 11, fontWeight: 800, color: statusColor,
                          background: `${statusColor}18`, padding: '2px 8px', borderRadius: 4,
                        }}>
                          {statusLabel}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {userStake > 0 && (
                        <span style={{ fontSize: 12, color: textSecondary }}>€{userStake}</span>
                      )}
                      <span style={{ fontSize: 11, color: textSecondary }}>Quota</span>
                      <span style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>
                        {b.quota_totale.toFixed(2)}
                      </span>
                      <span style={{ color: textSecondary, fontSize: 12 }}>
                        {isCollapsedB ? '▼' : '▲'}
                      </span>
                    </div>
                  </div>
                  {/* Riga 2: label + data + selezioni */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: textPrimary }}>{b.label}</span>
                    <span style={{ fontSize: 11, color: textSecondary }}>· {formatDateIT(b.date)}</span>
                    <span style={{ fontSize: 11, color: textSecondary }}>· {b.selezioni.length} sel.</span>
                  </div>
                </div>

                {/* Selezioni */}
                {!isCollapsedB && (
                  <>
                    {b.selezioni.map((s, i) => {
                      const esLive = getEsitoLive(s, liveScores);
                      const bgEsito = (esLive === 'win' || esLive === 'live_win')
                        ? (isLight ? '#f0fdf4' : 'rgba(0,255,136,0.08)')
                        : (esLive === 'lose' || esLive === 'live_lose')
                          ? (isLight ? '#fef2f2' : 'rgba(255,68,102,0.08)')
                          : 'transparent';
                      const sDotColor = esLive === 'win' || esLive === 'live_win' ? '#4caf50'
                        : esLive === 'lose' || esLive === 'live_lose' ? '#f44336'
                        : isLight ? '#ddd' : '#444';
                      const sBlinking = esLive === 'live_win' || esLive === 'live_lose';

                      return (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          padding: '12px 16px',
                          borderBottom: i < b.selezioni.length - 1 ? rowBorder : 'none',
                          background: bgEsito,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{s.league && <span style={{ fontSize: 10, fontWeight: 600, color: textSecondary, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>{getLeaguePrefix(s.league)}</span>}{s.home} - {s.away}</span>
                              {(() => {
                                // Priorità: real_score (backend) > live_score (backend) > polling live
                                const realScore = (s as any).real_score;
                                const enrichedLive = (s as any).live_score;
                                const enrichedStatus = (s as any).live_status;
                                const live = liveScores.find(l => l.home === s.home && l.away === s.away);

                                const score = realScore || enrichedLive || live?.live_score;
                                if (!score) return null;
                                const fin = !!realScore || enrichedStatus === 'Finished' || (s as any).match_finished || live?.live_status === 'Finished';
                                const minute = live?.live_minute || (s as any).live_minute;
                                return (
                                  <span style={{
                                    fontSize: 13, fontWeight: 700,
                                    color: fin ? textSecondary : '#f44336',
                                    background: isLight ? (fin ? '#f0f0f0' : 'rgba(244,67,54,0.08)') : (fin ? 'rgba(255,255,255,0.08)' : 'rgba(244,67,54,0.15)'),
                                    padding: '1px 8px', borderRadius: 6,
                                  }}>
                                    {score.replace(':', ' - ')}
                                    {!fin && minute ? ` ${minute}'` : ''}
                                    {fin ? ' FT' : ''}
                                  </span>
                                );
                              })()}
                            </div>
                            <div style={{ fontSize: 12, color: textSecondary, marginTop: 3, textTransform: 'uppercase' }}>
                              {formatMercato(s.mercato, s.pronostico)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 12, color: textSecondary }}>
                                {formatDateIT(s.match_date).slice(0, 5)} - {s.match_time}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 17, color: textPrimary, marginTop: 2 }}>
                                {s.quota.toFixed(2)}
                              </div>
                            </div>
                            <div className={sBlinking ? 'blink-dot' : ''} style={{
                              width: 22, height: 22, borderRadius: '50%', background: sDotColor, flexShrink: 0,
                            }} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Footer: quota + stake + vincita + elimina */}
                    <div style={{ padding: '10px 16px', borderTop: rowBorder, background: headerBg }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: textSecondary }}>Quota totale</span>
                        <span style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>{b.quota_totale.toFixed(2)}</span>
                      </div>
                      {userStake > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 13, color: textSecondary }}>Puntata</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>€{userStake.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isLight ? '#059669' : '#4caf50' }}>Vincita potenziale</span>
                            <span style={{ fontWeight: 700, fontSize: 18, color: isLight ? '#059669' : '#4caf50' }}>
                              €{(userStake * b.quota_totale).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                      {/* Bottone Condividi */}
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = myCardRefs.current[b._id];
                            if (el) shareElement(el, `ai-simulator-${b.label.replace(/\s+/g, '-').toLowerCase()}.png`);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: isLight ? 'rgba(0,119,204,0.08)' : 'rgba(6,182,212,0.1)',
                            border: isLight ? '1px solid rgba(0,119,204,0.25)' : '1px solid rgba(6,182,212,0.25)',
                            borderRadius: 8, padding: '7px 18px',
                            color: isLight ? '#0077cc' : '#06b6d4',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = isLight ? 'rgba(0,119,204,0.2)' : 'rgba(6,182,212,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isLight ? 'rgba(0,119,204,0.08)' : 'rgba(6,182,212,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <img src="/share-icon.png" alt="" style={{ width: '16px', height: '16px', filter: isLight ? 'invert(35%) sepia(80%) saturate(500%) hue-rotate(180deg)' : 'invert(70%) sepia(50%) saturate(500%) hue-rotate(150deg)' }} />
                          Condividi
                        </button>
                      </div>
                      {/* Bottone elimina */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(b._id); }}
                        disabled={deletingId === b._id}
                        style={{
                          marginTop: 10, width: '100%', padding: '8px',
                          background: isLight ? '#fef2f2' : 'rgba(244,67,54,0.1)',
                          border: isLight ? '1px solid #fca5a5' : '1px solid rgba(244,67,54,0.3)',
                          borderRadius: 8, cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                          color: '#f44336',
                          opacity: deletingId === b._id ? 0.5 : 1,
                        }}
                      >
                        {deletingId === b._id ? 'Eliminando...' : '🗑 Elimina bolletta'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ============================================
// VISTA DETTAGLIO — lista bollette di una categoria
// ============================================

function VistaDettaglio({ cat, items, onBack, savedIds, onSave, savingId, liveScores, userId, shareCard }: {
  cat: typeof CATEGORIE[0];
  items: Bolletta[];
  onBack: () => void;
  savedIds: Set<string>;
  onSave: (id: string, stakeAmount?: number) => void;
  savingId: string | null;
  liveScores: LiveScore[];
  userId?: string;
  shareCard: (el: HTMLElement, label: string) => void;
}) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [stakes, setStakes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (userId) {
      for (const b of items) {
        const saved = b.user_stakes?.[userId] || b.stake_amount || 0;
        if (saved && saved > 0) initial[b._id] = String(saved);
      }
    }
    return initial;
  });
  const textPrimary = isLight ? '#1a1a1a' : '#fff';
  const textSecondary = isLight ? '#666' : '#999';
  const cardBg = isLight ? '#ffffff' : '#1a1d2e';
  const cardBorder = isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)';
  const rowBorder = isLight ? '1px solid #eee' : '1px solid rgba(255,255,255,0.06)';
  const headerBg = isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: isLight ? '#f5f5f5' : theme.bg,
      color: textPrimary, fontFamily: theme.font,
      overflowY: 'auto', zIndex: 110,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: isLight ? '#fff' : theme.panelSolid,
        borderBottom: isLight ? '1px solid #e0e0e0' : theme.panelBorder,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none',
          color: isLight ? '#333' : theme.cyan,
          cursor: 'pointer', fontSize: 20, padding: '4px 8px',
        }}>←</button>
        <span style={{ fontSize: 22 }}>{cat.emoji}</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{cat.label}</h1>
        <span style={{ color: textSecondary, fontSize: 14 }}>
          {items.length} bollette
        </span>
      </div>

      {/* Bollette */}
      <div style={{ padding: '12px', maxWidth: 700, margin: '0 auto' }}>
        {items.map((b, bIdx) => {
          const isCollapsed = collapsed[b._id] ?? false;
          const isSaved = savedIds.has(b._id);
          const esitiAll = b.selezioni.map(s => getEsitoLive(s, liveScores));
          const anyStarted = esitiAll.some(e => e !== 'pending');
          const hasStake = parseFloat(stakes[b._id]) > 0;
          const canSave = !isSaved && !anyStarted && hasStake;

          return (
            <div key={b._id} ref={(el) => { cardRefs.current[b._id] = el; }} {...(bIdx === 0 || b._id === 'tour-fake-001' ? { 'data-tour': 'ticket-first-bolletta' } : {})} style={{
              background: cardBg, border: cardBorder,
              borderRadius: 12, marginBottom: 14, overflow: 'hidden',
              boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}>
              {/* Header bolletta */}
              <div
                onClick={() => setCollapsed(prev => ({ ...prev, [b._id]: !prev[b._id] }))}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  background: headerBg,
                  borderBottom: isCollapsed ? 'none' : rowBorder,
                }}
              >
                {/* Riga 1: tondino + stato + quota + freccia */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(() => {
                      const esitiLive = b.selezioni.map(s => getEsitoLive(s, liveScores));
                      const hasLose = esitiLive.some(e => e === 'lose' || e === 'live_lose');
                      const allWin = esitiLive.every(e => e === 'win');
                      const allDone = esitiLive.every(e => e === 'win' || e === 'lose');
                      const anyLive = esitiLive.some(e => e === 'live_win' || e === 'live_lose');
                      const allPending = esitiLive.every(e => e === 'pending');

                      const color = allPending ? (isLight ? '#ddd' : '#444')
                        : hasLose ? '#f44336'
                        : allWin ? '#4caf50'
                        : '#4caf50';
                      const blink = anyLive && !allDone && !hasLose;

                      const statusLabel = allPending ? null
                        : (allDone && hasLose) ? 'PERSA'
                        : (allDone && allWin) ? 'VINTA!'
                        : (hasLose && !allDone) ? 'PERSA'
                        : anyLive ? 'LIVE'
                        : null;
                      const statusColor = statusLabel === 'PERSA' ? '#f44336'
                        : statusLabel === 'VINTA!' ? '#4caf50'
                        : statusLabel === 'LIVE' ? '#ff9800'
                        : undefined;

                      return (
                        <>
                          <div className={blink ? 'blink-dot' : ''} style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: color, flexShrink: 0,
                          }} />
                          {statusLabel && (
                            <span className={statusLabel === 'LIVE' ? 'blink-dot' : ''} style={{
                              fontSize: 11, fontWeight: 800, color: statusColor,
                              background: `${statusColor}18`, padding: '2px 8px',
                              borderRadius: 4, letterSpacing: 0.5,
                            }}>
                              {statusLabel}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: textSecondary }}>Quota</span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>
                      {b.quota_totale.toFixed(2)}
                    </span>
                    <span style={{ color: textSecondary, fontSize: 12 }}>
                      {isCollapsed ? '▼' : '▲'}
                    </span>
                  </div>
                </div>
                {/* Riga 2: label + sel + win/lose + bottone salva */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: textPrimary }}>{b.label}</span>
                    <span style={{ fontSize: 11, color: textSecondary }}>· {b.selezioni.length} sel.</span>
                    {(() => {
                      const esitiSel = b.selezioni.map(s => getEsitoLive(s, liveScores));
                      const winCount = esitiSel.filter(e => e === 'win' || e === 'live_win').length;
                      const loseCount = esitiSel.filter(e => e === 'lose' || e === 'live_lose').length;
                      if (winCount === 0 && loseCount === 0) return null;
                      return (
                        <span style={{ fontSize: 11, display: 'flex', gap: 4 }}>
                          {winCount > 0 && <span style={{ color: '#4caf50', fontWeight: 700 }}>{winCount}✓</span>}
                          {loseCount > 0 && <span style={{ color: '#f44336', fontWeight: 700 }}>{loseCount}✗</span>}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    {...(bIdx === 0 ? { className: 'ticket-btn-salva' } : {})}
                    onClick={(e) => { e.stopPropagation(); if (canSave || isSaved) onSave(b._id, parseFloat(stakes[b._id]) || 0); }}
                    disabled={savingId === b._id || (!canSave && !isSaved)}
                    style={{
                      background: isSaved
                        ? (isLight ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.12)')
                        : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'),
                      border: isSaved
                        ? `1px solid ${theme.gold}`
                        : (isLight ? '1px solid #ccc' : '1px solid rgba(255,255,255,0.15)'),
                      borderRadius: 8,
                      cursor: (!canSave && !isSaved) ? 'not-allowed' : 'pointer',
                      fontSize: 11, padding: '3px 8px',
                      color: isSaved ? theme.gold : textSecondary,
                      opacity: (!canSave && !isSaved) ? 0.3 : savingId === b._id ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    {isSaved ? '★ Salvata' : anyStarted ? '⏱ Iniziata' : !hasStake ? '€ ?' : '☆ Salva'}
                  </button>
                </div>
              </div>

              {/* Selezioni */}
              {!isCollapsed && (
                <>
                  {b.selezioni.map((s, i) => {
                    const esLive = getEsitoLive(s, liveScores);
                    const bgEsito = (esLive === 'win' || esLive === 'live_win')
                      ? (isLight ? '#f0fdf4' : 'rgba(0,255,136,0.08)')
                      : (esLive === 'lose' || esLive === 'live_lose')
                        ? (isLight ? '#fef2f2' : 'rgba(255,68,102,0.08)')
                        : 'transparent';
                    const dotColor = esLive === 'win' ? '#4caf50'
                      : esLive === 'lose' ? '#f44336'
                      : esLive === 'live_win' ? '#4caf50'
                      : esLive === 'live_lose' ? '#f44336'
                      : isLight ? '#ddd' : '#444';
                    const isBlinking = esLive === 'live_win' || esLive === 'live_lose';

                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '12px 16px',
                        borderBottom: i < b.selezioni.length - 1 ? rowBorder : 'none',
                        background: bgEsito,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{s.league && <span style={{ fontSize: 10, fontWeight: 600, color: textSecondary, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>{getLeaguePrefix(s.league)}</span>}{s.home} - {s.away}</span>
                            {(() => {
                              const realScore = (s as any).real_score;
                              const enrichedLive = (s as any).live_score;
                              const enrichedStatus = (s as any).live_status;
                              const live = liveScores.find(l => l.home === s.home && l.away === s.away);

                              const score = realScore || enrichedLive || live?.live_score;
                              if (!score) return null;
                              const isFinished = !!realScore || enrichedStatus === 'Finished' || (s as any).match_finished || live?.live_status === 'Finished';
                              const minute = live?.live_minute || (s as any).live_minute;
                              const scoreColor = isFinished ? textSecondary : '#f44336';
                              return (
                                <span style={{
                                  fontSize: 13, fontWeight: 700,
                                  color: scoreColor,
                                  background: isLight ? (isFinished ? '#f0f0f0' : 'rgba(244,67,54,0.08)') : (isFinished ? 'rgba(255,255,255,0.08)' : 'rgba(244,67,54,0.15)'),
                                  padding: '1px 8px', borderRadius: 6,
                                }}>
                                  {score.replace(':', ' - ')}
                                  {!isFinished && minute ? ` ${minute}'` : ''}
                                  {isFinished ? ' FT' : ''}
                                </span>
                              );
                            })()}
                          </div>
                          <div style={{ fontSize: 12, color: textSecondary, marginTop: 3, textTransform: 'uppercase' }}>
                            {formatMercato(s.mercato, s.pronostico)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: textSecondary }}>
                              {formatDateIT(s.match_date).slice(0, 5)} - {s.match_time}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 17, color: textPrimary, marginTop: 2 }}>
                              {s.quota.toFixed(2)}
                            </div>
                          </div>
                          <div className={isBlinking ? 'blink-dot' : ''} style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: dotColor,
                            flexShrink: 0,
                          }} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer: quota + puntata + vincita */}
                  <div {...(bIdx === 0 ? { className: 'ticket-footer-puntata' } : {})} style={{
                    padding: '10px 16px', borderTop: rowBorder, background: headerBg,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: textSecondary }}>Quota totale</span>
                      <span style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>
                        {b.quota_totale.toFixed(2)}
                      </span>
                    </div>
                    {/* Riga puntata */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: textSecondary }}>Puntata €</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(stakes[b._id]) || 0) - 1); setStakes(prev => ({ ...prev, [b._id]: v.toFixed(2) })); }} style={{
                          width: 24, height: 24, minWidth: 24, minHeight: 24, lineHeight: '24px',
                          flexShrink: 0, borderRadius: '50%', padding: 0, textAlign: 'center' as const,
                          border: 'none', cursor: 'pointer', background: 'transparent', outline: 'none',
                          color: isLight ? '#666' : '#aaa', fontSize: 20, fontWeight: 300,
                        }}>−</button>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={(stakes[b._id] ?? '0.00') + ' €'}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                            const parts = raw.split('.');
                            if (parts.length > 2) return;
                            if (parts[1] && parts[1].length > 2) return;
                            setStakes(prev => ({ ...prev, [b._id]: raw }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bollette-stake-input"
                          onFocus={(e) => {
                            const val = (stakes[b._id] ?? '0.00');
                            e.target.value = val === '0.00' || val === '0' ? '' : val;
                            setStakes(prev => ({ ...prev, [b._id]: val === '0.00' || val === '0' ? '' : val }));
                          }}
                          onBlur={(e) => {
                            let v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                            v = Math.round(v * 20) / 20;
                            setStakes(prev => ({ ...prev, [b._id]: v.toFixed(2) }));
                          }}
                          style={{
                            width: 90, textAlign: 'center', padding: '4px 6px',
                            background: isLight ? '#fff' : 'rgba(255,255,255,0.06)',
                            border: isLight ? '1px solid #ccc' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 6, fontSize: 15, fontWeight: 700,
                            color: isLight ? '#1a1a1a' : '#fff', caretColor: isLight ? '#1a1a1a' : '#fff', outline: 'none',
                          }}
                        />
                        <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(stakes[b._id]) || 0) + 1; setStakes(prev => ({ ...prev, [b._id]: v.toFixed(2) })); }} style={{
                          width: 24, height: 24, minWidth: 24, minHeight: 24, lineHeight: '24px',
                          flexShrink: 0, borderRadius: '50%', padding: 0, textAlign: 'center' as const,
                          border: 'none', cursor: 'pointer', background: 'transparent', outline: 'none',
                          color: isLight ? '#666' : '#aaa', fontSize: 20, fontWeight: 300,
                        }}>+</button>
                      </div>
                    </div>
                    {/* Vincita potenziale */}
                    {stakes[b._id] && parseFloat(stakes[b._id]) > 0 && (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: 6, padding: '6px 0',
                        borderTop: rowBorder,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isLight ? '#059669' : '#4caf50' }}>
                          Vincita potenziale
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 18, color: isLight ? '#059669' : '#4caf50' }}>
                          € {(parseFloat(stakes[b._id]) * b.quota_totale).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {/* Bottone Condividi */}
                    <div {...(bIdx === 0 ? { className: 'ticket-btn-condividi' } : {})} style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = cardRefs.current[b._id];
                          if (el) shareCard(el, b.label);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isLight ? 'rgba(0,119,204,0.08)' : 'rgba(6,182,212,0.1)',
                          border: isLight ? '1px solid rgba(0,119,204,0.25)' : '1px solid rgba(6,182,212,0.25)',
                          borderRadius: 8, padding: '7px 18px',
                          color: isLight ? '#0077cc' : '#06b6d4',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isLight ? 'rgba(0,119,204,0.2)' : 'rgba(6,182,212,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isLight ? 'rgba(0,119,204,0.08)' : 'rgba(6,182,212,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <img src="/share-icon.png" alt="" style={{ width: '16px', height: '16px', filter: isLight ? 'invert(35%) sepia(80%) saturate(500%) hue-rotate(180deg)' : 'invert(70%) sepia(50%) saturate(500%) hue-rotate(150deg)' }} />
                        Condividi
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

const isMob = () => window.innerWidth < 768;

export default function Bollette({ onBack }: { onBack?: () => void }) {
  const { user, getIdToken } = useAuth();
  const [isMobile, setIsMobile] = useState(isMob());
  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [customBollette, setCustomBollette] = useState<Bolletta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showAuth, setShowAuth] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategoryRaw] = useState<Categoria | null>(null);

  // Gestione tasto indietro smartphone: apri/chiudi sezione con history
  // Ref per sapere se siamo "dentro" una sezione (per popstate)
  const hasHistoryEntry = useRef(false);

  const setActiveCategory = useCallback((cat: Categoria | null) => {
    if (cat && !hasHistoryEntry.current) {
      window.history.pushState({ ticketView: 'section' }, '');
      hasHistoryEntry.current = true;
    }
    setActiveCategoryRaw(cat);
  }, []);

  // Builder state (chat conversazionale)
  const [showBuilderRaw, setShowBuilderRaw] = useState(false);

  const setShowBuilder = useCallback((show: boolean) => {
    if (show && !hasHistoryEntry.current) {
      window.history.pushState({ ticketBuilder: true }, '');
      hasHistoryEntry.current = true;
    }
    setShowBuilderRaw(show);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (showBuilderRaw) {
        setShowBuilderRaw(false);
        hasHistoryEntry.current = false;
      } else if (activeCategory) {
        setActiveCategoryRaw(null);
        hasHistoryEntry.current = false;
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeCategory, showBuilderRaw]);
  const [builderMsg, setBuilderMsg] = useState('');
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderResult, setBuilderResult] = useState<Bolletta | null>(null);
  const [builderSaved, setBuilderSaved] = useState(false);
  const [builderStake, setBuilderStake] = useState('');
  const [chatTicketCollapsed, setChatTicketCollapsed] = useState<Record<number, boolean>>({});
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; bolletta?: Bolletta }[]>([]);
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Storico
  const [showStorico, setShowStorico] = useState(false);
  const [storicoDate, setStoricoDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [dateDisponibili, setDateDisponibili] = useState<Set<string>>(new Set());
  const [storicoBollette, setStoricoBollette] = useState<Bolletta[]>([]);
  const [storicoStats, setStoricoStats] = useState<any>(null);
  const [filtroEsito, setFiltroEsito] = useState<'tutti' | 'vinte' | 'perse' | 'pending'>('tutti');
  const [storicoLoading, setStoricoLoading] = useState(false);

  const fetchBollette = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/bollette?date=${today}`);
      const data = await res.json();
      if (data.success) {
        setBollette(data.bollette || []);
        if (user) {
          const saved = new Set<string>();
          for (const b of data.bollette || []) {
            if ((b.saved_by || []).includes(user.uid)) saved.add(b._id);
          }
          setSavedIds(saved);
        }
      }
      // Fetch custom bollette
      if (user) {
        const token = await getIdToken();
        const resCustom = await fetch(`${API_BASE}/bollette/custom`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const dataCustom = await resCustom.json();
        if (dataCustom.success) setCustomBollette(dataCustom.bollette || []);
      }
    } catch (err) {
      console.error('Errore fetch bollette:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBollette(); }, [fetchBollette]);

  // Carica date disponibili per il calendario
  useEffect(() => {
    fetch(`${API_BASE}/bollette/date-disponibili`)
      .then(r => r.json())
      .then(d => { if (d.success) setDateDisponibili(new Set(d.dates || [])); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(isMob());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Tour: inietta bollette fake d'esempio quando richiesto
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const fakeBolletta: Bolletta = {
      _id: 'tour-fake-001',
      date: today,
      tipo: 'selettiva',
      quota_totale: 2.93,
      label: 'Selettiva',
      selezioni: [
        { home: 'Triestina', away: 'Vicenza', league: 'Serie C - Girone A', match_time: '20:45', match_date: today, mercato: 'DOPPIA_CHANCE', pronostico: 'DC 1X', quota: 1.35, confidence: 78, stars: 4, esito: null },
        { home: 'Arsenal', away: 'Chelsea', league: 'Premier League', match_time: '21:00', match_date: today, mercato: 'GOL', pronostico: 'Under 3.5', quota: 1.40, confidence: 82, stars: 4, esito: null },
        { home: 'Benfica', away: 'Porto', league: 'Liga Portugal', match_time: '21:30', match_date: today, mercato: 'GOL', pronostico: 'Goal', quota: 1.55, confidence: 75, stars: 3, esito: null },
      ],
      esito_globale: null,
      saved_by: [],
      stake_amount: 20,
      pool_size: 3,
    };
    const inject = () => {
      setBollette(prev => {
        const hasSelettiva = prev.some(b => b.tipo === 'selettiva');
        if (!hasSelettiva) return [fakeBolletta, ...prev];
        return prev;
      });
    };
    const remove = () => {
      setBollette(prev => prev.filter(b => b._id !== 'tour-fake-001'));
    };
    window.addEventListener('inject-tour-bollette', inject);
    window.addEventListener('remove-tour-bollette', remove);
    return () => {
      window.removeEventListener('inject-tour-bollette', inject);
      window.removeEventListener('remove-tour-bollette', remove);
    };
  }, []);

  // Ricarica storico quando storicoDate cambia (frecce navigazione)
  useEffect(() => {
    if (storicoDate && storicoDate !== new Date().toISOString().split('T')[0]) {
      fetchStorico(storicoDate);
      setFiltroEsito('tutti');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storicoDate]);

  // Fetch storico per data selezionata
  const fetchStorico = async (date: string) => {
    setStoricoLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bollette/storico?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setStoricoBollette(data.bollette || []);
        setStoricoStats(data.stats || null);
      }
    } catch (err) {
      console.error('Errore fetch storico:', err);
    }
    setStoricoLoading(false);
  };

  // Polling live scores ogni 15s
  useEffect(() => {
    const pollLive = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE}/live-scores?date=${today}`);
        const data = await res.json();
        if (data.success && data.scores) setLiveScores(data.scores);
      } catch (_) {}
    };
    pollLive();
    const interval = setInterval(pollLive, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleSave = async (id: string, stakeAmount?: number) => {
    if (!user) { setShowAuth(true); return; }
    setSavingId(id);
    try {
      const token = await getIdToken();
      await fetch(`${API_BASE}/bollette/${id}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ stake_amount: stakeAmount || 0 }),
      });
      setSavedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } catch (err) {
      console.error('Errore salvataggio:', err);
    }
    setSavingId(null);
  };

  // Builder: invia messaggio nella chat
  const handleGenerate = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!builderMsg.trim()) return;

    const userMsg = builderMsg.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setBuilderMsg('');
    setBuilderLoading(true);
    setBuilderSaved(false);

    try {
      const token = await getIdToken();
      // Prepara storico per Mistral (solo testo, non bollette)
      const history = chatMessages.map(m => ({
        role: m.role,
        content: m.bolletta
          ? JSON.stringify({ type: 'bolletta', selezioni: m.bolletta.selezioni.map(s => ({ match_key: `${s.home} vs ${s.away}|${s.match_date}`, mercato: s.mercato, pronostico: s.pronostico })), reasoning: '' })
          : m.content,
      }));

      const res = await fetch(`${API_BASE}/bollette/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json();

      if (data.success && data.type === 'bolletta' && data.bolletta) {
        setBuilderResult(data.bolletta);
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.bolletta.reasoning || 'Ecco la tua bolletta!', bolletta: data.bolletta }]);
      } else if (data.success && data.type === 'messaggio') {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Non sono riuscito a generare la bolletta.' }]);
      }
    } catch (err) {
      console.error('Errore generazione:', err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Errore di connessione. Riprova.' }]);
    }
    setBuilderLoading(false);
  };

  // Builder: salva bolletta personalizzata
  const handleSaveCustom = async () => {
    if (!builderResult || !user) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/bollette/save-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bolletta: builderResult, stake_amount: parseFloat(builderStake) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        setBuilderSaved(true);
        setCustomBollette(prev => [data.bolletta, ...prev]);
      }
    } catch (err) {
      console.error('Errore salvataggio custom:', err);
    }
  };

  // Stats oggi (per badge nell'header)
  const oggiStats = {
    vinte: bollette.filter(b => b.esito_globale === 'vinta').length,
    perse: bollette.filter(b => b.esito_globale === 'persa').length,
    pending: bollette.filter(b => !b.esito_globale).length,
  };

  // Raggruppa — usa storicoBollette se data selezionata, altrimenti bollette di oggi
  const isStorico = !!storicoDate && storicoDate !== new Date().toISOString().split('T')[0];
  const bolletteRaw = isStorico ? storicoBollette : bollette;
  const bolletteAttive = filtroEsito === 'tutti' ? bolletteRaw : bolletteRaw.filter(b => {
    if (filtroEsito === 'vinte') return b.esito_globale === 'vinta';
    if (filtroEsito === 'perse') return b.esito_globale === 'persa';
    if (filtroEsito === 'pending') return !b.esito_globale;
    return true;
  });
  const grouped: Record<Categoria, Bolletta[]> = { oggi: [], selettiva: [], bilanciata: [], ambiziosa: [], custom: [] };
  for (const b of bolletteAttive) {
    if (b.tipo === 'oggi') {
      grouped.oggi.push(b);
    } else {
      // Smista per quota reale, indipendentemente da cosa dice Mistral
      const q = b.quota_totale ?? 0;
      if (q < 3.0) grouped.selettiva.push(b);
      else if (q < 6.0) grouped.bilanciata.push(b);
      else grouped.ambiziosa.push(b);
    }
  }

  // Se una categoria è attiva, mostra il dettaglio
  if (activeCategory) {
    // "Le mie bollette" — vista personale dedicata
    if (activeCategory === 'custom') {
      return (
        <MieBollette
          onBack={() => { hasHistoryEntry.current = false; window.history.back(); }}
          liveScores={liveScores}
          user={user}
          getIdToken={getIdToken}
        />
      );
    }

    const catDef = CATEGORIE.find(c => c.key === activeCategory)!;
    const items = grouped[activeCategory] || [];
    return (
      <>
        <VistaDettaglio
          cat={catDef}
          items={items}
          onBack={() => { hasHistoryEntry.current = false; window.history.back(); }}
          savedIds={savedIds}
          onSave={toggleSave}
          savingId={savingId}
          liveScores={liveScores}
          userId={user?.uid}
          shareCard={(el, label) => shareElement(el, `ai-simulator-${label.replace(/\s+/g, '-').toLowerCase()}.png`)}
        />
        {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  const textPrimary = isLight ? '#1a1a1a' : '#fff';
  const textSecondary = isLight ? '#666' : 'rgba(255,255,255,0.6)';

  // Dashboard
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: isLight ? '#f5f5f5' : theme.bg,
      color: textPrimary,
      fontFamily: theme.font,
      overflow: 'hidden', zIndex: 100,
      display: 'flex', flexDirection: 'column' as const,
    }}>
      {/* Header */}
      <div style={{
        zIndex: 10, flexShrink: 0,
        background: isLight ? '#fff' : theme.panelSolid,
        borderBottom: isLight ? '1px solid #e0e0e0' : theme.panelBorder,
        padding: isMobile ? '12px 16px' : '16px 20px',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 10 : 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          {onBack && (
            <button data-tour="ticket-back-btn" onClick={onBack} style={{
              background: isMobile
                ? (isLight ? 'rgba(102,126,234,0.08)' : 'rgba(0,240,255,0.08)')
                : 'none',
              border: isMobile
                ? (isLight ? '1px solid rgba(102,126,234,0.2)' : '1px solid rgba(0,240,255,0.15)')
                : 'none',
              borderRadius: 8,
              color: isLight ? '#333' : theme.cyan,
              cursor: 'pointer', fontSize: 20,
              padding: isMobile ? '4px 10px' : '4px 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: 'none', lineHeight: 1,
              width: isMobile ? 34 : 'auto', height: isMobile ? 34 : 'auto',
            }}><span style={{ position: 'relative', top: isMobile ? -2 : 0, fontSize: isMobile ? 22 : 20 }}>←</span></button>
          )}
          <h1 data-tour="step-5" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            🎫 Ticket AI
          </h1>
          {isMobile && (() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const currentDateStr = storicoDate || todayStr;
            const displayDate = storicoDate ? new Date(storicoDate + 'T12:00:00') : new Date();
            const mobileIsToday = currentDateStr === todayStr;
            const mobileIsStorico = !!storicoDate && storicoDate !== todayStr;
            return (
            <div data-tour="ticket-storico-nav" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <button onClick={() => {
                const [y, m, d] = currentDateStr.split('-').map(Number);
                const prev = new Date(y, m - 1, d - 1);
                setStoricoDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`);
              }} style={{
                background: isLight ? 'rgba(102,126,234,0.08)' : 'rgba(0,240,255,0.08)',
                border: isLight ? '1px solid rgba(102,126,234,0.2)' : '1px solid rgba(0,240,255,0.15)',
                borderRadius: 6, width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13, outline: 'none',
                color: isLight ? '#667eea' : theme.cyan, padding: 0,
              }}>◀</button>
              <div
                onClick={() => setShowStorico(!showStorico)}
                style={{
                  background: isLight
                    ? 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))'
                    : 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(188,19,254,0.08))',
                  border: isLight
                    ? '1px solid rgba(102,126,234,0.2)'
                    : '1px solid rgba(0,240,255,0.15)',
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                }}
              >
                <span style={{ color: isLight ? '#4a5568' : 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                  {displayDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <button onClick={() => {
                if (mobileIsToday) return;
                const [y, m, d] = currentDateStr.split('-').map(Number);
                const next = new Date(y, m - 1, d + 1);
                const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
                if (nextStr >= todayStr) { setStoricoDate(''); setFiltroEsito('tutti'); }
                else setStoricoDate(nextStr);
              }} style={{
                background: mobileIsToday ? (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)') : (isLight ? 'rgba(102,126,234,0.08)' : 'rgba(0,240,255,0.08)'),
                border: mobileIsToday ? (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)') : (isLight ? '1px solid rgba(102,126,234,0.2)' : '1px solid rgba(0,240,255,0.15)'),
                borderRadius: 6, width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, outline: 'none', padding: 0,
                color: mobileIsToday ? (isLight ? '#ddd' : 'rgba(255,255,255,0.15)') : (isLight ? '#667eea' : theme.cyan),
                cursor: mobileIsToday ? 'default' : 'pointer', marginRight: 15,
              }}>▶</button>
              <button data-tour="ticket-btn-oggi" onClick={() => { if (mobileIsStorico) { setStoricoDate(''); setFiltroEsito('tutti'); } }} style={{
                background: mobileIsStorico ? (isLight ? '#667eea' : '#11998e') : 'transparent',
                color: mobileIsStorico ? '#fff' : 'transparent',
                border: 'none', borderRadius: 999, padding: '6px 10px',
                fontSize: 10, fontWeight: 600, cursor: mobileIsStorico ? 'pointer' : 'default',
                outline: 'none', marginLeft: 2,
              }}>Oggi</button>
            </div>
            );
          })()}
          {!isMobile && (() => {
            const currentStats = isStorico ? { vinte: storicoStats?.vinte ?? 0, perse: storicoStats?.perse ?? 0, pending: storicoStats?.pending ?? 0 } : oggiStats;
            const todayStr = new Date().toISOString().split('T')[0];
            const currentDateStr = storicoDate || todayStr;
            const displayDate = new Date(currentDateStr + 'T12:00:00');
            const isToday = currentDateStr === todayStr;
            return (
            <div data-tour="ticket-storico-nav-desktop" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {/* Badge */}
              <div style={{ display: 'flex', gap: 11, width: 250, marginRight: 100 }}>
                <span onClick={() => setFiltroEsito(filtroEsito === 'vinte' ? 'tutti' : 'vinte')} style={{ fontSize: 12, fontWeight: 700, color: '#4caf50', background: filtroEsito === 'vinte' ? 'rgba(76,175,80,0.35)' : 'rgba(76,175,80,0.15)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: filtroEsito === 'vinte' ? '1px solid #4caf50' : '1px solid transparent', transition: 'all 0.15s', minWidth: 65, textAlign: 'center' as const }}>{currentStats.vinte} Vinte</span>
                <span onClick={() => setFiltroEsito(filtroEsito === 'perse' ? 'tutti' : 'perse')} style={{ fontSize: 12, fontWeight: 700, color: '#f44336', background: filtroEsito === 'perse' ? 'rgba(244,67,54,0.35)' : 'rgba(244,67,54,0.15)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: filtroEsito === 'perse' ? '1px solid #f44336' : '1px solid transparent', transition: 'all 0.15s', minWidth: 60, textAlign: 'center' as const }}>{currentStats.perse} Perse</span>
                <span onClick={() => setFiltroEsito(filtroEsito === 'pending' ? 'tutti' : 'pending')} style={{ fontSize: 12, fontWeight: 700, color: '#ff9800', background: filtroEsito === 'pending' ? 'rgba(255,152,0,0.35)' : 'rgba(255,152,0,0.15)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: filtroEsito === 'pending' ? '1px solid #ff9800' : '1px solid transparent', transition: 'all 0.15s', minWidth: 75, textAlign: 'center' as const }}>{currentStats.pending} In corso</span>
              </div>
              {/* Freccia ◀ */}
              <button onClick={() => {
                const [y, m, d] = currentDateStr.split('-').map(Number);
                const prev = new Date(y, m - 1, d - 1);
                setStoricoDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`);
              }} style={{
                background: isLight ? 'rgba(102,126,234,0.08)' : 'rgba(0,240,255,0.08)',
                border: isLight ? '1px solid rgba(102,126,234,0.2)' : '1px solid rgba(0,240,255,0.15)',
                borderRadius: 8, width: 32, height: 32, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 16, outline: 'none',
                color: isLight ? '#667eea' : theme.cyan, padding: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isLight ? 'rgba(102,126,234,0.15)' : 'rgba(0,240,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isLight ? 'rgba(102,126,234,0.08)' : 'rgba(0,240,255,0.08)'; }}
              >◀</button>
              {/* Data */}
              <div
                onClick={() => setShowStorico(!showStorico)}
                style={{
                  background: isLight
                    ? 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))'
                    : 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(188,19,254,0.08))',
                  border: isLight
                    ? '1px solid rgba(102,126,234,0.2)'
                    : `1px solid rgba(0,240,255,0.15)`,
                  borderRadius: 10,
                  padding: '6px 16px',
                  width: 280, flexShrink: 0,
                  textAlign: 'center' as const,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isLight ? 'rgba(102,126,234,0.4)' : 'rgba(0,240,255,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isLight ? 'rgba(102,126,234,0.2)' : 'rgba(0,240,255,0.15)'; }}
              >
                <span style={{
                  color: isLight ? '#4a5568' : 'rgba(255,255,255,0.85)',
                  fontSize: 14, fontWeight: 700,
                  textTransform: 'capitalize',
                  letterSpacing: '0.02em',
                }}>
                  📅 {displayDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              {/* Freccia ▶ */}
              <button onClick={() => {
                if (isToday) return;
                const [y, m, d] = currentDateStr.split('-').map(Number);
                const next = new Date(y, m - 1, d + 1);
                const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
                if (nextStr >= todayStr) { setStoricoDate(''); setFiltroEsito('tutti'); }
                else setStoricoDate(nextStr);
              }} style={{
                background: isToday
                  ? (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)')
                  : (isLight ? 'rgba(102,126,234,0.08)' : 'rgba(0,240,255,0.08)'),
                border: isToday
                  ? (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)')
                  : (isLight ? '1px solid rgba(102,126,234,0.2)' : '1px solid rgba(0,240,255,0.15)'),
                borderRadius: 8, width: 32, height: 32, flexShrink: 0, marginRight: 50, outline: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isToday ? (isLight ? '#ddd' : 'rgba(255,255,255,0.15)') : (isLight ? '#667eea' : theme.cyan),
                padding: 0, fontSize: 16,
                transition: 'all 0.15s',
                cursor: isToday ? 'default' : 'pointer',
              }}>▶</button>
              {/* Bottone Oggi */}
              <button data-tour="ticket-btn-oggi-desktop" onClick={() => { if (isStorico) { setStoricoDate(''); setFiltroEsito('tutti'); } }} style={{
                background: isStorico ? (isLight ? '#667eea' : '#11998e') : 'transparent',
                color: isStorico ? '#fff' : 'transparent',
                border: 'none', borderRadius: 999, padding: '6px 20px', outline: 'none',
                fontSize: 12, fontWeight: 600, cursor: isStorico ? 'pointer' : 'default',
                whiteSpace: 'nowrap', width: 60, flexShrink: 0, marginRight: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>Oggi</button>
            </div>
            );
          })()}
        </div>
        {isMobile && (() => {
          const mobileStats = isStorico ? { vinte: storicoStats?.vinte ?? 0, perse: storicoStats?.perse ?? 0, pending: storicoStats?.pending ?? 0 } : oggiStats;
          return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span onClick={() => setFiltroEsito(filtroEsito === 'vinte' ? 'tutti' : 'vinte')} style={{ fontSize: 11, fontWeight: 700, color: '#4caf50', background: filtroEsito === 'vinte' ? 'rgba(76,175,80,0.35)' : 'rgba(76,175,80,0.15)', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', border: filtroEsito === 'vinte' ? '1px solid #4caf50' : '1px solid transparent', transition: 'all 0.15s' }}>{mobileStats.vinte} Vinte</span>
              <span onClick={() => setFiltroEsito(filtroEsito === 'perse' ? 'tutti' : 'perse')} style={{ fontSize: 11, fontWeight: 700, color: '#f44336', background: filtroEsito === 'perse' ? 'rgba(244,67,54,0.35)' : 'rgba(244,67,54,0.15)', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', border: filtroEsito === 'perse' ? '1px solid #f44336' : '1px solid transparent', transition: 'all 0.15s' }}>{mobileStats.perse} Perse</span>
              <span onClick={() => setFiltroEsito(filtroEsito === 'pending' ? 'tutti' : 'pending')} style={{ fontSize: 11, fontWeight: 700, color: '#ff9800', background: filtroEsito === 'pending' ? 'rgba(255,152,0,0.35)' : 'rgba(255,152,0,0.15)', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', border: filtroEsito === 'pending' ? '1px solid #ff9800' : '1px solid transparent', transition: 'all 0.15s' }}>{mobileStats.pending} In corso</span>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Barra caricamento */}
      <div style={{ height: 2, flexShrink: 0, background: isLight ? '#e0e0e0' : 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        {storicoLoading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
            background: `linear-gradient(90deg, transparent, ${theme.cyan}, transparent)`,
            animation: 'bollette-loading-bar 1.2s ease-in-out infinite',
          }} />
        )}
      </div>
      <style>{`
        @keyframes bollette-loading-bar {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>

      {/* Contenuto scrollabile — sotto l'header */}
      <div style={{ flex: 1, overflowY: (isMobile && showBuilderRaw) ? 'hidden' : 'auto' }}>

      {/* Calendario storico — popup/modal */}
      {showStorico && (() => {
        const { year, month } = calendarMonth;
        const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1; // Lu=0
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        const todayStr = new Date().toISOString().split('T')[0];

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setShowStorico(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: isLight ? '#fff' : theme.panelSolid,
            border: isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16, padding: '16px 20px', width: 300, maxWidth: '90vw',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {/* Header mese */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button onClick={() => setCalendarMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 })} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: textSecondary, padding: '4px 8px',
              }}>◀</button>
              <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{monthNames[month]} {year}</span>
              <button onClick={() => setCalendarMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 })} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: textSecondary, padding: '4px 8px',
              }}>▶</button>
            </div>
            {/* Giorni settimana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
              {['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'].map(d => (
                <div key={d} style={{ fontSize: 11, color: textSecondary, fontWeight: 600, padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            {/* Griglia giorni */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
              {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasData = dateDisponibili.has(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === storicoDate;
                const isFuture = dateStr > todayStr;

                return (
                  <button
                    key={day}
                    disabled={isFuture}
                    onClick={() => {
                      if (dateStr === todayStr) {
                        setStoricoDate('');
                      } else {
                        setStoricoDate(dateStr); fetchStorico(dateStr);
                      }
                      setShowStorico(false);
                    }}
                    style={{
                      background: isSelected ? (isLight ? '#667eea' : '#11998e')
                        : isToday ? (isLight ? '#e3f2fd' : 'rgba(17,153,142,0.2)')
                        : 'transparent',
                      color: isSelected ? '#fff'
                        : isFuture ? (isLight ? '#ccc' : '#444')
                        : isToday ? (isLight ? '#667eea' : '#11998e')
                        : textPrimary,
                      border: 'none', borderRadius: 8, padding: '8px 0',
                      fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400,
                      cursor: isFuture ? 'default' : 'pointer',
                      position: 'relative' as const,
                    }}
                  >
                    {day}
                    {hasData && !isSelected && (
                      <div style={{
                        position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                        width: 4, height: 4, borderRadius: '50%',
                        background: isLight ? '#667eea' : '#11998e',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Torna a oggi */}
            {isStorico && (
              <button
                onClick={() => { setStoricoDate(''); setShowStorico(false); }}
                style={{
                  marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: isLight ? '#667eea' : '#11998e', color: '#fff',
                  border: 'none', cursor: 'pointer',
                }}
              >
                ← Torna a oggi
              </button>
            )}
          </div>
          </div>
        );
      })()}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textSecondary }}>
          Caricamento ticket...
        </div>
      ) : (
        <div style={{
          padding: 16,
          ...(isStorico ? {
            background: isLight ? 'rgba(102,126,234,0.04)' : 'rgba(17,153,142,0.06)',
            minHeight: '80vh',
          } : {}),
        }}>



          {/* === BANNER + CHAT: Costruisci il tuo Ticket AI === */}
          {!isStorico && (<div style={{ position: 'relative', zIndex: 5, marginBottom: 16 }}>
          <div
            data-tour="ticket-builder-banner"
            onClick={() => { if (!user) { setShowAuth(true); return; } setShowBuilder(!showBuilderRaw); }}
            style={{
              background: isLight
                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                : 'linear-gradient(135deg, #2d1b69, #11998e)',
              borderRadius: 16,
              padding: isMobile ? '14px 16px' : '20px 24px',
              marginBottom: 16,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'transform 0.2s',
              border: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: '#fff' }}>
                🤖 Costruisci il tuo Ticket AI
              </div>
              <div style={{ fontSize: isMobile ? 12 : 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                Chiedi all'AI di comporre una bolletta su misura per te
              </div>
            </div>
            <span style={{ fontSize: 24, color: '#fff' }}>{showBuilderRaw ? '▲' : '▼'}</span>
          </div>

          {/* === BUILDER CHAT (sovrapposto) === */}
          {showBuilderRaw && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '100%',
              background: isLight ? '#f8f9fa' : '#0d0f18',
              border: isMobile
                ? (isLight ? '1px solid #d0d2d8' : '1px solid rgba(255,255,255,0.18)')
                : (isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)'),
              borderRadius: 16, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              height: isMobile ? 590 : 625,
              boxShadow: isLight ? '0 12px 40px rgba(0,0,0,0.15)' : '0 12px 40px rgba(0,0,0,0.5)',
              transition: 'all 0.3s ease',
            }}>
              {/* Sfondo stadio */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url(/bg-stadium.webp)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: isLight ? 0.04 : 0.06,
                pointerEvents: 'none', zIndex: 0,
              }} />
              {/* Suggerimenti rapidi (solo se chat vuota) */}
              {chatMessages.length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '16px 16px 8px' }}>
                  {[
                    'Fammi una bolletta sicura con quota massimo 3',
                    'Bolletta rischiosa con quota almeno 15',
                    'Mix di mercati diversi con 4 selezioni',
                    'Solo partite di oggi, quota intorno a 5',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => { setBuilderMsg(s); }}
                      style={{
                        background: isLight ? '#f0f0f5' : 'rgba(255,255,255,0.08)',
                        border: isLight ? '1px solid #ddd' : '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 20, padding: '6px 14px',
                        fontSize: 12, color: textSecondary,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Area chat scrollabile */}
              <div data-tour="ticket-chat-scroll" style={{
                flex: 1, overflowY: 'auto', padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
                position: 'relative' as const, zIndex: 1,
              }}>
                {chatMessages.map((m, i) => (
                  <div key={i} className={m.role === 'assistant' ? `chat-ai-msg chat-ai-msg-${i}` : ''}>
                    {/* Bubble messaggio */}
                    <div style={{
                      display: 'flex',
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                      marginLeft: isMobile ? 0 : 40,
                      marginRight: isMobile ? 0 : 40,
                    }}>
                      <div className={m.role === 'assistant' ? 'chat-ai-bubble' : ''} style={{
                        maxWidth: isMobile ? '80%' : '60%',
                        padding: '12px 16px',
                        borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: m.role === 'user'
                          ? (isLight ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'linear-gradient(135deg, #11998e, #0d7377)')
                          : (isLight ? '#ebedf2' : '#252838'),
                        color: m.role === 'user' ? '#fff' : (isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'),
                        fontSize: 14, lineHeight: 1.65,
                        wordBreak: 'break-word',
                        letterSpacing: '0.01em',
                        border: m.role === 'user' ? 'none' : (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)'),
                      }}>
                        {m.content}
                      </div>
                    </div>

                    {/* Bolletta inline (se presente) */}
                    {m.bolletta && (
                      <div className="chat-bolletta-card" style={{ marginTop: 8, marginLeft: isMobile ? 0 : 40, marginRight: isMobile ? 0 : 40, maxWidth: isMobile ? '95%' : '35%' }}>
                        <div style={{
                          background: isLight ? '#f0f1f4' : '#1e2133',
                          border: isLight ? '1px solid #d0d0d0' : '1px solid #2d3045',
                          borderRadius: 12, overflow: 'hidden',
                        }}>
                          {/* Header — cliccabile per collassare */}
                          <div
                            onClick={() => setChatTicketCollapsed(prev => ({ ...prev, [i]: !prev[i] }))}
                            style={{
                              padding: '10px 12px', cursor: 'pointer',
                              background: isLight ? '#e8e9ec' : '#252839',
                            }}
                          >
                            {/* Riga 1: quota + freccia */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{m.bolletta.tipo}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: textSecondary }}>Quota</span>
                                <span style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>
                                  {m.bolletta.quota_totale.toFixed(2)}
                                </span>
                                <span style={{ fontSize: 10, color: textSecondary }}>{chatTicketCollapsed[i] ? '▼' : '▲'}</span>
                              </div>
                            </div>
                            {/* Riga 2: selezioni */}
                            <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                              {m.bolletta.selezioni.length} sel.
                            </div>
                          </div>

                          {/* Selezioni con X rimuovi — collassabile */}
                          {!chatTicketCollapsed[i] && m.bolletta.selezioni.map((s, j) => (
                            <div key={j} style={{
                              display: 'flex', alignItems: 'flex-start',
                              padding: '8px 12px', fontSize: 13,
                              borderTop: isLight ? '1px solid #eee' : '1px solid rgba(255,255,255,0.06)',
                            }}>
                              {/* X rossa per rimuovere */}
                              {!builderSaved && (
                                <button
                                  onClick={() => {
                                    if (!m.bolletta) return;
                                    const newSel = m.bolletta.selezioni.filter((_, idx) => idx !== j);
                                    if (newSel.length === 0) { setBuilderResult(null); setChatMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, bolletta: undefined } : msg)); return; }
                                    const newQuota = newSel.reduce((acc, sel) => acc * sel.quota, 1);
                                    const updated = { ...m.bolletta, selezioni: newSel, quota_totale: Math.round(newQuota * 100) / 100 };
                                    setBuilderResult(updated);
                                    setChatMessages(prev => prev.map((msg, idx) =>
                                      idx === i ? { ...msg, bolletta: updated } : msg
                                    ));
                                  }}
                                  style={{
                                    background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
                                    borderRadius: '50%', cursor: 'pointer',
                                    color: '#f44336', fontSize: 12, fontWeight: 700,
                                    width: 24, height: 24, lineHeight: '24px',
                                    textAlign: 'center', padding: 0,
                                    flexShrink: 0, marginRight: 8,
                                    outline: 'none',
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700 }}>{s.league && <span style={{ fontSize: 10, fontWeight: 600, color: textSecondary, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, marginRight: 6 }}>{getLeaguePrefix(s.league)}</span>}{s.home} - {s.away}</div>
                                <div style={{ fontSize: 11, color: textSecondary, textTransform: 'uppercase' }}>
                                  {formatMercato(s.mercato, s.pronostico)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                                <div style={{ fontSize: 11, color: textSecondary }}>
                                  {formatDateIT(s.match_date).slice(0, 5)} - {s.match_time}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.quota.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}

                          {/* Footer: quota totale */}
                          {!chatTicketCollapsed[i] && <div style={{
                            padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                            borderTop: isLight ? '1px solid #ddd' : '1px solid #2d3045',
                            background: isLight ? '#f0f0f0' : '#1a1d2e',
                            fontSize: 14, fontWeight: 700,
                          }}>
                            <span>Quota totale</span>
                            <span>{m.bolletta.quota_totale.toFixed(2)}</span>
                          </div>}
                        </div>

                        {!chatTicketCollapsed[i] && <>
                        {/* Warning fuori pool — appare solo se ci sono selezioni non nei pronostici AI */}
                        {m.bolletta.selezioni.some((s: Selezione) => s.from_pool === false) && (
                          <details style={{ marginTop: 6 }}>
                            <summary style={{
                              fontSize: 12, color: '#ff9800',
                              cursor: 'pointer', fontWeight: 600,
                            }}>
                              ⚠️ Avviso
                            </summary>
                            <div style={{
                              fontSize: 12, color: textSecondary, marginTop: 4,
                              padding: '8px 10px', lineHeight: 1.5,
                              background: isLight ? '#fff8e1' : '#1f1c14',
                              borderRadius: 8,
                            }}>
                              Alcune selezioni non sono tra le Best Picks per poter rispettare le tue preferenze su partite e mercati. Ove possibile, le Best Picks rimangono comunque la prima scelta.
                            </div>
                          </details>
                        )}

                        {/* Puntata + vincita potenziale */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          padding: '8px 12px', marginTop: 4,
                          background: isLight ? '#f0f0f0' : '#1a1d2e',
                          borderRadius: 8, gap: 10,
                        }}>
                          {parseFloat(builderStake) > 0 && m.bolletta.quota_totale && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#4caf50', marginRight: 'auto' }}>
                              Vincita: €{(parseFloat(builderStake) * m.bolletta.quota_totale).toFixed(2)}
                            </span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, color: textSecondary }}>Puntata</span>
                            <button onClick={() => { const v = Math.max(0, (parseFloat(builderStake) || 0) - 1); setBuilderStake(v.toFixed(2)); }} style={{
                              width: 24, height: 24, minWidth: 24, minHeight: 24, lineHeight: '24px',
                              flexShrink: 0, borderRadius: '50%', padding: 0, textAlign: 'center' as const,
                              border: 'none', cursor: 'pointer', background: 'transparent', outline: 'none',
                              color: isLight ? '#666' : '#aaa', fontSize: 20, fontWeight: 300,
                            }}>−</button>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="bollette-stake-input builder-stake-input"
                              value={(builderStake || '0.00') + ' €'}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                const parts = raw.split('.');
                                if (parts.length > 2) return;
                                if (parts[1] && parts[1].length > 2) return;
                                setBuilderStake(raw);
                              }}
                              onFocus={(e) => {
                                const val = builderStake || '0.00';
                                e.target.value = val === '0.00' || val === '0' ? '' : val;
                                setBuilderStake(val === '0.00' || val === '0' ? '' : val);
                              }}
                              onBlur={(e) => {
                                let v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                                v = Math.round(v * 20) / 20;
                                setBuilderStake(v.toFixed(2));
                              }}
                              style={{
                                width: 90, textAlign: 'center', padding: '4px 6px',
                                background: isLight ? '#fff' : 'rgba(255,255,255,0.08)',
                                border: isLight ? '1px solid #ccc' : '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 6, fontSize: 14, fontWeight: 700,
                                color: isLight ? '#1a1a1a' : '#fff', caretColor: isLight ? '#1a1a1a' : '#fff',
                                outline: 'none',
                              }}
                            />
                            <button onClick={() => { const v = (parseFloat(builderStake) || 0) + 1; setBuilderStake(v.toFixed(2)); }} style={{
                              width: 24, height: 24, minWidth: 24, minHeight: 24, lineHeight: '24px',
                              flexShrink: 0, borderRadius: '50%', padding: 0, textAlign: 'center' as const,
                              border: 'none', cursor: 'pointer', background: 'transparent', outline: 'none',
                              color: isLight ? '#666' : '#aaa', fontSize: 20, fontWeight: 300,
                            }}>+</button>
                          </div>
                        </div>

                        {/* Bottone salva */}
                        {!builderSaved ? (
                          <button
                            className="builder-btn-salva"
                            onClick={handleSaveCustom}
                            disabled={!parseFloat(builderStake)}
                            style={{
                              marginTop: 8, width: '100%', padding: '10px',
                              background: !parseFloat(builderStake) ? (isLight ? '#ccc' : '#333') : (isLight ? '#4caf50' : '#2e7d32'),
                              border: 'none', borderRadius: 10,
                              color: !parseFloat(builderStake) ? (isLight ? '#999' : '#666') : '#fff',
                              fontWeight: 700, fontSize: 13,
                              cursor: !parseFloat(builderStake) ? 'not-allowed' : 'pointer',
                              opacity: !parseFloat(builderStake) ? 0.6 : 1,
                            }}
                          >
                            {!parseFloat(builderStake) ? '⚠️ Inserisci la puntata' : '✅ Salva nelle mie bollette'}
                          </button>
                        ) : (
                          <div style={{
                            marginTop: 8, padding: '10px', textAlign: 'center',
                            background: isLight ? '#e8f5e9' : 'rgba(46,125,50,0.2)',
                            borderRadius: 10, fontWeight: 700, fontSize: 13,
                            color: isLight ? '#2e7d32' : '#66bb6a',
                          }}>
                            ✅ Salvata!
                            {/* Tag nascosto per il tour */}
                            <span className="builder-saved-tag" style={{ display: 'none' }} />
                          </div>
                        )}
                        </>}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {builderLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                      background: isLight ? '#f0f0f5' : 'rgba(255,255,255,0.08)',
                      fontSize: 14, color: textSecondary,
                    }}>
                      ⏳ Sto pensando...
                    </div>
                  </div>
                )}
              </div>

              {/* Input chat — textarea per wrap automatico */}
              <div style={{
                display: 'flex', gap: 8, padding: '12px 16px',
                borderTop: isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)',
              }}>
                <textarea
                  value={builderMsg}
                  onChange={(e) => setBuilderMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !builderLoading) { e.preventDefault(); handleGenerate(); } }}
                  placeholder="Scrivi un messaggio..."
                  rows={1}
                  style={{
                    flex: 1, padding: '10px 14px',
                    background: isMobile
                      ? (isLight ? '#ffffff' : '#1a1d2e')
                      : (isLight ? '#f8f9fa' : 'rgba(255,255,255,0.06)'),
                    border: isMobile
                      ? (isLight ? '1px solid #ccc' : '1px solid rgba(0,240,255,0.2)')
                      : (isLight ? '1px solid #ddd' : '1px solid rgba(255,255,255,0.15)'),
                    borderRadius: 10, fontSize: 14,
                    color: textPrimary, outline: 'none',
                    resize: 'none', minHeight: 40, maxHeight: 100,
                    lineHeight: 1.4, fontFamily: 'inherit',
                  }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 100) + 'px';
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={builderLoading || !builderMsg.trim()}
                  style={{
                    padding: '10px 18px', alignSelf: 'flex-end',
                    background: builderLoading ? '#666' : isLight ? '#667eea' : '#11998e',
                    border: 'none', borderRadius: 10,
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    cursor: builderLoading ? 'wait' : 'pointer',
                    opacity: !builderMsg.trim() ? 0.5 : 1,
                  }}
                >
                  {builderLoading ? '⏳' : '➤'}
                </button>
              </div>
            </div>
          )}
          </div>)}

          {/* === GRIGLIA RESPONSIVE === */}
          {isMobile ? (
            /* Mobile: 1 colonna */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CATEGORIE.map(cat => (
                <Quadrante key={cat.key} cat={cat} items={grouped[cat.key]} onClick={() => setActiveCategory(cat.key)} liveScores={liveScores} height={isStorico ? 322 : 267} maxPreview={isStorico ? 3 : 2} dataTour={`ticket-quadrante-${cat.key}`} />
              ))}
              <Quadrante
                cat={{ key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Salvate e personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }}
                items={(() => { const ids = new Set(customBollette.map(b => b._id)); return [...customBollette, ...bollette.filter(b => savedIds.has(b._id) && !ids.has(b._id))]; })()}
                onClick={() => setActiveCategory('custom' as Categoria)}
                liveScores={liveScores}
                height={isStorico ? 322 : 267} maxPreview={isStorico ? 3 : 2}
                dataTour="ticket-mie-bollette"
              />
            </div>
          ) : (
            /* Desktop: 3+2 */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 26 }}>
                {CATEGORIE.slice(0, 3).map(cat => (
                  <Quadrante key={cat.key} cat={cat} items={grouped[cat.key]} onClick={() => setActiveCategory(cat.key)} liveScores={liveScores} height={isStorico ? 322 : 267} maxPreview={isStorico ? 3 : 2} dataTour={`ticket-quadrante-${cat.key}`} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <Quadrante cat={CATEGORIE[3]} items={grouped.ambiziosa} onClick={() => setActiveCategory('ambiziosa')} liveScores={liveScores} height={isStorico ? 322 : 267} maxPreview={isStorico ? 3 : 2} dataTour="ticket-quadrante-ambiziosa" />
                <Quadrante
                  cat={{ key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Salvate e personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }}
                  items={(() => { const ids = new Set(customBollette.map(b => b._id)); return [...customBollette, ...bollette.filter(b => savedIds.has(b._id) && !ids.has(b._id))]; })()}
                  onClick={() => setActiveCategory('custom' as Categoria)}
                  liveScores={liveScores}
                  height={isStorico ? 322 : 267} maxPreview={isStorico ? 3 : 2}
                  dataTour="ticket-mie-bollette"
                />
              </div>
            </>
          )}
        </div>
      )}

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
      </div>{/* fine contenuto scrollabile */}
    </div>
  );
}
