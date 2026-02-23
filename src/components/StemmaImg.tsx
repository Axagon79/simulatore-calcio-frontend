import { getThemeMode } from '../AppDev/costanti';

interface StemmaImgProps {
  src: string;
  size: number;
  alt?: string;
  cardColor?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function StemmaImg({ src, size, alt = '', cardColor, style, onError }: StemmaImgProps) {
  const isLight = getThemeMode() === 'light';
  const handleError = onError || ((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  });

  if (!isLight) {
    return (
      <img src={src} alt={alt} style={{
        width: `${size}px`, height: `${size}px`,
        objectFit: 'contain', flexShrink: 0, ...style
      }} onError={handleError} />
    );
  }

  const borderColor = cardColor || '#64748b';
  const pad = 2;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      padding: `${pad}px ${pad}px ${pad + 2}px ${pad}px`,
      background: `linear-gradient(#94a3b8, #94a3b8), linear-gradient(${borderColor}, ${borderColor})`,
      backgroundClip: 'content-box, padding-box',
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)',
    }}>
      <img src={src} alt={alt} style={{
        width: `${size}px`, height: `${size}px`,
        objectFit: 'contain', display: 'block'
      }} onError={handleError} />
    </div>
  );
}
