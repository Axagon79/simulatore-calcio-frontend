import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { getThemeMode } from '../AppDev/costanti';

const isLight = getThemeMode() === 'light';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setShowAuth(true);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: isLight ? '#f0f2f5' : '#0a0b0f',
        color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize: '14px',
      }}>
        Caricamento...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isLight ? '#f0f2f5' : '#0a0b0f',
          fontFamily: '"Inter", system-ui, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: '24px', fontWeight: 600,
            color: isLight ? '#111827' : 'rgba(255,255,255,0.9)',
            margin: '0 0 12px',
          }}>
            Registrati gratis per accedere
          </h2>
          <p style={{
            fontSize: '14px',
            color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
            margin: '0 0 28px',
            maxWidth: '400px',
            lineHeight: 1.6,
          }}>
            Crea un account gratuito per accedere a tutte le funzionalità:
            pronostici, simulazioni, analisi e molto altro.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              background: '#6366f1',
              border: 'none',
              color: '#fff',
              fontSize: '15px', fontWeight: '600',
              padding: '14px 36px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#6366f1'; }}
          >
            Registrati gratis
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Torna alla homepage
          </button>
        </div>
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}
