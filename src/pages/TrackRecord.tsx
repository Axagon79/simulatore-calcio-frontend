import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HitRateData {
  total: number;
  hits: number;
  misses: number;
  hit_rate: number | null;
}

interface SectionData extends HitRateData {
  roi: number | null;
  profit: number;
  avg_quota: number | null;
}

interface QuotaBandData extends HitRateData {
  roi: number | null;
  profit: number;
  avg_quota: number | null;
}

interface QuotaStats {
  total_con_quota: number;
  total_senza_quota: number;
  avg_quota_tutti: number | null;
  avg_quota_azzeccati: number | null;
  avg_quota_sbagliati: number | null;
  roi_globale: number | null;
  profit_globale: number;
}

interface TrackRecordResponse {
  success: boolean;
  periodo: { from: string; to: string };
  globale: HitRateData;
  split_sezione: {
    pronostici: SectionData;
    alto_rendimento: SectionData;
  };
  breakdown_mercato: Record<string, HitRateData>;
  breakdown_campionato: Record<string, HitRateData>;
  breakdown_confidence: Record<string, HitRateData>;
  breakdown_stelle: Record<string, HitRateData>;
  breakdown_quota: Record<string, QuotaBandData>;
  quota_stats: QuotaStats;
  cross_quota_mercato: Record<string, Record<string, HitRateData>>;
  cross_mercato_campionato: Record<string, Record<string, HitRateData>>;
  serie_temporale: Array<{ date: string; profit: number } & HitRateData>;
}

