import { useState, useEffect } from 'react';
import { API_BASE } from './AppDev/costanti';
const STATS_RE_BASE = `${API_BASE}/admin/stats-re-multifonte`;

/* =========================================================================
   STATS RE MULTIFONTE — ADMIN DASHBOARD (React port)
   - Tutti i dati sotto sono MOCK. Ogni blocco MOCK e' preceduto da un commento
     "=== DATI MOCK — DA SOSTITUIRE CON FETCH ... ===" cosi' e' facile collegare
     le API reali.
   - Conversione 1:1 dal mockup HTML originale (StatsReMultifonte.html),
     con state React invece del DOM diretto.
   ========================================================================= */

interface StatsReMultifonteProps {
  onBack?: () => void;
}

/* ---------- COSTANTI: 7 FONTI ---------- */
const SOURCES = [
  { id: 'scout_lite',       label: 'Scout LITE',        color: '#00d4ff' },
  { id: 'scout_deep',       label: 'Scout DEEP',        color: '#38bdf8' },
  { id: 'mistral_f1',       label: 'Mistral F1',        color: '#a855f7' },
  { id: 'mistral_f2',       label: 'Mistral F2',        color: '#c084fc' },
  { id: 'monte_carlo',      label: 'Monte Carlo',       color: '#34d399' },
  { id: 'pme',              label: 'PME',               color: '#fbbf24' },
  { id: 'risultato_esatto', label: 'Risultato Esatto',  color: '#f87171' },
] as const;

const SOURCE_BY_ID: Record<string, { id: string; label: string; color: string }> = Object.fromEntries(
  SOURCES.map(s => [s.id, s])
);

/* =====================================================================
   === DATI MOCK — DA SOSTITUIRE CON FETCH /api/stats-re-multifonte/matches ===
   ===================================================================== */
interface MatchSource { top3: string[]; pos: number | null; }
interface MockMatch {
  id: string; date: string; country: string; league: string;
  home: string; away: string; real: string; quota: number;
  sources: Record<string, MatchSource>;
}
const MOCK_MATCHES: MockMatch[] = [
  { id:'m01', date:'2026-05-21', country:'Italia', league:'Serie A', home:'Inter', away:'Lazio', real:'2-1', quota:1.72,
    sources:{ scout_lite:{top3:['2-1','2-0','1-0'],pos:1}, scout_deep:{top3:['2-1','3-1','2-0'],pos:1}, mistral_f1:{top3:['1-1','2-1','0-1'],pos:2}, mistral_f2:{top3:['2-1','1-0','3-1'],pos:1}, monte_carlo:{top3:['2-1','1-1','2-0'],pos:1}, pme:{top3:['2-0','2-1','3-1'],pos:2}, risultato_esatto:{top3:['2-1','1-0','2-0'],pos:1} } },
  { id:'m02', date:'2026-05-21', country:'Italia', league:'Serie A', home:'Juventus', away:'Roma', real:'1-1', quota:2.05,
    sources:{ scout_lite:{top3:['2-1','1-1','2-0'],pos:2}, scout_deep:{top3:['1-1','2-1','1-0'],pos:1}, mistral_f1:{top3:['2-0','1-1','2-1'],pos:2}, mistral_f2:{top3:['1-1','2-1','0-0'],pos:1}, monte_carlo:{top3:['1-1','2-1','1-0'],pos:1}, pme:{top3:['2-1','1-0','2-0'],pos:null}, risultato_esatto:{top3:['1-1','2-1','1-0'],pos:1} } },
  { id:'m03', date:'2026-05-20', country:'Italia', league:'Serie A', home:'Atalanta', away:'Napoli', real:'0-0', quota:2.30,
    sources:{ scout_lite:{top3:['1-1','2-1','1-0'],pos:null}, scout_deep:{top3:['0-0','1-1','1-0'],pos:1}, mistral_f1:{top3:['1-1','1-0','0-1'],pos:null}, mistral_f2:{top3:['1-1','0-0','1-0'],pos:2}, monte_carlo:{top3:['0-0','1-1','1-0'],pos:1}, pme:{top3:['1-0','1-1','0-0'],pos:3}, risultato_esatto:{top3:['1-1','0-0','2-1'],pos:2} } },
  { id:'m04', date:'2026-05-20', country:'Italia', league:'Serie A', home:'Milan', away:'Fiorentina', real:'2-1', quota:1.85,
    sources:{ scout_lite:{top3:['2-1','3-1','2-0'],pos:1}, scout_deep:{top3:['2-1','1-0','3-1'],pos:1}, mistral_f1:{top3:['1-0','2-0','2-1'],pos:3}, mistral_f2:{top3:['2-1','1-1','2-0'],pos:1}, monte_carlo:{top3:['2-1','2-0','1-1'],pos:1}, pme:{top3:['2-0','2-1','3-1'],pos:2}, risultato_esatto:{top3:['2-0','2-1','1-0'],pos:2} } },
  { id:'m05', date:'2026-05-19', country:'Italia', league:'Serie A', home:'Bologna', away:'Torino', real:'1-0', quota:2.15,
    sources:{ scout_lite:{top3:['1-0','2-0','1-1'],pos:1}, scout_deep:{top3:['1-1','1-0','2-1'],pos:2}, mistral_f1:{top3:['1-1','0-0','1-0'],pos:3}, mistral_f2:{top3:['1-0','1-1','2-1'],pos:1}, monte_carlo:{top3:['1-0','1-1','2-1'],pos:1}, pme:{top3:['1-0','2-1','1-1'],pos:1}, risultato_esatto:{top3:['1-1','1-0','2-0'],pos:2} } },
  { id:'m06', date:'2026-05-18', country:'Italia', league:'Serie A', home:'Lazio', away:'Verona', real:'3-1', quota:1.55,
    sources:{ scout_lite:{top3:['2-0','2-1','3-1'],pos:3}, scout_deep:{top3:['2-1','3-1','2-0'],pos:2}, mistral_f1:{top3:['2-0','1-0','2-1'],pos:null}, mistral_f2:{top3:['2-1','3-1','3-0'],pos:2}, monte_carlo:{top3:['2-0','3-1','2-1'],pos:2}, pme:{top3:['2-1','2-0','3-1'],pos:3}, risultato_esatto:{top3:['2-0','2-1','3-1'],pos:3} } },
  { id:'m07', date:'2026-05-17', country:'Italia', league:'Serie A', home:'Inter', away:'Genoa', real:'4-0', quota:1.32,
    sources:{ scout_lite:{top3:['2-0','3-0','3-1'],pos:null}, scout_deep:{top3:['3-0','2-0','4-0'],pos:3}, mistral_f1:{top3:['2-0','1-0','3-0'],pos:null}, mistral_f2:{top3:['3-0','2-0','4-0'],pos:3}, monte_carlo:{top3:['3-0','2-0','4-1'],pos:null}, pme:{top3:['3-0','4-0','2-1'],pos:2}, risultato_esatto:{top3:['3-0','2-1','2-0'],pos:null} } },
  { id:'m08', date:'2026-05-17', country:'Italia', league:'Serie A', home:'Roma', away:'Empoli', real:'2-0', quota:1.62,
    sources:{ scout_lite:{top3:['2-0','2-1','3-0'],pos:1}, scout_deep:{top3:['2-1','2-0','1-0'],pos:2}, mistral_f1:{top3:['2-1','2-0','1-0'],pos:2}, mistral_f2:{top3:['2-0','1-0','3-1'],pos:1}, monte_carlo:{top3:['2-0','2-1','1-0'],pos:1}, pme:{top3:['2-1','2-0','3-1'],pos:2}, risultato_esatto:{top3:['2-1','2-0','1-0'],pos:2} } },
  { id:'m09', date:'2026-05-16', country:'Italia', league:'Serie A', home:'Napoli', away:'Sassuolo', real:'2-1', quota:1.48,
    sources:{ scout_lite:{top3:['2-1','3-1','2-0'],pos:1}, scout_deep:{top3:['2-1','2-0','3-1'],pos:1}, mistral_f1:{top3:['2-0','3-0','2-1'],pos:3}, mistral_f2:{top3:['2-1','2-0','3-0'],pos:1}, monte_carlo:{top3:['2-1','2-0','3-1'],pos:1}, pme:{top3:['2-1','3-1','1-0'],pos:1}, risultato_esatto:{top3:['2-0','2-1','3-1'],pos:2} } },
  { id:'m10', date:'2026-05-15', country:'Italia', league:'Serie A', home:'Fiorentina', away:'Cagliari', real:'1-1', quota:1.92,
    sources:{ scout_lite:{top3:['2-0','2-1','1-1'],pos:3}, scout_deep:{top3:['1-1','2-1','2-0'],pos:1}, mistral_f1:{top3:['2-0','2-1','1-1'],pos:3}, mistral_f2:{top3:['1-1','2-1','1-0'],pos:1}, monte_carlo:{top3:['1-1','2-1','2-0'],pos:1}, pme:{top3:['2-1','1-1','2-0'],pos:2}, risultato_esatto:{top3:['1-1','2-1','2-0'],pos:1} } },
  { id:'m11', date:'2026-05-15', country:'Italia', league:'Serie A', home:'Atalanta', away:'Lecce', real:'3-0', quota:1.42,
    sources:{ scout_lite:{top3:['2-0','3-0','3-1'],pos:2}, scout_deep:{top3:['3-0','2-0','4-0'],pos:1}, mistral_f1:{top3:['2-0','2-1','3-1'],pos:null}, mistral_f2:{top3:['2-0','3-0','3-1'],pos:2}, monte_carlo:{top3:['3-0','2-0','3-1'],pos:1}, pme:{top3:['3-1','2-0','3-0'],pos:3}, risultato_esatto:{top3:['2-0','3-0','2-1'],pos:2} } },
  { id:'m12', date:'2026-05-14', country:'Italia', league:'Serie A', home:'Juventus', away:'Monza', real:'2-0', quota:1.38,
    sources:{ scout_lite:{top3:['2-0','3-0','2-1'],pos:1}, scout_deep:{top3:['2-0','2-1','3-0'],pos:1}, mistral_f1:{top3:['2-1','1-0','2-0'],pos:3}, mistral_f2:{top3:['2-0','3-0','2-1'],pos:1}, monte_carlo:{top3:['2-0','2-1','3-0'],pos:1}, pme:{top3:['2-0','3-0','2-1'],pos:1}, risultato_esatto:{top3:['2-1','2-0','1-0'],pos:2} } },
  { id:'m13', date:'2026-05-13', country:'Italia', league:'Serie A', home:'Milan', away:'Inter', real:'1-2', quota:2.45,
    sources:{ scout_lite:{top3:['1-1','2-1','1-2'],pos:3}, scout_deep:{top3:['1-2','2-2','1-1'],pos:1}, mistral_f1:{top3:['1-1','2-1','2-2'],pos:null}, mistral_f2:{top3:['1-2','1-1','0-1'],pos:1}, monte_carlo:{top3:['1-1','1-2','2-2'],pos:2}, pme:{top3:['2-1','1-1','0-1'],pos:null}, risultato_esatto:{top3:['1-1','1-2','2-1'],pos:2} } },
  { id:'m14', date:'2026-05-12', country:'Italia', league:'Serie A', home:'Bologna', away:'Roma', real:'2-2', quota:2.10,
    sources:{ scout_lite:{top3:['1-1','2-1','1-2'],pos:null}, scout_deep:{top3:['1-1','2-2','2-1'],pos:2}, mistral_f1:{top3:['1-1','1-2','2-2'],pos:3}, mistral_f2:{top3:['2-2','1-1','2-1'],pos:1}, monte_carlo:{top3:['2-2','1-1','2-1'],pos:1}, pme:{top3:['1-1','2-1','2-2'],pos:3}, risultato_esatto:{top3:['1-1','2-1','2-2'],pos:3} } },
  { id:'m15', date:'2026-05-11', country:'Italia', league:'Serie A', home:'Napoli', away:'Inter', real:'1-1', quota:2.20,
    sources:{ scout_lite:{top3:['1-1','2-1','1-2'],pos:1}, scout_deep:{top3:['1-1','2-1','0-1'],pos:1}, mistral_f1:{top3:['2-1','1-1','2-0'],pos:2}, mistral_f2:{top3:['1-1','1-2','2-1'],pos:1}, monte_carlo:{top3:['1-1','2-1','1-2'],pos:1}, pme:{top3:['1-1','2-1','2-0'],pos:1}, risultato_esatto:{top3:['1-1','2-1','1-2'],pos:1} } },
  { id:'m16', date:'2026-05-10', country:'Italia', league:'Serie A', home:'Torino', away:'Lazio', real:'0-2', quota:2.85,
    sources:{ scout_lite:{top3:['1-1','1-2','0-1'],pos:null}, scout_deep:{top3:['0-1','1-1','0-2'],pos:3}, mistral_f1:{top3:['1-1','1-2','2-2'],pos:null}, mistral_f2:{top3:['0-2','1-1','0-1'],pos:1}, monte_carlo:{top3:['1-1','0-1','0-2'],pos:3}, pme:{top3:['1-1','1-2','0-1'],pos:null}, risultato_esatto:{top3:['1-1','0-1','1-2'],pos:null} } },
  { id:'m17', date:'2026-05-10', country:'Italia', league:'Serie A', home:'Verona', away:'Empoli', real:'1-1', quota:2.40,
    sources:{ scout_lite:{top3:['1-1','2-1','1-0'],pos:1}, scout_deep:{top3:['1-1','1-0','2-1'],pos:1}, mistral_f1:{top3:['1-0','1-1','0-0'],pos:2}, mistral_f2:{top3:['1-1','1-0','2-1'],pos:1}, monte_carlo:{top3:['1-1','1-0','2-1'],pos:1}, pme:{top3:['1-0','1-1','2-0'],pos:2}, risultato_esatto:{top3:['1-1','1-0','2-1'],pos:1} } },
  { id:'m18', date:'2026-05-09', country:'Italia', league:'Serie A', home:'Sassuolo', away:'Genoa', real:'2-1', quota:1.95,
    sources:{ scout_lite:{top3:['2-1','1-1','2-0'],pos:1}, scout_deep:{top3:['1-1','2-1','2-0'],pos:2}, mistral_f1:{top3:['2-0','1-1','2-1'],pos:3}, mistral_f2:{top3:['2-1','1-1','2-0'],pos:1}, monte_carlo:{top3:['2-1','1-1','1-0'],pos:1}, pme:{top3:['1-1','2-1','2-0'],pos:2}, risultato_esatto:{top3:['1-1','2-1','2-0'],pos:2} } },
];

