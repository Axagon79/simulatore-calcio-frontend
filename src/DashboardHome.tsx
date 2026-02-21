import { useState, useEffect, useRef } from 'react'
import { useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
// --- CONFIGURAZIONE ---
const IS_ADMIN = true;

const isLocal = typeof window !== 'undefined' && (
  ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
  window.location.hostname.startsWith('192.168.')
);
const API_BASE = isLocal
  ? `http://${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:5001/puppals-456c7/us-central1/api`
  : 'https://api-6b34yfzjia-uc.a.run.app';

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
  'SERIE_C_A': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'SERIE_C_B': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'SERIE_C_C': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
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

  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOtherLeagues, setShowOtherLeagues] = useState(false);
  const [showCups, setShowCups] = useState(false);
  const [showBankroll, setShowBankroll] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Coach AI chat state
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<{id: number, sender: 'user'|'bot', text: string, isLoading?: boolean}[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const coachEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Coach AI: keyframes per animazione dots
  useEffect(() => {
    if (document.getElementById('coach-ai-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'coach-ai-keyframes';
    style.textContent = `@keyframes coachDot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`;
    document.head.appendChild(style);
  }, []);

  // Coach AI: scroll to bottom on new messages
  useEffect(() => {
    coachEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachMessages]);

  // Coach AI: send message
  const sendCoachMessage = async (text?: string) => {
    const msg = text || coachInput;
    if (!msg.trim() || coachLoading) return;
    setCoachInput('');
    const userMsg = { id: Date.now(), sender: 'user' as const, text: msg };
    const loadingMsg = { id: Date.now() + 1, sender: 'bot' as const, text: '', isLoading: true };
    setCoachMessages(prev => [...prev, userMsg, loadingMsg]);
    setCoachLoading(true);
    try {
      const history = coachMessages.filter(m => !m.isLoading).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, pageContext: 'dashboard' })
      });
      const data = await res.json();
      setCoachMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: Date.now() + 2, sender: 'bot', text: data.success ? data.reply : 'Errore: ' + (data.error || 'sconosciuto')
      }));
    } catch {
      setCoachMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: Date.now() + 2, sender: 'bot', text: 'Errore di connessione'
      }));
    } finally {
      setCoachLoading(false);
    }
  };

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
    // ITALIA
    { id: 'SERIE_C_A', name: 'Serie C - Girone A', country: '🇮🇹 Italia', color: '#00f0ff' },
    { id: 'SERIE_C_B', name: 'Serie C - Girone B', country: '🇮🇹 Italia', color: '#00f0ff' },
    { id: 'SERIE_C_C', name: 'Serie C - Girone C', country: '🇮🇹 Italia', color: '#00f0ff' },

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
        backgroundColor: isMobile ? '#1a1d2e' : theme.bg,
        backgroundImage: isMobile
          ? 'radial-gradient(circle at 50% 0%, #2a2d4a 0%, #1a1d2e 70%)'
          : 'radial-gradient(circle at 50% 0%, #1a1d2e 0%, #05070a 70%)',
        zIndex: 9999,
        overflowY: 'auto',
        overflowX: 'hidden',     
        padding: isMobile ? '0 20px 20px' : '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* BOX CENTRALE CHE CONTIENE TUTTO */}
      <div style={{width: '100%', maxWidth: '1200px', paddingBottom: '40px'}}>

        {/* HEADER STICKY SU MOBILE (auth + titolo + sottotitolo) */}
        <div style={isMobile ? {
          position: 'sticky', top: 0, zIndex: 100,
          background: '#1a1d2e',
          margin: '0 -20px 20px',
          padding: '20px 20px 12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)'
        } : {}}>

          {/* BOTTONE AUTH */}
          <div style={{
            ...(isMobile
              ? { display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }
              : { position: 'fixed', top: 16, right: 70, zIndex: 10001 }),
            fontFamily: '"Inter", "Segoe UI", sans-serif'
          }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.cyan}40, ${theme.purple}40)`,
                  border: `2px solid ${theme.cyan}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '12px' : '14px', fontWeight: '800', color: theme.cyan,
                  overflow: 'hidden'
                }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    (user.email || 'U')[0].toUpperCase()
                  )}
                </div>
                {!isMobile && (
                  <span style={{ color: theme.textDim, fontSize: '12px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email}
                  </span>
                )}
                <button
                  onClick={() => logout()}
                  style={{
                    background: 'rgba(255,42,109,0.1)', border: '1px solid rgba(255,42,109,0.25)',
                    color: theme.danger, padding: isMobile ? '4px 8px' : '5px 12px',
                    borderRadius: '8px', cursor: 'pointer',
                    fontSize: isMobile ? '10px' : '11px', fontWeight: '700'
                  }}
                >
                  Esci
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: `linear-gradient(135deg, ${theme.cyan}15, ${theme.cyan}30)`,
                  border: `1px solid ${theme.cyan}40`,
                  color: theme.cyan, padding: isMobile ? '6px 14px' : '8px 20px',
                  borderRadius: '10px', cursor: 'pointer',
                  fontSize: isMobile ? '12px' : '13px', fontWeight: '700',
                  backdropFilter: 'blur(8px)'
                }}
              >
                Accedi
              </button>
            )}
          </div>

          {/* HEADER RESPONSIVO */}
          <div style={{textAlign: 'center', ...(isMobile ? {} : { marginTop: '40px', marginBottom: '50px' })}}>
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
        </div>

        {/* BARRA AZIONI RAPIDE */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(0, 240, 255, 0.1)',
          borderRadius: '12px', padding: isMobile ? '10px' : '14px', marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { label: 'Match Day', icon: '\u26BD', color: theme.cyan, bg: 'rgba(0,240,255,0.06)', borderColor: 'rgba(0,240,255,0.2)', onClick: () => { window.location.href = '/#today'; } },
            { label: 'Track Record', icon: '\uD83D\uDCCA', color: theme.success, bg: 'rgba(5,249,182,0.06)', borderColor: `${theme.success}30`, onClick: () => { window.location.href = '/track-record'; } },
            { label: 'Coach AI', icon: '\uD83E\uDD16', color: '#bc13fe', bg: 'rgba(188,19,254,0.06)', borderColor: 'rgba(188,19,254,0.2)', onClick: () => setCoachOpen(true) }
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              style={{
                flex: 1, padding: isMobile ? '12px 8px' : '14px 16px', borderRadius: '12px',
                background: btn.bg, border: `1px solid ${btn.borderColor}`,
                color: btn.color, fontSize: isMobile ? '12px' : '13px', fontWeight: '800',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: '"Inter", "Segoe UI", sans-serif', transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = btn.color;
                e.currentTarget.style.background = 'rgba(30, 35, 50, 0.8)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = btn.borderColor;
                e.currentTarget.style.background = btn.bg;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onTouchStart={e => {
                e.currentTarget.style.borderColor = btn.color;
                e.currentTarget.style.background = 'rgba(30, 35, 50, 0.9)';
                e.currentTarget.style.transform = 'scale(0.96)';
              }}
              onTouchEnd={e => {
                const t = e.currentTarget;
                setTimeout(() => {
                  t.style.borderColor = btn.borderColor;
                  t.style.background = btn.bg;
                  t.style.transform = 'scale(1)';
                }, 200);
              }}
            >
              <span style={{ fontSize: '16px' }}>{btn.icon}</span> {btn.label}
            </button>
          ))}
          </div>
        </div>

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
                     border: `1px solid ${league.color}40`,
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
                    e.currentTarget.style.borderColor = `${league.color}40`;
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
                        target.style.borderColor = `${league.color}40`;
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
                border: `1px solid ${theme.purple}`,
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

            {/* CARD BEST PICKS — Pronostici Unificati */}
            <div
              key="PREDICTIONS_CARD"
              onClick={() => window.location.href = '/best-picks'}
              style={{
                background: 'linear-gradient(135deg, rgba(138,43,226,0.15), rgba(0,240,255,0.08))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(188,19,254,0.4)',
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
                Best Picks
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
                border: `1px solid ${theme.cyan}`,
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

            {/* CARD STEP SYSTEM */}
            <div
              key="STEP_SYSTEM_CARD"
              onClick={() => window.location.href = '/step-system'}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(188,19,254,0.15), rgba(138,43,226,0.08))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(188,19,254,0.4)',
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
              <span style={{
                position: 'absolute',
                top: isMobile ? '8px' : '12px',
                right: isMobile ? '8px' : '12px',
                background: 'linear-gradient(135deg, #bc13fe, #8b5cf6)',
                color: 'white',
                fontSize: '10px',
                fontWeight: '900',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>PRO</span>
              <div style={{fontSize: isMobile ? '36px' : '48px', marginBottom: isMobile ? '5px' : '-10px'}}>📈</div>
              <div style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '8px'
              }}>
                Step System
              </div>
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                color: '#bc13fe',
                fontWeight: 'bold'
              }}>
                Sistema Progressivo
              </div>
            </div>

            {/* CARD BANKROLL & GESTIONE */}
            <div
              key="BANKROLL_CARD"
              onClick={() => setShowBankroll(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(5,249,182,0.15), rgba(255,215,0,0.08))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(5,249,182,0.4)',
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
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(5,249,182,0.3)';
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget) return;
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{fontSize: isMobile ? '36px' : '48px', marginBottom: isMobile ? '5px' : '-10px'}}>💰</div>
              <div style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '8px'
              }}>
                Bankroll & Gestione
              </div>
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                color: theme.success,
                fontWeight: 'bold'
              }}>
                ROI & Money Management
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
              background: isMobile ? '#1a1d2e' : theme.bg,
              border: `2px solid ${theme.purple}`,
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER (fisso) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexShrink: 0
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

            {/* GRIGLIA CAMPIONATI CON STEMMI (scrollabile) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: isMobile ? '15px' : '10px',
              overflowY: 'auto',
              flex: 1
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
              background: isMobile ? '#1a1d2e' : theme.bg,
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

      {/* MODALE BANKROLL & GESTIONE */}
      {showBankroll && (
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
          onClick={() => setShowBankroll(false)}
        >
          <div
            style={{
              background: isMobile ? '#1a1d2e' : theme.bg,
              border: `2px solid ${theme.success}`,
              borderRadius: '20px',
              padding: isMobile ? '20px' : '30px',
              maxWidth: '600px',
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
                💰 Bankroll & Gestione
              </h2>
              <button
                onClick={() => setShowBankroll(false)}
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

            {/* OPZIONI */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '15px'
            }}>
              {/* Bankroll & ROI */}
              <div
                onClick={() => {
                  setShowBankroll(false);
                  window.location.href = '/bankroll';
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
                  e.currentTarget.style.borderColor = theme.success;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: isMobile ? '45px' : '55px',
                  height: isMobile ? '45px' : '55px',
                  borderRadius: '12px',
                  background: 'rgba(5,249,182,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '24px' : '28px',
                  flexShrink: 0
                }}>
                  📊
                </div>
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: theme.success,
                    marginBottom: '4px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Statistiche & ROI
                  </div>
                  <div style={{
                    fontSize: isMobile ? '16px' : '20px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    Bankroll & ROI
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: theme.textDim,
                    marginTop: '4px'
                  }}>
                    Profitti, perdite, yield e performance
                  </div>
                </div>
              </div>

              {/* Money Management */}
              <div
                onClick={() => {
                  setShowBankroll(false);
                  window.location.href = '/money-management';
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
                  e.currentTarget.style.borderColor = '#ffd700';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: isMobile ? '45px' : '55px',
                  height: isMobile ? '45px' : '55px',
                  borderRadius: '12px',
                  background: 'rgba(255,215,0,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '24px' : '28px',
                  flexShrink: 0
                }}>
                  📖
                </div>
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: '#ffd700',
                    marginBottom: '4px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Guida & Strategia
                  </div>
                  <div style={{
                    fontSize: isMobile ? '16px' : '20px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    Money Management
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: theme.textDim,
                    marginTop: '4px'
                  }}>
                    Quarter Kelly, scala stake e regole d'oro
                  </div>
                </div>
              </div>

              {/* Money Tracker */}
              <div
                onClick={() => {
                  setShowBankroll(false);
                  window.location.href = '/money-tracker';
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
                  e.currentTarget.style.borderColor = theme.success;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: isMobile ? '45px' : '55px',
                  height: isMobile ? '45px' : '55px',
                  borderRadius: '12px',
                  background: 'rgba(5,249,182,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '24px' : '28px',
                  flexShrink: 0
                }}>
                  💰
                </div>
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: theme.success,
                    marginBottom: '4px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Gestione Scommesse
                  </div>
                  <div style={{
                    fontSize: isMobile ? '16px' : '20px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    Money Tracker
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: theme.textDim,
                    marginTop: '4px'
                  }}>
                    Traccia scommesse, bankroll e stake suggeriti
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COACH AI CHAT OVERLAY */}
      {coachOpen && (
        <div onClick={() => setCoachOpen(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 10002, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: isMobile ? '100%' : '440px',
            height: isMobile ? '85vh' : '520px',
            background: '#0d0f1a', border: '1px solid rgba(188,19,254,0.3)',
            borderRadius: isMobile ? '20px 20px 0 0' : '16px',
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            ...(isMobile ? {} : { marginBottom: '30px' })
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/coach-ai-robot.png" alt="" style={{ height: '30px', width: 'auto' }} />
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Coach AI</div>
                  <div style={{ color: theme.textDim, fontSize: '10px' }}>Guida al sistema di pronostici</div>
                </div>
              </div>
              <button onClick={() => setCoachOpen(false)} style={{
                background: 'none', border: 'none', color: theme.textDim, fontSize: '18px', cursor: 'pointer'
              }}>&#10005;</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {coachMessages.length === 0 && (
                <div style={{ padding: '20px 6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <img src="/coach-ai-robot.png" alt="" style={{ height: '36px', width: 'auto' }} />
                    <div style={{ color: 'white', fontSize: '15px', fontWeight: 700 }}>Ciao! Sono il tuo assistente.</div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '14px 16px', lineHeight: '1.7', fontSize: '13px', color: '#ccc'
                  }}>
                    <p style={{ margin: '0 0 10px' }}>
                      Sono qui per rispondere a qualsiasi <strong style={{ color: 'white' }}>curiosit&agrave; sul nostro sistema di pronostici</strong>.
                      Come funzionano gli algoritmi? Cosa significano le stelle? Come vengono calcolate le quote? Chiedimi pure, senza limiti.
                    </p>
                    <p style={{ margin: '0 0 10px' }}>
                      Se invece vuoi <strong style={{ color: '#bc13fe' }}>analizzare una partita specifica</strong> o dialogare sui pronostici del giorno,
                      troverai un altro Coach AI dedicato direttamente dentro la pagina di ogni partita.
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                      Qui parliamo del sistema — l&agrave; si parla di calcio.
                    </p>
                  </div>
                </div>
              )}
              {coachMessages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.5',
                    ...(msg.sender === 'user'
                      ? { background: 'rgba(188,19,254,0.15)', border: '1px solid rgba(188,19,254,0.3)', color: 'white' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#e0e0e0' })
                  }}>
                    {msg.isLoading ? (
                      <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
                        {[0,1,2].map(i => (
                          <span key={i} style={{
                            width: '6px', height: '6px', borderRadius: '50%', background: '#bc13fe',
                            animation: `coachDot 1.4s infinite ${i * 0.2}s`
                          }} />
                        ))}
                      </div>
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={coachEndRef} />
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '6px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: 'Come funziona?', msg: 'Come funziona il sistema di pronostici? Spiegamelo in modo semplice.' },
                { label: 'Cosa sono le stelle?', msg: 'Cosa significano le stelle nei pronostici e come vengono calcolate?' },
                { label: 'Quanti algoritmi ci sono?', msg: 'Quanti algoritmi utilizza il sistema e come lavorano insieme?' }
              ].map(qa => (
                <button key={qa.label} onClick={() => sendCoachMessage(qa.msg)} disabled={coachLoading} style={{
                  background: 'rgba(188,19,254,0.1)', border: '1px solid rgba(188,19,254,0.25)',
                  color: '#bc13fe', padding: '5px 10px', borderRadius: '15px', fontSize: '11px',
                  cursor: coachLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
                  opacity: coachLoading ? 0.5 : 1, fontFamily: '"Inter", "Segoe UI", sans-serif'
                }}>{qa.label}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                value={coachInput}
                onChange={e => setCoachInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !coachLoading && sendCoachMessage()}
                placeholder="Chiedi qualsiasi cosa sul sistema..."
                disabled={coachLoading}
                autoComplete="off"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px',
                  outline: 'none', fontFamily: '"Inter", "Segoe UI", sans-serif',
                  opacity: coachLoading ? 0.5 : 1
                }}
              />
              <button
                onClick={() => sendCoachMessage()}
                disabled={coachLoading || !coachInput.trim()}
                style={{
                  background: 'rgba(188,19,254,0.15)', border: '1px solid rgba(188,19,254,0.3)',
                  borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                  color: '#bc13fe', fontSize: '16px',
                  opacity: (coachLoading || !coachInput.trim()) ? 0.3 : 1
                }}
              >&#128640;</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}