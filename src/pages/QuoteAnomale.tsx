import { useState, useEffect, useMemo } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import QuoteAnomaleDetail from './QuoteAnomaleDetail';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

// Tipi
interface QuoteSet { '1': number; 'X': number; '2': number }
interface Semaforo { delta_pp: number; livello: string }
interface AlertBE { aggio_specifico: number; alert: boolean }
interface VIndex { valore: number }
interface Rendimento {
  ritorno_pct: number; hwr: number; dr: number; awr: number;
  aggio_1: number; aggio_x: number; aggio_2: number;
}

interface MatchDoc {
  match_key: string;
  date: string;
  league?: string;
  league_raw?: string;
  match_time: string;
  home_raw: string;
  away_raw: string;
  quote_apertura: QuoteSet;
  quote_chiusura?: QuoteSet;
  semaforo?: { '1': Semaforo; 'X': Semaforo; '2': Semaforo };
  alert_breakeven?: { aggio_tot: number; '1': AlertBE; 'X': AlertBE; '2': AlertBE };
  direzione?: { '1': string; 'X': string; '2': string };
  v_index_rel?: { '1': VIndex; 'X': VIndex; '2': VIndex };
  v_index_abs?: { '1': VIndex; 'X': VIndex; '2': VIndex };
  rendimento_apertura?: Rendimento;
  rendimento_chiusura?: Rendimento;
  n_aggiornamenti?: number;
  ts_chiusura?: string;
}

const SEMAFORO_COLORS: Record<string, string> = {
  verde: '#10b981', giallo: '#f59e0b', arancione: '#f97316', rosso: '#ef4444',
};

