import { useState, useEffect, useMemo } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

const LINE_COLORS = { '1': '#3b82f6', 'X': '#f59e0b', '2': '#ef4444' };

interface Snapshot {
  ts: string;
  label: string;
  quote: { '1': number; 'X': number; '2': number };
  semaforo?: { '1': { delta_pp: number }; 'X': { delta_pp: number }; '2': { delta_pp: number } };
  alert_breakeven?: { aggio_tot: number; '1': { aggio_specifico: number }; 'X': { aggio_specifico: number }; '2': { aggio_specifico: number } };
  v_index_rel?: { '1': { valore: number }; 'X': { valore: number }; '2': { valore: number } };
  v_index_abs?: { '1': { valore: number }; 'X': { valore: number }; '2': { valore: number } };
  rendimento?: { ritorno_pct: number; hwr: number; dr: number; awr: number };
}

interface MatchDetail {
  storico?: Snapshot[];
  [key: string]: unknown;
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return ts; }
}

// --- MINI GRAFICO ---
function MiniChart({ title, data, dataKeys, colors, domain }: {
  title: string;
  data: { time: string; [k: string]: unknown }[];
  dataKeys: string[];
  colors: string[];
  domain?: [number | string, number | string];
}) {
  if (data.length < 2) return null;

  return (
    <div style={{
      background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
      border: theme.cellBorder,
      borderRadius: 4,
      padding: '8px 6px 2px',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.cyan, marginBottom: 4, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -15, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e0e0e0' : '#222'} />
          <XAxis dataKey="time" tick={{ fontSize: 8, fill: theme.textDim }} />
          <YAxis
            tick={{ fontSize: 8, fill: theme.textDim }}
            domain={domain || ['auto', 'auto']}
            tickFormatter={(v: number) => typeof v === 'number' ? v.toFixed(2) : v}
          />
          <Tooltip
            contentStyle={{
              background: theme.panelSolid, border: theme.panelBorder,
              borderRadius: 4, fontSize: 10, color: theme.text, padding: '4px 8px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 9, paddingTop: 0 }} iconSize={8} />
          {dataKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key}
              stroke={colors[i]} strokeWidth={1.5}
              dot={{ r: 2.5, fill: colors[i] }} activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- COMPONENTE DETTAGLIO (INLINE) ---
export default function QuoteAnomaleDetail({ date, matchKey, onBack }: {
  date: string; matchKey: string; onBack: () => void;
}) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/quote-anomale/detail?date=${date}&match_key=${encodeURIComponent(matchKey)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMatch(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, matchKey]);

  const chartData = useMemo(() => {
    if (!match?.storico || match.storico.length < 1) return null;
    const s = match.storico;

    return {
      quote: s.map(x => ({ time: formatTs(x.ts), '1': x.quote['1'], 'X': x.quote['X'], '2': x.quote['2'] })),
      delta: s.filter(x => x.semaforo).map(x => ({ time: formatTs(x.ts), '1': x.semaforo!['1'].delta_pp, 'X': x.semaforo!['X'].delta_pp, '2': x.semaforo!['2'].delta_pp })),
      aggio: s.filter(x => x.alert_breakeven).map(x => ({ time: formatTs(x.ts), '1': x.alert_breakeven!['1'].aggio_specifico, 'X': x.alert_breakeven!['X'].aggio_specifico, '2': x.alert_breakeven!['2'].aggio_specifico, 'Tot': x.alert_breakeven!.aggio_tot })),
      vRel: s.filter(x => x.v_index_rel).map(x => ({ time: formatTs(x.ts), '1': x.v_index_rel!['1'].valore, 'X': x.v_index_rel!['X'].valore, '2': x.v_index_rel!['2'].valore })),
      vAbs: s.filter(x => x.v_index_abs).map(x => ({ time: formatTs(x.ts), '1': x.v_index_abs!['1'].valore, 'X': x.v_index_abs!['X'].valore, '2': x.v_index_abs!['2'].valore })),
      rend: s.filter(x => x.rendimento).map(x => ({ time: formatTs(x.ts), 'Rit%': x.rendimento!.ritorno_pct, 'HWR': x.rendimento!.hwr, 'DR': x.rendimento!.dr, 'AWR': x.rendimento!.awr })),
    };
  }, [match]);

  if (loading) {
    return <div style={{ padding: '16px', textAlign: 'center', color: theme.textDim, fontSize: 11 }}>Caricamento storico...</div>;
  }

  if (!match?.storico || match.storico.length < 2) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: theme.textDim, fontSize: 11 }}>
        Grafici disponibili dopo almeno 2 rilevazioni.<br />
        Aggiornamenti: 09, 12, 15, 18, 21, 23 + pre-match (-3h, -1h).
      </div>
    );
  }

  const cd = chartData!;
  const c3 = [LINE_COLORS['1'], LINE_COLORS['X'], LINE_COLORS['2']];

  return (
    <div style={{ padding: '10px 8px' }}>
      <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 8 }}>
        {match.storico.length} rilevazioni
      </div>

      <MiniChart title="Quote 1 / X / 2" data={cd.quote} dataKeys={['1', 'X', '2']} colors={c3} />
      <MiniChart title="Delta pp (Semaforo)" data={cd.delta} dataKeys={['1', 'X', '2']} colors={c3} domain={[0, 'auto']} />
      <MiniChart title="Aggio %" data={cd.aggio} dataKeys={['1', 'X', '2', 'Tot']} colors={[...c3, theme.textDim]} />
      <MiniChart title="V-Index Relativo" data={cd.vRel} dataKeys={['1', 'X', '2']} colors={c3} />
      <MiniChart title="V-Index Assoluto" data={cd.vAbs} dataKeys={['1', 'X', '2']} colors={c3} />
      <MiniChart title="Rendimento" data={cd.rend} dataKeys={['Rit%', 'HWR', 'DR', 'AWR']} colors={[theme.cyan, ...c3]} />
    </div>
  );
}
