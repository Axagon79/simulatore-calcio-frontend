import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../AppDev/costanti';

interface SguardoVeloceProps {
  home: string;
  away: string;
  league: string;
  date: string;
  // transfermarkt_id univoci per match deterministico in classifica.
  // null se la squadra non ha tm_id (legacy/leghe minori).
  homeTmId?: number | string | null;
  awayTmId?: number | string | null;
  onClose: () => void;
}

interface StandingsRow {
  rank: number;
  team: string;
  transfermarkt_id: number | string;
  points: number;
  played: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goals_for?: number;
  goals_against?: number;
  goal_diff?: number;
}

type TabKey = 'classifica' | 'h2h' | 'radar';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'classifica', label: 'Classifica' },
  { key: 'h2h', label: 'Testa a testa' },
  { key: 'radar', label: 'Radar squadre' },
];

// Toglie diacritici (à è ì ò ù), abbassa case, rimuove tutto cio' che non e'
// alfanumerico. Usato per match nome.
const normName = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Spezza il nome in parole significative (>= 3 char), case/accent insensitive.
const tokenize = (s: string): string[] =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);

// Match deterministico via transfermarkt_id (univoco). Fallback su nome
// normalizzato + token (per leghe senza tm_id o squadre legacy).
// 'Man City' matcha 'Manchester City' perche' 'man' e' prefix di 'manchester'
// e 'city' e' presente in entrambi.
const matchTeam = (r: StandingsRow, name: string, tmId?: number | string | null): boolean => {
  if (tmId !== undefined && tmId !== null && r.transfermarkt_id != null && String(r.transfermarkt_id) === String(tmId)) {
    return true;
  }
  if (!name) return false;
  if (r.team === name) return true;
  const rn = normName(r.team);
  const nn = normName(name);
  if (rn && nn && rn === nn) return true;
  if (rn.length > 3 && nn.length > 3 && (rn.includes(nn) || nn.includes(rn))) return true;
  const ta = tokenize(r.team);
  const tb = tokenize(name);
  if (ta.length === 0 || tb.length === 0) return false;
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return shorter.every(s => longer.some(l => l === s || l.startsWith(s)));
};

