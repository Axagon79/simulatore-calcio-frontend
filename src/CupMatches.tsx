import { useState, useEffect } from 'react';
import CupMatchAnalysis from './CupMatchAnalysis';
import CupMatchResult from './CupMatchResult';

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

// Funzione per costruire URL stemma squadra
const getStemmaUrl = (cupId: 'UCL' | 'UEL', mongoId: string) => {
  const folder = cupId === 'UCL' ? 'Champions_League' : 'Europa_League';
  return `https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2Fsquadre%2F${folder}%2F${mongoId}.png?alt=media`;
};

interface CupMatchesProps {
  cupId: 'UCL' | 'UEL';
  onBack: () => void;
}

interface Match {
  id?: string;
  home_team: string;
  away_team: string;
  home_mongo_id?: string;
  away_mongo_id?: string;
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

export default function CupMatches({ cupId }: CupMatchesProps) {
  const [playedMatches, setPlayedMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewState, setViewState] = useState<'list' | 'analysis' | 'simulating' | 'result'>('list');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [showPlayedMatches, setShowPlayedMatches] = useState(true);
  const [showUpcomingMatches, setShowUpcomingMatches] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  

  const theme = cupTheme[cupId];
  const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

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
          top: '60px',  // <-- Lascia spazio per la top bar
          left: isMobile ? 0 : '322px',  // Mobile: tutto schermo, Desktop: dopo sidebar
          right: 0,
          bottom: 0,
          backgroundColor: baseBg,
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
          top: '60px',  // <-- Lascia spazio per la top bar
          left: isMobile ? 0 : '322px',  // Mobile: tutto schermo, Desktop: dopo sidebar
          right: 0,
          bottom: 0,
          backgroundColor: baseBg,
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
        onSimulate={async (config: any) => {
            // ← FIX: Se abbiamo già il result dall'animazione, usalo!
            if (config.result) {
                console.log('✅ Usando result da animazione:', config.result);
                setSimulationResult(config.result);
                setViewState('result');
                return;
            }
            setViewState('simulating');
            
            try {
                
              const API_BASE = window.location.hostname === 'localhost' 
                ? 'http://localhost:5001/puppals-456c7/us-central1/api'
                : 'https://api-6b34yfzjia-uc.a.run.app';
              
              const response = await fetch(`${API_BASE}/simulation/simulate-cup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  competition: cupId,
                  home: selectedMatch.home_team,
                  away: selectedMatch.away_team,
                  algo_id: config.algoId,
                  cycles: config.cycles
                })
              });
              
              const result = await response.json();

                console.log('✅ RISULTATO SIMULAZIONE:', result);
                setSimulationResult(result);
                setViewState('result');
                // Qui NON deve esserci setViewState('list')
              
            } catch (error) {
              console.error('Errore simulazione:', error);
              alert('Errore durante la simulazione');
              setViewState('analysis');
            }
            
          }}
      />
    );
  }

  // ✅ MOSTRA RISULTATO PARTITA
  if (viewState === 'result' && simulationResult && selectedMatch) {
    return (
      <CupMatchResult
        cupId={cupId}
        result={simulationResult}
        onBack={() => {
          setViewState('list');
          setSimulationResult(null);
          setSelectedMatch(null);
        }}
      />
    );
  }

  // ✅ MOSTRA LOADING SIMULAZIONE
  if (viewState === 'simulating') {
    return (
        <div style={{
          position: 'fixed',
          top: '60px',  // <-- Lascia spazio per la top bar
          left: isMobile ? 0 : '322px',  // Mobile: tutto schermo, Desktop: dopo sidebar
          right: 0,
          bottom: 0,
          backgroundColor: baseBg,
        backgroundImage: `radial-gradient(circle at 50% 0%, ${theme.primary}20, ${baseBg} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '30px' }}>{theme.icon}</div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          marginBottom: '20px'
        }}>
          ANALISI IN CORSO
        </div>
        <div style={{ 
          fontSize: '16px',
          color: textDim,
          display: 'flex',
          gap: '5px'
        }}>
          <span className="dot-1">.</span>
          <span className="dot-2">.</span>
          <span className="dot-3">.</span>
        </div>
        <style>{`
          @keyframes blink {
            0%, 20% { opacity: 0; }
            40% { opacity: 1; }
            100% { opacity: 0; }
          }
          .dot-1 { animation: blink 1.4s infinite; }
          .dot-2 { animation: blink 1.4s infinite 0.2s; }
          .dot-3 { animation: blink 1.4s infinite 0.4s; }
        `}</style>
      </div>
    );
  }
  