/* =====================================================================
   === DATI MOCK — DA SOSTITUIRE CON FETCH /api/stats-re-multifonte/aggregate ===
   ===================================================================== */
interface SourceStats { matches: number; hit: number; pos1: number; pos2: number; pos3: number; miss: number; rate: number; }
const MOCK_GLOBAL_STATS: { total_matches: number; period: { from: string; to: string; days: number; countries: number; leagues: number }; sources: Record<string, SourceStats> } = {
  total_matches: 412,
  period: { from: '2026-03-01', to: '2026-05-22', days: 83, countries: 14, leagues: 38 },
  sources: {
    monte_carlo:      { matches: 412, hit: 176, pos1: 71, pos2: 58, pos3: 47, miss: 236, rate: 0.427 },
    risultato_esatto: { matches: 412, hit: 162, pos1: 68, pos2: 52, pos3: 42, miss: 250, rate: 0.393 },
    scout_deep:       { matches: 412, hit: 154, pos1: 63, pos2: 51, pos3: 40, miss: 258, rate: 0.374 },
    mistral_f2:       { matches: 412, hit: 142, pos1: 56, pos2: 49, pos3: 37, miss: 270, rate: 0.345 },
    pme:              { matches: 412, hit: 128, pos1: 49, pos2: 44, pos3: 35, miss: 284, rate: 0.311 },
    scout_lite:       { matches: 412, hit: 116, pos1: 41, pos2: 42, pos3: 33, miss: 296, rate: 0.282 },
    mistral_f1:       { matches: 412, hit:  88, pos1: 31, pos2: 30, pos3: 27, miss: 324, rate: 0.214 },
  }
};

/* =====================================================================
   === DATI MOCK — DA SOSTITUIRE CON FETCH /api/stats-re-multifonte/source/:id ===
   ===================================================================== */
interface CountryRow { country: string; n: number; rate: number; p1: number; p2: number; p3: number; }
interface LeagueRow { league: string; country: string; n: number; rate: number; }
interface WeeklyPoint { wk: string; v: number; }
const MOCK_SOURCE_DETAIL: Record<string, { by_country: CountryRow[]; by_league: LeagueRow[]; weekly: WeeklyPoint[] }> = {
  monte_carlo: {
    by_country: [
      { country: 'Italia',      n: 86, rate: 0.512, p1: 18, p2: 14, p3: 12 },
      { country: 'Inghilterra', n: 78, rate: 0.461, p1: 15, p2: 13, p3:  8 },
      { country: 'Spagna',      n: 64, rate: 0.437, p1: 12, p2:  9, p3:  7 },
      { country: 'Germania',    n: 58, rate: 0.379, p1:  9, p2:  8, p3:  5 },
      { country: 'Francia',     n: 46, rate: 0.391, p1:  8, p2:  6, p3:  4 },
      { country: 'Portogallo',  n: 28, rate: 0.357, p1:  4, p2:  3, p3:  3 },
      { country: 'Olanda',      n: 22, rate: 0.318, p1:  3, p2:  2, p3:  2 },
      { country: 'Belgio',      n: 18, rate: 0.278, p1:  2, p2:  2, p3:  1 },
    ],
    by_league: [
      { league: 'Serie A',         country: 'Italia',      n: 52, rate: 0.538 },
      { league: 'Premier League',  country: 'Inghilterra', n: 48, rate: 0.479 },
      { league: 'LaLiga',          country: 'Spagna',      n: 44, rate: 0.455 },
      { league: 'Bundesliga',      country: 'Germania',    n: 38, rate: 0.395 },
      { league: 'Ligue 1',         country: 'Francia',     n: 32, rate: 0.406 },
      { league: 'Serie B',         country: 'Italia',      n: 34, rate: 0.471 },
      { league: 'Championship',    country: 'Inghilterra', n: 30, rate: 0.433 },
      { league: 'Eredivisie',      country: 'Olanda',      n: 22, rate: 0.318 },
      { league: 'Primeira Liga',   country: 'Portogallo',  n: 18, rate: 0.389 },
      { league: 'Jupiler Pro',     country: 'Belgio',      n: 14, rate: 0.286 },
    ],
    weekly: [
      { wk: 'W11', v: 0.31 }, { wk: 'W12', v: 0.36 }, { wk: 'W13', v: 0.41 }, { wk: 'W14', v: 0.38 },
      { wk: 'W15', v: 0.44 }, { wk: 'W16', v: 0.39 }, { wk: 'W17', v: 0.47 }, { wk: 'W18', v: 0.43 },
      { wk: 'W19', v: 0.49 }, { wk: 'W20', v: 0.45 }, { wk: 'W21', v: 0.52 }, { wk: 'W22', v: 0.46 },
    ]
  }
};

/* =====================================================================
   === DATI MOCK — DA SOSTITUIRE CON STATO DEL PATTERN BUILDER (filtri attivi) ===
   ===================================================================== */
