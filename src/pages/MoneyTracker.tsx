import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

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

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

interface Selection {
  home: string;
  away: string;
  market: string;
  prediction: string;
  odds: number;
  result: string | null;
}

interface Bet {
  _id: string;
  date: string;
  bet_type: string;
  selections: Selection[];
  total_odds: number;
  stake_amount: number;
  potential_win: number;
  status: string;
  net_profit: number | null;
  settled_at: string | null;
  created_at: string;
}

interface MonthStats {
  total: number;
  won: number;
  lost: number;
  pending: number;
  totalStake: number;
  totalProfit: number;
  roi: number;
}

interface Settings {
  initial_capital: number;
  current_balance: number;
  max_bet_pct: number;
  aggressiveness: string;
}

const isMob = () => window.innerWidth < 768;

export default function MoneyTracker({ onBack }: { onBack?: () => void }) {
  const { user, getIdToken } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(isMob());

  // Data state
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tier, setTier] = useState('free');
  const [bets, setBets] = useState<Bet[]>([]);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigation
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based

  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddBet, setShowAddBet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResultModal, setShowResultModal] = useState<Bet | null>(null);

  // Onboarding form
  const [obCapital, setObCapital] = useState('500');
  const [obAggr, setObAggr] = useState('moderate');
  const [obMaxPct, setObMaxPct] = useState('5');
  const [obLoading, setObLoading] = useState(false);

  // Add bet form
  const [betType, setBetType] = useState('singola');
  const [betSelections, setBetSelections] = useState<Partial<Selection>[]>([{ home: '', away: '', market: '1X2', prediction: '', odds: 0 }]);
  const [betStake, setBetStake] = useState('');
  const [suggestedStake, setSuggestedStake] = useState<number | null>(null);
  const [betDate, setBetDate] = useState(new Date().toISOString().slice(0, 10));
  const [betLoading, setBetLoading] = useState(false);

  // View toggle
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    const h = () => setIsMobile(isMob());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // API helper
  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = await getIdToken();
    if (!token) throw new Error('Non autenticato');
    const res = await fetch(`${API_BASE}/money-tracker${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options?.headers || {})
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, [getIdToken]);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch('/settings');
      setSettings(data.settings);
      setTier(data.tier || 'free');
      if (!data.settings) setShowOnboarding(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento');
    }
  }, [apiFetch]);

  // Load bets for selected month
  const loadBets = useCallback(async () => {
    try {
      const m = String(selectedMonth + 1).padStart(2, '0');
      const data = await apiFetch(`/bets?month=${selectedYear}-${m}`);
      setBets(data.bets || []);
      setMonthStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento bets');
    }
  }, [apiFetch, selectedYear, selectedMonth]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    Promise.all([loadSettings(), loadBets()])
      .finally(() => setLoading(false));
  }, [user, loadSettings, loadBets]);

  // Auth gate
  if (!user) {
    return (
      <div style={{ background: theme.bg, minHeight: '100vh', fontFamily: theme.font, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h1 style={{ color: theme.text, fontSize: '22px', fontWeight: '900', marginBottom: '8px' }}>Money Tracker</h1>
          <p style={{ color: theme.textDim, fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Accedi per tracciare le tue scommesse, gestire il bankroll e ottimizzare gli stake.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              background: `linear-gradient(135deg, ${theme.cyan}30, ${theme.cyan}60)`,
              border: `1px solid ${theme.cyan}60`, color: theme.cyan,
              padding: '14px 40px', borderRadius: '12px', cursor: 'pointer',
              fontSize: '15px', fontWeight: '800'
            }}
          >
            Accedi per iniziare
          </button>
          {onBack && (
            <div style={{ marginTop: '16px' }}>
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '13px' }}>
                ← Torna indietro
              </button>
            </div>
          )}
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  // Helpers
  const plColor = (v: number) => v > 0 ? theme.success : v < 0 ? theme.danger : theme.textDim;
  const plSign = (v: number) => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
  const statusIcon = (s: string) => s === 'won' ? '✅' : s === 'lost' ? '❌' : s === 'void' ? '⬜' : '⏳';
  const statusColor = (s: string) => s === 'won' ? theme.success : s === 'lost' ? theme.danger : s === 'void' ? theme.textDim : theme.warning;

  // Group bets by date
  const betsByDate: Record<string, Bet[]> = {};
  for (const b of bets) {
    if (!betsByDate[b.date]) betsByDate[b.date] = [];
    betsByDate[b.date].push(b);
  }
  const sortedDates = Object.keys(betsByDate).sort((a, b) => b.localeCompare(a));

  // Format date
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  // Bet type to selection count
  const betTypeToCount: Record<string, number> = { singola: 1, doppia: 2, tripla: 3, quadrupla: 4, quintupla: 5 };

  // Handle bet type change
  const handleBetTypeChange = (type: string) => {
    setBetType(type);
    const count = betTypeToCount[type] || 1;
    const newSel = Array.from({ length: count }, (_, i) =>
      betSelections[i] || { home: '', away: '', market: '1X2', prediction: '', odds: 0 }
    );
    setBetSelections(newSel);
    setSuggestedStake(null);
  };

  // Calculate total odds
  const totalOdds = betSelections.reduce((acc, s) => acc * (Number(s.odds) || 1), 1);

  // Fetch suggested stake
  const fetchSuggestedStake = async () => {
    try {
      const data = await apiFetch('/suggest-stake', {
        method: 'POST',
        body: JSON.stringify({ bet_type: betType, total_odds: totalOdds })
      });
      setSuggestedStake(data.suggested_stake);
      if (!betStake) setBetStake(String(data.suggested_stake));
    } catch { /* ignore */ }
  };

  // Submit onboarding
  const submitOnboarding = async () => {
    setObLoading(true);
    try {
      const data = await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify({
          initial_capital: Number(obCapital),
          aggressiveness: obAggr,
          max_bet_pct: Number(obMaxPct)
        })
      });
      setSettings(data.settings);
      setShowOnboarding(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setObLoading(false);
    }
  };

  // Submit new bet
  const submitBet = async () => {
    setBetLoading(true);
    setError('');
    try {
      const validSel = betSelections.filter(s => s.prediction && s.odds && s.odds > 1);
      if (validSel.length === 0) {
        setError('Compila almeno una selezione con pronostico e quota');
        setBetLoading(false);
        return;
      }
      await apiFetch('/bets', {
        method: 'POST',
        body: JSON.stringify({
          bet_type: betType,
          selections: validSel,
          stake_amount: Number(betStake),
          date: betDate
        })
      });
      setShowAddBet(false);
      setBetSelections([{ home: '', away: '', market: '1X2', prediction: '', odds: 0 }]);
      setBetStake('');
      setBetType('singola');
      setSuggestedStake(null);
      // Reload
      await Promise.all([loadSettings(), loadBets()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore aggiunta bet');
    } finally {
      setBetLoading(false);
    }
  };

  // Mark result
  const markResult = async (betId: string, status: string) => {
    try {
      await apiFetch(`/bets/${betId}/result`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setShowResultModal(null);
      await Promise.all([loadSettings(), loadBets()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    }
  };

  // Delete bet
  const deleteBet = async (betId: string) => {
    try {
      await apiFetch(`/bets/${betId}`, { method: 'DELETE' });
      await Promise.all([loadSettings(), loadBets()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    }
  };

  // Input style helper
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: theme.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box'
  };

  const btnStyle = (color: string, filled = false): React.CSSProperties => ({
    background: filled ? `${color}30` : 'transparent',
    border: `1px solid ${color}50`,
    color, padding: '8px 16px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '700'
  });

  // Calendar view
  const renderCalendar = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
    const cells: React.ReactNode[] = [];

    // Day headers
    const dayNames = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
    dayNames.forEach((d, i) => cells.push(
      <div key={`h${i}`} style={{ textAlign: 'center', color: theme.textDim, fontSize: '10px', fontWeight: '700', padding: '4px' }}>{d}</div>
    ));

    // Empty cells
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayBets = betsByDate[dateStr] || [];
      const hasWon = dayBets.some(b => b.status === 'won');
      const hasLost = dayBets.some(b => b.status === 'lost');
      const hasPending = dayBets.some(b => b.status === 'pending');

      let bg = 'transparent';
      if (hasWon && !hasLost) bg = 'rgba(5,249,182,0.15)';
      else if (hasLost && !hasWon) bg = 'rgba(255,42,109,0.15)';
      else if (hasWon && hasLost) bg = 'rgba(255,159,67,0.15)';
      else if (hasPending) bg = 'rgba(255,215,0,0.08)';

      const isToday = dateStr === new Date().toISOString().slice(0, 10);

      cells.push(
        <div key={d} style={{
          textAlign: 'center', padding: '6px 2px', borderRadius: '6px', background: bg,
          border: isToday ? `1px solid ${theme.cyan}50` : '1px solid transparent',
          fontSize: '12px', color: dayBets.length > 0 ? theme.text : theme.textDim,
          cursor: dayBets.length > 0 ? 'pointer' : 'default'
        }}>
          {d}
          {dayBets.length > 0 && (
            <div style={{ fontSize: '9px', color: theme.textDim, marginTop: '2px' }}>
              {dayBets.length} bet{dayBets.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells}
      </div>
    );
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', fontFamily: theme.font }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: isMobile ? '12px' : '20px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBack && (
              <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: theme.textDim, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                ←
              </button>
            )}
            <h1 style={{ color: theme.text, fontSize: isMobile ? '18px' : '22px', fontWeight: '900', margin: 0 }}>
              Money Tracker
            </h1>
            <span style={{
              background: tier === 'free' ? 'rgba(139,155,180,0.15)' : 'rgba(255,215,0,0.15)',
              border: `1px solid ${tier === 'free' ? 'rgba(139,155,180,0.3)' : 'rgba(255,215,0,0.3)'}`,
              color: tier === 'free' ? theme.textDim : theme.gold,
              padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
              textTransform: 'uppercase'
            }}>
              {tier}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: theme.textDim, padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          >
            ⚙️
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{
            background: 'rgba(255,42,109,0.1)', border: '1px solid rgba(255,42,109,0.2)',
            borderRadius: '8px', padding: '10px 14px', marginBottom: '12px',
            color: theme.danger, fontSize: '12px'
          }}>
            {error}
            <span onClick={() => setError('')} style={{ float: 'right', cursor: 'pointer' }}>✕</span>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: theme.textDim }}>Caricamento...</div>
        )}

        {/* ONBOARDING MODAL */}
        {showOnboarding && (
          <div onClick={() => {}} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
          }}>
            <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '400px' }}>
              <h2 style={{ color: theme.text, fontSize: '18px', fontWeight: '900', marginBottom: '20px', margin: '0 0 20px 0' }}>
                Configura il tuo Bankroll
              </h2>

              <label style={{ color: theme.textDim, fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                Capitale iniziale (€)
              </label>
              <input type="number" value={obCapital} onChange={e => setObCapital(e.target.value)}
                style={{ ...inputStyle, marginBottom: '14px' }} min="10" />

              <label style={{ color: theme.textDim, fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                Aggressivita
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {(['conservative', 'moderate', 'aggressive'] as const).map(a => (
                  <button key={a} onClick={() => setObAggr(a)} style={{
                    flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                    background: obAggr === a ? `${theme.cyan}20` : 'rgba(255,255,255,0.04)',
                    border: obAggr === a ? `1px solid ${theme.cyan}50` : '1px solid rgba(255,255,255,0.1)',
                    color: obAggr === a ? theme.cyan : theme.textDim,
                    textTransform: 'capitalize'
                  }}>
                    {a === 'conservative' ? '🛡️ Prudente' : a === 'moderate' ? '⚖️ Moderato' : '🔥 Aggressivo'}
                  </button>
                ))}
              </div>

              <label style={{ color: theme.textDim, fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                Max % per scommessa: {obMaxPct}%
              </label>
              <input type="range" min="1" max="10" value={obMaxPct} onChange={e => setObMaxPct(e.target.value)}
                style={{ width: '100%', marginBottom: '20px' }} />

              <button onClick={submitOnboarding} disabled={obLoading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${theme.cyan}30, ${theme.cyan}60)`,
                  border: `1px solid ${theme.cyan}50`, color: theme.cyan,
                  fontSize: '14px', fontWeight: '800', cursor: obLoading ? 'wait' : 'pointer',
                  opacity: obLoading ? 0.6 : 1
                }}
              >
                {obLoading ? '...' : 'Inizia!'}
              </button>
            </div>
          </div>
        )}

        {/* MAIN CONTENT (after loading + onboarding) */}
        {!loading && settings && (
          <>
            {/* STATS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Saldo', value: `€${settings.current_balance.toFixed(2)}`, color: theme.text },
                { label: 'Capitale', value: `€${settings.initial_capital.toFixed(2)}`, color: theme.textDim },
                { label: 'P/L Mese', value: monthStats ? `${plSign(monthStats.totalProfit)}€` : '—', color: monthStats ? plColor(monthStats.totalProfit) : theme.textDim },
                { label: 'ROI Mese', value: monthStats ? `${monthStats.roi}%` : '—', color: monthStats ? plColor(monthStats.roi) : theme.textDim },
              ].map((c, i) => (
                <div key={i} style={{
                  background: theme.panel, border: theme.panelBorder,
                  borderRadius: '10px', padding: '12px', textAlign: 'center'
                }}>
                  <div style={{ color: theme.textDim, fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>{c.label}</div>
                  <div style={{ color: c.color, fontSize: isMobile ? '16px' : '18px', fontWeight: '900' }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* W/L ROW */}
            {monthStats && monthStats.total > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px',
                padding: '8px', background: theme.panel, border: theme.panelBorder, borderRadius: '10px'
              }}>
                <span style={{ color: theme.success, fontSize: '12px', fontWeight: '700' }}>✅ {monthStats.won}W</span>
                <span style={{ color: theme.danger, fontSize: '12px', fontWeight: '700' }}>❌ {monthStats.lost}L</span>
                <span style={{ color: theme.warning, fontSize: '12px', fontWeight: '700' }}>⏳ {monthStats.pending}P</span>
                <span style={{ color: theme.textDim, fontSize: '12px' }}>({monthStats.total} tot)</span>
              </div>
            )}

            {/* MONTH TABS */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {/* Year nav */}
              <button onClick={() => setSelectedYear(y => y - 1)} style={{ ...btnStyle(theme.textDim), padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}>
                ◀ {selectedYear - 1}
              </button>
              {MONTHS.map((m, i) => {
                const isSelected = i === selectedMonth;
                return (
                  <button key={i} onClick={() => setSelectedMonth(i)} style={{
                    padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                    background: isSelected ? `${theme.cyan}20` : 'transparent',
                    border: isSelected ? `1px solid ${theme.cyan}40` : '1px solid rgba(255,255,255,0.06)',
                    color: isSelected ? theme.cyan : theme.textDim,
                    cursor: 'pointer', flexShrink: 0
                  }}>
                    {m}
                  </button>
                );
              })}
              <button onClick={() => setSelectedYear(y => y + 1)} style={{ ...btnStyle(theme.textDim), padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}>
                {selectedYear + 1} ▶
              </button>
            </div>

            {/* VIEW TOGGLE */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {(['list', 'calendar'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)} style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                  background: viewMode === v ? `${theme.cyan}15` : 'transparent',
                  border: viewMode === v ? `1px solid ${theme.cyan}30` : '1px solid rgba(255,255,255,0.06)',
                  color: viewMode === v ? theme.cyan : theme.textDim,
                  cursor: 'pointer'
                }}>
                  {v === 'list' ? '📋 Lista' : '📅 Calendario'}
                </button>
              ))}
            </div>

            {/* CALENDAR VIEW */}
            {viewMode === 'calendar' && (
              <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                {renderCalendar()}
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <div>
                {sortedDates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim, fontSize: '14px' }}>
                    Nessuna scommessa in {MONTHS[selectedMonth]} {selectedYear}
                  </div>
                )}
                {sortedDates.map(date => (
                  <div key={date} style={{ marginBottom: '12px' }}>
                    {/* Day header */}
                    <div style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', marginBottom: '6px', paddingLeft: '4px' }}>
                      {fmtDate(date)}
                    </div>
                    {/* Bets */}
                    {betsByDate[date].map(bet => (
                      <div key={bet._id} style={{
                        background: theme.panel, border: theme.panelBorder,
                        borderRadius: '10px', padding: '12px', marginBottom: '6px'
                      }}>
                        {/* Bet header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{statusIcon(bet.status)}</span>
                            <span style={{ color: theme.text, fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>
                              {bet.bet_type}
                            </span>
                            <span style={{ color: theme.textDim, fontSize: '11px' }}>
                              @{bet.total_odds.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: statusColor(bet.status), fontSize: '13px', fontWeight: '800' }}>
                              {bet.status === 'pending' ? `-${bet.stake_amount.toFixed(2)}€` :
                               bet.net_profit !== null ? `${plSign(bet.net_profit)}€` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Selections */}
                        {bet.selections.map((s, si) => (
                          <div key={si} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '4px 0', borderTop: si > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            fontSize: '12px'
                          }}>
                            <div>
                              <span style={{ color: theme.textDim }}>{s.home} vs {s.away}</span>
                              <span style={{ color: theme.cyan, fontWeight: '700', marginLeft: '8px' }}>{s.prediction}</span>
                            </div>
                            <span style={{ color: theme.textDim }}>@{s.odds.toFixed(2)}</span>
                          </div>
                        ))}

                        {/* Stake + Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ color: theme.textDim, fontSize: '11px' }}>
                            Stake: €{bet.stake_amount.toFixed(2)} → Pot: €{bet.potential_win.toFixed(2)}
                          </span>
                          {bet.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => setShowResultModal(bet)} style={{ ...btnStyle(theme.cyan), padding: '4px 10px', fontSize: '11px' }}>
                                Risultato
                              </button>
                              <button onClick={() => { if (confirm('Cancellare questa scommessa?')) deleteBet(bet._id); }} style={{ ...btnStyle(theme.danger), padding: '4px 8px', fontSize: '11px' }}>
                                🗑
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* FAB — Add bet */}
            <button
              onClick={() => { setShowAddBet(true); setError(''); }}
              style={{
                position: 'fixed', bottom: isMobile ? 20 : 30, right: isMobile ? 20 : 30,
                width: '56px', height: '56px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                border: 'none', color: '#fff', fontSize: '28px', fontWeight: '300',
                cursor: 'pointer', boxShadow: `0 4px 20px ${theme.cyan}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9000
              }}
            >
              +
            </button>
          </>
        )}

        {/* ADD BET MODAL */}
        {showAddBet && (
          <div onClick={() => setShowAddBet(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            zIndex: 10000, overflowY: 'auto', paddingTop: '40px', paddingBottom: '40px'
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: theme.panel, border: theme.panelBorder,
              borderRadius: '16px', padding: '24px', width: '92%', maxWidth: '450px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: theme.text, fontSize: '18px', fontWeight: '900', margin: 0 }}>Nuova Scommessa</h2>
                <button onClick={() => setShowAddBet(false)} style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              {/* Date */}
              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Data</label>
              <input type="date" value={betDate} onChange={e => setBetDate(e.target.value)}
                style={{ ...inputStyle, marginBottom: '12px' }} />

              {/* Bet type */}
              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tipo</label>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {['singola', 'doppia', 'tripla', 'quadrupla', 'quintupla'].map(t => (
                  <button key={t} onClick={() => handleBetTypeChange(t)} style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                    background: betType === t ? `${theme.cyan}20` : 'rgba(255,255,255,0.04)',
                    border: betType === t ? `1px solid ${theme.cyan}40` : '1px solid rgba(255,255,255,0.08)',
                    color: betType === t ? theme.cyan : theme.textDim,
                    cursor: 'pointer', textTransform: 'capitalize'
                  }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Selections */}
              {betSelections.map((sel, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px', padding: '10px', marginBottom: '8px'
                }}>
                  <div style={{ color: theme.textDim, fontSize: '10px', fontWeight: '700', marginBottom: '6px' }}>
                    Selezione {i + 1}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <input placeholder="Casa" value={sel.home || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], home: e.target.value }; setBetSelections(ns);
                    }} style={inputStyle} />
                    <input placeholder="Trasferta" value={sel.away || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], away: e.target.value }; setBetSelections(ns);
                    }} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '6px' }}>
                    <select value={sel.market || '1X2'} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], market: e.target.value }; setBetSelections(ns);
                    }} style={{ ...inputStyle, background: 'rgba(255,255,255,0.06)' }}>
                      <option value="1X2" style={{ background: '#1a1d2e', color: '#fff' }}>1X2</option>
                      <option value="DC" style={{ background: '#1a1d2e', color: '#fff' }}>Doppia Chance</option>
                      <option value="O/U" style={{ background: '#1a1d2e', color: '#fff' }}>Over/Under</option>
                      <option value="GG/NG" style={{ background: '#1a1d2e', color: '#fff' }}>GG/NG</option>
                      <option value="Altro" style={{ background: '#1a1d2e', color: '#fff' }}>Altro</option>
                    </select>
                    <input placeholder="Pronostico" value={sel.prediction || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], prediction: e.target.value }; setBetSelections(ns);
                    }} style={inputStyle} />
                    <input placeholder="Quota" type="number" step="0.01" value={sel.odds || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], odds: Number(e.target.value) }; setBetSelections(ns);
                      setSuggestedStake(null);
                    }} style={inputStyle} />
                  </div>
                </div>
              ))}

              {/* Total odds */}
              {betSelections.length > 1 && (
                <div style={{ textAlign: 'right', color: theme.cyan, fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                  Quota totale: {totalOdds.toFixed(2)}
                </div>
              )}

              {/* Stake */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    Stake (€)
                  </label>
                  <input type="number" step="0.5" value={betStake} onChange={e => setBetStake(e.target.value)}
                    placeholder={suggestedStake ? `Suggerito: ${suggestedStake}` : 'Importo'}
                    style={inputStyle} />
                </div>
                <button onClick={fetchSuggestedStake} style={{ ...btnStyle(theme.gold, true), padding: '10px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  💡 Suggerisci
                </button>
              </div>
              {suggestedStake && (
                <div style={{ color: theme.gold, fontSize: '11px', marginBottom: '12px' }}>
                  Stake suggerito: €{suggestedStake.toFixed(2)}
                  <button onClick={() => setBetStake(String(suggestedStake))} style={{ ...btnStyle(theme.gold), padding: '2px 8px', fontSize: '10px', marginLeft: '8px' }}>
                    Usa
                  </button>
                </div>
              )}

              {/* Potential win */}
              {Number(betStake) > 0 && (
                <div style={{ color: theme.success, fontSize: '12px', fontWeight: '700', marginBottom: '16px', textAlign: 'right' }}>
                  Vincita potenziale: €{(Number(betStake) * totalOdds).toFixed(2)}
                </div>
              )}

              {/* Submit */}
              <button onClick={submitBet} disabled={betLoading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${theme.success}30, ${theme.success}60)`,
                  border: `1px solid ${theme.success}50`, color: theme.success,
                  fontSize: '14px', fontWeight: '800', cursor: betLoading ? 'wait' : 'pointer',
                  opacity: betLoading ? 0.6 : 1
                }}
              >
                {betLoading ? '...' : 'Aggiungi Scommessa'}
              </button>
            </div>
          </div>
        )}

        {/* RESULT MODAL */}
        {showResultModal && (
          <div onClick={() => setShowResultModal(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: theme.panel, border: theme.panelBorder,
              borderRadius: '16px', padding: '24px', width: '85%', maxWidth: '350px'
            }}>
              <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0' }}>
                Segna Risultato
              </h3>
              <div style={{ color: theme.textDim, fontSize: '12px', marginBottom: '16px' }}>
                {showResultModal.bet_type} @{showResultModal.total_odds.toFixed(2)} — €{showResultModal.stake_amount.toFixed(2)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => markResult(showResultModal._id, 'won')} style={{
                  padding: '12px', borderRadius: '10px',
                  background: 'rgba(5,249,182,0.1)', border: '1px solid rgba(5,249,182,0.3)',
                  color: theme.success, fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                }}>
                  ✅ Vinta (+€{(showResultModal.potential_win - showResultModal.stake_amount).toFixed(2)})
                </button>
                <button onClick={() => markResult(showResultModal._id, 'lost')} style={{
                  padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,42,109,0.1)', border: '1px solid rgba(255,42,109,0.3)',
                  color: theme.danger, fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                }}>
                  ❌ Persa (-€{showResultModal.stake_amount.toFixed(2)})
                </button>
                <button onClick={() => markResult(showResultModal._id, 'void')} style={{
                  padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: theme.textDim, fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                }}>
                  ⬜ Void (rimborso)
                </button>
              </div>
              <button onClick={() => setShowResultModal(null)} style={{
                width: '100%', marginTop: '12px', padding: '8px', borderRadius: '8px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                color: theme.textDim, fontSize: '12px', cursor: 'pointer'
              }}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && settings && (
          <div onClick={() => setShowSettings(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: theme.panel, border: theme.panelBorder,
              borderRadius: '16px', padding: '24px', width: '85%', maxWidth: '380px'
            }}>
              <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0' }}>
                Impostazioni
              </h3>

              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                Capitale iniziale (€)
              </label>
              <input type="number" value={obCapital} onChange={e => setObCapital(e.target.value)}
                style={{ ...inputStyle, marginBottom: '12px' }} />

              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                Aggressivita
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {(['conservative', 'moderate', 'aggressive'] as const).map(a => (
                  <button key={a} onClick={() => setObAggr(a)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '700',
                    background: obAggr === a ? `${theme.cyan}20` : 'rgba(255,255,255,0.04)',
                    border: obAggr === a ? `1px solid ${theme.cyan}50` : '1px solid rgba(255,255,255,0.1)',
                    color: obAggr === a ? theme.cyan : theme.textDim
                  }}>
                    {a === 'conservative' ? '🛡️' : a === 'moderate' ? '⚖️' : '🔥'}
                  </button>
                ))}
              </div>

              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                Max %: {obMaxPct}%
              </label>
              <input type="range" min="1" max="10" value={obMaxPct} onChange={e => setObMaxPct(e.target.value)}
                style={{ width: '100%', marginBottom: '16px' }} />

              <button onClick={async () => {
                await submitOnboarding();
                setShowSettings(false);
              }} style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                background: `${theme.cyan}20`, border: `1px solid ${theme.cyan}40`,
                color: theme.cyan, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                marginBottom: '10px'
              }}>
                Salva
              </button>

              <button onClick={async () => {
                if (confirm('ATTENZIONE: questo cancellerà TUTTE le scommesse e resetterà il saldo. Sei sicuro?')) {
                  await apiFetch('/reset', { method: 'POST' });
                  setShowSettings(false);
                  await Promise.all([loadSettings(), loadBets()]);
                }
              }} style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                background: 'rgba(255,42,109,0.08)', border: '1px solid rgba(255,42,109,0.2)',
                color: theme.danger, fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}>
                Reset Totale
              </button>
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <div style={{
          background: 'rgba(255,42,109,0.04)', border: '1px solid rgba(255,42,109,0.12)',
          borderRadius: '10px', padding: '12px', marginTop: '20px', marginBottom: '80px',
          fontSize: '10px', color: theme.textDim, lineHeight: 1.5, textAlign: 'center'
        }}>
          Il gioco d'azzardo puo causare dipendenza. Gioca responsabilmente. 18+
          <br />Numero Verde: <span style={{ color: theme.cyan }}>800 55 88 22</span>
        </div>

      </div>
    </div>
  );
}
