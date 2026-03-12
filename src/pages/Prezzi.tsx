import { useState } from 'react';
import { getThemeMode, API_BASE } from '../AppDev/costanti';
import { useAuth } from '../contexts/AuthContext';

const isLight = getThemeMode() === 'light';

// --- Colori ---
const c = {
  bg: isLight ? '#f0f2f5' : '#0a0b0f',
  card: isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
  cardBorder: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  cardHighlight: isLight ? '#f8f7ff' : 'rgba(99,102,241,0.06)',
  cardHighlightBorder: isLight ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.3)',
  text: isLight ? '#111827' : 'rgba(255,255,255,0.9)',
  textDim: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
  textMuted: isLight ? '#9ca3af' : 'rgba(255,255,255,0.25)',
  accent: '#6366f1',
  accentDim: isLight ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12)',
  success: isLight ? '#059669' : '#34d399',
  successBg: isLight ? 'rgba(5,150,105,0.08)' : 'rgba(52,211,153,0.08)',
  amber: isLight ? '#d97706' : '#fbbf24',
  divider: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
};

// --- Dati ---
const PACKS = [
  { name: 'Base', credits: 18, shield: 3, price: 4.99, perCredit: 0.28, discount: null },
  { name: 'Plus', credits: 42, shield: 6, price: 9.99, perCredit: 0.24, discount: 14, popular: true },
  { name: 'Pro', credits: 72, shield: 12, price: 14.99, perCredit: 0.21, discount: 25 },
];

const SUBS = [
  { name: 'Mensile', priceMonth: 14.99, total: 14.99, creditsBonus: 9, shieldBonus: 3, discount: null },
  { name: 'Semestrale', priceMonth: 10.99, total: 65.94, creditsBonus: 12, shieldBonus: 5, discount: 27, popular: true },
  { name: 'Annuale', priceMonth: 7.99, total: 95.88, creditsBonus: 15, shieldBonus: 6, discount: 47 },
];

const SUB_BENEFITS = [
  'Pronostici e analisi a 1 credito invece di 3',
  'Crediti bonus ogni mese',
  'Shield bonus ogni mese',
  'Accesso esclusivo allo Step System',
];

const FREE_VS_PAID = [
  { feature: 'Dashboard, campionati, partite', free: true, paid: true },
  { feature: 'Match Day e live scores', free: true, paid: true },
  { feature: 'Simulazione partite', free: '3/giorno', paid: '10/giorno' },
  { feature: 'Track Record completo', free: true, paid: true },
  { feature: 'Coach AI', free: '3 msg/giorno', paid: '3 gratis + extra a crediti' },
  { feature: 'Bankroll e Money Tracker', free: true, paid: true },
  { feature: 'Pronostici Best Picks', free: false, paid: 'Crediti' },
  { feature: 'Analisi Premium AI', free: false, paid: 'Crediti' },
  { feature: 'Step System', free: false, paid: 'Solo abbonati' },
];

interface PrezziProps {
  onBack: () => void;
}

