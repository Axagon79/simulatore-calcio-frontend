import { useState, useEffect, useRef } from 'react'
import { useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
// --- CONFIGURAZIONE ---
const isLocal = typeof window !== 'undefined' && (
  ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
  window.location.hostname.startsWith('192.168.')
);
const API_BASE = isLocal
  ? `http://${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:5001/puppals-456c7/us-central1/api`
  : 'https://api-6b34yfzjia-uc.a.run.app';

// --- TEMA (centralizzato) ---
import { getTheme, getThemeMode, getMobileTheme } from './AppDev/costanti';
import { checkAdmin } from './permissions';
import StemmaImg from './components/StemmaImg';
import TopbarPronostici from './components/TopbarPronostici';
const theme = getTheme();
const isLight = getThemeMode() === 'light';
const mobileTheme = getMobileTheme();

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
  onGoToToday?: () => void;
}

export default function DashboardHome({ onSelectLeague, onGoToToday }: DashboardProps) {

  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOtherLeagues, setShowOtherLeagues] = useState(false);
  const [showCups, setShowCups] = useState(false);
  const [showBankroll, setShowBankroll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const europeanCups = [
    { id: 'UCL', name: 'UEFA Champions League', country: '⭐ Europa', color: '#0066cc' },
    { id: 'UEL', name: 'UEFA Europa League', country: '🌟 Europa', color: '#ff6600' }
  ];

  return (
    <div style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: isLight ? '#f0f2f5' : '#0a0b0f',
        zIndex: 9999,
        overflowY: 'auto',
        overflowX: 'hidden',     
        padding: isMobile ? '0 20px 20px' : '0 20px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      
      {/* Sfondo stadio trasparente */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/bg-stadium.png)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        opacity: isLight ? 0.02 : 0.025,
        filter: 'saturate(3) contrast(1.6) brightness(1.3)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* BOX CENTRALE CHE CONTIENE TUTTO */}
      <div style={{width: '100%', maxWidth: '1200px', paddingBottom: '40px'}}>

        {/* ===== TOPBAR STICKY ===== */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', flexDirection: isMobile ? 'column' : 'row' as const,
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          padding: isMobile ? '0' : '0 40px',
          borderBottom: isMobile ? 'none' : `1px solid ${theme.borderSubtle}`,
          backdropFilter: 'blur(10px)',
          background: isLight ? 'rgba(215, 220, 235, 0.85)' : 'rgba(5,7,10,0.85)',
          margin: isMobile ? '0 -20px' : '0 -20px',
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          boxSizing: 'border-box' as const,
          fontFamily: '"Inter", "Segoe UI", sans-serif'
        }}>
          {/* RIGA 1: Logo + Auth (mobile) / Logo + Pronostici + Auth (desktop) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: isMobile ? '46px' : '60px',
            padding: isMobile ? '0 16px' : '0',
            width: '100%',
          }}>
            {/* SINISTRA: Logo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            }}>
              <img
                src="/logo-virgo.png"
                alt="Logo"
                style={{
                  width: isMobile ? 28 : 32,
                  height: isMobile ? 28 : 32,
                  objectFit: 'contain',
                  filter: isLight ? 'none' : 'invert(1)',
                  opacity: isLight ? 1 : 0.85,
                }}
              />
              <span style={{
                fontSize: isMobile ? '14px' : '15px', fontWeight: 600,
                color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
                letterSpacing: '0.05em',
                fontFamily: '"Inter", system-ui, sans-serif',
              }}>
                AI Simulator
              </span>
            </div>

            {/* CENTRO: Pronostici (solo desktop) */}
            {!isMobile && (
              <div style={{ flex: 1, margin: '0 20px' }}>
                <TopbarPronostici isMobile={false} />
              </div>
            )}

          {/* DESTRA: Auth + Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {user ? (
              <>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.cyan}40, ${theme.purple}40)`,
                  border: `2px solid ${theme.cyan}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '800', color: theme.cyan,
                  overflow: 'hidden'
                }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    (user.email || 'U')[0].toUpperCase()
                  )}
                </div>
                {!isMobile && (
                  <span style={{ color: theme.textDim, fontSize: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email}
                  </span>
                )}
                <button
                  onClick={() => logout()}
                  style={{
                    background: `${theme.danger}18`, border: `1px solid ${theme.danger}40`,
                    color: theme.danger, padding: '4px 10px',
                    borderRadius: '8px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: '700', fontFamily: 'inherit'
                  }}
                >
                  Esci
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: 'none', border: `1px solid ${theme.borderSubtle}`,
                  color: theme.textDim, padding: '6px 14px',
                  borderRadius: '8px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
              >
                Accedi
              </button>
            )}
            <button
              onClick={() => window.dispatchEvent(new Event('open-settings'))}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '18px',
                color: isLight ? '#111827' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s', fontFamily: 'inherit'
              }}
              title="Impostazioni"
            ><img src="/icon-settings.png" alt="Impostazioni" style={{ width: 18, height: 18 }} /></button>
          </div>
          </div>

          {/* RIGA 2: Pronostici (solo mobile) */}
          {isMobile && (
            <div style={{
              height: '32px',
              padding: '0 12px',
              display: 'flex', alignItems: 'center',
            }}>
              <TopbarPronostici isMobile={true} />
            </div>
          )}
        </div>

        {/* ===== BARRA NAVIGAZIONE ===== */}
        {(() => {
          const navMenus: { label: string; items?: { label: string; onClick: () => void }[]; onClick?: () => void }[] = [
            { label: 'Competizioni', items: [
              ...leagues.map(l => ({ label: l.name, onClick: () => onSelectLeague(l.id) })),
              { label: 'Altri Campionati', onClick: () => setShowOtherLeagues(true) },
              { label: 'Coppe Europee', onClick: () => setShowCups(true) },
            ]},
            { label: 'Oggi', items: [
              { label: 'Match Day', onClick: () => { if (onGoToToday) onGoToToday(); } },
              { label: 'Best Picks', onClick: () => { window.location.href = '/best-picks'; } },
            ]},
            { label: 'Strumenti', items: [
              { label: 'Simulazione Rapida', onClick: () => { window.location.href = '/simulate'; } },
              { label: 'Step System', onClick: () => { window.location.href = '/step-system'; } },
              { label: 'Bankroll & Gestione', onClick: () => setShowBankroll(true) },
              { label: 'Track Record', onClick: () => { window.location.href = '/track-record'; } },
              { label: 'Coach AI', onClick: () => setCoachOpen(true) },
              ...(checkAdmin() ? [{ label: 'Analisi Storica', onClick: () => { window.location.href = '/analisi-storica'; } }] : []),
            ]},
            { label: 'Prezzi', onClick: () => { window.location.href = '/prezzi'; } },
            { label: 'Contatti', onClick: () => { window.location.href = '/contatti'; } },
          ];
          return isMobile ? (
            /* MOBILE: Hamburger */
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                padding: '6px 0',
                borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
                margin: '0 -20px', paddingLeft: '20px', paddingRight: '20px',
              }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    background: 'none', border: 'none',
                    color: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)',
                    fontSize: '18px', cursor: 'pointer', padding: '4px 8px',
                    fontFamily: 'inherit', lineHeight: 1,
                  }}
                >☰</button>
                <span style={{
                  fontSize: '12px', fontWeight: '500',
                  color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
                  marginLeft: '8px',
                }}>Menu</span>
              </div>
              {/* PANNELLO HAMBURGER */}
              {menuOpen && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(10,11,15,0.97)',
                  zIndex: 9000, overflowY: 'auto',
                  padding: '20px',
                  fontFamily: '"Inter", "Segoe UI", sans-serif',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button
                      onClick={() => setMenuOpen(false)}
                      style={{
                        background: 'none', border: 'none',
                        color: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)',
                        fontSize: '24px', cursor: 'pointer', padding: '4px 8px',
                        fontFamily: 'inherit',
                      }}
                    >✕</button>
                  </div>
                  {navMenus.map(menu => (
                    menu.items ? (
                    <div key={menu.label} style={{ marginBottom: '24px' }}>
                      <div style={{
                        fontSize: '11px', fontWeight: '500',
                        color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
                        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                        marginBottom: '8px',
                      }}>{menu.label}</div>
                      {menu.items.map(item => (
                        <div
                          key={item.label}
                          onClick={() => { item.onClick(); setMenuOpen(false); }}
                          style={{
                            padding: '10px 0',
                            fontSize: '15px', fontWeight: '400',
                            color: isLight ? '#374151' : 'rgba(255,255,255,0.8)',
                            cursor: 'pointer',
                            borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                          }}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                    ) : (
                    <div
                      key={menu.label}
                      onClick={() => { if (menu.onClick) menu.onClick(); setMenuOpen(false); }}
                      style={{
                        padding: '12px 0',
                        fontSize: '15px', fontWeight: '500',
                        color: isLight ? '#374151' : 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                      }}
                    >
                      {menu.label}
                    </div>
                    )
                  ))}
                </div>
              )}
            </>
          ) : (
            /* DESKTOP: Dropdown hover */
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px',
              padding: '8px 0',
              fontFamily: '"Inter", "Segoe UI", sans-serif',
              borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
              margin: '0 -20px', paddingLeft: '20px', paddingRight: '20px',
            }}>
              {navMenus.map(menu => (
                menu.items ? (
                <div
                  key={menu.label}
                  style={{ position: 'relative' }}
                  onMouseEnter={e => {
                    const dd = e.currentTarget.querySelector('[data-dropdown]') as HTMLElement;
                    if (dd) dd.style.display = 'block';
                  }}
                  onMouseLeave={e => {
                    const dd = e.currentTarget.querySelector('[data-dropdown]') as HTMLElement;
                    if (dd) dd.style.display = 'none';
                  }}
                >
                  <button style={{
                    background: 'none', border: 'none',
                    color: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)',
                    fontSize: '13px', fontWeight: '500',
                    padding: '6px 18px',
                    cursor: 'pointer', borderRadius: '6px',
                    transition: 'color 0.15s, background 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = isLight ? '#111827' : 'rgba(255,255,255,0.9)';
                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.5)';
                    e.currentTarget.style.background = 'none';
                  }}
                  >
                    {menu.label}
                  </button>
                  <div data-dropdown style={{
                    display: 'none',
                    position: 'absolute',
                    top: '100%', left: '0',
                    minWidth: '200px',
                    background: isLight ? '#fff' : '#161820',
                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '8px',
                    padding: '4px 0',
                    boxShadow: isLight ? '0 8px 30px rgba(0,0,0,0.12)' : '0 8px 30px rgba(0,0,0,0.5)',
                    zIndex: 200,
                  }}>
                    {menu.items.map(item => (
                      <div
                        key={item.label}
                        onClick={item.onClick}
                        style={{
                          padding: '8px 14px',
                          fontSize: '13px', fontWeight: '400',
                          color: isLight ? '#374151' : 'rgba(255,255,255,0.75)',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
                ) : (
                <button
                  key={menu.label}
                  onClick={menu.onClick}
                  style={{
                    background: 'none', border: 'none',
                    color: isLight ? '#6b7280' : 'rgba(255,255,255,0.5)',
                    fontSize: '13px', fontWeight: '500',
                    padding: '6px 18px',
                    cursor: 'pointer', borderRadius: '6px',
                    transition: 'color 0.15s, background 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = isLight ? '#111827' : 'rgba(255,255,255,0.9)';
                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.5)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  {menu.label}
                </button>
                )
              ))}
            </div>
          );
        })()}

        {/* ===== HERO — Tagline grande ===== */}
        <div style={{
          padding: isMobile ? '36px 4px 28px' : '56px 0 44px',
        }}>
          <h1 style={{
            color: isLight ? '#111827' : 'rgba(255,255,255,0.92)',
            fontSize: isMobile ? '26px' : '46px',
            fontWeight: '500',
            fontFamily: '"Inter", system-ui, sans-serif',
            lineHeight: '1.2',
            margin: 0,
            letterSpacing: '-0.03em',
          }}>
            Ogni partita ha una storia<br />
            noi la scriviamo prima che accada
          </h1>
          <p style={{
            color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)',
            fontSize: isMobile ? '13px' : '14px',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            marginTop: isMobile ? '14px' : '20px',
            fontWeight: '400',
            letterSpacing: '0.01em',
          }}>
            Pronostici AI, simulazioni avanzate e analisi in tempo reale
          </p>
        </div>

        {/* ===== SHOWCASE SEZIONI (stile Linear) ===== */}
        {[
          {
            title: 'Competizioni Selezionate',
            subtitle: 'Solo il meglio, niente compromessi',
            text: 'Ogni competizione è stata scelta perché calibrata al massimo con i nostri algoritmi. Leghe su misura per offrire la massima precisione.',
            img: '/showcase-competizioni.png',
            link: { label: 'Esplora le competizioni', action: () => { /* scroll to leagues */ document.querySelector('[data-section="competizioni"]')?.scrollIntoView({ behavior: 'smooth' }); } },
          },
          {
            title: 'Pronostici Intelligenti',
            subtitle: 'Dati che parlano, non opinioni',
            text: 'Algoritmi avanzati analizzano statistiche, quote e tendenze per generare pronostici con livelli di confidenza trasparenti.',
            img: '/showcase-pronostici.png',
            link: { label: 'Scopri i pronostici', action: () => { window.location.href = '/best-picks'; } },
          },
          {
            title: 'Simulazione Avanzata',
            subtitle: 'Gioca la partita prima del fischio',
            text: 'Simula qualsiasi match con 6 algoritmi diversi: statistico, tattico, dinamico, Monte Carlo e altri.',
            img: '/showcase-simulazione.png',
            link: { label: 'Simula una partita', action: () => { window.location.href = '/simulate'; } },
          },
          {
            title: 'Track Record',
            subtitle: 'La trasparenza, il nostro punto di forza',
            text: 'Risultati verificabili, non promesse. Ogni pronostico viene tracciato e verificato. Consulta lo storico completo con percentuali di successo reali.',
            img: '/showcase-trackrecord.png',
            link: { label: 'Verifica i risultati', action: () => { window.location.href = '/track-record'; } },
          },
          {
            title: 'Assistente AI',
            subtitle: 'Mai più da solo',
            text: 'Un coach personale che analizza partite, risponde alle tue domande e ti guida nelle scelte. Sempre disponibile.',
            img: '/showcase-assistente.jpg',
            link: { label: 'Chiedi al Coach', action: () => setCoachOpen(true) },
          },
          {
            title: 'Gestione Bankroll',
            subtitle: 'Il controllo che fa la differenza',
            text: 'Step System, bankroll management e ROI tracking. Ogni scommessa è gestita con disciplina e strategia.',
            img: '/showcase-bankroll.jpg',
            link: { label: 'Gestisci il bankroll', action: () => setShowBankroll(true) },
          },
        ].map((section, idx) => (
          <div key={idx} style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : (idx % 2 === 0 ? 'row' : 'row-reverse'),
            alignItems: 'center',
            gap: isMobile ? '24px' : '48px',
            marginBottom: isMobile ? '48px' : '80px',
          }}>
            {/* Testo */}
            <div style={{
              flex: isMobile ? 'unset' : '0 0 35%',
              width: isMobile ? '100%' : 'auto',
            }}>
              <div style={{
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: '500',
                color: isLight ? '#6366f1' : 'rgba(99,102,241,0.8)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                marginBottom: '8px',
                fontFamily: '"Inter", system-ui, sans-serif',
              }}>{section.subtitle}</div>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: '600',
                color: isLight ? '#111827' : 'rgba(255,255,255,0.9)',
                margin: '0 0 12px 0',
                lineHeight: '1.2',
                fontFamily: '"Inter", system-ui, sans-serif',
                letterSpacing: '-0.02em',
              }}>{section.title}</h2>
              <p style={{
                fontSize: isMobile ? '13px' : '14px',
                color: isLight ? '#6b7280' : 'rgba(255,255,255,0.4)',
                lineHeight: '1.6',
                margin: 0,
                fontFamily: '"Inter", system-ui, sans-serif',
              }}>{section.text}</p>
              {section.link && (
                <div
                  onClick={section.link.action}
                  style={{
                    marginTop: '16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: isLight ? '#6366f1' : 'rgba(99,102,241,0.9)',
                    cursor: 'pointer',
                    fontFamily: '"Inter", system-ui, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'gap 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.gap = '10px'; }}
                  onMouseLeave={e => { e.currentTarget.style.gap = '6px'; }}
                >
                  {section.link.label} <span style={{ fontSize: '16px' }}>&rarr;</span>
                </div>
              )}
            </div>
            {/* Screenshot sfumato */}
            <div style={{
              flex: isMobile ? 'unset' : '0 0 60%',
              width: isMobile ? '100%' : 'auto',
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <img
                src={section.img}
                alt={section.title}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '12px',
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                }}
              />
              {/* Sfumatura bordi */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '12px',
                background: isLight
                  ? 'none'
                  : 'linear-gradient(to right, rgba(10,11,15,0.6) 0%, transparent 15%, transparent 85%, rgba(10,11,15,0.6) 100%), linear-gradient(to bottom, transparent 70%, rgba(10,11,15,0.8) 100%)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        ))}

        {/* SEZIONE CAMPIONATI */}
        <div data-section="competizioni" style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '11px', fontWeight: '500', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
          }}>Competizioni</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1px',
            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            {leagues.map(league => (
              <div
                key={league.id}
                onClick={() => onSelectLeague(league.id)}
                style={{
                  background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)',
                  padding: isMobile ? '12px 14px' : '16px 18px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  fontFamily: '"Inter", "Segoe UI", sans-serif',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isLight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)';
                }}
              >
                <StemmaImg
                  src={STEMMI_CAMPIONATI[league.id]}
                  size={isMobile ? 28 : 32}
                  alt={league.name}
                  cardColor={league.color}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: isMobile ? '13px' : '14px', fontWeight: '500',
                    color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
                    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{league.name}</div>
                  <div style={{
                    fontSize: '11px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
                    marginTop: '1px',
                  }}>{league.country}</div>
                </div>
                <span style={{
                  fontSize: '11px', color: isLight ? '#d1d5db' : 'rgba(255,255,255,0.15)',
                }}>&#8250;</span>
              </div>
            ))}
            {/* Altri Campionati */}
            <div
              onClick={() => setShowOtherLeagues(true)}
              style={{
                background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)',
                padding: isMobile ? '12px 14px' : '16px 18px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '12px',
                fontFamily: '"Inter", "Segoe UI", sans-serif',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isLight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)';
              }}
            >
              <div style={{
                width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px',
                borderRadius: '6px',
                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? '14px' : '16px', flexShrink: 0,
              }}>+</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? '13px' : '14px', fontWeight: '500',
                  color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
                }}>Altri Campionati</div>
                <div style={{
                  fontSize: '11px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
                  marginTop: '1px',
                }}>+15 disponibili</div>
              </div>
              <span style={{ fontSize: '11px', color: isLight ? '#d1d5db' : 'rgba(255,255,255,0.15)' }}>&#8250;</span>
            </div>
            {/* Coppe Europee */}
            <div
              onClick={() => setShowCups(true)}
              style={{
                background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)',
                padding: isMobile ? '12px 14px' : '16px 18px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '12px',
                fontFamily: '"Inter", "Segoe UI", sans-serif',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isLight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)';
              }}
            >
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <StemmaImg src={STEMMI_COPPE['UCL']} size={isMobile ? 14 : 16} alt="UCL" cardColor="#1a3c6e" />
                <StemmaImg src={STEMMI_COPPE['UEL']} size={isMobile ? 14 : 16} alt="UEL" cardColor="#e87500" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? '13px' : '14px', fontWeight: '500',
                  color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
                }}>Coppe Europee</div>
                <div style={{
                  fontSize: '11px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
                  marginTop: '1px',
                }}>UCL + UEL</div>
              </div>
              <span style={{ fontSize: '11px', color: isLight ? '#d1d5db' : 'rgba(255,255,255,0.15)' }}>&#8250;</span>
            </div>
          </div>
        </div>

        {/* SEZIONE STRUMENTI */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '11px', fontWeight: '500', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
          }}>Strumenti</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1px',
            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            {[
              { label: 'Step System', sub: 'Sistema Progressivo', onClick: () => { window.location.href = '/step-system'; } },
              { label: 'Bankroll & Gestione', sub: 'ROI & Money Management', onClick: () => setShowBankroll(true) },
              { label: 'Track Record', sub: 'Statistiche Pronostici', onClick: () => { window.location.href = '/track-record'; } },
              { label: 'Impostazioni', sub: 'Tema, Account & Preferenze', onClick: () => window.dispatchEvent(new Event('open-settings')) },
            ].map(item => (
              <div
                key={item.label}
                onClick={item.onClick}
                style={{
                  background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)',
                  padding: isMobile ? '12px 14px' : '16px 18px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  fontFamily: '"Inter", "Segoe UI", sans-serif',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isLight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: isMobile ? '13px' : '14px', fontWeight: '500',
                    color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
                  }}>{item.label}</div>
                  <div style={{
                    fontSize: '11px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
                    marginTop: '1px',
                  }}>{item.sub}</div>
                </div>
                <span style={{ fontSize: '11px', color: isLight ? '#d1d5db' : 'rgba(255,255,255,0.15)' }}>&#8250;</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FOOTER (stile Linear) ===== */}
        <footer style={{
          borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
          marginTop: '40px',
          paddingTop: '40px',
          paddingBottom: '32px',
          fontFamily: '"Inter", system-ui, sans-serif',
        }}>
          {/* Colonne */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : '1.5fr repeat(4, 1fr)',
            gap: isMobile ? '32px' : '40px',
            marginBottom: '40px',
          }}>
            {/* Logo + nome */}
            {!isMobile && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <img src="/logo-virgo.png" alt="Logo" style={{
                    width: 24, height: 24, objectFit: 'contain',
                    filter: isLight ? 'none' : 'invert(1)', opacity: isLight ? 1 : 0.85,
                  }} />
                  <span style={{
                    fontSize: '14px', fontWeight: 600,
                    color: isLight ? '#111827' : 'rgba(255,255,255,0.85)',
                    letterSpacing: '0.05em',
                  }}>AI Simulator</span>
                </div>
                <p style={{
                  fontSize: '12px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.3)',
                  lineHeight: '1.5', margin: 0, maxWidth: '200px',
                }}>Pronostici AI, simulazioni avanzate e analisi in tempo reale.</p>
              </div>
            )}
            {/* Colonna Prodotto */}
            <div>
              <div style={{
                fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', marginBottom: '12px',
                color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
              }}>Prodotto</div>
              {[
                { label: 'Competizioni', action: () => document.querySelector('[data-section="competizioni"]')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'Pronostici', action: () => { window.location.href = '/best-picks'; } },
                { label: 'Simulazione', action: () => { window.location.href = '/simulate'; } },
                { label: 'Track Record', action: () => { window.location.href = '/track-record'; } },
                { label: 'Coach AI', action: () => setCoachOpen(true) },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{
                  fontSize: '13px', color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
                  padding: '4px 0', cursor: 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#111827' : 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.45)'; }}
                >{item.label}</div>
              ))}
            </div>
            {/* Colonna Strumenti */}
            <div>
              <div style={{
                fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', marginBottom: '12px',
                color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
              }}>Strumenti</div>
              {[
                { label: 'Step System', action: () => { window.location.href = '/step-system'; } },
                { label: 'Bankroll', action: () => setShowBankroll(true) },
                { label: 'Money Tracker', action: () => { window.location.href = '/money-tracker'; } },
                { label: 'Impostazioni', action: () => window.dispatchEvent(new Event('open-settings')) },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{
                  fontSize: '13px', color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
                  padding: '4px 0', cursor: 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#111827' : 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.45)'; }}
                >{item.label}</div>
              ))}
            </div>
            {/* Colonna Prezzi */}
            <div>
              <div style={{
                fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', marginBottom: '12px',
                color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
              }}>Prezzi</div>
              {[
                { label: 'Piani', action: () => { window.location.href = '/prezzi'; } },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{
                  fontSize: '13px', color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
                  padding: '4px 0', cursor: 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#111827' : 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.45)'; }}
                >{item.label}</div>
              ))}
            </div>
            {/* Colonna Contatti */}
            <div>
              <div style={{
                fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' as const,
                letterSpacing: '0.08em', marginBottom: '12px',
                color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.35)',
              }}>Contatti</div>
              {[
                { label: 'Contattaci', action: () => { window.location.href = '/contatti'; } },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{
                  fontSize: '13px', color: isLight ? '#6b7280' : 'rgba(255,255,255,0.45)',
                  padding: '4px 0', cursor: 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = isLight ? '#111827' : 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#6b7280' : 'rgba(255,255,255,0.45)'; }}
                >{item.label}</div>
              ))}
            </div>
          </div>
          {/* Copyright */}
          <div style={{
            borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <span style={{
              fontSize: '12px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.25)',
            }}>&copy; {new Date().getFullYear()} AI Simulator. Tutti i diritti riservati.</span>
            <span style={{
              fontSize: '11px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.2)',
            }}>Il gioco d'azzardo può causare dipendenza. 18+ | Numero Verde: 800 55 88 22</span>
          </div>
        </footer>
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
              background: isMobile ? mobileTheme.bg : theme.bg,
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
                color: theme.text,
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
              flex: 1,
              paddingTop: '5px'
            }}>
              {otherLeagues.map(league => (
                <div
                  key={league.id}
                  onClick={() => {
                    setShowOtherLeagues(false);
                    onSelectLeague(league.id);
                  }}
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.borderSubtle}`,
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
                    e.currentTarget.style.borderColor = theme.borderSubtle;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* STEMMA */}
                  <StemmaImg
                    src={STEMMI_CAMPIONATI[league.id]}
                    size={isMobile ? 35 : 40}
                    alt={league.name}
                    cardColor={league.color}
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
                      color: theme.text
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
              background: isMobile ? mobileTheme.bg : theme.bg,
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
                color: theme.text,
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
                    background: theme.cardBg,
                    border: `1px solid ${theme.borderSubtle}`,
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
                    e.currentTarget.style.borderColor = theme.borderSubtle;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* STEMMA COPPA */}
                  <StemmaImg
                    src={STEMMI_COPPE[cup.id]}
                    size={isMobile ? 45 : 55}
                    alt={cup.name}
                    cardColor={cup.color}
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
                      color: theme.text
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
              background: isMobile ? mobileTheme.bg : theme.bg,
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
                color: theme.text,
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
                  background: theme.cardBg,
                  border: `1px solid ${theme.borderSubtle}`,
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
                  e.currentTarget.style.borderColor = theme.borderSubtle;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: isMobile ? '45px' : '55px',
                  height: isMobile ? '45px' : '55px',
                  borderRadius: '12px',
                  background: `${theme.success}26`,
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
                    color: theme.text
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
                  background: theme.cardBg,
                  border: `1px solid ${theme.borderSubtle}`,
                  borderRadius: '12px',
                  padding: isMobile ? '20px' : '25px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.gold;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.borderSubtle;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: isMobile ? '45px' : '55px',
                  height: isMobile ? '45px' : '55px',
                  borderRadius: '12px',
                  background: `${theme.gold}26`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '24px' : '28px',
                  flexShrink: 0
                }}>
                  📖
                </div>
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: theme.gold,
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
                    color: theme.text
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
                  background: theme.cardBg,
                  border: `1px solid ${theme.borderSubtle}`,
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
                  e.currentTarget.style.borderColor = theme.borderSubtle;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: isMobile ? '45px' : '55px',
                  height: isMobile ? '45px' : '55px',
                  borderRadius: '12px',
                  background: `${theme.success}26`,
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
                    color: theme.text
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
            background: theme.panelSolid, border: `1px solid ${theme.purple}4d`,
            borderRadius: isMobile ? '20px 20px 0 0' : '16px',
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            ...(isMobile ? {} : { marginBottom: '30px' })
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${theme.borderSubtle}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/coach-ai-robot.png" alt="" style={{ height: '30px', width: 'auto' }} />
                <div>
                  <div style={{ color: theme.text, fontWeight: 700, fontSize: '14px' }}>Coach AI</div>
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
                    <div style={{ color: theme.text, fontSize: '15px', fontWeight: 700 }}>Ciao! Sono il tuo assistente.</div>
                  </div>
                  <div style={{
                    background: theme.surfaceSubtle, border: `1px solid ${theme.borderSubtle}`,
                    borderRadius: '12px', padding: '14px 16px', lineHeight: '1.7', fontSize: '13px', color: theme.textDim
                  }}>
                    <p style={{ margin: '0 0 10px' }}>
                      Sono qui per rispondere a qualsiasi <strong style={{ color: theme.text }}>curiosit&agrave; sul nostro sistema di pronostici</strong>.
                      Come funzionano gli algoritmi? Cosa significano le stelle? Come vengono calcolate le quote? Chiedimi pure, senza limiti.
                    </p>
                    <p style={{ margin: '0 0 10px' }}>
                      Se invece vuoi <strong style={{ color: theme.purple }}>analizzare una partita specifica</strong> o dialogare sui pronostici del giorno,
                      troverai un altro Coach AI dedicato direttamente dentro la pagina di ogni partita.
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: theme.textDim }}>
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
                      ? { background: `${theme.purple}26`, border: `1px solid ${theme.purple}4d`, color: theme.text }
                      : { background: theme.surfaceSubtle, border: `1px solid ${theme.borderSubtle}`, color: theme.textDim })
                  }}>
                    {msg.isLoading ? (
                      <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
                        {[0,1,2].map(i => (
                          <span key={i} style={{
                            width: '6px', height: '6px', borderRadius: '50%', background: theme.purple,
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
            <div style={{ padding: '6px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: `1px solid ${theme.borderSubtle}` }}>
              {[
                { label: 'Come funziona?', msg: 'Come funziona il sistema di pronostici? Spiegamelo in modo semplice.' },
                { label: 'Cosa sono le stelle?', msg: 'Cosa significano le stelle nei pronostici e come vengono calcolate?' },
                { label: 'Quanti algoritmi ci sono?', msg: 'Quanti algoritmi utilizza il sistema e come lavorano insieme?' }
              ].map(qa => (
                <button key={qa.label} onClick={() => sendCoachMessage(qa.msg)} disabled={coachLoading} style={{
                  background: `${theme.purple}1a`, border: `1px solid ${theme.purple}40`,
                  color: theme.purple, padding: '5px 10px', borderRadius: '15px', fontSize: '11px',
                  cursor: coachLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
                  opacity: coachLoading ? 0.5 : 1, fontFamily: '"Inter", "Segoe UI", sans-serif'
                }}>{qa.label}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', display: 'flex', gap: '8px', borderTop: `1px solid ${theme.borderSubtle}` }}>
              <input
                value={coachInput}
                onChange={e => setCoachInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !coachLoading && sendCoachMessage()}
                placeholder="Chiedi qualsiasi cosa sul sistema..."
                disabled={coachLoading}
                autoComplete="off"
                style={{
                  flex: 1, background: theme.surfaceSubtle, border: `1px solid ${theme.borderSubtle}`,
                  borderRadius: '10px', padding: '10px 14px', color: theme.text, fontSize: '13px',
                  outline: 'none', fontFamily: '"Inter", "Segoe UI", sans-serif',
                  opacity: coachLoading ? 0.5 : 1
                }}
              />
              <button
                onClick={() => sendCoachMessage()}
                disabled={coachLoading || !coachInput.trim()}
                style={{
                  background: `${theme.purple}26`, border: `1px solid ${theme.purple}4d`,
                  borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                  color: theme.purple, fontSize: '16px',
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