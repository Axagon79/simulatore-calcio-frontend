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

const TIPO_CONFIG: Record<string, { emoji: string; label: string }> = {
  selettiva:  { emoji: '🎯', label: 'Selettiva' },
  bilanciata: { emoji: '⚖️', label: 'Bilanciata' },
  ambiziosa:  { emoji: '🚀', label: 'Ambiziosa' },
};

function formatMercato(mercato: string, pronostico: string): string {
  switch (mercato) {
    case 'SEGNO': return pronostico;
    case 'DOPPIA_CHANCE': return `DOPPIA CHANCE: ${pronostico}`;
    case 'GOL':
      if (pronostico === 'Goal') return 'GOAL/NOGOAL: GOAL';
      if (pronostico === 'NoGoal') return 'GOAL/NOGOAL: NO GOAL';
      if (pronostico.startsWith('Over')) return 'U/O 2.5: OVER';
      if (pronostico.startsWith('Under')) return 'U/O 2.5: UNDER';
      return pronostico;
    case 'RISULTATO_ESATTO': return `RE: ${pronostico}`;
    default: return `${mercato}: ${pronostico}`;
  }
}

// ============================================
// CARD SINGOLA BOLLETTA (stile screenshot)
// ============================================

function BollettaCard({ b, isCollapsed, onToggle, isSaved, onSave, savingId }: {
  b: Bolletta;
  isCollapsed: boolean;
  onToggle: () => void;
  isSaved: boolean;
  onSave: () => void;
  savingId: string | null;
}) {
  const cfg = TIPO_CONFIG[b.tipo] || TIPO_CONFIG.bilanciata;
  const won = b.selezioni.filter(s => s.esito === true).length;
  const lost = b.selezioni.filter(s => s.esito === false).length;

  // Colori card — sfondo chiaro stile biglietto
  const cardBg = isLight ? '#ffffff' : '#1a1d2e';
  const cardBorder = isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.1)';
  const rowBorder = isLight ? '1px solid #eee' : '1px solid rgba(255,255,255,0.06)';
  const headerBg = isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)';
  const textPrimary = isLight ? '#1a1a1a' : '#fff';
  const textSecondary = isLight ? '#666' : '#999';
  const quotaColor = isLight ? '#1a1a1a' : '#fff';

  return (
    <div style={{
      background: cardBg,
      border: cardBorder,
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
      boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
    }}>
      {/* Header bolletta — click per collassare */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', cursor: 'pointer',
          background: headerBg,
          borderBottom: isCollapsed ? 'none' : rowBorder,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>{b.label}</span>
          <span style={{ fontSize: 12, color: textSecondary }}>
            · {b.selezioni.length} sel.
          </span>
          {won > 0 && <span style={{ fontSize: 12, color: theme.hitText }}>{won}✅</span>}
          {lost > 0 && <span style={{ fontSize: 12, color: theme.missText }}>{lost}❌</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: quotaColor }}>
            {b.quota_totale.toFixed(2)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
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

      {/* Selezioni — stile screenshot: partita bold a sx, mercato sotto, data+quota a dx */}
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
                {/* Sinistra: partita + mercato */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>
                    {s.home} - {s.away}
                  </div>
                  <div style={{ fontSize: 12, color: textSecondary, marginTop: 3, textTransform: 'uppercase' }}>
                    {formatMercato(s.mercato, s.pronostico)}
                  </div>
                </div>
                {/* Destra: data/ora + quota + tondo esito */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: textSecondary }}>
                      {s.match_date.slice(8, 10)}/{s.match_date.slice(5, 7)} - {s.match_time}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: quotaColor, marginTop: 2 }}>
                      {s.quota.toFixed(2)}
                    </div>
                  </div>
                  {/* Tondo indicatore esito */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: s.esito === true
                      ? '#4caf50'
                      : s.esito === false
                        ? '#f44336'
                        : isLight ? '#ddd' : '#444',
                    flexShrink: 0,
                  }} />
                </div>
              </div>
            );
          })}

          {/* Footer: quota totale */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px',
            borderTop: rowBorder,
            background: headerBg,
          }}>
            <span style={{ fontSize: 13, color: textSecondary }}>Quota totale</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: quotaColor }}>
              {b.quota_totale.toFixed(2)}
            </span>
          </div>

          {/* Riepilogo esiti */}
          {lost > 0 && (
            <div style={{
              padding: '8px 16px', fontSize: 12,
              color: theme.missText,
              background: isLight ? '#fef2f2' : 'rgba(255,68,102,0.1)',
              borderTop: rowBorder,
            }}>
              {lost === 1
                ? `1 selezione sbagliata: ${b.selezioni.filter(s => s.esito === false).map(s => `${s.home}-${s.away}`).join(', ')}`
                : `${lost} selezioni sbagliate`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// SEZIONE (Oggi / Selettiva / Bilanciata / Ambiziosa)
// ============================================

function Sezione({ title, emoji, items, collapsed, setCollapsed, savedIds, onSave, savingId }: {
  title: string;
  emoji: string;
  items: Bolletta[];
  collapsed: Record<string, boolean>;
  setCollapsed: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  savingId: string | null;
}) {
  if (items.length === 0) return null;

  const accentColor = isLight ? '#333' : '#fff';

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, paddingBottom: 8,
        borderBottom: isLight ? '2px solid #ddd' : '2px solid rgba(255,255,255,0.15)',
      }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: accentColor }}>{title}</span>
        <span style={{ fontSize: 13, color: isLight ? '#999' : '#666' }}>
          ({items.length})
        </span>
      </div>
      {items.map(b => (
        <BollettaCard
          key={b._id}
          b={b}
          isCollapsed={collapsed[b._id] ?? false}
          onToggle={() => setCollapsed(prev => ({ ...prev, [b._id]: !prev[b._id] }))}
          isSaved={savedIds.has(b._id)}
          onSave={() => onSave(b._id)}
          savingId={savingId}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Bollette({ onBack }: { onBack?: () => void }) {
  const { user, getIdToken } = useAuth();
  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showAuth, setShowAuth] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  // Raggruppa: prima "solo oggi", poi per fascia
  const today = new Date().toISOString().split('T')[0];
  const soloOggi: Bolletta[] = [];
  const selettive: Bolletta[] = [];
  const bilanciate: Bolletta[] = [];
  const ambiziose: Bolletta[] = [];

  for (const b of bollette) {
    const tutteOggi = b.selezioni.every(s => s.match_date === today);
    if (tutteOggi) {
      soloOggi.push(b);
    } else {
      if (b.tipo === 'selettiva') selettive.push(b);
      else if (b.tipo === 'bilanciata') bilanciate.push(b);
      else ambiziose.push(b);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: isLight ? '#f5f5f5' : theme.bg,
      color: isLight ? '#1a1a1a' : '#fff',
      fontFamily: theme.font,
      overflowY: 'auto', zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
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

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: isLight ? '#999' : theme.textDim }}>
            Caricamento ticket...
          </div>
        ) : bollette.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: isLight ? '#999' : theme.textDim }}>
            Nessun ticket disponibile per oggi.
          </div>
        ) : (
          <>
            <Sezione title="Oggi" emoji="📅" items={soloOggi}
              collapsed={collapsed} setCollapsed={setCollapsed}
              savedIds={savedIds} onSave={toggleSave} savingId={savingId} />

            <Sezione title="Selettiva" emoji="🎯" items={selettive}
              collapsed={collapsed} setCollapsed={setCollapsed}
              savedIds={savedIds} onSave={toggleSave} savingId={savingId} />

            <Sezione title="Bilanciata" emoji="⚖️" items={bilanciate}
              collapsed={collapsed} setCollapsed={setCollapsed}
              savedIds={savedIds} onSave={toggleSave} savingId={savingId} />

            <Sezione title="Ambiziosa" emoji="🚀" items={ambiziose}
              collapsed={collapsed} setCollapsed={setCollapsed}
              savedIds={savedIds} onSave={toggleSave} savingId={savingId} />
          </>
        )}
      </div>

      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
