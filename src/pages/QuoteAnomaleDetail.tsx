import { useState, useEffect, useMemo } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceArea,
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
  quote_apertura?: { '1': number; 'X': number; '2': number };
  ts_apertura?: string;
  rendimento_apertura?: { ritorno_pct: number; hwr: number; dr: number; awr: number };
  [key: string]: unknown;
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return ts; }
}

// --- MINI GRAFICO ---
function MiniChart({ title, subtitle, data, dataKeys, colors, domain, height, refAreas }: {
  title: string;
  subtitle?: string;
  data: { time: string; [k: string]: unknown }[];
  dataKeys: string[];
  colors: string[];
  domain?: [number | string, number | string];
  height?: number;
  refAreas?: { y1: number; y2: number; color: string; opacity?: number }[];
}) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  if (data.length < 2) return null;
  const h = height || 140;

  const handleLegendClick = (e: { value: string }) => {
    setHiddenKeys(prev => {
      const onlyThisVisible = dataKeys.length > 1
        && dataKeys.every(k => k === e.value ? !prev.has(k) : prev.has(k));
      if (onlyThisVisible) return new Set();
      const next = new Set(dataKeys.filter(k => k !== e.value));
      return next;
    });
  };

  return (
    <div style={{
      background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
      border: theme.cellBorder,
      borderRadius: 4,
      padding: '8px 6px 2px',
      marginBottom: 8,
      WebkitTapHighlightColor: 'transparent',
      outline: 'none',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 4, paddingRight: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: theme.cyan, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8, color: theme.textDim, marginRight: 2 }}>Tocca per isolare →</span>
          {dataKeys.map((key, i) => {
            const active = !hiddenKeys.has(key);
            return (
              <button key={key} onClick={() => handleLegendClick({ value: key })} style={{
                background: active ? colors[i] : 'transparent',
                color: active ? '#fff' : colors[i],
                border: `1.5px solid ${colors[i]}`,
                borderRadius: 4,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: active ? 1 : 0.35,
                minWidth: 32,
                lineHeight: '16px',
                touchAction: 'manipulation',
              }}>{key}</button>
            );
          })}
        </div>
      </div>
      {subtitle && (
        <div style={{ fontSize: 9, color: theme.textDim, paddingLeft: 4, marginBottom: 4, lineHeight: '12px' }}>
          {subtitle}
        </div>
      )}
      <ResponsiveContainer width="100%" height={h}>
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
              background: isLight ? '#fff' : '#1a1a2e',
              border: 'none',
              borderRadius: 6,
              fontSize: 10,
              color: theme.text,
              padding: '6px 10px',
              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.5)',
            }}
            wrapperStyle={{ outline: 'none' }}
            cursor={false}
          />
          <Legend content={() => null} />
          {refAreas?.map((ra, i) => (
            <ReferenceArea key={i} y1={ra.y1} y2={ra.y2} fill={ra.color} fillOpacity={ra.opacity ?? 0.15} strokeOpacity={0} />
          ))}
          {dataKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key}
              stroke={colors[i]} strokeWidth={1.5}
              dot={{ r: 2.5, fill: colors[i] }} activeDot={{ r: 4 }}
              hide={hiddenKeys.has(key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- GAUGE DELTA PP ---
function getNeedleColor(absPp: number) {
  if (absPp < 2) return '#10b981';
  if (absPp < 5) return '#84cc16';
  if (absPp < 10) return '#eab308';
  return '#ef4444';
}

function getLabel(absPp: number) {
  if (absPp < 2) return 'Stabile';
  if (absPp < 5) return 'Normale';
  if (absPp < 10) return 'Importante';
  return '⚠ Anomalo';
}

function GaugeSingle({ sign, value, color, large }: { sign: string; value: number; color: string; large?: boolean }) {
  const maxPp = 14;
  const absPp = Math.abs(value);
  const clamp = Math.max(-maxPp, Math.min(maxPp, value));
  const nColor = getNeedleColor(absPp);
  const label = getLabel(absPp);
  const dirLabel = value > 0 ? `Quota ${sign} in salita` : value < 0 ? `Quota ${sign} in calo` : 'Stabile';

  const scale = large ? 1.5 : 1;
  const w = 110 * scale, h = 62 * scale;
  const cx = 55 * scale, cy = 56 * scale, r = 42 * scale, thickness = 7 * scale;
  const rInner = r - thickness;

  // Mappa valore pp → angolo: -14 = 180° (sx), 0 = 90° (centro), +14 = 0° (dx)
  const ppToAngle = (pp: number) => Math.PI * (1 - (pp + maxPp) / (2 * maxPp));

  const arcD = (startPp: number, endPp: number, rad: number) => {
    const a1 = ppToAngle(startPp);
    const a2 = ppToAngle(endPp);
    const x1 = cx + rad * Math.cos(a1), y1 = cy - rad * Math.sin(a1);
    const x2 = cx + rad * Math.cos(a2), y2 = cy - rad * Math.sin(a2);
    const sweep = a1 > a2 ? 1 : 0;
    const large = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${large} ${sweep} ${x2} ${y2}`;
  };

  const bands = [
    { from: -14, to: -10, color: '#ef4444' },
    { from: -10, to: -5, color: '#eab308' },
    { from: -5, to: -2, color: '#84cc16' },
    { from: -2, to: 2, color: '#10b981' },
    { from: 2, to: 5, color: '#84cc16' },
    { from: 5, to: 10, color: '#eab308' },
    { from: 10, to: 14, color: '#ef4444' },
  ];

  const needleAngle = ppToAngle(clamp);
  const needleLen = r - 4;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: large ? 14 : 12, fontWeight: 700, color, marginBottom: large ? 4 : 2 }}>{sign}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', margin: '0 auto' }}>
        {bands.map((b, i) => (
          <path key={i} d={arcD(b.from, b.to, r)}
            fill="none" stroke={b.color} strokeWidth={thickness} opacity={0.3} />
        ))}
        {/* Tick centrale (zero) */}
        <line x1={cx} y1={cy - rInner + 1} x2={cx} y2={cy - r - 1}
          stroke={theme.textDim} strokeWidth={scale} opacity={0.5} />
        {/* Ago */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={nColor} strokeWidth={2 * scale} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3 * scale} fill={nColor} />
        {/* Etichette */}
        <text x={cx - r - 2} y={cy + 4 * scale} fontSize={6 * scale} fill={theme.textDim} textAnchor="end">−{maxPp}</text>
        <text x={cx} y={cy + 10 * scale} fontSize={6 * scale} fill={theme.textDim} textAnchor="middle">0</text>
        <text x={cx + r + 2} y={cy + 4 * scale} fontSize={6 * scale} fill={theme.textDim} textAnchor="start">+{maxPp}</text>
      </svg>
      <div style={{ fontSize: large ? 13 : 10, fontWeight: 700, color: nColor, marginTop: -2 }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}pp — {label}
      </div>
      <div style={{ fontSize: large ? 10 : 8, fontWeight: 600, color: theme.textDim, marginTop: 1 }}>
        {dirLabel}
      </div>
    </div>
  );
}

function DeltaGauge({ data, subtitle, style }: {
  data: { sign: string; value: number; color: string }[];
  subtitle?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
      border: theme.cellBorder,
      borderRadius: 4,
      padding: '8px 6px',
      marginBottom: 8,
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.cyan, marginBottom: 4, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Delta pp (Semaforo)
      </div>
      {subtitle && (
        <div style={{ fontSize: 9, color: theme.textDim, paddingLeft: 4, marginBottom: 6, lineHeight: '12px' }}>
          {subtitle}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
        {data.map(d => <GaugeSingle key={d.sign} {...d} large={!!style} />)}
      </div>
    </div>
  );
}

// --- AGGIO vs DELTA ---
function AggioComparison({ storico, deltaSigni, subtitle }: {
  storico: Snapshot[];
  deltaSigni?: { '1': number; 'X': number; '2': number };
  subtitle?: string;
}) {
  const last = [...storico].reverse().find(s => s.semaforo && s.alert_breakeven);
  if (!last) return null;

  const signs: ('1' | 'X' | '2')[] = ['1', 'X', '2'];
  const colors = { '1': '#3b82f6', 'X': '#f59e0b', '2': '#ef4444' };

  return (
    <div style={{
      background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
      border: theme.cellBorder,
      borderRadius: 4,
      padding: '8px 6px',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.cyan, marginBottom: 4, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Aggio vs Delta PP
      </div>
      {subtitle && (
        <div style={{ fontSize: 9, color: theme.textDim, paddingLeft: 4, marginBottom: 6, lineHeight: '12px' }}>
          {subtitle}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-around' }}>
        {signs.map(s => {
          const delta = last.semaforo![s].delta_pp;
          const aggio = last.alert_breakeven![s].aggio_specifico;
          const superato = delta > aggio;
          const deltaConSegno = deltaSigni ? deltaSigni[s] : 0;
          const quotaScesa = deltaConSegno < 0;
          const quotaSalita = deltaConSegno > 0;
          const maxBar = Math.max(last.alert_breakeven!.aggio_tot, ...signs.map(x => last.semaforo![x].delta_pp)) * 1.1;
          const deltaPct = (delta / maxBar) * 100;
          const aggioPct = (aggio / maxBar) * 100;
          return (
            <div key={s} style={{
              flex: 1, textAlign: 'center',
              background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
              border: theme.cellBorder,
              borderRadius: 4,
              padding: '8px 6px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors[s], marginBottom: 8 }}>{s}</div>
              {/* Barra Delta */}
              <div style={{ fontSize: 8, color: theme.textDim, textAlign: 'left', marginBottom: 2 }}>Δpp: {delta.toFixed(1)}%</div>
              <div style={{ height: 8, background: isLight ? '#e5e7eb' : '#1f2937', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  height: '100%', width: `${deltaPct}%`, borderRadius: 4,
                  background: superato ? colors[s] : colors[s],
                  opacity: 0.8,
                }} />
              </div>
              {/* Barra Aggio */}
              <div style={{ fontSize: 8, color: theme.textDim, textAlign: 'left', marginBottom: 2 }}>Aggio: {aggio.toFixed(1)}%</div>
              <div style={{ height: 8, background: isLight ? '#e5e7eb' : '#1f2937', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  height: '100%', width: `${aggioPct}%`, borderRadius: 4,
                  backgroundImage: 'linear-gradient(to right, #10b981, #84cc16, #eab308, #ef4444)',
                  backgroundSize: `${100 / (aggioPct / 100)}% 100%`,
                  backgroundPosition: 'left',
                }} />
              </div>
              {/* Verdetto */}
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: superato ? '#eab308' : '#10b981',
                background: superato ? 'rgba(234,179,8,0.12)' : 'rgba(16,185,129,0.12)',
                borderRadius: 3,
                padding: '3px 6px',
              }}>
                {superato
                  ? (quotaScesa ? '⚡ Movimento reale · Quota in calo' : quotaSalita ? '⚡ Movimento reale · Quota in salita' : '⚡ Movimento reale')
                  : '✓ Entro il margine'}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 8, color: theme.textDim, textAlign: 'center', marginTop: 6 }}>
        Aggio totale: {last.alert_breakeven!.aggio_tot.toFixed(1)}%
      </div>
    </div>
  );
}

// --- COMPONENTE DETTAGLIO ---
export default function QuoteAnomaleDetail({ date, matchKey, chartFilter }: {
  date: string; matchKey: string; chartFilter?: string;
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
    const ap = match.quote_apertura;
    const apLabel = match.ts_apertura ? formatTs(match.ts_apertura) : 'Ap';
    const hasAp = !!ap;

    // Helper: controlla se apertura diversa dal primo snapshot
    const apDiffers = hasAp && s[0] && (
      ap['1'] !== s[0].quote['1'] || ap['X'] !== s[0].quote['X'] || ap['2'] !== s[0].quote['2']
    );

    // --- QUOTE: apertura come primo punto ---
    const quotePoints = s.map(x => ({ time: formatTs(x.ts), '1': x.quote['1'], 'X': x.quote['X'], '2': x.quote['2'] }));
    if (apDiffers) {
      quotePoints.unshift({ time: apLabel, '1': ap['1'], 'X': ap['X'], '2': ap['2'] });
    }

    // --- DELTA PP CON SEGNO: positivo se quota scesa (favore), negativo se salita (contro) ---
    const deltaPoints = s.filter(x => x.semaforo).map(x => {
      const sign = (seg: '1' | 'X' | '2') => x.quote[seg] <= (ap?.[seg] ?? x.quote[seg]) ? 1 : -1;
      return {
        time: formatTs(x.ts),
        '1': x.semaforo!['1'].delta_pp * sign('1'),
        'X': x.semaforo!['X'].delta_pp * sign('X'),
        '2': x.semaforo!['2'].delta_pp * sign('2'),
      };
    });
    if (apDiffers && deltaPoints.length > 0) {
      deltaPoints.unshift({ time: apLabel, '1': 0, 'X': 0, '2': 0 });
    }

    // --- AGGIO: calcolato dalle quote apertura ---
    const aggioPoints = s.filter(x => x.alert_breakeven).map(x => ({
      time: formatTs(x.ts),
      '1': x.alert_breakeven!['1'].aggio_specifico, 'X': x.alert_breakeven!['X'].aggio_specifico,
      '2': x.alert_breakeven!['2'].aggio_specifico, 'Tot': x.alert_breakeven!.aggio_tot,
    }));
    if (hasAp && aggioPoints.length > 0) {
      const p1 = 1 / ap['1'], pX = 1 / ap['X'], p2 = 1 / ap['2'];
      const sum = p1 + pX + p2;
      const tot = (sum - 1) * 100;
      aggioPoints.unshift({
        time: apLabel,
        '1': +(p1 / sum * tot).toFixed(2), 'X': +(pX / sum * tot).toFixed(2),
        '2': +(p2 / sum * tot).toFixed(2), 'Tot': +tot.toFixed(2),
      });
    }

    // --- V-REL: 100 all'apertura (live = apertura → rapporto = 100) ---
    const vRelPoints = s.filter(x => x.v_index_rel).map(x => ({ time: formatTs(x.ts), '1': x.v_index_rel!['1'].valore, 'X': x.v_index_rel!['X'].valore, '2': x.v_index_rel!['2'].valore }));
    if (apDiffers && vRelPoints.length > 0) {
      vRelPoints.unshift({ time: apLabel, '1': 100, 'X': 100, '2': 100 });
    }

    // --- V-ABS: ritorno% all'apertura (quota / fair_odds_apertura = 1/sum_prob) ---
    const vAbsPoints = s.filter(x => x.v_index_abs).map(x => ({ time: formatTs(x.ts), '1': x.v_index_abs!['1'].valore, 'X': x.v_index_abs!['X'].valore, '2': x.v_index_abs!['2'].valore }));
    if (hasAp && vAbsPoints.length > 0) {
      const sum = 1 / ap['1'] + 1 / ap['X'] + 1 / ap['2'];
      const rit = +(100 / sum).toFixed(1);
      vAbsPoints.unshift({ time: apLabel, '1': rit, 'X': rit, '2': rit });
    }

    // --- RENDIMENTO: usa rendimento_apertura dal documento ---
    const rendPoints = s.filter(x => x.rendimento).map(x => ({ time: formatTs(x.ts), 'Rit%': x.rendimento!.ritorno_pct, 'HWR': x.rendimento!.hwr, 'DR': x.rendimento!.dr, 'AWR': x.rendimento!.awr }));
    if (match.rendimento_apertura && rendPoints.length > 0) {
      const ra = match.rendimento_apertura;
      rendPoints.unshift({ time: apLabel, 'Rit%': ra.ritorno_pct, 'HWR': ra.hwr, 'DR': ra.dr, 'AWR': ra.awr });
    }

    return { quote: quotePoints, delta: deltaPoints, aggio: aggioPoints, vRel: vRelPoints, vAbs: vAbsPoints, rend: rendPoints };
  }, [match]);

  if (loading) {
    return <div style={{ padding: '16px', textAlign: 'center', color: theme.textDim, fontSize: 11 }}>Caricamento storico...</div>;
  }

  const hasEnoughData = chartData && chartData.quote.length >= 2;
  if (!hasEnoughData) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: theme.textDim, fontSize: 11 }}>
        Grafici disponibili dopo almeno 1 aggiornamento live.<br />
        Aggiornamenti: 09, 12, 15, 18, 21, 23 + pre-match (-3h, -1h).
      </div>
    );
  }

  const cd = chartData!;
  const c3 = [LINE_COLORS['1'], LINE_COLORS['X'], LINE_COLORS['2']];
  const bigH = chartFilter ? 280 : 140;

  const deltaAbsMax = cd.delta.length > 0
    ? Math.max(...cd.delta.flatMap(d => [Math.abs(d['1'] as number), Math.abs(d['X'] as number), Math.abs(d['2'] as number)].filter(v => typeof v === 'number')), 2.5)
    : 12;
  const deltaCeil = Math.max(12, Math.ceil(deltaAbsMax * 1.15));
  const deltaAreas = [
    // Sopra zero: a favore (quota scesa)
    { y1: 0, y2: Math.min(2, deltaCeil), color: '#10b981', opacity: 0.18 },
    { y1: 2, y2: Math.min(5, deltaCeil), color: '#facc15', opacity: 0.22 },
    { y1: 5, y2: Math.min(10, deltaCeil), color: '#f97316', opacity: 0.22 },
    ...(deltaCeil > 10 ? [{ y1: 10, y2: deltaCeil, color: '#ef4444', opacity: 0.22 }] : []),
    // Sotto zero: contro (quota salita)
    { y1: -Math.min(2, deltaCeil), y2: 0, color: '#10b981', opacity: 0.18 },
    { y1: -Math.min(5, deltaCeil), y2: -2, color: '#facc15', opacity: 0.22 },
    { y1: -Math.min(10, deltaCeil), y2: -5, color: '#f97316', opacity: 0.22 },
    ...(deltaCeil > 10 ? [{ y1: -deltaCeil, y2: -10, color: '#ef4444', opacity: 0.22 }] : []),
  ];
  const deltaDomain: [number, number] = [-deltaCeil, deltaCeil];

  // Dati per gauge Delta (ultimo valore con segno)
  const lastDelta = cd.delta.length > 0 ? cd.delta[cd.delta.length - 1] : null;
  const deltaGaugeData = lastDelta ? [
    { sign: '1', value: lastDelta['1'] as number, color: LINE_COLORS['1'] },
    { sign: 'X', value: lastDelta['X'] as number, color: LINE_COLORS['X'] },
    { sign: '2', value: lastDelta['2'] as number, color: LINE_COLORS['2'] },
  ] : [];

  const deltaSigni = lastDelta ? {
    '1': lastDelta['1'] as number,
    'X': lastDelta['X'] as number,
    '2': lastDelta['2'] as number,
  } : undefined;

  const subs = {
    quote: 'Come cambiano le quote nel tempo. Se una quota scende, il mercato si sta muovendo verso quell\'esito: può dipendere dal volume di puntate, da notizie sulle formazioni o da valutazioni interne dei bookmaker.',
    delta: 'Ago a sinistra = quota in calo. Ago a destra = quota in salita. Al centro = stabile. Più l\'ago è lontano dal centro, più il movimento è forte (🟢→🟡→🔴).',
    aggio: 'Per ogni segno, confronta il suo Δpp col suo aggio specifico (la fetta di margine del book su quell\'esito). Se il Δpp supera l\'aggio → il movimento è reale e non solo rumore.',
    vRel: 'Quanto è cambiata ogni quota rispetto all\'apertura (base 100). Es: 80 = la quota si è accorciata del 20%, 120 = si è allungata del 20%.',
    vAbs: 'Confronta la quota attuale con un riferimento calcolato dalla media tra il nostro modello statistico e la valutazione del bookmaker all\'apertura. Sopra 100 = quota di valore (il book paga più del dovuto). Sotto 100 = quota compressa (nessun valore).',
    rend: 'Quanto il book restituisce ai giocatori (Rit%). HWR = peso casa, DR = peso pareggio, AWR = peso trasferta nella distribuzione del margine.',
  };

  // Se chartFilter, mostra solo quel grafico (più grande)
  if (chartFilter) {
    const charts: Record<string, JSX.Element | null> = {
      quote: <MiniChart title="Quote 1 / X / 2" subtitle={subs.quote} data={cd.quote} dataKeys={['1', 'X', '2']} colors={c3} height={bigH} />,
      delta: deltaGaugeData.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: '0 0 45%', display: 'flex' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <DeltaGauge data={deltaGaugeData} subtitle={subs.delta} style={{ flex: 1 }} />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <MiniChart title="Andamento Δpp" data={cd.delta} dataKeys={['1', 'X', '2']} colors={c3} domain={deltaDomain} refAreas={deltaAreas} height={bigH} />
            </div>
          </div>
        </div>
      ) : null,
      aggio: <AggioComparison storico={match.storico!} deltaSigni={deltaSigni} subtitle={subs.aggio} />,
      vRel: <MiniChart title="V-Index Relativo" subtitle={subs.vRel} data={cd.vRel} dataKeys={['1', 'X', '2']} colors={c3} height={bigH} />,
      vAbs: <MiniChart title="V-Index Assoluto" subtitle={subs.vAbs} data={cd.vAbs} dataKeys={['1', 'X', '2']} colors={c3} height={bigH} />,
      rend: <MiniChart title="Rendimento" subtitle={subs.rend} data={cd.rend} dataKeys={['Rit%', 'HWR', 'DR', 'AWR']} colors={[theme.cyan, ...c3]} height={bigH} />,
    };
    return (
      <div style={{ padding: '6px 4px' }}>
        <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 6 }}>
          {match.storico.length} rilevazioni
        </div>
        {charts[chartFilter] || <div style={{ color: theme.textDim, fontSize: 11 }}>Grafico non disponibile</div>}
      </div>
    );
  }

  // Tutti i grafici (mobile expand)
  return (
    <div style={{ padding: '10px 8px' }}>
      <div style={{ fontSize: 10, color: theme.textDim, marginBottom: 8 }}>
        {match.storico.length} rilevazioni
      </div>
      <MiniChart title="Quote 1 / X / 2" subtitle={subs.quote} data={cd.quote} dataKeys={['1', 'X', '2']} colors={c3} />
      {deltaGaugeData.length > 0 && <DeltaGauge data={deltaGaugeData} subtitle={subs.delta} />}
      <AggioComparison storico={match.storico!} deltaSigni={deltaSigni} subtitle={subs.aggio} />
      <MiniChart title="V-Index Relativo" subtitle={subs.vRel} data={cd.vRel} dataKeys={['1', 'X', '2']} colors={c3} />
      <MiniChart title="V-Index Assoluto" subtitle={subs.vAbs} data={cd.vAbs} dataKeys={['1', 'X', '2']} colors={c3} />
      <MiniChart title="Rendimento" subtitle={subs.rend} data={cd.rend} dataKeys={['Rit%', 'HWR', 'DR', 'AWR']} colors={[theme.cyan, ...c3]} />
    </div>
  );
}
