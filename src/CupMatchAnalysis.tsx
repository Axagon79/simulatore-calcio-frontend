import { useState } from 'react';
import CupAnimatedField from './CupAnimatedField';

// Tema coppe
const cupTheme = {
  UCL: {
    primary: '#003399',
    secondary: '#FFD700',
    accent: '#0066CC',
    glow: 'rgba(255, 215, 0, 0.4)',
    name: 'UEFA Champions League',
    icon: '⭐'
  },
  UEL: {
    primary: '#FF6600',
    secondary: '#CC5200',
    accent: '#FF8C00',
    glow: 'rgba(255, 102, 0, 0.4)',
    name: 'UEFA Europa League',
    icon: '🌟'
  }
};

const baseBg = '#05070a';
const textDim = '#8b9bb4';

interface CupMatchAnalysisProps {
  cupId: 'UCL' | 'UEL';
  match: any;
  onBack: () => void;
  onSimulate: (config: { algoId: number; cycles: number; animated: boolean; result?: any }) => void;
}

export default function CupMatchAnalysis({ cupId, match, onBack, onSimulate }: CupMatchAnalysisProps) {
  const theme = cupTheme[cupId];
  const [isMobile] = useState(window.innerWidth < 768);
  
  // Impostazioni simulazione
  const [selectedAlgo, setSelectedAlgo] = useState(5);
  const [cycles, setCycles] = useState(100);
  const [isAnimated, setIsAnimated] = useState(true);

  const [showAnimation, setShowAnimation] = useState(false);

  const formatOdds = (val: any): string => {
    if (val === undefined || val === null) return '-';
    const num = Number(val);
    return isNaN(num) ? '-' : num.toFixed(2);
  };

  const handleSimulate = () => {
    if (isAnimated) {
      setShowAnimation(true);
    } else {
      onSimulate({
        algoId: selectedAlgo,
        cycles,
        animated: false
      });
    }
  };

  // Se showAnimation è true, mostra l'animazione
  if (showAnimation) {
    return (
      <CupAnimatedField
        cupId={cupId}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        selectedMatch={match}
        onComplete={(result) => {
          console.log('Simulazione completata:', result); // ← ORA viene usato
          setShowAnimation(false);
          onSimulate({
            algoId: selectedAlgo,
            cycles,
            animated: true,
            result  // ← Passa il result a onSimulate
          });
        }}
        config={{
          algoId: selectedAlgo,
          cycles
        }}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed' as const,
      top: '60px',
      left: isMobile ? 0 : '322px',
      right: 0,
      bottom: 0,
      backgroundColor: baseBg,
      backgroundImage: `radial-gradient(circle at 50% 0%, ${theme.primary}20, ${baseBg} 70%)`,
      overflowY: 'auto',
      padding: '20px',
      boxSizing: 'border-box' as const
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
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
              justifyContent: 'center',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primary;
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.secondary;
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{
              fontSize: isMobile ? '20px' : '28px',
              fontWeight: '900',
              color: 'white',
              margin: 0,
              textShadow: `0 0 30px ${theme.glow}`
            }}>
              {theme.icon} Analisi Pre-Match
            </h1>
            <p style={{
              fontSize: '12px',
              color: textDim,
              margin: '5px 0 0 0'
            }}>
              {theme.name}
            </p>
          </div>
        </div>

        {/* GRID LAYOUT: INFO + PANNELLO */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '20px'
        }}>
          
          {/* COLONNA SINISTRA: INFO PARTITA */}
          <div>
            {/* CARD PARTITA */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px',
              padding: '20px',
              border: `1px solid ${theme.primary}30`,
              marginBottom: '20px'
            }}>
              {/* DATA */}
              <div style={{
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'inline-block',
                  background: `${theme.primary}20`,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.primary}40`,
                  fontSize: '12px',
                  color: theme.secondary,
                  fontWeight: 'bold'
                }}>
                  📅 {match.match_date}
                </div>
              </div>

              {/* SQUADRE */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  {match.home_team}
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '16px',
                  color: textDim,
                  fontWeight: 'bold'
                }}>
                  VS
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  {match.away_team}
                </div>
              </div>

              {/* QUOTE */}
              {match.odds && (
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: textDim,
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    textAlign: 'center'
                  }}>
                    QUOTE
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '10px'
                  }}>
                    {[
                      { label: '1', value: match.odds.home },
                      { label: 'X', value: match.odds.draw },
                      { label: '2', value: match.odds.away }
                    ].map(odd => (
                      <div
                        key={odd.label}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <span style={{
                          fontSize: '10px',
                          color: textDim,
                          fontWeight: 'bold',
                          marginBottom: '4px'
                        }}>
                          {odd.label}
                        </span>
                        <span style={{
                          fontSize: '18px',
                          color: 'white',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          {formatOdds(odd.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CARD RATING (se disponibile) */}
            {match.ratings && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '20px',
                padding: '20px',
                border: `1px solid ${theme.primary}30`
              }}>
                <div style={{
                  fontSize: '14px',
                  color: textDim,
                  fontWeight: 'bold',
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  ⭐ RATING SQUADRE
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '900',
                      color: theme.primary
                    }}>
                      {match.ratings?.rating_home?.toFixed(1) || 'N/A'}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: textDim,
                      marginTop: '5px'
                    }}>
                      {match.home_team}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '24px',
                    color: textDim
                  }}>
                    vs
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '900',
                      color: theme.secondary
                    }}>
                      {match.ratings?.rating_away?.toFixed(1) || 'N/A'}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: textDim,
                      marginTop: '5px'
                    }}>
                      {match.away_team}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLONNA DESTRA: PANNELLO SIMULAZIONE */}
          <div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px',
              padding: '25px',
              border: `1px solid ${theme.primary}30`,
              position: 'sticky',
              top: '20px'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                ⚙️ Configurazione Simulazione
              </div>

              {/* SELEZIONE ALGORITMO */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: textDim,
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  ALGORITMO AI
                </label>
                <select
                  value={selectedAlgo}
                  onChange={(e) => setSelectedAlgo(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#111',
                    color: 'white',
                    border: `1px solid ${theme.primary}40`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value={2}>ALGO 2: DINAMICO</option>
                  <option value={3}>ALGO 3: TATTICO</option>
                  <option value={4}>ALGO 4: CAOS</option>
                  <option value={5}>ALGO 5: MASTER AI</option>
                  <option value={6}>ALGO 6: MONTE CARLO</option>
                </select>
              </div>

              {/* INPUT CICLI */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontSize: '12px',
                    color: textDim,
                    fontWeight: 'bold'
                  }}>
                    CICLI SIMULAZIONE
                  </label>
                  <span style={{
                    fontSize: '14px',
                    color: theme.secondary,
                    fontWeight: 'bold'
                  }}>
                    {cycles}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={cycles}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setCycles(val);
                    }
                  }}
                  style={{
                    width: '95%',
                    padding: '12px',
                    background: '#111',
                    color: theme.secondary,
                    border: `1px solid ${theme.primary}40`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>

              {/* TOGGLE ANIMAZIONE */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: textDim,
                  fontWeight: 'bold',
                  marginBottom: '12px'
                }}>
                  MODALITÀ VISUALIZZAZIONE
                </label>
                <div style={{
                  display: 'flex',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setIsAnimated(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: !isAnimated ? theme.primary : '#111',
                      color: !isAnimated ? 'white' : textDim,
                      border: `1px solid ${!isAnimated ? theme.primary : '#333'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    🧮 SOLO RISULTATO
                  </button>
                  <button
                    onClick={() => setIsAnimated(true)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: isAnimated ? theme.primary : '#111',
                      color: isAnimated ? 'white' : textDim,
                      border: `1px solid ${isAnimated ? theme.primary : '#333'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    🎬 ANIMATA
                  </button>
                </div>
              </div>

              {/* BOTTONE SIMULA */}
              <button
                onClick={handleSimulate}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: `0 0 20px ${theme.glow}`,
                  transition: 'all 0.3s',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 0 30px ${theme.glow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 0 20px ${theme.glow}`;
                }}
              >
                {theme.icon} SIMULA PARTITA
              </button>

              {/* INFO FOOTER */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                fontSize: '11px',
                color: textDim,
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                <div style={{ marginBottom: '5px' }}>
                  ⚡ Algoritmo: <span style={{ color: theme.secondary }}>AI-{selectedAlgo}</span>
                </div>
                <div>
                  🎯 Modalità: <span style={{ color: theme.secondary }}>{isAnimated ? 'Animazione Live' : 'Risultato Rapido'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}