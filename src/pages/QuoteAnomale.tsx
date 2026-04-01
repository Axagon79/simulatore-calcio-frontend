import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import QuoteAnomaleDetail from './QuoteAnomaleDetail';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

// --- TIPI ---
interface QuoteSet { '1': number; 'X': number; '2': number }
interface Semaforo { delta_pp: number; livello: string }
interface AlertBE { aggio_specifico: number; alert: boolean }
interface VIndex { valore: number }
interface Rendimento {
  ritorno_pct: number; hwr: number; dr: number; awr: number;
  aggio_1: number; aggio_x: number; aggio_2: number;
}
interface MatchDoc {
  match_key: string; date: string; league?: string; league_raw?: string;
  match_time: string; home_raw: string; away_raw: string;
  quote_apertura: QuoteSet; quote_chiusura?: QuoteSet;
  semaforo?: { '1': Semaforo; 'X': Semaforo; '2': Semaforo };
  alert_breakeven?: { aggio_tot: number; '1': AlertBE; 'X': AlertBE; '2': AlertBE };
  direzione?: { '1': string; 'X': string; '2': string };
  v_index_rel?: { '1': VIndex; 'X': VIndex; '2': VIndex };
  v_index_abs?: { '1': VIndex; 'X': VIndex; '2': VIndex };
  rendimento_apertura?: Rendimento; rendimento_chiusura?: Rendimento;
  n_aggiornamenti?: number; ts_chiusura?: string;
  real_score?: string;
}

const SIGNS = ['1', 'X', '2'] as const;
const SEMAFORO_COLORS: Record<string, string> = { verde: '#10b981', giallo: '#f59e0b', arancione: '#f97316', rosso: '#ef4444' };

const CHART_TABS = [
  { key: 'quote', label: 'Quote', tip: 'Evoluzione quote 1/X/2 nel tempo' },
  { key: 'delta', label: 'Δ pp', tip: 'Delta punti percentuali (prob. implicita apertura vs live)' },
  { key: 'aggio', label: 'Aggio', tip: 'Margine del bookmaker per quota' },
  { key: 'rend', label: 'Rendim.', tip: 'Home Win / Draw / Away Win Return %' },
  { key: 'vRel', label: 'V-Rel', tip: 'V-Index Relativo: live vs apertura (<100 scesa, >100 salita)' },
  { key: 'vAbs', label: 'V-Abs', tip: 'V-Index Assoluto: live vs fair odds (>100 = possibile valore)' },
];

function formatDate(d: Date): string { return d.toISOString().slice(0, 10); }

