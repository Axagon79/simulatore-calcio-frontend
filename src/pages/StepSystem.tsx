import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

// ============================================
// THEME & CONSTANTS
// ============================================

const theme = {
  bg: '#05070a',
  panel: 'rgba(18, 20, 35, 0.85)',
  panelSolid: '#0d0f1a',
  panelBorder: '1px solid rgba(0, 240, 255, 0.15)',
  cyan: '#00f0ff',
  purple: '#bc13fe',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6',
  warning: '#ff9f43',
  gold: '#ffd700',
  font: '"Inter", "Segoe UI", sans-serif',
  cellBorder: '1px solid rgba(255,255,255,0.06)',
  headerBg: 'rgba(0, 240, 255, 0.06)',
  rowEven: 'rgba(255,255,255,0.015)',
  rowOdd: 'transparent',
};

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// ============================================
// TYPES
// ============================================

interface Step {
  step_number: number;
  date: string;
  match_info: string | null;
  odds_entered: number;
  suggested_odds: number;
  suggested_amount: number;
  amount_bet: number;
  potential_win: number;
  outcome: 'won' | 'lost' | null;
  actual_pl: number;
  balance_after: number;
}

interface Session {
  _id: string;
  status: 'active' | 'completed' | 'abandoned';
  budget: number;
  target_multiplier: number;
  total_steps: number;
  odds_range: [number, number];
  daily_exposure_pct: number;
  single_bet_pct: number;
  enforce_odds_range: boolean;
  current_balance: number;
  current_step: number;
  steps_won: number;
  steps_lost: number;
  steps: Step[];
  created_at: string;
}

interface NextStepCalc {
  completed?: boolean;
  reason?: string;
  step_number: number;
  remaining_steps: number;
  remaining_target: number;
  daily_target: number;
  max_bet: number;
  max_daily_exposure: number;
  suggested_odds: number;
  odds_range_suggested: [number, number];
  suggested_amount: number;
  amount_range: [number, number];
  potential_win: number;
  progress_pct: number;
}

