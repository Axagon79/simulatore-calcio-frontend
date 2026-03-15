import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import { getTheme, getThemeMode } from '../AppDev/costanti';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

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
        minHeight: 260,
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

function VistaDettaglio({ cat, items, onBack, savedIds, onSave, savingId }: {
  cat: typeof CATEGORIE[0];
  items: Bolletta[];
  onBack: () => void;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  savingId: string | null;
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
      <div style={{ padding: '20px', maxWidth: 700, margin: '0 auto' }}>
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
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 18, padding: '2px 4px',
                      color: isSaved ? theme.gold : textSecondary,
                      opacity: savingId === b._id ? 0.4 : 1,
                    }}
                  >
                    {isSaved ? '★' : '☆'}
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
                    const bgEsito = s.esito === true
                      ? (isLight ? '#f0fdf4' : 'rgba(0,255,136,0.08)')
                      : s.esito === false
                        ? (isLight ? '#fef2f2' : 'rgba(255,68,102,0.08)')
                        : 'transparent';

                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '12px 16px',
                        borderBottom: i < b.selezioni.length - 1 ? rowBorder : 'none',
                        background: bgEsito,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>
                            {s.home} - {s.away}
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
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: s.esito === true ? '#4caf50' : s.esito === false ? '#f44336' : isLight ? '#ddd' : '#444',
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

