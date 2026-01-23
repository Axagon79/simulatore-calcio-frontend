import { useState, useEffect } from 'react';
import CupMatchAnalysis from './CupMatchAnalysis';

// --- TEMA COPPE EUROPEE ---
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

interface CupMatchesProps {
  cupId: 'UCL' | 'UEL';
  onBack: () => void;
}

interface Match {
  id?: string;
  home_team: string;
  away_team: string;
  match_date: string;
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
  status?: string;
  result?: {
    home_score: number;
    away_score: number;
  };
}

export default function CupMatches({ cupId, onBack }: CupMatchesProps) {
  const [playedMatches, setPlayedMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewState, setViewState] = useState<'list' | 'analysis' | 'simulating' | 'result'>('list');
  const [showPlayedMatches, setShowPlayedMatches] = useState(true);
  const [showUpcomingMatches, setShowUpcomingMatches] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const theme = cupTheme[cupId];
  const API_BASE = 'http://localhost:5001/puppals-456c7/us-central1/api';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadMatches();
  }, [cupId]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/simulation/cup-matches?competition=${cupId}`);
      if (!response.ok) throw new Error('Failed to load matches');

      const data = await response.json();
      setPlayedMatches(data.matches?.played || []);
      setUpcomingMatches(data.matches?.upcoming || []);
    } catch (err) {
      setError('Errore nel caricamento delle partite');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const formatOdds = (val: any): string => {
    if (val === undefined || val === null) return '-';
    const num = Number(val);
    return isNaN(num) ? '-' : num.toFixed(2);
  };

  const formatMatchDate = (dateStr: string): string => {
    try {
      // Formato in arrivo: "16-09-2025 17:45"
      const [datePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('-');
      
      // Crea oggetto Date corretto
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };
  

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: baseBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>{theme.icon}</div>
          <div>Caricamento partite...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: baseBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <div style={{ marginBottom: '20px' }}>{error}</div>
          <button
            onClick={loadMatches}
            style={{
              padding: '12px 24px',
              background: theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // LISTA PARTITE
  // ✅ MOSTRA ANALISI PRE-MATCH
if (viewState === 'analysis' && selectedMatch) {
    return (
      <CupMatchAnalysis
        match={selectedMatch}
        cupId={cupId}
        onBack={() => {
          setViewState('list');
          setSelectedMatch(null);
        }}
        onSimulate={(config) => {
          // TODO: Avvia simulazione
          console.log('Simulazione richiesta:', config);
        }}
      />
    );
  }
  
  // ✅ MOSTRA LISTA PARTITE
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: baseBg,
      backgroundImage: `radial-gradient(circle at 50% 0%, ${theme.primary}20, ${baseBg} 70%)`,
      overflowY: 'auto',
      padding: '20px'
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
              fontSize: isMobile ? '24px' : '36px',
              fontWeight: '900',
              color: 'white',
              margin: 0,
              textShadow: `0 0 30px ${theme.glow}`
            }}>
              {theme.icon} {theme.name}
            </h1>
            <p style={{
            fontSize: '14px',
            color: textDim,
            margin: '5px 0 0 0'
            }}>
            {playedMatches.length + upcomingMatches.length} partite ({playedMatches.length} giocate, {upcomingMatches.length} prossime)
            </p>
          </div>
        </div>

        {/* LISTA PARTITE */}
<div>
  {playedMatches.length === 0 && upcomingMatches.length === 0 ? (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: textDim
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>{theme.icon}</div>
      <div>Nessuna partita trovata</div>
    </div>
  ) : (
    <>
      {/* PARTITE GIOCATE */}
        {playedMatches.length > 0 && (
            <>
            <div 
            onClick={() => setShowPlayedMatches(!showPlayedMatches)}
            style={{
                fontSize: isMobile ? '16px' : '20px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                userSelect: 'none'
            }}
            >
            <span>{showPlayedMatches ? '▼' : '▶'}</span>
            <span>🏁</span>
            <span>PARTITE GIOCATE</span>
            <span style={{ fontSize: '14px', color: textDim }}>({playedMatches.length})</span>
            <div style={{
                flex: 1,
                height: '2px',
                background: `linear-gradient(to right, ${theme.primary}40, transparent)`
            }}></div>
            </div>
            {showPlayedMatches && playedMatches.map((match, idx) => {
              const isExpanded = expandedMatch === (match.id || idx.toString());
              const odds = {
                '1': formatOdds(match.odds?.home),
                'X': formatOdds(match.odds?.draw),
                '2': formatOdds(match.odds?.away)
              };

              return (
                <div
                  key={match.id || idx}
                  onClick={() => {
                    if (isMobile) {
                      setExpandedMatch(isExpanded ? null : (match.id || idx.toString()));
                    } else {
                      setSelectedMatch(match);
                      setViewState('analysis');
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    padding: isMobile ? '12px 10px' : '10px 15px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    border: `1px solid ${theme.primary}20`,
                    display: 'flex',
                    flexDirection: isMobile && isExpanded ? 'column' : 'row',
                    alignItems: isMobile && isExpanded ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = theme.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = `${theme.primary}20`;
                    }
                  }}
                >
                  {/* DATA */}
                  <div style={{
                    width: isMobile ? '80px' : '120px',
                    flexShrink: 0
                  }}>
                    <div style={{
                      background: `${theme.primary}20`,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.primary}40`,
                      fontSize: '11px',
                      color: theme.secondary,
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      {formatMatchDate(match.match_date)}
                    </div>
                  </div>

                  {/* MOBILE COMPACT */}
                  {isMobile && !isExpanded ? (
                    <>
                      <div style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: 'white',
                        padding: '0 10px'
                      }}>
                        {match.home_team.substring(0, 15)} {match.result?.home_score !== undefined ? `${match.result.home_score}-${match.result.away_score}` : 'vs'} {match.away_team.substring(0, 15)}
                      </div>
                      <div style={{ fontSize: '18px', color: theme.secondary }}>▼</div>
                    </>
                  ) : !isMobile ? (
                    // DESKTOP
                    <>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px'
                      }}>
                        <div style={{
                          flex: 1,
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '15px',
                          color: 'white'
                        }}>
                          {match.home_team}
                        </div>
                        <div style={{
                          background: `${theme.primary}30`,
                          border: `1px solid ${theme.primary}`,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: theme.secondary,
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                        {match.result?.home_score !== undefined && match.result?.away_score !== undefined
                          ? `${match.result.home_score}-${match.result.away_score}`
                          : 'VS'}
                        </div>
                        <div style={{
                          flex: 1,
                          textAlign: 'left',
                          fontWeight: 'bold',
                          fontSize: '15px',
                          color: 'white'
                        }}>
                          {match.away_team}
                        </div>
                      </div>

                      {/* QUOTE */}
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginLeft: '20px'
                      }}>
                        {['1', 'X', '2'].map(label => (
                          <div
                            key={label}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              background: 'rgba(255, 255, 255, 0.05)',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              minWidth: '45px'
                            }}
                          >
                            <span style={{
                              fontSize: '9px',
                              color: textDim,
                              fontWeight: 'bold'
                            }}>
                              {label}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: 'white',
                              fontWeight: 'bold',
                              fontFamily: 'monospace'
                            }}>
                              {odds[label as '1' | 'X' | '2']}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {/* MOBILE EXPANDED */}
                  {isMobile && isExpanded && (
                    <div style={{
                      marginTop: '15px',
                      paddingTop: '15px',
                      borderTop: `1px solid ${theme.primary}30`
                    }}>
                      <div style={{
                        textAlign: 'center',
                        marginBottom: '15px'
                      }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: 'white',
                          marginBottom: '10px'
                        }}>
                          {match.home_team}
                        </div>
                        <div style={{
                          background: `${theme.primary}30`,
                          border: `1px solid ${theme.primary}`,
                          padding: '8px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: theme.secondary,
                          margin: '10px 0'
                        }}>
                          {match.home_team.substring(0, 15)} {match.result?.home_score !== undefined ? `${match.result.home_score}-${match.result.away_score}` : 
                          'vs'} {match.away_team.substring(0, 15)}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: 'white',
                          marginTop: '10px'
                        }}>
                          {match.away_team}
                        </div>
                      </div>

                      {/* QUOTE */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '15px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${theme.primary}20`
                      }}>
                        {['1', 'X', '2'].map(label => (
                          <div
                            key={label}
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
                              {label}
                            </span>
                            <span style={{
                              fontSize: '16px',
                              color: 'white',
                              fontWeight: 'bold',
                              fontFamily: 'monospace'
                            }}>
                              {odds[label as '1' | 'X' | '2']}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* BOTTONE SIMULA */}
                      <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatch(match);
                            setViewState('analysis');
                        }}
                        disabled={false}
                        style={{
                            width: '100%',
                            marginTop: '15px',
                            padding: '14px',
                            background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: `0 0 15px ${theme.glow}`
                          }}
                          >
                            {theme.icon} SIMULA PARTITA
                          </button>
                    </div>
                  )}
                </div>
             );
            })}
          </>
        )}

        {/* PARTITE DA GIOCARE */}
            {upcomingMatches.length > 0 && (
            <>
                <div 
                onClick={() => setShowUpcomingMatches(!showUpcomingMatches)}
                style={{
                    fontSize: isMobile ? '16px' : '20px',
                    fontWeight: '800',
                    color: 'white',
                    marginTop: '30px',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
                >
                <span>{showUpcomingMatches ? '▼' : '▶'}</span>
                <span>📅</span>
                <span>PROSSIME PARTITE</span>
                <span style={{ fontSize: '14px', color: textDim }}>({upcomingMatches.length})</span>
                <div style={{
                    flex: 1,
                    height: '2px',
                    background: `linear-gradient(to right, ${theme.secondary}40, transparent)`
                }}></div>
                </div>
                {showUpcomingMatches && upcomingMatches.map((match, idx) => {
                const isExpanded = expandedMatch === (match.id || idx.toString());
                const odds = {
                    '1': formatOdds(match.odds?.home),
                    'X': formatOdds(match.odds?.draw),
                    '2': formatOdds(match.odds?.away)
                };

                return (
                    <div
                    key={match.id || idx}
                    onClick={() => {
                        if (isMobile) {
                          setExpandedMatch(isExpanded ? null : (match.id || idx.toString()));
                        } else {
                          setSelectedMatch(match);
                          setViewState('analysis');
                        }
                      }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        padding: isMobile ? '12px 10px' : '10px 15px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        border: `1px solid ${theme.primary}20`,
                        display: 'flex',
                        flexDirection: isMobile && isExpanded ? 'column' : 'row',
                        alignItems: isMobile && isExpanded ? 'stretch' : 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (!isMobile) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = theme.primary;
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isMobile) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = `${theme.primary}20`;
                        }
                    }}
                    >
                    {/* DATA */}
                    <div style={{
                        width: isMobile ? '80px' : '120px',
                        flexShrink: 0
                    }}>
                        <div style={{
                        background: `${theme.primary}20`,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.primary}40`,
                        fontSize: '11px',
                        color: theme.secondary,
                        fontWeight: 'bold',
                        textAlign: 'center'
                        }}>
                        {formatMatchDate(match.match_date)}
                        </div>
                    </div>

                    {/* MOBILE COMPACT */}
                    {isMobile && !isExpanded ? (
                        <>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: 'white',
                            padding: '0 10px'
                        }}>
                            {match.home_team.substring(0, 15)} vs {match.away_team.substring(0, 15)}
                        </div>
                        <div style={{ fontSize: '18px', color: theme.secondary }}>▼</div>
                        </>
                    ) : !isMobile ? (
                        // DESKTOP
                        <>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '20px'
                        }}>
                            <div style={{
                            flex: 1,
                            textAlign: 'right',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            color: 'white'
                            }}>
                            {match.home_team}
                            </div>
                            <div style={{
                            background: `${theme.primary}30`,
                            border: `1px solid ${theme.primary}`,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: theme.secondary,
                            minWidth: '50px',
                            textAlign: 'center'
                            }}>
                            VS
                            </div>
                            <div style={{
                            flex: 1,
                            textAlign: 'left',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            color: 'white'
                            }}>
                            {match.away_team}
                            </div>
                        </div>

                        {/* QUOTE */}
                        <div style={{
                            display: 'flex',
                            gap: '6px',
                            marginLeft: '20px'
                        }}>
                            {['1', 'X', '2'].map(label => (
                            <div
                                key={label}
                                style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                minWidth: '45px'
                                }}
                            >
                                <span style={{
                                fontSize: '9px',
                                color: textDim,
                                fontWeight: 'bold'
                                }}>
                                {label}
                                </span>
                                <span style={{
                                fontSize: '12px',
                                color: 'white',
                                fontWeight: 'bold',
                                fontFamily: 'monospace'
                                }}>
                                {odds[label as '1' | 'X' | '2']}
                                </span>
                            </div>
                            ))}
                        </div>
                        </>
                    ) : null}

                    {/* MOBILE EXPANDED */}
                    {isMobile && isExpanded && (
                        <div style={{
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: `1px solid ${theme.primary}30`
                        }}>
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '15px'
                        }}>
                            <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: 'white',
                            marginBottom: '10px'
                            }}>
                            {match.home_team}
                            </div>
                            <div style={{
                            background: `${theme.primary}30`,
                            border: `1px solid ${theme.primary}`,
                            padding: '8px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: theme.secondary,
                            margin: '10px 0'
                            }}>
                            VS
                            </div>
                            <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: 'white',
                            marginTop: '10px'
                            }}>
                            {match.away_team}
                            </div>
                        </div>

                        {/* QUOTE */}
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '15px',
                            paddingTop: '12px',
                            borderTop: `1px solid ${theme.primary}20`
                        }}>
                            {['1', 'X', '2'].map(label => (
                            <div
                                key={label}
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
                                {label}
                                </span>
                                <span style={{
                                fontSize: '16px',
                                color: 'white',
                                fontWeight: 'bold',
                                fontFamily: 'monospace'
                                }}>
                                {odds[label as '1' | 'X' | '2']}
                                </span>
                            </div>
                            ))}
                        </div>

                        {/* BOTTONE SIMULA */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMatch(match);
                                setViewState('analysis');
                            }}
                            disabled={false}
                            style={{
                                width: '100%',
                                marginTop: '15px',
                                padding: '14px',
                                background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                cursor: 'pointer',
                                boxShadow: `0 0 15px ${theme.glow}`
                              }}
                              >
                                {theme.icon} SIMULA PARTITA
                              </button>
                        </div>
                    )}
                    </div>
                );
                })}
            </>
            )}
        </>
        )}
    </div>
      </div>
    </div>
  );
}