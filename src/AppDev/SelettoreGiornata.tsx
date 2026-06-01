import { useState } from 'react';
import { getThemeMode } from './costanti';

interface RoundInfo {
  name: string;
  label: string;
  type: 'previous' | 'current' | 'next';
}

interface SelettoreGiornataProps {
  rounds: RoundInfo[];
  allRounds: string[];          // nomi di TUTTE le giornate, ordinate (es. "1.Giornata" ... "30.Giornata")
  currentRound: string | null;  // nome della giornata in corso reale (anchor)
  selectedRound: RoundInfo | null;
  setSelectedRound: (round: RoundInfo) => void;
  hoveredRound: string | null;
  setHoveredRound: (round: string | null) => void;
  isMobile: boolean;
  selectedCup: string;
}

// Estrae il numero da un nome giornata: "12.Giornata" -> "12"
const roundNum = (name: string) => name.replace(/[^0-9]/g, '');

// Etichetta riga: "1 giornata", "2 giornata", ...
const labelGiornata = (name: string): string => {
  const n = roundNum(name);
  return n ? `${n} giornata` : name;
};

export default function SelettoreGiornata({
  rounds,
  allRounds,
  currentRound,
  selectedRound,
  setSelectedRound,
  hoveredRound,
  setHoveredRound,
  isMobile,
  selectedCup
}: SelettoreGiornataProps) {
  const isLight = getThemeMode() === 'light';
  const [showGrid, setShowGrid] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Non mostrare se c'è una coppa selezionata
  if (selectedCup) return null;

  // Colori condivisi (tema chiaro/scuro)
  const accent = isLight ? '#0077cc' : 'rgb(0, 240, 255)';
  const neutralBg = isLight ? '#e2e8f0' : 'rgba(18, 20, 35, 0.9)';
  const neutralBorder = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0, 240, 255, 0.3)';
  const accentText = isLight ? '#fff' : 'rgb(0, 0, 0)';
  const disabledColor = isLight ? '#94a3b8' : 'rgba(255,255,255,0.25)';

  // Griglia — palette sobria: quadratini neutri, si accendono solo su hover/selezione.
  const gridCellBg = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)';
  const gridCellBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const gridCellText = isLight ? '#475569' : 'rgba(255,255,255,0.65)';

  // Fonte di verità: elenco completo. Fallback ai 3 elementi del backend se allRounds è vuoto.
  const all = allRounds.length > 0 ? allRounds : rounds.map(r => r.name);
  const selName = selectedRound?.name ?? null;
  const selIndex = selName ? all.indexOf(selName) : -1;

  // Costruisce un RoundInfo da un nome giornata, marcando 'current' se è la giornata
  // in corso reale (mantiene coerente la logica hash-URL in AppDev.tsx).
  const makeRound = (name: string): RoundInfo => ({
    name,
    label: roundNum(name),
    type: name === currentRound ? 'current' : 'next',
  });

  const goTo = (name: string) => {
    const r = makeRound(name);
    setSelectedRound(r);
    if (r.type === 'current') {
      window.history.replaceState(null, '', '#list');
    } else {
      window.history.pushState(null, '', `#round-${name.replace(/\s/g, '')}`);
    }
  };

  // I tre nomi attorno alla giornata selezionata (relativi). null = oltre i limiti.
  const prevName = selIndex > 0 ? all[selIndex - 1] : null;
  const nextName = selIndex >= 0 && selIndex < all.length - 1 ? all[selIndex + 1] : null;

  // Stile di una capsula in base al suo stato visivo.
  const capsuleStyle = (opts: {
    isSelected: boolean;
    isCurrent: boolean;
    isHovered: boolean;
    disabled: boolean;
  }): React.CSSProperties => {
    const { isSelected, isCurrent, isHovered, disabled } = opts;
    // In-corso vince su selezionato: sfondo pieno. Selezionato (non in-corso): solo bordo.
    const filled = isCurrent;
    return {
      width: isMobile ? 'auto' : '185px',
      minWidth: isMobile ? '90px' : '185px',
      height: isMobile ? '32px' : '38px',
      margin: isMobile ? '0 4px' : '0 20px',
      padding: isMobile ? '0 12px' : '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: disabled ? neutralBg : (filled ? accent : neutralBg),
      borderRadius: '20px',
      border: filled
        ? 'none'
        : `${isSelected ? '2px' : '1px'} solid ${
            disabled
              ? neutralBorder
              : isSelected
                ? accent
                : isHovered
                  ? accent
                  : neutralBorder
          }`,
      cursor: disabled ? 'default' : 'pointer',
      fontWeight: 900,
      fontSize: isMobile ? '11px' : '15px',
      color: disabled ? disabledColor : (filled ? accentText : accent),
      boxShadow: disabled
        ? 'none'
        : filled
          ? (isLight ? '0 0 12px rgba(0,119,204,0.4)' : '0 0 15px rgba(0, 240, 255, 0.6)')
          : (isHovered ? (isLight ? '0 0 8px rgba(0,119,204,0.25)' : '0 0 10px rgba(0, 240, 255, 0.4)') : 'none'),
      transition: 'all 0.3s ease',
      outline: 'none',
      transform: !disabled && isHovered ? 'scale(1.08)' : 'scale(1)',
      opacity: disabled ? 0.6 : 1,
    };
  };

  return (
    <div
      data-tour="selettore-giornata"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px',
        marginTop: '10px',
        width: '100%',
        position: 'relative',
      }}>

      {/* CAPSULA SINISTRA — giornata precedente (relativa). Disabilitata oltre il limite. */}
      <button
        data-tour="giornata-previous"
        disabled={!prevName}
        onClick={() => prevName && goTo(prevName)}
        onMouseEnter={() => prevName && setHoveredRound(prevName)}
        onMouseLeave={() => setHoveredRound(null)}
        style={capsuleStyle({
          isSelected: false,
          isCurrent: false,
          isHovered: !!prevName && hoveredRound === prevName,
          disabled: !prevName,
        })}>
        {prevName ? `< Giornata ${roundNum(prevName)}` : '<'}
      </button>

      {/* CAPSULA CENTRALE — giornata selezionata + apre la griglia calendario al click. */}
      <button
        data-tour="giornata-current"
        aria-label="Apri calendario giornate"
        onClick={() => all.length > 0 && setShowGrid(v => !v)}
        onMouseEnter={() => setHoveredRound('__center__')}
        onMouseLeave={() => setHoveredRound(null)}
        style={{
          ...capsuleStyle({
            isSelected: true,
            isCurrent: selName !== null && selName === currentRound,
            isHovered: hoveredRound === '__center__',
            disabled: false,
          }),
          gap: '8px',
        }}>
        {/* Glifo calendario (SVG, eredita currentColor) */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {selName ? `Giornata ${roundNum(selName)}` : '—'}
      </button>

      {/* CAPSULA DESTRA — giornata successiva (relativa). Disabilitata oltre il limite. */}
      <button
        data-tour="giornata-next"
        disabled={!nextName}
        onClick={() => nextName && goTo(nextName)}
        onMouseEnter={() => nextName && setHoveredRound(nextName)}
        onMouseLeave={() => setHoveredRound(null)}
        style={capsuleStyle({
          isSelected: false,
          isCurrent: false,
          isHovered: !!nextName && hoveredRound === nextName,
          disabled: !nextName,
        })}>
        {nextName ? `Giornata ${roundNum(nextName)} >` : '>'}
      </button>

      {/* GRIGLIA GIORNATE — popover con tutti i numeri. In-corso = sfondo pieno, selezionata = bordo. */}
      {showGrid && all.length > 0 && (
        <>
          {/* Overlay per chiudere cliccando fuori */}
          <div
            onClick={() => setShowGrid(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              width: isMobile ? '80vw' : '240px',
              maxWidth: '92vw',
              background: isLight ? '#ffffff' : 'rgba(14, 16, 30, 0.98)',
              border: `1px solid ${gridCellBorder}`,
              borderRadius: '16px',
              padding: '14px',
              boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.16)' : '0 12px 36px rgba(0,0,0,0.55)',
            }}>
            {/* Titolo */}
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: gridCellText,
                background: isLight
                  ? 'linear-gradient(90deg, rgba(0,119,204,0) 0%, rgba(0,119,204,0.26) 50%, rgba(0,119,204,0) 100%)'
                  : 'linear-gradient(90deg, rgba(0,240,255,0) 0%, rgba(0,240,255,0.28) 50%, rgba(0,240,255,0) 100%)',
                marginBottom: 0,
                marginTop: '-10px',
                minHeight: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: 0,
                borderBottom: `1px solid ${gridCellBorder}`,
                textAlign: 'center',
              }}>
              Giornate
            </div>
            {/* Lista verticale scrollabile (mostra ~6 righe, il resto scorre) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingTop: '12px',
                maxHeight: '282px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}>
              {all.map(name => {
                const isSelected = name === selName;
                const isCurrent = name === currentRound;
                // Su mobile non c'è mouseleave: l'hover resterebbe "appiccicato" alla riga
                // toccata. Disattivo l'evidenziazione hover su mobile.
                const isHover = !isMobile && hoveredCell === name;
                const filled = isCurrent;
                const lit = filled || isSelected || isHover;
                return (
                  <button
                    key={name}
                    onClick={() => { goTo(name); setShowGrid(false); }}
                    onMouseEnter={() => setHoveredCell(name)}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      width: '100%',
                      height: '39px',
                      minHeight: '39px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 14px',
                      background: filled ? accent : gridCellBg,
                      borderRadius: '10px',
                      border: filled
                        ? 'none'
                        : `1px solid ${(isSelected || isHover) ? accent : gridCellBorder}`,
                      cursor: 'pointer',
                      fontWeight: filled || isSelected ? 800 : 600,
                      fontSize: '14px',
                      color: filled ? accentText : (lit ? accent : gridCellText),
                      transition: 'all 0.15s ease',
                      outline: 'none',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                    {labelGiornata(name)}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
