import { useState, useEffect } from 'react';

const theme = {
  bg: '#05070a',
  panel: 'rgba(18, 20, 35, 0.85)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.2)',
  cyan: '#00f0ff',
  purple: '#bc13fe',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6',
  warning: '#ff9f43',
  gold: '#ffd700',
  font: '"Inter", "Segoe UI", sans-serif'
};

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

interface StatsBlock {
  count: number;
  won: number;
  lost: number;
  hr: number;
  total_stake: number;
  profit_loss: number;
  yield: number;
}

interface BankrollData {
  globale: StatsBlock;
  byMercato: Record<string, StatsBlock>;
  byStake: Record<string, StatsBlock>;
  byLeague: Record<string, StatsBlock>;
  temporal: {
    last7: StatsBlock;
    last30: StatsBlock;
    last90: StatsBlock;
    byMonth: Record<string, StatsBlock>;
  };
  cumulativeChart: Array<{ date: string; pl: number }>;
}

const plColor = (v: number) => v > 0 ? theme.success : v < 0 ? theme.danger : theme.textDim;
const plSign = (v: number) => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);

const getStakeLabel = (s: string) => {
  const m: Record<string, string> = { '0': 'No Value', '1': 'Prudenziale', '2': 'Standard', '3': 'Buona', '4-5': 'Alta/Top', '6+': 'Sure Bet' };
  return m[s] || s;
};

