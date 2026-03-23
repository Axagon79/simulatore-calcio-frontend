import { useState, useEffect, useRef } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import LogoVirgo from '../components/LogoVirgo';

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
  tipo: 'oggi' | 'elite' | 'selettiva' | 'bilanciata' | 'ambiziosa';
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
interface LiveScore {
  home: string;
  away: string;
  live_score: string;
  live_status: string;
  live_minute: number;
}

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

function getEsitoSel(sel: any, liveScores: LiveScore[] = []): 'pending' | 'win' | 'lose' | 'live' {
  if (sel.esito === true) return 'win';
  if (sel.esito === false) return 'lose';

  if (sel.real_score) {
    const hit = calculateHitFromScore(sel.real_score, sel.pronostico, sel.mercato);
    if (hit !== null) return hit ? 'win' : 'lose';
  }

  if ((sel.match_finished || sel.live_status === 'Finished') && sel.live_score) {
    const hit = calculateHitFromScore(sel.live_score, sel.pronostico, sel.mercato);
    if (hit !== null) return hit ? 'win' : 'lose';
  }

  const live = liveScores.find((s: LiveScore) => s.home === sel.home && s.away === sel.away);
  if (live && live.live_score) {
    if (live.live_status === 'Finished') {
      const hit = calculateHitFromScore(live.live_score, sel.pronostico, sel.mercato);
      if (hit !== null) return hit ? 'win' : 'lose';
    }
    return 'live';
  }

  return 'pending';
}

// ============================================
// THEME
// ============================================
const textPrimary = isLight ? '#1a1a1a' : '#e0e0e0';
const textSecondary = isLight ? '#64748b' : 'rgba(255,255,255,0.5)';
const pageBg = isLight ? '#eef1f6' : theme.bg;
const headerBg = isLight ? '#f8f9fc' : theme.panelSolid;
const headerBorder = isLight ? '1px solid #c8cdd5' : theme.panelBorder;
const sectionBg = isLight ? '#f8f9fc' : '#0d1117';
const sectionBorder = isLight ? '1px solid #d0d5dd' : '1px solid rgba(255,255,255,0.12)';

type Tab = 'tutti' | 'oggi' | 'elite' | 'selettiva' | 'bilanciata' | 'ambiziosa';

const TABS: { key: Tab; label: string; accent: string }[] = [
  { key: 'tutti', label: 'Tutti', accent: isLight ? '#475569' : '#94a3b8' },
  { key: 'oggi', label: 'Start', accent: '#3b82f6' },
  { key: 'elite', label: 'Elite', accent: '#f59e0b' },
  { key: 'selettiva', label: 'Selettiva', accent: '#22c55e' },
  { key: 'bilanciata', label: 'Bilanciata', accent: '#8b5cf6' },
  { key: 'ambiziosa', label: 'Ambiziosa', accent: '#ef4444' },
];