interface StepSystemProps {
  onBack?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function StepSystem({ onBack }: StepSystemProps) {
  const { user, getIdToken } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [nextStep, setNextStep] = useState<NextStepCalc | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form: nuovo step
  const [stepOdds, setStepOdds] = useState('');
  const [stepAmount, setStepAmount] = useState('');
  const [stepMatch, setStepMatch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form: nuova sessione
  const [newBudget, setNewBudget] = useState('200');
  const [newMultiplier, setNewMultiplier] = useState('2');
  const [newSteps, setNewSteps] = useState('15');
  const [newOddsMin, setNewOddsMin] = useState('1.25');
  const [newOddsMax, setNewOddsMax] = useState('2.50');
  const [newDailyExp, setNewDailyExp] = useState('20');
  const [newSingleBet, setNewSingleBet] = useState('15');
  const [newEnforceRange, setNewEnforceRange] = useState(false);

  // ============================================
  // API HELPERS
  // ============================================

  const authHeaders = useCallback(async () => {
    const token = await getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [getIdToken]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const h = await authHeaders();
      const res = await fetch(`${API_BASE}/step-system/sessions`, { headers: h });
      const data = await res.json();
      setSessions(data.sessions || []);

      // Trova sessione attiva
      const active = (data.sessions || []).find((s: Session) => s.status === 'active');
      if (active) {
        // Carica dettaglio completo
        const detRes = await fetch(`${API_BASE}/step-system/sessions/${active._id}`, { headers: h });
        const detData = await detRes.json();
        setActiveSession(detData.session);

        // Calcola prossimo step
        const calcRes = await fetch(`${API_BASE}/step-system/sessions/${active._id}/calculate`, { headers: h });
        const calcData = await calcRes.json();
        setNextStep(calcData.nextStep);
      } else {
        setActiveSession(null);
        setNextStep(null);
      }
    } catch (err) {
      console.error('loadSessions error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authHeaders]);

  useEffect(() => {
    if (user) loadSessions();
    else setLoading(false);
  }, [user, loadSessions]);

  // Auth gate
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Step System</h2>
        <p style={{ color: theme.textDim, marginBottom: '24px' }}>Accedi per utilizzare lo Step System</p>
        <button onClick={() => setShowAuthModal(true)} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan }}>
          Accedi
        </button>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        {onBack && <button onClick={onBack} style={{ ...btnStyle, marginTop: '12px', background: 'rgba(255,255,255,0.05)', color: theme.textDim }}>Indietro</button>}
      </div>
    );
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreateSession = async () => {
    try {
      setSubmitting(true);
      const h = await authHeaders();
      const body = {
        budget: parseFloat(newBudget),
        target_multiplier: parseFloat(newMultiplier),
        total_steps: parseInt(newSteps),
        odds_range: [parseFloat(newOddsMin), parseFloat(newOddsMax)],
        daily_exposure_pct: parseFloat(newDailyExp) / 100,
        single_bet_pct: parseFloat(newSingleBet) / 100,
        enforce_odds_range: newEnforceRange,
      };
      const res = await fetch(`${API_BASE}/step-system/sessions`, {
        method: 'POST', headers: h, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setShowCreateForm(false);
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert('Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStep = async (outcome: 'won' | 'lost') => {
    if (!activeSession || !stepOdds || !stepAmount) return;
    try {
      setSubmitting(true);
      const h = await authHeaders();
      const body = {
        odds_entered: parseFloat(stepOdds),
        amount_bet: parseFloat(stepAmount),
        outcome,
        match_info: stepMatch || null,
      };
      const res = await fetch(`${API_BASE}/step-system/sessions/${activeSession._id}/steps`, {
        method: 'POST', headers: h, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setStepOdds('');
      setStepAmount('');
      setStepMatch('');
      await loadSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (reason: string) => {
    if (!activeSession) return;
    if (!confirm(reason === 'abandoned' ? 'Vuoi abbandonare questa sessione?' : 'Vuoi chiudere questa sessione come completata?')) return;
    try {
      const h = await authHeaders();
      await fetch(`${API_BASE}/step-system/sessions/${activeSession._id}/close`, {
        method: 'POST', headers: h, body: JSON.stringify({ reason })
      });
      await loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  // ============================================
  // COMPUTED
  // ============================================

  const targetBalance = activeSession ? activeSession.budget + (activeSession.target_multiplier * activeSession.budget) : 0;
  const progressPct = activeSession ? Math.max(0, Math.min(100, ((activeSession.current_balance - activeSession.budget) / (activeSession.target_multiplier * activeSession.budget)) * 100)) : 0;
  const pastSessions = sessions.filter(s => s.status !== 'active');

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Caricamento...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font }}>
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.cyan, cursor: 'pointer', fontSize: '18px' }}>◀</button>
          )}
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
            <span style={{ color: theme.cyan }}>Step</span> System
          </h1>
        </div>
        {!activeSession && (
          <button onClick={() => setShowCreateForm(true)} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan, fontWeight: '700' }}>
            + Nuova Sessione
          </button>
        )}
      </div>

      {/* CREATE SESSION FORM */}
      {showCreateForm && (
        <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', color: theme.cyan, fontSize: '16px' }}>Nuova Sessione</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Budget iniziale (€)</label>
              <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Moltiplicatore guadagno (×)</label>
              <input type="number" step="0.1" value={newMultiplier} onChange={e => setNewMultiplier(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '4px' }}>
                Target: €{newBudget} → €{(parseFloat(newBudget || '0') + parseFloat(newMultiplier || '0') * parseFloat(newBudget || '0')).toFixed(0)} (+€{(parseFloat(newMultiplier || '0') * parseFloat(newBudget || '0')).toFixed(0)})
              </div>
            </div>
            <div>
              <label style={labelStyle}>Numero step</label>
              <input type="number" value={newSteps} onChange={e => setNewSteps(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Range quote</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" step="0.05" value={newOddsMin} onChange={e => setNewOddsMin(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Min" />
                <input type="number" step="0.05" value={newOddsMax} onChange={e => setNewOddsMax(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Max" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Esposizione giornaliera (%)</label>
              <input type="number" value={newDailyExp} onChange={e => setNewDailyExp(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Limite singola puntata (%)</label>
              <input type="number" value={newSingleBet} onChange={e => setNewSingleBet(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={newEnforceRange} onChange={e => setNewEnforceRange(e.target.checked)} />
            <label style={{ color: theme.textDim, fontSize: '13px' }}>Forza range quote (suggerimenti limitati al range)</label>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={handleCreateSession} disabled={submitting} style={{ ...btnStyle, background: 'rgba(5,249,182,0.15)', color: theme.success, fontWeight: '700', flex: 1 }}>
              {submitting ? 'Creando...' : 'Crea Sessione'}
            </button>
            <button onClick={() => setShowCreateForm(false)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.05)', color: theme.textDim }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE SESSION */}
      {activeSession && (
        <>
          {/* DASHBOARD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <StatCard label="Saldo" value={`€${activeSession.current_balance.toFixed(2)}`} color={activeSession.current_balance >= activeSession.budget ? theme.success : theme.danger} />
            <StatCard label="Target" value={`€${targetBalance.toFixed(0)}`} color={theme.gold} />
            <StatCard label="Step" value={`${activeSession.current_step}/${activeSession.total_steps}`} color={theme.cyan} />
            <StatCard label="W/L" value={`${activeSession.steps_won}/${activeSession.steps_lost}`} color={theme.text} />
            {nextStep && !nextStep.completed && (
              <>
                <StatCard label="Media/Step" value={`€${nextStep.daily_target.toFixed(2)}`} color={theme.warning} />
                <StatCard label="Max Puntata" value={`€${nextStep.max_bet.toFixed(2)}`} color={theme.purple} />
              </>
            )}
          </div>

          {/* PROGRESS BAR */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textDim, marginBottom: '4px' }}>
              <span>€{activeSession.budget}</span>
              <span style={{ color: progressPct > 0 ? theme.success : theme.danger }}>
                {progressPct > 0 ? '+' : ''}{progressPct.toFixed(1)}%
              </span>
              <span>€{targetBalance.toFixed(0)}</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, progressPct))}%`,
                background: progressPct >= 100 ? theme.success : `linear-gradient(90deg, ${theme.cyan}, ${theme.purple})`,
                borderRadius: '4px',
                transition: 'width 0.5s'
              }} />
            </div>
          </div>

          {/* NEXT STEP SUGGESTION */}
          {nextStep && !nextStep.completed && (
            <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: theme.cyan }}>
                Step {nextStep.step_number} — Suggerimento
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={suggBox}>
                  <div style={{ fontSize: '11px', color: theme.textDim }}>Quota consigliata</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: theme.gold }}>{nextStep.suggested_odds}</div>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>
                    ({nextStep.odds_range_suggested[0]} - {nextStep.odds_range_suggested[1]})
                  </div>
                </div>
                <div style={suggBox}>
                  <div style={{ fontSize: '11px', color: theme.textDim }}>Importo consigliato</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: theme.success }}>€{nextStep.suggested_amount}</div>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>
                    (€{nextStep.amount_range[0]} - €{nextStep.amount_range[1]})
                  </div>
                </div>
                <div style={suggBox}>
                  <div style={{ fontSize: '11px', color: theme.textDim }}>Vincita potenziale</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: theme.warning }}>€{nextStep.potential_win}</div>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>
                    Mancano €{nextStep.remaining_target}
                  </div>
                </div>
              </div>

              {/* INPUT FIELDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Quota</label>
                  <input type="number" step="0.01" value={stepOdds} onChange={e => setStepOdds(e.target.value)} placeholder={String(nextStep.suggested_odds)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Importo (€)</label>
                  <input type="number" step="0.01" value={stepAmount} onChange={e => setStepAmount(e.target.value)} placeholder={String(nextStep.suggested_amount)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Partita (opzionale)</label>
                  <input type="text" value={stepMatch} onChange={e => setStepMatch(e.target.value)} placeholder="es. Juventus - Milan" style={inputStyle} />
                </div>
              </div>

              {/* OUTCOME BUTTONS */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleAddStep('won')}
                  disabled={submitting || !stepOdds || !stepAmount}
                  style={{ ...btnStyle, flex: 1, background: 'rgba(5,249,182,0.15)', color: theme.success, fontWeight: '700', fontSize: '15px', padding: '12px', opacity: (!stepOdds || !stepAmount) ? 0.4 : 1 }}
                >
                  {submitting ? '...' : 'VINTO'}
                </button>
                <button
                  onClick={() => handleAddStep('lost')}
                  disabled={submitting || !stepOdds || !stepAmount}
                  style={{ ...btnStyle, flex: 1, background: 'rgba(255,42,109,0.15)', color: theme.danger, fontWeight: '700', fontSize: '15px', padding: '12px', opacity: (!stepOdds || !stepAmount) ? 0.4 : 1 }}
                >
                  {submitting ? '...' : 'PERSO'}
                </button>
              </div>
            </div>
          )}

          {/* SESSION COMPLETED */}
          {nextStep?.completed && (
            <div style={{ background: theme.panel, border: `1px solid ${nextStep.reason === 'target_reached' ? theme.success : theme.danger}`, borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {nextStep.reason === 'target_reached' ? '🎯' : nextStep.reason === 'budget_depleted' ? '💸' : '📊'}
              </div>
              <h3 style={{ color: nextStep.reason === 'target_reached' ? theme.success : theme.danger, margin: '0 0 8px' }}>
                {nextStep.reason === 'target_reached' ? 'Obiettivo Raggiunto!' : nextStep.reason === 'budget_depleted' ? 'Budget Esaurito' : 'Step Esauriti'}
              </h3>
              <p style={{ color: theme.textDim, fontSize: '13px', margin: '0 0 16px' }}>
                Saldo finale: €{activeSession.current_balance.toFixed(2)} | P/L: {activeSession.current_balance - activeSession.budget >= 0 ? '+' : ''}{(activeSession.current_balance - activeSession.budget).toFixed(2)}€
              </p>
              <button onClick={() => handleCloseSession('completed')} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan }}>
                Chiudi Sessione
              </button>
            </div>
          )}

          {/* STEP HISTORY */}
          {activeSession.steps.length > 0 && (
            <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '12px 16px', borderBottom: theme.cellBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: theme.text }}>Storico Step</h3>
                <span style={{ fontSize: '11px', color: theme.textDim }}>
                  {activeSession.steps_won}W - {activeSession.steps_lost}L
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: theme.headerBg }}>
                      {['#', 'Data', 'Partita', 'Quota', 'Importo', 'Vincita', 'Esito', 'Saldo'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: theme.textDim, fontWeight: '600', borderBottom: theme.cellBorder, fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeSession.steps].reverse().map((s, i) => (
                      <tr key={s.step_number} style={{ background: i % 2 === 0 ? theme.rowEven : theme.rowOdd }}>
                        <td style={cellStyle}>{s.step_number}</td>
                        <td style={cellStyle}>{new Date(s.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</td>
                        <td style={{ ...cellStyle, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.match_info || '-'}</td>
                        <td style={cellStyle}>{s.odds_entered.toFixed(2)}</td>
                        <td style={cellStyle}>€{s.amount_bet.toFixed(2)}</td>
                        <td style={{ ...cellStyle, color: s.actual_pl >= 0 ? theme.success : theme.danger }}>
                          {s.actual_pl >= 0 ? '+' : ''}{s.actual_pl.toFixed(2)}€
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>
                          {s.outcome === 'won' ? <span style={{ color: theme.success }}>W</span> : s.outcome === 'lost' ? <span style={{ color: theme.danger }}>L</span> : <span style={{ color: theme.textDim }}>-</span>}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: '600' }}>€{s.balance_after.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CLOSE/ABANDON BUTTON */}
          {activeSession.status === 'active' && !nextStep?.completed && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <button onClick={() => handleCloseSession('abandoned')} style={{ ...btnStyle, background: 'rgba(255,42,109,0.08)', color: theme.danger, fontSize: '12px' }}>
                Abbandona Sessione
              </button>
            </div>
          )}
        </>
      )}

      {/* NO ACTIVE SESSION */}
      {!activeSession && !showCreateForm && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textDim }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📈</div>
          <p style={{ fontSize: '15px', marginBottom: '8px' }}>Nessuna sessione attiva</p>
          <p style={{ fontSize: '12px', marginBottom: '20px' }}>Crea una nuova sessione per iniziare il percorso a step</p>
          <button onClick={() => setShowCreateForm(true)} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan, fontWeight: '700' }}>
            + Nuova Sessione
          </button>
        </div>
      )}

      {/* PAST SESSIONS */}
      {pastSessions.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <button onClick={() => setShowHistory(!showHistory)} style={{ ...btnStyle, width: '100%', background: 'rgba(255,255,255,0.03)', color: theme.textDim, display: 'flex', justifyContent: 'space-between', padding: '10px 16px' }}>
            <span>Sessioni Precedenti ({pastSessions.length})</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pastSessions.map(s => {
                const pl = s.current_balance - s.budget;
                return (
                  <div key={s._id} style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>
                        €{s.budget} → €{s.current_balance.toFixed(2)}
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: pl >= 0 ? theme.success : theme.danger }}>
                          ({pl >= 0 ? '+' : ''}{pl.toFixed(2)}€)
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>
                        {s.current_step}/{s.total_steps} step | {s.steps_won}W-{s.steps_lost}L | {new Date(s.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px',
                      background: s.status === 'completed' ? 'rgba(5,249,182,0.1)' : 'rgba(255,159,67,0.1)',
                      color: s.status === 'completed' ? theme.success : theme.warning
                    }}>
                      {s.status === 'completed' ? 'Completata' : 'Abbandonata'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
    </div>
  );
}

// ============================================
// SHARED STYLES
// ============================================

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  background: 'transparent',
  transition: 'all 0.2s',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#8b9bb4',
  marginBottom: '4px',
  fontWeight: '600',
};

const cellStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  whiteSpace: 'nowrap',
};

const suggBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  padding: '10px',
  textAlign: 'center',
};

// Small reusable stat card
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(18,20,35,0.85)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: '#8b9bb4', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color }}>{value}</div>
    </div>
  );
}
