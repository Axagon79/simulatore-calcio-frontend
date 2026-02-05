import React from 'react';
import { theme } from './costanti';
import { styles } from './stili';
import { normalizeModulo, getFormationPositions, JerseySVG } from './utilita';
import type { Match, SimulationResult } from '../types';

interface AnimazionePartitaProps {
  // State values
  isMobile: boolean;
  selectedMatch: Match | null;
  timer: number | string;
  liveScore: { home: number; away: number };
  isVarActive: boolean;
  formations: {
    home_team: string;
    away_team: string;
    home_formation: { modulo: string; titolari: Array<{role: string; player: string; rating: number}> };
    away_formation: { modulo: string; titolari: Array<{role: string; player: string; rating: number}> };
    home_rank?: number;
    away_rank?: number;
    home_points?: number;
    away_points?: number;
  } | null;
  isWarmingUp: boolean;
  warmupProgress: number;
  animEvents: string[];
  momentum: number;
  momentumDirection: 'casa' | 'ospite';
  pitchMsg: { testo: string; colore: string } | null;
  simulationEnded: boolean;
  configAlgo: number;
  customCycles: number;

  // State setters
  setViewState: (state: 'list' | 'pre-match' | 'simulating' | 'result' | 'settings') => void;
  setSimulationEnded: (ended: boolean) => void;
  setShowFormationsPopup: (show: boolean) => void;
  setPopupOpacity: (opacity: number) => void;
  setShowMatchSummary: (show: boolean) => void;
  setSimResult: (result: SimulationResult | null) => void;

  // Functions
  getStemmaLeagueUrl: (mongoId?: string) => string;
  handleResimulate: () => void;
}

