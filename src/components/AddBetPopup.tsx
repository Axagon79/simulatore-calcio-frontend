import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const theme = {
  bg: '#05070a',
  panel: 'rgba(18, 20, 35, 0.95)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.2)',
  cyan: '#00f0ff',
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

interface AddBetPopupProps {
  isOpen: boolean;
  onClose: () => void;
  home: string;
  away: string;
  market: string;
  prediction: string;
  odds: number;
}

export default function AddBetPopup({ isOpen, onClose, home, away, market, prediction, odds }: AddBetPopupProps) {
  const { user, getIdToken } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<'choose' | 'tracker' | 'done'>('choose');
  const [stake, setStake] = useState('');
  const [suggestedStake, setSuggestedStake] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const potentialWin = Number(stake) > 0 ? (Number(stake) * odds).toFixed(2) : '—';

  const apiFetch = async (path: string, options?: RequestInit) => {
    const token = await getIdToken();
    if (!token) throw new Error('Non autenticato');
    const res = await fetch(`${API_BASE}/money-tracker${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options?.headers || {}) }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const fetchSuggested = async () => {
    try {
      const data = await apiFetch('/suggest-stake', {
        method: 'POST',
        body: JSON.stringify({ bet_type: 'singola', total_odds: odds })
      });
      setSuggestedStake(data.suggested_stake);
      if (!stake) setStake(String(data.suggested_stake));
    } catch { /* ignore */ }
  };

  const handleSaveTracker = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!stake || Number(stake) <= 0) { setError('Inserisci lo stake'); return; }

    setLoading(true);
    setError('');
    try {
      await apiFetch('/bets', {
        method: 'POST',
        body: JSON.stringify({
          bet_type: 'singola',
          selections: [{ home, away, market, prediction, odds }],
          stake_amount: Number(stake),
          date: new Date().toISOString().slice(0, 10)
        })
      });
      setMode('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('choose');
    setStake('');
    setSuggestedStake(null);
    setError('');
    onClose();
  };

  return (
    <>
      <div onClick={handleClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100001, fontFamily: theme.font
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: theme.panel, border: theme.panelBorder,
          borderRadius: '14px', padding: '20px', width: '88%', maxWidth: '360px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ color: theme.text, fontSize: '15px', fontWeight: '800', margin: 0 }}>
              {mode === 'done' ? 'Aggiunto!' : 'Salva Pronostico'}
            </h3>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: '16px', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Match info */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', padding: '10px', marginBottom: '14px'
          }}>
            <div style={{ color: theme.text, fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
              {home} vs {away}
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
              <span style={{ color: theme.textDim }}>{market}</span>
              <span style={{ color: theme.cyan, fontWeight: '800' }}>{prediction}</span>
              <span style={{ color: '#4dd0e1', fontWeight: '700' }}>@{odds.toFixed(2)}</span>
            </div>
          </div>

          {/* MODE: CHOOSE */}
          {mode === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => {
                if (!user) { setShowAuth(true); return; }
                setMode('tracker');
                fetchSuggested();
              }} style={{
                padding: '14px', borderRadius: '10px',
                background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.2)',
                color: theme.cyan, fontSize: '14px', fontWeight: '800',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '18px' }}>💰</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Salva nel Tracker</div>
                  <div style={{ fontSize: '10px', fontWeight: '400', color: theme.textDim, marginTop: '2px' }}>
                    Traccia la scommessa con stake e bankroll
                  </div>
                </div>
              </button>

              <button disabled style={{
                padding: '14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                color: theme.textDim, fontSize: '14px', fontWeight: '700',
                cursor: 'not-allowed', opacity: 0.5,
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '18px' }}>📝</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Aggiungi in Bolletta</div>
                  <div style={{ fontSize: '10px', fontWeight: '400', marginTop: '2px' }}>
                    Prossimamente
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* MODE: TRACKER — Stake input */}
          {mode === 'tracker' && (
            <div>
              {error && (
                <div style={{
                  background: 'rgba(255,42,109,0.1)', border: '1px solid rgba(255,42,109,0.2)',
                  borderRadius: '6px', padding: '6px 10px', marginBottom: '10px',
                  color: theme.danger, fontSize: '11px'
                }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: theme.textDim, fontSize: '10px', fontWeight: '700', display: 'block', marginBottom: '3px' }}>STAKE (€)</label>
                  <input
                    type="number" step="0.5" value={stake}
                    onChange={e => setStake(e.target.value)}
                    placeholder={suggestedStake ? String(suggestedStake) : ''}
                    autoFocus
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: theme.text, fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button onClick={fetchSuggested} style={{
                  background: `${theme.gold}15`, border: `1px solid ${theme.gold}30`, color: theme.gold,
                  padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                }} title="Stake suggerito">💡</button>
              </div>

              {suggestedStake && (
                <div style={{ color: theme.gold, fontSize: '10px', marginBottom: '6px' }}>
                  Suggerito: €{suggestedStake.toFixed(2)}
                  <button onClick={() => setStake(String(suggestedStake))} style={{
                    background: 'none', border: `1px solid ${theme.gold}30`, color: theme.gold,
                    padding: '1px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '9px', marginLeft: '6px'
                  }}>Usa</button>
                </div>
              )}

              {Number(stake) > 0 && (
                <div style={{ color: theme.success, fontSize: '12px', fontWeight: '700', marginBottom: '12px', textAlign: 'right' }}>
                  Vincita: €{potentialWin}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setMode('choose')} style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: theme.textDim, fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>← Indietro</button>
                <button onClick={handleSaveTracker} disabled={loading} style={{
                  flex: 2, padding: '10px', borderRadius: '8px',
                  background: `${theme.success}20`, border: `1px solid ${theme.success}40`,
                  color: theme.success, fontSize: '13px', fontWeight: '800',
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1
                }}>
                  {loading ? '...' : 'Conferma'}
                </button>
              </div>
            </div>
          )}

          {/* MODE: DONE */}
          {mode === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
              <div style={{ color: theme.success, fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>
                Scommessa aggiunta al Tracker!
              </div>
              <div style={{ color: theme.textDim, fontSize: '12px', marginBottom: '16px' }}>
                {prediction} @{odds.toFixed(2)} — €{Number(stake).toFixed(2)}
              </div>
              <button onClick={handleClose} style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                background: `${theme.cyan}15`, border: `1px solid ${theme.cyan}30`,
                color: theme.cyan, fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}>Chiudi</button>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => {
        setShowAuth(false);
        setMode('tracker');
        fetchSuggested();
      }} />
    </>
  );
}
