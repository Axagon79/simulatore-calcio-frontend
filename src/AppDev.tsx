import React, { useState, useEffect, useRef } from 'react';
import DashboardHome from './DashboardHome';
import './BadgeClassifica_pt_pos.css'
import './styles/AppDev-grid.css';

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
  predicted_score: string;
  sign: string;
  gh: number;
  ga: number;
  top3: string[];
  algo_name: string;
  match?: any;
  // Dati extra per l'animazione e statistiche
  stats?: {
    possession_home: number;
    shots_home: number;
    shots_away: number;
    xg_home: number;
    xg_away: number;
  };
  events?: { minute: number; team: 'home' | 'away'; type: 'goal' | 'card' | 'attack'; text: string }[];
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
const COUNTRIES = [
  { code: 'ALL', name: 'Tutto il Mondo', flag: '🌍' },
  { code: 'Italy', name: 'Italia', flag: '🇮🇹' },
  { code: 'England', name: 'Inghilterra', flag: '🇬🇧' },
  { code: 'Spain', name: 'Spagna', flag: '🇪🇸' },
  { code: 'Germany', name: 'Germania', flag: '🇩🇪' },
  { code: 'France', name: 'Francia', flag: '🇫🇷' },
  { code: 'Netherlands', name: 'Olanda', flag: '🇳🇱' },
  { code: 'Portugal', name: 'Portogallo', flag: '🇵🇹' }
];

// 2. AGGIORNIAMO LA LISTA CAMPIONATI PER USARE GLI STESSI CODICI

