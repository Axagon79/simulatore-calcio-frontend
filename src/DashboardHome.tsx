import { useState, useEffect } from 'react'
// --- CONFIGURAZIONE ---
const IS_ADMIN = true; 

// --- TEMA NEON DARK ---
const theme = {
  bg: '#05070a',
  cyan: '#00f0ff',
  purple: '#bc13fe',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6'
};

// --- URL BASE STEMMI ---
const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

const STEMMI_CAMPIONATI: Record<string, string> = {
  'SERIE_A': `${STEMMI_BASE}campionati%2Fserie_a.png?alt=media`,
  'SERIE_B': `${STEMMI_BASE}campionati%2Fserie_b.png?alt=media`,
  'SERIE_C': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'PREMIER_LEAGUE': `${STEMMI_BASE}campionati%2Fpremier_league.png?alt=media`,
  'LA_LIGA': `${STEMMI_BASE}campionati%2Fla_liga.png?alt=media`,
  'BUNDESLIGA': `${STEMMI_BASE}campionati%2Fbundesliga.png?alt=media`,
  'LIGUE_1': `${STEMMI_BASE}campionati%2Fligue_1.png?alt=media`,
  'LIGA_PORTUGAL': `${STEMMI_BASE}campionati%2Fliga_portugal.png?alt=media`,
  'CHAMPIONSHIP': `${STEMMI_BASE}campionati%2Fchampionship.png?alt=media`,
  'LA_LIGA_2': `${STEMMI_BASE}campionati%2Fla_liga_2.png?alt=media`,
  'BUNDESLIGA_2': `${STEMMI_BASE}campionati%2Fbundesliga_2.png?alt=media`,
  'LIGUE_2': `${STEMMI_BASE}campionati%2Fligue_2.png?alt=media`,
  'EREDIVISIE': `${STEMMI_BASE}campionati%2Feredivisie.png?alt=media`,
  'SCOTTISH_PREMIERSHIP': `${STEMMI_BASE}campionati%2Fscottish_premiership.png?alt=media`,
  'ALLSVENSKAN': `${STEMMI_BASE}campionati%2Fallsvenskan.png?alt=media`,
  'ELITESERIEN': `${STEMMI_BASE}campionati%2Feliteserien.png?alt=media`,
  'SUPERLIGAEN': `${STEMMI_BASE}campionati%2Fsuperligaen.png?alt=media`,
  'JUPILER_PRO_LEAGUE': `${STEMMI_BASE}campionati%2Fjupiler_pro_league.png?alt=media`,
  'SUPER_LIG': `${STEMMI_BASE}campionati%2Fsuper_lig.png?alt=media`,
  'LEAGUE_OF_IRELAND': `${STEMMI_BASE}campionati%2Fleague_of_ireland.png?alt=media`,
  'BRASILEIRAO': `${STEMMI_BASE}campionati%2Fbrasileirao.png?alt=media`,
  'PRIMERA_DIVISION_ARG': `${STEMMI_BASE}campionati%2Fprimera_division_arg.png?alt=media`,
  'MLS': `${STEMMI_BASE}campionati%2Fmls.png?alt=media`,
  'J1_LEAGUE': `${STEMMI_BASE}campionati%2Fj1_league.png?alt=media`,
};

const STEMMI_COPPE: Record<string, string> = {
  'UCL': `${STEMMI_BASE}coppe%2Fucl.png?alt=media`,
  'UEL': `${STEMMI_BASE}coppe%2Fuel.png?alt=media`,
};

interface DashboardProps {
  onSelectLeague: (leagueId: string) => void;
}

