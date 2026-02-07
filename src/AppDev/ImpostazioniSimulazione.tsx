import type { Dispatch, SetStateAction } from 'react';
import type { League, Match, SpeedPreset } from '../types';

// ============================================================
// TYPES & INTERFACES
// ============================================================

type ViewState = 'list' | 'pre-match' | 'simulating' | 'settings' | 'result';
type PeriodType = 'previous' | 'current' | 'next';
type SimMode = 'fast' | 'animated';

interface Theme {
  cyan: string;
  purple: string;
  text: string;
  textDim: string;
  success: string;
  danger: string;
  panelBorder: string;
}

interface Round {
  type: PeriodType;
  name: string;
  label: string;
  number?: number;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface Permissions {
  ALLOWED_MAIN_MODES: number[];
  VISIBLE_ALGOS: number[];
  CAN_SAVE_TO_DB: boolean;
}

// ============================================================
// PROPS INTERFACE
// ============================================================

interface ImpostazioniSimulazioneProps {
  theme: Theme;
  isAdmin: boolean;

  // User settings props
  simMode: SimMode;
  setSimMode: Dispatch<SetStateAction<SimMode>>;
  setViewState: Dispatch<SetStateAction<ViewState>>;

  // Admin settings props
  configMode: number;
  setConfigMode: Dispatch<SetStateAction<number>>;
  configAlgo: number;
  setConfigAlgo: Dispatch<SetStateAction<number>>;
  selectedSpeed: number;
  setSelectedSpeed: Dispatch<SetStateAction<number>>;
  customCycles: number;
  setCustomCycles: Dispatch<SetStateAction<number>>;
  configSaveDb: boolean;
  setConfigSaveDb: Dispatch<SetStateAction<boolean>>;
  configDebug: boolean;
  setConfigDebug: Dispatch<SetStateAction<boolean>>;

  // Period & Round
  selectedPeriod: PeriodType;
  setSelectedPeriod: Dispatch<SetStateAction<PeriodType>>;
  rounds: Round[];
  selectedRound: Round | null;
  setSelectedRound: Dispatch<SetStateAction<Round | null>>;

  // Country & League
  country: string;
  setCountry: Dispatch<SetStateAction<string>>;
  league: string;
  setLeague: Dispatch<SetStateAction<string>>;
  availableCountries: Country[];
  isLoadingNations: boolean;
  LEAGUES_MAP: League[];

  // Matches
  matches: Match[];
  selectedMatchForConfig: Match | Match[] | null;
  setSelectedMatchForConfig: Dispatch<SetStateAction<Match | Match[] | null>>;
  setSelectedMatch: Dispatch<SetStateAction<Match | null>>;

  // Constants
  PERMISSIONS: Permissions;
  SPEED_PRESETS: SpeedPreset[];
  getCycles: () => number;
}

// ============================================================
// COMPONENT
// ============================================================

export default function ImpostazioniSimulazione({
  theme,
  isAdmin,
  simMode,
  setSimMode,
  setViewState,
  configMode,
  setConfigMode,
  configAlgo,
  setConfigAlgo,
  selectedSpeed,
  setSelectedSpeed,
  customCycles,
  setCustomCycles,
  configSaveDb,
  setConfigSaveDb,
  configDebug,
  setConfigDebug,
  selectedPeriod,
  setSelectedPeriod,
  rounds,
  selectedRound,
  setSelectedRound,
  country,
  setCountry,
  league,
  setLeague,
  availableCountries,
  isLoadingNations,
  LEAGUES_MAP,
  matches,
  selectedMatchForConfig,
  setSelectedMatchForConfig,
  setSelectedMatch,
  PERMISSIONS,
  SPEED_PRESETS,
  getCycles
}: ImpostazioniSimulazioneProps) {

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

        {import.meta.env.DEV && (
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
        )}

        {import.meta.env.DEV && (
          <button
            onClick={() => window.location.href = '/track-record'}
            style={{
              background: 'rgba(0, 200, 150, 0.1)',
              border: '1px solid rgba(0, 200, 150, 0.3)',
              color: '#00c896',
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
              if (e.currentTarget) e.currentTarget.style.borderColor = 'rgba(0, 200, 150, 0.3)';
              if (e.currentTarget) e.currentTarget.style.color = '#00c896';
            }}
          >
            📊 Track Record
          </button>
        )}

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
                                        setSelectedPeriod(period.type as PeriodType);
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
                            maxHeight: '150px',
                            overflowY: 'auto',
                            background: '#0a0a0a',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            padding: '6px'
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
                                              setSelectedMatchForConfig([match]);
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
                                            padding: '6px',
                                            marginBottom: '3px',
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
                                            fontSize: '10px',
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
                                                minute: '2-digit',
                                                timeZone: 'UTC'
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
  if (isAdmin) {
    return renderAdminSettings();
  }
  return renderUserSettings();
}
