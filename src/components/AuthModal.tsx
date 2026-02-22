import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { getTheme } from '../AppDev/costanti';
const theme = getTheme();

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore login Google';
      if (msg.includes('popup-closed')) {
        setError('Popup chiuso. Riprova.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('Email o password non validi');
      } else if (msg.includes('email-already-in-use')) {
        setError('Email gia registrata. Prova ad accedere.');
      } else if (msg.includes('weak-password')) {
        setError('Password troppo debole (min 6 caratteri)');
      } else if (msg.includes('invalid-email')) {
        setError('Email non valida');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100000, fontFamily: theme.font
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.panel, border: theme.panelBorder,
          borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: theme.text, fontSize: '20px', fontWeight: '900', margin: 0 }}>
            {mode === 'login' ? 'Accedi' : 'Registrati'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: theme.textDim, fontSize: '20px', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Google Login — primario */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.95)', border: 'none',
            color: '#333', fontSize: '15px', fontWeight: '700',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            opacity: loading ? 0.6 : 1,
            marginBottom: '20px'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continua con Google
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: theme.textDim, fontSize: '12px' }}>oppure</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: theme.text, fontSize: '14px', marginBottom: '10px',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: theme.text, fontSize: '14px', marginBottom: mode === 'signup' ? '10px' : '16px',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          {mode === 'signup' && (
            <input
              type="password"
              placeholder="Conferma password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: theme.text, fontSize: '14px', marginBottom: '16px',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          )}

          {error && (
            <div style={{
              color: theme.danger, fontSize: '12px', marginBottom: '12px',
              padding: '8px 12px', borderRadius: '8px',
              background: 'rgba(255,42,109,0.1)', border: '1px solid rgba(255,42,109,0.2)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              background: `linear-gradient(135deg, ${theme.cyan}20, ${theme.cyan}40)`,
              border: `1px solid ${theme.cyan}50`,
              color: theme.cyan, fontSize: '14px', fontWeight: '700',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '...' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        {/* Toggle login/signup */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: theme.textDim }}>
          {mode === 'login' ? (
            <>
              Non hai un account?{' '}
              <span
                onClick={() => { setMode('signup'); setError(''); }}
                style={{ color: theme.cyan, cursor: 'pointer', fontWeight: '700' }}
              >
                Registrati
              </span>
            </>
          ) : (
            <>
              Hai gia un account?{' '}
              <span
                onClick={() => { setMode('login'); setError(''); }}
                style={{ color: theme.cyan, cursor: 'pointer', fontWeight: '700' }}
              >
                Accedi
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
