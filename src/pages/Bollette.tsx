import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import { getTheme, getThemeMode } from '../AppDev/costanti';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

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

  // Cerca live score
  const live = liveScores.find(s => s.home === sel.home && s.away === sel.away);
  if (!live || !live.live_score) return 'pending';

  const isFinished = live.live_status === 'Finished';
  const hit = calculateHitFromScore(live.live_score, sel.pronostico, sel.mercato);

  if (hit === null) return 'pending';
  if (isFinished) return hit ? 'win' : 'lose';
  return hit ? 'live_win' : 'live_lose';
}

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

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
}

interface Bolletta {
  _id: string;
  date: string;
  tipo: 'selettiva' | 'bilanciata' | 'ambiziosa';
  quota_totale: number;
  label: string;
  selezioni: Selezione[];
  esito_globale: string | null;
  saved_by: string[];
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

function Quadrante({ cat, items, onClick }: {
  cat: typeof CATEGORIE[0];
  items: Bolletta[];
  onClick: () => void;
}) {
  // Mostra anteprima: prime 3 bollette, prime 2 selezioni ciascuna
  const preview = items.slice(0, 3);
  const textColor = isLight ? '#333' : '#fff';
  const dimColor = isLight ? '#666' : 'rgba(255,255,255,0.6)';

  return (
    <div
      onClick={onClick}
      style={{
        background: isLight ? cat.gradientLight : cat.gradient,
        borderRadius: 16,
        padding: '16px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
        minHeight: 180,
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
          <span style={{ fontSize: 24 }}>{cat.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: textColor }}>{cat.label}</div>
            <div style={{ fontSize: 12, color: dimColor }}>{cat.subtitle}</div>
          </div>
        </div>
        <div style={{
          background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
          borderRadius: 20, padding: '4px 12px',
          fontSize: 13, fontWeight: 700, color: textColor,
        }}>
          {items.length}
        </div>
      </div>

      {/* Anteprima bollette */}
      {items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dimColor, fontSize: 14 }}>
          Nessuna bolletta
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {preview.map((b) => (
            <div key={b._id} style={{
              background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
              borderRadius: 8, padding: '8px 10px',
              fontSize: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: textColor, fontSize: 13 }}>{b.label}</span>
                <span style={{ fontWeight: 700, color: textColor }}>{b.quota_totale.toFixed(2)}</span>
              </div>
              {b.selezioni.slice(0, 2).map((s, j) => (
                <div key={j} style={{ color: dimColor, fontSize: 11, lineHeight: 1.4 }}>
                  {s.home} - {s.away} · {formatMercato(s.mercato, s.pronostico)}
                </div>
              ))}
              {b.selezioni.length > 2 && (
                <div style={{ color: dimColor, fontSize: 11, fontStyle: 'italic' }}>
                  +{b.selezioni.length - 2} altre selezioni...
                </div>
              )}
            </div>
          ))}
          {items.length > 3 && (
            <div style={{ color: dimColor, fontSize: 12, textAlign: 'center', marginTop: 2 }}>
              +{items.length - 3} altre bollette
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
// VISTA DETTAGLIO — lista bollette di una categoria
// ============================================

function VistaDettaglio({ cat, items, onBack, savedIds, onSave, savingId, liveScores }: {
  cat: typeof CATEGORIE[0];
  items: Bolletta[];
  onBack: () => void;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  savingId: string | null;
  liveScores: LiveScore[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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
        {items.map(b => {
          const isCollapsed = collapsed[b._id] ?? false;
          const isSaved = savedIds.has(b._id);

          return (
            <div key={b._id} style={{
              background: cardBg, border: cardBorder,
              borderRadius: 12, marginBottom: 14, overflow: 'hidden',
              boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}>
              {/* Header bolletta */}
              <div
                onClick={() => setCollapsed(prev => ({ ...prev, [b._id]: !prev[b._id] }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', cursor: 'pointer',
                  background: headerBg,
                  borderBottom: isCollapsed ? 'none' : rowBorder,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Tondino esito globale bolletta */}
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
                      : '#4caf50'; // in corso, tutto ok per ora
                    const blink = anyLive && !allDone;

                    return (
                      <div className={blink ? 'blink-dot' : ''} style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: color, flexShrink: 0,
                      }} />
                    );
                  })()}
                  <span style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>{b.label}</span>
                  <span style={{ fontSize: 12, color: textSecondary }}>· {b.selezioni.length} sel.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>
                    {b.quota_totale.toFixed(2)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSave(b._id); }}
                    disabled={savingId === b._id}
                    style={{
                      background: isSaved
                        ? (isLight ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.12)')
                        : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'),
                      border: isSaved
                        ? `1px solid ${theme.gold}`
                        : (isLight ? '1px solid #ccc' : '1px solid rgba(255,255,255,0.15)'),
                      borderRadius: 8, cursor: 'pointer',
                      fontSize: 13, padding: '4px 10px',
                      color: isSaved ? theme.gold : textSecondary,
                      opacity: savingId === b._id ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    {isSaved ? '★ Salvata' : '☆ Salva'}
                  </button>
                  <span style={{ color: textSecondary, fontSize: 12 }}>
                    {isCollapsed ? '▼' : '▲'}
                  </span>
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
                            <span>{s.home} - {s.away}</span>
                            {(() => {
                              const live = liveScores.find(l => l.home === s.home && l.away === s.away);
                              if (!live || !live.live_score) return null;
                              const isFinished = live.live_status === 'Finished';
                              const scoreColor = isFinished ? textSecondary : '#f44336';
                              return (
                                <span style={{
                                  fontSize: 13, fontWeight: 700,
                                  color: scoreColor,
                                  background: isLight ? (isFinished ? '#f0f0f0' : 'rgba(244,67,54,0.08)') : (isFinished ? 'rgba(255,255,255,0.08)' : 'rgba(244,67,54,0.15)'),
                                  padding: '1px 8px', borderRadius: 6,
                                }}>
                                  {live.live_score.replace(':', ' - ')}
                                  {!isFinished && live.live_minute ? ` ${live.live_minute}'` : ''}
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
                              {s.match_date.slice(8, 10)}/{s.match_date.slice(5, 7)} - {s.match_time}
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

                  {/* Footer */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', borderTop: rowBorder, background: headerBg,
                  }}>
                    <span style={{ fontSize: 13, color: textSecondary }}>Quota totale</span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>
                      {b.quota_totale.toFixed(2)}
                    </span>
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
  const [activeCategory, setActiveCategory] = useState<Categoria | null>(null);

  // Builder state (chat conversazionale)
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMsg, setBuilderMsg] = useState('');
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderResult, setBuilderResult] = useState<Bolletta | null>(null);
  const [builderSaved, setBuilderSaved] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; bolletta?: Bolletta }[]>([]);
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onResize = () => setIsMobile(isMob());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const toggleSave = async (id: string) => {
    if (!user) { setShowAuth(true); return; }
    setSavingId(id);
    try {
      const token = await getIdToken();
      await fetch(`${API_BASE}/bollette/${id}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        const warningText = (data.warnings || []).length > 0 ? '\n⚠️ ' + data.warnings.join('\n⚠️ ') : '';
        setChatMessages(prev => [...prev, { role: 'assistant', content: (data.bolletta.reasoning || 'Ecco la tua bolletta!') + warningText, bolletta: data.bolletta }]);
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
        body: JSON.stringify({ bolletta: builderResult }),
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

  // Raggruppa
  const today = new Date().toISOString().split('T')[0];
  const grouped: Record<Categoria, Bolletta[]> = { oggi: [], selettiva: [], bilanciata: [], ambiziosa: [], custom: [] };
  for (const b of bollette) {
    const tutteOggi = b.selezioni.every(s => s.match_date === today);
    if (tutteOggi) grouped.oggi.push(b);
    else grouped[b.tipo]?.push(b);
  }

  // Se una categoria è attiva, mostra il dettaglio
  if (activeCategory) {
    const catDef = activeCategory === 'custom'
      ? { key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Salvate e personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }
      : CATEGORIE.find(c => c.key === activeCategory)!;
    const items = activeCategory === 'custom'
      ? [...customBollette, ...bollette.filter(b => savedIds.has(b._id))]
      : grouped[activeCategory] || [];
    return (
      <>
        <VistaDettaglio
          cat={catDef}
          items={items}
          onBack={() => setActiveCategory(null)}
          savedIds={savedIds}
          onSave={toggleSave}
          savingId={savingId}
          liveScores={liveScores}
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
      overflowY: 'auto', zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        zIndex: 10,
        background: isLight ? '#fff' : theme.panelSolid,
        borderBottom: isLight ? '1px solid #e0e0e0' : theme.panelBorder,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none',
            color: isLight ? '#333' : theme.cyan,
            cursor: 'pointer', fontSize: 20, padding: '4px 8px',
          }}>←</button>
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          🎫 Ticket AI
        </h1>
        <span style={{ color: isLight ? '#999' : theme.textDim, fontSize: 14, marginLeft: 'auto' }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textSecondary }}>
          Caricamento ticket...
        </div>
      ) : (
        <div style={{ padding: 16 }}>

          {/* === BANNER: Costruisci il tuo Ticket AI === */}
          <div
            onClick={() => { if (!user) { setShowAuth(true); return; } setShowBuilder(!showBuilder); }}
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
                Chiedi a Mistral di comporre una bolletta su misura per te
              </div>
            </div>
            <span style={{ fontSize: 24, color: '#fff' }}>{showBuilder ? '▲' : '▼'}</span>
          </div>

          {/* === BUILDER CHAT === */}
          {showBuilder && (
            <div style={{
              background: isLight ? '#fff' : '#1a1d2e',
              border: isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, marginBottom: 16, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              maxHeight: '60vh',
            }}>
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
              <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {chatMessages.map((m, i) => (
                  <div key={i}>
                    {/* Bubble messaggio */}
                    <div style={{
                      display: 'flex',
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: m.role === 'user'
                          ? (isLight ? '#667eea' : '#11998e')
                          : (isLight ? '#f0f0f5' : 'rgba(255,255,255,0.08)'),
                        color: m.role === 'user' ? '#fff' : textPrimary,
                        fontSize: 14, lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}>
                        {m.content}
                      </div>
                    </div>

                    {/* Bolletta inline (se presente) */}
                    {m.bolletta && (
                      <div style={{ marginTop: 8, marginLeft: 0, maxWidth: '90%' }}>
                        <div style={{
                          background: isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)',
                          border: isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12, overflow: 'hidden',
                        }}>
                          <div style={{
                            padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                            background: isLight ? '#eee' : 'rgba(255,255,255,0.06)',
                            fontSize: 13, fontWeight: 700,
                          }}>
                            <span>{m.bolletta.tipo} · {m.bolletta.selezioni.length} sel.</span>
                            <span>Quota: {m.bolletta.quota_totale.toFixed(2)}</span>
                          </div>
                          {m.bolletta.selezioni.map((s, j) => (
                            <div key={j} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                              padding: '8px 12px', fontSize: 13,
                              borderTop: isLight ? '1px solid #eee' : '1px solid rgba(255,255,255,0.06)',
                            }}>
                              <div>
                                <div style={{ fontWeight: 700 }}>{s.home} - {s.away}</div>
                                <div style={{ fontSize: 11, color: textSecondary, textTransform: 'uppercase' }}>
                                  {formatMercato(s.mercato, s.pronostico)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                                <div style={{ fontSize: 11, color: textSecondary }}>
                                  {s.match_date.slice(8, 10)}/{s.match_date.slice(5, 7)} - {s.match_time}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.quota.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Bottone salva */}
                        {!builderSaved ? (
                          <button
                            onClick={handleSaveCustom}
                            style={{
                              marginTop: 8, width: '100%', padding: '10px',
                              background: isLight ? '#4caf50' : '#2e7d32',
                              border: 'none', borderRadius: 10,
                              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            ✅ Salva nelle mie bollette
                          </button>
                        ) : (
                          <div style={{
                            marginTop: 8, padding: '10px', textAlign: 'center',
                            background: isLight ? '#e8f5e9' : 'rgba(46,125,50,0.2)',
                            borderRadius: 10, fontWeight: 700, fontSize: 13,
                            color: isLight ? '#2e7d32' : '#66bb6a',
                          }}>
                            ✅ Salvata!
                          </div>
                        )}
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
                    background: isLight ? '#f8f9fa' : 'rgba(255,255,255,0.06)',
                    border: isLight ? '1px solid #ddd' : '1px solid rgba(255,255,255,0.15)',
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

          {/* === GRIGLIA RESPONSIVE === */}
          {isMobile ? (
            /* Mobile: 1 colonna */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CATEGORIE.map(cat => (
                <Quadrante key={cat.key} cat={cat} items={grouped[cat.key]} onClick={() => setActiveCategory(cat.key)} />
              ))}
              <Quadrante
                cat={{ key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Salvate e personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }}
                items={[...customBollette, ...bollette.filter(b => savedIds.has(b._id))]}
                onClick={() => setActiveCategory('custom' as Categoria)}
              />
            </div>
          ) : (
            /* Desktop: 3+2 */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                {CATEGORIE.slice(0, 3).map(cat => (
                  <Quadrante key={cat.key} cat={cat} items={grouped[cat.key]} onClick={() => setActiveCategory(cat.key)} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <Quadrante cat={CATEGORIE[3]} items={grouped.ambiziosa} onClick={() => setActiveCategory('ambiziosa')} />
                <Quadrante
                  cat={{ key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Salvate e personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }}
                  items={[...customBollette, ...bollette.filter(b => savedIds.has(b._id))]}
                  onClick={() => setActiveCategory('custom' as Categoria)}
                />
              </div>
            </>
          )}
        </div>
      )}

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
