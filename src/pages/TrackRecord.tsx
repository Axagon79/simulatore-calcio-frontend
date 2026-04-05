import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getThemeMode, API_BASE } from '../AppDev/costanti';
import { getRoutingRule, isOptimized } from '../utils/routingRules';



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
  breakdown_source: Record<string, QuotaBandData>;
  breakdown_campionato: Record<string, HitRateData>;
  breakdown_confidence: Record<string, HitRateData>;
  breakdown_stelle: Record<string, HitRateData>;
  breakdown_routing_rule: Record<string, QuotaBandData>;
  breakdown_quota: Record<string, QuotaBandData>;
  quota_stats: QuotaStats;
  cross_quota_mercato: Record<string, Record<string, HitRateData>>;
  cross_mercato_campionato: Record<string, Record<string, HitRateData>>;
  serie_temporale: Array<{ date: string; profit: number; avg_quota: number | null; edge: number | null } & HitRateData>;
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
  'MULTI_GOAL': 'Multi-goal',
};

const COLORS_DARK = {
  bg: '#060a14',
  cardBg: 'rgba(15, 23, 42, 0.55)',
  cardBorder: 'rgba(255, 255, 255, 0.18)',
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
  surfaceSubtle: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  rowAlt: 'rgba(255,255,255,0.015)',
  optionBg: '#0f172a',
  selectBg: 'rgba(15, 23, 42, 0.8)',
};

const COLORS_LIGHT = {
  bg: '#f0f2f5',
  cardBg: 'rgba(255, 255, 255, 0.85)',
  cardBorder: 'rgba(0, 0, 0, 0.30)',
  cyan: '#0077cc',
  cyanDim: 'rgba(0, 119, 204, 0.08)',
  cyanBorder: 'rgba(0, 119, 204, 0.2)',
  amber: '#d97706',
  amberDim: 'rgba(217, 119, 6, 0.08)',
  amberBorder: 'rgba(217, 119, 6, 0.2)',
  green: '#059669',
  red: '#dc2626',
  text: '#1a1a2e',
  textSec: '#4b5563',
  textMuted: '#9ca3af',
  divider: 'rgba(0, 0, 0, 0.06)',
  barBg: 'rgba(0, 0, 0, 0.06)',
  surfaceSubtle: 'rgba(0,0,0,0.03)',
  surfaceHover: 'rgba(0,0,0,0.06)',
  rowAlt: 'rgba(0,0,0,0.025)',
  optionBg: '#ffffff',
  selectBg: 'rgba(255, 255, 255, 0.95)',
};

const C = getThemeMode() === 'light' ? COLORS_LIGHT : COLORS_DARK;

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

