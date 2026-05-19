import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../AppDev/costanti';
import { assegnaRedattore } from './news/assegnazione';
import TeamScheda from './news/TeamScheda';
import RedattoreProfilo from './news/RedattoreProfilo';
import type { Redattore } from './news/redattori';

interface NewsProps {
  onBack?: () => void;
}

interface PronosticoTip {
  tipo?: string;
  pronostico?: string;
  confidence?: number;
  quota?: number | null;
  source?: string;
}
interface NewsMetaSide {
  xg_avg?: number | null;
  total_volume_avg?: number | null;
  rank?: number | null;
  points?: number | null;
  played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  formation?: string | null;
}
interface NewsMeta {
  giornata?: number | null;
  stadio?: { name?: string | null; city?: string | null; capacity?: number | null; source?: string | null } | null;
  arbitro?: { name?: string | null; source?: string | null } | null;
  home: NewsMetaSide;
  away: NewsMetaSide;
}
interface Match {
  home: string;
  away: string;
  date: string;
  match_time?: string;
  league?: string;
  lega?: string;
  pronostici?: PronosticoTip[];
  scout_lite?: { scout_text?: string; computed_at?: string };
  scout_deep?: { scout_text?: string; computed_at?: string };
  expected_total_goals?: number | null;
  news_meta?: NewsMeta;
  odds?: Record<string, any> | null;
  home_mongo_id?: string | null;
  away_mongo_id?: string | null;
  home_logo_url?: string | null;
  away_logo_url?: string | null;
}
interface ApiResp {
  success?: boolean;
  predictions?: Match[];
  date?: string;
}

