import { useState } from 'react';
import { getTheme, API_BASE } from '../AppDev/costanti';
import { useAuth } from '../contexts/AuthContext';

const theme = getTheme();

interface TermsConsentModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

export default function TermsConsentModal({ isOpen, onAccepted }: TermsConsentModalProps) {
  const { getIdToken } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [disclaimer, setDisclaimer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const allChecked = terms && privacy && disclaimer;

  const handleAccept = async () => {
    if (!allChecked) return;
    setLoading(true);
    setError('');
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/user-consent/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Errore nel salvataggio');
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const checkboxStyle = {
    width: '18px', height: '18px', cursor: 'pointer',
    accentColor: theme.cyan, flexShrink: 0 as const, marginTop: '2px'
  };

  const labelStyle = {
    color: theme.textDim, fontSize: '13px', lineHeight: '1.5',
    cursor: 'pointer', flex: 1
  };

  const linkStyle = {
    color: theme.cyan, textDecoration: 'underline'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200000, fontFamily: theme.font
    }}>
      <div style={{
        background: theme.panel, border: theme.panelBorder,
        borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ color: theme.text, fontSize: '20px', fontWeight: '900', margin: '0 0 8px 0' }}>
          Accettazione Termini
        </h2>
        <p style={{ color: theme.textDim, fontSize: '13px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
          Per utilizzare AI Simulator devi accettare i seguenti documenti. Clicca sui link per leggere il testo completo.
        </p>

        {/* Checkbox 1 — Termini e Condizioni */}
        <label style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} style={checkboxStyle} />
          <span style={labelStyle}>
            Ho letto e accetto i{' '}
            <a href="/termini" target="_blank" rel="noopener noreferrer" style={linkStyle} onClick={e => e.stopPropagation()}>
              Termini e Condizioni d'uso
            </a>{' '}
            del servizio AI Simulator (sezioni 1–12).
          </span>
        </label>

        {/* Checkbox 2 — Privacy e Cookie */}
        <label style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={checkboxStyle} />
          <span style={labelStyle}>
            Ho letto e accetto la{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle} onClick={e => e.stopPropagation()}>
              Privacy Policy e Cookie Policy
            </a>{' '}
            (sezioni 13–14), acconsentendo al trattamento dei miei dati personali ai sensi del GDPR.
          </span>
        </label>

        {/* Checkbox 3 — Disclaimer e Gioco Responsabile */}
        <label style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={disclaimer} onChange={e => setDisclaimer(e.target.checked)} style={checkboxStyle} />
          <span style={labelStyle}>
            Ho letto e compreso il{' '}
            <a href="/disclaimer" target="_blank" rel="noopener noreferrer" style={linkStyle} onClick={e => e.stopPropagation()}>
              Disclaimer di non responsabilita e la politica sul Gioco Responsabile
            </a>{' '}
            (sezioni 8–9). Dichiaro di essere maggiorenne e di comprendere che AI Simulator non garantisce alcun risultato economico. I pronostici vengono aggiornati automaticamente due volte al giorno: circa 3 ore prima e circa 1 ora prima dell'inizio di ogni match. In questi momenti il pronostico potrebbe cambiare o essere ritirato. Solo in caso di ritiro definitivo all'aggiornamento di 1 ora prima i crediti verranno rimborsati automaticamente. La responsabilità di qualsiasi decisione di puntata è esclusivamente dell'utente.
          </span>
        </label>

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
          onClick={handleAccept}
          disabled={!allChecked || loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px',
            background: allChecked
              ? `linear-gradient(135deg, ${theme.cyan}, ${theme.cyan}cc)`
              : 'rgba(255,255,255,0.06)',
            border: allChecked ? 'none' : '1px solid rgba(255,255,255,0.12)',
            color: allChecked ? '#000' : theme.textDim,
            fontSize: '15px', fontWeight: '700',
            cursor: allChecked && !loading ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Salvataggio...' : 'Accetto e Continua'}
        </button>
      </div>
    </div>
  );
}
