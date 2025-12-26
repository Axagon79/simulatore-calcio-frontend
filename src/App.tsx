import { useState, useEffect } from 'react'

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
  const [country, setCountry] = useState('Italy')
  const [leagues, setLeagues] = useState<League[]>([])
  const [league, setLeague] = useState('')
  const [rounds, setRounds] = useState<RoundInfo[]>([])
  const [selectedRound, setSelectedRound] = useState<RoundInfo | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [groupedMatches, setGroupedMatches] = useState<MatchGroup[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(false)

  // Sostituisci la vecchia riga 54 (const API_BASE = ...) con questa:
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE = isLocalhost 
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api' 
  : 'https://api-6b34yfzjia-uc.a.run.app'; // <--- ASSICURATI CHE SIA ESATTAMENTE QUESTO
console.log("🚀 API connessa a:", API_BASE);

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
    if (matches.length > 0) {
      groupMatchesByDate()
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
    const groups: { [key: string]: Match[] } = {}
    
    matches.forEach(match => {
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
        
        const sortedMatches = groups[dateKey].sort((a, b) => {
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

  const [simulationResults, setSimulationResults] = useState<any>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const handleSimulate = async () => {
    if (!selectedMatch) return
    
    setIsSimulating(true)
    setSimulationResults(null)
    
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
      
      const results = await response.json()
      setSimulationResults(results)
      
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
                    <div style={styles.roundLabel}>{round.label}</div>
                    <div style={styles.roundName}>{round.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Lista Partite Raggruppate */}
        {groupedMatches.length > 0 && (
          <div style={styles.card}>
            <label style={styles.sectionLabel}>
              ⚽ Partite - {selectedRound?.name} ({matches.length})
            </label>
            
            <div style={styles.matchesContainer}>
              {groupedMatches.map((group) => (
                <div key={group.date} style={styles.dateGroup}>
                  <div style={styles.dateHeader}>
                    📅 {group.dayName} {group.dateFormatted}
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
                            {match.status === 'Finished' ? '✓ Finita' : '📍 Programmata'}
                          </span>
                        </div>
                        
                        <div style={styles.matchTeams}>
                          <div style={styles.teamName}>{match.home}</div>
                          <div style={styles.matchScore}>
                            {match.real_score || 'vs'}
                          </div>
                          <div style={styles.teamName}>{match.away}</div>
                        </div>

                        {match.h2h_data?.history_summary && (
                          <div style={styles.h2hInfo}>
                            📊 {match.h2h_data.history_summary}
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

        {/* Riepilogo e Bottone Simula */}
        {selectedMatch && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>🌍 Nazione</span>
                <span style={styles.summaryValue}>{selectedCountry?.flag} {selectedCountry?.name}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>🏆 Campionato</span>
                <span style={styles.summaryValue}>{selectedLeague?.name}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>📅 Giornata</span>
                <span style={styles.summaryValue}>{selectedRound?.name}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>⚽ Partita</span>
                <span style={styles.summaryValue}>
                  {selectedMatch.home} vs {selectedMatch.away}
                </span>
              </div>
            </div>
            
            {/* Bottone Simula con stato */}
            <button 
              onClick={handleSimulate}
              style={styles.simulateBtn}
              disabled={isSimulating}
            >
              {isSimulating ? '⏳ SIMULAZIONE IN CORSO...' : '🚀 SIMULA QUESTA PARTITA'}
            </button>

            {/* Risultati Simulazione */}
            {simulationResults && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: '#f0f4ff',
                borderRadius: '14px',
                border: '2px solid #667eea'
              }}>
                <h3 style={{ marginBottom: '16px', color: '#667eea' }}>
                  📊 Risultati Simulazione
                </h3>
                <pre style={{ 
                  backgroundColor: 'white', 
                  padding: '16px', 
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '14px'
                }}>
                  {JSON.stringify(simulationResults, null, 2)}
                </pre>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Caricamento...</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100vw',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    margin: 0,
    padding: 0
  },
  container: {
    width: '100%',
    maxWidth: '1400px',
    padding: '20px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
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
    flexDirection: 'column'
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
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
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
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  roundName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#222'
  },
  matchesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxHeight: '700px',
    overflowY: 'auto',
    padding: '6px'
  },
  dateGroup: {
    display: 'flex',
    flexDirection: 'column',
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
    flexWrap: 'wrap',
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
    textTransform: 'uppercase',
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
    whiteSpace: 'nowrap'
  },
  matchScore: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    fontWeight: '900',
    fontSize: '16px',
    color: '#667eea',
    minWidth: '60px',
    textAlign: 'center',
    flexShrink: 0
  },
  h2hInfo: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic',
    marginTop: '8px',
    paddingTop: '10px',
    borderTop: '1px solid #f0f0f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
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
    flexDirection: 'column',
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
    whiteSpace: 'nowrap'
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
    textTransform: 'uppercase',
    letterSpacing: '1.5px'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
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
  
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }
  }
`
document.head.appendChild(styleSheet)

export default App