const AnimazionePartita: React.FC<AnimazionePartitaProps> = (props) => {
  const {
    isMobile,
    selectedMatch,
    timer,
    liveScore,
    isVarActive,
    formations,
    isWarmingUp,
    warmupProgress,
    animEvents,
    momentum,
    momentumDirection,
    pitchMsg,
    simulationEnded,
    configAlgo,
    customCycles,
    setViewState,
    setSimulationEnded,
    setShowFormationsPopup,
    setPopupOpacity,
    setShowMatchSummary,
    setSimResult,
    getStemmaLeagueUrl,
    handleResimulate,
  } = props;

  return (
    <div style={{
      flex: 1,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',  // 👈 AGGIUNGI questa riga
      padding: '0',
      maxWidth: '100vw',    // 👈 AGGIUNGI questa riga
      width: '100%'          // 👈 AGGIUNGI questa riga
    }}>

      <div style={{
        padding: isMobile ? '3px 8px 0px' : styles.arenaContent.padding,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        overflowX: 'hidden'  // 👈 AGGIUNGI SOLO QUESTA RIGA
      }}>

        {/* BADGE ALGO/CICLI - Discreto in alto a sinistra */}
        <div
          className="sim-badges-top"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: '#888',
            zIndex: 50,
          }}
        >
          <span style={{ color: '#00f0ff', fontWeight: '700' }}>
            Algo {configAlgo}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color: '#bc13fe', fontWeight: '700' }}>
            {customCycles} cicli
          </span>
        </div>

        {/* ✅ HEADER LIVE SCORE: MOBILE (Custom) vs DESKTOP (Originale Blindato) */}
        <div
          className="sim-header"
          style={{
            marginBottom: isMobile ? '0px' : '25px',
            background: 'rgba(0, 0, 0, 0.95)',
            marginTop: isMobile ? '0px' : '10px',
            backdropFilter: 'blur(20px)',
            // Larghezze differenziate
            width: isMobile ? '96%' : '580px',
            marginLeft: 'auto',
            marginRight: 'auto',
            // Padding differenziato
            padding: isMobile ? '10px 15px' : '15px 20px',
            borderRadius: '16px',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '0px' : '5px'
          }}
        >

          {/* ==============================================
              📱 VERSIONE MOBILE: ALLINEAMENTO "A PIOMBO"
             ============================================== */}
          {isMobile ? (
            <>
              {/* COLONNA SINISTRA: SQUADRE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>

                {/* RIGA 1: SQUADRA CASA */}
                <div style={{ display: 'flex', alignItems: 'center' }}>

                   {/* 1. COLONNA STEMMA RIGIDA (40px fissi) */}
                   <div style={{
                       width: '40px',          // Larghezza fissa "blindata"
                       display: 'flex',
                       justifyContent: 'center', // Stemma centrato nei suoi 40px
                       alignItems: 'center',
                       flexShrink: 0           // Impedisce di schiacciarsi
                   }}>
                       <img
                          src={getStemmaLeagueUrl((selectedMatch as any)?.home_mongo_id)}
                          alt=""
                          style={{ width: '28px', marginTop: '5px', height: '28px', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                       />
                   </div>

                   {/* 2. COLONNA TESTO (Parte sempre dopo i 40px) */}
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      {/* Etichetta CASA */}
                      <span style={{ fontSize: '9px', marginBottom: '5px', color: theme.cyan, textTransform: 'uppercase', lineHeight: 1, fontWeight: 'bold', marginLeft: '2px' }}>
                        CASA
                      </span>
                      {/* Nome Squadra */}
                      <span style={{ fontSize: '14px', fontWeight: '900', color: 'white', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {selectedMatch?.home}
                      </span>
                   </div>
                </div>

                {/* RIGA 2: SQUADRA OSPITE */}
                <div style={{ display: 'flex', alignItems: 'center' }}>

                   {/* 1. COLONNA STEMMA RIGIDA (Identica a sopra) */}
                   <div style={{
                       width: '40px',
                       display: 'flex',
                       justifyContent: 'center',
                       alignItems: 'center',
                       flexShrink: 0
                   }}>
                       <img
                          src={getStemmaLeagueUrl((selectedMatch as any)?.away_mongo_id)}
                          alt=""
                          style={{ width: '28px',marginTop:'5px', height: '28px', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                       />
                   </div>

                   {/* 2. COLONNA TESTO */}
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      {/* Etichetta OSPITE */}
                      <span style={{ fontSize: '9px',marginBottom: '5px', color: theme.danger, textTransform: 'uppercase', lineHeight: 1, fontWeight: 'bold', marginLeft: '2px' }}>
                        OSPITE
                      </span>
                      {/* Nome Squadra */}
                      <span style={{ fontSize: '14px', fontWeight: '900', color: 'white', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {selectedMatch?.away}
                      </span>
                   </div>
                </div>
              </div>

              {/* COLONNA DESTRA: CRONOMETRO E RISULTATO (Resta invariata) */}
              <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '10px',
                  marginRight: '5px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: isMobile ? '20px 5px' : '15px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  flexShrink: 0
              }}>
                <div
                  className={isVarActive ? 'sim-timer-pulsing' : ''}
                  style={{
                    fontSize: '25px', fontWeight: '900', color: isVarActive ? '#ff2e2e' : theme.purple,
                    fontFamily: 'monospace', textShadow: isVarActive ? `0 0 10px #ff2e2e` : 'none',
                    minWidth: '35px', textAlign: 'center'
                  }}
                >
                  {timer}'
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }}></div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '25px', fontWeight: '900', color: theme.cyan, fontFamily: 'monospace' }}>{liveScore.home}</span>
                  <span style={{ fontSize: '14px', color: '#666' }}>-</span>
                  <span style={{ fontSize: '25px', fontWeight: '900', color: theme.danger, fontFamily: 'monospace' }}>{liveScore.away}</span>
                </div>
              </div>
            </>
          ) : (

          /* =================================================================================
             💻 VERSIONE DESKTOP: Layout ORIGINALE (Quello che mi hai fornito)
             ================================================================================= */
            <>
              {/* A. DATA E ORA */}
              <div style={{
                    width: '130px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}>
                    <div style={{
                      display: 'flex',
                      height: '30px',
                      alignItems: 'center',
                      gap: '2px',
                      background: 'rgba(111, 149, 170, 0.13)',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 240, 255, 0.1)',
                    }}>
                      <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold' }}>
                        {(selectedMatch as any).date_obj
                          ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
                          : '00/00'}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.1)', fontSize: '12px' }}>|</span>
                      <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold' }}>
                        {(selectedMatch as any).match_time || '--:--'}
                      </span>
                    </div>
              </div>

              {/* CRONOMETRO */}
              <div style={{ width: '55px', textAlign: 'center' }}>
                <div
                  className={isVarActive ? 'sim-timer-pulsing' : ''}
                  style={{
                    fontSize: '24px',
                    marginLeft: '-20px',
                    fontWeight: '900',
                    color: isVarActive ? '#ff2e2e' : theme.purple,
                    fontFamily: 'monospace',
                    textShadow: isVarActive ? `0 0 15px #ff2e2e` : `0 0 10px ${theme.purple}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {timer}'
                </div>
              </div>

              {/* SQUADRA CASA */}
              <div style={{ width: '120px', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: theme.cyan, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '2px' }}>Casa</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedMatch?.home}</div>
              </div>

              {/* PUNTEGGIO CENTRALE */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0px 5px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(188, 19, 254, 0.1))',
                borderRadius: '10px',
                border: '1px solid rgba(0, 240, 255, 0.3)'
              }}>
                <div style={{ fontSize: '30px', fontWeight: '900', color: theme.cyan, fontFamily: 'monospace', textShadow: `0 0 10px ${theme.cyan}`, width: '30px', textAlign: 'center' }}>{liveScore.home}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.3)' }}>-</div>
                <div style={{ fontSize: '30px', fontWeight: '900', color: theme.danger, fontFamily: 'monospace', textShadow: `0 0 10px ${theme.danger}`, width: '30px', textAlign: 'center' }}>{liveScore.away}</div>
              </div>

              {/* SQUADRA OSPITE */}
              <div style={{ width: '120px', textAlign: 'left' }}>
                <div style={{ fontSize: '10px', color: theme.danger, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '2px' }}>Ospite</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedMatch?.away}</div>
              </div>
            </>
          )}

        </div>


        {/* ✅ CONTENITORE CAMPO + CRONACA AFFIANCATI */}
        <div
          className="sim-main-layout"
          style={{
            display: 'flex',
            gap: '25px',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'stretch'
          }}
        >


          {/* CAMPO DA GIOCO */}
          <div
            className="sim-field-section"
            style={{
              flexShrink: 0
            }}
          >
            <div
              className="sim-pitch"
              style={{
                ...styles.pitch,
                marginTop: '25px'
              }}
            >
            {/* ✅ MODULI SQUADRE */}
            {isWarmingUp && formations && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: isMobile ? '90%' : '900px',
                        marginBottom: '10px'
                      }}>
                        <span style={{
                          color: theme.cyan,
                          fontSize: isMobile ? '10px' : '16px',
                          fontWeight: 'bold',
                          textShadow: `0 0 8px ${theme.cyan}`,
                          marginLeft: '10px'
                        }}>
                          {normalizeModulo(formations.home_formation?.modulo || '4-3-3')}
                        </span>
                        <span style={{
                          color: theme.danger,
                          fontSize: isMobile ? '10px' : '16px',
                          fontWeight: 'bold',
                          textShadow: `0 0 8px ${theme.danger}`,
                          marginRight: isMobile ? '-25px' :  '250px'
                        }}>
                          {normalizeModulo(formations.away_formation?.modulo || '4-3-3')}
                        </span>
                      </div>
                    )}

              {pitchMsg && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  zIndex: 100,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    fontSize: isMobile ? '35px' : '60px',
                    fontWeight: '900',
                    color: pitchMsg.colore,
                    textShadow: `0 0 20px ${pitchMsg.colore}`,
                    textTransform: 'uppercase',
                    transform: 'rotate(-5deg)',
                    animation: 'pulse 0.6s infinite alternate'
                  }}>
                    {pitchMsg.testo}
                  </div>
                </div>
              )}

              {/* Linea di metà campo */}
              <div style={{
                position: 'absolute',
                left: '50%',
                height: '100%',
                borderLeft: '2px solid rgba(255,255,255,0.5)',
                boxShadow: '0 0 10px rgba(255,255,255,0.3)'
              }}></div>

              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                border: '2px solid rgba(255,255,255,0.5)',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(255,255,255,0.2)'
              }}></div>

              {/* Area grande SINISTRA (casa) */}
              <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '16%', height: '60%', borderRight: '2px solid rgba(255,255,255,0.5)', borderTop: '2px solid rgba(255,255,255,0.5)', borderBottom: '2px solid rgba(255,255,255,0.5)' }}></div>

              {/* Area piccola SINISTRA (casa) */}
              <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '6%', height: '30%', borderRight: '2px solid rgba(255,255,255,0.5)', borderTop: '2px solid rgba(255,255,255,0.5)', borderBottom: '2px solid rgba(255,255,255,0.5)' }}></div>

              {/* Area grande DESTRA (ospite) */}
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '16%', height: '60%', borderLeft: '2px solid rgba(255,255,255,0.5)', borderTop: '2px solid rgba(255,255,255,0.5)', borderBottom: '2px solid rgba(255,255,255,0.5)' }}></div>

              {/* Area piccola DESTRA (ospite) */}
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '6%', height: '30%', borderLeft: '2px solid rgba(255,255,255,0.5)', borderTop: '2px solid rgba(255,255,255,0.5)', borderBottom: '2px solid rgba(255,255,255,0.5)' }}></div>

              {/* Dischetto rigore CASA */}
              <div style={{
                position: 'absolute',
                left: '11%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 0 8px rgba(255,255,255,0.5)'
              }}></div>

              {/* Dischetto rigore OSPITE */}
              <div style={{
                position: 'absolute',
                right: '11%',
                top: '50%',
                transform: 'translate(50%, -50%)',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 0 8px rgba(255,255,255,0.5)'
              }}></div>

              {/* Punto centrale */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.8)',
                boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                zIndex: 5
              }}></div>

              {/* Mezzaluna area rigore CASA - semicerchio che sporge FUORI dall'area */}
              <div style={{
                position: 'absolute',
                left: !isMobile ? '85%' : '87%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.5)',
                borderLeft: '50%',
                clipPath: 'inset(0 50px 0 0)'
              }}></div>

              {/* Mezzaluna area rigore OSPITE - semicerchio che sporge FUORI dall'area */}
              <div style={{
                position: 'absolute',
                left: !isMobile ? '15%' : '13%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.5)',
                borderLeft: '50%',
                clipPath: 'inset(0 0 0 50px)'
              }}></div>

              {/* Archi d'angolo PIÙ PICCOLI MA PIÙ GROSSI - ALTO SX */}
              <div style={{
                position: 'absolute',
                left: '-8px',
                top: '-8px',
                width: '16px',
                height: '16px',
                border: '3px solid rgba(255,255,255,0.7)',
                borderRadius: '50%',
                borderRight: 'none',
                borderBottom: 'none'
              }}></div>

              {/* Archi d'angolo - BASSO SX */}
              <div style={{
                position: 'absolute',
                left: '-8px',
                bottom: '-8px',
                width: '16px',
                height: '16px',
                border: '3px solid rgba(255,255,255,0.7)',
                borderRadius: '50%',
                borderRight: 'none',
                borderTop: 'none'
              }}></div>

              {/* Archi d'angolo - ALTO DX */}
              <div style={{
                position: 'absolute',
                right: '-8px',
                top: '-8px',
                width: '16px',
                height: '16px',
                border: '3px solid rgba(255,255,255,0.7)',
                borderRadius: '50%',
                borderLeft: 'none',
                borderBottom: 'none'
              }}></div>

              {/* Archi d'angolo - BASSO DX */}
              <div style={{
                position: 'absolute',
                right: '-8px',
                bottom: '-8px',
                width: '16px',
                height: '16px',
                border: '3px solid rgba(255,255,255,0.7)',
                borderRadius: '50%',
                borderLeft: 'none',
                borderTop: 'none'
              }}></div>

              {/* Bandierine FUORI DAL CAMPO - ALTO SX */}
              <div style={{
                position: 'absolute',
                left: '-3px',
                top: '-3px',
                width: '2px',
                height: '20px',
                background: 'rgba(255,255,255,0.8)',
                transform: 'rotate(0deg)',
                boxShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '2px',
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid rgba(255,60,60,0.9)',
                  borderTop: '7px solid transparent',
                  borderBottom: '7px solid transparent',
                  filter: 'drop-shadow(0 0 4px rgba(255,60,60,0.6))'
                }}></div>
              </div>

              {/* Bandierine - BASSO SX */}
              <div style={{
                position: 'absolute',
                left: '-3px',
                bottom: '-3px',
                width: '2px',
                height: '20px',
                background: 'rgba(255,255,255,0.8)',
                boxShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '2px',
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid rgba(255,60,60,0.9)',
                  borderTop: '7px solid transparent',
                  borderBottom: '7px solid transparent',
                  filter: 'drop-shadow(0 0 4px rgba(255,60,60,0.6))'
                }}></div>
              </div>

              {/* Bandierine - ALTO DX */}
              <div style={{
                position: 'absolute',
                right: '-3px',
                top: '-3px',
                width: '2px',
                height: '20px',
                background: 'rgba(255,255,255,0.8)',
                boxShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '2px',
                  width: 0,
                  height: 0,
                  borderRight: '10px solid rgba(255,60,60,0.9)',
                  borderTop: '7px solid transparent',
                  borderBottom: '7px solid transparent',
                  filter: 'drop-shadow(0 0 4px rgba(255,60,60,0.6))'
                }}></div>
              </div>

              {/* Bandierine - BASSO DX */}
              <div style={{
                position: 'absolute',
                right: '-3px',
                bottom: '-3px',
                width: '2px',
                height: '20px',
                background: 'rgba(255,255,255,0.8)',
                boxShadow: '0 0 4px rgba(255,255,255,0.5)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '2px',
                  width: 0,
                  height: 0,
                  borderRight: '10px solid rgba(255,60,60,0.9)',
                  borderTop: '7px solid transparent',
                  borderBottom: '7px solid transparent',
                  filter: 'drop-shadow(0 0 4px rgba(255,60,60,0.6))'
                }}></div>
              </div>

              {/* ✅ MAGLIETTE GIOCATORI DURANTE RISCALDAMENTO */}
              {isWarmingUp && formations && (
                <>
                  {(() => {
                    const pos = getFormationPositions(formations.home_formation?.modulo || '4-3-3', true);
                    const allPos = [...pos.GK, ...pos.DEF, ...pos.MID, ...pos.ATT];
                    return allPos.map((p, idx) => (
                      <div key={`home-${idx}`} style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${(p.y + (isMobile ? 2 : 0))}%`,
                        transform: 'translate(-50%, -50%)'
                      }}>
                        <JerseySVG color={theme.cyan} size={28} />
                      </div>
                    ));
                  })()}
                  {(() => {
                    const pos = getFormationPositions(formations.away_formation?.modulo || '4-3-3', false);
                    const allPos = [...pos.GK, ...pos.DEF, ...pos.MID, ...pos.ATT];
                    return allPos.map((p, idx) => (
                      <div key={`away-${idx}`} style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${(p.y + (isMobile ? 2 : 0))}%`,
                        transform: 'translate(-50%, -50%)'
                      }}>
                        <JerseySVG color={theme.danger} size={28} />
                      </div>
                    ));
                  })()}
                </>
              )}

              {/* Barra Momentum con Scia */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'hidden'
              }}>
                {/* SCIA SFUMATA POTENTE */}
                {!isWarmingUp && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: `${momentum}%`,
                  width: isMobile ? '400px' : '800px',  // ← CONTROLLA QUESTO
                  height: '100%',
                  background: momentumDirection === 'ospite'
                    ? `linear-gradient(to left, ${theme.cyan}FF, ${theme.cyan}66, ${theme.cyan}44, transparent)`
                    : `linear-gradient(to right, ${theme.danger}FF, ${theme.danger}66, ${theme.danger}44, transparent)`,
                  transform: momentumDirection === 'ospite' ? `translateX(${isMobile ? '-400px' : '-800px'})` : 'translateX(0)',
                  transition: 'left 0.5s ease-out, background 0.3s ease',
                  opacity: 0.9,
                  filter: 'blur(5px)',
                  boxShadow: momentumDirection === 'ospite'
                    ? `-50px 0 100px 50px ${theme.cyan}88`
                    : `50px 0 100px 50px ${theme.danger}88`,
                  zIndex: 1
                }} />
                )}

                {/* BARRA PRINCIPALE */}
                <div style={{
                  ...styles.momentumBar,
                  left: `${momentum}%`,
                  background: momentum > 50 ? theme.cyan : theme.danger,
                  boxShadow: `
                    0 0 15px 3px ${momentum > 50 ? theme.cyan : theme.danger},
                    0 0 30px 6px ${momentum > 50 ? theme.cyan : theme.danger}80
                  `,
                  filter: 'brightness(1.2)'
                }} />
              </div>
            </div>
          </div>

          {/* CRONACA EVENTI */}
          <div
            className="sim-events-section"
            style={{
              flexShrink: 0
            }}
          >
            <div
              className="sim-events-feed"
              style={{
                ...styles.eventFeed
              }}
            >
              {animEvents.length === 0 ? (
                <div style={{
                  color: '#666',
                  textAlign: 'center',
                  fontSize: '13px',
                  padding: '20px',
                  fontStyle: 'italic'
                }}>
                  ⚽ Fischio d'inizio...
                </div>
              ) : (
                animEvents.map((e, i) => {
                  const homeUpper = selectedMatch?.home.toUpperCase() || '';
                  const awayUpper = selectedMatch?.away.toUpperCase() || '';
                  const isCasa = e.includes(`[${homeUpper}]`);
                  const isOspite = e.includes(`[${awayUpper}]`);
                  const isSistema = e.includes('[SISTEMA]');
                  const isGol = e.includes('⚽') || e.includes('GOOOL');
                  const isRigore = e.includes('🎯') || e.includes('RIGORE');
                  const isCartellino = e.includes('🟨') || e.includes('🟥');

                  return (
                    <div
                      key={i}
                      style={{
                        marginBottom: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        textAlign: isCasa ? 'left' : isOspite ? 'right' : 'center',
                        color: isCasa ? theme.cyan : isOspite ? theme.danger : '#fff',
                        fontWeight: isSistema ? 'bold' : isGol ? '900' : 'normal',

                        // SFONDO SPECIALE PER GOL
                        background: isGol
                          ? (isCasa
                              ? `linear-gradient(90deg, ${theme.cyan}30, transparent)`
                              : isOspite
                              ? `linear-gradient(270deg, ${theme.danger}30, transparent)`
                              : 'rgba(255, 255, 255, 0.05)')
                          : isRigore
                          ? 'rgba(255, 159, 67, 0.15)'
                          : isCartellino
                          ? 'rgba(255, 193, 7, 0.1)'
                          : 'rgba(255, 255, 255, 0.02)',

                        // BORDO COLORATO
                        borderLeft: isCasa && isGol ? `4px solid ${theme.cyan}` : 'none',
                        borderRight: isOspite && isGol ? `4px solid ${theme.danger}` : 'none',

                        // GLOW PER GOL
                        boxShadow: isGol
                          ? (isCasa
                              ? `0 0 20px ${theme.cyan}40, inset 0 0 20px ${theme.cyan}10`
                              : `0 0 20px ${theme.danger}40, inset 0 0 20px ${theme.danger}10`)
                          : 'none',

                        // ANIMAZIONE FADE-IN
                        animation: 'eventFadeIn 0.4s ease-out',

                        // HOVER EFFECT
                        transition: 'all 0.2s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(el) => {
                        el.currentTarget.style.background = isGol
                          ? (isCasa
                              ? `linear-gradient(90deg, ${theme.cyan}40, transparent)`
                              : `linear-gradient(270deg, ${theme.danger}40, transparent)`)
                          : 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(el) => {
                        el.currentTarget.style.background = isGol
                          ? (isCasa
                              ? `linear-gradient(90deg, ${theme.cyan}30, transparent)`
                              : `linear-gradient(270deg, ${theme.danger}30, transparent)`)
                          : 'rgba(255, 255, 255, 0.02)';
                      }}
                    >
                      {e}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AGGIUNGI ANIMAZIONE CSS */}
          <style>{`
            @keyframes eventFadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .sim-events-feed::-webkit-scrollbar {
              width: 6px;
            }

            .sim-events-feed::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 10px;
            }

            .sim-events-feed::-webkit-scrollbar-thumb {
              background: ${theme.cyan}60;
              border-radius: 10px;
            }

            .sim-events-feed::-webkit-scrollbar-thumb:hover {
              background: ${theme.cyan}90;
            }
          `}</style>
        </div>

        <div style={{
        position: 'absolute',
        marginTop: '-140px',
        marginLeft: '-350px',
        width: '100%',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        color: simulationEnded ? theme.cyan : theme.success,  // 👈 Cambia colore
        textShadow: simulationEnded
          ? `0 0 10px ${theme.cyan}`
          : `0 0 10px ${theme.success}`,
        animation: simulationEnded ? 'none' : 'pulse 2s infinite',  // 👈 Ferma animazione
        pointerEvents: 'none'
      }}>
        {simulationEnded
          ? <>
          ⚙️ ELABORAZIONE AI CONCLUSA<br/>
          {'\u00A0'.repeat(12)}✅ VERIFICA I DATI DEL RESOCONTO 📊
        </>

          : '✅ ELABORAZIONE DATI IN TEMPO REALE...'}
      </div>


        {/* ✅ BARRA RISCALDAMENTO */}
        {isWarmingUp && (
          <div style={{ width: '100%', maxWidth: '900px', marginTop: '15px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ color: theme.cyan, fontSize: '14px', fontWeight: 'bold' }}>
                🏃 RISCALDAMENTO PRE-PARTITA
              </span>
              <span style={{ color: theme.text, fontSize: '14px' }}>
                {Math.round(warmupProgress)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${warmupProgress}%`,
                height: '100%',
                backgroundColor: theme.cyan,
                boxShadow: `0 0 10px ${theme.cyan}`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* ✅ BOTTONI TOP RIGHT (FORMAZIONI + RIEPILOGO) */}
        <div className="sim-top-right-buttons">
          {/* BOTTONE FORMAZIONI */}
          {formations && (
            <button
              className="btn-formazioni"  // 👈 AGGIUNGI QUESTA CLASSE
              onClick={() => {
                setShowFormationsPopup(true);
                setPopupOpacity(1);
              }}
              style={{
                background: 'rgba(0,0,0,0.7)',
                border: `1px solid ${theme.cyan}`,
                borderRadius: '8px',
                padding: '8px 12px',
                color: theme.cyan,
                position: 'relative',
                cursor: 'pointer',
                fontSize: '12px',
                zIndex: 50
                // Togli position/marginTop qui, li gestiamo in CSS
              }}
            >
              📋 Formazioni
            </button>
          )}

          {/* BOTTONE RIEPILOGO PARTITA */}
          {simulationEnded && (
            <button
              className="btn-riepilogo"  // 👈 AGGIUNGI QUESTA CLASSE
              onClick={() => setShowMatchSummary(true)}
              style={{
                background: 'rgba(0,0,0,0.7)',
                border: `1px solid ${theme.purple}`,
                borderRadius: '8px',
                padding: '8px 12px',
                color: theme.purple,
                cursor: 'pointer',
                fontSize: '12px',
                zIndex: 50
              }}
            >
              📊 Riepilogo
            </button>
          )}
        </div>


        <div style={{
          position: 'absolute',
          marginTop: '-30px',
          color: theme.cyan,
          letterSpacing: '2px',
          marginLeft: '980px',
          marginBottom: '10px',
          fontSize: '10px',
          animation: 'pulse 2s infinite',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          SIMULAZIONE LIVE DAL CORE AI
        </div>
        {/* QUOTE - Stile migliorato */}
        <div style={{
          position: 'absolute',
          background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(138,43,226,0.15))',
          marginTop: '-89px',
          color: theme.cyan,
          border: '2px solid rgba(0,240,255,0.3)',
          borderRadius: '12px',
          letterSpacing: '5px',
          marginLeft: '820px',
          padding: '11px 15px',
          fontSize: '11px',
          fontWeight: 'bold',
          boxShadow: '0 0 20px rgba(0,240,255,0.2)',
          animation: 'pulse 2s infinite',
          textAlign: 'center',
          pointerEvents: 'none',
          backdropFilter: 'blur(10px)'
        }}>
          ⚡ QUOTE
        </div>

        <div style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'stretch',
            gap: '10px',
            height: '30px',
            marginTop: '-100px',
            marginLeft: '960px',
            paddingTop: '12px'
          }}>
            {['1', 'X', '2'].map((label, idx) => {
              const val = selectedMatch?.odds?.[label] ?? '-';
              const colors = [
                'linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,200,255,0.1))',
                'linear-gradient(135deg, rgba(138,43,226,0.2), rgba(138,43,226,0.1))',
                'linear-gradient(135deg, rgba(255,20,147,0.2), rgba(255,20,147,0.1))'
              ];
              const borderColors = [
                'rgba(0,240,255,0.4)',
                'rgba(138,43,226,0.4)',
                'rgba(255,20,147,0.4)'
              ];

              return (
                <div key={label} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: colors[idx],
                  paddingRight: '35px',
                  paddingLeft: '25px',
                  paddingBottom: '30px',
                  paddingTop: '5px',
                  borderRadius: '12px',
                  border: `2px solid ${borderColors[idx]}`,
                  boxShadow: `0 0 15px ${borderColors[idx]}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}>
                  <span style={{
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    marginLeft: '10px',
                    letterSpacing: '2px'
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    color: '#fff',
                    fontWeight: 'black',
                    fontFamily: 'monospace',
                    marginLeft: '8px',
                    textShadow: '0 0 10px rgba(255,255,255,0.3)'
                  }}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>

        {/* ✅ BOTTONI FINE PARTITA */}
        {simulationEnded && (
          <div
            className="sim-end-buttons"
            style={{
              marginTop: '-10px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              animation: 'fadeIn 0.5s ease-in'
            }}
          >


            <button
              onClick={() => {
                setViewState('result');
                setSimulationEnded(false);
              }}
              style={{
                padding: '15px 40px',
                background: `linear-gradient(135deg, ${theme.cyan}, ${theme.purple})`,
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                marginLeft: '260px',
                fontWeight: '900',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 0 30px rgba(0, 240, 255, 0.5)`,
                transition: 'all 0.3s ease',
                letterSpacing: '1px'
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget) e.currentTarget.style.transform = 'scale(1.05)';
                if (e.currentTarget) e.currentTarget.style.boxShadow = `0 0 40px rgba(0, 240, 255, 0.8)`;
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget) e.currentTarget.style.transform = 'scale(1)';
                if (e.currentTarget) e.currentTarget.style.boxShadow = `0 0 30px rgba(0, 240, 255, 0.5)`;
              }}
            >
              📊 VAI AL RESOCONTO COMPLETO
            </button>

            <button
              onClick={() => {
                setViewState('list');
                setSimulationEnded(false);
                setSimResult(null);
              }}
              style={{
                padding: '10px 30px',
                background: 'transparent',
                border: `2px solid ${theme.textDim}`,
                borderRadius: '8px',
                color: theme.textDim,
                marginLeft: '-1200px',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget) e.currentTarget.style.transform = 'scale(1.05)';
                if (e.currentTarget) e.currentTarget.style.borderColor = theme.cyan;
                if (e.currentTarget) e.currentTarget.style.color = theme.cyan;
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget) e.currentTarget.style.transform = 'scale(1)';
                if (e.currentTarget) e.currentTarget.style.borderColor = theme.textDim;
                if (e.currentTarget) e.currentTarget.style.color = theme.textDim;
              }}
            >
              ← Torna alla Lista Partite
            </button>

            <button
              onClick={handleResimulate}
              style={{
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #00f0ff, #bc13fe)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '14px',
                marginLeft: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 240, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget) e.currentTarget.style.transform = 'scale(1.05)';
                if (e.currentTarget) e.currentTarget.style.boxShadow = `0 0 40px rgba(0, 240, 255, 0.8)`;
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget) e.currentTarget.style.transform = 'scale(1)';
                if (e.currentTarget) e.currentTarget.style.boxShadow = `0 4px 20px rgba(0, 240, 255, 0.3)`;
              }}
            >
              🔄 SIMULA DI NUOVO
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AnimazionePartita;