const SguardoVeloce: React.FC<SguardoVeloceProps> = ({ home, away, league, homeTmId, awayTmId, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('classifica');
  const [standings, setStandings] = useState<StandingsRow[] | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  // Default chiuso: mostro solo le 2 squadre della partita. Click 'Mostra tutta'
  // espande la tabella completa della lega.
  const [standingsExpanded, setStandingsExpanded] = useState(false);

  // Fetch classifica solo quando il tab classifica diventa attivo (lazy load).
  // Cache locale: una volta caricata, non rifa fetch se cambi tab e torni.
  useEffect(() => {
    if (activeTab !== 'classifica' || standings !== null || !league) return;
    let cancelled = false;
    setStandingsLoading(true);
    setStandingsError(null);
    fetch(`${API_BASE}/standings/${encodeURIComponent(league)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && Array.isArray(data.table)) {
          setStandings(data.table);
        } else {
          setStandingsError('Classifica non disponibile per questa lega');
        }
      })
      .catch(() => { if (!cancelled) setStandingsError('Errore caricamento classifica'); })
      .finally(() => { if (!cancelled) setStandingsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, league, standings]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
          maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto',
          padding: '28px 28px 24px', color: 'var(--t)', fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header: titolo + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 6 }}>Sguardo veloce</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{home} – {away}</h2>
            {league && <div style={{ fontSize: 12, color: 'var(--t-dim)', marginTop: 4 }}>{league}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--t-faint)', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}
            aria-label="Chiudi"
          >×</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 20,
        }}>
          {TABS.map(t => {
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                  color: isActive ? 'var(--t)' : 'var(--t-dim)',
                  padding: '10px 18px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  marginBottom: -1,
                  transition: 'color .15s, border-color .15s',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Contenuto tab */}
        <div style={{ minHeight: 240 }}>
          {activeTab === 'classifica' && (() => {
            if (standingsLoading) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Caricamento…</div>
            );
            if (standingsError) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-dim)', fontSize: 13 }}>{standingsError}</div>
            );
            if (!standings || standings.length === 0) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontSize: 12 }}>Nessun dato</div>
            );
            const isHome = (r: StandingsRow) => matchTeam(r, home, homeTmId);
            const isAway = (r: StandingsRow) => matchTeam(r, away, awayTmId);
            const isHl = (r: StandingsRow) => isHome(r) || isAway(r);
            const hasStats = standings.some(r => r.wins !== undefined);
            const cellBase: React.CSSProperties = { textAlign: 'center', padding: '6px 4px', fontSize: 12, borderBottom: '1px solid var(--line)' };
            const visibleRows = standingsExpanded
              ? standings
              : standings.filter(r => isHl(r));
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-faint)' }}>
                    Classifica {league}
                  </div>
                  <button
                    onClick={() => setStandingsExpanded(!standingsExpanded)}
                    style={{
                      background: 'transparent', border: '1px solid var(--line)', color: 'var(--t-dim)',
                      padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.08em',
                    }}
                  >
                    {standingsExpanded ? '▲ Solo le due squadre' : '▼ Mostra tutta'}
                  </button>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 8, maxHeight: 420 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: 'var(--t-faint)', background: 'rgba(255,255,255,0.03)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <th style={{ ...cellBase, textAlign: 'right', paddingRight: 10 }}>#</th>
                        <th style={{ ...cellBase, textAlign: 'left', paddingLeft: 8 }}>Squadra</th>
                        {hasStats ? (
                          <>
                            <th style={cellBase}>G</th>
                            <th style={cellBase}>V</th>
                            <th style={cellBase}>P</th>
                            <th style={cellBase}>S</th>
                            <th style={cellBase}>GF</th>
                            <th style={cellBase}>GS</th>
                            <th style={cellBase}>DR</th>
                          </>
                        ) : <th style={cellBase}>G</th>}
                        <th style={{ ...cellBase, fontWeight: 700, background: 'rgba(96,165,250,0.10)' }}>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map(r => {
                        const hl = isHl(r);
                        const bg = isHome(r) ? 'rgba(0,255,255,0.10)' : isAway(r) ? 'rgba(168,85,247,0.10)' : 'transparent';
                        const borderLeftCol = isHome(r) ? 'rgba(0,255,255,0.45)' : isAway(r) ? 'rgba(168,85,247,0.45)' : 'transparent';
                        return (
                          <tr key={`r-${r.rank}-${r.team}`} style={{ background: bg, borderLeft: `2px solid ${borderLeftCol}` }}>
                            <td style={{ ...cellBase, textAlign: 'right', paddingRight: 10, color: 'var(--t-faint)' }}>{r.rank}</td>
                            <td style={{ ...cellBase, textAlign: 'left', paddingLeft: 8, fontWeight: hl ? 600 : 400, color: hl ? 'var(--t)' : 'var(--t-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team}</td>
                            {hasStats ? (
                              <>
                                <td style={cellBase}>{r.played}</td>
                                <td style={cellBase}>{r.wins ?? '-'}</td>
                                <td style={cellBase}>{r.draws ?? '-'}</td>
                                <td style={cellBase}>{r.losses ?? '-'}</td>
                                <td style={cellBase}>{r.goals_for ?? '-'}</td>
                                <td style={cellBase}>{r.goals_against ?? '-'}</td>
                                <td style={cellBase}>{r.goal_diff !== undefined ? (r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff) : '-'}</td>
                              </>
                            ) : <td style={cellBase}>{r.played}</td>}
                            <td style={{ ...cellBase, fontWeight: 700, background: 'rgba(96,165,250,0.06)' }}>{r.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          {activeTab === 'h2h' && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Contenuto Testa a testa — da definire
            </div>
          )}
          {activeTab === 'radar' && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Contenuto Radar — da definire
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SguardoVeloce;
