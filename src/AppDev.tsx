import React, { useState, useEffect, useRef } from 'react';
import DashboardHome from './DashboardHome';
import './BadgeClassifica_pt_pos.css'
import './styles/AppDev-grid.css';
import { checkAdmin, PERMISSIONS } from './permissions';
import SimulationResultView from './components/SimulationResultView';
import './styles/SimulationAnimation.css';
import { ArrowLeft, /* altre icone */ } from 'lucide-react'; //


// --- INTERFACCE & TIPI ---

interface League { id: string; name: string; country: string }
interface RoundInfo { name: string; label: string; type: 'previous' | 'current' | 'next' }

interface BvsData {
  // Le 3 Linee Grafiche
  bvs_match_index: number; // Linea Generale (-7 a +7)
  bvs_index: number;       // Forza Casa
  bvs_away: number;        // Forza Ospite

  // Il "Semaforo" e i Testi
  tip_market: string;      // Es: "CONSIGLIO TECNICO: SEGNO 1"
  tip_sign: string;        // Es: "1" o "---"
  bvs_advice: string;      // La frase narrativa
  classification: string;  // "PURO", "SEMI", "NON_BVS"

  // Affidabilità
  trust_home_letter: string; // "A", "B", "C"...
  trust_away_letter: string;

  // Quote per il confronto (Gap)
  qt_1: number;
  gap_reale?: number;      // Opzionale
}

interface Match {
  id: string; home: string; away: string;
  real_score?: string | null; match_time: string;
  status: string; date_obj: string; h2h_data?: BvsData & any
  odds?: { [key: string]: any };
}

interface SimulationResult {
  // Dati identificativi e stato
  success: boolean;
  predicted_score: string;
  gh: number;
  ga: number;
  sign: string;
  algo_name: string;
  top3: string[];
  
  // Dati per la visualizzazione (devono combaciare con SimulationResultView)
  statistiche: Record<string, [string | number, string | number]>;
  cronaca: { 
    minuto: number; 
    squadra?: 'casa' | 'ospite'; 
    tipo: 'gol' | 'cartellino' | 'cambio' | 'info' | 'rigore_fischio' | 'rigore_sbagliato' | 'rosso';
    testo: string 
  }[];

  // Modulo Scommesse (Indispensabile per il componente)
  report_scommesse: {
    Bookmaker: Record<string, string>;
    Analisi_Profonda: {
      Confidence_Globale: string;
      Deviazione_Standard_Totale: number;
      Affidabilita_Previsione: string;
    };
  };

  // NUOVO: Modulo Scommesse Professionale (Dati da Universal Simulator)
  report_scommesse_pro?: {
    analisi_dispersione: {
      std_dev: number;           // Deviazione Standard reale
      score_imprevedibilita: number; // 0-100 (più è alto, più è rischiosa)
      is_dispersed: boolean;     // Se true, attiva l'allarme giallo
      warning: string | null;    // Il messaggio di raccomandazione
    };
    probabilita_1x2: Record<string, number>; // Percentuali esatte (es. 43.5)
    value_bets: Record<string, {
      ia_prob: number;
      book_prob: number;
      diff: number;
      is_value: boolean;         // Se true, attiva la stella dorata ⭐
    }>;
    scommessa_consigliata: string; // "CONSIGLIATA", "RISCHIOSA", ecc.
    under_over: Record<string, number>;
    gol_nogol: Record<string, number>;
    top_risultati: Array<{ score: string; prob: number }>; // I 5 risultati del terminale
  };

  // Informazioni di contesto
  info_extra?: {
    valore_mercato: string;
    motivazione: string;
  };