// --- CARD MOBILE ---
function MobileCard({ m, date }: {
  m: MatchDoc; date: string;
}) {
  const rend = m.rendimento_chiusura || m.rendimento_apertura;
  const [showIndicators, setShowIndicators] = useState(false);
  const [showChart, setShowChart] = useState(false);

  return (
    <div style={{
      background: theme.panel,
      border: showChart ? `1px solid ${theme.cyan}66` : theme.panelBorder,
      borderRadius: 6, marginBottom: 6, overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setShowIndicators(!showIndicators)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px', gap: 6,
        background: isLight ? 'rgba(0,119,204,0.04)' : 'rgba(0,240,255,0.04)',
        borderBottom: theme.cellBorder, cursor: 'pointer', userSelect: 'none',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: theme.textDim }}>{m.match_time}</span>
        <span style={{ fontWeight: 600, fontSize: 11, color: theme.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.home_raw} vs {m.away_raw}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: m.real_score ? theme.text : theme.textDim, letterSpacing: 1, background: isLight ? '#f0f0f0' : 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 5px', minWidth: 38, textAlign: 'center', display: 'inline-block' }}>
          {m.real_score ? m.real_score.replace(':', ' - ') : '-'}
        </span>
        {rend && (
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: isLight ? '#fff' : rend.ritorno_pct >= 95 ? theme.success : rend.ritorno_pct >= 90 ? theme.warning : theme.danger, background: isLight ? (rend.ritorno_pct >= 95 ? '#22c55e' : rend.ritorno_pct >= 90 ? '#e0a030' : '#ef4444') : 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 5px', minWidth: 38, textAlign: 'center', display: 'inline-block' }}>
            {rend.ritorno_pct}%
          </span>
        )}
        <span style={{ fontSize: 8, color: theme.cyan, transform: showIndicators ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {/* Tabella indicatori — collassabile */}
      {showIndicators && (
        <>
          {/* Tabella unica: quote + indicatori */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ background: theme.headerBg }}>
                <th style={mThStyle}></th>
                {SIGNS.map(s => <th key={s} style={mThStyle}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* Blocco quote — sfondo trading */}
              <tr style={{ background: isLight ? '#f5f7fa' : '#0d1117' }}>
                <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.cyan}` }}>Aper.</td>
                {SIGNS.map(s => <td key={s} style={{ ...mCellStyle, color: isLight ? '#57606a' : '#8b949e' }}>{m.quote_apertura[s]?.toFixed(2) ?? '—'}<span style={{ fontSize: 8, marginLeft: 4, width: 0, display: 'inline-block', overflow: 'visible', visibility: 'hidden' }}>▼</span></td>)}
              </tr>
              {m.quote_chiusura && (
                <tr style={{ background: isLight ? '#eaecf0' : '#161b22', borderBottom: `2px solid ${theme.cyan}33` }}>
                  <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.cyan}` }}>Live</td>
                  {SIGNS.map(s => {
                    const qLive = m.quote_chiusura![s];
                    const qAp = m.quote_apertura[s];
                    const diff = qLive && qAp ? qLive - qAp : 0;
                    const arrow = diff < -0.02 ? '▼' : diff > 0.02 ? '▲' : '=';
                    const color = diff < -0.02 ? '#10b981' : diff > 0.02 ? '#ef4444' : isLight ? '#24292f' : '#c9d1d9';
                    return (
                      <td key={s} style={{ ...mCellStyle, color, fontWeight: 700 }}>
                        {qLive?.toFixed(2) ?? '—'}<span style={{ fontSize: 8, marginLeft: 4, verticalAlign: 'middle', width: 0, display: 'inline-block', overflow: 'visible' }}>{arrow}</span>
                      </td>
                    );
                  })}
                </tr>
              )}
              {/* Indicatori */}
              {m.semaforo && (
                <tr style={{ background: theme.rowOdd }}>
                  <td style={mLabelStyle}>Δ pp</td>
                  {SIGNS.map(s => (
                    <td key={s} style={mCellStyle}>
                      <span style={{ marginRight: 2 }}>{m.semaforo![s].delta_pp.toFixed(1)}</span>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: SEMAFORO_COLORS[m.semaforo![s].livello] || '#666', verticalAlign: 'middle' }} />
                    </td>
                  ))}
                </tr>
              )}
              {m.alert_breakeven && (
                <tr style={{ background: theme.rowOdd }}>
                  <td style={mLabelStyle}>BEv</td>
                  {SIGNS.map(s => (
                    <td key={s} style={mCellStyle}>
                      {m.alert_breakeven![s].alert ? <span style={{ color: '#ef4444', fontWeight: 600 }}>!!</span> : <span style={{ color: theme.textDim }}>ok</span>}
                    </td>
                  ))}
                </tr>
              )}
              {m.alert_breakeven && (
                <tr style={{ background: theme.rowEven }}>
                  <td style={mLabelStyle}>Agg%</td>
                  {SIGNS.map(s => <td key={s} style={mCellStyle}>{m.alert_breakeven![s].aggio_specifico.toFixed(2)}</td>)}
                </tr>
              )}
              {rend && (
                <tr style={{ background: theme.rowOdd }}>
                  <td style={mLabelStyle}>HWR/D/A</td>
                  <td style={mCellStyle}>{rend.hwr.toFixed(1)}%</td>
                  <td style={mCellStyle}>{rend.dr.toFixed(1)}%</td>
                  <td style={mCellStyle}>{rend.awr.toFixed(1)}%</td>
                </tr>
              )}
              {m.v_index_rel && (
                <tr style={{ background: theme.rowEven }}>
                  <td style={mLabelStyle}>V-Rel</td>
                  {SIGNS.map(s => <td key={s} style={mCellStyle}>{m.v_index_rel![s].valore.toFixed(1)}</td>)}
                </tr>
              )}
              {m.v_index_abs && (
                <tr style={{ background: theme.rowOdd }}>
                  <td style={mLabelStyle}>V-Abs</td>
                  {SIGNS.map(s => <td key={s} style={mCellStyle}>{m.v_index_abs![s].valore.toFixed(1)}</td>)}
                </tr>
              )}
            </tbody>
          </table>

          {/* Bottone grafici */}
          <div onClick={() => setShowChart(!showChart)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '6px 0', cursor: 'pointer', userSelect: 'none',
            background: theme.headerBg,
            color: showChart ? theme.cyan : theme.textDim, fontSize: 10,
          }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span>{showChart ? 'Chiudi grafici' : 'Apri grafici'}</span>
          </div>
        </>
      )}

      {/* Grafici — collassabili separatamente */}
      {showChart && (
        <div style={{ borderTop: `1px solid ${theme.cyan}33`, background: isLight ? 'rgba(0,119,204,0.02)' : 'rgba(0,240,255,0.02)' }}>
          <QuoteAnomaleDetail date={date} matchKey={m.match_key} />
        </div>
      )}
    </div>
  );
}

