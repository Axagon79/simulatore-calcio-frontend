import React, { useState, useEffect, useRef } from 'react';
import DashboardHome from './DashboardHome';
import CupMatches from './CupMatches';
import './BadgeClassifica_pt_pos.css'
import './styles/AppDev-grid.css';
import { checkAdmin, PERMISSIONS } from './permissions';
import SimulationResultView from './components/SimulationResultView';
import './styles/SimulationAnimation.css';
import './styles/SimulationAnimation-responsive.css'; // NUOVO
import { ArrowLeft, /* altre icone */ } from 'lucide-react'; //
import DailyPredictions from './DailyPredictions';

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
  home_id: number; // Aggiungi questo
  away_id: number; // Aggiungi questo
  home_mongo_id?: string; // <--- AGGIUNGI QUESTO
  away_mongo_id?: string; // <--- AGGIUNGI QUESTO
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
    tipo: "gol" | "cartellino" | "cambio" | "info" | "rigore_fischio" | "rigore_sbagliato" | "rosso" | "VAR_PROCESS" | "VAR_VERDICT" | "formazione";
    var_type?: "gol" | "rigore" | "rigore_on_field_review" | "rosso" | "gol_fantasma";
    decision?: "confermato" | "annullato";

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


const LEAGUES_MAP: League[] = [
  // ITALIA
  { id: 'SERIE_A', name: 'Serie A', country: 'Italy' },
  { id: 'SERIE_B', name: 'Serie B', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_A', name: 'Serie C - Gir A', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_B', name: 'Serie C - Gir B', country: 'Italy' },
  { id: 'SERIE_C_GIRONE_C', name: 'Serie C - Gir C', country: 'Italy' },
  
  // EUROPA TOP
  { id: 'PREMIER_LEAGUE', name: 'Premier League', country: 'England' },
  { id: 'LA_LIGA', name: 'La Liga', country: 'Spain' },
  { id: 'BUNDESLIGA', name: 'Bundesliga', country: 'Germany' },
  { id: 'LIGUE_1', name: 'Ligue 1', country: 'France' },
  { id: 'EREDIVISIE', name: 'Eredivisie', country: 'Netherlands' },
  { id: 'LIGA_PORTUGAL', name: 'Liga Portugal', country: 'Portugal' },
  
  // 🆕 EUROPA SERIE B
  { id: 'CHAMPIONSHIP', name: 'Championship', country: 'England' },
  { id: 'LA_LIGA_2', name: 'LaLiga 2', country: 'Spain' },
  { id: 'BUNDESLIGA_2', name: '2. Bundesliga', country: 'Germany' },
  { id: 'LIGUE_2', name: 'Ligue 2', country: 'France' },
  
  // 🆕 EUROPA NORDICI + EXTRA
  { id: 'SCOTTISH_PREMIERSHIP', name: 'Scottish Prem.', country: 'Scotland' },
  { id: 'ALLSVENSKAN', name: 'Allsvenskan', country: 'Sweden' },
  { id: 'ELITESERIEN', name: 'Eliteserien', country: 'Norway' },
  { id: 'SUPERLIGAEN', name: 'Superligaen', country: 'Denmark' },
  { id: 'JUPILER_PRO_LEAGUE', name: 'Jupiler Pro', country: 'Belgium' },
  { id: 'SUPER_LIG', name: 'Süper Lig', country: 'Turkey' },
  { id: 'LEAGUE_OF_IRELAND', name: 'League of Ireland', country: 'Ireland' },
  
  // 🆕 AMERICHE
  { id: 'BRASILEIRAO', name: 'Brasileirão', country: 'Brazil' },
  { id: 'PRIMERA_DIVISION_ARG', name: 'Primera División', country: 'Argentina' },
  { id: 'MLS', name: 'MLS', country: 'USA' },
  
  // 🆕 ASIA
  { id: 'J1_LEAGUE', name: 'J1 League', country: 'Japan' },
];


// --- URL BASE STEMMI ---
const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