function formatTimeAgo(ts: string | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ora';
  if (min < 60) return `${min}min fa`;
  return `${Math.floor(min / 60)}h fa`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// --- COMPONENTE CARD PARTITA ---
function MatchCard({ m, isExpanded, onToggle, date }: {
  m: MatchDoc; isExpanded: boolean; onToggle: () => void; date: string;
}) {
  const signs = ['1', 'X', '2'] as const;
  const rend = m.rendimento_chiusura || m.rendimento_apertura;

  return (
    <div style={{
      background: theme.panel,
      border: isExpanded ? `1px solid ${theme.cyan}66` : theme.panelBorder,
      borderRadius: 8,
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Header card — cliccabile */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px',
          background: isLight ? 'rgba(0,119,204,0.04)' : 'rgba(0,240,255,0.04)',
          borderBottom: theme.cellBorder,
          fontSize: 11, color: theme.textDim,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span>{m.league || m.league_raw || '—'}</span>
        <span style={{ fontFamily: 'monospace' }}>{m.match_time}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {m.ts_chiusura ? `Agg: ${formatTimeAgo(m.ts_chiusura)}` : 'Solo apertura'}
          <span style={{
            fontSize: 10, color: theme.cyan,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}>▼</span>
        </span>
      </div>

      {/* Squadre + Ritorno — cliccabile */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 12px',
          borderBottom: theme.cellBorder,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13, color: theme.text }}>
          {m.home_raw} vs {m.away_raw}
        </span>
        {rend && (
          <span style={{
            fontSize: 11, fontFamily: 'monospace',
            color: rend.ritorno_pct >= 95 ? theme.success : rend.ritorno_pct >= 90 ? theme.warning : theme.danger,
          }}>
            Ritorno: {rend.ritorno_pct}%
          </span>
        )}
      </div>

      {/* Tabella indicatori compatta */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ background: theme.headerBg }}>
              <th style={thStyle}></th>
              {signs.map(s => <th key={s} style={thStyle}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: theme.rowOdd }}>
              <td style={labelStyle}>Apertura</td>
              {signs.map(s => <td key={s} style={cellStyle}>{m.quote_apertura[s]?.toFixed(2) ?? '—'}</td>)}
            </tr>
            {m.quote_chiusura && (
              <tr style={{ background: theme.rowEven }}>
                <td style={labelStyle}>Live</td>
                {signs.map(s => (
                  <td key={s} style={{ ...cellStyle, fontWeight: 600 }}>{m.quote_chiusura![s]?.toFixed(2) ?? '—'}</td>
                ))}
              </tr>
            )}
            {m.semaforo && (
              <tr style={{ background: theme.rowOdd }}>
                <td style={labelStyle}>Δ pp</td>
                {signs.map(s => (
                  <td key={s} style={cellStyle}>
                    <span style={{ marginRight: 4 }}>{m.semaforo![s].delta_pp.toFixed(1)}</span>
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: SEMAFORO_COLORS[m.semaforo![s].livello] || '#666',
                      verticalAlign: 'middle',
                    }} />
                  </td>
                ))}
              </tr>
            )}
            {m.direzione && (
              <tr style={{ background: theme.rowEven }}>
                <td style={labelStyle}>Direz.</td>
                {signs.map(s => {
                  const dir = m.direzione![s];
                  const arrow = dir === 'conferma' ? '↓' : dir === 'dubbio' ? '↑' : '—';
                  const color = dir === 'conferma' ? '#10b981' : dir === 'dubbio' ? '#ef4444' : theme.textDim;
                  return <td key={s} style={{ ...cellStyle, color }}>{arrow} {dir === 'conferma' ? 'conf' : dir === 'dubbio' ? 'dubb' : 'stab'}</td>;
                })}
              </tr>
            )}
            {m.alert_breakeven && (
              <tr style={{ background: theme.rowOdd }}>
                <td style={labelStyle}>B-Even</td>
                {signs.map(s => (
                  <td key={s} style={cellStyle}>
                    {m.alert_breakeven![s].alert
                      ? <span style={{ color: '#ef4444' }}>!! alert</span>
                      : <span style={{ color: theme.textDim }}>ok</span>}
                  </td>
                ))}
              </tr>
            )}
            {m.alert_breakeven && (
              <tr style={{ background: theme.rowEven }}>
                <td style={labelStyle}>Aggio%</td>
                {signs.map(s => <td key={s} style={cellStyle}>{m.alert_breakeven![s].aggio_specifico.toFixed(2)}</td>)}
              </tr>
            )}
            {rend && (
              <tr style={{ background: theme.rowOdd }}>
                <td style={labelStyle}>HWR/DR/A</td>
                <td style={cellStyle}>{rend.hwr.toFixed(1)}%</td>
                <td style={cellStyle}>{rend.dr.toFixed(1)}%</td>
                <td style={cellStyle}>{rend.awr.toFixed(1)}%</td>
              </tr>
            )}
            {m.v_index_rel && (
              <tr style={{ background: theme.rowEven }}>
                <td style={labelStyle}>V-Rel</td>
                {signs.map(s => <td key={s} style={cellStyle}>{m.v_index_rel![s].valore.toFixed(1)}</td>)}
              </tr>
            )}
            {m.v_index_abs && (
              <tr style={{ background: theme.rowOdd }}>
                <td style={labelStyle}>V-Abs</td>
                {signs.map(s => <td key={s} style={cellStyle}>{m.v_index_abs![s].valore.toFixed(1)}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETTAGLIO ESPANDIBILE CON GRAFICI */}
      {isExpanded && (
        <div style={{
          borderTop: `1px solid ${theme.cyan}33`,
          background: isLight ? 'rgba(0,119,204,0.02)' : 'rgba(0,240,255,0.02)',
        }}>
          <QuoteAnomaleDetail date={date} matchKey={m.match_key} onBack={onToggle} />
        </div>
      )}
    </div>
  );
}

// --- STILI TABELLA ---
const thStyle: React.CSSProperties = {
  padding: '6px 8px', textAlign: 'center', color: theme.cyan,
  fontWeight: 600, fontSize: 12, borderBottom: theme.cellBorder,
};
const labelStyle: React.CSSProperties = {
  padding: '4px 8px', color: theme.textDim, fontWeight: 500, fontSize: 10,
  textTransform: 'uppercase', letterSpacing: 0.5, borderRight: theme.cellBorder, whiteSpace: 'nowrap',
};
const cellStyle: React.CSSProperties = {
  padding: '4px 8px', textAlign: 'center', color: theme.text, borderRight: theme.cellBorder,
};

// --- PAGINA PRINCIPALE ---
export default function QuoteAnomale({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState(formatDate(new Date()));
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/quote-anomale/leagues?date=${date}`)
      .then(r => r.json())
      .then(d => { if (d.success) setLeagues(d.data); })
      .catch(() => {});
  }, [date]);

  useEffect(() => {
    setLoading(true);
    setError('');
    setExpandedKey(null);
    const url = `${API_BASE}/quote-anomale/matches?date=${date}${selectedLeague ? `&league=${encodeURIComponent(selectedLeague)}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) setMatches(d.data);
        else setError(d.message || 'Errore');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [date, selectedLeague]);

  const kpi = useMemo(() => {
    let alertRossi = 0, beAlert = 0, aggioSum = 0, aggioCount = 0;
    for (const m of matches) {
      if (m.semaforo) {
        for (const s of ['1', 'X', '2'] as const) {
          if (m.semaforo[s]?.livello === 'rosso') alertRossi++;
        }
      }
      if (m.alert_breakeven) {
        for (const s of ['1', 'X', '2'] as const) {
          if (m.alert_breakeven[s]?.alert) beAlert++;
        }
        if (m.alert_breakeven.aggio_tot > 0) { aggioSum += m.alert_breakeven.aggio_tot; aggioCount++; }
      }
    }
    return {
      total: matches.length, alertRossi, beAlert,
      aggioMedio: aggioCount > 0 ? (aggioSum / aggioCount).toFixed(1) : '—',
    };
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

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, padding: '0 0 40px' }}>
      {/* HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: theme.panelSolid, borderBottom: theme.panelBorder, padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.cyan, cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Quote Anomale</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: isLight ? '#f5f5f5' : 'rgba(255,255,255,0.08)', border: theme.cellBorder, borderRadius: 4, padding: '4px 8px', color: theme.text, fontSize: 12, marginLeft: 'auto' }} />
          <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}
            style={{ background: isLight ? '#f5f5f5' : 'rgba(255,255,255,0.08)', border: theme.cellBorder, borderRadius: 4, padding: '4px 8px', color: theme.text, fontSize: 12 }}>
            <option value="">Tutti i campionati</option>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* KPI BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, padding: '12px 16px' }}>
        {[
          { label: 'Partite', value: kpi.total, color: theme.cyan },
          { label: 'Alert rossi', value: kpi.alertRossi, color: '#ef4444' },
          { label: 'B-Even superati', value: kpi.beAlert, color: '#f97316' },
          { label: 'Aggio medio', value: `${kpi.aggioMedio}%`, color: theme.textDim },
        ].map((k, i) => (
          <div key={i} style={{ background: theme.cardBg, border: theme.cellBorder, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENUTO */}
      <div style={{ padding: '0 16px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: theme.textDim }}>Caricamento...</div>}
        {error && <div style={{ textAlign: 'center', padding: 20, color: theme.danger }}>{error}</div>}
        {!loading && !error && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: theme.textDim }}>Nessuna partita per questa data</div>
        )}
        {grouped.map(([league, leagueMatches]) => (
          <div key={league} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.cyan, padding: '6px 0', borderBottom: `1px solid ${theme.cyan}33`, marginBottom: 8 }}>
              {league} ({leagueMatches.length})
            </div>
            {leagueMatches.map(m => (
              <MatchCard
                key={m.match_key}
                m={m}
                date={date}
                isExpanded={expandedKey === m.match_key}
                onToggle={() => setExpandedKey(expandedKey === m.match_key ? null : m.match_key)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
