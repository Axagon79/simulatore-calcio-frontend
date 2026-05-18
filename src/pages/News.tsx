import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NewsProps {
  onBack?: () => void;
}

interface ArticleLink {
  home: string;
  away: string;
  date: string;
}

const COUNTRIES: Record<string, { label: string; leagues: Record<string, string> }> = {
  inghilterra: { label: 'Inghilterra', leagues: { 'premier-league': 'Premier League' } },
  svezia:      { label: 'Svezia',      leagues: { 'allsvenskan': 'Allsvenskan' } },
  brasile:     { label: 'Brasile',     leagues: { 'brasileirao': 'Brasileirão' } },
  finlandia:   { label: 'Finlandia',   leagues: { 'veikkausliiga': 'Veikkausliiga' } },
};

const ARTICLES = [
  { id: 'a-1', country: 'inghilterra', league: 'premier-league' },
  { id: 'a-2', country: 'inghilterra', league: 'premier-league' },
  { id: 'a-3', country: 'svezia',      league: 'allsvenskan' },
  { id: 'a-4', country: 'svezia',      league: 'allsvenskan' },
  { id: 'a-5', country: 'brasile',     league: 'brasileirao' },
  { id: 'a-6', country: 'finlandia',   league: 'veikkausliiga' },
  { id: 'a-7', country: 'brasile',     league: 'brasileirao' },
];

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
  .news-root .mono{font-family:'JetBrains Mono','Consolas',ui-monospace,monospace;font-feature-settings:"ss01","cv11"}
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
  .news-root .filter-row.leagues .lbl::before{content:"↳ ";color:var(--t-faint);margin-right:4px}
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

const TickerStrip: React.FC = () => (
  <div className="ticker-strip">
    {[0,1].map(loop => (
      <React.Fragment key={loop}>
        <span className="ti"><span className="mono">15:00</span><b>Premier · Arsenal–Newcastle</b> <span className="sep">·</span> pronostico <b>1</b> conf. <span className="mono">71%</span></span>
        <span className="ti"><span className="mono">17:00</span><b>Premier · Liverpool–Crystal Palace</b> <span className="sep">·</span> pronostico <b>1</b> conf. <span className="mono">78%</span></span>
        <span className="ti"><span className="mono">17:30</span><b>Allsvenskan · AIK–Djurgården</b> <span className="sep">·</span> pronostico <b>X</b> conf. <span className="mono">42%</span></span>
        <span className="ti"><span className="mono">19:00</span><b>Allsvenskan · Malmö–Hammarby</b> <span className="sep">·</span> pronostico <b>1</b> conf. <span className="mono">61%</span></span>
        <span className="ti"><span className="mono">20:00</span><b>Brasileirão · Flamengo–Atlético MG</b> <span className="sep">·</span> pronostico <b>1</b> conf. <span className="mono">63%</span></span>
        <span className="ti"><span className="mono">21:15</span><b>Veikkausliiga · HJK–Inter Turku</b> <span className="sep">·</span> pronostico <b>1</b> conf. <span className="mono">58%</span></span>
        <span className="ti"><span className="mono">22:30</span><b>Brasileirão · Botafogo–Internacional</b> <span className="sep">·</span> pronostico <b>1</b> conf. <span className="mono">54%</span></span>
      </React.Fragment>
    ))}
  </div>
);

const TODAY_DATE = '2026-05-18';

const ARTICLE_LINKS: Record<string, ArticleLink> = {
  'a-1': { home: 'Arsenal',     away: 'Newcastle',          date: TODAY_DATE },
  'a-2': { home: 'Liverpool',   away: 'Crystal Palace',     date: TODAY_DATE },
  'a-3': { home: 'AIK',         away: 'Djurgården',         date: TODAY_DATE },
  'a-4': { home: 'Malmö FF',    away: 'Hammarby',           date: TODAY_DATE },
  'a-5': { home: 'Flamengo',    away: 'Atlético Mineiro',   date: TODAY_DATE },
  'a-6': { home: 'HJK',         away: 'Inter Turku',        date: TODAY_DATE },
  'a-7': { home: 'Botafogo',    away: 'Internacional',      date: TODAY_DATE },
};

