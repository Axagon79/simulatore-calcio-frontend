import type { Dispatch, SetStateAction, CSSProperties } from 'react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

type ViewState = 'list' | 'pre-match' | 'simulating' | 'settings' | 'result';
type SimMode = 'fast' | 'animated';
type RadarFocus = 'all' | 'home' | 'away';

interface Theme {
  cyan: string;
  purple: string;
  text: string;
  textDim: string;
  success: string;
  danger: string;
  panelBorder: string;
}

interface Match {
  id: string;
  home: string;
  away: string;
  home_id: number;
  away_id: number;
  home_mongo_id?: string;
  away_mongo_id?: string;
  real_score?: string | null;
  match_time: string;
  status: string;
  date_obj: string;
  h2h_data?: any;
  odds?: { [key: string]: any };
}

interface PointTooltip {
  x: number;
  y: number;
  val: number;
  color: string;
}

type Styles = Record<string, CSSProperties>;

// ============================================================
// PROPS INTERFACE
// ============================================================

interface VistaPrePartitaProps {
  theme: Theme;
  styles: Styles;
  isMobile: boolean;
  selectedMatch: Match | null;
  getStemmaLeagueUrl: (mongoId?: string) => string;
  viewState: ViewState;
  setViewState: Dispatch<SetStateAction<ViewState>>;
  simMode: SimMode;
  setSimMode: Dispatch<SetStateAction<SimMode>>;
  isFlashActive: boolean;
  setIsFlashActive: Dispatch<SetStateAction<boolean>>;
  configAlgo: number;
  setConfigAlgo: Dispatch<SetStateAction<number>>;
  customCycles: number;
  setCustomCycles: Dispatch<SetStateAction<number>>;
  radarFocus: RadarFocus;
  setRadarFocus: Dispatch<SetStateAction<RadarFocus>>;
  pointTooltip: PointTooltip | null;
  setPointTooltip: Dispatch<SetStateAction<PointTooltip | null>>;
  startSimulation: (algoOverride?: number | null, cyclesOverride?: number | null) => void;
}

// ============================================================
// COMPONENT
// ============================================================

