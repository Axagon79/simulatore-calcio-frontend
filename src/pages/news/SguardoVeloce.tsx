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

type TabKey = 'classifica' | 'tendenze' | 'radar';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'classifica', label: 'Classifica' },
  { key: 'tendenze', label: 'Tendenze' },
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

  // Stato tab Radar: 5 valori per home + away (att, tec, dif, val, frm)
  type RadarSide = { att: number | null; tec: number | null; dif: number | null; val: number | null; frm: number | null };
  const [radar, setRadar] = useState<{ home: RadarSide; away: RadarSide } | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  // Focus: 'all' mostra entrambi, 'home' solo casa, 'away' solo trasferta.
  // Click sulla legenda toggola lo stato corrispondente.
  const [radarFocus, setRadarFocus] = useState<'all' | 'home' | 'away'>('all');
  // Tooltip puntini hover: posizione + valore + colore.
  const [pointTip, setPointTip] = useState<{ x: number; y: number; val: number; color: string } | null>(null);

  // Stato tab Tendenze (gauge Segno + Gol). Identico a VistaPrePartita.
  type PredictionForGauge = {
    segno_dettaglio: any;
    segno_dettaglio_raw: any;
    gol_dettaglio: any;
    gol_directions: any;
    expected_total_goals: number;
  };
  const [tendenzeData, setTendenzeData] = useState<PredictionForGauge | null>(null);
  const [tendenzeLoading, setTendenzeLoading] = useState(false);
  const [tendenzeError, setTendenzeError] = useState<string | null>(null);

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

  // Fetch tendenze (gauge-data) solo quando il tab tendenze diventa attivo.
  useEffect(() => {
    if (activeTab !== 'tendenze' || tendenzeData !== null || !home || !away) return;
    let cancelled = false;
    setTendenzeLoading(true);
    setTendenzeError(null);
    const url = `${API_BASE}/gauge-data?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&league=${encodeURIComponent(league)}`;
    fetch(url)
      .then(r => r.json())
      .then((data: any) => {
        if (cancelled) return;
        if (data && data.segno_dettaglio) {
          setTendenzeData({
            segno_dettaglio: data.segno_dettaglio || {},
            segno_dettaglio_raw: data.segno_dettaglio_raw,
            gol_dettaglio: data.gol_dettaglio || {},
            gol_directions: data.gol_directions,
            expected_total_goals: data.expected_total_goals ?? 2,
          });
        } else {
          setTendenzeError('Dati tendenze non disponibili');
        }
      })
      .catch(err => { if (!cancelled) setTendenzeError(err?.message || 'Errore caricamento tendenze'); })
      .finally(() => { if (!cancelled) setTendenzeLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, home, away, league, tendenzeData]);

  // Fetch radar (h2h-dna) solo quando il tab radar diventa attivo.
  useEffect(() => {
    if (activeTab !== 'radar' || radar !== null || !home || !away || !league) return;
    let cancelled = false;
    setRadarLoading(true);
    setRadarError(null);
    const url = `${API_BASE}/simulation/h2h-dna?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&league=${encodeURIComponent(league)}`;
    fetch(url)
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error || `Errore ${r.status}`); }))
      .then(data => {
        if (cancelled) return;
        if (data.home && data.away) setRadar({ home: data.home, away: data.away });
        else setRadarError('Dati radar non disponibili');
      })
      .catch(err => { if (!cancelled) setRadarError(err?.message || 'Errore caricamento radar'); })
      .finally(() => { if (!cancelled) setRadarLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, home, away, league, radar]);

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
                <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 8, maxHeight: 420, marginLeft: -16, marginRight: -16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 90 }} />     {/* Squadra (unica fissa) */}
                    </colgroup>
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
          {activeTab === 'tendenze' && (() => {
            if (tendenzeLoading) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Caricamento…</div>
            );
            if (tendenzeError) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-dim)', fontSize: 13 }}>{tendenzeError}</div>
            );
            if (!tendenzeData) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontSize: 12 }}>Nessun dato</div>
            );

            // Tema fisso dark (il popup e' sempre dark sopra l'overlay)
            const themeCyan = '#22d3ee';
            const themePurple = '#c084fc';
            const themeSuccess = '#22c55e';

            // --- calcGaugeSegno (copia da VistaPrePartita) ---
            const calcGaugeSegno = (): { value: number; pctFavorito: number; favoritoNome: string } => {
              const raw = tendenzeData.segno_dettaglio_raw;
              const aff = tendenzeData.segno_dettaglio;
              if (!raw || !aff) return { value: 50, pctFavorito: 50, favoritoNome: '' };
              let totaleCasa = 0;
              let totaleTrasferta = 0;
              const letterToNum: Record<string, number> = { 'A': 10, 'B': 7, 'C': 4, 'D': 1 };
              for (const key of Object.keys(raw)) {
                const signal = raw[key];
                if (!signal) continue;
                const affidabilita = aff[key] ?? 50;
                let homeNum: number, awayNum: number;
                if (key === 'affidabilita') {
                  homeNum = signal.home_num ?? (letterToNum[signal.home] || 5);
                  awayNum = signal.away_num ?? (letterToNum[signal.away] || 5);
                } else {
                  homeNum = Number(signal.home ?? 0);
                  awayNum = Number(signal.away ?? 0);
                }
                let diffPct = 0;
                const scala = signal.scala || '';
                if (scala === '%') diffPct = Math.abs(homeNum - awayNum);
                else if (scala === '±7') diffPct = (Math.abs(homeNum - awayNum) / 14) * 100;
                else {
                  const total = Math.abs(homeNum) + Math.abs(awayNum);
                  if (total > 0) diffPct = (Math.abs(homeNum - awayNum) / total) * 100;
                }
                const contributo = diffPct * (affidabilita / 100);
                if (homeNum > awayNum) totaleCasa += contributo;
                else if (awayNum > homeNum) totaleTrasferta += contributo;
              }
              const somma = totaleCasa + totaleTrasferta;
              if (somma === 0) return { value: 50, pctFavorito: 50, favoritoNome: '' };
              const rawValue = (totaleTrasferta / somma) * 100;
              const gaugeValue = 50 + (rawValue - 50) * 0.6;
              const dampedPct = Math.abs(gaugeValue - 50) * 2;
              const pctFavorito = Math.round(50 + dampedPct / 2);
              const favoritoNome = totaleCasa > totaleTrasferta ? home : totaleTrasferta > totaleCasa ? away : '';
              return { value: gaugeValue, pctFavorito, favoritoNome };
            };

            // --- calcGaugeGol (copia da VistaPrePartita) ---
            const calcGaugeGol = (): number => {
              const gol = tendenzeData.gol_dettaglio;
              if (!gol) return 2;
              const dirs = tendenzeData.gol_directions || {};
              const expected = tendenzeData.expected_total_goals ?? 2;
              const base = expected / 2;
              const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
              const equivs: number[] = [];
              for (const key of Object.keys(gol)) {
                if (key === 'strisce') continue;
                const valore = gol[key];
                const dir = dirs[key] || '';
                let equiv: number;
                if (dir === 'over' || dir === 'goal') equiv = base + (valore / 100) * 2;
                else if (dir === 'under' || dir === 'nogoal') equiv = base - (valore / 100) * 2;
                else equiv = base;
                equivs.push(clamp(equiv, 0, 4));
              }
              if (equivs.length === 0) return clamp(expected, 0, 4);
              const mediaSegnali = equivs.reduce((a, b) => a + b, 0) / equivs.length;
              return clamp((mediaSegnali + expected) / 2, 0, 4);
            };

            // --- Render gauge SEGNO ---
            const { value: segnoValue, pctFavorito, favoritoNome } = calcGaugeSegno();
            const angleSegno = Math.PI - (segnoValue / 100) * Math.PI;
            const R = 100, cx = 150, cy = 130, needleLen = 85;
            const needleXSegno = cx + needleLen * Math.cos(angleSegno);
            const needleYSegno = cy - needleLen * Math.sin(angleSegno);
            const dominantColor = segnoValue < 40 ? themeCyan : segnoValue > 60 ? themePurple : '#888';
            const segnoLabel = segnoValue < 40 ? '1' : segnoValue > 60 ? '2' : 'X';
            const arcPt = (pct: number) => {
              const a = Math.PI - (pct / 100) * Math.PI;
              return { x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) };
            };
            const z1Start = arcPt(0);
            const z2End = arcPt(100);
            const xTop = arcPt(50);

            // --- Render gauge GOL ---
            const golAttesi = calcGaugeGol();
            const angleGol = Math.PI - (golAttesi / 4) * Math.PI;
            const needleXGol = cx + needleLen * Math.cos(angleGol);
            const needleYGol = cy - needleLen * Math.sin(angleGol);
            const golColor = golAttesi < 1.5 ? '#ff4444' : golAttesi > 2.5 ? themeSuccess : '#ffd000';

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                {/* GAUGE SEGNO */}
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-faint)', textAlign: 'center', marginBottom: 4 }}>Segno</div>
                  <svg viewBox="0 0 300 160" style={{ width: '100%', maxWidth: 280, display: 'block', margin: '0 auto' }}>
                    <defs>
                      <filter id="glowSegnoTend">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <linearGradient id="gaugeSegnoGradTend" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={themeCyan} stopOpacity="0.35" />
                        <stop offset="28%" stopColor={themeCyan} stopOpacity="0.25" />
                        <stop offset="38%" stopColor="#556" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#666" stopOpacity="0.3" />
                        <stop offset="62%" stopColor="#556" stopOpacity="0.3" />
                        <stop offset="72%" stopColor={themePurple} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={themePurple} stopOpacity="0.35" />
                      </linearGradient>
                    </defs>
                    <path d={`M ${z1Start.x} ${z1Start.y} A ${R} ${R} 0 0 1 ${z2End.x} ${z2End.y}`}
                      fill="none" stroke="url(#gaugeSegnoGradTend)" strokeWidth="16" strokeLinecap="round" />
                    {Array.from({ length: 11 }).map((_, i) => {
                      const a = Math.PI - (i / 10) * Math.PI;
                      const inner = R - 5, outer = R + 8;
                      return (
                        <line key={i}
                          x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)}
                          x2={cx + outer * Math.cos(a)} y2={cy - outer * Math.sin(a)}
                          stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                        />
                      );
                    })}
                    <line x1={cx} y1={cy} x2={needleXSegno} y2={needleYSegno}
                      stroke="#fff" strokeWidth="2" strokeLinecap="round" filter="url(#glowSegnoTend)" />
                    <circle cx={needleXSegno} cy={needleYSegno} r="3.5" fill={dominantColor} filter="url(#glowSegnoTend)" />
                    <circle cx={cx} cy={cy} r="6" fill="#1a1a24" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                    <text x="30" y="22" fontSize="9" fill={themeCyan} fontWeight="bold" textAnchor="start" style={{ fontFamily: 'Inter, sans-serif' }}>{home.substring(0, 14)}</text>
                    <text x="270" y="22" fontSize="9" fill={themePurple} fontWeight="bold" textAnchor="end" style={{ fontFamily: 'Inter, sans-serif' }}>{away.substring(0, 14)}</text>
                    <text x={xTop.x} y={xTop.y - 14} fontSize="12" fill="#888" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Inter, sans-serif' }}>X</text>
                    <text x={cx - R - 14} y={cy + 5} fontSize="14" fill={themeCyan} fontWeight="900" textAnchor="middle">1</text>
                    <text x={cx + R + 14} y={cy + 5} fontSize="14" fill={themePurple} fontWeight="900" textAnchor="middle">2</text>
                    <text x={cx} y={cy - 25} fontSize="24" fill="#fff" fontWeight="900" textAnchor="middle" filter="url(#glowSegnoTend)" style={{ fontFamily: 'Inter, sans-serif' }}>{pctFavorito}%</text>
                    <text x={cx} y={cy - 8} fontSize="9" fill={dominantColor} fontWeight="bold" textAnchor="middle" letterSpacing="1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {favoritoNome ? `${segnoLabel} ${favoritoNome.substring(0, 12)}` : 'EQUILIBRIO'}
                    </text>
                  </svg>
                </div>

                {/* GAUGE GOL */}
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-faint)', textAlign: 'center', marginBottom: 4 }}>Gol</div>
                  <svg viewBox="0 0 300 160" style={{ width: '100%', maxWidth: 280, display: 'block', margin: '0 auto' }}>
                    <defs>
                      <linearGradient id="gaugeGradGolTend" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff4444" />
                        <stop offset="35%" stopColor="#ffd000" />
                        <stop offset="65%" stopColor="#ffd000" />
                        <stop offset="100%" stopColor={themeSuccess} />
                      </linearGradient>
                      <filter id="glowGolTend">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                      fill="none" stroke="url(#gaugeGradGolTend)" strokeWidth="16" strokeLinecap="round" opacity="0.3" />
                    {Array.from({ length: 9 }).map((_, i) => {
                      const golVal = i * 0.5;
                      const a = Math.PI - (golVal / 4) * Math.PI;
                      const isMajor = golVal % 1 === 0;
                      const inner = isMajor ? R - 8 : R - 3;
                      const outer = R + 8;
                      return (
                        <g key={i}>
                          <line
                            x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)}
                            x2={cx + outer * Math.cos(a)} y2={cy - outer * Math.sin(a)}
                            stroke={isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'} strokeWidth={isMajor ? 1.5 : 0.8}
                          />
                          {isMajor && (
                            <text x={cx + (R + 18) * Math.cos(a)} y={cy - (R + 18) * Math.sin(a) + 3}
                              fontSize="8" fill="rgba(255,255,255,0.5)" fontWeight="bold" textAnchor="middle" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {golVal}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    <line x1={cx} y1={cy} x2={needleXGol} y2={needleYGol}
                      stroke="#fff" strokeWidth="2" strokeLinecap="round" filter="url(#glowGolTend)" />
                    <circle cx={needleXGol} cy={needleYGol} r="3.5" fill={golColor} filter="url(#glowGolTend)" />
                    <circle cx={cx} cy={cy} r="6" fill="#1a1a24" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                    <text x={cx} y={cy - 25} fontSize="24" fill="#fff" fontWeight="900" textAnchor="middle" filter="url(#glowGolTend)" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {golAttesi.toFixed(1)}
                    </text>
                    <text x={cx} y={cy - 8} fontSize="9" fill={golColor} fontWeight="bold" textAnchor="middle" letterSpacing="1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {golAttesi < 1.5 ? 'UNDER' : golAttesi > 2.5 ? 'OVER' : 'EQUILIBRIO'}
                    </text>
                    <text x={cx} y={cy + 18} fontSize="8" fill="rgba(255,255,255,0.4)" textAnchor="middle" letterSpacing="2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      GOL ATTESI
                    </text>
                  </svg>
                </div>
              </div>
            );
          })()}
          {activeTab === 'radar' && (() => {
            if (radarLoading) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Caricamento…</div>
            );
            if (radarError) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-dim)', fontSize: 13 }}>{radarError}</div>
            );
            if (!radar) return (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t-faint)', fontSize: 12 }}>Nessun dato</div>
            );

            // Geometria pentagramma. Ordine assi: ATT(alto), TEC(dx), DIF(basso-dx), VAL(basso-sx), FRM(sx).
            const center = 100;
            const radius = 75;
            const labels = ['ATT', 'TEC', 'DIF', 'VAL', 'FRM'];
            const homeVals = [radar.home.att ?? 0, radar.home.tec ?? 0, radar.home.dif ?? 0, radar.home.val ?? 0, radar.home.frm ?? 0];
            const awayVals = [radar.away.att ?? 0, radar.away.tec ?? 0, radar.away.dif ?? 0, radar.away.val ?? 0, radar.away.frm ?? 0];
            const cyan = 'rgba(34, 211, 238, 1)';
            const magenta = 'rgba(236, 72, 153, 1)';

            // Calcolo coordinate punti per ogni squadra (riusato in render + hover)
            const computePoints = (vals: number[]) => vals.map((v, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              const x = center + (Math.min(Math.max(v, 0), 100) / 100) * radius * Math.cos(angle);
              const y = center + (Math.min(Math.max(v, 0), 100) / 100) * radius * Math.sin(angle);
              return { x, y, val: v };
            });
            const homePts = computePoints(homeVals);
            const awayPts = computePoints(awayVals);
            const homePolyStr = homePts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const awayPolyStr = awayPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            // Anelli sfondo
            const ringPoints = (pct: number) => Array.from({ length: 5 }, (_, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              const x = center + (pct / 100) * radius * Math.cos(angle);
              const y = center + (pct / 100) * radius * Math.sin(angle);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            // Medie per le barre percentuale
            const homeAvg = Math.round(homeVals.reduce((a, b) => a + b, 0) / 5);
            const awayAvg = Math.round(awayVals.reduce((a, b) => a + b, 0) / 5);

            const showHome = radarFocus === 'all' || radarFocus === 'home';
            const showAway = radarFocus === 'all' || radarFocus === 'away';
            const homeOpacity = radarFocus === 'away' ? 0.2 : 1;
            const awayOpacity = radarFocus === 'home' ? 0.2 : 1;

            return (
              <div>
                {/* Legenda squadre cliccabile + barra percentuale media */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 18, fontSize: 12.5 }}>
                  <div
                    onClick={() => setRadarFocus(prev => prev === 'home' ? 'all' : 'home')}
                    style={{ flex: 1, cursor: 'pointer', opacity: homeOpacity, transition: 'opacity .2s' }}
                  >
                    {/* Barra % media home */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${homeAvg}%`, height: '100%', background: cyan, boxShadow: `0 0 5px ${cyan}` }} />
                      </div>
                      <span style={{ color: cyan, fontSize: 16, fontWeight: 700 }}>{homeAvg}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, background: cyan, borderRadius: 2 }} />
                      <b style={{ color: 'var(--t)' }}>{home}</b>
                    </div>
                  </div>
                  <div
                    onClick={() => setRadarFocus(prev => prev === 'away' ? 'all' : 'away')}
                    style={{ flex: 1, cursor: 'pointer', opacity: awayOpacity, transition: 'opacity .2s', textAlign: 'right' }}
                  >
                    {/* Barra % media away */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: magenta, fontSize: 16, fontWeight: 700 }}>{awayAvg}%</span>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${awayAvg}%`, height: '100%', background: magenta, boxShadow: `0 0 5px ${magenta}`, marginLeft: 'auto' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <b style={{ color: 'var(--t)' }}>{away}</b>
                      <span style={{ width: 10, height: 10, background: magenta, borderRadius: 2 }} />
                    </div>
                  </div>
                </div>

                {/* Pentagono SVG */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px', position: 'relative' }}>
                  <svg viewBox="0 0 200 220" width="280" height="308">
                    {[20, 40, 60, 80, 100].map(pct => (
                      <polygon
                        key={`ring-${pct}`}
                        points={ringPoints(pct)}
                        fill="none"
                        stroke="var(--line)"
                        strokeWidth={pct === 100 ? '1.5' : '0.5'}
                        opacity={pct === 100 ? 0.9 : 0.25}
                      />
                    ))}
                    {Array.from({ length: 5 }).map((_, i) => {
                      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                      const x = center + radius * Math.cos(angle);
                      const y = center + radius * Math.sin(angle);
                      return <line key={`axis-${i}`} x1={center} y1={center} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--line)" strokeWidth="0.5" opacity="0.3" />;
                    })}
                    {/* Poligono home (ciano) */}
                    {showHome && (
                      <g style={{ opacity: homeOpacity, transition: 'opacity .2s' }}>
                        <polygon points={homePolyStr} fill={cyan} fillOpacity="0.25" stroke={cyan} strokeWidth="2" />
                        {homePts.map((p, i) => (
                          <g key={`h-${i}`}>
                            {/* Pallino visibile */}
                            <circle cx={p.x} cy={p.y} r="2.5" fill={cyan} pointerEvents="none" />
                            {/* Cerchio invisibile per hover (raggio piu' grande) */}
                            <circle cx={p.x} cy={p.y} r="6" fill="transparent" style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setPointTip({ x: p.x, y: p.y, val: p.val, color: cyan })}
                              onMouseLeave={() => setPointTip(null)}
                            />
                          </g>
                        ))}
                      </g>
                    )}
                    {/* Poligono away (magenta) */}
                    {showAway && (
                      <g style={{ opacity: awayOpacity, transition: 'opacity .2s' }}>
                        <polygon points={awayPolyStr} fill={magenta} fillOpacity="0.25" stroke={magenta} strokeWidth="2" />
                        {awayPts.map((p, i) => (
                          <g key={`a-${i}`}>
                            <circle cx={p.x} cy={p.y} r="2.5" fill={magenta} pointerEvents="none" />
                            <circle cx={p.x} cy={p.y} r="6" fill="transparent" style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setPointTip({ x: p.x, y: p.y, val: p.val, color: magenta })}
                              onMouseLeave={() => setPointTip(null)}
                            />
                          </g>
                        ))}
                      </g>
                    )}
                    {/* Label assi */}
                    {labels.map((lbl, i) => {
                      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                      const lx = center + (radius + 18) * Math.cos(angle);
                      const ly = center + (radius + 18) * Math.sin(angle);
                      return (
                        <text key={`lbl-${i}`} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontFamily="'JetBrains Mono', monospace" fill="var(--t-dim)" letterSpacing="0.1em">
                          {lbl}
                        </text>
                      );
                    })}
                    {/* Tooltip valore hover */}
                    {pointTip && (
                      <g transform={`translate(${pointTip.x}, ${pointTip.y - 10})`} style={{ pointerEvents: 'none' }}>
                        <rect x="-14" y="-7" width="28" height="11" rx="3" fill="rgba(0,0,0,0.85)" stroke={pointTip.color} strokeWidth="0.7" />
                        <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontFamily="'JetBrains Mono', monospace" fill="#fff" fontWeight="600">
                          {pointTip.val.toFixed(1)}%
                        </text>
                      </g>
                    )}
                  </svg>
                </div>

              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default SguardoVeloce;