interface ActiveFilter {
  id: string; group: 'sources' | 'time' | 'match'; type: string;
  source?: string; pos?: number | 'miss'; cls?: string;
  label: string; op: string; value: string;
  range?: { min: number; max: number; scaleMin: number; scaleMax: number };
}
const MOCK_ACTIVE_FILTERS: ActiveFilter[] = [
  { id:'f1', group:'sources', type:'src_pos', source:'scout_lite',  pos:1,    cls:'pos1', label:'Scout LITE',   op:'=', value:'hit 1°' },
  { id:'f2', group:'sources', type:'src_hit', source:'mistral_f2',             cls:'hit',  label:'Mistral F2',   op:'=', value:'hit (1°-3°)' },
  { id:'f3', group:'sources', type:'src_pos', source:'monte_carlo', pos:'miss',cls:'miss', label:'Monte Carlo',  op:'=', value:'miss' },
  { id:'f4', group:'time',  type:'date_range', label:'Range data',   op:'=', value:'ultimi 30 gg' },
  { id:'f5', group:'time',  type:'country',    label:'Paese',         op:'=', value:'Italia' },
  { id:'f6', group:'time',  type:'league',     label:'Lega',          op:'=', value:'Serie A' },
  { id:'f7', group:'match', type:'sources_hit_count', label:'Fonti hit', op:'≥', value:'3' },
  { id:'f8', group:'match', type:'quota_range',       label:'Quota home', op:'∈', value:'1.50 – 2.50', range: { min: 1.50, max: 2.50, scaleMin: 1.0, scaleMax: 6.0 } },
];

/* =========================================================================
   UTILS
   ========================================================================= */
