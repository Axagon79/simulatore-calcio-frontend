import { useState, useEffect } from 'react';

import { ArrowLeft, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { getTheme, getThemeMode, getMobileTheme, API_BASE, STEMMI_CAMPIONATI, LEAGUES_MAP, SPEED_PRESETS } from '../AppDev/costanti';

import type { Match, TodayLeagueGroup } from '../types';

const theme = getTheme();
const isLight = getThemeMode() === 'light';
const mobileTheme = getMobileTheme();

const ALGO_OPTIONS = [
  { id: 0, label: 'TUTTI', sub: 'Report Completo' },
  { id: 1, label: 'Statistico Puro', sub: 'Poisson/Elo' },
  { id: 2, label: 'Dinamico', sub: 'Trend' },
  { id: 3, label: 'Tattico', sub: 'Formations' },
  { id: 4, label: 'Caos', sub: 'Entropy' },
  { id: 5, label: 'Master', sub: 'AI Ensemble' },
  { id: 6, label: 'MonteCarlo', sub: 'Stochastic' },
];

function getDayLabel(offset: number): string {
  if (offset === 0) return 'Oggi';
  if (offset === 1) return 'Domani';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

function getDateString(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

interface SimulazioneRapidaProps {
  onBack: () => void;
}

export default function SimulazioneRapida({ onBack }: SimulazioneRapidaProps) {

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [dayOffset, setDayOffset] = useState(0);
  const [leagues, setLeagues] = useState<TodayLeagueGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());

  // Popup impostazioni
  const [popupMatch, setPopupMatch] = useState<{ match: Match; leagueId: string; country: string } | null>(null);
  const [configAlgo, setConfigAlgo] = useState(6);
  const [selectedPreset, setSelectedPreset] = useState(4); // STANDARD
  const [customCycles, setCustomCycles] = useState(20);
  const [simMode, setSimMode] = useState<'fast' | 'animated'>('fast');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carica partite del giorno selezionato
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const date = getDateString(dayOffset);
        const res = await fetch(`${API_BASE}/matches-today?date=${date}`);
        const data = await res.json();
        if (data.success) {
          setLeagues(data.leagues || []);
        } else {
          setLeagues([]);
        }
      } catch {
        setLeagues([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
    setExpandedLeagues(new Set());
  }, [dayOffset]);

  const toggleLeague = (leagueId: string) => {
    setExpandedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(leagueId)) next.delete(leagueId);
      else next.add(leagueId);
      return next;
    });
  };

  const openPopup = (match: Match, leagueId: string, country: string) => {
    setPopupMatch({ match, leagueId, country });
    setConfigAlgo(6);
    setSelectedPreset(4);
    setCustomCycles(20);
    setSimMode('fast');
  };

  const handleAvviaSimulazione = () => {
    if (!popupMatch) return;
    const cycles = selectedPreset === 8 ? customCycles : SPEED_PRESETS.find(p => p.id === selectedPreset)?.cycles || 20;
    sessionStorage.setItem('quicksim_data', JSON.stringify({
      match: popupMatch.match,
      leagueId: popupMatch.leagueId,
      country: popupMatch.country,
      algo: configAlgo,
      cycles,
      mode: simMode,
    }));
    window.location.href = '/';
  };

  const totalMatches = leagues.reduce((sum, g) => sum + g.matches.length, 0);

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font,
      backgroundImage: isLight
        ? 'radial-gradient(circle at 50% 10%, rgba(216,220,232,0.3) 0%, transparent 60%)'
        : 'radial-gradient(circle at 50% 10%, rgba(26,28,75,0.3) 0%, transparent 60%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* TOP BAR FISSA */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 20px',
        borderBottom: isMobile ? mobileTheme.panelBorder : theme.panelBorder,
        backdropFilter: 'blur(10px)',
        zIndex: 20,
        background: isLight ? 'rgba(215, 220, 235, 0.7)' : 'transparent',
        ...(isMobile ? { position: 'fixed' as const, top: 0, left: 0, right: 0 } : {}),
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: theme.text, cursor: 'pointer',
            padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <Zap size={20} color={theme.cyan} />
        <span style={{
          fontSize: '18px', fontWeight: 900,
          background: `linear-gradient(to right, ${theme.cyan}, ${theme.purple})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '1px',
        }}>
          SIMULAZIONE RAPIDA
        </span>
      </div>

      {/* CONTENUTO */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '16px 12px' : '30px 40px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        ...(isMobile ? { marginTop: '60px' } : {}),
      }}>

      {/* SELETTORE GIORNO */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
        padding: '4px 0',
      }}>
        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
          const active = dayOffset === offset;
          return (
            <button
              key={offset}
              onClick={() => setDayOffset(offset)}
              style={{
                padding: isMobile ? '8px 14px' : '8px 18px',
                borderRadius: '20px',
                border: active ? 'none' : `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
                background: active ? `linear-gradient(135deg, ${theme.cyan}30, ${theme.purple}20)` : 'transparent',
                color: active ? theme.cyan : theme.textDim,
                fontWeight: active ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {getDayLabel(offset)}
            </button>
          );
        })}
      </div>

      {/* CONTATORE */}
      <div style={{ fontSize: '12px', color: theme.textDim, marginBottom: '16px', fontWeight: 600 }}>
        {loading ? 'Caricamento...' : `${totalMatches} partite in ${leagues.length} campionati`}
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: theme.textDim }}>
          <div style={{
            display: 'inline-block', width: 28, height: 28,
            border: `3px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
            borderTopColor: theme.cyan, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ marginTop: 10 }}>Caricamento partite...</div>
        </div>
      )}

      {/* NESSUNA PARTITA */}
      {!loading && leagues.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: theme.textDim }}>
          Nessuna partita trovata per {getDayLabel(dayOffset).toLowerCase()}
        </div>
      )}

      {/* LISTA LEGHE COLLASSABILI */}
      {!loading && leagues.map(group => {
        const isExpanded = expandedLeagues.has(group.league_id);
        return (
          <div key={group.league_id} style={{ marginBottom: '8px' }}>
            {/* HEADER LEGA */}
            <button
              onClick={() => toggleLeague(group.league_id)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px',
                background: isExpanded
                  ? (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)')
                  : 'transparent',
                border: `1px solid ${isExpanded ? theme.cyan + '40' : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')}`,
                borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: theme.text,
                textAlign: 'left',
              }}
            >
              {isExpanded ? <ChevronDown size={18} color={theme.cyan} /> : <ChevronRight size={18} color={theme.textDim} />}
              <img
                src={STEMMI_CAMPIONATI[group.league_id] || ''}
                alt=""
                style={{ width: 22, height: 22, objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', flex: 1 }}>
                {group.league_name}
              </span>
              <span style={{ fontSize: '10px', color: theme.cyan + 'aa', fontWeight: 700 }}>
                {group.country}
              </span>
              <span style={{ fontSize: '11px', color: theme.textDim, fontWeight: 600 }}>
                {group.matches.length}
              </span>
            </button>

            {/* PARTITE DELLA LEGA */}
            {isExpanded && (
              <div style={{
                border: `1px solid ${theme.cyan}40`,
                borderTop: 'none',
                borderRadius: '0 0 12px 12px',
                overflow: 'hidden',
              }}>
                {group.matches.map((match, idx) => (
                  <div
                    key={match.id || idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      borderBottom: idx < group.matches.length - 1
                        ? `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`
                        : 'none',
                      background: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {/* ORARIO */}
                    <span style={{
                      fontSize: '12px', fontWeight: 700, color: theme.cyan,
                      minWidth: '42px', textAlign: 'center',
                    }}>
                      {match.match_time || '--:--'}
                    </span>

                    {/* SQUADRE */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: isMobile ? '12px' : '13px', fontWeight: 700, color: theme.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {match.home} <span style={{ color: theme.textDim, fontWeight: 500 }}>vs</span> {match.away}
                      </span>
                    </div>

                    {/* STATUS se finita */}
                    {match.status === 'Finished' && match.real_score && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: theme.success }}>
                        {match.real_score}
                      </span>
                    )}

                    {/* TASTO SIMULA */}
                    <button
                      onClick={() => openPopup(match, group.league_id, group.country)}
                      style={{
                        padding: isMobile ? '6px 12px' : '6px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${theme.cyan}25, ${theme.purple}20)`,
                        color: theme.cyan,
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${theme.cyan}40, ${theme.purple}35)`;
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${theme.cyan}25, ${theme.purple}20)`;
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Simula
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      </div>{/* fine CONTENUTO */}

      {/* ===== POPUP IMPOSTAZIONI ===== */}
      {popupMatch && (
        <div
          onClick={() => setPopupMatch(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isLight ? '#fff' : '#111827',
              borderRadius: '16px',
              padding: isMobile ? '20px' : '28px',
              width: '100%',
              maxWidth: '420px',
              maxHeight: '85vh',
              overflowY: 'auto',
              border: `1px solid ${theme.cyan}40`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
            }}
          >
            {/* TITOLO PARTITA */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: theme.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                Simulazione
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: theme.text }}>
                {popupMatch.match.home} <span style={{ color: theme.textDim }}>vs</span> {popupMatch.match.away}
              </div>
              <div style={{ fontSize: '12px', color: theme.cyan, fontWeight: 600, marginTop: '4px' }}>
                {popupMatch.match.match_time || ''} — {LEAGUES_MAP.find(l => l.id === popupMatch.leagueId)?.name || popupMatch.leagueId}
              </div>
            </div>

            {/* ALGORITMO */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: theme.textDim, textTransform: 'uppercase', marginBottom: '8px' }}>
                Algoritmo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
                {ALGO_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setConfigAlgo(opt.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: configAlgo === opt.id ? `1px solid ${theme.cyan}` : `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : '#333'}`,
                      background: configAlgo === opt.id ? `${theme.cyan}20` : 'transparent',
                      color: configAlgo === opt.id ? theme.text : theme.textDim,
                      fontWeight: configAlgo === opt.id ? 800 : 600,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    <div>[{opt.id}] {opt.label}</div>
                    <div style={{ fontSize: '9px', color: theme.textDim, marginTop: '2px' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* PRESET VELOCITA */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: theme.textDim, textTransform: 'uppercase', marginBottom: '8px' }}>
                Cicli di simulazione
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px' }}>
                {SPEED_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      if (preset.id !== 8) setCustomCycles(preset.cycles);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: selectedPreset === preset.id ? `1px solid ${theme.cyan}` : `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : '#333'}`,
                      background: selectedPreset === preset.id ? `${theme.cyan}20` : 'transparent',
                      color: selectedPreset === preset.id ? theme.text : theme.textDim,
                      fontWeight: selectedPreset === preset.id ? 800 : 600,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    <div>{preset.label}</div>
                    <div style={{ fontSize: '9px', color: theme.textDim, marginTop: '2px' }}>
                      {preset.id === 8 ? 'Manuale' : `${preset.cycles} cicli`}
                    </div>
                  </button>
                ))}
              </div>
              {selectedPreset === 8 && (
                <input
                  type="number"
                  value={customCycles}
                  onChange={(e) => setCustomCycles(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    marginTop: '8px', width: '100%', padding: '8px 12px',
                    borderRadius: '8px', border: `1px solid ${theme.cyan}40`,
                    background: isLight ? '#f5f5f5' : '#1a1a2e',
                    color: theme.text, fontSize: '13px', fontWeight: 700,
                  }}
                  placeholder="Numero cicli"
                />
              )}
            </div>

            {/* MODALITA */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: theme.textDim, textTransform: 'uppercase', marginBottom: '8px' }}>
                Modalita
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'fast' as const, label: 'Flash', icon: '⚡' },
                  { id: 'animated' as const, label: 'Animata', icon: '🎬' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setSimMode(mode.id)}
                    style={{
                      flex: 1, padding: '10px',
                      borderRadius: '10px',
                      border: simMode === mode.id ? `1px solid ${theme.cyan}` : `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : '#333'}`,
                      background: simMode === mode.id ? `${theme.cyan}20` : 'transparent',
                      color: simMode === mode.id ? theme.text : theme.textDim,
                      fontWeight: simMode === mode.id ? 800 : 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TASTO AVVIA */}
            <button
              onClick={handleAvviaSimulazione}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '12px', border: 'none',
                background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                color: 'white',
                fontWeight: 900, fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'; }}
            >
              Avvia Simulazione
            </button>

            {/* TASTO ANNULLA */}
            <button
              onClick={() => setPopupMatch(null)}
              style={{
                width: '100%', padding: '10px', marginTop: '8px',
                borderRadius: '10px', border: 'none',
                background: 'transparent',
                color: theme.textDim,
                fontWeight: 600, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
