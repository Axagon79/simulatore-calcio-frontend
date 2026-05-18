import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  tabActiveBg: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)',
  tabActiveBorder: isLight ? '#111827' : 'rgba(255,255,255,0.9)',
  tabInactiveText: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
  tabActiveText: isLight ? '#111827' : 'rgba(255,255,255,0.95)',
};

interface NewsProps {
  onBack: () => void;
}

type TabKey = 'today' | 'tomorrow' | 'after';

function formatDateLabel(d: Date): string {
  const giorno = d.getDate();
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${giorno} ${mesi[d.getMonth()]}`;
}

const VALID_TABS: TabKey[] = ['today', 'tomorrow', 'after'];

export default function News({ onBack }: NewsProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Init tab da query param ?tab=today|tomorrow|after, default 'today'.
  const initialTab: TabKey = (() => {
    const t = searchParams.get('tab');
    return t && (VALID_TABS as string[]).includes(t) ? (t as TabKey) : 'today';
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Aggiorna la URL quando l'utente cambia tab cliccando, senza ricaricare.
  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Calcolo delle tre date (oggi, domani, dopodomani) in locale browser.
  const dates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const after = new Date(today);
    after.setDate(today.getDate() + 2);
    return { today, tomorrow, after };
  }, []);

  const tabs: Array<{ key: TabKey; label: string; subLabel: string }> = [
    { key: 'today', label: 'Oggi', subLabel: formatDateLabel(dates.today) },
    { key: 'tomorrow', label: 'Domani', subLabel: formatDateLabel(dates.tomorrow) },
    { key: 'after', label: 'Dopodomani', subLabel: formatDateLabel(dates.after) },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: c.bg,
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      color: c.text,
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${c.cardBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: c.textDim,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >← Indietro</button>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}>News</h1>
      </header>

      {/* Contenuto */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        {/* Titolo editoriale */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: c.text,
          }}>La Redazione di AI Simulator</h2>
        </div>

        {/* Tab navigation: Oggi / Domani / Dopodomani */}
        <div style={{
          display: 'flex',
          gap: '4px',
          borderBottom: `1px solid ${c.cardBorder}`,
          marginBottom: '32px',
          overflowX: 'auto',
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: isActive ? c.tabActiveBg : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? c.tabActiveBorder : 'transparent'}`,
                  padding: '12px 20px',
                  cursor: 'pointer',
                  color: isActive ? c.tabActiveText : c.tabInactiveText,
                  fontSize: '15px',
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  minWidth: '110px',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: c.textMuted,
                  letterSpacing: '0.02em',
                }}>{tab.subLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Se la URL ha home+away+date -> stiamo aprendo la pagina news della
            singola partita (link dal robottino "News" in Match Day). Mostro un
            placeholder con i nomi squadra; il rendering articolo arrivera' nel
            prossimo passo. */}
        {searchParams.get('home') && searchParams.get('away') && searchParams.get('date') ? (
          <div style={{
            background: c.card,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: '8px',
            padding: '32px',
            color: c.textDim,
            fontSize: '14px',
          }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: c.textMuted, marginBottom: '8px' }}>
              Articolo partita
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: c.text, marginBottom: '4px' }}>
              {searchParams.get('home')} vs {searchParams.get('away')}
            </div>
            <div style={{ fontSize: '13px', color: c.textDim, marginBottom: '24px' }}>
              {searchParams.get('date')}
            </div>
            <div style={{ borderTop: `1px solid ${c.cardBorder}`, paddingTop: '20px' }}>
              Articolo Scout in costruzione.
            </div>
          </div>
        ) : (
          <div style={{
            background: c.card,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            color: c.textDim,
            fontSize: '14px',
          }}>
            Contenuto tab "{tabs.find(t => t.key === activeTab)?.label}" in costruzione.
          </div>
        )}
      </main>
    </div>
  );
}
