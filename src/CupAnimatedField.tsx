import { useState, useEffect } from 'react';
import './styles/SimulationAnimation.css';
import './styles/SimulationAnimation-responsive.css';

interface CupAnimatedFieldProps {
  cupId: 'UCL' | 'UEL';
  homeTeam: string;
  awayTeam: string;
  selectedMatch: any;
  onComplete: (result: any) => void;
  config: {
    algoId: number;
    cycles: number;
  };
}

const cupTheme = {
  UCL: {
    primary: '#003399',
    secondary: '#FFD700',
    accent: '#0066CC',
    cyan: '#00f0ff',
    danger: '#ef4444',
    purple: '#8b5cf6',
    success: '#10b981',
    text: '#ffffff',
    textDim: '#8b9bb4',
    bg: '#05070a',
    panel: 'rgba(18, 20, 35, 0.9)',
    panelBorder: '1px solid rgba(255, 255, 255, 0.1)',
    font: '"Inter", "Segoe UI", sans-serif',
    name: 'UEFA Champions League',
    icon: '⭐'
  },
  UEL: {
    primary: '#FF6600',
    secondary: '#FFD700',
    accent: '#FF8C00',
    cyan: '#FF8C00',
    danger: '#ef4444',
    purple: '#8b5cf6',
    success: '#10b981',
    text: '#ffffff',
    textDim: '#8b9bb4',
    bg: '#05070a',
    panel: 'rgba(18, 20, 35, 0.9)',
    panelBorder: '1px solid rgba(255, 255, 255, 0.1)',
    font: '"Inter", "Segoe UI", sans-serif',
    name: 'UEFA Europa League',
    icon: '🌟'
  }
};

// Funzione per costruire URL stemma squadra
const getStemmaUrl = (cupId: 'UCL' | 'UEL', mongoId: string) => {
  const folder = cupId === 'UCL' ? 'Champions_League' : 'Europa_League';
  return `https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2Fsquadre%2F${folder}%2F${mongoId}.png?alt=media`;
};