  // Metadati tecnici
  result?: any;
  timestamp?: string;
  execution_time?: number;
  match?: any;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

// --- CONFIGURAZIONE ---

// 1. API Node.js (Questa puoi lasciarla così se l'emulatore Node funziona, o forzala al cloud anche lei)
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// 2. NUOVA API PYTHON AI -> FORZIAMO IL CLOUD!
// Usiamo sempre il link di produzione perché l'emulatore Python locale è rognoso da configurare con tutte le librerie.
const AI_ENGINE_URL = 'https://run-simulation-6b34yfzjia-uc.a.run.app';


// 1. MANTENIAMO I TUOI CODICI ORIGINALI (Nomi completi in inglese)
/*const COUNTRIES = [
  { code: 'ALL', name: 'Tutto il Mondo', flag: '🌍' },
  { code: 'Italy', name: 'Italia', flag: '🇮🇹' },
  { code: 'England', name: 'Inghilterra', flag: '🇬🇧' },
  { code: 'Spain', name: 'Spagna', flag: '🇪🇸' },
  { code: 'Germany', name: 'Germania', flag: '🇩🇪' },
  { code: 'France', name: 'Francia', flag: '🇫🇷' },
  { code: 'Netherlands', name: 'Olanda', flag: '🇳🇱' },
  { code: 'Portugal', name: 'Portogallo', flag: '🇵🇹' }
];
*/

const LEAGUES_MAP: League[] = [
  // ITALIA
  { id: 'SERIE_A', name: 'Serie A', country: 'Italy' },
  { id: 'SERIE_B', name: 'Serie B', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_A', name: 'Serie C - Gir A', country: 'Italy' },  // ✅ CAMBIA
  { id: 'SERIE_C_GIRONE_B', name: 'Serie C - Gir B', country: 'Italy' },  // ✅ CAMBIA
  { id: 'SERIE_C_GIRONE_C', name: 'Serie C - Gir C', country: 'Italy' },  // ✅ CAMBIA
  { id: 'PREMIER_LEAGUE', name: 'Premier League', country: 'England' },
  { id: 'LA_LIGA', name: 'La Liga', country: 'Spain' },
  { id: 'BUNDESLIGA', name: 'Bundesliga', country: 'Germany' },
  { id: 'LIGUE_1', name: 'Ligue 1', country: 'France' },
  { id: 'EREDIVISIE', name: 'Eredivisie', country: 'Netherlands' },
  { id: 'LIGA_PORTUGAL', name: 'Liga Portugal', country: 'Portugal' },
];

// --- TEMA NEON / SCI-FI ---
const theme = {
  bg: '#05070a',
  panel: 'rgba(18, 20, 35, 0.85)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.2)',
  cyan: '#00f0ff',
  purple: '#bc13fe',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6',
  warning: '#ff9f43',
  font: '"Inter", "Segoe UI", sans-serif'
};

// --- HELPER STILI ---
const getWidgetGlow = (color: string): React.CSSProperties => ({
  position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
  backgroundColor: color, boxShadow: `0 0 15px ${color}`
});

// --- STILI CSS-IN-JS ---
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100vw', minHeight: '100vh', backgroundColor: theme.bg,
    color: theme.text, fontFamily: theme.font,
    backgroundImage: `radial-gradient(circle at 50% 10%, #1a1c4b 0%, ${theme.bg} 60%)`,
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  topBar: {
    height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 25px', borderBottom: theme.panelBorder, backdropFilter: 'blur(10px)', zIndex: 20
  },
  logo: {
    fontSize: '22px', fontWeight: '900',
    background: `linear-gradient(to right, ${theme.cyan}, ${theme.purple})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '2px'
  },
  mainContent: {
    display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden'
  },

  // SIDEBAR NAVIGAZIONE
  sidebar: {
    width: '280px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
    borderRight: theme.panelBorder, background: 'rgba(0,0,0,0.3)', overflowY: 'auto',
    transition: 'transform 0.3s ease'
  },
  sidebarMobile: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
    background: 'rgba(5, 7, 10, 0.98)', backdropFilter: 'blur(20px)',
    zIndex: 1000, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
    overflowY: 'auto', transform: 'translateX(-100%)', transition: 'transform 0.3s ease',
    boxShadow: '4px 0 20px rgba(0,0,0,0.5)'
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)'
  },
  mobileOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 999, opacity: 0,
    pointerEvents: 'none', transition: 'opacity 0.3s ease'
  },
  mobileOverlayVisible: {
    opacity: 1, pointerEvents: 'auto'
  },

  // ARENA CENTRALE
  arena: {
    flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
    overflowY: 'auto', padding: '0'
  },
  arenaContent: {
    padding: '3px 8px 0px',
    overflowX: 'hidden',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },

  // CARDS GENERICHE
  card: {
    background: theme.panel, border: theme.panelBorder, borderRadius: '12px',
    padding: '20px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  matchRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer', transition: 'background 0.2s', borderRadius: '8px'
  },

  // DETTAGLI PRE-MATCH
  statBlock: {
    background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px',
    marginBottom: '10px', display: 'flex', justifyContent: 'space-between'
  },

  // ANIMAZIONE SIMULAZIONE
  animContainer: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', position: 'relative'
  },
  pitch: {
    width: '80%', 
    maxWidth: '700px', 
    height: '300px',
    marginLeft: '100px',
    marginTop: '40px',
    border: `1px solid rgba(255, 255, 255, 0.2)`,
    borderRadius: '10px',
    position: 'relative', 
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
    position: 'absolute',
    top: 0,
    left: '50%',
    transition: 'left 0.5s ease-out',
    zIndex: 10,
    pointerEvents: 'none'
  },
  timerDisplay: {
    fontSize: '48px', fontWeight: '900', color: theme.text,
    textShadow: `0 0 20px ${theme.cyan}`, marginBottom: '20px'
  },
  eventFeed: {
    marginTop: '20px',
    width: '500px',
    maxWidth: '600px',
    height: '300px',
    marginLeft: '-50px',
    overflowY: 'auto',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    scrollBehavior: 'smooth',
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.cyan}40 rgba(255,255,255,0.1)`
  },

  // CHAT BOT
  chatWidget: {
    position: 'fixed', bottom: '80px', right: '20px', width: '340px', height: '450px',
    background: 'rgba(12, 14, 28, 0.95)', border: theme.panelBorder, borderRadius: '16px',
    display: 'flex', flexDirection: 'column', boxShadow: '0 10px 50px rgba(0,0,0,0.7)',
    zIndex: 100, overflow: 'hidden', backdropFilter: 'blur(20px)'
  },
  chatHeader: {
    padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: `linear-gradient(90deg, rgba(188,19,254,0.2) 0%, rgba(0,0,0,0) 100%)`,
    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  chatBody: {
    flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'
  },
  msgBubble: {
    padding: '10px 14px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.4',
    maxWidth: '85%'
  },
  userMsg: {
    alignSelf: 'flex-end', background: theme.cyan, color: '#000',
    borderRadius: '12px 12px 0 12px'
  },
  botMsg: {
    alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)', color: theme.text,
    borderRadius: '12px 12px 12px 0'
  }
};



export default function AppDev() {
  // --- STATO APPLICAZIONE ---
  const [country, setCountry] = useState('');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [league, setLeague] = useState('');
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  // STATO SIMULAZIONE & UI
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'list' | 'pre-match' | 'simulating' | 'result' | 'settings'>('list');


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


  const [availableCountries, setAvailableCountries] = useState<{code: string, name: string, flag: string}[]>([]);
  const [isLoadingNations, setIsLoadingNations] = useState(true); // Consigliato: per mostrare un caricamento


  // Legge se sei admin usando la funzione che hai importato
  const isAdmin = checkAdmin();

  // AGGIUNGI QUESTA RIGA:
  const [configMode, setConfigMode] = useState(4); // 4 = Default (Singola Match)


  const [selectedMatchForConfig, setSelectedMatchForConfig] = useState<Match | Match[] | null>(null);

  // PREFERENZE SIMULAZIONE
  const [simMode, setSimMode] = useState<'fast' | 'animated'>('fast');


  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

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
  // E cambiala in questa (così accetta sia numeri che scritte):
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
    { id: '1', sender: 'bot', text: 'Ciao! Sono il tuo Football AI Coach. Seleziona una partita per iniziare.', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [hoveredRound, setHoveredRound] = React.useState<string | null>(null);


  // --- STATI SETTINGS ENGINE ---
  const [configAlgo, setConfigAlgo] = useState(5);         // Default Monte Carlo
 
  const [configSaveDb, setConfigSaveDb] = useState(false); // Salva su DB? (Checkbox)
  const [configDebug, setConfigDebug] = useState(true);    // Debug Mode? (Checkbox)

 // STATO PER L'INTERRUTTORE FLASH (Aggiungi questo)
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);


  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPress = useRef(0);


  // --- INCOLLA QUESTO BLOCCO INSIEME AGLI ALTRI useState ---

  // 1. Definiamo i preset di velocità (serve per il menu Master/MonteCarlo)
  const SPEED_PRESETS = [
    { id: 1, label: '⚡ TURBO', cycles: 100, desc: '~3 sec/match' },
    { id: 2, label: '🏃 RAPIDO', cycles: 250, desc: '~6 sec/match' },
    { id: 3, label: '🚶 VELOCE', cycles: 500, desc: '~12 sec/match' },
    { id: 4, label: '⚖️ STANDARD', cycles: 20, desc: '🚀 RAPIDO' },
    { id: 5, label: '🎯 ACCURATO', cycles: 2500, desc: '~60 sec/match' },
    { id: 6, label: '🔬 PRECISO', cycles: 5000, desc: '~2 min/match' },
    { id: 7, label: '💎 ULTRA', cycles: 12500, desc: '~5 min/match' },
    { id: 8, label: '✏️ CUSTOM', cycles: 0, desc: 'Manuale' },
  ];
  // 2. Definiamo lo stato per memorizzare la scelta
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

  // --- LOGICA DI CARICAMENTO NAZIONI DINAMICHE ---
  useEffect(() => {
  const fetchNations = async () => {
    setIsLoadingNations(true); // Risolve errore 6133: ora la funzione viene letta
    try {
      // Sostituisci con il tuo URL reale di Firebase
      // Cerca questo punto nel tuo useEffect
      const response = await fetch('https://us-central1-puppals-456c7.cloudfunctions.net/get_nations');
      const nationsFromDb = await response.json(); // Risolve errore 2304: 'data' non trovato (usiamo nationsFromDb)
      
      if (Array.isArray(nationsFromDb)) {
        // Specifichiamo (n: string) per risolvere errore 7006 (tipo any)
        const formatted = nationsFromDb.map((n: string) => ({
          code: n,
          name: n,
          flag: n === 'Italy' ? '🇮🇹' : n === 'Spain' ? '🇪🇸' : n=== 'England' ? '🇬🇧' : n === 'Germany' ? '🇩🇪' : n === 'France' ? '🇫🇷' : n === 'Netherlands' ? '🇳🇱' : n === 'Portugal' ? '🇵🇹' : ''
        }));
        
        setAvailableCountries(formatted); // Risolve errore 6133: ora lo stato viene aggiornato
        
        // Imposta la prima nazione trovata come scelta predefinita
        if (formatted.length > 0) {
          setCountry(formatted[0].code);
        }
      }
    } catch (err) {
      console.error("Errore API nazioni:", err);
    } finally {
      setIsLoadingNations(false);
    }
  };

  fetchNations();
}, []);


    // --- 2. FUNZIONE getCycles (Sostituisci quella vecchia con questa) ---
    // Questa versione è "pulita": restituisce semplicemente il numero scelto dall'utente.
    const getCycles = (): number => {
      return customCycles;
    };

    // --- 3. FUNZIONE RESET DEFAULT ---
    // Da collegare al tastino nel pannello di controllo
  /*  const handleSetDefault = () => {
      setConfigAlgo(5);      // Torna al Master AI
      setCustomCycles(50); // Torna a 50 cicli (ottimale per Algo 5)
    }; */


  // --- FETCH DATI ---
  useEffect(() => {
    fetch(`${API_BASE}/leagues?country=${country}`).then(r => r.json()).then(d => { setLeagues(d); if (d.length) setLeague(d[0].id); });
  }, [country]);

  useEffect(() => {
    if (!league) return;
    fetch(`${API_BASE}/rounds?league=${league}`).then(r => r.json()).then(d => {
      setRounds(d.rounds || []);
      const curr = d.rounds?.find((r: any) => r.type === 'current');
      if (curr) setSelectedRound(curr);
    });
  }, [league]);

  useEffect(() => {
    if (!league || !selectedRound) return;
    fetch(`${API_BASE}/matches?league=${league}&round=${selectedRound.name}`)
  .then(r => r.json())
  .then(data => {
    const validMatches = Array.isArray(data) ? data.filter(m => m && m.date_obj) : [];
    setMatches(validMatches);
  });
  }, [league, selectedRound]);

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


// ✅ GESTIONE NAVIGAZIONE PERFETTA (FIX CONFLITTO)
useEffect(() => {
  const handleBack = () => {
    // 1. GESTIONE POPUP (Priorità Massima)
    // Se c'è un popup aperto, chiudiamo SOLO quello e rimaniamo nella pagina (PushState)
    const isPopupOpen = showMatchSummary || showFormationsPopup || showResimulatePopup || 
                        showSettingsPopup || chatOpen || mobileMenuOpen;

    if (isPopupOpen) {
      window.history.pushState({ internal: true }, '', window.location.pathname); // Blocca uscita
      if (showMatchSummary) setShowMatchSummary(false);
      if (showFormationsPopup) { setShowFormationsPopup(false); setPopupOpacity(0); }
      if (showResimulatePopup) setShowResimulatePopup(false);
      if (showSettingsPopup) setShowSettingsPopup(false);
      if (chatOpen) setChatOpen(false);
      if (mobileMenuOpen) setMobileMenuOpen(false);
      return;
    }

    // 2. GESTIONE ESPANSIONE PARTITA (Mobile)
    if (expandedMatch) {
      window.history.pushState({ internal: true }, '', window.location.pathname); // Blocca uscita
      setExpandedMatch(null); 
      return; 
    }

    // 3. NAVIGAZIONE INTERNA (Analisi -> Lista)
    // Questo è il punto che non ti funzionava prima!
    if (viewState === 'pre-match' || viewState === 'simulating' || viewState === 'result' || viewState === 'settings') {
      window.history.pushState({ internal: true }, '', window.location.pathname); // Blocca uscita
      
      // Reset totale per tornare alla lista pulita
      setViewState('list');
      setSelectedMatch(null); 
      setSimulationEnded(false);
      return;
    }

    // 4. NAVIGAZIONE LEGA (Lista Partite -> Dashboard)
    if (activeLeague) {
      window.history.pushState({ internal: true }, '', window.location.pathname); // Blocca uscita
      setActiveLeague(null);
      return;
    }

    // 5. USCITA DALL'APP (Solo se siamo nella Dashboard Home)
    const now = Date.now();
    if (now - lastBackPress.current < 2000) {
      // Qui lasciamo uscire (nessun pushState)
      // Se necessario forza: window.history.back();
    } else {
      lastBackPress.current = now;
      setShowExitToast(true);
      setTimeout(() => setShowExitToast(false), 2000);
      // Blocchiamo l'uscita al primo tocco
      window.history.pushState({ internal: true }, '', window.location.pathname);
    }
  };

  // Inizializza la "trappola" appena il componente monta o cambia stato rilevante
  window.history.pushState({ internal: true }, '', window.location.pathname);
  window.addEventListener('popstate', handleBack);
  
  return () => window.removeEventListener('popstate', handleBack);
}, [
  viewState, activeLeague, selectedMatch, expandedMatch,
  showMatchSummary, showFormationsPopup, showResimulatePopup, 
  showSettingsPopup, chatOpen, mobileMenuOpen
]);


  

const prepareSimulation = (match: Match) => {
  setSelectedMatch(match);
  // ❌ RIGA CANCELLATA: window.history.pushState({page: 'match'}, '', window.location.pathname);
  // Lasciamo che sia l'useEffect globale a gestire la cronologia, altrimenti ne crea due!
  
  setViewState('pre-match');
  setSimResult(null);
  setTimer(0);
  setAnimEvents([]);
  setSimulationEnded(false);
  setLiveScore({home: 0, away: 0});

  addBotMessage(`Hai selezionato ${match.home} vs ${match.away}. Configura la simulazione e partiamo!`);
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

// ✅ TIPO PER POSIZIONI FORMAZIONE
type FormationPositions = {
  GK: {x: number; y: number}[];
  DEF: {x: number; y: number}[];
  MID: {x: number; y: number}[];
  ATT: {x: number; y: number}[];
};

// ✅ MAPPING MODULI (4 cifre → 3 cifre)
const FORMATION_MAPPING: {[key: string]: string} = {
  "3-4-2-1": "3-4-3",
  "4-2-2-2": "4-4-2",
  "4-2-3-1": "4-5-1",
  "4-3-1-2": "4-3-3",
};

// ✅ FUNZIONE PER NORMALIZZARE IL MODULO (per visualizzazione)
const normalizeModulo = (modulo: string): string => {
  return FORMATION_MAPPING[modulo] || modulo;
};

// ✅ MAPPA POSIZIONI GIOCATORI - REALISTICHE
const getFormationPositions = (modulo: string, isHome: boolean): FormationPositions => {
  const moduloNorm = FORMATION_MAPPING[modulo] || modulo;
  
  // Posizioni REALISTICHE - attaccanti meno avanzati per non sovrapporsi
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
  
  // Per squadra OSPITE: specchia orizzontalmente
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

// ✅ COMPONENTE MAGLIETTA SVG
const JerseySVG = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
    <path d="M6.5 2L2 6.5V10h3v10h14V10h3V6.5L17.5 2h-4L12 4l-1.5-2h-4zM8 4h2l2 2 2-2h2l3 3v2h-2v9H7v-9H5V7l3-3z"/>
    <path d="M7 10h10v9H7z" fill={color}/>
    <path d="M5 7l3-3h2l2 2 2-2h2l3 3v2h-2v-1H7v1H5V7z" fill={color} opacity="0.8"/>
  </svg>
);

// ✅ VERSIONE AGGIORNATA E VELOCE
const startSimulation = async (algoOverride: number | null = null, cyclesOverride: number | null = null) => {
  if (!selectedMatch) return;

  // 1. DETERMINAZIONE PARAMETRI (Priorità ai valori passati dal popup)
  // Se ricevo algoOverride/cyclesOverride uso quelli, altrimenti quelli dello stato
  const useAlgo = algoOverride !== null ? algoOverride : configAlgo;
  const useCycles = cyclesOverride !== null ? cyclesOverride : customCycles;

  // 2. GESTIONE FLASH MODE
  if (isFlashActive) {
      setSimMode('fast');
  }

  // ✅ FASE 1: Reset Stati e Avvio Grafica
  setViewState('simulating');
  setIsWarmingUp(true);
  setWarmupProgress(0);
  setFormations(null);
  setPlayerEvents({});
  
  // Parametri finali per la chiamata (considerando anche il Flash)
  const finalAlgo = isFlashActive ? 1 : useAlgo;
  const finalCycles = isFlashActive ? 1 : useCycles;

  console.log(`🚀 AVVIO EFFETTIVO: Flash=${isFlashActive} | Algo=${finalAlgo} | Cicli=${finalCycles}`);

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
    loadFormations(selectedMatch.home, selectedMatch.away, league).then(success => {
      if (success) {
        console.log("✅ Formazioni caricate!");
        setTimeout(() => setPopupOpacity(1), 8000);
      }
    });
    
    // ✅ FASE 2: Chiamata al Backend (USIAMO finalAlgo e finalCycles)
    const res = await fetch(AI_ENGINE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        main_mode: 4,
        nation: country.toUpperCase(),
        league: league,
        home: selectedMatch.home,
        away: selectedMatch.away,
        round: selectedRound?.name,
        algo_id: finalAlgo,      // <--- VALORE CORRETTO
        cycles: finalCycles,     // <--- VALORE CORRETTO
        save_db: configSaveDb
      })
    });

    const responseJson = await res.json();
    console.log("🔥 RISPOSTA PYTHON GREZZA:", responseJson);