const LEAGUES_MAP: League[] = [
    // ITALIA
    { id: 'SERIE_A', name: 'Serie A', country: 'Italy' },
    { id: 'SERIE_B', name: 'Serie B', country: 'Italy' },
    { id: 'SERIE_C_A', name: 'Serie C - Gir A', country: 'Italy' },
    { id: 'SERIE_C_B', name: 'Serie C - Gir B', country: 'Italy' },
    { id: 'SERIE_C_C', name: 'Serie C - Gir C', country: 'Italy' },
  
    // INGHILTERRA
    { id: 'PREMIER_LEAGUE', name: 'Premier League', country: 'England' },
    
    // SPAGNA
    { id: 'LA_LIGA', name: 'La Liga', country: 'Spain' },

    // GERMANIA
    { id: 'BUNDESLIGA', name: 'Bundesliga', country: 'Germany' },

    // FRANCIA (Recuperata!)
    { id: 'LIGUE_1', name: 'Ligue 1', country: 'France' },

    // OLANDA (Recuperata!)
    { id: 'EREDIVISIE', name: 'Eredivisie', country: 'Netherlands' },

    // PORTOGALLO
    { id: 'LIGA_PORTUGAL', name: 'Primeira Liga', country: 'Portugal' },
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
    padding: '30px 30px 0px 30px', 
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
    width: '80%', maxWidth: '700px', height: '150px',
    border: `2px solid ${theme.cyan}`, borderRadius: '10px',
    position: 'relative', overflow: 'hidden', background: 'rgba(0, 240, 255, 0.05)',
    boxShadow: `0 0 30px rgba(0,240,255,0.1)`
  },
  momentumBar: {
    height: '100%', width: '10px', background: theme.purple,
    position: 'absolute', top: 0, left: '50%',
    transition: 'all 0.5s ease-out', boxShadow: `0 0 20px ${theme.purple}`
  },
  timerDisplay: {
    fontSize: '48px', fontWeight: '900', color: theme.text,
    textShadow: `0 0 20px ${theme.cyan}`, marginBottom: '20px'
  },
  eventFeed: {
    marginTop: '20px', width: '80%', maxWidth: '600px', height: '150px',
    overflowY: 'auto', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '10px'
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
  const [country, setCountry] = useState('Italy');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [league, setLeague] = useState('');
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  // STATO SIMULAZIONE & UI
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'list' | 'pre-match' | 'simulating' | 'result'>('list');
  
  // PREFERENZE SIMULAZIONE
  const [simMode, setSimMode] = useState<'fast' | 'animated'>('fast');
  const [simDepth, setSimDepth] = useState<'quick' | 'normal' | 'deep'>('normal');
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  
  // STATO ANIMAZIONE
  const [timer, setTimer] = useState(0);
  const [animEvents, setAnimEvents] = useState<string[]>([]);
  const [momentum, setMomentum] = useState(50); // 0 = Away domina, 100 = Home domina

  // Stato per gestire quale radar è visibile: 'all' (tutti), 'home' (solo casa), 'away' (solo ospite)
  const [radarFocus, setRadarFocus] = useState<'all' | 'home' | 'away'>('all');

  // Stato per il tooltip del singolo punto (quando passi sulle punte)
  const [pointTooltip, setPointTooltip] = useState<{x: number, y: number, val: number, color: string} | null>(null);
  
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

  

  // --- FETCH DATI ---
  useEffect(() => {
    fetch(`${API_BASE}/leagues?country=${country}`).then(r => r.json()).then(d => { setLeagues(d); if(d.length) setLeague(d[0].id); });
  }, [country]);

  useEffect(() => {
    if(!league) return;
    fetch(`${API_BASE}/rounds?league=${league}`).then(r => r.json()).then(d => {
      setRounds(d.rounds || []);
      const curr = d.rounds?.find((r:any) => r.type === 'current');
      if(curr) setSelectedRound(curr);
    });
  }, [league]);

  useEffect(() => {
    if(!league || !selectedRound) return;
    fetch(`${API_BASE}/matches?league=${league}&round=${selectedRound.name}`).then(r => r.json()).then(setMatches);
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

  // --- LOGICA SIMULAZIONE ---

  const prepareSimulation = (match: Match) => {
    setSelectedMatch(match);
    setViewState('pre-match');
    setSimResult(null);
    setTimer(0);
    setAnimEvents([]);
    
    // Context al bot (Il messaggio viene inviato ma la chat resta chiusa finché non la apri tu)
    addBotMessage(`Hai selezionato ${match.home} vs ${match.away}. Configura la simulazione e partiamo!`);
  };
  const startSimulation = async () => {
    if (!selectedMatch) return;
    setViewState('simulating');

    const cyclesMap: Record<string, number> = { 'quick': 100, 'normal': 500, 'deep': 2000 };
    const cycles = cyclesMap[simDepth];

    try {
      // --- CHIAMATA DIRETTA AL CLOUD RUN PYTHON ---
      const res = await fetch(AI_ENGINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_mode: 4,               // Era mainmode, ora main_mode (Python standard)
          nation: country.toUpperCase(),
          league: league,
          home: selectedMatch.home,
          away: selectedMatch.away,
          round: selectedRound?.name,
          algo_id: 6,                 // Era algoid, ora algo_id
          cycles: cycles,
          save_db: false              // Aggiunto explicit snake_case
        })
      });

      const responseJson = await res.json();

      // Controllo errori specifico per il nuovo backend Python
      if (!responseJson.success || !responseJson.result) {
        throw new Error(responseJson.error || 'Risposta del server incompleta');
      }

      // Estraiamo i dati veri dall'oggetto "result"
      const data = responseJson.result;

      // Adattiamo i dati Python (snake_case) al Frontend (se necessario)
      // Il Python restituisce "predicted_score", "gh", "ga", "sign", ecc.
      const enrichedData = {
        ...data,
        // Mappiamo predicted_score (Python) a predictedscore (Frontend, se lo usi così altrove)
        predictedscore: data.predicted_score, 
        
        events: generateMockEvents(data.gh, data.ga, selectedMatch.home, selectedMatch.away)
      };

      if (simMode === 'fast') {
        setTimeout(() => {
          setSimResult(enrichedData);
          setViewState('result');
          addBotMessage(`Analisi completata! Risultato previsto: ${data.predicted_score}. Chiedimi pure spiegazioni.`);
        }, 1500);
      } else {
        runAnimation(enrichedData);
      }

    } catch (e: any) {
      console.error("Errore Simulazione:", e);
      setViewState('pre-match');
      alert(`Errore simulazione: ${e.message || 'Errore sconosciuto'}`);
    }
  };


  const runAnimation = (finalData: SimulationResult) => {
    let t = 0;
    const totalDurationMs = 10000;
    const intervalMs = 100;
    const step = 90 / (totalDurationMs / intervalMs);

    const interval = setInterval(() => {
      t += step;
      setTimer(Math.min(90, Math.floor(t)));

      setMomentum(prev => {
        const delta = (Math.random() - 0.5) * 20;
        let next = prev + delta;
        if(next < 10) next = 10;
        if(next > 90) next = 90;
        return next;
      });

      if (finalData.events) {
        const currentMinute = Math.floor(t);
        const event = finalData.events.find(e => e.minute === currentMinute);
        if (event && !animEvents.includes(event.text)) {
           setAnimEvents(prev => [event.text, ...prev]);
           if (event.type === 'goal') {
             setMomentum(event.team === 'home' ? 90 : 10);
           }
        }
      }

      if (t >= 90) {
        clearInterval(interval);
        setSimResult(finalData);
        setViewState('result');
        addBotMessage(`Partita terminata! Risultato finale ${finalData.predicted_score}. Vuoi sapere perché?`);
      }
    }, intervalMs);
  };

  const generateMockEvents = (gh: number, ga: number, home: string, away: string) => {
    const events: any[] = [];
    for (let i = 0; i < gh; i++) events.push({ minute: Math.floor(Math.random()*85)+1, team: 'home', type: 'goal', text: `⚽ GOAL! ${home} in vantaggio!` });
    for (let i = 0; i < ga; i++) events.push({ minute: Math.floor(Math.random()*85)+1, team: 'away', type: 'goal', text: `⚽ GOAL! ${away} segna!` });
    events.push({ minute: 15, team: 'home', type: 'attack', text: `🔥 ${home} vicino al gol!` });
    events.push({ minute: 60, team: 'away', type: 'card', text: `🟨 Cartellino giallo per ${away}` });
    return events.sort((a,b) => a.minute - b.minute);
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


  // --- COMPONENTI UI RENDER ---

  const renderMatchList = () => (
    <div style={{
      ...styles.arenaContent,
      padding: isMobile ? '20px 10px 0 10px' : '30px 30px 0px 30px',
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
    marginTop: '-10px',
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
        onClick={() => setSelectedRound(r)}
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
        <div style={{textAlign:'center', padding:'40px', color: theme.textDim}}>Nessuna partita trovata</div> 
      ) : (

        
        
       matches.map(match => {
        const isFuture = selectedRound?.type === 'next';
        const showLucifero = !isFuture && match.h2h_data?.lucifero_home != null;
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
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
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
                  ? new Date((match as any).date_obj).toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit'}) 
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
        <div style={styles.animContainer}>
        <div style={styles.timerDisplay}>{timer}'</div>
        
        {/* Campo da Gioco Neon */}
        <div style={styles.pitch}>
            {/* Linea di metà campo */}
            <div style={{position:'absolute', left:'50%', height:'100%', borderLeft:'1px solid rgba(255,255,255,0.2)'}}></div>
            <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', width:'80px', height:'80px', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'50%'}}></div>
            
            {/* Barra Momentum (La lancetta della partita) */}
            <div style={{
            ...styles.momentumBar,
            left: `${momentum}%`,
            width: '4px',
            boxShadow: `0 0 30px 5px ${momentum > 50 ? theme.cyan : theme.danger}`
            }} />
            
            {/* Nomi Squadre in basso */}
            <div style={{position:'absolute', bottom:'10px', left:'10px', fontSize:'12px', fontWeight:'bold', color: theme.cyan}}>{selectedMatch?.home}</div>
            <div style={{position:'absolute', bottom:'10px', right:'10px', fontSize:'12px', fontWeight:'bold', color: theme.danger}}>{selectedMatch?.away}</div>
        </div>

        {/* Feed Eventi (Gol, Cartellini...) */}
        <div style={styles.eventFeed}>
            {animEvents.length === 0 ? <div style={{color:'#666', textAlign:'center', marginTop:'10px', fontSize:'12px'}}>Fischio d'inizio...</div> :
            animEvents.map((e, i) => (
                <div key={i} style={{marginBottom:'5px', fontSize:'13px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'2px', color:'white'}}>
                {e}
                </div>
            ))
            }
        </div>
        
        <div style={{marginTop:'20px', color: theme.cyan, letterSpacing:'2px', fontSize:'10px', animation:'pulse 2s infinite'}}>
            SIMULAZIONE LIVE DAL CORE AI
        </div>
        </div>
    );
  const renderPreMatch = () => {

    // --- 1. FUNZIONE COLORI LED ---
    
    
    // INCOLLA QUESTE (Dati reali dal DB):
    const homeTrend = selectedMatch?.h2h_data?.lucifero_trend_home || [0,0,0,0,0]; 
    const awayTrend = selectedMatch?.h2h_data?.lucifero_trend_away || [0,0,0,0,0];

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

    // --- 2. CALCOLO COLORI ---
    // Usiamo la tua funzione per ottenere il colore esatto
   // const homeColor = getTrendColor(homeFieldFactor);
   // const awayColor = getTrendColor(awayFieldFactor);

    // Trucco per l'ombra: rendiamo l'ombra leggermente trasparente (0.6) per un effetto neon più realistico
    //const homeShadow = homeColor.replace(', 1)', ', 0.2)');
    //const awayShadow = awayColor.replace(', 1)', ', 0.2)');
    
     

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

    // INCOLLA QUESTO PEZZO PRIMA DEL 'return ('
    /*   const oddsBoxStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.08)', 
        borderRadius: '4px',                           
        padding: '0px 6px',                           
        minWidth: '0px',                              
        marginTop: '0px',
        fontSize: '13px',
        fontWeight: 'bold',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.05)', 
        display: 'inline-block'                        
    };*/

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
    paddingTop: isMobile ? '0' : '0px', 
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
            <span style={{ fontFamily: 'monospace' }}>{(selectedMatch as any).date_obj ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}) : '27/12'}</span>
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
                <div style={{textAlign: isMobile ? 'right' : 'center',
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
                <div style={{ textAlign: isMobile ? 'left' : 'center',
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
                    <div className="card-dna" style={{ ...styles.card, padding: '10px', marginTop: '-20px', position: 'relative', overflow: 'hidden' }}>
                        <div className="header-section" style={{ marginBottom: '5px', position: 'relative' }}>
                            <div className="header-title" style={{ fontSize: '10px', opacity: 0.8, marginTop: '10px' }}>🕸️ DNA SYSTEM</div>
                            
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
                                            <div style={{ width: `${Math.round(homeRadar.reduce((a, b) => a + b, 0) / 5)}%`, height: '100%', backgroundColor: theme.cyan, boxShadow: `0 0 5px ${theme.cyan}`}}></div>
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
                                            <div style={{ width: `${Math.round(awayRadar.reduce((a, b) => a + b, 0) / 5)}%`, height: '100%', backgroundColor: theme.danger, boxShadow: `0 0 5px ${theme.danger}`}}></div>
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
                        <div className="radar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '5px', padding: '5px' }}>
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
                                {(radarFocus === 'all' || radarFocus === 'home') && drawPentagramRadar(homeRadar, theme.cyan, )}
                                {(radarFocus === 'all' || radarFocus === 'away') && drawPentagramRadar(awayRadar, theme.danger, )}

                                {/* TOOLTIP DEL PUNTO (Appare quando passi sulle punte) */}
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

                    {/* CONFIGURAZIONE SIMULAZIONE */}
                    <div className="card-configurazione" style={styles.card}>
                        <div className="header-title">⚙️ CONFIGURAZIONE SIMULAZIONE</div>
                        <select>
                            <option value="6">Lucifero V4 (Standard)</option>
                            <option value="5">Neural Network Beta</option>
                            <option value="1">Poisson Simple</option>
                        </select>
                        <div className="controls-grid">
                            <div className="control-group">
                                <div className="control-label">CICLI</div>
                                <div className="button-group">
                                    {['100', '500'].map((d) => (
                                        <button key={d} onClick={() => setSimDepth(d === '100' ? 'quick' : 'normal')} className="control-button" style={{ 
                                            background: (simDepth === 'quick' && d === '100') || (simDepth === 'normal' && d === '500') ? theme.cyan : '#222',
                                            color: (simDepth === 'quick' && d === '100') || (simDepth === 'normal' && d === '500') ? 'black' : '#888'
                                        }}>{d}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="control-group">
                                <div className="control-label">MODO</div>
                                <div className="button-group">
                                    <button onClick={() => setSimMode('fast')} className="control-button" style={{ 
                                        background: simMode === 'fast' ? theme.success : '#222', 
                                        color: simMode === 'fast' ? 'black' : '#888'
                                    }}>⚡</button>
                                    <button onClick={() => setSimMode('animated')} className="control-button" style={{ 
                                        background: simMode === 'animated' ? theme.purple : '#222', 
                                        color: simMode === 'animated' ? 'white' : '#888'
                                    }}>🎬</button>
                                </div>
                            </div>
                        </div>
                        <button className="start-button" onClick={startSimulation}>
                            AVVIA SIMULAZIONE
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    
);
};

 

  const renderResult = () => (
    <div style={styles.arenaContent}>
       <button onClick={() => setViewState('list')} style={{background:'transparent', border:'none', color: theme.textDim, cursor:'pointer', marginBottom:'10px'}}>← Torna alla lista</button>
       
       <div style={{textAlign:'center', padding:'40px 0'}}>
         <div style={{fontSize:'14px', color: theme.success, letterSpacing:'2px', marginBottom:'10px'}}>SIMULAZIONE COMPLETATA</div>
         
         <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'40px'}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'24px', fontWeight:'bold'}}>{selectedMatch?.home}</div>
            </div>
            
            <div style={{
              fontSize:'64px', fontWeight:'900', color: theme.cyan, 
              textShadow: `0 0 40px ${theme.cyan}`,
              background: 'rgba(0,0,0,0.5)', padding:'10px 40px', borderRadius:'20px', border: `1px solid ${theme.cyan}`
            }}>
              {simResult?.predicted_score}
            </div>
            
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:'24px', fontWeight:'bold'}}>{selectedMatch?.away}</div>
            </div>
         </div>
         
         <div style={{display:'flex', justifyContent:'center', gap:'15px', marginTop:'30px'}}>
            <div style={{padding:'8px 20px', background: theme.panel, borderRadius:'20px', border: theme.panelBorder}}>
               Segno: <span style={{color: theme.purple, fontWeight:'bold'}}>{simResult?.sign}</span>
            </div>
            <div style={{padding:'8px 20px', background: theme.panel, borderRadius:'20px', border: theme.panelBorder}}>
               Affidabilità: <span style={{color: theme.success, fontWeight:'bold'}}>Alta</span>
            </div>
         </div>
       </div>

       <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px', marginTop:'20px'}}>
          <button onClick={() => addBotMessage("Spiegami nel dettaglio questo pronostico.")} style={{padding:'15px', background: 'rgba(255,255,255,0.05)', border:'1px solid #333', color:'white', borderRadius:'8px', cursor:'pointer'}}>
            🤖 Spiegami il pronostico
          </button>
          <button onClick={() => addBotMessage("Trovami partite simili a questa per una multipla.")} style={{padding:'15px', background: 'rgba(255,255,255,0.05)', border:'1px solid #333', color:'white', borderRadius:'8px', cursor:'pointer'}}>
            🔍 Partite Simili
          </button>
          <button onClick={() => alert('Feature "Consiglio Scommessa" in arrivo...')} style={{padding:'15px', background: 'rgba(255,255,255,0.05)', border:'1px solid #333', color:'white', borderRadius:'8px', cursor:'pointer'}}>
            💰 Consiglio Scommessa
          </button>
       </div>
    </div>
  );

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
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; borderRadius: 3px; }
      `}</style>

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
          <div style={{display: 'flex', alignItems: 'center', gap: '120px', paddingLeft: '60px'}}> 
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
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)'}
            >
              ⟵ DASHBOARD
            </button>

            <div style={{...styles.logo, display: 'flex', alignItems: 'center'}}>
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
            <span style={{display: isMobile ? 'none' : 'inline'}}>AI SIMULATOR</span>
          </div>
        )}

        {/* PARTE DESTRA */}
        <div style={{display:'flex', gap: isMobile ? '10px' : '20px', alignItems:'center', marginLeft: 'auto'}}>
          {!isMobile && (
            <div style={{fontSize:'12px', color: theme.textDim}}>
              Crediti: <span style={{color: theme.success}}>∞</span>
            </div>
          )}
          {!isMobile && (
            <button onClick={() => alert('Tema toggle')} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer'}}>🌙</button>
          )}
          <div style={{
            width: isMobile ? '28px' : '32px', 
            height: isMobile ? '28px' : '32px', 
            borderRadius:'50%', 
            background: theme.purple, 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            fontWeight:'bold', 
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
            <div style={{fontSize:'12px', color: theme.textDim, fontWeight:'bold'}}>NAZIONE</div>
            <select 
              value={country} onChange={e => setCountry(e.target.value)}
              style={{padding:'10px', background:'#000', color:'white', border:'1px solid #333', borderRadius:'6px', width: '100%'}}
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>

            <div style={{fontSize:'12px', color: theme.textDim, fontWeight:'bold', marginTop:'15px'}}>CAMPIONATO</div>
            <select 
              value={league} onChange={e => setLeague(e.target.value)}
              style={{padding:'10px', background:'#000', color:'white', border:'1px solid #333', borderRadius:'6px', width: '100%'}}
            >
              {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            {/* Widget Highlights */}
            <div style={{marginTop:'auto'}}>
              <div style={{fontSize:'12px', color: theme.textDim, marginBottom:'10px'}}>HIGHLIGHTS</div>
              <div style={{...styles.card, padding:'15px', position:'relative', overflow:'hidden', cursor:'pointer'}}>
                <div style={getWidgetGlow(theme.success)} />
                <div style={{fontSize:'11px', color: theme.textDim}}>BEST BET</div>
                <div style={{fontWeight:'bold', marginTop:'5px'}}>Napoli vs Roma</div>
                <div style={{color: theme.success, fontSize:'12px'}}>1 + Over 1.5</div>
              </div>
              <div style={{...styles.card, padding:'15px', position:'relative', overflow:'hidden', cursor:'pointer', marginTop:'10px'}}>
                <div style={getWidgetGlow(theme.danger)} />
                <div style={{fontSize:'11px', color: theme.textDim}}>RISCHIO ALTO</div>
                <div style={{fontWeight:'bold', marginTop:'5px'}}>Lecce vs Verona</div>
                <div style={{color: theme.danger, fontSize:'12px'}}>Possibile X</div>
              </div>
            </div>
          </div>

        {/* MAIN ARENA */}
        <div style={styles.arena}>
          {viewState === 'list' && renderMatchList()}
          {viewState === 'pre-match' && renderPreMatch()}
          {viewState === 'simulating' && (simMode === 'animated' ? renderAnimation() : <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', fontSize:'20px'}}>Calcolo Veloce in corso...</div>)}
          {viewState === 'result' && renderResult()}
        </div>
      </div>

      {/* CHATBOT WIDGET */}
      <div style={{position:'fixed', bottom:'20px', right:'20px', display:'flex', flexDirection:'column', alignItems:'flex-end', zIndex: 100}}>
        
        {/* Chat Window */}
        {chatOpen && (
          <div style={styles.chatWidget}>
            <div style={styles.chatHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{width:'8px', height:'8px', borderRadius:'50%', background: theme.success}}></div>
                  Football AI Coach
              </div>
              <button onClick={() => setChatOpen(false)} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:'16px'}}>✕</button>
            </div>
            
            <div style={styles.chatBody}>
              {messages.map(msg => (
                <div key={msg.id} style={{...styles.msgBubble, ...(msg.sender === 'user' ? styles.userMsg : styles.botMsg)}}>
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions */}
            <div style={{padding:'10px', display:'flex', gap:'5px', overflowX:'auto', borderTop:'1px solid rgba(255,255,255,0.05)'}}>
               {['Perché Over?', 'Analisi Rischio', 'Consiglio'].map(qa => (
                 <button key={qa} onClick={() => { setChatInput(qa); setTimeout(handleUserMessage, 100); }} style={{
                   whiteSpace:'nowrap', background:'rgba(255,255,255,0.1)', border:'none', color: theme.textDim,
                   padding:'5px 10px', borderRadius:'15px', fontSize:'11px', cursor:'pointer'
                 }}>{qa}</button>
               ))}
            </div>

            <div style={{padding:'10px', display:'flex', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
              <input 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUserMessage()}
                placeholder="Chiedi al coach..."
                style={{flex:1, background:'transparent', border:'none', color:'white', outline:'none'}}
              />
              <button onClick={handleUserMessage} style={{background:'transparent', border:'none', cursor:'pointer'}}>🚀</button>
            </div>
          </div>
        )}

        {/* Toggle Button (Galleggiante) */}
        {!chatOpen && (
            <button 
            onClick={() => setChatOpen(true)}
            style={{
                width:'60px', height:'60px', borderRadius:'50%', background: theme.cyan, border:'none',
                boxShadow: `0 0 20px ${theme.cyan}`, cursor:'pointer', fontSize:'30px', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'10px'
            }}
            >
            💬
            </button>
        )}
      </div>
    </div>
  );
}