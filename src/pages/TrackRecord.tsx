import { useState, useEffect, useCallback } from 'react';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

interface HitRateData {
  total: number;
  hits: number;
  misses: number;
  hit_rate: number | null;
}

interface TrackRecordResponse {
  success: boolean;
  periodo: { from: string; to: string };
  globale: HitRateData;
  breakdown_mercato: Record<string, HitRateData>;
  breakdown_campionato: Record<string, HitRateData>;
  breakdown_confidence: Record<string, HitRateData>;
  breakdown_stelle: Record<string, HitRateData>;
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

// Nomi mercato leggibili
const MARKET_LABELS: Record<string, string> = {
  'SEGNO': '1X2 (Segno)',
  'DOPPIA_CHANCE': 'Doppia Chance',
  'OVER_UNDER': 'Over/Under',
  'GG_NG': 'Goal/NoGoal',
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = getDateRange();
        let url = `${API_BASE}/simulation/track-record?from=${from}&to=${to}`;
        if (filtroLeague) url += `&league=${encodeURIComponent(filtroLeague)}`;
        if (filtroMarket) url += `&market=${encodeURIComponent(filtroMarket)}`;

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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [periodo, filtroLeague, filtroMarket, getDateRange]);

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

      {data && !loading && (
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
    </div>
  );
}
