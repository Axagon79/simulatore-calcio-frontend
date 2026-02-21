import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

interface HitRateData {
  total: number;
  hits: number;
  misses: number;
  hit_rate: number | null;
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
  breakdown_mercato: Record<string, HitRateData>;
  breakdown_campionato: Record<string, HitRateData>;
  breakdown_confidence: Record<string, HitRateData>;
  breakdown_stelle: Record<string, HitRateData>;
  breakdown_quota: Record<string, QuotaBandData>;
  quota_stats: QuotaStats;
  cross_quota_mercato: Record<string, Record<string, HitRateData>>;
  cross_mercato_campionato: Record<string, Record<string, HitRateData>>;
  serie_temporale: Array<{ date: string } & HitRateData>;
}

interface TrackRecordProps {
  onBack: () => void;
}

// Helper: formatta hit rate con colore
function HitRateBadge({ data }: { data: HitRateData }) {
  if (!data || data.total === 0) return <span style={{ color: '#666' }}>—</span>;
  const rate = data.hit_rate ?? 0;
  const color = rate >= 65 ? '#00ff88' : rate >= 50 ? '#ffaa00' : '#ff4466';
  return (
    <span style={{ color, fontWeight: 'bold' }}>
      {rate}% <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85em' }}>({data.hits}/{data.total})</span>
    </span>
  );
}

// Helper: barra visuale hit rate
function HitRateBar({ data }: { data: HitRateData }) {
  if (!data || data.total === 0) return null;
  const rate = data.hit_rate ?? 0;
  const color = rate >= 65 ? '#00ff88' : rate >= 50 ? '#ffaa00' : '#ff4466';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ color, fontWeight: 'bold', fontSize: '0.9em', minWidth: '45px', textAlign: 'right' }}>{rate}%</span>
    </div>
  );
}

// Interfaccia insight
interface Insight {
  icon: string;
  title: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
}

