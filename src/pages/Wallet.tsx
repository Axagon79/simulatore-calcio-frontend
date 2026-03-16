import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';

const theme = getTheme();

interface Transaction {
  _id: string;
  type: string;
  description: string;
  credits_delta: number;
  shields_delta: number;
  amount_eur: number;
  balance_after: { credits: number; shields: number };
  created_at: string;
}

interface Summary {
  credits_acquired: number;
  credits_spent: number;
  credits_refunded: number;
  shields_current: number;
  total_eur: number;
}

const TYPE_LABELS: Record<string, string> = {
  acquisto_pacchetto: 'Acquisto pacchetto',
  pronostico_sbloccato: 'Pronostico sbloccato',
  rimborso: 'Rimborso',
  shield_attivato: 'Shield attivato',
  shield_restituito: 'Shield restituito',
  crediti_bonus_abbonamento: 'Bonus abbonamento',
};

const TYPE_ICONS: Record<string, string> = {
  acquisto_pacchetto: '+',
  pronostico_sbloccato: '-',
  rimborso: '+',
  shield_attivato: '-',
  shield_restituito: '+',
  crediti_bonus_abbonamento: '+',
};

export default function Wallet({ onBack }: { onBack: () => void }) {
  const { user, getIdToken, credits, shields, subscription } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const isLight = getThemeMode() === 'light';

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/wallet/transactions?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
      }
    } catch {
      // silenzioso
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardStyle = {
    background: theme.panel,
    border: theme.panelBorder,
    borderRadius: '12px',
    padding: '16px',
  };

  const monthName = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  return (
    <div style={{
      minHeight: '100vh',
      background: isLight ? '#f0f2f5' : theme.bg,
      fontFamily: theme.font,
      color: theme.text,
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            background: theme.surface08, border: `1px solid ${theme.surface15}`,
            borderRadius: '10px', padding: '8px 14px', color: theme.text,
            cursor: 'pointer', fontSize: '14px', fontWeight: 700,
          }}
        >
          Indietro
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>Wallet</h1>
      </div>

      {/* Saldo attuale */}
      <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: theme.cyan }}>{credits}</div>
          <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>Crediti</div>
        </div>
        <div style={{ width: '1px', background: theme.surface15 }} />
        <div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f0c040' }}>{shields}</div>
          <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>Shield</div>
        </div>
        {subscription && (
          <>
            <div style={{ width: '1px', background: theme.surface15 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: theme.success, textTransform: 'capitalize' }}>{subscription}</div>
              <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>Abbonamento</div>
            </div>
          </>
        )}
      </div>

      {/* Riepilogo mese */}
      {summary && (
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: theme.textDim, marginBottom: '12px', textTransform: 'capitalize' }}>
            Riepilogo {monthName}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', color: theme.textDim }}>Acquistati</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: theme.success }}>+{summary.credits_acquired}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: theme.textDim }}>Consumati</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: theme.danger }}>-{summary.credits_spent}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: theme.textDim }}>Rimborsati</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: theme.cyan }}>+{summary.credits_refunded}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: theme.textDim }}>Speso</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: theme.text }}>{summary.total_eur.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Storico transazioni */}
      <div style={{ ...cardStyle }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: theme.textDim, marginBottom: '12px' }}>
          Storico transazioni
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.textDim }}>Caricamento...</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.textDim, fontSize: '13px' }}>
            Nessuna transazione ancora.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.map((t) => {
              const isPositive = t.credits_delta > 0 || t.shields_delta > 0;
              const icon = TYPE_ICONS[t.type] || '?';
              const dateStr = new Date(t.created_at).toLocaleDateString('it-IT', {
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit'
              });

              return (
                <div key={t._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: '8px',
                  background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text }}>
                      {TYPE_LABELS[t.type] || t.type}
                    </div>
                    <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
                      {dateStr}
                      {t.amount_eur > 0 && <span> — {t.amount_eur.toFixed(2)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    {t.credits_delta !== 0 && (
                      <div style={{
                        fontSize: '14px', fontWeight: 700,
                        color: isPositive ? theme.success : theme.danger,
                      }}>
                        {icon}{Math.abs(t.credits_delta)} cr
                      </div>
                    )}
                    {t.shields_delta !== 0 && (
                      <div style={{
                        fontSize: '12px', fontWeight: 600,
                        color: t.shields_delta > 0 ? '#f0c040' : theme.danger,
                      }}>
                        {t.shields_delta > 0 ? '+' : ''}{t.shields_delta} sh
                      </div>
                    )}
                    <div style={{ fontSize: '9px', color: theme.textDim, marginTop: '2px' }}>
                      {t.balance_after.credits}cr / {t.balance_after.shields}sh
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
