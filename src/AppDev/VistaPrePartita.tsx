import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction, CSSProperties } from 'react';
import type { Match } from '../types';
import { API_BASE } from './costanti';

// ============================================================
// TYPES & INTERFACES
// ============================================================

type ViewState = 'list' | 'pre-match' | 'simulating' | 'settings' | 'result';
type SimMode = 'fast' | 'animated';
type RadarFocus = 'all' | 'home' | 'away';

interface Theme {
  cyan: string;
  purple: string;
  text: string;
  textDim: string;
  success: string;
  danger: string;
  panelBorder: string;
}

interface PointTooltip {
  x: number;
  y: number;
  val: number;
  color: string;
}

type Styles = Record<string, CSSProperties>;

// ============================================================
// PROPS INTERFACE
// ============================================================

interface VistaPrePartitaProps {
  theme: Theme;
  styles: Styles;
  isMobile: boolean;
  selectedMatch: Match | null;
  getStemmaLeagueUrl: (mongoId?: string) => string;
  viewState: ViewState;
  setViewState: Dispatch<SetStateAction<ViewState>>;
  simMode: SimMode;
  setSimMode: Dispatch<SetStateAction<SimMode>>;
  isFlashActive: boolean;
  setIsFlashActive: Dispatch<SetStateAction<boolean>>;
  configAlgo: number;
  setConfigAlgo: Dispatch<SetStateAction<number>>;
  customCycles: number;
  setCustomCycles: Dispatch<SetStateAction<number>>;
  radarFocus: RadarFocus;
  setRadarFocus: Dispatch<SetStateAction<RadarFocus>>;
  pointTooltip: PointTooltip | null;
  setPointTooltip: Dispatch<SetStateAction<PointTooltip | null>>;
  startSimulation: (algoOverride?: number | null, cyclesOverride?: number | null) => void;
  league: string;
}

// ============================================================
// COMPONENT
// ============================================================

