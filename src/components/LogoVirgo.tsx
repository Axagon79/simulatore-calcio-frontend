import { getThemeMode } from '../AppDev/costanti';

interface LogoVirgoProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function LogoVirgo({ size = 24, style }: LogoVirgoProps) {
  const isLight = getThemeMode() === 'light';
  const dotSize = Math.max(3, size * 0.08);
  const g1 = Math.max(4, size * 0.15);
  const g2 = Math.max(6, size * 0.22);
  const g3 = Math.max(10, size * 0.35);
  // Punto colorato sopra la stella
  const starDot = Math.max(4, size * 0.12);

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      verticalAlign: 'middle',
      ...style,
    }}>
      <img
        src="/logo-virgo.webp"
        alt=""
        style={{
          width: size,
          height: size,
          filter: isLight ? 'none' : 'invert(1)',
        }}
      />
      {/* Punto colorato sopra Spica */}
      <div style={{
        position: 'absolute',
        width: starDot,
        height: starDot,
        borderRadius: '50%',
        background: isLight ? '#e6a800' : '#2196f3',
        top: '78.8%',
        left: '62.5%',
        transform: 'translate(-50%, -50%)',
      }} />
      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: 'transparent',
        top: '78.8%',
        left: '62.5%',
        transform: 'translate(-50%, -50%)',
        boxShadow: isLight
          ? `0 0 ${g1}px ${g1 * 0.5}px rgba(255, 210, 60, 0.9), 0 0 ${g2}px ${g2 * 0.5}px rgba(255, 180, 0, 0.5), 0 0 ${g3}px ${g3 * 0.5}px rgba(255, 150, 0, 0.2)`
          : `0 0 ${g1}px ${g1 * 0.5}px rgba(60, 160, 255, 0.9), 0 0 ${g2}px ${g2 * 0.5}px rgba(40, 120, 255, 0.5), 0 0 ${g3}px ${g3 * 0.5}px rgba(30, 100, 255, 0.2)`,
      }} />
    </div>
  );
}
