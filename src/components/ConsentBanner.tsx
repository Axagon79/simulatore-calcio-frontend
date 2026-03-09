import { useState, useEffect } from 'react';
import { getThemeMode } from '../AppDev/costanti';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export type CookieConsent = 'accepted' | 'rejected' | null;

export function getCookieConsent(): CookieConsent {
  return localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsent;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const isLight = getThemeMode() === 'light';

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const save = (choice: 'accepted' | 'rejected') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    setVisible(false);
    if (choice === 'accepted' && (window as any).__GA_ID) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + (window as any).__GA_ID;
      document.head.appendChild(s);
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
      gtag('js', new Date());
      gtag('config', (window as any).__GA_ID);
    }
    window.dispatchEvent(new Event('cookie-consent-change'));
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: isLight ? '#fff' : '#1a1a2e',
      borderTop: `1px solid ${isLight ? '#e5e7eb' : 'rgba(255,255,255,0.1)'}`,
      padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '16px', flexWrap: 'wrap',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
    }}>
      <p style={{
        margin: 0, fontSize: '14px', maxWidth: 600,
        color: isLight ? '#374151' : 'rgba(255,255,255,0.8)',
        lineHeight: 1.5,
      }}>
        Questo sito utilizza cookie tecnici per il funzionamento del servizio.
        Per maggiori informazioni consulta la nostra{' '}
        <a href="/privacy-policy" style={{ color: isLight ? '#2563eb' : '#60a5fa', textDecoration: 'underline' }}>
          Privacy Policy
        </a>.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button onClick={() => save('rejected')} style={{
          padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600,
          background: 'transparent',
          border: `1px solid ${isLight ? '#d1d5db' : 'rgba(255,255,255,0.2)'}`,
          color: isLight ? '#6b7280' : 'rgba(255,255,255,0.6)',
        }}>
          Rifiuta
        </button>
        <button onClick={() => save('accepted')} style={{
          padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600,
          background: isLight ? '#2563eb' : '#3b82f6',
          color: '#fff', border: 'none',
        }}>
          Accetta
        </button>
      </div>
    </div>
  );
}
