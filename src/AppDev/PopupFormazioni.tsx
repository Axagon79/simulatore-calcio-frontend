import { getThemeMode } from './costanti';

// Mappa per normalizzare i moduli
const FORMATION_MAPPING: {[key: string]: string} = {
  "3-4-2-1": "3-4-3",
  "4-2-2-2": "4-4-2",
  "4-2-3-1": "4-5-1",
  "4-3-1-2": "4-3-3",
};

const normalizeModulo = (modulo: string): string => {
  return FORMATION_MAPPING[modulo] || modulo;
};

interface Player {
  role: string;
  player: string;
}

interface Formation {
  modulo?: string;
  titolari?: Player[];
}

interface FormationsData {
  home_team: string;
  away_team: string;
  home_formation?: Formation;
  away_formation?: Formation;
}

interface PopupFormazioniProps {
  show: boolean;
  formations: FormationsData | null;
  popupOpacity: number;
  onClose: () => void;
  setPopupOpacity: (opacity: number) => void;
  theme: {
    cyan: string;
    danger: string;
    text: string;
  };
}

export default function PopupFormazioni({
  show,
  formations,
  popupOpacity,
  onClose,
  setPopupOpacity,
  theme
}: PopupFormazioniProps) {

  if (!show || !formations) return null;

  const isLight = getThemeMode() === 'light';

  const handleBackdropClick = () => {
    setPopupOpacity(0);
    setTimeout(() => onClose(), 50);
  };

  // Palette
  const c = {
    backdrop: isLight ? 'rgba(15,23,42,0.5)' : 'rgba(0,0,0,0.75)',
    cardBg: isLight ? '#ffffff' : '#0f172a',
    cardBorder: isLight ? '#e2e8f0' : '#1e293b',
    divider: isLight ? '#e2e8f0' : '#1e293b',
    titleText: isLight ? '#0f172a' : '#f1f5f9',
    subtleText: isLight ? '#64748b' : '#94a3b8',
    rowBgHome: isLight ? '#f0f9ff' : '#0c1f2e',
    rowBgAway: isLight ? '#fef2f2' : '#2e1414',
    rowBorderHome: theme.cyan,
    rowBorderAway: theme.danger,
    roleText: isLight ? '#0e7490' : theme.cyan,
    roleTextAway: isLight ? '#b91c1c' : theme.danger,
    playerText: isLight ? '#1e293b' : '#e2e8f0',
  };

  // Numero massimo di righe per allineare le due colonne in altezza
  const homeCount = formations.home_formation?.titolari?.length || 0;
  const awayCount = formations.away_formation?.titolari?.length || 0;
  const maxRows = Math.max(homeCount, awayCount);

  const renderTeam = (
    isHome: boolean,
    teamName: string,
    formation: Formation | undefined
  ) => {
    const titolari = formation?.titolari || [];
    const rowBg = isHome ? c.rowBgHome : c.rowBgAway;
    const borderColor = isHome ? c.rowBorderHome : c.rowBorderAway;
    const accentText = isHome ? c.roleText : c.roleTextAway;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header squadra */}
        <div style={{
          color: accentText,
          fontSize: '14px',
          fontWeight: 700,
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          <span>{isHome ? 'CASA' : 'TRASFERTA'}</span>
          <span style={{ color: c.subtleText, fontSize: '11px', fontWeight: 600 }}>
            ({normalizeModulo(formation?.modulo || '4-3-3')})
          </span>
        </div>

        {/* Nome squadra */}
        <div style={{
          color: c.titleText,
          fontSize: '15px',
          fontWeight: 700,
          marginBottom: '10px',
          wordBreak: 'break-word'
        }}>
          {teamName}
        </div>

        {/* Lista titolari */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {Array.from({ length: maxRows }).map((_, idx) => {
            const player = titolari[idx];
            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: player ? rowBg : 'transparent',
                borderRadius: '6px',
                borderLeft: player ? `3px solid ${borderColor}` : '3px solid transparent',
                minHeight: '30px',
                minWidth: 0
              }}>
                <span style={{
                  color: accentText,
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '36px',
                  flexShrink: 0,
                  textAlign: 'center',
                  letterSpacing: '0.03em'
                }}>
                  {player?.role || ''}
                </span>
                <span style={{
                  color: c.playerText,
                  fontSize: '13px',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {player?.player || ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: c.backdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: popupOpacity,
        transition: 'opacity 2s ease',
        padding: '16px'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: c.cardBg,
          borderRadius: '16px',
          padding: '20px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          border: `1px solid ${c.cardBorder}`,
          boxShadow: isLight
            ? '0 10px 40px rgba(15,23,42,0.15)'
            : '0 10px 40px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: `1px solid ${c.divider}`
        }}>
          <h2 style={{
            color: c.titleText,
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Formazioni Ufficiali
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: c.subtleText,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1
            }}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Formazioni — responsive grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          alignItems: 'stretch'
        }}>
          {renderTeam(true, formations.home_team, formations.home_formation)}
          {renderTeam(false, formations.away_team, formations.away_formation)}
        </div>
      </div>
    </div>
  );
}