export default function VistaPrePartita({
  theme,
  styles,
  isMobile,
  selectedMatch,
  getStemmaLeagueUrl,
  viewState,
  setViewState,
  simMode,
  setSimMode,
  isFlashActive,
  setIsFlashActive,
  configAlgo,
  setConfigAlgo,
  customCycles,
  setCustomCycles,
  radarFocus,
  setRadarFocus,
  pointTooltip,
  setPointTooltip,
  startSimulation,
  league
}: VistaPrePartitaProps) {

    // --- STRISCE: State + Fetch ---
    interface StreakData {
      streak_home: Record<string, number>;
      streak_away: Record<string, number>;
      streak_home_context: Record<string, number>;
      streak_away_context: Record<string, number>;
    }
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [streakLoading, setStreakLoading] = useState(false);

    useEffect(() => {
      if (!selectedMatch?.home || !selectedMatch?.away || !league) {
        setStreakData(null);
        return;
      }
      let cancelled = false;
      setStreakLoading(true);
      fetch(`${API_BASE}/streaks?home=${encodeURIComponent(selectedMatch.home)}&away=${encodeURIComponent(selectedMatch.away)}&league=${encodeURIComponent(league)}`)
        .then(r => r.json())
        .then(data => {
          if (!cancelled && data.success) {
            setStreakData({
              streak_home: data.streak_home,
              streak_away: data.streak_away,
              streak_home_context: data.streak_home_context,
              streak_away_context: data.streak_away_context,
            });
          }
          setStreakLoading(false);
        })
        .catch(() => { if (!cancelled) { setStreakData(null); setStreakLoading(false); } });
      return () => { cancelled = true; };
    }, [selectedMatch?.home, selectedMatch?.away, league]);

    // --- GAUGE: Fetch daily_predictions + Calcoli ---
    interface PredictionForGauge {
      segno_dettaglio: Record<string, number>;
      segno_dettaglio_raw?: {
        bvs?: { home: number; away: number; scala: string };
        quote?: { home: number; away: number; scala: string };
        lucifero?: { home: number; away: number; scala: string };
        affidabilita?: { home: string; away: string; home_num: number; away_num: number; scala: string };
        dna?: { home: number; away: number; scala: string };
        motivazioni?: { home: number; away: number; scala: string };
        h2h?: { home: number; away: number; matches: number; scala: string };
        campo?: { home: number; away: number; scala: string };
      };
      gol_dettaglio: Record<string, number>;
      gol_directions?: Record<string, string>;
      expected_total_goals?: number;
    }
    const [predictionData, setPredictionData] = useState<PredictionForGauge | null>(null);

    useEffect(() => {
      if (!selectedMatch?.home || !selectedMatch?.away) {
        setPredictionData(null);
        return;
      }
      let cancelled = false;
      fetch(`${API_BASE}/gauge-data?home=${encodeURIComponent(selectedMatch.home)}&away=${encodeURIComponent(selectedMatch.away)}&league=${encodeURIComponent(league)}`)
        .then(r => r.json())
        .then((data: any) => {
          if (cancelled) return;
          if (data && data.segno_dettaglio) {
            setPredictionData({
              segno_dettaglio: data.segno_dettaglio || {},
              segno_dettaglio_raw: data.segno_dettaglio_raw,
              gol_dettaglio: data.gol_dettaglio || {},
              gol_directions: data.gol_directions,
              expected_total_goals: data.expected_total_goals,
            });
          } else {
            setPredictionData(null);
          }
        })
        .catch(() => { if (!cancelled) setPredictionData(null); });
      return () => { cancelled = true; };
    }, [selectedMatch?.home, selectedMatch?.away, league]);

    // --- Gauge SEGNO: calcolo ---
    const calcGaugeSegno = (): { value: number; pctFavorito: number; favoritoNome: string } => {
      if (!predictionData?.segno_dettaglio_raw || !predictionData?.segno_dettaglio) {
        return { value: 50, pctFavorito: 50, favoritoNome: '' };
      }
      const raw = predictionData.segno_dettaglio_raw;
      const aff = predictionData.segno_dettaglio;
      let totaleCasa = 0;
      let totaleTrasferta = 0;
      const letterToNum: Record<string, number> = { 'A': 10, 'B': 7, 'C': 4, 'D': 1 };

      for (const key of Object.keys(raw) as Array<keyof typeof raw>) {
        const signal = raw[key];
        if (!signal) continue;
        const affidabilita = aff[key as string] ?? 50;
        let homeNum: number, awayNum: number;

        if (key === 'affidabilita') {
          homeNum = (signal as any).home_num ?? (letterToNum[(signal as any).home] || 5);
          awayNum = (signal as any).away_num ?? (letterToNum[(signal as any).away] || 5);
        } else {
          homeNum = Number((signal as any).home ?? 0);
          awayNum = Number((signal as any).away ?? 0);
        }

        let diffPct = 0;
        const scala = (signal as any).scala || '';
        if (scala === '%') {
          diffPct = Math.abs(homeNum - awayNum);
        } else if (scala === '±7') {
          diffPct = (Math.abs(homeNum - awayNum) / 14) * 100;
        } else {
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
      // Smorzamento: comprime [0,100] → [20,80] per evitare lancetta troppo estrema
      const gaugeValue = 50 + (rawValue - 50) * 0.6;
      // Percentuale coerente con lo smorzamento della lancetta
      const dampedPct = Math.abs(gaugeValue - 50) * 2; // 0-100: quanto è sbilanciato
      const pctFavorito = Math.round(50 + dampedPct / 2); // 50-100: % del favorito
      const favoritoNome = totaleCasa > totaleTrasferta ? (selectedMatch?.home || '') : totaleTrasferta > totaleCasa ? (selectedMatch?.away || '') : '';
      return { value: gaugeValue, pctFavorito, favoritoNome };
    };

    // --- Gauge GOL: calcolo ---
    const calcGaugeGol = (): number => {
      if (!predictionData?.gol_dettaglio) return 2;
      const gol = predictionData.gol_dettaglio;
      const dirs = predictionData.gol_directions || {};
      const expected = predictionData.expected_total_goals ?? 2;
      const base = expected / 2;
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

      const equivs: number[] = [];
      for (const key of Object.keys(gol)) {
        if (key === 'strisce') continue;
        const valore = gol[key];
        const dir = dirs[key] || '';
        let equiv: number;
        if (dir === 'over' || dir === 'goal') {
          equiv = base + (valore / 100) * 2;
        } else if (dir === 'under' || dir === 'nogoal') {
          equiv = base - (valore / 100) * 2;
        } else {
          equiv = base;
        }
        equivs.push(clamp(equiv, 0, 4));
      }

      if (equivs.length === 0) return clamp(expected, 0, 4);
      const mediaSegnali = equivs.reduce((a, b) => a + b, 0) / equivs.length;
      return clamp((mediaSegnali + expected) / 2, 0, 4);
    };

    // --- Strisce: costanti e helpers ---
    const STREAK_LABELS: Record<string, string> = {
      vittorie: 'Vittorie', sconfitte: 'Sconfitte', imbattibilita: 'Imbattibilità',
      pareggi: 'Pareggi', senza_vittorie: 'Senza vittorie',
      over25: 'Over 2.5', under25: 'Under 2.5',
      gg: 'GG (entrambe segnano)', clean_sheet: 'Clean sheet',
      senza_segnare: 'Senza segnare', gol_subiti: 'Gol subiti',
    };
    const STREAK_CURVES: Record<string, Record<string, number>> = {
      vittorie: {'3': 2, '4': 3, '5': 0, '6': -1, '7': -3, '8': -6, '9': -10},
      sconfitte: {'4': -1, '5': -2, '6': -5},
      imbattibilita: {'5': 2, '6': 2, '7': 2, '8': 0, '9': 0, '10': 0, '11': -3},
      pareggi: {'3': -1, '4': 0, '5': 1, '6': -3},
      senza_vittorie: {'3': -1, '4': -2, '5': 0, '6': 1, '7': 2},
      over25: {'3': 3, '4': 3, '5': 0, '6': -1, '7': -4},
      under25: {'3': 3, '4': 3, '5': 0, '6': -1, '7': -4},
      gg: {'3': 2, '4': 2, '5': 0, '6': -3},
      clean_sheet: {'3': 2, '4': 3, '5': 0, '6': -1, '7': -4},
      senza_segnare: {'2': 1, '3': 2, '4': 0, '5': -1, '6': -3},
      gol_subiti: {'3': 2, '4': 3, '5': 2, '6': 1, '7': -2},
    };
    const getCurveVal = (type: string, n: number): number => {
      const curve = STREAK_CURVES[type];
      if (!curve) return 0;
      if (curve[String(n)]) return curve[String(n)];
      const keys = Object.keys(curve).map(Number).sort((a, b) => a - b);
      const maxKey = keys[keys.length - 1];
      if (n >= maxKey) return curve[String(maxKey)];
      return 0;
    };
    const MARKET_GROUPS: [string, string[]][] = [
      ['1X2', ['vittorie', 'sconfitte', 'imbattibilita', 'pareggi', 'senza_vittorie']],
      ['O/U', ['over25', 'under25']],
      ['GG', ['gg', 'clean_sheet', 'senza_segnare', 'gol_subiti']],
    ];
    const ALL_STREAK_TYPES = Object.keys(STREAK_LABELS);

    // --- 1. FUNZIONE COLORI LED ---


    // INCOLLA QUESTE (Dati reali dal DB):
    const homeTrend = selectedMatch?.h2h_data?.lucifero_trend_home || [0, 0, 0, 0, 0];
    const awayTrend = selectedMatch?.h2h_data?.lucifero_trend_away || [0, 0, 0, 0, 0];

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

    // --- SVG GAUGE: Tachimetro semicircolare ---
    const renderGaugeSegno = () => {
      const { value, pctFavorito, favoritoNome } = calcGaugeSegno();
      const angleRad = (Math.PI) - (value / 100) * Math.PI;
      const R = 100;
      const cx = 150, cy = 130;
      const needleLen = 85;
      const needleX = cx + needleLen * Math.cos(angleRad);
      const needleY = cy - needleLen * Math.sin(angleRad);
      const dominantColor = value < 40 ? theme.cyan : value > 60 ? theme.purple : '#888';
      const label = value < 40 ? '1' : value > 60 ? '2' : 'X';

      // Punti per le 3 zone dell'arco (35% casa | 30% X | 35% trasferta)
      const arcPt = (pct: number) => {
        const a = Math.PI - (pct / 100) * Math.PI;
        return { x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) };
      };
      const z1Start = arcPt(0);    // sinistra (1)
      const z2End = arcPt(100);    // destra (2)
      // Punto X sopra l'arco (centro = 50%)
      const xTop = arcPt(50);

      return (
        <svg viewBox="0 0 300 160" style={{ width: '100%', maxWidth: '280px' }}>
          <defs>
            <filter id="glowSegno">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <linearGradient id="gaugeSegnoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.cyan} stopOpacity="0.35" />
              <stop offset="28%" stopColor={theme.cyan} stopOpacity="0.25" />
              <stop offset="38%" stopColor="#556" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#666" stopOpacity="0.3" />
              <stop offset="62%" stopColor="#556" stopOpacity="0.3" />
              <stop offset="72%" stopColor={theme.purple} stopOpacity="0.25" />
              <stop offset="100%" stopColor={theme.purple} stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {/* Arco con gradiente fluido cyan → grigio → viola */}
          <path d={`M ${z1Start.x} ${z1Start.y} A ${R} ${R} 0 0 1 ${z2End.x} ${z2End.y}`}
            fill="none" stroke="url(#gaugeSegnoGrad)" strokeWidth="16" strokeLinecap="round" />
          {/* Tacche */}
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
          {/* Lancetta */}
          <line x1={cx} y1={cy} x2={needleX} y2={needleY}
            stroke="#fff" strokeWidth="2" strokeLinecap="round" filter="url(#glowSegno)" />
          <circle cx={needleX} cy={needleY} r="3.5" fill={dominantColor} filter="url(#glowSegno)" />
          <circle cx={cx} cy={cy} r="6" fill="#1a1a24" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* Nomi squadre sopra ai lati */}
          <text x="30" y="22" fontSize="9" fill={theme.cyan} fontWeight="bold" textAnchor="start"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            {(selectedMatch?.home || '').substring(0, 14)}
          </text>
          <text x="270" y="22" fontSize="9" fill={theme.purple} fontWeight="bold" textAnchor="end"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            {(selectedMatch?.away || '').substring(0, 14)}
          </text>
          {/* X sopra l'arco (centro alto) */}
          <text x={xTop.x} y={xTop.y - 14} fontSize="12" fill="#888" fontWeight="900" textAnchor="middle"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            X
          </text>
          {/* 1 e 2 ai lati dell'arco (estremità) */}
          <text x={cx - R - 14} y={cy + 5} fontSize="14" fill={theme.cyan} fontWeight="900" textAnchor="middle">1</text>
          <text x={cx + R + 14} y={cy + 5} fontSize="14" fill={theme.purple} fontWeight="900" textAnchor="middle">2</text>
          {/* Percentuale e segno al centro */}
          <text x={cx} y={cy - 25} fontSize="24" fill="#fff" fontWeight="900" textAnchor="middle"
            filter="url(#glowSegno)" style={{ fontFamily: 'Inter, sans-serif' }}>
            {pctFavorito}%
          </text>
          <text x={cx} y={cy - 8} fontSize="9" fill={dominantColor} fontWeight="bold" textAnchor="middle"
            letterSpacing="1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {favoritoNome ? `${label} ${favoritoNome.substring(0, 12)}` : 'EQUILIBRIO'}
          </text>
        </svg>
      );
    };

    const renderGaugeGol = () => {
      const golAttesi = calcGaugeGol();
      const angleRad = Math.PI - (golAttesi / 4) * Math.PI;
      const R = 100;
      const cx = 150, cy = 130;
      const needleLen = 85;
      const needleX = cx + needleLen * Math.cos(angleRad);
      const needleY = cy - needleLen * Math.sin(angleRad);
      const golColor = golAttesi < 1.5 ? '#ff4444' : golAttesi > 2.5 ? theme.success : '#ffd000';

      return (
        <svg viewBox="0 0 300 160" style={{ width: '100%', maxWidth: '280px' }}>
          <defs>
            <linearGradient id="gaugeGradGol" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4444" />
              <stop offset="35%" stopColor="#ffd000" />
              <stop offset="65%" stopColor="#ffd000" />
              <stop offset="100%" stopColor={theme.success} />
            </linearGradient>
            <filter id="glowGol">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Arco sfondo */}
          <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none" stroke="url(#gaugeGradGol)" strokeWidth="16" strokeLinecap="round" opacity="0.3" />
          {/* Tacche ogni 0.5 (9 tacche: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4) */}
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
                    fontSize="8" fill="rgba(255,255,255,0.5)" fontWeight="bold" textAnchor="middle"
                    style={{ fontFamily: 'Inter, sans-serif' }}>
                    {golVal}
                  </text>
                )}
              </g>
            );
          })}
          {/* Lancetta */}
          <line x1={cx} y1={cy} x2={needleX} y2={needleY}
            stroke="#fff" strokeWidth="2" strokeLinecap="round" filter="url(#glowGol)" />
          <circle cx={needleX} cy={needleY} r="3.5" fill={golColor} filter="url(#glowGol)" />
          <circle cx={cx} cy={cy} r="6" fill="#1a1a24" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* Valore gol al centro */}
          <text x={cx} y={cy - 25} fontSize="24" fill="#fff" fontWeight="900" textAnchor="middle"
            filter="url(#glowGol)" style={{ fontFamily: 'Inter, sans-serif' }}>
            {golAttesi.toFixed(1)}
          </text>
          <text x={cx} y={cy - 8} fontSize="9" fill={golColor} fontWeight="bold" textAnchor="middle"
            letterSpacing="1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {golAttesi < 1.5 ? 'UNDER' : golAttesi > 2.5 ? 'OVER' : 'EQUILIBRIO'}
          </text>
          {/* Label sotto */}
          <text x={cx} y={cy + 18} fontSize="8" fill="rgba(255,255,255,0.4)" textAnchor="middle"
            letterSpacing="2" style={{ fontFamily: 'Inter, sans-serif' }}>
            GOL ATTESI
          </text>
        </svg>
      );
    };

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
          paddingTop: isMobile ? '0' : '25px',
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
              <span style={{ fontFamily: 'monospace' }}>{(selectedMatch as any).date_obj ? new Date((selectedMatch as any).date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) : '27/12'}</span>
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

              {/* GRID DI SIMMETRIA SPECCHIATA (Con Stemmi) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '125px 35px 125px' : '250px 50px 250px', // DUE BLOCCHI IDENTICI
                alignItems: 'center',
                fontSize: isMobile ? '15px' : '25px',
                fontWeight: '900',
                color: '#fff',
                lineHeight: '35px'
              }}>
                
                {/* 1. CASA - Allineata a destra verso il VS (Testo + Stemma) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'flex-end' : 'center', // Mobile: spinge a destra | Desktop: centra
                  gap: '8px', // Spazio tra nome e stemma
                  overflow: 'hidden',
                  width: '100%'
                }}>
                  {/* Nome Squadra */}
                  <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                  }}>
                    {selectedMatch?.home}
                  </span>

                  {/* Stemma Casa */}
                  <img 
                      src={getStemmaLeagueUrl((selectedMatch as any)?.home_mongo_id)} 
                      alt=""
                      style={{ 
                          width: isMobile ? '22px' : '32px', 
                          height: isMobile ? '22px' : '32px', 
                          objectFit: 'contain',
                          flexShrink: 0 
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>

                {/* 2. VS - IL CENTRO ASSOLUTO */}
                <div style={{
                  textAlign: 'center',
                  color: theme.textDim,
                  fontSize: '16px',
                  fontWeight: '400',
                  textTransform: 'lowercase',
                }}>
                  vs
                </div>

                {/* 3. OSPITE - Allineata a sinistra verso il VS (Stemma + Testo) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'flex-start' : 'center', // Mobile: spinge a sinistra | Desktop: centra
                  gap: '8px', // Spazio tra stemma e nome
                  overflow: 'hidden',
                  width: '100%'
                }}>
                  {/* Stemma Ospite */}
                  <img 
                      src={getStemmaLeagueUrl((selectedMatch as any)?.away_mongo_id)} 
                      alt=""
                      style={{ 
                          width: isMobile ? '22px' : '32px', 
                          height: isMobile ? '22px' : '32px', 
                          objectFit: 'contain',
                          flexShrink: 0 
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />

                  {/* Nome Squadra */}
                  <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                  }}>
                    {selectedMatch?.away}
                  </span>
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

          {/* === COLONNA SINISTRA: DATI VISIVI === */}
          <div className="colonna-sinistra-analisi">

            {/* A0. CONFIGURAZIONE SIMULAZIONE */}
            <div className="card-configurazione-left" style={styles.card}>

                <style>
                  {`
                    input[type=number]::-webkit-inner-spin-button,
                    input[type=number]::-webkit-outer-spin-button {
                      background-color: #333 !important;
                      filter: invert(1);
                      cursor: pointer;
                      opacity: 1;
                    }
                    input[type=number] { -moz-appearance: textfield; }
                  `}
                </style>

              <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-10px', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>CONFIGURAZIONE RAPIDA</span>
                <button
                  onClick={() => setViewState('settings')}
                  style={{
                    background: 'transparent', border: '1px solid #444',
                    color: '#888', cursor: 'pointer', borderRadius: '4px',
                    padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase'
                  }}
                  title="Apri Impostazioni Complete"
                >
                  🔧 Avanzate
                </button>
              </div>

              <div style={{
                background: '#0a0a0a',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #222',
                marginLeft: '-15px',
                marginRight: '-15px',
                marginTop: '8px',
                marginBottom: '10px',
                paddingBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>

                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: '5px',
                  marginTop: '5px',
                  gap: '40px',
                  paddingLeft: '-5px'
                }}>
                  <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '5px', marginLeft: '5px' }}>
                    ENGINE: <span style={{ color: theme.cyan }}>CUSTOM</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '5px', marginLeft: '-30px' }}>
                    C. ATTUALI: <span style={{ color: theme.cyan, fontSize: '12px'}}>{customCycles === 0 ? 1 : customCycles}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '5px',
                  justifyContent: 'space-between',
                  padding: '3px 5px',
                  background: '#111',
                  borderRadius: '8px',
                  border: '1px solid #1a1a1a'
                }}>
                  <label style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                    Cicli:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="number"
                      min="1"
                      max="999999"
                      value={isFlashActive ? 1 : (customCycles === 0 ? '' : customCycles)}
                      disabled={isFlashActive || viewState === 'simulating'}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onKeyDown={(e) => {
                        if (["-", "+", "e", "E", "."].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={() => {
                        if (!customCycles || customCycles === 0) {
                          setCustomCycles(1);
                        }
                      }}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (valStr === '') {
                          setCustomCycles(0);
                          return;
                        }
                        const val = parseInt(valStr, 10);
                        if (!isNaN(val) && val > 0) {
                          setCustomCycles(val);
                        }
                      }}
                      style={{
                        width: '60px',
                        background: '#000',
                        color: theme.cyan,
                        border: `1px solid ${theme.cyan}40`,
                        padding: '5px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        outline: 'none',
                        MozAppearance: 'textfield'
                      }}
                    />
                    <button
                      onClick={() => setIsFlashActive(!isFlashActive)}
                      disabled={viewState === 'simulating'}
                      style={{
                        background: isFlashActive ? '#ff9800' : '#1a1a1a',
                        border: isFlashActive ? '1px solid #ff9800' : '1px solid #333',
                        color: isFlashActive ? '#fff' : '#aaa',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        marginTop: '15px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        cursor: 'pointer',
                        transition: '0.2s',
                        boxShadow: isFlashActive ? '0 0 10px rgba(255, 152, 0, 0.4)' : 'none'
                      }}
                    >
                      {isFlashActive ? '⚡ FLASH ON' : '⚡ FLASH OFF'}
                    </button>
                  </div>
                </div>

                <select
                  value={configAlgo}
                  onChange={(e) => setConfigAlgo(Number(e.target.value))}
                  disabled={isFlashActive || viewState === 'simulating'}
                  style={{
                    width: '100%',
                    height: '30px',
                    background: '#111',
                    color: '#fff',
                    border: '1px solid #333',
                    marginTop: '10px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={2}>ALGO 2: DINAMICO</option>
                  <option value={3}>ALGO 3: TATTICO</option>
                  <option value={4}>ALGO 4: CAOS</option>
                  <option value={5}>ALGO 5: MASTER AI</option>
                  <option value={6}>ALGO 6: M.C. AI</option>
                </select>

                <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                <button
                  onClick={() => setSimMode('fast')}
                  disabled={isFlashActive}
                  style={{
                      flex: '1',
                      height: '36px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      marginTop: '5px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${simMode === 'fast' ? theme.cyan : '#333'}`,
                      background: simMode === 'fast' ? theme.cyan : '#111',
                      color: simMode === 'fast' ? '#000' : '#888',
                      transition: '0.2s'
                    }}
                  >
                    SOLO RISULTATO 🧮
                  </button>

                  <button
                    onClick={() => setSimMode('animated')}
                    disabled={isFlashActive}
                    style={{
                      flex: '1',
                      height: '36px',
                      fontSize: '10px',
                      marginTop: '5px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${simMode === 'animated' ? theme.cyan : '#333'}`,
                      background: simMode === 'animated' ? theme.cyan : '#111',
                      color: simMode === 'animated' ? '#000' : '#888',
                      transition: '0.2s'
                    }}
                  >
                    ANIMATA 🎬
                  </button>
                </div>

                <button
                  onClick={() => startSimulation()}
                  disabled={viewState === 'simulating'}
                  style={{
                    width: '100%',
                    background: isFlashActive
                      ? `linear-gradient(180deg, #ff9800 0%, #ff5722 100%)`
                      : `linear-gradient(180deg, ${theme.cyan} 0%, #008b8b 100%)`,
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '900',
                    fontSize: '14px',
                    letterSpacing: '1px',
                    cursor: viewState === 'simulating' ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    marginTop: '10px',
                    boxShadow: isFlashActive
                      ? `0 4px 15px rgba(255, 87, 34, 0.4)`
                      : `0 4px 15px ${theme.cyan}40`,
                    transition: 'all 0.3s',
                    opacity: viewState === 'simulating' ? 0.7 : 1
                  }}
                >
                  {isFlashActive ? ' ESEGUI FLASH' : 'AVVIA SIMULAZIONE'}
                </button>
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

            {/* A4. CAMPO & AFFIDABILITÀ (Card Unificata) */}
            <div className="card-campo-affidabilita" style={styles.card}>
              <div className="header-title" style={{ marginBottom: '20px', marginTop: '-10px' }}>CAMPO & AFFIDABILITÀ</div>

              {/* --- SOTTO-SEZIONE: FATTORE STADIO --- */}
              <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>🏟️ Fattore Stadio</div>
              <div className="content-container">
                {(() => {
                  const fullScaleGradient = `linear-gradient(90deg,
                                rgba(255, 0, 0, 1) 0%, rgba(255, 30, 0, 1) 11%, rgba(255, 80, 0, 1) 22%,
                                rgba(255, 140, 0, 1) 33%, rgba(255, 200, 0, 1) 44%, rgba(255, 255, 0, 1) 55%,
                                rgba(210, 255, 0, 1) 66%, rgba(150, 255, 0, 1) 77%, rgba(0, 255, 0, 1) 88%,
                                rgba(0, 255, 100, 1) 100%)`;
                  const colHome = getTrendColor(homeFieldFactor);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');
                  const colAway = getTrendColor(awayFieldFactor);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');
                  return (
                    <>
                      <div className="team-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.home}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar home" style={{ width: `${homeFieldFactor}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${homeFieldFactor > 0 ? (10000 / homeFieldFactor) : 100}% 100%`, boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage home" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colHome, textShadow: `0 0 8px ${shadHome}` }}>{homeFieldFactor}%</span>
                      </div>
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.away}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{ width: `${awayFieldFactor}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${awayFieldFactor > 0 ? (10000 / awayFieldFactor) : 100}% 100%`, boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage away" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colAway, textShadow: `0 0 8px ${shadAway}` }}>{awayFieldFactor}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* --- DIVISORE --- */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />

              {/* --- SOTTO-SEZIONE: STABILITÀ --- */}
              <div style={{ fontSize: '9px', color: '#888', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>🧠 Stabilità</div>
              <div className="content-container">
                {(() => {
                  const fullScaleGradient = `linear-gradient(90deg,
                              rgba(255, 0, 0, 1) 0%, rgba(255, 30, 0, 1) 11%, rgba(255, 80, 0, 1) 22%,
                              rgba(255, 140, 0, 1) 33%, rgba(255, 200, 0, 1) 44%, rgba(255, 255, 0, 1) 55%,
                              rgba(210, 255, 0, 1) 66%, rgba(150, 255, 0, 1) 77%, rgba(0, 255, 0, 1) 88%,
                              rgba(0, 255, 100, 1) 100%)`;
                  const valHome = Number(homeAff || 0);
                  const valAway = Number(awayAff || 0);
                  const colHome = getTrendColor(valHome);
                  const shadHome = colHome.replace(', 1)', ', 0.2)');
                  const colAway = getTrendColor(valAway);
                  const shadAway = colAway.replace(', 1)', ', 0.2)');
                  return (
                    <>
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.home}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar home" style={{ width: `${valHome}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${valHome > 0 ? (10000 / valHome) : 100}% 100%`, boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadHome}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage home" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colHome, textShadow: `0 0 8px ${shadHome}` }}>{valHome}%</span>
                      </div>
                      <div className="team-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="team-name" style={{ width: '30%', fontWeight: 'bold' }}>{selectedMatch?.away}</span>
                        <div className="progress-bar-container" style={{ flex: 1, height: '3px', backgroundColor: '#333', borderRadius: '3px', margin: '0 10px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{ width: `${valAway}%`, height: '100%', borderRadius: '3px', backgroundImage: fullScaleGradient, backgroundSize: `${valAway > 0 ? (10000 / valAway) : 100}% 100%`, boxShadow: `0 0 5px ${colAway}, 0 0 10px ${shadAway}`, transition: 'width 0.5s ease-in-out' }} />
                        </div>
                        <span className="team-percentage away" style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: colAway, textShadow: `0 0 8px ${shadAway}` }}>{valAway}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 6. FORMA A.L.1 INDEX */}
            <div className="card-forma" style={styles.card}>
              <div className="header-title">⚡ FORMA A.L.1 INDEX</div>
              <div className="content-container">
                {(() => {
                  const valHome = Number(selectedMatch?.h2h_data?.lucifero_home || 0);
                  const valAway = Number(selectedMatch?.h2h_data?.lucifero_away || 0);
                  const pctHome = Math.min((valHome / 25) * 100, 100);
                  const pctAway = Math.min((valAway / 25) * 100, 100);
                  const fullScaleGradient = `linear-gradient(90deg,
                                rgba(255, 0, 0, 1) 0%, rgba(255, 30, 0, 1) 11%, rgba(255, 80, 0, 1) 22%,
                                rgba(255, 140, 0, 1) 33%, rgba(255, 200, 0, 1) 44%, rgba(255, 255, 0, 1) 55%,
                                rgba(210, 255, 0, 1) 66%, rgba(150, 255, 0, 1) 77%, rgba(0, 255, 0, 1) 88%,
                                rgba(0, 255, 100, 1) 100%)`;
                  const colHome = getTrendColor(pctHome);
                  const colAway = getTrendColor(pctAway);
                  const shadowHome = colHome.replace(', 1)', ', 0.2)');
                  const shadowAway = colAway.replace(', 1)', ', 0.2)');
                  return (
                    <>
                      <div className="team-row">
                        <div className="team-name">{selectedMatch?.home}</div>
                        <div className="team-value" style={{ color: colHome, textShadow: `0 0 10px ${shadowHome}`, fontWeight: 'bold' }}>
                          {valHome.toFixed(1)}
                        </div>
                      </div>
                      <div className="progress-bar-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                        <div className="progress-bar home" style={{
                          width: `${pctHome}%`, height: '100%', borderRadius: '3px',
                          backgroundImage: fullScaleGradient,
                          backgroundSize: `${pctHome > 0 ? (10000 / pctHome) : 100}% 100%`,
                          boxShadow: `0 0 5px ${colHome}, 0 0 10px ${shadowHome}`
                        }} />
                      </div>
                      <div className="away-section" style={{ marginTop: '10px' }}>
                        <div className="team-row">
                          <div className="team-name">{selectedMatch?.away}</div>
                          <div className="team-value" style={{ color: colAway, textShadow: `0 0 10px ${shadowAway}`, fontWeight: 'bold' }}>
                            {valAway.toFixed(1)}
                          </div>
                        </div>
                        <div className="progress-bar-container" style={{ height: '3px', backgroundColor: '#333', borderRadius: '3px', overflow: 'visible' }}>
                          <div className="progress-bar away" style={{
                            width: `${pctAway}%`, height: '100%', borderRadius: '3px',
                            backgroundImage: fullScaleGradient,
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

            {/* 7. GAUGE - ANALISI PRE-PARTITA */}
            <div className="card-gauge" style={styles.card}>
              <div className="header-title" style={{
                fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px',
                textTransform: 'uppercase' as const, textAlign: 'center',
                color: 'rgba(255,255,255,0.5)', marginBottom: '5px',
                borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '5px'
              }}>
                ANALISI PRE-PARTITA
              </div>
              <div style={{
                display: 'flex',
                gap: '5px',
                justifyContent: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                width: '100%'
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' as const }}>SEGNO</div>
                  {predictionData ? renderGaugeSegno() : (
                    <div style={{ fontSize: '10px', color: theme.textDim, padding: '30px 0', textAlign: 'center' }}>
                      Dati non disponibili
                    </div>
                  )}
                </div>
                <div style={{ width: '1px', height: '80px', background: 'rgba(255,255,255,0.08)', display: isMobile ? 'none' : 'block' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' as const }}>GOL</div>
                  {predictionData ? renderGaugeGol() : (
                    <div style={{ fontSize: '10px', color: theme.textDim, padding: '30px 0', textAlign: 'center' }}>
                      Dati non disponibili
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* === COLONNA DESTRA: ANALISI COMPETITIVA VALORI CORE === */}
          <div className="colonna-destra-analisi">

            {/* 1. DNA SYSTEM */}
            <div className="riga-orizzontale-bottom">

              {/* DNA SYSTEM */}
                <div className="card-dna" style={{
                  ...styles.card,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 240, 255, 0.1)',
                  marginTop: '0',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div className="header-section" style={{
                    marginBottom: isMobile ? '20px' : '-15px',
                    marginTop: isMobile ? '15px' : '15px',
                    position: 'relative',
                    height: isMobile ? '70px' : '60px',
                    paddingTop: isMobile ? '30px' : '10px'
                  }}>
                    <div className="header-title" style={{
                      fontSize: '10px',
                      opacity: 0.8,
                      position: isMobile ? 'absolute' : 'relative',
                      top: isMobile ? '-20px' : '-25px',
                      left: isMobile ? '-5px' : '0',
                      right: isMobile ? '12px' : 'auto',
                      marginTop: isMobile ? '0' : '5px',
                      zIndex: 10
                    }}>
                      🕸️ DNA SYSTEM
                    </div>
                  


                  {/* Container Legenda - Altezza fissa per non spingere il grafico */}
                  {/* Container Legenda INTERATTIVA */}
                  <div className="legend-container" style={{ display: 'flex', gap: '20px', height: '30px', alignItems: 'flex-end', position: 'relative', zIndex: 10, top: isMobile ? '0' : '-10px' }}>

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
                          <div style={{ width: `${Math.round(homeRadar.reduce((a, b) => a + b, 0) / 5)}%`, height: '100%', backgroundColor: theme.cyan, boxShadow: `0 0 5px ${theme.cyan}` }}></div>
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
                          <div style={{ width: `${Math.round(awayRadar.reduce((a, b) => a + b, 0) / 5)}%`, height: '100%', backgroundColor: theme.danger, boxShadow: `0 0 5px ${theme.danger}` }}></div>
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
                <div className="radar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0px', padding: '0px', marginTop: isMobile ? '0' : '15px' }}>
                  <div style={isMobile ? { display: 'contents' } : {
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '10px',
                    padding: '10px 10px 0 10px',
                    marginLeft: '0px',
                    marginRight: '15px',
                    marginBottom: '8px',
                    width: '100%',
                    height: '240px',
                    overflow: 'visible',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    boxSizing: 'border-box'
                  }}>
                  <svg width={isMobile ? 250 : 260} height={isMobile ? 250 : 260} viewBox="9 11 105 105">
                    {/* Griglie di sfondo */}
                    {drawPentagonGrid(45, 0.5)} {drawPentagonGrid(30, 0.2)} {drawPentagonGrid(15, 0.2)} {drawPentagonAxes()}

                    {/* Etichette fisse (ATT, TEC...) - Le lasciamo non interattive qui, usiamo i punti */}
                    <text x="60" y="13" fontSize="5" fill="#aaa" textAnchor="middle">ATT</text>
                    <text x="105" y="50" fontSize="5" fill="#aaa" textAnchor="start">TEC</text>
                    <text x="88" y="102" fontSize="5" fill="#aaa" textAnchor="start">DIF</text>
                    <text x="32" y="102" fontSize="5" fill="#aaa" textAnchor="end">VAL</text>
                    <text x="15" y="50" fontSize="5" fill="#aaa" textAnchor="end">FRM</text>

                    {/* LOGICA DI VISUALIZZAZIONE CONDIZIONALE */}
                    {(radarFocus === 'all' || radarFocus === 'home') && drawPentagramRadar(homeRadar, theme.cyan,)}
                    {(radarFocus === 'all' || radarFocus === 'away') && drawPentagramRadar(awayRadar, theme.danger,)}

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
              </div>

            </div>

            {/* 2. BIAS C.O.R.E. */}
            <div className="card-bias-core" style={{ ...styles.card, marginTop: isMobile ? '0' : '-5px' }}>
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

            {/* 3. STRISCE (Curva a Campana) — Design Barre + Badge */}
            <div className="card-strisce" style={styles.card}>
              <div className="header-title" style={{ fontSize: '11px', color: '#ff9800', fontWeight: 'bold', letterSpacing: '2px', borderBottom: '1px solid rgba(255, 152, 0, 0.2)', paddingBottom: '5px', marginBottom: '8px' }}>
                STRISCE
              </div>
              {streakLoading ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px 10px', fontSize: '11px' }}>
                  Caricamento...
                </div>
              ) : !streakData ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px 10px', fontSize: '11px' }}>
                  <div style={{ color: '#888' }}>Nessun dato disponibile</div>
                </div>
              ) : (() => {
                const anyActive = ALL_STREAK_TYPES.some(t => (streakData.streak_home?.[t] ?? 0) >= 2 || (streakData.streak_away?.[t] ?? 0) >= 2);
                if (!anyActive) return (
                  <div style={{ textAlign: 'center', color: '#666', padding: '15px 10px', fontSize: '11px' }}>
                    Nessuna striscia attiva
                  </div>
                );

                const STREAK_ICONS: Record<string, string> = {
                  vittorie: '\u{1F3C6}', sconfitte: '\u{1F4C9}', imbattibilita: '\u{1F6E1}\u{FE0F}',
                  pareggi: '\u{1F91D}', senza_vittorie: '\u26D4',
                  over25: '\u26BD', under25: '\u{1F512}',
                  gg: '\u{1F3AF}', clean_sheet: '\u{1F9E4}', senza_segnare: '\u{1F6AB}', gol_subiti: '\u{1F4A5}',
                };
                const SHORT_LABELS: Record<string, string> = {
                  vittorie: 'Vittorie', sconfitte: 'Sconfitte', imbattibilita: 'Imbattibilit\u00e0',
                  pareggi: 'Pareggi', senza_vittorie: 'No vittorie',
                  over25: 'Over 2.5', under25: 'Under 2.5',
                  gg: 'GG', clean_sheet: 'Clean sheet', senza_segnare: 'No gol', gol_subiti: 'Gol subiti',
                };
                const MAX_BAR = 10;
                const marketColors: Record<string, string> = { '1X2': theme.cyan, 'O/U': '#ff9800', 'GG': '#e040fb' };

                const renderStreakBar = (n: number, curveVal: number, teamColor: string) => {
                  if (n < 2) return <span style={{ color: theme.textDim, fontSize: '10px', opacity: 0.3 }}>{'\u2014'}</span>;
                  const pct = Math.min((n / MAX_BAR) * 100, 100);
                  const isPos = curveVal > 0;
                  const isNeg = curveVal < 0;
                  const barFill = isPos ? theme.success : isNeg ? theme.danger : '#555';
                  const barBg = isPos ? 'rgba(0,255,136,0.08)' : isNeg ? 'rgba(255,68,68,0.08)' : 'rgba(136,136,136,0.08)';
                  const glow = isPos ? `0 0 6px rgba(0,255,136,0.4)` : isNeg ? `0 0 6px rgba(255,68,68,0.4)` : 'none';
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ flex: 1, height: '5px', borderRadius: '3px', backgroundColor: barBg, overflow: 'hidden', minWidth: '25px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', backgroundColor: barFill, boxShadow: glow, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: teamColor, minWidth: '14px', textAlign: 'right' }}>{n}</span>
                      {curveVal !== 0 ? (
                        <span style={{
                          fontSize: '7px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '6px', minWidth: '18px', textAlign: 'center',
                          backgroundColor: isPos ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,68,0.15)',
                          color: isPos ? theme.success : theme.danger,
                          border: `1px solid ${isPos ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)'}`,
                        }}>
                          {curveVal > 0 ? '+' : ''}{curveVal}
                        </span>
                      ) : (
                        <span style={{ fontSize: '7px', color: theme.textDim, minWidth: '18px', textAlign: 'center', opacity: 0.4 }}>0</span>
                      )}
                    </div>
                  );
                };

                return (
                  <div>
                    {/* Header squadre */}
                    <div style={{ display: 'flex', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: '0 0 85px' }} />
                      <div style={{ flex: 1, textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: theme.cyan, letterSpacing: '0.5px' }}>
                        {selectedMatch?.home?.substring(0, 12)}
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: theme.purple, letterSpacing: '0.5px' }}>
                        {selectedMatch?.away?.substring(0, 12)}
                      </div>
                    </div>

                    {/* Gruppi per mercato */}
                    {MARKET_GROUPS.map(([mLabel, mTypes]) => {
                      const activeTypes = mTypes.filter(t => (streakData.streak_home?.[t] ?? 0) >= 2 || (streakData.streak_away?.[t] ?? 0) >= 2);
                      if (activeTypes.length === 0) return null;
                      const mColor = marketColors[mLabel] || theme.textDim;
                      const hImpact = mTypes.reduce((s, t) => s + ((streakData.streak_home?.[t] ?? 0) >= 2 ? getCurveVal(t, streakData.streak_home?.[t] ?? 0) : 0), 0);
                      const aImpact = mTypes.reduce((s, t) => s + ((streakData.streak_away?.[t] ?? 0) >= 2 ? getCurveVal(t, streakData.streak_away?.[t] ?? 0) : 0), 0);

                      return (
                        <div key={mLabel} style={{ marginBottom: '6px' }}>
                          {/* Market header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '8px', fontWeight: 'bold', color: mColor, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>{mLabel}</span>
                            <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${mColor}30, transparent)` }} />
                          </div>

                          {/* Streak rows */}
                          {activeTypes.map(type => {
                            const hN = streakData.streak_home?.[type] ?? 0;
                            const aN = streakData.streak_away?.[type] ?? 0;
                            return (
                              <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', gap: '4px' }}>
                                <div style={{ flex: '0 0 85px', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
                                  <span style={{ fontSize: '10px', lineHeight: 1 }}>{STREAK_ICONS[type]}</span>
                                  <span style={{ fontSize: '9px', color: theme.textDim, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' as const }}>{SHORT_LABELS[type]}</span>
                                </div>
                                <div style={{ flex: 1 }}>{renderStreakBar(hN, getCurveVal(type, hN), theme.cyan)}</div>
                                <div style={{ flex: 1 }}>{renderStreakBar(aN, getCurveVal(type, aN), theme.purple)}</div>
                              </div>
                            );
                          })}

                          {/* Market impact summary */}
                          {(hImpact !== 0 || aImpact !== 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', padding: '3px 0 1px', marginTop: '1px', borderTop: `1px solid ${mColor}12` }}>
                              <div style={{ flex: '0 0 85px', fontSize: '7px', color: mColor, fontWeight: 'bold', letterSpacing: '0.5px' }}>IMPATTO</div>
                              <div style={{ flex: 1, textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px',
                                  color: hImpact > 0 ? theme.success : hImpact < 0 ? theme.danger : theme.textDim,
                                  backgroundColor: hImpact > 0 ? 'rgba(0,255,136,0.08)' : hImpact < 0 ? 'rgba(255,68,68,0.08)' : 'transparent',
                                }}>
                                  {hImpact > 0 ? '+' : ''}{hImpact}
                                </span>
                              </div>
                              <div style={{ flex: 1, textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px',
                                  color: aImpact > 0 ? theme.success : aImpact < 0 ? theme.danger : theme.textDim,
                                  backgroundColor: aImpact > 0 ? 'rgba(0,255,136,0.08)' : aImpact < 0 ? 'rgba(255,68,68,0.08)' : 'transparent',
                                }}>
                                  {aImpact > 0 ? '+' : ''}{aImpact}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* ═══ SEZIONE CONTESTO CASA/TRASFERTA ═══ */}
                    {(() => {
                      const ctxHome = streakData.streak_home_context;
                      const ctxAway = streakData.streak_away_context;
                      const anyCtx = ALL_STREAK_TYPES.some(t => (ctxHome?.[t] ?? 0) >= 2 || (ctxAway?.[t] ?? 0) >= 2);
                      if (!anyCtx) return null;
                      return (
                        <>
                          {/* Divider */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0 6px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,152,0,0.3), transparent)' }} />
                            <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#ff9800', letterSpacing: '1.5px' }}>CONTESTO</span>
                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,152,0,0.3), transparent)' }} />
                          </div>
                          <div style={{ fontSize: '8px', color: theme.textDim, textAlign: 'center', marginBottom: '6px', opacity: 0.6 }}>
                            Solo partite in casa / Solo trasferte
                          </div>

                          {/* Header squadre contesto */}
                          <div style={{ display: 'flex', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: '0 0 85px' }} />
                            <div style={{ flex: 1, textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: theme.cyan, opacity: 0.8 }}>
                              {selectedMatch?.home?.substring(0, 10)} (C)
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: theme.purple, opacity: 0.8 }}>
                              {selectedMatch?.away?.substring(0, 10)} (T)
                            </div>
                          </div>

                          {/* Gruppi per mercato — contesto */}
                          {MARKET_GROUPS.map(([mLabel, mTypes]) => {
                            const activeCtx = mTypes.filter(t => (ctxHome?.[t] ?? 0) >= 2 || (ctxAway?.[t] ?? 0) >= 2);
                            if (activeCtx.length === 0) return null;
                            const mColor = marketColors[mLabel] || theme.textDim;
                            return (
                              <div key={`ctx_${mLabel}`} style={{ marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: mColor, letterSpacing: '1.5px', opacity: 0.7 }}>{mLabel}</span>
                                  <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${mColor}20, transparent)` }} />
                                </div>
                                {activeCtx.map(type => {
                                  const hN = ctxHome?.[type] ?? 0;
                                  const aN = ctxAway?.[type] ?? 0;
                                  return (
                                    <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '2px 0', gap: '4px' }}>
                                      <div style={{ flex: '0 0 85px', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '10px', lineHeight: 1 }}>{STREAK_ICONS[type]}</span>
                                        <span style={{ fontSize: '9px', color: theme.textDim, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' as const }}>{SHORT_LABELS[type]}</span>
                                      </div>
                                      <div style={{ flex: 1 }}>{renderStreakBar(hN, getCurveVal(type, hN), theme.cyan)}</div>
                                      <div style={{ flex: 1 }}>{renderStreakBar(aN, getCurveVal(type, aN), theme.purple)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

    );
}
