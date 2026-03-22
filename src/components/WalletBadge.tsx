import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTheme, getThemeMode } from '../AppDev/costanti';

const theme = getTheme();

// Rotte dove il badge NON deve apparire (pagine legali, contatti, ecc.)
const ROUTES_NO_BADGE = new Set([
  '/privacy-policy', '/termini', '/privacy', '/disclaimer', '/contatti',
]);

export default function WalletBadge() {
  const { user, credits, shields } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLight = getThemeMode() === 'light';
  const path = location.pathname;

  // Non mostrare se: non loggato, su rotta con navbar, su rotta esclusa,
  // o su rotta AppDev catchall (qualsiasi path non in lista rotte esplicite)
  const EXPLICIT_ROUTES = [
    '/best-picks', '/wallet', '/step-system', '/money-tracker',
    '/money-management', '/bankroll', '/track-record', '/sistema-c',
    '/analisi-storica', '/simulate', '/prezzi', '/mixer', '/predictions-mixer',
  ];

  const isExplicitRoute = EXPLICIT_ROUTES.some(r => path === r || path.startsWith(r + '/'));

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (!user || !isExplicitRoute || ROUTES_NO_BADGE.has(path) || isMobile) {
    return null;
  }

  return (
    <div
      onClick={() => navigate('/wallet')}
      style={{
        position: 'fixed',
        top: '18px',
        right: '220px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 14px',
        borderRadius: '20px',
        background: isLight
          ? 'rgba(255,255,255,0.92)'
          : 'rgba(15,15,30,0.92)',
        border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(10px)',
        boxShadow: isLight
          ? '0 2px 8px rgba(0,0,0,0.1)'
          : '0 2px 8px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: theme.font,
        fontWeight: 700,
        transition: 'opacity 0.2s',
      }}
    >
      <span style={{ color: theme.textDim }}>
        <span style={{ color: theme.cyan, fontWeight: 700 }}>{credits}</span> crediti
      </span>
      <span style={{ color: theme.textDim }}>
        <span style={{ color: '#f0c040', fontWeight: 700 }}>{shields}</span> Shield
      </span>
    </div>
  );
}