// --- PAGINA PRINCIPALE ---
export default function QuoteAnomale({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState(formatDate(new Date()));
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Desktop: tabellone + detail
  const [selectedMatchKey, setSelectedMatchKey] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState('quote');
  const detailRef = useRef<HTMLDivElement>(null);
  // Mobile
  // Responsive
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/quote-anomale/leagues?date=${date}`)
      .then(r => r.json())
      .then(d => { if (d.success) setLeagues(d.data); })
      .catch(() => {});
  }, [date]);

  useEffect(() => {
    setLoading(true); setError(''); setSelectedMatchKey(null);
    const url = `${API_BASE}/quote-anomale/matches?date=${date}${selectedLeague ? `&league=${encodeURIComponent(selectedLeague)}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.success) setMatches(d.data); else setError(d.message || 'Errore'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [date, selectedLeague]);

  const kpi = useMemo(() => {
    let alertRossi = 0, beAlert = 0, aggioSum = 0, aggioCount = 0;
    for (const m of matches) {
      if (m.semaforo) for (const s of SIGNS) { if (m.semaforo[s]?.livello === 'rosso') alertRossi++; }
      if (m.alert_breakeven) {
        for (const s of SIGNS) { if (m.alert_breakeven[s]?.alert) beAlert++; }
        if (m.alert_breakeven.aggio_tot > 0) { aggioSum += m.alert_breakeven.aggio_tot; aggioCount++; }
      }
    }
    return { total: matches.length, alertRossi, beAlert, aggioMedio: aggioCount > 0 ? (aggioSum / aggioCount).toFixed(1) : '—' };
  }, [matches]);

  const grouped = useMemo(() => {
    const map = new Map<string, MatchDoc[]>();
    for (const m of matches) {
      const key = m.league || m.league_raw || 'Altro';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());

  const toggleLeague = (league: string) => {
    setCollapsedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(league)) next.delete(league); else next.add(league);
      return next;
    });
  };

  const selectedMatch = matches.find(m => m.match_key === selectedMatchKey);

  const handleRowClick = (matchKey: string) => {
    if (selectedMatchKey === matchKey) { setSelectedMatchKey(null); return; }
    setSelectedMatchKey(matchKey);
    setChartTab('quote');
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font }}>
      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: theme.panelSolid, borderBottom: theme.panelBorder, padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.cyan, cursor: 'pointer', fontSize: 16, padding: 0 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Odds Monitor</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: isLight ? '#f5f5f5' : 'rgba(255,255,255,0.08)', border: theme.cellBorder, borderRadius: 4, padding: '3px 6px', color: theme.text, fontSize: 11, marginLeft: 'auto' }} />
          <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}
            style={{ background: isLight ? '#f5f5f5' : 'rgba(255,255,255,0.08)', border: theme.cellBorder, borderRadius: 4, padding: '3px 6px', color: theme.text, fontSize: 11 }}>
            <option value="">Tutti</option>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* KPI BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 6, padding: '8px 12px' }}>
        {[
          { label: 'Partite', value: kpi.total, color: theme.cyan },
          { label: 'Alert rossi', value: kpi.alertRossi, color: '#ef4444' },
          { label: 'B-Even alert', value: kpi.beAlert, color: '#f97316' },
          { label: 'Aggio medio', value: `${kpi.aggioMedio}%`, color: theme.textDim },
        ].map((k, i) => (
          <div key={i} style={{ background: theme.cardBg, border: theme.cellBorder, borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
            <div style={{ fontSize: 9, color: theme.textDim }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENUTO */}
      <div style={{ padding: '0 12px 40px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 30, color: theme.textDim, fontSize: 11 }}>Caricamento...</div>}
        {error && <div style={{ textAlign: 'center', padding: 16, color: theme.danger, fontSize: 11 }}>{error}</div>}
        {!loading && !error && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: theme.textDim, fontSize: 11 }}>Nessuna partita per questa data</div>
        )}

        {/* ===== DESKTOP: TABELLONE ===== */}
        {isDesktop && !loading && matches.length > 0 && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 45 }} />   {/* Ora */}
                  <col style={{ width: 220 }} />  {/* Partita */}
                  <col style={{ width: 50 }} />   {/* 1 */}
                  <col style={{ width: 50 }} />   {/* X */}
                  <col style={{ width: 50 }} />   {/* 2 */}
                  <col style={{ width: 55 }} />   {/* Δ1 */}
                  <col style={{ width: 55 }} />   {/* ΔX */}
                  <col style={{ width: 55 }} />   {/* Δ2 */}
                  <col style={{ width: 60 }} />   {/* BEv */}
                  <col style={{ width: 70 }} />   {/* Agg% */}
                  <col style={{ width: 70 }} />   {/* V-Rel */}
                  <col style={{ width: 70 }} />   {/* V-Abs */}
                  <col style={{ width: 80 }} />   {/* HWR/D/A */}
                  <col style={{ width: 45 }} />   {/* Rit% */}
                  <col style={{ width: 45 }} />   {/* Ris. */}
                </colgroup>
                <thead>
                  <tr style={{ background: theme.headerBg }}>
                    <th style={hStyle}>Ora</th>
                    <th style={hStyle}>Partita</th>
                    <th style={hStyle}>1</th>
                    <th style={hStyle}>X</th>
                    <th style={hStyle}>2</th>
                    <th style={hStyle}>Δ1</th>
                    <th style={hStyle}>ΔX</th>
                    <th style={hStyle}>Δ2</th>
                    <th style={hStyle}>BEv</th>
                    <th style={hStyle}>Agg%</th>
                    <th style={hStyle}>V-Rel</th>
                    <th style={hStyle}>V-Abs</th>
                    <th style={hStyle}>HWR/D/A</th>
                    <th style={hStyle}>Rit%</th>
                    <th style={hStyle}>Ris.</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([league, leagueMatches]) => {
                    const collapsed = collapsedLeagues.has(league);
                    return (
                    <React.Fragment key={`lg-${league}`}>
                      <tr onClick={() => toggleLeague(league)} style={{ cursor: 'pointer' }}>
                        <td colSpan={15} style={{
                          padding: '6px 8px', fontSize: 11, fontWeight: 600,
                          color: theme.cyan, fontFamily: theme.font,
                          background: isLight ? '#f0f4f8' : 'rgba(0,150,255,0.10)',
                          border: isLight ? '1px solid #d0d7de' : `1px solid ${theme.cyan}33`,
                          borderRadius: 4,
                          userSelect: 'none',
                        }}>
                          <span style={{ display: 'inline-block', width: 10, fontSize: 8, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', verticalAlign: 'middle', marginRight: 5 }}>▼</span>
                          {league} ({leagueMatches.length})
                        </td>
                      </tr>
                      {!collapsed && leagueMatches.map((m, idx) => {
                        const sel = selectedMatchKey === m.match_key;
                        const hov = hoveredKey === m.match_key;
                        const hasLive = !!m.quote_chiusura;
                        const rend = m.rendimento_chiusura || m.rendimento_apertura;
                        const hoverBg = isLight ? 'rgba(0,119,204,0.07)' : 'rgba(0,240,255,0.07)';
                        const bg = sel
                          ? (isLight ? 'rgba(0,119,204,0.12)' : 'rgba(0,240,255,0.12)')
                          : hov ? hoverBg
                          : idx % 2 === 0 ? theme.rowOdd : theme.rowEven;
                        const bgAlt = sel
                          ? (isLight ? 'rgba(0,119,204,0.08)' : 'rgba(0,240,255,0.08)')
                          : hov ? hoverBg
                          : idx % 2 === 0 ? theme.rowEven : theme.rowOdd;

                        return (
                          <React.Fragment key={m.match_key}>
                            {/* RIGA 1: Apertura */}
                            <tr onClick={() => handleRowClick(m.match_key)}
                              onMouseEnter={() => setHoveredKey(m.match_key)} onMouseLeave={() => setHoveredKey(null)}
                              style={{ background: bg, cursor: 'pointer', borderLeft: sel ? `3px solid ${theme.cyan}` : '3px solid transparent', transition: 'background 0.15s' }}>
                              <td rowSpan={2} style={{ ...cStyle, color: theme.textDim, verticalAlign: 'middle' }}>{m.match_time}</td>
                              <td rowSpan={2} style={{ ...cStyle, textAlign: 'left', fontFamily: theme.font, fontWeight: 500, verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.home_raw} vs {m.away_raw}
                              </td>
                              {/* Quote apertura */}
                              {SIGNS.map(s => (
                                <td key={s} style={{ ...cStyle, color: theme.textDim }}>{m.quote_apertura[s]?.toFixed(2) ?? '—'}<span style={{ fontSize: 9, marginLeft: 5, width: 0, display: 'inline-block', overflow: 'visible', visibility: 'hidden' }}>▼</span></td>
                              ))}
                              {/* Δ pp vuoto in riga apertura */}
                              <td colSpan={3} style={{ ...cStyle, fontSize: 9, color: theme.textDim, textAlign: 'center' }}>apertura</td>
                              {/* BEv, Agg%, V-Rel, V-Abs, HWR, Rit% vuoti in riga apertura */}
                              <td colSpan={6} style={{ ...cStyle, fontSize: 9, color: theme.textDim }}></td>
                              {/* Risultato — ultima colonna */}
                              <td rowSpan={2} style={{ ...cStyle, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1, verticalAlign: 'middle', color: m.real_score ? theme.cyan : theme.textDim }}>
                                {m.real_score ? m.real_score.replace(':', '-') : '—'}
                              </td>
                            </tr>
                            {/* RIGA 2: Live + tutti gli indicatori */}
                            <tr onClick={() => handleRowClick(m.match_key)}
                              onMouseEnter={() => setHoveredKey(m.match_key)} onMouseLeave={() => setHoveredKey(null)}
                              style={{ background: bgAlt, cursor: 'pointer', borderLeft: sel ? `3px solid ${theme.cyan}` : '3px solid transparent', borderBottom: `1px solid ${theme.textDim}22`, transition: 'background 0.15s' }}>
                              {/* Quote live + freccia colorata */}
                              {SIGNS.map(s => {
                                if (!hasLive) return <td key={s} style={cStyle}>—</td>;
                                const qLive = m.quote_chiusura![s];
                                const qAp = m.quote_apertura[s];
                                const diff = qLive && qAp ? qLive - qAp : 0;
                                const arrow = diff < -0.02 ? '▼' : diff > 0.02 ? '▲' : '=';
                                const color = diff < -0.02 ? '#10b981' : diff > 0.02 ? '#ef4444' : theme.textDim;
                                return (
                                  <td key={s} style={{ ...cStyle, fontWeight: 600, color }}>
                                    {qLive?.toFixed(2) ?? '—'}<span style={{ fontSize: 9, marginLeft: 5, verticalAlign: 'middle', width: 0, display: 'inline-block', overflow: 'visible' }}>{arrow}</span>
                                  </td>
                                );
                              })}
                              {/* Δ pp + semaforo */}
                              {SIGNS.map(s => (
                                <td key={`d${s}`} style={cStyle}>
                                  {m.semaforo ? (
                                    <>
                                      <span style={{ marginRight: 2 }}>{m.semaforo[s].delta_pp.toFixed(1)}</span>
                                      <span style={{
                                        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                                        background: SEMAFORO_COLORS[m.semaforo[s].livello] || '#666', verticalAlign: 'middle',
                                      }} />
                                    </>
                                  ) : '—'}
                                </td>
                              ))}
                              {/* Break-even */}
                              <td style={cStyle}>
                                {m.alert_breakeven ? SIGNS.map(s => (
                                  <span key={s} style={{ marginRight: 3, color: m.alert_breakeven![s].alert ? '#ef4444' : theme.textDim, fontWeight: m.alert_breakeven![s].alert ? 600 : 400 }}>
                                    {m.alert_breakeven![s].alert ? '!!' : 'ok'}
                                  </span>
                                )) : '—'}
                              </td>
                              {/* Aggio % */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {m.alert_breakeven ? SIGNS.map(s => (
                                  <span key={s} style={{ marginRight: 3 }}>{m.alert_breakeven![s].aggio_specifico.toFixed(1)}</span>
                                )) : '—'}
                              </td>
                              {/* V-Rel */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {m.v_index_rel ? SIGNS.map(s => (
                                  <span key={s} style={{ marginRight: 3 }}>{m.v_index_rel![s].valore.toFixed(0)}</span>
                                )) : '—'}
                              </td>
                              {/* V-Abs */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {m.v_index_abs ? SIGNS.map(s => {
                                  const v = m.v_index_abs![s].valore;
                                  const color = v > 100 ? '#10b981' : v < 100 ? '#ef4444' : theme.textDim;
                                  return <span key={s} style={{ marginRight: 3, color, fontWeight: v > 100 ? 600 : 400 }}>{v.toFixed(0)}</span>;
                                }) : '—'}
                              </td>
                              {/* HWR / DR / AWR */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {rend ? (
                                  <>
                                    <span style={{ marginRight: 3 }}>{rend.hwr.toFixed(0)}</span>
                                    <span style={{ marginRight: 3 }}>{rend.dr.toFixed(0)}</span>
                                    <span>{rend.awr.toFixed(0)}</span>
                                  </>
                                ) : '—'}
                              </td>
                              {/* Rit% */}
                              <td style={{
                                ...cStyle, fontWeight: 600,
                                color: rend ? (rend.ritorno_pct >= 95 ? theme.success : rend.ritorno_pct >= 90 ? theme.warning : theme.danger) : theme.textDim,
                              }}>
                                {rend ? `${rend.ritorno_pct}%` : '—'}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Dettaglio sotto la tabella */}
            {selectedMatch && (
              <div ref={detailRef} style={{
                marginTop: 12, background: theme.panel,
                border: `1px solid ${theme.cyan}44`, borderRadius: 8, overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px',
                  background: isLight ? 'rgba(0,119,204,0.05)' : 'rgba(0,240,255,0.05)',
                  borderBottom: theme.cellBorder,
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedMatch.home_raw} vs {selectedMatch.away_raw}</span>
                    <span style={{ fontSize: 10, color: theme.textDim, marginLeft: 10 }}>
                      {selectedMatch.league || selectedMatch.league_raw} — {selectedMatch.match_time}
                    </span>
                  </div>
                  <button onClick={() => setSelectedMatchKey(null)}
                    style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
                </div>

                <DetailSummary m={selectedMatch} />

                <div style={{ display: 'flex', gap: 3, padding: '6px 12px', borderBottom: theme.cellBorder, flexWrap: 'wrap' }}>
                  {CHART_TABS.map(t => (
                    <button key={t.key} onClick={() => setChartTab(t.key)} title={t.tip}
                      style={{
                        padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: chartTab === t.key ? theme.cyan : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'),
                        color: chartTab === t.key ? '#fff' : theme.textDim,
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <QuoteAnomaleDetail date={date} matchKey={selectedMatch.match_key} chartFilter={chartTab} />
              </div>
            )}
          </>
        )}

        {/* ===== MOBILE: CARD ESPANDIBILI ===== */}
        {!isDesktop && !loading && matches.length > 0 && (
          <>
            {grouped.map(([league, leagueMatches]) => {
              const collapsed = collapsedLeagues.has(league);
              return (
              <div key={league} style={{ marginBottom: 8 }}>
                <div onClick={() => toggleLeague(league)} style={{ fontSize: 11, fontWeight: 600, color: theme.cyan, padding: '6px 8px', marginBottom: 4, cursor: 'pointer', userSelect: 'none', background: isLight ? '#f0f4f8' : 'rgba(0,240,255,0.05)', border: isLight ? '1px solid #d0d7de' : `1px solid ${theme.cyan}22`, borderRadius: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, fontSize: 8, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', verticalAlign: 'middle', marginRight: 5 }}>▼</span>
                  {league} ({leagueMatches.length})
                </div>
                {!collapsed && leagueMatches.map(m => (
                  <MobileCard
                    key={m.match_key}
                    m={m}
                    date={date}
                  />
                ))}
              </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// --- RIEPILOGO COMPATTO (desktop detail) ---
function DetailSummary({ m }: { m: MatchDoc }) {
  const rend = m.rendimento_chiusura || m.rendimento_apertura;
  return (
    <div style={{
      padding: '5px 12px',
      display: 'flex', flexWrap: 'wrap', gap: '3px 14px',
      fontSize: 10, fontFamily: 'monospace', color: theme.textDim,
      borderBottom: theme.cellBorder,
    }}>
      <span>Ap: {SIGNS.map(s => m.quote_apertura[s]?.toFixed(2)).join(' / ')}</span>
      {m.quote_chiusura && <span>Live: {SIGNS.map(s => m.quote_chiusura![s]?.toFixed(2)).join(' / ')}</span>}
      {m.direzione && (
        <span>Dir: {SIGNS.map(s => {
          const d = m.direzione![s];
          return d === 'conferma' ? '↓cf' : d === 'dubbio' ? '↑du' : '—st';
        }).join(' ')}</span>
      )}
      {m.alert_breakeven && (
        <span>BEv: {SIGNS.map((s, i) =>
          <span key={i}>{m.alert_breakeven![s].alert ? <span style={{ color: '#ef4444' }}>!! </span> : 'ok '}</span>
        )}</span>
      )}
      {m.alert_breakeven && <span>Agg: {SIGNS.map(s => m.alert_breakeven![s].aggio_specifico.toFixed(2)).join(' / ')}</span>}
      {rend && <span>HWR:{rend.hwr.toFixed(1)}% DR:{rend.dr.toFixed(1)}% AWR:{rend.awr.toFixed(1)}%</span>}
      {m.v_index_rel && <span>V-Rel: {SIGNS.map(s => m.v_index_rel![s].valore.toFixed(1)).join(' / ')}</span>}
      {m.v_index_abs && <span>V-Abs: {SIGNS.map(s => m.v_index_abs![s].valore.toFixed(1)).join(' / ')}</span>}
    </div>
  );
}

// --- STILI DESKTOP ---
const hStyle: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'center', color: theme.cyan,
  fontWeight: 600, fontSize: 10, borderBottom: theme.cellBorder, whiteSpace: 'nowrap',
  border: '1px solid rgba(128,128,128,0.3)',
};
const cStyle: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'center', color: theme.text,
  border: '1px solid rgba(128,128,128,0.3)',
};

// --- STILI MOBILE ---
const mThStyle: React.CSSProperties = {
  padding: '3px 6px', textAlign: 'center', color: theme.cyan,
  fontWeight: 600, fontSize: 10, borderBottom: theme.cellBorder,
};
const mLabelStyle: React.CSSProperties = {
  padding: '3px 6px', color: theme.textDim, fontWeight: 500, fontSize: 9,
  textTransform: 'uppercase', letterSpacing: 0.3, borderRight: theme.cellBorder, whiteSpace: 'nowrap',
};
const mCellStyle: React.CSSProperties = {
  padding: '3px 6px', textAlign: 'center', color: theme.text, borderRight: theme.cellBorder,
};
