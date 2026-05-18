import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { API_BASE } from '../AppDev/costanti';

interface NewsArticoloProps {
  onBack?: () => void;
}

interface PronosticoTip {
  tipo?: string;
  pronostico?: string;
  confidence?: number;
  quota?: number | null;
  source?: string;
}
interface MatchA {
  home: string;
  away: string;
  date: string;
  match_time?: string;
  league?: string;
  lega?: string;
  pronostici?: PronosticoTip[];
  scout_lite?: { scout_text?: string; computed_at?: string };
  scout_deep?: { scout_text?: string; computed_at?: string };
}
interface ApiRespA {
  success?: boolean;
  predictions?: MatchA[];
  date?: string;
}

const MESI_A = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

// Mappa lega -> nazione (slug) per il breadcrumb.
const LEAGUE_TO_COUNTRY_A: Record<string, string> = {
  'Premier League': 'inghilterra', 'Championship': 'inghilterra',
  'Serie A': 'italia', 'Serie B': 'italia',
  'LaLiga': 'spagna', 'La Liga': 'spagna',
  'Bundesliga': 'germania', '2. Bundesliga': 'germania',
  'Ligue 1': 'francia', 'Ligue 2': 'francia',
  'Eredivisie': 'olanda', 'Primeira Liga': 'portogallo',
  'Allsvenskan': 'svezia', 'Veikkausliiga': 'finlandia',
  'Brasileirao': 'brasile', 'Brasileirão': 'brasile', 'Brasileirão Serie A': 'brasile',
  'Major League Soccer': 'usa', 'MLS': 'usa',
  'Champions League': 'europa', 'Europa League': 'europa',
};
const COUNTRY_LABEL_A: Record<string, string> = {
  inghilterra: 'Inghilterra', italia: 'Italia', spagna: 'Spagna',
  germania: 'Germania', francia: 'Francia', olanda: 'Olanda',
  portogallo: 'Portogallo', svezia: 'Svezia', finlandia: 'Finlandia',
  brasile: 'Brasile', usa: 'USA', europa: 'Coppe europee',
};

// Strip dei marker dello Scout text (citation, blocco JSON finale, "peso N").
const stripScout = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.replace(/\s*\[\[[\d,\s]+\]\]/g, '');
  cleaned = cleaned.replace(/```\s*json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```\s*json[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\{\s*"decisione"\s*:[\s\S]*\}\s*$/, '');
  cleaned = cleaned.replace(/(\d{1,3}\s*%)\s*[,;]?\s*peso\s*\d+/gi, '$1');
  return cleaned.trimEnd();
};

// Spezza il testo Scout in sezioni (titoli **bold**).
// Esclude "Ipotizza un pronostico": va nel sidecar.
interface ScoutSection {
  kind: 'formazioni' | 'tattica' | 'notizie' | 'contesto' | 'ipotizza' | 'other';
  titleRaw: string;
  body: string;
}
const classifyKind = (title: string): ScoutSection['kind'] => {
  const t = title.toLowerCase();
  if (t.startsWith('formazioni')) return 'formazioni';
  if (t.startsWith('tattica')) return 'tattica';
  if (t.startsWith('notizie')) return 'notizie';
  if (t.startsWith('contesto')) return 'contesto';
  if (t.startsWith('ipotizza')) return 'ipotizza';
  return 'other';
};
const splitSections = (text: string): ScoutSection[] => {
  const re = /\*\*([^*]+)\*\*/g;
  const sections: ScoutSection[] = [];
  const matches: Array<{ title: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ title: m[1].trim(), start: m.index, end: m.index + m[0].length });
  }
  let lastIdx = 0;
  let lastTitle: string | null = null;
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    if (lastTitle !== null) {
      sections.push({ titleRaw: lastTitle, body: text.slice(lastIdx, cur.start).trim(), kind: classifyKind(lastTitle) });
    }
    lastTitle = cur.title;
    lastIdx = cur.end;
  }
  if (lastTitle !== null) {
    sections.push({ titleRaw: lastTitle, body: text.slice(lastIdx).trim(), kind: classifyKind(lastTitle) });
  }
  if (sections.length === 0) sections.push({ titleRaw: '', body: text.trim(), kind: 'other' });
  return sections;
};

const SEC_LABEL: Record<ScoutSection['kind'], string> = {
  formazioni: 'Formazioni e assenze',
  tattica: 'Tattica e stato squadra',
  notizie: 'Notizie e dichiarazioni',
  contesto: 'Contesto partita',
  ipotizza: '',
  other: '',
};
const SEC_NUM: Record<ScoutSection['kind'], string> = {
  formazioni: '01', tattica: '02', notizie: '03', contesto: '04', ipotizza: '', other: '',
};
const SEC_ID: Record<ScoutSection['kind'], string> = {
  formazioni: 'sez-1', tattica: 'sez-2', notizie: 'sez-3', contesto: 'sez-4', ipotizza: '', other: 'sez-other',
};

