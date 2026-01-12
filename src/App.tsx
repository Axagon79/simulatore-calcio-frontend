import { useState, useEffect, useRef } from 'react'

interface League { id: string; name: string }
interface RoundInfo {
  name: string
  label: string
  type: 'previous' | 'current' | 'next'
}
interface Match { 
  id: string
  home: string
  away: string
  real_score?: string | null
  match_time: string
  status: string
  date_obj: string
  h2h_data?: any
}

interface MatchGroup {
  date: string
  dateFormatted: string
  dayName: string
  matches: Match[]
}

const COUNTRIES = [
  { code: 'Italy', flag: '🇮🇹', name: 'Italia' },
  { code: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Inghilterra' },
  { code: 'Spain', flag: '🇪🇸', name: 'Spagna' },
  { code: 'Germany', flag: '🇩🇪', name: 'Germania' },
  { code: 'France', flag: '🇫🇷', name: 'Francia' },
  { code: 'Netherlands', flag: '🇳🇱', name: 'Olanda' },
  { code: 'Portugal', flag: '🇵🇹', name: 'Portogallo' }
]

const ROUND_ICONS = {
  previous: '⬅️',
  current: '🎯',
  next: '➡️'
}

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

function App() {
  // --- STATI DATI ---
  const [country, setCountry] = useState('Italy')
  const [leagues, setLeagues] = useState<League[]>([])
  const [league, setLeague] = useState('')
  const [rounds, setRounds] = useState<RoundInfo[]>([])
  const [selectedRound, setSelectedRound] = useState<RoundInfo | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [groupedMatches, setGroupedMatches] = useState<MatchGroup[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  
  // --- STATI UI ---
  const [loading, setLoading] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [exitPrompt, setExitPrompt] = useState(false)

  // --- REFS PER STATO SINCRONO (Fondamentali per evitare bug) ---
  const stateRef = useRef({
    hasMatch: false,
    hasRound: false,
    hasLeague: false,
    isHome: true
  });
  const lastBackPressTime = useRef<number>(0);

  // Tiene aggiornati i ref istantaneamente
  useEffect(() => {
    stateRef.current = {
      hasMatch: !!selectedMatch,
      hasRound: !!selectedRound,
      hasLeague: !!league,
      isHome: !league && !selectedMatch && !selectedRound
    };
  }, [selectedMatch, selectedRound, league]);

  const API_BASE = 'https://api-6b34yfzjia-uc.a.run.app';

  // 🔥 GESTIONE TASTO INDIETRO (NUCLEAR PROOF)
  useEffect(() => {
    // 1. Disabilita il ripristino automatico dello scroll (risolve il salto in alto)
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 2. Funzione che reinserisce il blocco nella cronologia
    const pushTrap = () => {
      window.history.pushState({ trap: true }, '', window.location.href);
    };

    // 3. "Armiamo" la trappola sia al caricamento che al primo click
    // (Molti browser bloccano pushState se non c'è interazione utente)
    pushTrap();
    
    const primeTrapOnInteraction = () => {
      pushTrap();
      document.removeEventListener('click', primeTrapOnInteraction);
    };
    document.addEventListener('click', primeTrapOnInteraction);

    // 4. Gestore dell'evento Indietro
    const handleBackButton = () => {
      // Nota: Quando siamo qui, il browser è GIÀ tornato indietro di 1 step.
      const current = stateRef.current;
      const now = Date.now();

      // --- CASO A: MENU APERTI (Chiudiamo e restiamo nell'app) ---
      if (current.hasMatch) {
        setSelectedMatch(null);
        pushTrap(); // Ripristiniamo lo step perso
        return;
      }

      if (current.hasRound) {
        setSelectedRound(null);
        setMatches([]);
        setGroupedMatches([]);
        pushTrap();
        return;
      }

      if (current.hasLeague) {
        setLeague('');
        setRounds([]);
        pushTrap();
        return;
      }

      // --- CASO B: DASHBOARD HOME (Gestione Uscita) ---
      const timeDiff = now - lastBackPressTime.current;

      if (timeDiff < 2000) {
        // DOPPIO CLICK: Vogliamo uscire.
        // Poiché siamo nel gestore popstate, siamo già tornati indietro di 1.
        // Facciamo un altro passo indietro manuale per uscire del tutto.
        console.log("Uscita forzata...");
        window.history.back(); 
      } else {
        // PRIMO CLICK: Mostra avviso e resta.
        lastBackPressTime.current = now;
        setExitPrompt(true);
        setTimeout(() => setExitPrompt(false), 2000);
        
        // FONDAMENTALE: Reinseriamo lo stato per annullare il 'back' appena avvenuto
        pushTrap();
      }
    };

    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      document.removeEventListener('click', primeTrapOnInteraction);
    };
  }, []); // Eseguito una volta sola all'avvio

  // --- ALTRI USE EFFECT (Logica dati) ---

  useEffect(() => {
    fetchLeagues()
    setLeague('')
    setSelectedRound(null)
    setMatches([])
    setSelectedMatch(null)
  }, [country])

  useEffect(() => {
    if (league) {
      fetchRounds()
      setSelectedRound(null)
      setMatches([])
      setSelectedMatch(null)
    }
  }, [league])

  useEffect(() => {
    if (league && selectedRound) {
      fetchMatches()
      setSelectedMatch(null)
    }
  }, [selectedRound])

  useEffect(() => {
    if (matches && matches.length > 0 && matches.every(m => m && m.date_obj)) {
      groupMatchesByDate()
    } else {
      setGroupedMatches([])
    }
  }, [matches])

  const fetchLeagues = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/leagues?country=${country}`)
      const data = await res.json() as League[]
      setLeagues(data)
      if (data.length > 0) setLeague(data[0].id)
    } catch (e) {
      console.error('Errore caricamento campionati:', e)
      setLeagues([])
    }
    setLoading(false)
  }

  const fetchRounds = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/rounds?league=${league}`)
      const data = await res.json()
      
      if (data.rounds && Array.isArray(data.rounds)) {
        setRounds(data.rounds)
        const currentRound = data.rounds.find((r: RoundInfo) => r.type === 'current')
        if (currentRound) setSelectedRound(currentRound)
      } else {
        setRounds([])
      }
    } catch (e) {
      console.error('Errore caricamento giornate:', e)
      setRounds([])
    }
    setLoading(false)
  }

  const fetchMatches = async () => {
    if (!selectedRound) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        league, 
        round: selectedRound.name 
      })
      const res = await fetch(`${API_BASE}/matches?${params}`)
      const data = await res.json() as Match[]
      setMatches(data)
    } catch (e) {
      console.error('Errore caricamento partite:', e)
      setMatches([])
    }
    setLoading(false)
  }

  const groupMatchesByDate = () => {
    if (!matches || matches.length === 0) {
      setGroupedMatches([]);
      return;
    }
  
    const groups: { [key: string]: Match[] } = {}
    
    matches.forEach(match => {
      if (!match || !match.date_obj) return;
      
      const date = new Date(match.date_obj)
      const dateKey = date.toISOString().split('T')[0]
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(match)
    })
  
    const grouped: MatchGroup[] = Object.keys(groups)
      .sort()
      .map(dateKey => {
        const date = new Date(dateKey)
        const dayName = DAY_NAMES[date.getDay()]
        const dateFormatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
        
        const sortedMatches = groups[dateKey]
          .filter(m => m && m.match_time)
          .sort((a, b) => {
            return a.match_time.localeCompare(b.match_time)
          })
  
        return {
          date: dateKey,
          dateFormatted,
          dayName,
          matches: sortedMatches
        }
      })
  
    setGroupedMatches(grouped)
  }

  const handleSimulate = async () => {
    if (!selectedMatch) return
    
    setIsSimulating(true)
    
    try {
      const response = await fetch(`${API_BASE}/simulation/simulate-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_team: selectedMatch.home,
          away_team: selectedMatch.away,
          league: league,
          round: selectedRound?.name,
          match_id: selectedMatch.id
        })
      })
      
      if (!response.ok) throw new Error('Errore simulazione')
      
      await response.json()
      
    } catch (error) {
      console.error('Errore:', error)
      alert('❌ Errore durante la simulazione')
    } finally {
      setIsSimulating(false)
    }
  }

  const selectedCountry = COUNTRIES.find(c => c.code === country)
  const selectedLeague = leagues.find(l => l.id === league)

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>⚽ Simulatore Calcio</h1>
          <p style={styles.subtitle}>Scegli una partita e simula il risultato</p>
        </header>

        {/* Selettori Nazione e Campionato */}
        <div style={styles.card}>
          <div style={styles.selectorsRow}>
            <div style={styles.selectorGroup}>
              <label style={styles.label}>🌍 Nazione</label>
              <select 
                value={country} 
                onChange={e => setCountry(e.target.value)}
                style={styles.select}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.selectorGroup}>
              <label style={styles.label}>
                🏆 Campionato {leagues.length > 0 && `(${leagues.length})`}
              </label>
              <select 
                value={league} 
                onChange={e => setLeague(e.target.value)}
                style={styles.select}
                disabled={leagues.length === 0}
              >
                <option value="">Seleziona...</option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selezione Giornate */}
        {league && rounds.length > 0 && (
          <div style={styles.card}>
            <label style={styles.sectionLabel}>📅 Seleziona Giornata</label>
            <div style={styles.roundsRow}>
              {rounds.map((round) => {
                const isSelected = selectedRound?.name === round.name
                return (
                  <button
                    key={round.name}
                    style={{
                      ...styles.roundButton,
                      ...(isSelected ? styles.roundButtonActive : {})
                    }}
                    onClick={() => setSelectedRound(round)}
                  >
                    <div style={styles.roundIcon}>{ROUND_ICONS[round.type]}</div>
                    <div style={styles.roundLabel}>{round.type}</div>
                    <div style={styles.roundName}>{round.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Lista Partite */}
        {groupedMatches.length > 0 && (
          <div style={styles.card}>
            <label style={styles.sectionLabel}>⚽ Seleziona Partita</label>
            <div style={styles.matchesContainer}>
              {groupedMatches.map((group) => (
                <div key={group.date} style={styles.dateGroup}>
                  <div style={styles.dateHeader}>
                    {group.dayName} {group.dateFormatted}
                  </div>
                  {group.matches.map((match) => {
                    const isSelected = selectedMatch?.id === match.id
                    const isFinished = match.status === 'Finished'
                    return (
                      <div
                        key={match.id}
                        style={{
                          ...styles.matchCard,
                          ...(isSelected ? styles.matchCardActive : {})
                        }}
                        onClick={() => setSelectedMatch(match)}
                      >
                        <div style={styles.matchTop}>
                          <span style={styles.matchTime}>🕐 {match.match_time}</span>
                          <span style={{
                            ...styles.matchStatus,
                            ...(isFinished ? styles.matchStatusFinished : styles.matchStatusScheduled)
                          }}>
                            {isFinished ? '✅ Finita' : '📅 Prevista'}
                          </span>
                        </div>
                        <div style={styles.matchTeams}>
                          <div style={styles.teamName}>{match.home}</div>
                          {match.real_score && (
                            <div style={styles.matchScore}>{match.real_score}</div>
                          )}
                          <div style={styles.teamName}>{match.away}</div>
                        </div>
                        {match.h2h_data && (
                          <div style={styles.h2hInfo}>
                            📊 H2H disponibili: {JSON.stringify(match.h2h_data).substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riepilogo e Simulazione */}
        {selectedMatch && (
          <div style={styles.summaryCard}>
            <label style={styles.sectionLabel}>📋 Riepilogo Simulazione</label>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>🌍 Nazione</span>
                <span style={styles.summaryValue}>
                  {selectedCountry?.flag} {selectedCountry?.name}
                </span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>🏆 Campionato</span>
                <span style={styles.summaryValue}>{selectedLeague?.name}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>📅 Giornata</span>
                <span style={styles.summaryValue}>{selectedRound?.label}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>🏠 Casa</span>
                <span style={styles.summaryValue}>{selectedMatch.home}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>✈️ Trasferta</span>
                <span style={styles.summaryValue}>{selectedMatch.away}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>🕐 Orario</span>
                <span style={styles.summaryValue}>{selectedMatch.match_time}</span>
              </div>
            </div>
            <button
              style={styles.simulateBtn}
              onClick={handleSimulate}
              disabled={isSimulating}
            >
              {isSimulating ? '⏳ Simulazione in corso...' : '🎮 Avvia Simulazione'}
            </button>
          </div>
        )}

        {/* 3. TOAST GLOBALE PER USCITA */}
        {exitPrompt && (
          <div 
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg animate-bounce"
            style={{ zIndex: 10000 }} 
          >
            🔙 Premi ancora per uscire
          </div>
        )}

        {/* Loading Overlay */}
        {(loading || isSimulating) && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>
              {isSimulating ? 'Simulazione in corso...' : 'Caricamento...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    width: '100%',
    overflowX: 'hidden' as const
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'clamp(16px, 3vw, 32px)',
    width: '100%'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
    padding: '50px 30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '24px',
    color: 'white',
    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
  },
  title: {
    fontSize: 'clamp(36px, 6vw, 56px)',
    fontWeight: '900',
    margin: '0 0 12px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
  },
  subtitle: {
    fontSize: 'clamp(16px, 2.5vw, 20px)',
    margin: 0,
    opacity: 0.95,
    fontWeight: '500'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: 'clamp(20px, 3vw, 32px)',
    marginBottom: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    border: '1px solid #e8e8e8'
  },
  selectorsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px'
  },
  selectorGroup: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: '700',
    color: '#444',
    fontSize: '15px'
  },
  sectionLabel: {
    display: 'block',
    marginBottom: '20px',
    fontWeight: '800',
    color: '#222',
    fontSize: 'clamp(18px, 2.5vw, 22px)'
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontWeight: '500'
  },
  roundsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  roundButton: {
    padding: '24px 20px',
    borderRadius: '16px',
    border: '2px solid #e0e0e0',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px'
  },
  roundButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
  },
  roundIcon: {
    fontSize: '32px'
  },
  roundLabel: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#667eea',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px'
  },
  roundName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#222'
  },
  matchesContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    maxHeight: '700px',
    overflowY: 'auto' as const,
    padding: '6px'
  },
  dateGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  dateHeader: {
    fontSize: 'clamp(15px, 2vw, 18px)',
    fontWeight: '800',
    color: '#667eea',
    padding: '12px 16px',
    backgroundColor: '#f0f4ff',
    borderRadius: '10px',
    borderLeft: '5px solid #667eea'
  },
  matchCard: {
    padding: 'clamp(14px, 2.5vw, 20px)',
    borderRadius: '14px',
    border: '2px solid #e8e8e8',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  matchCardActive: {
    borderColor: '#667eea',
    backgroundColor: '#f8f9ff',
    transform: 'translateX(6px)',
    boxShadow: '0 6px 16px rgba(102, 126, 234, 0.25)'
  },
  matchTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
    gap: '10px'
  },
  matchTime: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#555'
  },
  matchStatus: {
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px'
  },
  matchStatusFinished: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32'
  },
  matchStatusScheduled: {
    backgroundColor: '#fff3e0',
    color: '#f57c00'
  },
  matchTeams: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    gap: '12px'
  },
  teamName: {
    flex: 1,
    fontWeight: '800',
    fontSize: 'clamp(14px, 2vw, 17px)',
    color: '#222',
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  matchScore: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    fontWeight: '900',
    fontSize: '16px',
    color: '#667eea',
    minWidth: '60px',
    textAlign: 'center' as const,
    flexShrink: 0
  },
  h2hInfo: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic' as const,
    marginTop: '8px',
    paddingTop: '10px',
    borderTop: '1px solid #f0f0f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: 'clamp(20px, 3vw, 32px)',
    marginTop: '24px',
    border: '3px solid #667eea',
    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.25)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#666',
    fontWeight: '700'
  },
  summaryValue: {
    fontSize: '16px',
    color: '#222',
    fontWeight: '800',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  simulateBtn: {
    width: '100%',
    padding: '20px',
    fontSize: 'clamp(17px, 2.5vw, 20px)',
    fontWeight: '900',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px'
  },
  exitToast: {
    position: 'fixed' as const,
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#333',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease'
  },
  loadingOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '5px solid rgba(255,255,255,0.3)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: 'white',
    marginTop: '24px',
    fontSize: '20px',
    fontWeight: '700'
  }
}

const styleSheet = document.createElement("style")
styleSheet.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    overflow-x: hidden;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }
  }
`
document.head.appendChild(styleSheet)

export default App