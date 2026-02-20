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
  // Spreadsheet
  cellBorder: '1px solid rgba(255,255,255,0.06)',
  headerBg: 'rgba(0, 240, 255, 0.06)',
  rowEven: 'rgba(255,255,255,0.015)',
  rowOdd: 'transparent',
  rowHover: 'rgba(0,240,255,0.04)',
};

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

const MONTH_NAMES = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const DEFAULT_SETTINGS = {
  initial_capital: 500,
  max_bet_pct: 4,
  daily_exposure_pct: 15,
  aggressiveness: 'moderate'
};

// ============================================
// TYPES
// ============================================

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

interface Settings {
  initial_capital: number;
  current_balance: number;
  max_bet_pct: number;
  daily_exposure_pct: number;
  aggressiveness: string;
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

interface SummaryMonth {
  count: number;
  won: number;
  lost: number;
  pending: number;
  stake: number;
  wins: number;
  profit: number;
}

// ============================================
// HELPERS
// ============================================

const isMob = () => window.innerWidth < 768;
const plColor = (v: number) => v > 0 ? theme.success : v < 0 ? theme.danger : theme.textDim;
const plSign = (v: number) => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
const fmtDate = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}`; };
const statusIcon = (s: string) => s === 'won' ? '✅' : s === 'lost' ? '❌' : s === 'void' ? '⬜' : '⏳';

// Cell style
const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '8px 10px',
  borderRight: theme.cellBorder,
  fontSize: '12px',
  whiteSpace: 'nowrap',
  ...extra,
});

const headerCell = (extra?: React.CSSProperties): React.CSSProperties => ({
  ...cell(extra),
  background: theme.headerBg,
  color: theme.cyan,
  fontWeight: '800',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
});

// ============================================
// COMPONENT
// ============================================

export default function MoneyTracker({ onBack }: { onBack?: () => void }) {
  const { user, getIdToken } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(isMob());

  // Data
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tier, setTier] = useState('free');
  const [bets, setBets] = useState<Bet[]>([]);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [summaryData, setSummaryData] = useState<Record<string, SummaryMonth> | null>(null);
  const [summaryTotals, setSummaryTotals] = useState<{ count: number; won: number; lost: number; stake: number; wins: number; profit: number; yield: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigation
  const now = new Date();
  const [activeTab, setActiveTab] = useState<'bets' | 'summary' | 'settings'>('bets');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());

  // Modals
  const [showAddBet, setShowAddBet] = useState(false);
  const [showResultModal, setShowResultModal] = useState<Bet | null>(null);

  // Add bet form
  const [betType, setBetType] = useState('singola');
  const [betSelections, setBetSelections] = useState<Partial<Selection>[]>([{ home: '', away: '', market: '1X2', prediction: '', odds: 0 }]);
  const [betStake, setBetStake] = useState('');
  const [suggestedStake, setSuggestedStake] = useState<number | null>(null);
  const [betDate, setBetDate] = useState(new Date().toISOString().slice(0, 10));
  const [betLoading, setBetLoading] = useState(false);

  // Settings form
  const [sCapital, setSCapital] = useState('500');
  const [sMaxBet, setSMaxBet] = useState('4');
  const [sDailyExp, setSDailyExp] = useState('15');
  const [sAggr, setSAggr] = useState('moderate');
  const [settingsSaving, setSettingsSaving] = useState(false);

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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options?.headers || {}) }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, [getIdToken]);

  // Load settings (auto-create if missing)
  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch('/settings');
      if (data.settings) {
        setSettings(data.settings);
        setTier(data.tier || 'free');
        // Sync form
        setSCapital(String(data.settings.initial_capital));
        setSMaxBet(String(data.settings.max_bet_pct || 4));
        setSDailyExp(String(data.settings.daily_exposure_pct || 15));
        setSAggr(data.settings.aggressiveness || 'moderate');
      } else {
        // Auto-create defaults
        const created = await apiFetch('/settings', {
          method: 'POST',
          body: JSON.stringify(DEFAULT_SETTINGS)
        });
        setSettings(created.settings);
        setTier(data.tier || 'free');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore caricamento');
    }
  }, [apiFetch]);

  // Load bets
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

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await apiFetch(`/summary?year=${summaryYear}`);
      setSummaryData(data.months || null);
      setSummaryTotals(data.totals || null);
    } catch { /* ignore */ }
  }, [apiFetch, summaryYear]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    Promise.all([loadSettings(), loadBets()])
      .finally(() => setLoading(false));
  }, [user, loadSettings, loadBets]);

  // Load summary when tab changes
  useEffect(() => {
    if (activeTab === 'summary' && user) loadSummary();
  }, [activeTab, user, loadSummary]);

  // Bet type helpers
  const betTypeToCount: Record<string, number> = { singola: 1, doppia: 2, tripla: 3, quadrupla: 4, quintupla: 5 };
  const handleBetTypeChange = (type: string) => {
    setBetType(type);
    const count = betTypeToCount[type] || 1;
    setBetSelections(Array.from({ length: count }, (_, i) =>
      betSelections[i] || { home: '', away: '', market: '1X2', prediction: '', odds: 0 }
    ));
    setSuggestedStake(null);
  };
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

  // Submit bet
  const submitBet = async () => {
    setBetLoading(true);
    setError('');
    try {
      const validSel = betSelections.filter(s => s.prediction && s.odds && Number(s.odds) > 1);
      if (validSel.length === 0) { setError('Compila almeno una selezione'); setBetLoading(false); return; }
      await apiFetch('/bets', {
        method: 'POST',
        body: JSON.stringify({ bet_type: betType, selections: validSel, stake_amount: Number(betStake), date: betDate })
      });
      setShowAddBet(false);
      setBetSelections([{ home: '', away: '', market: '1X2', prediction: '', odds: 0 }]);
      setBetStake(''); setBetType('singola'); setSuggestedStake(null);
      await Promise.all([loadSettings(), loadBets()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally { setBetLoading(false); }
  };

  // Mark result
  const markResult = async (betId: string, status: string) => {
    try {
      await apiFetch(`/bets/${betId}/result`, { method: 'PUT', body: JSON.stringify({ status }) });
      setShowResultModal(null);
      await Promise.all([loadSettings(), loadBets()]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Errore'); }
  };

  // Delete bet
  const deleteBet = async (betId: string) => {
    try {
      await apiFetch(`/bets/${betId}`, { method: 'DELETE' });
      await Promise.all([loadSettings(), loadBets()]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Errore'); }
  };

  // Save settings
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const data = await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify({
          initial_capital: Number(sCapital),
          max_bet_pct: Number(sMaxBet),
          daily_exposure_pct: Number(sDailyExp),
          aggressiveness: sAggr
        })
      });
      setSettings(data.settings);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore salvataggio');
    } finally { setSettingsSaving(false); }
  };

  // Input style
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: theme.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box'
  };

  // Sort bets by date ASC for table
  const sortedBets = [...bets].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));

  // ============================================
  // AUTH GATE
  // ============================================

  if (!user) {
    return (
      <div style={{ background: theme.bg, minHeight: '100vh', fontFamily: theme.font, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h1 style={{ color: theme.text, fontSize: '22px', fontWeight: '900', marginBottom: '8px' }}>Money Tracker</h1>
          <p style={{ color: theme.textDim, fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Accedi per tracciare le tue scommesse e gestire il bankroll.
          </p>
          <button onClick={() => setShowAuth(true)} style={{
            background: `linear-gradient(135deg, ${theme.cyan}30, ${theme.cyan}60)`,
            border: `1px solid ${theme.cyan}60`, color: theme.cyan,
            padding: '14px 40px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: '800'
          }}>Accedi</button>
          {onBack && <div style={{ marginTop: '16px' }}><button onClick={onBack} style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '13px' }}>← Indietro</button></div>}
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', fontFamily: theme.font }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '10px' : '20px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onBack && <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: theme.textDim, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>←</button>}
            <h1 style={{ color: theme.text, fontSize: isMobile ? '16px' : '20px', fontWeight: '900', margin: 0 }}>Money Tracker</h1>
            <span style={{
              background: tier === 'free' ? 'rgba(139,155,180,0.15)' : 'rgba(255,215,0,0.15)',
              border: `1px solid ${tier === 'free' ? 'rgba(139,155,180,0.3)' : 'rgba(255,215,0,0.3)'}`,
              color: tier === 'free' ? theme.textDim : theme.gold,
              padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase'
            }}>{tier}</span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: 'rgba(255,42,109,0.1)', border: '1px solid rgba(255,42,109,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', color: theme.danger, fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <span onClick={() => setError('')} style={{ cursor: 'pointer' }}>✕</span>
          </div>
        )}

        {/* STATS BAR */}
        {settings && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
            gap: '1px', marginBottom: '12px',
            background: 'rgba(0,240,255,0.08)', borderRadius: '10px', overflow: 'hidden',
            border: theme.panelBorder
          }}>
            {[
              { label: 'Saldo', value: `€${settings.current_balance.toFixed(2)}`, color: theme.text },
              { label: 'Capitale', value: `€${settings.initial_capital.toFixed(2)}`, color: theme.textDim },
              { label: 'P/L Mese', value: monthStats ? `${plSign(monthStats.totalProfit)}€` : '—', color: monthStats ? plColor(monthStats.totalProfit) : theme.textDim },
              { label: 'Yield', value: monthStats ? `${monthStats.roi}%` : '—', color: monthStats ? plColor(monthStats.roi) : theme.textDim },
              { label: 'Exp. Max', value: `${settings.daily_exposure_pct || 15}% (€${((settings.current_balance * (settings.daily_exposure_pct || 15)) / 100).toFixed(0)})`, color: theme.warning },
              { label: 'Lim. Singola', value: `${settings.max_bet_pct}% (€${((settings.current_balance * settings.max_bet_pct) / 100).toFixed(0)})`, color: theme.cyan },
            ].map((s, i) => (
              <div key={i} style={{ background: theme.panelSolid, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: theme.textDim, fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: isMobile ? '12px' : '14px', fontWeight: '800' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB BAR */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '12px', borderBottom: '2px solid rgba(255,255,255,0.06)' }}>
          {([
            { key: 'bets', label: '📋 Scommesse' },
            { key: 'summary', label: '📊 Sommario' },
            { key: 'settings', label: '⚙️ Impostazioni' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '10px 16px', fontSize: '12px', fontWeight: '700',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === t.key ? theme.cyan : theme.textDim,
              borderBottom: activeTab === t.key ? `2px solid ${theme.cyan}` : '2px solid transparent',
              marginBottom: '-2px'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && <div style={{ textAlign: 'center', padding: '60px', color: theme.textDim }}>Caricamento...</div>}

        {/* ================================================ */}
        {/* TAB: SCOMMESSE */}
        {/* ================================================ */}
        {!loading && activeTab === 'bets' && (
          <>
            {/* Month selector */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', alignItems: 'center' }}>
              <button onClick={() => setSelectedYear(y => y - 1)} style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '11px', padding: '4px 6px' }}>◀</button>
              <span style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', minWidth: '36px', textAlign: 'center' }}>{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '11px', padding: '4px 6px' }}>▶</button>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              {MONTH_SHORT.map((m, i) => (
                <button key={i} onClick={() => setSelectedMonth(i)} style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                  background: i === selectedMonth ? `${theme.cyan}15` : 'transparent',
                  border: i === selectedMonth ? `1px solid ${theme.cyan}30` : '1px solid transparent',
                  color: i === selectedMonth ? theme.cyan : theme.textDim,
                  cursor: 'pointer', flexShrink: 0
                }}>{m}</button>
              ))}
            </div>

            {/* W/L counters */}
            {monthStats && monthStats.total > 0 && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '11px' }}>
                <span style={{ color: theme.success, fontWeight: '700' }}>✅ {monthStats.won}W</span>
                <span style={{ color: theme.danger, fontWeight: '700' }}>❌ {monthStats.lost}L</span>
                <span style={{ color: theme.warning, fontWeight: '700' }}>⏳ {monthStats.pending}P</span>
                <span style={{ color: theme.textDim }}>Totale: {monthStats.total}</span>
              </div>
            )}

            {/* SPREADSHEET TABLE */}
            <div style={{
              border: theme.panelBorder, borderRadius: '8px', overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '700px' : 'auto' }}>
                  <thead>
                    <tr>
                      <th style={headerCell({ width: '30px', textAlign: 'center' })}>#</th>
                      <th style={headerCell({ width: '60px' })}>Data</th>
                      <th style={headerCell({ width: '60px' })}>Tipo</th>
                      <th style={headerCell()}>Partita</th>
                      <th style={headerCell({ width: '80px' })}>Pronostico</th>
                      <th style={headerCell({ width: '55px', textAlign: 'right' })}>Quota</th>
                      <th style={headerCell({ width: '65px', textAlign: 'right' })}>Stake</th>
                      <th style={headerCell({ width: '70px', textAlign: 'right' })}>Potenziale</th>
                      <th style={headerCell({ width: '40px', textAlign: 'center' })}>Esito</th>
                      <th style={headerCell({ width: '70px', textAlign: 'right' })}>P/L</th>
                      <th style={headerCell({ width: '60px', textAlign: 'center' })}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBets.map((bet, idx) => (
                      <tr key={bet._id} style={{ background: idx % 2 === 0 ? theme.rowEven : theme.rowOdd }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.rowHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? theme.rowEven : theme.rowOdd; }}
                      >
                        <td style={cell({ textAlign: 'center', color: theme.textDim })}>{idx + 1}</td>
                        <td style={cell({ color: theme.text })}>{fmtDate(bet.date)}</td>
                        <td style={cell({ color: theme.textDim, textTransform: 'capitalize', fontSize: '11px' })}>{bet.bet_type}</td>
                        <td style={cell({ color: theme.text, fontSize: '11px' })}>
                          {bet.selections.map(s => `${s.home || '?'} v ${s.away || '?'}`).join(' | ')}
                        </td>
                        <td style={cell({ color: theme.cyan, fontWeight: '700' })}>
                          {bet.selections.map(s => s.prediction).join(' + ')}
                        </td>
                        <td style={cell({ textAlign: 'right', color: theme.text, fontWeight: '600' })}>{bet.total_odds.toFixed(2)}</td>
                        <td style={cell({ textAlign: 'right', color: theme.text })}>{bet.stake_amount.toFixed(2)}</td>
                        <td style={cell({ textAlign: 'right', color: theme.textDim })}>{bet.potential_win.toFixed(2)}</td>
                        <td style={cell({ textAlign: 'center', fontSize: '14px' })}>{statusIcon(bet.status)}</td>
                        <td style={cell({ textAlign: 'right', color: bet.status === 'pending' ? theme.warning : plColor(bet.net_profit || 0), fontWeight: '700' })}>
                          {bet.status === 'pending' ? `–${bet.stake_amount.toFixed(2)}` : bet.net_profit !== null ? plSign(bet.net_profit) : '—'}
                        </td>
                        <td style={cell({ textAlign: 'center' })}>
                          {bet.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                              <button onClick={() => setShowResultModal(bet)} title="Segna risultato"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px' }}>📝</button>
                              <button onClick={() => { if (confirm('Cancellare?')) deleteBet(bet._id); }} title="Cancella"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px' }}>🗑️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Empty placeholder rows */}
                    {sortedBets.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`empty-${i}`} style={{ background: i % 2 === 0 ? theme.rowEven : theme.rowOdd }}>
                        <td style={cell({ textAlign: 'center', color: 'rgba(255,255,255,0.08)' })}>{i + 1}</td>
                        <td style={cell({ color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ textAlign: 'right', color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ textAlign: 'right', color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ textAlign: 'right', color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ textAlign: 'center', color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ textAlign: 'right', color: 'rgba(255,255,255,0.08)' })}>—</td>
                        <td style={cell({ textAlign: 'center', color: 'rgba(255,255,255,0.08)' })}>—</td>
                      </tr>
                    ))}

                    {/* ADD ROW */}
                    <tr style={{ background: 'rgba(0,240,255,0.03)', cursor: 'pointer' }} onClick={() => setShowAddBet(true)}>
                      <td colSpan={11} style={{ padding: '10px', textAlign: 'center', color: theme.cyan, fontSize: '12px', fontWeight: '700', borderTop: theme.cellBorder }}>
                        + Aggiungi scommessa
                      </td>
                    </tr>

                    {/* TOTALS ROW */}
                    {monthStats && monthStats.total > 0 && (
                      <tr style={{ background: 'rgba(0,240,255,0.08)' }}>
                        <td colSpan={6} style={cell({ fontWeight: '800', color: theme.cyan, fontSize: '11px' })}>
                          TOTALE MESE — {MONTH_SHORT[selectedMonth]} {selectedYear}
                        </td>
                        <td style={cell({ textAlign: 'right', fontWeight: '800', color: theme.text })}>{monthStats.totalStake.toFixed(2)}</td>
                        <td style={cell({ textAlign: 'right', color: theme.textDim })}>—</td>
                        <td style={cell({ textAlign: 'center', fontWeight: '700', color: theme.text })}>{monthStats.won}W {monthStats.lost}L</td>
                        <td style={cell({ textAlign: 'right', fontWeight: '800', color: plColor(monthStats.totalProfit) })}>{plSign(monthStats.totalProfit)}</td>
                        <td style={cell({ textAlign: 'center', fontWeight: '700', color: plColor(monthStats.roi) })}>{monthStats.roi}%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================================================ */}
        {/* TAB: SOMMARIO ANNUALE */}
        {/* ================================================ */}
        {!loading && activeTab === 'summary' && (
          <>
            {/* Year selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <button onClick={() => setSummaryYear(y => y - 1)} style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '14px' }}>◀</button>
              <span style={{ color: theme.text, fontSize: '16px', fontWeight: '800' }}>{summaryYear}</span>
              <button onClick={() => setSummaryYear(y => y + 1)} style={{ background: 'none', border: 'none', color: theme.textDim, cursor: 'pointer', fontSize: '14px' }}>▶</button>
            </div>

            <div style={{ border: theme.panelBorder, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '600px' : 'auto' }}>
                  <thead>
                    <tr>
                      <th style={headerCell({ width: '30px', textAlign: 'center' })}>#</th>
                      <th style={headerCell()}>Mese</th>
                      <th style={headerCell({ textAlign: 'right' })}>Scommesso</th>
                      <th style={headerCell({ textAlign: 'right' })}>Vincite</th>
                      <th style={headerCell({ textAlign: 'right' })}>P/L Netto</th>
                      <th style={headerCell({ textAlign: 'center' })}>W/L</th>
                      <th style={headerCell({ textAlign: 'right' })}>Yield %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const key = String(i + 1).padStart(2, '0');
                      const m = summaryData?.[key];
                      const hasData = m && m.count > 0;
                      const profit = m?.profit || 0;
                      const yieldPct = m && m.stake > 0 ? Math.round((profit / m.stake) * 10000) / 100 : 0;
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? theme.rowEven : theme.rowOdd }}>
                          <td style={cell({ textAlign: 'center', color: theme.textDim })}>{i + 1}</td>
                          <td style={cell({ color: hasData ? theme.text : theme.textDim, fontWeight: hasData ? '700' : '400' })}>
                            {MONTH_NAMES[i]} {summaryYear}
                          </td>
                          <td style={cell({ textAlign: 'right', color: hasData ? theme.text : 'rgba(255,255,255,0.08)' })}>
                            {hasData ? `€${m.stake.toFixed(2)}` : '€0,00'}
                          </td>
                          <td style={cell({ textAlign: 'right', color: hasData ? theme.success : 'rgba(255,255,255,0.08)' })}>
                            {hasData ? `€${m.wins.toFixed(2)}` : '€0,00'}
                          </td>
                          <td style={cell({ textAlign: 'right', color: hasData ? plColor(profit) : 'rgba(255,255,255,0.08)', fontWeight: '700' })}>
                            {hasData ? `${plSign(profit)}€` : '€0,00'}
                          </td>
                          <td style={cell({ textAlign: 'center', color: hasData ? theme.text : 'rgba(255,255,255,0.08)', fontSize: '11px' })}>
                            {hasData ? `${m.won}W / ${m.lost}L` : '—'}
                          </td>
                          <td style={cell({ textAlign: 'right', color: hasData ? plColor(yieldPct) : 'rgba(255,255,255,0.08)', fontWeight: '700' })}>
                            {hasData ? `${yieldPct}%` : '0,00%'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* TOTALS */}
                    <tr style={{ background: 'rgba(0,240,255,0.08)' }}>
                      <td colSpan={2} style={cell({ fontWeight: '800', color: theme.cyan, fontSize: '11px' })}>SOMMARIO ANNUALE</td>
                      <td style={cell({ textAlign: 'right', fontWeight: '800', color: theme.text })}>{summaryTotals ? `€${summaryTotals.stake.toFixed(2)}` : '—'}</td>
                      <td style={cell({ textAlign: 'right', fontWeight: '800', color: theme.success })}>{summaryTotals ? `€${summaryTotals.wins.toFixed(2)}` : '—'}</td>
                      <td style={cell({ textAlign: 'right', fontWeight: '800', color: summaryTotals ? plColor(summaryTotals.profit) : theme.textDim })}>{summaryTotals ? `${plSign(summaryTotals.profit)}€` : '—'}</td>
                      <td style={cell({ textAlign: 'center', fontWeight: '700', color: theme.text, fontSize: '11px' })}>{summaryTotals ? `${summaryTotals.won}W / ${summaryTotals.lost}L` : '—'}</td>
                      <td style={cell({ textAlign: 'right', fontWeight: '800', color: summaryTotals ? plColor(summaryTotals.yield) : theme.textDim })}>{summaryTotals ? `${summaryTotals.yield}%` : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Situazione Cassa */}
            {settings && (
              <div style={{
                background: 'rgba(5,249,182,0.08)', border: '1px solid rgba(5,249,182,0.2)',
                borderRadius: '10px', padding: '16px', marginTop: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: theme.success, fontWeight: '800', fontSize: '14px' }}>SITUAZIONE CASSA</span>
                <span style={{ color: theme.text, fontWeight: '900', fontSize: '20px' }}>€{settings.current_balance.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {/* ================================================ */}
        {/* TAB: IMPOSTAZIONI */}
        {/* ================================================ */}
        {!loading && activeTab === 'settings' && (
          <div style={{ maxWidth: '500px' }}>
            {/* Capitale */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Capitale iniziale di investimento (€)
              </label>
              <input type="number" value={sCapital} onChange={e => setSCapital(e.target.value)}
                style={inputStyle} min="10" />
            </div>

            {/* Esposizione giornaliera */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Esposizione massima giornaliera
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="number" value={sDailyExp} onChange={e => setSDailyExp(e.target.value)}
                  style={{ ...inputStyle, width: '80px' }} min="5" max="50" />
                <span style={{ color: theme.textDim, fontSize: '12px' }}>%</span>
                <span style={{ color: theme.warning, fontSize: '13px', fontWeight: '700' }}>
                  = €{settings ? ((settings.current_balance * Number(sDailyExp)) / 100).toFixed(2) : '—'}
                </span>
              </div>
            </div>

            {/* Limite singola */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Limite singola scommessa
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="number" value={sMaxBet} onChange={e => setSMaxBet(e.target.value)}
                  style={{ ...inputStyle, width: '80px' }} min="1" max="20" />
                <span style={{ color: theme.textDim, fontSize: '12px' }}>%</span>
                <span style={{ color: theme.cyan, fontSize: '13px', fontWeight: '700' }}>
                  = €{settings ? ((settings.current_balance * Number(sMaxBet)) / 100).toFixed(2) : '—'}
                </span>
              </div>
            </div>

            {/* Aggressivita */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: theme.textDim, fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                Aggressivita stake suggerito
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([
                  { key: 'conservative', icon: '🛡️', label: 'Prudente', desc: '1.5%' },
                  { key: 'moderate', icon: '⚖️', label: 'Moderato', desc: '3%' },
                  { key: 'aggressive', icon: '🔥', label: 'Aggressivo', desc: '5%' },
                ]).map(a => (
                  <button key={a.key} onClick={() => setSAggr(a.key)} style={{
                    flex: 1, padding: '10px 6px', borderRadius: '8px', cursor: 'pointer',
                    background: sAggr === a.key ? `${theme.cyan}15` : 'rgba(255,255,255,0.03)',
                    border: sAggr === a.key ? `1px solid ${theme.cyan}40` : '1px solid rgba(255,255,255,0.08)',
                    color: sAggr === a.key ? theme.cyan : theme.textDim,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '16px' }}>{a.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>{a.label}</div>
                    <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.7 }}>{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Riepilogo su capitale aggiornato */}
            {settings && (
              <div style={{
                background: theme.panel, border: theme.panelBorder,
                borderRadius: '10px', padding: '14px', marginBottom: '20px'
              }}>
                <div style={{ color: theme.cyan, fontSize: '11px', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Ricalcolo su capitale aggiornato (€{settings.current_balance.toFixed(2)})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ color: theme.textDim, fontSize: '10px' }}>Exp. Max Giornaliera</div>
                    <div style={{ color: theme.warning, fontSize: '14px', fontWeight: '800' }}>
                      €{((settings.current_balance * Number(sDailyExp)) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: theme.textDim, fontSize: '10px' }}>Limite Singola</div>
                    <div style={{ color: theme.cyan, fontSize: '14px', fontWeight: '800' }}>
                      €{((settings.current_balance * Number(sMaxBet)) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            <button onClick={saveSettings} disabled={settingsSaving} style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              background: `${theme.cyan}20`, border: `1px solid ${theme.cyan}40`,
              color: theme.cyan, fontSize: '14px', fontWeight: '800',
              cursor: settingsSaving ? 'wait' : 'pointer', opacity: settingsSaving ? 0.6 : 1,
              marginBottom: '20px'
            }}>
              {settingsSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
            </button>

            {/* Danger zone */}
            <div style={{
              borderTop: '1px solid rgba(255,42,109,0.15)', paddingTop: '16px'
            }}>
              <div style={{ color: theme.danger, fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>ZONA PERICOLOSA</div>
              <button onClick={async () => {
                if (confirm('ATTENZIONE: cancellerà TUTTE le scommesse e resetterà il saldo al capitale iniziale. Sei sicuro?')) {
                  await apiFetch('/reset', { method: 'POST' });
                  await Promise.all([loadSettings(), loadBets()]);
                  setActiveTab('bets');
                }
              }} style={{
                width: '100%', padding: '10px', borderRadius: '10px',
                background: 'rgba(255,42,109,0.06)', border: '1px solid rgba(255,42,109,0.15)',
                color: theme.danger, fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}>
                Reset Totale (cancella tutto)
              </button>
            </div>
          </div>
        )}

        {/* ================================================ */}
        {/* MODAL: AGGIUNGI SCOMMESSA */}
        {/* ================================================ */}
        {showAddBet && (
          <div onClick={() => setShowAddBet(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            zIndex: 10000, overflowY: 'auto', paddingTop: '30px', paddingBottom: '30px'
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: theme.panelSolid, border: theme.panelBorder,
              borderRadius: '12px', padding: '20px', width: '92%', maxWidth: '480px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: '800', margin: 0 }}>Nuova Scommessa</h3>
                <button onClick={() => setShowAddBet(false)} style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: '16px', cursor: 'pointer' }}>✕</button>
              </div>

              {/* Date + Type */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: theme.textDim, fontSize: '10px', fontWeight: '700', display: 'block', marginBottom: '3px' }}>DATA</label>
                  <input type="date" value={betDate} onChange={e => setBetDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: theme.textDim, fontSize: '10px', fontWeight: '700', display: 'block', marginBottom: '3px' }}>TIPO</label>
                  <select value={betType} onChange={e => handleBetTypeChange(e.target.value)} style={{ ...inputStyle, background: 'rgba(255,255,255,0.06)' }}>
                    {['singola', 'doppia', 'tripla', 'quadrupla', 'quintupla'].map(t => (
                      <option key={t} value={t} style={{ background: '#1a1d2e', color: '#fff' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selections */}
              {betSelections.map((sel, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '6px', padding: '8px', marginBottom: '6px'
                }}>
                  <div style={{ color: theme.textDim, fontSize: '9px', fontWeight: '700', marginBottom: '4px' }}>SEL. {i + 1}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                    <input placeholder="Casa" value={sel.home || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], home: e.target.value }; setBetSelections(ns);
                    }} style={{ ...inputStyle, padding: '7px 8px', fontSize: '12px' }} />
                    <input placeholder="Trasferta" value={sel.away || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], away: e.target.value }; setBetSelections(ns);
                    }} style={{ ...inputStyle, padding: '7px 8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: '4px' }}>
                    <select value={sel.market || '1X2'} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], market: e.target.value }; setBetSelections(ns);
                    }} style={{ ...inputStyle, padding: '7px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.06)' }}>
                      {['1X2', 'DC', 'O/U', 'GG/NG', 'Altro'].map(m => (
                        <option key={m} value={m} style={{ background: '#1a1d2e', color: '#fff' }}>{m}</option>
                      ))}
                    </select>
                    <input placeholder="Pronostico" value={sel.prediction || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], prediction: e.target.value }; setBetSelections(ns);
                    }} style={{ ...inputStyle, padding: '7px 8px', fontSize: '12px' }} />
                    <input placeholder="Quota" type="number" step="0.01" value={sel.odds || ''} onChange={e => {
                      const ns = [...betSelections]; ns[i] = { ...ns[i], odds: Number(e.target.value) }; setBetSelections(ns);
                      setSuggestedStake(null);
                    }} style={{ ...inputStyle, padding: '7px 8px', fontSize: '12px' }} />
                  </div>
                </div>
              ))}

              {/* Total odds */}
              {betSelections.length > 1 && (
                <div style={{ textAlign: 'right', color: theme.cyan, fontSize: '11px', fontWeight: '700', marginBottom: '6px' }}>
                  Quota totale: {totalOdds.toFixed(2)}
                </div>
              )}

              {/* Stake */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: theme.textDim, fontSize: '10px', fontWeight: '700', display: 'block', marginBottom: '3px' }}>STAKE (€)</label>
                  <input type="number" step="0.5" value={betStake} onChange={e => setBetStake(e.target.value)}
                    placeholder={suggestedStake ? `${suggestedStake}` : ''} style={inputStyle} />
                </div>
                <button onClick={fetchSuggestedStake} style={{
                  background: `${theme.gold}15`, border: `1px solid ${theme.gold}30`, color: theme.gold,
                  padding: '10px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap'
                }}>💡 Suggerisci</button>
              </div>
              {suggestedStake && (
                <div style={{ color: theme.gold, fontSize: '10px', marginBottom: '8px' }}>
                  Suggerito: €{suggestedStake.toFixed(2)}
                  <button onClick={() => setBetStake(String(suggestedStake))} style={{
                    background: 'none', border: `1px solid ${theme.gold}30`, color: theme.gold,
                    padding: '1px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', marginLeft: '6px'
                  }}>Usa</button>
                </div>
              )}

              {/* Potential */}
              {Number(betStake) > 0 && (
                <div style={{ color: theme.success, fontSize: '12px', fontWeight: '700', marginBottom: '12px', textAlign: 'right' }}>
                  Vincita: €{(Number(betStake) * totalOdds).toFixed(2)}
                </div>
              )}

              {/* Submit */}
              <button onClick={submitBet} disabled={betLoading} style={{
                width: '100%', padding: '11px', borderRadius: '10px',
                background: `${theme.success}20`, border: `1px solid ${theme.success}40`,
                color: theme.success, fontSize: '13px', fontWeight: '800',
                cursor: betLoading ? 'wait' : 'pointer', opacity: betLoading ? 0.6 : 1
              }}>
                {betLoading ? '...' : 'Aggiungi'}
              </button>
            </div>
          </div>
        )}

        {/* ================================================ */}
        {/* MODAL: RISULTATO */}
        {/* ================================================ */}
        {showResultModal && (
          <div onClick={() => setShowResultModal(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: theme.panelSolid, border: theme.panelBorder,
              borderRadius: '12px', padding: '20px', width: '85%', maxWidth: '320px'
            }}>
              <h3 style={{ color: theme.text, fontSize: '15px', fontWeight: '800', margin: '0 0 12px 0' }}>Risultato</h3>
              <div style={{ color: theme.textDim, fontSize: '11px', marginBottom: '14px' }}>
                {showResultModal.selections.map(s => s.prediction).join(' + ')} @{showResultModal.total_odds.toFixed(2)} — €{showResultModal.stake_amount.toFixed(2)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={() => markResult(showResultModal._id, 'won')} style={{
                  padding: '11px', borderRadius: '8px',
                  background: 'rgba(5,249,182,0.08)', border: '1px solid rgba(5,249,182,0.25)',
                  color: theme.success, fontSize: '13px', fontWeight: '800', cursor: 'pointer'
                }}>✅ Vinta (+€{(showResultModal.potential_win - showResultModal.stake_amount).toFixed(2)})</button>
                <button onClick={() => markResult(showResultModal._id, 'lost')} style={{
                  padding: '11px', borderRadius: '8px',
                  background: 'rgba(255,42,109,0.08)', border: '1px solid rgba(255,42,109,0.25)',
                  color: theme.danger, fontSize: '13px', fontWeight: '800', cursor: 'pointer'
                }}>❌ Persa (-€{showResultModal.stake_amount.toFixed(2)})</button>
                <button onClick={() => markResult(showResultModal._id, 'void')} style={{
                  padding: '11px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: theme.textDim, fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}>⬜ Void (rimborso)</button>
              </div>
              <button onClick={() => setShowResultModal(null)} style={{
                width: '100%', marginTop: '8px', padding: '7px', borderRadius: '6px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                color: theme.textDim, fontSize: '11px', cursor: 'pointer'
              }}>Annulla</button>
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <div style={{
          background: 'rgba(255,42,109,0.03)', border: '1px solid rgba(255,42,109,0.08)',
          borderRadius: '8px', padding: '10px', marginTop: '16px', marginBottom: '20px',
          fontSize: '9px', color: theme.textDim, lineHeight: 1.5, textAlign: 'center'
        }}>
          Il gioco d'azzardo puo causare dipendenza. 18+ | Numero Verde: <span style={{ color: theme.cyan }}>800 55 88 22</span>
        </div>

      </div>
    </div>
  );
}