export default function VistaPrePartita({
  theme,
  styles,
  isMobile,
  selectedMatch,
  getStemmaLeagueUrl,
  viewState,
  setViewState,
  simMode,
  setSimMode,
  isFlashActive,
  setIsFlashActive,
  configAlgo,
  setConfigAlgo,
  customCycles,
  setCustomCycles,
  radarFocus,
  setRadarFocus,
  pointTooltip,
  setPointTooltip,
  startSimulation
}: VistaPrePartitaProps) {

    // --- 1. FUNZIONE COLORI LED ---


    // INCOLLA QUESTE (Dati reali dal DB):
    const homeTrend = selectedMatch?.h2h_data?.lucifero_trend_home || [0, 0, 0, 0, 0];
    const awayTrend = selectedMatch?.h2h_data?.lucifero_trend_away || [0, 0, 0, 0, 0];

    // Calcolo della media dei 5 trend
    const homeAvg = (homeTrend.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1);
    const awayAvg = (awayTrend.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1);

    // Pentagono (5 Assi)
    const homeDNA = selectedMatch?.h2h_data?.h2h_dna?.home_dna;
    const awayDNA = selectedMatch?.h2h_data?.h2h_dna?.away_dna;


    // La mappatura corretta basata sul tuo screenshot
    const homeRadar = [
      homeDNA?.att || 0, // 1. ATT (In alto)
      homeDNA?.tec || 0, // 2. TEC (A destra)
      homeDNA?.def || 0, // 3. DIF (In basso a destra)
      homeDNA?.val || 0, // 4. VAL (In basso a sinistra)
      Number(homeAvg)    // 5. FRM  MEDIA TREND (Forma)
    ];
    const awayRadar = [
      awayDNA?.att || 0, // 1. ATT (In alto)
      awayDNA?.tec || 0, // 2. TEC (A destra) 
      awayDNA?.def || 0, // 3. DIF (In basso a destra)
      awayDNA?.val || 0, // 4. VAL (In basso a sinistra)
      Number(awayAvg)    // 5. FRM  MEDIA TREND (Forma)
    ];

    // --- 2. PSICOLOGIA (AFFIDABILITÀ) ---
    // Usiamo selectedMatch invece di match per evitare l'errore di TypeScript
    const rawHomeAff = selectedMatch?.h2h_data?.affidabilità?.affidabilità_casa || 0;
    const rawAwayAff = selectedMatch?.h2h_data?.affidabilità?.affidabilità_trasferta || 0;

    // Trasformiamo 0-10 in 0-100 per le barre grafiche
    const homeAff = Math.round(rawHomeAff * 10);
    const awayAff = Math.round(rawAwayAff * 10);


    // --- ESTRAZIONE DATI FATTORE CAMPO (Nuova Struttura DB) ---
    // Se il dato esiste nel DB lo usa, altrimenti mette 50% di default
    const factorData = selectedMatch?.h2h_data?.fattore_campo;
    const homeFieldFactor = factorData?.field_home ?? 50;
    const awayFieldFactor = factorData?.field_away ?? 50;



    const getTrendColor = (valore: number) => {
      // SCALA 10 LIVELLI - COLORI SOLIDI E VIVIDI
      if (valore >= 90) return 'rgba(0, 255, 100, 1)';   // Verde Smeraldo
      if (valore >= 80) return 'rgba(0, 255, 0, 1)';     // Verde Puro
      if (valore >= 70) return 'rgba(150, 255, 0, 1)';   // Verde Prato
      if (valore >= 60) return 'rgba(210, 255, 0, 1)';   // Lime
      if (valore >= 50) return 'rgba(255, 255, 0, 1)';   // Giallo
      if (valore >= 40) return 'rgba(255, 200, 0, 1)';   // Arancio Chiaro
      if (valore >= 30) return 'rgba(255, 140, 0, 1)';   // Arancione
      if (valore >= 20) return 'rgba(255, 80, 0, 1)';    // Arancio Scuro
      if (valore >= 10) return 'rgba(255, 30, 0, 1)';    // Rosso Vivo
      return 'rgba(255, 0, 0, 1)';                       // Rosso Assoluto
    };

    // --- 2. HELPER GRAFICI ---

    const drawPentagramRadar = (stats: number[], color: string) => {
      const center = 60;
      const radius = 45;
      const totalPoints = 5;

      // Calcolo coordinate
      const pointsData = stats.map((v, i) => {
        const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
        const x = center + (v / 100) * radius * Math.cos(angle);
        const y = center + (v / 100) * radius * Math.sin(angle);
        return { x, y, val: v };
      });

      const pointsString = pointsData.map(p => `${p.x},${p.y}`).join(' ');

      return (
        <g>
          {/* IL POLIGONO DI SFONDO */}
          <polygon
            points={pointsString}
            fill={color}
            fillOpacity={radarFocus === 'all' ? 0.4 : 0.6}
            stroke={color}
            strokeWidth="1"
            // MODIFICA FONDAMENTALE: Ignora il mouse sul colore pieno, così non blocca le punte sotto
            style={{ transition: 'all 0.3s ease', pointerEvents: 'none' }}
          />

          {/* PUNTI INTERATTIVI (Cerchi Invisibili) */}
          {pointsData.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3} // <--- MODIFICA QUI: Ridotto da 8 a 3.5 per massima precisione
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setPointTooltip({ x: p.x, y: p.y, val: p.val, color: color })}
              onMouseLeave={() => setPointTooltip(null)}
            />
          ))}

          {/* PALLINI VISIBILI (Decorazione) */}
          {pointsData.map((p, i) => (
            <circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={1.5}
              fill={color}
              pointerEvents="none" // Importante: non deve interferire col mouse
            />
          ))}
        </g>
      );
    };

    const drawPentagonGrid = (radius: number, opacity: number) => {
      const center = 60;
      const totalPoints = 5;
      const points = Array.from({ length: totalPoints }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
        return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
      }).join(' ');
      return <polygon points={points} fill="none" stroke="#444" strokeWidth="0.5" strokeOpacity={opacity} />;
    };

    const drawPentagonAxes = () => {
      const center = 60; const radius = 45; const totalPoints = 5;
      return Array.from({ length: totalPoints }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
        const x2 = center + radius * Math.cos(angle);
        const y2 = center + radius * Math.sin(angle);
        return <line key={i} x1={center} y1={center} x2={x2} y2={y2} stroke="#444" strokeWidth="0.5" />;
      });
    };

    // --- 3. RENDER ---
    return (
      <div style={styles.arenaContent}>

        {/* HEADER - SIMMETRIA ASSOLUTA PRO */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          marginBottom: '30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '8px',
          paddingTop: isMobile ? '0' : '25px',
          position: 'relative'
        }}>

          {/* 1. SINISTRA: Tasto Indietro (Bilanciato con il lato destro del monitor) */}
          <div style={{ width: isMobile ? '100%' : '200px', display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', zIndex: 10 }}>
            <button
              onClick={() => setViewState('list')}
              style={{
                height: '35px',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                color: '#00f0ff',
                padding: '0 16px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase'
              }}
            >
              <span>←</span> Lista
            </button>
          </div>

          {/* 2. BLOCCO CENTRALE ASSOLUTO (Ancorato al centro dello schermo) */}
          <div style={{
            position: isMobile ? 'static' : 'absolute',
            left: '50%',
            transform: isMobile ? 'none' : 'translateX(-50%)', // Centratura matematica perfetta rispetto allo schermo
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '15px' : '30px',
            pointerEvents: 'none',
            width: isMobile ? '100%' : 'auto'
          }}>

            {/* A. BOX DATA (Larghezza fissa per non sbilanciare) */}
            <div style={{
              width: isMobile ? 'auto' : '110px', // FISSO per simmetria con il Risultato
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(111, 149, 170, 0.1)',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '15px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.6)',
              order: isMobile ? 2 : 1,
              pointerEvents: 'auto'
            }}>
              <span style={{ fontFamily: 'monospace' }}>{(selectedMatch as any).date_obj ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '27/12'}</span>
              <span style={{ opacity: 0.2 }}>|</span>
              <span style={{ fontFamily: 'monospace' }}>{(selectedMatch as any).match_time || '18:00'}</span>
            </div>

            {/* B. NOMI SQUADRE (Il perno centrale) */}
            <div style={{
              order: isMobile ? 1 : 2,
              position: 'relative',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Analysis Core */}
              <div style={{
                position: isMobile ? 'static' : 'absolute',
                top: isMobile ? '0' : '-22px',
                fontSize: '10px',
                marginTop: isMobile ? '10px' : '0',
                color: theme.cyan,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                opacity: 0.8,
                whiteSpace: 'nowrap'
              }}>
                Analysis Core
              </div>

              {/* GRID DI SIMMETRIA SPECCHIATA (Con Stemmi) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '125px 35px 125px' : '250px 50px 250px', // DUE BLOCCHI IDENTICI
                alignItems: 'center',
                fontSize: isMobile ? '15px' : '25px',
                fontWeight: '900',
                color: '#fff',
                lineHeight: '35px'
              }}>
                
                {/* 1. CASA - Allineata a destra verso il VS (Testo + Stemma) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'flex-end' : 'center', // Mobile: spinge a destra | Desktop: centra
                  gap: '8px', // Spazio tra nome e stemma
                  overflow: 'hidden',
                  width: '100%'
                }}>
                  {/* Nome Squadra */}
                  <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                  }}>
                    {selectedMatch?.home}
                  </span>

                  {/* Stemma Casa */}
                  <img 
                      src={getStemmaLeagueUrl((selectedMatch as any)?.home_mongo_id)} 
                      alt=""
                      style={{ 
                          width: isMobile ? '22px' : '32px', 
                          height: isMobile ? '22px' : '32px', 
                          objectFit: 'contain',
                          flexShrink: 0 
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>

                {/* 2. VS - IL CENTRO ASSOLUTO */}
                <div style={{
                  textAlign: 'center',
                  color: theme.textDim,
                  fontSize: '16px',
                  fontWeight: '400',
                  textTransform: 'lowercase',
                }}>
                  vs
                </div>

                {/* 3. OSPITE - Allineata a sinistra verso il VS (Stemma + Testo) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'flex-start' : 'center', // Mobile: spinge a sinistra | Desktop: centra
                  gap: '8px', // Spazio tra stemma e nome
                  overflow: 'hidden',
                  width: '100%'
                }}>
                  {/* Stemma Ospite */}
                  <img 
                      src={getStemmaLeagueUrl((selectedMatch as any)?.away_mongo_id)} 
                      alt=""
                      style={{ 
                          width: isMobile ? '22px' : '32px', 
                          height: isMobile ? '22px' : '32px', 
                          objectFit: 'contain',
                          flexShrink: 0 
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />

                  {/* Nome Squadra */}
                  <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                  }}>
                    {selectedMatch?.away}
                  </span>
                </div>
              </div>
            </div>

            {/* C. BOX RISULTATO (Larghezza fissa identica alla Data) */}
            <div style={{
              width: isMobile ? '75px' : '130px', // FISSO come la Data per bilanciare il VS al centro
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              fontSize: '19px',
              fontWeight: '900',
              background: selectedMatch?.real_score ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedMatch?.real_score ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
              border: selectedMatch?.real_score ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              order: 3,
              pointerEvents: 'auto',
              fontFamily: 'monospace'
            }}>
              {selectedMatch?.real_score ? selectedMatch.real_score : "- : -"}
            </div>
          </div>

          {/* BILANCIAMENTO DESTRA (Invisibile) */}
          <div style={{ width: isMobile ? '0' : '200px' }}></div>
        </div>

        {/* === GRIGLIA PRINCIPALE === */}
        <div className="dashboard-main-grid">

          {/* === COLONNA SINISTRA: DATI VISIVI (5 CARD VERTICALI) === */}
          <div className="colonna-sinistra-analisi">

            {/* A1. LUCIFERO POWER */}
            <div className="card-forma" style={styles.card}>
              <div className="header-title">⚡ FORMA A.L.1 INDEX</div>
              <div className="content-container">

                {/* --- LOGICA COLORI AVANZATA --- */}
                {(() => {
                  // 1. Recupero valori (0-25)
                  const valHome = Number(selectedMatch?.h2h_data?.lucifero_home || 0);
                  const valAway = Number(selectedMatch?.h2h_data?.lucifero_away || 0);

                  // 2. Converto in % (0-100) per la larghezza della barra
                  const pctHome = Math.min((valHome / 25) * 100, 100);
                  const pctAway = Math.min((valAway / 25) * 100, 100);

                  // 3. I TUOI 10 COLORI (Ordinati da 0% a 100% -> Rosso -> Verde)
                  // Ho copiato esattamente i tuoi rgba, messi in ordine progressivo
                  const fullScaleGradient = `linear-gradient(90deg, 
                                rgba(255, 0, 0, 1) 0%,      /* Rosso Assoluto */
                                rgba(255, 30, 0, 1) 11%,    /* Rosso Vivo */
                                rgba(255, 80, 0, 1) 22%,    /* Arancio Scuro */
                                rgba(255, 140, 0, 1) 33%,   /* Arancione */
                                rgba(255, 200, 0, 1) 44%,   /* Arancio Chiaro */
                                rgba(255, 255, 0, 1) 55%,   /* Giallo */
                                rgba(210, 255, 0, 1) 66%,   /* Lime */
                                rgba(150, 255, 0, 1) 77%,   /* Verde Prato */
                                rgba(0, 255, 0, 1) 88%,     /* Verde Puro */
                                rgba(0, 255, 100, 1) 100%   /* Verde Smeraldo */
                            )`;

                  // 4. Calcolo il colore della "Punta" per il testo e l'ombra neon
                  const colHome = getTrendColor(pctHome);
                  const colAway = getTrendColor(pctAway);

                  const shadowHome = colHome.replace(', 1)', ', 0.2)');
                  const shadowAway = colAway.replace(', 1)', ', 0.2)');

                  return (
                    <>
                      {/* SQUADRA CASA */}
                      <div className="team-row">
                        <div className="team-name">{selectedMatch?.home}</div>
                        <div
                          className="team-value"
                          style={{
                            color: colHome,
                            textShadow: `0 0 10px ${shadowHome}`,
                            fontWeight: 'bold'
                          }}
                        >
                          {valHome.toFixed(1)}
                        </div>
                      </div>
                      <div className="progress-bar-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                        <div className="progress-bar home" style={{
                          width: `${pctHome}%`,
                          height: '100%',
                          borderRadius: '3px',
                          // APPLICO IL GRADIENTE COMPLETO
                          backgroundImage: fullScaleGradient,
                          // TRUCCO: La dimensione dello sfondo è inversa alla larghezza.
                          // Se la barra è al 50%, lo sfondo è al 200% (così vedo solo metà arcobaleno).
                          backgroundSize: `${pctHome > 0 ? (10000 / pctHome) : 100}% 100%`,
                          boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadowHome}`
                        }} />
                      </div>

                      {/* SQUADRA OSPITE */}
                      <div className="away-section" style={{ marginTop: '10px' }}>
                        <div className="team-row">
                          <div className="team-name">{selectedMatch?.away}</div>
                          <div
                            className="team-value"
                            style={{
                              color: colAway,
                              textShadow: `0 0 10px ${shadowAway}`,
                              fontWeight: 'bold'
                            }}
                          >
                            {valAway.toFixed(1)}
                          </div>
                        </div>
                        <div className="progress-bar-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{
                            width: `${pctAway}%`,
                            height: '100%',
                            borderRadius: '3px',
                            // APPLICO IL GRADIENTE COMPLETO
                            backgroundImage: fullScaleGradient,
                            // TRUCCO BACKGROUND SIZE
                            backgroundSize: `${pctAway > 0 ? (10000 / pctAway) : 100}% 100%`,
                            boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadowAway}`
                          }} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* A2. TREND INERZIA */}
            <div className="card-trend" style={styles.card}>
              <div className="header-container">
                <span className="header-title">📈 TREND INERZIA M.L.5 INDEX</span>
                <span className="header-arrow">⟶</span>
              </div>

              <div className="teams-container">

                {/* --- LOGICA VISIVA AVANZATA --- */}
                {(() => {
                  // 1. Definisco il Gradiente completo (10 Colori)
                  const fullScaleGradient = `linear-gradient(90deg, 
                                rgba(255, 0, 0, 1) 0%,      /* Rosso Assoluto */
                                rgba(255, 30, 0, 1) 11%,    /* Rosso Vivo */
                                rgba(255, 80, 0, 1) 22%,    /* Arancio Scuro */
                                rgba(255, 140, 0, 1) 33%,   /* Arancione */
                                rgba(255, 200, 0, 1) 44%,   /* Arancio Chiaro */
                                rgba(255, 255, 0, 1) 55%,   /* Giallo */
                                rgba(210, 255, 0, 1) 66%,   /* Lime */
                                rgba(150, 255, 0, 1) 77%,   /* Verde Prato */
                                rgba(0, 255, 0, 1) 88%,     /* Verde Puro */
                                rgba(0, 255, 100, 1) 100%   /* Verde Smeraldo */
                            )`;

                  // 2. Preparo i colori per CASA
                  const valHome = Number(homeAvg);
                  const colHome = getTrendColor(valHome);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');

                  // 3. Preparo i colori per OSPITE
                  const valAway = Number(awayAvg);
                  const colAway = getTrendColor(valAway);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');

                  return (
                    <>
                      {/* --- RIGA SQUADRA CASA --- */}
                      <div className="team-row">
                        <div className="team-left-section">
                          <span className="team-name">{selectedMatch?.home}</span>
                          <div className="avg-container">
                            {/* VALORE NEON */}
                            <span className="avg-value" style={{
                              color: colHome,
                              textShadow: `0 0 8px ${shadHome}`,
                              fontWeight: 'bold'
                            }}>
                              {homeAvg}%
                            </span>
                            {/* BARRA SOTTILE CON GRADIENTE MASCHERATO */}
                            <div className="avg-progress-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                              <div className="avg-progress-bar" style={{
                                width: `${valHome}%`,
                                height: '100%',
                                borderRadius: '3px',
                                backgroundImage: fullScaleGradient,
                                backgroundSize: `${valHome > 0 ? (10000 / valHome) : 100}% 100%`,
                                boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`
                              }} />
                            </div>
                          </div>
                        </div>
                        {/* BOX QUADRATINI (Restano solidi ma con ombra soft) */}
                        <div className="trend-right-section">
                          <div className="trend-boxes-container">
                            {[...homeTrend].reverse().map((val: number, i: number) => {
                              const boxCol = getTrendColor(val);
                              return (
                                <div key={i} className="trend-box" style={{
                                  background: boxCol,
                                  boxShadow: `0 0 8px ${boxCol.replace(', 1)', ', 0.5)')}`
                                }}>
                                  <span className="trend-box-value">{Math.round(val)}%</span>
                                </div>
                              );
                            })}
                          </div>
                          <span className="trend-arrow" style={{
                            color: getTrendColor(homeTrend[0]),
                            textShadow: `0 0 8px ${getTrendColor(homeTrend[0]).replace(', 1)', ', 0.5)')}`
                          }}>⟶</span>
                        </div>
                      </div>

                      {/* --- RIGA SQUADRA OSPITE --- */}
                      <div className="team-row">
                        <div className="team-left-section">
                          <span className="team-name">{selectedMatch?.away}</span>
                          <div className="avg-container">
                            {/* VALORE NEON */}
                            <span className="avg-value" style={{
                              color: colAway,
                              textShadow: `0 0 8px ${shadAway}`,
                              fontWeight: 'bold'
                            }}>
                              {awayAvg}%
                            </span>
                            {/* BARRA SOTTILE CON GRADIENTE MASCHERATO */}
                            <div className="avg-progress-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                              <div className="avg-progress-bar" style={{
                                width: `${valAway}%`,
                                height: '100%',
                                borderRadius: '3px',
                                backgroundImage: fullScaleGradient,
                                backgroundSize: `${valAway > 0 ? (10000 / valAway) : 100}% 100%`,
                                boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`
                              }} />
                            </div>
                          </div>
                        </div>
                        {/* BOX QUADRATINI */}
                        <div className="trend-right-section">
                          <div className="trend-boxes-container">
                            {[...awayTrend].reverse().map((val: number, i: number) => {
                              const boxCol = getTrendColor(val);
                              return (
                                <div key={i} className="trend-box" style={{
                                  background: boxCol,
                                  boxShadow: `0 0 8px ${boxCol.replace(', 1)', ', 0.2)')}`
                                }}>
                                  <span className="trend-box-value">{Math.round(val)}%</span>
                                </div>
                              );
                            })}
                          </div>
                          <span className="trend-arrow" style={{
                            color: getTrendColor(awayTrend[0]),
                            textShadow: `0 0 8px ${getTrendColor(awayTrend[0]).replace(', 1)', ', 0.2)')}`
                          }}>⟶</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* A3. SEZIONE STORIA */}
            <div className="card-storia" style={{ ...styles.card, padding: '15px' }}>
              <div className="header-title" style={{ fontSize: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚖️</span> STORIA (PRECEDENTI)
              </div>

              <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* --- LOGICA VISIVA AVANZATA --- */}
                {(() => {
                  // 1. Definisco il Gradiente completo (10 Colori)
                  const fullScaleGradient = `linear-gradient(90deg, 
                                rgba(255, 0, 0, 1) 0%,      /* Rosso Assoluto */
                                rgba(255, 30, 0, 1) 11%,    /* Rosso Vivo */
                                rgba(255, 80, 0, 1) 22%,    /* Arancio Scuro */
                                rgba(255, 140, 0, 1) 33%,   /* Arancione */
                                rgba(255, 200, 0, 1) 44%,   /* Arancio Chiaro */
                                rgba(255, 255, 0, 1) 55%,   /* Giallo */
                                rgba(210, 255, 0, 1) 66%,   /* Lime */
                                rgba(150, 255, 0, 1) 77%,   /* Verde Prato */
                                rgba(0, 255, 0, 1) 88%,     /* Verde Puro */
                                rgba(0, 255, 100, 1) 100%   /* Verde Smeraldo */
                            )`;

                  // 2. Calcolo Percentuali (Score 0-10 -> 0-100%)
                  const scoreHome = (selectedMatch?.h2h_data?.home_score || 0) * 10;
                  const scoreAway = (selectedMatch?.h2h_data?.away_score || 0) * 10;

                  const pctHome = Math.min(scoreHome, 100);
                  const pctAway = Math.min(scoreAway, 100);

                  // 3. Calcolo Colori Punta
                  const colHome = getTrendColor(pctHome);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');

                  const colAway = getTrendColor(pctAway);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');

                  return (
                    <>
                      {/* SQUADRA CASA */}
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="team-name" style={{ flex: '1', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                          {selectedMatch?.home}
                        </span>
                        <div className="progress-bar-container" style={{ flex: '2', height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                          <div
                            className="progress-bar home"
                            style={{
                              width: `${pctHome}%`,
                              height: '100%',
                              borderRadius: '3px',
                              backgroundImage: fullScaleGradient,
                              backgroundSize: `${pctHome > 0 ? (10000 / pctHome) : 100}% 100%`,
                              boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`,
                              transition: 'width 0.5s ease-out'
                            }}
                          />
                        </div>
                        <span className="team-percentage home" style={{
                          minWidth: '35px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: colHome,
                          textShadow: `0 0 8px ${shadHome}`,
                          textAlign: 'right'
                        }}>
                          {Math.round(scoreHome)}%
                        </span>
                      </div>

                      {/* SQUADRA TRASFERTA */}
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="team-name" style={{ flex: '1', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                          {selectedMatch?.away}
                        </span>
                        <div className="progress-bar-container" style={{ flex: '2', height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                          <div
                            className="progress-bar away"
                            style={{
                              width: `${pctAway}%`,
                              height: '100%',
                              borderRadius: '3px',
                              backgroundImage: fullScaleGradient,
                              backgroundSize: `${pctAway > 0 ? (10000 / pctAway) : 100}% 100%`,
                              boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`,
                              transition: 'width 0.5s ease-out'
                            }}
                          />
                        </div>
                        <span className="team-percentage away" style={{
                          minWidth: '35px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: colAway,
                          textShadow: `0 0 8px ${shadAway}`,
                          textAlign: 'right'
                        }}>
                          {Math.round(scoreAway)}%
                        </span>
                      </div>
                    </>
                  );
                })()}



                {/* RIASSUNTO STORICO STILIZZATO */}
                {selectedMatch?.h2h_data?.history_summary && (
                  <div className="history-summary-box" style={{
                    marginTop: '8px',
                    padding: '5px 12px',
                    backgroundColor: 'rgba(82, 64, 117, 0.16)',
                    borderRadius: '6px',
                    borderLeft: `2px solid rgba(32, 238, 245, 0.6)`,
                    borderRight: `2px solid rgba(32, 238, 245, 0.6)`,
                    fontSize: '12px',
                    color: 'rgb(201, 250, 252)',
                    fontStyle: 'italic',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    {selectedMatch.h2h_data.history_summary}
                  </div>
                )}
              </div>
            </div>

            {/* A4. SEZIONE CAMPO */}
            <div className="card-campo" style={styles.card}>
              <div className="header-title">🏟️ CAMPO (Fattore Stadio)</div>
              <div className="content-container">

                {/* --- LOGICA VISIVA AVANZATA (GRADIENTE + NEON) --- */}
                {(() => {
                  // 1. Definisco il Gradiente completo (10 Colori)
                  const fullScaleGradient = `linear-gradient(90deg, 
                                rgba(255, 0, 0, 1) 0%,      /* Rosso Assoluto */
                                rgba(255, 30, 0, 1) 11%,    /* Rosso Vivo */
                                rgba(255, 80, 0, 1) 22%,    /* Arancio Scuro */
                                rgba(255, 140, 0, 1) 33%,   /* Arancione */
                                rgba(255, 200, 0, 1) 44%,   /* Arancio Chiaro */
                                rgba(255, 255, 0, 1) 55%,   /* Giallo */
                                rgba(210, 255, 0, 1) 66%,   /* Lime */
                                rgba(150, 255, 0, 1) 77%,   /* Verde Prato */
                                rgba(0, 255, 0, 1) 88%,     /* Verde Puro */
                                rgba(0, 255, 100, 1) 100%   /* Verde Smeraldo */
                            )`;

                  // 2. Calcolo Colori per la "Punta" (Testo e Ombra)
                  // homeFieldFactor e awayFieldFactor sono già calcolati fuori (0-100)
                  const colHome = getTrendColor(homeFieldFactor);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');

                  const colAway = getTrendColor(awayFieldFactor);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');

                  return (
                    <>
                      {/* Riga SQUADRA CASA */}
                      <div className="team-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.home}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div
                            className="progress-bar home"
                            style={{
                              width: `${homeFieldFactor}%`,
                              height: '100%',
                              borderRadius: '3px',
                              // GRADIENTE MASCHERATO
                              backgroundImage: fullScaleGradient,
                              backgroundSize: `${homeFieldFactor > 0 ? (10000 / homeFieldFactor) : 100}% 100%`,
                              // NEON
                              boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`,
                              transition: 'width 0.5s ease-in-out'
                            }}
                          />
                        </div>
                        <span className="team-percentage home" style={{
                          width: '40px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: colHome,
                          textShadow: `0 0 8px ${shadHome}`
                        }}>
                          {homeFieldFactor}%
                        </span>
                      </div>

                      {/* Riga SQUADRA OSPITE */}
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.away}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div
                            className="progress-bar away"
                            style={{
                              width: `${awayFieldFactor}%`,
                              height: '100%',
                              borderRadius: '3px',
                              // GRADIENTE MASCHERATO
                              backgroundImage: fullScaleGradient,
                              backgroundSize: `${awayFieldFactor > 0 ? (10000 / awayFieldFactor) : 100}% 100%`,
                              // NEON
                              boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`,
                              transition: 'width 0.5s ease-in-out'
                            }}
                          />
                        </div>
                        <span className="team-percentage away" style={{
                          width: '40px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: colAway,
                          textShadow: `0 0 8px ${shadAway}`
                        }}>
                          {awayFieldFactor}%
                        </span>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>

            {/* A5. SEZIONE AFFIDABILITÀ */}
            <div className="card-affidabilita" style={styles.card}>
              <div className="header-title">🧠 AFFIDABILITÀ (Stabilità)</div>
              <div className="content-container">

                {/* --- LOGICA VISIVA AVANZATA (GRADIENTE + NEON) --- */}
                {(() => {
                  // 1. Definisco il Gradiente completo (10 Colori)
                  const fullScaleGradient = `linear-gradient(90deg, 
                              rgba(255, 0, 0, 1) 0%,      /* Rosso Assoluto */
                              rgba(255, 30, 0, 1) 11%,    /* Rosso Vivo */
                              rgba(255, 80, 0, 1) 22%,    /* Arancio Scuro */
                              rgba(255, 140, 0, 1) 33%,   /* Arancione */
                              rgba(255, 200, 0, 1) 44%,   /* Arancio Chiaro */
                              rgba(255, 255, 0, 1) 55%,   /* Giallo */
                              rgba(210, 255, 0, 1) 66%,   /* Lime */
                              rgba(150, 255, 0, 1) 77%,   /* Verde Prato */
                              rgba(0, 255, 0, 1) 88%,     /* Verde Puro */
                              rgba(0, 255, 100, 1) 100%   /* Verde Smeraldo */
                          )`;

                  // 2. Preparo i valori (Safety check per evitare NaN)
                  const valHome = Number(homeAff || 0);
                  const valAway = Number(awayAff || 0);

                  // 3. Calcolo Colori Punta
                  const colHome = getTrendColor(valHome);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');

                  const colAway = getTrendColor(valAway);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');

                  return (
                    <>
                      {/* Riga SQUADRA CASA */}
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.home}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div
                            className="progress-bar home"
                            style={{
                              width: `${valHome}%`,
                              height: '100%',
                              borderRadius: '3px',
                              // GRADIENTE MASCHERATO
                              backgroundImage: fullScaleGradient,
                              backgroundSize: `${valHome > 0 ? (10000 / valHome) : 100}% 100%`,
                              // NEON
                              boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`,
                              transition: 'width 0.5s ease-in-out'
                            }}
                          />
                        </div>
                        <span className="team-percentage home" style={{
                          width: '40px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: colHome,
                          textShadow: `0 0 8px ${shadHome}`
                        }}>
                          {valHome}%
                        </span>
                      </div>

                      {/* Riga SQUADRA OSPITE */}
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.away}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div
                            className="progress-bar away"
                            style={{
                              width: `${valAway}%`,
                              height: '100%',
                              borderRadius: '3px',
                              // GRADIENTE MASCHERATO
                              backgroundImage: fullScaleGradient,
                              backgroundSize: `${valAway > 0 ? (10000 / valAway) : 100}% 100%`,
                              // NEON
                              boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`,
                              transition: 'width 0.5s ease-in-out'
                            }}
                          />
                        </div>
                        <span className="team-percentage away" style={{
                          width: '40px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: colAway,
                          textShadow: `0 0 8px ${shadAway}`
                        }}>
                          {valAway}%
                        </span>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>
          </div>

          {/* === COLONNA DESTRA: ANALISI COMPETITIVA VALORI CORE === */}
          <div className="colonna-destra-analisi">

            {/* 1. BIAS C.O.R.E. */}
            <div className="card-bias-core" style={styles.card}>
              <div className="title-center">
                <span>BIAS C.O.R.E.</span>
              </div>

              <div className="subsection-container">
                <div className="classification-section">
                  <span className="classification-text" style={{
                    color: selectedMatch?.h2h_data?.classification === 'PURO' ? '#00ff88' :
                      selectedMatch?.h2h_data?.classification === 'SEMI' ? '#ffd000' : '#ff4444'
                  }}>
                    {selectedMatch?.h2h_data?.classification === 'PURO' ? '💎 FLUSSO COERENTE' :
                      selectedMatch?.h2h_data?.classification === 'SEMI' ? '⚖️ FLUSSO INSTABILE' : '⚠️ FLUSSO DISCORDANTE'}
                  </span>
                </div>
                <div className="integrity-section">
                  <div className="integrity-label">INTEGRITÀ DEL FLUSSO</div>
                  <span className="integrity-value" style={{
                    color: selectedMatch?.h2h_data?.is_linear ? '#00ff88' : '#ff4444'
                  }}>
                    {selectedMatch?.h2h_data?.is_linear ? '✅ SINCRONIZZATO' : '❌ FUORI SINCRO'}
                  </span>
                </div>
              </div>

              <div className="protocol-box">
                <div className="protocol-label">PROTOCOLLO OPERATIVO</div>
                <div className="protocol-value">
                  {!selectedMatch?.h2h_data?.is_linear ? (
                    <span style={{ color: '#ffcc00' }}>⚠️ B.T.R.:&nbsp;&nbsp; {selectedMatch?.h2h_data?.tip_market}</span>
                  ) : selectedMatch?.h2h_data?.classification === 'NON_BVS' ? (
                    <span style={{ color: '#ff4444' }}>⛔ B.T.R.:&nbsp;&nbsp; {selectedMatch?.h2h_data?.tip_market}</span>
                  ) : (
                    <span style={{
                      background: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) >= 0
                        ? 'linear-gradient(90deg, rgba(200, 255, 0, 0.8), rgba(255, 255, 0, 1), rgba(173, 255, 47, 1), rgb(51, 255, 0))'
                        : 'linear-gradient(270deg, rgba(217, 255, 0, 0.8), rgba(255, 165, 0, 1), rgba(255, 69, 0, 1), rgb(241, 0, 0))',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      filter: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) >= 0 ? 'drop-shadow(0 0 5px rgba(0, 255, 136, 0.4))' : 'drop-shadow(0 0 5px rgba(255, 68, 68, 0.4))',
                      display: 'inline-block'
                    }}>
                      🎯 B.T.R. :&nbsp;&nbsp; {selectedMatch?.h2h_data?.tip_market}
                    </span>
                  )}
                </div>
              </div>

              <div className="rating-section">
                <div className="rating-header">
                  <div className="rating-title-row">
                    <span className="rating-title">RATING DI COERENZA</span>
                    <span className="rating-value" style={{
                      color: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) > 0 ? 'rgba(0, 255, 136, 1)' : Number(selectedMatch?.h2h_data?.bvs_match_index || 0) < 0 ? 'rgba(255, 68, 68, 1)' : 'white',
                      textShadow: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) > 0 ? '0 0 10px rgba(0, 255, 136, 0.5)' : Number(selectedMatch?.h2h_data?.bvs_match_index || 0) < 0 ? '0 0 10px rgba(255, 68, 68, 0.5)' : 'none'
                    }}>{Number(selectedMatch?.h2h_data?.bvs_match_index || 0).toFixed(2)}</span>
                  </div>
                  <div className="rating-bar-container">
                    <div className="rating-bar-center-line" />
                    <div className="rating-bar" style={{
                      left: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) >= 0 ? '46.15%' : 'auto',
                      right: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) < 0 ? '53.85%' : 'auto',
                      width: `${(Math.abs(Number(selectedMatch?.h2h_data?.bvs_match_index || 0)) / 13) * 100}%`,
                      background: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) >= 0
                        ? 'linear-gradient(90deg, rgba(200, 255, 0, 0.4), rgba(255, 255, 0, 1), rgba(173, 255, 47, 1), rgb(51, 255, 0))'
                        : 'linear-gradient(270deg, rgba(217, 255, 0, 0.4), rgba(255, 165, 0, 1), rgba(255, 69, 0, 1), rgb(241, 0, 0))',
                      boxShadow: Number(selectedMatch?.h2h_data?.bvs_match_index || 0) > 0 ? '0 0 10px rgba(51, 255, 0, 0.6)' : Number(selectedMatch?.h2h_data?.bvs_match_index || 0) < 0 ? '0 0 10px rgba(241, 0, 0, 0.6)' : 'none'
                    }} />
                  </div>
                  <div className="rating-labels">
                    <span className="rating-label-weak">-6.0 (WEAK)</span>
                    <span className="rating-label-neutral">0.0</span>
                    <span className="rating-label-strong">+7.0 (STRONG)</span>
                  </div>
                </div>

                <div className="teams-grid">
                  <div className="team-item">
                    <div className="team-item-header">
                      <div className="team-item-name">{selectedMatch?.home}</div>
                      <div className="team-item-value">{selectedMatch?.h2h_data?.bvs_index || '0.0'}</div>
                    </div>
                    <div className="team-item-bar-container">
                      <div className="team-item-bar" style={{
                        width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_index || 0) + 6) / 13) * 100, 0), 100)}%`,
                        background: Number(selectedMatch?.h2h_data?.bvs_index || 0) > 0 ? theme.success : theme.danger
                      }} />
                    </div>
                  </div>
                  <div className="team-item">
                    <div className="team-item-header">
                      <div className="team-item-name">{selectedMatch?.away}</div>
                      <div className="team-item-value">{selectedMatch?.h2h_data?.bvs_away || '0.0'}</div>
                    </div>
                    <div className="team-item-bar-container">
                      <div className="team-item-bar" style={{
                        width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_away || 0) + 6) / 13) * 100, 0), 100)}%`,
                        background: Number(selectedMatch?.h2h_data?.bvs_away || 0) > 0 ? theme.success : theme.danger
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="odds-section">
                {['1', 'X', '2'].map((q) => (
                  <div key={q} className="odds-item">
                    <div className="odds-label">{q}</div>
                    <div className="odds-value">
                      {selectedMatch?.odds?.[q] ? Number(selectedMatch.odds[q]).toFixed(2) : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. RIGA ORIZZONTALE BOTTOM (DNA E CONFIGURAZIONE AFFIANCATI) */}
            <div className="riga-orizzontale-bottom">

              {/* DNA SYSTEM */}
                <div className="card-dna" style={{ 
                  ...styles.card, 
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 240, 255, 0.1)', 
                  marginTop: '-20px', 
                  position: 'relative', 
                  overflow: 'hidden' 
                }}>
                  <div className="header-section" style={{ 
                    marginBottom: isMobile ? '20px' : '-15px',
                    marginTop: isMobile ? '15px' : '15px', 
                    position: 'relative',
                    height: isMobile ? '70px' : '90px',
                    paddingTop: isMobile ? '30px' : '30px'
                  }}>
                    <div className="header-title" style={{
                      fontSize: '10px',
                      opacity: 0.8,
                      position: isMobile ? 'absolute' : 'relative',
                      top: isMobile ? '-20px' : '20',
                      left: isMobile ? '-5px' : '0',
                      right: isMobile ? '12px' : 'auto',
                      marginTop: isMobile ? '0' : '5px',
                      zIndex: 10
                    }}>
                      🕸️ DNA SYSTEM
                    </div>
                  


                  {/* Container Legenda - Altezza fissa per non spingere il grafico */}
                  {/* Container Legenda INTERATTIVA */}
                  <div className="legend-container" style={{ display: 'flex', gap: '20px', height: '30px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>

                    {/* SQUADRA CASA (Cliccabile) */}
                    <div
                      className="legend-item home"
                      onClick={() => setRadarFocus(prev => prev === 'home' ? 'all' : 'home')} // Toggle
                      style={{
                        display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', cursor: 'pointer',
                        opacity: radarFocus === 'away' ? 0.2 : 1, // Diventa trasparente se è selezionato l'altro
                        transition: 'opacity 0.3s'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '-25px', left: 0, right: 0, display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1, height: '3px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(homeRadar.reduce((a, b) => a + b, 0) / 5)}%`, height: '100%', backgroundColor: theme.cyan, boxShadow: `0 0 5px ${theme.cyan}` }}></div>
                        </div>
                        <span style={{ marginLeft: '4px', color: theme.cyan, fontSize: '9px', fontWeight: 'bold' }}>{Math.round(homeRadar.reduce((a, b) => a + b, 0) / 5)}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="legend-box home" style={{ width: '8px', height: '8px', backgroundColor: theme.cyan, marginRight: '4px' }}></div>
                        <span className="legend-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedMatch?.home.substring(0, 12)}</span>
                      </div>
                    </div>

                    {/* SQUADRA TRASFERTA (Cliccabile) */}
                    <div
                      className="legend-item away"
                      onClick={() => setRadarFocus(prev => prev === 'away' ? 'all' : 'away')} // Toggle
                      style={{
                        display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', cursor: 'pointer',
                        opacity: radarFocus === 'home' ? 0.2 : 1, // Diventa trasparente se è selezionato l'altro
                        transition: 'opacity 0.3s'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '-25px', left: 0, right: 0, display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1, height: '3px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(awayRadar.reduce((a, b) => a + b, 0) / 5)}%`, height: '100%', backgroundColor: theme.danger, boxShadow: `0 0 5px ${theme.danger}` }}></div>
                        </div>
                        <span style={{ marginLeft: '4px', color: theme.danger, fontSize: '9px', fontWeight: 'bold' }}>{Math.round(awayRadar.reduce((a, b) => a + b, 0) / 5)}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="legend-box away" style={{ width: '8px', height: '8px', backgroundColor: theme.danger, marginRight: '4px' }}></div>
                        <span className="legend-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedMatch?.away.substring(0, 12)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenitore Radar - Rimane bloccato dove l'avevi messo tu */}
                <div className="radar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', padding: '0px' }}>
                  <svg width="250" height="250" viewBox="9 11 105 105">
                    {/* Griglie di sfondo */}
                    {drawPentagonGrid(45, 0.5)} {drawPentagonGrid(30, 0.2)} {drawPentagonGrid(15, 0.2)} {drawPentagonAxes()}

                    {/* Etichette fisse (ATT, TEC...) - Le lasciamo non interattive qui, usiamo i punti */}
                    <text x="60" y="13" fontSize="5" fill="#aaa" textAnchor="middle">ATT</text>
                    <text x="105" y="50" fontSize="5" fill="#aaa" textAnchor="start">TEC</text>
                    <text x="88" y="102" fontSize="5" fill="#aaa" textAnchor="start">DIF</text>
                    <text x="32" y="102" fontSize="5" fill="#aaa" textAnchor="end">VAL</text>
                    <text x="15" y="50" fontSize="5" fill="#aaa" textAnchor="end">FRM</text>

                    {/* LOGICA DI VISUALIZZAZIONE CONDIZIONALE */}
                    {(radarFocus === 'all' || radarFocus === 'home') && drawPentagramRadar(homeRadar, theme.cyan,)}
                    {(radarFocus === 'all' || radarFocus === 'away') && drawPentagramRadar(awayRadar, theme.danger,)}

                    {/* TOOLTIP DEL PUNTO (Appare quando passi sulle punte) */}
                    {pointTooltip && (
                      <g transform={`translate(${pointTooltip.x}, ${pointTooltip.y - 8})`} style={{ pointerEvents: 'none', transition: 'all 0.1s ease' }}>
                        {/* Rettangolo leggermente più largo per ospitare il % */}
                        <rect
                          x="-12" y="-6" width="24" height="10" rx="3"
                          fill="rgba(0,0,0,0.9)" stroke={pointTooltip.color} strokeWidth="0.5"
                        />
                        {/* Testo con il simbolo % aggiunto */}
                        <text x="0" y="1" fontSize="5" fontWeight="bold" fill="#fff" textAnchor="middle">
                          {Math.round(pointTooltip.val)}%
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              </div>

              {/* CONFIGURAZIONE SIMULAZIONE - VERSIONE RISTRUTTURATA */}
              <div className="card-configurazione" style={styles.card}>

                {/* STILE CSS PER LE FRECCIOLINE (Nascondi questo "trucco" qui dentro) */}
                <style>
                  {`
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button {
                      background-color: #333 !important;
                      filter: invert(1);
                      cursor: pointer;
                      opacity: 1;
                    }
                    input[type=number] { -moz-appearance: textfield; }
                  `}
                </style>

              {/* HEADER: TITOLO + TASTO AVANZATE */}
              <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-10px', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>CONFIGURAZIONE RAPIDA</span>
                <button
                  onClick={() => setViewState('settings')}
                  style={{
                    background: 'transparent', border: '1px solid #444',
                    color: '#888', cursor: 'pointer', borderRadius: '4px',
                    padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase'
                  }}
                  title="Apri Impostazioni Complete"
                >
                  🔧 Avanzate
                </button>
              </div>
                
              {/* PANNELLO DI CONFIGURAZIONE RAPIDA */}
              <div style={{
                background: '#0a0a0a', 
                padding: '5px', 
                borderRadius: '12px', 
                border: '1px solid #222',
                marginLeft: '-10px',
                marginRight: '-10px',
                marginBottom: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px' 
              }}>
                
                {/* RIGA 1: ENGINE E CICLI SULLA STESSA LINEA */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginLeft: '5px',
                  marginTop: '5px',
                  gap: '40px',
                  paddingLeft: '-5px'
                }}>
                  <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '5px', marginLeft: '5px' }}>
                    ENGINE: <span style={{ color: theme.cyan }}>CUSTOM</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '5px', marginLeft: '-30px' }}>
                    {/* Se è 0 (mentre cancelli), mostra 1 o un trattino per estetica, altrimenti il numero */}
                    C. ATTUALI: <span style={{ color: theme.cyan, fontSize: '12px'}}>{customCycles === 0 ? 1 : customCycles}</span>
                  </div>
                </div>
                  
                {/* RIGA 2: INPUT CICLI E TASTO AVANZATE FLASH MODE */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginTop: '5px', 
                  justifyContent: 'space-between', 
                  padding: '3px 5px', 
                  background: '#111', 
                  borderRadius: '8px', 
                  border: '1px solid #1a1a1a' 
                }}>
                  <label style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                    Cicli:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input 
                      type="number" 
                      min="1"
                      max="999999"
                      
                      // 1. VISUALIZZAZIONE: Se customCycles è 0 (vuoto), passiamo stringa vuota.
                      // Se Flash è attivo, forziamo visivamente a 1.
                      value={isFlashActive ? 1 : (customCycles === 0 ? '' : customCycles)}
                      
                      disabled={isFlashActive || viewState === 'simulating'}

                      // 2. SELEZIONE AUTOMATICA (al click e al tab)
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}

                      // 3. BLOCCO TASTI (Niente -, +, ., e)
                      onKeyDown={(e) => {
                        if (["-", "+", "e", "E", "."].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}

                      // 4. QUANDO ESCI DAL CAMPO (BLUR)
                      onBlur={() => {
                        // Se l'utente ha lasciato il campo vuoto (0) o nullo, rimettiamo a 1
                        if (!customCycles || customCycles === 0) {
                          setCustomCycles(1);
                        }
                      }}

                      // 5. MENTRE SCRIVI
                      onChange={(e) => {
                        const valStr = e.target.value;
                        
                        // Se cancello tutto, metto 0 (così diventa vuoto visivamente)
                        if (valStr === '') {
                          setCustomCycles(0);
                          return;
                        }
                        
                        const val = parseInt(valStr, 10);
                        
                        // Accetto il numero solo se è valido e positivo
                        if (!isNaN(val) && val > 0) {
                          setCustomCycles(val);
                        }
                      }}

                      style={{
                        width: '60px', 
                        background: '#000', 
                        color: theme.cyan, 
                        border: `1px solid ${theme.cyan}40`, 
                        padding: '5px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        textAlign: 'center',
                        outline: 'none',
                        MozAppearance: 'textfield' 
                      }} 
                    />
                    <button 
                      onClick={() => setIsFlashActive(!isFlashActive)} 
                      disabled={viewState === 'simulating'}
                      style={{ 
                        background: isFlashActive ? '#ff9800' : '#1a1a1a', 
                        border: isFlashActive ? '1px solid #ff9800' : '1px solid #333', 
                        color: isFlashActive ? '#fff' : '#aaa', 
                        fontSize: '11px',
                        fontWeight: 'bold',
                        marginTop: '15px',
                        padding: '5px 12px', 
                        borderRadius: '6px',
                        marginBottom: '15px',
                        cursor: 'pointer',
                        transition: '0.2s',
                        boxShadow: isFlashActive ? '0 0 10px rgba(255, 152, 0, 0.4)' : 'none'
                      }}
                    >
                      {isFlashActive ? '⚡ FLASH ON' : '⚡ FLASH OFF'}
                    </button>
                  </div>
                </div>

                {/* RIGA 3: SELETTORE ALGORITMO (Lungo e Stretto) */}
                <select 
                  value={configAlgo} 
                  onChange={(e) => setConfigAlgo(Number(e.target.value))}
                  disabled={isFlashActive || viewState === 'simulating'} // <--- BLOCCO
                  style={{
                    width: '100%',
                    height: '30px', // Più stretto
                    background: '#111', 
                    color: '#fff', 
                    border: '1px solid #333', 
                    marginTop: '10px',
                    padding: '0 10px', 
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
               {/*   <option value={1}>ALGO 1: STATISTICO PURO</option> */}
                  <option value={2}>ALGO 2: DINAMICO</option>
                  <option value={3}>ALGO 3: TATTICO</option>
                  <option value={4}>ALGO 4: CAOS</option>
                  <option value={5}>ALGO 5: MASTER AI</option>
                  <option value={6}>ALGO 6: M.C. AI</option>
                </select>

                {/* RIGA 4: TASTI MODALITÀ */}
                <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                <button 
                  onClick={() => setSimMode('fast')}
                  disabled={isFlashActive} // <--- BLOCCO
                  style={{
                      flex: '1',
                      height: '36px',
                      fontSize: '10px',
                      fontWeight: 'bold', 
                      marginTop: '5px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${simMode === 'fast' ? theme.cyan : '#333'}`,
                      background: simMode === 'fast' ? theme.cyan : '#111',
                      color: simMode === 'fast' ? '#000' : '#888',
                      transition: '0.2s'
                    }}
                  >
                    SOLO RISULTATO 🧮
                  </button>

                  <button 
                    onClick={() => setSimMode('animated')}
                    disabled={isFlashActive} // <--- BLOCCO
                    style={{
                      flex: '1',
                      height: '36px',
                      fontSize: '10px',
                      marginTop: '5px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${simMode === 'animated' ? theme.cyan : '#333'}`,
                      background: simMode === 'animated' ? theme.cyan : '#111',
                      color: simMode === 'animated' ? '#000' : '#888',
                      transition: '0.2s'
                    }}
                  >
                    ANIMATA 🎬
                  </button>
                </div>

                {/* RIGA 5: TASTO AVVIO */}
                <button 
                  onClick={() => startSimulation()}
                  disabled={viewState === 'simulating'} // Si blocca solo se sta già lavorando
                  style={{
                    width: '100%',
                    // Se Flash è ON diventa Arancione, altrimenti Ciano/Verde standard
                    background: isFlashActive 
                      ? `linear-gradient(180deg, #ff9800 0%, #ff5722 100%)` 
                      : `linear-gradient(180deg, ${theme.cyan} 0%, #008b8b 100%)`,
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '900',
                    fontSize: '14px',
                    letterSpacing: '1px',
                    cursor: viewState === 'simulating' ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    marginTop: '5px',
                    boxShadow: isFlashActive 
                      ? `0 4px 15px rgba(255, 87, 34, 0.4)` 
                      : `0 4px 15px ${theme.cyan}40`,
                    transition: 'all 0.3s',
                    opacity: viewState === 'simulating' ? 0.7 : 1
                  }}
                >
                  {isFlashActive ? ' ESEGUI FLASH' : 'AVVIA SIMULAZIONE'}
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    );
}
