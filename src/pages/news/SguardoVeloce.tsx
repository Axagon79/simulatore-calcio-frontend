import React, { useState } from 'react';

interface SguardoVeloceProps {
  home: string;
  away: string;
  league: string;
  date: string;
  onClose: () => void;
}

type TabKey = 'classifica' | 'h2h' | 'radar';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'classifica', label: 'Classifica' },
  { key: 'h2h', label: 'Testa a testa' },
  { key: 'radar', label: 'Radar squadre' },
];

const SguardoVeloce: React.FC<SguardoVeloceProps> = ({ home, away, league, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('classifica');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
          maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto',
          padding: '28px 28px 24px', color: 'var(--t)', fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header: titolo + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 6 }}>Sguardo veloce</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{home} – {away}</h2>
            {league && <div style={{ fontSize: 12, color: 'var(--t-dim)', marginTop: 4 }}>{league}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--t-faint)', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}
            aria-label="Chiudi"
          >×</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 20,
        }}>
          {TABS.map(t => {
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                  color: isActive ? 'var(--t)' : 'var(--t-dim)',
                  padding: '10px 18px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  marginBottom: -1,
                  transition: 'color .15s, border-color .15s',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Contenuto tab (placeholder, da popolare in seguito) */}
        <div style={{ minHeight: 240 }}>
          {activeTab === 'classifica' && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Contenuto Classifica — da definire
            </div>
          )}
          {activeTab === 'h2h' && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Contenuto Testa a testa — da definire
            </div>
          )}
          {activeTab === 'radar' && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Contenuto Radar — da definire
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SguardoVeloce;
