import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction, CSSProperties } from 'react';
import type { Match } from '../types';
import { API_BASE } from './costanti';

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
  league: string;
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
  startSimulation,
  league
}: VistaPrePartitaProps) {

    // --- STRISCE: State + Fetch ---
    interface StreakData {
      streak_home: Record<string, number>;
      streak_away: Record<string, number>;
      streak_home_context: Record<string, number>;
      streak_away_context: Record<string, number>;
    }
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [streakLoading, setStreakLoading] = useState(false);

    useEffect(() => {
      if (!selectedMatch?.home || !selectedMatch?.away || !league) {
        setStreakData(null);
        return;
      }
      let cancelled = false;
      setStreakLoading(true);
      fetch(`${API_BASE}/streaks?home=${encodeURIComponent(selectedMatch.home)}&away=${encodeURIComponent(selectedMatch.away)}&league=${encodeURIComponent(league)}`)
        .then(r => r.json())
        .then(data => {
          if (!cancelled && data.success) {
            setStreakData({
              streak_home: data.streak_home,
              streak_away: data.streak_away,
              streak_home_context: data.streak_home_context,
              streak_away_context: data.streak_away_context,
            });
          }
          setStreakLoading(false);
        })
        .catch(() => { if (!cancelled) { setStreakData(null); setStreakLoading(false); } });
      return () => { cancelled = true; };
    }, [selectedMatch?.home, selectedMatch?.away, league]);

    // --- Strisce: costanti e helpers ---
    const STREAK_LABELS: Record<string, string> = {
      vittorie: 'Vittorie', sconfitte: 'Sconfitte', imbattibilita: 'Imbattibilità',
      pareggi: 'Pareggi', senza_vittorie: 'Senza vittorie',
      over25: 'Over 2.5', under25: 'Under 2.5',
      gg: 'GG (entrambe segnano)', clean_sheet: 'Clean sheet',
      senza_segnare: 'Senza segnare', gol_subiti: 'Gol subiti',
    };
    const STREAK_CURVES: Record<string, Record<string, number>> = {
      vittorie: {'3': 2, '4': 3, '5': 0, '6': -1, '7': -3, '8': -6, '9': -10},
      sconfitte: {'4': -1, '5': -2, '6': -5},
      imbattibilita: {'5': 2, '6': 2, '7': 2, '8': 0, '9': 0, '10': 0, '11': -3},
      pareggi: {'3': -1, '4': 0, '5': 1, '6': -3},
      senza_vittorie: {'3': -1, '4': -2, '5': 0, '6': 1, '7': 2},
      over25: {'3': 3, '4': 3, '5': 0, '6': -1, '7': -4},
      under25: {'3': 3, '4': 3, '5': 0, '6': -1, '7': -4},
      gg: {'3': 2, '4': 2, '5': 0, '6': -3},
      clean_sheet: {'3': 2, '4': 3, '5': 0, '6': -1, '7': -4},
      senza_segnare: {'2': 1, '3': 2, '4': 0, '5': -1, '6': -3},
      gol_subiti: {'3': 2, '4': 3, '5': 2, '6': 1, '7': -2},
    };
    const getCurveVal = (type: string, n: number): number => {
      const curve = STREAK_CURVES[type];
      if (!curve) return 0;
      if (curve[String(n)]) return curve[String(n)];
      const keys = Object.keys(curve).map(Number).sort((a, b) => a - b);
      const maxKey = keys[keys.length - 1];
      if (n >= maxKey) return curve[String(maxKey)];
      return 0;
    };
    const getStreakColor = (val: number) => val > 0 ? theme.success : val < 0 ? theme.danger : theme.textDim;
    const MARKET_GROUPS: [string, string[]][] = [
      ['1X2', ['vittorie', 'sconfitte', 'imbattibilita', 'pareggi', 'senza_vittorie']],
      ['O/U', ['over25', 'under25']],
      ['GG', ['gg', 'clean_sheet', 'senza_segnare', 'gol_subiti']],
    ];
    const ALL_STREAK_TYPES = Object.keys(STREAK_LABELS);

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
              <span style={{ fontFamily: 'monospace' }}>{(selectedMatch as any).date_obj ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) : '27/12'}</span>
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

          {/* === COLONNA SINISTRA: DATI VISIVI === */}
          <div className="colonna-sinistra-analisi">

            {/* A0. CONFIGURAZIONE SIMULAZIONE */}
            <div className="card-configurazione-left" style={styles.card}>

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

              <div style={{
                background: '#0a0a0a',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #222',
                marginLeft: '-15px',
                marginRight: '-15px',
                marginTop: '8px',
                marginBottom: '10px',
                paddingBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>

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
                    C. ATTUALI: <span style={{ color: theme.cyan, fontSize: '12px'}}>{customCycles === 0 ? 1 : customCycles}</span>
                  </div>
                </div>

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
                      value={isFlashActive ? 1 : (customCycles === 0 ? '' : customCycles)}
                      disabled={isFlashActive || viewState === 'simulating'}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onKeyDown={(e) => {
                        if (["-", "+", "e", "E", "."].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={() => {
                        if (!customCycles || customCycles === 0) {
                          setCustomCycles(1);
                        }
                      }}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (valStr === '') {
                          setCustomCycles(0);
                          return;
                        }
                        const val = parseInt(valStr, 10);
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

                <select
                  value={configAlgo}
                  onChange={(e) => setConfigAlgo(Number(e.target.value))}
                  disabled={isFlashActive || viewState === 'simulating'}
                  style={{
                    width: '100%',
                    height: '30px',
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
                  <option value={2}>ALGO 2: DINAMICO</option>
                  <option value={3}>ALGO 3: TATTICO</option>
                  <option value={4}>ALGO 4: CAOS</option>
                  <option value={5}>ALGO 5: MASTER AI</option>
                  <option value={6}>ALGO 6: M.C. AI</option>
                </select>

                <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                <button
                  onClick={() => setSimMode('fast')}
                  disabled={isFlashActive}
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
                    disabled={isFlashActive}
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

                <button
                  onClick={() => startSimulation()}
                  disabled={viewState === 'simulating'}
                  style={{
                    width: '100%',
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
                    marginTop: '10px',
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

            {/* A4. CAMPO & AFFIDABILITÀ (Card Unificata) */}
            <div className="card-campo-affidabilita" style={styles.card}>
              <div className="header-title" style={{ marginBottom: '20px', marginTop: '-10px' }}>CAMPO & AFFIDABILITÀ</div>

              {/* --- SOTTO-SEZIONE: FATTORE STADIO --- */}
              <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>🏟️ Fattore Stadio</div>
              <div className="content-container">
                {(() => {
                  const fullScaleGradient = `linear-gradient(90deg,
                                rgba(255, 0, 0, 1) 0%, rgba(255, 30, 0, 1) 11%, rgba(255, 80, 0, 1) 22%,
                                rgba(255, 140, 0, 1) 33%, rgba(255, 200, 0, 1) 44%, rgba(255, 255, 0, 1) 55%,
                                rgba(210, 255, 0, 1) 66%, rgba(150, 255, 0, 1) 77%, rgba(0, 255, 0, 1) 88%,
                                rgba(0, 255, 100, 1) 100%)`;
                  const colHome = getTrendColor(homeFieldFactor);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');
                  const colAway = getTrendColor(awayFieldFactor);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');
                  return (
                    <>
                      <div className="team-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.home}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar home" style={{ width: `${homeFieldFactor}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${homeFieldFactor > 0 ? (10000 / homeFieldFactor) : 100}% 100%`, boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage home" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colHome, textShadow: `0 0 8px ${shadHome}` }}>{homeFieldFactor}%</span>
                      </div>
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.away}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{ width: `${awayFieldFactor}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${awayFieldFactor > 0 ? (10000 / awayFieldFactor) : 100}% 100%`, boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage away" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colAway, textShadow: `0 0 8px ${shadAway}` }}>{awayFieldFactor}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* --- DIVISORE --- */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

              {/* --- SOTTO-SEZIONE: STABILITÀ --- */}
              <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>🧠 Stabilità</div>
              <div className="content-container">
                {(() => {
                  const fullScaleGradient = `linear-gradient(90deg,
                              rgba(255, 0, 0, 1) 0%, rgba(255, 30, 0, 1) 11%, rgba(255, 80, 0, 1) 22%,
                              rgba(255, 140, 0, 1) 33%, rgba(255, 200, 0, 1) 44%, rgba(255, 255, 0, 1) 55%,
                              rgba(210, 255, 0, 1) 66%, rgba(150, 255, 0, 1) 77%, rgba(0, 255, 0, 1) 88%,
                              rgba(0, 255, 100, 1) 100%)`;
                  const valHome = Number(homeAff || 0);
                  const valAway = Number(awayAff || 0);
                  const colHome = getTrendColor(valHome);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');
                  const colAway = getTrendColor(valAway);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');
                  return (
                    <>
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.home}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar home" style={{ width: `${valHome}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${valHome > 0 ? (10000 / valHome) : 100}% 100%`, boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage home" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colHome, textShadow: `0 0 8px ${shadHome}` }}>{valHome}%</span>
                      </div>
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.away}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{ width: `${valAway}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${valAway > 0 ? (10000 / valAway) : 100}% 100%`, boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage away" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colAway, textShadow: `0 0 8px ${shadAway}` }}>{valAway}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 6. FORMA A.L.1 INDEX */}
            <div className="card-forma" style={styles.card}>
              <div className="header-title">⚡ FORMA A.L.1 INDEX</div>
              <div className="content-container">
                {(() => {
                  const valHome = Number(selectedMatch?.h2h_data?.lucifero_home || 0);
                  const valAway = Number(selectedMatch?.h2h_data?.lucifero_away || 0);
                  const pctHome = Math.min((valHome / 25) * 100, 100);
                  const pctAway = Math.min((valAway / 25) * 100, 100);
                  const fullScaleGradient = `linear-gradient(90deg,
                                rgba(255, 0, 0, 1) 0%, rgba(255, 30, 0, 1) 11%, rgba(255, 80, 0, 1) 22%,
                                rgba(255, 140, 0, 1) 33%, rgba(255, 200, 0, 1) 44%, rgba(255, 255, 0, 1) 55%,
                                rgba(210, 255, 0, 1) 66%, rgba(150, 255, 0, 1) 77%, rgba(0, 255, 0, 1) 88%,
                                rgba(0, 255, 100, 1) 100%)`;
                  const colHome = getTrendColor(pctHome);
                  const colAway = getTrendColor(pctAway);
                  const shadowHome = colHome.replace(', 1)', ', 0.2)');
                  const shadowAway = colAway.replace(', 1)', ', 0.2)');
                  return (
                    <>
                      <div className="team-row">
                        <div className="team-name">{selectedMatch?.home}</div>
                        <div className="team-value" style={{ color: colHome, textShadow: `0 0 10px ${shadowHome}`, fontWeight: 'bold' }}>
                          {valHome.toFixed(1)}
                        </div>
                      </div>
                      <div className="progress-bar-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                        <div className="progress-bar home" style={{
                          width: `${pctHome}%`, height: '100%', borderRadius: '3px',
                          backgroundImage: fullScaleGradient,
                          backgroundSize: `${pctHome > 0 ? (10000 / pctHome) : 100}% 100%`,
                          boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadowHome}`
                        }} />
                      </div>
                      <div className="away-section" style={{ marginTop: '10px' }}>
                        <div className="team-row">
                          <div className="team-name">{selectedMatch?.away}</div>
                          <div className="team-value" style={{ color: colAway, textShadow: `0 0 10px ${shadowAway}`, fontWeight: 'bold' }}>
                            {valAway.toFixed(1)}
                          </div>
                        </div>
                        <div className="progress-bar-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{
                            width: `${pctAway}%`, height: '100%', borderRadius: '3px',
                            backgroundImage: fullScaleGradient,
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

          </div>

          {/* === COLONNA DESTRA: ANALISI COMPETITIVA VALORI CORE === */}
          <div className="colonna-destra-analisi">

            {/* 1. DNA SYSTEM */}
            <div className="riga-orizzontale-bottom">

              {/* DNA SYSTEM */}
                <div className="card-dna" style={{
                  ...styles.card,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 240, 255, 0.1)',
                  marginTop: '0',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div className="header-section" style={{
                    marginBottom: isMobile ? '20px' : '-15px',
                    marginTop: isMobile ? '15px' : '15px',
                    position: 'relative',
                    height: isMobile ? '70px' : '60px',
                    paddingTop: isMobile ? '30px' : '10px'
                  }}>
                    <div className="header-title" style={{
                      fontSize: '10px',
                      opacity: 0.8,
                      position: isMobile ? 'absolute' : 'relative',
                      top: isMobile ? '-20px' : '-25px',
                      left: isMobile ? '-5px' : '0',
                      right: isMobile ? '12px' : 'auto',
                      marginTop: isMobile ? '0' : '5px',
                      zIndex: 10
                    }}>
                      🕸️ DNA SYSTEM
                    </div>
                  


                  {/* Container Legenda - Altezza fissa per non spingere il grafico */}
                  {/* Container Legenda INTERATTIVA */}
                  <div className="legend-container" style={{ display: 'flex', gap: '20px', height: '30px', alignItems: 'flex-end', position: 'relative', zIndex: 10, top: isMobile ? '0' : '-10px' }}>

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
                <div className="radar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0px', padding: '0px', marginTop: isMobile ? '0' : '15px' }}>
                  <div style={isMobile ? { display: 'contents' } : {
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '10px',
                    padding: '10px 10px 0 10px',
                    marginLeft: '0px',
                    marginRight: '15px',
                    marginBottom: '8px',
                    width: '100%',
                    height: '240px',
                    overflow: 'visible',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    boxSizing: 'border-box'
                  }}>
                  <svg width={isMobile ? 250 : 260} height={isMobile ? 250 : 260} viewBox="9 11 105 105">
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
              </div>

            </div>

            {/* 2. BIAS C.O.R.E. */}
            <div className="card-bias-core" style={{ ...styles.card, marginTop: isMobile ? '0' : '-5px' }}>
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

            {/* 3. STRISCE (Curva a Campana) */}
            <div className="card-strisce" style={styles.card}>
              <div className="header-title" style={{ fontSize: '11px', color: '#ff9800', fontWeight: 'bold', letterSpacing: '2px', borderBottom: '1px solid rgba(255, 152, 0, 0.2)', paddingBottom: '5px', marginBottom: '10px' }}>
                STRISCE
              </div>
              {streakLoading ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px 10px', fontSize: '11px' }}>
                  Caricamento...
                </div>
              ) : !streakData ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px 10px', fontSize: '11px' }}>
                  <div style={{ color: '#888' }}>Nessun dato disponibile</div>
                </div>
              ) : (() => {
                const active = ALL_STREAK_TYPES.filter(t => {
                  const hN = streakData.streak_home?.[t] ?? 0;
                  const aN = streakData.streak_away?.[t] ?? 0;
                  return hN >= 2 || aN >= 2;
                });
                if (active.length === 0) return (
                  <div style={{ textAlign: 'center', color: '#666', padding: '15px 10px', fontSize: '11px' }}>
                    Nessuna striscia attiva
                  </div>
                );
                const calcMarket = (types: string[], team: 'home' | 'away') => {
                  let tot = 0;
                  const data = team === 'home' ? streakData.streak_home : streakData.streak_away;
                  types.forEach(t => {
                    const n = data?.[t] ?? 0;
                    if (n >= 2) tot += getCurveVal(t, n);
                  });
                  return tot;
                };
                return (
                  <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${theme.cyan}20` }}>
                        <th style={{ textAlign: 'left', padding: '3px 4px', color: theme.textDim, fontWeight: 'normal' }}>Striscia</th>
                        <th style={{ textAlign: 'center', padding: '3px 4px', color: theme.cyan, fontWeight: 'bold', fontSize: '9px' }}>{selectedMatch?.home}</th>
                        <th style={{ textAlign: 'center', padding: '3px 4px', color: theme.purple, fontWeight: 'bold', fontSize: '9px' }}>{selectedMatch?.away}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.map(type => {
                        const hN = streakData.streak_home?.[type] ?? 0;
                        const aN = streakData.streak_away?.[type] ?? 0;
                        const hCurve = getCurveVal(type, hN);
                        const aCurve = getCurveVal(type, aN);
                        return (
                          <tr key={type} style={{ borderBottom: `1px solid ${theme.cyan}10` }}>
                            <td style={{ padding: '3px 4px', color: theme.text }}>{STREAK_LABELS[type]}</td>
                            <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                              {hN >= 2 ? (
                                <span style={{ color: getStreakColor(hCurve), fontWeight: 'bold' }}>
                                  {hN} <span style={{ fontSize: '8px', opacity: 0.7 }}>({hCurve > 0 ? '+' : ''}{hCurve})</span>
                                </span>
                              ) : <span style={{ color: theme.textDim }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                              {aN >= 2 ? (
                                <span style={{ color: getStreakColor(aCurve), fontWeight: 'bold' }}>
                                  {aN} <span style={{ fontSize: '8px', opacity: 0.7 }}>({aCurve > 0 ? '+' : ''}{aCurve})</span>
                                </span>
                              ) : <span style={{ color: theme.textDim }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {MARKET_GROUPS.map(([label, types]) => {
                        const hVal = calcMarket(types, 'home');
                        const aVal = calcMarket(types, 'away');
                        if (hVal === 0 && aVal === 0) return null;
                        return (
                          <tr key={label} style={{ borderTop: `1px solid ${theme.cyan}20` }}>
                            <td style={{ padding: '3px 4px', color: theme.textDim, fontWeight: 'bold', fontSize: '9px' }}>{label}</td>
                            <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                              <span style={{ color: getStreakColor(hVal), fontWeight: 'bold' }}>{hVal > 0 ? '+' : ''}{hVal}</span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                              <span style={{ color: getStreakColor(aVal), fontWeight: 'bold' }}>{aVal > 0 ? '+' : ''}{aVal}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tfoot>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

    );
}