const STEMMI_CAMPIONATI: Record<string, string> = {
  'SERIE_A': `${STEMMI_BASE}campionati%2Fserie_a.png?alt=media`,
  'SERIE_B': `${STEMMI_BASE}campionati%2Fserie_b.png?alt=media`,
  'SERIE_C_A': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'SERIE_C_B': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'SERIE_C_C': `${STEMMI_BASE}campionati%2Fserie_c.png?alt=media`,
  'PREMIER_LEAGUE': `${STEMMI_BASE}campionati%2Fpremier_league.png?alt=media`,
  'LA_LIGA': `${STEMMI_BASE}campionati%2Fla_liga.png?alt=media`,
  'BUNDESLIGA': `${STEMMI_BASE}campionati%2Fbundesliga.png?alt=media`,
  'LIGUE_1': `${STEMMI_BASE}campionati%2Fligue_1.png?alt=media`,
  'LIGA_PORTUGAL': `${STEMMI_BASE}campionati%2Fliga_portugal.png?alt=media`,
  'CHAMPIONSHIP': `${STEMMI_BASE}campionati%2Fchampionship.png?alt=media`,
  'LA_LIGA_2': `${STEMMI_BASE}campionati%2Fla_liga_2.png?alt=media`,
  'BUNDESLIGA_2': `${STEMMI_BASE}campionati%2Fbundesliga_2.png?alt=media`,
  'LIGUE_2': `${STEMMI_BASE}campionati%2Fligue_2.png?alt=media`,
  'EREDIVISIE': `${STEMMI_BASE}campionati%2Feredivisie.png?alt=media`,
  'SCOTTISH_PREMIERSHIP': `${STEMMI_BASE}campionati%2Fscottish_premiership.png?alt=media`,
  'ALLSVENSKAN': `${STEMMI_BASE}campionati%2Fallsvenskan.png?alt=media`,
  'ELITESERIEN': `${STEMMI_BASE}campionati%2Feliteserien.png?alt=media`,
  'SUPERLIGAEN': `${STEMMI_BASE}campionati%2Fsuperligaen.png?alt=media`,
  'JUPILER_PRO_LEAGUE': `${STEMMI_BASE}campionati%2Fjupiler_pro_league.png?alt=media`,
  'SUPER_LIG': `${STEMMI_BASE}campionati%2Fsuper_lig.png?alt=media`,
  'LEAGUE_OF_IRELAND': `${STEMMI_BASE}campionati%2Fleague_of_ireland.png?alt=media`,
  'BRASILEIRAO': `${STEMMI_BASE}campionati%2Fbrasileirao.png?alt=media`,
  'PRIMERA_DIVISION_ARG': `${STEMMI_BASE}campionati%2Fprimera_division_arg.png?alt=media`,
  'MLS': `${STEMMI_BASE}campionati%2Fmls.png?alt=media`,
  'J1_LEAGUE': `${STEMMI_BASE}campionati%2Fj1_league.png?alt=media`,
};

const STEMMI_COPPE: Record<string, string> = {
  'UCL': `${STEMMI_BASE}coppe%2Fucl.png?alt=media`,
  'UEL': `${STEMMI_BASE}coppe%2Fuel.png?alt=media`,
};

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
  const [selectedCup, setSelectedCup] = useState('');
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  // STATO SIMULAZIONE & UI
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'list' | 'pre-match' | 'simulating' | 'result' | 'settings'>('list');

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


