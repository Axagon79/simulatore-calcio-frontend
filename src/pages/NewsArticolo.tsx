import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NewsArticoloProps {
  onBack?: () => void;
}

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
  .article-root .body ul li::before{content:"→";position:absolute;left:0;top:0;color:var(--cyan);font-family:'JetBrains Mono',monospace;font-weight:500}
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

const SECTIONS = ['sez-1', 'sez-2', 'sez-3', 'sez-4'];

const NewsArticolo: React.FC<NewsArticoloProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [clockMono, setClockMono] = useState('14:32');
  const [activeToc, setActiveToc] = useState(0);

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

  // Inject Google Fonts
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

  // TOC active on scroll
  useEffect(() => {
    const update = () => {
      let activeIdx = 0;
      SECTIONS.forEach((id, i) => {
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
  }, []);

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
    if (onBack) onBack();
    else navigate('/news');
  };

  const isLight = theme === 'light';

  return (
    <div className="article-root" data-screen-label="Mockup D · Articolo">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ============ TOP BAR ============ */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">A</div>
            <div className="brand-name">AI<span>·</span>Simulator <em>/ News</em></div>
          </div>
          <div className="crumb-top">
            <a onClick={handleBack} href="/news">Notizie</a>
            <span className="sep">/</span>
            <a onClick={handleBack} href="/news">Inghilterra</a>
            <span className="sep">/</span>
            <b>Premier League</b>
          </div>
          <div className="topbar-right">
            <span>lun 18 mag</span>
            <span className="mono">{clockMono}</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambia tema">
              <span className="icn">{isLight ? '☾' : '☀'}</span>
              <span>{isLight ? 'Scuro' : 'Chiaro'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============ HEADER ARTICOLO ============ */}
      <section className="article-head">
        <div className="a-head-main">
          <button className="backlink" onClick={onBack ?? (() => navigate('/news'))}>← Torna alle notizie di oggi</button>
          <div className="a-eyebrow">
            <span className="league"><span className="ld" style={{ background: '#a855f7' }} />Premier League</span>
            <span className="sep">·</span>
            <span className="giornata">38ª giornata</span>
            <span className="sep">·</span>
            <span className="deep">DEEP</span>
          </div>
          <h1 className="a-title">Arsenal cerca il sorpasso sul filo: Arteta conferma Saka dal 1', Howe risponde con un 4-3-3 più aggressivo</h1>
          <p className="a-subtitle">
            L'ultima giornata di Premier League vale la <b>qualificazione diretta in Champions</b> per entrambe. Le due squadre arrivano all'Emirates con scelte di formazione opposte: i Gunners blindano la rosa titolare, Newcastle alza il baricentro per cercare l'impresa.
          </p>
          <div className="byline-row">
            <span><b>Firmato</b> <span className="author">La Redazione di AI Simulator</span></span>
            <span className="sep">·</span>
            <span>Pub. <b>lun 18 mag · 09:14 CEST</b></span>
            <span className="sep">·</span>
            <span><b>6 min</b> di lettura</span>
            <span className="sep">·</span>
            <span><b>14 fonti</b> consultate</span>
            <span className="sep">·</span>
            <span><b>1.840</b> parole</span>
          </div>
        </div>
      </section>

      {/* ============ POSTER PRE-PARTITA ============ */}
      <section className="poster">
        <div className="poster-inner">
          <div className="poster-team">
            <div className="poster-crest c-ars">A</div>
            <div>
              <div className="poster-name">Arsenal</div>
              <div className="poster-meta">2° · <b>81 PTS</b> · forma WWDWW</div>
            </div>
          </div>
          <div className="poster-center">
            <div className="poster-ko">15:00</div>
            <div className="poster-when">Kickoff · <b>Lun 18 maggio</b></div>
            <div className="poster-where">Emirates Stadium · Londra</div>
          </div>
          <div className="poster-team away">
            <div className="poster-crest c-new">N</div>
            <div>
              <div className="poster-name">Newcastle</div>
              <div className="poster-meta">5° · <b>64 PTS</b> · forma WLWDW</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TOC ============ */}
      <nav className="toc-row">
        <div className="toc-inner">
          {[
            { id: 'sez-1', num: '01', label: 'Formazioni e assenze' },
            { id: 'sez-2', num: '02', label: 'Tattica e stato squadra' },
            { id: 'sez-3', num: '03', label: 'Notizie e dichiarazioni' },
            { id: 'sez-4', num: '04', label: 'Contesto partita' },
          ].map((it, i) => (
            <a key={it.id} className={`toc-link ${activeToc === i ? 'active' : ''}`} href={`#${it.id}`} onClick={(e) => scrollToSection(e, it.id)}>
              <span className="num">{it.num}</span> {it.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ============ LAYOUT ============ */}
      <div className="layout">
        <article className="body">

          {/* 01 */}
          <section className="section" id="sez-1">
            <div className="section-eyebrow"><span className="num">01</span> Formazioni e assenze</div>
            <h2 className="section-h">Arteta recupera Saliba, panchina iniziale per Trossard</h2>

            <p className="dropcap">
              L'<b>Arsenal</b> arriva all'ultima di campionato con tutti i titolari a disposizione tranne Tomiyasu (out per stagione) e Jorginho, fermato due settimane fa da una distorsione alla caviglia destra. Mikel Arteta in conferenza ha confermato il ritorno di Saliba dopo il turno di squalifica e ha sciolto il dubbio Saka: <b>l'esterno destro parte dal 1'</b> nonostante un fastidio agli adduttori segnalato giovedì in allenamento.
            </p>

            <p>
              Il sistema resta il 4-3-3: Raya in porta, linea difensiva Timber–Saliba–Gabriel–Calafiori, Rice e Ødegaard in mediana con Havertz mezzala sinistra. Davanti, Saka–Jesus–Martinelli. In panchina pronti Trossard, Merino e il giovane Nwaneri.
            </p>

            <p>
              <b>Newcastle</b> conferma Pope tra i pali e si presenta con la coppia centrale Schär–Botman; Trippier e Hall sulle fasce. A centrocampo Eddie Howe ha lasciato intendere un cambio rispetto al consueto 4-3-3: dentro <b>Anderson</b> al posto di Longstaff per dare più gamba, con Joelinton avanzato ad agire da seconda punta dietro Isak. Gordon a sinistra. Resta fuori Bruno Guimarães, fermo per un fastidio muscolare rimediato in settimana.
            </p>

            <div className="schema">
              <div className="schema-h"><span>Schema previsto</span><b>fonti · the athletic, conferenze 17/05</b></div>
              <div className="schema-grid">
                <div className="schema-side">
                  <div className="team-h">Arsenal</div>
                  <div className="formation">4-3-3</div>
                  <div className="players">Raya · Timber Saliba Gabriel Calafiori · Rice Ødegaard Havertz · Saka Jesus Martinelli</div>
                </div>
                <div className="schema-side">
                  <div className="team-h">Newcastle</div>
                  <div className="formation">4-3-3</div>
                  <div className="players">Pope · Trippier Schär Botman Hall · Tonali Anderson Joelinton · Almirón Isak Gordon</div>
                </div>
              </div>
            </div>
          </section>

          {/* 02 */}
          <section className="section" id="sez-2">
            <div className="section-eyebrow"><span className="num">02</span> Tattica e stato squadra</div>
            <h2 className="section-h">Pressione alta sui terzini avversari, l'arma che può decidere</h2>

            <p>
              Arsenal arriva al match con una <b>striscia di cinque risultati utili consecutivi</b> e xG generato medio di 2.1 a partita — sopra la media stagionale. Arteta ha lavorato in settimana sull'aggressione sui terzini bassi avversari: la pressione di Saka e Martinelli sui due esterni di Newcastle è il fattore tattico che secondo i dati interni del club genera il maggior numero di palle recuperate in zona offensiva.
            </p>

            <p>
              Newcastle, dall'altro lato, ha incassato gol in <b>sei delle ultime sette trasferte</b>. Howe sembra aver scelto la via dell'aggressione: il 4-3-3 con Anderson e Joelinton avanzato è un assetto più verticale rispetto al 4-3-2-1 visto contro il Brighton. La squadra ha lavorato in settimana sulle ripartenze rapide con Isak come riferimento offensivo isolato — il bomber svedese ha segnato sei reti nelle ultime cinque trasferte.
            </p>

            <p>
              L'incrocio chiave sarà sulla fascia destra di Arsenal contro Gordon di Newcastle. Saka, da quel lato, ha prodotto in stagione il 28% dei tiri dei Gunners; Gordon è invece il giocatore di Newcastle con più dribbling completati negli ultimi tre mesi. Chi vince quel duello probabilmente vince la partita.
            </p>
          </section>

          {/* 03 */}
          <section className="section" id="sez-3">
            <div className="section-eyebrow"><span className="num">03</span> Notizie e dichiarazioni</div>
            <h2 className="section-h">Le conferenze: Arteta calmo, Howe più carico</h2>

            <p>
              Entrambi gli allenatori si sono presentati alla stampa nella giornata di giovedì. Arteta è apparso rilassato, concentrato sul gestire la pressione del finale di stagione; Howe ha invece insistito sul fatto che Newcastle "non ha nulla da perdere" e arriva al match con un mandato di battaglia.
            </p>

            <blockquote>
              <p className="q">"Saka inizia. Sta bene, ha lavorato in gruppo tutta la settimana. Non avremmo preso questa decisione se ci fosse stato il minimo dubbio."</p>
              <span className="attrib">— <b>Mikel Arteta</b>, conferenza stampa del 17/05 · The Athletic</span>
            </blockquote>

            <p>
              Dall'altra parte, Howe ha confermato implicitamente la mossa Anderson — senza fare nomi — e ha mandato un messaggio chiaro alla squadra: serve coraggio nella metà campo offensiva.
            </p>

            <blockquote>
              <p className="q">"Vogliamo giocare la nostra partita. Abbiamo i ragazzi giusti per metterli in difficoltà, soprattutto se riusciamo a tenere alto il baricentro. Non ci basta non perdere."</p>
              <span className="attrib">— <b>Eddie Howe</b>, conferenza stampa del 17/05 · BBC Sport</span>
            </blockquote>

            <p>
              Sul fronte arbitrale, designato Michael Oliver — fischietto storicamente generoso sui contatti, dato che potrebbe favorire la fisicità di Newcastle a centrocampo.
            </p>
          </section>

          {/* 04 */}
          <section className="section" id="sez-4">
            <div className="section-eyebrow"><span className="num">04</span> Contesto partita</div>
            <h2 className="section-h">Una sfida che vale la Champions diretta per entrambe</h2>

            <p>
              Le due squadre arrivano alla 38ª giornata separate da otto punti in classifica, ma con una situazione finale che dipende anche da Tottenham–Sheffield United, in programma in contemporanea. Arsenal ha bisogno della vittoria per blindare il secondo posto: <b>una sconfitta combinata con la vittoria del Tottenham significherebbe perdere la qualificazione diretta in Champions</b>. Newcastle, dal canto suo, è già qualificato in Europa ma punta al quarto posto per evitare i preliminari di Champions e prendersi la garanzia di partecipazione alla fase a gironi.
            </p>

            <p>
              Lo storico recente delle ultime cinque sfide H2H sorride ai londinesi: 3 vittorie Arsenal, 1 pareggio, 1 vittoria Newcastle. Tutte le ultime tre vittorie dei Gunners sono però arrivate con un solo gol di scarto. <b>L'Emirates è esaurito</b>, con un tifo unico previsto in vista del centesimo anniversario del club l'anno prossimo.
            </p>

            <p>
              Il pronostico AI — costruito sull'analisi di 14 sorgenti tra giornali, statistiche e trascrizioni delle conferenze — indica vittoria Arsenal con confidenza del <b>71%</b>. La linea di mercato di apertura era a quota 1.72: l'algoritmo individua dunque <b>valore positivo</b> rispetto al book, un'indicazione che storicamente correla con risultati attesi nel ~63% dei casi.
            </p>
          </section>

        </article>

        {/* SIDECAR */}
        <aside className="sidecar">
          <div className="pron-card">
            <div className="pron-h"><span>Pronostico AI</span><b>14 fonti</b></div>
            <div className="pron-main">
              <div className="pron-pick"><b>Vittoria 1</b>esito home · spread +1.4 gol</div>
              <div className="pron-num">71<small>%</small></div>
            </div>
            <div className="pron-bar"><i style={{ width: '71%' }} /></div>
            <div className="pron-marks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
            <div className="pron-stats">
              <div className="r"><span>xG attesi · casa</span><b>2.14</b></div>
              <div className="r"><span>xG attesi · trasf.</span><b>1.02</b></div>
              <div className="r"><span>Form ultime 5 · casa</span><b>W W D W W</b></div>
              <div className="r"><span>Form ultime 5 · trasf.</span><b>W L W D W</b></div>
              <div className="r"><span>H2H ultimi 10</span><b>5 - 3 - 2</b></div>
              <div className="r"><span>Quota mercato · 1</span><b>1.72</b></div>
              <div className="r"><span>Linea vs market</span><b className="ok">+ value</b></div>
              <div className="r"><span>Infortuni rilevanti</span><b>2 (NEW)</b></div>
            </div>
            <div className="pron-foot">
              <a className="btn primary" href="#">Apri scheda Match Day <span className="arrow">→</span></a>
              <a className="btn ghost" href="#">Esporta pronostico</a>
            </div>
          </div>

          <div className="sc-card">
            <div className="sc-h">In sintesi</div>
            <div className="sc-list">
              <div className="r"><span>Probabilità 1</span><b>71%</b></div>
              <div className="r"><span>Probabilità X</span><b>19%</b></div>
              <div className="r"><span>Probabilità 2</span><b>10%</b></div>
              <div className="r"><span>Over 2.5</span><b>54%</b></div>
              <div className="r"><span>Goal/Goal</span><b>48%</b></div>
            </div>
          </div>
        </aside>
      </div>

      {/* ============ FONTI CONSULTATE ============ */}
      <section className="sources">
        <div className="sources-h">
          <h3>FONTI CONSULTATE</h3>
          <span className="meta">14 sorgenti · sintesi via you.com /v1/research · ultimo retrieval lun 18 mag 08:42</span>
        </div>
        <div className="sources-grid">
          <div className="source-item"><span className="name">BBC Sport</span><span className="kind">Articolo</span><span className="when">18 mag · 08:42</span></div>
          <div className="source-item"><span className="name">The Athletic</span><span className="kind">Articolo</span><span className="when">17 mag · 22:11</span></div>
          <div className="source-item"><span className="name">Sky Sports</span><span className="kind">Articolo</span><span className="when">17 mag · 20:35</span></div>
          <div className="source-item"><span className="name">The Guardian</span><span className="kind">Articolo</span><span className="when">17 mag · 19:48</span></div>
          <div className="source-item"><span className="name">Conf. stampa · Mikel Arteta</span><span className="kind">Trascrizione</span><span className="when">17 mag · 13:00</span></div>
          <div className="source-item"><span className="name">Conf. stampa · Eddie Howe</span><span className="kind">Trascrizione</span><span className="when">17 mag · 14:30</span></div>
          <div className="source-item"><span className="name">FBRef · Arsenal vs Newcastle</span><span className="kind">Statistiche</span><span className="when">18 mag · 06:30</span></div>
          <div className="source-item"><span className="name">Opta · feed Premier League</span><span className="kind">Statistiche</span><span className="when">18 mag · 07:15</span></div>
          <div className="source-item"><span className="name">WhoScored · player ratings</span><span className="kind">Statistiche</span><span className="when">18 mag · 06:42</span></div>
          <div className="source-item"><span className="name">Arsenal Official · press release</span><span className="kind">Primaria</span><span className="when">17 mag · 18:00</span></div>
          <div className="source-item"><span className="name">Newcastle United · injury report</span><span className="kind">Primaria</span><span className="when">17 mag · 17:24</span></div>
          <div className="source-item"><span className="name">ESPN FC</span><span className="kind">Articolo</span><span className="when">17 mag · 21:09</span></div>
          <div className="source-item"><span className="name">Goal.com · live blog</span><span className="kind">Live</span><span className="when">18 mag · 08:30</span></div>
          <div className="source-item"><span className="name">Football365</span><span className="kind">Articolo</span><span className="when">17 mag · 22:50</span></div>
        </div>
      </section>

      {/* ============ DISCLAIMER + CTA MATCH DAY ============ */}
      <section className="disclaimer-wrap">
        <div className="disclaimer">
          <p>
            <b>Articolo generato automaticamente</b> dalla redazione AI di AI Simulator a partire da fonti pubbliche, conferenze stampa e dati statistici. Nessun intervento editoriale umano. Le previsioni non costituiscono consigli di scommessa.
          </p>
          <a className="matchday-btn" href="#">Apri scheda Match Day · Arsenal–Newcastle →</a>
        </div>
      </section>

      {/* ============ NAV PREV / NEXT ============ */}
      <section className="nav-wrap">
        <div className="nav-grid">
          <a className="nav-card prev" onClick={handleBack} href="/news">
            <div className="nav-dir"><span>← Articolo precedente</span><span className="ko">— · primo del giorno</span></div>
            <div className="nav-row-team" style={{ color: 'var(--t-faint)' }}>Nessun articolo precedente nella giornata di oggi</div>
          </a>
          <a className="nav-card next" onClick={handleBack} href="/news">
            <div className="nav-dir"><span>Articolo successivo →</span><span className="ko">17:00 · Anfield</span></div>
            <div className="nav-row-team">
              <div className="nav-crest c-liv">L</div>
              <span>vs</span>
              <div className="nav-crest c-cry">C</div>
            </div>
            <p className="nav-title">Festa Anfield, ma Slot blinda la formazione: Salah dalla panchina, Glasner cerca i tre punti europei</p>
          </a>
        </div>
      </section>

      <footer className="site-foot">
        <div>Tutti i contenuti sono generati da modelli linguistici. <b>Le previsioni non costituiscono consigli di scommessa.</b></div>
        <div>build · 2026.05.18 · pipeline #11471 · /v1/research</div>
      </footer>
    </div>
  );
};

export default NewsArticolo;