  // ✅ MOSTRA LISTA PARTITE
  return (
    <div style={{
      position: 'fixed',
      top: '60px',  // <-- Lascia spazio per la top bar
      left: isMobile ? 0 : '322px',  // Mobile: tutto schermo, Desktop: dopo sidebar
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
                  {/* 1. DATA (Versione Ridotta per Mobile) */}
                  <div style={{
                        width: isMobile ? '55px' : '120px', // RIDOTTO: da 80px a 55px
                        flexShrink: 0
                    }}>
                        <div style={{
                        background: `${theme.primary}20`,
                        padding: isMobile ? '4px 2px' : '6px 10px', // RIDOTTO PADDING
                        borderRadius: '8px',
                        border: `1px solid ${theme.primary}40`,
                        fontSize: isMobile ? '10px' : '11px',       // FONT PIU PICCOLO
                        color: theme.secondary,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                        }}>
                        {formatMatchDate(match.match_date)}
                        </div>
                    </div>

                    {/* 2. MOBILE COMPACT (Versione Geometrica Perfetta) */}
                    {isMobile && !isExpanded ? (
                    <>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '24px', // Altezza fissa riga
                            position: 'relative' // Per gestire layout precisi
                        }}>
                        
                        {/* SQUADRA CASA (Sinistra) - Occupa esattamente il 50% dello spazio disponibile a sx */}
                        <div style={{
                            flex: 1,            // Cresce
                            width: 0,           // TRUCCO: forza la divisione equa dello spazio
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end', // Spinge tutto verso il centro
                            gap: '4px',
                            paddingRight: '2px' // Minimo respiro dal centro
                        }}>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'right'
                            }}>
                                {match.home_team}
                            </span>
                            {match.home_mongo_id && (
                                <img 
                                    src={getStemmaUrl(cupId, match.home_mongo_id)}
                                    alt=""
                                    style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                        </div>
                        
                        {/* CENTRO (Risultato/VS) - LARGHEZZA FISSA E IMMUTABILE */}
                        <div style={{
                            width: '46px',        // LARGHEZZA FISSA: Non si muove mai
                            flexShrink: 0,        // Non si schiaccia mai
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: theme.secondary,
                            textAlign: 'center'
                        }}>
                            {match.status === 'finished' && match.result?.home_score !== undefined
                            ? `${match.result.home_score}-${match.result.away_score}`
                            : 'vs'}
                        </div>
                        
                        {/* SQUADRA OSPITE (Destra) - Occupa esattamente il 50% dello spazio disponibile a dx */}
                        <div style={{
                            flex: 1,            // Cresce identico alla squadra di casa
                            width: 0,           // TRUCCO: forza la divisione equa
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start', // Spinge tutto verso il centro
                            gap: '4px',
                            paddingLeft: '2px'
                        }}>
                            {match.away_mongo_id && (
                                <img 
                                    src={getStemmaUrl(cupId, match.away_mongo_id)}
                                    alt=""
                                    style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'left'
                            }}>
                                {match.away_team}
                            </span>
                        </div>
                        
                        {/* FRECCIA (Posizionata assoluta per non rubare spazio al centro) */}
                        <div style={{ 
                            position: 'absolute',
                            right: '-5px', // Fuori dal flusso, all'estrema destra
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px', 
                            color: theme.secondary 
                        }}>
                            ▼
                        </div>

                        </div>
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
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '10px'
                        }}>
                          {match.home_team}
                          {match.home_mongo_id && (
                            <img 
                              src={getStemmaUrl(cupId, match.home_mongo_id)}
                              alt=""
                              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
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
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: '10px'
                        }}>
                          {match.away_mongo_id && (
                            <img 
                              src={getStemmaUrl(cupId, match.away_mongo_id)}
                              alt=""
                              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
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

                  {/* SEZIONE ESPANDIBILE (Solo Mobile) */}
                  {isMobile && isExpanded && (
                        <div style={{
                            marginTop: '15px',
                            paddingTop: '15px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            
                            {/* --- INIZIO NUOVO BLOCCO SQUADRE CON STEMMI --- */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px'
                            }}>
                                {/* SQUADRA CASA (Colonna: Stemma sopra, Nome sotto) */}
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {match.home_mongo_id && (
                                        <img 
                                            src={getStemmaUrl(cupId, match.home_mongo_id)}
                                            alt=""
                                            style={{ 
                                                width: '45px',  // Più grandi qui nel dettaglio
                                                height: '45px', 
                                                objectFit: 'contain',
                                                filter: `drop-shadow(0 0 10px ${theme.primary}60)` // Effetto neon leggero
                                            }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 'bold', 
                                        color: 'white', 
                                        textAlign: 'center',
                                        lineHeight: '1.2'
                                    }}>
                                        {match.home_team}
                                    </span>
                                </div>

                                {/* VS CENTRALE */}
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: textDim,
                                    margin: '0 10px',
                                    marginTop: '-15px' // Lo alzo un po' per centrarlo con gli stemmi
                                }}>
                                    VS
                                </div>

                                {/* SQUADRA OSPITE (Colonna: Stemma sopra, Nome sotto) */}
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {match.away_mongo_id && (
                                        <img 
                                            src={getStemmaUrl(cupId, match.away_mongo_id)}
                                            alt=""
                                            style={{ 
                                                width: '45px', 
                                                height: '45px', 
                                                objectFit: 'contain',
                                                filter: `drop-shadow(0 0 10px ${theme.secondary}60)`
                                            }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 'bold', 
                                        color: 'white', 
                                        textAlign: 'center',
                                        lineHeight: '1.2'
                                    }}>
                                        {match.away_team}
                                    </span>
                                </div>
                            </div>
                            {/* --- FINE NUOVO BLOCCO SQUADRE --- */}

                            {/* SOTTO QUI C'È IL RESTO DEL CODICE (QUOTE E BOTTONE) */}
                            {/* Assicurati di mantenere il codice delle quote che c'era già... */}

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
                    {/* 1. DATA (Versione Ridotta per Mobile) */}
                    <div style={{
                        width: isMobile ? '55px' : '120px', // RIDOTTO: da 80px a 55px
                        flexShrink: 0
                    }}>
                        <div style={{
                        background: `${theme.primary}20`,
                        padding: isMobile ? '4px 2px' : '6px 10px', // RIDOTTO PADDING
                        borderRadius: '8px',
                        border: `1px solid ${theme.primary}40`,
                        fontSize: isMobile ? '10px' : '11px',       // FONT PIU PICCOLO
                        color: theme.secondary,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                        }}>
                        {formatMatchDate(match.match_date)}
                        </div>
                    </div>

                    {/* 2. MOBILE COMPACT (Versione Geometrica Perfetta) */}
                    {isMobile && !isExpanded ? (
                    <>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '24px', // Altezza fissa riga
                            position: 'relative' // Per gestire layout precisi
                        }}>
                        
                        {/* SQUADRA CASA (Sinistra) - Occupa esattamente il 50% dello spazio disponibile a sx */}
                        <div style={{
                            flex: 1,            // Cresce
                            width: 0,           // TRUCCO: forza la divisione equa dello spazio
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end', // Spinge tutto verso il centro
                            gap: '4px',
                            paddingRight: '2px' // Minimo respiro dal centro
                        }}>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'right'
                            }}>
                                {match.home_team}
                            </span>
                            {match.home_mongo_id && (
                                <img 
                                    src={getStemmaUrl(cupId, match.home_mongo_id)}
                                    alt=""
                                    style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                        </div>
                        
                        {/* CENTRO (Risultato/VS) - LARGHEZZA FISSA E IMMUTABILE */}
                        <div style={{
                            width: '46px',        // LARGHEZZA FISSA: Non si muove mai
                            flexShrink: 0,        // Non si schiaccia mai
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: theme.secondary,
                            textAlign: 'center'
                        }}>
                            {match.status === 'finished' && match.result?.home_score !== undefined
                            ? `${match.result.home_score}-${match.result.away_score}`
                            : 'vs'}
                        </div>
                        
                        {/* SQUADRA OSPITE (Destra) - Occupa esattamente il 50% dello spazio disponibile a dx */}
                        <div style={{
                            flex: 1,            // Cresce identico alla squadra di casa
                            width: 0,           // TRUCCO: forza la divisione equa
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start', // Spinge tutto verso il centro
                            gap: '4px',
                            paddingLeft: '2px'
                        }}>
                            {match.away_mongo_id && (
                                <img 
                                    src={getStemmaUrl(cupId, match.away_mongo_id)}
                                    alt=""
                                    style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'left'
                            }}>
                                {match.away_team}
                            </span>
                        </div>
                        
                        {/* FRECCIA (Posizionata assoluta per non rubare spazio al centro) */}
                        <div style={{ 
                            position: 'absolute',
                            right: '-5px', // Fuori dal flusso, all'estrema destra
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px', 
                            color: theme.secondary 
                        }}>
                            ▼
                        </div>

                        </div>
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
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '10px'
                            }}>
                              {match.home_team}
                              {match.home_mongo_id && (
                                <img 
                                  src={getStemmaUrl(cupId, match.home_mongo_id)}
                                  alt=""
                                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
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
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              gap: '10px'
                            }}>
                              {match.away_mongo_id && (
                                <img 
                                  src={getStemmaUrl(cupId, match.away_mongo_id)}
                                  alt=""
                                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
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

                    {/* SEZIONE ESPANDIBILE (Solo Mobile) */}
                    {isMobile && isExpanded && (
                        <div style={{
                            marginTop: '15px',
                            paddingTop: '15px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            
                            {/* --- INIZIO NUOVO BLOCCO SQUADRE CON STEMMI --- */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px'
                            }}>
                                {/* SQUADRA CASA (Colonna: Stemma sopra, Nome sotto) */}
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {match.home_mongo_id && (
                                        <img 
                                            src={getStemmaUrl(cupId, match.home_mongo_id)}
                                            alt=""
                                            style={{ 
                                                width: '45px',  // Più grandi qui nel dettaglio
                                                height: '45px', 
                                                objectFit: 'contain',
                                                filter: `drop-shadow(0 0 10px ${theme.primary}60)` // Effetto neon leggero
                                            }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 'bold', 
                                        color: 'white', 
                                        textAlign: 'center',
                                        lineHeight: '1.2'
                                    }}>
                                        {match.home_team}
                                    </span>
                                </div>

                                {/* VS CENTRALE */}
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: textDim,
                                    margin: '0 10px',
                                    marginTop: '-15px' // Lo alzo un po' per centrarlo con gli stemmi
                                }}>
                                    VS
                                </div>

                                {/* SQUADRA OSPITE (Colonna: Stemma sopra, Nome sotto) */}
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {match.away_mongo_id && (
                                        <img 
                                            src={getStemmaUrl(cupId, match.away_mongo_id)}
                                            alt=""
                                            style={{ 
                                                width: '45px', 
                                                height: '45px', 
                                                objectFit: 'contain',
                                                filter: `drop-shadow(0 0 10px ${theme.secondary}60)`
                                            }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 'bold', 
                                        color: 'white', 
                                        textAlign: 'center',
                                        lineHeight: '1.2'
                                    }}>
                                        {match.away_team}
                                    </span>
                                </div>
                            </div>
                            {/* --- FINE NUOVO BLOCCO SQUADRE --- */}

                            {/* SOTTO QUI C'È IL RESTO DEL CODICE (QUOTE E BOTTONE) */}
                            {/* Assicurati di mantenere il codice delle quote che c'era già... */}

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