const leagueDotColorA = (league: string): string => {
  const lg = league || '';
  if (lg.includes('Premier')) return '#a855f7';
  if (lg.includes('Allsvenskan')) return '#facc15';
  if (lg.includes('Brasil')) return '#4ade80';
  if (lg.includes('Veikkaus')) return '#22d3ee';
  if (lg.includes('Serie A') || lg.includes('Serie B')) return '#3b82f6';
  if (lg.includes('LaLiga') || lg.includes('La Liga')) return '#ef4444';
  if (lg.includes('Bundesliga')) return '#f97316';
  if (lg.includes('Ligue')) return '#6366f1';
  return '#6b7280';
};
const crestGradientA = (name: string): string => {
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
const crestInitialA = (name: string): string => {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};
const getTopTipA = (m: MatchA): PronosticoTip | null => {
  if (!m.pronostici || m.pronostici.length === 0) return null;
  const sorted = [...m.pronostici].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  return sorted.find(p => p.pronostico && p.pronostico !== 'NO BET') || null;
};
const fmtDateLong = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  const G = ['dom','lun','mar','mer','gio','ven','sab'];
  return `${G[d.getDay()]} ${d.getDate()} ${MESI_A[d.getMonth()]} ${d.getFullYear()}`;
};

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
    --quote-bar:var(--cyan);
    --poster-overlay:rgba(255,255,255,0.02);
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
    --poster-overlay:rgba(0,0,0,0.02);
  }
  .article-root *{box-sizing:border-box}
  .article-root{background:var(--bg);color:var(--t);font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
  .article-root .mono{font-family:'JetBrains Mono','Consolas',ui-monospace,monospace;font-feature-settings:"ss01","cv11"}
  .article-root a{color:inherit;text-decoration:none}

  .article-root .topbar{border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0;z-index:50}
  .article-root .topbar-inner{max-width:1280px;margin:0 auto;padding:12px 28px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px}
  .article-root .brand{display:flex;align-items:center;gap:10px}
  .article-root .brand-mark{width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#22d3ee 0%, #0ea5b7 100%);display:grid;place-items:center;color:#04141a;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18);font-family:'JetBrains Mono',monospace;font-size:13px}
  .article-root .brand-name{font-weight:600;letter-spacing:-0.01em;font-size:14px;line-height:1.1}
  .article-root .brand-name span{color:var(--cyan)}
  .article-root .brand-name em{font-style:normal;color:var(--t-faint);font-weight:400;margin-left:4px}

  .article-root .crumb-top{justify-self:center;display:flex;align-items:center;gap:10px;font-family:'JetBrains Mono',monospace;font-size:11.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--t-dim)}
  .article-root .crumb-top .sep{color:var(--t-faint)}
  .article-root .crumb-top b{color:var(--t);font-weight:500}
  .article-root .crumb-top a{color:var(--t-dim);cursor:pointer}
  .article-root .crumb-top a:hover{color:var(--t)}

  .article-root .topbar-right{display:flex;align-items:center;gap:12px;color:var(--t-dim);font-size:12px}
  .article-root .topbar-right .mono{color:var(--t)}
  .article-root .theme-toggle{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:5px 10px;background:transparent;color:var(--t-dim);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;font-family:inherit;cursor:pointer;transition:color .15s, border-color .15s}
  .article-root .theme-toggle:hover{color:var(--t);border-color:var(--line-strong)}
  .article-root .theme-toggle .icn{font-size:13px;line-height:1}

  .article-root .article-head{max-width:1280px;margin:0 auto;padding:36px 28px 0;display:grid;grid-template-columns:1fr 280px;gap:48px}
  .article-root .a-head-main{min-width:0}
  .article-root .backlink{display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--t-dim);margin-bottom:24px;transition:color .15s;cursor:pointer;background:none;border:none;padding:0}
  .article-root .backlink:hover{color:var(--cyan)}
  .article-root .a-eyebrow{display:flex;gap:12px;align-items:center;margin-bottom:18px;font-family:'JetBrains Mono',monospace;font-size:11.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--t-faint);flex-wrap:wrap}
  .article-root .a-eyebrow .league{color:var(--t-dim)}
  .article-root .a-eyebrow .league .ld{width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
  .article-root .a-eyebrow .giornata{color:var(--t-dim)}
  .article-root .a-eyebrow .deep{color:var(--green);border:1px solid currentColor;padding:3px 8px;border-radius:4px;font-weight:600;opacity:.95}
  .article-root .a-eyebrow .sep{color:var(--t-faint)}

  .article-root .a-title{font-size:52px;line-height:1.05;letter-spacing:-0.028em;margin:0 0 18px;font-weight:600;text-wrap:balance;max-width:820px}
  .article-root .a-subtitle{font-size:19px;color:var(--t-dim);line-height:1.55;margin:0 0 26px;max-width:760px;text-wrap:pretty;font-weight:400}
  .article-root .a-subtitle b{color:var(--t);font-weight:500}

  .article-root .byline-row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--t-faint);padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .article-root .byline-row b{color:var(--t-dim);font-weight:500}
  .article-root .byline-row .author{color:var(--t)}
  .article-root .byline-row .sep{color:var(--t-faint)}

  .article-root .poster{max-width:1280px;margin:32px auto 0;padding:0 28px}
  .article-root .poster-inner{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:radial-gradient(600px 240px at 15% 50%, rgba(239,68,68,0.10), transparent 70%),radial-gradient(600px 240px at 85% 50%, rgba(75,85,99,0.18), transparent 70%),var(--poster-overlay),var(--bg-2);padding:44px 36px;display:grid;grid-template-columns:1fr auto 1fr;gap:36px;align-items:center}
  .article-root .poster-team{display:flex;align-items:center;gap:22px}
  .article-root .poster-team.away{flex-direction:row-reverse;text-align:right}
  .article-root .poster-crest{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:38px;color:#0a0b0f;box-shadow:var(--crest-shadow), 0 8px 30px rgba(0,0,0,0.25);flex:none}
  .article-root .poster-name{font-size:30px;font-weight:600;letter-spacing:-0.02em;line-height:1.05}
  .article-root .poster-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t-faint);letter-spacing:0.14em;text-transform:uppercase;margin-top:6px}
  .article-root .poster-meta b{color:var(--t-dim);font-weight:500}
  .article-root .poster-center{display:flex;flex-direction:column;align-items:center;gap:6px;padding:0 20px;border-left:1px solid var(--line);border-right:1px solid var(--line);min-width:160px}
  .article-root .poster-ko{font-family:'JetBrains Mono',monospace;font-size:54px;font-weight:600;color:var(--t);letter-spacing:-0.04em;line-height:1}
  .article-root .poster-when{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t-faint);letter-spacing:0.14em;text-transform:uppercase;margin-top:8px;text-align:center}
  .article-root .poster-when b{color:var(--t-dim);font-weight:500}
  .article-root .poster-where{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--cyan);letter-spacing:0.14em;text-transform:uppercase;margin-top:4px}

  .article-root .toc-row{max-width:1280px;margin:24px auto 0;padding:0 28px}
  .article-root .toc-inner{display:flex;gap:0;align-items:stretch;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
  .article-root .toc-inner::-webkit-scrollbar{display:none}
  .article-root .toc-link{padding:14px 22px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--t-dim);cursor:pointer;border-right:1px solid var(--line);white-space:nowrap;display:flex;align-items:center;gap:10px;transition:color .15s, background .15s}
  .article-root .toc-link:hover{color:var(--t);background:var(--bg-3)}
  .article-root .toc-link.active{color:var(--cyan)}
  .article-root .toc-link .num{color:var(--t-faint);font-weight:600}
  .article-root .toc-link:last-child{border-right:none}

  .article-root .layout{max-width:1280px;margin:0 auto;padding:48px 28px 60px;display:grid;grid-template-columns:1fr 320px;gap:60px;align-items:start}
  .article-root .body{min-width:0;max-width:760px}

  .article-root .section{margin-bottom:48px;scroll-margin-top:100px}
  .article-root .section:last-child{margin-bottom:0}
  .article-root .section-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--cyan);margin-bottom:10px;display:flex;align-items:center;gap:10px}
  .article-root .section-eyebrow .num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:1px solid currentColor;border-radius:50%;font-size:10px;font-weight:600}
  .article-root .section-h{font-size:28px;letter-spacing:-0.02em;margin:0 0 22px;font-weight:600;line-height:1.18;text-wrap:balance}
  .article-root .body p{font-size:17px;line-height:1.75;color:var(--t-dim);margin:0 0 18px;text-wrap:pretty}
  .article-root .body p b, .article-root .body p strong{color:var(--t);font-weight:600}
  .article-root .body p a{color:var(--cyan);border-bottom:1px solid currentColor;opacity:.85}
  .article-root .body p a:hover{opacity:1}

  .article-root .dropcap::first-letter{float:left;font-family:'Inter',sans-serif;font-weight:600;font-size:64px;line-height:0.9;padding:6px 12px 0 0;color:var(--cyan);letter-spacing:-0.04em}

  .article-root .body ul{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:10px}
  .article-root .body ul li{padding-left:22px;position:relative;font-size:16px;line-height:1.65;color:var(--t-dim)}
  .article-root .body ul li::before{content:"â†’";position:absolute;left:0;top:0;color:var(--cyan);font-family:'JetBrains Mono',monospace;font-weight:500}
  .article-root .body ul li b{color:var(--t);font-weight:600}

  .article-root blockquote{margin:32px 0 32px;padding:8px 0 8px 28px;border-left:3px solid var(--cyan);position:relative}
  .article-root blockquote p.q{font-size:23px;line-height:1.4;color:var(--t);font-weight:500;letter-spacing:-0.01em;margin:0 0 14px;text-wrap:pretty;font-family:'Inter',sans-serif}
  .article-root blockquote .attrib{display:block;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--t-faint)}
  .article-root blockquote .attrib b{color:var(--t-dim);font-weight:500}

  .article-root .schema{margin:28px 0;padding:18px 20px;background:var(--bg-2);border:1px solid var(--line);border-radius:10px}
  .article-root .schema-h{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--t-faint);margin-bottom:14px;display:flex;justify-content:space-between}
  .article-root .schema-h b{color:var(--cyan);font-weight:500}
  .article-root .schema-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .article-root .schema-side{display:flex;flex-direction:column;gap:6px}
  .article-root .schema-side .team-h{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px}
  .article-root .schema-side .formation{font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--cyan);font-weight:600;letter-spacing:-0.01em}
  .article-root .schema-side .players{font-size:13px;color:var(--t-dim);line-height:1.6;font-family:'JetBrains Mono',monospace}

  .article-root .sidecar{position:sticky;top:88px;display:flex;flex-direction:column;gap:18px}
  .article-root .pron-card{background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:16px}
  .article-root .pron-h{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--t-faint);display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px}
  .article-root .pron-h b{color:var(--cyan);font-weight:500}
  .article-root .pron-main{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
  .article-root .pron-pick{font-size:13px;color:var(--t-dim)}
  .article-root .pron-pick b{display:block;font-size:22px;color:var(--t);font-weight:600;margin-bottom:2px;letter-spacing:-0.01em}
  .article-root .pron-num{font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:600;color:var(--cyan);line-height:1;letter-spacing:-0.03em}
  .article-root .pron-num small{font-size:16px;color:var(--t-dim);margin-left:1px;font-weight:400}
  .article-root .pron-bar{height:6px;background:var(--pron-bar-bg);border-radius:3px;overflow:hidden}
  .article-root .pron-bar i{display:block;height:100%;background:var(--cyan)}
  .article-root .pron-marks{display:flex;justify-content:space-between;margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--t-faint)}
  .article-root .pron-stats{display:flex;flex-direction:column;border-top:1px solid var(--line);padding-top:12px}
  .article-root .pron-stats .r{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-faint);border-bottom:1px dotted var(--line)}
  .article-root .pron-stats .r:last-child{border-bottom:none}
  .article-root .pron-stats .r b{color:var(--t);font-weight:500}
  .article-root .pron-stats .r .ok{color:var(--green)}
  .article-root .pron-foot{display:flex;flex-direction:column;gap:8px;margin-top:4px}
  .article-root .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 14px;border-radius:999px;font-size:12.5px;cursor:pointer;text-decoration:none;font-family:inherit;transition:opacity .15s, background .15s}
  .article-root .btn.primary{background:var(--cyan);color:var(--cyan-ink);border:1px solid var(--cyan);font-weight:600}
  .article-root .btn.primary:hover{opacity:.85}
  .article-root .btn.ghost{background:transparent;color:var(--t);border:1px solid var(--line-strong)}
  .article-root .btn.ghost:hover{background:var(--bg-3)}
  .article-root .btn .arrow{transition:transform .15s}
  .article-root .btn:hover .arrow{transform:translateX(2px)}

  .article-root .sc-card{background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:18px}
  .article-root .sc-h{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--t-faint);margin-bottom:14px}
  .article-root .sc-list{display:flex;flex-direction:column}
  .article-root .sc-list .r{display:flex;justify-content:space-between;padding:8px 0;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-faint);border-bottom:1px dotted var(--line)}
  .article-root .sc-list .r:last-child{border-bottom:none}
  .article-root .sc-list .r b{color:var(--t);font-weight:500}

  .article-root .sources{max-width:1280px;margin:0 auto;padding:32px 28px;border-top:1px solid var(--line)}
  .article-root .sources-h{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--t-faint);margin-bottom:18px;display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:10px}
  .article-root .sources-h h3{margin:0;font-family:inherit;font-size:11px;color:var(--t);font-weight:500;letter-spacing:0.18em}
  .article-root .sources-h .meta{color:var(--t-faint)}
  .article-root .sources-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border-top:1px solid var(--line)}
  .article-root .source-item{display:grid;grid-template-columns:1fr auto auto;gap:18px;align-items:center;padding:11px 0;border-bottom:1px dotted var(--line);font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--t-dim)}
  .article-root .source-item:nth-child(odd){border-right:1px dotted var(--line);padding-right:24px}
  .article-root .source-item:nth-child(even){padding-left:24px}
  .article-root .source-item .name{color:var(--t);font-family:'Inter',sans-serif;font-size:14px;font-weight:500;letter-spacing:-0.005em}
  .article-root .source-item .kind{color:var(--t-faint);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;border:1px solid var(--line);padding:2px 7px;border-radius:4px}
  .article-root .source-item .when{color:var(--t-faint);font-size:11px}

  .article-root .disclaimer-wrap{max-width:1280px;margin:0 auto;padding:24px 28px 0}
  .article-root .disclaimer{background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:22px 26px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
  .article-root .disclaimer p{margin:0;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--t-dim);line-height:1.6;letter-spacing:0.04em}
  .article-root .disclaimer p b{color:var(--t);font-weight:500}
  .article-root .matchday-btn{display:inline-flex;align-items:center;gap:10px;background:var(--cyan);color:var(--cyan-ink);padding:12px 18px;border-radius:999px;font-weight:600;font-size:13.5px;border:1px solid var(--cyan);white-space:nowrap;text-decoration:none}
  .article-root .matchday-btn:hover{opacity:.85}

  .article-root .nav-wrap{max-width:1280px;margin:0 auto;padding:32px 28px 0}
  .article-root .nav-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .article-root .nav-card{background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:18px 22px;display:flex;flex-direction:column;gap:10px;transition:border-color .15s;cursor:pointer;text-decoration:none}
  .article-root .nav-card:hover{border-color:var(--line-strong)}
  .article-root .nav-dir{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--t-faint);display:flex;justify-content:space-between;align-items:center}
  .article-root .nav-dir .ko{color:var(--t-dim)}
  .article-root .nav-card.next .nav-dir{flex-direction:row-reverse}
  .article-root .nav-card.next{text-align:right}
  .article-root .nav-card.next .nav-row-team{justify-content:flex-end;flex-direction:row-reverse}
  .article-root .nav-row-team{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t-dim);font-family:'JetBrains Mono',monospace}
  .article-root .nav-crest{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:10px;color:#0a0b0f;box-shadow:var(--crest-shadow);flex:none}
  .article-root .nav-title{font-size:15px;color:var(--t);font-weight:500;letter-spacing:-0.005em;line-height:1.35;margin:2px 0 0}

  .article-root .site-foot{max-width:1280px;margin:40px auto 0;padding:24px 28px 50px;border-top:1px solid var(--line);font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t-faint);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px}
  .article-root .site-foot b{color:var(--t-dim);font-weight:500}

  .article-root .c-ars{background:radial-gradient(circle at 35% 30%, #ff7373, #c81919 70%);color:#fff !important}
  .article-root .c-new{background:radial-gradient(circle at 35% 30%, #6b7280, #0a0b0f 70%);color:#fff !important}
  .article-root .c-liv{background:radial-gradient(circle at 35% 30%, #f87171, #991b1b 70%);color:#fff !important}
  .article-root .c-cry{background:radial-gradient(circle at 35% 30%, #60a5fa, #1e40af 70%);color:#fff !important}

  @media (max-width:1080px){
    .article-root .article-head{grid-template-columns:1fr;gap:0}
    .article-root .layout{grid-template-columns:1fr;gap:36px}
    .article-root .sidecar{position:static}
    .article-root .a-title{font-size:40px}
    .article-root .poster-inner{padding:32px 22px;gap:18px;grid-template-columns:1fr auto 1fr}
    .article-root .poster-crest{width:72px;height:72px;font-size:28px}
    .article-root .poster-name{font-size:22px}
    .article-root .poster-ko{font-size:42px}
  }
  @media (max-width:760px){
    .article-root .topbar-inner{grid-template-columns:auto auto;padding:10px 16px}
    .article-root .crumb-top{display:none}
    .article-root .topbar-right span:not(.mono){display:none}
    .article-root .article-head, .article-root .poster, .article-root .toc-row, .article-root .layout, .article-root .sources, .article-root .disclaimer-wrap, .article-root .nav-wrap, .article-root .site-foot{padding-left:16px;padding-right:16px}
    .article-root .a-title{font-size:30px}
    .article-root .a-subtitle{font-size:16px}
    .article-root .poster-inner{padding:24px 18px;gap:12px}
    .article-root .poster-team{gap:12px}
    .article-root .poster-crest{width:54px;height:54px;font-size:20px}
    .article-root .poster-name{font-size:17px}
    .article-root .poster-meta{font-size:9.5px}
    .article-root .poster-center{padding:0 12px;min-width:0}
    .article-root .poster-ko{font-size:30px}
    .article-root .poster-when, .article-root .poster-where{font-size:9.5px}
    .article-root .section-h{font-size:22px}
    .article-root .body p{font-size:16px}
    .article-root blockquote{padding-left:18px}
    .article-root blockquote p.q{font-size:19px}
    .article-root .dropcap::first-letter{font-size:48px;padding:4px 8px 0 0}
    .article-root .schema-grid{grid-template-columns:1fr;gap:14px}
    .article-root .sources-grid{grid-template-columns:1fr}
    .article-root .source-item:nth-child(odd){border-right:none;padding-right:0}
    .article-root .source-item:nth-child(even){padding-left:0}
    .article-root .disclaimer{grid-template-columns:1fr;gap:14px}
    .article-root .nav-grid{grid-template-columns:1fr}
    .article-root .nav-card.next{text-align:left}
    .article-root .nav-card.next .nav-dir{flex-direction:row}
    .article-root .nav-card.next .nav-row-team{justify-content:flex-start;flex-direction:row}
  }
`;

const NewsArticolo: React.FC<NewsArticoloProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [clockMono, setClockMono] = useState('00:00');
  const [activeToc, setActiveToc] = useState(0);

  const homeQ = searchParams.get('home') || '';
  const awayQ = searchParams.get('away') || '';
  const dateQ = searchParams.get('date') || '';

  // Dati reali dal backend.
  const [matchData, setMatchData] = useState<MatchA | null>(null);
  const [siblings, setSiblings] = useState<MatchA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Placeholder inline distinti.
  const TODO_INLINE = <span className="missing" title="Da sistemare: questo dato non e' ancora popolato dal backend">da sistemare</span>;
  const MISSING_INLINE = <span className="missing" title="Dato non disponibile per questa partita">?</span>;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('ai-sim-news-theme');
    if (saved === 'light') setTheme('light');
  }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ai-sim-news-theme', theme);
  }, [theme]);
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setClockMono(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
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

  // Fetch partite per la data richiesta, isola quella selezionata.
  useEffect(() => {
    if (!dateQ || !homeQ || !awayQ) {
      setError('Parametri URL mancanti (home/away/date).');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/simulation/sistema-z-predictions?date=${dateQ}`)
      .then(r => r.json())
      .then((data: ApiRespA) => {
        if (cancelled) return;
        const preds = Array.isArray(data?.predictions) ? data.predictions : [];
        preds.sort((a, b) => (a.match_time || '').localeCompare(b.match_time || ''));
        const found = preds.find(p =>
          p.home?.toLowerCase() === homeQ.toLowerCase() &&
          p.away?.toLowerCase() === awayQ.toLowerCase()
        );
        if (!found) {
          setError(`Partita ${homeQ}-${awayQ} non trovata per la data ${dateQ}.`);
        } else {
          setMatchData(found);
          setSiblings(preds.filter(p => !!(p.scout_deep?.scout_text || p.scout_lite?.scout_text)));
        }
      })
      .catch(err => { if (!cancelled) setError(err?.message || 'Errore di rete'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateQ, homeQ, awayQ]);

  // TOC scroll-spy: ricalcolata dopo che sections sono state renderizzate.
  useEffect(() => {
    const update = () => {
      let activeIdx = 0;
      ['sez-1','sez-2','sez-3','sez-4'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top < 200) activeIdx = i;
      });
      setActiveToc(activeIdx);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [matchData]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };
  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBack) onBack(); else navigate('/news');
  };

  // Calcoli derivati dal match.
  const effort: 'DEEP' | 'LITE' = matchData?.scout_deep?.scout_text ? 'DEEP' : 'LITE';
  const scoutText = (effort === 'DEEP' ? matchData?.scout_deep?.scout_text : matchData?.scout_lite?.scout_text) || '';
  const cleanText = useMemo(() => stripScout(scoutText), [scoutText]);
  const sections = useMemo(() => splitSections(cleanText).filter(s => s.kind !== 'ipotizza'), [cleanText]);
  const tip = matchData ? getTopTipA(matchData) : null;
  const conf = tip?.confidence || 0;
  const confMed = conf < 60;
  const computedAt = (effort === 'DEEP' ? matchData?.scout_deep?.computed_at : matchData?.scout_lite?.computed_at) || '';
  const pubLabel = computedAt ? new Date(computedAt).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  // Nav prev/next nello stesso giorno.
  const myIdx = matchData ? siblings.findIndex(s => s.home === matchData.home && s.away === matchData.away) : -1;
  const prevMatch = myIdx > 0 ? siblings[myIdx - 1] : null;
  const nextMatch = myIdx >= 0 && myIdx < siblings.length - 1 ? siblings[myIdx + 1] : null;
  const goToSibling = (e: React.MouseEvent, m: MatchA) => {
    e.preventDefault();
    const params = new URLSearchParams({ home: m.home, away: m.away, date: m.date });
    navigate(`/news/articolo?${params.toString()}`);
  };

  const isLight = theme === 'light';
  const home = matchData?.home || homeQ;
  const away = matchData?.away || awayQ;
  const league = matchData?.league || matchData?.lega || '';
  const dotColor = leagueDotColorA(league);
  const kickoff = matchData?.match_time || '';

  return (
    <div className="article-root" data-screen-label="Mockup D · Articolo">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <style>{`.article-root .missing{color:var(--yellow);font-style:italic;opacity:.75;border-bottom:1px dotted var(--yellow);cursor:help}`}</style>

      {/* ============ TOP BAR ============ */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" onClick={onBack} style={onBack ? { cursor: 'pointer' } : undefined}>
            <div className="brand-mark">A</div>
            <div className="brand-name">AI<span>·</span>Simulator <em>/ News</em></div>
          </div>
          <div className="crumb-top">
            <a onClick={handleBack} href="/news">Notizie</a>
            {(() => {
              const countrySlug = LEAGUE_TO_COUNTRY_A[league] || '';
              const countryLabel = COUNTRY_LABEL_A[countrySlug] || '';
              return (
                <>
                  {countryLabel && (<><span className="sep">/</span><a onClick={handleBack} href="/news">{countryLabel}</a></>)}
                  {league && (<><span className="sep">/</span><b>{league}</b></>)}
                </>
              );
            })()}
          </div>
          <div className="topbar-right">
            <span>{fmtDateLong(dateQ)}</span>
            <span className="mono">{clockMono}</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambia tema">
              <span className="icn">{isLight ? '☾' : '☀'}</span>
              <span>{isLight ? 'Scuro' : 'Chiaro'}</span>
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <section className="article-head"><div className="a-head-main"><p className="a-subtitle">Caricamento articolo…</p></div></section>
      )}
      {!loading && error && (
        <section className="article-head"><div className="a-head-main">
          <button className="backlink" onClick={onBack ?? (() => navigate('/news'))}>← Torna alle notizie</button>
          <h1 className="a-title">Articolo non disponibile</h1>
          <p className="a-subtitle">{error}</p>
        </div></section>
      )}

      {!loading && !error && matchData && (
        <>
          {/* ============ HEADER ARTICOLO ============ */}
          <section className="article-head">
            <div className="a-head-main">
              <button className="backlink" onClick={onBack ?? (() => navigate('/news'))}>← Torna alle notizie</button>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: dotColor }} />{league || TODO_INLINE}</span>
                <span className="sep">·</span>
                <span className="giornata">{TODO_INLINE} giornata</span>
                <span className="sep">·</span>
                <span className={effort === 'DEEP' ? 'deep' : 'deep'} style={effort === 'LITE' ? { color: 'var(--yellow)' } : undefined}>{effort}</span>
              </div>
              <h1 className="a-title">
                {home} – {away}{tip?.pronostico ? `: pronostico ${tip.pronostico} con confidenza ${conf.toFixed(0)}%` : ''}
              </h1>
              <p className="a-subtitle">
                Articolo generato dalla redazione AI di AI Simulator a partire da fonti pubbliche, conferenze stampa e dati statistici. Tipo: <b>{effort === 'DEEP' ? 'Scout Deep' : 'Scout Lite'}</b>.
              </p>
              <div className="byline-row">
                <span><b>Firmato</b> <span className="author">La Redazione di AI Simulator</span></span>
                <span className="sep">·</span>
                <span>Pub. <b>{pubLabel || MISSING_INLINE}</b></span>
                <span className="sep">·</span>
                <span><b>{TODO_INLINE}</b> di lettura</span>
                <span className="sep">·</span>
                <span><b>{TODO_INLINE}</b> consultate</span>
              </div>
            </div>
          </section>

          {/* ============ POSTER ============ */}
          <section className="poster">
            <div className="poster-inner">
              <div className="poster-team">
                <div className="poster-crest" style={{ background: crestGradientA(home), color: '#fff' }}>{crestInitialA(home)}</div>
                <div>
                  <div className="poster-name">{home}</div>
                  <div className="poster-meta">{TODO_INLINE} · forma {TODO_INLINE}</div>
                </div>
              </div>
              <div className="poster-center">
                <div className="poster-ko">{kickoff || MISSING_INLINE}</div>
                <div className="poster-when">Kickoff · <b>{fmtDateLong(dateQ)}</b></div>
                <div className="poster-where">{TODO_INLINE}</div>
              </div>
              <div className="poster-team away">
                <div className="poster-crest" style={{ background: crestGradientA(away), color: '#fff' }}>{crestInitialA(away)}</div>
                <div>
                  <div className="poster-name">{away}</div>
                  <div className="poster-meta">{TODO_INLINE} · forma {TODO_INLINE}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ TOC ============ */}
          <nav className="toc-row">
            <div className="toc-inner">
              {['formazioni','tattica','notizie','contesto'].map((k, i) => {
                const kind = k as ScoutSection['kind'];
                const has = sections.some(s => s.kind === kind);
                return (
                  <a
                    key={kind}
                    className={`toc-link ${activeToc === i ? 'active' : ''}`}
                    href={`#${SEC_ID[kind]}`}
                    onClick={(e) => scrollToSection(e, SEC_ID[kind])}
                    style={has ? undefined : { opacity: .4, pointerEvents: 'none' }}
                  >
                    <span className="num">{SEC_NUM[kind]}</span> {SEC_LABEL[kind]}
                  </a>
                );
              })}
            </div>
          </nav>

          {/* ============ LAYOUT (body + sidecar) ============ */}
          <div className="layout">
            <article className="body">
              {sections.length === 0 && (
                <p>{TODO_INLINE} testo Scout non disponibile per questa partita.</p>
              )}
              {sections.map((sec, idx) => (
                <section key={`s-${idx}`} className="section" id={SEC_ID[sec.kind]}>
                  {SEC_LABEL[sec.kind] && (
                    <div className="section-eyebrow"><span className="num">{SEC_NUM[sec.kind]}</span> {SEC_LABEL[sec.kind]}</div>
                  )}
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className={idx === 0 ? 'dropcap' : ''}>{children}</p>,
                      strong: ({ children }) => <strong>{children}</strong>,
                      em: ({ children }) => <em>{children}</em>,
                      ul: ({ children }) => <ul>{children}</ul>,
                      li: ({ children }) => <li>{children}</li>,
                      a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                    }}
                  >
                    {sec.body}
                  </ReactMarkdown>
                </section>
              ))}
            </article>

            {/* SIDECAR */}
            <aside className="sidecar">
              <div className="pron-card">
                <div className="pron-h"><span>Pronostico AI</span><b>{TODO_INLINE} fonti</b></div>
                <div className="pron-main">
                  <div className="pron-pick">
                    <b>{tip?.pronostico || MISSING_INLINE}</b>
                    {tip?.tipo || 'esito principale'}
                  </div>
                  <div className={`pron-num${confMed ? ' med' : ''}`}>
                    {tip ? conf.toFixed(0) : '—'}<small>%</small>
                  </div>
                </div>
                <div className={`pron-bar${confMed ? ' med' : ''}`}><i style={{ width: `${conf}%` }} /></div>
                <div className="pron-marks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
                <div className="pron-stats">
                  <div className="r"><span>xG attesi · casa</span><b>{TODO_INLINE}</b></div>
                  <div className="r"><span>xG attesi · trasf.</span><b>{TODO_INLINE}</b></div>
                  <div className="r"><span>Form ultime 5 · casa</span><b>{TODO_INLINE}</b></div>
                  <div className="r"><span>Form ultime 5 · trasf.</span><b>{TODO_INLINE}</b></div>
                  <div className="r"><span>H2H ultimi 10</span><b>{TODO_INLINE}</b></div>
                  <div className="r"><span>Quota mercato</span><b>{tip?.quota ? tip.quota.toFixed(2) : MISSING_INLINE}</b></div>
                  <div className="r"><span>Infortuni rilevanti</span><b>{TODO_INLINE}</b></div>
                </div>
                <div className="pron-foot">
                  <a className="btn primary" href="#" onClick={(e) => e.preventDefault()}>Apri scheda Match Day <span className="arrow">→</span></a>
                </div>
              </div>

              <div className="sc-card">
                <div className="sc-h">Tutti i tip</div>
                <div className="sc-list">
                  {matchData.pronostici && matchData.pronostici.length > 0 ? (
                    matchData.pronostici.map((p, i) => (
                      <div className="r" key={`tip-${i}`}>
                        <span>{p.tipo || p.pronostico}</span>
                        <b>{p.pronostico} · {(p.confidence || 0).toFixed(0)}%</b>
                      </div>
                    ))
                  ) : (
                    <div className="r"><span>Tip</span><b>{MISSING_INLINE}</b></div>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {/* ============ FONTI CONSULTATE ============ */}
          <section className="sources">
            <div className="sources-h">
              <h3>FONTI CONSULTATE</h3>
              <span className="meta">Sintesi via you.com /v1/research{computedAt ? ` · ultimo retrieval ${pubLabel}` : ''}</span>
            </div>
            <div className="sources-grid">
              <div className="source-item"><span className="name">{TODO_INLINE}</span><span className="kind">—</span><span className="when">—</span></div>
            </div>
          </section>

          {/* ============ DISCLAIMER + CTA ============ */}
          <section className="disclaimer-wrap">
            <div className="disclaimer">
              <p>
                <b>Articolo generato automaticamente</b> dalla redazione AI di AI Simulator a partire da fonti pubbliche, conferenze stampa e dati statistici. Nessun intervento editoriale umano. Le previsioni non costituiscono consigli di scommessa.
              </p>
              <a className="matchday-btn" href="#" onClick={(e) => e.preventDefault()}>Apri scheda Match Day · {home}–{away} →</a>
            </div>
          </section>

          {/* ============ NAV PREV / NEXT ============ */}
          <section className="nav-wrap">
            <div className="nav-grid">
              {prevMatch ? (
                <a className="nav-card prev" onClick={(e) => goToSibling(e, prevMatch)} href="#">
                  <div className="nav-dir"><span>← Articolo precedente</span><span className="ko">{prevMatch.match_time || ''}</span></div>
                  <div className="nav-row-team">
                    <div className="nav-crest" style={{ background: crestGradientA(prevMatch.home), color: '#fff' }}>{crestInitialA(prevMatch.home)}</div>
                    <span>vs</span>
                    <div className="nav-crest" style={{ background: crestGradientA(prevMatch.away), color: '#fff' }}>{crestInitialA(prevMatch.away)}</div>
                  </div>
                  <p className="nav-title">{prevMatch.home} – {prevMatch.away}</p>
                </a>
              ) : (
                <a className="nav-card prev" onClick={handleBack} href="/news">
                  <div className="nav-dir"><span>← Articolo precedente</span><span className="ko">— · primo del giorno</span></div>
                  <div className="nav-row-team" style={{ color: 'var(--t-faint)' }}>Nessun articolo precedente nella giornata</div>
                </a>
              )}
              {nextMatch ? (
                <a className="nav-card next" onClick={(e) => goToSibling(e, nextMatch)} href="#">
                  <div className="nav-dir"><span>Articolo successivo →</span><span className="ko">{nextMatch.match_time || ''}</span></div>
                  <div className="nav-row-team">
                    <div className="nav-crest" style={{ background: crestGradientA(nextMatch.home), color: '#fff' }}>{crestInitialA(nextMatch.home)}</div>
                    <span>vs</span>
                    <div className="nav-crest" style={{ background: crestGradientA(nextMatch.away), color: '#fff' }}>{crestInitialA(nextMatch.away)}</div>
                  </div>
                  <p className="nav-title">{nextMatch.home} – {nextMatch.away}</p>
                </a>
              ) : (
                <a className="nav-card next" onClick={handleBack} href="/news">
                  <div className="nav-dir"><span>Articolo successivo →</span><span className="ko">— · ultimo del giorno</span></div>
                  <div className="nav-row-team" style={{ color: 'var(--t-faint)' }}>Nessun articolo successivo nella giornata</div>
                </a>
              )}
            </div>
          </section>
        </>
      )}

      <footer className="site-foot">
        <div>Tutti i contenuti sono generati da modelli linguistici. <b>Le previsioni non costituiscono consigli di scommessa.</b></div>
        <div>build · {new Date().toISOString().substring(0, 10).replace(/-/g, '.')} · /v1/research</div>
      </footer>
    </div>
  );
};

export default NewsArticolo;
