import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardHome from './DashboardHome';
import './BadgeClassifica_pt_pos.css'
import './styles/AppDev-grid.css';
import { checkAdmin, PERMISSIONS } from './permissions';
import './styles/SimulationAnimation.css';
import './styles/SimulationAnimation-responsive.css';
import { ArrowLeft } from 'lucide-react';

// Lazy loading per componenti pesanti
const CupMatches = lazy(() => import('./CupMatches'));
const DailyPredictions = lazy(() => import('./DailyPredictions'));
const SimulationResultView = lazy(() => import('./components/SimulationResultView'));

// Componenti estratti
import SelettoreGiornata from './AppDev/SelettoreGiornata';
import ChatBot from './AppDev/ChatBot';
import PopupFormazioni from './AppDev/PopupFormazioni';
import BarraSuperiore from './AppDev/BarraSuperiore';
import BarraLaterale from './AppDev/BarraLaterale';
import ElementoPartita from './AppDev/ElementoPartita';
import PopupRiepilogo from './AppDev/PopupRiepilogo';
import ImpostazioniSimulazione from './AppDev/ImpostazioniSimulazione';
import VistaPrePartita from './AppDev/VistaPrePartita';
import AnimazionePartita from './AppDev/AnimazionePartita';

// --- INTERFACCE & TIPI ---
import type {
  Match,
  SimulationResult,
  ChatMessage,
  ChatHistoryEntry,
  SearchResult,
  TodayLeagueGroup
} from './types';

// --- COSTANTI (estratte) ---
import {
  API_BASE,
  AI_ENGINE_URL,
  LEAGUES_MAP,
  STEMMI_CAMPIONATI,
  STEMMI_COPPE,
  theme,
  SPEED_PRESETS
} from './AppDev/costanti';

// --- STILI (estratti) ---
import { styles, getWidgetGlow } from './AppDev/stili';

// --- UTILITY (estratte) ---
import { getStemmaLeagueUrl as _getStemmaLeagueUrl } from './AppDev/utilita';

// --- HOOK (estratti) ---
import { useDatiCampionato } from './AppDev/hooks/useDatiCampionato';



export default function AppDev() {
  const location = useLocation();

  // --- DATI CAMPIONATO (hook estratto) ---
  const {
    country, setCountry,
    leagues,
    league, setLeague,
    rounds,
    selectedRound, setSelectedRound,
    matches,
    availableCountries,
    isLoadingNations,
    isLoadingMatches,
    initFromDashboard,
    sidebarPredictions,
  } = useDatiCampionato();

  // --- STATO APPLICAZIONE ---
  const [selectedCup, setSelectedCup] = useState('');
  const [activeLeague, setActiveLeague] = useState<string | null>(
    (location.state as any)?.goTo === 'PREDICTIONS' ? 'PREDICTIONS' : null
  );
  // STATO SIMULAZIONE & UI
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'list' | 'pre-match' | 'simulating' | 'result' | 'settings'>('list');

  // STATO "PARTITE DI OGGI"
  const [viewMode, setViewMode] = useState<'calendar' | 'today'>('calendar');
  const [todayData, setTodayData] = useState<TodayLeagueGroup[] | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayLeagueFilter, setTodayLeagueFilter] = useState('');
  const [todayTimeFilter, setTodayTimeFilter] = useState('tutti');

  const [isVarActive, setIsVarActive] = useState(false);


  const handleAskAI = (matchData: any) => {
    // Prepariamo un riassunto tecnico per l'IA
    const promptTecnico = `
      Analizza questa partita finita ${matchData.predicted_score}. 
      Confidence: ${matchData.report_scommesse.Analisi_Profonda.Confidence_Globale}.
      Deviazione Standard: ${matchData.report_scommesse.Analisi_Profonda.Deviazione_Standard_Totale}.
      Spiega all'utente il motivo di questo pronostico basandoti sui dati.
    `;
  
    // Inviamo il messaggio al sistema di chat che hai già
    addBotMessage("Sto analizzando i dati del DeepAnalyzer per spiegarti il pronostico..."); //
    
    // In futuro, qui chiamerai la tua API di Gemini o GPT passando 'promptTecnico'
    console.log("Dati inviati all'IA:", promptTecnico);
  };


