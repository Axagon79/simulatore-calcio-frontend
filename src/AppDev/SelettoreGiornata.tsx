interface RoundInfo {
  name: string;
  label: string;
  type: 'previous' | 'current' | 'next';
}

interface SelettoreGiornataProps {
  rounds: RoundInfo[];
  selectedRound: RoundInfo | null;
  setSelectedRound: (round: RoundInfo) => void;
  hoveredRound: string | null;
  setHoveredRound: (round: string | null) => void;
  isMobile: boolean;
  selectedCup: string;
}

export default function SelettoreGiornata({
  rounds,
  selectedRound,
  setSelectedRound,
  hoveredRound,
  setHoveredRound,
  isMobile,
  selectedCup
}: SelettoreGiornataProps) {

  // Non mostrare se c'è una coppa selezionata
  if (selectedCup) return null;

  return (
    <div
      key={rounds[0]?.name}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px',
        marginTop: '10px',
        gap: isMobile ? '8px' : '80px',
        width: '100%',
      }}>
      {rounds.map(r => {
        const roundNumber = r.name.replace(/[^0-9]/g, '');
        let displayText = `Giornata ${roundNumber}`;
        if (r.type === 'previous') displayText = `< Giornata ${roundNumber}`;
        if (r.type === 'next') displayText = `Giornata ${roundNumber} >`;

        const isSelected = selectedRound?.name === r.name;
        const isHovered = hoveredRound === r.name;

        return (
          <button
            key={r.name}
            onClick={() => {
              setSelectedRound(r);

              if (r.type === 'current') {
                window.history.replaceState(null, '', '#list');
              } else {
                window.history.pushState(null, '', `#round-${r.name.replace(/\s/g, '')}`);
              }
            }}
            onMouseEnter={() => setHoveredRound(r.name)}
            onMouseLeave={() => setHoveredRound(null)}
            style={{
              width: isMobile ? 'auto' : '185px',
              minWidth: isMobile ? '90px' : '185px',
              height: isMobile ? '32px' : '38px',
              padding: isMobile ? '0 12px' : '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isSelected
                ? 'rgb(0, 240, 255)'
                : 'rgba(18, 20, 35, 0.9)',
              borderRadius: '20px',
              border: isSelected
                ? 'none'
                : `1px solid ${isHovered ? 'rgb(0, 240, 255)' : 'rgba(0, 240, 255, 0.3)'}`,
              cursor: 'pointer',
              fontWeight: '900',
              fontSize: isMobile ? '11px' : '15px',
              color: isSelected ? 'rgb(0, 0, 0)' : 'rgb(0, 240, 255)',
              boxShadow: isSelected
                ? '0 0 15px rgba(0, 240, 255, 0.6)'
                : (isHovered ? '0 0 10px rgba(0, 240, 255, 0.4)' : 'none'),
              transition: 'all 0.3s ease',
              outline: 'none',
              transform: isHovered ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {displayText}
          </button>
        );
      })}
    </div>
  );
}
