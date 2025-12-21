import React, { useState, useEffect, useRef } from 'react';
import DashboardHome from './DashboardHome';

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
// --- CONFIGURAZIONE ---
const API_BASE = 'http://127.0.0.1:5001/puppals-456c7/us-central1/api';

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
    { id: 'serie-a', name: 'Serie A', country: 'Italy' },
    { id: 'serie-b', name: 'Serie B', country: 'Italy' },
    { id: 'seriec-a', name: 'Serie C - Gir A', country: 'Italy' },
    { id: 'seriec-b', name: 'Serie C - Gir B', country: 'Italy' },
    { id: 'seriec-c', name: 'Serie C - Gir C', country: 'Italy' },
  
    // INGHILTERRA
    { id: 'premier', name: 'Premier League', country: 'England' },
    { id: 'championship', name: 'Championship', country: 'England' },
  
    // ALTRE NAZIONI
    { id: 'laliga', name: 'La Liga', country: 'Spain' },
    { id: 'bundes', name: 'Bundesliga', country: 'Germany' },
    { id: 'ligue1', name: 'Ligue 1', country: 'France' },
    { id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands' },
    { id: 'primeira', name: 'Primeira Liga', country: 'Portugal' },
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
    borderRight: theme.panelBorder, background: 'rgba(0,0,0,0.3)', overflowY: 'auto'
  },
  
  // ARENA CENTRALE
  arena: {
    flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
    overflowY: 'auto', padding: '0' 
  },
  arenaContent: {
    // Ho cambiato il padding: 30px sopra/lati, ma 0px sotto.
    // Questo elimina lo spazio morto in fondo.
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
  const [viewState, setViewState] = useState<'list' | 'pre-match' | 'simulating' | 'result'>('list');
  
  // PREFERENZE SIMULAZIONE
  const [simMode, setSimMode] = useState<'fast' | 'animated'>('fast');
  const [simDepth, setSimDepth] = useState<'quick' | 'normal' | 'deep'>('normal');
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  
  // STATO ANIMAZIONE
  const [timer, setTimer] = useState(0);
  const [animEvents, setAnimEvents] = useState<string[]>([]);
  const [momentum, setMomentum] = useState(50); // 0 = Away domina, 100 = Home domina
  
  // STATO CHATBOT (Ora inizializzato a FALSE = Chiuso)
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'Ciao! Sono il tuo Football AI Coach. Seleziona una partita per iniziare.', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

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

    const cyclesMap = { 'quick': 100, 'normal': 500, 'deep': 2000 };
    const cycles = cyclesMap[simDepth];

    try {
      const res = await fetch(`${API_BASE}/simulation/simulate-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_mode: 4,
          nation: country.toUpperCase(),
          league: league,
          home: selectedMatch.home,
          away: selectedMatch.away,
          round: selectedRound?.name,
          algo_id: 6,
          cycles: cycles
        })
      });
      const data = await res.json();
      
      const enrichedData = {
        ...data,
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

    } catch (e) {
      console.error(e);
      setViewState('pre-match');
      alert('Errore simulazione');
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
    <div style={styles.arenaContent}>
      
      {/* 1. NAVIGAZIONE STILE "CAPSULA NEON" (Esattamente i tuoi parametri) */}
      <div style={{ 
          display: 'flex', 
          background: 'rgba(18, 20, 35, 0.85)', 
          marginBottom: '15px', 
          marginTop: '-10px',
          gap: '10px', 
          padding: '10px', 
          borderRadius: '30px', 
          border: '1px solid rgba(0, 240, 255, 0.2)' 
      }}>
        {rounds.map(r => (
           <button 
             key={r.name} 
             onClick={() => setSelectedRound(r)}
             style={{
               flex: 1, 
               padding: '8px', 
               background: selectedRound?.name === r.name ? 'rgb(0, 240, 255)' : 'transparent',
               border: 'none', 
               cursor: 'pointer', 
               fontWeight: 'bold', 
               fontSize: '13px',
               color: selectedRound?.name === r.name ? 'rgb(0, 0, 0)' : 'rgb(139, 155, 180)',
               transition: 'background 0.2s',
               borderRadius: '25px'
             }}
           >
             {r.label}
           </button>
        ))}
      </div>

      {/* 2. LISTA PARTITE (Stile Card "Pixel Perfect") */}
      {matches.length === 0 ? (
        <div style={{textAlign:'center', padding:'40px', color: theme.textDim}}>Nessuna partita trovata</div> 
      ) : (
       matches.map(match => {
        const isFuture = selectedRound?.type === 'next';
        const showLucifero = !isFuture && match.h2h_data?.lucifero_home != null;
        
        // Quote simulate (Placeholder)
        const odds = { 1: '1.85', X: '3.40', 2: '4.20' }; 

        return (
        <div 
          key={match.id}
          onClick={() => prepareSimulation(match)}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '20px',
            padding: '10.2px 15px',
            marginBottom: '5px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }}
        >
          {/* A. DATA (Sinistra - Parametri esatti) */}
          <div style={{
              display:'flex', flexDirection:'column', alignItems:'center', width:'45px', 
              borderRight:'1px solid rgba(255, 255, 255, 0.1)', marginRight:'15px'
          }}>
             <div style={{fontSize:'10px', color:'rgb(136, 136, 136)', fontWeight:'bold'}}>
                {match.date_obj ? new Date(match.date_obj).toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit'}) : ''}
             </div>
             <div style={{fontSize:'11px', color:'rgb(0, 240, 255)', fontWeight:'bold'}}>
                {match.match_time}
             </div>
          </div>

          {/* B. SQUADRE E BARRE (Centro) */}
          <div style={{flex: 1, display:'flex', alignItems:'center', justifyContent:'center'}}>
              
              {/* CASA */}
              <div style={{flex:1, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'10px'}}>
                 {showLucifero && (
                    <div style={{display:'flex', alignItems:'center'}}>
                        <span style={{fontSize:'10px', color:'rgb(5, 249, 182)', marginRight:'4px', fontWeight:'bold'}}>{Math.round((match.h2h_data.lucifero_home / 25) * 100)}%</span>
                        <div style={{width:'35px', height:'5px', background:'rgba(255, 255, 255, 0.1)', borderRadius:'3px'}}>
                            <div style={{
                                width: `${Math.min((match.h2h_data.lucifero_home / 25) * 100, 100)}%`, 
                                height:'100%', 
                                background:'rgb(5, 249, 182)', 
                                boxShadow:'0 0 8px rgb(5, 249, 182)', 
                                borderRadius:'3px'
                            }}></div>
                        </div>
                    </div>
                 )}
                 <div style={{fontWeight:'bold', fontSize:'16px', color:'white', textAlign:'right'}}>{match.home}</div>
              </div>

              {/* VS */}
              <div style={{
                  background: 'rgba(0, 0, 0, 0.4)', padding:'4px 12px', borderRadius:'8px', 
                  fontSize:'12px', fontWeight:'bold', color:'rgb(139, 155, 180)',
                  minWidth:'45px', textAlign:'center', margin:'0 20px'
              }}>
                  {match.status === 'Finished' && match.real_score ? match.real_score : 'VS'}
              </div>

              {/* OSPITE */}
              <div style={{flex:1, display:'flex', justifyContent:'flex-start', alignItems:'center', gap:'10px'}}>
                 <div style={{fontWeight:'bold', fontSize:'16px', color:'white', textAlign:'left'}}>{match.away}</div>
                 {showLucifero && (
                    <div style={{display:'flex', alignItems:'center'}}>
                        <div style={{width:'35px', height:'5px', background:'rgba(255, 255, 255, 0.1)', borderRadius:'3px'}}>
                            <div style={{
                                width: `${Math.min((match.h2h_data.lucifero_away / 25) * 100, 100)}%`, 
                                height:'100%', 
                                background:'rgb(255, 159, 67)', 
                                boxShadow:'0 0 8px rgb(255, 159, 67)', 
                                borderRadius:'3px'
                            }}></div>
                        </div>
                        <span style={{fontSize:'10px', color:'rgb(255, 159, 67)', marginLeft:'4px', fontWeight:'bold'}}>{Math.round((match.h2h_data.lucifero_away / 25) * 100)}%</span>
                    </div>
                 )}
              </div>
          </div>

          {/* C. QUOTE (Destra - Parametri esatti) */}
          <div style={{
              display:'flex', gap:'8px', marginLeft:'20px', paddingLeft:'15px', 
              borderLeft:'1px solid rgba(255, 255, 255, 0.1)'
          }}>
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', minWidth:'30px'}}>
                  <span style={{fontSize:'9px', color:'rgb(102, 102, 102)', marginBottom:'2px'}}>1</span>
                  <span style={{fontSize:'12px', color:'rgb(221, 221, 221)', background:'rgba(255, 255, 255, 0.05)', padding:'3px 8px', borderRadius:'4px', width:'100%', textAlign:'center'}}>{odds[1]}</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', minWidth:'30px'}}>
                  <span style={{fontSize:'9px', color:'rgb(102, 102, 102)', marginBottom:'2px'}}>X</span>
                  <span style={{fontSize:'12px', color:'rgb(221, 221, 221)', background:'rgba(255, 255, 255, 0.05)', padding:'3px 8px', borderRadius:'4px', width:'100%', textAlign:'center'}}>{odds.X}</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', minWidth:'30px'}}>
                  <span style={{fontSize:'9px', color:'rgb(102, 102, 102)', marginBottom:'2px'}}>2</span>
                  <span style={{fontSize:'12px', color:'rgb(221, 221, 221)', background:'rgba(255, 255, 255, 0.05)', padding:'3px 8px', borderRadius:'4px', width:'100%', textAlign:'center'}}>{odds[2]}</span>
              </div>
          </div>

        </div>
      );
      }))}
    </div>
  );

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
    
    // INCOLLA QUESTE (Dati reali dal DB):
    const homeTrend = selectedMatch?.h2h_data?.lucifero_trend_home || [0,0,0,0,0]; 
    const awayTrend = selectedMatch?.h2h_data?.lucifero_trend_away || [0,0,0,0,0];

    // Calcolo della media dei 5 trend
    const homeAvg = (homeTrend.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1);
    const awayAvg = (awayTrend.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1);
    
    // Pentagono (5 Assi)
    const homeRadar = [88, 85, 70, 90, 95]; 
    const awayRadar = [60, 50, 45, 55, 40];

    // Psicologia
    const homeMotiv = 90; const awayMotiv = 45;
    const homeFieldFactor = 85; const awayFieldFactor = 20;

    
    
    const historyWeight = 85; 

    // --- 2. HELPER GRAFICI ---

    const drawPentagramRadar = (stats: number[], color: string) => {
        const center = 60; // Centro ridotto
        const radius = 45; // Raggio ridotto (meno ingombrante)
        const totalPoints = 5;
        const points = stats.map((v, i) => {
            const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
            const x = center + (v / 100) * radius * Math.cos(angle);
            const y = center + (v / 100) * radius * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');
        return <polygon points={points} fill={color} fillOpacity={0.4} stroke={color} strokeWidth="2" />;
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
      
      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'10px'}}>
          <button onClick={() => setViewState('list')} style={{background:'transparent', border:'none', color: theme.textDim, cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}>
            <span>←</span> LISTA
          </button>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'10px', color: theme.cyan, letterSpacing:'2px'}}>ANALYSIS CORE</div>
            <div style={{fontSize:'18px', fontWeight:'bold'}}>
                {selectedMatch?.home} <span style={{color:theme.textDim, fontSize:'14px'}}>vs</span> {selectedMatch?.away}
            </div>
          </div>
          <div style={{width:'60px'}}></div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', alignItems: 'start'}}>
        
        {/* === COLONNA SINISTRA: DATI VISIVI === */}
        <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
           
           {/* A1. LUCIFERO POWER (SOLO POTENZA ATTUALE) */}
           <div style={{
                ...styles.card, 
                padding:'15px', 
                marginBottom: '-5px',
                width: '100%', 
                minHeight: '100px',
                boxSizing: 'border-box' // <--- QUESTA È LA CHIAVE MAGICA
            }}>
                <div style={{fontSize:'11px', color: theme.cyan, marginBottom:'15px', fontWeight:'bold', letterSpacing:'2px', borderBottom:'1px solid rgba(0, 240, 255, 0.2)', paddingBottom:'5px'}}>
                    ⚡ FORMA A.L.1  INDEX
                </div>
                
                {/* Casa */}
                <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'3px'}}>
                        <div style={{fontSize:'12px', color:'white'}}>{selectedMatch?.home}</div>
                        <div style={{fontSize:'12px', color: theme.purple, fontWeight:'bold'}}>{selectedMatch?.h2h_data?.bvs_index || '0.0'}</div>
                    </div>
                    {/* Altezza portata a 6px per matchare i led sopra */}
                    <div style={{width:'100%', height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden'}}>
                        <div style={{
                            width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_index || 0) + 6) / 13) * 100, 0), 100)}%`, 
                            height:'100%', 
                            background: Number(selectedMatch?.h2h_data?.bvs_index || 0) > 0 ? theme.success : theme.danger
                        }} />
                    </div>
                </div>

                {/* Ospite */}
                <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'3px',marginTop: '15px'}}>
                        <div style={{fontSize:'12px', color:'white'}}>{selectedMatch?.away}</div>
                        <div style={{fontSize:'12px', color: theme.purple, fontWeight:'bold'}}>{selectedMatch?.h2h_data?.bvs_away || '0.0'}</div>
                    </div>
                    {/* Altezza portata a 6px per matchare i led sopra */}
                    <div style={{width:'100%', height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden'}}>
                        <div style={{
                            width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_away || 0) + 6) / 13) * 100, 0), 100)}%`, 
                            height:'100%', 
                            background: Number(selectedMatch?.h2h_data?.bvs_away || 0) > 0 ? theme.success : theme.danger
                        }} />
                    </div>
                </div>
            </div>

            {/* A2. TREND INERZIA - SCALA 10 LIVELLI CON PERCENTUALI INTERNE (%) E FRECCIA */}
            <div style={{...styles.card, padding:'15px', marginBottom: '15px', width: '100%', boxSizing: 'border-box'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'5px'}}>
                    <span style={{fontSize:'11px', color: theme.textDim, fontWeight:'bold', letterSpacing:'1px'}}>
                        📈 TREND INERZIA M.L.5 INDEX
                    </span>
                    <span style={{fontSize:'14px', color: theme.cyan, fontWeight: 'bold'}}>⟶</span>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    
                    {/* RIGA CASA */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <span style={{
                                fontSize: '14px', color: 'white', fontWeight: 'bold', width: '120px', 
                                lineHeight: '1', display: 'inline-block', transform: 'translateY(4px)' 
                            }}>
                                {selectedMatch?.home}
                            </span>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '80px', justifyContent: 'center' }}>
                                <span style={{ fontSize: '11px', color: getTrendColor(Number(homeAvg)), fontWeight: 'bold', lineHeight: '1' }}>
                                    {homeAvg}%
                                </span>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                    <div style={{ 
                                        width: `${homeAvg}%`, height: '100%', 
                                        background: getTrendColor(Number(homeAvg)),
                                        boxShadow: `0 0 8px ${getTrendColor(Number(homeAvg))}`,
                                        transition: 'width 0.8s ease-in-out' 
                                    }} />
                                </div>
                            </div>
                        </div>
                        
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                            <div style={{display: 'flex', gap: '5px'}}>
                                {[...homeTrend].reverse().map((val: number, i: number) => (
                                    <div key={i} style={{
                                        width: '36px', height: '14px', borderRadius: '2px', 
                                        background: getTrendColor(val),
                                        opacity: 0.9,
                                        boxShadow: `0 0 8px ${getTrendColor(val)}`,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <span style={{ fontSize: '8px', color: '#000', fontWeight: '900', letterSpacing: '-0.5px' }}>
                                            {Math.round(val)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <span style={{ 
                                fontSize: '18px', fontWeight: 'bold', 
                                color: getTrendColor(homeTrend[0]), 
                                textShadow: `0 0 8px ${getTrendColor(homeTrend[0])}`
                            }}>
                                ⟶
                            </span>
                        </div>
                    </div>

                    {/* RIGA OSPITE */}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <span style={{
                                fontSize: '14px', color: 'white', fontWeight: 'bold', width: '120px', 
                                lineHeight: '1', display: 'inline-block', transform: 'translateY(4px)'
                            }}>
                                {selectedMatch?.away}
                            </span>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '80px', justifyContent: 'center' }}>
                                <span style={{ fontSize: '11px', color: getTrendColor(Number(awayAvg)), fontWeight: 'bold', lineHeight: '1' }}>
                                    {awayAvg}%
                                </span>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                    <div style={{ 
                                        width: `${awayAvg}%`, height: '100%', 
                                        background: getTrendColor(Number(awayAvg)),
                                        boxShadow: `0 0 8px ${getTrendColor(Number(awayAvg))}`,
                                        transition: 'width 0.8s ease-in-out' 
                                    }} />
                                </div>
                            </div>
                        </div>

                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                            <div style={{display: 'flex', gap: '5px'}}>
                                {[...awayTrend].reverse().map((val: number, i: number) => (
                                    <div key={i} style={{
                                        width: '36px', height: '14px', borderRadius: '2px',
                                        background: getTrendColor(val),
                                        opacity: 0.9,
                                        boxShadow: `0 0 8px ${getTrendColor(val)}`,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <span style={{ fontSize: '8px', color: '#000', fontWeight: '900', letterSpacing: '-0.5px' }}>
                                            {Math.round(val)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <span style={{ 
                                fontSize: '18px', fontWeight: 'bold', 
                                color: getTrendColor(awayTrend[0]), 
                                textShadow: `0 0 8px ${getTrendColor(awayTrend[0])}`
                            }}>
                                ⟶
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* B. DNA SYSTEM (SPOSTATO IN BASSO A SINISTRA) */}

           <div style={{
               ...styles.card, 
               padding: '15px',
               marginTop: '100px',    // Questa riga lo spinge in basso
               marginBottom: '10px', 
               display: 'flex', 
               flexDirection: 'column', 
               alignItems: 'center', 
               justifyContent: 'center', 
               width: '260px', 
               height: '260px', 
               alignSelf: 'flex-start' // Lo ancora tutto a sinistra
           }}>
               <div style={{width:'100%', borderBottom:'4px solid rgba(255,255,255,0.05)',marginTop:'-15px', marginBottom:'30px', paddingBottom:'5px', textAlign:'left'}}>
                    <div style={{fontSize:'10px', color: theme.textDim, fontWeight:'bold', letterSpacing:'1px', marginBottom:'25px'}}>🕸️ DNA SYSTEM</div>
                    
                    <div style={{display:'flex', justifyContent:'center', gap:'12px', fontSize:'12px', fontWeight:'bold'}}>
                       <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                           <div style={{width:'8px', height:'8px', background: theme.cyan, borderRadius:'2px', boxShadow:`0 0 5px ${theme.cyan}`}}></div>
                           <span style={{color: 'white'}}>{selectedMatch?.home.substring(0,12)}</span>
                       </div>
                       <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                           <div style={{width:'8px', height:'8px', background: theme.danger, borderRadius:'2px', boxShadow:`0 0 5px ${theme.danger}`}}></div>
                           <span style={{color: 'white'}}>{selectedMatch?.away.substring(0,12)}</span>
                       </div>
                    </div>
               </div>
               
               <div style={{position:'relative', width:'170px', height:'170px', marginTop:'-5px'}}> 
                   <svg width="180" height="180" viewBox="0 0 120 120" style={{overflow:'visible'}}>
                       {drawPentagonGrid(45, 0.5)}  
                       {drawPentagonGrid(30, 0.2)}  
                       {drawPentagonGrid(15, 0.2)}  
                       {drawPentagonAxes()}

                       <text x="60" y="5" fontSize="8" fill="#fff" textAnchor="middle" fontWeight="bold">ATT</text> 
                       <text x="115" y="45" fontSize="8" fill="#fff" textAnchor="start" fontWeight="bold">TEC</text> 
                       <text x="95" y="115" fontSize="8" fill="#fff" textAnchor="start" fontWeight="bold">DIF</text> 
                       <text x="25" y="115" fontSize="8" fill="#fff" textAnchor="end" fontWeight="bold">VAL</text> 
                       <text x="5" y="45" fontSize="8" fill="#fff" textAnchor="end" fontWeight="bold">FRM</text> 

                       {drawPentagramRadar(homeRadar, theme.cyan)}
                       {drawPentagramRadar(awayRadar, theme.danger)}
                   </svg>
               </div>
           </div>
        </div>

        {/* === COLONNA DESTRA: ANALISI COMPETITIVA VALORI CORE === */}
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            
            {/* === SEZIONE BVS: LOGICA UFFICIALE DA MANUALE === */}
            <div style={{
                ...styles.card, 
                width: '100%', 
                padding:'15px', 
                borderLeft: `4px solid ${theme.purple}`, 
                overflow: 'hidden',
                boxSizing: 'border-box' // <--- AGGIUNGI QUESTO
            }}>
            
            {/* INTESTAZIONE: TIPO E LINEARITÀ */}
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <div style={{display:'flex', flexDirection:'column'}}>
                <span style={{fontSize:'10px', color: theme.purple, fontWeight:'bold'}}>BIAS C.O.R.E.</span>
                <span style={{
                    fontSize:'16px', 
                    fontWeight:'900', 
                    color: selectedMatch?.h2h_data?.classification === 'PURO' ? '#00ff88' : // Verde Smeraldo
                        selectedMatch?.h2h_data?.classification === 'SEMI' ? '#ffd000' : // Giallo Oro
                        '#ff4444' // Rosso Alert
                }}>
                    {selectedMatch?.h2h_data?.classification === 'PURO' ? '💎 FLUSSO COERENTE' : 
                    selectedMatch?.h2h_data?.classification === 'SEMI' ? '⚖️ FLUSSO INSTABILE' : '⚠️ FLUSSO DISCORDANTE'}
                </span>
            </div>
            <div style={{textAlign:'right'}}>
                <div style={{fontSize:'9px', color: theme.textDim}}>INTEGRITÀ DEL FLUSSO</div>
                <span style={{fontSize:'11px', fontWeight:'bold', color: selectedMatch?.h2h_data?.is_linear ? '#00ff88' : '#ff4444'}}>
                    {selectedMatch?.h2h_data?.is_linear ? '✅ SINCRONIZZATO' : '❌ FUORI SINCRO'}
                </span>
            </div>
        </div>

            {/* BOX PROTOCOLLO OPERATIVO */}
<div style={{
    background: 'rgba(188, 19, 254, 0.05)', 
    padding:'12px', 
    borderRadius:'8px', 
    border:'1px solid rgba(188, 19, 254, 0.2)', 
    marginBottom:'15px'
}}>
    <div style={{fontSize:'9px', color: theme.purple, fontWeight:'bold', marginBottom:'5px', letterSpacing:'1px'}}>
        PROTOCOLLO OPERATIVO
    </div>
    <div style={{fontSize:'14px', fontWeight:'900', color: '#00f0ff'}}>
        {!selectedMatch?.h2h_data?.is_linear ? (
            <span style={{color: '#ffcc00'}}>⚠️ DIVERGENZA: VALUTARE OPZIONI UNDER/OVER</span>
        ) : selectedMatch?.h2h_data?.classification === 'NON_BVS' ? (
            <span style={{color: '#ff4444'}}>⛔ ANALISI NON CONCLUSA: ALTA VOLATILITÀ</span>
        ) : (
            <span>🎯 ESPOSIZIONE TARGET: SEGNO {selectedMatch?.h2h_data?.tip_sign}</span>
        )}
    </div>
</div>

            {/* LE TRE BARRE DI INDICE */}
            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                {/* 1. MATCH INDEX (QUALITÀ GENERALE) */}
                <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', fontWeight:'bold'}}>
                        <span style={{color:theme.textDim}}>RATING DI COERENZA</span>
                        <span style={{color:theme.purple}}>{selectedMatch?.h2h_data?.bvs_match_index || '0.0'}</span>
                    </div>
                    <div style={{width:'100%', height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden'}}>
                        <div style={{
                            width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_match_index || 0) + 6) / 13) * 100, 0), 100)}%`,
                            height:'100%', background: theme.purple, transition: 'width 1s'
                        }} />
                    </div>
                </div>

                {/* 2. BARRE TEAM (VALORE INDIVIDUALE) */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'5px'}}>
                    {/* Casa */}
                <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'3px'}}>
                        <div style={{fontSize:'9px', color:'white'}}>{selectedMatch?.home}</div>
                        <div style={{fontSize:'9px', color: theme.purple, fontWeight:'bold'}}>{selectedMatch?.h2h_data?.bvs_index || '0.0'}</div>
                    </div>
                    <div style={{width:'100%', height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', overflow:'hidden'}}>
                        <div style={{
                            width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_index || 0) + 6) / 13) * 100, 0), 100)}%`, 
                            height:'100%', 
                            background: Number(selectedMatch?.h2h_data?.bvs_index || 0) > 0 ? theme.success : theme.danger
                        }} />
                    </div>
                </div>

                {/* Ospite */}
                <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'3px'}}>
                        <div style={{fontSize:'9px', color:'white'}}>{selectedMatch?.away}</div>
                        <div style={{fontSize:'9px', color: theme.purple, fontWeight:'bold'}}>{selectedMatch?.h2h_data?.bvs_away || '0.0'}</div>
                    </div>
                    <div style={{width:'100%', height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', overflow:'hidden'}}>
                        <div style={{
                            width: `${Math.min(Math.max(((Number(selectedMatch?.h2h_data?.bvs_away || 0) + 6) / 13) * 100, 0), 100)}%`, 
                            height:'100%', 
                            background: Number(selectedMatch?.h2h_data?.bvs_away || 0) > 0 ? theme.success : theme.danger
                        }} />
                    </div>
                </div>
            </div>

            {/* SEZIONE QUOTE: Allunga il box verso il basso */}
            <div style={{borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'10px', marginTop:'10px', display:'flex', justifyContent:'space-around'}}>
                <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'8px', color: theme.textDim}}>1</div>
                    <div style={{fontSize:'12px', fontWeight:'bold', color:'white'}}>{selectedMatch?.h2h_data?.odds?.['1'] || '-'}</div>
                </div>
                <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'8px', color: theme.textDim}}>X</div>
                    <div style={{fontSize:'12px', fontWeight:'bold', color:'white'}}>{selectedMatch?.h2h_data?.odds?.['X'] || '-'}</div>
                </div>
                <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'8px', color: theme.textDim}}>2</div>
                    <div style={{fontSize:'12px', fontWeight:'bold', color:'white'}}>{selectedMatch?.h2h_data?.odds?.['2'] || '-'}</div>
                </div>
            </div>
            </div>
        </div>

            {/* 2. SEZIONE STORIA (PRECEDENTI) */}
            <div style={{...styles.card, padding:'12px', marginBottom: 0}}>
                <div style={{fontSize:'9px', color: theme.cyan, fontWeight:'bold', letterSpacing:'1px', marginBottom:'10px', textTransform:'uppercase'}}>⚖️ STORIA (Precedenti)</div>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:'11px', color:'white', width:'90px'}}>{selectedMatch?.home}</span>
                        <div style={{flex:1, height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', margin:'0 10px'}}>
                            <div style={{width:`${historyWeight}%`, height:'100%', background:theme.cyan, boxShadow:`0 0 8px ${theme.cyan}`}} />
                        </div>
                        <span style={{fontSize:'11px', color:theme.cyan, fontWeight:'bold', width:'35px'}}>{historyWeight}%</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:'11px', color:'white', width:'90px'}}>{selectedMatch?.away}</span>
                        <div style={{flex:1, height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', margin:'0 10px'}}>
                            <div style={{width:`${100 - historyWeight}%`, height:'100%', background:theme.cyan, opacity:0.4}} />
                        </div>
                        <span style={{fontSize:'11px', color:theme.textDim, width:'35px'}}>{100 - historyWeight}%</span>
                    </div>
                </div>
            </div>

            {/* 3. SEZIONE CAMPO (FATTORI AMBIENTALI) */}
            <div style={{...styles.card, padding:'12px', marginBottom: 0}}>
                <div style={{fontSize:'9px', color: theme.success, fontWeight:'bold', letterSpacing:'1px', marginBottom:'10px', textTransform:'uppercase'}}>🏟️ CAMPO (Fattore Stadio)</div>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:'11px', color:'white', width:'90px'}}>{selectedMatch?.home}</span>
                        <div style={{flex:1, height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', margin:'0 10px'}}>
                            <div style={{width:`${homeFieldFactor}%`, height:'100%', background:theme.success, boxShadow:`0 0 8px ${theme.success}`}} />
                        </div>
                        <span style={{fontSize:'11px', color:theme.success, fontWeight:'bold', width:'35px'}}>{homeFieldFactor}%</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:'11px', color:'white', width:'90px'}}>{selectedMatch?.away}</span>
                        <div style={{flex:1, height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', margin:'0 10px'}}>
                            <div style={{width:`${awayFieldFactor}%`, height:'100%', background:theme.danger, boxShadow:`0 0 8px ${theme.danger}`}} />
                        </div>
                        <span style={{fontSize:'11px', color:theme.danger, fontWeight:'bold', width:'35px'}}>{awayFieldFactor}%</span>
                    </div>
                </div>
            </div>

            {/* 4. SEZIONE AFFIDABILITÀ (PSICOLOGIA) */}
            <div style={{...styles.card, padding:'12px', marginBottom: 0}}>
                <div style={{fontSize:'9px', color: theme.warning, fontWeight:'bold', letterSpacing:'1px', marginBottom:'10px', textTransform:'uppercase'}}>🧠 AFFIDABILITÀ (Stabilità)</div>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:'11px', color:'white', width:'90px'}}>{selectedMatch?.home}</span>
                        <div style={{flex:1, height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', margin:'0 10px'}}>
                            <div style={{width:`${homeMotiv}%`, height:'100%', background:theme.warning, boxShadow:`0 0 8px ${theme.warning}`}} />
                        </div>
                        <span style={{fontSize:'11px', color:theme.warning, fontWeight:'bold', width:'35px'}}>{homeMotiv}%</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <span style={{fontSize:'11px', color:'white', width:'90px'}}>{selectedMatch?.away}</span>
                        <div style={{flex:1, height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', margin:'0 10px'}}>
                            <div style={{width:`${awayMotiv}%`, height:'100%', background:theme.danger}} />
                        </div>
                        <span style={{fontSize:'11px', color:theme.danger, fontWeight:'bold', width:'35px'}}>{awayMotiv}%</span>
                    </div>
                </div>
            </div>

            {/* 3. CONFIGURAZIONE (ECCOLI TORNATI!) */}
            <div style={{...styles.card, padding:'15px', border:`1px solid ${theme.cyan}`, background:'rgba(0, 240, 255, 0.05)'}}>
                <div style={{fontSize:'10px', fontWeight:'bold', color: theme.cyan, borderBottom:'1px solid rgba(0,240,255,0.2)', paddingBottom:'5px', marginBottom:'10px'}}>
                    ⚙️ CONFIGURAZIONE SIMULAZIONE
                </div>

                {/* ALGORITMO */}
                <div style={{marginBottom:'10px'}}>
                    <select style={{width:'100%', padding:'6px', background:'#000', color:'white', border:'1px solid #333', borderRadius:'4px', fontSize:'10px', outline:'none'}}>
                        <option value="6">Lucifero V4 (Standard)</option>
                        <option value="5">Neural Network Beta</option>
                        <option value="1">Poisson Simple</option>
                    </select>
                </div>

                {/* CICLI & MODE GRID */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'15px'}}>
                    <div>
                        <div style={{fontSize:'9px', color: theme.textDim, marginBottom:'3px'}}>CICLI</div>
                        <div style={{display:'flex', gap:'2px'}}>
                            {['100', '500'].map((d: any) => (
                                <button key={d} onClick={() => setSimDepth(d==='100'?'quick':'normal')} style={{
                                    flex:1, padding:'5px', fontSize:'9px', cursor:'pointer',
                                    background: (simDepth==='quick'&&d==='100')||(simDepth==='normal'&&d==='500') ? theme.cyan : '#222',
                                    color: (simDepth==='quick'&&d==='100')||(simDepth==='normal'&&d==='500') ? 'black' : '#888',
                                    border: 'none', borderRadius:'3px'
                                }}>{d}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div style={{fontSize:'9px', color: theme.textDim, marginBottom:'3px'}}>MODO</div>
                        <div style={{display:'flex', gap:'2px'}}>
                            <button onClick={() => setSimMode('fast')} style={{flex:1, padding:'5px', fontSize:'9px', background: simMode==='fast'?theme.success:'#222', color:simMode==='fast'?'black':'#888', border:'none', borderRadius:'3px'}}>⚡</button>
                            <button onClick={() => setSimMode('animated')} style={{flex:1, padding:'5px', fontSize:'9px', background: simMode==='animated'?theme.purple:'#222', color:simMode==='animated'?'white':'#888', border:'none', borderRadius:'3px'}}>🎬</button>
                        </div>
                    </div>
                </div>

                {/* TASTO AVVIO */}
                <button 
                     onClick={startSimulation}
                     style={{
                       width:'100%', padding:'12px', background: `linear-gradient(90deg, ${theme.cyan}, ${theme.purple})`,
                       border:'none', borderRadius:'6px', color:'white', fontWeight:'900', fontSize:'12px',
                       cursor:'pointer', letterSpacing:'1px', boxShadow: `0 0 15px rgba(0, 240, 255, 0.3)`
                     }}
                   >
                     AVVIA SIMULAZIONE
                </button>
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
        
        {/* GRUPPO SINISTRA: Tasto Indietro + Logo */}
        <div style={{display: 'flex', alignItems: 'center', gap: '120px', paddingLeft: '60px'}}> 
             
             {/* TASTO INDIETRO ELEGANTE */}
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
               ← DASHBOARD
             </button>

             {/* LOGO CON PALLONE ILLUMINATO */}
             <div style={{...styles.logo, display: 'flex', alignItems: 'center'}}>
                <img 
                  src="https://cdn-icons-png.flaticon.com/512/1165/1165187.png" 
                  alt="Logo" 
                  style={{
                    height: '28px', 
                    width: 'auto', 
                    marginRight: '15px', 
                    // MODIFICA QUI: brightness(1.5) lo rende molto più chiaro e acceso
                    filter: 'drop-shadow(0 0 5px #00f0ff) brightness(1.5) contrast(1.1)' 
                  }} 
                />
                AI SIMULATOR PRO
             </div>
        </div>

        {/* PARTE DESTRA (Crediti, Utente...) */}
        <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
          <div style={{fontSize:'12px', color: theme.textDim}}>Crediti: <span style={{color: theme.success}}>∞</span></div>
          <button onClick={() => alert('Tema toggle')} style={{background:'none', border:'none', fontSize:'18px', cursor:'pointer'}}>🌙</button>
          <div style={{width:'32px', height:'32px', borderRadius:'50%', background: theme.purple, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', boxShadow: `0 0 10px ${theme.purple}`}}>U</div>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* SIDEBAR */}
        <div style={styles.sidebar}>
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