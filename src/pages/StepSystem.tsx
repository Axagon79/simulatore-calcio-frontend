import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import infoIcon from '../assets/info-icon.png';

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

const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  || window.location.hostname.startsWith('192.168.');
const API_BASE = isLocal
  ? `http://${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:5001/puppals-456c7/us-central1/api`
  : 'https://api-6b34yfzjia-uc.a.run.app';

const MAX_OPEN_TABS = 5;

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
  name: string;
  status: 'active' | 'completed' | 'abandoned';
  budget: number;
  target_multiplier: number;
  total_steps: number;
  odds_range: [number, number];
  daily_exposure_pct: number;
  single_bet_pct: number;
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

interface TabFormState {
  odds: string;
  amount: string;
  match: string;
}

interface StepSystemProps {
  onBack?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function StepSystem({ onBack }: StepSystemProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const { user, getIdToken } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Session list (summary, no steps)
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab system
  const [openTabs, setOpenTabs] = useState<string[]>([]); // session IDs
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [tabDetails, setTabDetails] = useState<Record<string, Session>>({});
  const [tabNextSteps, setTabNextSteps] = useState<Record<string, NextStepCalc>>({});
  const [tabForms, setTabForms] = useState<Record<string, TabFormState>>({});

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('200');
  const [newMultiplier, setNewMultiplier] = useState('100');
  const [newSteps, setNewSteps] = useState('15');
  const [newOddsMin, setNewOddsMin] = useState('1.25');
  const [newOddsMax, setNewOddsMax] = useState('2.50');
  const [newDailyExp, setNewDailyExp] = useState('20');
  const [newSingleBet, setNewSingleBet] = useState('15');

  // Prefill da sessionStorage (Flusso 1: da DailyPredictions)
  const [prefillData, setPrefillData] = useState<{match: string, odds: string} | null>(null);

  // Match picker (Flusso 2: scegli partita)
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const [matchPickerPredictions, setMatchPickerPredictions] = useState<any[]>([]);
  const [matchPickerLoading, setMatchPickerLoading] = useState(false);
  const [matchPickerSearch, setMatchPickerSearch] = useState('');

  // ============================================
  // API HELPERS
  // ============================================

  const authHeaders = useCallback(async () => {
    const token = await getIdToken();
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  }, [getIdToken]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const h = await authHeaders();
      const res = await fetch(`${API_BASE}/step-system/sessions`, { headers: h });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('loadSessions error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authHeaders]);

  const loadTabDetail = useCallback(async (sessionId: string) => {
    try {
      const h = await authHeaders();
      const [detRes, calcRes] = await Promise.all([
        fetch(`${API_BASE}/step-system/sessions/${sessionId}`, { headers: h }),
        fetch(`${API_BASE}/step-system/sessions/${sessionId}/calculate`, { headers: h }).catch(() => null),
      ]);
      const detData = await detRes.json();
      if (detData.session) {
        setTabDetails(prev => ({ ...prev, [sessionId]: detData.session }));
      }
      if (calcRes && calcRes.ok) {
        const calcData = await calcRes.json();
        if (calcData.nextStep) {
          setTabNextSteps(prev => ({ ...prev, [sessionId]: calcData.nextStep }));
        }
      }
    } catch (err) {
      console.error('loadTabDetail error:', err);
    }
  }, [authHeaders]);

  const fetchTodayPredictions = useCallback(async () => {
    setMatchPickerLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/simulation/daily-predictions-unified?date=${today}`);
      const data = await res.json();
      if (data.success && data.predictions) {
        const upcoming = data.predictions.filter((p: any) => !p.real_score);
        setMatchPickerPredictions(upcoming);
      }
    } catch (err) {
      console.error('fetchTodayPredictions error:', err);
    } finally {
      setMatchPickerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadSessions();
    else setLoading(false);
  }, [user, loadSessions]);

  // Leggi prefill da sessionStorage (Flusso 1)
  useEffect(() => {
    const raw = sessionStorage.getItem('stepSystemPrefill');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setPrefillData(data);
        sessionStorage.removeItem('stepSystemPrefill');
      } catch { /* ignore */ }
    }
  }, []);

  // Applica prefill quando un tab attivo è aperto
  useEffect(() => {
    if (!prefillData || !selectedTab) return;
    const session = tabDetails[selectedTab];
    if (!session) return;
    if (session.status === 'active') {
      updateTabForm(selectedTab, 'match', prefillData.match);
      updateTabForm(selectedTab, 'odds', prefillData.odds);
      setPrefillData(null);
    }
  }, [prefillData, selectedTab, tabDetails]);

  // ============================================
  // TAB MANAGEMENT
  // ============================================

  const openSession = async (sessionId: string) => {
    if (openTabs.includes(sessionId)) {
      setSelectedTab(sessionId);
      return;
    }
    if (openTabs.length >= MAX_OPEN_TABS) {
      alert(`Puoi avere al massimo ${MAX_OPEN_TABS} sessioni aperte contemporaneamente.`);
      return;
    }
    setOpenTabs(prev => [...prev, sessionId]);
    setSelectedTab(sessionId);
    if (!tabForms[sessionId]) {
      setTabForms(prev => ({ ...prev, [sessionId]: { odds: '', amount: '', match: '' } }));
    }
    await loadTabDetail(sessionId);
  };

  const closeTab = (sessionId: string) => {
    const form = tabForms[sessionId];
    const isDirty = form && (form.odds || form.amount || form.match);
    if (isDirty) {
      if (!confirm('Hai dati non salvati in questa sessione. Vuoi chiudere comunque?')) return;
    }
    setOpenTabs(prev => {
      const next = prev.filter(id => id !== sessionId);
      if (selectedTab === sessionId) {
        setSelectedTab(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
    // Cleanup
    setTabDetails(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
    setTabNextSteps(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
    setTabForms(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreateSession = async () => {
    try {
      setSubmitting(true);
      const h = await authHeaders();
      const body = {
        name: newName.trim() || `Sessione ${sessions.length + 1}`,
        budget: parseFloat(newBudget),
        target_multiplier: parseFloat(newMultiplier) / 100,
        total_steps: parseInt(newSteps),
        odds_range: [parseFloat(newOddsMin), parseFloat(newOddsMax)],
        daily_exposure_pct: parseFloat(newDailyExp) / 100,
        single_bet_pct: parseFloat(newSingleBet) / 100,
      };
      const res = await fetch(`${API_BASE}/step-system/sessions`, {
        method: 'POST', headers: h, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setShowCreateForm(false);
      setNewName('');
      await loadSessions();
      // Auto-open the new session
      if (data.session?._id) {
        await openSession(data.session._id);
      }
    } catch (err) {
      console.error(err);
      alert('Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStep = async (sessionId: string, outcome: 'won' | 'lost' | null) => {
    const form = tabForms[sessionId];
    if (!form?.odds || !form?.amount) return;
    try {
      setSubmitting(true);
      const h = await authHeaders();
      const body: any = {
        odds_entered: parseFloat(form.odds),
        amount_bet: parseFloat(form.amount),
        match_info: form.match || null,
      };
      if (outcome) body.outcome = outcome;
      const res = await fetch(`${API_BASE}/step-system/sessions/${sessionId}/steps`, {
        method: 'POST', headers: h, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      // Reset form
      setTabForms(prev => ({ ...prev, [sessionId]: { odds: '', amount: '', match: '' } }));
      // Reload session detail + session list
      await Promise.all([loadTabDetail(sessionId), loadSessions()]);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveStep = async (sessionId: string, stepNum: number, outcome: 'won' | 'lost') => {
    try {
      setSubmitting(true);
      const h = await authHeaders();
      const res = await fetch(`${API_BASE}/step-system/sessions/${sessionId}/steps/${stepNum}/result`, {
        method: 'PUT', headers: h, body: JSON.stringify({ outcome })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      await Promise.all([loadTabDetail(sessionId), loadSessions()]);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (sessionId: string, reason: string) => {
    const msg = reason === 'abandoned' ? 'Vuoi abbandonare questa sessione?' : 'Vuoi chiudere questa sessione come completata?';
    if (!confirm(msg)) return;
    try {
      const h = await authHeaders();
      await fetch(`${API_BASE}/step-system/sessions/${sessionId}/close`, {
        method: 'POST', headers: h, body: JSON.stringify({ reason })
      });
      await Promise.all([loadTabDetail(sessionId), loadSessions()]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler ELIMINARE definitivamente questa sessione? Questa azione non può essere annullata.')) return;
    try {
      const h = await authHeaders();
      const res = await fetch(`${API_BASE}/step-system/sessions/${sessionId}`, {
        method: 'DELETE', headers: h
      });
      if (!res.ok) { const data = await res.json(); alert(data.error); return; }
      // Close tab if open
      if (openTabs.includes(sessionId)) {
        closeTab(sessionId);
      }
      await loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const updateTabForm = (sessionId: string, field: keyof TabFormState, value: string) => {
    setTabForms(prev => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || { odds: '', amount: '', match: '' }), [field]: value }
    }));
  };

  // ============================================
  // AUTH GATE
  // ============================================

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Step System</h2>
        <p style={{ color: theme.textDim, marginBottom: '24px' }}>Accedi per utilizzare lo Step System</p>
        <button onClick={() => setShowAuthModal(true)} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan }}>
          Accedi
        </button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        {onBack && <button onClick={onBack} style={{ ...btnStyle, marginTop: '12px', background: 'rgba(255,255,255,0.05)', color: theme.textDim }}>Indietro</button>}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Caricamento...
      </div>
    );
  }

  // Currently viewed session
  const currentSession = selectedTab ? tabDetails[selectedTab] : null;
  const currentNextStep = selectedTab ? tabNextSteps[selectedTab] : null;
  const currentForm = selectedTab ? (tabForms[selectedTab] || { odds: '', amount: '', match: '' }) : null;

  const targetBalance = currentSession ? currentSession.budget + (currentSession.target_multiplier * currentSession.budget) : 0;
  const progressPct = currentSession ? Math.max(0, Math.min(100, ((currentSession.current_balance - currentSession.budget) / (currentSession.target_multiplier * currentSession.budget)) * 100)) : 0;

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font }}>
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>

      {/* HEADER — sticky su mobile */}
      <div style={isMobile ? { position: 'sticky', top: 0, zIndex: 100, background: theme.bg, paddingBottom: '8px', marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px' } : {}}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.cyan, cursor: 'pointer', fontSize: '18px' }}>◀</button>}
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
              <span style={{ color: theme.cyan }}>Step</span> System
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowCreateForm(true)} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan, fontWeight: '700' }}>
              + Nuova
            </button>
            <div
              onClick={() => setShowInfo(true)}
              style={{
                width: '40px', height: '40px',
                marginTop: '2px',
                background: 'rgba(255,255,255,0.18)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            >
              <img src={infoIcon} alt="Info" style={{ width: '26px', height: '26px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* INFO MODAL */}
      {showInfo && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowInfo(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0d0f1a', border: `1px solid ${theme.gold}40`, borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}
          >
            <button onClick={() => setShowInfo(false)} style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '20px' }}>×</button>

            <h2 style={{ color: theme.gold, fontSize: '20px', fontWeight: '800', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>📈</span> Come funziona?
            </h2>

            <div style={{ color: theme.textDim, fontSize: '13px', lineHeight: 1.8 }}>
              <p style={{ color: theme.text, fontWeight: '600', marginBottom: '12px' }}>
                Lo Step System ti aiuta a raggiungere un obiettivo di guadagno in modo graduale e controllato.
              </p>

              <div style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.1)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', color: theme.cyan, marginBottom: '8px', fontSize: '14px' }}>Il concetto</div>
                <p>Imposti un <strong style={{ color: theme.text }}>budget iniziale</strong> e un <strong style={{ color: theme.text }}>obiettivo di guadagno</strong> (es. +100% = raddoppiare). Il sistema divide il percorso in <strong style={{ color: theme.text }}>step</strong> e ad ogni step ti suggerisce <strong style={{ color: theme.text }}>quanto puntare</strong> e a <strong style={{ color: theme.text }}>quale quota</strong>.</p>
              </div>

              <div style={{ background: 'rgba(5,249,182,0.04)', border: '1px solid rgba(5,249,182,0.1)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', color: theme.success, marginBottom: '8px', fontSize: '14px' }}>Come funziona il ricalcolo</div>
                <p>Se <strong style={{ color: theme.success }}>vinci</strong>, il prossimo step richiede meno perché sei più vicino all'obiettivo.</p>
                <p>Se <strong style={{ color: theme.danger }}>perdi</strong>, la perdita viene ridistribuita automaticamente sugli step rimanenti — niente panico, il sistema si adatta.</p>
              </div>

              <div style={{ background: 'rgba(188,19,254,0.04)', border: '1px solid rgba(188,19,254,0.1)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', color: theme.purple, marginBottom: '8px', fontSize: '14px' }}>Esempio pratico</div>
                <p>Budget <strong style={{ color: theme.text }}>€200</strong>, obiettivo <strong style={{ color: theme.text }}>+100%</strong> in <strong style={{ color: theme.text }}>15 step</strong>:</p>
                <p>Il sistema calcola che devi guadagnare circa <strong style={{ color: theme.gold }}>€13.33 per step</strong> e ti suggerisce quote e importi per arrivarci.</p>
              </div>

              <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontWeight: '700', color: theme.gold, marginBottom: '8px', fontSize: '14px' }}>Parametri</div>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li><strong style={{ color: theme.text }}>Budget</strong> — capitale di partenza</li>
                  <li><strong style={{ color: theme.text }}>Obiettivo %</strong> — quanto vuoi guadagnare (100% = raddoppio)</li>
                  <li><strong style={{ color: theme.text }}>Numero step</strong> — in quanti passaggi vuoi arrivarci</li>
                  <li><strong style={{ color: theme.text }}>Range quote</strong> — quote minima e massima consigliate</li>
                  <li><strong style={{ color: theme.text }}>Esposizione</strong> — % massima del saldo che rischi per step</li>
                </ul>
              </div>
            </div>

            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: '10px', padding: '14px', marginTop: '12px' }}>
              <div style={{ fontWeight: '700', color: theme.warning, marginBottom: '6px', fontSize: '14px' }}>Legenda</div>
              <p style={{ margin: 0, fontSize: '13px', color: theme.textDim }}>
                ⚠️ — Questo simbolo appare accanto ai campi in cui il valore inserito supera i parametri impostati nella sessione (range quote, limite puntata, esposizione giornaliera). Puoi comunque proseguire, ma fai attenzione!
              </p>
            </div>

            <button onClick={() => setShowInfo(false)} style={{ ...btnStyle, width: '100%', marginTop: '20px', background: 'rgba(255,215,0,0.1)', color: theme.gold, fontWeight: '700', padding: '10px', fontSize: '14px' }}>
              Ho capito!
            </button>
          </div>
        </div>
      )}

      {/* BANNER PREFILL PENDENTE */}
      {prefillData && openTabs.length === 0 && (
        <div style={{
          background: 'rgba(188,19,254,0.06)', border: '1px solid rgba(188,19,254,0.2)',
          borderRadius: '10px', padding: '14px', marginBottom: '16px', textAlign: 'center'
        }}>
          <div style={{ color: '#bc13fe', fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>
            Partita pronta da inserire
          </div>
          <div style={{ color: theme.text, fontSize: '13px', marginBottom: '10px' }}>
            {prefillData.match} <span style={{ color: theme.gold }}>@{prefillData.odds}</span>
          </div>
          <div style={{ color: theme.textDim, fontSize: '11px' }}>
            {sessions.filter(s => s.status === 'active').length > 0
              ? 'Apri una sessione attiva dalla lista qui sotto per pre-compilare i dati'
              : 'Crea una nuova sessione per iniziare'}
          </div>
        </div>
      )}

      {/* SESSION LIST */}
      <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: theme.textDim, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Le mie sessioni ({sessions.length})
        </div>
        {sessions.length === 0 ? (
          <div style={{ color: theme.textDim, fontSize: '13px', textAlign: 'center', padding: '16px' }}>
            Nessuna sessione. Creane una nuova!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {sessions.map(s => {
              const pl = s.current_balance - s.budget;
              const isOpen = openTabs.includes(s._id);
              const isSelected = selectedTab === s._id;
              const statusColor = s.status === 'active' ? theme.success : s.status === 'completed' ? theme.cyan : theme.warning;
              const statusIcon = s.status === 'active' ? '●' : s.status === 'completed' ? '✓' : '○';
              return (
                <div
                  key={s._id}
                  onClick={() => openSession(s._id)}
                  style={{
                    padding: '8px 12px',
                    background: isSelected ? 'rgba(0,240,255,0.08)' : isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: isSelected ? '1px solid rgba(0,240,255,0.3)' : '1px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: statusColor, fontSize: '10px' }}>{statusIcon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name || 'Sessione'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>
                      €{s.budget} → €{s.current_balance.toFixed(2)}
                      <span style={{ marginLeft: '6px', color: pl >= 0 ? theme.success : theme.danger }}>
                        ({pl >= 0 ? '+' : ''}{pl.toFixed(2)}€)
                      </span>
                      <span style={{ marginLeft: '6px' }}>{s.current_step}/{s.total_steps} step</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                      background: s.status === 'active' ? 'rgba(5,249,182,0.1)' : s.status === 'completed' ? 'rgba(0,240,255,0.1)' : 'rgba(255,159,67,0.1)',
                      color: statusColor
                    }}>
                      {s.status === 'active' ? 'Attiva' : s.status === 'completed' ? 'Completata' : 'Chiusa'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TAB BAR */}
      {openTabs.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', overflowX: 'auto', paddingBottom: '2px' }}>
          {openTabs.map(tabId => {
            const s = sessions.find(s => s._id === tabId) || tabDetails[tabId];
            const isActive = selectedTab === tabId;
            const form = tabForms[tabId];
            const isDirty = form && (form.odds || form.amount || form.match);
            return (
              <div
                key={tabId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 12px',
                  background: isActive ? theme.panel : 'rgba(255,255,255,0.02)',
                  border: isActive ? theme.panelBorder : '1px solid transparent',
                  borderBottom: isActive ? 'none' : '1px solid rgba(0,240,255,0.15)',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? theme.text : theme.textDim,
                  whiteSpace: 'nowrap',
                  maxWidth: '180px',
                }}
                onClick={() => setSelectedTab(tabId)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isDirty && <span style={{ color: theme.warning, marginRight: '4px' }}>●</span>}
                  {s?.name || 'Sessione'}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); closeTab(tabId); }}
                  style={{
                    color: theme.textDim,
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '0 2px',
                    lineHeight: 1,
                    borderRadius: '4px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = theme.danger; e.currentTarget.style.background = 'rgba(255,42,109,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = theme.textDim; e.currentTarget.style.background = 'transparent'; }}
                >
                  ×
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SESSION FORM */}
      {showCreateForm && (
        <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', color: theme.cyan, fontSize: '16px' }}>Nuova Sessione</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Nome sessione</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={`Sessione ${sessions.length + 1}`} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Budget iniziale (€)</label>
              <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Obiettivo guadagno (%)</label>
              <input type="number" step="5" min="1" value={newMultiplier} onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 1) setNewMultiplier(v); }} style={inputStyle} />
              <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '4px' }}>
                Target: €{newBudget} → €{(parseFloat(newBudget || '0') + parseFloat(newMultiplier || '0') / 100 * parseFloat(newBudget || '0')).toFixed(0)} (+€{(parseFloat(newMultiplier || '0') / 100 * parseFloat(newBudget || '0')).toFixed(0)})
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

      {/* SELECTED TAB CONTENT */}
      {selectedTab && currentSession && currentForm && (
        <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '0 12px 12px 12px', padding: '16px' }}>

          {/* SESSION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{currentSession.name || 'Sessione'}</div>
              <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>
                Creata il {new Date(currentSession.created_at).toLocaleDateString('it-IT')} | Obiettivo +{(currentSession.target_multiplier * 100).toFixed(0)}%
              </div>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px',
              background: currentSession.status === 'active' ? 'rgba(5,249,182,0.1)' : currentSession.status === 'completed' ? 'rgba(0,240,255,0.1)' : 'rgba(255,159,67,0.1)',
              color: currentSession.status === 'active' ? theme.success : currentSession.status === 'completed' ? theme.cyan : theme.warning
            }}>
              {currentSession.status === 'active' ? 'Attiva' : currentSession.status === 'completed' ? 'Completata' : 'Chiusa'}
            </span>
          </div>

          {/* DASHBOARD CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            <StatCard label="Saldo" value={`€${currentSession.current_balance.toFixed(2)}`} color={currentSession.current_balance >= currentSession.budget ? theme.success : theme.danger} />
            <StatCard label="Target" value={`€${targetBalance.toFixed(0)}`} color={theme.gold} />
            <StatCard label="Step" value={`${currentSession.current_step}/${currentSession.total_steps}`} color={theme.cyan} />
            <StatCard label="W/L" value={`${currentSession.steps_won}/${currentSession.steps_lost}`} color={theme.text} />
            {currentNextStep && !currentNextStep.completed && (
              <>
                <StatCard label="Media/Step" value={`€${currentNextStep.daily_target.toFixed(2)}`} color={theme.warning} />
                <StatCard label="Max Puntata" value={`€${currentNextStep.max_bet.toFixed(2)}`} color={theme.purple} />
              </>
            )}
          </div>

          {/* PROGRESS BAR */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textDim, marginBottom: '4px' }}>
              <span>€{currentSession.budget}</span>
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

          {/* NEXT STEP SUGGESTION (only for active sessions) */}
          {currentSession.status === 'active' && currentNextStep && !currentNextStep.completed && (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: theme.cyan }}>
                Step {currentNextStep.step_number} — Suggerimento
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={suggBox}>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>Quota</div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: theme.gold }}>{currentNextStep.suggested_odds}</div>
                  <div style={{ fontSize: '9px', color: theme.textDim }}>({currentNextStep.odds_range_suggested[0]} - {currentNextStep.odds_range_suggested[1]})</div>
                </div>
                <div style={suggBox}>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>Importo</div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: theme.success }}>€{currentNextStep.suggested_amount}</div>
                  <div style={{ fontSize: '9px', color: theme.textDim }}>(€{currentNextStep.amount_range[0]} - €{currentNextStep.amount_range[1]})</div>
                </div>
                <div style={suggBox}>
                  <div style={{ fontSize: '10px', color: theme.textDim }}>Vincita pot.</div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: theme.warning }}>€{currentNextStep.potential_win}</div>
                  <div style={{ fontSize: '9px', color: theme.textDim }}>Mancano €{currentNextStep.remaining_target}</div>
                </div>
              </div>

              {/* INPUT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Quota {currentForm.odds && (parseFloat(currentForm.odds) < currentNextStep.odds_range_suggested[0] || parseFloat(currentForm.odds) > currentNextStep.odds_range_suggested[1]) && <span title="Quota fuori dal range suggerito" style={{ cursor: 'help' }}>⚠️</span>}</label>
                  <input type="number" step="0.01" value={currentForm.odds} onChange={e => updateTabForm(selectedTab, 'odds', e.target.value)} placeholder={String(currentNextStep.suggested_odds)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Importo (€) {currentForm.amount && (parseFloat(currentForm.amount) > currentNextStep.max_bet || parseFloat(currentForm.amount) > currentNextStep.max_daily_exposure) && <span title={parseFloat(currentForm.amount) > currentNextStep.max_bet ? 'Supera il limite singola puntata' : 'Supera l\'esposizione giornaliera'} style={{ cursor: 'help' }}>⚠️</span>}</label>
                  <input type="number" step="0.01" value={currentForm.amount} onChange={e => updateTabForm(selectedTab, 'amount', e.target.value)} placeholder={String(currentNextStep.suggested_amount)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Partita (opzionale)</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" value={currentForm.match} onChange={e => updateTabForm(selectedTab, 'match', e.target.value)} placeholder="es. Juventus - Milan" style={{ ...inputStyle, flex: 1 }} />
                    <button
                      onClick={() => { setShowMatchPicker(true); fetchTodayPredictions(); }}
                      style={{
                        background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)',
                        color: theme.cyan, borderRadius: '6px', padding: '0 10px',
                        cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap'
                      }}
                    >
                      Scegli
                    </button>
                  </div>
                </div>
              </div>

              {/* OUTCOME BUTTONS */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleAddStep(selectedTab, null)}
                  disabled={submitting || !currentForm.odds || !currentForm.amount}
                  style={{ ...btnStyle, flex: 2, background: 'rgba(0,240,255,0.12)', color: theme.cyan, fontWeight: '700', fontSize: '14px', padding: '12px', opacity: (!currentForm.odds || !currentForm.amount) ? 0.4 : 1 }}
                >
                  {submitting ? '...' : 'CONFERMA'}
                </button>
                <button
                  onClick={() => handleAddStep(selectedTab, 'won')}
                  disabled={submitting || !currentForm.odds || !currentForm.amount}
                  style={{ ...btnStyle, flex: 1, background: 'rgba(5,249,182,0.15)', color: theme.success, fontWeight: '700', fontSize: '13px', padding: '12px', opacity: (!currentForm.odds || !currentForm.amount) ? 0.4 : 1 }}
                >
                  {submitting ? '...' : 'VINTO'}
                </button>
                <button
                  onClick={() => handleAddStep(selectedTab, 'lost')}
                  disabled={submitting || !currentForm.odds || !currentForm.amount}
                  style={{ ...btnStyle, flex: 1, background: 'rgba(255,42,109,0.15)', color: theme.danger, fontWeight: '700', fontSize: '13px', padding: '12px', opacity: (!currentForm.odds || !currentForm.amount) ? 0.4 : 1 }}
                >
                  {submitting ? '...' : 'PERSO'}
                </button>
              </div>
            </div>
          )}

          {/* SESSION COMPLETED MESSAGE */}
          {currentNextStep?.completed && currentSession.status === 'active' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${currentNextStep.reason === 'target_reached' ? theme.success : theme.danger}`, borderRadius: '10px', padding: '20px', marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {currentNextStep.reason === 'target_reached' ? '🎯' : currentNextStep.reason === 'budget_depleted' ? '💸' : '📊'}
              </div>
              <h3 style={{ color: currentNextStep.reason === 'target_reached' ? theme.success : theme.danger, margin: '0 0 8px' }}>
                {currentNextStep.reason === 'target_reached' ? 'Obiettivo Raggiunto!' : currentNextStep.reason === 'budget_depleted' ? 'Budget Esaurito' : 'Step Esauriti'}
              </h3>
              <p style={{ color: theme.textDim, fontSize: '13px', margin: '0 0 12px' }}>
                Saldo finale: €{currentSession.current_balance.toFixed(2)} | P/L: {currentSession.current_balance - currentSession.budget >= 0 ? '+' : ''}{(currentSession.current_balance - currentSession.budget).toFixed(2)}€
              </p>
              <button onClick={() => handleCloseSession(selectedTab, 'completed')} style={{ ...btnStyle, background: 'rgba(0,240,255,0.15)', color: theme.cyan }}>
                Chiudi Sessione
              </button>
            </div>
          )}

          {/* STEP HISTORY */}
          {currentSession.steps.length > 0 && (
            <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Storico Step</span>
                <span style={{ fontSize: '11px', color: theme.textDim }}>{currentSession.steps_won}W - {currentSession.steps_lost}L</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: theme.headerBg }}>
                      {['#', 'Data', 'Partita', 'Quota', 'Importo', 'P/L', 'Esito', 'Saldo'].map(h => (
                        <th key={h} style={{ padding: '7px 8px', textAlign: 'left', color: theme.textDim, fontWeight: '600', borderBottom: theme.cellBorder, fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...currentSession.steps].reverse().map((s, i) => (
                      <tr key={s.step_number} style={{ background: i % 2 === 0 ? theme.rowEven : theme.rowOdd }}>
                        <td style={cellStyle}>{s.step_number}</td>
                        <td style={cellStyle}>{new Date(s.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</td>
                        <td style={{ ...cellStyle, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.match_info || '-'}</td>
                        <td style={cellStyle}>{s.odds_entered.toFixed(2)}</td>
                        <td style={cellStyle}>€{s.amount_bet.toFixed(2)}</td>
                        <td style={{ ...cellStyle, color: s.actual_pl >= 0 ? theme.success : theme.danger, fontWeight: '600' }}>
                          {s.actual_pl >= 0 ? '+' : ''}{s.actual_pl.toFixed(2)}€
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'center', fontSize: '15px' }}>
                          {s.outcome === 'won' ? <span style={{ color: theme.success }}>▲</span>
                            : s.outcome === 'lost' ? <span style={{ color: theme.danger }}>▼</span>
                            : currentSession.status === 'active' ? (
                              <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                <button onClick={() => handleResolveStep(selectedTab!, s.step_number, 'won')} disabled={submitting} style={{ background: 'rgba(5,249,182,0.2)', border: 'none', color: theme.success, borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>V</button>
                                <button onClick={() => handleResolveStep(selectedTab!, s.step_number, 'lost')} disabled={submitting} style={{ background: 'rgba(255,42,109,0.2)', border: 'none', color: theme.danger, borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>P</button>
                              </div>
                            ) : <span style={{ color: theme.textDim }}>=</span>}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: '600' }}>€{s.balance_after.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABANDON BUTTON */}
          {currentSession.status === 'active' && !(currentNextStep?.completed) && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => handleCloseSession(selectedTab, 'abandoned')} style={{ ...btnStyle, background: 'rgba(255,42,109,0.05)', color: theme.danger, fontSize: '12px' }}>
                Abbandona Sessione
              </button>
            </div>
          )}

          {/* DANGER ZONE — ELIMINA */}
          <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px solid rgba(255,42,109,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,42,109,0.04)', borderRadius: '10px', border: '1px solid rgba(255,42,109,0.12)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: theme.danger }}>Elimina sessione</div>
                <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '2px' }}>Questa azione è irreversibile. Tutti i dati verranno cancellati.</div>
              </div>
              <button
                onClick={() => handleDeleteSession(selectedTab)}
                style={{
                  background: 'rgba(255,42,109,0.1)',
                  border: '1px solid rgba(255,42,109,0.4)',
                  color: theme.danger,
                  cursor: 'pointer',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  marginLeft: '16px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,42,109,0.25)'; e.currentTarget.style.borderColor = theme.danger; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,42,109,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,42,109,0.4)'; }}
              >
                Elimina definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE — no tabs open */}
      {openTabs.length === 0 && !showCreateForm && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textDim }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📈</div>
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>
            {sessions.length > 0 ? 'Seleziona una sessione dalla lista' : 'Crea la tua prima sessione'}
          </p>
          <p style={{ fontSize: '12px', color: theme.textDim }}>
            Puoi aprire fino a {MAX_OPEN_TABS} sessioni contemporaneamente
          </p>
        </div>
      )}

      {/* MATCH PICKER POPUP */}
      {showMatchPicker && (
        <div onClick={() => setShowMatchPicker(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100001, fontFamily: theme.font, padding: '16px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: theme.panelSolid, border: theme.panelBorder,
            borderRadius: '14px', padding: '16px', width: '100%', maxWidth: '500px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: theme.cyan, fontSize: '15px', fontWeight: '800', margin: 0 }}>Scegli Partita</h3>
              <button onClick={() => setShowMatchPicker(false)} style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            <input
              type="text" value={matchPickerSearch}
              onChange={e => setMatchPickerSearch(e.target.value)}
              placeholder="Cerca squadra..."
              style={{ ...inputStyle, marginBottom: '12px' }}
              autoFocus
            />

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {matchPickerLoading ? (
                <div style={{ color: theme.textDim, textAlign: 'center', padding: '20px' }}>Caricamento pronostici...</div>
              ) : matchPickerPredictions.length === 0 ? (
                <div style={{ color: theme.textDim, textAlign: 'center', padding: '20px' }}>Nessun pronostico disponibile per oggi</div>
              ) : (() => {
                const q = matchPickerSearch.toLowerCase();
                const filtered = matchPickerPredictions.filter((p: any) =>
                  !q || p.home.toLowerCase().includes(q) || p.away.toLowerCase().includes(q)
                );
                const byLeague: Record<string, any[]> = {};
                filtered.forEach((p: any) => {
                  const lg = p.league || 'Altro';
                  if (!byLeague[lg]) byLeague[lg] = [];
                  byLeague[lg].push(p);
                });
                if (filtered.length === 0) {
                  return <div style={{ color: theme.textDim, textAlign: 'center', padding: '20px' }}>Nessun risultato per "{matchPickerSearch}"</div>;
                }
                return Object.entries(byLeague).map(([league, preds]) => (
                  <div key={league} style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '10px', color: theme.textDim, fontWeight: '700',
                      textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
                      padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px'
                    }}>
                      {league}
                    </div>
                    {preds.map((pred: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, padding: '6px 8px' }}>
                          {pred.match_time && <span style={{ color: theme.textDim, marginRight: '6px', fontSize: '11px' }}>{pred.match_time}</span>}
                          {pred.home} vs {pred.away}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '0 8px 6px' }}>
                          {(pred.pronostici || []).filter((p: any) => p.quota && p.quota > 0).map((p: any, pIdx: number) => (
                            <button
                              key={pIdx}
                              onClick={() => {
                                if (selectedTab) {
                                  updateTabForm(selectedTab, 'match', `${pred.home} vs ${pred.away}`);
                                  updateTabForm(selectedTab, 'odds', String(p.quota));
                                }
                                setShowMatchPicker(false);
                                setMatchPickerSearch('');
                              }}
                              style={{
                                background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)',
                                borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                                color: theme.text, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <span style={{ fontWeight: '700', color: theme.cyan }}>{p.pronostico}</span>
                              <span style={{ color: theme.gold }}>@{Number(p.quota).toFixed(2)}</span>
                              {p.stars > 0 && <span style={{ color: theme.textDim, fontSize: '9px' }}>{'★'.repeat(p.stars)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
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
  padding: '7px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  whiteSpace: 'nowrap',
};

const suggBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  padding: '10px',
  textAlign: 'center',
};

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(18,20,35,0.85)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: '9px', color: '#8b9bb4', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color }}>{value}</div>
    </div>
  );
}
