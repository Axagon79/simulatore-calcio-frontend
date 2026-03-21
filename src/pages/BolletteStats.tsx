import { useState, useEffect } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

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
  tipo: 'oggi' | 'selettiva' | 'bilanciata' | 'ambiziosa';
  custom?: boolean;
  quota_totale: number;
  label: string;
  selezioni: Selezione[];
  esito_globale: string | null;
  stake_amount?: number;
}

// ============================================
// LIVE SCORES
// ============================================
function calculateHitFromScore(score: string, pronostico: string, tipo: string): boolean | null {
  if (!score) return null;
  const normalized = score.replace(/\s/g, '').replace('-', ':');
  const parts = normalized.split(':');
  if (parts.length !== 2) return null;
  const home = parseInt(parts[0]), away = parseInt(parts[1]);
  if (isNaN(home) || isNaN(away)) return null;
  const total = home + away;
  const t = tipo.toUpperCase();

  if (t === 'SEGNO' || t === '1X2 ESITO FINALE' || t === '1X2') {
    const sign = home > away ? '1' : home === away ? 'X' : '2';
    return pronostico === sign;
  }
  if (t === 'DOPPIA_CHANCE' || t === 'DOPPIA CHANCE') {
    const sign = home > away ? '1' : home === away ? 'X' : '2';
    if (pronostico === '1X') return sign === '1' || sign === 'X';
    if (pronostico === 'X2') return sign === 'X' || sign === '2';
    if (pronostico === '12') return sign === '1' || sign === '2';
    return null;
  }
  if (t === 'GOL' || t === 'GOAL' || t === 'GOAL/NOGOAL' || t === 'U/O') {
    const p = pronostico.toLowerCase();
    if (p.startsWith('over')) { const thr = parseFloat(pronostico.split(' ')[1]); return total > thr; }
    if (p.startsWith('under')) { const thr = parseFloat(pronostico.split(' ')[1]); return total < thr; }
    if (p === 'goal' || p === 'si') return home > 0 && away > 0;
    if (p === 'nogoal' || p === 'no') return home === 0 || away === 0;
    const mg = pronostico.match(/^MG\s+(\d+)-(\d+)/i);
    if (mg) return total >= parseInt(mg[1]) && total <= parseInt(mg[2]);
    return null;
  }
  if (t === 'RISULTATO_ESATTO' || t === 'RISULTATO ESATTO') {
    return `${home}:${away}` === pronostico.replace('-', ':');
  }
  return null;
}

function getEsitoSel(sel: any): 'pending' | 'win' | 'lose' {
  if (sel.esito === true) return 'win';
  if (sel.esito === false) return 'lose';
  const score = sel.real_score || sel.live_score;
  if (!score) return 'pending';
  const finished = sel.match_finished || sel.live_status === 'Finished';
  if (!finished) return 'pending';
  const hit = calculateHitFromScore(score, sel.pronostico, sel.mercato);
  if (hit === null) return 'pending';
  return hit ? 'win' : 'lose';
}

// ============================================
// THEME
// ============================================
const textPrimary = isLight ? '#1a1a1a' : '#e0e0e0';
const textSecondary = isLight ? '#666' : 'rgba(255,255,255,0.5)';
const cardBg = isLight ? '#fff' : 'rgba(255,255,255,0.04)';
const cardBorder = isLight ? '1px solid #e0e0e0' : '1px solid rgba(255,255,255,0.08)';

type Tab = 'tutti' | 'oggi' | 'selettiva' | 'bilanciata' | 'ambiziosa';

const TABS: { key: Tab; label: string }[] = [
  { key: 'tutti', label: 'Tutti' },
  { key: 'oggi', label: 'Oggi' },
  { key: 'selettiva', label: 'Selettiva' },
  { key: 'bilanciata', label: 'Bilanciata' },
  { key: 'ambiziosa', label: 'Ambiziosa' },
];