export default function Bankroll({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<BankrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/simulation/bankroll-stats?from=2026-02-10`)
      .then(r => {
        if (!r.ok) throw new Error(`Errore server: ${r.status}`);
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Endpoint non disponibile (risposta non JSON)');
        return r.json();
      })
      .then(json => {
        if (json.success && json.data) setData(json.data);
        else setError(json.message || 'Nessun dato');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: theme.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: theme.font }}>
      <div style={{ color: theme.cyan, fontSize: '18px' }}>Caricamento statistiche...</div>
    </div>
  );

  if (error || !data) return (
    <div style={{ background: theme.bg, minHeight: '100vh', padding: '40px', fontFamily: theme.font }}>
      <div style={{ color: theme.danger, fontSize: '16px', textAlign: 'center' }}>{error || 'Nessun dato disponibile. Esegui prima il backfill.'}</div>
      {onBack && <button onClick={onBack} style={{ marginTop: '20px', background: theme.cyan, color: '#000', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', display: 'block', margin: '20px auto' }}>Torna indietro</button>}
    </div>
  );

  const g = data.globale;

  // Tabella helper
  const StatsTable = ({ title, items, keyLabel }: { title: string; items: [string, StatsBlock][]; keyLabel: string }) => (
    <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <h3 style={{ color: theme.cyan, fontSize: '14px', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: theme.textDim }}>{keyLabel}</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>Pronos.</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>HR%</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>Stake</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>P/L</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>Yield%</th>
            </tr>
          </thead>
          <tbody>
            {items.map(([key, s]) => (
              <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '6px 8px', color: theme.text, fontWeight: '600' }}>{key}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>{s.count}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: s.hr >= 60 ? theme.success : s.hr >= 50 ? theme.warning : theme.danger, fontWeight: '700' }}>{s.hr}%</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: theme.textDim }}>{s.total_stake}u</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: plColor(s.profit_loss), fontWeight: '700' }}>{plSign(s.profit_loss)}u</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: plColor(s.yield), fontWeight: '700' }}>{s.yield > 0 ? '+' : ''}{s.yield}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', fontFamily: theme.font }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: theme.text, fontSize: '22px', fontWeight: '900', margin: 0 }}>
          Bankroll & ROI
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.location.href = '/money-management'}
            style={{
              background: 'rgba(255,215,0,0.1)',
              border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd700',
              padding: '6px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '12px', fontWeight: '700'
            }}
          >
            📖 Come funziona?
          </button>
          {onBack && <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', color: theme.textDim, border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Indietro</button>}
        </div>
      </div>

      {/* Riepilogo globale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Pronostici', value: `${g.count}`, color: theme.cyan },
          { label: 'Vinti/Persi', value: `${g.won}/${g.lost}`, color: theme.text },
          { label: 'HR%', value: `${g.hr}%`, color: g.hr >= 60 ? theme.success : g.hr >= 50 ? theme.warning : theme.danger },
          { label: 'Stake Totale', value: `${g.total_stake}u`, color: theme.textDim },
          { label: 'Profitto/Perdita', value: `${plSign(g.profit_loss)}u`, color: plColor(g.profit_loss) },
          { label: 'Yield', value: `${g.yield > 0 ? '+' : ''}${g.yield}%`, color: plColor(g.yield) },
        ].map((item, i) => (
          <div key={i} style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: theme.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Performance temporale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Ultimi 90 giorni', s: data.temporal.last90 },
          { label: 'Ultimi 30 giorni', s: data.temporal.last30 },
          { label: 'Ultimi 7 giorni', s: data.temporal.last7 },
        ].map((item, i) => (
          <div key={i} style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: theme.textDim, marginBottom: '6px' }}>{item.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: plColor(item.s.profit_loss) }}>{plSign(item.s.profit_loss)}u</div>
            <div style={{ fontSize: '11px', color: theme.textDim }}>{item.s.count} pronos. | HR {item.s.hr}% | Y {item.s.yield > 0 ? '+' : ''}{item.s.yield}%</div>
          </div>
        ))}
      </div>

      {/* Breakdown per mercato */}
      <StatsTable title="Per Mercato" keyLabel="Mercato" items={Object.entries(data.byMercato).sort((a, b) => b[1].count - a[1].count)} />

      {/* Breakdown per stake */}
      <StatsTable title="Per Livello Stake" keyLabel="Stake" items={Object.entries(data.byStake).map(([k, v]) => [`${k} - ${getStakeLabel(k)}`, v])} />

      {/* Per campionato */}
      <StatsTable title="Per Campionato" keyLabel="Campionato" items={Object.entries(data.byLeague).sort((a, b) => b[1].count - a[1].count)} />

      {/* Per mese */}
      <StatsTable title="Per Mese" keyLabel="Mese" items={Object.entries(data.temporal.byMonth).sort((a, b) => b[0].localeCompare(a[0]))} />

      {/* Grafico profitto cumulativo */}
      {data.cumulativeChart.length > 0 && (
        <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ color: theme.cyan, fontSize: '14px', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profitto Cumulativo</h3>
          <div style={{ height: '200px', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '1px' }}>
            {(() => {
              const chart = data.cumulativeChart;
              const maxAbs = Math.max(...chart.map(c => Math.abs(c.pl)), 1);
              const zeroY = 50; // percentuale
              return chart.map((c, i) => {
                const pct = (c.pl / maxAbs) * 45;
                const isPositive = c.pl >= 0;
                return (
                  <div key={i} style={{
                    flex: 1,
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }} title={`${c.date}: ${plSign(c.pl)}u`}>
                    <div style={{
                      position: 'absolute',
                      bottom: isPositive ? `${zeroY}%` : `${zeroY + pct}%`,
                      height: `${Math.abs(pct)}%`,
                      width: '100%',
                      background: isPositive ? theme.success + '60' : theme.danger + '60',
                      borderRadius: '1px',
                      minHeight: '1px',
                    }} />
                  </div>
                );
              });
            })()}
            {/* Linea zero */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: '50%', height: '1px', background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: theme.textDim, marginTop: '4px' }}>
            <span>{data.cumulativeChart[0]?.date}</span>
            <span>{data.cumulativeChart[data.cumulativeChart.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Export CSV */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button
          onClick={() => {
            // Fetch all data and export
            fetch(`${API_BASE}/simulation/bankroll-stats?from=2026-02-10`)
              .then(r => r.json())
              .then(json => {
                if (!json.data) return;
                const d = json.data;
                const headers = 'Mercato,Pronostici,Vinti,HR%,Stake,P/L,Yield%\n';
                const rows = Object.entries(d.byMercato).map(([m, s]: [string, any]) =>
                  `${m},${s.count},${s.won},${s.hr}%,${s.total_stake},${s.profit_loss},${s.yield}%`
                ).join('\n');
                const csv = headers + rows;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `puppals_bankroll_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              });
          }}
          style={{
            background: 'rgba(0,240,255,0.1)',
            border: `1px solid ${theme.cyan}40`,
            color: theme.cyan,
            padding: '8px 24px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '13px', fontWeight: '700'
          }}
        >
          Esporta CSV
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: 'rgba(255,42,109,0.05)',
        border: '1px solid rgba(255,42,109,0.15)',
        borderRadius: '10px', padding: '16px', marginBottom: '20px',
        fontSize: '11px', color: theme.textDim, lineHeight: 1.6
      }}>
        <div style={{ fontWeight: '800', color: theme.danger, marginBottom: '8px', fontSize: '12px' }}>Avvertenze importanti</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li><strong>Il gioco d'azzardo puo causare dipendenza.</strong> Gioca responsabilmente.</li>
          <li>Questo servizio e riservato a maggiorenni (18+).</li>
          <li>Le statistiche e i pronostici non costituiscono garanzia di profitto.</li>
          <li>Non puntare mai denaro che non puoi permetterti di perdere.</li>
          <li>I risultati passati non garantiscono rendimenti futuri.</li>
        </ul>
        <div style={{ marginTop: '8px' }}>
          <strong>Hai bisogno di aiuto?</strong> Numero Verde: <span style={{ color: theme.cyan }}>800 55 88 22</span>
        </div>
      </div>
      </div>
    </div>
  );
}