// Wrapper locale: passa automaticamente la lega corrente alla funzione estratta
const getStemmaLeagueUrl = (mongoId?: string) => {
  const currentLeague = (typeof league !== 'undefined' && league) ? league : (activeLeague || selectedCup);
  return _getStemmaLeagueUrl(mongoId, currentLeague);
};


  // Legge se sei admin usando la funzione che hai importato
  const isAdmin = checkAdmin();

  // AGGIUNGI QUESTA RIGA:
  const [configMode, setConfigMode] = useState(4); // 4 = Default (Singola Match)


  const [selectedMatchForConfig, setSelectedMatchForConfig] = useState<Match | Match[] | null>(null);

  // PREFERENZE SIMULAZIONE
  const [simMode, setSimMode] = useState<'fast' | 'animated'>('fast');


  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const [error, setError] = useState<string | null>(null); // <--- AGGIUNGI QUESTO

  // ✅ STATI PER FORMAZIONI E RISCALDAMENTO
  const [formations, setFormations] = useState<{
    home_team: string;
    away_team: string;
    home_formation: { modulo: string; titolari: Array<{role: string; player: string; rating: number}> };
    away_formation: { modulo: string; titolari: Array<{role: string; player: string; rating: number}> };
    home_rank?: number;
    away_rank?: number;
    home_points?: number;
    away_points?: number;
  } | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupProgress, setWarmupProgress] = useState(0);
  const [showFormationsPopup, setShowFormationsPopup] = useState(false);
  const [popupOpacity, setPopupOpacity] = useState(0);
  const [playerEvents, setPlayerEvents] = useState<{[playerName: string]: {goals: number; yellow: boolean; red: boolean}}>({});

  // Temporary usage to avoid warnings (will be used in popup later)
  void showFormationsPopup;
  void playerEvents;

  // STATO ANIMAZIONE
  // E cambiala in questa (cosÃ¬ accetta sia numeri che scritte):
  const [timer, setTimer] = useState<number | string>(0);
  const [animEvents, setAnimEvents] = useState<string[]>([]);
  const [momentum, setMomentum] = useState(50); // 0 = Away domina, 100 = Home domina

  const [momentumDirection, setMomentumDirection] = useState<'casa' | 'ospite'>('casa');
  const [lastSignificantMomentum, setLastSignificantMomentum] = useState(50);

  const [pitchMsg, setPitchMsg] = useState<{testo: string, colore: string} | null>(null);

  // Stato per gestire quale radar è visibile: 'all' (tutti), 'home' (solo casa), 'away' (solo ospite)
  const [radarFocus, setRadarFocus] = useState<'all' | 'home' | 'away'>('all');

  // Stato per il tooltip del singolo punto (quando passi sulle punte)
  const [pointTooltip, setPointTooltip] = useState<{ x: number, y: number, val: number, color: string } | null>(null);

  // STATO CHATBOT (Ora inizializzato a FALSE = Chiuso)
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'AI Simulator Coach attivo. Partite, pronostici, analisi \u2014 chiedimi tutto.', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // STATO COACH AI
  const [chatMatchContext, setChatMatchContext] = useState<{
    home: string; away: string; date: string; league: string;
  } | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [hoveredRound, setHoveredRound] = React.useState<string | null>(null);


  // --- STATI SETTINGS ENGINE ---
  const [configAlgo, setConfigAlgo] = useState(5);         // Default Monte Carlo
 
  const [configSaveDb, setConfigSaveDb] = useState(false); // Salva su DB? (Checkbox)
  const [configDebug, setConfigDebug] = useState(true);    // Debug Mode? (Checkbox)

 // STATO PER L'INTERRUTTORE FLASH (Aggiungi questo)
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);





  
  // Questo ref conterrÃ  SEMPRE lo stato aggiornato dell'app
  const stateRef = useRef({
    isPopupOpen: false,
    mobileMenu: false,
    expandedMatch: null as string | null,
    viewState: 'list',
    activeLeague: null as string | null,

    // // modificato per: tracciare la coppa selezionata nel sistema di navigazione
    selectedCup: '',

    rounds: [] as any,
    viewMode: 'calendar' as 'calendar' | 'today'
  });
  
  


  // Stato velocitÃ  simulazione
  const [selectedSpeed, setSelectedSpeed] = useState(4); // Default Standard
  const [customCycles, setCustomCycles] = useState(50);  // Valore manuale
  // ---------------------------------------------------------

  // STATI PER POPUP "SIMULA DI NUOVO"
  const [showResimulatePopup, setShowResimulatePopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [tempAlgo, setTempAlgo] = useState(configAlgo);
  const [tempCycles, setTempCycles] = useState(customCycles);

  const [selectedPeriod, setSelectedPeriod] = useState<'previous' | 'current' | 'next'>('current');

  // ✅ NUOVO: Stato per gestire la fine partita
  const [simulationEnded, setSimulationEnded] = useState(false);

  // ✅ NUOVO: Punteggio live durante la simulazione
  const [liveScore, setLiveScore] = useState<{home: number, away: number}>({home: 0, away: 0});

  const [showMatchSummary, setShowMatchSummary] = useState(false);

    // --- FUNZIONE getCycles ---
    const getCycles = (): number => {
      return customCycles;
    };

  // Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  // Detect mobile resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

// =========================================================================
  //       NAVIGAZIONE DEFINITIVA (FIX: isBackNav + TORNA A CASA)
  // =========================================================================

  // 1. SEMAFORO DI SICUREZZA (La riga che mancava!)
  const isBackNav = useRef(false);

  // 2. SINCRONIZZAZIONE STATO
  useEffect(() => {
    stateRef.current = {
      isPopupOpen: showMatchSummary || showFormationsPopup || showResimulatePopup ||
                   showSettingsPopup || chatOpen,
      mobileMenu: mobileMenuOpen,
      expandedMatch: expandedMatch,
      viewState: viewState,
      activeLeague: activeLeague,
      // // modificato per: risolvere errore TS2741 e sincronizzare la coppa
      selectedCup: selectedCup,
      rounds: rounds,
      viewMode: viewMode
    };
  }, [showMatchSummary, showFormationsPopup, showResimulatePopup, showSettingsPopup,
      chatOpen, mobileMenuOpen, expandedMatch, viewState, activeLeague, rounds, selectedCup, viewMode]);


  // 3. MOTORE: SCRIVE L'URL (Rispetta il semaforo isBackNav)
  useEffect(() => {
    // Se stiamo tornando indietro (Semaforo ROSSO), non spingere nulla nella history
    if (isBackNav.current) {
        isBackNav.current = false; // Reset semaforo
        return; 
    }

    // --- PrioritÃ  Assolute (Menu e Popup) ---
    if (mobileMenuOpen) {
        if (window.location.hash !== '#menu') window.history.pushState(null, '', '#menu');
        return;
    }
    if (showMatchSummary || showFormationsPopup || showResimulatePopup || showSettingsPopup || chatOpen) {
        if (window.location.hash !== '#dialog') window.history.pushState(null, '', '#dialog');
        return;
    }

    // --- Livello 3: Analisi Partita ---
    if (viewState === 'pre-match' || viewState === 'simulating' || viewState === 'result') {
        if (window.location.hash !== '#match') window.history.pushState(null, '', '#match');
    }
    // --- Livello 2: Card Espansa ---
    else if (expandedMatch) {
        if (window.location.hash !== '#detail') window.history.pushState(null, '', '#detail');
    }

    // --- Livello 1.5: Vista Oggi ---
    else if (viewMode === 'today') {
        if (window.location.hash !== '#today') window.history.pushState(null, '', '#today');
    }

    // --- Livello 1: Lista Partite (AGGIORNATO) ---
    else if (activeLeague || selectedCup) {
      const targetHash = selectedCup ? '#cuplist' : '#list';

      // 1. Se siamo in Home, spingiamo l'URL nuovo nella cronologia
      if (window.location.hash === '' || window.location.hash === '#home') {
          window.history.pushState(null, '', targetHash);
      }
      // 2. Se l'URL è sbagliato (es. siamo su #list ma serve #cuplist, o torniamo da un popup)
      // // modificato per: sincronizzazione immediata hash quando si cambia tipo di competizione
      else if (window.location.hash !== targetHash) {
          window.history.replaceState(null, '', targetHash);
      }
    }
    // --- Livello 0: Dashboard (#home) ---
    else {
        if (window.location.hash !== '#home') {
            window.history.replaceState(null, '', '#home');
        }
    }
  }, [viewState, expandedMatch, activeLeague, mobileMenuOpen, showMatchSummary, showFormationsPopup, showResimulatePopup, showSettingsPopup, chatOpen, selectedCup, viewMode]);


  // 4. GESTIONE TASTO INDIETRO (Logica Aggressiva)
  useEffect(() => {
    const handleHashChange = () => {
      // 🛑 ATTIVIAMO IL SEMAFORO
      isBackNav.current = true;

      const currentHash = window.location.hash;
      const current = stateRef.current;

      // 1. Chiusura Menu/Popup
      if (current.mobileMenu && currentHash !== '#menu') { setMobileMenuOpen(false); return; }
      if (current.isPopupOpen && currentHash !== '#dialog') {
          setShowMatchSummary(false); setShowFormationsPopup(false); setPopupOpacity(0);
          setShowResimulatePopup(false); setShowSettingsPopup(false); setChatOpen(false);
          return;
      }

      // 2. Tornati alla CARD ESPANSA (#detail)
      if (currentHash === '#detail') {
          if (current.viewState !== 'list') {
             setViewState('list');
             setSimResult(null);
             setSimulationEnded(false);
          }
      }

      // 2.5 Tornati a Vista Oggi (#today)
      else if (currentHash === '#today') {
          setViewMode('today');
          setViewState('list');
          setSimResult(null);
          setSimulationEnded(false);
          setExpandedMatch(null);
      }

      // 3. Tornati alla LISTA (#list)
      else if (currentHash === '#list' || currentHash.startsWith('#round')) {
          setViewMode('calendar');
          
          // 🔥 UX FIX: Se sono già sulla lista e premo indietro -> Vado alla Home (chiudo tutto)
          // Questo risolve il problema di dover premere indietro 10 volte se hai cambiato 10 nazioni
          if (current.viewState === 'list' && !current.expandedMatch) {
              setActiveLeague(null); // Chiude la lega
              setMobileMenuOpen(false);
              return;
          }

          // Altrimenti torno alla lista normale
          setViewState('list');
          setSimResult(null);
          setSimulationEnded(false);
          setExpandedMatch(null);

          // Ripristina giornata corrente
          if (currentHash === '#list') {
             const currentRound = current.rounds.find((r: any) => r.type === 'current');
             if (currentRound) setSelectedRound(currentRound);
          }
      }
      
      // 4. Tornati alla HOME (#home o vuoto)
      else if (currentHash === '#home' || currentHash === '' || currentHash === '#') {
          setViewMode('calendar');
          setViewState('list');
          setExpandedMatch(null);
          setActiveLeague(null);
          setSelectedCup(''); // <--- AGGIUNGI QUESTO PER PULIRE LA COPPA
          setMobileMenuOpen(false);
      }
    };

    // Fix iniziale: Appena apro l'app, metto #home
    if (window.location.hash === '') {
        window.history.replaceState(null, '', '#home');
    }

    window.addEventListener('popstate', handleHashChange);
    return () => window.removeEventListener('popstate', handleHashChange);
  }, []);

  // --- FETCH PARTITE DI OGGI ---
  useEffect(() => {
    if (viewMode !== 'today') return;
    const fetchTodayMatches = async () => {
      setTodayLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE}/matches-today?date=${today}`);
        const data = await response.json();
        if (data.success) {
          setTodayData(data.leagues);
        }
      } catch (err) {
        console.error('Errore caricamento partite di oggi:', err);
      } finally {
        setTodayLoading(false);
      }
    };
    fetchTodayMatches();
  }, [viewMode]);

  // --- POLLING LIVE SCORES (ogni 60 secondi) ---
  useEffect(() => {
    if (viewMode !== 'today' || !todayData) return;

    const pollLiveScores = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE}/live-scores?date=${today}`);
        const data = await res.json();
        if (data.success && data.scores && data.scores.length > 0) {
          setTodayData(prev => {
            if (!prev) return prev;
            return prev.map(group => ({
              ...group,
              matches: group.matches.map(m => {
                const live = data.scores.find((s: { home: string; away: string }) => s.home === m.home && s.away === m.away);
                if (live) {
                  return { ...m, live_score: live.live_score, live_status: live.live_status, live_minute: live.live_minute };
                }
                return m;
              })
            }));
          });
        }
      } catch { /* silenzioso */ }
    };

    // Prima chiamata immediata
    pollLiveScores();
    const interval = setInterval(pollLiveScores, 60000);
    return () => clearInterval(interval);
  }, [viewMode, todayData !== null]);

  // Se l'utente seleziona un campionato dalla sidebar, torna a Calendario
  useEffect(() => {
    if (league && viewMode === 'today') {
      setViewMode('calendar');
    }
  }, [league]);

