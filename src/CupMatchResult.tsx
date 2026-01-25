

const cupTheme = {
  UCL: {
    primary: '#003399',
    secondary: '#FFD700',
    name: 'UEFA Champions League',
    icon: '⭐'
  },
  UEL: {
    primary: '#FF6600',
    secondary: '#CC5200',
    name: 'UEFA Europa League',
    icon: '🌟'
  }
};

interface CupMatchResultProps {
  cupId: 'UCL' | 'UEL';
  result: any;
  onBack: () => void;
}

export default function CupMatchResult({ cupId, result, onBack }: CupMatchResultProps) {
  const theme = cupTheme[cupId];
  const isMobile = window.innerWidth < 768;

  // Estrai dati
  const homeTeam = result.match_info?.home_team || 'Casa';
  const awayTeam = result.match_info?.away_team || 'Ospite';
  const [homeScore, awayScore] = result.predicted_score?.split('-').map(Number) || [0, 0];
  
  // Statistiche
  const stats = result.statistiche || {};
  const getStatValue = (key: string, index: number) => {
    const stat = stats[key];
    return stat && stat[index] !== undefined ? stat[index] : 0;
  };

  // Eventi chiave (gol, cartellini, rosso, VAR)
const eventi = (result.cronaca || []).filter((e: any) => 
    e.tipo === 'gol' || e.tipo === 'cartellino' || e.tipo === 'rosso' || e.tipo === 'var'
  );


  const renderStatBar = (label: string, homeVal: any, awayVal: any) => {
    let homeNum = typeof homeVal === 'string' ? parseFloat(homeVal) : homeVal;
    let awayNum = typeof awayVal === 'string' ? parseFloat(awayVal) : awayVal;
    
    if (isNaN(homeNum)) homeNum = 0;
    if (isNaN(awayNum)) awayNum = 0;
  
    // Calcoliamo il totale per determinare la proporzione (ratio)
    const total = homeNum + awayNum;
    
    // Se entrambi sono 0, facciamo una divisione 50/50 neutra
    // Altrimenti calcoliamo la percentuale del valore Home rispetto al totale
    const homePercent = total === 0 ? 50 : (homeNum / total) * 100;
  
    return (
      <div style={{ marginBottom: '20px' }}>
        {/* Titolo della statistica */}
        <div style={{
          fontSize: '11px',
          color: '#8b9bb4',
          marginBottom: '8px',
          textAlign: 'center',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {label}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          {/* Numero Home */}
          <div style={{
            minWidth: '30px',
            textAlign: 'right',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            {homeNum}
          </div>
          
          {/* Barra Unica con Gradiente dinamico */}
          <div style={{
            flex: 1,
            height: '14px',
            borderRadius: '7px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.1)', // Sfondo della barra (parte vuota se volessi usarla)
            position: 'relative'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              // Il trucco: il gradiente cambia il punto di transizione in base a homePercent
              // Usiamo un range di sfumatura (es. +/- 10%) per rendere il passaggio morbido
              background: `linear-gradient(90deg, 
                ${theme.primary} 0%, 
                ${theme.primary} ${homePercent - 10}%, 
                ${theme.secondary} ${homePercent + 10}%, 
                ${theme.secondary} 100%
              )`,
              transition: 'background 0.5s ease-in-out'
            }} />
          </div>
          
          {/* Numero Away */}
          <div style={{
            minWidth: '30px',
            textAlign: 'left',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            {awayNum}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#05070a',
      backgroundImage: `radial-gradient(circle at 50% 0%, ${theme.primary}20, #05070a 70%)`,
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: `2px solid ${theme.primary}`,
              color: theme.secondary,
              fontSize: '24px',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ←
          </button>
          <h1 style={{
            fontSize: isMobile ? '18px' : '24px',
            fontWeight: '900',
            color: 'white',
            margin: 0
          }}>
            {theme.icon} RISULTATO FINALE
          </h1>
        </div>

        {/* RISULTATO CENTRALE */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '20px',
          padding: isMobile ? '30px 15px' : '40px',
          marginBottom: '30px',
          border: `1px solid ${theme.primary}20`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '15px' : '30px'
          }}>
            {/* HOME */}
            <div style={{
              flex: 1,
              textAlign: 'right'
            }}>
              <div style={{
                fontSize: isMobile ? '16px' : '24px',
                fontWeight: '900',
                color: 'white',
                marginBottom: '10px'
              }}>
                {homeTeam}
              </div>
            </div>

            {/* SCORE */}
            <div style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              padding: isMobile ? '15px 25px' : '20px 40px',
              borderRadius: '15px',
              minWidth: isMobile ? '100px' : '140px',
              textAlign: 'center',
              boxShadow: `0 0 30px ${theme.primary}50`
            }}>
              <div style={{
                fontSize: isMobile ? '36px' : '48px',
                fontWeight: '900',
                color: 'white',
                fontFamily: 'monospace'
              }}>
                {homeScore} - {awayScore}
              </div>
            </div>

            {/* AWAY */}
            <div style={{
              flex: 1,
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: isMobile ? '16px' : '24px',
                fontWeight: '900',
                color: 'white',
                marginBottom: '10px'
              }}>
                {awayTeam}
              </div>
            </div>
          </div>
        </div>

        {/* STATISTICHE */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '20px',
          padding: isMobile ? '20px' : '30px',
          marginBottom: '20px',
          border: `1px solid ${theme.primary}20`
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '800',
            color: 'white',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            📊 STATISTICHE
          </h2>

          {renderStatBar('Possesso Palla', getStatValue('Possesso Palla', 0), getStatValue('Possesso Palla', 1))}
          {renderStatBar('Tiri Totali', getStatValue('Tiri Totali', 0), getStatValue('Tiri Totali', 1))}
          {renderStatBar('Tiri in Porta', getStatValue('Tiri in Porta', 0), getStatValue('Tiri in Porta', 1))}
          {renderStatBar('Calci d\'Angolo', getStatValue('Calci d\'Angolo', 0), getStatValue('Calci d\'Angolo', 1))}
        </div>

        {/* EVENTI CHIAVE */}
        {eventi.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '20px',
            padding: isMobile ? '20px' : '30px',
            marginBottom: '20px',
            border: `1px solid ${theme.primary}20`
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '800',
              color: 'white',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              ⚡ EVENTI CHIAVE
            </h2>

            {eventi.map((evento: any, idx: number) => {
                // Determina il colore in base al tipo
                let borderColor = '#4ade80'; // Verde per gol
                if (evento.tipo === 'cartellino') borderColor = '#fbbf24'; // Giallo
                if (evento.tipo === 'rosso') borderColor = '#ef4444'; // Rosso
                if (evento.tipo === 'var') borderColor = '#8b5cf6'; // Viola per VAR

              return (
                <div key={idx} style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${borderColor}`,
                  fontSize: '13px',
                  color: 'white'
                }}>
                  {evento.testo}
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTONE TORNA */}
        <button
          onClick={onBack}
          style={{
            width: '100%',
            padding: '18px',
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '900',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          ← TORNA ALLA LISTA
        </button>
      </div>
    </div>
  );
}