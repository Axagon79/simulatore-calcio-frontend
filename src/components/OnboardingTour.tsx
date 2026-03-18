import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

// --- Calcola posizione e dimensione di un elemento ---
function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

// --- Aspetta che un elemento esista nel DOM ---
function waitForEl(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { observer.disconnect(); resolve(found); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

// --- MODALE DI BENVENUTO ---
function WelcomeModal({ onStart, onSkip, onSkipPermanent }: {
  onStart: () => void;
  onSkip: () => void;
  onSkipPermanent: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: isLight ? '#ffffff' : '#1e2030',
        border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '16px',
        padding: '36px 40px',
        maxWidth: '460px',
        width: '90%',
        textAlign: 'center',
        boxShadow: isLight
          ? '0 24px 64px rgba(0,0,0,0.15)'
          : `0 24px 64px rgba(0,0,0,0.6), 0 0 80px ${theme.cyan}10`,
      }}>
        <img
          src="/logo-virgo.webp"
          alt="AI Simulator"
          style={{
            width: 56, height: 56, objectFit: 'contain',
            filter: isLight ? 'none' : 'invert(1)',
            opacity: isLight ? 1 : 0.85,
            marginBottom: '20px',
          }}
        />
        <h2 style={{
          fontSize: '22px', fontWeight: 600,
          color: isLight ? '#111827' : 'rgba(255,255,255,0.95)',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}>
          Benvenuto su AI Simulator
        </h2>
        <p style={{
          fontSize: '14px', lineHeight: '1.6',
          color: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)',
          margin: '0 0 28px',
        }}>
          In pochi secondi ti mostriamo come funziona tutto — pronostici, simulazioni, biglietti e molto altro. Puoi saltare in qualsiasi momento e riprendere il tour dalle Impostazioni.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onStart}
            style={{
              width: '100%',
              background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
              border: 'none', color: '#fff',
              padding: '14px 0', borderRadius: '10px',
              fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Inizia il tour
          </button>
          <button
            onClick={() => dontShowAgain ? onSkipPermanent() : onSkip()}
            style={{
              width: '100%',
              background: 'none',
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
              color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
              padding: '12px 0', borderRadius: '10px',
              fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
            }}
          >
            Salta, conosco già la piattaforma
          </button>
          {/* Checkbox "Non mostrare più" */}
          <label
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', marginTop: '6px', cursor: 'pointer',
              fontSize: '12px',
              color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)',
            }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              style={{
                width: '14px', height: '14px', cursor: 'pointer',
                accentColor: theme.cyan,
              }}
            />
            Non mostrare più
          </label>
        </div>
      </div>
    </div>
  );
}