    if (!responseJson.success || !responseJson.algo_name) {
      throw new Error(responseJson.error || 'Risposta del server incompleta');
    }
    
    clearInterval(warmupInterval);
    setWarmupProgress(100);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsWarmingUp(false);
      
    const enrichedData = {
      ...responseJson,
      report_scommesse: responseJson.report_scommesse || {
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
          setViewState('result');
          addBotMessage(`Analisi completata! Risultato previsto: ${enrichedData.predicted_score}.`);
        } else {
          runAnimation(enrichedData);
        }
      }, 1000);
    }, 50);

  } catch (e: any) {
    console.error("Errore Simulazione:", e);
    clearInterval(warmupInterval);
    setIsWarmingUp(false);
    setViewState('pre-match');
    alert(`Errore simulazione: ${e.message || 'Errore sconosciuto'}`);
  }
};


  // Trova la funzione runAnimation dentro AppDev.tsx e sostituiscila con questa:

  const runAnimation = (finalData: SimulationResult) => {
    let t = 0;
    let injuryTimeCounter = 0; 
    let isInjuryTime = false;  
    let isPaused = false;
    
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
          isInjuryTime = false;
          injuryTimeCounter = 0;
          t = 46;
          
          const goalsHome = finalData.cronaca.filter(e => e.minuto <= 45 && e.tipo === 'gol' && e.squadra === 'casa').length;
          const goalsAway = finalData.cronaca.filter(e => e.minuto <= 45 && e.tipo === 'gol' && e.squadra === 'ospite').length;
      
          setPitchMsg({ testo: `INTERVALLO: ${goalsHome}-${goalsAway}`, colore: '#fff' });
          setTimeout(() => {
            setPitchMsg(null);
            isPaused = false;
          }, 3000);
        }
        
        // FINE SECONDO TEMPO  
        if (baseMin === 90 && injuryTimeCounter >= recuperoST) {
          clearInterval(interval);
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
        eventiDelMinuto.forEach(matchEvent => {
          const eventoId = `${matchEvent.minuto}-${matchEvent.tipo}-${matchEvent.testo}`;
          
          if (!eventiMostrati.has(eventoId)) {
            eventiMostrati.add(eventoId);
            setAnimEvents(prev => [matchEvent.testo, ...prev]);
          
            // AGGIORNA PUNTEGGIO LIVE
            if (matchEvent.tipo === 'gol') {
              setLiveScore(prev => ({
                home: matchEvent.squadra === 'casa' ? prev.home + 1 : prev.home,
                away: matchEvent.squadra === 'ospite' ? prev.away + 1 : prev.away
              }));
              
              // MOMENTUM GOL (Spinta forte immediata)
              setMomentum(prev => 
                  matchEvent.squadra === 'casa' 
                      ? Math.min(prev + 20, 100) 
                      : Math.max(prev - 20, 0)
              );
            } 
            // MOMENTUM RIGORI E ROSSI
            else if (matchEvent.tipo === 'rigore_fischio' || matchEvent.tipo === 'rosso') {
              setMomentum(prev => 
                matchEvent.squadra === 'casa' 
                  ? Math.min(prev + 12, 85) 
                  : Math.max(prev - 12, 15)
              );
            } 
            // MOMENTUM CARTELLINI
            else if (matchEvent.tipo === 'cartellino') {
              setMomentum(prev => 
                matchEvent.squadra === 'casa' 
                  ? Math.max(prev - 5, 20) 
                  : Math.min(prev + 5, 80)
              );
            }
          
            // SCRITTE SUL CAMPO
            if (['gol', 'rigore_fischio', 'rigore_sbagliato', 'rosso'].includes(matchEvent.tipo)) {
              let msg = '';
              let col = '';
              
              if (matchEvent.tipo === 'gol') { 
                msg = 'GOOOL!'; 
                col = matchEvent.squadra === 'casa' ? theme.cyan : theme.danger; 
              }
              else if (matchEvent.tipo === 'rigore_fischio') { msg = 'RIGORE!'; col = '#ff9f43'; }
              else if (matchEvent.tipo === 'rigore_sbagliato') { msg = 'RIGORE PARATO!'; col = '#ffffff'; }
              else if (matchEvent.tipo === 'rosso') { msg = 'ROSSO!'; col = theme.danger; }
          
              setPitchMsg({ testo: msg, colore: col });
              setTimeout(() => setPitchMsg(null), 2000);
            }
          }
        }); // <--- FINE DEL FOREACH DEGLI EVENTI

        // 2. RITORNO GRADUALE AL CENTRO (FUORI DAL FOREACH!)
        // Deve accadere indipendentemente dal fatto che ci sia un evento o meno
        if (currentMinForEvents % 3 === 0) {
          setMomentum(prev => {
              if (prev > 55) return prev - 0.5;
              if (prev < 45) return prev + 0.5;
              return prev;
          });
        }
      }
      
      // ✅ OSCILLAZIONE COSTANTE (la barra non sta mai ferma)
      setMomentum(prev => {
        // Micro-oscillazione casuale sempre attiva (-2 a +2)
        const microMove = (Math.random() - 0.5) * 8;
        
        // Ogni tanto (20% probabilità) crea un "momento di pressione"
        const pressione = Math.random();
        let nuovoMomentum = prev + microMove;
        
        if (pressione < 0.20) {
          nuovoMomentum = prev + (Math.random() * 15) + 5;
        } else if (pressione < 0.40) {
          nuovoMomentum = prev - (Math.random() * 15) - 5;
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

  // --- CHAT LOGIC ---
  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text, timestamp: new Date() }]);
  };

  const handleUserMessage = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userText, timestamp: new Date() }]);
    setChatInput('');

    setTimeout(() => {
      let response = "Non ho capito, puoi riformulare?";
      const lower = userText.toLowerCase();

      if (lower.includes('perché') || lower.includes('spiegami')) {
        if (simResult) {
          response = `Il mio algoritmo ${simResult.algo_name} ha analizzato ${simResult.top3.length} scenari. Il punteggio ${simResult.predicted_score} è il più probabile basato sulla forma recente e gli scontri diretti.`;
        } else {
          response = "Devi prima simulare una partita per avere una spiegazione tecnica.";
        }
      } else if (lower.includes('rischio') || lower.includes('sicura')) {
        response = simResult ? "Questa partita ha un indice di volatilità medio. Ti consiglio di coprire con una doppia chance." : "Seleziona un match per calcolare il rischio.";
      } else if (lower.includes('consiglio') || lower.includes('scommessa')) {
        response = simResult ? `Consiglio principale: ${simResult.sign}. Alternativa interessante: Over 2.5.` : "Posso darti un consiglio appena avviamo l'analisi.";
      }

      addBotMessage(response);
    }, 800);
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

  const renderMatchList = () => (
    <div style={{
      ...styles.arenaContent,
      padding: isMobile ? '3px 8px 0px' : styles.arenaContent.padding,
      maxWidth: isMobile ? '100vw' : '1200px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>

      {/* 1. NAVIGAZIONE A CAPSULE INDIPENDENTI - ALLINEAMENTO PROPORZIONALE */}
      <div
        key={rounds[0]?.name}
        style={{
          display: 'flex',
          justifyContent: 'center', // Centra tutto il gruppo rispetto al VS
          alignItems: 'center',
          marginBottom: '20px',
          marginTop: '10px',
          gap: isMobile ? '8px' : '80px',// <--- REGOLA QUESTO: Aumenta o diminuisci per centrare i tasti sulle barre
          width: '100%',
        }}>
        {rounds.map(r => {
          const roundNumber = r.name.replace(/[^0-9]/g, '');
          let displayText = `Giornata ${roundNumber}`; // roundNumber;
          if (r.type === 'previous') displayText = `< Giornata ${roundNumber}`;
          if (r.type === 'next') displayText = `Giornata ${roundNumber} >`;

          const isSelected = selectedRound?.name === r.name;
          const isHovered = hoveredRound === r.name;

          return (
            <button
              key={r.name}
              onClick={() => { 
                setSelectedRound(r); 
                window.history.pushState({page: 'round'}, '', window.location.pathname);
              }}
              onMouseEnter={() => setHoveredRound(r.name)}
              onMouseLeave={() => setHoveredRound(null)}
              style={{
                // Dimensioni responsive
                width: isMobile ? 'auto' : '185px',
                minWidth: isMobile ? '90px' : '185px',
                height: isMobile ? '32px' : '38px',
                padding: isMobile ? '0 12px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',


                // Stile Capsula Indipendente
                background: isSelected
                  ? 'rgb(0, 240, 255)'
                  : 'rgba(18, 20, 35, 0.9)',

                borderRadius: '20px',
                border: isSelected
                  ? 'none'
                  : `1px solid ${isHovered ? 'rgb(0, 240, 255)' : 'rgba(0, 240, 255, 0.3)'}`,

                cursor: 'pointer',
                fontWeight: '900',
                fontSize: isMobile ? '11px' : '15px',

                color: isSelected ? 'rgb(0, 0, 0)' : 'rgb(0, 240, 255)',

                // Effetto Glow
                boxShadow: isSelected
                  ? '0 0 15px rgba(0, 240, 255, 0.6)'
                  : (isHovered ? '0 0 10px rgba(0, 240, 255, 0.4)' : 'none'),

                transition: 'all 0.3s ease',
                outline: 'none',
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {displayText}
            </button>
          );
        })}
      </div>


      

      {/* 2. LISTA PARTITE (Stile Card "Pixel Perfect") */}
      {matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>Nessuna partita trovata</div>
      ) : (



        matches.map(match => {
        //  const isFuture = selectedRound?.type === 'next';
          const showLucifero = match.h2h_data?.lucifero_home != null;
          const isExpanded = expandedMatch === match.id;

          // Recupero quote dal livello principale del match
          const bkOdds = match.odds;

          // Tipizziamo 'val' come any per accettare numeri o stringhe dal DB
          const formatOdds = (val: any): string => {
            if (val === undefined || val === null || val === '-') return '-';
            const num = Number(val);
            return isNaN(num) ? '-' : num.toFixed(2);
          };

          const odds = {
            1: formatOdds(bkOdds?.['1']),
            X: formatOdds(bkOdds?.['X']),
            2: formatOdds(bkOdds?.['2'])
          };

          return (
            <div
              key={match.id}
              onClick={() => {
                if (isMobile) {
                  setExpandedMatch(isExpanded ? null : match.id);
                } else {
                  prepareSimulation(match);
                }
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '20px',
                overflow: 'hidden',
                padding: isMobile ? '12px 10px' : '10.2px 15px',
                maxWidth: isMobile ? '95%' : '100%',
                minHeight: isMobile ? '33px' : 'auto',
                margin: isMobile ? '0 auto 5px auto' : '0 0 5px 0',
                marginBottom: '5px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: isMobile && isExpanded ? 'column' : 'row',
                alignItems: isMobile && isExpanded ? 'stretch' : 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
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
                  alignItems: 'center',
                  gap: '2px',
                  background: 'rgba(111, 149, 170, 0.13)', // Sfondo scuro semitrasparente
                  padding: isMobile ? '4px 8px' : '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 240, 255, 0.1)', // Bordino ciano sottile
                }}>
                  {/* DATA */}
                  <span style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 'bold'
                  }}>
                    {(match as any).date_obj
                      ? new Date((match as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                      : '00/00'}
                  </span>

                  {/* Separatore verticale sottile */}
                  <span style={{ color: 'rgba(255, 255, 255, 0.1)', fontSize: '12px' }}>|</span>

                  {/* ORA */}
                  <span style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 'bold'
                  }}>
                    {(match as any).match_time || '--:--'}
                  </span>
                </div>
              </div>

              {/* VERSIONE MOBILE COMPATTA */}
              {isMobile && !isExpanded ? (
                <>
                  {/* 1. NOME SQUADRE */}
                  <div style={{
                    flex: 1,
                    textAlign: 'center', // Manteniamo centrato
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 20px',
                    maxWidth: '200px',
                    marginRight: '0px',
                    marginLeft: '50px' // <--- QUESTA È LA MODIFICA: Spinge i nomi a destra
                  }}>
                    {match.home.substring(0, 12)} vs {match.away.substring(0, 12)}
                  </div>

                  {/* 2. CAPSULA RISULTATO */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(111, 149, 170, 0.13)',
                    border: '1px solid rgba(0, 240, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '2px 8px',
                    height: '24px',
                    marginLeft: '0px',
                    marginRight: '0px'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontFamily: 'monospace'
                    }}>
                      {(match as any).status === 'Finished' && (match as any).real_score
                        ? (match as any).real_score
                        : '-:-'}
                    </span>
                  </div>
                </>
              ) : !isMobile ? (
                // VERSIONE DESKTOP COMPLETA (mantieni tutto come prima)
                <>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>

                    {/* CASA */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      {showLucifero && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'rgb(5, 249, 182)', marginRight: '6px', fontWeight: 'bold', width: '30px', textAlign: 'right' }}>
                            {Math.round(((match as any).h2h_data?.lucifero_home / 25) * 100)}%
                          </span>
                          <div style={{ width: '35px', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                            <div style={{
                              width: `${Math.min(((match as any).h2h_data?.lucifero_home / 25) * 100, 100)}%`,
                              height: '100%',
                              background: 'rgb(5, 249, 182)',
                              boxShadow: '0 0 8px rgb(5, 249, 182)',
                              borderRadius: '3px'
                            }}></div>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(match as any).h2h_data?.home_rank && (
                          <span className="badge-classifica home">
                            <span className="badge-rank">{(match as any).h2h_data.home_rank}°</span>
                            {(match as any).h2h_data.home_points && (
                              <span className="badge-points">{(match as any).h2h_data.home_points}pt</span>
                            )}
                          </span>
                        )}
                        <div style={{
                          fontWeight: 'bold', fontSize: '15px', color: 'white',
                          textAlign: 'right', width: '130px', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {match.home}
                        </div>
                      </div>
                    </div>

                    {/* VS / SCORE */}
                    <div style={{
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      fontSize: '15px', fontWeight: 'bold', color: '#fff',
                      borderRadius: '8px',
                      minWidth: '50px', textAlign: 'center', margin: '0 15px', fontFamily: 'monospace'
                    }}>
                      {(match as any).status === 'Finished' && (match as any).real_score ? (match as any).real_score : 'VS'}
                    </div>

                    {/* OSPITE */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          fontWeight: 'bold', fontSize: '15px', color: 'white',
                          textAlign: 'left', width: '130px', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {match.away}
                        </div>
                        {(match as any).h2h_data?.away_rank && (
                          <span className="badge-classifica away">
                            <span className="badge-rank">{(match as any).h2h_data.away_rank}°</span>
                            {(match as any).h2h_data.away_points && (
                              <span className="badge-points">{(match as any).h2h_data.away_points}pt</span>
                            )}
                          </span>
                        )}
                      </div>
                      {showLucifero && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '35px', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                            <div style={{
                              width: `${Math.min(((match as any).h2h_data?.lucifero_away / 25) * 100, 100)}%`,
                              height: '100%',
                              background: 'rgb(255, 159, 67)',
                              boxShadow: '0 0 8px rgb(255, 159, 67)',
                              borderRadius: '3px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '10px', color: 'rgb(255, 159, 67)', marginLeft: '6px', fontWeight: 'bold', width: '30px', textAlign: 'left' }}>
                            {Math.round(((match as any).h2h_data?.lucifero_away / 25) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* C. QUOTE (Desktop) */}
                  <div style={{
                    width: '130px',
                    display: 'flex',
                    gap: '6px',
                    marginLeft: '10px',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexShrink: 0
                  }}>


                    {/* C. QUOTE (Destra - Logic: Risultato > Favorita > Standard) */}
                    <div style={{
                      width: '130px',
                      display: 'flex',
                      gap: '6px',
                      marginLeft: '10px',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      flexShrink: 0
                    }}>
                      {/* 1. Calcolo la quota minima tra le tre PRIMA del map */}
                      {(() => {
                        const o1 = parseFloat((odds as any)['1']);
                        const oX = parseFloat((odds as any)['X']);
                        const o2 = parseFloat((odds as any)['2']);
                        const minOdd = Math.min(o1, oX, o2);

                        return ['1', 'X', '2'].map(label => {
                          const val = (odds as any)[label];
                          const numVal = parseFloat(val);

                          // 2. Determina l'esito reale della partita (LOGICA TUA)
                          const score = match.real_score?.split(':');
                          let resultOutcome = null;
                          if (score && score.length === 2) {
                            const homeGoals = parseInt(score[0]);
                            const awayGoals = parseInt(score[1]);
                            if (homeGoals > awayGoals) resultOutcome = '1';
                            else if (homeGoals < awayGoals) resultOutcome = '2';
                            else if (homeGoals === awayGoals) resultOutcome = 'X';
                          }

                          // 3. Controlli Booleani
                          const isMatchResult = label === resultOutcome; // È il risultato vincente?
                          const isLowest = numVal === minOdd;            // È la quota favorita?

                          // 4. Logica Colori (Priorità: Risultato > Favorita > Base)
                          let boxBg = 'rgba(255, 255, 255, 0.05)';     // Base (Grigio scuro)
                          let boxBorder = '1px solid transparent';     // Base
                          let numColor = '#ddd';                       // Base
                          let labelColor = 'rgba(255,255,255,0.2)';    // Base

                          if (isMatchResult) {
                            // STILE RISULTATO VINCENTE (CIANO - Priorità massima)
                            boxBg = 'rgba(0, 240, 255, 0.1)';
                            boxBorder = '1px solid rgba(43, 255, 0, 0.22)';
                            numColor = 'rgba(51, 255, 0, 0.53)';
                            labelColor = 'rgb(0, 240, 255)';
                          } else if (isLowest) {
                            // STILE FAVORITA/QUOTA BASSA (GIALLO - Se non è già vincente)
                            boxBg = 'rgba(251, 255, 0, 0.1)';
                            boxBorder = '1px solid rgba(255, 230, 0, 0.18)';
                            numColor = 'rgba(238, 255, 0, 0.43)';
                            labelColor = 'rgba(255, 230, 0, 0.36)';
                          }

                          return (
                            <div key={label} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: boxBg, // Uso le variabili calcolate sopra
                              padding: '3px 0',
                              height: '32px',
                              width: '38px',
                              borderRadius: '8px',
                              border: boxBorder, // Uso le variabili calcolate sopra
                              transition: 'all 0.2s',
                              boxShadow: isLowest && !isMatchResult ? '0 0 5px rgba(0, 255, 127, 0.1)' : 'none' // Glow solo se è verde
                            }}>
                              <span style={{
                                fontSize: '8px',
                                color: labelColor,
                                fontWeight: 'bold',
                                lineHeight: '1'
                              }}>
                                {label}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                color: numColor,
                                fontWeight: (isMatchResult || isLowest) ? '900' : 'normal',
                                fontFamily: 'monospace',
                                marginTop: '1px'
                              }}>
                                {val}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </>
              ) : null}
              {/* ICONA EXPAND (Solo Mobile) */}
              {isMobile && (
                <div style={{
                  fontSize: '18px',
                  color: theme.cyan,
                  transition: 'transform 0.3s',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  marginLeft: '10px',
                  flexShrink: 0
                }}>
                  ▼

                </div>
              )}

              {/* SEZIONE ESPANDIBILE (Solo Mobile) */}
              {isMobile && isExpanded && (
                <div style={{
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>

                  {/* SQUADRA CASA */}
                  <div style={{ marginBottom: '12px' }}>
                    {/* Contenitore con position: relative per permettere l'absolute del badge */}
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center', // Questo centra il NOME
                      marginBottom: '12px',
                      minHeight: '24px' // Altezza minima per il badge
                    }}>

                      {/* IL BADGE: Posizionato in 'absolute' a sinistra */}
                      {(match as any).h2h_data?.home_rank && (
                        <span className="badge-classifica home" style={{
                          position: 'absolute', // Esce dal flusso
                          left: 0,              // Inchiodato a sinistra
                          top: '50%',           // Centrato verticalmente
                          transform: 'translateY(-50%)'
                        }}>
                          <span className="badge-rank">{(match as any).h2h_data.home_rank}°</span>
                          {(match as any).h2h_data.home_points && (
                            <span className="badge-points">{(match as any).h2h_data.home_points}pt</span>
                          )}
                        </span>
                      )}

                      {/* IL NOME: Ora si centra perfettamente rispetto al contenitore padre */}
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>
                        {match.home}
                      </span>
                    </div>

                    {/* BARRA LUCIFERO (Rimasta uguale) */}
                    {showLucifero && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                          <div style={{
                            width: `${Math.min(((match as any).h2h_data?.lucifero_home / 25) * 100, 100)}%`,
                            height: '100%',
                            background: 'rgb(5, 249, 182)',
                            boxShadow: '0 0 8px rgb(5, 249, 182)',
                            borderRadius: '3px'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgb(5, 249, 182)', fontWeight: 'bold', minWidth: '40px' }}>
                          {Math.round(((match as any).h2h_data?.lucifero_home / 25) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* VS */}
                  <div style={{
                    textAlign: 'center',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    padding: '6px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#fff',
                    margin: '10px 0',
                    fontFamily: 'monospace'
                  }}>
                    {(match as any).status === 'Finished' && (match as any).real_score ? (match as any).real_score : 'VS'}
                  </div>

                  {/* SQUADRA OSPITE */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center', // Centra il NOME
                      marginBottom: '12px',
                      minHeight: '24px'
                    }}>

                      {/* BADGE OSPITE: Anche questo in absolute a sinistra */}
                      {(match as any).h2h_data?.away_rank && (
                        <span className="badge-classifica away" style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)'
                        }}>
                          {/* Qui mantengo l'ordine standard, il CSS farà il resto se necessario */}
                          <span className="badge-rank">{(match as any).h2h_data.away_rank}°</span>
                          {(match as any).h2h_data.away_points && (
                            <span className="badge-points">{(match as any).h2h_data.away_points}pt</span>
                          )}
                        </span>
                      )}

                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>
                        {match.away}
                      </span>
                    </div>

                    {/* BARRA LUCIFERO OSPITE (Rimasta uguale) */}
                    {showLucifero && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                          <div style={{
                            width: `${Math.min(((match as any).h2h_data?.lucifero_away / 25) * 100, 100)}%`,
                            height: '100%',
                            background: 'rgb(255, 159, 67)',
                            boxShadow: '0 0 8px rgb(255, 159, 67)',
                            borderRadius: '3px'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgb(255, 159, 67)', fontWeight: 'bold', minWidth: '40px' }}>
                          {Math.round(((match as any).h2h_data?.lucifero_away / 25) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* QUOTE */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '15px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    {['1', 'X', '2'].map((label) => {
                      const val = (odds as any)[label];
                      return (
                        <div key={label} style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '4px' }}>
                            {label}
                          </span>
                          <span style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTTONE ANALIZZA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prepareSimulation(match);
                    }}
                    style={{
                      width: '100%',
                      marginTop: '15px',
                      padding: '12px',
                      background: `linear-gradient(90deg, ${theme.cyan}, ${theme.purple})`,
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: `0 0 15px rgba(0, 240, 255, 0.3)`
                    }}
                  >
                    👁️ ANALIZZA PARTITA
                  </button>
                </div>
              )}

            </div>

          );
        })
      )}
    </div>
  )

  // --- FUNZIONE MANCANTE: ANIMAZIONE GRAFICA ---
  const renderAnimation = () => (
    <div style={{
      flex: 1,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      padding: '0'
    }}>
      <div style={{
        padding: isMobile ? '3px 8px 0px' : styles.arenaContent.padding,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
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
                    {(selectedMatch as any).date_obj
                      ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
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
                    {(selectedMatch as any).match_time || '--:--'}
                  </span>
                </div>
              </div>
          {/* CRONOMETRO */}
          <div style={{ width: '55px', textAlign: 'center' }}>
            <div style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '900',
              color: theme.purple,
              fontFamily: 'monospace',
              textShadow: `0 0 10px ${theme.purple}`
            }}>
              {timer}'
            </div>
          </div>
  
          {/* SQUADRA CASA */}
          <div style={{ width: '120px', textAlign: 'right' }}>
            <div style={{
              fontSize: '10px',
              color: theme.cyan,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              opacity: 0.7,
              marginBottom: '2px'
            }}>Casa</div>
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
            padding: '6px 16px',
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
              fontSize: '10px',
              color: theme.danger,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              opacity: 0.7,
              marginBottom: '2px'
            }}>Ospite</div>
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
                          fontSize: '16px',
                          fontWeight: 'bold',
                          textShadow: `0 0 8px ${theme.cyan}`,
                          marginLeft: '10px'
                        }}>
                          {normalizeModulo(formations.home_formation?.modulo || '4-3-3')}
                        </span>
                        <span style={{
                          color: theme.danger,
                          fontSize: '16px',
                          fontWeight: 'bold',
                          textShadow: `0 0 8px ${theme.danger}`,
                          marginRight: '250px'
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
                    fontSize: '60px',
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
                left: '85%',
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
                left: '15%',
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
                        top: `${p.y}%`,
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
                        top: `${p.y}%`,
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
                  width: '800px',
                  height: '100%',
                  background: momentumDirection === 'ospite'
                    ? `linear-gradient(to left, ${theme.cyan}FF, ${theme.cyan}66, ${theme.cyan}44, transparent)`
                    : `linear-gradient(to right, ${theme.danger}FF, ${theme.danger}66, ${theme.danger}44, transparent)`,
                  transform: momentumDirection === 'ospite' ? 'translateX(-800px)' : 'translateX(0)',
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
          position: 'absolute',    /* <--- FONDAMENTALE: Lo stacca dai bottoni */
          marginTop: '-140px', 
                     /* <--- MODIFICA QUI: Metti -50px per alzarlo, 0px per abbassarlo */
          marginLeft: '-350px',               /* <--- Lo tiene ancorato a sinistra */
          width: '100%',           /* <--- Lo centra perfettamente */
          
          /* IL TUO STILE (Mantenuto) */
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          color: theme.success,
          textShadow: `0 0 10px ${theme.success}`,
          animation: 'pulse 2s infinite',
          pointerEvents: 'none'    /* <--- Importante: Così se finisce sopra un bottone, puoi comunque cliccare il bottone */
      }}>
          ✅ Partita Terminata - Verifica gli Eventi
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
                cursor: 'pointer',
                fontSize: '12px',
                zIndex: 50
              }}
            >
              📋 Formazioni
            </button>
          )}
  
          {/* BOTTONE RIEPILOGO PARTITA */}
          {simulationEnded && (
            <button
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

        <div style={{ 
          position: 'absolute',
          background: 'rgba(255,255,255,0.1)',
          marginTop: '-150px', 
          color: theme.warning,
          border: '2px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '8px',
          letterSpacing: '5px',
          marginLeft: '1050px', 
          marginBottom: '10px',
          fontSize: '13px', 
          animation: 'pulse 2s infinite',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          QUOTE
        </div>

        {/* QUOTE */}
        <div style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'stretch',
            gap: '5px',
            height: '40px',
            marginTop: '-120px',
            marginLeft: '950px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {['1', 'X', '2'].map((label) => {
              const val = (selectedMatch?.odds as any)[label];
              return (
                <div key={label} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  paddingRight: '35px',
                  paddingLeft: '25px',
                  paddingBottom: '20px',
                  paddingTop: '0px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '2px' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>
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
   
  const renderPreMatch = () => {

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

              {/* GRID DI SIMMETRIA SPECCHIATA */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '125px 35px 125px' : '250px 50px 250px', // DUE BLOCCHI IDENTICI DA 250PX
                alignItems: 'center',
                fontSize: isMobile ? '15px' : '25px',
                fontWeight: '900',
                color: '#fff',
                lineHeight: '35px'
              }}>
                {/* Casa - Allineata a destra verso il VS */}
                <div style={{
                  textAlign: isMobile ? 'right' : 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>

                  {selectedMatch?.home}
                </div>

                {/* VS - IL CENTRO ASSOLUTO */}
                <div style={{
                  textAlign: 'center',
                  color: theme.textDim,
                  fontSize: '16px',
                  fontWeight: '400',
                  textTransform: 'lowercase',
                }}>
                  vs
                </div>

                {/* Ospite - Allineata a sinistra verso il VS */}
                <div style={{
                  textAlign: isMobile ? 'left' : 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedMatch?.away}
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
                    marginBottom: '5px', 
                    position: 'relative',
                    paddingTop: isMobile ? '30px' : '20px'
                  }}>
                    <div className="header-title" style={{
                      fontSize: '10px',
                      opacity: 0.8,
                      position: isMobile ? 'absolute' : 'relative',
                      top: isMobile ? '-20px' : '0',
                      left: isMobile ? '-5px' : '0',
                      right: isMobile ? '12px' : 'auto',
                      marginTop: isMobile ? '0' : '-4px',
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
                <div className="radar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', padding: '5px' }}>
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
  };



  // ============================================================
  // 🔧 PANNELLO IMPOSTAZIONI - DOPPIO LIVELLO (USER + ADMIN)
  // ============================================================

  // --- 👤 PANNELLO UTENTE NORMALE (Semplificato) ---
  const renderUserSettings = () => (
    <div style={{
      height: '100%',
      padding: '40px',
      background: 'rgba(0,0,0,0.95)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflowY: 'auto'
    }}>
      {/* HEADER */}
      <h2 style={{
        color: theme.cyan,
        marginBottom: '40px',
        fontSize: '28px',
        textAlign: 'center',
        letterSpacing: '2px'
      }}>
        ⚙️ IMPOSTAZIONI
      </h2>

      {/* CARD CONTAINER */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
      }}>

        {/* OPZIONE 1: Velocità Simulazione */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: theme.cyan,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            📊 Velocità Simulazione
          </label>
          <select
            value={simMode}
            onChange={e => setSimMode(e.target.value as any)}
            style={{
              width: '100%',
              padding: '14px',
              background: '#0a0a0a',
              color: 'white',
              border: '1px solid #333',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="fast">⚡ Veloce - Risultato Immediato</option>
            <option value="animated">🎬 Animata - Con Effetti Visivi</option>
          </select>
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            {simMode === 'fast'
              ? 'Il risultato viene mostrato istantaneamente'
              : 'La simulazione viene animata in tempo reale'}
          </div>
        </div>

        {/* OPZIONE 2: Notifiche Audio */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            <input
              type="checkbox"
              defaultChecked={true}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', color: theme.cyan }}>
              🔔 Abilita Notifiche Audio
            </span>
          </label>
          <div style={{
            marginTop: '8px',
            marginLeft: '30px',
            fontSize: '11px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            Suono quando la simulazione è completata
          </div>
        </div>

        {/* SEPARATORE */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          margin: '20px 0'
        }} />

        {/* TASTI AZIONE */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between' }}>
          <button
            onClick={() => setViewState('pre-match')}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#888',
              padding: '12px',
              border: '1px solid #444',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (e.currentTarget) e.currentTarget.style.borderColor = '#666' }}
            onMouseLeave={(e) => { if (e.currentTarget) e.currentTarget.style.borderColor = '#444' }}
          >
            Annulla
          </button>
          <button
            onClick={() => {
              // Salva preferenze (localStorage o state)
              console.log("Preferenze salvate:", { simMode });
              setViewState('pre-match');
            }}
            style={{
              flex: 2,
              background: `linear-gradient(90deg, ${theme.cyan}, ${theme.purple})`,
              color: '#000',
              padding: '12px 30px',
              fontWeight: 'bold',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: `0 0 20px rgba(0, 240, 255, 0.3)`,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (e.currentTarget) e.currentTarget.style.borderColor  = `0 0 30px rgba(0, 240, 255, 0.5)`}}
            onMouseLeave={(e) => { if (e.currentTarget) e.currentTarget.style.borderColor  = `0 0 20px rgba(0, 240, 255, 0.3)`}}
          >
            ✅ Salva Modifiche
          </button>
        </div>
      </div>

      {/* INFO ACCOUNT */}
      <div style={{
        marginTop: '40px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center',
        lineHeight: '1.6'
      }}>
        Account: <span style={{ color: theme.success, fontWeight: 'bold' }}>Utente Free</span>
        <br />
        <span style={{ fontSize: '10px' }}>
          Per sbloccare tutte le funzionalità, contatta l'amministratore
        </span>
      </div>
    </div>
  );

  // --- 👑 PANNELLO ADMIN (Completo con tutte le funzionalità) ---
  const renderAdminSettings = () => (
    <div style={{
      height: '100%',
      padding: '30px',
      background: 'rgba(0,0,0,0.9)',
      overflowY: 'auto',
      color: 'white',
      fontFamily: 'monospace',
      position: 'relative'
    }}>

      {/* 👑 BADGE ADMIN */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '30px',
        background: 'linear-gradient(135deg, #ff0080, #ff8c00)',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold',
        boxShadow: '0 0 20px rgba(255, 0, 128, 0.5)',
        zIndex: 10,
        animation: 'pulse 2s infinite'
      }}>
        👑 ADMIN MODE
      </div>

      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.cyan}`,
        paddingBottom: '20px',
        marginBottom: '30px',
        paddingRight: '140px' // Spazio per badge admin
      }}>
        <div>
          <h2 style={{
            margin: 0,
            color: theme.cyan,
            fontSize: '22px',
            letterSpacing: '1px'
          }}>
            {'>'} SYSTEM_CONFIGURATION
          </h2>
          <div style={{
            color: theme.textDim,
            fontSize: '12px',
            marginTop: '5px'
          }}>
            Target Mode: <span style={{ color: 'white' }}>
              {configMode === 0 ? 'TOTAL SIMULATION' :
                configMode === 4 ? 'SINGLE MATCH' : 'MASSIVE ANALYSIS'}
            </span>
          </div>
        </div>

        <button 
          onClick={() => window.location.href = '/mixer'}
          style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#a855f7',
            padding: '15px 22px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (e.currentTarget) e.currentTarget.style.borderColor = theme.cyan;
            if (e.currentTarget) e.currentTarget.style.color = theme.cyan;
          }}
          onMouseLeave={(e) => {
            if (e.currentTarget) e.currentTarget.style.borderColor = theme.textDim;
            if (e.currentTarget) e.currentTarget.style.color = theme.textDim;
          }}
        >
          🎛️ Mixer Tuning
        </button>

        <button
          onClick={() => setViewState('pre-match')}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.textDim}`,
            color: theme.textDim,
            padding: '8px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            textTransform: 'uppercase',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (e.currentTarget) e.currentTarget.style.borderColor = theme.cyan;
            if (e.currentTarget) e.currentTarget.style.color = theme.cyan;
          }}
          onMouseLeave={(e) => {
            if (e.currentTarget) e.currentTarget.style.borderColor = theme.textDim;
            if (e.currentTarget) e.currentTarget.style.color = theme.textDim;
          }}
        >
          [ ESC ] Back to Dashboard
        </button>
      </div>

      {/* GRIGLIA PRINCIPALE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '30px'
      }}>

        {/* --- COLONNA 1: OPERATION MODE --- */}
        <div>
        <h3 style={{ 
            color: theme.purple, 
            fontSize: '14px', 
            borderLeft: `3px solid ${theme.purple}`, 
            paddingLeft: '10px', 
            marginBottom: '20px' 
        }}>
            01. OPERATION_MODE
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
                { id: 0, label: '[0] TOTAL SIMULATION', sub: 'Tutti i camp. (Finite)' },
                { id: 1, label: '[1] MASSIVO PREV', sub: 'Giornata Precedente', period: 'previous' },
                { id: 2, label: '[2] MASSIVO CURR', sub: 'Giornata In Corso', period: 'current' },
                { id: 3, label: '[3] MASSIVO NEXT', sub: 'Giornata Successiva', period: 'next' },
                { id: 4, label: '[4] SINGOLA MATCH', sub: 'Analisi Dettagliata' },
            ]
            .filter((opt: any) => isAdmin || PERMISSIONS.ALLOWED_MAIN_MODES.includes(opt.id))
            .map((opt: any) => (
                <div 
                    key={opt.id}
                    onClick={() => {
                        setConfigMode(opt.id);
                        // ✅ Imposta anche il periodo corretto
                        if (opt.period) {
                            setSelectedPeriod(opt.period);
                            // Carica automaticamente la giornata corretta
                            if (rounds.length > 0) {
                                const targetRound = rounds.find(r => r.type === opt.period);
                                if (targetRound) {
                                    setSelectedRound(targetRound);
                                }
                            }
                        }
                    }}
                    style={{
                        padding: '12px', 
                        background: configMode === opt.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                        borderLeft: configMode === opt.id ? `4px solid ${theme.cyan}` : '4px solid transparent',
                        cursor: 'pointer', 
                        marginBottom: '5px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (configMode !== opt.id) {
                            if (e.currentTarget) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (configMode !== opt.id) {
                            if (e.currentTarget) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }
                    }}
                >
                    <div style={{ 
                        color: configMode === opt.id ? 'white' : '#aaa', 
                        fontWeight: 'bold', 
                        fontSize: '13px' 
                    }}>
                        {opt.label}
                    </div>
                    <div style={{ color: '#666', fontSize: '11px' }}>
                        {opt.sub}
                    </div>
                </div>
            ))}
        </div>
        
        
    </div>
   

        {/* --- COLONNA 2: TARGET / SCOPE --- */}
        <div>
          <h3 style={{
            color: theme.purple,
            fontSize: '14px',
            borderLeft: `3px solid ${theme.purple}`,
            paddingLeft: '10px',
            marginBottom: '20px'
          }}>
            02. TARGET / SCOPE
          </h3>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '15px',
            borderRadius: '4px',
            height: '100%',
            border: '1px solid #333'
          }}>

            {/* CASO 0: TOTAL SIMULATION */}
            {configMode === 0 && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>💎</div>
                <div style={{
                  color: theme.cyan,
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}>
                  TOTAL SIMULATION
                </div>
                <div style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.5' }}>
                Analisi globale su <b>{availableCountries.length} Nazioni</b>.<br />
                Processa solo partite <u>FINITE</u>.
              </div>
              </div>
            )}

            {/* CASO MASSIVO (1, 2, 3) O SINGOLA (4) */}
            {configMode >= 1 && (
              <>
                {/* 1. SELEZIONA NAZIONE DINAMICA PER ADMIN */}
                <label style={{
                  display: 'block',
                  color: theme.cyan,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '5px',
                  textTransform: 'uppercase'
                }}>
                  1. SELEZIONA NAZIONE
                </label>

                {isLoadingNations ? (
                  <div style={{ color: theme.cyan, fontSize: '12px', padding: '10px', background: '#111', borderRadius: '4px' }}>
                    ⏳ Sincronizzazione nazioni...
                  </div>
                ) : (
                  <select
                    value={country}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setCountry(newCountry);
                      const firstLeagueID = LEAGUES_MAP.find(l => l.country === newCountry)?.id || '';
                      setLeague(firstLeagueID);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#111',
                      color: 'white',
                      border: '1px solid #444',
                      marginBottom: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Seleziona Nazione --</option>
                    {availableCountries.filter(c => c.code !== 'ALL').map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}

                {/* 2. SELETTORE LEGA */}
                <label style={{
                  display: 'block',
                  color: theme.cyan,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '5px',
                  textTransform: 'uppercase'
                }}>
                  2. SELEZIONA CAMPIONATO
                </label>
                <select
                  value={league}
                  onChange={(e) => {
                    const newLeagueID = e.target.value;
                    console.log("Nuova Lega Selezionata:", newLeagueID);
                    setLeague(newLeagueID);
                  }}
                  disabled={!country}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    background: country ? '#111' : '#222',
                    color: country ? 'white' : '#555',
                    border: '1px solid #444',
                    cursor: country ? 'pointer' : 'not-allowed'
                  }}
                >
                  <option value="">
                    {country ? `-- Scegli Campionato --` : '-- Prima scegli Nazione --'}
                  </option>

                  {LEAGUES_MAP
                    .filter(lg => lg.country === country)
                    .map(lg => (
                      <option key={lg.id} value={lg.id}>
                        {lg.name}
                      </option>
                    ))
                  }
                </select>

                {/* SELEZIONE PERIODO PER MODALITÀ SINGOLA */}
                {configMode === 4 && league && (
                    <>
                        <label style={{
                            display:'block', 
                            color: theme.cyan, 
                            fontSize:'11px', 
                            fontWeight:'bold', 
                            marginBottom:'8px', 
                            marginTop: '15px',
                            textTransform:'uppercase'
                        }}>
                            3. SELEZIONA PERIODO
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                            {[
                                { type: 'previous', label: '◀ Precedente', icon: '📅' },
                                { type: 'current', label: 'In Corso', icon: '🎯' },
                                { type: 'next', label: 'Successiva ▶', icon: '📆' }
                            ].map(period => (
                                <button
                                    key={period.type}
                                    onClick={() => {
                                        setSelectedPeriod(period.type as any);
                                        // Trova e imposta la giornata corretta
                                        const targetRound = rounds.find(r => r.type === period.type);
                                        if (targetRound) {
                                            setSelectedRound(targetRound);
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 8px',
                                        background: selectedPeriod === period.type 
                                            ? 'rgba(0, 240, 255, 0.2)' 
                                            : 'rgba(255,255,255,0.05)',
                                        border: selectedPeriod === period.type 
                                            ? `1px solid ${theme.cyan}` 
                                            : '1px solid #333',
                                        color: selectedPeriod === period.type ? 'white' : '#888',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                                        {period.icon}
                                    </div>
                                    {period.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}


                {/* Controlli Selezione Rapida */}
                <div style={{
                        display: 'flex', 
                        gap: '6px', 
                        marginBottom: '8px'
                    }}>
                        <button
                            onClick={() => {
                                setSelectedMatchForConfig(matches);
                            }}
                            style={{
                                flex: 1,
                                padding: '4px',
                                background: 'rgba(0, 240, 255, 0.1)',
                                border: `1px solid ${theme.cyan}`,
                                color: theme.cyan,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '9px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✓ Tutte ({matches.length})
                        </button>
                        <button
                            onClick={() => {
                                setSelectedMatchForConfig(null);
                            }}
                            style={{
                                flex: 1,
                                padding: '4px',
                                background: 'rgba(255, 0, 0, 0.1)',
                                border: '1px solid rgba(255, 0, 0, 0.3)',
                                color: '#ff4444',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '9px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✗ Nessuna
                        </button>
                    </div>

                {/* 3. LISTA PARTITE PER SINGOLA (Versione Compatta) */}
                {configMode === 4 && league && selectedRound && (
                    <div style={{marginTop:'20px', borderTop:'1px solid #333', paddingTop:'15px'}}>
                        <label style={{
                            display:'block', 
                            color: theme.cyan, 
                            fontSize:'11px', 
                            fontWeight:'bold', 
                            marginBottom:'8px', 
                            textTransform:'uppercase'
                        }}>
                            4. SELEZIONA PARTITE
                        </label>
                        
                        {/* COUNTER SELEZIONE */}
                        {selectedMatchForConfig && (
                            <div style={{
                                padding: '6px 10px',
                                background: 'rgba(0, 240, 255, 0.15)',
                                border: `1px solid ${theme.cyan}`,
                                borderRadius: '6px',
                                fontSize: '10px',
                                color: theme.cyan,
                                marginBottom: '8px',
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}>
                                ✅ {Array.isArray(selectedMatchForConfig) 
                                    ? `${selectedMatchForConfig.length} partite selezionate` 
                                    : '1 partita selezionata'}
                            </div>
                        )}
                        
                        {/* Lista Compatta */}
                        <div style={{
                            maxHeight: '150px',  // ✅ Ridotto da 200px a 150px
                            overflowY: 'auto',
                            background: '#0a0a0a',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            padding: '6px'  // ✅ Ridotto padding
                        }}>
                            {matches.length === 0 ? (
                                <div style={{
                                    color: '#666', 
                                    textAlign: 'center', 
                                    padding: '20px', 
                                    fontSize: '11px'
                                }}>
                                    Nessuna partita disponibile
                                </div>
                            ) : (
                                matches.map((match) => (
                                    <div
                                        key={match.id}
                                        onClick={() => {
                                          // 🔥 LOGICA MULTI-SELEZIONE CORRETTA
                                          
                                          // Caso 1: Nessuna selezione precedente
                                          if (!selectedMatchForConfig) {
                                              setSelectedMatchForConfig([match]); // ✅ Crea array con 1 elemento
                                              return;
                                          }
                                          
                                          // Caso 2: Già un array (multi-selezione attiva)
                                          if (Array.isArray(selectedMatchForConfig)) {
                                              const exists = selectedMatchForConfig.find(m => m.id === match.id);
                                              
                                              if (exists) {
                                                  // Rimuovi dalla selezione
                                                  const updated = selectedMatchForConfig.filter(m => m.id !== match.id);
                                                  setSelectedMatchForConfig(updated.length > 0 ? updated : null);
                                              } else {
                                                  // Aggiungi alla selezione
                                                  setSelectedMatchForConfig([...selectedMatchForConfig, match]);
                                              }
                                              return;
                                          }
                                          
                                          // Caso 3: Era una selezione singola (non array)
                                          // Trasforma in array e aggiungi la nuova
                                          if (selectedMatchForConfig.id === match.id) {
                                              // Clicco sulla stessa → Deseleziona
                                              setSelectedMatchForConfig(null);
                                          } else {
                                              // Clicco su un'altra → Crea array con entrambe
                                              setSelectedMatchForConfig([selectedMatchForConfig, match]);
                                          }
                                      }}
                                        style={{
                                            padding: '6px',  // ✅ Ridotto padding
                                            marginBottom: '3px',  // ✅ Ridotto spacing
                                            background: (() => {
                                                if (Array.isArray(selectedMatchForConfig)) {
                                                    return selectedMatchForConfig.find(m => m.id === match.id)
                                                        ? 'rgba(0, 240, 255, 0.2)'
                                                        : 'rgba(255,255,255,0.03)';
                                                }
                                                return selectedMatchForConfig?.id === match.id
                                                    ? 'rgba(0, 240, 255, 0.2)'
                                                    : 'rgba(255,255,255,0.03)';
                                            })(),
                                            border: (() => {
                                                if (Array.isArray(selectedMatchForConfig)) {
                                                    return selectedMatchForConfig.find(m => m.id === match.id)
                                                        ? `2px solid ${theme.cyan}`
                                                        : '1px solid rgba(0, 240, 255, 0.1)';
                                                }
                                                return selectedMatchForConfig?.id === match.id
                                                    ? `2px solid ${theme.cyan}`
                                                    : '1px solid rgba(0, 240, 255, 0.1)';
                                            })(),
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '10px',  // ✅ Font più piccolo
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (Array.isArray(selectedMatchForConfig)) {
                                                if (!selectedMatchForConfig.find(m => m.id === match.id)) {
                                                    if (e.currentTarget) e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                                                }
                                            } else if (selectedMatchForConfig?.id !== match.id) {
                                                if (e.currentTarget) e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (Array.isArray(selectedMatchForConfig)) {
                                                if (!selectedMatchForConfig.find(m => m.id === match.id)) {
                                                    if (e.currentTarget) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                }
                                            } else if (selectedMatchForConfig?.id !== match.id) {
                                                if (e.currentTarget) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            }
                                        }}
                                    >
                                        {/* Nome Partita */}
                                        <div style={{
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            marginBottom: '3px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            {/* Checkbox Visivo */}
                                            <span style={{
                                                width: '12px',
                                                height: '12px',
                                                border: `1px solid ${theme.cyan}`,
                                                borderRadius: '2px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '8px',
                                                background: (() => {
                                                    if (Array.isArray(selectedMatchForConfig)) {
                                                        return selectedMatchForConfig.find(m => m.id === match.id)
                                                            ? theme.cyan
                                                            : 'transparent';
                                                    }
                                                    return selectedMatchForConfig?.id === match.id
                                                        ? theme.cyan
                                                        : 'transparent';
                                                })()
                                            }}>
                                                {(() => {
                                                    if (Array.isArray(selectedMatchForConfig)) {
                                                        return selectedMatchForConfig.find(m => m.id === match.id) ? '✓' : '';
                                                    }
                                                    return selectedMatchForConfig?.id === match.id ? '✓' : '';
                                                })()}
                                            </span>
                                            
                                            <span style={{fontSize: '10px'}}>
                                                {match.home} vs {match.away}
                                            </span>
                                        </div>
                                        
                                        {/* Info Data */}
                                        <div style={{color: '#666', fontSize: '9px', marginLeft: '18px'}}>
                                            {match.date_obj ? new Date(match.date_obj).toLocaleDateString('it-IT', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : 'Data N/D'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Istruzioni Multi-Selezione */}
                        <div style={{
                            marginTop: '6px', 
                            fontSize: '9px', 
                            color: '#666', 
                            fontStyle: 'italic',
                            textAlign: 'center'
                        }}>
                            💡 Clicca per selezionare più partite • Clicca di nuovo per deselezionare
                        </div>
                    </div>
                )}
              </>
            )}
          </div>
        </div>


        {/* --- COLONNA 3: ALGO & TUNING --- */}
        <div>
          <h3 style={{
            color: theme.purple,
            fontSize: '14px',
            borderLeft: `3px solid ${theme.purple}`,
            paddingLeft: '10px',
            marginBottom: '20px'
          }}>
            03. ALGORITHM & TUNING
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '20px'
          }}>
            {[
              { id: 0, label: '[0] TUTTI', sub: 'Report Completo' },
              { id: 1, label: '[1] Statistico Puro', sub: 'Poisson/Elo' },
              { id: 2, label: '[2] Dinamico', sub: 'Trend' },
              { id: 3, label: '[3] Tattico', sub: 'Formations' },
              { id: 4, label: '[4] Caos', sub: 'Entropy' },
              { id: 5, label: '[5] Master', sub: 'AI Ensemble' },
              { id: 6, label: '[6] MonteCarlo', sub: 'Stochastic' },
            ]
              .filter((opt: any) => isAdmin || PERMISSIONS.VISIBLE_ALGOS.includes(opt.id))
              .map((opt: any) => (
                <div
                  key={opt.id}
                  onClick={() => setConfigAlgo(opt.id)}
                  style={{
                    padding: '8px 12px',
                    background: configAlgo === opt.id ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                    border: configAlgo === opt.id ? `1px solid ${theme.cyan}` : '1px solid #333',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (configAlgo !== opt.id) {
                      if (e.currentTarget) e.currentTarget.style.borderColor = '#555';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (configAlgo !== opt.id) {
                      if (e.currentTarget) e.currentTarget.style.borderColor = '#333';
                    }
                  }}
                >
                  <span style={{
                    color: configAlgo === opt.id ? 'white' : '#888',
                    fontWeight: 'bold'
                  }}>
                    {opt.label}
                  </span>
                </div>
              ))}
          </div>

          {/* VELOCITÀ - ORA PER TUTTI GLI ALGORITMI */}
          {configAlgo >= 1 && configAlgo <= 6 && (
              <div style={{ borderTop: '1px dashed #444', paddingTop: '15px' }}>
                  <div style={{color: '#ffd700', fontSize:'12px', marginBottom:'10px'}}>
                      📊 PRESET VELOCITÀ {configAlgo === 6 ? '(MONTE CARLO)' : ''}
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                      {SPEED_PRESETS.map((spd: any) => (
                          <div 
                              key={spd.id}
                              onClick={() => setSelectedSpeed(spd.id)}
                              style={{
                                  padding:'5px', 
                                  cursor:'pointer', 
                                  fontSize:'11px', 
                                  textAlign:'center',
                                  background: selectedSpeed === spd.id ? '#ffd700' : '#222',
                                  color: selectedSpeed === spd.id ? 'black' : 'white',
                                  borderRadius: '3px',
                                  transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                  if (selectedSpeed !== spd.id) {
                                      if (e.currentTarget) e.currentTarget.style.background = '#333';
                                  }
                              }}
                              onMouseLeave={(e) => {
                                  if (selectedSpeed !== spd.id) {
                                      if (e.currentTarget) e.currentTarget.style.background = '#222';
                                  }
                              }}
                          >
                              {spd.label}
                          </div>
                      ))}
                  </div>

                  {/* INPUT MANUALE */}
                  {selectedSpeed === 8 && (
                      <div style={{marginTop:'10px'}}>
                          <label style={{color:'#0f0', fontSize:'11px'}}>
                              CICLI MANUALI: (min: 1, max: ∞)
                          </label>
                          <input 
                              type="number" 
                              value={customCycles} 
                              min={1}
                              max={999999}
                              onChange={e => {
                                  const val = Number(e.target.value);
                                  if (val >= 1) {
                                      setCustomCycles(val);
                                  }
                              }}
                              style={{
                                  width:'100%', 
                                  background:'#000', 
                                  color:'#0f0', 
                                  border:'1px solid #0f0', 
                                  padding:'5px', 
                                  marginTop:'5px',
                                  borderRadius: '4px'
                              }} 
                          />
                          <div style={{marginTop: '5px', fontSize: '10px', color: '#0f0'}}>
                              ⚠️ Attenzione: Cicli &gt; 50.000 richiedono molto tempo
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* FLAGS */}
          <div style={{
            marginTop: '20px',
            borderTop: '1px solid #333',
            paddingTop: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {(isAdmin || PERMISSIONS.CAN_SAVE_TO_DB) && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={configSaveDb}
                  onChange={e => setConfigSaveDb(e.target.checked)}
                />
                <span style={{
                  fontSize: '12px',
                  color: configSaveDb ? 'white' : '#777'
                }}>
                  ENABLE DB SAVE (--save)
                </span>
              </label>
            )}

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={configDebug}
                onChange={e => setConfigDebug(e.target.checked)}
              />
              <span style={{
                fontSize: '12px',
                color: configDebug ? 'white' : '#777'
              }}>
                DEBUG MODE (--verbose)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        marginTop: '40px',
        borderTop: `1px solid ${theme.panelBorder}`,
        paddingTop: '20px',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button 
          onClick={() => {
              const finalCycles = getCycles();
              
              // ✅ CONTROLLO MULTI-SELEZIONE
              if (configMode === 4) {
                  if (!selectedMatchForConfig) {
                      alert('⚠️ Seleziona almeno una partita!');
                      return;
                  }
                  
                  // Se è un array di partite
                  if (Array.isArray(selectedMatchForConfig)) {
                      if (selectedMatchForConfig.length === 0) {
                          alert('⚠️ Seleziona almeno una partita!');
                          return;
                      }
                      
                      console.log(`🎯 Avvio simulazione su ${selectedMatchForConfig.length} partite`);
                      // TODO: Gestire simulazione multipla
                      alert(`✅ Simulazione di ${selectedMatchForConfig.length} partite in sviluppo!`);
                  } else {
                      // Singola partita (comportamento attuale)
                      setSelectedMatch(selectedMatchForConfig);
                      setViewState('pre-match');
                  }
              } else {
                  setViewState('pre-match');
              }
              
              console.log("AVVIO:", { 
                  configMode, 
                  country, 
                  league, 
                  configAlgo, 
                  finalCycles,
                  selectedMatches: selectedMatchForConfig 
              });
          }} 
          style={{
              background: theme.cyan, 
              color: '#000', 
              padding: '14px 40px', 
              fontWeight: 'bold', 
              fontSize: '14px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer', 
              boxShadow: '0 0 25px rgba(0,240,255,0.3)', 
              letterSpacing: '1px',
              transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
              if (e.currentTarget) e.currentTarget.style.boxShadow = '0 0 35px rgba(0,240,255,0.5)';
              if (e.currentTarget) e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
              if (e.currentTarget) e.currentTarget.style.boxShadow = '0 0 25px rgba(0,240,255,0.3)';
              if (e.currentTarget) e.currentTarget.style.transform = 'scale(1)';
          }}
      >
          [ EXECUTE SEQUENCE ]
      </button>
      </div>
    </div>
  );


  // --- 🔀 ROUTER: SCEGLIE QUALE PANNELLO MOSTRARE ---
  const renderSettingsPanel = () => {
    // ✅ SE SEI ADMIN: Pannello Completo
    if (isAdmin) {
      return renderAdminSettings();
    }

    // ✅ SE SEI UTENTE NORMALE: Pannello Semplificato
    return renderUserSettings();
  };


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
  
        <SimulationResultView 
          data={simResult}
          homeName={selectedMatch?.home || 'Team Casa'} 
          awayName={selectedMatch?.away || 'Team Ospite'} 
          onOpenAIExplanation={() => handleAskAI(simResult)}
        />
      </div>
    );
  };

  // --- BLOCCO 1: LOGICA DASHBOARD (Versione Corretta) ---
  if (!activeLeague) {
    return (
      <DashboardHome
        onSelectLeague={(id) => {

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
          setCountry(nazioneGiusta);
          setLeague(id);

          // 4. Reset degli stati di visualizzazione
          setViewState('list');
          setSelectedMatch(null);
          setActiveLeague(id);
        }}
      />
    );
  }

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
              ⚙️ MODIFICA
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
            ⚙️ Modifica Settaggi
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

      {/* TOP BAR UNIFICATA */}
      <div style={styles.topBar}>

        {/* HAMBURGER MENU (Solo Mobile) */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: '#00f0ff',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ☰
          </button>
        )}

        {/* GRUPPO SINISTRA: Tasto Indietro + Logo (Desktop) */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '120px', paddingLeft: '60px' }}>
            <button
              onClick={() => setActiveLeague(null)}
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if (e.currentTarget) e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)'}}
              onMouseLeave={(e) => { if (e.currentTarget) e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.1)'}}
            >
              ⟵ DASHBOARD
            </button>

            <div style={{ ...styles.logo, display: 'flex', alignItems: 'center' }}>
              <img
                src="https://cdn-icons-png.flaticon.com/512/1165/1165187.png"
                alt="Logo"
                style={{
                  height: '28px',
                  width: 'auto',
                  marginRight: '15px',
                  filter: 'drop-shadow(0 0 5px #00f0ff) brightness(1.5) contrast(1.1)'
                }}
              />
              AI SIMULATOR PRO
            </div>
          </div>
        )}

        {/* LOGO CENTRATO (Solo Mobile) */}
        {isMobile && (
          <div style={{
            ...styles.logo,
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/1165/1165187.png"
              alt="Logo"
              style={{
                height: '24px',
                width: 'auto',
                marginRight: '8px',
                filter: 'drop-shadow(0 0 5px #00f0ff) brightness(1.5) contrast(1.1)'
              }}
            />
            <span style={{ display: isMobile ? 'none' : 'inline' }}>AI SIMULATOR</span>
          </div>
        )}

        {/* Badge Admin nella TopBar */}
        {isAdmin && (
          <div style={{
            background: 'linear-gradient(135deg, #ff0080, #ff8c00)',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            boxShadow: '0 0 15px rgba(255, 0, 128, 0.5)',
            animation: 'pulse 2s infinite'
          }}>
            👑 ADMIN MODE
          </div>
        )}

        {/* PARTE DESTRA */}
        <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', alignItems: 'center', marginLeft: 'auto' }}>
          {!isMobile && (
            <div style={{ fontSize: '12px', color: theme.textDim }}>
              Crediti: <span style={{ color: theme.success }}>∞</span>
            </div>
          )}
          {!isMobile && (
            <button onClick={() => alert('Tema toggle')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>🌙</button>
          )}
          <div style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            borderRadius: '50%',
            background: theme.purple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: `0 0 10px ${theme.purple}`,
            fontSize: isMobile ? '14px' : '16px'
          }}>U</div>
        </div>
      </div>

      <div style={styles.mainContent}>

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
        <div style={{
          ...(isMobile ? styles.sidebarMobile : styles.sidebar),
          ...(isMobile && mobileMenuOpen ? styles.sidebarMobileOpen : {})
        }}>
          {/* Bottone chiudi (solo mobile) */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                alignSelf: 'flex-end',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: '6px',
                marginBottom: '10px'
              }}
            >
              ✕
            </button>
          )}
          <div style={{ fontSize: '12px', color: theme.textDim, fontWeight: 'bold' }}>NAZIONE</div>

          {/* 1. Inseriamo il controllo isLoadingNations per risolvere l'errore 6133 */}
          {isLoadingNations ? (
            <div style={{ 
              padding: '10px', 
              color: theme.cyan, 
              fontSize: '11px', 
              fontStyle: 'italic',
              background: 'rgba(0, 240, 255, 0.05)',
              borderRadius: '6px'
            }}>
              ⏳ Caricamento nazioni...
            </div>
          ) : (
            /* 2. Mostriamo la select solo quando i dati sono pronti */
            <select
              value={country} 
              onChange={e => setCountry(e.target.value)}
              style={{ padding: '10px', background: '#000', color: 'white', border: '1px solid #333', borderRadius: '6px', width: '100%' }}
            >
              {availableCountries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          )}

          <div style={{ fontSize: '12px', color: theme.textDim, fontWeight: 'bold', marginTop: '15px' }}>CAMPIONATO</div>
          <select
            value={league} onChange={e => setLeague(e.target.value)}
            style={{ padding: '10px', background: '#000', color: 'white', border: '1px solid #333', borderRadius: '6px', width: '100%' }}
          >
            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>


          {/* 🔥 BOX RIEPILOGO - APPARE SIA PER MASSIVO CHE SINGOLO */}
          {((configMode >= 1 && configMode <= 3 && matches.length > 0) || 
            (configMode === 4 && selectedMatchForConfig)) && (
              <div style={{marginTop:'20px', borderTop:'1px solid #333', paddingTop:'15px'}}>
                  <label style={{
                      display:'block', 
                      color: '#ffd700', 
                      fontSize:'11px', 
                      fontWeight:'bold', 
                      marginBottom:'8px'
                  }}>
                      {configMode === 4 ? '📋 PARTITE SELEZIONATE' : '📋 ANTEPRIMA PARTITE DA SIMULARE'}
                  </label>
                  
                  {/* Lista Compatta con Scroll */}
                  <div style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      background: '#0a0a0a',
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      borderRadius: '6px',
                      padding: '8px'
                  }}>
                      {(() => {
                          // LOGICA PER MASSIVO (1,2,3)
                          if (configMode >= 1 && configMode <= 3) {
                              if (matches.length === 0) {
                                  return (
                                      <div style={{color: '#666', textAlign: 'center', padding: '20px', fontSize: '11px'}}>
                                          Nessuna partita disponibile
                                      </div>
                                  );
                              }
                              
                              return (
                                  <>
                                      {/* Counter Partite */}
                                      <div style={{
                                          padding: '6px',
                                          background: 'rgba(255, 215, 0, 0.1)',
                                          borderRadius: '4px',
                                          marginBottom: '8px',
                                          fontSize: '11px',
                                          color: '#ffd700',
                                          fontWeight: 'bold',
                                          textAlign: 'center'
                                      }}>
                                          🎯 {matches.length} partite verranno simulate
                                      </div>
                                      
                                      {/* Lista Partite */}
                                      {matches.map((match) => (
                                          <div
                                              key={match.id}
                                              style={{
                                                  padding: '6px',
                                                  marginBottom: '4px',
                                                  background: 'rgba(255,255,255,0.03)',
                                                  borderLeft: '2px solid rgba(255, 215, 0, 0.3)',
                                                  borderRadius: '3px',
                                                  fontSize: '10px',
                                                  color: '#ddd'
                                              }}
                                          >
                                              {match.home} vs {match.away}
                                          </div>
                                      ))}
                                  </>
                              );
                          }
                          
                          // LOGICA PER SINGOLO (4)
                          if (configMode === 4 && selectedMatchForConfig) {
                              const matchesArray = Array.isArray(selectedMatchForConfig) 
                                  ? selectedMatchForConfig 
                                  : [selectedMatchForConfig];
                              
                              if (matchesArray.length === 0) {
                                  return (
                                      <div style={{color: '#666', textAlign: 'center', padding: '20px', fontSize: '11px'}}>
                                          Nessuna partita selezionata
                                      </div>
                                  );
                              }
                              
                              return (
                                  <>
                                      {/* Counter Partite */}
                                      <div style={{
                                          padding: '6px',
                                          background: 'rgba(255, 215, 0, 0.1)',
                                          borderRadius: '4px',
                                          marginBottom: '8px',
                                          fontSize: '11px',
                                          color: '#ffd700',
                                          fontWeight: 'bold',
                                          textAlign: 'center'
                                      }}>
                                          🎯 {matchesArray.length} {matchesArray.length === 1 ? 'partita selezionata' : 'partite selezionate'}
                                      </div>
                                      
                                      {/* Lista Partite */}
                                      {matchesArray.map((match) => (
                                          <div
                                              key={match.id}
                                              style={{
                                                  padding: '6px',
                                                  marginBottom: '4px',
                                                  background: 'rgba(255,255,255,0.03)',
                                                  borderLeft: '2px solid rgba(255, 215, 0, 0.3)',
                                                  borderRadius: '3px',
                                                  fontSize: '10px',
                                                  color: '#ddd',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between'
                                              }}
                                          >
                                              <span>{match.home} vs {match.away}</span>
                                              
                                              {/* Bottone Rimuovi */}
                                              <button
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (Array.isArray(selectedMatchForConfig)) {
                                                          const updated = selectedMatchForConfig.filter(m => m.id !== match.id);
                                                          setSelectedMatchForConfig(updated.length > 0 ? updated : null);
                                                      } else {
                                                          setSelectedMatchForConfig(null);
                                                      }
                                                  }}
                                                  style={{
                                                      background: 'rgba(255, 0, 0, 0.2)',
                                                      border: '1px solid rgba(255, 0, 0, 0.4)',
                                                      color: '#ff4444',
                                                      padding: '2px 6px',
                                                      borderRadius: '3px',
                                                      cursor: 'pointer',
                                                      fontSize: '8px',
                                                      fontWeight: 'bold'
                                                  }}
                                              >
                                                  ✗
                                              </button>
                                          </div>
                                      ))}
                                  </>
                              );
                          }
                          
                          return null;
                      })()}
                  </div>
              </div>
          )}

          {/* Widget Highlights */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: '12px', color: theme.textDim, marginBottom: '10px' }}>HIGHLIGHTS</div>
            <div style={{ ...styles.card, padding: '15px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={getWidgetGlow(theme.success)} />
              <div style={{ fontSize: '11px', color: theme.textDim }}>BEST BET</div>
              <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Napoli vs Roma</div>
              <div style={{ color: theme.success, fontSize: '12px' }}>1 + Over 1.5</div>
            </div>
            <div style={{ ...styles.card, padding: '15px', position: 'relative', overflow: 'hidden', cursor: 'pointer', marginTop: '10px' }}>
              <div style={getWidgetGlow(theme.danger)} />
              <div style={{ fontSize: '11px', color: theme.textDim }}>RISCHIO ALTO</div>
              <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Lecce vs Verona</div>
              <div style={{ color: theme.danger, fontSize: '12px' }}>Possibile X</div>
            </div>
          </div>
        </div>

        {/* MAIN ARENA */}
        <div style={styles.arena}>
          {viewState === 'list' && renderMatchList()}
          {viewState === 'pre-match' && renderPreMatch()}
          {viewState === 'simulating' && (simMode === 'animated' ? renderAnimation() : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>Calcolo Veloce in corso...</div>)}
          {viewState === 'settings' && renderSettingsPanel()}
          {viewState === 'result' && renderResult()}
        </div>
      </div>

      {/* CHATBOT WIDGET */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 100 }}>

        {/* Chat Window */}
        {chatOpen && (
          <div style={styles.chatWidget}>
            <div style={styles.chatHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.success }}></div>
                Football AI Coach
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={styles.chatBody}>
              {messages.map(msg => (
                <div key={msg.id} style={{ ...styles.msgBubble, ...(msg.sender === 'user' ? styles.userMsg : styles.botMsg) }}>
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions */}
            <div style={{ padding: '10px', display: 'flex', gap: '5px', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {['Perché Over?', 'Analisi Rischio', 'Consiglio'].map(qa => (
                <button key={qa} onClick={() => { setChatInput(qa); setTimeout(handleUserMessage, 100); }} style={{
                  whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.1)', border: 'none', color: theme.textDim,
                  padding: '5px 10px', borderRadius: '15px', fontSize: '11px', cursor: 'pointer'
                }}>{qa}</button>
              ))}
            </div>

            <div style={{ padding: '10px', display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUserMessage()}
                placeholder="Chiedi al coach..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
              />
              <button onClick={handleUserMessage} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🚀</button>
            </div>
          </div>
        )}

        {/* Toggle Button (Galleggiante) */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              width: '60px', height: '60px', borderRadius: '50%', background: theme.cyan, border: 'none',
              boxShadow: `0 0 20px ${theme.cyan}`, cursor: 'pointer', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px'
            }}
          >
            💬
          </button>
        )}
      </div>

            {/* ✅ POPUP FORMAZIONI */}
            {showFormationsPopup && formations && (
              <div 
              style={{
                position: 'fixed',
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
              overflowY: 'auto',
              border: `1px solid ${theme.cyan}`,
              boxShadow: `0 0 30px rgba(0,240,255,0.3)`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* Formazioni */}
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
                  {formations.home_formation?.titolari?.map((player, idx) => (
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
                  {formations.away_formation?.titolari?.map((player, idx) => (
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

      {/* ✅ POPUP RIEPILOGO PARTITA */}
      {showMatchSummary && simResult && (
        <div 
          style={{
            position: 'fixed',
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
            {/* Header */}
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

            {/* Risultato */}
            <div style={{
              textAlign: 'center',
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

            {/* Marcatori */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', color: theme.textDim, marginBottom: '8px' }}>⚽ MARCATORI</div>
              <div style={{ fontSize: '13px', color: theme.text }}>
                {simResult.cronaca?.filter((e: any) => e.tipo === 'gol').map((e: any, i: number) => (
                  <div key={i} style={{ 
                    marginBottom: '3px',
                    color: e.squadra === 'casa' ? theme.cyan : theme.danger 
                  }}>
                    {e.testo.split(']')[1]?.trim() || e.testo}
                  </div>
                ))}
              </div>
            </div>

            {/* Statistiche */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '12px'
            }}>
              {simResult.statistiche && Object.entries(simResult.statistiche).slice(0, 10).map(([key, val]: [string, any]) => (
                <div key={key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px'
                }}>
                  <span style={{ color: theme.textDim }}>{key}</span>
                  <span style={{ color: theme.text }}>
                    <span style={{ color: theme.cyan }}>{val[0]}</span>
                    {' - '}
                    <span style={{ color: theme.danger }}>{val[1]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* AVVISO DI USCITA (TOAST ANDROID STYLE) */}
      {showExitToast && (
        <div style={{
          position: 'fixed',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(50, 50, 50, 0.9)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          fontSize: '14px',
          zIndex: 9999,
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          Premi ancora per uscire
        </div>
      )}
    </div>
  );
}