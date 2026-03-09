import { useState } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import { getThemeMode } from '../AppDev/costanti';

const isLight = getThemeMode() === 'light';

const c = {
  bg: isLight ? '#f0f2f5' : '#0a0b0f',
  card: isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
  cardBorder: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  text: isLight ? '#111827' : 'rgba(255,255,255,0.9)',
  textDim: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
  textMuted: isLight ? '#9ca3af' : 'rgba(255,255,255,0.25)',
  accent: '#6366f1',
  accentHover: isLight ? '#4f46e5' : '#818cf8',
  divider: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
  inputBg: isLight ? '#f9fafb' : 'rgba(255,255,255,0.06)',
  inputBorder: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)',
  inputFocus: isLight ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.4)',
  success: isLight ? '#059669' : '#34d399',
  successBg: isLight ? 'rgba(5,150,105,0.08)' : 'rgba(52,211,153,0.08)',
};

const FAQ_ITEMS = [
  {
    q: 'Come funzionano i pronostici?',
    a: 'I pronostici vengono generati da più sistemi indipendenti (Sistema A, Sistema C Monte Carlo, e un Mixture of Experts che combina i migliori). Ogni pronostico include una valutazione di confidenza, il tipo di scommessa e la quota di riferimento.',
  },
  {
    q: 'I pronostici sono gratuiti?',
    a: 'La dashboard, i campionati, il match day e il track record sono gratuiti. I pronostici Best Picks e le analisi premium richiedono crediti. Puoi acquistare pacchetti crediti oppure abbonarti per avere accesso a tutto a prezzo ridotto.',
  },
  {
    q: 'Posso integrare AI Simulator nel mio sito?',
    a: 'Al momento non offriamo API pubbliche, ma se sei interessato a una partnership o integrazione scrivimi usando il form qui sopra — valuterò ogni proposta.',
  },
  {
    q: 'Ho trovato un bug, cosa faccio?',
    a: 'Usa il form qui sopra oppure scrivimi direttamente a aisimulator.info@proton.me. Descrivi cosa è successo, su quale pagina e se possibile allega uno screenshot.',
  },
];

interface ContactPageProps {
  onBack: () => void;
}

export default function ContactPage({ onBack }: ContactPageProps) {
  const [formState, handleSubmit] = useForm('xqeyenbl');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: c.textDim, fontSize: '14px', padding: '6px 10px',
              borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = c.text)}
            onMouseLeave={e => (e.currentTarget.style.color = c.textDim)}
          >
            ← Indietro
          </button>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Contatti</span>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Intestazione */}
        <p style={{
          fontSize: '18px', lineHeight: 1.6, color: c.textDim,
          maxWidth: '600px', marginBottom: '40px',
        }}>
          Hai trovato un bug, hai un suggerimento, o vuoi parlare di una collaborazione? Scrivimi.
        </p>

        {/* Card container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
          gap: '24px',
          marginBottom: '56px',
          ...(window.innerWidth < 700 ? { gridTemplateColumns: '1fr' } : {}),
        }}>

          {/* Card sinistra — Form */}
          <div style={{
            background: c.card,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: '12px',
            padding: '32px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', margin: '0 0 24px' }}>
              Scrivimi
            </h2>

            {formState.succeeded ? (
              <div style={{
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: c.successBg,
                color: c.success,
                fontSize: '14px',
                lineHeight: 1.6,
              }}>
                Messaggio inviato! Ti risponderò entro 24-48 ore.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: c.textDim, display: 'block', marginBottom: '6px' }}>
                    Nome
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    style={{
                      width: '100%', padding: '10px 14px', fontSize: '14px',
                      backgroundColor: c.inputBg, border: `1px solid ${c.inputBorder}`,
                      borderRadius: '8px', color: c.text, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = c.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = c.inputBorder)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: c.textDim, display: 'block', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    style={{
                      width: '100%', padding: '10px 14px', fontSize: '14px',
                      backgroundColor: c.inputBg, border: `1px solid ${c.inputBorder}`,
                      borderRadius: '8px', color: c.text, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = c.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = c.inputBorder)}
                  />
                  <ValidationError prefix="Email" field="email" errors={formState.errors} />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: c.textDim, display: 'block', marginBottom: '6px' }}>
                    Messaggio
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    placeholder="Descrivi il problema, la tua idea, o la proposta..."
                    style={{
                      width: '100%', padding: '10px 14px', fontSize: '14px',
                      backgroundColor: c.inputBg, border: `1px solid ${c.inputBorder}`,
                      borderRadius: '8px', color: c.text, outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = c.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = c.inputBorder)}
                  />
                  <ValidationError prefix="Messaggio" field="message" errors={formState.errors} />
                </div>

                <button
                  type="submit"
                  disabled={formState.submitting}
                  onMouseEnter={() => setHoveredBtn(true)}
                  onMouseLeave={() => setHoveredBtn(false)}
                  style={{
                    padding: '12px 24px', fontSize: '14px', fontWeight: 600,
                    backgroundColor: hoveredBtn ? c.accentHover : c.accent,
                    color: '#fff', border: 'none', borderRadius: '8px',
                    cursor: formState.submitting ? 'wait' : 'pointer',
                    opacity: formState.submitting ? 0.7 : 1,
                    transition: 'background-color 0.15s, opacity 0.15s',
                    alignSelf: 'flex-start',
                  }}
                >
                  {formState.submitting ? 'Invio in corso...' : 'Invia messaggio'}
                </button>
              </form>
            )}
          </div>

          {/* Card destra — Contatti diretti */}
          <div style={{
            background: c.card,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: '12px',
            padding: '32px',
            display: 'flex', flexDirection: 'column', gap: '24px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Contatti diretti
            </h2>

            <div>
              <div style={{ fontSize: '12px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Email
              </div>
              <a
                href="mailto:aisimulator.info@proton.me"
                style={{
                  fontSize: '14px', color: c.accent,
                  textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                aisimulator.info@proton.me
              </a>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${c.divider}`,
            }}>
              <div style={{ fontSize: '13px', color: c.textDim, lineHeight: 1.6 }}>
                Rispondo di solito entro 24-48 ore.
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
            Domande frequenti
          </h2>

          <div style={{
            border: `1px solid ${c.cardBorder}`,
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{
                borderBottom: i < FAQ_ITEMS.length - 1 ? `1px solid ${c.divider}` : 'none',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: c.text, fontSize: '14px', fontWeight: 500,
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span>{item.q}</span>
                  <span style={{
                    fontSize: '18px', color: c.textMuted,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                    transition: 'transform 0.2s',
                    flexShrink: 0, marginLeft: '12px',
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 20px 16px',
                    fontSize: '13px', lineHeight: 1.7,
                    color: c.textDim,
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