export default function CupAnimatedField({ 
  cupId, 
  homeTeam, 
  awayTeam, 
  selectedMatch,
  onComplete, 
  config 
}: CupAnimatedFieldProps) {
  
  const theme = cupTheme[cupId];
  const isMobile = window.innerWidth < 768;
  
  const [, setSimulationData] = useState<any>(null);
  const [, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  
  const configAlgo = config.algoId;
  const customCycles = config.cycles;
  
  // Stati per l'animazione
  const [isVarActive, setIsVarActive] = useState(false);
  const [formations, setFormations] = useState<any>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(true); // ← Parte subito in warmup
  const [warmupProgress, setWarmupProgress] = useState(0);
  const [showFormationsPopup, setShowFormationsPopup] = useState(false);
  const [popupOpacity, setPopupOpacity] = useState(0);
  const [timer, setTimer] = useState<number | string>(0);
  const [animEvents, setAnimEvents] = useState<string[]>([]);
  const [momentum, setMomentum] = useState(50);
  const [momentumDirection, setMomentumDirection] = useState<'casa' | 'ospite'>('casa');
  const [pitchMsg, setPitchMsg] = useState<{testo: string, colore: string} | null>(null);
  const [simulationEnded, setSimulationEnded] = useState(false);
  const [liveScore, setLiveScore] = useState<{home: number, away: number}>({home: 0, away: 0});
  const [showMatchSummary, setShowMatchSummary] = useState(false);
  const [, setViewState] = useState<'simulation' | 'result' | 'list'>('simulation');
// Flag per evitare doppia animazione
  const [animationStarted, setAnimationStarted] = useState(false);
  const baseBg = '#05070a';

  const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        position: 'fixed' as const,
        top: '60px',
        left: isMobile ? 0 : '322px',
        right: 0,
        bottom: 0,
        backgroundColor: baseBg,
        color: theme.text,
        fontFamily: theme.font,
        backgroundImage: `radial-gradient(circle at 50% 10%, ${theme.primary}30, ${baseBg} 60%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box' as const
      },
    
    mobileOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 999,
      opacity: 0,
      pointerEvents: 'none' as const,
      transition: 'opacity 0.3s ease'
    },
    
    mobileOverlayVisible: {
      opacity: 1,
      pointerEvents: 'auto' as const
    },
    
    arena: {
        flex: 1,
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto' as const,
        overflowX: 'hidden',
        padding: '0',
        width: '100%',
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 300px)',
        boxSizing: 'border-box' as const
      },
    
    arenaContent: {
      padding: '3px 8px 0px',
      overflowX: 'hidden',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%'
    },
    
    pitch: {
      width: '80%', 
      maxWidth: '700px', 
      height: '300px',
      marginLeft: '100px',
      marginTop: '40px',
      border: `1px solid rgba(255, 255, 255, 0.2)`,
      borderRadius: '10px',
      position: 'relative' as const, 
      overflow: 'hidden', 
      background: 'linear-gradient(135deg, #0a4d2e 0%, #0d6b3f 50%, #0a4d2e 100%)',
      boxShadow: `
        0 0 20px rgba(255, 255, 255, 0.1),
        inset 0 0 100px rgba(0, 0, 0, 0.3)
      `
    },
    
    momentumBar: {
      height: '100%',
      width: '4px',
      position: 'absolute' as const,
      top: 0,
      left: '50%',
      transition: 'left 0.5s ease-out',
      zIndex: 10,
      pointerEvents: 'none' as const
    },
    
    eventFeed: {
      marginTop: '20px',
      width: '500px',
      maxWidth: '600px',
      height: '300px',
      marginLeft: '-50px',
      overflowY: 'auto' as const,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '15px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      scrollBehavior: 'smooth' as const,
      scrollbarWidth: 'thin' as const,
      scrollbarColor: `${theme.cyan}40 rgba(255,255,255,0.1)`
    }
  };

  // Mappatura moduli
  const FORMATION_MAPPING: {[key: string]: string} = {
    "3-4-3": "3-4-3",
    "3-5-2": "3-5-2",
    "4-3-3": "4-3-3",
    "4-4-2": "4-4-2",
    "4-5-1": "4-5-1",
    "5-3-2": "5-3-2",
    "5-4-1": "5-4-1"
  };

  // Tipi per formazioni
  interface FormationPositions {
    GK: Array<{x: number, y: number}>;
    DEF: Array<{x: number, y: number}>;
    MID: Array<{x: number, y: number}>;
    ATT: Array<{x: number, y: number}>;
  }

  const normalizeModulo = (modulo: string): string => {
    return FORMATION_MAPPING[modulo] || modulo;
  };

  const getFormationPositions = (modulo: string, isHome: boolean): FormationPositions => {
    const moduloNorm = FORMATION_MAPPING[modulo] || modulo;
    
    const positions: {[key: string]: FormationPositions} = {
      "3-4-3": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 18, y: 25}, {x: 15, y: 50}, {x: 18, y: 75}],
        MID: [{x: 30, y: 12}, {x: 26, y: 38}, {x: 26, y: 62}, {x: 30, y: 88}],
        ATT: [{x: 40, y: 22}, {x: 44, y: 50}, {x: 40, y: 78}]
      },
      "3-5-2": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 18, y: 25}, {x: 15, y: 50}, {x: 18, y: 75}],
        MID: [{x: 32, y: 8}, {x: 26, y: 30}, {x: 23, y: 50}, {x: 26, y: 70}, {x: 32, y: 92}],
        ATT: [{x: 42, y: 35}, {x: 42, y: 65}]
      },
      "4-3-3": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 22, y: 12}, {x: 16, y: 35}, {x: 16, y: 65}, {x: 22, y: 88}],
        MID: [{x: 30, y: 28}, {x: 26, y: 50}, {x: 30, y: 72}],
        ATT: [{x: 40, y: 18}, {x: 44, y: 50}, {x: 40, y: 82}]
      },
      "4-4-2": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 22, y: 12}, {x: 16, y: 35}, {x: 16, y: 65}, {x: 22, y: 88}],
        MID: [{x: 32, y: 12}, {x: 26, y: 38}, {x: 26, y: 62}, {x: 32, y: 88}],
        ATT: [{x: 42, y: 35}, {x: 42, y: 65}]
      },
      "4-5-1": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 22, y: 12}, {x: 16, y: 35}, {x: 16, y: 65}, {x: 22, y: 88}],
        MID: [{x: 32, y: 8}, {x: 26, y: 30}, {x: 23, y: 50}, {x: 26, y: 70}, {x: 32, y: 92}],
        ATT: [{x: 44, y: 50}]
      },
      "5-3-2": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 24, y: 8}, {x: 18, y: 28}, {x: 15, y: 50}, {x: 18, y: 72}, {x: 24, y: 92}],
        MID: [{x: 30, y: 28}, {x: 26, y: 50}, {x: 30, y: 72}],
        ATT: [{x: 42, y: 35}, {x: 42, y: 65}]
      },
      "5-4-1": {
        GK: [{x: 6, y: 50}],
        DEF: [{x: 24, y: 8}, {x: 18, y: 28}, {x: 15, y: 50}, {x: 18, y: 72}, {x: 24, y: 92}],
        MID: [{x: 32, y: 15}, {x: 28, y: 38}, {x: 28, y: 62}, {x: 32, y: 85}],
        ATT: [{x: 44, y: 50}]
      }
    };
    
    const formation = positions[moduloNorm] || positions["4-3-3"];
    
    if (!isHome) {
      return {
        GK: formation.GK.map(p => ({ x: 100 - p.x, y: p.y })),
        DEF: formation.DEF.map(p => ({ x: 100 - p.x, y: p.y })),
        MID: formation.MID.map(p => ({ x: 100 - p.x, y: p.y })),
        ATT: formation.ATT.map(p => ({ x: 100 - p.x, y: p.y }))
      };
    }
    
    return formation;
  };

  const JerseySVG = ({ color, size = 20 }: { color: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
      <path d="M6.5 2L2 6.5V10h3v10h14V10h3V6.5L17.5 2h-4L12 4l-1.5-2h-4zM8 4h2l2 2 2-2h2l3 3v2h-2v9H7v-9H5V7l3-3z"/>
      <path d="M7 10h10v9H7z" fill={color}/>
      <path d="M5 7l3-3h2l2 2 2-2h2l3 3v2h-2v-1H7v1H5V7z" fill={color} opacity="0.8"/>
    </svg>
  );

  const handleResimulate = () => {
    setSimulationEnded(false);
    setLiveScore({home: 0, away: 0});
    setTimer(0);
    setAnimEvents([]);
    setMomentum(50);
    setPitchMsg(null);
    setIsWarmingUp(true);
    setWarmupProgress(0);
    window.location.reload();
  };  

  useEffect(() => {
    const runSimulation = async () => {
      setIsSimulating(true);
      
      // STEP 1: MOSTRA SUBITO IL CAMPO CON WARMUP
      setSimulationData({ loading: true });
      setIsWarmingUp(true);
      setWarmupProgress(0);
      
      // Avvia barra di progresso animata
      let progress = 0;
      const warmupInterval = setInterval(() => {
        progress += 2;
        setWarmupProgress(Math.min(progress, 95));
      }, 100);
      
      try {
        const API_BASE = window.location.hostname === 'localhost' 
          ? 'http://localhost:5001/puppals-456c7/us-central1/api'
          : 'https://api-6b34yfzjia-uc.a.run.app';
        
        // STEP 2: CARICA FORMAZIONI (in parallelo)
        const formationsPromise = fetch('https://us-central1-puppals-456c7.cloudfunctions.net/get_formations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            home: homeTeam, 
            away: awayTeam, 
            league: cupId
          })
        }).then(r => r.json()).catch(() => null);
        
        // STEP 3: SIMULAZIONE
        const response = await fetch(`${API_BASE}/simulation/simulate-cup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competition: cupId,
            home: homeTeam,
            away: awayTeam,
            algo_id: config.algoId,
            cycles: config.cycles
          })
        });
        
        const result = await response.json();

        // ← AGGIUNGI QUESTI LOG
        console.log('🔥 DATI GREZZI SIMULAZIONE:', result);
        console.log('⚽ RISULTATO:', result.gh, '-', result.ga);
        
        // STEP 4: GESTISCI FORMAZIONI
        const formationsData = await formationsPromise;
        if (formationsData?.success) {
          setFormations(formationsData);
          
          // ← FIX: APRI IL POPUP FORMAZIONI AUTOMATICAMENTE
          setShowFormationsPopup(true);
          setPopupOpacity(0);
          setTimeout(() => setPopupOpacity(1), 500);
        }
        
        // STEP 5: COMPLETA IL WARMUP
        clearInterval(warmupInterval);
        setWarmupProgress(100);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Chiudi popup con fade out
        setPopupOpacity(0);
        await new Promise(resolve => setTimeout(resolve, 500));
        setShowFormationsPopup(false);
        
        setIsWarmingUp(false);
        setSimulationData(result);
        
        // ← FIX: AVVIA ANIMAZIONE SOLO UNA VOLTA
        if (!animationStarted) {
          setAnimationStarted(true);
          runEventAnimation(result);
        }
        
      } catch (error) {
        console.error('Errore simulazione:', error);
        clearInterval(warmupInterval);
        setIsWarmingUp(false);
      } finally {
        setIsSimulating(false);
      }
    };
    
    runSimulation();
  }, [cupId, homeTeam, awayTeam, config.algoId, config.cycles]);

  const runEventAnimation = (finalData: any) => {
    let t = 0;
    let isPaused = false;
    let injuryTimeCounter = 0;
    let isInjuryTime = false;
    
    const totalDurationMs = 30000;
    const intervalMs = 100;
    const regularStep = 90 / (totalDurationMs / intervalMs);
    
    const eventiMostrati = new Set<string>();
    
    // Estrai minuti di recupero dalla cronaca (se presenti)
    const estraiRecupero = (cronaca: any[], tempo: 'pt' | 'st'): number => {
      const minutoRiferimento = tempo === 'pt' ? 45 : 90;
      const evento = cronaca?.find((e: any) =>
        e.minuto === minutoRiferimento &&
        e.tipo === 'info' &&
        e.testo?.includes('minuti di recupero')
      );
      
      if (evento) {
        const match = evento.testo.match(/(\d+)\s*minuti/);
        if (match) return parseInt(match[1], 10);
      }
      return tempo === 'pt' ? 2 : 4; // Default
    };
    
    const recuperoPT = estraiRecupero(finalData.cronaca || [], 'pt');
    const recuperoST = estraiRecupero(finalData.cronaca || [], 'st');
    
    setLiveScore({home: 0, away: 0});
    
    const interval = setInterval(() => {
      if (isPaused) return;
      
      let currentMinForEvents = Math.floor(t);
      
      // ═══════════════════════════════════════════════════════════════
      // GESTIONE TEMPO REGOLARE E RECUPERO
      // ═══════════════════════════════════════════════════════════════
      if (!isInjuryTime) {
        t += regularStep;
        currentMinForEvents = Math.floor(t);
        setTimer(Math.min(90, currentMinForEvents));
        
        // Entra in recupero al 45' o 90'
        if (currentMinForEvents === 45 || currentMinForEvents === 90) {
          isInjuryTime = true;
          injuryTimeCounter = 0;
        }
      } else {
        // RECUPERO - Timer separato
        const baseMin = t < 60 ? 45 : 90;
        const recuperoStep = 1 / 15; // Ogni tick avanza di ~0.067 minuti
        
        injuryTimeCounter += recuperoStep;
        const displayExtra = Math.floor(injuryTimeCounter);
        
        // Mostra 45+1, 45+2, ecc.
        if (displayExtra >= 1) {
          setTimer(`${baseMin}+${displayExtra}`);
        } else {
          setTimer(`${baseMin}+1`);
        }
        
        // Per gli eventi, calcola il minuto effettivo
        currentMinForEvents = baseMin + Math.floor(injuryTimeCounter);
        
        // FINE PRIMO TEMPO
        if (baseMin === 45 && injuryTimeCounter >= recuperoPT) {
          isPaused = true;
          setIsVarActive(false);
          isInjuryTime = false;
          injuryTimeCounter = 0;
          t = 46;
          
          setPitchMsg({ testo: `INTERVALLO`, colore: '#fff' });
          setTimeout(() => {
            setPitchMsg(null);
            isPaused = false;
          }, 3000);
        }
        
        // FINE SECONDO TEMPO  
        if (baseMin === 90 && injuryTimeCounter >= recuperoST) {
            console.log('PARTITA FINITA - simulationEnded = true');
            clearInterval(interval);
            setIsVarActive(false);
            setSimulationEnded(true);
            setSimResult(finalData);
            setPitchMsg({ testo: `FINALE: ${finalData.gh}-${finalData.ga}`, colore: theme.success });
            
            setTimeout(() => {
            setPitchMsg(null);
            setShowMatchSummary(true);  // ← Mostra il popup riepilogo
            // NON chiamare onComplete qui!
            }, 3000);
            return;
        }
      }
      
      // ═══════════════════════════════════════════════════════════════
      // GESTIONE EVENTI
      // ═══════════════════════════════════════════════════════════════
      if (finalData.cronaca) {
        // CALCOLA IL MINUTO CORRETTO ANCHE PER I RECUPERI
        let minutoEvento = currentMinForEvents;
        
        if (isInjuryTime) {
          const baseMin = t < 60 ? 45 : 90;
          const extra = Math.floor(injuryTimeCounter);
          minutoEvento = baseMin + extra;
        }
        
        const eventiDelMinuto = finalData.cronaca.filter((e: any) => e.minuto === minutoEvento);
        
        eventiDelMinuto.forEach((matchEvent: any) => {
          const eventoId = `${matchEvent.minuto}-${matchEvent.tipo}-${matchEvent.testo}`;
          
          if (!eventiMostrati.has(eventoId)) {
            eventiMostrati.add(eventoId);
            
            // GOL
            if (matchEvent.tipo === "gol") {
              if (isPaused) return;
              
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
              setLiveScore(prev => ({
                home: matchEvent.squadra === "casa" ? prev.home + 1 : prev.home,
                away: matchEvent.squadra === "ospite" ? prev.away + 1 : prev.away
              }));
              setMomentum(prev =>
                matchEvent.squadra === "casa" ? Math.min(prev + 15, 100) : Math.max(prev - 15, 0)
              );
              setPitchMsg({ testo: "⚽ GOOOL!", colore: matchEvent.squadra === "casa" ? theme.cyan : theme.danger });
              setTimeout(() => setPitchMsg(null), 2000);
            }
            
            // RIGORE
            else if (matchEvent.tipo === "rigore_fischio") {
              if (isPaused) return;
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
              setPitchMsg({ testo: "🚨 RIGORE!", colore: "#ff9f43" });
              setTimeout(() => setPitchMsg(null), 2000);
            }
            
            // ROSSO
            else if (matchEvent.tipo === "rosso") {
              if (isPaused) return;
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
              setPitchMsg({ testo: "🟥 ROSSO!", colore: theme.danger });
              setTimeout(() => setPitchMsg(null), 2000);
            }
            
            // ═══ VAR: BLOCCA IL TIMER ═══
            else if (matchEvent.tipo === "VAR_PROCESS") {
              isPaused = true;
              setIsVarActive(true);
              
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
              
              const varType = matchEvent.var_type || "gol";
              let checkMsg = "⚠️ VAR CHECK...";
              
              if (varType === "gol") checkMsg = "⚠️ VAR: CHECK GOL...";
              else if (varType === "rigore") checkMsg = "⚠️ VAR: VERIFICA RIGORE...";
              else if (varType === "rigore_on_field_review") checkMsg = "⚠️ VAR: ON-FIELD REVIEW...";
              else if (varType === "rosso") checkMsg = "⚠️ VAR: CHECK ROSSO...";
              else if (varType === "gol_fantasma") checkMsg = "⚠️ VAR: CONTROLLO...";
              
              let varTicks = 0;
              const varInterval = setInterval(() => {
                setPitchMsg({ testo: checkMsg, colore: "#ffcc00" });
                varTicks++;
                if (varTicks >= 60) clearInterval(varInterval);
              }, 100);
              
              setTimeout(() => {
                clearInterval(varInterval);
                
                const sentenzaVAR = finalData.cronaca.find((e: any) =>
                  e.minuto >= matchEvent.minuto &&
                  e.tipo === "VAR_VERDICT" &&
                  e.var_type === varType
                );
                
                if (sentenzaVAR) {
                  setAnimEvents(prev => [sentenzaVAR.testo, ...prev]);
                  
                  if (sentenzaVAR.decision === "annullato") {
                    let annullaMsg = "❌ GOL ANNULLATO";
                    
                    if (varType === "gol" || varType === "gol_fantasma") {
                      setLiveScore(prev => ({
                        home: matchEvent.squadra === "casa" ? Math.max(0, prev.home - 1) : prev.home,
                        away: matchEvent.squadra === "ospite" ? Math.max(0, prev.away - 1) : prev.away
                      }));
                    } else if (varType === "rigore" || varType === "rigore_on_field_review") {
                      annullaMsg = "❌ RIGORE ANNULLATO";
                    } else if (varType === "rosso") {
                      annullaMsg = "⚠️ ROSSO REVOCATO";
                    }
                    
                    setPitchMsg({ testo: annullaMsg, colore: theme.danger });
                  } else {
                    let confermaMsg = "✅ GOL VALIDO";
                    if (varType === "rigore" || varType === "rigore_on_field_review") {
                      confermaMsg = "✅ RIGORE CONFERMATO";
                    } else if (varType === "rosso") {
                      confermaMsg = "✅ ROSSO CONFERMATO";
                    }
                    setPitchMsg({ testo: confermaMsg, colore: theme.success });
                  }
                  
                  setTimeout(() => {
                    setPitchMsg(null);
                    setIsVarActive(false);
                    isPaused = false;
                  }, 3000);
                  
                } else {
                  setPitchMsg({ testo: "✅ CONTROLLO COMPLETATO", colore: theme.success });
                  setTimeout(() => {
                    setPitchMsg(null);
                    setIsVarActive(false);
                    isPaused = false;
                  }, 3000);
                }
              }, 6000);
            }
            
            // ALTRI EVENTI
            else if (!['VAR_VERDICT'].includes(matchEvent.tipo)) {
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
            }
          }
        });
      }
      
      // Oscillazione momentum
      if (!isPaused) {
        setMomentum(prev => {
          const microMove = (Math.random() - 0.5) * 4;
          const nuovoMomentum = Math.max(0, Math.min(100, prev + microMove));
          
          if (nuovoMomentum > 60) setMomentumDirection('casa');
          else if (nuovoMomentum < 40) setMomentumDirection('ospite');
          
          return nuovoMomentum;
        });
      }
      
    }, intervalMs);
  };

  // --- FUNZIONE MANCANTE: ANIMAZIONE GRAFICA ---
  const renderAnimation = () => (
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
  
        {/* ✅ HEADER LIVE SCORE CON CRONOMETRO */}
        <div 
          className="sim-header"
          style={{
            marginBottom: '25px',
            background: 'rgba(0, 0, 0, 0.95)',
            marginTop: '-20px',
            backdropFilter: 'blur(20px)',
            marginLeft: '300px',
            margin: '0 auto',
            padding: '15px 20px',
            borderRadius: '16px',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
            zIndex: 90,
            width: isMobile ? '90%' : '580px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* A. DATA E ORA (Orizzontale in un contenitore/capsula) */}
          <div style={{
                width: isMobile ? '30px' : '130px',
                flexShrink: 0, // Leggermente più largo per ospitare il testo in linea
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}>
                {/* Il Contenitore "Capsula" */}
                <div style={{
                  display: 'flex',
                  height: '30px',
                  alignItems: 'center',
                  gap: '2px',
                  background: 'rgba(111, 149, 170, 0.13)', // Sfondo scuro semitrasparente
                  padding: isMobile ? '4px 8px' : '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 240, 255, 0.1)', // Bordino ciano sottile
                }}>
                  {/* DATA */}
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 'bold'
                  }}>
                    {selectedMatch?.match_date 
                    ? selectedMatch.match_date.split(' ')[0].substring(0, 5).replace('-', '/') 
                    : '00/00'}
                  </span>

                  {/* Separatore verticale sottile */}
                  <span style={{ color: 'rgba(255, 255, 255, 0.1)', fontSize: '12px' }}>|</span>

                  {/* ORA */}
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 'bold'
                  }}>
                    {selectedMatch?.match_date 
                    ? selectedMatch.match_date.split(' ')[1] || '--:--'
                    : '--:--'}
                  </span>
                </div>
              </div>
          {/* CRONOMETRO */}
          <div style={{ width: '55px', textAlign: 'center' }}>
            <div 
              className={isVarActive ? 'sim-timer-pulsing' : ''} // <--- AGGIUNTO QUI
              style={{
                fontSize: isMobile ? '24px' : '24px',
                fontWeight: '900',
                color: isVarActive ? '#ff2e2e' : theme.purple, // Diventa rosso se VAR è attivo
                fontFamily: 'monospace',
                textShadow: isVarActive 
                  ? `0 0 15px #ff2e2e` 
                  : `0 0 10px ${theme.purple}`,
                transition: 'all 0.3s ease'
              }}
            >
              {timer}'
            </div>
          </div>
  
          {/* SQUADRA CASA */}
            <div style={{ width: '120px', textAlign: 'right' }}>
              <div style={{
                fontSize: '14px',
                color: theme.cyan,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: 0.7,
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px'
              }}>
                {homeTeam}
                {selectedMatch?.home_mongo_id && (
                  <img 
                    src={getStemmaUrl(cupId, selectedMatch.home_mongo_id)}
                    alt=""
                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
              <div style={{
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '900',
                color: 'white',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{selectedMatch?.home}</div>
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
            <div style={{
              fontSize: isMobile ? '24px' : '30px',
              fontWeight: '900',
              color: theme.cyan,
              fontFamily: 'monospace',
              textShadow: `0 0 10px ${theme.cyan}`,
              width: '30px',
              textAlign: 'center'
            }}>{liveScore.home}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.3)' }}>-</div>
            <div style={{
              fontSize: isMobile ? '24px' : '30px',
              fontWeight: '900',
              color: theme.danger,
              fontFamily: 'monospace',
              textShadow: `0 0 10px ${theme.danger}`,
              width: '30px',
              textAlign: 'center'
            }}>{liveScore.away}</div>
          </div>
  
          {/* SQUADRA OSPITE */}
            <div style={{ width: '120px', textAlign: 'left' }}>
              <div style={{
                fontSize: '14px',
                color: theme.danger,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: 0.7,
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '8px'
              }}>
                {selectedMatch?.away_mongo_id && (
                  <img 
                    src={getStemmaUrl(cupId, selectedMatch.away_mongo_id)}
                    alt=""
                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                {awayTeam}
              </div>
              <div style={{
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '900',
                color: 'white',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{selectedMatch?.away}</div>
            </div>
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
                  const homeUpper = (selectedMatch?.home_team || selectedMatch?.home || '').toUpperCase();
                  const awayUpper = (selectedMatch?.away_team || selectedMatch?.away || '').toUpperCase();
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
                const oddsMap: {[key: string]: string} = { '1': 'home', 'X': 'draw', '2': 'away' };
                const rawVal = selectedMatch?.odds?.[oddsMap[label]];
                const val = rawVal !== undefined ? Number(rawVal).toFixed(2) : '-';
              
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
            onClick={() => onComplete(simResult)}
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

  return (
    <div style={styles.wrapper}>
      
      
  
        {/* ARENA */}
        <div style={styles.arena}>
        {renderAnimation()}

          {/* POPUP FORMAZIONI */}
          {showFormationsPopup && formations && (
            <div 
              style={{
                position: 'fixed' as const,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                opacity: popupOpacity,
                transition: 'opacity 2s ease'
              }}
              onClick={() => {
                setPopupOpacity(0);
                setTimeout(() => setShowFormationsPopup(false), 50);
              }}
            >
              <div 
                style={{
                  background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '700px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflowY: 'auto' as const,
                  border: `1px solid ${theme.cyan}`,
                  boxShadow: `0 0 30px rgba(0,240,255,0.3)`
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '15px',
                  borderBottom: `1px solid rgba(255,255,255,0.1)`
                }}>
                  <h2 style={{ color: theme.text, margin: 0, fontSize: '20px' }}>
                    📋 FORMAZIONI UFFICIALI
                  </h2>
                  <button
                    onClick={() => setShowFormationsPopup(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme.text,
                      fontSize: '24px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px'
                }}>
                  {/* CASA */}
                  <div>
                    <div style={{
                      color: theme.cyan,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '12px',
                      textShadow: `0 0 8px ${theme.cyan}`
                    }}>
                      🏠 {formations.home_team} ({normalizeModulo(formations.home_formation?.modulo || '4-3-3')})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {formations.home_formation?.titolari?.map((player: any, idx: number) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          backgroundColor: 'rgba(0,240,255,0.1)',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${theme.cyan}`
                        }}>
                          <span style={{
                            color: theme.cyan,
                            fontSize: '11px',
                            fontWeight: 'bold',
                            minWidth: '32px'
                          }}>
                            {player.role}
                          </span>
                          <span style={{ color: theme.text, fontSize: '13px' }}>
                            {player.player}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OSPITE */}
                  <div>
                    <div style={{
                      color: theme.danger,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '12px',
                      textShadow: `0 0 8px ${theme.danger}`
                    }}>
                      ✈️ {formations.away_team} ({normalizeModulo(formations.away_formation?.modulo || '4-3-3')})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {formations.away_formation?.titolari?.map((player: any, idx: number) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          backgroundColor: 'rgba(255,107,107,0.1)',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${theme.danger}`
                        }}>
                          <span style={{
                            color: theme.danger,
                            fontSize: '11px',
                            fontWeight: 'bold',
                            minWidth: '32px'
                          }}>
                            {player.role}
                          </span>
                          <span style={{ color: theme.text, fontSize: '13px' }}>
                            {player.player}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* POPUP RIEPILOGO */}
          {showMatchSummary && simResult && (
            <div 
              style={{
                position: 'fixed' as const,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
              onClick={() => setShowMatchSummary(false)}
            >
              <div 
                style={{
                  background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '500px',
                  width: '90%',
                  border: `2px solid ${theme.purple}`,
                  boxShadow: `0 0 40px rgba(188,19,254,0.4)`
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h2 style={{ color: theme.text, margin: 0, fontSize: '18px' }}>
                    📊 RIEPILOGO PARTITA
                  </h2>
                  <button
                    onClick={() => setShowMatchSummary(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme.text,
                      fontSize: '24px',
                      cursor: 'pointer'
                    }}
                  >✕</button>
                </div>

                <div style={{
                  textAlign: 'center' as const,
                  marginBottom: '20px',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '14px', color: theme.textDim, marginBottom: '5px' }}>RISULTATO FINALE</div>
                  <div style={{ fontSize: '36px', fontWeight: '900' }}>
                    <span style={{ color: theme.cyan }}>{simResult.gh}</span>
                    <span style={{ color: theme.textDim }}> - </span>
                    <span style={{ color: theme.danger }}>{simResult.ga}</span>
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '5px' }}>
                    <span style={{ color: theme.cyan }}>{selectedMatch?.home}</span>
                    <span style={{ color: theme.textDim }}> vs </span>
                    <span style={{ color: theme.danger }}>{selectedMatch?.away}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '12px', color: theme.textDim, marginBottom: '8px' }}>⚽ MARCATORI</div>
                  <div style={{ fontSize: '13px', color: theme.text }}>
                    {simResult.cronaca?.filter((e: any) => {
                      if (e.tipo !== 'gol') return false;
                      
                      const varAnnullato = simResult.cronaca?.find((v: any) => 
                        v.minuto === e.minuto && 
                        v.tipo === 'VAR_VERDICT' && 
                        v.decision === 'annullato' &&
                        v.var_type === 'gol'
                      );
                      
                      return !varAnnullato;
                    }).map((e: any, i: number) => {
                      const testoPulito = e.testo
                        .replace(/^\d+'/, '')
                        .replace('⚽ ', '')
                        .replace(/\[.*?\]\s*/, '')
                        .replace('GOOOL! ', '')
                        .replace(/ - .*$/, '')
                        .trim();
                      
                      const squadraNome = e.squadra === 'casa' ? selectedMatch?.home : selectedMatch?.away;
                      
                      return (
                        <div key={i} style={{ 
                          marginBottom: '3px',
                          color: e.squadra === 'casa' ? theme.cyan : theme.danger 
                        }}>
                          <strong>{e.minuto}'</strong> {testoPulito} ({squadraNome})
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '11px',
                  maxHeight: '300px',
                  overflowY: 'auto' as const,
                  padding: '8px'
                }}>
                  {simResult.statistiche && Object.entries(simResult.statistiche)
                    .filter(([key]: [string, any]) => 
                      !key.includes('PT') &&                  
                      ['Possesso', 'Tiri Totali', 'Tiri in Porta', 'Tiri Fuori', 'Calci d\'Angolo', 'Attacchi', 'Attacchi Pericolosi'].some(stat => key.includes(stat))
                    )
                    .map(([key, val]: [string, any]) => {
                      const homeVal = parseInt(val[0]);
                      const awayVal = parseInt(val[1]);
                      const total = homeVal + awayVal;
                      
                      return (
                        <div key={key} style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '6px',
                          border: '1px solid rgba(0,240,255,0.1)'
                        }}>
                          <div style={{ fontSize: '9px', color: theme.textDim, textAlign: 'center' as const, marginBottom: '6px' }}>
                            {key.replace('PT', '')}
                          </div>
                          
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            width: '100%'
                          }}>
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 'bold', 
                              color: theme.cyan,
                              minWidth: '20px',
                              textAlign: 'right' as const
                            }}>
                              {val[0]}
                            </span>
                            
                            <div style={{
                              flex: 1,
                              height: '8px',
                              position: 'relative' as const,
                              display: 'flex'
                            }}>
                              <div style={{
                                position: 'absolute' as const,
                                right: 'calc(50% + 4px)',
                                width: `${(homeVal / total) * 48}%`,
                                height: '100%',
                                background: theme.cyan,
                                boxShadow: '0 0 8px rgba(0,240,255,0.5)',
                                borderRadius: '4px 0 0 4px'
                              }} />
                              
                              <div style={{
                                position: 'absolute' as const,
                                left: '50%',
                                width: '8px',
                                height: '100%',
                                background: 'rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                color: theme.textDim,
                                transform: 'translateX(-50%)'
                              }}>
                                -
                              </div>
                              
                              <div style={{
                                position: 'absolute' as const,
                                left: 'calc(50% + 4px)',
                                width: `${(awayVal / total) * 48}%`,
                                height: '100%',
                                background: theme.danger,
                                boxShadow: '0 0 8px rgba(255,42,109,0.5)',
                                borderRadius: '0 4px 4px 0'
                              }} />
                            </div>
                            
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 'bold', 
                              color: theme.danger,
                              minWidth: '20px',
                              textAlign: 'left' as const
                            }}>
                              {val[1]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div> 
    
  );
}