// ============================================
// STATS BLOCK
// ============================================
function StatsBlock({ bollette }: { bollette: Bolletta[] }) {
  const [mercatiExpanded, setMercatiExpanded] = useState(false);

  if (!bollette.length) {
    return <div style={{ textAlign: 'center', padding: 40, color: textSecondary, fontSize: 13 }}>Nessuna bolletta disponibile</div>;
  }

  let vinte = 0, perse = 0, inCorso = 0, daGiocare = 0, totaleProfitto = 0;
  const risultati: ('W' | 'L')[] = [];
  let bestQuotaVinta = 0;
  let bestVincitaEuro = 0;
  let worstPerditaEuro = 0;
  const mercatiStats: Record<string, { win: number; total: number }> = {};

  const sorted = [...bollette].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const b of sorted) {
    const esiti = b.selezioni.map((s: any) => getEsitoSel(s));
    const hasDefLose = esiti.some(e => e === 'lose');
    const allDone = esiti.every(e => e === 'win' || e === 'lose');
    const allWin = esiti.every(e => e === 'win');
    const stake = b.stake_amount || 1;

    const isWin = b.esito_globale === 'vinta' || (allDone && allWin);
    const isLoss = b.esito_globale === 'persa' || hasDefLose;

    if (isWin) {
      vinte++;
      const vincita = stake * ((b.quota_totale || 1) - 1);
      totaleProfitto += vincita;
      risultati.push('W');
      if ((b.quota_totale || 0) > bestQuotaVinta) bestQuotaVinta = b.quota_totale || 0;
      if (vincita > bestVincitaEuro) bestVincitaEuro = vincita;
    } else if (isLoss) {
      perse++;
      totaleProfitto -= stake;
      risultati.push('L');
      if (stake > worstPerditaEuro) worstPerditaEuro = stake;
    } else {
      const allPending = esiti.every(e => e === 'pending');
      if (allPending) { daGiocare++; } else { inCorso++; }
    }

    for (let si = 0; si < b.selezioni.length; si++) {
      const s = b.selezioni[si];
      const raw = s.pronostico || s.mercato || 'Altro';
      const key = ['1', 'X', '2'].includes(raw) ? '1X2'
        : ['1X', 'X2', '12'].includes(raw) ? 'Doppie Chance'
        : raw;
      if (!mercatiStats[key]) mercatiStats[key] = { win: 0, total: 0 };
      const esito = esiti[si];
      if (esito === 'win') { mercatiStats[key].win++; mercatiStats[key].total++; }
      else if (esito === 'lose') { mercatiStats[key].total++; }
    }
  }

  // Streak
  let currentStreak = 0;
  let currentStreakType: 'W' | 'L' | null = null;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let tempStreak = 0;
  let tempType: 'W' | 'L' | null = null;
  for (const r of risultati) {
    if (r === tempType) { tempStreak++; }
    else { tempStreak = 1; tempType = r; }
    if (r === 'W' && tempStreak > bestWinStreak) bestWinStreak = tempStreak;
    if (r === 'L' && tempStreak > worstLossStreak) worstLossStreak = tempStreak;
  }
  if (risultati.length > 0) {
    currentStreakType = risultati[risultati.length - 1];
    currentStreak = 1;
    for (let i = risultati.length - 2; i >= 0; i--) {
      if (risultati[i] === currentStreakType) currentStreak++;
      else break;
    }
  }

  const chiuse = vinte + perse;
  const winRate = chiuse > 0 ? ((vinte / chiuse) * 100).toFixed(1) : '—';
  const totaleStake = sorted.reduce((acc, b) => acc + (b.stake_amount || 1), 0);
  const roi = totaleStake > 0 ? ((totaleProfitto / totaleStake) * 100).toFixed(1) : '—';
  const quotaMedia = (bollette.reduce((acc, b) => acc + (b.quota_totale || 0), 0) / bollette.length).toFixed(2);

  for (const m of ['1X2', 'Doppie Chance', 'Over 1.5', 'Over 2.5', 'Over 3.5', 'Under 1.5', 'Under 2.5', 'Under 3.5', 'Goal', 'No Goal', 'MG 1-2', 'MG 2-3', 'MG 3-4', 'MG 4+']) {
    if (!mercatiStats[m]) mercatiStats[m] = { win: 0, total: 0 };
  }
  const mercatiSorted = Object.entries(mercatiStats)
    .sort((a, b) => b[1].total === a[1].total
      ? (b[1].total > 0 ? b[1].win / b[1].total : 0) - (a[1].total > 0 ? a[1].win / a[1].total : 0)
      : b[1].total - a[1].total);

  const streakText = currentStreak > 0
    ? `${currentStreak} ${currentStreakType === 'W' ? 'vinte' : 'perse'} di fila`
    : '—';
  const streakColor = currentStreakType === 'W' ? '#4caf50' : currentStreakType === 'L' ? '#f44336' : textPrimary;

  const renderRow = ([mercato, data]: [string, { win: number; total: number }]) => {
    const pct = data.total > 0 ? Math.round((data.win / data.total) * 100) : 0;
    const pctColor = data.total === 0 ? textSecondary : pct >= 60 ? '#4caf50' : pct >= 40 ? '#ff9800' : '#f44336';
    return (
      <div key={mercato} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: textPrimary, width: 100, flexShrink: 0 }}>{mercato.replace('_', ' ')}</span>
        <div style={{ flex: 1, height: 5, background: isLight ? '#e0e0e0' : 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: pctColor, width: 30, textAlign: 'right' }}>{data.total > 0 ? `${pct}%` : '—'}</span>
        <span style={{ fontSize: 9, color: textSecondary, width: 28 }}>{data.win}/{data.total}</span>
      </div>
    );
  };

  const bestWithData = mercatiSorted.find(([, d]) => d.total > 0);

  return (
    <>
      {/* Conteggi + totale bollette */}
      <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: textSecondary }}>
        {bollette.length} bollette totali
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Vinte', value: vinte, color: '#4caf50' },
          { label: 'Perse', value: perse, color: '#f44336' },
          { label: 'In corso', value: inCorso, color: '#ff9800' },
          { label: 'Da giocare', value: daGiocare, color: '#2196f3' },
        ].map(s => (
          <div key={s.label} style={{ background: cardBg, border: cardBorder, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'Win Rate', value: `${winRate}%`, color: parseFloat(winRate as string) >= 50 ? '#4caf50' : parseFloat(winRate as string) > 0 ? '#f44336' : textPrimary },
          { label: 'ROI', value: `${roi}%`, color: parseFloat(roi as string) >= 0 ? '#4caf50' : '#f44336' },
          { label: 'Quota media', value: quotaMedia, color: textPrimary },
        ].map(s => (
          <div key={s.label} style={{ background: cardBg, border: cardBorder, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: cardBg, border: cardBorder, borderRadius: 10, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: totaleProfitto >= 0 ? '#4caf50' : '#f44336' }}>{`\u20AC${totaleProfitto >= 0 ? '+' : ''}${totaleProfitto.toFixed(2)}`}</div>
        <div style={{ fontSize: 10, color: textSecondary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Profitto (stake 1\u20AC)</div>
      </div>

      {/* Streak & Record */}
      {chiuse > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
          <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '6px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: streakColor }}>{streakText}</div>
            <div style={{ fontSize: 9, color: textSecondary, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Serie attuale</div>
          </div>
          <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '6px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4caf50' }}>{bestWinStreak}</div>
            <div style={{ fontSize: 9, color: textSecondary, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Record vinte</div>
          </div>
          <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '6px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f44336' }}>{worstLossStreak}</div>
            <div style={{ fontSize: 9, color: textSecondary, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Record perse</div>
          </div>
          {bestQuotaVinta > 0 && (<>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '6px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#4caf50' }}>{bestQuotaVinta.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: textSecondary, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top quota vinta</div>
            </div>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '6px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#4caf50' }}>{bestVincitaEuro.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: textSecondary, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top vincita</div>
            </div>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '6px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f44336' }}>{worstPerditaEuro.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: textSecondary, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Peggior perdita</div>
            </div>
          </>)}
        </div>
      )}

      {/* Mercati — collassabile */}
      {mercatiSorted.length > 0 && (
        <div style={{ background: cardBg, border: cardBorder, borderRadius: 8, padding: '8px 10px', marginBottom: 16, cursor: 'pointer' }}
          onClick={() => setMercatiExpanded(prev => !prev)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mercatiExpanded ? 6 : (bestWithData ? 6 : 0) }}>
            <span style={{ fontSize: 9, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Successo per mercato</span>
            <span style={{ fontSize: 10, color: textSecondary }}>{mercatiExpanded ? '\u25B2' : '\u25BC'}</span>
          </div>
          {!mercatiExpanded && bestWithData && renderRow(bestWithData)}
          {mercatiExpanded && mercatiSorted.map(entry => renderRow(entry))}
        </div>
      )}
    </>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function BolletteStats({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('tutti');
  const [allBollette, setAllBollette] = useState<Bolletta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/bollette/all`);
        const data = await res.json();
        if (data.success) setAllBollette(data.bollette || []);
      } catch (err) {
        console.error('Errore fetch bollette/all:', err);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = tab === 'tutti' ? allBollette : allBollette.filter(b => b.tipo === tab);

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
        }}>{'\u2190'}</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Statistiche Ticket</h1>
      </div>

      <div style={{ padding: '16px', maxWidth: 700, margin: '0 auto' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1,
              background: tab === t.key
                ? (isLight ? '#333' : 'rgba(255,255,255,0.2)')
                : (isLight ? '#e8e8e8' : 'rgba(255,255,255,0.06)'),
              color: tab === t.key ? '#fff' : textSecondary,
              border: tab === t.key
                ? (isLight ? '1px solid #333' : '1px solid rgba(255,255,255,0.3)')
                : '1px solid transparent',
              borderRadius: 20, padding: '8px 0',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: textSecondary }}>Caricamento...</div>
        ) : (
          <StatsBlock bollette={filtered} />
        )}
      </div>
    </div>
  );
}
