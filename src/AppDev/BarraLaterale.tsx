import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { League, Match } from '../types';

interface Country {
  code: string;
  name: string;
  flag: string;
}

type ViewState = 'list' | 'pre-match' | 'simulating' | 'settings' | 'result';

interface Pronostico {
  pronostico: string;
  stars?: number;
  confidence?: number;
}

interface Prediction {
  league: string;
  home: string;
  away: string;
  pronostici?: Pronostico[];
}

interface Theme {
  textDim: string;
  cyan: string;
  purple: string;
  success: string;
  warning: string;
}

interface BarraLateraleProps {
  isMobile: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  styles: Record<string, CSSProperties>;
  theme: Theme;
  isLoadingNations: boolean;
  country: string;
  setCountry: (country: string) => void;
  setLeague: (league: string) => void;
  availableCountries: Country[];
  selectedCup: string;
  setSelectedCup: (cup: string) => void;
  league: string;
  leagues: League[];
  setActiveLeague: (league: string) => void;
  setExpandedMatch: (match: any) => void;
  setViewState: Dispatch<SetStateAction<ViewState>>;
  activeLeague: string;
  configMode: number;
  matches: Match[];
  selectedMatchForConfig: Match | Match[] | null;
  setSelectedMatchForConfig: Dispatch<SetStateAction<Match | Match[] | null>>;
  sidebarPredictions: Prediction[];
  stemmiCoppe: Record<string, string>;
  stemmiCampionati: Record<string, string>;
  getWidgetGlow: (color: string) => CSSProperties;
  setViewMode?: (mode: 'calendar' | 'today') => void;
  isAdmin?: boolean;
}

