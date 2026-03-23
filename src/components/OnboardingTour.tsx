import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import LogoVirgo from './LogoVirgo';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

// --- CAPITOLI DEL TOUR ---
const CHAPTERS = [
  { id: 1, title: 'Campionati e Partite', startStep: 0, endStep: 11 },
  { id: 2, title: 'Pronostici', startStep: 12, endStep: 18 },
  { id: 3, title: 'Ticket AI e Bollette', startStep: 19, endStep: 27 },
  { id: 4, title: 'Simulazione', startStep: 28, endStep: 28 },          // placeholder
  { id: 5, title: 'Money Management', startStep: 29, endStep: 29 },     // placeholder
];

function getChapterForStep(step: number) {
  return CHAPTERS.find(c => step >= c.startStep && step <= c.endStep) || CHAPTERS[0];
}

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
function WelcomeModal({ onStartChapter, onSkip, onSkipPermanent }: {
  onStartChapter: (chapterStartStep: number) => void;
  onSkip: () => void;
  onSkipPermanent: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showChapters, setShowChapters] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(0); // indice in CHAPTERS

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
        <LogoVirgo size={56} style={{
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
          margin: '0 0 24px',
        }}>
          In pochi secondi ti mostriamo come funziona tutto — pronostici, simulazioni, biglietti e molto altro. Puoi saltare in qualsiasi momento e riprendere il tour dalle Impostazioni.
        </p>

        {/* Lista capitoli — collapsabile */}
        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
          <button
            onClick={() => setShowChapters(!showChapters)}
            style={{
              background: 'none', border: 'none',
              color: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: '6px',
              width: '100%',
            }}
          >
            <span style={{
              transform: showChapters ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s', display: 'inline-block', fontSize: '10px',
            }}>▶</span>
            Argomenti del tour ({CHAPTERS.length}) — scegli da dove iniziare
          </button>
          {showChapters && (
            <div style={{
              marginTop: '8px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              {CHAPTERS.map((ch, idx) => (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChapter(idx)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer',
                    background: idx === selectedChapter
                      ? (isLight ? `${theme.cyan}10` : `${theme.cyan}15`)
                      : (isLight ? '#fafafa' : 'rgba(255,255,255,0.02)'),
                    borderBottom: idx < CHAPTERS.length - 1
                      ? `1px solid ${isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`
                      : 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    background: idx === selectedChapter
                      ? `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`
                      : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                    color: idx === selectedChapter ? '#fff' : (isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)'),
                  }}>
                    {ch.id}
                  </div>
                  <span style={{
                    fontSize: '13px', fontWeight: idx === selectedChapter ? 600 : 400,
                    color: idx === selectedChapter
                      ? (isLight ? '#111827' : 'rgba(255,255,255,0.95)')
                      : (isLight ? '#6b7280' : 'rgba(255,255,255,0.5)'),
                  }}>
                    {ch.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => onStartChapter(CHAPTERS[selectedChapter].startStep)}
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
            {showChapters && selectedChapter > 0
              ? `Inizia da: ${CHAPTERS[selectedChapter].title}`
              : 'Inizia il tour'}
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
function Spotlight({ selector, text, onSkip, onTargetClick, onOpenChapters, chapterTitle = '', chapterNum = 1, totalChapters = 5, chapterProgress = 0, padding = 8, borderRadius = 12, popupPosition = 'auto', popupOffset = 0, scrollable = false, zBase = 200000 }: {
  selector: string | null;
  text: string;
  onSkip: () => void;
  onTargetClick: () => void;
  onOpenChapters?: () => void;
  chapterTitle?: string;
  chapterNum?: number;
  totalChapters?: number;
  chapterProgress?: number;
  padding?: number;
  borderRadius?: number;
  popupPosition?: 'auto' | 'top' | 'bottom';
  popupOffset?: number;
  scrollable?: boolean;
  zBase?: number;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const animFrame = useRef(0);

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
    <div style={{ position: 'fixed', inset: 0, zIndex: zBase, pointerEvents: 'auto' }}>
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

      {/* Zona cliccabile SOLO sull'elemento target */}
      {selector && rect && !scrollable && (
        <div
          style={{
            position: 'fixed',
            top, left, width, height,
            borderRadius,
            background: 'transparent',
            cursor: 'pointer',
            zIndex: zBase + 4,
            pointerEvents: 'auto',
            transition: isCircle
              ? 'top 1.2s cubic-bezier(0.34,1.56,0.64,1), left 1.2s cubic-bezier(0.34,1.56,0.64,1)'
              : 'all 0.4s ease',
          }}
          onClick={() => {
            if (selector) {
              const target = document.querySelector(selector) as HTMLElement;
              if (target) {
                // Cerca prima un elemento cliccabile specifico dentro il target
                const matchTarget = target.querySelector('.match-click-target') as HTMLElement;
                const expandRow = target.querySelector('.card-expand-row') as HTMLElement;
                const btn = target.querySelector('button, a') as HTMLElement;
                const tagName = target.tagName.toLowerCase();
                if (matchTarget) {
                  matchTarget.click();
                } else if (expandRow) {
                  expandRow.click();
                } else if (tagName === 'button' || tagName === 'a') {
                  target.click();
                } else if (btn) {
                  btn.click();
                } else {
                  const firstChild = target.firstElementChild as HTMLElement;
                  if (firstChild) firstChild.click();
                  else target.click();
                }
              }
            }
            onTargetClick();
          }}
        />
      )}

      {/* Zona scrollabile (chat) — nessun div sovrapposto, l'elemento reale viene alzato sopra l'overlay */}

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
            ? { top: `calc(5% + ${popupOffset || 0}px)`, bottom: 'auto' }
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
          {/* Header capitolo + barra avanzamento */}
          {chapterTitle && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: theme.cyan,
                }}>
                  {chapterTitle}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)',
                }}>
                  {chapterNum} di {totalChapters}
                </span>
              </div>
              {/* Barra avanzamento */}
              <div style={{
                height: '3px', borderRadius: '2px',
                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${chapterProgress}%`,
                  background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}
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
          {/* Footer: skip + continua (se scrollable) + frecciolina capitoli */}
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
            {onOpenChapters && (
              <button
                onClick={onOpenChapters}
                style={{
                  background: 'none', border: 'none',
                  color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)',
                  fontSize: '11px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  padding: '2px 4px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)'; }}
              >
                ☰ Capitoli
              </button>
            )}
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

// --- ANNOTAZIONE CERCHIO ROSSO (appare, click per aprire/chiudere, poi sparisce) ---
interface CircleAnnotation {
  selector: string;
  label: string;
  clickToOpen?: boolean;
  clickToClose?: boolean;
  scrollFree?: boolean;     // se true, lo scroll è libero durante questa annotazione
  duration?: number;
  forceRadius?: string;     // forza borderRadius (es. '12px' per rettangolo)
}

function RedCircleSequence({ annotations, onComplete, parentSelector }: {
  annotations: CircleAnnotation[];
  onComplete: () => void;
  parentSelector?: string; // selettore del container padre (per cercare dentro)
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [waitingForDismiss, setWaitingForDismiss] = useState(false);
  const dismissResolve = useRef<(() => void) | null>(null);
  const animFrame = useRef(0);

  const current = annotations[currentIdx];

  // Trova l'elemento e aggiorna posizione
  useEffect(() => {
    if (!current) return;
    const fullSelector = parentSelector ? `${parentSelector} ${current.selector}` : current.selector;

    const runStep = async () => {
      // Aspetta che l'elemento esista
      const el = await waitForEl(fullSelector, 3000);
      if (!el) {
        // Elemento non trovato, salta al prossimo
        if (currentIdx < annotations.length - 1) setCurrentIdx(currentIdx + 1);
        else onComplete();
        return;
      }

      // Scrolla l'elemento al centro dello schermo
      document.body.style.overflow = 'auto';
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 400));
      document.body.style.overflow = 'hidden';

      // Click per aprire se richiesto
      if (current.clickToOpen) {
        (el as HTMLElement).click();
        await new Promise(r => setTimeout(r, 500));
        // Ri-scrolla dopo apertura (il contenuto potrebbe spostare l'elemento)
        document.body.style.overflow = 'auto';
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 300));
        document.body.style.overflow = 'hidden';
      }

      // Se clickToOpen, sblocca scroll per permettere di esplorare il contenuto
      if (current.clickToOpen) {
        document.body.style.overflow = 'auto';
      }

      // Mostra cerchio e aspetta che l'utente prema la X
      setVisible(true);
      setWaitingForDismiss(true);
      const updateRect = () => {
        const r = (el as HTMLElement).getBoundingClientRect();
        setRect(r);
        animFrame.current = requestAnimationFrame(updateRect);
      };
      updateRect();

      // Aspetta che l'utente prema la X per continuare
      await new Promise<void>(resolve => {
        dismissResolve.current = resolve;
      });

      // Ri-blocca scroll e chiudi se richiesto
      document.body.style.overflow = 'hidden';
      if (current.clickToClose) {
        (el as HTMLElement).click();
        await new Promise(r => setTimeout(r, 300));
      }

      // Nascondi e passa al prossimo
      setVisible(false);
      setWaitingForDismiss(false);
      cancelAnimationFrame(animFrame.current);
      await new Promise(r => setTimeout(r, 200));

      if (currentIdx < annotations.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        onComplete();
      }
    };

    runStep();
    return () => cancelAnimationFrame(animFrame.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  if (!visible || !rect || !current) return (
    // Overlay scuro senza spotlight durante le transizioni
    <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'auto', background: 'rgba(0,0,0,0.7)' }} />
  );

  const pad = 6;
  const spotTop = rect.top - pad;
  const spotLeft = rect.left - pad;
  const spotW = rect.width + pad * 2;
  const spotH = rect.height + pad * 2;
  const ratio = rect.width / rect.height;
  const bRadius = current.forceRadius || (ratio > 2 || ratio < 0.5 ? '12px' : '50%');
  // Scroll libero quando richiesto dall'annotazione
  const isScrollFree = waitingForDismiss && !!current.scrollFree;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: isScrollFree ? 'none' : 'auto' }}>
      {/* Overlay scuro con buco sulla forma dell'elemento */}
      <div style={{
        position: 'fixed',
        top: spotTop, left: spotLeft,
        width: spotW, height: spotH,
        borderRadius: bRadius,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
        zIndex: 200001,
        pointerEvents: 'none',
        transition: 'all 0.4s ease',
      }} />
      {/* Bordo rosso pulsante */}
      <div style={{
        position: 'fixed',
        top: spotTop, left: spotLeft,
        width: spotW, height: spotH,
        borderRadius: bRadius,
        border: '3px solid #ef4444',
        boxShadow: '0 0 20px rgba(239,68,68,0.5), inset 0 0 20px rgba(239,68,68,0.1)',
        animation: 'red-circle-pulse 1.5s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 200002,
        transition: 'all 0.4s ease',
      }} />
      {/* Label + X per continuare — sopra se contenuto si espande sotto */}
      <div style={{
        position: 'fixed',
        ...(current.clickToOpen
          ? { top: Math.max(10, spotTop - 50) }
          : spotTop + spotH + 50 < window.innerHeight
            ? { top: spotTop + spotH + 10 }
            : { top: Math.max(10, spotTop - 50) }),
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '400px',
        zIndex: 200003,
        pointerEvents: 'auto',
        animation: 'tour-text-fadein 0.3s ease',
      }}>
        <div style={{
          background: 'rgba(239,68,68,0.9)',
          color: '#fff',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: '"Inter", system-ui, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ flex: 1, lineHeight: '1.4' }}>{current.label}</span>
          {waitingForDismiss && (
            <button
              onClick={() => { if (dismissResolve.current) dismissResolve.current(); }}
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: 'none',
                color: '#fff',
                width: '22px', height: '22px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {/* Animazione CSS */}
      <style>{`
        @keyframes red-circle-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.5), inset 0 0 20px rgba(239,68,68,0.1); }
          50% { box-shadow: 0 0 35px rgba(239,68,68,0.7), inset 0 0 25px rgba(239,68,68,0.2); }
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
  const [step21Auto, setStep21Auto] = useState(false);

  // Segui resize per mobile/desktop
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Salva flag via API backend + localStorage come fallback
  const markCompleted = useCallback(async () => {
    localStorage.setItem('onboarding_completed', '1');
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`${API_BASE}/onboarding/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch { /* silenzioso — localStorage già salvato */ }
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

  // Controlla flag onboarding_completed via localStorage + API backend
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    // Non mostrare se tour già attivo, in ripresa, o già completato
    if (step >= 0 || sessionStorage.getItem('tour_step') || localStorage.getItem('onboarding_completed')) {
      setLoading(false);
      return;
    }
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
          } else if (data.onboarding_completed) {
            localStorage.setItem('onboarding_completed', '1');
          }
        } else if (res.status === 404) {
          if (location.pathname === '/' && !sessionStorage.getItem('tour_step')) setShowWelcome(true);
        }
      } catch {
        if (location.pathname === '/' && !sessionStorage.getItem('tour_step')) setShowWelcome(true);
      }
      finally { setLoading(false); }
    };
    checkOnboarding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Ascolta evento custom per rilanciare il tour (da Impostazioni)
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('onboarding_completed');
      if (window.location.pathname !== '/') {
        sessionStorage.setItem('restart_tour', '1');
        window.location.href = '/';
        return;
      }
      setStep(-1);
      setShowWelcome(true);
    };
    window.addEventListener('restart-onboarding-tour', handler);
    return () => window.removeEventListener('restart-onboarding-tour', handler);
  }, []);

  // Restart tour o riprendi step da sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem('restart_tour') && location.pathname === '/') {
      sessionStorage.removeItem('restart_tour');
      localStorage.removeItem('onboarding_completed');
      setTimeout(() => setShowWelcome(true), 500);
    }
    const savedStep = sessionStorage.getItem('tour_step');
    if (savedStep) {
      // Non rimuovere subito — il check API potrebbe partire prima del timeout
      setTimeout(() => {
        sessionStorage.removeItem('tour_step');
        setStep(parseInt(savedStep));
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop: mantieni dropdown aperto durante step 2 (competizioni), 13 e 20 (pronostici)
  useEffect(() => {
    if (isMobile) return;
    if (step !== 2 && step !== 13 && step !== 20) return;
    const selector = step === 2 ? '[data-tour="nav-competizioni"]' : '[data-tour="nav-pronostici"]';
    const keepOpen = () => {
      const dd = document.querySelector(`${selector} [data-dropdown]`) as HTMLElement;
      if (dd) dd.style.display = 'block';
    };
    const interval = setInterval(keepOpen, 100);
    keepOpen();
    return () => clearInterval(interval);
  }, [step, isMobile]);


  // Mobile: alza zIndex pannello hamburger durante step 2, 13 e 20
  useEffect(() => {
    if (!isMobile || (step !== 2 && step !== 13 && step !== 20)) return;
    const panel = document.querySelector('[data-tour="hamburger-panel"]') as HTMLElement;
    if (panel) panel.style.zIndex = '200005';
    return () => {
      const p = document.querySelector('[data-tour="hamburger-panel"]') as HTMLElement;
      if (p) p.style.zIndex = '9000';
    };
  }, [step, isMobile]);

  // Inietta bollette fake durante il capitolo 3 (Ticket AI)
  useEffect(() => {
    const isChapter3 = step >= 19 && step <= 27 || (step >= 211 && step <= 2102) || step === 212 || step === 213 || step === 214 || step === 231;
    if (isChapter3) {
      window.dispatchEvent(new Event('inject-tour-bollette'));
    }
    return () => {
      window.dispatchEvent(new Event('remove-tour-bollette'));
    };
  }, [step]);

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

  const _endTour = useCallback(() => {
    setStep(-1);
    markCompleted();
  }, [markCompleted]);
  // Alias per uso futuro (prossimi step)
  void _endTour;

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
      // Mobile: Coach AI cliccato → aspetta chat, spotlight sulla X
      setStep(9);
      await waitForEl('[data-tour="chat-close"]', 3000);
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
      // Mobile: chat chiusa → spotlight sull'hamburger dell'app
      setStep(10);
      await waitForEl('[data-tour="app-hamburger"]', 2000);
    } else {
      // Desktop: Coach AI cliccato → aspetta chat, spotlight sulla X
      setStep(10);
      await waitForEl('[data-tour="chat-close"]', 3000);
    }
  }, [isMobile]);

  const handleStep10Click = useCallback(async () => {
    if (isMobile) {
      // Mobile: hamburger cliccato → aspetta menu, spotlight su "Dashboard"
      setStep(11);
      await waitForEl('[data-tour="menu-dashboard"]', 2000);
    } else {
      // Desktop: chat chiusa → spotlight sul logo
      setStep(11);
      await waitForEl('[data-tour="app-logo"]', 2000);
    }
  }, [isMobile]);

  const handleStep11Click = useCallback(() => {
    // Click su Dashboard/logo ricarica la pagina → salva step successivo
    sessionStorage.setItem('tour_step', '12');
  }, []);

  // --- PARTE 2: Pronostici ---
  const handleStep12Click = useCallback(() => {
    if (isMobile) {
      // Mobile: hamburger cliccato → aspetta menu, spotlight su Best Picks
      setTimeout(async () => {
        await waitForEl('[data-tour="mob-best-picks"]', 2000);
        setStep(13);
      }, 300);
    } else {
      // Desktop: Pronostici cliccato → apri dropdown, spotlight su Best Picks
      const nav = document.querySelector('[data-tour="nav-pronostici"]');
      if (nav) {
        const dd = nav.querySelector('[data-dropdown]') as HTMLElement;
        if (dd) dd.style.display = 'block';
      }
      setTimeout(() => setStep(13), 150);
    }
  }, [isMobile]);

  const handleStep13Click = useCallback(() => {
    // Click su Best Picks → naviga a /best-picks → salva step
    sessionStorage.setItem('tour_step', '14');
  }, []);

  // --- PARTE 2 continua: dentro Best Picks ---
  const handleStep14Click = useCallback(async () => {
    // Click sulla prima lega → si espande, spotlight sulla prima card
    await new Promise(r => setTimeout(r, 300));
    await waitForEl('[data-tour="bp-first-card"]', 3000);
    setStep(15);
  }, []);

  const handleStep15Click = useCallback(async () => {
    // Click sulla prima card → la card si espande → avvia sequenza cerchi rossi
    // Sblocca scroll per permettere alla card di espandersi
    document.body.style.overflow = 'auto';
    await new Promise(r => setTimeout(r, 500));
    document.body.style.overflow = 'hidden';
    setStep(16); // step 16 = sequenza cerchi rossi
  }, []);

  const handleCirclesComplete = useCallback(async () => {
    // Cerchi rossi completati → scrolla alla riga della partita, poi step 17
    document.body.style.overflow = 'auto';
    const row = document.querySelector('[data-tour="bp-first-card"] .card-expand-row') as HTMLElement;
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 500));
    }
    document.body.style.overflow = 'hidden';
    setStep(17);
  }, []);

  const handleStep17Click = useCallback(async () => {
    // Click sulla card per chiuderla → scrolla al bottone Dashboard, poi step 18
    document.body.style.overflow = 'auto';
    const btn = await waitForEl('[data-tour="bp-back-dashboard"]', 2000);
    if (btn) {
      (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 400));
    }
    document.body.style.overflow = 'hidden';
    setStep(18);
  }, []);

  const handleStep18Click = useCallback(() => {
    // Click su Dashboard → naviga alla dashboard → salva step per capitolo 3
    sessionStorage.setItem('tour_step', '19');
  }, []);

  // --- PARTE 3: Ticket AI e Bollette ---
  const handleStep19Click = useCallback(() => {
    if (isMobile) {
      // Mobile: hamburger cliccato → aspetta menu, spotlight su Ticket AI
      setTimeout(async () => {
        await waitForEl('[data-tour="mob-ticket-ai"]', 2000);
        setStep(20);
      }, 300);
    } else {
      // Desktop: Pronostici cliccato → apri dropdown, spotlight su Ticket AI
      const nav = document.querySelector('[data-tour="nav-pronostici"]');
      if (nav) {
        const dd = nav.querySelector('[data-dropdown]') as HTMLElement;
        if (dd) dd.style.display = 'block';
      }
      setTimeout(() => setStep(20), 150);
    }
  }, [isMobile]);

  const handleStep20Click = useCallback(() => {
    // Click su Ticket AI → naviga a /ticket-ai → salva step
    sessionStorage.setItem('tour_step', '21');
  }, []);

  // Helper: scrolla la chat in fondo (solo il container della chat, non la pagina)
  const scrollChatToBottom = useCallback(() => {
    const chatScroll = document.querySelector('[data-tour="ticket-chat-scroll"]') as HTMLElement;
    if (chatScroll) {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }
  }, []);

  // Helper: typewriter su textarea
  const typewriterTextarea = useCallback(async (msg: string) => {
    const textarea = document.querySelector('textarea[placeholder="Scrivi un messaggio..."]') as HTMLTextAreaElement;
    if (!textarea) return;
    textarea.focus();
    for (let i = 0; i < msg.length; i++) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, msg.slice(0, i + 1));
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 40));
    }
    await new Promise(r => setTimeout(r, 300));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    // Chiudi la tastiera mobile togliendo il focus
    textarea.blur();
    await new Promise(r => setTimeout(r, 200));
    scrollChatToBottom();
  }, [scrollChatToBottom]);

  const handleStep21Click = useCallback(async () => {
    // Click sul banner → apri la chat
    const banner = document.querySelector('[data-tour="ticket-builder-banner"]') as HTMLElement;
    if (banner) banner.click();
    await new Promise(r => setTimeout(r, 500));

    // Avvia scroll polling: segui sempre l'ultimo messaggio
    const scrollInterval = setInterval(scrollChatToBottom, 800);

    // Messaggio 1: typewriter
    await typewriterTextarea('Voglio un biglietto sicuro');

    // Aspetta la prima risposta dell'AI (max 15 secondi)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      scrollChatToBottom();
      const bubbles = document.querySelectorAll('[style*="flex-start"] > div');
      if (bubbles.length >= 1) break;
    }
    await new Promise(r => setTimeout(r, 4000));
    scrollChatToBottom();

    // Messaggio 2: rispondi alla domanda dell'AI
    await typewriterTextarea('Quota massimo 3, partite di domani');

    // Aspetta il biglietto (max 20 secondi)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 500));
      scrollChatToBottom();
      const stakeInput = document.querySelector('.builder-stake-input');
      if (stakeInput) break;
    }

    // Ferma scroll polling
    clearInterval(scrollInterval);

    // Scroll al biglietto
    await new Promise(r => setTimeout(r, 2000));
    scrollChatToBottom();
    await new Promise(r => setTimeout(r, 1000));

    // Step intermedi: cerchio verde su messaggio AI, poi bolletta, poi puntata
    setStep21Auto(false);
    setStep(2101); // cerchio verde su messaggio AI
  }, [scrollChatToBottom, typewriterTextarea]);

  // Step 2101: Cerchio verde sul messaggio di spiegazione dell'AI
  const [step2101Waiting, setStep2101Waiting] = useState(false);
  const step2101DismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (step !== 2101) return;
    const run = async () => {
      scrollChatToBottom();
      await new Promise(r => setTimeout(r, 300));
      // Trova l'ultimo messaggio AI (la spiegazione prima della bolletta)
      const aiBubbles = document.querySelectorAll('.chat-ai-bubble');
      const lastAiBubble = aiBubbles[aiBubbles.length - 1] as HTMLElement;
      if (lastAiBubble) {
        lastAiBubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 400));
      }
      setStep2101Waiting(true);
      await new Promise<void>(resolve => { step2101DismissRef.current = resolve; });
      setStep2101Waiting(false);
      setStep(2102);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 2102: Cerchio verde sulla bolletta
  const [step2102Waiting, setStep2102Waiting] = useState(false);
  const step2102DismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (step !== 2102) return;
    const run = async () => {
      const card = document.querySelector('.chat-bolletta-card') as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 400));
      }
      setStep2102Waiting(true);
      await new Promise<void>(resolve => { step2102DismissRef.current = resolve; });
      setStep2102Waiting(false);
      // Ora vai all'input puntata
      scrollChatToBottom();
      await new Promise(r => setTimeout(r, 300));
      setStep(212);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 212: Cerchio rosso su input puntata → typewriter 15€ → X per continuare
  const [step212Waiting, setStep212Waiting] = useState(false);
  const step212DismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (step !== 212) return;
    const run = async () => {
      // Scrolla al biglietto
      scrollChatToBottom();
      await new Promise(r => setTimeout(r, 500));

      // Trova input puntata e typewriter 15
      const stakeInput = document.querySelector('.builder-stake-input') as HTMLInputElement;
      if (stakeInput) {
        stakeInput.focus();
        // Pulisci prima
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(stakeInput, '');
        stakeInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 200));

        const stakeMsg = '15';
        for (let i = 0; i < stakeMsg.length; i++) {
          setter?.call(stakeInput, stakeMsg.slice(0, i + 1));
          stakeInput.dispatchEvent(new Event('input', { bubbles: true }));
          stakeInput.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 120));
        }
        stakeInput.dispatchEvent(new Event('blur', { bubbles: true }));
        stakeInput.blur();
        // Focus su un elemento neutro per chiudere la tastiera mobile
        (document.activeElement as HTMLElement)?.blur();
        await new Promise(r => setTimeout(r, 500));
        scrollChatToBottom();
      }

      // Mostra cerchio rosso e aspetta X
      setStep212Waiting(true);
      await new Promise<void>(resolve => { step212DismissRef.current = resolve; });
      setStep212Waiting(false);

      // Avanza a step 213 (spotlight su Salva)
      setStep(213);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 213: Spotlight su "Salva nelle mie bollette" → utente clicca
  const handleStep213Click = useCallback(async () => {
    // Clicca il bottone salva
    const btn = document.querySelector('.builder-btn-salva') as HTMLElement;
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 800));
    scrollChatToBottom();

    // Step 214: cerchio rosso su "Salvata!"
    setStep(214);
  }, [scrollChatToBottom]);

  // Step 214: Cerchio rosso su "Salvata!" → X → chiudi chat
  const [step214Waiting, setStep214Waiting] = useState(false);
  const step214DismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (step !== 214) return;
    const run = async () => {
      scrollChatToBottom();
      await new Promise(r => setTimeout(r, 300));
      setStep214Waiting(true);
      await new Promise<void>(resolve => { step214DismissRef.current = resolve; });
      setStep214Waiting(false);

      // Chiudi la chat
      const banner = document.querySelector('[data-tour="ticket-builder-banner"]') as HTMLElement;
      if (banner) banner.click();
      await new Promise(r => setTimeout(r, 500));

      // Avvia cerchi rossi sui quadranti
      setStep(22);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleStep211Click = useCallback(async () => {
    // Chiudi la chat
    const banner = document.querySelector('[data-tour="ticket-builder-banner"]') as HTMLElement;
    if (banner) banner.click();
    await new Promise(r => setTimeout(r, 500));
    // Avvia cerchi rossi sui quadranti
    setStep(22);
  }, []);

  const handleStep22Complete = useCallback(async () => {
    // Cerchi rossi completati → spotlight su Le mie bollette
    document.body.style.overflow = 'auto';
    const el = await waitForEl('[data-tour="ticket-mie-bollette"]', 3000);
    if (el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 400));
    }
    document.body.style.overflow = 'hidden';
    setStep(23);
  }, []);

  const handleStep23Click = useCallback(async () => {
    // Le mie bollette cliccato → aspetta la vista, cerchio rosso sulla prima bolletta salvata
    await new Promise(r => setTimeout(r, 800));
    // Cerca la prima bolletta nella vista "Le mie bollette"
    document.body.style.overflow = 'auto';
    const firstBolletta = await waitForEl('[data-tour="mia-prima-bolletta"]', 3000);
    if (firstBolletta) {
      (firstBolletta as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 400));
    }
    document.body.style.overflow = 'hidden';
    setStep(231); // cerchio rosso sulla bolletta salvata
  }, []);

  // Step 231: Cerchio rosso sulla prima bolletta salvata
  const [step231Waiting, setStep231Waiting] = useState(false);
  const step231DismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (step !== 231) return;
    const run = async () => {
      setStep231Waiting(true);
      await new Promise<void>(resolve => { step231DismissRef.current = resolve; });
      setStep231Waiting(false);
      // Torna indietro alla vista quadranti
      window.history.back();
      await new Promise(r => setTimeout(r, 500));
      // Spotlight su navigazione storico
      document.body.style.overflow = 'auto';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 400));
      document.body.style.overflow = 'hidden';
      setStep(24);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleStep24Click = useCallback(async () => {
    // Storico cliccato → simula click sulla freccia ◀ per andare nello storico
    const leftArrow = document.querySelector('[data-tour="ticket-storico-nav"] button, [data-tour="ticket-storico-nav-desktop"] button') as HTMLElement;
    if (leftArrow) leftArrow.click();
    await new Promise(r => setTimeout(r, 500));
    // Ora spotlight su "Oggi" per tornare
    setStep(241);
  }, []);

  const handleStep241Click = useCallback(async () => {
    // Click su "Oggi" → torna a oggi → spotlight su Selettiva
    // Resetta storicoDate via click sul bottone Oggi
    const oggiBtn = document.querySelector('[data-tour="ticket-storico-nav"] button:last-child, [data-tour="ticket-storico-nav-desktop"] button:last-child') as HTMLElement;
    if (oggiBtn) oggiBtn.click();
    await new Promise(r => setTimeout(r, 500));
    document.body.style.overflow = 'auto';
    const el = await waitForEl('[data-tour="ticket-quadrante-selettiva"]', 3000);
    if (el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 400));
    }
    document.body.style.overflow = 'hidden';
    setStep(25);
  }, []);

  const handleStep25Click = useCallback(async () => {
    // Click su Selettiva → si espande, aspetta la prima bolletta
    await new Promise(r => setTimeout(r, 500));
    const bolletta = await waitForEl('[data-tour="ticket-first-bolletta"]', 3000);
    if (bolletta) {
      // Inserisci importo nell'input puntata della bolletta fake
      const stakeInput = (bolletta as HTMLElement).querySelector('.bollette-stake-input') as HTMLInputElement;
      if (stakeInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(stakeInput, '20');
        stakeInput.dispatchEvent(new Event('input', { bubbles: true }));
        stakeInput.dispatchEvent(new Event('change', { bubbles: true }));
        stakeInput.dispatchEvent(new Event('blur', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
      }
    }
    setStep(26); // cerchi rossi sulla bolletta
  }, []);

  const handleStep26Complete = useCallback(async () => {
    // Cerchi rossi completati → spotlight sul bottone ← per uscire dalla Selettiva
    document.body.style.overflow = 'auto';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await new Promise(r => setTimeout(r, 400));
    document.body.style.overflow = 'hidden';
    setStep(261);
  }, []);

  const handleStep261Click = useCallback(async () => {
    // Click su ← dentro Selettiva → torna ai quadranti → spotlight back dashboard
    await new Promise(r => setTimeout(r, 500));
    document.body.style.overflow = 'auto';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await new Promise(r => setTimeout(r, 400));
    document.body.style.overflow = 'hidden';
    setStep(27);
  }, []);

  const handleStep27Click = useCallback(() => {
    // Click su back → torna alla dashboard → fine capitolo 3
    sessionStorage.setItem('tour_step', '28');
  }, []);

  const startTourFromStep = useCallback((startStep: number) => {
    setShowWelcome(false);
    setStep(startStep);
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

  // Calcola props capitolo per lo step corrente
  const chapter = getChapterForStep(step);
  const chapterStepsTotal = chapter.endStep - chapter.startStep + 1;
  const chapterStepCurrent = step - chapter.startStep;
  const chapterProgress = Math.round(((chapterStepCurrent + 1) / chapterStepsTotal) * 100);
  const chapterProps = {
    chapterTitle: chapter.title,
    chapterNum: chapter.id,
    totalChapters: CHAPTERS.length,
    chapterProgress,
  };

  // Menu capitoli — torna al welcome con capitoli aperti
  const handleOpenChapters = useCallback(() => {
    setStep(-1);
    document.body.style.overflow = '';
    setShowWelcome(true);
  }, []);

  if (loading || !user) return null;

  return (
    <>
      {showWelcome && <WelcomeModal onStartChapter={startTourFromStep} onSkip={skipTour} onSkipPermanent={skipTourPermanent} />}

      {/* Step 0: Dashboard — mirino 007 che si muove */}
      {step === 0 && (
        <Spotlight
          selector="#tour-random-dot"
          text={`Questa è la tua dashboard. Da qui accedi a tutto: campionati, pronostici, simulazioni e analisi AI.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca il mirino per continuare.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep0Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep1Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep2Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep3Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep4Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep5Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep6Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep7Click}
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
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep8Click}
          padding={4}
          borderRadius={isMobile ? 20 : 8}
        />
      )}

      {/* Step 9: Mobile → X chiudi chat / Desktop → robottino Coach AI */}
      {step === 9 && (
        <Spotlight
          selector={isMobile ? '[data-tour="chat-close"]' : '[data-tour="coach-ai-btn"]'}
          text={isMobile
            ? `Hai scoperto il Coach AI! Ora chiudi la chat.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla X.</span>`
            : `Questo è il Coach AI — il tuo assistente per ogni partita. Ti spiega il pronostico, risponde alle tue domande, analizza tutto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sul Coach AI.</span>`
          }
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep9Click}
          padding={isMobile ? 4 : 6}
          borderRadius={isMobile ? 8 : 20}
        />
      )}

      {/* Step 10: Mobile → hamburger app / Desktop → X chiudi chat */}
      {step === 10 && (
        <Spotlight
          selector={isMobile ? '[data-tour="app-hamburger"]' : '[data-tour="chat-close"]'}
          text={isMobile
            ? `Ora torniamo alla dashboard.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Apri il menu.</span>`
            : `Ora chiudi la chat.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla X.</span>`
          }
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep10Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 11: Mobile → Dashboard nel menu / Desktop → logo */}
      {step === 11 && (
        <Spotlight
          selector={isMobile ? '[data-tour="menu-dashboard"]' : '[data-tour="app-logo"]'}
          text={isMobile
            ? `Torna alla dashboard per esplorare tutto il resto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Dashboard.</span>`
            : `Torna alla dashboard per esplorare tutto il resto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sul logo AI Simulator.</span>`
          }
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep11Click}
          padding={4}
          borderRadius={8}
          zBase={isMobile ? 200010 : 200000}
          popupPosition="top"
          popupOffset={isMobile ? 30 : 0}
        />
      )}

      {/* === PARTE 2: PRONOSTICI === */}

      {/* Step 12: Mobile → hamburger dashboard / Desktop → "Pronostici" nella navbar */}
      {step === 12 && (
        <Spotlight
          selector={isMobile ? '[data-tour="nav-hamburger"]' : '[data-tour="nav-pronostici"]'}
          text={isMobile
            ? `Ora scopriamo i pronostici.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Apri il menu.</span>`
            : `Ora scopriamo i pronostici.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Pronostici.</span>`
          }
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep12Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 13: Mobile → Best Picks nel menu / Desktop → Best Picks nel dropdown */}
      {step === 13 && (
        <Spotlight
          selector={isMobile ? '[data-tour="mob-best-picks"]' : '[data-tour="dd-best-picks"]'}
          text={`Qui trovi i pronostici migliori di oggi, selezionati dal nostro sistema.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Best Picks.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep13Click}
          padding={2}
          borderRadius={6}
        />
      )}

      {/* Step 14: Best Picks — spotlight sulla prima lega */}
      {step === 14 && (
        <Spotlight
          selector={'[data-tour="bp-first-league"]'}
          text={`I pronostici sono organizzati per campionato. Apri una lega per vedere le partite.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su questa lega.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep14Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 15: Best Picks — spotlight sulla prima card partita */}
      {step === 15 && (
        <Spotlight
          selector={'[data-tour="bp-first-card"]'}
          text={`Ogni card mostra il pronostico, la quota, la confidence e il tipo di scommessa. Cliccandola vedi tutti i dettagli.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su questa partita.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep15Click}
          padding={4}
          borderRadius={12}
        />
      )}

      {/* Step 16: Sequenza cerchi rossi automatici sulla card espansa */}
      {step === 16 && (
        <RedCircleSequence
          parentSelector='[data-tour="bp-first-card"]'
          annotations={[
            {
              selector: '.first-pronostico-pill',
              label: 'Pronostico: confidence, quota, algoritmo di origine e stake',
            },
            {
              selector: '.first-pill-arrow',
              label: 'Storico: come si è evoluto il pronostico durante la giornata',
              clickToOpen: true,
              clickToClose: true,
            },
            {
              selector: '.analysis-match-section',
              label: 'Tre strumenti AI per approfondire l\'analisi della partita',
            },
            {
              selector: '.stochastic-engine-header',
              label: 'Statistiche su 100 simulazioni del sistema C',
              clickToOpen: true,
              clickToClose: true,
            },
            {
              selector: '.detail-section-header',
              label: 'Strisce, dettaglio segno e dettaglio gol',
              clickToOpen: true,
              clickToClose: true,
              scrollFree: true,
            },
          ]}
          onComplete={handleCirclesComplete}
        />
      )}

      {/* Step 17: Chiudi la card — evidenzia la riga cliccabile */}
      {step === 17 && (
        <Spotlight
          selector={'[data-tour="bp-first-card"] .card-expand-row'}
          text={`Bene, ora conosci gli strumenti principali. Chiudi la card.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca sulla partita per chiuderla.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep17Click}
          padding={4}
          borderRadius={12}
        />
      )}

      {/* Step 18: Torna alla dashboard */}
      {step === 18 && (
        <Spotlight
          selector={'[data-tour="bp-back-dashboard"]'}
          text={`Torna alla dashboard per continuare il tour.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Dashboard.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep18Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* === PARTE 3: TICKET AI E BOLLETTE === */}

      {/* Step 19: Mobile → hamburger / Desktop → "Pronostici" nella navbar */}
      {step === 19 && (
        <Spotlight
          selector={isMobile ? '[data-tour="nav-hamburger"]' : '[data-tour="nav-pronostici"]'}
          text={isMobile
            ? `Ora scopriamo i biglietti pronti.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Apri il menu.</span>`
            : `Ora scopriamo i biglietti pronti.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Pronostici.</span>`
          }
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep19Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 20: Mobile → Ticket AI nel menu / Desktop → Ticket AI nel dropdown */}
      {step === 20 && (
        <Spotlight
          selector={isMobile ? '[data-tour="mob-ticket-ai"]' : '[data-tour="dd-ticket-ai"]'}
          text={`Bollette già pronte da giocare, oppure creane una su misura con l'AI.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Ticket AI.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep20Click}
          padding={2}
          borderRadius={6}
        />
      )}

      {/* Step 21: Spotlight sul banner → poi demo automatica chat */}
      {step === 21 && !step21Auto && (
        <Spotlight
          selector={'[data-tour="ticket-builder-banner"]'}
          text={`Chiedi all'AI di comporre una bolletta su misura per te. Scegli il numero di partite, la quota, il tipo di scommessa — l'AI fa il resto.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca per vedere come funziona.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={() => { setStep21Auto(true); handleStep21Click(); }}
          padding={4}
          borderRadius={16}
        />
      )}

      {/* Step 211: Chiudi la chat (solo desktop) */}
      {step === 211 && (
        <Spotlight
          selector={'[data-tour="ticket-builder-banner"]'}
          text={`Hai visto? L'AI ha creato una bolletta su misura in pochi secondi. Ora chiudi la chat per continuare.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca per chiudere la chat.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep211Click}
          padding={4}
          borderRadius={16}
        />
      )}

      {/* Step 2101: Cerchio verde sul messaggio AI */}
      {step === 2101 && step2101Waiting && (() => {
        const aiBubbles = document.querySelectorAll('.chat-ai-bubble');
        const el = aiBubbles[aiBubbles.length - 1] as HTMLElement | undefined;
        const rect = el?.getBoundingClientRect();
        if (!rect) return null;
        const pad = 6;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'auto' }}>
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', zIndex: 200001, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '12px', border: '3px solid #4caf50', boxShadow: '0 0 20px rgba(76,175,80,0.5)', animation: 'green-circle-pulse 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 200002 }} />
            <div style={{ position: 'fixed', top: Math.max(10, rect.top - 55), left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 200003, pointerEvents: 'auto', animation: 'tour-text-fadein 0.3s ease' }}>
              <div style={{ background: 'rgba(76,175,80,0.9)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, lineHeight: '1.4' }}>L'intelligenza artificiale spiega le motivazioni dietro ogni selezione</span>
                <button onClick={() => { if (step2101DismissRef.current) step2101DismissRef.current(); }} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
            <style>{`@keyframes green-circle-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(76,175,80,0.5); } 50% { box-shadow: 0 0 35px rgba(76,175,80,0.7); } }`}</style>
          </div>
        );
      })()}

      {/* Step 2102: Cerchio verde sulla bolletta */}
      {step === 2102 && step2102Waiting && (() => {
        const el = document.querySelector('.chat-bolletta-card') as HTMLElement | null;
        const rect = el?.getBoundingClientRect();
        if (!rect) return null;
        const pad = 6;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'auto' }}>
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', zIndex: 200001, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '12px', border: '3px solid #4caf50', boxShadow: '0 0 20px rgba(76,175,80,0.5)', animation: 'green-circle-pulse 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 200002 }} />
            <div style={{ position: 'fixed', bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 200003, pointerEvents: 'auto', animation: 'tour-text-fadein 0.3s ease' }}>
              <div style={{ background: 'rgba(76,175,80,0.9)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, lineHeight: '1.4' }}>Questa è la bolletta creata dall'intelligenza artificiale</span>
                <button onClick={() => { if (step2102DismissRef.current) step2102DismissRef.current(); }} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
            <style>{`@keyframes green-circle-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(76,175,80,0.5); } 50% { box-shadow: 0 0 35px rgba(76,175,80,0.7); } }`}</style>
          </div>
        );
      })()}

      {/* Step 212: Cerchio rosso su input puntata (mobile) */}
      {step === 212 && step212Waiting && (() => {
        const el = document.querySelector('.builder-stake-input');
        const rect = el?.getBoundingClientRect();
        if (!rect) return null;
        const pad = 6;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'auto' }}>
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', zIndex: 200001, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '10px', border: '3px solid #ef4444', boxShadow: '0 0 20px rgba(239,68,68,0.5)', animation: 'red-circle-pulse 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 200002 }} />
            <div style={{ position: 'fixed', top: Math.max(10, rect.top - 55), left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 200003, pointerEvents: 'auto', animation: 'tour-text-fadein 0.3s ease' }}>
              <div style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, lineHeight: '1.4' }}>Inserisci qui la tua puntata</span>
                <button onClick={() => { if (step212DismissRef.current) step212DismissRef.current(); }} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
            <style>{`@keyframes red-circle-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 35px rgba(239,68,68,0.7); } }`}</style>
          </div>
        );
      })()}

      {/* Step 213: Spotlight su Salva nelle mie bollette */}
      {step === 213 && (
        <Spotlight
          selector={'.builder-btn-salva'}
          text={`Salva il biglietto tra le tue bollette personali.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Salva.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep213Click}
          padding={4}
          borderRadius={10}
        />
      )}

      {/* Step 214: Cerchio rosso su "Salvata!" */}
      {step === 214 && step214Waiting && (() => {
        // Cerca il div "Salvata!"
        const savedDiv = Array.from(document.querySelectorAll('div')).find(
          d => d.textContent?.includes('✅ Salvata!') && (d.textContent?.length ?? 0) < 20
        ) as HTMLElement | undefined;
        const fallbackEl = document.querySelector('.builder-saved-tag')?.parentElement as HTMLElement | null;
        const rect = savedDiv?.getBoundingClientRect() || fallbackEl?.getBoundingClientRect();
        if (!rect) return null;
        const pad = 6;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'auto' }}>
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', zIndex: 200001, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '10px', border: '3px solid #4caf50', boxShadow: '0 0 20px rgba(76,175,80,0.5)', animation: 'green-circle-pulse 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 200002 }} />
            <div style={{ position: 'fixed', top: Math.max(10, rect.top - 55), left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 200003, pointerEvents: 'auto', animation: 'tour-text-fadein 0.3s ease' }}>
              <div style={{ background: 'rgba(76,175,80,0.9)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, lineHeight: '1.4' }}>La tua bolletta è stata salvata!</span>
                <button onClick={() => { if (step214DismissRef.current) step214DismissRef.current(); }} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
            <style>{`@keyframes green-circle-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(76,175,80,0.5); } 50% { box-shadow: 0 0 35px rgba(76,175,80,0.7); } }`}</style>
          </div>
        );
      })()}

      {/* Step 22: Cerchi rossi sui quadranti */}
      {step === 22 && (
        <RedCircleSequence
          annotations={[
            {
              selector: '[data-tour="ticket-quadrante-oggi"]',
              label: 'Bollette con le partite in programma oggi',
              forceRadius: '16px',
            },
            {
              selector: '[data-tour="ticket-quadrante-selettiva"]',
              label: 'Selettiva — quote basse, bollette più sicure',
              forceRadius: '16px',
            },
            {
              selector: '[data-tour="ticket-quadrante-bilanciata"]',
              label: 'Bilanciata — quote medie, buon equilibrio rischio/rendimento',
              forceRadius: '16px',
            },
            {
              selector: '[data-tour="ticket-quadrante-ambiziosa"]',
              label: 'Ambiziosa — quote alte, potenziale vincita elevata',
              forceRadius: '16px',
            },
          ]}
          onComplete={handleStep22Complete}
        />
      )}

      {/* Step 23: Spotlight su "Le mie bollette" */}
      {step === 23 && (
        <Spotlight
          selector={'[data-tour="ticket-mie-bollette"]'}
          text={`Qui trovi le bollette che hai salvato e quelle personalizzate.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca per continuare.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep23Click}
          padding={4}
          borderRadius={16}
        />
      )}

      {/* Step 231: Cerchio rosso sulla prima bolletta salvata in "Le mie bollette" */}
      {step === 231 && step231Waiting && (() => {
        const el = document.querySelector('[data-tour="mia-prima-bolletta"]') as HTMLElement | null;
        const rect = el?.getBoundingClientRect();
        if (!rect) return null;
        const pad = 6;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'auto' }}>
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', zIndex: 200001, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: '12px', border: '3px solid #4caf50', boxShadow: '0 0 20px rgba(76,175,80,0.5)', animation: 'green-circle-pulse 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 200002 }} />
            <div style={{ position: 'fixed', top: Math.max(10, rect.top - 55), left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', zIndex: 200003, pointerEvents: 'auto', animation: 'tour-text-fadein 0.3s ease' }}>
              <div style={{ background: 'rgba(76,175,80,0.9)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", system-ui, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, lineHeight: '1.4' }}>Ecco la bolletta che hai appena salvato — la trovi sempre qui tra le tue bollette</span>
                <button onClick={() => { if (step231DismissRef.current) step231DismissRef.current(); }} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
              </div>
            </div>
            <style>{`@keyframes green-circle-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(76,175,80,0.5); } 50% { box-shadow: 0 0 35px rgba(76,175,80,0.7); } }`}</style>
          </div>
        );
      })()}

      {/* Step 24: Spotlight sulla navigazione storico */}
      {step === 24 && (
        <Spotlight
          selector={isMobile ? '[data-tour="ticket-storico-nav"]' : '[data-tour="ticket-date-nav-desktop"]'}
          text={`Naviga nello storico giorno per giorno con le frecce, oppure apri il calendario per scegliere una data.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Tocca per continuare.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep24Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 241: Spotlight su "Oggi" per tornare alla giornata corrente */}
      {step === 241 && (
        <Spotlight
          selector={isMobile ? '[data-tour="ticket-btn-oggi"]' : '[data-tour="ticket-btn-oggi-desktop"]'}
          text={`Sei nello storico. Ora torna alla giornata di oggi.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Oggi.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep241Click}
          padding={4}
          borderRadius={20}
        />
      )}

      {/* Step 25: Click su Selettiva per entrare */}
      {step === 25 && (
        <Spotlight
          selector={'[data-tour="ticket-quadrante-selettiva"]'}
          text={`Entriamo nella sezione Selettiva per vedere i biglietti.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su Selettiva.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep25Click}
          padding={4}
          borderRadius={16}
        />
      )}

      {/* Step 26: Cerchi rossi dentro la bolletta (salva, puntata, condividi) */}
      {step === 26 && (
        <RedCircleSequence
          parentSelector='[data-tour="ticket-first-bolletta"]'
          annotations={[
            {
              selector: '.ticket-footer-puntata',
              label: 'Imposta la puntata e visualizza la vincita potenziale',
            },
            {
              selector: '.ticket-btn-salva',
              label: 'Salva il biglietto tra le tue bollette personali',
            },
            {
              selector: '.ticket-btn-condividi',
              label: 'Condividi il biglietto con chi vuoi',
            },
          ]}
          onComplete={handleStep26Complete}
        />
      )}

      {/* Step 261: Esci dalla Selettiva — spotlight su ← */}
      {step === 261 && (
        <Spotlight
          selector={'[data-tour="ticket-vista-back"]'}
          text={`Torna alla vista principale.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su ← per uscire.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep261Click}
          padding={4}
          borderRadius={8}
        />
      )}

      {/* Step 27: Torna alla dashboard */}
      {step === 27 && (
        <Spotlight
          selector={'[data-tour="ticket-back-btn"]'}
          text={`Torna alla dashboard per continuare il tour.<br/><br/><span style="color:${theme.cyan};font-weight:600">👆 Clicca su ← per tornare indietro.</span>`}
          onSkip={skipTour}
          onOpenChapters={handleOpenChapters}
          {...chapterProps}
          onTargetClick={handleStep27Click}
          padding={4}
          borderRadius={8}
        />
      )}
    </>
  );
}