interface TrackRecordProps {
  onBack: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MARKET_LABELS: Record<string, string> = {
  'SEGNO': '1X2',
  'DOPPIA_CHANCE': 'Doppia Chance',
  'OVER_UNDER': 'Over/Under',
  'GG_NG': 'GG/NG',
};

const C = {
  bg: '#060a14',
  cardBg: 'rgba(15, 23, 42, 0.55)',
  cardBorder: 'rgba(148, 163, 184, 0.07)',
  cyan: '#06b6d4',
  cyanDim: 'rgba(6, 182, 212, 0.12)',
  cyanBorder: 'rgba(6, 182, 212, 0.25)',
  amber: '#f59e0b',
  amberDim: 'rgba(245, 158, 11, 0.10)',
  amberBorder: 'rgba(245, 158, 11, 0.25)',
  green: '#10b981',
  red: '#ef4444',
  text: '#f1f5f9',
  textSec: '#94a3b8',
  textMuted: '#475569',
  divider: 'rgba(148, 163, 184, 0.06)',
  barBg: 'rgba(148, 163, 184, 0.06)',
} as const;

const QUOTA_BANDS = [
  { label: '1.01-1.20', min: '1.01', max: '1.20' },
  { label: '1.21-1.40', min: '1.21', max: '1.40' },
  { label: '1.41-1.60', min: '1.41', max: '1.60' },
  { label: '1.61-1.80', min: '1.61', max: '1.80' },
  { label: '1.81-2.00', min: '1.81', max: '2.00' },
  { label: '2.01-2.20', min: '2.01', max: '2.20' },
  { label: '2.21-2.50', min: '2.21', max: '2.50' },
  { label: '2.51-3.00', min: '2.51', max: '3.00' },
  { label: '3.01-3.50', min: '3.01', max: '3.50' },
  { label: '3.51-4.00', min: '3.51', max: '4.00' },
  { label: '4.01-5.00', min: '4.01', max: '5.00' },
  { label: '5.00+', min: '5.01', max: '' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rateColor(rate: number) {
  if (rate >= 65) return C.green;
  if (rate >= 50) return C.amber;
  return C.red;
}

function profitColor(val: number) {
  return val >= 0 ? C.green : C.red;
}

function formatProfit(val: number) {
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}u`;
}

function formatRoi(val: number | null) {
  if (val == null) return '—';
  return `${val > 0 ? '+' : ''}${val}%`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ rate, height = 6, showLabel = false }: { rate: number; height?: number; showLabel?: boolean }) {
  const color = rateColor(rate);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div style={{
        flex: 1, height, background: C.barBg, borderRadius: height / 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${rate}%`, height: '100%', borderRadius: height / 2,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ color, fontWeight: 600, fontSize: '0.85em', minWidth: '42px', textAlign: 'right' }}>
          {rate}%
        </span>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 8px' }}>
      <div style={{ fontSize: '1.5em', fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72em', color: C.textMuted, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: '0.7em', color: C.textMuted, marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ─── Insights Generator ──────────────────────────────────────────────────────

interface Insight {
  title: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
}

function generateInsights(data: TrackRecordResponse): Record<string, Insight[]> {
  const result: Record<string, Insight[]> = { panoramica: [], puntiForza: [], miglioramento: [], consigli: [] };
  const ml = MARKET_LABELS;

  // Panoramica
  const hr = data.globale.hit_rate ?? 0;
  result.panoramica.push({
    title: `Hit rate globale: ${hr}%`,
    text: `Su ${data.globale.total} pronostici, ${data.globale.hits} azzeccati e ${data.globale.misses} sbagliati.`,
    type: hr >= 65 ? 'positive' : hr >= 55 ? 'neutral' : 'negative',
  });

  if (data.serie_temporale.length >= 3) {
    const last3 = data.serie_temporale.slice(-3);
    const avgRecent = last3.reduce((s, d) => s + (d.hit_rate ?? 0), 0) / last3.length;
    const diff = Math.round((avgRecent - hr) * 10) / 10;
    if (Math.abs(diff) >= 2) {
      result.panoramica.push({
        title: diff > 0 ? 'Trend in crescita' : 'Trend in calo',
        text: `Media ultimi 3 giorni: ${Math.round(avgRecent)}% (${diff > 0 ? '+' : ''}${diff} vs media periodo).`,
        type: diff > 0 ? 'positive' : 'warning',
      });
    }
  }

  if (data.globale.total < 50) {
    result.panoramica.push({
      title: 'Campione ridotto',
      text: `Solo ${data.globale.total} pronostici nel periodo. I risultati potrebbero non essere statisticamente affidabili.`,
      type: 'warning',
    });
  }

  // Helpers
  type Entry = [string, HitRateData];
  const findBest = (obj: Record<string, HitRateData>, min = 10): Entry | null => {
    const e = Object.entries(obj).filter(([, s]) => s.total >= min && s.hit_rate != null);
    return e.length ? e.reduce((a, b) => ((a[1].hit_rate ?? 0) >= (b[1].hit_rate ?? 0) ? a : b)) : null;
  };
  const findWorst = (obj: Record<string, HitRateData>, min = 10): Entry | null => {
    const e = Object.entries(obj).filter(([, s]) => s.total >= min && s.hit_rate != null);
    return e.length ? e.reduce((a, b) => ((a[1].hit_rate ?? 0) <= (b[1].hit_rate ?? 0) ? a : b)) : null;
  };

  const bestMarket = findBest(data.breakdown_mercato);
  if (bestMarket) {
    result.puntiForza.push({
      title: `Miglior mercato: ${ml[bestMarket[0]] || bestMarket[0]}`,
      text: `${bestMarket[1].hit_rate}% su ${bestMarket[1].total} pronostici.`,
      type: 'positive',
    });
  }

  const bestLeague = findBest(data.breakdown_campionato);
  if (bestLeague) {
    result.puntiForza.push({
      title: `Miglior campionato: ${bestLeague[0]}`,
      text: `${bestLeague[1].hit_rate}% su ${bestLeague[1].total} pronostici.`,
      type: 'positive',
    });
  }

  if (data.breakdown_quota) {
    const qe = Object.entries(data.breakdown_quota)
      .filter(([b, s]) => b !== 'N/D' && s.total >= 5 && s.roi != null) as [string, QuotaBandData][];
    if (qe.length) {
      const best = qe.reduce((a, b) => ((a[1].roi ?? -999) >= (b[1].roi ?? -999) ? a : b));
      if ((best[1].roi ?? 0) > 0) {
        result.puntiForza.push({
          title: `Fascia pi\u00F9 redditizia: ${best[0]}`,
          text: `ROI ${formatRoi(best[1].roi)} | Profitto ${formatProfit(best[1].profit)} | HR ${best[1].hit_rate}% su ${best[1].total}`,
          type: 'positive',
        });
      }
    }
  }

  const worstMarket = findWorst(data.breakdown_mercato);
  if (worstMarket && (worstMarket[1].hit_rate ?? 100) < 60) {
    result.miglioramento.push({
      title: `Mercato debole: ${ml[worstMarket[0]] || worstMarket[0]}`,
      text: `${worstMarket[1].hit_rate}% su ${worstMarket[1].total} pronostici.`,
      type: 'warning',
    });
  }

  const worstLeague = findWorst(data.breakdown_campionato);
  if (worstLeague && (worstLeague[1].hit_rate ?? 100) < 55) {
    result.miglioramento.push({
      title: `Campionato critico: ${worstLeague[0]}`,
      text: `${worstLeague[1].hit_rate}% su ${worstLeague[1].total} pronostici.`,
      type: 'negative',
    });
  }

  const critical = Object.entries(data.breakdown_campionato).filter(([, s]) => s.total >= 10 && (s.hit_rate ?? 100) < 50);
  if (critical.length) {
    result.miglioramento.push({
      title: `${critical.length} campionat${critical.length > 1 ? 'i' : 'o'} sotto il 50%`,
      text: critical.map(([n, s]) => `${n} (${s.hit_rate}%)`).join(', '),
      type: 'negative',
    });
  }

  if (bestMarket && worstMarket && bestMarket[0] !== worstMarket[0]) {
    const gap = (bestMarket[1].hit_rate ?? 0) - (worstMarket[1].hit_rate ?? 0);
    if (gap >= 10) {
      result.consigli.push({
        title: 'Concentrati sul mercato migliore',
        text: `${ml[bestMarket[0]] || bestMarket[0]} ha ${gap}pp in pi\u00F9 rispetto a ${ml[worstMarket[0]] || worstMarket[0]}.`,
        type: 'neutral',
      });
    }
  }

  if (data.quota_stats?.total_con_quota > 0) {
    const roi = data.quota_stats.roi_globale ?? 0;
    if (roi > 0) {
      result.consigli.push({
        title: 'ROI positivo',
        text: `ROI +${data.quota_stats.roi_globale}% con profitto ${formatProfit(data.quota_stats.profit_globale)}. Il sistema genera valore.`,
        type: 'positive',
      });
    } else if (roi < -5) {
      result.consigli.push({
        title: 'ROI negativo',
        text: `ROI ${data.quota_stats.roi_globale}% con perdita di ${data.quota_stats.profit_globale}\u20AC. Rivedi le fasce di quota.`,
        type: 'negative',
      });
    }
  }

  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TrackRecord({ onBack }: TrackRecordProps) {
  const [data, setData] = useState<TrackRecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d' | 'tutto'>('30d');
  const [filtroLeague, setFiltroLeague] = useState('');
  const [filtroMarket, setFiltroMarket] = useState('');
  const [availableLeagues, setAvailableLeagues] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'dati' | 'analisi'>('dati');
  const [filtroSezione, setFiltroSezione] = useState<'pronostici' | 'alto_rendimento'>('pronostici');
  const [quotaMin, setQuotaMin] = useState('');
  const [quotaMax, setQuotaMax] = useState('');
  const [selectedBand, setSelectedBand] = useState('');
  const [unfilteredQuotaCounts, setUnfilteredQuotaCounts] = useState<Record<string, number>>({});
  const [debouncedQuotaMin, setDebouncedQuotaMin] = useState('');
  const [debouncedQuotaMax, setDebouncedQuotaMax] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = window.innerWidth < 768;

  const getDateRange = useCallback(() => {
    const to = new Date().toISOString().split('T')[0];
    const now = new Date();
    if (periodo === '7d') now.setDate(now.getDate() - 7);
    else if (periodo === '30d') now.setDate(now.getDate() - 30);
    else if (periodo === '90d') now.setDate(now.getDate() - 90);
    return { from: periodo === 'tutto' ? '2024-01-01' : now.toISOString().split('T')[0], to };
  }, [periodo]);

  // Debounce quota inputs
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuotaMin(quotaMin);
      setDebouncedQuotaMax(quotaMax);
    }, 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [quotaMin, quotaMax]);

  useEffect(() => {
    setSelectedBand('');
    setQuotaMin('');
    setQuotaMax('');
  }, [filtroMarket, filtroLeague, periodo]);

  const activeBand = QUOTA_BANDS.find(b => b.label === selectedBand);
  const effectiveMin = activeBand ? activeBand.min : debouncedQuotaMin;
  const effectiveMax = activeBand ? activeBand.max : debouncedQuotaMax;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getDateRange();
        let url = `${API_BASE}/simulation/track-record?from=${from}&to=${to}`;
        if (filtroLeague) url += `&league=${encodeURIComponent(filtroLeague)}`;
        if (filtroMarket) url += `&market=${encodeURIComponent(filtroMarket)}`;
        if (effectiveMin) url += `&min_quota=${effectiveMin}`;
        if (effectiveMax) url += `&max_quota=${effectiveMax}`;
        url += `&sezione=${filtroSezione}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error('Risposta non valida');
        setData(json);

        if (!filtroLeague && json.breakdown_campionato) {
          setAvailableLeagues(Object.keys(json.breakdown_campionato).sort());
        }
        if (!filtroMarket && json.breakdown_mercato) {
          setAvailableMarkets(Object.keys(json.breakdown_mercato));
        }
        if (!effectiveMin && !effectiveMax && json.breakdown_quota) {
          const counts: Record<string, number> = {};
          for (const [band, stats] of Object.entries(json.breakdown_quota)) {
            counts[band] = (stats as QuotaBandData).total;
          }
          setUnfilteredQuotaCounts(counts);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [periodo, filtroLeague, filtroMarket, filtroSezione, selectedBand, effectiveMin, effectiveMax, getDateRange]);

  const insights = useMemo(() => data ? generateInsights(data) : null, [data]);

  // ─── Styles ──────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: C.cardBg,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${C.cardBorder}`,
    borderRadius: '14px',
    padding: isMobile ? '16px' : '22px',
    marginBottom: '16px',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: '0.78em',
    fontWeight: 600,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '14px',
  };

  // ─── Sezione attiva ────────────────────────────────────────────────────

  const isPronostici = filtroSezione === 'pronostici';
  const accent = isPronostici ? C.cyan : C.amber;

  const proData = data?.split_sezione?.pronostici;
  const arData = data?.split_sezione?.alto_rendimento;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${C.bg} 0%, #0c1425 40%, #0a0f1f 100%)`,
      color: C.text,
      padding: isMobile ? '16px' : '28px 32px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: C.textSec, cursor: 'pointer',
          fontSize: '1.4em', padding: '4px 8px', borderRadius: '8px',
          transition: 'color 0.2s',
        }}
          onMouseOver={e => (e.currentTarget.style.color = C.text)}
          onMouseOut={e => (e.currentTarget.style.color = C.textSec)}
        >
          {'\u2190'}
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.4em' : '1.7em', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Track Record
          </h1>
          <div style={{ fontSize: '0.75em', color: C.textMuted, marginTop: '2px' }}>
            Analisi performance sistema MoE
          </div>
        </div>
      </div>

      {/* ─── Nota trasparenza ────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02))',
        border: `1px solid rgba(245, 158, 11, 0.15)`,
        borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
        lineHeight: 1.6, fontSize: '0.82em',
      }}>
        <div style={{ fontWeight: 600, color: C.amber, marginBottom: '6px', fontSize: '0.95em' }}>
          Progetto in fase di sviluppo
        </div>
        <div style={{ color: C.textSec }}>
          Questo progetto <strong style={{ color: C.text }}>non {'\u00E8'} ancora un prodotto finito</strong> {'\u2014'} {'\u00E8'} un sistema in costruzione.
          Gli algoritmi, i modelli e le strategie sono in fase di calibrazione attiva e vengono aggiornati costantemente.
          I numeri che vedi qui sono <strong style={{ color: C.text }}>reali e completi</strong>: crediamo nella totale trasparenza,
          anche quando i risultati non riflettono ancora il potenziale del sistema a regime.
          Ogni giorno il motore impara, si adatta e migliora {'\u2014'} i risultati di oggi non rappresentano quelli di domani.
        </div>
      </div>

      {/* ─── Intro sezioni ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px', fontSize: '0.84em', color: C.textSec, lineHeight: 1.6 }}>
        Il nostro sistema genera ogni giorno due categorie di pronostici, consultabili in
        {' '}<strong style={{ color: C.text }}>due sezioni separate</strong> del sito.
        Seleziona una sezione per visualizzare le statistiche corrispondenti.
      </div>

      {/* ─── Hero Cards: Pronostici / Alto Rendimento ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {/* Card Pronostici */}
        <button
          onClick={() => setFiltroSezione('pronostici')}
          style={{
            background: isPronostici
              ? `linear-gradient(135deg, ${C.cyanDim}, rgba(6, 182, 212, 0.04))`
              : C.cardBg,
            border: isPronostici ? `1.5px solid ${C.cyanBorder}` : `1px solid ${C.cardBorder}`,
            borderRadius: '14px',
            padding: isMobile ? '16px 12px' : '20px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            transform: isPronostici ? 'scale(1.01)' : 'scale(1)',
            opacity: isPronostici ? 1 : 0.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: isMobile ? '0.85em' : '0.95em', fontWeight: 700, color: isPronostici ? C.cyan : C.textSec }}>
              Pronostici
            </div>
            {isPronostici && <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: C.cyan,
              boxShadow: `0 0 8px ${C.cyan}`,
            }} />}
          </div>
          <div style={{ fontSize: '0.68em', color: C.textMuted, lineHeight: 1.4, marginBottom: '10px' }}>
            Quote {'\u2264'} 2.50, rischio pi{'\u00F9'} contenuto
          </div>
          {proData && proData.total > 0 ? (
            <>
              <div style={{ fontSize: isMobile ? '2em' : '2.4em', fontWeight: 800, color: isPronostici ? rateColor(proData.hit_rate ?? 0) : C.textMuted, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {proData.hit_rate ?? '—'}<span style={{ fontSize: '0.5em', opacity: 0.7 }}>%</span>
              </div>
              <div style={{ fontSize: '0.72em', color: C.textMuted, marginTop: '4px' }}>
                {proData.hits}/{proData.total} centrati
              </div>
              {proData.roi != null && (
                <div style={{ fontSize: '0.72em', color: isPronostici ? profitColor(proData.profit) : C.textMuted, marginTop: '2px' }}>
                  ROI {formatRoi(proData.roi)} &middot; {formatProfit(proData.profit)}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '1.4em', color: C.textMuted }}>—</div>
          )}
        </button>

        {/* Card Alto Rendimento */}
        <button
          onClick={() => setFiltroSezione('alto_rendimento')}
          style={{
            background: !isPronostici
              ? `linear-gradient(135deg, ${C.amberDim}, rgba(245, 158, 11, 0.03))`
              : C.cardBg,
            border: !isPronostici ? `1.5px solid ${C.amberBorder}` : `1px solid ${C.cardBorder}`,
            borderRadius: '14px',
            padding: isMobile ? '16px 12px' : '20px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            transform: !isPronostici ? 'scale(1.01)' : 'scale(1)',
            opacity: !isPronostici ? 1 : 0.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: isMobile ? '0.85em' : '0.95em', fontWeight: 700, color: !isPronostici ? C.amber : C.textSec }}>
              Alto Rendimento
            </div>
            {!isPronostici && <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: C.amber,
              boxShadow: `0 0 8px ${C.amber}`,
            }} />}
          </div>
          <div style={{ fontSize: '0.68em', color: C.textMuted, lineHeight: 1.4, marginBottom: '10px' }}>
            Quote &gt; 2.50, rischio maggiore ma profitto pi{'\u00F9'} alto
          </div>
          {arData && arData.total > 0 ? (
            <>
              {/* Hero: Yield (non HR%) */}
              <div style={{ fontSize: isMobile ? '2em' : '2.4em', fontWeight: 800, color: !isPronostici ? profitColor(arData.roi ?? 0) : C.textMuted, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {arData.roi != null ? (
                  <>{arData.roi > 0 ? '+' : ''}{arData.roi}<span style={{ fontSize: '0.5em', opacity: 0.7 }}>%</span></>
                ) : '—'}
              </div>
              <div style={{ fontSize: '0.72em', color: C.textMuted, marginTop: '4px' }}>
                Yield &middot; {formatProfit(arData.profit)}
              </div>
              <div style={{ fontSize: '0.72em', color: !isPronostici ? (C.textSec) : C.textMuted, marginTop: '2px' }}>
                HR {arData.hit_rate ?? '—'}% &middot; {arData.hits}/{arData.total}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '1.4em', color: C.textMuted }}>—</div>
          )}
        </button>
      </div>

      {/* ─── Tab Dati / Analisi ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: C.barBg, borderRadius: '10px', padding: '3px' }}>
        {([
          { id: 'dati' as const, label: 'Statistiche' },
          { id: 'analisi' as const, label: 'Insights' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              flex: 1,
              background: activeView === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              color: activeView === tab.id ? C.text : C.textMuted,
              borderRadius: '8px',
              padding: '9px 16px',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: activeView === tab.id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Filtri ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
        marginBottom: '16px', padding: '12px 14px',
        background: C.cardBg, borderRadius: '12px', border: `1px solid ${C.cardBorder}`,
      }}>
        {/* Periodo */}
        <div style={{ display: 'flex', gap: '3px', background: C.barBg, borderRadius: '8px', padding: '2px' }}>
          {(['7d', '30d', '90d', 'tutto'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                background: periodo === p ? `${accent}22` : 'transparent',
                border: 'none',
                color: periodo === p ? accent : C.textMuted,
                borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                fontSize: '0.8em', fontWeight: periodo === p ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {p === 'tutto' ? 'Tutto' : p}
            </button>
          ))}
        </div>

        {/* Separatore */}
        <div style={{ width: '1px', height: '24px', background: C.divider }} />

        {/* Campionato */}
        <select
          value={filtroLeague}
          onChange={e => setFiltroLeague(e.target.value)}
          style={{
            background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${C.cardBorder}`,
            color: filtroLeague ? C.text : C.textMuted,
            borderRadius: '8px', padding: '6px 10px', fontSize: '0.8em',
          }}
        >
          <option value="" style={{ background: '#0f172a', color: C.textSec }}>Campionato</option>
          {availableLeagues.map(lg => (
            <option key={lg} value={lg} style={{ background: '#0f172a', color: C.text }}>{lg}</option>
          ))}
        </select>

        {/* Mercato */}
        <select
          value={filtroMarket}
          onChange={e => setFiltroMarket(e.target.value)}
          style={{
            background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${C.cardBorder}`,
            color: filtroMarket ? C.text : C.textMuted,
            borderRadius: '8px', padding: '6px 10px', fontSize: '0.8em',
          }}
        >
          <option value="" style={{ background: '#0f172a', color: C.textSec }}>Mercato</option>
          {availableMarkets.map(mk => (
            <option key={mk} value={mk} style={{ background: '#0f172a', color: C.text }}>{MARKET_LABELS[mk] || mk}</option>
          ))}
        </select>
      </div>

      {/* ─── Quota Band Filter (solo tab Dati) ───────────────────────────── */}
      {activeView === 'dati' && (
        <div style={{
          ...card, padding: isMobile ? '12px' : '14px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75em', color: C.textMuted, marginRight: '4px' }}>Quota:</span>
            {QUOTA_BANDS.map(band => {
              const isActive = selectedBand === band.label;
              const count = unfilteredQuotaCounts[band.label] ?? 0;
              const isEmpty = count === 0;
              return (
                <button
                  key={band.label}
                  disabled={isEmpty}
                  onClick={() => !isEmpty && setSelectedBand(isActive ? '' : band.label)}
                  style={{
                    background: isEmpty ? 'transparent' : isActive ? `${accent}25` : 'rgba(255,255,255,0.03)',
                    border: isActive ? `1px solid ${accent}50` : `1px solid ${isEmpty ? 'transparent' : C.cardBorder}`,
                    color: isEmpty ? '#333' : isActive ? accent : C.textSec,
                    borderRadius: '6px', padding: '3px 7px', cursor: isEmpty ? 'default' : 'pointer',
                    fontSize: '0.72em', fontFamily: 'monospace', opacity: isEmpty ? 0.3 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {band.label}
                  {!isEmpty && <span style={{ marginLeft: '3px', opacity: 0.5 }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72em', color: C.textMuted }}>Range:</span>
            <input
              type="number" placeholder="Min" value={quotaMin}
              onChange={e => { setQuotaMin(e.target.value); setSelectedBand(''); }}
              step="0.01" min="1.00"
              style={{
                width: '65px', background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${C.cardBorder}`,
                color: C.text, borderRadius: '6px', padding: '5px 8px', fontSize: '0.8em',
              }}
            />
            <span style={{ color: C.textMuted, fontSize: '0.8em' }}>{'\u2014'}</span>
            <input
              type="number" placeholder="Max" value={quotaMax}
              onChange={e => { setQuotaMax(e.target.value); setSelectedBand(''); }}
              step="0.01" min="1.00"
              style={{
                width: '65px', background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${C.cardBorder}`,
                color: C.text, borderRadius: '6px', padding: '5px 8px', fontSize: '0.8em',
              }}
            />
            {(quotaMin || quotaMax || selectedBand) && (
              <button
                onClick={() => { setQuotaMin(''); setQuotaMax(''); setSelectedBand(''); }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)', border: `1px solid rgba(239,68,68,0.3)`,
                  color: C.red, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75em',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Loading / Error ─────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
          <div style={{
            width: '32px', height: '32px', border: `2px solid ${C.cardBorder}`, borderTop: `2px solid ${accent}`,
            borderRadius: '50%', margin: '0 auto 12px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Caricamento...
        </div>
      )}

      {error && (
        <div style={{ ...card, borderColor: 'rgba(239,68,68,0.3)', color: C.red, textAlign: 'center' }}>
          Errore: {error}
        </div>
      )}

      {/* ═══════════════ TAB DATI ═══════════════════════════════════════════ */}
      {activeView === 'dati' && data && !loading && (
        <>
          {/* ─── KPI Strip ───────────────────────────────────────────────── */}
          <div style={{
            ...card,
            background: `linear-gradient(135deg, ${isPronostici ? C.cyanDim : C.amberDim}, ${C.cardBg})`,
            padding: 0, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
              gap: 0,
            }}>
              <KpiCard label="Totale" value={String(data.globale.total)} color={C.text} />
              <KpiCard label="Centrati" value={String(data.globale.hits)} color={C.green} />
              <KpiCard
                label="Hit Rate"
                value={`${data.globale.hit_rate ?? '—'}%`}
                color={rateColor(data.globale.hit_rate ?? 0)}
              />
              {data.quota_stats && (
                <>
                  <KpiCard
                    label="ROI"
                    value={formatRoi(data.quota_stats.roi_globale)}
                    color={profitColor(data.quota_stats.roi_globale ?? 0)}
                  />
                  <KpiCard
                    label="Profitto"
                    value={formatProfit(data.quota_stats.profit_globale)}
                    color={profitColor(data.quota_stats.profit_globale)}
                    sub={`Q.med ${data.quota_stats.avg_quota_tutti ?? '—'}`}
                  />
                </>
              )}
            </div>
          </div>

          {/* ─── Per Mercato ──────────────────────────────────────────────── */}
          <div style={card}>
            <div style={sectionTitle}>Per Mercato</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(data.breakdown_mercato).map(([tipo, stats]) => (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ minWidth: isMobile ? '85px' : '130px', fontSize: '0.85em', color: C.textSec, fontWeight: 500 }}>
                    {MARKET_LABELS[tipo] || tipo}
                  </div>
                  <div style={{ flex: 1 }}>
                    <ProgressBar rate={stats.hit_rate ?? 0} showLabel />
                  </div>
                  <div style={{ minWidth: '55px', textAlign: 'right', fontSize: '0.78em', color: C.textMuted }}>
                    {stats.hits}/{stats.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Per Campionato ───────────────────────────────────────────── */}
          <div style={card}>
            <div style={sectionTitle}>Per Campionato</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(data.breakdown_campionato)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([league, stats]) => (
                  <div key={league} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ minWidth: isMobile ? '85px' : '130px', fontSize: '0.83em', color: C.textSec }}>
                      {league}
                    </div>
                    <div style={{ flex: 1 }}>
                      <ProgressBar rate={stats.hit_rate ?? 0} showLabel />
                    </div>
                    <div style={{ minWidth: '55px', textAlign: 'right', fontSize: '0.78em', color: C.textMuted }}>
                      {stats.hits}/{stats.total}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ─── Confidence & Stelle ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ ...card, marginBottom: 0 }}>
              <div style={sectionTitle}>Per Confidence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.breakdown_confidence).map(([band, stats]) => (
                  <div key={band} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: '50px', fontSize: '0.82em', color: C.textSec, fontFamily: 'monospace' }}>{band}</div>
                    <div style={{ flex: 1 }}><ProgressBar rate={stats.hit_rate ?? 0} showLabel /></div>
                    <div style={{ minWidth: '40px', textAlign: 'right', fontSize: '0.75em', color: C.textMuted }}>{stats.hits}/{stats.total}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...card, marginBottom: 0 }}>
              <div style={sectionTitle}>Per Stelle</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.breakdown_stelle).map(([band, stats]) => (
                  <div key={band} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: '50px', fontSize: '0.82em', color: C.textSec, fontFamily: 'monospace' }}>{band}</div>
                    <div style={{ flex: 1 }}><ProgressBar rate={stats.hit_rate ?? 0} showLabel /></div>
                    <div style={{ minWidth: '40px', textAlign: 'right', fontSize: '0.75em', color: C.textMuted }}>{stats.hits}/{stats.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Riepilogo Quote ──────────────────────────────────────────── */}
          {data.quota_stats && data.quota_stats.total_con_quota > 0 && (
            <div style={{
              ...card,
              background: `linear-gradient(135deg, ${C.amberDim}, ${C.cardBg})`,
            }}>
              <div style={sectionTitle}>Quote</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 0 }}>
                <KpiCard label="Q. Media" value={String(data.quota_stats.avg_quota_tutti ?? '—')} color={C.amber} />
                <KpiCard label="Q. Centrate" value={String(data.quota_stats.avg_quota_azzeccati ?? '—')} color={C.green} />
                <KpiCard label="Q. Sbagliate" value={String(data.quota_stats.avg_quota_sbagliati ?? '—')} color={C.red} />
                <KpiCard
                  label="ROI"
                  value={formatRoi(data.quota_stats.roi_globale)}
                  color={profitColor(data.quota_stats.roi_globale ?? 0)}
                />
                <KpiCard
                  label="Profitto"
                  value={formatProfit(data.quota_stats.profit_globale)}
                  color={profitColor(data.quota_stats.profit_globale)}
                />
              </div>
            </div>
          )}

          {/* ─── Per Fascia Quota ─────────────────────────────────────────── */}
          {data.breakdown_quota && Object.keys(data.breakdown_quota).length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>Per Fascia Quota</div>
              {/* Header */}
              {!isMobile && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 60px 55px 60px',
                  gap: '8px', padding: '0 0 8px', borderBottom: `1px solid ${C.divider}`,
                  marginBottom: '6px',
                }}>
                  {['Fascia', 'Hit Rate', 'Esito', 'ROI', 'P/L'].map(h => (
                    <div key={h} style={{ fontSize: '0.68em', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Fascia' || h === 'Hit Rate' ? 'left' : 'right' }}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(data.breakdown_quota)
                  .filter(([b]) => b !== 'N/D')
                  .map(([band, stats]) => {
                    const s = stats as QuotaBandData;
                    return (
                      <div key={band} style={{
                        display: isMobile ? 'flex' : 'grid',
                        gridTemplateColumns: '90px 1fr 60px 55px 60px',
                        flexWrap: isMobile ? 'wrap' : undefined,
                        gap: '8px', alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: `1px solid ${C.divider}`,
                      }}>
                        <div style={{ minWidth: isMobile ? '70px' : undefined, fontSize: '0.82em', color: C.textSec, fontFamily: 'monospace' }}>
                          {band}
                        </div>
                        <div style={{ flex: isMobile ? 1 : undefined, minWidth: isMobile ? '100%' : undefined, order: isMobile ? 3 : undefined }}>
                          <ProgressBar rate={s.hit_rate ?? 0} showLabel />
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.78em', color: C.textMuted }}>
                          {s.hits}/{s.total}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.78em', fontWeight: 600, color: s.roi != null ? profitColor(s.roi) : C.textMuted }}>
                          {formatRoi(s.roi)}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.78em', color: s.profit != null ? profitColor(s.profit) : C.textMuted }}>
                          {formatProfit(s.profit)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ─── Quota x Mercato ──────────────────────────────────────────── */}
          {data.cross_quota_mercato && Object.keys(data.cross_quota_mercato).length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>Quota x Mercato</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textMuted, fontSize: '0.9em', fontWeight: 500 }}>
                        Fascia
                      </th>
                      {Object.keys(data.breakdown_mercato).sort().map(tipo => (
                        <th key={tipo} style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textMuted, fontSize: '0.9em', fontWeight: 500 }}>
                          {MARKET_LABELS[tipo] || tipo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.cross_quota_mercato)
                      .filter(([b]) => b !== 'N/D')
                      .map(([band, markets], i) => (
                        <tr key={band} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textSec, fontFamily: 'monospace', fontSize: '0.92em' }}>
                            {band}
                          </td>
                          {Object.keys(data.breakdown_mercato).sort().map(tipo => {
                            const d = markets[tipo];
                            if (!d || d.total === 0) return <td key={tipo} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: '#333' }}>—</td>;
                            const r = d.hit_rate ?? 0;
                            return (
                              <td key={tipo} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}` }}>
                                <span style={{ color: rateColor(r), fontWeight: 600 }}>{r}%</span>
                                <span style={{ color: C.textMuted, fontSize: '0.85em' }}> ({d.hits}/{d.total})</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Serie Temporale ──────────────────────────────────────────── */}
          {data.serie_temporale.length > 0 && (() => {
            const showProfit = !isPronostici;
            const maxProfit = showProfit ? Math.max(...data.serie_temporale.map(d => Math.abs(d.profit)), 1) : 0;
            return (
              <div style={card}>
                <div style={sectionTitle}>
                  {showProfit ? 'Profitto giornaliero (flat stake 1u)' : 'Hit Rate giornaliero (% pronostici centrati)'}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {showProfit ? (
                    /* ── Grafico profitto: barre sopra/sotto la linea zero ── */
                    <div style={{ position: 'relative', minHeight: '130px', padding: '8px 0' }}>
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '130px' }}>
                        {data.serie_temporale.map(day => {
                          const isPositive = day.profit >= 0;
                          const barH = Math.max((Math.abs(day.profit) / maxProfit) * 55, 3);
                          const color = isPositive ? C.green : C.red;
                          return (
                            <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '24px', height: '100%', justifyContent: 'center' }}>
                              {/* Metà superiore (profitto positivo) */}
                              <div style={{ height: '55px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.55em', color, marginBottom: '2px' }}>
                                  {isPositive ? `+${day.profit.toFixed(1)}` : ''}
                                </div>
                                {isPositive && <div style={{
                                  width: '100%', maxWidth: '18px', height: `${barH}px`,
                                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                                  borderRadius: '3px 3px 0 0',
                                }} />}
                              </div>
                              {/* Linea zero */}
                              <div style={{ width: '100%', height: '1px', background: C.textMuted, opacity: 0.3 }} />
                              {/* Metà inferiore (profitto negativo) */}
                              <div style={{ height: '55px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}>
                                {!isPositive && <div style={{
                                  width: '100%', maxWidth: '18px', height: `${barH}px`,
                                  background: `linear-gradient(180deg, ${color}88, ${color})`,
                                  borderRadius: '0 0 3px 3px',
                                }} />}
                                <div style={{ fontSize: '0.55em', color, marginTop: '2px' }}>
                                  {!isPositive ? day.profit.toFixed(1) : ''}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.5em', color: C.textMuted, whiteSpace: 'nowrap' }}>
                                {day.date.slice(5)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* ── Grafico HR%: barre classiche ── */
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', minHeight: '110px', padding: '8px 0' }}>
                      {data.serie_temporale.map(day => {
                        const rate = day.hit_rate ?? 0;
                        const color = rateColor(rate);
                        return (
                          <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '24px' }}>
                            <div style={{ fontSize: '0.6em', color: C.textMuted, marginBottom: '3px' }}>{rate}%</div>
                            <div style={{
                              width: '100%', maxWidth: '20px',
                              height: `${Math.max(rate * 0.9, 4)}px`,
                              background: `linear-gradient(180deg, ${color}, ${color}88)`,
                              borderRadius: '3px 3px 0 0',
                              transition: 'height 0.4s ease',
                            }} />
                            <div style={{ fontSize: '0.52em', color: C.textMuted, marginTop: '3px', whiteSpace: 'nowrap' }}>
                              {day.date.slice(5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ─── Mercato x Campionato ─────────────────────────────────────── */}
          {Object.keys(data.cross_mercato_campionato).length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>Mercato x Campionato</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textMuted, fontSize: '0.9em', fontWeight: 500 }}>
                        Mercato
                      </th>
                      {Object.keys(data.breakdown_campionato).sort().map(lg => (
                        <th key={lg} style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textMuted, fontSize: '0.9em', fontWeight: 500 }}>
                          {lg}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.cross_mercato_campionato).map(([tipo, leagues], i) => (
                      <tr key={tipo} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textSec, fontWeight: 500 }}>
                          {MARKET_LABELS[tipo] || tipo}
                        </td>
                        {Object.keys(data.breakdown_campionato).sort().map(lg => {
                          const d = leagues[lg];
                          if (!d || d.total === 0) return <td key={lg} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: '#333' }}>—</td>;
                          const r = d.hit_rate ?? 0;
                          return (
                            <td key={lg} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}` }}>
                              <span style={{ color: rateColor(r), fontWeight: 600 }}>{r}%</span>
                              <span style={{ color: C.textMuted, fontSize: '0.85em' }}> ({d.hits}/{d.total})</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ TAB ANALISI ════════════════════════════════════════ */}
      {activeView === 'analisi' && data && !loading && insights && (
        <>
          {Object.entries({
            panoramica: { title: 'Panoramica', accent: C.cyan },
            puntiForza: { title: 'Punti di Forza', accent: C.green },
            miglioramento: { title: 'Da Migliorare', accent: C.red },
            consigli: { title: 'Consigli', accent: C.amber },
          }).map(([key, meta]) => {
            const items = insights[key];
            if (!items || items.length === 0) return null;
            return (
              <div key={key} style={card}>
                <div style={{ ...sectionTitle, color: meta.accent }}>{meta.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map((ins: Insight, i: number) => {
                    const borderColor = ins.type === 'positive' ? C.green : ins.type === 'negative' ? C.red : ins.type === 'warning' ? C.amber : C.cyan;
                    return (
                      <div key={i} style={{
                        borderLeft: `3px solid ${borderColor}`,
                        background: `${borderColor}08`,
                        borderRadius: '0 10px 10px 0',
                        padding: '12px 16px',
                      }}>
                        <div style={{ fontWeight: 600, color: borderColor, marginBottom: '4px', fontSize: '0.9em' }}>
                          {ins.title}
                        </div>
                        <div style={{ color: C.textSec, fontSize: '0.82em', lineHeight: 1.5 }}>
                          {ins.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Coach AI promo */}
          <div style={{
            ...card,
            border: `1px solid rgba(139, 92, 246, 0.2)`,
            background: `linear-gradient(135deg, rgba(139, 92, 246, 0.06), ${C.cardBg})`,
          }}>
            <div style={{ ...sectionTitle, color: '#a78bfa' }}>Analisi AI</div>
            <div style={{ color: C.textSec, fontSize: '0.85em', lineHeight: 1.6 }}>
              Apri il <strong style={{ color: '#a78bfa' }}>Coach AI</strong> dalla Dashboard per un'analisi personalizzata in tempo reale.
            </div>
          </div>

          {insights.panoramica.length === 0 && insights.puntiForza.length === 0 &&
           insights.miglioramento.length === 0 && insights.consigli.length === 0 && (
            <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: '40px' }}>
              Dati insufficienti per generare insights. Estendi il periodo di analisi.
            </div>
          )}
        </>
      )}

      {activeView === 'analisi' && !data && !loading && (
        <div style={{ ...card, textAlign: 'center', color: C.textMuted, padding: '40px' }}>
          Nessun dato disponibile.
        </div>
      )}
    </div>
  );
}
