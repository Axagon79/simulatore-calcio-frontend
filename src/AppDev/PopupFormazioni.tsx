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

  const handleBackdropClick = () => {
    setPopupOpacity(0);
    setTimeout(() => onClose(), 50);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: popupOpacity,
        transition: 'opacity 2s ease'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: `1px solid ${theme.cyan}`,
          boxShadow: `0 0 30px rgba(0,240,255,0.3)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: `1px solid rgba(255,255,255,0.1)`
        }}>
          <h2 style={{ color: theme.text, margin: 0, fontSize: '20px' }}>
            📋 FORMAZIONI UFFICIALI
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.text,
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Formazioni */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          {/* CASA */}
          <div>
            <div style={{
              color: theme.cyan,
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              textShadow: `0 0 8px ${theme.cyan}`
            }}>
              🏠 {formations.home_team} ({normalizeModulo(formations.home_formation?.modulo || '4-3-3')})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formations.home_formation?.titolari?.map((player, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(0,240,255,0.1)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${theme.cyan}`
                }}>
                  <span style={{
                    color: theme.cyan,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    minWidth: '32px'
                  }}>
                    {player.role}
                  </span>
                  <span style={{ color: theme.text, fontSize: '13px' }}>
                    {player.player}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* OSPITE */}
          <div>
            <div style={{
              color: theme.danger,
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              textShadow: `0 0 8px ${theme.danger}`
            }}>
              ✈️ {formations.away_team} ({normalizeModulo(formations.away_formation?.modulo || '4-3-3')})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formations.away_formation?.titolari?.map((player, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(255,107,107,0.1)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${theme.danger}`
                }}>
                  <span style={{
                    color: theme.danger,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    minWidth: '32px'
                  }}>
                    {player.role}
                  </span>
                  <span style={{ color: theme.text, fontSize: '13px' }}>
                    {player.player}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