export default function BarraLaterale({
  isMobile,
  mobileMenuOpen,
  styles,
  theme,
  isLoadingNations,
  country,
  setCountry,
  setLeague,
  availableCountries,
  selectedCup,
  setSelectedCup,
  league,
  leagues,
  setActiveLeague,
  setExpandedMatch,
  setViewState,
  setMobileMenuOpen,
  activeLeague,
  configMode,
  matches,
  selectedMatchForConfig,
  setSelectedMatchForConfig,
  sidebarPredictions,
  stemmiCoppe,
  stemmiCampionati,
  getWidgetGlow,
  setViewMode,
  isAdmin
}: BarraLateraleProps) {

  return (
    <div style={{
      ...(isMobile ? styles.sidebarMobile : styles.sidebar),
      ...(isMobile && mobileMenuOpen ? styles.sidebarMobileOpen : {})
    }}>

      {/* --- INIZIO BLOCCO SELEZIONE NAZIONE/CAMPIONATO --- */}

      <div style={{ fontSize: '12px', color: theme.textDim, fontWeight: 'bold' }}>NAZIONE</div>

      {/* 1. Controllo Caricamento Nazioni */}
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
        /* 2. Select Nazione con FORZATURA RESET */
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setLeague(""); // <--- 🔥 FORZA IL SISTEMA A PUNTARE SU "SELEZIONA" (value="")
          }}
          style={{
            padding: '10px',
            background: '#000',
            color: 'white',
            border: '1px solid #333',
            borderRadius: '6px',
            width: '100%'
          }}
        >
          <option value="">-- Seleziona Nazione --</option>
          {availableCountries.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      )}

      <div style={{ fontSize: '12px', color: theme.textDim, fontWeight: 'bold', marginTop: '15px' }}>
        CAMPIONATO
      </div>

      {/* 3. Select Campionato con LOGICA "TAP & CLOSE" */}
      <select
        value={selectedCup ? '' : league}  // <-- Se sei nelle coppe, mostra "Seleziona"
        onChange={(e) => {
          const selectedLeague = e.target.value;
          setLeague(selectedLeague);

          // Se l'utente seleziona un campionato reale (non vuoto), chiudi il menu
          if (selectedLeague && selectedLeague !== "") {
              setMobileMenuOpen(false);
              setSelectedCup('');  // Resetta le coppe per mostrare il campionato
          }
        }}
        style={{
          padding: '10px',
          background: '#000',
          color: 'white',
          border: '1px solid #333',
          borderRadius: '6px',
          width: '100%'
        }}
      >
        {/* 🔥 QUESTA È L'OPZIONE CHE VIENE ATTIVATA DAL RESET SOPRA */}
        <option value="">-- Seleziona --</option>

        {leagues.map(l => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      {/* --- SELEZIONE COPPE EUROPEE --- */}
      <div style={{ fontSize: '12px', color: theme.textDim, fontWeight: 'bold', marginTop: '15px' }}>
        COPPE
      </div>

      <select
        value={selectedCup}
        onChange={(e) => {
          const cup = e.target.value;
          setSelectedCup(cup);

          if (cup && cup !== "") {
            setMobileMenuOpen(false);

            // // modificato per: attivare la navigazione e pulire lo stato precedente
            setActiveLeague(cup);   // Dice al Motore di cambiare URL
            setExpandedMatch(null); // Chiude eventuali partite aperte
            setViewState('list');   // Forza la visualizzazione della lista
          }
        }}
        style={{
          padding: '10px',
          background: '#000',
          color: 'white',
          border: '1px solid #333',
          borderRadius: '6px',
          width: '100%'
        }}
      >
        <option value="">-- Seleziona --</option>
        <option value="UCL">🏆 Champions League</option>
        <option value="UEL">🏆 Europa League</option>
      </select>

      {/* --- MINI-BOTTONI BANKROLL / MONEY MANAGEMENT --- */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        <button
          onClick={() => { setMobileMenuOpen(false); window.location.href = '/bankroll'; }}
          style={{
            flex: 1,
            padding: '15px 4px',
            background: 'rgba(5,249,182,0.08)',
            border: '1px solid rgba(5,249,182,0.25)',
            borderRadius: '8px',
            color: '#05f9b6',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          📊 Bankroll
        </button>
        <button
          onClick={() => { setMobileMenuOpen(false); window.location.href = '/money-management'; }}
          style={{
            flex: 1,
            padding: '15px 4px',
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.25)',
            borderRadius: '8px',
            color: '#ffd700',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          📖 Guida
        </button>
      </div>

      {/* --- BOTTONE SISTEMA C (solo admin) --- */}
      {isAdmin && (
        <button
          onClick={() => { setMobileMenuOpen(false); window.location.href = '/sistema-c'; }}
          style={{
            width: '100%',
            padding: '12px 4px',
            marginTop: '6px',
            background: 'rgba(255, 107, 53, 0.08)',
            border: '1px solid rgba(255, 107, 53, 0.25)',
            borderRadius: '8px',
            color: '#ff6b35',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          🎲 Sistema C (MC)
        </button>
      )}

      {/* --- FINE BLOCCO SELEZIONE --- */}

      <button
        onClick={() => {
          setActiveLeague('PREDICTIONS');
          setSelectedCup('');
          setLeague('');
          setMobileMenuOpen(false);
        }}
        style={{
          width: '100%',
          padding: '14px 12px',
          background: activeLeague === 'PREDICTIONS'
            ? `linear-gradient(135deg, ${theme.purple}, ${theme.cyan})`
            : `linear-gradient(135deg, rgba(188, 19, 254, 0.2), rgba(0, 255, 255, 0.1))`,
          border: 'revert',
          borderRadius: '10px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '700',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(188, 19, 254, 0.3)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔮 <span style={{ marginLeft: '4px' }}>Pronostici del Giorno</span>
        </span>
        <span style={{ fontSize: '18px',marginLeft: '20px', fontWeight: 'bold' }}>›</span>
      </button>
      {/* --- FINE SEZIONE STRUMENTI --- */}

      {/* --- BOX RIEPILOGO SELEZIONE --- */}
      {(league || selectedCup) && (
        <div
          onClick={() => {
            setViewState('list');
            setExpandedMatch(null);
            setMobileMenuOpen(false);
            if (setViewMode) setViewMode('calendar');
          }}
          style={{
          marginTop:isMobile ? '10px': '5px',
          padding: '10px',
          background: 'rgba(0, 240, 255, 0.05)',
          border: `1px solid ${selectedCup ? '#0066cc' : theme.cyan}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}>
          {/* STEMMA */}
          <img
            src={selectedCup ? stemmiCoppe[selectedCup] : stemmiCampionati[league]}
            alt="Stemma"
            style={{
              width: '45px',
              height: '45px',
              objectFit: 'contain'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          {/* INFO */}
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '800',
              color: 'white',
              lineHeight: '1.2'
            }}>
              {selectedCup
                ? (selectedCup === 'UCL' ? 'UEFA Champions League' : 'UEFA Europa League')
                : leagues.find(l => l.id === league)?.name || league
              }
            </div>
            <div style={{
              fontSize: '11px',
              color: theme.textDim,
              marginTop: '2px'
            }}>
              {selectedCup
                ? (selectedCup === 'UCL' ? '⭐ Europa' : '🌟 Europa')
                : availableCountries.find(c => c.code === country)?.flag + ' ' + country
              }
            </div>
          </div>
        </div>
      )}

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

      {/* Widget Pronostici del Giorno */}
      {sidebarPredictions.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          {sidebarPredictions.map((pred, idx) => {
            const mainPronostico = pred.pronostici?.[0];
            const stars = mainPronostico?.stars || 0;
            const confidence = mainPronostico?.confidence || 0;
            const glowColor = confidence >= 70 ? theme.success : confidence >= 50 ? theme.cyan : theme.warning;

            return (
              <div
                key={idx}
                onClick={() => setActiveLeague('PREDICTIONS')}
                style={{
                  ...styles.card,
                  padding: '13px 12px',
                  position: 'relative',
                  marginBottom: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  top: '-5px',
                  marginTop: idx > 0 ? '4px' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={getWidgetGlow(glowColor)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: theme.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pred.league} • {'⭐'.repeat(Math.floor(stars))}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pred.home} vs {pred.away}
                  </div>
                </div>
                <div style={{ color: glowColor, fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                  {mainPronostico?.pronostico || '-'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
