// [25/05/2026] Barra shimmer riutilizzabile per stati di caricamento.
// Sostituisce le scritte "Caricamento..." sparse in App, AppDev, ProtectedRoute,
// pagine /pages/*, ecc. Responsive: stessa estetica su desktop e mobile.
//
// Uso tipico:
//   {loading && <ShimmerBar />}                  // inline, larghezza piena
//   {loading && <ShimmerBar fullScreen />}       // centrato a tutta pagina
//
// Props opzionali:
//   - fullScreen: copre tutta la viewport (es. ProtectedRoute prima del login)
//   - width: larghezza CSS (default '60%' max 600px)
//   - color: colore della striscia luminosa (default cyan #22d3ee)

import { getThemeMode } from '../AppDev/costanti';

interface ShimmerBarProps {
  fullScreen?: boolean;
  width?: string;
  color?: string;
}

export default function ShimmerBar({
  fullScreen = false,
  width = '60%',
  color = '#22d3ee',
}: ShimmerBarProps) {
  const isLight = getThemeMode() === 'light';
  const trackBg = isLight ? '#e0e0e0' : 'rgba(255,255,255,0.06)';

  const bar = (
    <div style={{
      height: 2,
      width,
      maxWidth: 600,
      background: trackBg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        height: '100%',
        width: '40%',
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        animation: 'shimmerbar-slide 1.2s ease-in-out infinite',
      }} />
      <style>{`@keyframes shimmerbar-slide { 0% { left: -40%; } 100% { left: 100%; } }`}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isLight ? '#f0f2f5' : '#0a0b0f',
        padding: '0 20px',
      }}>
        {bar}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
      {bar}
    </div>
  );
}
