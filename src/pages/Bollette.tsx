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

// ============================================
// HELPERS
// ============================================

const TIPO_CONFIG: Record<string, { emoji: string; color: string; colorLight: string; label: string }> = {
  selettiva:  { emoji: '🎯', color: '#05f9b6', colorLight: '#059669', label: 'Selettiva' },
  bilanciata: { emoji: '⚖️', color: '#00f0ff', colorLight: '#0077cc', label: 'Bilanciata' },
  ambiziosa:  { emoji: '🚀', color: '#bc13fe', colorLight: '#7c3aed', label: 'Ambiziosa' },
};

function formatMercato(mercato: string, pronostico: string): string {
  switch (mercato) {
    case 'SEGNO': return pronostico;
    case 'DOPPIA_CHANCE': return `DC: ${pronostico}`;
    case 'GOL':
      if (pronostico === 'Goal') return 'GOAL/NOGOAL: GOAL';
      if (pronostico === 'NoGoal') return 'GOAL/NOGOAL: NO GOAL';
      if (pronostico.startsWith('Over')) return `U/O 2.5: OVER`;
      if (pronostico.startsWith('Under')) return `U/O 2.5: UNDER`;
      return pronostico;
    case 'RISULTATO_ESATTO': return `RE: ${pronostico}`;
    default: return `${mercato}: ${pronostico}`;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ============================================
// COMPONENT
// ============================================

export default function Bollette({ onBack }: { onBack?: () => void }) {
  const { user, getIdToken } = useAuth();
  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showAuth, setShowAuth] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch bollette
  const fetchBollette = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/bollette?date=${today}`);
      const data = await res.json();
      if (data.success) {
        setBollette(data.bollette || []);
        // Marca quelle salvate dall'utente
        if (user) {
          const saved = new Set<string>();
          for (const b of data.bollette || []) {
            if ((b.saved_by || []).includes(user.uid)) saved.add(b._id);
          }
          setSavedIds(saved);
        }
      }
    } catch (err) {
      console.error('Errore fetch bollette:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBollette(); }, [fetchBollette]);

  // Toggle salva
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

  // Toggle collapse
  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Raggruppa per tipo
  const grouped = { selettiva: [] as Bolletta[], bilanciata: [] as Bolletta[], ambiziosa: [] as Bolletta[] };
  for (const b of bollette) {
    if (grouped[b.tipo]) grouped[b.tipo].push(b);
  }

  // Conta esiti per bolletta
  const getEsitoSummary = (selezioni: Selezione[]) => {
    const won = selezioni.filter(s => s.esito === true).length;
    const lost = selezioni.filter(s => s.esito === false).length;
    const pending = selezioni.filter(s => s.esito === null).length;
    return { won, lost, pending, total: selezioni.length };
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: theme.bg, color: theme.text, fontFamily: theme.font,
      overflowY: 'auto', zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: theme.panelSolid, borderBottom: theme.panelBorder,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: theme.cyan,
            cursor: 'pointer', fontSize: 20, padding: '4px 8px',
          }}>←</button>
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Ticket AI
        </h1>
        <span style={{ color: theme.textDim, fontSize: 14, marginLeft: 'auto' }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: theme.textDim }}>
            Caricamento bollette...
          </div>
        ) : bollette.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: theme.textDim }}>
            Nessuna bolletta disponibile per oggi.
          </div>
        ) : (
          (['selettiva', 'bilanciata', 'ambiziosa'] as const).map(tipo => {
            const items = grouped[tipo];
            if (items.length === 0) return null;
            const cfg = TIPO_CONFIG[tipo];
            const tipoColor = isLight ? cfg.colorLight : cfg.color;

            return (
              <div key={tipo} style={{ marginBottom: 32 }}>
                {/* Intestazione tipo */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, paddingBottom: 8,
                  borderBottom: `2px solid ${tipoColor}`,
                }}>
                  <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: tipoColor }}>
                    {cfg.label}
                  </span>
                  <span style={{ color: theme.textDim, fontSize: 13 }}>
                    ({items.length} bollette)
                  </span>
                </div>

                {/* Card bollette */}
                {items.map(b => {
                  const isCollapsed = collapsed[b._id] ?? false;
                  const isSaved = savedIds.has(b._id);
                  const esito = getEsitoSummary(b.selezioni);

                  return (
                    <div key={b._id} style={{
                      background: theme.panel,
                      border: theme.panelBorder,
                      borderRadius: 10,
                      marginBottom: 12,
                      overflow: 'hidden',
                    }}>
                      {/* Header bolletta */}
                      <div
                        onClick={() => toggleCollapse(b._id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', cursor: 'pointer',
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{b.label}</span>
                          <span style={{
                            fontSize: 12, color: theme.textDim,
                          }}>
                            {b.selezioni.length} selezioni
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Esito badges */}
                          {esito.won > 0 && (
                            <span style={{ fontSize: 12, color: theme.hitText }}>
                              {esito.won} ✅
                            </span>
                          )}
                          {esito.lost > 0 && (
                            <span style={{ fontSize: 12, color: theme.missText }}>
                              {esito.lost} ❌
                            </span>
                          )}
                          <span style={{
                            fontWeight: 700, fontSize: 15,
                            color: isLight ? cfg.colorLight : cfg.color,
                          }}>
                            {b.quota_totale.toFixed(2)}
                          </span>
                          <span style={{ color: theme.textDim, fontSize: 14 }}>
                            {isCollapsed ? '▼' : '▲'}
                          </span>
                        </div>
                      </div>

                      {/* Selezioni (collassabili) */}
                      {!isCollapsed && (
                        <div>
                          {b.selezioni.map((s, i) => {
                            const bgEsito = s.esito === true
                              ? (isLight ? theme.hitBgSoft : theme.hitBg)
                              : s.esito === false
                                ? (isLight ? theme.missBgSoft : theme.missBg)
                                : 'transparent';
                            const borderLeft = s.esito === true
                              ? `3px solid ${theme.hitText}`
                              : s.esito === false
                                ? `3px solid ${theme.missText}`
                                : '3px solid transparent';

                            return (
                              <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 16px',
                                borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                                background: bgEsito,
                                borderLeft,
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {s.home} - {s.away}
                                    {s.esito === true && ' ✅'}
                                    {s.esito === false && ' ❌'}
                                  </div>
                                  <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>
                                    {formatMercato(s.mercato, s.pronostico)}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                                  <div style={{ fontSize: 12, color: theme.textDim }}>
                                    {formatDate(s.match_date)} - {s.match_time}
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: 15, color: theme.quotaText }}>
                                    {s.quota.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Footer: quota totale + salva */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 16px',
                            borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                            background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                          }}>
                            <div style={{ fontSize: 13, color: theme.textDim }}>
                              Quota totale
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ fontWeight: 700, fontSize: 18, color: tipoColor }}>
                                {b.quota_totale.toFixed(2)}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSave(b._id); }}
                                disabled={savingId === b._id}
                                style={{
                                  background: 'none', border: 'none',
                                  cursor: 'pointer', fontSize: 20, padding: '4px 8px',
                                  color: isSaved ? theme.gold : theme.textDim,
                                  opacity: savingId === b._id ? 0.5 : 1,
                                }}
                                title={isSaved ? 'Rimuovi dai salvati' : 'Salva bolletta'}
                              >
                                {isSaved ? '★' : '☆'}
                              </button>
                            </div>
                          </div>

                          {/* Riepilogo esiti (se ci sono risultati) */}
                          {esito.lost > 0 && (
                            <div style={{
                              padding: '8px 16px', fontSize: 12,
                              color: theme.missText,
                              background: isLight ? theme.missBgSoft : theme.missBg,
                              borderTop: `1px solid ${theme.missBorder}`,
                            }}>
                              {esito.lost === 1
                                ? `1 selezione sbagliata: ${b.selezioni.filter(s => s.esito === false).map(s => `${s.home}-${s.away}`).join(', ')}`
                                : `${esito.lost} selezioni sbagliate`
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