export default function Prezzi({ onBack }: PrezziProps) {
  const { user, getIdToken, refreshWallet } = useAuth();
  const [hoveredPack, setHoveredPack] = useState<string | null>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'pack' | 'sub'; name: string; credits: number; shields: number; price: number } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePurchase = async (type: 'pack' | 'sub', name: string, credits: number, shields: number, price: number, subType?: string) => {
    if (!user) {
      window.dispatchEvent(new Event('open-settings'));
      return;
    }
    setConfirmModal({ type, name, credits, shields, price });
  };

  const confirmPurchase = async () => {
    if (!confirmModal) return;
    setPurchasing(true);
    try {
      const token = await getIdToken();
      const { type, name, credits, shields, price } = confirmModal;

      if (type === 'pack') {
        // Acquisto pacchetto crediti
        await fetch(`${API_BASE}/wallet/transaction`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'acquisto_pacchetto',
            credits_delta: credits,
            shields_delta: shields,
            amount_eur: price,
            description: `Pacchetto ${name} (beta)`,
            metadata: { package_name: name, beta: true },
          }),
        });
      } else {
        // Attivazione abbonamento
        const subName = name.toLowerCase();
        const months = subName === 'mensile' ? 1 : subName === 'semestrale' ? 6 : 12;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);

        await fetch(`${API_BASE}/wallet/transaction`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'crediti_bonus_abbonamento',
            credits_delta: credits,
            shields_delta: shields,
            amount_eur: price,
            description: `Abbonamento ${name} attivato (beta)`,
            metadata: { subscription: subName, expires_at: expiresAt.toISOString(), beta: true },
          }),
        });

        // Aggiorna subscription nel profilo utente
        await fetch(`${API_BASE}/wallet/transaction`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'acquisto_pacchetto',
            credits_delta: 0,
            shields_delta: 0,
            amount_eur: 0,
            description: `Attivazione abbonamento ${name}`,
            metadata: { set_subscription: subName, set_subscription_expires_at: expiresAt.toISOString() },
          }),
        });
      }

      window.dispatchEvent(new Event('wallet-changed'));
      await refreshWallet();
      setSuccessMsg(type === 'pack'
        ? `Pacchetto ${name} attivato! Hai ricevuto ${credits} crediti e ${shields} Shield.`
        : `Abbonamento ${name} attivato! Hai ricevuto ${credits} crediti bonus e ${shields} Shield bonus.`
      );
      setConfirmModal(null);
    } catch {
      setSuccessMsg('Errore durante l\'acquisto. Riprova.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: c.bg,
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      color: c.text,
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: isLight ? 'rgba(240,242,245,0.85)' : 'rgba(10,11,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${c.divider}`,
        padding: '0 24px',
        height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/logo-virgo.png" alt="Logo" style={{
            width: 32, height: 32, objectFit: 'contain',
            filter: isLight ? 'none' : 'invert(1)', opacity: isLight ? 1 : 0.85,
          }} />
          <span style={{
            fontSize: '15px', fontWeight: 600,
            color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
            letterSpacing: '0.05em',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}>AI Simulator</span>
        </a>
        <button onClick={onBack} style={{
          background: 'none', border: `1px solid ${c.cardBorder}`,
          borderRadius: '6px', padding: '6px 14px', cursor: 'pointer',
          color: c.textDim, fontSize: '13px', fontWeight: '500',
          fontFamily: 'inherit', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = c.textDim; e.currentTarget.style.borderColor = c.cardBorder; }}
        >Torna indietro</button>
      </header>

      {/* Banner Beta */}
      <div style={{
        maxWidth: '1100px', margin: '20px auto 0', padding: '0 24px',
      }}>
        <div style={{
          padding: '12px 20px', borderRadius: '8px',
          background: isLight ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.12)',
          border: `1px solid ${isLight ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.25)'}`,
          fontSize: '13px', color: c.accent, fontWeight: 500, textAlign: 'center',
        }}>
          AI Simulator è in fase beta. I pagamenti non sono ancora attivi — esplora tutte le funzionalità gratuitamente.
        </div>
      </div>

      {/* Modal conferma acquisto */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => !purchasing && setConfirmModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: isLight ? '#fff' : '#1a1a2e', borderRadius: '12px',
            padding: '28px', maxWidth: '380px', width: '90%',
            border: `1px solid ${c.cardBorder}`,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>
              Conferma {confirmModal.type === 'pack' ? 'acquisto' : 'abbonamento'}
            </h3>
            <p style={{ fontSize: '14px', color: c.textDim, margin: '0 0 8px' }}>
              {confirmModal.type === 'pack' ? 'Pacchetto' : 'Piano'}: <strong style={{ color: c.text }}>{confirmModal.name}</strong>
            </p>
            <p style={{ fontSize: '14px', color: c.textDim, margin: '0 0 8px' }}>
              Crediti: <strong style={{ color: c.accent }}>+{confirmModal.credits}</strong> — Shield: <strong style={{ color: c.success }}>+{confirmModal.shields}</strong>
            </p>
            <p style={{ fontSize: '14px', color: c.textDim, margin: '0 0 20px' }}>
              Prezzo: <strong style={{ color: c.text }}>€{confirmModal.price.toFixed(2)}</strong>
              <span style={{ fontSize: '12px', color: c.accent, marginLeft: '8px' }}>(gratuito in beta)</span>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                disabled={purchasing}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  border: `1px solid ${c.cardBorder}`, background: 'transparent', color: c.text,
                }}
              >Annulla</button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                  border: 'none', background: c.accent, color: '#fff',
                  opacity: purchasing ? 0.6 : 1,
                }}
              >{purchasing ? 'Attendi...' : 'Conferma'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal successo */}
      {successMsg && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSuccessMsg(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: isLight ? '#fff' : '#1a1a2e', borderRadius: '12px',
            padding: '28px', maxWidth: '380px', width: '90%',
            border: `1px solid ${c.cardBorder}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>
              {successMsg.includes('Errore') ? '' : ''}
            </div>
            <p style={{ fontSize: '14px', color: c.text, margin: '0 0 20px', lineHeight: 1.6 }}>
              {successMsg}
            </p>
            <button onClick={() => setSuccessMsg(null)} style={{
              padding: '10px 24px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
              border: 'none', background: c.accent, color: '#fff',
            }}>OK</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: '500',
            letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: '1.15',
          }}>Scegli come vuoi giocare</h1>
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', color: c.textDim,
            maxWidth: '560px', margin: '0 auto', lineHeight: '1.6',
          }}>
            Compra pacchetti crediti per sbloccare pronostici e analisi.
            L'abbonamento dimezza i costi e sblocca strumenti esclusivi.
          </p>
        </div>

        {/* --- 3 PIANI PRINCIPALI (stile Linear) --- */}
        <section style={{ marginBottom: '80px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {/* PIANO FREE */}
            <div style={{
              background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '12px',
              padding: '32px 28px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Free
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em' }}>€0</span>
              </div>
              <div style={{ fontSize: '13px', color: c.textDim, marginBottom: '24px' }}>
                Per sempre, nessuna carta richiesta
              </div>
              <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: '20px', flex: 1 }}>
                {[
                  'Dashboard e campionati',
                  'Partite, quote, H2H e statistiche',
                  'Match Day e live scores',
                  '3 simulazioni al giorno',
                  'Coach AI (3 messaggi/giorno)',
                  'Track Record completo',
                  'Bankroll e Money Tracker',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontSize: '13px', color: c.text, lineHeight: '1.4' }}>{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { window.location.href = '/'; }} style={{
                marginTop: '20px', width: '100%', padding: '10px 0', borderRadius: '6px',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                border: `1px solid ${c.cardBorder}`, background: 'transparent', color: c.text,
                transition: 'all 0.15s',
              }}>Inizia gratis</button>
            </div>

            {/* PIANO CREDITI */}
            <div style={{
              position: 'relative',
              background: c.cardHighlight, border: `1px solid ${c.cardHighlightBorder}`, borderRadius: '12px',
              padding: '32px 28px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                position: 'absolute', top: '-10px', left: '28px',
                background: c.accent, color: '#fff',
                fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '0.06em', padding: '3px 10px', borderRadius: '4px',
              }}>Popolare</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Crediti
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em' }}>€4.99</span>
                <span style={{ fontSize: '14px', color: c.textDim }}>da</span>
              </div>
              <div style={{ fontSize: '13px', color: c.textDim, marginBottom: '24px' }}>
                Compra solo quando vuoi, senza vincoli
              </div>
              <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: '20px', flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Tutto il piano Free, in aggiunta:
                </div>
                {[
                  'Sblocca pronostici Best Picks',
                  'Analisi Premium AI',
                  'Coach AI illimitato',
                  '10 simulazioni al giorno',
                  'Shield inclusi in ogni pacchetto',
                  'I crediti non scadono mai',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontSize: '13px', color: c.text, lineHeight: '1.4' }}>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => document.querySelector('#pacchetti-crediti')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  marginTop: '20px', width: '100%', padding: '10px 0', borderRadius: '6px',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                  border: 'none', background: c.accent, color: '#fff',
                  transition: 'all 0.15s',
                }}>Acquista crediti</button>
            </div>

            {/* PIANO ABBONAMENTO */}
            <div style={{
              background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '12px',
              padding: '32px 28px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Abbonamento
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em' }}>€7.99</span>
                <span style={{ fontSize: '14px', color: c.textDim }}>/mese da</span>
              </div>
              <div style={{ fontSize: '13px', color: c.textDim, marginBottom: '24px' }}>
                Risparmia su ogni pronostico e analisi
              </div>
              <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: '20px', flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Tutto il piano Crediti, in aggiunta:
                </div>
                {[
                  'Pronostici e analisi a 1 credito invece di 3',
                  'Crediti bonus ogni mese (fino a 15)',
                  'Shield bonus ogni mese (fino a 6)',
                  'Step System esclusivo',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontSize: '13px', color: c.text, lineHeight: '1.4' }}>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => document.querySelector('#piani-abbonamento')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  marginTop: '20px', width: '100%', padding: '10px 0', borderRadius: '6px',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                  border: `1px solid ${c.cardBorder}`, background: 'transparent', color: c.text,
                  transition: 'all 0.15s',
                }}>Vedi piani</button>
            </div>
          </div>
        </section>

        {/* --- DETTAGLIO PACCHETTI CREDITI --- */}
        <section id="pacchetti-crediti" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', margin: '0 0 8px',
            }}>Pacchetti Crediti</h2>
            <p style={{ fontSize: '14px', color: c.textDim, margin: 0 }}>
              I crediti non scadono mai. Ogni pronostico costa 3 crediti (1 con abbonamento).
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {PACKS.map(pack => {
              const isHovered = hoveredPack === pack.name;
              const isPopular = pack.popular;
              return (
                <div
                  key={pack.name}
                  onMouseEnter={() => setHoveredPack(pack.name)}
                  onMouseLeave={() => setHoveredPack(null)}
                  style={{
                    position: 'relative',
                    background: isPopular ? c.cardHighlight : c.card,
                    border: `1px solid ${isPopular ? c.cardHighlightBorder : c.cardBorder}`,
                    borderRadius: '12px',
                    padding: '28px 20px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'all 0.2s',
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                    boxShadow: isHovered
                      ? `0 12px 32px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.3)'}`
                      : 'none',
                  }}
                >
                  {isPopular && (
                    <div style={{
                      position: 'absolute', top: '-10px',
                      background: c.accent, color: '#fff',
                      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                      letterSpacing: '0.06em', padding: '3px 10px', borderRadius: '4px',
                    }}>Miglior valore</div>
                  )}
                  <div style={{
                    fontSize: '13px', fontWeight: '600', color: c.textDim,
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px',
                  }}>{pack.name}</div>

                  <div style={{
                    fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '4px',
                  }}>{pack.credits}</div>
                  <div style={{ fontSize: '13px', color: c.textDim, marginBottom: '16px' }}>crediti</div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
                    padding: '4px 10px', borderRadius: '6px', background: c.successBg,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: c.success }}>
                      {pack.shield} Shield
                    </span>
                  </div>

                  <div style={{
                    fontSize: '28px', fontWeight: '700', marginBottom: '4px',
                  }}>€{pack.price.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: c.textMuted, marginBottom: '4px' }}>
                    €{pack.perCredit.toFixed(2)}/credito
                  </div>
                  {pack.discount && (
                    <div style={{ fontSize: '11px', fontWeight: '600', color: c.success }}>
                      -{pack.discount}% vs Starter
                    </div>
                  )}

                  <button
                    onClick={() => handlePurchase('pack', pack.name, pack.credits, pack.shield, pack.price)}
                    style={{
                      marginTop: '20px', width: '100%',
                      padding: '10px 0', borderRadius: '6px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                      border: isPopular ? 'none' : `1px solid ${c.cardBorder}`,
                      background: isPopular ? c.accent : 'transparent',
                      color: isPopular ? '#fff' : c.text,
                      transition: 'all 0.15s',
                    }}>Acquista</button>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- SEZIONE SHIELD --- */}
        <section style={{
          marginBottom: '80px', padding: '40px',
          background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '12px',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '40px', alignItems: 'center',
          }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: '6px', background: c.successBg, marginBottom: '16px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: '700', color: c.success, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Shield
                </span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
                Se sbagliamo, non paghi
              </h2>
              <p style={{ fontSize: '14px', color: c.textDim, lineHeight: '1.7', margin: 0 }}>
                Proteggi un pronostico con uno Shield. Se il pronostico perde,
                i crediti spesi vengono rimborsati. Lo Shield viene consumato,
                ma i tuoi crediti sono salvi. Nessun competitor offre questo.
              </p>
            </div>
            <div style={{
              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              borderRadius: '8px', padding: '24px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: c.textDim, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Come funziona
              </div>
              {[
                { step: '1', text: 'Riveli un pronostico con crediti + Shield' },
                { step: '2', text: 'Se vince: crediti spesi, Shield consumato' },
                { step: '3', text: 'Se perde: crediti rimborsati, solo Shield consumato' },
              ].map(item => (
                <div key={item.step} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px',
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: c.accentDim, color: c.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700',
                  }}>{item.step}</div>
                  <span style={{ fontSize: '13px', color: c.text, lineHeight: '1.5', paddingTop: '2px' }}>
                    {item.text}
                  </span>
                </div>
              ))}
              <div style={{
                marginTop: '16px', padding: '10px 14px', borderRadius: '6px',
                background: c.accentDim, fontSize: '12px', color: c.accent, fontWeight: '500',
              }}>
                Gli Shield non scadono mai e si accumulano nel tempo.
              </div>
            </div>
          </div>
        </section>

        {/* --- SEZIONE ABBONAMENTO --- */}
        <section id="piani-abbonamento" style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Abbonamento
            </h2>
            <p style={{ fontSize: '14px', color: c.textDim, margin: '0 auto', maxWidth: '500px' }}>
              Opzionale. Dimezza il costo crediti per pronostici e analisi, e sblocca strumenti esclusivi.
            </p>
          </div>

          {/* Vantaggi abbonamento */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '32px',
          }}>
            {SUB_BENEFITS.map(b => (
              <div key={b} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '6px',
                background: c.accentDim,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ fontSize: '13px', fontWeight: '500', color: c.text }}>{b}</span>
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}>
            {SUBS.map(sub => {
              const isHovered = hoveredSub === sub.name;
              const isPopular = sub.popular;
              return (
                <div
                  key={sub.name}
                  onMouseEnter={() => setHoveredSub(sub.name)}
                  onMouseLeave={() => setHoveredSub(null)}
                  style={{
                    position: 'relative',
                    background: isPopular ? c.cardHighlight : c.card,
                    border: `1px solid ${isPopular ? c.cardHighlightBorder : c.cardBorder}`,
                    borderRadius: '12px',
                    padding: '32px 24px',
                    transition: 'all 0.2s',
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                    boxShadow: isHovered
                      ? `0 12px 32px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.3)'}`
                      : 'none',
                  }}
                >
                  {isPopular && (
                    <div style={{
                      position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                      background: c.accent, color: '#fff',
                      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                      letterSpacing: '0.06em', padding: '3px 10px', borderRadius: '4px',
                    }}>Consigliato</div>
                  )}

                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
                    {sub.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                      €{sub.priceMonth.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '14px', color: c.textDim }}>/mese</span>
                  </div>

                  {sub.name !== 'Mensile' && (
                    <div style={{ fontSize: '12px', color: c.textMuted, marginBottom: '4px' }}>
                      Totale: €{sub.total.toFixed(2)}{sub.name === 'Semestrale' ? ' per 6 mesi' : ' all\'anno'}
                    </div>
                  )}
                  {sub.discount && (
                    <div style={{ fontSize: '12px', fontWeight: '600', color: c.success, marginBottom: '12px' }}>
                      -{sub.discount}% rispetto al mensile
                    </div>
                  )}
                  {!sub.discount && <div style={{ height: '12px', marginBottom: '12px' }} />}

                  <div style={{
                    borderTop: `1px solid ${c.divider}`, paddingTop: '16px',
                    display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: c.textDim }}>Crediti bonus/mese</span>
                      <span style={{ fontWeight: '600' }}>{sub.creditsBonus}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: c.textDim }}>Shield bonus/mese</span>
                      <span style={{ fontWeight: '600' }}>{sub.shieldBonus}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: c.textDim }}>Costo pronostico</span>
                      <span style={{ fontWeight: '600', color: c.success }}>1 credito</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase('sub', sub.name, sub.creditsBonus, sub.shieldBonus, sub.priceMonth)}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: '6px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                      border: isPopular ? 'none' : `1px solid ${c.cardBorder}`,
                      background: isPopular ? c.accent : 'transparent',
                      color: isPopular ? '#fff' : c.text,
                      transition: 'all 0.15s',
                    }}>Abbonati</button>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- TABELLA GRATIS vs PAGANTE --- */}
        <section style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Cosa puoi fare
            </h2>
            <p style={{ fontSize: '14px', color: c.textDim, margin: 0 }}>
              Due stati: gratis o pagante. Nessuna fascia intermedia.
            </p>
          </div>

          <div style={{
            background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Header tabella */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 140px',
              padding: '14px 20px',
              borderBottom: `1px solid ${c.divider}`,
              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Feature
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                Gratis
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>
                Pagante
              </div>
            </div>

            {FREE_VS_PAID.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 140px',
                padding: '12px 20px',
                borderBottom: i < FREE_VS_PAID.length - 1 ? `1px solid ${c.divider}` : 'none',
              }}>
                <div style={{ fontSize: '13px', color: c.text }}>{row.feature}</div>
                <div style={{ textAlign: 'center' }}>
                  {renderAccess(row.free)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  {renderAccess(row.paid)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- COSTI AZIONI --- */}
        <section style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Quanto costano le azioni
            </h2>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}>
            {[
              { action: 'Rivelare un pronostico', without: '3 crediti', with: '1 credito' },
              { action: 'Analisi Premium AI', without: '3 crediti', with: '1 credito' },
              { action: 'Coach AI Match (extra)', without: '1 credito', with: '1 credito' },
              { action: 'Protezione Shield', without: '1 Shield', with: '1 Shield' },
            ].map(item => (
              <div key={item.action} style={{
                background: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '10px',
                padding: '20px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  {item.action}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: c.textDim }}>Senza abbonamento</span>
                  <span style={{ fontWeight: '500' }}>{item.without}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: c.textDim }}>Con abbonamento</span>
                  <span style={{ fontWeight: '600', color: c.success }}>{item.with}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- FAQ --- */}
        <section style={{ marginBottom: '80px', maxWidth: '640px', margin: '0 auto 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em', margin: 0 }}>
              Domande frequenti
            </h2>
          </div>

          {[
            { q: 'I crediti scadono?', a: 'No. I crediti non scadono mai e restano nel tuo wallet per sempre.' },
            { q: 'Devo per forza abbonarmi?', a: 'No. Puoi comprare solo pacchetti crediti. L\'abbonamento è opzionale e ti permette di risparmiare (1 credito invece di 3 per pronostico).' },
            { q: 'Cosa succede se cancello l\'abbonamento?', a: 'Torni allo stato gratuito. Crediti e Shield restano (non scadono mai). Lo Step System si blocca.' },
            { q: 'Posso comprare più pacchetti?', a: 'Sì. Crediti e Shield si sommano tra acquisti diversi.' },
            { q: 'Come funziona il Coach AI gratis?', a: 'Hai 3 messaggi al giorno gratuiti nella chat match. Dopo, ogni conversazione costa 1 credito.' },
          ].map((faq, i) => (
            <div key={i} style={{
              padding: '16px 0',
              borderBottom: i < 4 ? `1px solid ${c.divider}` : 'none',
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                {faq.q}
              </div>
              <div style={{ fontSize: '13px', color: c.textDim, lineHeight: '1.6' }}>
                {faq.a}
              </div>
            </div>
          ))}
        </section>

      </div>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${c.divider}`,
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: c.textMuted }}>
            &copy; {new Date().getFullYear()} AI Simulator. Tutti i diritti riservati.
          </span>
          <br />
          <span style={{ fontSize: '11px', color: c.textMuted }}>
            Il gioco d'azzardo può causare dipendenza. 18+ | Numero Verde: 800 55 88 22
          </span>
        </div>
      </footer>
    </div>
  );
}

// Helper per renderizzare accesso nella tabella
function renderAccess(value: boolean | string) {
  if (value === true) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  if (value === false) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    );
  }
  return <span style={{ fontSize: '12px', color: c.textDim, fontWeight: '500' }}>{value}</span>;
}