export default function DashboardHome({ onSelectLeague }: DashboardProps) {

  const [showOtherLeagues, setShowOtherLeagues] = useState(false);
  const [showCups, setShowCups] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detect mobile resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- LISTA CAMPIONATI PRINCIPALI ---
  const leagues = [
    { id: 'SERIE_A', name: 'Serie A', country: '🇮🇹 Italia', matches: 10, color: theme.cyan },
    { id: 'PREMIER_LEAGUE', name: 'Premier League', country: '🇬🇧 Inghilterra', matches: 8, color: '#ff0055' },
    { id: 'LA_LIGA', name: 'La Liga', country: '🇪🇸 Spagna', matches: 9, color: '#ff9f43' },
    { id: 'BUNDESLIGA', name: 'Bundesliga', country: '🇩🇪 Germania', matches: 6, color: '#ffffff' },
    { id: 'LIGA_PORTUGAL', name: 'Primeira Liga', country: '🇵🇹 Portogallo', matches: 5, color: '#00ff00' },
    { id: 'LIGUE_1', name: 'Ligue 1', country: '🇫🇷 Francia', matches: 7, color: '#0055ff' }, 
  ];

  // CARD SPECIALE PER ALTRI CAMPIONATI
  const otherLeaguesCard = {
    id: 'OTHER_LEAGUES',
    name: 'Altri Campionati',
    country: '🌍 Mondo',
    matches: 15,
    color: theme.purple
  };

  // LISTA COMPLETA ALTRI CAMPIONATI
  const otherLeagues = [
    // EUROPA SERIE B
    { id: 'CHAMPIONSHIP', name: 'Championship', country: '🇬🇧 Inghilterra B', color: '#cc0055' },
    { id: 'LA_LIGA_2', name: 'LaLiga 2', country: '🇪🇸 Spagna B', color: '#dd8833' },
    { id: 'BUNDESLIGA_2', name: '2. Bundesliga', country: '🇩🇪 Germania B', color: '#dddddd' },
    { id: 'LIGUE_2', name: 'Ligue 2', country: '🇫🇷 Francia B', color: '#0044cc' },
    { id: 'EREDIVISIE', name: 'Eredivisie', country: '🇳🇱 Olanda', color: '#FFA500' },
    
    // EUROPA NORDICI + EXTRA
    { id: 'SCOTTISH_PREMIERSHIP', name: 'Scottish Prem.', country: '🇬🇧 Scozia', color: '#0055aa' },
    { id: 'ALLSVENSKAN', name: 'Allsvenskan', country: '🇸🇪 Svezia', color: '#ffcc00' },
    { id: 'ELITESERIEN', name: 'Eliteserien', country: '🇳🇴 Norvegia', color: '#cc0000' },
    { id: 'SUPERLIGAEN', name: 'Superligaen', country: '🇩🇰 Danimarca', color: '#dd0000' },
    { id: 'JUPILER_PRO_LEAGUE', name: 'Jupiler Pro', country: '🇧🇪 Belgio', color: '#ffdd00' },
    { id: 'SUPER_LIG', name: 'Süper Lig', country: '🇹🇷 Turchia', color: '#ee0000' },
    { id: 'LEAGUE_OF_IRELAND', name: 'League of Ireland', country: '🇮🇪 Irlanda', color: '#009900' },
    
    // AMERICHE
    { id: 'BRASILEIRAO', name: 'Brasileirão', country: '🇧🇷 Brasile', color: '#00ff00' },
    { id: 'PRIMERA_DIVISION_ARG', name: 'Primera División', country: '🇦🇷 Argentina', color: '#66ccff' },
    { id: 'MLS', name: 'MLS', country: '🇺🇸 USA', color: '#0066cc' },
    
    // ASIA
    { id: 'J1_LEAGUE', name: 'J1 League', country: '🇯🇵 Giappone', color: '#cc0000' },
  ];

  // CONFIGURAZIONE COPPE EUROPEE
  const cupsCard = {
    id: 'EUROPEAN_CUPS',
    name: 'Coppe Europee',
    country: '🏆 UEFA',
    matches: 72,
    color: theme.cyan
  };

  const europeanCups = [
    { id: 'UCL', name: 'UEFA Champions League', country: '⭐ Europa', color: '#0066cc' },
    { id: 'UEL', name: 'UEFA Europa League', country: '🌟 Europa', color: '#ff6600' }
  ];

  return (
    <div style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: theme.bg,
        backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1d2e 0%, #05070a 70%)',
        zIndex: 9999,
        overflowY: 'auto',
        overflowX: 'hidden',     
        padding: '20px',         
        display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      
      {/* BOX CENTRALE CHE CONTIENE TUTTO */}
      <div style={{width: '100%', maxWidth: '1200px', paddingBottom: '40px'}}>

        {/* HEADER RESPONSIVO */}
        <div style={{textAlign: 'center', marginTop: '40px', marginBottom: '50px'}}>
          <h1 style={{
              fontSize: 'clamp(32px, 6vw, 64px)', 
              fontWeight: '900', margin: '0 0 10px 0',
              textShadow: `0 0 40px ${theme.purple}`,
              letterSpacing: '-1px',
              color: 'white'
          }}>
              <span style={{color: theme.cyan}}>AI</span> SIMULATOR
          </h1>
          <p style={{
             color: theme.textDim, 
             fontSize: 'clamp(14px, 3vw, 18px)', 
             margin: 0 
          }}>
            SELEZIONA UN CAMPIONATO PER ACCEDERE AL CORE
          </p>
        </div>

        {/* BARRA ADMIN */}
        {IS_ADMIN && (
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid rgba(0, 240, 255, 0.1)',
                borderRadius: '12px', padding: '15px', marginBottom: '40px',
                display: 'flex', flexWrap: 'wrap', 
                justifyContent: 'center', gap: '20px',
                fontSize: '11px', fontFamily: 'monospace', color: theme.cyan
            }}>
                <span style={{display:'flex', alignItems:'center', gap:'6px'}}>
                  <span style={{width:'6px', height:'6px', borderRadius:'50%', background: theme.danger, boxShadow:`0 0 8px ${theme.danger}`}}></span> 
                  ADMIN MODE
                </span>
                <span style={{color: theme.textDim}}>DB: <span style={{color:'white'}}>SYNCED</span></span>
                <span style={{color: theme.textDim}}>AI: <span style={{color: theme.success}}>ACTIVE v4.2</span></span>
            </div>
        )}

        {/* GRIGLIA RESPONSIVA */}
        <div style={{
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px'
        }}>
            {/* CARD CAMPIONATI PRINCIPALI */}
            {leagues.map(league => (
               <div 
                 key={league.id}
                 onClick={() => onSelectLeague(league.id)}
                 style={{
                     background: 'rgba(20, 22, 35, 0.6)',
                     backdropFilter: 'blur(10px)',
                     border: '1px solid rgba(255,255,255,0.05)', 
                     borderRadius: isMobile ? '16px' : '20px', 
                     padding: isMobile ? '18px' : '25px',
                     cursor: 'pointer', 
                     transition: 'all 0.3s ease', 
                     position: 'relative', 
                     height: isMobile ? '120px' : '180px', 
                     display: 'flex', 
                     flexDirection: 'column', 
                     justifyContent: 'space-between',
                     gap: isMobile ? '8px' : '0'
                 }}
                 onMouseEnter={(e) => {
                    if (!e.currentTarget) return;
                    e.currentTarget.style.borderColor = league.color;
                    e.currentTarget.style.background = 'rgba(30, 35, 50, 0.8)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                    if (!e.currentTarget) return;
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.background = 'rgba(20, 22, 35, 0.6)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
                onTouchStart={(e) => {
                    if (!e.currentTarget) return;
                    e.currentTarget.style.borderColor = league.color;
                    e.currentTarget.style.background = 'rgba(30, 35, 50, 0.9)';
                    e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onTouchEnd={(e) => {
                    const target = e.currentTarget;
                    if (!target) return;
                    setTimeout(() => {
                        if (!target) return;
                        target.style.borderColor = 'rgba(255,255,255,0.05)';
                        target.style.background = 'rgba(20, 22, 35, 0.6)';
                        target.style.transform = 'scale(1)';
                    }, 200);
                }}
               >
                   {/* PARTE SUPERIORE: STEMMA + INFO */}
                   <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '15px' }}>
                      {/* STEMMA */}
                      <img 
                        src={STEMMI_CAMPIONATI[league.id]} 
                        alt={league.name}
                        style={{
                          width: isMobile ? '40px' : '55px',
                          height: isMobile ? '40px' : '55px',
                          objectFit: 'contain',
                          flexShrink: 0
                        }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div>
                        <div style={{
                            fontSize: isMobile ? '10px' : '12px', 
                            color: theme.textDim, 
                            textTransform:'uppercase', 
                            fontWeight:'bold', 
                            display:'flex', 
                            alignItems:'center', 
                            gap:'6px'
                        }}>
                            {league.country}
                        </div>
                        <div style={{
                            fontSize: isMobile ? '20px' : '26px', 
                            fontWeight: '800', 
                            color: 'white', 
                            marginTop: isMobile ? '2px' : '5px',
                            lineHeight: '1.1'
                        }}>
                            {league.name}
                        </div>
                      </div>
                   </div>
                   
                   {/* PARTE INFERIORE: BADGE + FRECCIA */}
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
                      <div style={{
                          fontSize: isMobile ? '10px' : '12px', 
                          color: league.color, 
                          fontWeight:'bold', 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: isMobile ? '3px 8px' : '4px 10px', 
                          borderRadius:'6px',
                          whiteSpace: 'nowrap'
                      }}>
                        ● {league.matches} LIVE
                      </div>
                      
                      <div style={{
                          width: isMobile ? '30px' : '35px', 
                          height: isMobile ? '30px' : '35px', 
                          borderRadius: '50%', 
                          background: 'white', color: 'black',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: isMobile ? '16px' : '18px', 
                          fontWeight:'bold'
                      }}>
                        ➜
                      </div>
                   </div>
               </div>
            ))}

            {/* CARD ALTRI CAMPIONATI */}
            <div 
              key={otherLeaguesCard.id}
              onClick={() => setShowOtherLeagues(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(188,19,254,0.2), rgba(0,240,255,0.1))',
                backdropFilter: 'blur(10px)',
                border: `2px solid ${theme.purple}`,
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '18px' : '25px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: isMobile ? '120px' : '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                e.currentTarget.style.boxShadow = `0 10px 40px ${theme.purple}40`;
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{fontSize: isMobile ? '36px' : '48px', marginBottom: isMobile ? '5px' : '-10px'}}>🌍</div>
              <div style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '8px'
              }}>
                Altri Campionati
              </div>
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                color: theme.purple,
                fontWeight: 'bold'
              }}>
                +15 Disponibili
              </div>
            </div>

            {/* CARD PRONOSTICI DEL GIORNO */}
            <div 
              key="PREDICTIONS_CARD"
              onClick={() => onSelectLeague('PREDICTIONS')}
              style={{
                background: 'linear-gradient(135deg, rgba(138,43,226,0.15), rgba(0,240,255,0.08))',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(188,19,254,0.4)',
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '18px' : '25px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: isMobile ? '120px' : '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(188,19,254,0.3)';
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{fontSize: isMobile ? '36px' : '48px', marginBottom: isMobile ? '5px' : '-10px'}}>🔮</div>
              <div style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '8px'
              }}>
                Pronostici del Giorno
              </div>
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                color: '#bc13fe',
                fontWeight: 'bold'
              }}>
                AI Predictions
              </div>
            </div>
              
            {/* CARD COPPE EUROPEE - CON STEMMI UCL + UEL */}
            <div 
              key={cupsCard.id}
              onClick={() => setShowCups(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(0,102,204,0.2), rgba(255,102,0,0.1))',
                backdropFilter: 'blur(10px)',
                border: `2px solid ${theme.cyan}`,
                borderRadius: isMobile ? '16px' : '20px',
                padding: isMobile ? '18px' : '25px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: isMobile ? '120px' : '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                e.currentTarget.style.boxShadow = `0 10px 40px ${theme.cyan}40`;
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* STEMMI UCL + UEL AFFIANCATI */}
              <div style={{ display: 'flex', gap: isMobile ? '10px' : '15px', marginBottom: isMobile ? '8px' : '10px' }}>
                <img 
                  src={STEMMI_COPPE['UCL']} 
                  alt="Champions League"
                  style={{
                    width: isMobile ? '35px' : '45px',
                    height: isMobile ? '35px' : '45px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <img 
                  src={STEMMI_COPPE['UEL']} 
                  alt="Europa League"
                  style={{
                    width: isMobile ? '35px' : '45px',
                    height: isMobile ? '35px' : '45px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '8px'
              }}>
                Coppe Europee
              </div>
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                color: theme.cyan,
                fontWeight: 'bold'
              }}>
                UCL + UEL
              </div>
            </div>

            <div style={{height: '50px'}}></div>
        </div> 
      </div>

      {/* MODALE ALTRI CAMPIONATI */}
      {showOtherLeagues && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowOtherLeagues(false)}
        >
          <div 
            style={{
              background: theme.bg,
              border: `2px solid ${theme.purple}`,
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: '800',
                color: 'white',
                margin: 0
              }}>
                🌍 Altri Campionati
              </h2>
              <button
                onClick={() => setShowOtherLeagues(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textDim,
                  fontSize: '32px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            {/* GRIGLIA CAMPIONATI CON STEMMI */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: isMobile ? '15px' : '10px'
            }}>
              {otherLeagues.map(league => (
                <div
                  key={league.id}
                  onClick={() => {
                    setShowOtherLeagues(false);
                    onSelectLeague(league.id);
                  }}
                  style={{
                    background: 'rgba(20, 22, 35, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: isMobile ? '15px' : '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = league.color;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* STEMMA */}
                  <img 
                    src={STEMMI_CAMPIONATI[league.id]} 
                    alt={league.name}
                    style={{
                      width: isMobile ? '35px' : '40px',
                      height: isMobile ? '35px' : '40px',
                      objectFit: 'contain',
                      flexShrink: 0
                    }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div>
                    <div style={{
                      fontSize: '11px',
                      color: theme.textDim,
                      marginBottom: isMobile ? '4px' : '2px'
                    }}>
                      {league.country}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '16px' : '18px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      {league.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALE COPPE EUROPEE */}
      {showCups && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowCups(false)}
        >
          <div 
            style={{
              background: theme.bg,
              border: `2px solid ${theme.cyan}`,
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: '800',
                color: 'white',
                margin: 0
              }}>
                🏆 Coppe Europee
              </h2>
              <button
                onClick={() => setShowCups(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textDim,
                  fontSize: '32px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            {/* GRIGLIA COPPE CON STEMMI */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '15px'
            }}>
              {europeanCups.map(cup => (
                <div
                  key={cup.id}
                  onClick={() => {
                    setShowCups(false);
                    onSelectLeague(cup.id);
                  }}
                  style={{
                    background: 'rgba(20, 22, 35, 0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: isMobile ? '20px' : '25px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = cup.color;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* STEMMA COPPA */}
                  <img 
                    src={STEMMI_COPPE[cup.id]} 
                    alt={cup.name}
                    style={{
                      width: isMobile ? '45px' : '55px',
                      height: isMobile ? '45px' : '55px',
                      objectFit: 'contain',
                      flexShrink: 0
                    }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div>
                    <div style={{
                      fontSize: '11px',
                      color: theme.textDim,
                      marginBottom: '4px'
                    }}>
                      {cup.country}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '16px' : '20px',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      {cup.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}