// Mappa lega -> nazione (slug) per il filtro a cascata.
const LEAGUE_TO_COUNTRY: Record<string, string> = {
  'Premier League': 'inghilterra', 'Championship': 'inghilterra', 'League One': 'inghilterra', 'League Two': 'inghilterra', 'FA Cup': 'inghilterra', 'Carabao Cup': 'inghilterra',
  'Serie A': 'italia', 'Serie B': 'italia', 'Coppa Italia': 'italia',
  'LaLiga': 'spagna', 'La Liga': 'spagna', 'LaLiga 2': 'spagna', 'Copa del Rey': 'spagna',
  'Bundesliga': 'germania', '2. Bundesliga': 'germania', '3. Liga': 'germania', 'DFB Pokal': 'germania',
  'Ligue 1': 'francia', 'Ligue 2': 'francia', 'Coupe de France': 'francia',
  'Eredivisie': 'olanda', 'Eerste Divisie': 'olanda',
  'Primeira Liga': 'portogallo', 'Liga Portugal': 'portogallo', 'Liga Portugal 2': 'portogallo',
  'Allsvenskan': 'svezia',
  'Veikkausliiga': 'finlandia',
  'Eliteserien': 'norvegia',
  'Superligaen': 'danimarca',
  'Jupiler Pro League': 'belgio',
  'Süper Lig': 'turchia', '1. Lig': 'turchia',
  'Scottish Premiership': 'scozia',
  'Brasileirao': 'brasile', 'Brasileirão': 'brasile', 'Brasileirão Serie A': 'brasile',
  'Major League Soccer': 'usa', 'MLS': 'usa',
  'Liga MX': 'messico',
  'Primera División': 'argentina',
  'Saudi Pro League': 'arabia_saudita',
  'J1 League': 'giappone',
  'Champions League': 'europa', 'Europa League': 'europa',
};
const COUNTRY_LABEL: Record<string, string> = {
  inghilterra: 'Inghilterra', italia: 'Italia', spagna: 'Spagna',
  germania: 'Germania', francia: 'Francia', olanda: 'Olanda',
  portogallo: 'Portogallo', svezia: 'Svezia', finlandia: 'Finlandia',
  norvegia: 'Norvegia', danimarca: 'Danimarca', belgio: 'Belgio',
  turchia: 'Turchia', scozia: 'Scozia',
  brasile: 'Brasile', usa: 'USA', messico: 'Messico', argentina: 'Argentina',
  arabia_saudita: 'Arabia Saudita', giappone: 'Giappone',
  europa: 'Coppe europee',
};
const leagueSlug = (lg: string): string =>
  (lg || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');

const leagueDotColor = (league: string): string => {
  const lg = league || '';
  if (lg.includes('Premier')) return '#a855f7';
  if (lg.includes('Allsvenskan')) return '#facc15';
  if (lg.includes('Brasil')) return '#4ade80';
  if (lg.includes('Veikkaus')) return '#22d3ee';
  if (lg.includes('Serie A') || lg.includes('Serie B')) return '#3b82f6';
  if (lg.includes('LaLiga') || lg.includes('La Liga')) return '#ef4444';
  if (lg.includes('Bundesliga')) return '#f97316';
  if (lg.includes('Ligue')) return '#6366f1';
  if (lg.includes('MLS')) return '#0ea5e9';
  return '#6b7280';
};

// Stemmi Firebase Storage: stemmi/squadre/{Country_Folder}/{mongo_id}.png
// Mappa allineata a src/UnifiedPredictions.tsx LEAGUE_TO_FOLDER (autorita').
const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';
const LEAGUE_TO_FOLDER_N: Record<string, string> = {
  'Serie A': 'Italy', 'Serie B': 'Italy',
  'Serie C - Girone A': 'Italy', 'Serie C - Girone B': 'Italy', 'Serie C - Girone C': 'Italy', 'Serie C': 'Italy',
  'Premier League': 'England', 'Championship': 'England', 'League One': 'England', 'League Two': 'England',
  'La Liga': 'Spain', 'LaLiga 2': 'Spain',
  'Bundesliga': 'Germany', '2. Bundesliga': 'Germany', '3. Liga': 'Germany',
  'Ligue 1': 'France', 'Ligue 2': 'France',
  'Liga Portugal': 'Portugal', 'Primeira Liga': 'Portugal', 'Liga Portugal 2': 'Portugal',
  'Eredivisie': 'Netherlands', 'Eerste Divisie': 'Netherlands',
  'Scottish Prem.': 'Scotland', 'Scottish Premiership': 'Scotland', 'Scottish Championship': 'Scotland',
  'Allsvenskan': 'Sweden',
  'Eliteserien': 'Norway',
  'Superligaen': 'Denmark',
  'Veikkausliiga': 'Finland',
  'Jupiler Pro': 'Belgium', 'Jupiler Pro League': 'Belgium',
  'Süper Lig': 'Turkey', 'Super Lig': 'Turkey', '1. Lig': 'Turkey',
  'League of Ireland': 'Ireland', 'League of Ireland Premier Division': 'Ireland',
  'Saudi Pro League': 'Saudi_Arabia',
  'Brasileirão': 'Brazil', 'Brasileirao': 'Brazil', 'Brasileirão Serie A': 'Brazil', 'Brasileirao Serie A': 'Brazil',
  'Primera División': 'Argentina',
  'MLS': 'USA', 'Major League Soccer': 'USA',
  'Liga MX': 'Mexico',
  'J1 League': 'Japan',
  'Champions League': 'Champions_League',
  'Europa League': 'Europa_League',
};
const getStemmaUrl = (mongoId: string | null | undefined, league: string | null | undefined): string => {
  if (!mongoId) return '';
  const folder = (league && LEAGUE_TO_FOLDER_N[league]) || 'Altro';
  return `${STEMMI_BASE}squadre%2F${folder}%2F${mongoId}.png?alt=media`;
};

// Crest gradient deterministico da hash del nome squadra.
const crestGradient = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const pairs: Array<[string, string]> = [
    ['#ff7373', '#c81919'], ['#6b7280', '#0a0b0f'], ['#f87171', '#991b1b'],
    ['#60a5fa', '#1e40af'], ['#93c5fd', '#1e3a8a'], ['#38bdf8', '#0369a1'],
    ['#4ade80', '#166534'], ['#fbbf24', '#b45309'], ['#a78bfa', '#5b21b6'],
    ['#f472b6', '#9d174d'],
  ];
  const p = pairs[Math.abs(h) % pairs.length];
  return `radial-gradient(circle at 35% 30%, ${p[0]}, ${p[1]} 70%)`;
};
const crestInitial = (name: string): string => {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Lede = primi ~280 char del testo Scout puliti.
const extractLede = (text: string): string => {
  if (!text) return '';
  let clean = text
    .replace(/```\s*json[\s\S]*?```/gi, '')
    .replace(/```\s*json[\s\S]*$/i, '')
    .replace(/\s*\[\[[\d,\s]+\]\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length > 280) clean = clean.substring(0, 280).replace(/\s+\S*$/, '') + '…';
  return clean;
};

// Estrae la quota dal blocco odds di una partita data l'etichetta del pronostico.
// Le quote DC (1X/X2/12) si calcolano combinando 1, X, 2 con formula 1/(1/a + 1/b).
const getQuoteFromOdds = (odds: Record<string, any> | undefined | null, pronostico: string | null | undefined): number | null => {
  if (!odds || !pronostico) return null;
  const p = String(pronostico).trim();
  const num = (v: any) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : null);
  const o1 = num(odds['1']), oX = num(odds['X']), o2 = num(odds['2']);
  const dcCombine = (a: number | null, b: number | null) => {
    if (a == null || b == null) return null;
    return 1 / (1 / a + 1 / b);
  };
  if (p === '1') return o1;
  if (p === 'X') return oX;
  if (p === '2') return o2;
  if (p === 'Doppia Chance 1X' || p === '1X') return dcCombine(o1, oX);
  if (p === 'Doppia Chance X2' || p === 'X2') return dcCombine(oX, o2);
  if (p === 'Doppia Chance 12' || p === '12') return dcCombine(o1, o2);
  const norm = p.toLowerCase().replace(/\s+/g, '');
  if (norm === 'over1.5' || norm === 'over15') return num(odds.over_15);
  if (norm === 'under1.5' || norm === 'under15') return num(odds.under_15);
  if (norm === 'over2.5' || norm === 'over25') return num(odds.over_25);
  if (norm === 'under2.5' || norm === 'under25') return num(odds.under_25);
  if (norm === 'over3.5' || norm === 'over35') return num(odds.over_35);
  if (norm === 'under3.5' || norm === 'under35') return num(odds.under_35);
  if (norm === 'gol' || norm === 'goal' || norm === 'gg') return num(odds.gg);
  if (norm === 'nogol' || norm === 'nogoal' || norm === 'ng') return num(odds.ng);
  return null;
};

// Top tip = pronostico con confidence piu' alta != NO BET.
const getTopTip = (m: Match): PronosticoTip | null => {
  if (!m.pronostici || m.pronostici.length === 0) return null;
  const sorted = [...m.pronostici].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  return sorted.find(p => p.pronostico && p.pronostico !== 'NO BET') || null;
};

const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MESI_LUNGHI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const GIORNI_LUNGHI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const fmtDateLabel = (d: Date): string => `${d.getDate()} ${MESI[d.getMonth()]}`;

const STYLES = `
  :root{
    --bg:#0a0b0f;
    --bg-2:#0d0f15;
    --bg-3:#11141c;
    --line:rgba(255,255,255,0.08);
    --line-strong:rgba(255,255,255,0.14);
    --t:rgba(255,255,255,0.92);
    --t-dim:rgba(255,255,255,0.55);
    --t-faint:rgba(255,255,255,0.30);
    --cyan:#22d3ee;
    --cyan-ink:#04141a;
    --green:#4ade80;
    --yellow:#facc15;
    --red:#ef4444;
    --pron-bar-bg:rgba(255,255,255,0.06);
    --crest-shadow:inset 0 0 0 1px rgba(255,255,255,0.18);
    --rail-dot:var(--bg);
  }
  :root[data-theme="light"]{
    --bg:#f0f2f5;
    --bg-2:#ffffff;
    --bg-3:#e8eaef;
    --line:rgba(0,0,0,0.08);
    --line-strong:rgba(0,0,0,0.14);
    --t:#111827;
    --t-dim:#6b7280;
    --t-faint:#9ca3af;
    --cyan:#0891b2;
    --cyan-ink:#ffffff;
    --green:#16a34a;
    --yellow:#ca8a04;
    --red:#dc2626;
    --pron-bar-bg:rgba(0,0,0,0.06);
    --crest-shadow:inset 0 0 0 1px rgba(0,0,0,0.10);
    --rail-dot:var(--bg-2);
  }
  .news-root *{box-sizing:border-box}
  .news-root{background:var(--bg);color:var(--t);font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
  .news-root .mono{font-family:'JetBrains Mono','Consolas',ui-monospace,monospace;font-feature-settings:"cv11"}
  .news-root a{color:inherit;text-decoration:none}

  .news-root .chyron{position:sticky;top:0;z-index:50;background:var(--bg);border-bottom:1px solid var(--line)}
  .news-root .chyron-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;padding:10px 24px}
  .news-root .brand{display:flex;align-items:center;gap:10px}
  .news-root .brand-mark{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#22d3ee 0%, #0ea5b7 100%);display:grid;place-items:center;color:#04141a;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18);font-family:'JetBrains Mono',monospace;font-size:14px}
  .news-root .brand-name{font-weight:600;letter-spacing:-0.01em;font-size:14.5px;line-height:1.1}
  .news-root .brand-name span{color:var(--cyan)}
  .news-root .brand-sub{font-size:11px;color:var(--t-dim);letter-spacing:0.04em;text-transform:uppercase;margin-top:2px}
  .news-root .live{display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid var(--line);border-radius:999px;font-size:11px;color:var(--t-dim);letter-spacing:0.06em;text-transform:uppercase}
  .news-root .live-dot{width:6px;height:6px;border-radius:50%;background:var(--red);box-shadow:0 0 8px var(--red);animation:newsPulse 1.4s infinite}
  @keyframes newsPulse{0%,100%{opacity:1}50%{opacity:.35}}
  .news-root .clock{display:flex;gap:14px;align-items:center;color:var(--t-dim);font-size:12px}
  .news-root .clock .mono{color:var(--t)}
  .news-root .theme-toggle{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:5px 10px;background:transparent;color:var(--t-dim);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;font-family:inherit;cursor:pointer;transition:color .15s, border-color .15s}
  .news-root .theme-toggle:hover{color:var(--t);border-color:var(--line-strong)}
  .news-root .theme-toggle .icn{font-size:13px;line-height:1}

  .news-root .ticker{border-top:1px solid var(--line);background:var(--bg-3);overflow:hidden}
  .news-root .ticker-row{display:flex;align-items:stretch;height:38px}
  .news-root .ticker-tag{flex:none;padding:0 14px;display:grid;place-items:center;background:var(--cyan);color:var(--cyan-ink);font-weight:700;font-size:11px;letter-spacing:0.12em}
  .news-root .ticker-track{flex:1;overflow:hidden;position:relative}
  .news-root .ticker-track::after,.news-root .ticker-track::before{content:"";position:absolute;top:0;bottom:0;width:60px;z-index:2;pointer-events:none}
  .news-root .ticker-track::before{left:0;background:linear-gradient(90deg,var(--bg),transparent)}
  .news-root .ticker-track::after{right:0;background:linear-gradient(270deg,var(--bg),transparent)}
  .news-root .ticker-strip{display:flex;align-items:center;gap:36px;height:100%;animation:newsSlide 60s linear infinite;white-space:nowrap;padding-left:24px}
  .news-root .ti-clickable{transition:color .15s}
  .news-root .ti-clickable:hover{color:var(--cyan)}
  .news-root .ti-clickable:hover b{color:var(--cyan)}
  @keyframes newsSlide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  .news-root .ti{display:inline-flex;align-items:center;gap:10px;font-size:12.5px;color:var(--t-dim)}
  .news-root .ti b{color:var(--t);font-weight:500}
  .news-root .ti .mono{color:var(--cyan);font-size:11.5px}
  .news-root .ti .sep{color:var(--t-faint)}

  .news-root .tabs-wrap{border-bottom:1px solid var(--line);background:var(--bg)}
  .news-root .tabs{max-width:1280px;margin:0 auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between}
  .news-root .tabs-left{display:flex;gap:2px}
  .news-root .tab{padding:18px 22px 16px;color:var(--t-dim);font-weight:500;font-size:13.5px;border-bottom:2px solid transparent;cursor:pointer;display:flex;gap:10px;align-items:baseline}
  .news-root .tab .day{color:var(--t)}
  .news-root .tab .date{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-faint)}
  .news-root .tab.active{color:var(--t);border-color:var(--cyan)}
  .news-root .tab.active .date{color:var(--cyan)}
  .news-root .tabs-meta{display:flex;gap:14px;align-items:center;font-size:12px;color:var(--t-dim)}
  .news-root .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--t);font-size:11.5px}
  .news-root .pill .dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}
  .news-root .count-pill{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-dim)}

  .news-root .masthead{max-width:1280px;margin:0 auto;padding:48px 28px 22px}
  .news-root .mast-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--t-faint);display:flex;gap:14px;align-items:center;margin-bottom:18px;flex-wrap:wrap}
  .news-root .mast-eyebrow .sep{color:var(--t-faint)}
  .news-root .mast-eyebrow b{color:var(--cyan);font-weight:500}
  .news-root .mast-title{font-size:48px;line-height:1.05;letter-spacing:-0.03em;margin:0;font-weight:600;text-wrap:balance;max-width:1000px}
  .news-root .mast-title em{font-style:normal;color:var(--cyan)}
  .news-root .mast-deck{color:var(--t-dim);font-size:16px;margin-top:14px;max-width:760px;line-height:1.6;text-wrap:pretty}
  .news-root .mast-deck b{color:var(--t);font-weight:500}

  .news-root .filter-wrap{max-width:1280px;margin:0 auto;padding:8px 28px 0}
  .news-root .filter-bar{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0;display:flex;flex-direction:column;gap:0}
  .news-root .filter-row{display:flex;align-items:center;gap:18px;flex-wrap:wrap;overflow-x:auto;scrollbar-width:none}
  .news-root .filter-row::-webkit-scrollbar{display:none}
  .news-root .filter-row .lbl{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--t-faint);flex:none;padding-right:4px}
  .news-root .filter-row .sep{color:var(--t-faint);user-select:none;font-size:13px;flex:none}
  .news-root .f-link{font-size:14px;color:var(--t-dim);cursor:pointer;white-space:nowrap;transition:color .15s;padding:2px 0;flex:none;letter-spacing:-0.005em;background:none;border:none;font-family:inherit}
  .news-root .f-link:hover{color:var(--t)}
  .news-root .f-link.on{color:var(--cyan);font-weight:500}
  .news-root .filter-row.leagues{margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);display:none}
  .news-root .filter-row.leagues.show{display:flex}
  .news-root .filter-row.leagues .lbl::before{content:"â†³ ";color:var(--t-faint);margin-right:4px}
  .news-root .filter-row.leagues .f-link{font-size:13px}

  .news-root .breadcrumb{max-width:1280px;margin:0 auto;padding:18px 28px 0;display:none;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:11.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--t-dim)}
  .news-root .breadcrumb.show{display:flex}
  .news-root .breadcrumb .crumb-path{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .news-root .breadcrumb .crumb-path span:not(.sep){color:var(--t)}
  .news-root .breadcrumb .crumb-path .sep{color:var(--t-faint)}
  .news-root .breadcrumb .crumb-path b{color:var(--cyan);font-weight:500}
  .news-root .clear-filter{display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--t-dim);border:1px solid var(--line);padding:5px 11px;border-radius:999px;transition:color .15s, border-color .15s;background:none;font-family:inherit;font-size:inherit;letter-spacing:inherit;text-transform:inherit}
  .news-root .clear-filter:hover{color:var(--t);border-color:var(--line-strong)}
  .news-root .clear-filter .x{font-size:14px;line-height:1}

  .news-root .empty-state{display:none;text-align:center;padding:60px 20px;color:var(--t-dim);font-size:15px;max-width:480px;margin:0 auto}
  .news-root .empty-state.show{display:block}
  .news-root .empty-state .eye{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--t-faint);margin-bottom:14px}

  .news-root .layout{max-width:1280px;margin:0 auto;padding:32px 28px 80px;display:grid;grid-template-columns:180px 1fr;gap:48px;align-items:start}
  .news-root .index-rail{position:sticky;top:128px;align-self:start}
  .news-root .ir-h{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--t-faint);margin-bottom:14px}
  .news-root .ir-h .ir-count{color:var(--cyan)}
  .news-root .ir-list{display:flex;flex-direction:column;border-left:1px solid var(--line);padding-left:14px;gap:1px}
  .news-root .ir-item{padding:9px 0;font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--t-dim);position:relative;cursor:pointer;line-height:1.3}
  .news-root .ir-item::before{content:"";position:absolute;left:-19px;top:14px;width:8px;height:8px;border-radius:50%;background:var(--rail-dot);border:1px solid var(--line-strong)}
  .news-root .ir-item .lbl{display:block;font-family:'Inter',sans-serif;font-size:11px;color:var(--t-faint);margin-top:1px}
  .news-root .ir-item.active{color:var(--cyan)}
  .news-root .ir-item.active::before{background:var(--cyan);border-color:var(--cyan);box-shadow:0 0 0 4px rgba(34,211,238,0.18)}
  :root[data-theme="light"] .news-root .ir-item.active::before{box-shadow:0 0 0 4px rgba(8,145,178,0.15)}
  .news-root .ir-foot{margin-top:24px;padding-top:18px;border-top:1px solid var(--line);font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--t-faint);line-height:1.5}

  .news-root .stack{display:flex;flex-direction:column;gap:0}
  .news-root .article{padding:36px 0 40px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr 260px;gap:36px;align-items:start}
  .news-root .article:first-child{padding-top:0}
  .news-root .article:last-child{border-bottom:none}
  .news-root .a-eyebrow{display:flex;gap:12px;align-items:center;margin-bottom:14px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--t-faint);flex-wrap:wrap}
  .news-root .a-eyebrow .league{color:var(--t-dim)}
  .news-root .a-eyebrow .league .ld{width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
  .news-root .a-eyebrow .ko{color:var(--t);background:var(--bg-3);padding:3px 8px;border-radius:4px;letter-spacing:0.06em}
  .news-root .a-eyebrow .deep{color:var(--green);border:1px solid currentColor;padding:3px 8px;border-radius:4px;background:transparent;font-weight:600;opacity:.95}
  .news-root .match-line{display:flex;align-items:center;gap:16px;margin:8px 0 18px}
  .news-root .ml-team{display:flex;align-items:center;gap:10px}
  .news-root .ml-crest{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px;color:#0a0b0f;box-shadow:var(--crest-shadow);flex:none}
  .news-root .ml-name{font-size:15px;font-weight:500;letter-spacing:-0.005em}
  .news-root .ml-vs{color:var(--t-faint);font-family:'JetBrains Mono',monospace;font-size:13px}
  .news-root .a-title{font-size:28px;line-height:1.18;letter-spacing:-0.022em;margin:0 0 14px;font-weight:600;text-wrap:balance}
  .news-root .a-title a:hover{color:var(--cyan)}
  .news-root .a-lede{color:var(--t-dim);font-size:15px;line-height:1.65;margin:0 0 14px;text-wrap:pretty}
  .news-root .a-lede b{color:var(--t);font-weight:500}
  .news-root .a-bullets{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:var(--t-dim)}
  .news-root .a-bullets li{padding-left:18px;position:relative}
  .news-root .a-bullets li::before{content:"→";position:absolute;left:0;color:var(--cyan);font-family:'JetBrains Mono',monospace}
  .news-root .a-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;border-top:1px dashed var(--line);padding-top:14px;margin-top:8px}
  .news-root .by-line{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-faint);display:flex;gap:10px;flex-wrap:wrap}
  .news-root .by-line b{color:var(--t-dim);font-weight:500}
  .news-root .read-link{display:inline-flex;align-items:center;gap:6px;color:var(--cyan);font-size:13.5px;font-weight:500;border-bottom:1px solid currentColor;padding-bottom:1px;opacity:.8}
  .news-root .read-link:hover{opacity:1}

  .news-root .pron-card{background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:14px}
  .news-root .pron-h{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--t-faint);display:flex;justify-content:space-between;align-items:center}
  .news-root .pron-h .src-count{color:var(--t-dim)}
  .news-root .pron-main{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
  .news-root .pron-pick{font-size:13px;color:var(--t-dim)}
  .news-root .pron-pick b{display:block;font-size:20px;color:var(--t);font-weight:600;margin-bottom:2px;letter-spacing:-0.01em}
  .news-root .pron-num{font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:600;color:var(--cyan);line-height:1;letter-spacing:-0.03em}
  .news-root .pron-num.med{color:var(--yellow)}
  .news-root .pron-num small{font-size:14px;color:var(--t-dim);margin-left:1px;font-weight:400}
  .news-root .pron-bar{height:5px;background:var(--pron-bar-bg);border-radius:3px;overflow:hidden}
  .news-root .pron-bar i{display:block;height:100%;background:var(--cyan)}
  .news-root .pron-bar.med i{background:var(--yellow)}
  .news-root .pron-stats{display:flex;flex-direction:column;border-top:1px solid var(--line);padding-top:12px}
  .news-root .pron-stats .r{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-faint)}
  .news-root .pron-stats .r b{color:var(--t);font-weight:500}
  .news-root .pron-foot{display:flex;flex-direction:column;gap:8px}
  .news-root .open-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--cyan);color:var(--cyan-ink);border:1px solid var(--cyan);font-weight:600;padding:10px 14px;border-radius:999px;font-size:12.5px;cursor:pointer;text-decoration:none;transition:opacity .15s}
  .news-root .open-btn:hover{opacity:.85}
  .news-root .open-btn .arrow{transition:transform .15s}
  .news-root .open-btn:hover .arrow{transform:translateX(2px)}

  .news-root .article.feature .a-title{font-size:36px;line-height:1.1}
  .news-root .article.feature .match-line .ml-crest{width:44px;height:44px;font-size:15px}
  .news-root .article.feature .match-line .ml-name{font-size:18px}

  .news-root .site-foot{max-width:1280px;margin:0 auto;padding:32px 28px 60px;border-top:1px solid var(--line);font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t-faint);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px}
  .news-root .site-foot b{color:var(--t-dim);font-weight:500}

  .news-root .missing{color:var(--yellow);font-style:italic;opacity:.75;border-bottom:1px dotted var(--yellow);cursor:help}
  .news-root .c-ars{background:radial-gradient(circle at 35% 30%, #ff7373, #c81919 70%);color:#fff}
  .news-root .c-new{background:radial-gradient(circle at 35% 30%, #6b7280, #0a0b0f 70%);color:#fff}
  .news-root .c-liv{background:radial-gradient(circle at 35% 30%, #f87171, #991b1b 70%);color:#fff}
  .news-root .c-cry{background:radial-gradient(circle at 35% 30%, #60a5fa, #1e40af 70%);color:#fff}
  .news-root .c-aik{background:radial-gradient(circle at 35% 30%, #1f2937, #000 70%);color:#facc15}
  .news-root .c-dju{background:radial-gradient(circle at 35% 30%, #93c5fd, #1e3a8a 70%);color:#fff}
  .news-root .c-mff{background:radial-gradient(circle at 35% 30%, #38bdf8, #0369a1 70%);color:#fff}
  .news-root .c-ham{background:radial-gradient(circle at 35% 30%, #4ade80, #166534 70%);color:#fff}
  .news-root .c-fla{background:radial-gradient(circle at 35% 30%, #ef4444, #7f1d1d 70%);color:#fff}
  .news-root .c-atm{background:radial-gradient(circle at 35% 30%, #374151, #000 70%);color:#fff}
  .news-root .c-bot{background:radial-gradient(circle at 35% 30%, #4b5563, #000 70%);color:#fff}
  .news-root .c-int{background:radial-gradient(circle at 35% 30%, #f87171, #991b1b 70%);color:#fff}
  .news-root .c-hjk{background:radial-gradient(circle at 35% 30%, #60a5fa, #1d4ed8 70%);color:#fff}
  .news-root .c-itu{background:radial-gradient(circle at 35% 30%, #fbbf24, #b45309 70%);color:#0a0b0f}

  @media (max-width:1080px){
    .news-root .layout{grid-template-columns:1fr;gap:24px}
    .news-root .index-rail{position:static;background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:16px}
    .news-root .ir-list{flex-direction:row;flex-wrap:wrap;border-left:none;padding-left:0;gap:12px}
    .news-root .ir-item{padding:4px 12px 4px 14px;border:1px solid var(--line);border-radius:6px}
    .news-root .ir-item::before{display:none}
    .news-root .ir-foot{display:none}
    .news-root .article{grid-template-columns:1fr}
  }
  @media (max-width:760px){
    .news-root .chyron-row{padding:10px 16px;gap:10px;grid-template-columns:auto 1fr auto}
    .news-root .brand-sub{display:none}
    .news-root .live{font-size:10px;padding:3px 8px}
    .news-root .clock span:first-child{display:none}
    .news-root .tabs{padding:0 16px}
    .news-root .tab{padding:14px 12px 12px}
    .news-root .masthead, .news-root .filter-wrap, .news-root .breadcrumb, .news-root .layout, .news-root .site-foot{padding-left:16px;padding-right:16px}
    .news-root .mast-title{font-size:30px}
    .news-root .mast-deck{font-size:14.5px}
    .news-root .article.feature .a-title, .news-root .a-title{font-size:22px}
    .news-root .pron-card{padding:14px}
    .news-root .filter-row{gap:14px}
  }
  @media (max-width:480px){
    .news-root .tabs-meta .pill{display:none}
    .news-root .ticker-tag{padding:0 10px;font-size:10px}
  }
`;

// Ticker dinamico: scorre fino a 8 partite reali (oggi + domani + dopodomani)
// filtrate per quelle con articolo Scout disponibile. Ogni voce e' cliccabile e
// apre l'articolo della partita corrispondente.
const TickerStrip: React.FC<{
  items: Array<{ time: string; league: string; home: string; away: string; date: string; pick: string; conf: number }>;
  onItemClick: (home: string, away: string, date: string) => void;
}> = ({ items, onItemClick }) => {
  const list = items.length > 0 ? items : null;
  return (
    <div className="ticker-strip">
      {[0,1].map(loop => (
        <React.Fragment key={loop}>
          {list ? list.map((it, i) => (
            <span
              className="ti ti-clickable"
              key={`${loop}-${i}`}
              onClick={() => onItemClick(it.home, it.away, it.date)}
              style={{ cursor: 'pointer' }}
            >
              <span className="mono">{it.time}</span>
              <b>{it.league} · {it.home}–{it.away}</b>
              <span className="sep">·</span> pronostico <b>{it.pick}</b> conf. <span className="mono">{it.conf}%</span>
            </span>
          )) : (
            <span className="ti"><span className="mono">--:--</span><b>Caricamento partite in corso...</b></span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const News: React.FC<NewsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  // Legge ?tab= dall'URL: 'today'/'tomorrow'/'after' o 'oggi'/'domani'/'dopodomani'
  // Default 'oggi'. Permette al menu nav della Dashboard di aprire News su un
  // tab specifico (es. /news?tab=tomorrow).
  const [searchParams] = useSearchParams();
  const initialTab: 'oggi' | 'domani' | 'dopodomani' = (() => {
    const t = (searchParams.get('tab') || '').toLowerCase();
    if (t === 'tomorrow' || t === 'domani') return 'domani';
    if (t === 'after' || t === 'dopodomani') return 'dopodomani';
    return 'oggi';
  })();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [clockMono, setClockMono] = useState('14:32:07 CEST');
  const [activeTab, setActiveTab] = useState<'oggi' | 'domani' | 'dopodomani'>(initialTab);
  const [activeCountry, setActiveCountry] = useState<string>('');
  const [activeLeague, setActiveLeague] = useState<string>('');
  const [activeRail, setActiveRail] = useState<string>('');

  // Modali: scheda squadra + scheda redattore.
  const [teamModal, setTeamModal] = useState<{ open: boolean; nome: string; loading: boolean; data: any | null; error: string | null }>({ open: false, nome: '', loading: false, data: null, error: null });
  const [redattoreModal, setRedattoreModal] = useState<Redattore | null>(null);

  const openTeamModal = async (nome: string) => {
    setTeamModal({ open: true, nome, loading: true, data: null, error: null });
    try {
      const url = `${API_BASE}/simulation/teams/by-name?name=${encodeURIComponent(nome)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setTeamModal(prev => ({ ...prev, loading: false, error: errJson.error || `Errore ${res.status}` }));
        return;
      }
      const json = await res.json();
      setTeamModal(prev => ({ ...prev, loading: false, data: json }));
    } catch (e: any) {
      setTeamModal(prev => ({ ...prev, loading: false, error: e?.message || 'Errore rete' }));
    }
  };
  const closeTeamModal = () => setTeamModal({ open: false, nome: '', loading: false, data: null, error: null });

  // Dati reali dal backend.
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Placeholder inline riutilizzabili nel JSX.
  const todoTag = (label: string) =>
    <span className="missing" title={`Da sistemare: "${label}" non e' ancora popolato dal backend`}>da sistemare: {label}</span>;
  const missingTag = (label: string) =>
    <span className="missing" title={`"${label}" non disponibile per questa partita`}>?</span>;
  const MISSING_PLAIN = '—';

  // load theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('ai-sim-news-theme');
    if (saved === 'light') setTheme('light');
  }, []);

  // apply theme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ai-sim-news-theme', theme);
  }, [theme]);

  // clock
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setClockMono(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} CEST`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // load Google Fonts
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'ai-sim-news-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // Data attiva (oggi/domani/dopodomani) -> ISO YYYY-MM-DD.
  const activeDateISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (activeTab === 'domani') d.setDate(d.getDate() + 1);
    else if (activeTab === 'dopodomani') d.setDate(d.getDate() + 2);
    return isoDate(d);
  }, [activeTab]);

  // Fetch partite per la data attiva, tieni solo quelle con testo Scout.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Helper: processa il payload (cache o rete) - logica condivisa.
    const processPredictions = (preds: Match[]) => {
      const withArticle = preds.filter(p => !!(p.scout_deep?.scout_text || p.scout_lite?.scout_text));
      withArticle.sort((a, b) => (a.match_time || '').localeCompare(b.match_time || ''));
      setMatches(withArticle);
    };

    // Provo prima la cache sessionStorage (popolata da PredictionsContext o
    // da una precedente visita a News/NewsArticolo). TTL 5 min: oltre rifaccio
    // fetch fresh per non mostrare dati stantii.
    try {
      const cached = sessionStorage.getItem(`sz-v2-${activeDateISO}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageMs = Date.now() - (parsed.ts || 0);
        if (ageMs < 5 * 60 * 1000 && Array.isArray(parsed.predictions)) {
          processPredictions(parsed.predictions);
          setLoading(false);
          return () => { cancelled = true; };
        }
      }
    } catch { /* cache corrotta: ignora e va su rete */ }

    fetch(`${API_BASE}/simulation/sistema-z-predictions?date=${activeDateISO}`)
      .then(r => r.json())
      .then((data: ApiResp) => {
        if (cancelled) return;
        const preds = Array.isArray(data?.predictions) ? data.predictions : [];
        processPredictions(preds);
        // Cache in sessionStorage: NewsArticolo riusa il payload invece di
        // rifare la stessa fetch da 6s. TTL 5 min via timestamp.
        try {
          sessionStorage.setItem(`sz-v2-${activeDateISO}`, JSON.stringify({
            ts: Date.now(),
            predictions: preds,
          }));
        } catch { /* quota piena o disabilitato: ignora */ }
      })
      .catch(err => { if (!cancelled) setError(err?.message || 'Errore di rete'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeDateISO]);

  const countryOf = (m: Match): string => LEAGUE_TO_COUNTRY[m.league || m.lega || ''] || '';

  // Filtro nazione + lega.
  const filtered = useMemo(() => matches.filter(m => {
    if (activeCountry && countryOf(m) !== activeCountry) return false;
    if (activeLeague) {
      const lg = m.league || m.lega || '';
      if (leagueSlug(lg) !== activeLeague) return false;
    }
    return true;
  }), [matches, activeCountry, activeLeague]);

  const visibleCountries = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => { const c = countryOf(m); if (c) set.add(c); });
    return Array.from(set).sort();
  }, [matches]);

  const visibleLeaguesForCountry = useMemo(() => {
    if (!activeCountry) return [] as Array<{ slug: string; name: string }>;
    const seen = new Map<string, string>();
    matches.forEach(m => {
      if (countryOf(m) !== activeCountry) return;
      const lg = m.league || m.lega || '';
      const slug = leagueSlug(lg);
      if (lg && !seen.has(slug)) seen.set(slug, lg);
    });
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [matches, activeCountry]);

  const visibleLeaguesAll = new Set(filtered.map(m => leagueSlug(m.league || m.lega || '')));

  const openArticle = (e: React.MouseEvent, m: Match) => {
    e.preventDefault();
    const params = new URLSearchParams({ home: m.home, away: m.away, date: m.date });
    navigate(`/news/articolo?${params.toString()}`);
  };

  const handleCountry = (c: string) => {
    if (activeCountry === c || c === '') {
      setActiveCountry('');
      setActiveLeague('');
    } else {
      setActiveCountry(c);
      setActiveLeague('');
    }
  };

  const handleLeague = (lg: string) => {
    setActiveLeague(prev => (prev === lg ? '' : lg));
  };

  const clearFilter = () => {
    setActiveCountry('');
    setActiveLeague('');
  };

  const shown = filtered.length;
  const legheCount = visibleLeaguesAll.size;
  const countText = `${shown} articol${shown === 1 ? 'o' : 'i'} · ${legheCount} ${legheCount === 1 ? 'lega' : 'leghe'}`;

  const isLight = theme === 'light';

  // Date dei tab per l'eyebrow.
  const datesTabs = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const after = new Date(today); after.setDate(today.getDate() + 2);
    return { today, tomorrow, after };
  }, []);

  // Ticker dinamico: leggo le 3 date dalla cache sessionStorage (popolata da
  // PredictionsContext o dal fetch corrente) e compongo fino a 8 partite con
  // articolo + pronostico. Ordinate per data+orario crescente.
  const [tickerItems, setTickerItems] = useState<Array<{ time: string; league: string; home: string; away: string; date: string; pick: string; conf: number }>>([]);
  useEffect(() => {
    const isoOf = (d: Date) => d.toISOString().split('T')[0];
    const dates = [isoOf(datesTabs.today), isoOf(datesTabs.tomorrow), isoOf(datesTabs.after)];
    const all: Match[] = [];
    for (const d of dates) {
      try {
        const raw = sessionStorage.getItem(`sz-v2-${d}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.predictions)) continue;
        for (const m of parsed.predictions) {
          if (m.scout_deep?.scout_text || m.scout_lite?.scout_text) all.push(m);
        }
      } catch { /* cache rotta, skip */ }
    }
    // Ordina per data + match_time
    all.sort((a, b) => {
      const da = (a.date || '') + (a.match_time || '');
      const db = (b.date || '') + (b.match_time || '');
      return da.localeCompare(db);
    });
    const items = all.slice(0, 8).map(m => {
      const tip = getTopTip(m);
      return {
        time: m.match_time || '--:--',
        league: (m.league || m.lega || '').replace('Premier League', 'Premier'),
        home: m.home,
        away: m.away,
        date: m.date,
        pick: tip?.pronostico || '?',
        conf: tip?.confidence != null ? Math.round(tip.confidence) : 0,
      };
    });
    setTickerItems(items);
  }, [matches, datesTabs]);  // si aggiorna quando matches cambia (= nuova cache disponibile)
  const activeDateObj = activeTab === 'oggi' ? datesTabs.today : activeTab === 'domani' ? datesTabs.tomorrow : datesTabs.after;
  const dateDots = `${String(activeDateObj.getDate()).padStart(2, '0')} · ${String(activeDateObj.getMonth() + 1).padStart(2, '0')} · ${activeDateObj.getFullYear()}`;
  const GIORNI = ['dom','lun','mar','mer','gio','ven','sab'];
  const now = new Date();
  const dateLabelChyron = `${GIORNI[now.getDay()]} ${now.getDate()} ${MESI[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="news-root" data-screen-label="Mockup D · Home">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ============ CHYRON ============ */}
      <header className="chyron">
        <div className="chyron-row">
          <div className="brand" onClick={onBack} style={onBack ? { cursor: 'pointer' } : undefined}>
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-name">AI<span>·</span>Simulator</div>
              <div className="brand-sub">Newsroom synth · v2.4</div>
            </div>
          </div>
          <div style={{ justifySelf: 'center' }}>
            <span className="live"><span className="live-dot" />News feed live</span>
          </div>
          <div className="clock">
            <span>{dateLabelChyron}</span>
            <span className="mono">{clockMono}</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambia tema">
              <span className="icn">{isLight ? '☾' : '☀'}</span>
              <span>{isLight ? 'Scuro' : 'Chiaro'}</span>
            </button>
          </div>
        </div>
        <div className="ticker">
          <div className="ticker-row">
            <div className="ticker-tag">AI · DESK</div>
            <div className="ticker-track">
              <TickerStrip
                items={tickerItems}
                onItemClick={(home, away, date) => {
                  const params = new URLSearchParams({ home, away, date });
                  navigate(`/news/articolo?${params.toString()}`);
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ============ TABS ============ */}
      <div className="tabs-wrap">
        <div className="tabs">
          <div className="tabs-left">
            <div className={`tab ${activeTab === 'oggi' ? 'active' : ''}`} onClick={() => setActiveTab('oggi')}><span className="day">Oggi</span><span className="date">{fmtDateLabel(datesTabs.today)}</span></div>
            <div className={`tab ${activeTab === 'domani' ? 'active' : ''}`} onClick={() => setActiveTab('domani')}><span className="day">Domani</span><span className="date">{fmtDateLabel(datesTabs.tomorrow)}</span></div>
            <div className={`tab ${activeTab === 'dopodomani' ? 'active' : ''}`} onClick={() => setActiveTab('dopodomani')}><span className="day">Dopodomani</span><span className="date">{fmtDateLabel(datesTabs.after)}</span></div>
          </div>
          <div className="tabs-meta">
            <span className="pill"><span className="dot" />Modello DEEP · T-6h</span>
            <span className="count-pill">{countText}</span>
          </div>
        </div>
      </div>

      {/* ============ MASTHEAD ============ */}
      <section className="masthead">
        <div className="mast-eyebrow">
          <span>AI Newsroom</span><span className="sep">·</span>
          <span className="mono">{clockMono}</span><span className="sep">·</span>
          <span>{dateLabelChyron}</span>
        </div>
        <h1 className="mast-title"><em>In programma</em> {GIORNI_LUNGHI[activeDateObj.getDay()]} {activeDateObj.getDate()} {MESI_LUNGHI[activeDateObj.getMonth()]}</h1>
        <p className="mast-deck">
          <b>{shown} {shown === 1 ? 'articolo' : 'articoli'}</b>
          <span style={{ opacity: .5, margin: '0 10px' }}>·</span>
          <b>{legheCount} {legheCount === 1 ? 'lega' : 'leghe'}</b>
          <span style={{ opacity: .5, margin: '0 10px' }}>·</span>
          generati dalla redazione AI di AI Simulator
        </p>
      </section>

      {/* ============ FILTRO (dinamico, sui dati reali) ============ */}
      <div className="filter-wrap">
        <div className="filter-bar">
          <div className="filter-row countries">
            <span className="lbl">Notizie da</span>
            <button className={`f-link ${activeCountry === '' ? 'on' : ''}`} onClick={() => handleCountry('')}>Tutte</button>
            {visibleCountries.map(c => (
              <React.Fragment key={c}>
                <span className="sep">·</span>
                <button className={`f-link ${activeCountry === c ? 'on' : ''}`} onClick={() => handleCountry(c)}>{COUNTRY_LABEL[c] || c}</button>
              </React.Fragment>
            ))}
          </div>
          {activeCountry && visibleLeaguesForCountry.length > 0 && (
            <div className="filter-row leagues show">
              <span className="lbl">Leghe</span>
              <button className={`f-link ${activeLeague === '' ? 'on' : ''}`} onClick={() => setActiveLeague('')}>Tutte</button>
              {visibleLeaguesForCountry.map(l => (
                <React.Fragment key={l.slug}>
                  <span className="sep">·</span>
                  <button className={`f-link ${activeLeague === l.slug ? 'on' : ''}`} onClick={() => handleLeague(l.slug)}>{l.name}</button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* breadcrumb */}
      {activeCountry && (
        <div className="breadcrumb show">
          <div className="crumb-path">
            <span>Notizie</span>
            <span className="sep">/</span>
            <span>{COUNTRY_LABEL[activeCountry] || activeCountry}</span>
            {activeLeague && (
              <>
                <span className="sep">/</span>
                <b>{visibleLeaguesForCountry.find(l => l.slug === activeLeague)?.name || activeLeague}</b>
              </>
            )}
          </div>
          <button className="clear-filter" onClick={clearFilter}><span className="x">×</span> Rimuovi filtro</button>
        </div>
      )}

      {/* ============ LAYOUT (dinamico, dati reali dal backend) ============ */}
      <div className="layout">
        <aside className="index-rail">
          <div className="ir-h">Indice · {activeTab} <span className="ir-count">({shown})</span></div>
          <div className="ir-list">
            {filtered.map((m, i) => {
              const id = `a-${i + 1}`;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`ir-item ${activeRail === id ? 'active' : ''}`}
                  onClick={(e) => { setActiveRail(id); openArticle(e, m); }}
                >
                  {m.match_time || MISSING_PLAIN}<span className="lbl">{m.home} · {m.away}</span>
                </a>
              );
            })}
            {filtered.length === 0 && !loading && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--t-faint)', padding: '6px 0' }}>—</div>
            )}
          </div>
          <div className="ir-foot">
            Pubblicazione automatica T-6h dal kickoff. Nessun intervento editoriale umano.
          </div>
        </aside>

        <main className="stack">
          {loading && (
            <div className="empty-state show">
              <div className="eye">Caricamento</div>
              <p>Caricamento articoli in corso…</p>
            </div>
          )}
          {!loading && error && (
            <div className="empty-state show">
              <div className="eye">Errore</div>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="empty-state show">
              <div className="eye">Nessun articolo</div>
              <p>{activeCountry || activeLeague
                ? 'Nessuna partita corrisponde al filtro selezionato per questa giornata.'
                : 'Nessun articolo disponibile per questa giornata. Gli articoli vengono pubblicati a partire da T-6h dal kickoff.'}</p>
            </div>
          )}
          {!loading && !error && filtered.map((m, idx) => {
            const id = `a-${idx + 1}`;
            const isFeature = idx === 0;
            const effort: 'DEEP' | 'LITE' = m.scout_deep?.scout_text ? 'DEEP' : 'LITE';
            const scoutText = (effort === 'DEEP' ? m.scout_deep?.scout_text : m.scout_lite?.scout_text) || '';
            const lede = extractLede(scoutText);
            const tip = getTopTip(m);
            const conf = tip?.confidence || 0;
            const confMed = conf < 60;
            const dotColor = leagueDotColor(m.league || '');
            const title = `${m.home}–${m.away}: ${tip?.pronostico ? `pronostico ${tip.pronostico} con confidenza ${conf.toFixed(0)}%` : 'analisi pre-partita'}`;
            // Redattore assegnato (deterministico: stessa partita = sempre stesso redattore)
            const redattore = assegnaRedattore({ home: m.home, away: m.away, date: m.date, league: m.league || m.lega || '' });
            return (
              <article key={id} className={`article ${isFeature ? 'feature' : ''}`} id={id}>
                <div>
                  <div className="a-eyebrow">
                    <span className="league">
                      <span className="ld" style={{ background: dotColor }} />
                      {m.league || m.lega || todoTag('lega')}
                    </span>
                    <span className="ko">Kickoff {m.match_time || missingTag('orario')}{m.news_meta?.stadio?.name ? <>{' '}· {m.news_meta.stadio.name}</> : <>{' '}· {missingTag('stadio')}</>}</span>
                    <span className={effort === 'DEEP' ? 'deep' : 'lite'} style={effort === 'LITE' ? { color: 'var(--yellow)' } : undefined}>{effort}</span>
                  </div>
                  <div className="match-line">
                    <div className="ml-team">
                      {m.home_mongo_id ? (
                        <img
                          className="ml-crest"
                          src={m.home_logo_url || getStemmaUrl(m.home_mongo_id, m.league || m.lega)}
                          alt={m.home}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = target.nextElementSibling as HTMLElement | null;
                            target.style.display = 'none';
                            if (fallback) fallback.style.display = 'grid';
                          }}
                          style={{
                            objectFit: 'contain', background: 'transparent',
                            borderRadius: 0, boxShadow: 'none',
                          }}
                        />
                      ) : null}
                      <div className="ml-crest" style={{
                        background: crestGradient(m.home),
                        display: m.home_mongo_id ? 'none' : 'grid',
                      }}>{crestInitial(m.home)}</div>
                      <div className="ml-name"><span className="player-link" onClick={(e) => { e.stopPropagation(); openTeamModal(m.home); }} style={{ cursor: 'pointer' }}>{m.home}</span></div>
                    </div>
                    <div className="ml-vs">vs</div>
                    <div className="ml-team">
                      {m.away_mongo_id ? (
                        <img
                          className="ml-crest"
                          src={m.away_logo_url || getStemmaUrl(m.away_mongo_id, m.league || m.lega)}
                          alt={m.away}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = target.nextElementSibling as HTMLElement | null;
                            target.style.display = 'none';
                            if (fallback) fallback.style.display = 'grid';
                          }}
                          style={{
                            objectFit: 'contain', background: 'transparent',
                            borderRadius: 0, boxShadow: 'none',
                          }}
                        />
                      ) : null}
                      <div className="ml-crest" style={{
                        background: crestGradient(m.away),
                        display: m.away_mongo_id ? 'none' : 'grid',
                      }}>{crestInitial(m.away)}</div>
                      <div className="ml-name"><span className="player-link" onClick={(e) => { e.stopPropagation(); openTeamModal(m.away); }} style={{ cursor: 'pointer' }}>{m.away}</span></div>
                    </div>
                  </div>
                  <h2 className="a-title">
                    <a href={`#${id}`} onClick={(e) => openArticle(e, m)} style={{ cursor: 'pointer' }}>{title}</a>
                  </h2>
                  {lede && <p className="a-lede">{lede}</p>}
                  <div className="a-foot">
                    <div className="by-line">
                      <span>Articolo a cura di <b onClick={(e) => { e.stopPropagation(); setRedattoreModal(redattore); }} style={{ cursor: 'pointer' }}>{redattore.nome}</b></span>
                    </div>
                    <a className="read-link" href={`#${id}`} onClick={(e) => openArticle(e, m)} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
                  </div>
                </div>
                <aside className="pron-card">
                  <div className="pron-h"><span>Pronostico AI</span><span className="src-count">{effort === 'DEEP' ? 'Scout Deep' : 'Scout Lite'}</span></div>
                  <div className="pron-main">
                    <div className="pron-pick">
                      <b>{tip?.pronostico || '—'}</b>
                      {tip?.tipo ? tip.tipo : 'esito principale'}
                    </div>
                    <div className={`pron-num${confMed ? ' med' : ''}`}>
                      {tip ? conf.toFixed(0) : '—'}<small>%</small>
                    </div>
                  </div>
                  <div className={`pron-bar${confMed ? ' med' : ''}`}><i style={{ width: `${conf}%` }} /></div>
                  <div className="pron-stats">
                    <div className="r"><span>xG medio · casa</span><b>{m.news_meta?.home?.xg_avg != null ? m.news_meta.home.xg_avg.toFixed(2) : missingTag('xG casa')}</b></div>
                    <div className="r"><span>xG medio · trasf.</span><b>{m.news_meta?.away?.xg_avg != null ? m.news_meta.away.xg_avg.toFixed(2) : missingTag('xG trasferta')}</b></div>
                    <div className="r"><span>Gol totali attesi</span><b>{m.expected_total_goals != null ? m.expected_total_goals.toFixed(2) : missingTag('gol attesi')}</b></div>
                    <div className="r"><span>Quota mercato</span><b>{(() => {
                      const q = tip?.quota || getQuoteFromOdds(m.odds, tip?.pronostico);
                      return q ? q.toFixed(2) : missingTag('quota');
                    })()}</b></div>
                  </div>
                  <div className="pron-foot">
                    <a className="open-btn" href={`#${id}`} onClick={(e) => openArticle(e, m)} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
                  </div>
                </aside>
              </article>
            );
          })}
        </main>
      </div>

      <footer className="site-foot">
        <div>Tutti i contenuti sono generati da modelli linguistici. <b>Le previsioni non costituiscono consigli di scommessa.</b></div>
        <div>build · 2026.05.18 · pipeline #11471 · /v1/research</div>
      </footer>

      {teamModal.open && (
        <TeamScheda
          nome={teamModal.nome}
          loading={teamModal.loading}
          data={teamModal.data}
          error={teamModal.error}
          onClose={closeTeamModal}
        />
      )}
      {redattoreModal && (
        <RedattoreProfilo redattore={redattoreModal} onClose={() => setRedattoreModal(null)} />
      )}
    </div>
  );
};

export default News;