// --- Funzione Helper Stemmi (FIX DEFINITIVO: Legge il Menù locale) ---
const getStemmaLeagueUrl = (mongoId?: string) => {
  if (!mongoId) return '';

  // 1. TRUCCO: Leggiamo "league" (lo stato del menù) che è quello aggiornato.
  // Se "league" è vuoto o undefined, usiamo "activeLeague" come fallback.
  // (Nota: "league" è la variabile che usi nel value={...} del menù a tendina)
  // // modificato per: includere le coppe nella determinazione della lega corrente
const currentLeague = (typeof league !== 'undefined' && league) ? league : (activeLeague || selectedCup);

  // 2. Normalizziamo il testo (Maiuscolo e senza spazi ai lati)
  const input = currentLeague ? currentLeague.toUpperCase().trim() : '';

  let folder = 'Altro';

  switch (input) {
      // --- ITALIA ---
      case 'SERIE_A': case 'SERIE A': 
      case 'SERIE_B': case 'SERIE B': 
      case 'SERIE_C_A': case 'SERIE_C_B': case 'SERIE_C_C': case 'SERIE C':
          folder = 'Italy'; break;

      // --- INGHILTERRA ---
      case 'PREMIER_LEAGUE': case 'PREMIER LEAGUE': 
      case 'CHAMPIONSHIP':
          folder = 'England'; break;

      // --- SPAGNA ---
      case 'LA_LIGA': case 'LA LIGA': 
      case 'LA_LIGA_2': case 'LA LIGA 2':
          folder = 'Spain'; break;

      // --- GERMANIA ---
      case 'BUNDESLIGA': case 'BUNDESLIGA_2': case 'BUNDESLIGA 2':
          folder = 'Germany'; break;

      // --- FRANCIA ---
      case 'LIGUE_1': case 'LIGUE 1': 
      case 'LIGUE_2': case 'LIGUE 2':
          folder = 'France'; break;

      // --- PORTOGALLO ---
      case 'LIGA_PORTUGAL': case 'LIGA PORTUGAL': case 'PRIMEIRA_LIGA':
          folder = 'Portugal'; break;

      // --- OLANDA ---
      case 'EREDIVISIE':
          folder = 'Netherlands'; break;

      // --- SCOZIA ---
      case 'SCOTTISH_PREMIERSHIP': case 'SCOTTISH PREMIERSHIP':
          folder = 'Scotland'; break;

      // --- NORD EUROPA ---
      case 'ALLSVENSKAN':
          folder = 'Sweden'; break;
      case 'ELITESERIEN':
          folder = 'Norway'; break;
      case 'SUPERLIGAEN': case 'SUPERLIGA':
          folder = 'Denmark'; break;
      case 'LEAGUE_OF_IRELAND': case 'LEAGUE OF IRELAND':
          folder = 'Ireland'; break;

      // --- BELGIO & TURCHIA ---
      case 'JUPILER_PRO_LEAGUE': case 'JUPILER PRO LEAGUE':
          folder = 'Belgium'; break;
      case 'SUPER_LIG': case 'SUPER LIG':
          folder = 'Turkey'; break;

      // --- RESTO DEL MONDO ---
      case 'BRASILEIRAO':
          folder = 'Brazil'; break;
      case 'PRIMERA_DIVISION_ARG': case 'PRIMERA DIVISION': case 'LIGA PROFESIONAL':
          folder = 'Argentina'; break;
      case 'MLS':
          folder = 'USA'; break;
      case 'J1_LEAGUE': case 'J1 LEAGUE': case 'J LEAGUE':
          folder = 'Japan'; break;

      default:
          folder = 'Altro';
  }

  return `${STEMMI_BASE}squadre%2F${folder}%2F${mongoId}.png?alt=media`;
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





  
  // Questo ref conterrà SEMPRE lo stato aggiornato dell'app
  const stateRef = useRef({
    isPopupOpen: false,
    mobileMenu: false,
    expandedMatch: null as string | null,
    viewState: 'list',
    activeLeague: null as string | null,
    
    // // modificato per: tracciare la coppa selezionata nel sistema di navigazione
    selectedCup: '', 
    
    rounds: [] as any
  });
  
  


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

  // STATO PER PRONOSTICI SIDEBAR
  const [sidebarPredictions, setSidebarPredictions] = useState<any[]>([]);

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
          flag: n === 'Italy' ? '🇮🇹' : n === 'Spain' ? '🇪🇸' : n === 'England' ? '🇬🇧' : n === 'Germany' ? '🇩🇪' : n === 'France' ? '🇫🇷' : n === 'Netherlands' ? '🇳🇱' : n === 'Portugal' ? '🇵🇹' : n === 'Argentina' ? '🇦🇷' : n === 'Belgium' ? '🇧🇪' : n === 'Brazil' ? '🇧🇷' : n === 'Denmark' ? '🇩🇰' : n === 'Ireland' ? '🇮🇪' : n === 'Japan' ? '🇯🇵' : n === 'Norway' ? '🇳🇴' : n === 'Scotland' ? '🇬🇧' : n === 'Sweden' ? '🇸🇪' : n === 'Turkey' ? '🇹🇷' : n === 'USA' ? '🇺🇸' : '🌍'
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
    // Se non c'è nazione, non fare nulla
    if (!country) return;

    fetch(`${API_BASE}/leagues?country=${country}`)
      .then(r => r.json())
      .then(d => { 
          setLeagues(d); 
          
          // 🔥 LOGICA INTELLIGENTE (Salva-Dashboard)
          // Cerchiamo se la lega attuale (league) esiste nella lista appena scaricata (d)
          const isCurrentLeagueValid = d.find((l: any) => l.id === league);

          if (isCurrentLeagueValid) {
              // CASO 1: Vengo dalla Dashboard (es. Serie A è valida per l'Italia)
              // NON faccio nulla, mantengo la selezione!
          } else {
              // CASO 2: Ho cambiato nazione a mano (es. Serie A non esiste in Inghilterra)
              // Resetto su "Seleziona"
              setLeague(""); 
          }
      });
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// --- CARICA PRONOSTICI PER SIDEBAR ---
useEffect(() => {
  const fetchSidebarPredictions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE}/simulation/daily-predictions?date=${today}`);
      const data = await response.json();
      if (data.success && data.predictions && data.predictions.length > 0) {
        // Prendi 3 pronostici random
        const shuffled = [...data.predictions].sort(() => 0.5 - Math.random());
        setSidebarPredictions(shuffled.slice(0, 3));
      }
    } catch (err) {
      console.error('Errore caricamento pronostici sidebar:', err);
    }
  };
  fetchSidebarPredictions();
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
      rounds: rounds
    };
  }, [showMatchSummary, showFormationsPopup, showResimulatePopup, showSettingsPopup, 
      chatOpen, mobileMenuOpen, expandedMatch, viewState, activeLeague, rounds, selectedCup]);


  // 3. MOTORE: SCRIVE L'URL (Rispetta il semaforo isBackNav)
  useEffect(() => {
    // Se stiamo tornando indietro (Semaforo ROSSO), non spingere nulla nella history
    if (isBackNav.current) {
        isBackNav.current = false; // Reset semaforo
        return; 
    }

    // --- Priorità Assolute (Menu e Popup) ---
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
  }, [viewState, expandedMatch, activeLeague, mobileMenuOpen, showMatchSummary, showFormationsPopup, showResimulatePopup, showSettingsPopup, chatOpen, selectedCup]);


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

      // 3. Tornati alla LISTA (#list)
      else if (currentHash === '#list' || currentHash.startsWith('#round')) {
          
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

// ✅ VERSIONE AGGIORNATA, VELOCE E FIXATA PER IL BACKEND
const startSimulation = async (algoOverride: number | null = null, cyclesOverride: number | null = null) => {
  if (!selectedMatch) return;

  // 1. DETERMINAZIONE PARAMETRI (Priorità ai valori passati dal popup)
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
              
              // 💀 MODO CATTIVO: Ridisegna la scritta ogni 100ms per 6 secondi
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
        
        // Ogni tanto (20% probabilità) crea un "momento di pressione"
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
      <CupMatches 
        cupId={selectedCup as 'UCL' | 'UEL'} 
        onBack={() => {
          setSelectedCup('');
          setActiveLeague(null);  // Torna alla dashboard
        }}
      />
      ) : matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>Nessuna partita trovata</div>
      ) : (
        matches.map(match => (
          <ElementoPartita
            key={match.id}
            match={match}
            isMobile={isMobile}
            isExpanded={expandedMatch === match.id}
            onToggleExpand={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
            onPrepareSimulation={() => prepareSimulation(match)}
            getStemmaLeagueUrl={getStemmaLeagueUrl}
            theme={theme}
          />
        ))
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
                          ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
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


  // --- BLOCCO 0: PAGINA PRONOSTICI ---
  if (activeLeague === 'PREDICTIONS') {
    return (
      <DailyPredictions
        onBack={() => setActiveLeague(null)}
      />
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
          setCountry(nazioneGiusta);
          setLeague(id);
          
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
          {viewState === 'list' && renderMatchList()}
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
        theme={theme}
        styles={styles}
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