const prepareSimulation = (match: Match) => {
  setSelectedMatch(match);
  // 👇 AGGIUNGI QUESTA RIGA 👇
  setExpandedMatch(null); 
  // 👆 RISOLVE IL BUG DEL TASTO INDIETRO
  
  setViewState('pre-match');
  setSimResult(null);
  setTimer(0);
  setAnimEvents([]);
  setSimulationEnded(false);
  setLiveScore({home: 0, away: 0});

  // Reset chat Coach AI per nuova partita
  const matchDate = match.date_obj ? match.date_obj.split('T')[0] : '';
  setChatMatchContext({
    home: match.home,
    away: match.away,
    date: matchDate,
    league: league || ''
  });
  setChatHistory([]);
  setMessages([{
    id: Date.now().toString(),
    sender: 'bot',
    text: `Partita selezionata: ${match.home} vs ${match.away}. Clicca "Analizza" o scrivimi una domanda!`,
    timestamp: new Date()
  }]);
};

// ✅ FUNZIONE PER CARICARE FORMAZIONI (veloce, prima della simulazione)
const loadFormations = async (home: string, away: string, league: string) => {
  try {
    const response = await fetch('https://us-central1-puppals-456c7.cloudfunctions.net/get_formations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home, away, league })
    });
    const data = await response.json();
    if (data.success) {
      setFormations(data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Errore caricamento formazioni:', error);
    return false;
  }
};


// ✅ VERSIONE AGGIORNATA, VELOCE E FIXATA PER IL BACKEND
const startSimulation = async (algoOverride: number | null = null, cyclesOverride: number | null = null) => {
  if (!selectedMatch) return;

  // 1. DETERMINAZIONE PARAMETRI (PrioritÃ  ai valori passati dal popup)
  const useAlgo = algoOverride !== null ? algoOverride : configAlgo;
  const useCycles = cyclesOverride !== null ? cyclesOverride : customCycles;

  // 2. GESTIONE FLASH MODE
  if (isFlashActive) {
      setSimMode('fast');
  }

  // ✅ FASE 1: Reset Stati e Avvio Grafica
  setViewState('simulating');
  setIsWarmingUp(true);
  setIsVarActive(false); 
  setWarmupProgress(0);
  setFormations(null);
  setPlayerEvents({});
  
  // Parametri finali
  const finalAlgo = isFlashActive ? 1 : useAlgo;
  const finalCycles = isFlashActive ? 1 : useCycles;

  console.log(`🚀 AVVIO EFFETTIVO: Flash=${isFlashActive} | Algo=${finalAlgo} | Cicli=${finalCycles}`);

  // FIX LEAGUE: Calcoliamo il nome del campionato in modo robusto
  // (Prende quello del menu, o quello globale, o quello del match, o fallback)
  const currentLeague = league || activeLeague || (selectedMatch as any).league || 'SERIE_A';

  // Prepara il popup formazioni
  setShowFormationsPopup(true);
  setPopupOpacity(0);
  
  // Avvia barra di progresso animata
  const warmupInterval = setInterval(() => {
    setWarmupProgress(prev => {
      if (prev >= 95) return prev; 
      return prev + Math.random() * 3 + 1;
    });
  }, 200);
  
  try {
    // ✅ CARICA FORMAZIONI
    loadFormations(selectedMatch.home, selectedMatch.away, currentLeague).then(success => {
      if (success) {
        console.log("✅ Formazioni caricate!");
        setTimeout(() => setPopupOpacity(1), 8000); // Mostra popup dopo un po'
      }
    });
    
    // ✅ FASE 2: Chiamata al Backend (CON FIX BULK_CACHE)
    const res = await fetch(AI_ENGINE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Dati Standard
        main_mode: 4,
        nation: country ? country.toUpperCase() : 'ITALY',
        
        // Passiamo l'intero oggetto match per sicurezza (il backend spesso lo vuole)
        match: selectedMatch, 

        home: selectedMatch.home,
        away: selectedMatch.away,
        round: selectedRound?.name,
        
        // Parametri Algoritmo
        algo_id: finalAlgo,      
        algo_mode: finalAlgo,    // Invio doppio per sicurezza (alcune versioni backend usano _mode)
        cycles: finalCycles,     
        save_db: configSaveDb,

        // 🔥 FIX FONDAMENTALE PER ERRORE PYTHON 🔥
        bulk_cache: {
            league: currentLeague, // Qui è dove il backend cerca la cartella!
            LEAGUE_STATS: {}
        }
      })
    });

    const responseJson = await res.json();
    console.log("🔥 RISPOSTA PYTHON GREZZA:", responseJson);

    if (!responseJson.success) {
      // Se c'è un errore, mostriamo quello del backend
      throw new Error(responseJson.error || 'Errore generico dal backend');
    }
    
    // Se tutto ok, completiamo la barra
    clearInterval(warmupInterval);
    setWarmupProgress(100);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsWarmingUp(false);
      
    const enrichedData = {
      ...responseJson.data, // Di solito i dati sono dentro .data, ma il tuo backend potrebbe mandarli alla radice
      ...responseJson,      // Merge per sicurezza
      report_scommesse: responseJson.report_scommesse || responseJson.data?.report_scommesse || {
        Bookmaker: {},
        Analisi_Profonda: {
          Confidence_Globale: "N/D",
          Deviazione_Standard_Totale: 0,
          Affidabilita_Previsione: "N/D"
        }
      }
    };

    setTimeout(() => {
      setPopupOpacity(0);
      setTimeout(() => {
        setShowFormationsPopup(false);
        if (isFlashActive || simMode === 'fast') {
          setSimResult(enrichedData);
          setViewState('result'); // O 'results' a seconda di come hai chiamato la stringa
          addBotMessage(`Analisi completata! Risultato previsto: ${enrichedData.predicted_score || '-:-'}.`);
        } else {
          runAnimation(enrichedData);
        }
      }, 1000);
    }, 50);

  } catch (e: any) {
    console.error("Errore Simulazione:", e);
    clearInterval(warmupInterval);
    setIsWarmingUp(false);
    setViewState('list'); // Torna alla lista se fallisce
    setError(e.message || 'Errore di connessione');
    alert(`Errore simulazione: ${e.message || 'Errore sconosciuto'}`);
  }
};


  const runAnimation = (finalData: SimulationResult) => {
    let t = 0;
    let injuryTimeCounter = 0; 
    let isInjuryTime = false;  
    let isPaused = false;
    let isVarChecking = false;  // ← AGGIUNGI QUESTO FLAG
    
    const totalDurationMs = 30000; 
    const intervalMs = 100;
    const regularStep = 90 / (totalDurationMs / intervalMs);
    
    // RECUPERO REALISTICO CON DISTRIBUZIONE PONDERATA
  // RECUPERO - Estrai dai dati del backend (dalla cronaca)
const estraiRecupero = (cronaca: any[], tempo: 'pt' | 'st'): number => {
  const minutoRiferimento = tempo === 'pt' ? 45 : 90;
  const evento = cronaca.find(e => 
    e.minuto === minutoRiferimento && 
    e.tipo === 'info' && 
    e.testo.includes('minuti di recupero')
  );
  
  if (evento) {
    // Estrai il numero dalla stringa "Segnalati X minuti di recupero"
    const match = evento.testo.match(/(\d+)\s*minuti/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Fallback se non trovato
  return tempo === 'pt' ? 2 : 4;
};

const recuperoPT = estraiRecupero(finalData.cronaca || [], 'pt');
const recuperoST = estraiRecupero(finalData.cronaca || [], 'st');
    
    const eventiMostrati = new Set<string>();
    
    setLiveScore({home: 0, away: 0});
  
    const interval = setInterval(() => {
      if (isPaused) return;
  
      let currentMinForEvents = Math.floor(t);
  
      if (!isInjuryTime) {
        t += regularStep;
        currentMinForEvents = Math.floor(t);
        setTimer(Math.min(90, currentMinForEvents));
  
        if (currentMinForEvents === 45 || currentMinForEvents === 90) {
          isInjuryTime = true;
          injuryTimeCounter = 0;
        }
      } else {
        // RECUPERO - Timer completamente separato
        const baseMin = t < 60 ? 45 : 90;
        
        // Calcola quanto tempo dedicare ad ogni minuto di recupero (in ms)
        // Vogliamo che ogni minuto di recupero duri circa 1.5 secondi reali
        const recuperoStep = 1 / 15; // Ogni tick avanza di ~0.067 minuti di recupero
        
        injuryTimeCounter += recuperoStep;
        const displayExtra = Math.floor(injuryTimeCounter);
        
        // Aggiorna display
        if (displayExtra >= 1) {
          setTimer(`${baseMin}+${displayExtra}`);
        } else {
          setTimer(`${baseMin}+1`);
        }
      
        // FINE PRIMO TEMPO
        if (baseMin === 45 && injuryTimeCounter >= recuperoPT) {
          isPaused = true;
          setIsVarActive(false); // 👈 Spegni il VAR all'intervallo
          isInjuryTime = false;
          injuryTimeCounter = 0;
          t = 46;
          
          // Conta solo i gol VALIDI (non annullati dal VAR)
          const goalsHome = finalData.cronaca.filter((e: any) => {
            if (e.minuto > 45 || e.tipo !== 'gol' || e.squadra !== 'casa') return false;
            
            const varAnnullato = finalData.cronaca.find((v: any) => 
              v.minuto === e.minuto && v.tipo === 'VAR_VERDICT' && v.decision === 'annullato' && v.var_type === 'gol'
            );
            
            return !varAnnullato;
          }).length;

          const goalsAway = finalData.cronaca.filter((e: any) => {
            if (e.minuto > 45 || e.tipo !== 'gol' || e.squadra !== 'ospite') return false;
            
            const varAnnullato = finalData.cronaca.find((v: any) => 
              v.minuto === e.minuto && v.tipo === 'VAR_VERDICT' && v.decision === 'annullato' && v.var_type === 'gol'
            );
            
            return !varAnnullato;
          }).length;

      
          setPitchMsg({ testo: `INTERVALLO: ${goalsHome}-${goalsAway}`, colore: '#fff' });
          setTimeout(() => {
            setPitchMsg(null);
            isPaused = false;
          }, 3000);
        }
        
        // FINE SECONDO TEMPO  
        if (baseMin === 90 && injuryTimeCounter >= recuperoST) {
          clearInterval(interval);
          setIsVarActive(false); // 👈 Spegni il VAR a fine partita
          setPitchMsg({ testo: `FINALE: ${finalData.predicted_score}`, colore: '#05f9b6' });
          
          setSimResult(finalData);
          setSimulationEnded(true);
          setShowMatchSummary(true);
          
          setTimeout(() => {
            setPitchMsg(null);
          }, 3000);
        }
      }
  
      // ✅ LOGICA EVENTI CON MOMENTUM FLUIDO (CORRETTA)
      if (finalData.cronaca) {
        // CALCOLA IL MINUTO CORRETTO ANCHE PER I RECUPERI
        let minutoEvento = currentMinForEvents;
        
        if (isInjuryTime) {
          const baseMin = t < 60 ? 45 : 90;
          const extra = Math.floor(injuryTimeCounter);
          minutoEvento = baseMin + extra;
        }
        
        const eventiDelMinuto = finalData.cronaca.filter(e => e.minuto === minutoEvento);
        
        // 1. GESTIONE DEGLI EVENTI SPECIFICI (GOL, CARTELLINI, ETC.)
        eventiDelMinuto.forEach((matchEvent) => {
          const eventoId = `${matchEvent.minuto}-${matchEvent.tipo}-${matchEvent.testo}`;
          
          if (!eventiMostrati.has(eventoId)) {
            eventiMostrati.add(eventoId);
            
            // ===== GESTIONE EVENTI NORMALI (GOL, RIGORI, ROSSI, ECC.) =====
            if (!['VAR_PROCESS', 'VAR_VERDICT'].includes(matchEvent.tipo as string)) {
              // Aggiungi alla cronaca IMMEDIATAMENTE
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
              
              // --- LOGICA GOL ---
              if (matchEvent.tipo === "gol") {
                if (isVarChecking) return;  // ← BLOCCA se VAR attivo
                setLiveScore(prev => ({
                  home: matchEvent.squadra === "casa" ? prev.home + 1 : prev.home,
                  away: matchEvent.squadra === "ospite" ? prev.away + 1 : prev.away
                }));
                setMomentum(prev => 
                  matchEvent.squadra === "casa" ? Math.min(prev + 15, 100) : Math.max(prev - 15, 0)
                );
                
                // Scritta sul campo
                setPitchMsg({ 
                  testo: "⚽ GOOOL!", 
                  colore: matchEvent.squadra === "casa" ? theme.cyan : theme.danger 
                });
                setTimeout(() => setPitchMsg(null), 2000);
              }
              
              // --- LOGICA RIGORE FISCHIATO ---
              else if (matchEvent.tipo === "rigore_fischio") {
                if (isVarChecking) return;  // ← BLOCCA se VAR attivo
                setMomentum(prev => 
                  matchEvent.squadra === "casa" ? Math.min(prev + 8, 85) : Math.max(prev - 8, 15)
                );
                
                setPitchMsg({ testo: "🚨 RIGORE!", colore: "#ff9f43" });
                setTimeout(() => setPitchMsg(null), 2000);
              }
              
              // --- LOGICA ROSSO ---
              else if (matchEvent.tipo === "rosso") {
                if (isVarChecking) return;  // ← BLOCCA se VAR attivo
                setMomentum(prev => 
                  matchEvent.squadra === "casa" ? Math.min(prev + 8, 85) : Math.max(prev - 8, 15)
                );
                
                setPitchMsg({ testo: "🟥 ROSSO!", colore: theme.danger });
                setTimeout(() => setPitchMsg(null), 2000);
              }
            }
            
            // ===== VAR CHECK - BLOCCA TUTTO =====
            else if (matchEvent.tipo === "VAR_PROCESS") {
              isPaused = true;
              setIsVarActive(true);
              
              setAnimEvents(prev => [matchEvent.testo, ...prev]);
              
              const varType = (matchEvent as any).var_type || "gol";
              let checkMsg = "";
              
              if (varType === "gol") checkMsg = "⚠️ VAR: CHECK GOL...";
              else if (varType === "rigore") checkMsg = "⚠️ VAR: VERIFICA RIGORE...";
              else if (varType === "rigore_on_field_review") checkMsg = "⚠️ VAR: ON-FIELD REVIEW...";
              else if (varType === "rosso") checkMsg = "⚠️ VAR: CHECK ROSSO...";
              else if (varType === "gol_fantasma") checkMsg = "⚠️ VAR: CONTROLLO...";
              else checkMsg = "⚠️ VAR CHECK...";
              
              // 👀 MODO CATTIVO: Ridisegna la scritta ogni 100ms per 6 secondi
              let varTicks = 0;
              const varInterval = setInterval(() => {
                setPitchMsg({ testo: checkMsg, colore: "#ffcc00" });
                varTicks++;
                
                if (varTicks >= 60) {  // 60 tick x 100ms = 6 secondi
                  clearInterval(varInterval);
                }
              }, 100);
              
              // Dopo 6 secondi, mostra la sentenza
              setTimeout(() => {
                clearInterval(varInterval);  // Ferma il ridisegno
                
                const sentenzaVAR = finalData.cronaca.find((e: any) => 
                  e.minuto >= matchEvent.minuto &&
                  e.tipo === "VAR_VERDICT" &&
                  (e as any).var_type === varType
                );
                
                if (sentenzaVAR) {
                  const decision = (sentenzaVAR as any).decision;
                  setAnimEvents(prev => [sentenzaVAR.testo, ...prev]);
                  
                  if (decision === "annullato") {
                    let annullaMsg = "";
                    
                    if (varType === "gol" || varType === "gol_fantasma") {
                      annullaMsg = "❌ GOL ANNULLATO";
                      setLiveScore(prev => ({
                        home: matchEvent.squadra === "casa" ? Math.max(0, prev.home - 1) : prev.home,
                        away: matchEvent.squadra === "ospite" ? Math.max(0, prev.away - 1) : prev.away
                      }));
                    } else if (varType === "rigore" || varType === "rigore_on_field_review") {
                      annullaMsg = "❌ RIGORE ANNULLATO";
                    } else if (varType === "rosso") {
                      annullaMsg = "⚠️ ROSSO REVOCATO";
                    }
                    
                    setPitchMsg({ testo: annullaMsg, colore: "#ff2a6d" });
                    
                  } else {
                    let confermaMsg = "";
                    
                    if (varType === "gol") confermaMsg = "✅ GOL VALIDO";
                    else if (varType === "rigore" || varType === "rigore_on_field_review") confermaMsg = "✅ RIGORE CONFERMATO";
                    else if (varType === "rosso") confermaMsg = "✅ ROSSO CONFERMATO";
                    else confermaMsg = "✅ DECISIONE CONFERMATA";
                    
                    setPitchMsg({ testo: confermaMsg, colore: "#05f9b6" });
                  }
                  
                  // Rimuovi sentenza dopo 3 secondi
                  setTimeout(() => {
                    setPitchMsg(null);
                    setIsVarActive(false);
                    isPaused = false;
                  }, 3000);
                  
                } else {
                  setPitchMsg({ testo: "✅ CONTROLLO COMPLETATO", colore: "#05f9b6" });
                  setTimeout(() => {
                    setPitchMsg(null);
                    setIsVarActive(false);
                    isPaused = false;
                  }, 3000);
                }
              }, 6000);
            }
            
            
            // ===== VAR_VERDICT - Già gestito nel setTimeout di VAR_PROCESS =====
            else if (matchEvent.tipo === "VAR_VERDICT") {
              // Non fare nulla, già mostrato
              return;
            }
            
          } // fine !eventiMostrati.has
        }); // fine forEach
        

        // 2. RITORNO GRADUALE AL CENTRO (FUORI DAL FOREACH!)
        // Deve accadere indipendentemente dal fatto che ci sia un evento o meno
        if (currentMinForEvents % 3 === 0) {
          setMomentum(prev => {
              if (prev > 55) return prev - 0.1;
              if (prev < 45) return prev + 0.1;
              return prev;
          });
        }
      }
      
      // ✅ OSCILLAZIONE COSTANTE (la barra non sta mai ferma)
      setMomentum(prev => {
        // Micro-oscillazione casuale sempre attiva (-2 a +2)
        const microMove = (Math.random() - 0.5) * 4;
        
        // Ogni tanto (20% probabilitÃ ) crea un "momento di pressione"
        const pressione = Math.random();
        let nuovoMomentum = prev + microMove;
        
        if (pressione < 0.20) {
          nuovoMomentum = prev + (Math.random() * 8) + 3;
        } else if (pressione < 0.40) {
          nuovoMomentum = prev - (Math.random() * 8) - 3;
        } else if (pressione < 0.25) {
          if (prev > 55) nuovoMomentum = prev - (Math.random() * 3) - 1;
          else if (prev < 45) nuovoMomentum = prev + (Math.random() * 3) + 1;
        }
        
        // Limiti: non va mai sotto 15 o sopra 85
        nuovoMomentum = Math.max(0, Math.min(100, nuovoMomentum));
        
        // 🎯 CAMBIO POSSESSO SOLO SE MOVIMENTO SIGNIFICATIVO
        const differenza = nuovoMomentum - lastSignificantMomentum;
        
        if (Math.abs(differenza) > 10) {
          if (differenza > 10) {
            setMomentumDirection('ospite');
            setLastSignificantMomentum(nuovoMomentum);
          } else if (differenza < -10) {
            setMomentumDirection('casa');
            setLastSignificantMomentum(nuovoMomentum);
          }
        }
        
        return nuovoMomentum;
      });
      
    }, intervalMs);
  };

  // --- CHAT LOGIC (Coach AI con Mistral) ---
  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text, timestamp: new Date() }]);
  };

  const handleAnalyzeMatch = async () => {
    if (!chatMatchContext || chatLoading) return;
    const { home, away, date } = chatMatchContext;

    setChatLoading(true);
    const loadingId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'bot', text: 'Analizzo la partita...',
      timestamp: new Date(), isLoading: true
    }]);

    try {
      const url = `${API_BASE}/chat/context?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&date=${encodeURIComponent(date)}`;
      const resp = await fetch(url);
      const data = await resp.json();

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        if (data.success) {
          return [...filtered, {
            id: Date.now().toString(), sender: 'bot',
            text: data.analysis, timestamp: new Date()
          }];
        } else {
          return [...filtered, {
            id: Date.now().toString(), sender: 'bot',
            text: `Non ho trovato dati per ${home} vs ${away}. Prova con un'altra partita.`,
            timestamp: new Date(), isError: true
          }];
        }
      });

      if (data.success) {
        setChatHistory([{ role: 'assistant', content: data.analysis }]);
      }
    } catch {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: Date.now().toString(), sender: 'bot',
          text: 'Errore di connessione. Riprova tra poco.',
          timestamp: new Date(), isError: true
        }];
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleUserMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput.trim();
    setChatInput('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(), sender: 'user', text: userText, timestamp: new Date()
    }]);

    // Se non c'è partita selezionata → ricerca intelligente
    if (!chatMatchContext) {
      setChatLoading(true);
      const searchLoadingId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: searchLoadingId, sender: 'bot', text: '',
        timestamp: new Date(), isLoading: true
      }]);

      try {
        const searchResp = await fetch(`${API_BASE}/chat/search-match?q=${encodeURIComponent(userText)}`);
        const searchData = await searchResp.json();

        setMessages(prev => prev.filter(m => m.id !== searchLoadingId));

        if (searchData.success && searchData.matches?.length > 0) {
          if (searchData.matches.length === 1) {
            // 1 risultato → auto-seleziona e analizza
            const m = searchData.matches[0];
            setChatMatchContext({ home: m.home, away: m.away, date: m.date || '', league: m.league || '' });
            setChatHistory([]);
            addBotMessage(`Ho trovato ${m.home} vs ${m.away}. Analizzo...`);
            // Lancia analisi automatica dopo aver settato il contesto
            setTimeout(() => handleAnalyzeMatch(), 200);
          } else {
            // Più risultati → mostra lista con quadratini
            setMessages(prev => [...prev, {
              id: Date.now().toString(), sender: 'bot',
              text: `Ho trovato ${searchData.matches.length} partite. Seleziona quella che vuoi analizzare:`,
              timestamp: new Date(),
              searchResults: searchData.matches.map((m: SearchResult) => ({ ...m, selected: false }))
            }]);
          }
        } else {
          // Nessuna partita trovata → manda a Mistral come domanda generica
          const fallbackLoadingId = (Date.now() + 1).toString();
          setMessages(prev => [...prev, {
            id: fallbackLoadingId, sender: 'bot', text: '',
            timestamp: new Date(), isLoading: true
          }]);
          try {
            const chatResp = await fetch(`${API_BASE}/chat/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: userText, history: [] })
            });
            const chatData = await chatResp.json();
            setMessages(prev => {
              const filtered = prev.filter(m => m.id !== fallbackLoadingId);
              return [...filtered, {
                id: Date.now().toString(), sender: 'bot',
                text: chatData.success ? chatData.reply : 'Non sono riuscito a rispondere. Prova a cercare una partita specifica.',
                timestamp: new Date(),
                ...(chatData.success ? {} : { isError: true })
              }];
            });
          } catch {
            setMessages(prev => {
              const filtered = prev.filter(m => m.id !== fallbackLoadingId);
              return [...filtered, {
                id: Date.now().toString(), sender: 'bot',
                text: 'Errore di connessione. Riprova tra poco.',
                timestamp: new Date(), isError: true
              }];
            });
          }
        }
      } catch {
        setMessages(prev => prev.filter(m => m.id !== searchLoadingId));
        addBotMessage('Errore nella ricerca. Riprova tra poco.');
      } finally {
        setChatLoading(false);
      }
      return;
    }

    setChatLoading(true);
    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'bot', text: '',
      timestamp: new Date(), isLoading: true
    }]);

    const newHistory: ChatHistoryEntry[] = [...chatHistory, { role: 'user' as const, content: userText }].slice(-10);

    try {
      const resp = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home: chatMatchContext.home,
          away: chatMatchContext.away,
          date: chatMatchContext.date,
          message: userText,
          history: newHistory
        })
      });
      const data = await resp.json();

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        if (data.success) {
          return [...filtered, {
            id: Date.now().toString(), sender: 'bot',
            text: data.reply, timestamp: new Date()
          }];
        } else {
          return [...filtered, {
            id: Date.now().toString(), sender: 'bot',
            text: 'Non sono riuscito a elaborare la risposta. Riprova.',
            timestamp: new Date(), isError: true
          }];
        }
      });

      if (data.success) {
        setChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: Date.now().toString(), sender: 'bot',
          text: 'Errore di connessione. Riprova tra poco.',
          timestamp: new Date(), isError: true
        }];
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Selezione partita dalla lista risultati nella chat
  const handleSelectSearchResult = (match: SearchResult) => {
    setChatMatchContext({
      home: match.home,
      away: match.away,
      date: match.date || '',
      league: match.league || ''
    });
    setChatHistory([]);
    // Marca come selezionata nella lista
    setMessages(prev => prev.map(m => {
      if (m.searchResults) {
        return {
          ...m,
          searchResults: m.searchResults.map(r =>
            r.home === match.home && r.away === match.away && r.date === match.date
              ? { ...r, selected: true }
              : { ...r, selected: false }
          )
        };
      }
      return m;
    }));
    addBotMessage(`Partita selezionata: ${match.home} vs ${match.away}. Analizzo...`);
    // Lancia analisi dopo il settaggio del contesto
    setTimeout(() => handleAnalyzeMatch(), 200);
  };

  // --- FUNZIONI RESIMULATE ---
  const handleResimulate = () => {
    setShowResimulatePopup(true);
  };

  const handleKeepSettings = () => {
    setShowResimulatePopup(false);
    // Reset cronaca e stati animazione
    setAnimEvents([]);
    setTimer(0);
    setMomentum(50);
    setLiveScore({home: 0, away: 0});
    setSimulationEnded(false);
    setPitchMsg(null);
    // Rilancia simulazione
    startSimulation(configAlgo, customCycles);
  };

  const handleModifySettings = () => {
    setShowResimulatePopup(false);
    setTempAlgo(configAlgo);
    setTempCycles(customCycles);
    setShowSettingsPopup(true);
  };

  const handleConfirmNewSettings = () => {
    // 1. Aggiorna lo stato per la grafica (lo vedrai aggiornato al prossimo render)
    setConfigAlgo(tempAlgo);
    setCustomCycles(tempCycles);
    setShowSettingsPopup(false);
    // Reset cronaca e stati animazione
    setAnimEvents([]);
    setTimer(0);
    setMomentum(50);
    setLiveScore({home: 0, away: 0});
    setSimulationEnded(false);
    setPitchMsg(null);
    // Piccolo delay per assicurarsi che gli stati siano aggiornati
    setTimeout(() => {
      startSimulation(tempAlgo, tempCycles);
    }, 100);
  };


  // --- COMPONENTI UI RENDER ---

  const renderTodayMatches = () => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const allLeagues = todayData?.map(g => ({ id: g.league_id, name: g.league_name })) || [];

    // Filtra per campionato
    let filteredData = todayData || [];
    if (todayLeagueFilter) {
      filteredData = filteredData.filter(g => g.league_id === todayLeagueFilter);
    }

    // Filtra per orario
    filteredData = filteredData.map(g => ({
      ...g,
      matches: g.matches.filter(m => {
        if (todayTimeFilter === 'tutti') return true;
        if (todayTimeFilter === 'live') {
          // Dato reale dal daemon (priorità) oppure fallback calcolo orario
          if (m.live_status === 'Live' || m.live_status === 'HT') return true;
          const [hh, mm] = (m.match_time || '').split(':').map(Number);
          const kickoff = (!isNaN(hh) && !isNaN(mm)) ? hh * 60 + mm : -1;
          return kickoff >= 0 && nowMinutes >= kickoff && nowMinutes <= kickoff + 120 && m.status !== 'Finished';
        }
        const hour = parseInt((m.match_time || '').split(':')[0]);
        if (isNaN(hour)) return true;
        switch (todayTimeFilter) {
          case '12-14': return hour >= 12 && hour < 14;
          case '14-16': return hour >= 14 && hour < 16;
          case '16-18': return hour >= 16 && hour < 18;
          case '18-20': return hour >= 18 && hour < 20;
          case '20-22': return hour >= 20 && hour < 22;
          case '22+': return hour >= 22;
          default: return true;
        }
      })
    })).filter(g => g.matches.length > 0);

    const totalFiltered = filteredData.reduce((sum, g) => sum + g.matches.length, 0);

    return (
      <div style={{
        ...styles.arenaContent,
        padding: isMobile ? '3px 8px 0px' : styles.arenaContent.padding,
        maxWidth: isMobile ? '100vw' : '1200px',
        boxSizing: 'border-box' as const,
        overflowX: 'hidden' as const
      }}>
        {/* BARRA FILTRI */}
        <div style={{
          display: 'flex', flexWrap: 'wrap' as const, gap: '10px',
          alignItems: 'center', marginBottom: '16px', marginTop: '10px', padding: '0 4px'
        }}>
          <select
            value={todayLeagueFilter}
            onChange={e => setTodayLeagueFilter(e.target.value)}
            style={{
              background: '#1a1a24', color: '#fff',
              border: '1px solid rgba(0,240,255,0.3)', borderRadius: '10px',
              padding: '8px 12px', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', minWidth: '160px'
            }}
          >
            <option value="" style={{ background: '#1a1a24', color: '#fff' }}>Tutti i campionati</option>
            {allLeagues.map(l => (
              <option key={l.id} value={l.id} style={{ background: '#1a1a24', color: '#fff' }}>{l.name}</option>
            ))}
          </select>

          {['tutti', '12-14', '14-16', '16-18', '18-20', '20-22', '22+'].map(t => {
            const isActive = todayTimeFilter === t;
            const label = t === 'tutti' ? 'Tutti' : t === '22+' ? '22h+' : `${t}h`;
            return (
              <button
                key={t}
                onClick={() => setTodayTimeFilter(t)}
                style={{
                  padding: '6px 12px', borderRadius: '16px',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  background: isActive ? 'rgba(0,240,255,0.15)' : 'transparent',
                  color: isActive ? '#00f0ff' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 800 : 600, fontSize: '11px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            );
          })}

          <button
            onClick={() => setTodayTimeFilter('live')}
            style={{
              padding: '6px 12px', borderRadius: '16px',
              border: todayTimeFilter === 'live' ? 'none' : '1px solid rgba(239,68,68,0.3)',
              background: todayTimeFilter === 'live' ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: todayTimeFilter === 'live' ? '#ef4444' : 'rgba(239,68,68,0.5)',
              fontWeight: 800, fontSize: '11px',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#ef4444', boxShadow: '0 0 6px #ef4444',
              animation: 'pulse 1.5s infinite'
            }} />
            LIVE
          </button>

          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
            {totalFiltered} partite
          </span>
        </div>

        {/* LOADING / EMPTY / LISTA */}
        {todayLoading ? (
          <div style={{ textAlign: 'center' as const, padding: '40px', color: theme.textDim }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ marginTop: 8 }}>Caricamento partite di oggi...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '40px', color: theme.textDim }}>
            Nessuna partita trovata per oggi
            {(todayLeagueFilter || todayTimeFilter !== 'tutti') && (
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => { setTodayLeagueFilter(''); setTodayTimeFilter('tutti'); }}
                  style={{
                    background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)',
                    color: '#00f0ff', padding: '6px 16px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '12px'
                  }}
                >
                  Mostra tutte
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredData.map(group => (
            <div key={group.league_id} style={{ marginBottom: '20px' }}>
              {/* HEADER LEGA */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', marginBottom: '6px',
                borderBottom: '1px solid rgba(0,240,255,0.15)'
              }}>
                <img
                  src={STEMMI_CAMPIONATI[group.league_id] || ''}
                  alt=""
                  style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  {group.league_name}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(0,240,255,0.6)', fontWeight: 700 }}>
                  {group.country}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {group.matches.length} partite
                </span>
              </div>

              {/* PARTITE DELLA LEGA */}
              {group.matches.map(match => {
                const [hh, mm] = (match.match_time || '').split(':').map(Number);
                const kickoffMinutes = (!isNaN(hh) && !isNaN(mm)) ? hh * 60 + mm : -1;
                // Dato reale dal daemon (priorità) oppure fallback calcolo orario
                const isLive = match.live_status === 'Live' || match.live_status === 'HT' || (
                  kickoffMinutes >= 0
                  && nowMinutes >= kickoffMinutes
                  && nowMinutes <= kickoffMinutes + 120
                  && match.status !== 'Finished'
                );

                return (
                  <ElementoPartita
                    key={match.id}
                    match={match}
                    isMobile={isMobile}
                    isExpanded={expandedMatch === match.id}
                    onToggleExpand={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                    onPrepareSimulation={() => {
                      const leagueInfo = LEAGUES_MAP.find(l => l.id === group.league_id);
                      if (leagueInfo) {
                        initFromDashboard(leagueInfo.country, leagueInfo.id);
                      }
                      prepareSimulation(match);
                    }}
                    getStemmaLeagueUrl={(mongoId) => _getStemmaLeagueUrl(mongoId, group.league_id)}
                    theme={theme}
                    isLive={isLive}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderMatchList = () => (
    <div style={{
      ...styles.arenaContent,
      padding: isMobile ? '3px 8px 0px' : styles.arenaContent.padding,
      maxWidth: isMobile ? '100vw' : '1200px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>

      {/* 1. NAVIGAZIONE A CAPSULE GIORNATE */}
      <SelettoreGiornata
        rounds={rounds}
        selectedRound={selectedRound}
        setSelectedRound={setSelectedRound}
        hoveredRound={hoveredRound}
        setHoveredRound={setHoveredRound}
        isMobile={isMobile}
        selectedCup={selectedCup}
      />

      

      {/* 2. LISTA PARTITE (Stile Card "Pixel Perfect") */}
      
      {/* Se è selezionata una coppa, mostra CupMatches */}
      {selectedCup ? (
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>Caricamento...</div>}>
        <CupMatches
          cupId={selectedCup as 'UCL' | 'UEL'}
          onBack={() => {
            setSelectedCup('');
            setActiveLeague(null);
          }}
        />
      </Suspense>
      ) : isLoadingMatches ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>
          <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: theme.cyan, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ marginTop: 8 }}>Caricamento partite...</div>
        </div>
      ) : matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>Nessuna partita trovata</div>
      ) : (
        matches.map(match => {
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const todayStr = now.toISOString().split('T')[0];
          const matchDate = match.date_obj ? match.date_obj.split('T')[0] : '';
          const [hh, mm] = (match.match_time || '').split(':').map(Number);
          const kickoff = (!isNaN(hh) && !isNaN(mm)) ? hh * 60 + mm : -1;
          const isLive = match.live_status === 'Live' || match.live_status === 'HT' || (matchDate === todayStr && kickoff >= 0 && nowMin >= kickoff && nowMin <= kickoff + 120 && match.status !== 'Finished');

          return (
            <ElementoPartita
              key={match.id}
              match={match}
              isMobile={isMobile}
              isExpanded={expandedMatch === match.id}
              onToggleExpand={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
              onPrepareSimulation={() => prepareSimulation(match)}
              getStemmaLeagueUrl={getStemmaLeagueUrl}
              theme={theme}
              isLive={isLive}
            />
          );
        })
      )}
    </div>
  )

  // --- FUNZIONE MANCANTE: ANIMAZIONE GRAFICA ---
  const renderAnimation = () => (
    <AnimazionePartita
      isMobile={isMobile}
      selectedMatch={selectedMatch}
      timer={timer}
      liveScore={liveScore}
      isVarActive={isVarActive}
      formations={formations}
      isWarmingUp={isWarmingUp}
      warmupProgress={warmupProgress}
      animEvents={animEvents}
      momentum={momentum}
      momentumDirection={momentumDirection}
      pitchMsg={pitchMsg}
      simulationEnded={simulationEnded}
      configAlgo={configAlgo}
      customCycles={customCycles}
      setViewState={setViewState}
      setSimulationEnded={setSimulationEnded}
      setShowFormationsPopup={setShowFormationsPopup}
      setPopupOpacity={setPopupOpacity}
      setShowMatchSummary={setShowMatchSummary}
      setSimResult={setSimResult}
      getStemmaLeagueUrl={getStemmaLeagueUrl}
      handleResimulate={handleResimulate}
    />
  );
  // renderResult segue sotto
  const renderResult = () => {
    console.log("🎯 renderResult chiamata! viewState:", viewState);
    console.log("🎯 simResult:", simResult);
    
    if (!simResult || !simResult.success) {
      console.log("❌ simResult non valido!");
      return (
        <div style={{...styles.arenaContent, textAlign: 'center', padding: '40px'}}>
          <p style={{color: theme.textDim}}>Nessun risultato disponibile</p>
        </div>
      );
    }
    
    console.log("✅ Rendering SimulationResultView...");

  
    // ✅ VERIFICA CHE I DATI ESSENZIALI ESISTANO
    if (simResult.gh === undefined || simResult.gh === null) {
      console.error("Dati simulazione incompleti:", simResult);
      return (
        <div style={{...styles.arenaContent, textAlign: 'center', padding: '40px'}}>
          <p style={{color: theme.danger}}>❌ Errore: Dati simulazione non validi</p>
        </div>
      );
    }
  
    return (
      <div style={styles.arenaContent}>
        <button 
          onClick={() => setViewState('list')} 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: theme.textDim, 
            cursor: 'pointer', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ArrowLeft size={16} /> Torna alla lista
        </button>
  
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>Caricamento risultati...</div>}>
          <SimulationResultView
            data={simResult}
            homeName={selectedMatch?.home || 'Team Casa'}
            awayName={selectedMatch?.away || 'Team Ospite'}
            onOpenAIExplanation={() => handleAskAI(simResult)}
          />
        </Suspense>
      </div>
    );
  };


  // --- BLOCCO 0: PAGINA PRONOSTICI ---
  if (activeLeague === 'PREDICTIONS') {
    return (
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>Caricamento pronostici...</div>}>
        <DailyPredictions
          onBack={() => setActiveLeague(null)}
        />
      </Suspense>
    );
  }

    // --- BLOCCO 1: LOGICA DASHBOARD (Versione Corretta e Pulita) ---
  if (!activeLeague) {
    return (
      <DashboardHome
        onSelectLeague={(id) => {
          // ✅ GESTIONE COPPE EUROPEE (UCL / UEL)
          if (id === 'UCL' || id === 'UEL') {
            setActiveLeague(id);
            // // modificato per: attivazione specifica visualizzazione coppe
            setSelectedCup(id);  
            return;
          }

          // ✅ GESTIONE PRONOSTICI DEL GIORNO
          if (id === 'PREDICTIONS') {
            setActiveLeague('PREDICTIONS');
            setSelectedCup('');
            setLeague('');
            return;
          }

          // ---------------------------------------------------------
          // GESTIONE CAMPIONATI NAZIONALI
          // ---------------------------------------------------------

          // 1. Cerchiamo il campionato nella mappa costante
          const campionatoTrovato = LEAGUES_MAP.find(L => L.id === id);

          // 2. Determiniamo la nazione (con un fallback sicuro su Italy)
          let nazioneGiusta = "Italy";
          if (campionatoTrovato) {
            nazioneGiusta = campionatoTrovato.country;
          } else if (id.includes('premier') || id.includes('championship')) {
            nazioneGiusta = "England";
          }

          console.log(`Navigazione Dashboard: ID=${id} -> Nazione=${nazioneGiusta}`);

          // 3. Impostiamo gli stati per forzare il caricamento dei dati
          initFromDashboard(nazioneGiusta, id);
          
          // // modificato per: pulizia obbligatoria dello stato coppa per evitare conflitti
          setSelectedCup(''); 

          // 4. Reset degli stati di visualizzazione
          setViewState('list');
          setSelectedMatch(null);
          setActiveLeague(id);
        }}
      />
    );
  }

  // ✅ GESTIONE COPPE EUROPEE
 /* if (activeLeague === 'UCL' || activeLeague === 'UEL') {
    return (
      <CupMatches
        cupId={activeLeague}
        onBack={() => setActiveLeague(null)}
      />
    );
  }*/

  // --- BLOCCO 2: SITO PRINCIPALE ---
  return (
    <div style={styles.wrapper}>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      
      /* ✅ NUOVO: Animazione FadeIn per il bottone */
      @keyframes fadeIn { 
        from { 
          opacity: 0; 
          transform: translateY(20px); 
        } 
        to { 
          opacity: 1; 
          transform: translateY(0); 
        } 
      }
      
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-thumb { background: #333; borderRadius: 3px; }
    `}</style>


    {/* === POPUP SIMULA DI NUOVO === */}
    {showResimulatePopup && (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '90%',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0, 240, 255, 0.1)',
        }}>
          <h2 style={{
            margin: '0 0 10px 0',
            fontSize: '24px',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #00f0ff, #bc13fe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
          }}>
            🔄 Simula di Nuovo
          </h2>
          
          <p style={{
            color: '#888',
            textAlign: 'center',
            marginBottom: '30px',
            fontSize: '14px',
          }}>
            {selectedMatch?.home} vs {selectedMatch?.away}
          </p>

          {/* RIEPILOGO SETTAGGI ATTUALI */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Settaggi Attuali
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#00f0ff' }}>
                  {configAlgo}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>Algoritmo</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#bc13fe' }}>
                  {customCycles}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>Cicli</div>
              </div>
            </div>
          </div>

          {/* BOTTONI */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleKeepSettings}
              style={{
                flex: 1,
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #00f0ff, #0080ff)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 20px rgba(0, 240, 255, 0.3)',
              }}
            >
              ✅ MANTIENI E SIMULA
            </button>
            
            <button
              onClick={handleModifySettings}
              style={{
                flex: 1,
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              ⚙️ MODIFICA
            </button>
          </div>

          {/* CHIUDI */}
          <button
            onClick={() => setShowResimulatePopup(false)}
            style={{
              width: '100%',
              marginTop: '15px',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#666',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ✕ Annulla
          </button>
        </div>
      </div>
    )}

    {/* === POPUP MODIFICA SETTAGGI === */}
    {showSettingsPopup && (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '450px',
          width: '90%',
          border: '1px solid rgba(188, 19, 254, 0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(188, 19, 254, 0.1)',
        }}>
          <h2 style={{
            margin: '0 0 30px 0',
            fontSize: '22px',
            fontWeight: '800',
            color: '#fff',
            textAlign: 'center',
          }}>
            ⚙️ Modifica Settaggi
          </h2>

          {/* ALGORITMO */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#888',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Algoritmo
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map(algo => (
                <button
                  key={algo}
                  onClick={() => setTempAlgo(algo)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '60px',
                    padding: '12px 8px',
                    background: tempAlgo === algo 
                      ? 'linear-gradient(135deg, #bc13fe, #8b5cf6)' 
                      : 'rgba(255,255,255,0.05)',
                    border: tempAlgo === algo 
                      ? 'none' 
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: tempAlgo === algo ? '#fff' : '#888',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {algo}
                </button>
              ))}
            </div>
            <div style={{ 
              marginTop: '8px', 
              fontSize: '11px', 
              color: '#666',
              textAlign: 'center',
            }}>
              {tempAlgo === 1 && 'Statistica Pura'}
              {tempAlgo === 2 && 'Dinamico (Forma)'}
              {tempAlgo === 3 && 'Tattico (Complesso)'}
              {tempAlgo === 4 && 'Caos Estremo'}
              {tempAlgo === 5 && 'Master (Ensemble)'}
              {tempAlgo === 6 && 'MonteCarlo (Simulazioni)'}
            </div>
          </div>

          {/* CICLI */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#888',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Numero Cicli
            </label>
            <input
              type="number"
              value={tempCycles}
              onChange={(e) => setTempCycles(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '700',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '8px', 
              marginTop: '10px' 
            }}>
              {[20, 50, 100, 250, 500].map(c => (
                <button
                  key={c}
                  onClick={() => setTempCycles(c)}
                  style={{
                    padding: '6px 12px',
                    background: tempCycles === c 
                      ? 'rgba(0, 240, 255, 0.2)' 
                      : 'rgba(255,255,255,0.05)',
                    border: tempCycles === c 
                      ? '1px solid rgba(0, 240, 255, 0.5)' 
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: tempCycles === c ? '#00f0ff' : '#666',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* BOTTONI */}
          <button
            onClick={handleConfirmNewSettings}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #bc13fe, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(188, 19, 254, 0.4)',
              marginBottom: '12px',
            }}
          >
            🚀 AVVIA SIMULAZIONE
          </button>
          
          <button
            onClick={() => setShowSettingsPopup(false)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#666',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ← Indietro
          </button>
        </div>
      </div>
    )}

      {/* TOP BAR */}
      <BarraSuperiore
        isMobile={isMobile}
        isAdmin={isAdmin}
        league={league}
        leagues={leagues}
        selectedCup={selectedCup}
        country={country}
        availableCountries={availableCountries}
        stemmiCampionati={STEMMI_CAMPIONATI}
        stemmiCoppe={STEMMI_COPPE}
        styles={styles}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
        onDashboard={() => {
          if (selectedCup) {
            setSelectedCup('');
            setActiveLeague(null);
          } else {
            setActiveLeague(null);
          }
          setExpandedMatch(null);
          setViewState('list');
          setViewMode('calendar');
        }}
        viewMode={viewMode}
        onToggleViewMode={(mode) => {
          setViewMode(mode);
          if (mode === 'today') {
            setTodayLeagueFilter('');
            setTodayTimeFilter('tutti');
          }
        }}
      />
    
      <div style={styles.mainContent}>
      {/* --- MOSTRA ERRORE SE PRESENTE --- */}
      {error && (
              <div style={{
                background: 'rgba(255, 68, 68, 0.1)', 
                border: '1px solid #ff4444', 
                color: '#ff4444', 
                padding: '15px', 
                borderRadius: '8px', 
                margin: '20px', 
                textAlign: 'center', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                animation: 'fadeIn 0.3s ease'
              }}>
                <span>⚠️</span>
                {error}
                <button 
                  onClick={() => setError(null)} 
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#ff4444', 
                    cursor: 'pointer', 
                    marginLeft: '10px',
                    fontSize: '16px'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
        {/* OVERLAY MOBILE (quando menu aperto) */}
        {isMobile && (
          <div
            style={{
              ...styles.mobileOverlay,
              ...(mobileMenuOpen ? styles.mobileOverlayVisible : {})
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR (Desktop sempre visibile, Mobile drawer) */}
        <BarraLaterale
          isMobile={isMobile}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          styles={styles}
          theme={theme}
          isLoadingNations={isLoadingNations}
          country={country}
          setCountry={setCountry}
          setLeague={setLeague}
          availableCountries={availableCountries}
          selectedCup={selectedCup}
          setSelectedCup={setSelectedCup}
          league={league}
          leagues={leagues}
          setActiveLeague={setActiveLeague}
          setExpandedMatch={setExpandedMatch}
          setViewState={setViewState}
          activeLeague={activeLeague}
          configMode={configMode}
          matches={matches}
          selectedMatchForConfig={selectedMatchForConfig}
          setSelectedMatchForConfig={setSelectedMatchForConfig}
          sidebarPredictions={sidebarPredictions}
          stemmiCoppe={STEMMI_COPPE}
          stemmiCampionati={STEMMI_CAMPIONATI}
          getWidgetGlow={getWidgetGlow}
        />

        {/* MAIN ARENA */}
        <div style={styles.arena}>
          {viewState === 'list' && viewMode === 'today' && renderTodayMatches()}
          {viewState === 'list' && viewMode === 'calendar' && renderMatchList()}
          {viewState === 'pre-match' && (
            <VistaPrePartita
              theme={theme}
              styles={styles}
              isMobile={isMobile}
              selectedMatch={selectedMatch}
              getStemmaLeagueUrl={getStemmaLeagueUrl}
              viewState={viewState}
              setViewState={setViewState}
              simMode={simMode}
              setSimMode={setSimMode}
              isFlashActive={isFlashActive}
              setIsFlashActive={setIsFlashActive}
              configAlgo={configAlgo}
              setConfigAlgo={setConfigAlgo}
              customCycles={customCycles}
              setCustomCycles={setCustomCycles}
              radarFocus={radarFocus}
              setRadarFocus={setRadarFocus}
              pointTooltip={pointTooltip}
              setPointTooltip={setPointTooltip}
              startSimulation={startSimulation}
              league={league}
            />
          )}
          {viewState === 'simulating' && (simMode === 'animated' ? renderAnimation() : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>Calcolo Veloce in corso...</div>)}
          {viewState === 'settings' && (
            <ImpostazioniSimulazione
              theme={theme}
              isAdmin={isAdmin}
              simMode={simMode}
              setSimMode={setSimMode}
              setViewState={setViewState}
              configMode={configMode}
              setConfigMode={setConfigMode}
              configAlgo={configAlgo}
              setConfigAlgo={setConfigAlgo}
              selectedSpeed={selectedSpeed}
              setSelectedSpeed={setSelectedSpeed}
              customCycles={customCycles}
              setCustomCycles={setCustomCycles}
              configSaveDb={configSaveDb}
              setConfigSaveDb={setConfigSaveDb}
              configDebug={configDebug}
              setConfigDebug={setConfigDebug}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              rounds={rounds}
              selectedRound={selectedRound}
              setSelectedRound={setSelectedRound}
              country={country}
              setCountry={setCountry}
              league={league}
              setLeague={setLeague}
              availableCountries={availableCountries}
              isLoadingNations={isLoadingNations}
              LEAGUES_MAP={LEAGUES_MAP}
              matches={matches}
              selectedMatchForConfig={selectedMatchForConfig}
              setSelectedMatchForConfig={setSelectedMatchForConfig}
              setSelectedMatch={setSelectedMatch}
              PERMISSIONS={PERMISSIONS}
              SPEED_PRESETS={SPEED_PRESETS}
              getCycles={getCycles}
            />
          )}
          {viewState === 'result' && renderResult()}
        </div>
      </div>

      {/* CHATBOT WIDGET */}
      <ChatBot
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatInput={chatInput}
        setChatInput={setChatInput}
        messages={messages}
        onSendMessage={handleUserMessage}
        onAnalyzeMatch={handleAnalyzeMatch}
        onSelectSearchResult={handleSelectSearchResult}
        chatMatchContext={chatMatchContext}
        chatLoading={chatLoading}
        theme={theme}
        styles={styles}
        isMobile={isMobile}
      />

      {/* POPUP FORMAZIONI */}
      <PopupFormazioni
        show={showFormationsPopup}
        formations={formations}
        popupOpacity={popupOpacity}
        onClose={() => setShowFormationsPopup(false)}
        setPopupOpacity={setPopupOpacity}
        theme={theme}
      />


      {/* POPUP RIEPILOGO */}
      <PopupRiepilogo
        show={showMatchSummary}
        simResult={simResult}
        selectedMatch={selectedMatch}
        onClose={() => setShowMatchSummary(false)}
        theme={theme}
      />
    </div>
  );
}