export default function Bollette({ onBack }: { onBack?: () => void }) {
  const { user, getIdToken } = useAuth();
  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [customBollette, setCustomBollette] = useState<Bolletta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showAuth, setShowAuth] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Categoria | null>(null);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMsg, setBuilderMsg] = useState('');
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderResult, setBuilderResult] = useState<Bolletta | null>(null);
  const [builderSaved, setBuilderSaved] = useState(false);

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

  // Builder: genera bolletta personalizzata
  const handleGenerate = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!builderMsg.trim()) return;
    setBuilderLoading(true);
    setBuilderResult(null);
    setBuilderSaved(false);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/bollette/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: builderMsg }),
      });
      const data = await res.json();
      if (data.success && data.bolletta) {
        setBuilderResult(data.bolletta);
      } else {
        alert(data.error || 'Errore nella generazione');
      }
    } catch (err) {
      console.error('Errore generazione:', err);
      alert('Errore di connessione');
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
      ? { key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Bollette personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }
      : CATEGORIE.find(c => c.key === activeCategory)!;
    const items = activeCategory === 'custom' ? customBollette : grouped[activeCategory] || [];
    return (
      <>
        <VistaDettaglio
          cat={catDef}
          items={items}
          onBack={() => setActiveCategory(null)}
          savedIds={savedIds}
          onSave={toggleSave}
          savingId={savingId}
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
              padding: '20px 24px',
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
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                🤖 Costruisci il tuo Ticket AI
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                Chiedi a Mistral di comporre una bolletta su misura per te
              </div>
            </div>
            <span style={{ fontSize: 24, color: '#fff' }}>{showBuilder ? '▲' : '▼'}</span>
          </div>

          {/* === BUILDER ESPANSO === */}
          {showBuilder && (
            <div style={{
              background: isLight ? '#fff' : '#1a1d2e',
              border: isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: 20, marginBottom: 16,
            }}>
              {/* Suggerimenti rapidi */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {[
                  'Fammi una bolletta sicura con quota massimo 3',
                  'Bolletta rischiosa con quota almeno 15',
                  'Mix di mercati diversi con 4 selezioni',
                  'Solo partite di oggi, quota intorno a 5',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => setBuilderMsg(s)}
                    style={{
                      background: isLight ? '#f0f0f5' : 'rgba(255,255,255,0.08)',
                      border: isLight ? '1px solid #ddd' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 20, padding: '6px 14px',
                      fontSize: 12, color: textSecondary,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isLight ? '#e0e0ea' : 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isLight ? '#f0f0f5' : 'rgba(255,255,255,0.08)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input + bottone */}
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={builderMsg}
                  onChange={(e) => setBuilderMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !builderLoading) handleGenerate(); }}
                  placeholder="Descrivi la bolletta che vuoi..."
                  style={{
                    flex: 1, padding: '12px 16px',
                    background: isLight ? '#f8f9fa' : 'rgba(255,255,255,0.06)',
                    border: isLight ? '1px solid #ddd' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, fontSize: 14,
                    color: textPrimary, outline: 'none',
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={builderLoading || !builderMsg.trim()}
                  style={{
                    padding: '12px 24px',
                    background: builderLoading ? '#666' : isLight ? '#667eea' : '#11998e',
                    border: 'none', borderRadius: 10,
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    cursor: builderLoading ? 'wait' : 'pointer',
                    opacity: !builderMsg.trim() ? 0.5 : 1,
                  }}
                >
                  {builderLoading ? '⏳ Genero...' : '🚀 Genera'}
                </button>
              </div>

              {/* Risultato */}
              {builderResult && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    background: isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)',
                    border: isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    {/* Header risultato */}
                    <div style={{
                      padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: isLight ? '#eee' : 'rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        Bolletta {builderResult.tipo} · {builderResult.selezioni.length} selezioni
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        Quota: {builderResult.quota_totale.toFixed(2)}
                      </span>
                    </div>
                    {/* Selezioni */}
                    {builderResult.selezioni.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '10px 16px',
                        borderTop: isLight ? '1px solid #eee' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{s.home} - {s.away}</div>
                          <div style={{ fontSize: 12, color: textSecondary, marginTop: 2, textTransform: 'uppercase' }}>
                            {formatMercato(s.mercato, s.pronostico)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: textSecondary }}>
                            {s.match_date.slice(8, 10)}/{s.match_date.slice(5, 7)} - {s.match_time}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{s.quota.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottone salva */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                    {!builderSaved ? (
                      <button
                        onClick={handleSaveCustom}
                        style={{
                          flex: 1, padding: '12px',
                          background: isLight ? '#4caf50' : '#2e7d32',
                          border: 'none', borderRadius: 10,
                          color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}
                      >
                        ✅ Salva nelle mie bollette
                      </button>
                    ) : (
                      <div style={{
                        flex: 1, padding: '12px', textAlign: 'center',
                        background: isLight ? '#e8f5e9' : 'rgba(46,125,50,0.2)',
                        borderRadius: 10, fontWeight: 700, fontSize: 14,
                        color: isLight ? '#2e7d32' : '#66bb6a',
                      }}>
                        ✅ Salvata!
                      </div>
                    )}
                    <button
                      onClick={() => { setBuilderResult(null); setBuilderMsg(''); }}
                      style={{
                        padding: '12px 20px',
                        background: isLight ? '#eee' : 'rgba(255,255,255,0.08)',
                        border: 'none', borderRadius: 10,
                        color: textSecondary, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      Nuova
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === GRIGLIA 3+2 === */}
          {/* Riga 1: Oggi, Selettiva, Bilanciata */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 16,
          }}>
            {CATEGORIE.slice(0, 3).map(cat => (
              <Quadrante
                key={cat.key}
                cat={cat}
                items={grouped[cat.key]}
                onClick={() => setActiveCategory(cat.key)}
              />
            ))}
          </div>
          {/* Riga 2: Ambiziosa, Le mie bollette */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}>
            <Quadrante
              cat={CATEGORIE[3]}
              items={grouped.ambiziosa}
              onClick={() => setActiveCategory('ambiziosa')}
            />
            <Quadrante
              cat={{ key: 'custom' as Categoria, emoji: '✨', label: 'Le mie bollette', subtitle: 'Bollette personalizzate', gradient: 'linear-gradient(135deg, #1a1a2e, #2d2d44)', gradientLight: 'linear-gradient(135deg, #f0f0f5, #e0e0ea)' }}
              items={customBollette}
              onClick={() => setActiveCategory('custom' as Categoria)}
            />
          </div>
        </div>
      )}

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
