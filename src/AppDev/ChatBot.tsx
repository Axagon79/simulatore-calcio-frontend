import { useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { ChatMessage, SearchResult } from '../types';

interface ChatBotProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  messages: ChatMessage[];
  onSendMessage: () => void;
  onAnalyzeMatch: () => void;
  onSelectSearchResult: (match: SearchResult) => void;
  chatMatchContext: {
    home: string; away: string; date: string; league: string;
  } | null;
  chatLoading: boolean;
  theme: {
    success: string;
    cyan: string;
    text: string;
    textDim: string;
    panelBorder: string;
  };
  styles: Record<string, CSSProperties>;
  isMobile: boolean;
  bubblePosition: { left: number; bottom: number };
  setBubblePosition: (pos: { left: number; top: number }) => void;
}

export default function ChatBot({
  chatOpen,
  setChatOpen,
  chatInput,
  setChatInput,
  messages,
  onSendMessage,
  onAnalyzeMatch,
  onSelectSearchResult,
  chatMatchContext,
  chatLoading,
  theme,
  styles,
  isMobile,
  bubblePosition,
  setBubblePosition
}: ChatBotProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Drag logic per la bolla ──
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const bubbleStart = useRef({ left: 0, bottom: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const lastTouchEnd = useRef(0); // Anti ghost-click mobile

  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    const dx = point.clientX - dragStart.current.x;
    const dy = point.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved.current = true;
      isDragging.current = true;
      if ('touches' in e) e.preventDefault(); // blocca scroll durante drag
      const newLeft = Math.max(0, Math.min(window.innerWidth - 60, bubbleStart.current.left + dx));
      const newBottom = Math.max(0, Math.min(window.innerHeight - 60, bubbleStart.current.bottom - dy));
      setBubblePosition({ left: newLeft, bottom: newBottom });
    }
  }, [setBubblePosition]);

  const handleDragEnd = useCallback(() => {
    if (!hasMoved.current) {
      // Era un tap → toggle chat
      setChatOpen(!chatOpen);
    }
    isDragging.current = false;
    hasMoved.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [chatOpen, setChatOpen, handleDragMove]);

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Anti ghost-click: ignora mousedown emulato dopo touchend (bug mobile)
    if (!('touches' in e) && Date.now() - lastTouchEnd.current < 500) return;
    const point = 'touches' in e ? e.touches[0] : e.nativeEvent;
    dragStart.current = { x: point.clientX, y: point.clientY };
    bubbleStart.current = { ...bubblePosition };
    isDragging.current = false;
    hasMoved.current = false;
    // Solo per mouse: listener su document (il dito si muove fuori dall'elemento)
    if (!('touches' in e)) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }
  }, [bubblePosition, handleDragMove, handleDragEnd]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inietta keyframes per typing dots (una sola volta)
  useEffect(() => {
    if (document.getElementById('coach-ai-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'coach-ai-keyframes';
    style.textContent = `
      @keyframes coachDot {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const dotStyle = (i: number): CSSProperties => ({
    width: '6px', height: '6px', borderRadius: '50%',
    background: theme.cyan,
    animation: `coachDot 1.4s infinite ${i * 0.2}s`
  });

  const hasAnalysis = messages.some(m => m.sender === 'bot' && !m.isLoading && !m.isError && !m.searchResults && m.text.length > 100);

  return (
    <>
      {/* ── Pannello Chat (fisso bottom-right) ── */}
      {chatOpen && (
        <div style={{ position: 'fixed', bottom: isMobile ? '10px' : '90px', right: '20px', zIndex: 10000,
          ...(isMobile ? { left: '10px', right: '10px' } : {}) }}>
        <div style={{
          ...styles.chatWidget,
          ...(isMobile ? {
            width: 'calc(100vw - 20px)',
            height: 'calc(100vh - 100px)',
            bottom: '10px', right: '10px', left: '10px',
            maxWidth: '100%'
          } : {})
        }}>
          {/* Header con robottino */}
          <div style={styles.chatHeader}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/coach-ai-robot.png" alt="" style={{ height: '32px', width: 'auto' }} />
                <div>
                  <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.3px' }}>Coach AI</span>
                  {chatMatchContext && (
                    <div style={{ fontSize: '11px', color: theme.cyan, opacity: 0.85, marginTop: '1px' }}>
                      {chatMatchContext.home} vs {chatMatchContext.away}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>✕</button>
          </div>

          {/* Messaggi */}
          <div style={styles.chatBody}>
            {messages.map(msg => (
              <div key={msg.id}>
                {/* Messaggio normale */}
                {!msg.searchResults && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                    {/* Etichetta mittente per bot */}
                    {msg.sender === 'bot' && !msg.isLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', paddingLeft: '4px' }}>
                        <img src="/coach-ai-robot.png" alt="" style={{ height: '18px', width: 'auto' }} />
                        <span style={{ fontSize: '11px', color: theme.textDim, fontWeight: 600 }}>Coach AI</span>
                      </div>
                    )}
                    <div style={{
                      ...styles.msgBubble,
                      ...(msg.sender === 'user' ? styles.userMsg : styles.botMsg),
                      ...(msg.isError ? {
                        background: 'rgba(255, 50, 50, 0.15)',
                        border: '1px solid rgba(255, 50, 50, 0.3)',
                        color: '#ff6b6b'
                      } : {})
                    }}>
                      {msg.isLoading ? (
                        <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
                          <span style={dotStyle(0)} />
                          <span style={dotStyle(1)} />
                          <span style={dotStyle(2)} />
                        </div>
                      ) : (
                        <span style={{ whiteSpace: 'pre-wrap', letterSpacing: '0.15px' }}>{msg.text}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Lista risultati ricerca con quadratini */}
                {msg.searchResults && (
                  <div style={{
                    ...styles.botMsg,
                    ...styles.msgBubble,
                    padding: '8px 12px',
                    maxWidth: '95%'
                  }}>
                    <span style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>{msg.text}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {msg.searchResults.map((match, idx) => (
                        <button
                          key={`${match.home}-${match.away}-${idx}`}
                          onClick={() => onSelectSearchResult(match)}
                          disabled={chatLoading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: match.selected
                              ? `linear-gradient(135deg, ${theme.success}15, ${theme.success}25)`
                              : 'rgba(255,255,255,0.05)',
                            border: match.selected
                              ? `1px solid ${theme.success}66`
                              : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            cursor: chatLoading ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Quadratino con spunta */}
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px',
                            border: match.selected
                              ? `2px solid ${theme.success}`
                              : '2px solid rgba(255,255,255,0.3)',
                            background: match.selected ? `${theme.success}22` : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease'
                          }}>
                            {match.selected && (
                              <span style={{ color: theme.success, fontSize: '12px', fontWeight: 700 }}>✓</span>
                            )}
                          </div>
                          {/* Info partita */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>
                              {match.home} vs {match.away}
                            </div>
                            <div style={{ color: theme.textDim, fontSize: '10px', marginTop: '2px' }}>
                              {match.league}{match.date ? ` · ${match.date.split('T')[0]}` : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions contestuali */}
          <div style={{ padding: '8px 10px', display: 'flex', gap: '5px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {chatMatchContext ? (
              // Con partita: azioni contestuali
              <>
                {[
                  { label: 'Analisi completa', action: onAnalyzeMatch, primary: true },
                  ...(hasAnalysis ? [
                    { label: 'Pronostico', action: () => { setChatInput('Qual \u00e8 il pronostico migliore?'); setTimeout(onSendMessage, 100); } },
                    { label: 'Punti deboli', action: () => { setChatInput('Punti deboli?'); setTimeout(onSendMessage, 100); } },
                    { label: 'Value bet?', action: () => { setChatInput('Value bet?'); setTimeout(onSendMessage, 100); } }
                  ] : [])
                ].map((qa) => (
                  <button key={qa.label} onClick={qa.action} disabled={chatLoading} style={{
                    whiteSpace: 'nowrap',
                    background: qa.primary
                      ? `linear-gradient(135deg, ${theme.cyan}22, ${theme.cyan}44)`
                      : 'rgba(255,255,255,0.08)',
                    border: qa.primary ? `1px solid ${theme.cyan}66` : 'none',
                    color: qa.primary ? theme.cyan : theme.textDim,
                    padding: qa.primary ? '6px 12px' : '5px 10px',
                    borderRadius: '15px', fontSize: '11px',
                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                    fontWeight: qa.primary ? 600 : 400,
                    opacity: chatLoading ? 0.5 : 1
                  }}>{qa.label}</button>
                ))}
              </>
            ) : (
              // Senza partita: azioni utili universali
              <>
                {[
                  { label: 'Pronostici di oggi', msg: 'Che pronostici ci sono oggi?' },
                  { label: 'Cosa gioco oggi?', msg: 'Cosa mi consigli di giocare oggi?' }
                ].map(s => (
                  <button key={s.label} onClick={() => {
                    setChatInput(s.msg);
                    setTimeout(onSendMessage, 100);
                  }} disabled={chatLoading} style={{
                    whiteSpace: 'nowrap',
                    background: `linear-gradient(135deg, ${theme.cyan}15, ${theme.cyan}30)`,
                    border: `1px solid ${theme.cyan}44`,
                    color: theme.cyan,
                    padding: '6px 12px', borderRadius: '15px', fontSize: '11px',
                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: chatLoading ? 0.5 : 1
                  }}>{s.label}</button>
                ))}
              </>
            )}
          </div>

          {/* Input — SEMPRE ATTIVO */}
          <div style={{ padding: '10px', display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !chatLoading && onSendMessage()}
              placeholder={chatMatchContext ? 'Chiedi al Coach...' : 'Scrivi il nome di una squadra...'}
              disabled={chatLoading}
              style={{
                flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none',
                opacity: chatLoading ? 0.4 : 1
              }}
            />
            <button
              onClick={onSendMessage}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                opacity: (chatLoading || !chatInput.trim()) ? 0.3 : 1,
                fontSize: '16px'
              }}
            >
              {chatLoading ? '...' : '\u{1F680}'}
            </button>
          </div>
        </div>
        </div>
      )}

      {/* ── Bolla Draggable (SEMPRE visibile) ── */}
      <div
        ref={bubbleRef}
        onTouchStart={handleDragStart}
        onTouchMove={(e) => handleDragMove(e.nativeEvent)}
        onTouchEnd={() => { lastTouchEnd.current = Date.now(); handleDragEnd(); }}
        onMouseDown={handleDragStart}
        style={{
          position: 'fixed',
          left: `${bubblePosition.left}px`,
          bottom: `${bubblePosition.bottom}px`,
          zIndex: 10001,
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: chatOpen ? `linear-gradient(135deg, ${theme.cyan}, ${theme.success})` : theme.cyan,
          border: 'none',
          boxShadow: `0 0 20px ${theme.cyan}`,
          cursor: isDragging.current ? 'grabbing' : 'pointer',
          fontSize: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s ease'
        }}>
          <img src="/coach-ai-robot.png" alt="Coach AI" style={{ height: '42px', width: 'auto', pointerEvents: 'none' }} />
        </div>
      </div>
    </>
  );
}