function rateColor(rate: number, arMode = false) {
  // Gradiente continuo: da rosso (hue=0) a verde (hue=130)
  // Pronostici: 30%=rosso, 80%=verde
  // Alto Rendimento: 15%=rosso, 55%=verde
  const minRate = arMode ? 15 : 30;
  const maxRate = arMode ? 55 : 80;
  const clamped = Math.max(minRate, Math.min(maxRate, rate));
  const ratio = (clamped - minRate) / (maxRate - minRate); // 0..1
  const hue = Math.round(ratio * 130); // 0=rosso, 130=verde
  const sat = 70 + Math.round(ratio * 15); // 70-85%
  const light = 45 + Math.round((1 - Math.abs(ratio - 0.5) * 2) * 10); // più chiaro al centro
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function withAlpha(color: string, alpha: number) {
  // Supporta sia hex (#rrggbb) che hsl(h, s%, l%)
  if (color.startsWith('hsl')) return color.replace(')', `, ${alpha})`);
  // hex → rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

function ProgressBar({ rate, height = 6, showLabel = false, arMode = false }: { rate: number; height?: number; showLabel?: boolean; arMode?: boolean }) {
  const color = rateColor(rate, arMode);
  // Gradiente nella barra: dal colore "basso" al colore effettivo della rate
  const colorStart = rateColor(Math.max(0, rate - 30), arMode);
  const colorMid = rateColor(Math.max(0, rate - 15), arMode);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div style={{
        flex: 1, height, background: C.barBg, borderRadius: height / 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${rate}%`, height: '100%', borderRadius: height / 2,
          background: `linear-gradient(90deg, ${colorStart}, ${colorMid}, ${color})`,
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

function generateInsights(data: TrackRecordResponse, sezione: 'pronostici' | 'alto_rendimento'): Record<string, Insight[]> {
  const result: Record<string, Insight[]> = { panoramica: [], puntiForza: [], miglioramento: [], consigli: [] };
  const isAR = sezione === 'alto_rendimento';
  const round1 = (n: number) => Math.round(n * 10) / 10;

  // Soglie contestuali: AR ha quote > 2.50 quindi HR naturalmente più bassa
  const hrExcellent = isAR ? 45 : 70;
  const hrGood = isAR ? 35 : 60;
  const hrMediocre = isAR ? 25 : 50;
  const criticalThreshold = isAR ? 30 : 50;

  // ── PANORAMICA ──────────────────────────────────────────────────────────────

  const hr = data.globale.hit_rate ?? 0;
  const hrLevel = hr >= hrExcellent ? 'eccellente' : hr >= hrGood ? 'buono' : hr >= hrMediocre ? 'nella media' : 'sotto le attese';
  result.panoramica.push({
    title: `HR ${hr}% \u2014 Rendimento ${hrLevel}`,
    text: `${data.globale.hits} centrati su ${data.globale.total}. ${isAR
      ? 'Per quote sopra 2.50, un HR oltre il 35% indica gi\u00E0 un buon rendimento.'
      : 'Per i pronostici standard, l\'obiettivo \u00E8 mantenersi stabilmente sopra il 60%.'}`,
    type: hr >= hrGood ? 'positive' : hr >= hrMediocre ? 'neutral' : 'negative',
  });

  // Trend ultimi 3 giorni
  if (data.serie_temporale.length >= 3) {
    const last3 = data.serie_temporale.slice(-3);
    const avgRecent = last3.reduce((s, d) => s + (d.hit_rate ?? 0), 0) / last3.length;
    const diff = round1(avgRecent - hr);
    if (Math.abs(diff) >= 2) {
      result.panoramica.push({
        title: diff > 0 ? 'Tendenza positiva' : 'Fase di flessione',
        text: `Ultimi 3 giorni: ${round1(avgRecent)}% di media (${diff > 0 ? '+' : ''}${diff}pp vs periodo). ${diff > 0
          ? 'Il sistema sta performando sopra la sua media.'
          : 'Oscillazione fisiologica \u2014 monitorare nei prossimi giorni.'}`,
        type: diff > 0 ? 'positive' : 'warning',
      });
    }
  }

  // Consistenza (deviazione standard HR giornaliera)
  if (data.serie_temporale.length >= 5) {
    const rates = data.serie_temporale.filter(d => d.total >= 3).map(d => d.hit_rate ?? 0);
    if (rates.length >= 5) {
      const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
      const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length;
      const stdDev = round1(Math.sqrt(variance));
      if (stdDev <= 12) {
        result.panoramica.push({
          title: `Risultati stabili (\u00B1${stdDev}%)`,
          text: 'La variazione giornaliera \u00E8 contenuta. Indica un sistema affidabile e prevedibile nel tempo.',
          type: 'positive',
        });
      } else if (stdDev >= 25) {
        result.panoramica.push({
          title: `Alta volatilit\u00E0 (\u00B1${stdDev}%)`,
          text: 'I risultati oscillano molto tra un giorno e l\'altro. Tipico con pochi pronostici giornalieri o mercati ad alto rischio.',
          type: 'warning',
        });
      }
    }
  }

  // Campione ridotto
  if (data.globale.total < 50) {
    result.panoramica.push({
      title: 'Campione limitato',
      text: `Con ${data.globale.total} pronostici le statistiche possono variare. Servono almeno 50\u2013100 per conclusioni affidabili.`,
      type: 'warning',
    });
  }

  // ── PUNTI DI FORZA ──────────────────────────────────────────────────────────

  type Entry = [string, HitRateData];
  const findBest = (obj: Record<string, HitRateData>, min = 10): Entry | null => {
    const e = Object.entries(obj).filter(([, s]) => s.total >= min && s.hit_rate != null);
    return e.length ? e.reduce((a, b) => ((a[1].hit_rate ?? 0) >= (b[1].hit_rate ?? 0) ? a : b)) : null;
  };
  const findWorst = (obj: Record<string, HitRateData>, min = 10): Entry | null => {
    const e = Object.entries(obj).filter(([, s]) => s.total >= min && s.hit_rate != null);
    return e.length ? e.reduce((a, b) => ((a[1].hit_rate ?? 0) <= (b[1].hit_rate ?? 0) ? a : b)) : null;
  };

  // Miglior campionato
  const bestLeague = findBest(data.breakdown_campionato);
  if (bestLeague) {
    const leagueHr = bestLeague[1].hit_rate ?? 0;
    const diff = round1(leagueHr - hr);
    result.puntiForza.push({
      title: `Miglior campionato: ${bestLeague[0]}`,
      text: `${leagueHr}% su ${bestLeague[1].total} pronostici${diff > 3 ? ` (+${diff}pp sopra la media)` : ''}.`,
      type: 'positive',
    });
  }

  // Fascia quota pi\u00F9 redditizia (ROI)
  if (data.breakdown_quota) {
    const qe = Object.entries(data.breakdown_quota)
      .filter(([b, s]) => b !== 'N/D' && s.total >= 5 && s.roi != null) as [string, QuotaBandData][];
    if (qe.length) {
      const best = qe.reduce((a, b) => ((a[1].roi ?? -999) >= (b[1].roi ?? -999) ? a : b));
      if ((best[1].roi ?? 0) > 0) {
        result.puntiForza.push({
          title: `Fascia pi\u00F9 redditizia: quota ${best[0]}`,
          text: `ROI ${formatRoi(best[1].roi)} con profitto ${formatProfit(best[1].profit)} su ${best[1].total} pronostici (HR ${best[1].hit_rate}%).`,
          type: 'positive',
        });
      }
    }
  }

  // Stelle pi\u00F9 affidabili
  if (data.breakdown_stelle) {
    const starEntries = Object.entries(data.breakdown_stelle)
      .filter(([, s]) => s.total >= 5 && s.hit_rate != null);
    if (starEntries.length >= 2) {
      const bestStar = starEntries.reduce((a, b) => ((a[1].hit_rate ?? 0) >= (b[1].hit_rate ?? 0) ? a : b));
      const starHr = bestStar[1].hit_rate ?? 0;
      if (starHr > hr) {
        result.puntiForza.push({
          title: `${bestStar[0]} stelle = pi\u00F9 affidabili`,
          text: `HR ${starHr}% su ${bestStar[1].total} pronostici \u2014 il livello di confidenza pi\u00F9 preciso nel periodo.`,
          type: 'positive',
        });
      }
    }
  }

  // Quota vincenti vs perdenti
  if (data.quota_stats?.avg_quota_azzeccati != null && data.quota_stats?.avg_quota_sbagliati != null) {
    const qWin = data.quota_stats.avg_quota_azzeccati;
    const qLose = data.quota_stats.avg_quota_sbagliati;
    if (qWin > qLose) {
      const diff = round1(qWin - qLose);
      result.puntiForza.push({
        title: 'Si azzeccano anche le difficili',
        text: `Quota media dei centrati: ${qWin.toFixed(2)} vs ${qLose.toFixed(2)} dei sbagliati (+${diff.toFixed(1)}). Il sistema \u00E8 preciso anche sulle quote pi\u00F9 alte.`,
        type: 'positive',
      });
    }
  }

  // Edge medio positivo
  if (data.serie_temporale.length >= 5) {
    const edgeVals = data.serie_temporale.filter(d => d.edge != null).map(d => d.edge as number);
    if (edgeVals.length >= 3) {
      const avgEdge = round1(edgeVals.reduce((s, e) => s + e, 0) / edgeVals.length);
      if (avgEdge > 2) {
        result.puntiForza.push({
          title: `Edge medio: +${avgEdge}%`,
          text: 'Il sistema trova costantemente valore nelle quote. Un edge positivo significa che i bookmaker sottovalutano le probabilit\u00E0 reali.',
          type: 'positive',
        });
      }
    }
  }

  // ── DA MIGLIORARE ───────────────────────────────────────────────────────────

  // Campionato critico
  const worstLeague = findWorst(data.breakdown_campionato);
  if (worstLeague && (worstLeague[1].hit_rate ?? 100) < criticalThreshold) {
    result.miglioramento.push({
      title: `Campionato critico: ${worstLeague[0]}`,
      text: `Solo ${worstLeague[1].hit_rate}% su ${worstLeague[1].total} pronostici. ${
        worstLeague[1].total >= 15
          ? 'Campione significativo \u2014 valutare se ridurre i pronostici su questo campionato.'
          : 'Campione ridotto, potrebbe stabilizzarsi con pi\u00F9 dati.'}`,
      type: 'negative',
    });
  }

  // Campionati sotto soglia critica (lista)
  const critical = Object.entries(data.breakdown_campionato)
    .filter(([, s]) => s.total >= 10 && (s.hit_rate ?? 100) < criticalThreshold);
  if (critical.length > 1) {
    result.miglioramento.push({
      title: `${critical.length} campionati sotto il ${criticalThreshold}%`,
      text: critical.map(([n, s]) => `${n} (${s.hit_rate}% su ${s.total})`).join(', ') + '.',
      type: 'negative',
    });
  }

  // Fascia quota in perdita
  if (data.breakdown_quota) {
    const qe = Object.entries(data.breakdown_quota)
      .filter(([b, s]) => b !== 'N/D' && s.total >= 5 && s.roi != null) as [string, QuotaBandData][];
    if (qe.length >= 2) {
      const worst = qe.reduce((a, b) => ((a[1].roi ?? 0) <= (b[1].roi ?? 0) ? a : b));
      if ((worst[1].roi ?? 0) < -10) {
        result.miglioramento.push({
          title: `Fascia in perdita: quota ${worst[0]}`,
          text: `ROI ${formatRoi(worst[1].roi)} con ${formatProfit(worst[1].profit)} su ${worst[1].total} pronostici. Questa fascia erode il profitto complessivo.`,
          type: 'warning',
        });
      }
    }
  }

  // Edge negativo
  if (data.serie_temporale.length >= 5) {
    const edgeVals = data.serie_temporale.filter(d => d.edge != null).map(d => d.edge as number);
    if (edgeVals.length >= 3) {
      const avgEdge = round1(edgeVals.reduce((s, e) => s + e, 0) / edgeVals.length);
      if (avgEdge < -3) {
        result.miglioramento.push({
          title: `Edge medio negativo (${avgEdge}%)`,
          text: 'Il vantaggio medio sui bookmaker \u00E8 in deficit. Le quote offerte non giustificano il rischio \u2014 serve pi\u00F9 selettivit\u00E0.',
          type: 'negative',
        });
      }
    }
  }

  // ── CONSIGLI OPERATIVI ──────────────────────────────────────────────────────

  // Specializzazione campionati
  if (data.breakdown_campionato) {
    const sorted = Object.entries(data.breakdown_campionato).sort(([, a], [, b]) => b.total - a.total);
    const total = sorted.reduce((s, [, v]) => s + v.total, 0);
    let cumul = 0;
    let count80 = 0;
    for (const [, v] of sorted) {
      cumul += v.total;
      count80++;
      if (cumul >= total * 0.8) break;
    }
    if (count80 <= 3 && sorted.length >= 6) {
      result.consigli.push({
        title: 'Buona specializzazione',
        text: `L'80% del volume \u00E8 concentrato su ${count80} campionati. Specializzarsi paga \u2014 risultati pi\u00F9 prevedibili.`,
        type: 'positive',
      });
    } else if (count80 >= 8) {
      result.consigli.push({
        title: 'Troppa dispersione',
        text: `I pronostici si distribuiscono su ${sorted.length} campionati. Concentrarsi sui 5 migliori per HR potrebbe migliorare il rendimento.`,
        type: 'warning',
      });
    }
  }

  // Rapporto rischio/rendimento
  if (data.quota_stats?.avg_quota_tutti != null && data.quota_stats.total_con_quota >= 20) {
    const avgQ = data.quota_stats.avg_quota_tutti;
    const roi = data.quota_stats.roi_globale ?? 0;
    if (avgQ < 1.50 && roi < 5) {
      result.consigli.push({
        title: 'Quote molto conservative',
        text: `Quota media ${avgQ.toFixed(2)} \u2014 quote basse danno alta HR ma margini sottili. Un piccolo aumento della quota media potrebbe migliorare il rendimento.`,
        type: 'neutral',
      });
    } else if (avgQ > 2.50 && !isAR) {
      result.consigli.push({
        title: 'Quote ambiziose per questa sezione',
        text: `Quota media ${avgQ.toFixed(2)} \u2014 nella sezione pronostici standard, quote cos\u00EC alte aumentano il rischio. Se la HR resta sopra il 55%, il rendimento \u00E8 ottimo.`,
        type: 'neutral',
      });
    }
  }

  // ROI complessivo
  if (data.quota_stats?.total_con_quota > 0) {
    const roi = data.quota_stats.roi_globale ?? 0;
    if (roi > 5) {
      result.consigli.push({
        title: `ROI positivo: ${formatRoi(data.quota_stats.roi_globale)}`,
        text: `Profitto ${formatProfit(data.quota_stats.profit_globale)} su ${data.quota_stats.total_con_quota} pronostici con quota. Il sistema genera valore reale.`,
        type: 'positive',
      });
    } else if (roi >= -2 && roi <= 5) {
      result.consigli.push({
        title: `ROI neutro: ${formatRoi(data.quota_stats.roi_globale)}`,
        text: `Il sistema \u00E8 in sostanziale equilibrio (${formatProfit(data.quota_stats.profit_globale)}). Piccoli miglioramenti nella selettivit\u00E0 possono fare la differenza.`,
        type: 'neutral',
      });
    } else {
      result.consigli.push({
        title: `ROI in deficit: ${formatRoi(data.quota_stats.roi_globale)}`,
        text: `Perdita di ${formatProfit(data.quota_stats.profit_globale)}. Analizzare fasce di quota e campionati per identificare dove si concentrano le perdite.`,
        type: 'negative',
      });
    }
  }

  // Consiglio stelle
  if (data.breakdown_stelle) {
    const starEntries = Object.entries(data.breakdown_stelle)
      .filter(([, s]) => s.total >= 5 && s.hit_rate != null)
      .sort(([, a], [, b]) => (b.hit_rate ?? 0) - (a.hit_rate ?? 0));
    if (starEntries.length >= 2) {
      const best = starEntries[0];
      const worst = starEntries[starEntries.length - 1];
      const gap = round1((best[1].hit_rate ?? 0) - (worst[1].hit_rate ?? 0));
      if (gap >= 8) {
        result.consigli.push({
          title: `Segui le stelle: ${best[0]}\u2605 al top`,
          text: `I pronostici a ${best[0]} stelle centrano il ${best[1].hit_rate}%, quelli a ${worst[0]} stelle il ${worst[1].hit_rate}% (${gap}pp di differenza). Le stelle sono un buon indicatore.`,
          type: 'positive',
        });
      }
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
  const [chartMetric, setChartMetric] = useState<'hr' | 'yield' | 'pl' | 'centrati' | 'cumul' | 'qmedia' | 'edge'>('hr');
  const [quotaMin, setQuotaMin] = useState('');
  const [quotaMax, setQuotaMax] = useState('');
  const [selectedBand, setSelectedBand] = useState('');
  const [unfilteredQuotaCounts, setUnfilteredQuotaCounts] = useState<Record<string, number>>({});
  const [debouncedQuotaMin, setDebouncedQuotaMin] = useState('');
  const [debouncedQuotaMax, setDebouncedQuotaMax] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = window.innerWidth < 768;
  const isLight = getThemeMode() === 'light';

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

  const insights = useMemo(() => data ? generateInsights(data, filtroSezione) : null, [data, filtroSezione]);

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
      background: 'transparent',
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
              ? (isLight
                ? 'linear-gradient(135deg, rgba(0, 119, 204, 0.35), rgba(0, 119, 204, 0.20))'
                : 'linear-gradient(135deg, rgba(6, 182, 212, 0.38), rgba(6, 182, 212, 0.22))')
              : C.cardBg,
            border: isPronostici ? `2px solid ${C.cyanBorder}` : `2px solid ${isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.20)'}`,
            borderRadius: '14px',
            padding: isMobile ? '16px 12px' : '20px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            transform: isPronostici ? 'scale(1.01)' : 'scale(1)',
            opacity: 1,
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
          <div style={{ fontSize: '0.68em', color: C.textSec, lineHeight: 1.4, marginBottom: '10px' }}>
            Quote {'\u2264'} 2.50, rischio pi{'\u00F9'} contenuto
          </div>
          {proData && proData.total > 0 ? (
            <>
              <div style={{ fontSize: isMobile ? '2em' : '2.4em', fontWeight: 800, color: isPronostici ? rateColor(proData.hit_rate ?? 0) : C.textSec, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {proData.hit_rate ?? '—'}<span style={{ fontSize: '0.5em', opacity: 0.7 }}>%</span>
              </div>
              <div style={{ fontSize: '0.72em', color: C.textSec, marginTop: '4px' }}>
                {proData.hits}/{proData.total} centrati
              </div>
              {proData.roi != null && (
                <div style={{ fontSize: '0.72em', color: isPronostici ? profitColor(proData.profit) : C.textSec, marginTop: '2px' }}>
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
              ? (isLight
                ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.35), rgba(217, 119, 6, 0.20))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(245, 158, 11, 0.20))')
              : C.cardBg,
            border: !isPronostici ? `2px solid ${C.amberBorder}` : `2px solid ${isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.20)'}`,
            borderRadius: '14px',
            padding: isMobile ? '16px 12px' : '20px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            transform: !isPronostici ? 'scale(1.01)' : 'scale(1)',
            opacity: 1,
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
          <div style={{ fontSize: '0.68em', color: C.textSec, lineHeight: 1.4, marginBottom: '10px' }}>
            Quote &gt; 2.50 (DC {'\u2265'} 2.00), rischio maggiore ma profitto pi{'\u00F9'} alto
          </div>
          {arData && arData.total > 0 ? (
            <>
              {/* Hero: Yield (non HR%) */}
              <div style={{ fontSize: isMobile ? '2em' : '2.4em', fontWeight: 800, color: !isPronostici ? profitColor(arData.roi ?? 0) : C.textSec, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {arData.roi != null ? (
                  <>{arData.roi > 0 ? '+' : ''}{arData.roi}<span style={{ fontSize: '0.5em', opacity: 0.7 }}>%</span></>
                ) : '—'}
              </div>
              <div style={{ fontSize: '0.72em', color: C.textSec, marginTop: '4px' }}>
                Yield &middot; {formatProfit(arData.profit)}
              </div>
              <div style={{ fontSize: '0.72em', color: C.textSec, marginTop: '2px' }}>
                HR {arData.hit_rate ?? '—'}% &middot; {arData.hits}/{arData.total}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '1.4em', color: C.textMuted }}>—</div>
          )}
        </button>
      </div>

      {/* ─── Tab Dati / Analisi ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: isLight ? '#eedcaa' : '#3a3218', borderRadius: '10px', padding: '3px', border: `1.5px solid ${isLight ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.18)'}` }}>
        {([
          { id: 'dati' as const, label: 'Statistiche' },
          { id: 'analisi' as const, label: 'Insights' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              flex: 1,
              background: activeView === tab.id ? (isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.20)') : 'transparent',
              border: 'none',
              color: activeView === tab.id ? C.text : C.text,
              borderRadius: '8px',
              padding: '9px 16px',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: activeView === tab.id ? 700 : 500,
              opacity: activeView === tab.id ? 1 : 0.6,
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
            background: C.selectBg, border: `1px solid ${C.cardBorder}`,
            color: filtroLeague ? C.text : C.textMuted,
            borderRadius: '8px', padding: '6px 10px', fontSize: '0.8em',
          }}
        >
          <option value="" style={{ background: C.optionBg, color: C.textSec }}>Campionato</option>
          {availableLeagues.map(lg => (
            <option key={lg} value={lg} style={{ background: C.optionBg, color: C.text }}>{lg}</option>
          ))}
        </select>

        {/* Mercato */}
        <select
          value={filtroMarket}
          onChange={e => setFiltroMarket(e.target.value)}
          style={{
            background: C.selectBg, border: `1px solid ${C.cardBorder}`,
            color: filtroMarket ? C.text : C.textMuted,
            borderRadius: '8px', padding: '6px 10px', fontSize: '0.8em',
          }}
        >
          <option value="" style={{ background: C.optionBg, color: C.textSec }}>Mercato</option>
          {availableMarkets.map(mk => (
            <option key={mk} value={mk} style={{ background: C.optionBg, color: C.text }}>{MARKET_LABELS[mk] || mk}</option>
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
                    background: isEmpty ? 'transparent' : isActive ? `${accent}25` : C.surfaceSubtle,
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
                color={rateColor(data.globale.hit_rate ?? 0, !isPronostici)}
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
                    <ProgressBar rate={stats.hit_rate ?? 0} showLabel arMode={!isPronostici} />
                  </div>
                  <div style={{ minWidth: '55px', textAlign: 'right', fontSize: '0.78em', color: C.textMuted }}>
                    {stats.hits}/{stats.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Per Algoritmo (source) ──────────────────────────────────── */}
          {data.breakdown_source && Object.keys(data.breakdown_source).length > 0 && (() => {
            // Raggruppa source _screm sotto S8F
            const merged: Record<string, typeof data.breakdown_source[string]> = {};
            for (const [src, stats] of Object.entries(data.breakdown_source)) {
              const key = src.includes('_screm') ? 'S8F' : src;
              if (!merged[key]) {
                merged[key] = { ...stats };
              } else {
                const m = merged[key];
                m.hits += stats.hits;
                m.total += stats.total;
                m.profit = Math.round((m.profit + stats.profit) * 100) / 100;
                m.hit_rate = m.total > 0 ? Math.round((m.hits / m.total) * 1000) / 10 : 0;
                const totalWithQuota = m.total;
                m.roi = totalWithQuota > 0 ? Math.round((m.profit / totalWithQuota) * 1000) / 10 : null;
              }
            }
            return (
            <div style={card}>
              <div style={sectionTitle}>Per Algoritmo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(merged)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([src, stats]) => (
                    <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ minWidth: isMobile ? '70px' : '100px', fontSize: '0.85em', color: C.textSec, fontWeight: 600 }}>
                        {src}
                      </div>
                      <div style={{ flex: 1 }}>
                        <ProgressBar rate={stats.hit_rate ?? 0} showLabel arMode={!isPronostici} />
                      </div>
                      <div style={{ minWidth: '55px', textAlign: 'right', fontSize: '0.78em', color: C.textMuted }}>
                        {stats.hits}/{stats.total}
                      </div>
                      <div style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.78em', fontWeight: 600, color: profitColor(stats.profit) }}>
                        {stats.profit > 0 ? '+' : ''}{stats.profit}u
                      </div>
                      {stats.roi != null && (
                        <div style={{ minWidth: '50px', textAlign: 'right', fontSize: '0.75em', color: profitColor(stats.roi) }}>
                          {stats.roi > 0 ? '+' : ''}{stats.roi}%
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            );
          })()}

          {/* ─── Per Regola Orchestratore ──────────────────────────────── */}
          {data.breakdown_routing_rule && Object.keys(data.breakdown_routing_rule).length > 0 && (() => {
            const isLightMode = getThemeMode() === 'light';
            // Filtra solo regole ottimizzate (non base), ordina per P/L
            const entries = Object.entries(data.breakdown_routing_rule)
              .filter(([rule]) => isOptimized(rule))
              .sort(([, a], [, b]) => b.profit - a.profit);
            if (entries.length === 0) return null;
            return (
            <div style={card}>
              <div style={sectionTitle}>Per Regola Orchestratore</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map(([rule, stats]) => {
                  const rr = getRoutingRule(rule, isLightMode);
                  return (
                    <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        minWidth: isMobile ? '65px' : '80px',
                        fontSize: '0.78em', fontWeight: 700,
                        color: rr?.color || C.textSec,
                        background: rr?.bg || 'transparent',
                        borderRadius: '3px', padding: '1px 5px',
                        textAlign: 'center',
                      }} title={rr?.description || rule}>
                        {rr?.label || rule}
                      </div>
                      <div style={{ flex: 1 }}>
                        <ProgressBar rate={stats.hit_rate ?? 0} showLabel arMode={!isPronostici} />
                      </div>
                      <div style={{ minWidth: '50px', textAlign: 'right', fontSize: '0.78em', color: C.textMuted }}>
                        {stats.hits}/{stats.total}
                      </div>
                      <div style={{ minWidth: '55px', textAlign: 'right', fontSize: '0.78em', fontWeight: 600, color: profitColor(stats.profit) }}>
                        {stats.profit > 0 ? '+' : ''}{stats.profit}u
                      </div>
                      {stats.roi != null && (
                        <div style={{ minWidth: '48px', textAlign: 'right', fontSize: '0.75em', color: profitColor(stats.roi) }}>
                          {stats.roi > 0 ? '+' : ''}{stats.roi}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

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
                      <ProgressBar rate={stats.hit_rate ?? 0} showLabel arMode={!isPronostici} />
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
                    <div style={{ flex: 1 }}><ProgressBar rate={stats.hit_rate ?? 0} showLabel arMode={!isPronostici} /></div>
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
                    <div style={{ flex: 1 }}><ProgressBar rate={stats.hit_rate ?? 0} showLabel arMode={!isPronostici} /></div>
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
                          <ProgressBar rate={s.hit_rate ?? 0} showLabel arMode={!isPronostici} />
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
                        <tr key={band} style={{ background: i % 2 === 0 ? 'transparent' : C.rowAlt }}>
                          <td style={{ padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textSec, fontFamily: 'monospace', fontSize: '0.92em' }}>
                            {band}
                          </td>
                          {Object.keys(data.breakdown_mercato).sort().map(tipo => {
                            const d = markets[tipo];
                            if (!d || d.total === 0) return <td key={tipo} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textMuted }}>—</td>;
                            const r = d.hit_rate ?? 0;
                            return (
                              <td key={tipo} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}` }}>
                                <span style={{ color: rateColor(r, !isPronostici), fontWeight: 600 }}>{r}%</span>
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
            const CHART_PILLS = [
              { id: 'hr' as const, label: 'HR%' },
              { id: 'yield' as const, label: 'Yield' },
              { id: 'pl' as const, label: 'P/L' },
              { id: 'centrati' as const, label: 'Centrati' },
              { id: 'cumul' as const, label: 'Cumulativo' },
              { id: 'qmedia' as const, label: 'Q.Media' },
              { id: 'edge' as const, label: 'Edge' },
            ];

            // Calcola profitto cumulativo
            let cumProfit = 0;
            const cumulData = data.serie_temporale.map(d => {
              const wq = d.profit;
              cumProfit += wq;
              return Math.round(cumProfit * 100) / 100;
            });

            // Calcola valori per la metrica selezionata
            const arMode = !isPronostici;
            const chartData = data.serie_temporale.map((d, i) => {
              let val = 0;
              if (chartMetric === 'hr') val = d.hit_rate ?? 0;
              else if (chartMetric === 'yield') val = d.total > 0 ? Math.round((d.profit / d.total) * 1000) / 10 : 0;
              else if (chartMetric === 'pl') val = d.profit;
              else if (chartMetric === 'centrati') val = d.hits;
              else if (chartMetric === 'cumul') val = cumulData[i];
              else if (chartMetric === 'qmedia') val = d.avg_quota ?? 0;
              else if (chartMetric === 'edge') val = d.edge ?? 0;
              return { ...d, val };
            });

            // Metriche che possono essere negative (sopra/sotto zero)
            const hasNegative = chartMetric === 'yield' || chartMetric === 'pl' || chartMetric === 'edge' || chartMetric === 'cumul';
            // Per HR% coloriamo per soglia, per le altre verde/rosso in base al segno
            const useRateColor = chartMetric === 'hr';
            // Suffissi per le label
            const suffix = chartMetric === 'hr' || chartMetric === 'yield' || chartMetric === 'edge' ? '%' : chartMetric === 'pl' || chartMetric === 'cumul' ? 'u' : '';
            const showSign = chartMetric === 'yield' || chartMetric === 'pl' || chartMetric === 'edge' || chartMetric === 'cumul';

            const maxVal = Math.max(...chartData.map(d => Math.abs(d.val)), 0.1);

            const formatVal = (v: number, dayTotal?: number) => {
              const sign = showSign && v > 0 ? '+' : '';
              if (chartMetric === 'qmedia') return v.toFixed(2);
              if (chartMetric === 'centrati') return `${Math.round(v)}/${dayTotal ?? '?'}`;
              return `${sign}${Math.round(v * 10) / 10}${suffix}`;
            };

            return (
              <div style={card}>
                {/* Pillole selezione metrica */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {CHART_PILLS.map(pill => {
                    const active = chartMetric === pill.id;
                    return (
                      <button
                        key={pill.id}
                        onClick={() => setChartMetric(pill.id)}
                        style={{
                          background: active ? `${accent}22` : C.surfaceSubtle,
                          border: active ? `1px solid ${accent}50` : `1px solid ${C.cardBorder}`,
                          color: active ? accent : C.textSec,
                          borderRadius: '16px',
                          padding: '5px 12px',
                          cursor: 'pointer',
                          fontSize: '0.75em',
                          fontWeight: active ? 700 : 400,
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {hasNegative ? (
                    /* ── Grafico sopra/sotto zero ── */
                    <div style={{ position: 'relative', minHeight: '130px', padding: '8px 0' }}>
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '130px' }}>
                        {chartData.map(day => {
                          const isPositive = day.val >= 0;
                          const barH = Math.max((Math.abs(day.val) / maxVal) * 55, 3);
                          const color = isPositive ? C.green : C.red;
                          return (
                            <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '24px', height: '100%', justifyContent: 'center' }}>
                              <div style={{ height: '55px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.55em', color, marginBottom: '2px' }}>
                                  {isPositive ? formatVal(day.val, day.total) : ''}
                                </div>
                                {isPositive && <div style={{
                                  width: '100%', maxWidth: '18px', height: `${barH}px`,
                                  background: `linear-gradient(180deg, ${color}, ${withAlpha(color, 0.53)})`,
                                  borderRadius: '3px 3px 0 0',
                                }} />}
                              </div>
                              <div style={{ width: '100%', height: '1px', background: C.textMuted, opacity: 0.3 }} />
                              <div style={{ height: '55px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}>
                                {!isPositive && <div style={{
                                  width: '100%', maxWidth: '18px', height: `${barH}px`,
                                  background: `linear-gradient(180deg, ${withAlpha(color, 0.53)}, ${color})`,
                                  borderRadius: '0 0 3px 3px',
                                }} />}
                                <div style={{ fontSize: '0.55em', color, marginTop: '2px' }}>
                                  {!isPositive ? formatVal(day.val, day.total) : ''}
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
                    /* ── Grafico barre classiche (solo positive) ── */
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', minHeight: '110px', padding: '8px 0' }}>
                      {chartData.map(day => {
                        const color = useRateColor ? rateColor(day.val, arMode) : accent;
                        const barH = maxVal > 0 ? Math.max((day.val / maxVal) * 90, 4) : 4;
                        return (
                          <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '24px' }}>
                            <div style={{ fontSize: '0.6em', color: C.textMuted, marginBottom: '3px' }}>{formatVal(day.val, day.total)}</div>
                            <div style={{
                              width: '100%', maxWidth: '20px',
                              height: `${barH}px`,
                              background: `linear-gradient(180deg, ${color}, ${withAlpha(color, 0.53)})`,
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
                      <tr key={tipo} style={{ background: i % 2 === 0 ? 'transparent' : C.rowAlt }}>
                        <td style={{ padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textSec, fontWeight: 500 }}>
                          {MARKET_LABELS[tipo] || tipo}
                        </td>
                        {Object.keys(data.breakdown_campionato).sort().map(lg => {
                          const d = leagues[lg];
                          if (!d || d.total === 0) return <td key={lg} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}`, color: C.textMuted }}>—</td>;
                          const r = d.hit_rate ?? 0;
                          return (
                            <td key={lg} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: `1px solid ${C.divider}` }}>
                              <span style={{ color: rateColor(r, !isPronostici), fontWeight: 600 }}>{r}%</span>
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