// ============================================
// STATS BLOCK
// ============================================
function StatsBlock({ bollette, liveScores }: { bollette: Bolletta[]; liveScores: LiveScore[] }) {
  const [mercatiExpanded, setMercatiExpanded] = useState(false);

  if (!bollette.length) {
    return <div style={{ textAlign: 'center', padding: 40, color: textSecondary, fontSize: 13 }}>Nessuna bolletta disponibile</div>;
  }

  let vinte = 0, perse = 0, inCorso = 0, daGiocare = 0, totaleProfitto = 0, stakeChiuse = 0;
  const risultati: ('W' | 'L')[] = [];
  let bestQuotaVinta = 0;
  let bestVincitaEuro = 0;
  let worstPerditaEuro = 0;
  const mercatiStats: Record<string, { win: number; total: number }> = {};

  const sorted = [...bollette].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const b of sorted) {
    const esiti = b.selezioni.map((s: any) => getEsitoSel(s, liveScores));
    const hasDefLose = esiti.some(e => e === 'lose');
    const allDone = esiti.every(e => e === 'win' || e === 'lose');
    const allWin = esiti.every(e => e === 'win');
    const stake = b.stake_amount || 1;

    const isWin = b.esito_globale === 'vinta' || (allDone && allWin);
    const isLoss = b.esito_globale === 'persa' || hasDefLose;

    if (isWin) {
      vinte++;
      stakeChiuse += stake;
      const vincita = stake * ((b.quota_totale || 1) - 1);
      totaleProfitto += vincita;
      risultati.push('W');
      if ((b.quota_totale || 0) > bestQuotaVinta) bestQuotaVinta = b.quota_totale || 0;
      if (vincita > bestVincitaEuro) bestVincitaEuro = vincita;
    } else if (isLoss) {
      perse++;
      stakeChiuse += stake;
      totaleProfitto -= stake;
      risultati.push('L');
      if (stake > worstPerditaEuro) worstPerditaEuro = stake;
    } else {
      const hasLive = esiti.some(e => e === 'live');
      if (hasLive) { inCorso++; } else { daGiocare++; }
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
  const roi = stakeChiuse > 0
    ? ((totaleProfitto / stakeChiuse) * 100).toFixed(1)
    : '—';
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
  const streakColor = currentStreakType === 'W' ? '#16a34a' : currentStreakType === 'L' ? '#dc2626' : textPrimary;

  const bestWithData = mercatiSorted.find(([, d]) => d.total > 0);

  // Sezione helper
  const SectionTitle = ({ children }: { children: string }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10, marginTop: 20 }}>
      {children}
    </div>
  );

  return (
    <>
      {/* Totale bollette */}
      <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 12, color: textSecondary, fontWeight: 500 }}>
        {bollette.length} bollette totali
      </div>

      {/* === PROFITTO HERO === */}
      <div style={{
        background: isLight
          ? (totaleProfitto >= 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)')
          : (totaleProfitto >= 0 ? 'linear-gradient(135deg, #0a1a0f, #081408)' : 'linear-gradient(135deg, #1a0a0a, #140808)'),
        border: isLight
          ? (totaleProfitto >= 0 ? '1px solid #bbf7d0' : '1px solid #fecaca')
          : (totaleProfitto >= 0 ? '1px solid #14532d' : '1px solid #7f1d1d'),
        borderRadius: 14, padding: '20px 16px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>
          Profitto Totale
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: totaleProfitto >= 0 ? '#16a34a' : '#dc2626', letterSpacing: '-0.02em' }}>
          {totaleProfitto >= 0 ? '+' : ''}{totaleProfitto.toFixed(2)}€
        </div>
        <div style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>
          stake 1€ per bolletta
        </div>
      </div>

      {/* === CONTEGGI 4 CARD === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Vinte', value: vinte, color: '#16a34a', bg: isLight ? '#f0fdf4' : '#0a1a0f', borderC: isLight ? '#bbf7d0' : '#14532d',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> },
          { label: 'Perse', value: perse, color: '#dc2626', bg: isLight ? '#fef2f2' : '#1a0a0a', borderC: isLight ? '#fecaca' : '#7f1d1d',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> },
          { label: 'In corso', value: inCorso, color: '#d97706', bg: isLight ? '#fffbeb' : '#1a1408', borderC: isLight ? '#fde68a' : '#78350f',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: 'Da giocare', value: daGiocare, color: '#3b82f6', bg: isLight ? '#eff6ff' : '#0a1020', borderC: isLight ? '#bfdbfe' : '#1e3a5f',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.borderC}`,
            borderRadius: 12, padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: textSecondary, marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* === METRICHE === */}
      <div style={{
        background: sectionBg, border: sectionBorder,
        borderRadius: 14, padding: '16px', marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Win Rate', value: `${winRate}%`, color: parseFloat(winRate as string) >= 50 ? '#16a34a' : parseFloat(winRate as string) > 0 ? '#dc2626' : textPrimary, pct: parseFloat(winRate as string) || 0 },
            { label: 'ROI', value: `${roi}%`, color: parseFloat(roi as string) >= 0 ? '#16a34a' : '#dc2626', pct: Math.min(100, Math.max(0, (parseFloat(roi as string) || 0) + 50)) },
            { label: 'Quota media', value: quotaMedia, color: textPrimary, pct: Math.min(100, ((parseFloat(quotaMedia) || 0) / 10) * 100) },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ height: 3, background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 2, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 9, color: textSecondary, marginTop: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === STREAK & RECORD === */}
      {chiuse > 0 && (
        <>
          <SectionTitle>Streak & Record</SectionTitle>
          <div style={{
            background: sectionBg, border: sectionBorder,
            borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          }}>
            {/* Serie attuale - evidenziata */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: currentStreakType === 'W' ? (isLight ? '#dcfce7' : 'rgba(22,163,74,0.15)') : (isLight ? '#fee2e2' : 'rgba(220,38,38,0.15)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {currentStreakType === 'W'
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                  }
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>Serie attuale</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: streakColor }}>{streakText}</span>
            </div>

            {/* Record row */}
            <div style={{ display: 'grid', gridTemplateColumns: bestQuotaVinta > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 8, paddingTop: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{bestWinStreak}</div>
                <div style={{ fontSize: 9, color: textSecondary, marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Record vinte</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{worstLossStreak}</div>
                <div style={{ fontSize: 9, color: textSecondary, marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Record perse</div>
              </div>
              {bestQuotaVinta > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{bestQuotaVinta.toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: textSecondary, marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Top quota</div>
                </div>
              )}
            </div>

            {/* Best/Worst vincita */}
            {bestQuotaVinta > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, paddingTop: 12, borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)', marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{bestVincitaEuro.toFixed(0)}€</div>
                  <div style={{ fontSize: 9, color: textSecondary, marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Miglior vincita</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{worstPerditaEuro.toFixed(0)}€</div>
                  <div style={{ fontSize: 9, color: textSecondary, marginTop: 2, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Peggior perdita</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* === MERCATI === */}
      {mercatiSorted.length > 0 && (
        <>
          <SectionTitle>Successo per mercato</SectionTitle>
          <div style={{
            background: sectionBg, border: sectionBorder,
            borderRadius: 14, padding: '14px 16px', marginBottom: 24, cursor: 'pointer',
          }} onClick={() => setMercatiExpanded(prev => !prev)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (mercatiExpanded || bestWithData) ? 10 : 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>
                {mercatiExpanded ? 'Tutti i mercati' : 'Miglior mercato'}
              </span>
              <span style={{ fontSize: 11, color: textSecondary, transition: 'transform 0.2s', display: 'inline-block', transform: mercatiExpanded ? 'rotate(180deg)' : 'none' }}>{'\u25BC'}</span>
            </div>
            {!mercatiExpanded && bestWithData && renderMercatoRow(bestWithData)}
            {mercatiExpanded && mercatiSorted.map(entry => renderMercatoRow(entry))}
          </div>
        </>
      )}
    </>
  );
}

function renderMercatoRow([mercato, data]: [string, { win: number; total: number }]) {
  const pct = data.total > 0 ? Math.round((data.win / data.total) * 100) : 0;
  const pctColor = data.total === 0 ? textSecondary : pct >= 60 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
  return (
    <div key={mercato} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: textPrimary, width: 100, flexShrink: 0 }}>{mercato.replace('_', ' ')}</span>
      <div style={{ flex: 1, height: 6, background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: pctColor, width: 34, textAlign: 'right' }}>{data.total > 0 ? `${pct}%` : '—'}</span>
      <span style={{ fontSize: 10, color: textSecondary, width: 32 }}>{data.win}/{data.total}</span>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function BolletteStats({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('tutti');
  const [allBollette, setAllBollette] = useState<Bolletta[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);
  const liveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
    liveInterval.current = setInterval(pollLive, 30000);
    return () => { if (liveInterval.current) clearInterval(liveInterval.current); };
  }, []);

  const filtered = tab === 'tutti' ? allBollette : allBollette.filter(b => b.tipo === tab);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: pageBg,
      color: textPrimary, fontFamily: theme.font,
      overflowY: 'auto', zIndex: 110,
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/bg-stadium.webp)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        opacity: isLight ? 0.02 : 0.045,
        filter: 'saturate(3) contrast(1.6) brightness(1.3)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: headerBg,
        borderBottom: headerBorder,
        padding: isMobile ? '12px 16px' : '16px 20px',
        display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, gap: isMobile ? 10 : 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
            border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)',
            color: isLight ? '#475569' : '#64748b',
            borderRadius: 8, width: 34, height: 34,
            cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, outline: 'none',
          }}>{'\u2190'}</button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Statistiche Ticket</h1>
        </div>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogoVirgo size={22} />
            <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary, letterSpacing: '-0.01em' }}>AI Simulator</span>
            <div style={{ width: 1, height: 14, background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 10, color: textSecondary, fontStyle: 'italic' }}>Powered by AI Engine</span>
          </div>
        )}
      </div>

      <div style={{ padding: '16px', maxWidth: 700, margin: '0 auto', position: 'relative' as const, zIndex: 1 }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' as const }}>
          {TABS.map(t => {
            const count = t.key === 'tutti' ? allBollette.length : allBollette.filter(b => b.tipo === t.key).length;
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: '1 1 calc(33.33% - 4px)', minWidth: 0,
                background: isActive
                  ? (isLight ? t.accent : `${t.accent}30`)
                  : (isLight ? '#f8f9fc' : '#0d1117'),
                color: isActive ? '#fff' : textSecondary,
                border: isActive
                  ? `1px solid ${t.accent}`
                  : (isLight ? '1px solid #d0d5dd' : '1px solid rgba(255,255,255,0.08)'),
                borderRadius: 8, padding: '8px 4px',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}>
                {t.label}
                <span style={{
                  marginLeft: 4, fontSize: 10, fontWeight: 700, opacity: isActive ? 0.85 : 0.6,
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: textSecondary }}>Caricamento...</div>
        ) : (
          <StatsBlock bollette={filtered} liveScores={liveScores} />
        )}
      </div>
    </div>
  );
}
