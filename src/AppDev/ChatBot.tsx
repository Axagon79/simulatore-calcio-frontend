import { useRef, useEffect } from 'react';
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
  isMobile
}: ChatBotProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 100 }}>

      {/* Chat Window */}
      {chatOpen && (
        <div style={{
          ...styles.chatWidget,
          ...(isMobile ? {
            width: 'calc(100vw - 20px)',
            height: 'calc(100vh - 100px)',
            bottom: '10px', right: '10px', left: '10px',
            maxWidth: '100%'
          } : {})
        }}>
          {/* Header con indicatore partita */}
          <div style={styles.chatHeader}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: chatMatchContext ? theme.success : theme.textDim
                }} />
                <span style={{ fontWeight: 700, fontSize: '14px' }}>AI Simulator Coach</span>
              </div>
              {chatMatchContext && (
                <span style={{
                  fontSize: '11px', color: theme.cyan, paddingLeft: '16px',
                  opacity: 0.8
                }}>
                  {chatMatchContext.home} vs {chatMatchContext.away}
                </span>
              )}
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>

          {/* Messaggi */}
          <div style={styles.chatBody}>
            {messages.map(msg => (
              <div key={msg.id}>
                {/* Messaggio normale */}
                {!msg.searchResults && (
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
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                    )}
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
              <>
                <button
                  onClick={onAnalyzeMatch}
                  disabled={chatLoading}
                  style={{
                    whiteSpace: 'nowrap',
                    background: `linear-gradient(135deg, ${theme.cyan}22, ${theme.cyan}44)`,
                    border: `1px solid ${theme.cyan}66`,
                    color: theme.cyan,
                    padding: '6px 12px', borderRadius: '15px', fontSize: '11px',
                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: chatLoading ? 0.5 : 1
                  }}
                >
                  Analizza partita
                </button>
                {hasAnalysis && ['Punti deboli?', 'Value bet?', 'Rischio combo?'].map(qa => (
                  <button key={qa} onClick={() => {
                    setChatInput(qa);
                    setTimeout(onSendMessage, 100);
                  }} disabled={chatLoading} style={{
                    whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.08)',
                    border: 'none', color: theme.textDim,
                    padding: '5px 10px', borderRadius: '15px', fontSize: '11px',
                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                    opacity: chatLoading ? 0.5 : 1
                  }}>{qa}</button>
                ))}
              </>
            ) : (
              // Senza partita: suggerimenti ricerca
              <>
                <span style={{ fontSize: '11px', color: theme.textDim, padding: '4px 0', width: '100%' }}>
                  Cerca una partita:
                </span>
                {['Milan', 'Juventus', 'Inter', 'Real Madrid'].map(s => (
                  <button key={s} onClick={() => {
                    setChatInput(s);
                    setTimeout(onSendMessage, 100);
                  }} disabled={chatLoading} style={{
                    whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.08)',
                    border: 'none', color: theme.textDim,
                    padding: '5px 10px', borderRadius: '15px', fontSize: '11px',
                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                    opacity: chatLoading ? 0.5 : 1
                  }}>{s}</button>
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
      )}

      {/* Toggle Button (Galleggiante) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            width: '60px', height: '60px', borderRadius: '50%', background: theme.cyan, border: 'none',
            boxShadow: `0 0 20px ${theme.cyan}`, cursor: 'pointer', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px'
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}