const pct = (n: number, digits = 1) => (n * 100).toFixed(digits) + '%';
const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${d} ${MONTHS[parseInt(m, 10) - 1]}`;
};

/* =========================================================================
   STYLES (inline CSS via styled-jsx-like <style>)
   ========================================================================= */
const STYLES = `
:root {
  --bg:            #0a0e14;
  --bg-elev-1:    #0f141c;
  --bg-elev-2:    #141a24;
  --bg-elev-3:    #1a2230;
  --border:        #1f2937;
  --border-strong: #2a3648;
  --text:          #e5edf5;
  --text-dim:      #8a96a8;
  --text-mute:     #5a6578;
  --cyan:          #00d4ff;
  --cyan-dim:      #00a2c4;
  --purple:        #a855f7;
  --purple-dim:    #7c3aed;
  --green:         #34d399;
  --amber:         #fbbf24;
  --red:           #f87171;
  --pos1:          #34d399;
  --pos2:          #00d4ff;
  --pos3:          #a855f7;
  --miss:          #4b5563;
  --grad: linear-gradient(135deg, #00d4ff 0%, #a855f7 100%);
  --grad-soft: linear-gradient(135deg, rgba(0,212,255,.18) 0%, rgba(168,85,247,.18) 100%);
  --font-sans: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Menlo", "Consolas", monospace;
}
.srm * { box-sizing: border-box; }
.srm { background: var(--bg); color: var(--text); font-family: var(--font-sans); font-size: 14px; line-height: 1.45; min-height: 100vh; -webkit-font-smoothing: antialiased; }
.srm a { color: inherit; }
.srm button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.srm ::selection { background: rgba(0,212,255,.35); }
.srm .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.srm .app { max-width: 1440px; margin: 0 auto; padding: 24px 28px 64px; }
.srm .topbar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18px; border-bottom: 1px solid var(--border); margin-bottom: 22px; }
.srm .brand { display: flex; align-items: center; gap: 14px; }
.srm .brand-mark { width: 36px; height: 36px; border-radius: 9px; background: var(--grad); display: grid; place-items: center; color: #08111a; font-weight: 800; font-family: var(--font-mono); font-size: 15px; box-shadow: 0 0 0 1px rgba(0,212,255,.25), 0 6px 20px -8px rgba(0,212,255,.5); }
.srm .brand-title { font-size: 18px; font-weight: 600; letter-spacing: -.01em; }
.srm .brand-sub { font-size: 11px; color: var(--text-dim); margin-top: 1px; letter-spacing: .04em; text-transform: uppercase; }
.srm .brand-meta { display: flex; flex-direction: column; }
.srm .topbar-right { display: flex; align-items: center; gap: 10px; }
.srm .pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: var(--bg-elev-2); border: 1px solid var(--border); font-size: 11px; color: var(--text-dim); }
.srm .pill.admin { color: var(--purple); border-color: rgba(168,85,247,.35); background: rgba(168,85,247,.08); }
.srm .pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.srm .icon-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--bg-elev-2); border: 1px solid var(--border); display: grid; place-items: center; color: var(--text-dim); }
.srm .icon-btn:hover { color: var(--text); border-color: var(--border-strong); }
.srm .tabs { display: flex; gap: 4px; background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 22px; }
.srm .tab-btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--text-dim); display: inline-flex; align-items: center; gap: 8px; transition: background .15s, color .15s; }
.srm .tab-btn:hover { color: var(--text); }
.srm .tab-btn.active { background: var(--bg-elev-3); color: var(--text); box-shadow: inset 0 0 0 1px var(--border-strong); }
.srm .tab-btn .badge { font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(0,212,255,.12); color: var(--cyan); }
.srm .tab-btn.active .badge { background: var(--grad); color: #08111a; }
.srm .card { background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
.srm .card + .card { margin-top: 16px; }
.srm .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
.srm .card-title { font-size: 13px; font-weight: 600; letter-spacing: .01em; }
.srm .card-sub { font-size: 11px; color: var(--text-dim); }
.srm .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--text-mute); margin-bottom: 10px; }
.srm .pb-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
@media (max-width: 1100px) { .srm .pb-grid { grid-template-columns: 1fr; } }
.srm .builder { padding: 16px 18px; }
.srm .builder-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.srm .builder-title { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; }
.srm .builder-title .count { font-family: var(--font-mono); font-size: 11px; padding: 2px 7px; border-radius: 5px; background: var(--grad); color: #08111a; font-weight: 700; }
.srm .builder-actions { display: flex; gap: 8px; }
.srm .btn { padding: 7px 12px; border-radius: 7px; font-size: 12px; font-weight: 500; background: var(--bg-elev-2); border: 1px solid var(--border); color: var(--text); display: inline-flex; align-items: center; gap: 6px; }
.srm .btn:hover { border-color: var(--border-strong); }
.srm .btn.primary { background: var(--grad); border-color: transparent; color: #08111a; font-weight: 600; }
.srm .btn.ghost { background: transparent; color: var(--text-dim); }
.srm .btn.ghost:hover { color: var(--text); }
.srm .quick-dates { display: flex; gap: 6px; }
.srm .quick-dates .qd { padding: 5px 10px; border-radius: 6px; font-size: 11px; background: var(--bg-elev-2); border: 1px solid var(--border); color: var(--text-dim); }
.srm .quick-dates .qd.active { color: var(--cyan); border-color: rgba(0,212,255,.35); background: rgba(0,212,255,.08); }
.srm .filter-groups { display: flex; flex-direction: column; gap: 12px; }
.srm .filter-group { background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.srm .fg-label { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--text-mute); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.srm .fg-label .fg-count { font-family: var(--font-mono); color: var(--text-dim); }
.srm .chips { display: flex; flex-wrap: wrap; gap: 6px; }
.srm .chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 8px 6px 10px; border-radius: 7px; background: var(--bg-elev-3); border: 1px solid var(--border); font-size: 12px; }
.srm .chip .chip-key { color: var(--text-dim); font-size: 11px; }
.srm .chip .chip-val { color: var(--text); font-family: var(--font-mono); font-size: 12px; }
.srm .chip .chip-op { color: var(--text-mute); font-size: 11px; }
.srm .chip-x { width: 16px; height: 16px; border-radius: 4px; display: grid; place-items: center; color: var(--text-mute); background: rgba(255,255,255,.03); }
.srm .chip-x:hover { color: var(--red); background: rgba(248,113,113,.12); }
.srm .chip.pos1 { border-color: rgba(52,211,153,.35); background: rgba(52,211,153,.06); }
.srm .chip.pos1 .chip-val { color: var(--pos1); }
.srm .chip.pos2 { border-color: rgba(0,212,255,.35); background: rgba(0,212,255,.06); }
.srm .chip.pos2 .chip-val { color: var(--pos2); }
.srm .chip.pos3 { border-color: rgba(168,85,247,.35); background: rgba(168,85,247,.06); }
.srm .chip.pos3 .chip-val { color: var(--pos3); }
.srm .chip.hit { border-color: rgba(52,211,153,.35); background: rgba(52,211,153,.06); }
.srm .chip.hit .chip-val { color: var(--pos1); }
.srm .chip.miss { border-color: rgba(75,85,99,.4); background: rgba(75,85,99,.12); }
.srm .chip.miss .chip-val { color: var(--text-dim); }
.srm .add-filter { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 7px; background: transparent; border: 1px dashed var(--border-strong); color: var(--text-dim); font-size: 12px; }
.srm .add-filter:hover { color: var(--cyan); border-color: rgba(0,212,255,.5); }
.srm .range-chip { display: inline-flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 7px; background: var(--bg-elev-3); border: 1px solid var(--border); font-size: 12px; }
.srm .range-track { position: relative; width: 120px; height: 4px; border-radius: 2px; background: var(--bg-elev-1); }
.srm .range-fill { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--grad); }
.srm .range-handle { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: var(--text); border: 2px solid var(--bg); }
.srm .aggregate-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
.srm .agg { background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.srm .agg-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); }
.srm .agg-val { font-family: var(--font-mono); font-size: 22px; font-weight: 600; margin-top: 4px; letter-spacing: -.01em; }
.srm .agg-val.grad-text { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.srm .agg-delta { font-family: var(--font-mono); font-size: 11px; margin-top: 4px; color: var(--text-dim); }
.srm .agg-delta.up { color: var(--green); }
.srm .agg-delta.down { color: var(--red); }
.srm table.matches { width: 100%; border-collapse: collapse; font-size: 12px; }
.srm table.matches thead th { text-align: left; font-weight: 500; color: var(--text-mute); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; padding: 8px 10px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg-elev-1); }
.srm table.matches tbody td { padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.srm table.matches tbody tr:nth-child(2n) td { background: rgba(255,255,255,.012); }
.srm table.matches tbody tr:hover td { background: rgba(0,212,255,.04); }
.srm td.num, .srm th.num { font-family: var(--font-mono); }
.srm td.date { color: var(--text-dim); font-family: var(--font-mono); font-size: 11px; white-space: nowrap; }
.srm td.match-name { font-weight: 500; }
.srm td.match-name .away { color: var(--text-dim); }
.srm td.country { color: var(--text-dim); font-size: 11px; }
.srm .score-pill { display: inline-block; padding: 2px 7px; border-radius: 5px; background: var(--bg-elev-3); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; min-width: 34px; text-align: center; }
.srm .score-pill.real { background: var(--grad-soft); border-color: rgba(0,212,255,.35); color: var(--text); }
.srm .score-pill.hit-1 { border-color: rgba(52,211,153,.4); color: var(--pos1); background: rgba(52,211,153,.08); }
.srm .score-pill.hit-2 { border-color: rgba(0,212,255,.4); color: var(--pos2); background: rgba(0,212,255,.08); }
.srm .score-pill.hit-3 { border-color: rgba(168,85,247,.4); color: var(--pos3); background: rgba(168,85,247,.08); }
.srm .score-pill.miss-pill { opacity: .55; }
.srm .top3 { display: inline-flex; gap: 4px; }
.srm .side-stats { padding: 16px 18px; }
.srm .ss-num { font-family: var(--font-mono); font-size: 32px; font-weight: 600; letter-spacing: -.02em; }
.srm .ss-num.grad { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.srm .ss-lab { font-size: 11px; color: var(--text-dim); margin-top: -2px; }
.srm .ss-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px dashed var(--border); font-size: 12px; }
.srm .ss-row:last-child { border-bottom: 0; }
.srm .ss-row .lbl { color: var(--text-dim); display: inline-flex; align-items: center; gap: 8px; }
.srm .ss-row .val { font-family: var(--font-mono); font-size: 12px; display: inline-flex; align-items: center; gap: 8px; }
.srm .src-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-mute); }
.srm .mini-bar { width: 64px; height: 6px; border-radius: 3px; background: var(--bg-elev-3); overflow: hidden; }
.srm .mini-bar > span { display: block; height: 100%; background: var(--grad); border-radius: 3px; }
.srm .subtabs { display: flex; gap: 2px; overflow-x: auto; border-bottom: 1px solid var(--border); margin-bottom: 18px; }
.srm .subtab-btn { padding: 11px 16px; font-size: 12px; color: var(--text-dim); border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
.srm .subtab-btn:hover { color: var(--text); }
.srm .subtab-btn.active { color: var(--text); border-bottom-color: var(--cyan); }
.srm .subtab-btn .hit-mini { font-family: var(--font-mono); font-size: 10px; color: var(--text-mute); }
.srm .subtab-btn.active .hit-mini { color: var(--cyan); }
.srm .hero-period { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.srm .hero-card { background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: 12px; padding: 18px; position: relative; overflow: hidden; }
.srm .hero-card.featured { background: radial-gradient(circle at 0% 0%, rgba(0,212,255,.12), transparent 50%), radial-gradient(circle at 100% 100%, rgba(168,85,247,.12), transparent 50%), var(--bg-elev-1); border-color: var(--border-strong); }
.srm .hero-big { font-family: var(--font-mono); font-size: 40px; font-weight: 600; letter-spacing: -.02em; line-height: 1; }
.srm .hero-big.grad { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.srm .hero-lab { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .1em; }
.srm .hero-meta { display: flex; gap: 18px; margin-top: 14px; flex-wrap: wrap; }
.srm .hero-meta .m { display: flex; flex-direction: column; }
.srm .hero-meta .m .v { font-family: var(--font-mono); font-size: 16px; font-weight: 500; }
.srm .hero-meta .m .l { font-size: 10px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .08em; }
.srm .bestworst { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.srm .bw { background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.srm .bw.best { border-color: rgba(52,211,153,.3); background: rgba(52,211,153,.05); }
.srm .bw.worst { border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.05); }
.srm .bw-lab { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); }
.srm .bw-name { font-size: 14px; font-weight: 600; margin-top: 4px; }
.srm .bw-rate { font-family: var(--font-mono); font-size: 18px; margin-top: 2px; }
.srm .bw.best .bw-rate { color: var(--green); }
.srm .bw.worst .bw-rate { color: var(--red); }
.srm table.compare { width: 100%; border-collapse: collapse; font-size: 12px; }
.srm table.compare th { text-align: left; font-weight: 500; color: var(--text-mute); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.srm table.compare th.num, .srm table.compare td.num { text-align: right; }
.srm table.compare td { padding: 11px 12px; border-bottom: 1px solid var(--border); }
.srm table.compare tbody tr:hover td { background: rgba(0,212,255,.04); }
.srm table.compare .src-name { font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.srm table.compare .src-name .src-color { width: 8px; height: 8px; border-radius: 2px; }
.srm .hr-pct { display: inline-flex; align-items: center; gap: 10px; justify-content: flex-end; }
.srm .hr-pct .bar { width: 90px; height: 6px; background: var(--bg-elev-3); border-radius: 3px; overflow: hidden; }
.srm .hr-pct .bar > span { display: block; height: 100%; background: var(--grad); }
.srm .hr-pct .v { font-family: var(--font-mono); min-width: 44px; text-align: right; }
.srm .pos-cell { font-family: var(--font-mono); }
.srm .pos-cell.dim { color: var(--text-mute); }
.srm .rank-pill { display: inline-block; min-width: 22px; padding: 2px 6px; border-radius: 5px; font-family: var(--font-mono); font-size: 11px; text-align: center; background: var(--bg-elev-3); border: 1px solid var(--border); color: var(--text-dim); }
.srm tr.is-best .rank-pill { background: rgba(52,211,153,.12); border-color: rgba(52,211,153,.4); color: var(--green); }
.srm tr.is-worst .rank-pill { background: rgba(248,113,113,.1); border-color: rgba(248,113,113,.35); color: var(--red); }
.srm .hbar-chart { display: flex; flex-direction: column; gap: 10px; }
.srm .hbar-row { display: grid; grid-template-columns: 130px 1fr 60px; gap: 12px; align-items: center; font-size: 12px; }
.srm .hbar-name { color: var(--text-dim); }
.srm .hbar-track { position: relative; height: 14px; background: var(--bg-elev-3); border-radius: 4px; overflow: hidden; }
.srm .hbar-fill { height: 100%; background: var(--grad); border-radius: 4px; position: relative; }
.srm .hbar-fill.is-best { background: linear-gradient(90deg, #34d399 0%, #00d4ff 100%); }
.srm .hbar-fill.is-worst { background: linear-gradient(90deg, #f87171 0%, #fbbf24 100%); }
.srm .hbar-val { font-family: var(--font-mono); text-align: right; }
.srm .source-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 16px; }
.srm .source-grid .full { grid-column: 1 / -1; }
@media (max-width: 1100px) { .srm .source-grid { grid-template-columns: 1fr; } }
.srm .big-stat { display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
.srm .big-stat .v { font-family: var(--font-mono); font-size: 64px; font-weight: 600; letter-spacing: -.03em; line-height: .95; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.srm .big-stat .meta { display: flex; gap: 18px; flex-wrap: wrap; padding-bottom: 6px; }
.srm .big-stat .meta .m { display: flex; flex-direction: column; }
.srm .big-stat .meta .m .vv { font-family: var(--font-mono); font-size: 16px; font-weight: 500; }
.srm .big-stat .meta .m .ll { font-size: 10px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .08em; }
.srm .donut-wrap { display: flex; align-items: center; gap: 22px; }
.srm .donut svg { width: 160px; height: 160px; }
.srm .donut-center { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.srm .donut-holder { position: relative; }
.srm .donut-center .v { font-family: var(--font-mono); font-size: 22px; font-weight: 600; }
.srm .donut-center .l { font-size: 10px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .08em; }
.srm .legend { display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
.srm .legend .leg { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 200px; }
.srm .legend .leg .lab { display: inline-flex; align-items: center; gap: 8px; color: var(--text-dim); }
.srm .legend .leg .sw { width: 10px; height: 10px; border-radius: 3px; }
.srm .legend .leg .va { font-family: var(--font-mono); }
.srm table.dist { width: 100%; border-collapse: collapse; font-size: 12px; }
.srm table.dist th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--border); }
.srm table.dist td { padding: 9px 10px; border-bottom: 1px solid var(--border); }
.srm table.dist td.num, .srm table.dist th.num { text-align: right; font-family: var(--font-mono); }
.srm table.dist tbody tr:nth-child(2n) td { background: rgba(255,255,255,.012); }
.srm .line-chart { width: 100%; height: 220px; }
.srm .ico { width: 14px; height: 14px; display: inline-block; vertical-align: -2px; }
.srm .row { display: flex; align-items: center; gap: 10px; }
.srm .row.wrap { flex-wrap: wrap; }
.srm .row.between { justify-content: space-between; }
.srm .legend-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-dim); padding: 3px 8px; border-radius: 999px; background: var(--bg-elev-2); border: 1px solid var(--border); }
.srm .legend-chip .sw { width: 8px; height: 8px; border-radius: 50%; }
`;

/* =========================================================================
   ICONS (SVG inline)
   ========================================================================= */
const IconRefresh = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>;
const IconExport = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>;
const IconList = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18"/><path d="M6 12h12"/><path d="M10 18h4"/></svg>;
const IconChart = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>;
const IconFunnel = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 4h18l-7 9v6l-4-2v-4z"/></svg>;
const IconTrash = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18"/><path d="M8 6v-2h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>;
const IconSave = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>;
const IconArrow = () => <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>;

/* =========================================================================
   COMPONENT
   ========================================================================= */
export default function StatsReMultifonte({ onBack }: StatsReMultifonteProps) {
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');
  const [activeSub, setActiveSub] = useState<string>('globale');
  const [filters, setFilters] = useState<ActiveFilter[]>(MOCK_ACTIVE_FILTERS);

  // [27/05/2026] Fetch dati reali da backend statsReRoutes.js (al mount, no filtri date).
  // Fallback ai MOCK_* se la fetch fallisce (es. backend non deployato / endpoint giu').
  const [matches, setMatches] = useState<MockMatch[]>(MOCK_MATCHES);
  const [globalStats, setGlobalStats] = useState<typeof MOCK_GLOBAL_STATS>(MOCK_GLOBAL_STATS);
  const [sourceDetail, setSourceDetail] = useState<typeof MOCK_SOURCE_DETAIL>(MOCK_SOURCE_DETAIL);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    Promise.all([
      fetch(`${STATS_RE_BASE}/matches`).then(r => r.json()).catch(() => null),
      fetch(`${STATS_RE_BASE}/aggregate`).then(r => r.json()).catch(() => null),
      // Source detail: fetch parallelo per tutte e 7 le sorgenti (sub-tab di Tab2)
      ...SOURCES.map(s =>
        fetch(`${STATS_RE_BASE}/source/${s.id}`).then(r => r.json()).then(d => ({ id: s.id, data: d })).catch(() => null)
      ),
    ])
      .then((results: any[]) => {
        if (cancelled) return;
        const [matchesRes, aggRes, ...sourceResults] = results;
        if (matchesRes?.success && Array.isArray(matchesRes.matches)) {
          setMatches(matchesRes.matches);
        }
        if (aggRes?.success) {
          setGlobalStats({
            total_matches: aggRes.total_matches,
            period: aggRes.period,
            sources: aggRes.sources,
          });
        }
        const detail: typeof MOCK_SOURCE_DETAIL = {};
        for (const r of sourceResults) {
          if (r?.data?.success) {
            detail[r.id] = {
              by_country: r.data.by_country || [],
              by_league: r.data.by_league || [],
              weekly: r.data.weekly || [],
            };
          }
        }
        if (Object.keys(detail).length > 0) setSourceDetail(detail);
      })
      .catch(err => { if (!cancelled) setFetchError(err?.message || 'Errore di rete'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Inject styles in <head> on mount
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-srm', 'true');
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, []);

  const removeFilter = (id: string) => setFilters(prev => prev.filter(f => f.id !== id));
  const clearAllFilters = () => setFilters([]);

  // [27/05/2026] Pattern Builder: state + helper per aggiungere filtri.
  // openForm: stringa identificativa del bottone cliccato (es. 'src_scout_lite',
  // 'periodo', 'geo_country', 're_chi_segna') o null se nessun form aperto.
  const [openForm, setOpenForm] = useState<string | null>(null);
  const addFilter = (f: ActiveFilter) => {
    setFilters(prev => [...prev, { ...f, id: `f${Date.now()}-${Math.random().toString(36).slice(2,6)}` }]);
    setOpenForm(null);
  };

  // Status options per "Performance fonti" (5 condizioni per ogni fonte)
  const POS_OPTIONS: Array<{ key: string; label: string; pos?: number | 'miss'; cls: string }> = [
    { key: 'pos1', label: 'hit 1°',          pos: 1,      cls: 'pos1' },
    { key: 'pos2', label: 'hit 2°',          pos: 2,      cls: 'pos2' },
    { key: 'pos3', label: 'hit 3°',          pos: 3,      cls: 'pos3' },
    { key: 'hit',  label: 'hit (1°-3°)',                  cls: 'hit'  },
    { key: 'miss', label: 'miss',            pos: 'miss', cls: 'miss' },
  ];

  // Nazioni e leghe disponibili (statiche per ora — quando i filtri verranno
  // applicati via fetch backend, il dataset puo' essere derivato dalla risposta).
  const COUNTRIES_OPT = ['Italia','Inghilterra','Spagna','Germania','Francia','Olanda','Portogallo','Scozia','Belgio','Turchia','Brasile','USA','Messico','Argentina','Arabia Saudita','Giappone','Svezia','Norvegia','Danimarca','Finlandia','Irlanda'];
  const LEAGUES_OPT = ['Serie A','Serie B','Premier League','Championship','La Liga','LaLiga 2','Bundesliga','2. Bundesliga','Ligue 1','Eredivisie','Liga Portugal','Scottish Premiership','Jupiler Pro League','Süper Lig','Brasileirão Serie A','Major League Soccer','Liga MX','Primera División','Saudi Pro League','Allsvenskan','Eliteserien','Superligaen','Veikkausliiga'];
  const SEGNI_OPT = ['1','X','2'];
  const CHI_SEGNA_OPT = [
    { key: 'solo_casa',   label: 'solo casa' },
    { key: 'solo_away',   label: 'solo trasferta' },
    { key: 'entrambe',    label: 'entrambe (GG)' },
    { key: 'nessuna',     label: 'nessuna (0:0)' },
  ];
  // Risultati esatti piu' comuni (selezione typical, copre ~85% dei casi)
  const RE_OPT = ['0:0','1:0','0:1','1:1','2:0','0:2','2:1','1:2','2:2','3:0','0:3','3:1','1:3','3:2','2:3','3:3','4:0','0:4','4:1','1:4'];

  // Group filters by group
  const filtersByGroup: Record<string, ActiveFilter[]> = { sources: [], time: [], match: [] };
  filters.forEach(f => filtersByGroup[f.group].push(f));

  /* ----- Sub-tab list ----- */
  const subTabs = [
    { id: 'globale', label: 'Globale', hint: '7 fonti', color: undefined as string | undefined },
    ...SOURCES.map(s => ({
      id: s.id,
      label: s.label,
      hint: pct(globalStats.sources[s.id]?.rate ?? 0, 1),
      color: s.color,
    })),
  ];

  /* ----- Tab2 Global ordering ----- */
  const orderedSources = SOURCES.map(s => ({ ...s, ...(globalStats.sources[s.id] || { matches:0, hit:0, pos1:0, pos2:0, pos3:0, miss:0, rate:0 }) }))
    .sort((a, b) => b.rate - a.rate);
  const best = orderedSources[0];
  const worst = orderedSources[orderedSources.length - 1];
  const maxRate = Math.max(...orderedSources.map(s => s.rate));

  /* ----- Tab2 Monte Carlo data ----- */
  const mcData = sourceDetail.monte_carlo || { by_country: [], by_league: [], weekly: [] };
  const mcStats = globalStats.sources.monte_carlo || { matches:0, hit:0, pos1:0, pos2:0, pos3:0, miss:0, rate:0 };
  const mcSlices = [
    { lab: '1° posizione', v: mcStats.pos1, c: '#34d399' },
    { lab: '2° posizione', v: mcStats.pos2, c: '#00d4ff' },
    { lab: '3° posizione', v: mcStats.pos3, c: '#a855f7' },
    { lab: 'Miss',         v: mcStats.miss, c: '#4b5563' },
  ];

  /* =========================================================================
     RENDER HELPERS
     ========================================================================= */
  const renderFilterChip = (f: ActiveFilter) => {
    if (f.type === 'quota_range' && f.range) {
      const { min, max, scaleMin, scaleMax } = f.range;
      const left = ((min - scaleMin) / (scaleMax - scaleMin)) * 100;
      const right = ((max - scaleMin) / (scaleMax - scaleMin)) * 100;
      return (
        <span key={f.id} className="range-chip" title="Filtro range">
          <span className="chip-key">{f.label}</span>
          <span className="chip-op">{f.op}</span>
          <span className="range-track">
            <span className="range-fill" style={{ left: `${left}%`, width: `${right - left}%` }} />
            <span className="range-handle" style={{ left: `${left}%` }} />
            <span className="range-handle" style={{ left: `${right}%` }} />
          </span>
          <span className="chip-val">{min.toFixed(2)} – {max.toFixed(2)}</span>
          <button className="chip-x" onClick={() => removeFilter(f.id)} title="Rimuovi">×</button>
        </span>
      );
    }
    if (f.type === 'date_range') {
      return (
        <span key={f.id} className="chip">
          <span className="chip-key">{f.label}</span>
          <span className="chip-op">{f.op}</span>
          <span className="chip-val">{f.value}</span>
          <span className="quick-dates" style={{ marginLeft: 4 }}>
            <span className="qd">7g</span>
            <span className="qd active">30g</span>
            <span className="qd">90g</span>
            <span className="qd">all</span>
          </span>
          <button className="chip-x" onClick={() => removeFilter(f.id)} title="Rimuovi">×</button>
        </span>
      );
    }
    const cls = f.cls ? ` ${f.cls}` : '';
    return (
      <span key={f.id} className={`chip${cls}`}>
        <span className="chip-key">{f.label}</span>
        <span className="chip-op">{f.op}</span>
        <span className="chip-val">{f.value}</span>
        <button className="chip-x" onClick={() => removeFilter(f.id)} title="Rimuovi">×</button>
      </span>
    );
  };

  const addLabels: Record<string, string> = {
    sources: '+ aggiungi condizione fonte',
    time: '+ aggiungi periodo / geo',
    match: '+ aggiungi caratteristica',
  };

  /* ============== Pattern Builder — render bottoni + form inline ============== */
  const fmtBox: React.CSSProperties = {
    display: 'inline-flex', flexDirection: 'column', gap: 8,
    padding: '12px 14px', background: 'var(--bg-elev-2)',
    border: '1px solid var(--border-strong)', borderRadius: 8,
    marginTop: 6,
  };
  const fmtRow: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
  const fmtLabel: React.CSSProperties = { fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' };
  const fmtInput: React.CSSProperties = { padding: '5px 8px', background: 'var(--bg-elev-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'inherit', fontSize: 12 };
  const fmtBtn: React.CSSProperties = { padding: '5px 12px', background: 'var(--bg-elev-3)', border: '1px solid var(--border-strong)', borderRadius: 6, color: 'var(--text)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' };
  const fmtBtnPrimary: React.CSSProperties = { ...fmtBtn, background: 'var(--grad)', color: '#08111a', fontWeight: 600 };

  // Component: dropdown semplice "select"
  const renderSelect = (value: string, options: Array<{value:string;label:string}>, onChange: (v:string)=>void) => (
    <select style={fmtInput} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  // Component: multi-checkbox compatto
  const renderMultiCheck = (values: string[], options: string[], onChange: (v:string[])=>void) => (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, maxWidth: 480 }}>
      {options.map(o => {
        const checked = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(checked ? values.filter(v => v !== o) : [...values, o])}
            style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${checked ? 'var(--cyan, #00d4ff)' : 'var(--border)'}`,
              background: checked ? 'rgba(0,212,255,0.12)' : 'var(--bg-elev-1)',
              color: checked ? 'var(--text)' : 'var(--text-dim)',
              fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );

  // --- Form Performance fonti ---
  const FormSourceCondition: React.FC<{ src: { id: string; label: string } }> = ({ src }) => {
    const [pos, setPos] = useState<string>('hit');
    return (
      <div style={fmtBox}>
        <div style={fmtRow}>
          <span style={fmtLabel}>{src.label}</span>
          {renderSelect(pos, POS_OPTIONS.map(o => ({ value: o.key, label: o.label })), setPos)}
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} onClick={() => {
            const opt = POS_OPTIONS.find(o => o.key === pos)!;
            addFilter({
              id: '', group: 'sources', type: pos === 'hit' ? 'src_hit' : 'src_pos',
              source: src.id, pos: opt.pos, cls: opt.cls,
              label: src.label, op: '=', value: opt.label,
            });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Periodo (date from + date to) ---
  const FormPeriodo: React.FC = () => {
    const [from, setFrom] = useState<string>('');
    const [to, setTo] = useState<string>('');
    return (
      <div style={fmtBox}>
        <div style={fmtRow}>
          <span style={fmtLabel}>Dal</span>
          <input type="date" style={fmtInput} value={from} onChange={e => setFrom(e.target.value)} />
          <span style={fmtLabel}>Al</span>
          <input type="date" style={fmtInput} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={!from && !to} onClick={() => {
            const val = from && to ? `${from} → ${to}` : from ? `dal ${from}` : `fino al ${to}`;
            addFilter({ id:'', group:'time', type:'date_range', label:'Periodo', op:'=', value: val });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Nazione (multi-select) ---
  const FormNazione: React.FC = () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <div style={fmtBox}>
        <div style={{ ...fmtRow, alignItems:'flex-start' }}>
          <span style={fmtLabel}>Nazioni</span>
          {renderMultiCheck(sel, COUNTRIES_OPT, setSel)}
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={sel.length === 0} onClick={() => {
            addFilter({ id:'', group:'time', type:'country', label:'Nazione', op:'=', value: sel.join(', ') });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Lega (multi-select) ---
  const FormLega: React.FC = () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <div style={fmtBox}>
        <div style={{ ...fmtRow, alignItems:'flex-start' }}>
          <span style={fmtLabel}>Leghe</span>
          {renderMultiCheck(sel, LEAGUES_OPT, setSel)}
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={sel.length === 0} onClick={() => {
            addFilter({ id:'', group:'time', type:'league', label:'Lega', op:'=', value: sel.join(', ') });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Range gol totali (min, max) ---
  const FormRangeGol: React.FC = () => {
    const [min, setMin] = useState<string>('');
    const [max, setMax] = useState<string>('');
    return (
      <div style={fmtBox}>
        <div style={fmtRow}>
          <span style={fmtLabel}>Gol totali</span>
          <span style={fmtLabel}>min</span>
          <input type="number" min={0} max={20} style={{ ...fmtInput, width: 70 }} value={min} onChange={e => setMin(e.target.value)} />
          <span style={fmtLabel}>max</span>
          <input type="number" min={0} max={20} style={{ ...fmtInput, width: 70 }} value={max} onChange={e => setMax(e.target.value)} />
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={!min && !max} onClick={() => {
            const val = min && max ? `${min} – ${max}` : min ? `≥ ${min}` : `≤ ${max}`;
            addFilter({ id:'', group:'match', type:'goals_range', label:'Gol totali', op:'∈', value: val });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Chi segna ---
  const FormChiSegna: React.FC = () => {
    const [sel, setSel] = useState<string[]>([]);
    const opts = CHI_SEGNA_OPT.map(o => o.label);
    return (
      <div style={fmtBox}>
        <div style={fmtRow}>
          <span style={fmtLabel}>Chi segna</span>
          {renderMultiCheck(sel, opts, setSel)}
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={sel.length === 0} onClick={() => {
            addFilter({ id:'', group:'match', type:'chi_segna', label:'Chi segna', op:'∈', value: sel.join(', ') });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Esito segno ---
  const FormSegno: React.FC = () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <div style={fmtBox}>
        <div style={fmtRow}>
          <span style={fmtLabel}>Esito segno</span>
          {renderMultiCheck(sel, SEGNI_OPT, setSel)}
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={sel.length === 0} onClick={() => {
            addFilter({ id:'', group:'match', type:'segno', label:'Segno', op:'∈', value: sel.join(', ') });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // --- Form Risultato esatto specifico ---
  const FormRisultato: React.FC = () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <div style={fmtBox}>
        <div style={{ ...fmtRow, alignItems:'flex-start' }}>
          <span style={fmtLabel}>Risultato esatto</span>
          {renderMultiCheck(sel, RE_OPT, setSel)}
        </div>
        <div style={fmtRow}>
          <button style={fmtBtnPrimary} disabled={sel.length === 0} onClick={() => {
            addFilter({ id:'', group:'match', type:'risultato_esatto', label:'RE', op:'∈', value: sel.join(', ') });
          }}>Aggiungi</button>
          <button style={fmtBtn} onClick={() => setOpenForm(null)}>Annulla</button>
        </div>
      </div>
    );
  };

  // Render lista bottoni "+ aggiungi X" per ogni gruppo
  const renderAddButtons = (group: 'sources' | 'time' | 'match'): React.ReactNode => {
    const btnStyle: React.CSSProperties = { padding: '6px 12px', background: 'var(--bg-elev-2)', border: '1px dashed var(--border-strong)', borderRadius: 6, color: 'var(--text-dim)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };
    const btn = (key: string, label: string) => (
      <button key={key} style={btnStyle} onClick={() => setOpenForm(openForm === key ? null : key)}>
        {openForm === key ? '× ' : '+ '}{label}
      </button>
    );
    if (group === 'sources') {
      return <>{SOURCES.map(s => btn(`src_${s.id}`, s.label))}</>;
    }
    if (group === 'time') {
      return <>{btn('periodo', 'Periodo')}{btn('geo_country', 'Nazione')}{btn('geo_league', 'Lega')}</>;
    }
    // match
    return <>{btn('re_gol', 'Range gol')}{btn('re_chi', 'Chi segna')}{btn('re_segno', 'Esito segno')}{btn('re_specifico', 'Risultato esatto')}</>;
  };

  // Render del form attivo per il gruppo (se openForm appartiene al gruppo)
  const renderActiveForm = (group: 'sources' | 'time' | 'match'): React.ReactNode => {
    if (!openForm) return null;
    if (group === 'sources') {
      const src = SOURCES.find(s => `src_${s.id}` === openForm);
      if (src) return <FormSourceCondition src={src} />;
    }
    if (group === 'time') {
      if (openForm === 'periodo')     return <FormPeriodo />;
      if (openForm === 'geo_country') return <FormNazione />;
      if (openForm === 'geo_league')  return <FormLega />;
    }
    if (group === 'match') {
      if (openForm === 're_gol')        return <FormRangeGol />;
      if (openForm === 're_chi')        return <FormChiSegna />;
      if (openForm === 're_segno')      return <FormSegno />;
      if (openForm === 're_specifico')  return <FormRisultato />;
    }
    return null;
  };

  const renderMatchRow = (m: MockMatch) => {
    const hitCount = SOURCES.reduce((acc, s) => acc + (m.sources[s.id]?.pos ? 1 : 0), 0);
    // Backend usa "X:Y", mock usavano "X-Y": normalizzo entrambi a "X-Y" per il confronto.
    const realNorm = (m.real || '').replace(':', '-');
    const top3Cell = (srcId: string) => {
      const s = m.sources[srcId];
      if (!s) return <span className="score-pill miss-pill">—</span>;
      return (
        <span className="top3">
          {s.top3.map((sc, i) => {
            const scNorm = (sc || '').replace(':', '-');
            const isReal = scNorm === realNorm;
            let cls = 'score-pill';
            if (isReal && s.pos === 1) cls += ' hit-1';
            else if (isReal && s.pos === 2) cls += ' hit-2';
            else if (isReal && s.pos === 3) cls += ' hit-3';
            else cls += ' miss-pill';
            return <span key={i} className={cls}>{sc}</span>;
          })}
        </span>
      );
    };
    const hitColor = hitCount >= 4 ? '#34d399' : hitCount >= 2 ? '#00d4ff' : '#8a96a8';
    return (
      <tr key={m.id}>
        <td className="date">{fmtDate(m.date)}</td>
        <td className="match-name">{m.home} <span className="away">vs {m.away}</span></td>
        <td className="country">{m.league}</td>
        <td className="num">{m.quota != null ? m.quota.toFixed(2) : '—'}</td>
        <td className="num"><span className="score-pill real">{realNorm}</span></td>
        <td>{top3Cell('scout_lite')}</td>
        <td>{top3Cell('mistral_f2')}</td>
        <td>{top3Cell('monte_carlo')}</td>
        <td className="num"><span className="mono" style={{ color: hitColor }}>{hitCount}/7</span></td>
      </tr>
    );
  };

  /* ----- Donut SVG renderer ----- */
  const renderDonutSVG = (slices: { lab: string; v: number; c: string }[]) => {
    const total = slices.reduce((a, s) => a + s.v, 0);
    const R = 70, CX = 80, CY = 80, SW = 18;
    const C = 2 * Math.PI * R;
    let offset = 0;
    const segments = slices.map((s, i) => {
      const len = (s.v / total) * C;
      const seg = (
        <circle key={i}
          r={R} cx={CX} cy={CY}
          fill="transparent"
          stroke={s.c}
          strokeWidth={SW}
          strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
          strokeDashoffset={(-offset).toFixed(2)}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      );
      offset += len;
      return seg;
    });
    return (
      <svg viewBox="0 0 160 160">
        <circle r={R} cx={CX} cy={CY} fill="transparent" stroke="#1a2230" strokeWidth={SW} />
        {segments}
      </svg>
    );
  };

  /* ----- Line chart SVG renderer ----- */
  const renderLineChartSVG = (weekly: WeeklyPoint[]) => {
    const W = 520, H = 220, PAD_L = 36, PAD_R = 16, PAD_T = 16, PAD_B = 32;
    const innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
    const max = 0.6, min = 0.2;
    const xs = (i: number) => PAD_L + (i / (weekly.length - 1)) * innerW;
    const ys = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * innerH;

    const gridLines = [];
    for (let t = 0; t <= 4; t++) {
      const y = PAD_T + (t / 4) * innerH;
      const v = max - (t / 4) * (max - min);
      gridLines.push(<line key={`g${t}`} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#1f2937" strokeDasharray="2 4" />);
      gridLines.push(<text key={`t${t}`} x={PAD_L - 8} y={y + 3} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize={10} fill="#5a6578">{Math.round(v * 100)}%</text>);
    }
    const xLabels = weekly.map((p, i) => {
      if (i % 2 === 0 || i === weekly.length - 1) {
        return <text key={p.wk} x={xs(i)} y={H - 10} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={10} fill="#5a6578">{p.wk}</text>;
      }
      return null;
    });
    const pts = weekly.map((p, i) => `${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`);
    const linePath = `M ${pts.join(' L ')}`;
    const areaPath = `M ${xs(0)},${H - PAD_B} L ${pts.join(' L ')} L ${xs(weekly.length - 1)},${H - PAD_B} Z`;
    const dots = weekly.map((p, i) => (
      <circle key={`d${i}`} cx={xs(i)} cy={ys(p.v)} r={3} fill="#00d4ff" stroke="#0a0e14" strokeWidth={2} />
    ));
    return (
      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridLines}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {dots}
        {xLabels}
      </svg>
    );
  };

  /* ----- Side stats mock ----- */
  const sideRates = [
    { id: 'monte_carlo',      v: 0.73 },
    { id: 'risultato_esatto', v: 0.65 },
    { id: 'scout_deep',       v: 0.59 },
    { id: 'mistral_f2',       v: 0.54 },
    { id: 'scout_lite',       v: 0.49 },
    { id: 'pme',              v: 0.43 },
    { id: 'mistral_f1',       v: 0.27 },
  ];
  const positions = [
    { lbl: '1° posizione', v: 17, c: '#34d399' },
    { lbl: '2° posizione', v: 11, c: '#00d4ff' },
    { lbl: '3° posizione', v:  6, c: '#a855f7' },
    { lbl: 'Miss',         v:  3, c: '#4b5563' },
  ];
  const positionsTotal = positions.reduce((a, p) => a + p.v, 0);
  const leagues = [
    { lab: 'Serie A',      v: 18 },
    { lab: 'Serie B',      v:  8 },
    { lab: 'Coppa Italia', v:  6 },
    { lab: 'Premier',      v:  3 },
    { lab: 'LaLiga',       v:  2 },
  ];

  /* =========================================================================
     RENDER
     ========================================================================= */
  return (
    <div className="srm">
      <div className="app">

        {/* =================== TOP BAR =================== */}
        <header className="topbar">
          <div className="brand">
            {onBack && (
              <button className="btn ghost" onClick={onBack} style={{ marginRight: 4 }}>← Dashboard</button>
            )}
            <div className="brand-mark">RE</div>
            <div className="brand-meta">
              <div className="brand-title">Stats RE Multifonte</div>
              <div className="brand-sub">Admin · Risultati Esatti · 7 fonti</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="pill"><span className="dot" />01 Mag 2026 → 22 Mag 2026</span>
            <span className="pill admin"><span className="dot" />Admin only</span>
            <button className="icon-btn" title="Refresh" aria-label="Refresh"><IconRefresh /></button>
            <button className="icon-btn" title="Export" aria-label="Export"><IconExport /></button>
          </div>
        </header>

        {/* =================== MAIN TABS =================== */}
        <nav className="tabs" role="tablist">
          <button
            className={`tab-btn ${activeTab === 'tab1' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab1')}
            role="tab" aria-selected={activeTab === 'tab1'}
          >
            <IconList /> Pattern Builder
            <span className="badge mono">{matches.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'tab2' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab2')}
            role="tab" aria-selected={activeTab === 'tab2'}
          >
            <IconChart /> Statistiche per Fonte
          </button>
        </nav>

        {/* =================== TAB 1 =================== */}
        {activeTab === 'tab1' && (
          <section>
            <div className="pb-grid">

              {/* LEFT COLUMN */}
              <div>
                {/* Filter builder card */}
                <div className="card builder">
                  <div className="builder-head">
                    <div className="builder-title">
                      <IconFunnel /> Pattern Builder
                      <span className="count mono">{filters.length} filtri</span>
                    </div>
                    <div className="builder-actions">
                      <button className="btn ghost" onClick={clearAllFilters}><IconTrash /> Pulisci tutto</button>
                      <button className="btn"><IconSave /> Salva pattern</button>
                      <button className="btn primary"><IconArrow /> Esegui</button>
                    </div>
                  </div>

                  <div className="filter-groups">
                    {(['sources', 'time', 'match'] as const).map(group => {
                      const groupTitles = {
                        sources: 'Performance fonti',
                        time: 'Periodo & geografia',
                        match: 'Caratteristiche partita',
                      };
                      const arr = filtersByGroup[group];
                      return (
                        <div className="filter-group" key={group}>
                          <div className="fg-label">
                            {groupTitles[group]}
                            <span className="fg-count mono">{arr.length}</span>
                          </div>
                          <div className="chips">
                            {arr.map(renderFilterChip)}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {renderAddButtons(group)}
                          </div>
                          {renderActiveForm(group)}
                        </div>
                      );
                    })}
                  </div>

                  <div className="aggregate-strip">
                    <div className="agg">
                      <div className="agg-label">Partite matchate</div>
                      <div className="agg-val mono grad-text">37</div>
                      <div className="agg-delta">su 412 totali nel range</div>
                    </div>
                    <div className="agg">
                      <div className="agg-label">Hit rate medio (selezione)</div>
                      <div className="agg-val mono">54.2%</div>
                      <div className="agg-delta up">▲ +9.8 vs globale</div>
                    </div>
                    <div className="agg">
                      <div className="agg-label">Best fonte sulla selezione</div>
                      <div className="agg-val mono">Monte Carlo</div>
                      <div className="agg-delta">73.0% hit rate</div>
                    </div>
                    <div className="agg">
                      <div className="agg-label">Quota media partite</div>
                      <div className="agg-val mono">1.94</div>
                      <div className="agg-delta">home win</div>
                    </div>
                  </div>
                </div>

                {/* Matches table */}
                <div className="card" style={{ padding: 0 }}>
                  <div className="card-head" style={{ padding: '14px 18px', margin: 0, borderBottom: '1px solid #1f2937' }}>
                    <div className="row">
                      <div className="card-title">Partite filtrate</div>
                      <span className="legend-chip"><span className="sw" style={{ background: '#34d399' }} />hit 1°</span>
                      <span className="legend-chip"><span className="sw" style={{ background: '#00d4ff' }} />hit 2°</span>
                      <span className="legend-chip"><span className="sw" style={{ background: '#a855f7' }} />hit 3°</span>
                      <span className="legend-chip"><span className="sw" style={{ background: '#4b5563' }} />miss</span>
                    </div>
                    <div className="row">
                      <span className="card-sub mono">{matches.length} partite · ordinate per data ↓</span>
                    </div>
                  </div>
                  <div style={{ maxHeight: 540, overflow: 'auto' }}>
                    <table className="matches">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Partita</th>
                          <th>Lega</th>
                          <th className="num">Quota</th>
                          <th className="num">Real</th>
                          <th>Scout LITE top3</th>
                          <th>Mistral F2 top3</th>
                          <th>Monte Carlo top3</th>
                          <th className="num">Fonti ✓</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map(renderMatchRow)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — SIDE STATS */}
              <aside>
                <div className="card side-stats">
                  <div className="section-label">Selezione corrente</div>
                  <div className="ss-num grad mono">{matches.length}</div>
                  <div className="ss-lab">partite che matchano il pattern</div>

                  <div style={{ height: 14 }} />
                  <div className="section-label">Hit rate per fonte (selezione)</div>
                  {sideRates.map(r => {
                    const src = SOURCE_BY_ID[r.id];
                    return (
                      <div className="ss-row" key={r.id}>
                        <span className="lbl"><span className="src-dot" style={{ background: src.color }} />{src.label}</span>
                        <span className="val">
                          <span className="mini-bar"><span style={{ width: `${(r.v * 100).toFixed(0)}%`, background: src.color }} /></span>
                          {pct(r.v, 1)}
                        </span>
                      </div>
                    );
                  })}

                  <div style={{ height: 18 }} />
                  <div className="section-label">Distribuzione posizioni</div>
                  {positions.map((p, i) => (
                    <div className="ss-row" key={i}>
                      <span className="lbl"><span className="src-dot" style={{ background: p.c }} />{p.lbl}</span>
                      <span className="val">
                        <span className="mini-bar"><span style={{ width: `${(p.v / positionsTotal * 100).toFixed(0)}%`, background: p.c }} /></span>
                        {p.v}
                      </span>
                    </div>
                  ))}

                  <div style={{ height: 18 }} />
                  <div className="section-label">Top 5 leghe</div>
                  {leagues.map(l => (
                    <div className="ss-row" key={l.lab}>
                      <span className="lbl">{l.lab}</span>
                      <span className="val">{l.v}</span>
                    </div>
                  ))}
                </div>
              </aside>

            </div>
          </section>
        )}

        {/* =================== TAB 2 =================== */}
        {activeTab === 'tab2' && (
          <section>
            <nav className="subtabs" role="tablist">
              {subTabs.map(it => (
                <button
                  key={it.id}
                  className={`subtab-btn ${activeSub === it.id ? 'active' : ''}`}
                  onClick={() => setActiveSub(it.id)}
                  role="tab"
                >
                  {it.color && (
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, display: 'inline-block' }} />
                  )}
                  {it.label}
                  <span className="hit-mini">{it.hint}</span>
                </button>
              ))}
            </nav>

            {/* Subtab: GLOBALE */}
            {activeSub === 'globale' && (
              <div>
                <div className="hero-period">
                  <div className="hero-card featured">
                    <div className="hero-lab">Periodo coperto</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
                      <div className="hero-big">412</div>
                      <div style={{ color: '#8a96a8', fontSize: 13 }}>partite analizzate</div>
                    </div>
                    <div className="hero-meta">
                      <div className="m"><div className="v">01 Mar</div><div className="l">From</div></div>
                      <div className="m"><div className="v">22 Mag 2026</div><div className="l">To</div></div>
                      <div className="m"><div className="v">83 gg</div><div className="l">Span</div></div>
                      <div className="m"><div className="v">14</div><div className="l">Paesi</div></div>
                      <div className="m"><div className="v">38</div><div className="l">Leghe</div></div>
                    </div>
                  </div>
                  <div className="hero-card">
                    <div className="hero-lab">Best performer</div>
                    <div className="bestworst" style={{ marginTop: 8, gridTemplateColumns: '1fr' }}>
                      <div className="bw best">
                        <div className="bw-lab">🏆 Top hit rate</div>
                        <div className="bw-name">{best.label}</div>
                        <div className="bw-rate mono">{pct(best.rate, 1)} <span style={{ color: '#5a6578', fontSize: 11 }}>· {best.hit}/{best.matches}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="hero-card">
                    <div className="hero-lab">Worst performer</div>
                    <div className="bestworst" style={{ marginTop: 8, gridTemplateColumns: '1fr' }}>
                      <div className="bw worst">
                        <div className="bw-lab">⚠︎ Lowest hit rate</div>
                        <div className="bw-name">{worst.label}</div>
                        <div className="bw-rate mono">{pct(worst.rate, 1)} <span style={{ color: '#5a6578', fontSize: 11 }}>· {worst.hit}/{worst.matches}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Tabella comparativa · 7 fonti</div>
                    <div className="card-sub mono">412 partite · ordinato per hit rate ↓</div>
                  </div>
                  <table className="compare">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fonte</th>
                        <th className="num">Partite</th>
                        <th className="num">Hit rate</th>
                        <th className="num">1°</th>
                        <th className="num">2°</th>
                        <th className="num">3°</th>
                        <th className="num">Miss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedSources.map((s, i) => {
                        const isBest = s.id === best.id;
                        const isWorst = s.id === worst.id;
                        const trCls = isBest ? 'is-best' : isWorst ? 'is-worst' : '';
                        const barBg = isBest ? 'linear-gradient(90deg,#34d399,#00d4ff)'
                          : isWorst ? 'linear-gradient(90deg,#f87171,#fbbf24)'
                          : 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)';
                        return (
                          <tr key={s.id} className={trCls}>
                            <td><span className="rank-pill">{i + 1}</span></td>
                            <td><span className="src-name"><span className="src-color" style={{ background: s.color }} />{s.label}</span></td>
                            <td className="num">{s.matches}</td>
                            <td className="num">
                              <span className="hr-pct">
                                <span className="bar"><span style={{ width: `${(s.rate * 100).toFixed(1)}%`, background: barBg }} /></span>
                                <span className="v">{pct(s.rate, 1)}</span>
                              </span>
                            </td>
                            <td className="num">{s.pos1}</td>
                            <td className="num">{s.pos2}</td>
                            <td className="num">{s.pos3}</td>
                            <td className="num"><span className="pos-cell dim">{s.miss}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Hit rate complessivo · confronto</div>
                    <div className="card-sub mono">% partite con real_score nel top3</div>
                  </div>
                  <div className="hbar-chart">
                    {orderedSources.map((s, i) => {
                      const w = (s.rate / maxRate) * 100;
                      const cls = i === 0 ? 'is-best' : (i === orderedSources.length - 1 ? 'is-worst' : '');
                      return (
                        <div className="hbar-row" key={s.id}>
                          <div className="hbar-name">{s.label}</div>
                          <div className="hbar-track"><div className={`hbar-fill ${cls}`} style={{ width: `${w.toFixed(1)}%` }} /></div>
                          <div className="hbar-val">{pct(s.rate, 1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: MONTE CARLO */}
            {activeSub === 'monte_carlo' && (
              <div>
                <div className="card" style={{
                  background: 'radial-gradient(circle at 0% 0%, rgba(0,212,255,.08), transparent 50%), radial-gradient(circle at 100% 0%, rgba(168,85,247,.08), transparent 50%), #0f141c'
                }}>
                  <div className="row between">
                    <div>
                      <div className="hero-lab">Monte Carlo · simulazione statistica</div>
                      <div className="big-stat" style={{ marginTop: 6 }}>
                        <div className="v">{pct(mcStats.rate, 1)}</div>
                        <div className="meta">
                          <div className="m"><div className="vv mono">{mcStats.matches}</div><div className="ll">Partite</div></div>
                          <div className="m"><div className="vv mono">{mcStats.hit}</div><div className="ll">Hit totali</div></div>
                          <div className="m"><div className="vv mono">{mcStats.pos1}</div><div className="ll">1° pos</div></div>
                          <div className="m"><div className="vv mono">{mcStats.pos2}</div><div className="ll">2° pos</div></div>
                          <div className="m"><div className="vv mono">{mcStats.pos3}</div><div className="ll">3° pos</div></div>
                          <div className="m"><div className="vv mono">{mcStats.miss}</div><div className="ll">Miss</div></div>
                        </div>
                      </div>
                    </div>
                    <span className="legend-chip" style={{ borderColor: 'rgba(52,211,153,.35)', color: '#34d399' }}>
                      <span className="sw" style={{ background: '#34d399' }} />Best performer ↑1
                    </span>
                  </div>
                </div>

                <div className="source-grid">
                  <div className="card">
                    <div className="card-head">
                      <div className="card-title">Distribuzione posizioni</div>
                      <div className="card-sub mono">Monte Carlo · {mcStats.matches} partite</div>
                    </div>
                    <div className="donut-wrap">
                      <div className="donut-holder">
                        <div className="donut">{renderDonutSVG(mcSlices)}</div>
                        <div className="donut-center">
                          <div>
                            <div className="v">{pct(mcStats.rate, 1)}</div>
                            <div className="l">Hit rate</div>
                          </div>
                        </div>
                      </div>
                      <div className="legend">
                        {mcSlices.map(s => (
                          <div className="leg" key={s.lab}>
                            <span className="lab"><span className="sw" style={{ background: s.c }} />{s.lab}</span>
                            <span className="va">{s.v} <span style={{ color: '#5a6578' }}>· {pct(s.v / mcStats.matches, 1)}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <div className="card-title">Andamento settimanale</div>
                      <div className="card-sub mono">Hit rate · ultime 12 settimane</div>
                    </div>
                    {renderLineChartSVG(mcData.weekly)}
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <div className="card-title">Hit rate per paese</div>
                      <div className="card-sub mono">Top 8</div>
                    </div>
                    <table className="dist">
                      <thead><tr><th>Paese</th><th className="num">N</th><th className="num">Hit rate</th><th className="num">1°/2°/3°</th></tr></thead>
                      <tbody>
                        {mcData.by_country.map(r => (
                          <tr key={r.country}>
                            <td>{r.country}</td>
                            <td className="num">{r.n}</td>
                            <td className="num">
                              <span className="hr-pct">
                                <span className="bar"><span style={{ width: `${(r.rate * 100).toFixed(1)}%` }} /></span>
                                <span className="v">{pct(r.rate, 1)}</span>
                              </span>
                            </td>
                            <td className="num"><span className="pos-cell"><span style={{ color: '#34d399' }}>{r.p1}</span>/<span style={{ color: '#00d4ff' }}>{r.p2}</span>/<span style={{ color: '#a855f7' }}>{r.p3}</span></span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card">
                    <div className="card-head">
                      <div className="card-title">Hit rate per lega</div>
                      <div className="card-sub mono">Top 10 per volume</div>
                    </div>
                    <table className="dist">
                      <thead><tr><th>Lega</th><th>Paese</th><th className="num">N</th><th className="num">Hit rate</th></tr></thead>
                      <tbody>
                        {mcData.by_league.map(r => (
                          <tr key={r.league}>
                            <td>{r.league}</td>
                            <td className="country">{r.country}</td>
                            <td className="num">{r.n}</td>
                            <td className="num">
                              <span className="hr-pct">
                                <span className="bar"><span style={{ width: `${(r.rate * 100).toFixed(1)}%` }} /></span>
                                <span className="v">{pct(r.rate, 1)}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab: altre fonti — placeholder (vista identica a Monte Carlo) */}
            {activeSub !== 'globale' && activeSub !== 'monte_carlo' && (
              <div className="card">
                <div className="card-title">{SOURCE_BY_ID[activeSub]?.label || activeSub}</div>
                <div className="card-sub" style={{ marginTop: 8 }}>
                  Vista dettaglio identica a Monte Carlo, popolata con i dati della fonte.
                  Stessa struttura (big stat, donut, line chart, tabelle per paese/lega).
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
