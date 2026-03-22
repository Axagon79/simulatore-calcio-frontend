import { getThemeMode } from '../AppDev/costanti';

interface StemmaImgProps {
  src: string;
  size: number;
  alt?: string;
  cardColor?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const isLight = getThemeMode() === 'light';

export default function StemmaImg({ src, size, alt = '', style, onError }: StemmaImgProps) {
  const handleError = onError || ((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  });

  return (
    <img src={src} alt={alt} style={{
      width: `${size}px`, height: `${size}px`,
      objectFit: 'contain', flexShrink: 0,
      ...(isLight ? { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4)) drop-shadow(0 0 2px rgba(0,0,0,0.2))' } : {}),
      ...style
    }} onError={handleError} />
  );
}
