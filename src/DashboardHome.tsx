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

interface DashboardProps {
  onSelectLeague: (leagueId: string) => void;
}

export default function DashboardHome({ onSelectLeague }: DashboardProps) {

  // --- LISTA CAMPIONATI AGGIORNATA (TUTTI E 7) ---
  const leagues = [
    { id: 'SERIE_A', name: 'Serie A', country: '🇮🇹 Italia', matches: 10, color: theme.cyan },
    { id: 'PREMIER_LEAGUE', name: 'Premier League', country: '🇬🇧 Inghilterra', matches: 8, color: '#ff0055' },
    { id: 'LA_LIGA', name: 'La Liga', country: '🇪🇸 Spagna', matches: 9, color: '#ff9f43' },
    { id: 'BUNDESLIGA', name: 'Bundesliga', country: '🇩🇪 Germania', matches: 6, color: '#ffffff' },
    { id: 'LIGA_PORTUGAL', name: 'Primeira Liga', country: '🇵🇹 Portogallo', matches: 5, color: '#00ff00' },
    { id: 'EREDIVISIE', name: 'Eredivisie', country: '🇳🇱 Olanda', matches: 4, color: '#FFA500' },
    { id: 'LIGUE_1', name: 'Ligue 1', country: '🇫🇷 Francia', matches: 7, color: '#0055ff' }, 
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

        {/* GRIGLIA RESPONSIVA - DESKTOP RIMANE UGUALE, MOBILE PIÙ COMPATTO */}
        <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px'
        }}>
            {leagues.map(league => (
               <div 
                 key={league.id}
                 onClick={() => onSelectLeague(league.id)}
                 style={{
                     background: 'rgba(20, 22, 35, 0.6)',
                     backdropFilter: 'blur(10px)',
                     border: '1px solid rgba(255,255,255,0.05)', 
                     borderRadius: '20px', 
                     padding: '25px',
                     cursor: 'pointer', 
                     transition: 'all 0.3s ease', 
                     position: 'relative', 
                     height: '180px', 
                     display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                     // MOBILE: Card più compatte e moderne
                     ...window.innerWidth < 768 && {
                       height: '120px',
                       padding: '18px',
                       borderRadius: '16px',
                       gap: '8px'
                     }
                 }}
                 onMouseEnter={(e) => {
                     e.currentTarget.style.borderColor = league.color;
                     e.currentTarget.style.background = 'rgba(30, 35, 50, 0.8)';
                     e.currentTarget.style.transform = 'translateY(-3px)';
                 }}
                 onMouseLeave={(e) => {
                     e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                     e.currentTarget.style.background = 'rgba(20, 22, 35, 0.6)';
                     e.currentTarget.style.transform = 'translateY(0)';
                 }}
                 onTouchStart={(e) => {
                     e.currentTarget.style.borderColor = league.color;
                     e.currentTarget.style.background = 'rgba(30, 35, 50, 0.9)';
                     e.currentTarget.style.transform = 'scale(0.98)';
                 }}
                 onTouchEnd={(e) => {
                     setTimeout(() => {
                         e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                         e.currentTarget.style.background = 'rgba(20, 22, 35, 0.6)';
                         e.currentTarget.style.transform = 'scale(1)';
                     }, 200);
                 }}
               >
                   <div>
                      <div style={{
                          fontSize: window.innerWidth < 768 ? '10px' : '12px', 
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
                          fontSize: window.innerWidth < 768 ? '22px' : '28px', 
                          fontWeight: '800', 
                          color: 'white', 
                          marginTop: window.innerWidth < 768 ? '3px' : '5px',
                          lineHeight: '1.1'
                      }}>
                          {league.name}
                      </div>
                   </div>
                   
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
                      <div style={{
                          fontSize: window.innerWidth < 768 ? '10px' : '12px', 
                          color: league.color, 
                          fontWeight:'bold', 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: window.innerWidth < 768 ? '3px 8px' : '4px 10px', 
                          borderRadius:'6px',
                          whiteSpace: 'nowrap'
                      }}>
                        ● {league.matches} LIVE
                      </div>
                      
                      <div style={{
                          width: window.innerWidth < 768 ? '30px' : '35px', 
                          height: window.innerWidth < 768 ? '30px' : '35px', 
                          borderRadius: '50%', 
                          background: 'white', color: 'black',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: window.innerWidth < 768 ? '16px' : '18px', 
                          fontWeight:'bold'
                      }}>
                        ➜
                      </div>
                   </div>
               </div>
            ))}
        </div>
        
        <div style={{height: '50px'}}></div>
      </div>
    </div>
  );
}