// Nomi mercato leggibili
const MARKET_LABELS: Record<string, string> = {
  'SEGNO': '1X2 (Segno)',
  'DOPPIA_CHANCE': 'Doppia Chance',
  'OVER_UNDER': 'Over/Under',
  'GG_NG': 'Goal/NoGoal',
  'X_FACTOR': 'X Factor',
  'RISULTATO_ESATTO': 'Risultato Esatto',
};

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
  const [quotaMin, setQuotaMin] = useState('');
  const [quotaMax, setQuotaMax] = useState('');
  const [selectedBand, setSelectedBand] = useState('');
  const [unfilteredQuotaCounts, setUnfilteredQuotaCounts] = useState<Record<string, number>>({});
  const [debouncedQuotaMin, setDebouncedQuotaMin] = useState('');
  const [debouncedQuotaMax, setDebouncedQuotaMax] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isMobile = window.innerWidth < 768;

  const getDateRange = useCallback(() => {
    const to = new Date().toISOString().split('T')[0];
    let from: string;
    const now = new Date();
    if (periodo === '7d') {
      now.setDate(now.getDate() - 7);
      from = now.toISOString().split('T')[0];
    } else if (periodo === '30d') {
      now.setDate(now.getDate() - 30);
      from = now.toISOString().split('T')[0];
    } else if (periodo === '90d') {
      now.setDate(now.getDate() - 90);
      from = now.toISOString().split('T')[0];
    } else {
      from = '2024-01-01';
    }
    return { from, to };
  }, [periodo]);

  // Debounce per input quota manuali (500ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuotaMin(quotaMin);
      setDebouncedQuotaMax(quotaMax);
    }, 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [quotaMin, quotaMax]);

  // Reset filtro quota quando cambiano mercato/lega/periodo
  useEffect(() => {
    setSelectedBand('');
    setQuotaMin('');
    setQuotaMax('');
  }, [filtroMarket, filtroLeague, periodo]);

  // Calcola min/max effettivi: pillola ha priorità, altrimenti input manuali
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

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error('Risposta non valida');
        setData(json);
        // Aggiorna liste disponibili dalla risposta senza filtri
        if (!filtroLeague && json.breakdown_campionato) {
          setAvailableLeagues(Object.keys(json.breakdown_campionato).sort());
        }
        if (!filtroMarket && json.breakdown_mercato) {
          setAvailableMarkets(Object.keys(json.breakdown_mercato));
        }
        // Salva conteggi fasce quando nessun filtro quota è attivo
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
  }, [periodo, filtroLeague, filtroMarket, selectedBand, effectiveMin, effectiveMax, getDateRange]);

  // Stile container principale
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1628 100%)',
    color: '#e0e0e0',
    padding: isMobile ? '16px' : '32px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    marginBottom: '20px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: isMobile ? '1.1em' : '1.3em',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#fff',
  };

  // Genera insights dall'oggetto data corrente
  const insights = useMemo(() => {
    if (!data) return null;

    const result: Record<string, Insight[]> = {
      panoramica: [],
      puntiForza: [],
      miglioramento: [],
      consigli: [],
    };

    const ml = MARKET_LABELS;

    // --- PANORAMICA ---
    const hr = data.globale.hit_rate ?? 0;
    const hrClass = hr >= 65 ? 'ottimo' : hr >= 55 ? 'discreto' : 'critico';
    const hrColor = hr >= 65 ? 'positivo' : hr >= 55 ? 'neutro' : 'negativo';
    result.panoramica.push({
      icon: hr >= 65 ? '\u{2705}' : hr >= 55 ? '\u{1F7E1}' : '\u{1F534}',
      title: `Hit rate globale: ${hr}%`,
      text: `Su ${data.globale.total} pronostici analizzati, ${data.globale.hits} sono stati azzeccati e ${data.globale.misses} sbagliati. Il rendimento complessivo è ${hrClass}.`,
      type: hrColor === 'positivo' ? 'positive' : hrColor === 'neutro' ? 'neutral' : 'negative',
    });

    // Trend ultimi giorni
    if (data.serie_temporale.length >= 3) {
      const last3 = data.serie_temporale.slice(-3);
      const avgRecent = last3.reduce((s, d) => s + (d.hit_rate ?? 0), 0) / last3.length;
      const diff = Math.round((avgRecent - hr) * 10) / 10;
      if (Math.abs(diff) >= 2) {
        result.panoramica.push({
          icon: diff > 0 ? '\u{1F4C8}' : '\u{1F4C9}',
          title: diff > 0 ? 'Trend in crescita' : 'Trend in calo',
          text: `Negli ultimi 3 giorni la media hit rate è ${Math.round(avgRecent)}% (${diff > 0 ? '+' : ''}${diff} punti rispetto alla media del periodo). ${diff > 0 ? 'Il sistema sta migliorando.' : 'Potrebbe essere utile rivedere i parametri.'}`,
          type: diff > 0 ? 'positive' : 'warning',
        });
      }
    }

    // Volume
    if (data.globale.total < 50) {
      result.panoramica.push({
        icon: '\u{26A0}\u{FE0F}',
        title: 'Campione ridotto',
        text: `Solo ${data.globale.total} pronostici nel periodo selezionato. I risultati statistici potrebbero non essere ancora affidabili. Considera di estendere il periodo di analisi.`,
        type: 'warning',
      });
    }

    // --- HELPER: trova best/worst ---
    type Entry = [string, HitRateData];
    const findBest = (obj: Record<string, HitRateData>, minSample = 10): Entry | null => {
      const entries = Object.entries(obj).filter(([, s]) => s.total >= minSample && s.hit_rate != null);
      if (entries.length === 0) return null;
      return entries.reduce((a, b) => ((a[1].hit_rate ?? 0) >= (b[1].hit_rate ?? 0) ? a : b));
    };
    const findWorst = (obj: Record<string, HitRateData>, minSample = 10): Entry | null => {
      const entries = Object.entries(obj).filter(([, s]) => s.total >= minSample && s.hit_rate != null);
      if (entries.length === 0) return null;
      return entries.reduce((a, b) => ((a[1].hit_rate ?? 0) <= (b[1].hit_rate ?? 0) ? a : b));
    };

    // --- PUNTI DI FORZA ---
    const bestMarket = findBest(data.breakdown_mercato);
    if (bestMarket) {
      result.puntiForza.push({
        icon: '\u{1F3AF}',
        title: `Miglior mercato: ${ml[bestMarket[0]] || bestMarket[0]}`,
        text: `Hit rate del ${bestMarket[1].hit_rate}% su ${bestMarket[1].total} pronostici. Questo è il mercato dove il sistema performa meglio.`,
        type: 'positive',
      });
    }

    const bestLeague = findBest(data.breakdown_campionato);
    if (bestLeague) {
      result.puntiForza.push({
        icon: '\u{1F3C6}',
        title: `Miglior campionato: ${bestLeague[0]}`,
        text: `Hit rate del ${bestLeague[1].hit_rate}% su ${bestLeague[1].total} pronostici. Campionato dove i pronostici sono più affidabili.`,
        type: 'positive',
      });
    }

    // Miglior fascia quota (per ROI)
    if (data.breakdown_quota) {
      const quotaEntries = Object.entries(data.breakdown_quota)
        .filter(([b, s]) => b !== 'N/D' && s.total >= 5 && s.roi != null) as [string, QuotaBandData][];
      if (quotaEntries.length > 0) {
        const bestQuota = quotaEntries.reduce((a, b) => ((a[1].roi ?? -999) >= (b[1].roi ?? -999) ? a : b));
        if ((bestQuota[1].roi ?? 0) > 0) {
          result.puntiForza.push({
            icon: '\u{1F4B0}',
            title: `Fascia più redditizia: ${bestQuota[0]}`,
            text: `ROI del ${bestQuota[1].roi! > 0 ? '+' : ''}${bestQuota[1].roi}% con profitto di ${bestQuota[1].profit >= 0 ? '+' : ''}${bestQuota[1].profit}\u20AC (base 1\u20AC/scommessa). Hit rate: ${bestQuota[1].hit_rate}% su ${bestQuota[1].total} pronostici.`,
            type: 'positive',
          });
        }
      }
    }

    // Miglior confidence
    const bestConf = findBest(data.breakdown_confidence, 5);
    if (bestConf) {
      result.puntiForza.push({
        icon: '\u{1F4AA}',
        title: `Miglior fascia confidence: ${bestConf[0]}`,
        text: `I pronostici con confidence ${bestConf[0]} hanno hit rate del ${bestConf[1].hit_rate}% su ${bestConf[1].total} campioni. La confidence del sistema è ben calibrata in questa fascia.`,
        type: 'positive',
      });
    }

    // --- AREE DI MIGLIORAMENTO ---
    const worstMarket = findWorst(data.breakdown_mercato);
    if (worstMarket && (worstMarket[1].hit_rate ?? 100) < 60) {
      result.miglioramento.push({
        icon: '\u{26A0}\u{FE0F}',
        title: `Mercato più debole: ${ml[worstMarket[0]] || worstMarket[0]}`,
        text: `Hit rate del ${worstMarket[1].hit_rate}% su ${worstMarket[1].total} pronostici. Questo mercato abbassa la media complessiva.`,
        type: 'warning',
      });
    }

    const worstLeague = findWorst(data.breakdown_campionato);
    if (worstLeague && (worstLeague[1].hit_rate ?? 100) < 55) {
      result.miglioramento.push({
        icon: '\u{1F534}',
        title: `Campionato problematico: ${worstLeague[0]}`,
        text: `Hit rate del ${worstLeague[1].hit_rate}% su ${worstLeague[1].total} pronostici. Valuta se i dati disponibili per questo campionato sono sufficienti o se serve una calibrazione specifica.`,
        type: 'negative',
      });
    }

    // Campionati sotto 50%
    const criticalLeagues = Object.entries(data.breakdown_campionato)
      .filter(([, s]) => s.total >= 10 && (s.hit_rate ?? 100) < 50);
    if (criticalLeagues.length > 0) {
      const names = criticalLeagues.map(([n, s]) => `${n} (${s.hit_rate}%)`).join(', ');
      result.miglioramento.push({
        icon: '\u{1F6A8}',
        title: `${criticalLeagues.length} campionat${criticalLeagues.length > 1 ? 'i' : 'o'} sotto il 50%`,
        text: `Campionati critici: ${names}. Con hit rate sotto il 50% stai perdendo pi\u00F9 pronostici di quanti ne azzecchi.`,
        type: 'negative',
      });
    }

    // Peggior fascia quota (ROI)
    if (data.breakdown_quota) {
      const quotaEntries = Object.entries(data.breakdown_quota)
        .filter(([b, s]) => b !== 'N/D' && s.total >= 5 && s.roi != null) as [string, QuotaBandData][];
      if (quotaEntries.length > 0) {
        const worstQuota = quotaEntries.reduce((a, b) => ((a[1].roi ?? 999) <= (b[1].roi ?? 999) ? a : b));
        if ((worstQuota[1].roi ?? 0) < -10) {
          result.miglioramento.push({
            icon: '\u{1F4B8}',
            title: `Fascia quota in perdita: ${worstQuota[0]}`,
            text: `ROI del ${worstQuota[1].roi}% con perdita di ${worstQuota[1].profit}\u20AC. Questa fascia di quote sta generando perdite significative.`,
            type: 'negative',
          });
        }
      }
    }

    // --- CONSIGLI OPERATIVI ---
    // Concentrati sul mercato migliore
    if (bestMarket && worstMarket && bestMarket[0] !== worstMarket[0]) {
      const gap = (bestMarket[1].hit_rate ?? 0) - (worstMarket[1].hit_rate ?? 0);
      if (gap >= 10) {
        result.consigli.push({
          icon: '\u{1F3AF}',
          title: 'Concentrati sul mercato migliore',
          text: `Il mercato ${ml[bestMarket[0]] || bestMarket[0]} ha ${gap} punti percentuali in pi\u00F9 rispetto a ${ml[worstMarket[0]] || worstMarket[0]}. Considera di aumentare il volume su ${ml[bestMarket[0]] || bestMarket[0]} e ridurre quello su ${ml[worstMarket[0]] || worstMarket[0]}.`,
          type: 'neutral',
        });
      }
    }

    // Quote basse vs alte
    if (data.quota_stats && data.quota_stats.total_con_quota > 0) {
      const avgAzz = data.quota_stats.avg_quota_azzeccati;
      const avgSba = data.quota_stats.avg_quota_sbagliati;
      if (avgAzz != null && avgSba != null) {
        if (avgSba > avgAzz + 0.2) {
          result.consigli.push({
            icon: '\u{1F4CA}',
            title: 'Attenzione alle quote alte',
            text: `La quota media dei pronostici sbagliati (${avgSba}) \u00E8 significativamente pi\u00F9 alta di quella degli azzeccati (${avgAzz}). Le quote pi\u00F9 alte sono pi\u00F9 difficili da azzeccare \u2014 bilancia rischio e rendimento.`,
            type: 'warning',
          });
        }
      }
      if ((data.quota_stats.roi_globale ?? 0) > 0) {
        result.consigli.push({
          icon: '\u{2705}',
          title: 'ROI positivo',
          text: `Il ROI globale \u00E8 del +${data.quota_stats.roi_globale}% con un profitto di +${data.quota_stats.profit_globale}\u20AC (base 1\u20AC/scommessa). Il sistema sta generando valore. Mantieni questa strategia.`,
          type: 'positive',
        });
      } else if ((data.quota_stats.roi_globale ?? 0) < -5) {
        result.consigli.push({
          icon: '\u{26A0}\u{FE0F}',
          title: 'ROI negativo',
          text: `Il ROI globale \u00E8 del ${data.quota_stats.roi_globale}% con una perdita di ${data.quota_stats.profit_globale}\u20AC. Rivedi i parametri di selezione, in particolare le fasce di quota con perdite maggiori.`,
          type: 'negative',
        });
      }
    }

    // Campionato con hit rate alto ma poco volume
    const highHrLowVol = Object.entries(data.breakdown_campionato)
      .filter(([, s]) => s.total >= 5 && s.total < 20 && (s.hit_rate ?? 0) >= 70);
    if (highHrLowVol.length > 0) {
      const names = highHrLowVol.map(([n]) => n).join(', ');
      result.consigli.push({
        icon: '\u{1F50D}',
        title: 'Potenziale inesplorato',
        text: `${names}: hit rate alto (>70%) ma con pochi pronostici. Se i dati sono affidabili, potresti aumentare il volume su questi campionati per capitalizzare il vantaggio.`,
        type: 'neutral',
      });
    }

    // Campionato che trascina giù
    if (worstLeague && (worstLeague[1].hit_rate ?? 100) < 50 && worstLeague[1].total >= 15) {
      result.consigli.push({
        icon: '\u{1F6D1}',
        title: `Valuta di escludere ${worstLeague[0]}`,
        text: `Con hit rate del ${worstLeague[1].hit_rate}% su ${worstLeague[1].total} pronostici, ${worstLeague[0]} sta trascinando gi\u00F9 la media complessiva. Potresti temporaneamente ridurre o escludere i pronostici su questo campionato.`,
        type: 'warning',
      });
    }

    return result;
  }, [data]);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '1em'
          }}
        >
          Indietro
        </button>
        <h1 style={{ margin: 0, fontSize: isMobile ? '1.5em' : '2em' }}>Track Record</h1>
      </div>

      {/* Banner fase di sviluppo */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,159,67,0.08), rgba(255,215,0,0.06))',
        border: '1px solid rgba(255,159,67,0.25)',
        borderRadius: '12px', padding: '14px 18px', marginBottom: '16px',
        lineHeight: '1.6', fontSize: '0.85em'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.1em' }}>{'\u{1F6A7}'}</span>
          <strong style={{ color: '#ffb74d', fontSize: '0.95em' }}>Progetto in fase di sviluppo</strong>
        </div>
        <div style={{ color: '#bbb' }}>
          Questo progetto <strong style={{ color: '#e0e0e0' }}>non è ancora un prodotto finito</strong> — è un sistema in costruzione. Gli algoritmi, i modelli e le strategie sono in fase di calibrazione attiva e vengono aggiornati costantemente.
          I numeri che vedi qui sono <strong style={{ color: '#e0e0e0' }}>reali e completi</strong>: crediamo nella totale trasparenza, anche quando i risultati non riflettono ancora il potenziale del sistema a regime.
          Ogni giorno il motore impara, si adatta e migliora — i risultati di oggi non rappresentano quelli di domani.
        </div>
      </div>

      {/* Tab Dati / Analisi */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {([
          { id: 'dati' as const, label: 'Dati', icon: '\u{1F4CA}' },
          { id: 'analisi' as const, label: 'Analisi', icon: '\u{1F4A1}' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              background: activeView === tab.id ? 'rgba(0,200,255,0.25)' : 'rgba(255,255,255,0.05)',
              border: activeView === tab.id ? '1px solid rgba(0,200,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: activeView === tab.id ? '#fff' : '#888',
              borderRadius: '10px', padding: '10px 20px', cursor: 'pointer',
              fontSize: '0.95em', fontWeight: activeView === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Periodo */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['7d', '30d', '90d', 'tutto'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                background: periodo === p ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.08)',
                border: periodo === p ? '1px solid rgba(0,200,255,0.6)' : '1px solid rgba(255,255,255,0.15)',
                color: '#fff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85em'
              }}
            >
              {p === '7d' ? '7 giorni' : p === '30d' ? '30 giorni' : p === '90d' ? '90 giorni' : 'Tutto'}
            </button>
          ))}
        </div>
        {/* Filtro campionato */}
        <select
          value={filtroLeague}
          onChange={(e) => setFiltroLeague(e.target.value)}
          style={{
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85em'
          }}
        >
          <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>Tutti i campionati</option>
          {availableLeagues.map(lg => (
            <option key={lg} value={lg} style={{ background: '#1a1a2e', color: '#fff' }}>{lg}</option>
          ))}
        </select>
        {/* Filtro mercato */}
        <select
          value={filtroMarket}
          onChange={(e) => setFiltroMarket(e.target.value)}
          style={{
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85em'
          }}
        >
          <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>Tutti i mercati</option>
          {availableMarkets.map(mk => (
            <option key={mk} value={mk} style={{ background: '#1a1a2e', color: '#fff' }}>{MARKET_LABELS[mk] || mk}</option>
          ))}
        </select>
      </div>
      {/* Filtro quota: fasce predefinite + input manuali — solo in tab Dati */}
      {activeView === 'dati' && <div style={{ ...cardStyle, padding: isMobile ? '12px' : '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: '#888', fontSize: '0.85em', whiteSpace: 'nowrap' }}>Fascia quota:</span>
          {QUOTA_BANDS.map(band => {
            const isActive = selectedBand === band.label;
            const count = unfilteredQuotaCounts[band.label] ?? 0;
            const isEmpty = count === 0;
            return (
              <button
                key={band.label}
                disabled={isEmpty}
                onClick={() => {
                  if (isEmpty) return;
                  setSelectedBand(isActive ? '' : band.label);
                }}
                style={{
                  background: isEmpty ? 'rgba(255,255,255,0.02)' : isActive ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.06)',
                  border: isEmpty ? '1px solid rgba(255,255,255,0.05)' : isActive ? '1px solid rgba(0,200,255,0.6)' : '1px solid rgba(255,255,255,0.12)',
                  color: isEmpty ? '#444' : isActive ? '#fff' : '#aaa',
                  borderRadius: '14px', padding: '4px 8px', cursor: isEmpty ? 'default' : 'pointer',
                  fontSize: '0.78em', fontFamily: 'monospace', whiteSpace: 'nowrap',
                  opacity: isEmpty ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                {band.label}
                {!isEmpty && (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '1px 5px', fontSize: '0.85em', lineHeight: '1.2'
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#666', fontSize: '0.8em', whiteSpace: 'nowrap' }}>Personalizzato:</span>
          <input
            type="number"
            placeholder="Min"
            value={quotaMin}
            onChange={(e) => { setQuotaMin(e.target.value); setSelectedBand(''); }}
            step="0.01"
            min="1.00"
            style={{
              width: '72px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85em'
            }}
          />
          <span style={{ color: '#666' }}>—</span>
          <input
            type="number"
            placeholder="Max"
            value={quotaMax}
            onChange={(e) => { setQuotaMax(e.target.value); setSelectedBand(''); }}
            step="0.01"
            min="1.00"
            style={{
              width: '72px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85em'
            }}
          />
          {(quotaMin || quotaMax || selectedBand) && (
            <button
              onClick={() => { setQuotaMin(''); setQuotaMax(''); setSelectedBand(''); }}
              style={{
                background: 'rgba(255,68,102,0.2)', border: '1px solid rgba(255,68,102,0.4)',
                color: '#ff4466', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8em'
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          Caricamento dati...
        </div>
      )}

      {error && (
        <div style={{ ...cardStyle, borderColor: 'rgba(255,68,102,0.4)', color: '#ff4466' }}>
          Errore: {error}
        </div>
      )}

      {/* ===== TAB DATI ===== */}
      {activeView === 'dati' && data && !loading && (
        <>
          {/* Riepilogo globale */}
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(0,200,255,0.1), rgba(138,43,226,0.1))' }}>
            <div style={headerStyle}>Riepilogo Globale</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#00ccff' }}>{data.globale.total}</div>
                <div style={{ color: '#888', fontSize: '0.85em' }}>Pronostici</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#00ff88' }}>{data.globale.hits}</div>
                <div style={{ color: '#888', fontSize: '0.85em' }}>Azzeccati</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ff4466' }}>{data.globale.misses}</div>
                <div style={{ color: '#888', fontSize: '0.85em' }}>Sbagliati</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '2em', fontWeight: 'bold',
                  color: (data.globale.hit_rate ?? 0) >= 60 ? '#00ff88' : (data.globale.hit_rate ?? 0) >= 50 ? '#ffaa00' : '#ff4466'
                }}>
                  {data.globale.hit_rate ?? '—'}%
                </div>
                <div style={{ color: '#888', fontSize: '0.85em' }}>Hit Rate</div>
              </div>
            </div>
          </div>

          {/* Breakdown per mercato */}
          <div style={cardStyle}>
            <div style={headerStyle}>Per Mercato</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(data.breakdown_mercato).map(([tipo, stats]) => (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ minWidth: isMobile ? '100px' : '160px', color: '#ccc', fontSize: '0.9em' }}>
                    {MARKET_LABELS[tipo] || tipo}
                  </div>
                  <div style={{ flex: 1 }}>
                    <HitRateBar data={stats} />
                  </div>
                  <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.85em', color: '#888' }}>
                    {stats.hits}/{stats.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown per campionato */}
          <div style={cardStyle}>
            <div style={headerStyle}>Per Campionato</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(data.breakdown_campionato)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([league, stats]) => (
                  <div key={league} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: isMobile ? '100px' : '160px', color: '#ccc', fontSize: '0.9em' }}>
                      {league}
                    </div>
                    <div style={{ flex: 1 }}>
                      <HitRateBar data={stats} />
                    </div>
                    <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.85em', color: '#888' }}>
                      {stats.hits}/{stats.total}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Confidence vs Accuratezza */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>Per Confidence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(data.breakdown_confidence).map(([band, stats]) => (
                  <div key={band} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: '60px', color: '#ccc', fontSize: '0.9em' }}>{band}</div>
                    <div style={{ flex: 1 }}><HitRateBar data={stats} /></div>
                    <div style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.85em', color: '#888' }}>
                      {stats.hits}/{stats.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>Per Stelle</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(data.breakdown_stelle).map(([band, stats]) => (
                  <div key={band} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: '60px', color: '#ccc', fontSize: '0.9em' }}>{band}</div>
                    <div style={{ flex: 1 }}><HitRateBar data={stats} /></div>
                    <div style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.85em', color: '#888' }}>
                      {stats.hits}/{stats.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Riepilogo Quote — stats globali */}
          {data.quota_stats && data.quota_stats.total_con_quota > 0 && (
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,170,0,0.08), rgba(138,43,226,0.08))' }}>
              <div style={headerStyle}>Riepilogo Quote</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6em', fontWeight: 'bold', color: '#ffaa00' }}>{data.quota_stats.avg_quota_tutti ?? '—'}</div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>Quota media</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6em', fontWeight: 'bold', color: '#00ff88' }}>{data.quota_stats.avg_quota_azzeccati ?? '—'}</div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>Media azzeccati</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6em', fontWeight: 'bold', color: '#ff4466' }}>{data.quota_stats.avg_quota_sbagliati ?? '—'}</div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>Media sbagliati</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.6em', fontWeight: 'bold',
                    color: (data.quota_stats.roi_globale ?? 0) >= 0 ? '#00ff88' : '#ff4466'
                  }}>
                    {data.quota_stats.roi_globale != null ? `${data.quota_stats.roi_globale > 0 ? '+' : ''}${data.quota_stats.roi_globale}%` : '—'}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>ROI</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.6em', fontWeight: 'bold',
                    color: data.quota_stats.profit_globale >= 0 ? '#00ff88' : '#ff4466'
                  }}>
                    {data.quota_stats.profit_globale >= 0 ? '+' : ''}{data.quota_stats.profit_globale}€
                  </div>
                  <div style={{ color: '#888', fontSize: '0.8em' }}>Profitto (1€/bet)</div>
                </div>
              </div>
              {data.quota_stats.total_senza_quota > 0 && (
                <div style={{ marginTop: '10px', fontSize: '0.75em', color: '#666', textAlign: 'right' }}>
                  {data.quota_stats.total_senza_quota} pronostici senza quota esclusi dal calcolo
                </div>
              )}
            </div>
          )}

          {/* Per Fascia Quota — con ROI */}
          {data.breakdown_quota && Object.keys(data.breakdown_quota).length > 0 && (
            <div style={cardStyle}>
              <div style={headerStyle}>Per Fascia Quota</div>
              {/* Header colonne */}
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ minWidth: '100px', fontSize: '0.75em', color: '#666' }}>Fascia</div>
                  <div style={{ flex: 1, fontSize: '0.75em', color: '#666' }}>Hit Rate</div>
                  <div style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.75em', color: '#666' }}>Risultato</div>
                  <div style={{ minWidth: '55px', textAlign: 'right', fontSize: '0.75em', color: '#666' }}>ROI</div>
                  <div style={{ minWidth: '65px', textAlign: 'right', fontSize: '0.75em', color: '#666' }}>Profitto</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.breakdown_quota)
                  .filter(([band]) => band !== 'N/D')
                  .map(([band, stats]) => {
                    const roi = (stats as QuotaBandData).roi;
                    const profit = (stats as QuotaBandData).profit;
                    return (
                      <div key={band} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                        <div style={{ minWidth: isMobile ? '80px' : '100px', color: '#ccc', fontSize: '0.9em', fontFamily: 'monospace' }}>
                          {band}
                        </div>
                        <div style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto', order: isMobile ? 3 : 0 }}><HitRateBar data={stats} /></div>
                        <div style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.85em', color: '#888' }}>
                          {stats.hits}/{stats.total}
                        </div>
                        <div style={{
                          minWidth: '55px', textAlign: 'right', fontSize: '0.85em', fontWeight: 'bold',
                          color: roi != null ? (roi >= 0 ? '#00ff88' : '#ff4466') : '#444'
                        }}>
                          {roi != null ? `${roi > 0 ? '+' : ''}${roi}%` : '—'}
                        </div>
                        <div style={{
                          minWidth: '65px', textAlign: 'right', fontSize: '0.85em',
                          color: profit != null ? (profit >= 0 ? '#00ff88' : '#ff4466') : '#444'
                        }}>
                          {profit != null ? `${profit >= 0 ? '+' : ''}${profit}€` : '—'}
                        </div>
                      </div>
                    );
                  })}
                {data.breakdown_quota['N/D'] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.4, marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <div style={{ minWidth: isMobile ? '80px' : '100px', color: '#888', fontSize: '0.85em', fontStyle: 'italic' }}>
                      Senza quota
                    </div>
                    <div style={{ flex: 1 }}><HitRateBar data={data.breakdown_quota['N/D']} /></div>
                    <div style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.85em', color: '#666' }}>
                      {data.breakdown_quota['N/D'].hits}/{data.breakdown_quota['N/D'].total}
                    </div>
                    <div style={{ minWidth: '55px' }} />
                    <div style={{ minWidth: '65px' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quota × Mercato */}
          {data.cross_quota_mercato && Object.keys(data.cross_quota_mercato).length > 0 && (
            <div style={cardStyle}>
              <div style={headerStyle}>Quota x Mercato</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Fascia</th>
                      {Object.keys(data.breakdown_mercato).sort().map(tipo => (
                        <th key={tipo} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                          {MARKET_LABELS[tipo] || tipo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.cross_quota_mercato)
                      .filter(([band]) => band !== 'N/D')
                      .map(([band, markets]) => (
                        <tr key={band}>
                          <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ccc', fontFamily: 'monospace', fontSize: '0.9em' }}>
                            {band}
                          </td>
                          {Object.keys(data.breakdown_mercato).sort().map(tipo => (
                            <td key={tipo} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              {markets[tipo] ? <HitRateBadge data={markets[tipo]} /> : <span style={{ color: '#444' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Serie temporale */}
          {data.serie_temporale.length > 0 && (
            <div style={cardStyle}>
              <div style={headerStyle}>Andamento nel Tempo</div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', minHeight: '120px', padding: '8px 0' }}>
                  {data.serie_temporale.map((day) => {
                    const rate = day.hit_rate ?? 0;
                    const color = rate >= 65 ? '#00ff88' : rate >= 50 ? '#ffaa00' : '#ff4466';
                    return (
                      <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '28px' }}>
                        <div style={{ fontSize: '0.65em', color: '#888', marginBottom: '4px' }}>{rate}%</div>
                        <div style={{
                          width: '100%', maxWidth: '24px',
                          height: `${Math.max(rate, 5)}px`,
                          background: color, borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }} />
                        <div style={{ fontSize: '0.55em', color: '#666', marginTop: '4px', whiteSpace: 'nowrap' }}>
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Incrocio mercato × campionato */}
          {Object.keys(data.cross_mercato_campionato).length > 0 && (
            <div style={cardStyle}>
              <div style={headerStyle}>Mercato x Campionato</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Mercato</th>
                      {Object.keys(data.breakdown_campionato).sort().map(lg => (
                        <th key={lg} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                          {lg}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.cross_mercato_campionato).map(([tipo, leagues]) => (
                      <tr key={tipo}>
                        <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ccc' }}>
                          {MARKET_LABELS[tipo] || tipo}
                        </td>
                        {Object.keys(data.breakdown_campionato).sort().map(lg => (
                          <td key={lg} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {leagues[lg] ? <HitRateBadge data={leagues[lg]} /> : <span style={{ color: '#444' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== TAB ANALISI ===== */}
      {activeView === 'analisi' && data && !loading && insights && (
        <>
          {/* Panoramica */}
          {insights.panoramica.length > 0 && (
            <div style={cardStyle}>
              <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3em' }}>{'\u{1F4CB}'}</span> Panoramica
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {insights.panoramica.map((ins, i) => {
                  const borderColor = ins.type === 'positive' ? '#00ff88' : ins.type === 'negative' ? '#ff4466' : ins.type === 'warning' ? '#ffaa00' : '#00ccff';
                  return (
                    <div key={i} style={{
                      borderLeft: `3px solid ${borderColor}`,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '0 10px 10px 0',
                      padding: '14px 18px',
                    }}>
                      <div style={{ fontWeight: 'bold', color: borderColor, marginBottom: '6px', fontSize: '0.95em' }}>
                        {ins.icon} {ins.title}
                      </div>
                      <div style={{ color: '#bbb', fontSize: '0.88em', lineHeight: '1.5' }}>
                        {ins.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Punti di Forza */}
          {insights.puntiForza.length > 0 && (
            <div style={{ ...cardStyle, borderColor: 'rgba(0,255,136,0.15)' }}>
              <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: '10px', color: '#00ff88' }}>
                <span style={{ fontSize: '1.3em' }}>{'\u{2B50}'}</span> Punti di Forza
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {insights.puntiForza.map((ins, i) => (
                  <div key={i} style={{
                    borderLeft: '3px solid #00ff88',
                    background: 'rgba(0,255,136,0.03)',
                    borderRadius: '0 10px 10px 0',
                    padding: '14px 18px',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#00ff88', marginBottom: '6px', fontSize: '0.95em' }}>
                      {ins.icon} {ins.title}
                    </div>
                    <div style={{ color: '#bbb', fontSize: '0.88em', lineHeight: '1.5' }}>
                      {ins.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aree di Miglioramento */}
          {insights.miglioramento.length > 0 && (
            <div style={{ ...cardStyle, borderColor: 'rgba(255,68,102,0.15)' }}>
              <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: '10px', color: '#ff6b6b' }}>
                <span style={{ fontSize: '1.3em' }}>{'\u{1F6A9}'}</span> Aree di Miglioramento
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {insights.miglioramento.map((ins, i) => {
                  const borderColor = ins.type === 'negative' ? '#ff4466' : '#ffaa00';
                  return (
                    <div key={i} style={{
                      borderLeft: `3px solid ${borderColor}`,
                      background: ins.type === 'negative' ? 'rgba(255,68,102,0.03)' : 'rgba(255,170,0,0.03)',
                      borderRadius: '0 10px 10px 0',
                      padding: '14px 18px',
                    }}>
                      <div style={{ fontWeight: 'bold', color: borderColor, marginBottom: '6px', fontSize: '0.95em' }}>
                        {ins.icon} {ins.title}
                      </div>
                      <div style={{ color: '#bbb', fontSize: '0.88em', lineHeight: '1.5' }}>
                        {ins.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consigli Operativi */}
          {insights.consigli.length > 0 && (
            <div style={{ ...cardStyle, borderColor: 'rgba(0,200,255,0.15)' }}>
              <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: '10px', color: '#00ccff' }}>
                <span style={{ fontSize: '1.3em' }}>{'\u{1F9ED}'}</span> Consigli Operativi
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {insights.consigli.map((ins, i) => {
                  const borderColor = ins.type === 'positive' ? '#00ff88' : ins.type === 'negative' ? '#ff4466' : ins.type === 'warning' ? '#ffaa00' : '#00ccff';
                  return (
                    <div key={i} style={{
                      borderLeft: `3px solid ${borderColor}`,
                      background: 'rgba(0,200,255,0.03)',
                      borderRadius: '0 10px 10px 0',
                      padding: '14px 18px',
                    }}>
                      <div style={{ fontWeight: 'bold', color: borderColor, marginBottom: '6px', fontSize: '0.95em' }}>
                        {ins.icon} {ins.title}
                      </div>
                      <div style={{ color: '#bbb', fontSize: '0.88em', lineHeight: '1.5' }}>
                        {ins.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analisi AI — Coach AI */}
          <div style={{
            ...cardStyle,
            border: '1px solid rgba(138,43,226,0.3)',
            background: 'linear-gradient(135deg, rgba(138,43,226,0.08), rgba(0,100,255,0.05))',
          }}>
            <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: '10px', color: '#b388ff' }}>
              <span style={{ fontSize: '1.3em' }}>{'\u{1F916}'}</span> Analisi AI
            </div>
            <div style={{
              color: '#ccc', fontSize: '0.9em', lineHeight: '1.7',
              padding: '16px 20px',
              border: '1px solid rgba(138,43,226,0.15)', borderRadius: '10px',
              background: 'rgba(138,43,226,0.04)',
            }}>
              <p style={{ margin: '0 0 10px' }}>
                Vuoi un'analisi personalizzata? Apri il <strong style={{ color: '#b388ff' }}>Coach AI</strong> dalla Dashboard e chiedi:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {[
                  '"Come sta andando il sistema?"',
                  '"Quali sono i punti di forza e debolezza?"',
                  '"Cosa mi consigli di giocare oggi?"'
                ].map(q => (
                  <div key={q} style={{
                    background: 'rgba(138,43,226,0.08)', borderRadius: '8px', padding: '8px 12px',
                    fontSize: '0.85em', color: '#d1b3ff', fontStyle: 'italic'
                  }}>{q}</div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: '0.85em', color: '#999' }}>
                Il Coach analizza i dati in tempo reale e fornisce insight su misura basati sullo storico dei pronostici.
              </p>
            </div>
          </div>

          {/* Nessun insight */}
          {insights.panoramica.length === 0 && insights.puntiForza.length === 0 &&
           insights.miglioramento.length === 0 && insights.consigli.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#888', padding: '40px' }}>
              Non ci sono abbastanza dati per generare un'analisi. Prova a estendere il periodo di analisi.
            </div>
          )}
        </>
      )}

      {activeView === 'analisi' && !data && !loading && (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#888', padding: '40px' }}>
          Nessun dato disponibile. Seleziona un periodo diverso.
        </div>
      )}
    </div>
  );
}