// --- SPOTLIGHT: buco luminoso su un elemento, tutto il resto opaco ---
function Spotlight({ selector, text, onSkip, onTargetClick, stepIndex = 0, totalSteps = 13, padding = 8, borderRadius = 12, popupPosition = 'auto', scrollable = false, zBase = 200000 }: {
  selector: string | null;
  text: string;
  onSkip: () => void;
  onTargetClick: () => void;
  stepIndex?: number;
  totalSteps?: number;
  padding?: number;
  borderRadius?: number;
  popupPosition?: 'auto' | 'top' | 'bottom';
  scrollable?: boolean; // se true, lo spotlight è scrollabile (chat)
  zBase?: number; // z-index base (alzare per stare sopra sidebar etc.)
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const animFrame = useRef(0);

  // Quando scrollable, click sull'elemento target avanza il tour
  useEffect(() => {
    if (!scrollable || !selector) return;
    const target = document.querySelector(selector) as HTMLElement;
    if (!target) return;
    const handler = () => onTargetClick();
    target.addEventListener('click', handler);
    return () => target.removeEventListener('click', handler);
  }, [scrollable, selector, onTargetClick]);

  // Aggiorna posizione spotlight ad ogni frame (segue scroll/resize)
  useEffect(() => {
    if (!selector) { setRect(null); return; }
    const update = () => {
      const r = getRect(selector);
      setRect(r);
      animFrame.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animFrame.current);
  }, [selector]);

  // Coordinate spotlight — se borderRadius >= 999 forza cerchio perfetto
  const isMobileScreen = window.innerWidth < 768;
  const isCircle = borderRadius >= 999;
  const rawWidth = rect ? rect.width + padding * 2 : 0;
  const rawHeight = rect ? rect.height + padding * 2 : 0;
  const circleSize = isMobileScreen ? 180 : 280;
  const size = isCircle ? circleSize : 0;
  const width = isCircle ? size : rawWidth;
  const height = isCircle ? size : rawHeight;
  // Per i cerchi: il dot è un punto, uso solo left/top come centro (ignoro width/height del rect che è buggy)
  const top = rect ? (isCircle ? rect.top - size / 2 : rect.top + rect.height / 2 - height / 2) : 0;
  const left = rect ? (isCircle ? rect.left - size / 2 : rect.left + rect.width / 2 - width / 2) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: zBase, pointerEvents: scrollable ? 'none' : 'auto' }}>
      {/* Overlay scuro con buco — blocca tutti i click */}
      {selector && rect ? (
        <div style={{
          position: 'fixed',
          top, left, width, height,
          borderRadius,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
          transition: isCircle
            ? 'top 1.2s cubic-bezier(0.34,1.56,0.64,1), left 1.2s cubic-bezier(0.34,1.56,0.64,1), width 0.3s, height 0.3s'
            : 'all 0.4s ease',
          pointerEvents: 'none',
          zIndex: zBase + 1,
        }} />
      ) : (
        // Nessun spotlight — overlay pieno (cliccabile per avanzare)
        <div
          onClick={onTargetClick}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            transition: 'opacity 0.4s ease',
            cursor: 'pointer',
            zIndex: zBase + 1,
          }}
        />
      )}

      {/* Zona cliccabile SOLO sull'elemento target — click passa all'elemento sotto + avanza */}
      {selector && rect && (
        <div
          style={{
            position: 'fixed',
            top, left, width, height,
            borderRadius,
            background: 'transparent',
            cursor: 'pointer',
            zIndex: zBase + 4,
            pointerEvents: scrollable ? 'none' : 'auto',
            transition: isCircle
              ? 'top 1.2s cubic-bezier(0.34,1.56,0.64,1), left 1.2s cubic-bezier(0.34,1.56,0.64,1)'
              : 'all 0.4s ease',
          }}
          onClick={() => {
            // Clicca l'elemento target: prima figlio diretto, poi target stesso
            if (selector) {
              const target = document.querySelector(selector) as HTMLElement;
              if (target) {
                const firstChild = target.firstElementChild as HTMLElement;
                // Se il target è un wrapper (data-tour), clicca il primo figlio
                // Se il target è direttamente cliccabile (button, a, ha onClick), cliccalo
                const tagName = target.tagName.toLowerCase();
                if (tagName === 'button' || tagName === 'a') {
                  target.click();
                } else if (firstChild) {
                  firstChild.click();
                } else {
                  target.click();
                }
              }
            }
            onTargetClick();
          }}
        />
      )}

      {/* Bordo glow pulsante attorno allo spotlight */}
      {selector && rect && (
        <div style={{
          position: 'fixed',
          top, left, width, height,
          borderRadius,
          border: `2px solid ${theme.cyan}`,
          boxShadow: `0 0 16px ${theme.cyan}50, inset 0 0 16px ${theme.cyan}15`,
          animation: 'spotlight-pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: zBase + 2,
          transition: isCircle
            ? 'top 1.2s cubic-bezier(0.34,1.56,0.64,1), left 1.2s cubic-bezier(0.34,1.56,0.64,1)'
            : 'all 0.4s ease',
        }} />
      )}

      {/* Popup testo — posizionato dove c'è più spazio */}
      <div style={{
        position: 'fixed',
        ...((() => {
          // Calcola posizione: sopra o sotto lo spotlight
          const pos = popupPosition !== 'auto' ? popupPosition
            : rect ? (rect.top > window.innerHeight / 2 ? 'top' : 'bottom')
            : 'bottom';
          return pos === 'top'
            ? { top: '5%', bottom: 'auto' }
            : { bottom: '8%', top: 'auto' };
        })()),
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '480px',
        width: '92%',
        zIndex: zBase + 3,
        pointerEvents: 'auto',
        animation: 'tour-text-fadein 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{
          position: 'relative',
          background: isLight
            ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            : 'linear-gradient(135deg, #1a1d2e 0%, #1f2340 100%)',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '16px',
          padding: '24px 28px 20px',
          boxShadow: isLight
            ? '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)'
            : `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${theme.cyan}08`,
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          overflow: 'hidden',
        }}>
          {/* Barra gradiente in cima */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
            borderRadius: '16px 16px 0 0',
          }} />
          {/* Testo */}
          <p style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: '1.75',
            color: isLight ? '#1f2937' : 'rgba(255,255,255,0.9)',
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}
            dangerouslySetInnerHTML={{ __html: text }}
          />
          {/* Footer: skip + continua (se scrollable) + progress */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <button
              onClick={onSkip}
              style={{
                background: 'none', border: 'none',
                color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)',
                fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                padding: '2px 0',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)'; }}
            >
              Salta tour
            </button>
            {scrollable && (
              <button
                onClick={onTargetClick}
                style={{
                  background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                  border: 'none', color: '#fff',
                  padding: '8px 20px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Continua →
              </button>
            )}
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} style={{
                  width: i <= stepIndex ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i <= stepIndex
                    ? `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`
                    : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animazioni CSS */}
      <style>{`
        @keyframes spotlight-pulse {
          0%, 100% { box-shadow: 0 0 16px ${theme.cyan}50, inset 0 0 16px ${theme.cyan}15; }
          50% { box-shadow: 0 0 28px ${theme.cyan}70, inset 0 0 20px ${theme.cyan}25; }
        }
        @keyframes tour-text-fadein {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// --- COMPONENTE PRINCIPALE ---
export default function OnboardingTour() {
  const { user } = useAuth();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [step, setStep] = useState(-1); // -1 = inattivo
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Segui resize per mobile/desktop
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Salva flag via API backend
  const markCompleted = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/onboarding/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch { /* silenzioso */ }
  }, [user]);

  // Blocca/sblocca scroll
  useEffect(() => {
    if (step >= 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [step]);

  // Controlla flag onboarding_completed via API backend
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const checkOnboarding = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/onboarding/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.onboarding_completed && location.pathname === '/') {
            setShowWelcome(true);
          }
        } else if (res.status === 404) {
          // Endpoint non ancora deployato — mostra tour in locale per test
          if (location.pathname === '/') setShowWelcome(true);
        }
      } catch {
        // API non raggiungibile — mostra tour in locale per test
        if (location.pathname === '/') setShowWelcome(true);
      }
      finally { setLoading(false); }
    };
    checkOnboarding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Ascolta evento custom per rilanciare il tour (da Impostazioni)
  useEffect(() => {
    const handler = () => {
      setShowWelcome(false);
      if (window.location.pathname !== '/') {
        sessionStorage.setItem('restart_tour', '1');
        window.location.href = '/';
        return;
      }
      setStep(0);
    };
    window.addEventListener('restart-onboarding-tour', handler);
    return () => window.removeEventListener('restart-onboarding-tour', handler);
  }, []);

  // Restart tour da sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem('restart_tour') && location.pathname === '/') {
      sessionStorage.removeItem('restart_tour');
      setTimeout(() => setStep(0), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop: mantieni dropdown aperto durante step 2
  useEffect(() => {
    if (step !== 2 || isMobile) return;
    const keepOpen = () => {
      const dd = document.querySelector('[data-tour="nav-competizioni"] [data-dropdown]') as HTMLElement;
      if (dd) dd.style.display = 'block';
    };
    const interval = setInterval(keepOpen, 100);
    keepOpen();
    return () => clearInterval(interval);
  }, [step, isMobile]);

  // Mobile: alza zIndex pannello hamburger durante step 2
  useEffect(() => {
    if (step !== 2 || !isMobile) return;
    const panel = document.querySelector('[data-tour="hamburger-panel"]') as HTMLElement;
    if (panel) panel.style.zIndex = '200005';
    return () => {
      const p = document.querySelector('[data-tour="hamburger-panel"]') as HTMLElement;
      if (p) p.style.zIndex = '9000';
    };
  }, [step, isMobile]);

  // Alza z-index del menu laterale mobile (BarraLaterale) durante step 11 e 12
  useEffect(() => {
    if ((step !== 11 && step !== 12) || !isMobile) return;
    const raise = () => {
      const sidebar = document.querySelector('[data-tour="sidebar-panel"]') as HTMLElement;
      if (sidebar) sidebar.style.zIndex = '200005';
    };
    const interval = setInterval(raise, 100);
    raise();
    return () => {
      clearInterval(interval);
      const sidebar = document.querySelector('[data-tour="sidebar-panel"]') as HTMLElement;
      if (sidebar) sidebar.style.zIndex = '';
    };
  }, [step, isMobile]);

  // Alza z-index della chat Coach AI durante step 9 (mobile) e 10 (desktop)
  useEffect(() => {
    const isChatStep = (isMobile && step === 9) || (!isMobile && step === 10);
    if (!isChatStep) return;
    const raise = () => {
      const closeBtn = document.querySelector('[data-tour="chat-close"]');
      if (closeBtn) {
        // Risali fino al container della chat
        let chatContainer = closeBtn.closest('div[style*="position"]') as HTMLElement;
        // Cerca il container più esterno della chat (con position fixed)
        while (chatContainer && chatContainer.style.position !== 'fixed' && chatContainer.parentElement) {
          chatContainer = chatContainer.parentElement.closest('div[style*="position"]') as HTMLElement;
        }
        if (chatContainer) chatContainer.style.zIndex = '200005';
      }
    };
    const interval = setInterval(raise, 100);
    raise();
    return () => clearInterval(interval);
  }, [step, isMobile]);

  // Step 3: alza zIndex del modale "Altri Campionati" sopra l'overlay
  useEffect(() => {
    if (step !== 3) return;
    // Il modale ha zIndex 99999, lo alzo sopra l'overlay (200000)
    const checkAndRaise = () => {
      const el = document.querySelector('[data-tour="tour-league-sample"]');
      if (el) {
        // Risali fino al modale overlay (position: fixed con zIndex 99999)
        let modal = el.closest('[style*="z-index"]') as HTMLElement;
        if (!modal) {
          // Fallback: cerca il container fixed del modale
          modal = el.closest('div[style*="99999"]') as HTMLElement;
        }
        // Alza sia il backdrop che il contenuto
        const allFixed = document.querySelectorAll('div[style]');
        allFixed.forEach(div => {
          const htmlDiv = div as HTMLElement;
          if (htmlDiv.style.zIndex === '99999') {
            htmlDiv.style.zIndex = '200005';
          }
        });
      }
    };
    const interval = setInterval(checkAndRaise, 100);
    checkAndRaise();
    return () => {
      clearInterval(interval);
      // Ripristina
      const allFixed = document.querySelectorAll('div[style]');
      allFixed.forEach(div => {
        const htmlDiv = div as HTMLElement;
        if (htmlDiv.style.zIndex === '200005') {
          htmlDiv.style.zIndex = '99999';
        }
      });
    };
  }, [step]);

  // Handlers per ogni step
  const handleStep0Click = useCallback(() => {
    setStep(1);
  }, []);

  const handleStep1Click = useCallback(() => {
    if (isMobile) {
      // Mobile: il click sull'hamburger apre il pannello (il click viene propagato)
      // Aspetta che il pannello si apra, poi avanza a step 2
      setTimeout(async () => {
        await waitForEl('[data-tour="step-1a"]', 2000);
        setStep(2);
      }, 300);
    } else {
      // Desktop: apri dropdown Competizioni
      const nav = document.querySelector('[data-tour="nav-competizioni"]');
      if (nav) {
        const dd = nav.querySelector('[data-dropdown]') as HTMLElement;
        if (dd) dd.style.display = 'block';
      }
      setTimeout(() => setStep(2), 150);
    }
  }, [isMobile]);

  const handleStep2Click = useCallback(async () => {
    if (!isMobile) {
      // Desktop: chiudi dropdown
      const dd = document.querySelector('[data-tour="nav-competizioni"] [data-dropdown]') as HTMLElement;
      if (dd) dd.style.display = 'none';
    }
    // Il click nativo apre il modale "Altri Campionati"
    setStep(3);
    await waitForEl('[data-tour="step-1b"]', 3000);
  }, [isMobile]);

  const endTour = useCallback(() => {
    setStep(-1);
    markCompleted();
  }, [markCompleted]);

  const skipTour = useCallback(() => {
    setStep(-1);
    setShowWelcome(false);
  }, []);

  const skipTourPermanent = useCallback(() => {
    setStep(-1);
    setShowWelcome(false);
    markCompleted();
  }, [markCompleted]);

  const handleStep3Click = useCallback(async () => {
    // Dopo il click su Eredivisie, il campionato si carica → aspetta il selettore giornata
    setStep(4);
    await waitForEl('[data-tour="giornata-next"]', 5000);
  }, []);

  const handleStep4Click = useCallback(async () => {
    // Cliccata giornata successiva → aspetta che i bottoni si aggiornino
    await new Promise(r => setTimeout(r, 300));
    setStep(5);
  }, []);

  const handleStep5Click = useCallback(async () => {
    // Cliccata giornata precedente → aspetta che i bottoni si aggiornino
    await new Promise(r => setTimeout(r, 300));
    setStep(6);
  }, []);

  const handleStep6Click = useCallback(async () => {
    // Cliccata giornata corrente → aspetta caricamento partite, scrolla, poi spotlight
    // Sblocca scroll temporaneamente per scrollare alla partita
    document.body.style.overflow = 'auto';
    const el = await waitForEl('[data-tour="first-match"]', 5000);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 500));
    }
    document.body.style.overflow = 'hidden';
    setStep(7);
  }, []);

  const handleStep7Click = useCallback(async () => {
    if (isMobile) {
      // Mobile: la partita si espande, il robottino appare → spotlight sul robottino
      setStep(8);
      await waitForEl('[data-tour="coach-ai-btn"]', 3000);
    } else {
      // Desktop: si apre la vista statistiche → aspetta il bottone "Torna alla lista"
      document.body.style.overflow = 'auto';
      // Scrolla in cima dove c'è il bottone
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 400));
      const el = await waitForEl('[data-tour="btn-lista"]', 5000);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 400));
      }
      document.body.style.overflow = 'hidden';
      setStep(8);
    }
  }, [isMobile]);

  const handleStep8Click = useCallback(async () => {
    if (isMobile) {
      // Mobile: Coach AI cliccato → aspetta chat, spotlight sul contenuto
      setStep(9);
      await waitForEl('[data-tour="chat-body"]', 3000);
    } else {
      // Desktop: "Torna alla lista" cliccato → aspetta lista, sblocca scroll, spotlight robottino
      document.body.style.overflow = 'auto';
      const el = await waitForEl('[data-tour="coach-ai-btn"]', 3000);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 500));
      }
      document.body.style.overflow = 'hidden';
      setStep(9);
    }
  }, [isMobile]);

  const handleStep9Click = useCallback(async () => {
    if (isMobile) {
      // Mobile: contenuto chat visto → spotlight sulla X
      setStep(10);
    } else {
      // Desktop: Coach AI cliccato → aspetta chat, spotlight sul contenuto
      setStep(10);
      await waitForEl('[data-tour="chat-body"]', 3000);
    }
  }, [isMobile]);

  const handleStep10Click = useCallback(async () => {
    if (isMobile) {
      // Mobile: chat chiusa → spotlight sull'hamburger dell'app
      setStep(11);
      await waitForEl('[data-tour="app-hamburger"]', 2000);
    } else {
      // Desktop: contenuto chat visto → spotlight sulla X
      setStep(11);
    }
  }, [isMobile]);

  const handleStep11Click = useCallback(async () => {
    if (isMobile) {
      // Mobile: hamburger cliccato → aspetta menu, spotlight su "Dashboard"
      setStep(12);
      await waitForEl('[data-tour="menu-dashboard"]', 2000);
    } else {
      // Desktop: chat chiusa → spotlight sul logo
      setStep(12);
      await waitForEl('[data-tour="app-logo"]', 2000);
    }
  }, [isMobile]);

  const handleStep12Click = useCallback(() => {
    endTour();
  }, [endTour]);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setStep(0);
  }, []);

  // Step 0: crea un cerchio che si muove random e si ferma
  useEffect(() => {
    if (step !== 0) return;
    let dot = document.getElementById('tour-random-dot');
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'tour-random-dot';
      dot.style.cssText = `position:fixed;width:1px;height:1px;max-width:1px;max-height:1px;overflow:hidden;pointer-events:none;z-index:-1;transition:left 1.2s cubic-bezier(0.34,1.56,0.64,1),top 1.2s cubic-bezier(0.34,1.56,0.64,1);`;
      // Posizione iniziale random
      // Il cerchio è centrato sul dot — margine = raggio + 15px
      const isMob = window.innerWidth < 768;
      const radius = (isMob ? 180 : 280) / 2 + 15;
      const popupTop = window.innerHeight * 0.72;
      // Posizione iniziale: nella metà alta dello schermo (evita popup in basso)
      dot.style.left = `${radius + Math.random() * (window.innerWidth - radius * 2)}px`;
      dot.style.top = `${radius + Math.random() * (popupTop - radius * 2)}px`;
      document.body.appendChild(dot);
    }
    // Muovi il cerchio ogni 2.5s (mai fuori schermo, mai sopra il popup)
    const moveInterval = setInterval(() => {
      const d = document.getElementById('tour-random-dot');
      if (d) {
        const isMob = window.innerWidth < 768;
        const radius = (isMob ? 180 : 280) / 2 + 15;
        const W = window.innerWidth;
        const H = window.innerHeight;
        // Zona proibita: popup in basso (circa 8% dal fondo, alto ~180px)
        const popupTop = H * 0.72; // il popup occupa dal 72% in giù circa
        // Genera posizione random che evita il popup
        let x = 0, y = 0, attempts = 0;
        do {
          x = radius + Math.random() * (W - radius * 2);
          y = radius + Math.random() * (H - radius * 2);
          attempts++;
        } while (y + radius > popupTop && attempts < 20);
        d.style.left = `${x}px`;
        d.style.top = `${y}px`;
      }
    }, 2500);
    return () => {
      clearInterval(moveInterval);
      const d = document.getElementById('tour-random-dot');
      if (d) d.remove();
    };
  }, [step]);

  if (loading || !user) return null;

  return (
    <>
      {showWelcome && <WelcomeModal onStart={startTour} onSkip={skipTour} onSkipPermanent={skipTourPermanent} />}

      {/* Step 0: Dashboard — mirino 007 che si muove */}
      {step === 0 && (
        <Spotlight
          selector="#tour-random-dot"
          text={`Questa è la tua dashboard. Da qui accedi a tutto: campionati, pronostici, simulazioni e analisi AI.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca il mirino per continuare.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep0Click}
          stepIndex={0}
          padding={0}
          borderRadius={999}
          popupPosition="bottom"
        />
      )}

      {/* Step 1: Mobile → hamburger, Desktop → "Competizioni" */}
      {step === 1 && (
        <Spotlight
          selector={isMobile ? '[data-tour="nav-hamburger"]' : '[data-tour="nav-competizioni"]'}
          text={isMobile
            ? `Da qui accedi a tutti i campionati e le funzioni.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Apri il menu.</span>`
            : `Da qui esplori tutti i campionati disponibili.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Competizioni.</span>`
          }
          onSkip={skipTour}
          onTargetClick={handleStep1Click}
          stepIndex={1}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 2: Mobile → "Altri Campionati" nell'hamburger, Desktop → nel dropdown */}
      {step === 2 && (
        <Spotlight
          selector={isMobile ? '[data-tour="step-1a"]' : '[data-tour="dd-altri-campionati"]'}
          text={`Ma ce ne sono molti di più — 26 leghe da tutto il mondo.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su &ldquo;Altri Campionati&rdquo;.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep2Click}
          stepIndex={2}
          padding={2}
          borderRadius={6}
        />
      )}

      {/* Step 3: Spotlight su Eredivisie nel modale */}
      {step === 3 && (
        <Spotlight
          selector={'[data-tour="tour-league-sample"]'}
          text={`26 leghe da tutto il mondo. Proviamo con l'Eredivisie — il campionato olandese.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Eredivisie.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep3Click}
          stepIndex={3}
          padding={2}
          borderRadius={4}
        />
      )}

      {/* Step 4: Giornata successiva */}
      {step === 4 && (
        <Spotlight
          selector={'[data-tour="giornata-next"]'}
          text={`Puoi spostarti tra le giornate. Iniziamo dalla prossima.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla giornata successiva.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep4Click}
          stepIndex={4}
          padding={4}
          borderRadius={20}
        />
      )}

      {/* Step 5: Giornata precedente */}
      {step === 5 && (
        <Spotlight
          selector={'[data-tour="giornata-previous"]'}
          text={`Bene! Ora torniamo indietro.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla giornata precedente.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep5Click}
          stepIndex={5}
          padding={4}
          borderRadius={20}
        />
      )}

      {/* Step 6: Giornata corrente */}
      {step === 6 && (
        <Spotlight
          selector={'[data-tour="giornata-current"]'}
          text={`Perfetto. Ora torna alla giornata in corso.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla giornata corrente.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep6Click}
          stepIndex={6}
          padding={4}
          borderRadius={20}
        />
      )}

      {/* Step 7: Seleziona una partita */}
      {step === 7 && (
        <Spotlight
          selector={'[data-tour="first-match"]'}
          text={`Ogni partita mostra quote, orario e risultati. Cliccandola puoi vedere le statistiche e simularla.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su questa partita.</span>`}
          onSkip={skipTour}
          onTargetClick={handleStep7Click}
          stepIndex={7}
          padding={4}
          borderRadius={20}
        />
      )}

      {/* Step 8: Mobile → robottino Coach AI / Desktop → "Torna alla lista" */}
      {step === 8 && (
        <Spotlight
          selector={isMobile ? '[data-tour="coach-ai-btn"]' : '[data-tour="btn-lista"]'}
          text={isMobile
            ? `Questo è il Coach AI — il tuo assistente per ogni partita. Ti spiega il pronostico, risponde alle tue domande, analizza tutto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sul Coach AI.</span>`
            : `Qui puoi vedere le statistiche della partita. Ora torniamo alla lista per scoprire il Coach AI.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su "Torna alla lista".</span>`
          }
          onSkip={skipTour}
          onTargetClick={handleStep8Click}
          stepIndex={8}
          padding={4}
          borderRadius={isMobile ? 20 : 8}
        />
      )}

      {/* Step 9: Mobile → contenuto chat (scrollabile) / Desktop → robottino Coach AI */}
      {step === 9 && (
        <Spotlight
          selector={isMobile ? '[data-tour="chat-body"]' : '[data-tour="coach-ai-btn"]'}
          text={isMobile
            ? `Il Coach AI analizza la partita e risponde alle tue domande. Scorri per leggere.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca per continuare.</span>`
            : `Questo è il Coach AI — il tuo assistente per ogni partita. Ti spiega il pronostico, risponde alle tue domande, analizza tutto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sul Coach AI.</span>`
          }
          onSkip={skipTour}
          onTargetClick={handleStep9Click}
          stepIndex={9}
          padding={isMobile ? 4 : 6}
          borderRadius={isMobile ? 12 : 20}
          scrollable={isMobile}
        />
      )}

      {/* Step 10: Mobile → X chiudi chat / Desktop → contenuto chat (scrollabile) */}
      {step === 10 && (
        <Spotlight
          selector={isMobile ? '[data-tour="chat-close"]' : '[data-tour="chat-body"]'}
          text={isMobile
            ? `Ora chiudi la chat per continuare.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla X.</span>`
            : `Il Coach AI analizza la partita e risponde alle tue domande. Scorri per leggere.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca per continuare.</span>`
          }
          onSkip={skipTour}
          onTargetClick={handleStep10Click}
          stepIndex={10}
          padding={4}
          borderRadius={isMobile ? 8 : 12}
          scrollable={!isMobile}
        />
      )}

      {/* Step 11: Mobile → hamburger app / Desktop → X chiudi chat */}
      {step === 11 && (
        <Spotlight
          selector={isMobile ? '[data-tour="app-hamburger"]' : '[data-tour="chat-close"]'}
          text={isMobile
            ? `Ora torniamo alla dashboard.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Apri il menu.</span>`
            : `Ora chiudi la chat.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla X.</span>`
          }
          onSkip={skipTour}
          onTargetClick={handleStep11Click}
          stepIndex={11}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 12: Mobile → Dashboard nel menu / Desktop → logo */}
      {step === 12 && (
        <Spotlight
          selector={isMobile ? '[data-tour="menu-dashboard"]' : '[data-tour="app-logo"]'}
          text={isMobile
            ? `Torna alla dashboard per esplorare tutto il resto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Dashboard.</span>`
            : `Torna alla dashboard per esplorare tutto il resto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sul logo AI Simulator.</span>`
          }
          onSkip={skipTour}
          onTargetClick={handleStep12Click}
          stepIndex={12}
          padding={4}
          borderRadius={8}
          zBase={isMobile ? 200010 : 200000}
          popupPosition="top"
        />
      )}
    </>
  );
}