const News: React.FC<NewsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [clockMono, setClockMono] = useState('14:32:07 CEST');
  const [activeTab, setActiveTab] = useState<string>('oggi');
  const [activeCountry, setActiveCountry] = useState<string>('');
  const [activeLeague, setActiveLeague] = useState<string>('');
  const [activeRail, setActiveRail] = useState<string>('a-1');

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

  const openArticle = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const lnk = ARTICLE_LINKS[id];
    if (!lnk) return;
    const params = new URLSearchParams({ home: lnk.home, away: lnk.away, date: lnk.date });
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

  const isVisible = (country: string, league: string) => {
    const matchC = !activeCountry || activeCountry === country;
    const matchL = !activeLeague || activeLeague === league;
    return matchC && matchL;
  };

  const visibleArticles = ARTICLES.filter(a => isVisible(a.country, a.league));
  const visibleLeagues = new Set(visibleArticles.map(a => a.league));
  const shown = visibleArticles.length;
  const legheCount = visibleLeagues.size;
  const countText = `${shown} articol${shown === 1 ? 'o' : 'i'} · ${legheCount} ${legheCount === 1 ? 'lega' : 'leghe'}`;
  const mastCountText = `${shown} ${shown === 1 ? 'articolo pubblicato' : 'articoli pubblicati'}`;

  const currentLeagues = activeCountry ? COUNTRIES[activeCountry].leagues : null;
  const hideStyle = (visible: boolean): React.CSSProperties => ({ display: visible ? '' : 'none' });

  const isLight = theme === 'light';

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
            <span>Lun 18 mag 2026</span>
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
              <TickerStrip />
            </div>
          </div>
        </div>
      </header>

      {/* ============ TABS ============ */}
      <div className="tabs-wrap">
        <div className="tabs">
          <div className="tabs-left">
            <div className={`tab ${activeTab === 'oggi' ? 'active' : ''}`} onClick={() => setActiveTab('oggi')}><span className="day">Oggi</span><span className="date">18 mag</span></div>
            <div className={`tab ${activeTab === 'domani' ? 'active' : ''}`} onClick={() => setActiveTab('domani')}><span className="day">Domani</span><span className="date">19 mag</span></div>
            <div className={`tab ${activeTab === 'dopodomani' ? 'active' : ''}`} onClick={() => setActiveTab('dopodomani')}><span className="day">Dopodomani</span><span className="date">20 mag</span></div>
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
          <span>Edizione del giorno</span><span className="sep">·</span>
          <span className="mono">18 · 05 · 2026</span><span className="sep">·</span>
          <b>{mastCountText}</b><span className="sep">·</span>
          <span>generati da redazione AI</span>
        </div>
        <h1 className="mast-title">Una redazione che <em>scrive sola</em>. Sette articoli per le partite di stasera, prima del kickoff.</h1>
        <p className="mast-deck">
          Ogni giorno il nostro motore di sintesi legge <b>conferenze stampa, statistiche e copertura locale</b>, e produce un articolo per ciascun match in programma — completo di <b>pronostico AI</b> con livello di confidenza. Nessun giornalista umano è coinvolto. È pubblicato per trasparenza: vediamo gli stessi dati che usa l'algoritmo per la previsione.
        </p>
      </section>

      {/* ============ FILTRO ============ */}
      <div className="filter-wrap">
        <div className="filter-bar">
          <div className="filter-row countries">
            <span className="lbl">Notizie da</span>
            <button className={`f-link ${activeCountry === '' ? 'on' : ''}`} onClick={() => handleCountry('')}>Tutte</button>
            <span className="sep">·</span>
            <button className={`f-link ${activeCountry === 'inghilterra' ? 'on' : ''}`} onClick={() => handleCountry('inghilterra')}>Inghilterra</button>
            <span className="sep">·</span>
            <button className={`f-link ${activeCountry === 'svezia' ? 'on' : ''}`} onClick={() => handleCountry('svezia')}>Svezia</button>
            <span className="sep">·</span>
            <button className={`f-link ${activeCountry === 'brasile' ? 'on' : ''}`} onClick={() => handleCountry('brasile')}>Brasile</button>
            <span className="sep">·</span>
            <button className={`f-link ${activeCountry === 'finlandia' ? 'on' : ''}`} onClick={() => handleCountry('finlandia')}>Finlandia</button>
          </div>
          <div className={`filter-row leagues ${activeCountry ? 'show' : ''}`}>
            <span className="lbl">Leghe</span>
            <button className={`f-link ${activeLeague === '' ? 'on' : ''}`} onClick={() => setActiveLeague('')}>Tutte</button>
            {currentLeagues && Object.entries(currentLeagues).map(([slug, label]) => (
              <React.Fragment key={slug}>
                <span className="sep">·</span>
                <button className={`f-link ${activeLeague === slug ? 'on' : ''}`} onClick={() => handleLeague(slug)}>{label}</button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* breadcrumb */}
      <div className={`breadcrumb ${activeCountry ? 'show' : ''}`}>
        <div className="crumb-path">
          <span>Notizie</span>
          {activeCountry && (
            <>
              <span className="sep">/</span>
              <span>{COUNTRIES[activeCountry].label}</span>
            </>
          )}
          {activeCountry && activeLeague && (
            <>
              <span className="sep">/</span>
              <b>{COUNTRIES[activeCountry].leagues[activeLeague]}</b>
            </>
          )}
        </div>
        <button className="clear-filter" onClick={clearFilter}><span className="x">×</span> Rimuovi filtro</button>
      </div>

      {/* ============ LAYOUT ============ */}
      <div className="layout">
        <aside className="index-rail">
          <div className="ir-h">Indice · oggi <span className="ir-count">({shown})</span></div>
          <div className="ir-list">
            {[
              { id: 'a-1', country: 'inghilterra', league: 'premier-league', time: '15:00', label: 'Arsenal · Newcastle' },
              { id: 'a-2', country: 'inghilterra', league: 'premier-league', time: '17:00', label: 'Liverpool · Crystal Palace' },
              { id: 'a-3', country: 'svezia', league: 'allsvenskan', time: '17:30', label: 'AIK · Djurgården' },
              { id: 'a-4', country: 'svezia', league: 'allsvenskan', time: '19:00', label: 'Malmö FF · Hammarby' },
              { id: 'a-5', country: 'brasile', league: 'brasileirao', time: '20:00', label: 'Flamengo · Atl. Mineiro' },
              { id: 'a-6', country: 'finlandia', league: 'veikkausliiga', time: '21:15', label: 'HJK · Inter Turku' },
              { id: 'a-7', country: 'brasile', league: 'brasileirao', time: '22:30', label: 'Botafogo · Internacional' },
            ].map(it => (
              <a
                key={it.id}
                href={`#${it.id}`}
                className={`ir-item ${activeRail === it.id ? 'active' : ''}`}
                style={hideStyle(isVisible(it.country, it.league))}
                onClick={() => setActiveRail(it.id)}
              >
                {it.time}<span className="lbl">{it.label}</span>
              </a>
            ))}
          </div>
          <div className="ir-foot">
            Pubblicazione automatica T-6h dal kickoff. Nessun intervento editoriale umano.
          </div>
        </aside>

        <main className="stack">
          <div className={`empty-state ${shown === 0 ? 'show' : ''}`}>
            <div className="eye">Nessun articolo</div>
            <p>Nessuna partita corrisponde al filtro selezionato per la giornata di oggi.</p>
          </div>

          {/* 1 — ARSENAL · NEWCASTLE (FEATURE) */}
          <article className="article feature" id="a-1" style={hideStyle(isVisible('inghilterra', 'premier-league'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#a855f7' }} />Premier League · 38ª giornata</span>
                <span className="ko">Kickoff 15:00 · Emirates</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-ars">A</div><div className="ml-name">Arsenal</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-new">N</div><div className="ml-name">Newcastle</div></div>
              </div>
              <h2 className="a-title"><a href="#a-1" onClick={(e) => openArticle(e, 'a-1')} style={{ cursor: 'pointer' }}>Arsenal cerca il sorpasso sul filo: Arteta conferma Saka dal 1', Howe risponde con un 4-3-3 più aggressivo</a></h2>
              <p className="a-lede">
                L'ultima giornata di Premier League vale la <b>qualificazione diretta in Champions</b> per entrambe le squadre, separate da otto punti in classifica ma con una differenza reti che pende dalla parte dei londinesi. Arteta recupera Saliba dopo il turno di squalifica e dovrebbe rilanciare Saka dal 1' nonostante l'affaticamento muscolare segnalato in conferenza giovedì. Newcastle arriva con Isak in forma — sei gol nelle ultime cinque trasferte — ma la difesa di Howe ha incassato gol in 6 delle ultime 7 fuori casa.
              </p>
              <ul className="a-bullets">
                <li>Saka dovrebbe partire titolare nonostante un fastidio agli adduttori; in panchina pronto Trossard</li>
                <li>Newcastle prova un 4-3-3 più aggressivo: dentro Anderson sulla mediana, Joelinton avanzato</li>
                <li>Storico recente: 3 vittorie Arsenal nelle ultime 5 H2H, ma nessuna delle tre con più di un gol di scarto</li>
              </ul>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span>
                  <span>·</span>
                  <span>pubblicato <b>09:14 CEST</b></span>
                  <span>·</span>
                  <span>1.840 parole · 6 min</span>
                </div>
                <a className="read-link" href="#a-1" onClick={(e) => openArticle(e, 'a-1')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">14 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Vittoria 1</b>esito home · spread +1.4</div>
                <div className="pron-num">71<small>%</small></div>
              </div>
              <div className="pron-bar"><i style={{ width: '71%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>2.14 / 1.02</b></div>
                <div className="r"><span>Form casa</span><b>W W D W W</b></div>
                <div className="r"><span>Quota mercato</span><b>1.72</b></div>
                <div className="r"><span>Linea vs market</span><b style={{ color: 'var(--green)' }}>+ value</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-1" onClick={(e) => openArticle(e, 'a-1')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>

          {/* 2 — LIVERPOOL · CRYSTAL PALACE */}
          <article className="article" id="a-2" style={hideStyle(isVisible('inghilterra', 'premier-league'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#a855f7' }} />Premier League · 38ª giornata</span>
                <span className="ko">Kickoff 17:00 · Anfield</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-liv">L</div><div className="ml-name">Liverpool</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-cry">C</div><div className="ml-name">Crystal Palace</div></div>
              </div>
              <h2 className="a-title"><a href="#a-2" onClick={(e) => openArticle(e, 'a-2')} style={{ cursor: 'pointer' }}>Festa Anfield, ma Slot blinda la formazione: Salah dalla panchina, Glasner cerca i tre punti europei</a></h2>
              <p className="a-lede">
                Liverpool ha vinto il titolo da due giornate e Slot ha promesso una rotazione "completa, ma non incosciente". Salah parte fuori — terzo turno consecutivo — e dovrebbe lasciare spazio a Chiesa esterno destro. <b>Crystal Palace gioca per la Conference</b>: Glasner conferma il 3-4-2-1 con Mateta punta. L'allenatore austriaco ha lamentato in conferenza la fatica accumulata dopo la finale di FA Cup.
              </p>
              <ul className="a-bullets">
                <li>Possibile esordio dal 1' per il giovane Danns a centrocampo</li>
                <li>Liverpool senza tiri in porta solo 2 volte ad Anfield in stagione</li>
              </ul>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span><span>·</span>
                  <span>pub. <b>10:02 CEST</b></span><span>·</span>
                  <span>1.620 parole · 5 min</span>
                </div>
                <a className="read-link" href="#a-2" onClick={(e) => openArticle(e, 'a-2')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">12 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Vittoria 1</b>esito home</div>
                <div className="pron-num">78<small>%</small></div>
              </div>
              <div className="pron-bar"><i style={{ width: '78%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>2.38 / 0.92</b></div>
                <div className="r"><span>Form casa</span><b>W W W L W</b></div>
                <div className="r"><span>Quota mercato</span><b>1.42</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-2" onClick={(e) => openArticle(e, 'a-2')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>

          {/* 3 — AIK · DJURGÅRDEN */}
          <article className="article" id="a-3" style={hideStyle(isVisible('svezia', 'allsvenskan'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#facc15' }} />Allsvenskan · 9ª giornata</span>
                <span className="ko">Kickoff 17:30 · Strawberry Arena</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-aik">A</div><div className="ml-name">AIK</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-dju">D</div><div className="ml-name">Djurgården</div></div>
              </div>
              <h2 className="a-title"><a href="#a-3" onClick={(e) => openArticle(e, 'a-3')} style={{ cursor: 'pointer' }}>Tvillingderbyt sotto la pioggia: AIK punta sull'asse Otieno-Guidetti, Djurgården perde Kåhre per squalifica</a></h2>
              <p className="a-lede">
                Il derby di Stoccolma arriva al penultimo posto delle giornate "facili" per AIK — quattro partite contro top-6 nelle prossime sei. Norling sceglie il 4-2-3-1 con <b>Otieno e Guidetti</b> sull'asse offensivo destro; la mossa è coerente con un xG creato superiore del 18% quando giocano insieme. Djurgården perde Kåhre per squalifica e Lundgren è in dubbio: dentro Berg dal 1', sistema invariato.
              </p>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span><span>·</span>
                  <span>pub. <b>11:30 CEST</b></span><span>·</span>
                  <span>1.480 parole</span>
                </div>
                <a className="read-link" href="#a-3" onClick={(e) => openArticle(e, 'a-3')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">11 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Pareggio X</b>derby equilibrato</div>
                <div className="pron-num med">42<small>%</small></div>
              </div>
              <div className="pron-bar med"><i style={{ width: '42%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>1.34 / 1.16</b></div>
                <div className="r"><span>H2H ultimi 10</span><b>3 - 4 - 3</b></div>
                <div className="r"><span>Quota mercato</span><b>3.60</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-3" onClick={(e) => openArticle(e, 'a-3')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>

          {/* 4 — MALMÖ FF · HAMMARBY */}
          <article className="article" id="a-4" style={hideStyle(isVisible('svezia', 'allsvenskan'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#facc15' }} />Allsvenskan · 9ª giornata</span>
                <span className="ko">Kickoff 19:00 · Eleda Stadion</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-mff">M</div><div className="ml-name">Malmö FF</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-ham">H</div><div className="ml-name">Hammarby</div></div>
              </div>
              <h2 className="a-title"><a href="#a-4" onClick={(e) => openArticle(e, 'a-4')} style={{ cursor: 'pointer' }}>Eleda sold-out: Tomasson testa la nuova punta centrale, Hammarby con un 5-3-2 di emergenza</a></h2>
              <p className="a-lede">
                Malmö in striscia positiva da quattro partite, capolista provvisorio in attesa dell'AIK. Tomasson <b>cambia struttura</b>: 4-3-3 con Nanasi a sinistra e Hakšabanović dietro Larsson — assetto inedito ma testato nelle amichevoli di marzo. Hammarby vive una crisi parallela in difesa: tre titolari out, costruzione bassa con il 5-3-2.
              </p>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span><span>·</span>
                  <span>pub. <b>12:18 CEST</b></span><span>·</span>
                  <span>1.720 parole</span>
                </div>
                <a className="read-link" href="#a-4" onClick={(e) => openArticle(e, 'a-4')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">13 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Vittoria 1</b>esito home</div>
                <div className="pron-num">61<small>%</small></div>
              </div>
              <div className="pron-bar"><i style={{ width: '61%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>1.86 / 1.12</b></div>
                <div className="r"><span>Form casa</span><b>W W D W W</b></div>
                <div className="r"><span>Quota mercato</span><b>1.95</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-4" onClick={(e) => openArticle(e, 'a-4')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>

          {/* 5 — FLAMENGO · ATL. MINEIRO */}
          <article className="article" id="a-5" style={hideStyle(isVisible('brasile', 'brasileirao'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#4ade80' }} />Brasileirão · 8ª giornata</span>
                <span className="ko">Kickoff 20:00 · Maracanã</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-fla">F</div><div className="ml-name">Flamengo</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-atm">A</div><div className="ml-name">Atlético Mineiro</div></div>
              </div>
              <h2 className="a-title"><a href="#a-5" onClick={(e) => openArticle(e, 'a-5')} style={{ cursor: 'pointer' }}>Maracanã pieno: Filipe Luís rilancia Pedro al centro dell'attacco, problemi a centrocampo per il Galo</a></h2>
              <p className="a-lede">
                Flamengo seconda dietro al Botafogo per soli due punti, ma con una partita in meno. Filipe Luís — al primo mese sulla panchina — recupera Pedro dopo l'infortunio di aprile e lo rimette al centro del 4-3-3 al posto di Bruno Henrique. <b>Atlético Mineiro</b> arriva senza Hulk (squalificato) e con Otávio in dubbio: Milito potrebbe schierare un 4-1-4-1 di copertura.
              </p>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span><span>·</span>
                  <span>pub. <b>13:04 CEST</b></span><span>·</span>
                  <span>1.910 parole</span>
                </div>
                <a className="read-link" href="#a-5" onClick={(e) => openArticle(e, 'a-5')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">15 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Vittoria 1</b>esito home</div>
                <div className="pron-num">63<small>%</small></div>
              </div>
              <div className="pron-bar"><i style={{ width: '63%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>1.74 / 1.13</b></div>
                <div className="r"><span>Form casa</span><b>W D W W L</b></div>
                <div className="r"><span>Quota mercato</span><b>1.88</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-5" onClick={(e) => openArticle(e, 'a-5')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>

          {/* 6 — HJK · INTER TURKU */}
          <article className="article" id="a-6" style={hideStyle(isVisible('finlandia', 'veikkausliiga'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#22d3ee' }} />Veikkausliiga · 10ª giornata</span>
                <span className="ko">Kickoff 21:15 · Bolt Arena</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-hjk">H</div><div className="ml-name">HJK</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-itu">I</div><div className="ml-name">Inter Turku</div></div>
              </div>
              <h2 className="a-title"><a href="#a-6" onClick={(e) => openArticle(e, 'a-6')} style={{ cursor: 'pointer' }}>Bolt Arena: Koskinen prova il 3-4-3, Inter Turku con la coppia Anier-Ngueukam in attacco</a></h2>
              <p className="a-lede">
                HJK capolista, ma con una difesa che ha concesso gol in cinque delle ultime sei: Koskinen cambia disegno e passa al <b>3-4-3</b> con Hostikka braccetto sinistro. Inter Turku terzo in classifica, gioca il match più importante della stagione fin qui: Källman ha confermato in conferenza che Anier e Ngueukam partono insieme dal 1' per la prima volta.
              </p>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span><span>·</span>
                  <span>pub. <b>13:42 CEST</b></span><span>·</span>
                  <span>1.380 parole</span>
                </div>
                <a className="read-link" href="#a-6" onClick={(e) => openArticle(e, 'a-6')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">9 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Vittoria 1</b>esito home</div>
                <div className="pron-num">58<small>%</small></div>
              </div>
              <div className="pron-bar"><i style={{ width: '58%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>1.58 / 1.16</b></div>
                <div className="r"><span>Form casa</span><b>W W L W D</b></div>
                <div className="r"><span>Quota mercato</span><b>2.10</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-6" onClick={(e) => openArticle(e, 'a-6')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>

          {/* 7 — BOTAFOGO · INTERNACIONAL */}
          <article className="article" id="a-7" style={hideStyle(isVisible('brasile', 'brasileirao'))}>
            <div>
              <div className="a-eyebrow">
                <span className="league"><span className="ld" style={{ background: '#4ade80' }} />Brasileirão · 8ª giornata</span>
                <span className="ko">Kickoff 22:30 · Nilton Santos</span>
                <span className="deep">DEEP</span>
              </div>
              <div className="match-line">
                <div className="ml-team"><div className="ml-crest c-bot">B</div><div className="ml-name">Botafogo</div></div>
                <div className="ml-vs">vs</div>
                <div className="ml-team"><div className="ml-crest c-int">I</div><div className="ml-name">Internacional</div></div>
              </div>
              <h2 className="a-title"><a href="#a-7" onClick={(e) => openArticle(e, 'a-7')} style={{ cursor: 'pointer' }}>Nilton Santos: Almada falso nove, Roger Machado conferma il 4-2-3-1 nonostante l'assenza di Borré</a></h2>
              <p className="a-lede">
                Botafogo capolista con percentuale-vittoria 67% in stagione, ma stanco — terza partita in sette giorni. Cavalieri rinuncia a Tiquinho e <b>schiera Almada falso nove</b> per liberare gli inserimenti di Savarino. Internacional senza Borré (infortunato) e senza Wanderson (squalificato): Wesley unica punta, Aguirre conferma il modulo.
              </p>
              <div className="a-foot">
                <div className="by-line">
                  <span><b>La Redazione di AI Simulator</b></span><span>·</span>
                  <span>pub. <b>14:00 CEST</b></span><span>·</span>
                  <span>1.560 parole</span>
                </div>
                <a className="read-link" href="#a-7" onClick={(e) => openArticle(e, 'a-7')} style={{ cursor: 'pointer' }}>Leggi l'articolo completo →</a>
              </div>
            </div>
            <aside className="pron-card">
              <div className="pron-h"><span>Pronostico AI</span><span className="src-count">12 fonti</span></div>
              <div className="pron-main">
                <div className="pron-pick"><b>Vittoria 1</b>esito home</div>
                <div className="pron-num">54<small>%</small></div>
              </div>
              <div className="pron-bar"><i style={{ width: '54%' }} /></div>
              <div className="pron-stats">
                <div className="r"><span>xG attesi</span><b>1.42 / 1.11</b></div>
                <div className="r"><span>Form casa</span><b>W W W D W</b></div>
                <div className="r"><span>Quota mercato</span><b>2.05</b></div>
              </div>
              <div className="pron-foot">
                <a className="open-btn" href="#a-7" onClick={(e) => openArticle(e, 'a-7')} style={{ cursor: 'pointer' }}>Apri articolo completo <span className="arrow">→</span></a>
              </div>
            </aside>
          </article>
        </main>
      </div>

      <footer className="site-foot">
        <div>Tutti i contenuti sono generati da modelli linguistici. <b>Le previsioni non costituiscono consigli di scommessa.</b></div>
        <div>build · 2026.05.18 · pipeline #11471 · /v1/research</div>
      </footer>
    </div>
  );
};

export default News;
