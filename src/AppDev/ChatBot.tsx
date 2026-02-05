import { useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatBotProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  messages: ChatMessage[];
  onSendMessage: () => void;
  theme: {
    success: string;
    cyan: string;
    text: string;
    textDim: string;
    panelBorder: string;
  };
  styles: Record<string, CSSProperties>;
}

export default function ChatBot({
  chatOpen,
  setChatOpen,
  chatInput,
  setChatInput,
  messages,
  onSendMessage,
  theme,
  styles
}: ChatBotProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 100 }}>

      {/* Chat Window */}
      {chatOpen && (
        <div style={styles.chatWidget}>
          <div style={styles.chatHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.success }}></div>
              Football AI Coach
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>

          <div style={styles.chatBody}>
            {messages.map(msg => (
              <div key={msg.id} style={{ ...styles.msgBubble, ...(msg.sender === 'user' ? styles.userMsg : styles.botMsg) }}>
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '10px', display: 'flex', gap: '5px', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {['Perché Over?', 'Analisi Rischio', 'Consiglio'].map(qa => (
              <button key={qa} onClick={() => { setChatInput(qa); setTimeout(onSendMessage, 100); }} style={{
                whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.1)', border: 'none', color: theme.textDim,
                padding: '5px 10px', borderRadius: '15px', fontSize: '11px', cursor: 'pointer'
              }}>{qa}</button>
            ))}
          </div>

          <div style={{ padding: '10px', display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSendMessage()}
              placeholder="Chiedi al coach..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
            />
            <button onClick={onSendMessage} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🚀</button>
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
