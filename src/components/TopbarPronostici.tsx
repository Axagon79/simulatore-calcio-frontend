import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { getTheme, getThemeMode } from '../AppDev/costanti';
import StemmaImg from './StemmaImg';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

const isLocal = typeof window !== 'undefined' && (
  ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
  window.location.hostname.startsWith('192.168.')
);
const API_BASE = isLocal
  ? `http://${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:5001/puppals-456c7/us-central1/api`
  : 'https://api-6b34yfzjia-uc.a.run.app';

const STEMMI_BASE = 'https://firebasestorage.googleapis.com/v0/b/puppals-456c7.firebasestorage.app/o/stemmi%2F';

const LEAGUE_TO_FOLDER: Record<string, string> = {
  'Serie A': 'Italy', 'Serie B': 'Italy', 'Serie C - Girone A': 'Italy', 'Serie C - Girone B': 'Italy', 'Serie C - Girone C': 'Italy',
  'Premier League': 'England', 'Championship': 'England',
  'La Liga': 'Spain', 'LaLiga 2': 'Spain',
  'Bundesliga': 'Germany', '2. Bundesliga': 'Germany',
  'Ligue 1': 'France', 'Ligue 2': 'France',
  'Liga Portugal': 'Portugal', 'Primeira Liga': 'Portugal',
  'Eredivisie': 'Netherlands',
  'Scottish Prem.': 'Scotland', 'Scottish Premiership': 'Scotland',
  'Allsvenskan': 'Sweden', 'Eliteserien': 'Norway', 'Superligaen': 'Denmark',
  'Jupiler Pro': 'Belgium', 'Jupiler Pro League': 'Belgium',
  'Süper Lig': 'Turkey', 'Super Lig': 'Turkey',
  'League of Ireland': 'Ireland', 'League of Ireland Premier Division': 'Ireland',
  'Brasileirão': 'Brazil', 'Brasileirao': 'Brazil', 'Brasileirão Serie A': 'Brazil', 'Brasileirao Serie A': 'Brazil',
  'Primera División': 'Argentina',
  'MLS': 'USA', 'Major League Soccer': 'USA',
  'J1 League': 'Japan',
  'Champions League': 'Champions_League',
  'Europa League': 'Europa_League',
};

function getStemmaUrl(mongoId: string | undefined, league: string): string {
  if (!mongoId) return '';
  const folder = LEAGUE_TO_FOLDER[league] || 'Altro';
  return `${STEMMI_BASE}squadre%2F${folder}%2F${mongoId}.png?alt=media`;
}

// Parametri effetto pixel
const SAMPLE = 2;
const DURATION = 3500;
const SCATTER = 0.35;

interface Pick {
  home: string;
  away: string;
  home_mongo_id?: string;
  away_mongo_id?: string;
  league: string;
  pronostico: string;
  stars: number;
}

interface TopbarPronosticiProps {
  isMobile: boolean;
}

// Stima larghezza di un singolo pick in px
function estimatePickWidth(pick: Pick, mobile: boolean): number {
  const stemmaSize = mobile ? 17 : 20;
  const fontSize = mobile ? 12 : 13;
  const charWidth = fontSize * 0.58;
  const homeLen = Math.min(pick.home.length, mobile ? 6 : 10);
  const awayLen = Math.min(pick.away.length, mobile ? 6 : 10);
  const vsWidth = mobile ? 14 : 18;
  const pronoWidth = pick.pronostico.length * charWidth + 8;
  const starsWidth = pick.stars * (mobile ? 11 : 12);
  const gaps = 6 * 5; // 5 gaps da ~6px
  return stemmaSize + homeLen * charWidth + vsWidth + awayLen * charWidth + stemmaSize + pronoWidth + starsWidth + gaps;
}

export default function TopbarPronostici({ isMobile }: TopbarPronosticiProps) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 2 : 4);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch pronostici del giorno
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`${API_BASE}/simulation/daily-predictions-unified?date=${today}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success || !data.predictions) return;
        const allPicks: Pick[] = [];
        for (const pred of data.predictions) {
          for (const p of pred.pronostici || []) {
            if (p.stars >= 3 && p.tipo === 'SEGNO') {
              allPicks.push({
                home: pred.home, away: pred.away,
                home_mongo_id: pred.home_mongo_id, away_mongo_id: pred.away_mongo_id,
                league: pred.league, pronostico: p.pronostico, stars: p.stars,
              });
            }
          }
        }
        allPicks.sort((a, b) => b.stars - a.stars);
        setPicks(allPicks.slice(0, 20));
      })
      .catch(() => {});
  }, []);

  // Calcolo intelligente: quanti pick entrano nella larghezza disponibile
  useEffect(() => {
    if (picks.length === 0) return;
    const calculateFit = () => {
      const container = containerRef.current;
      if (!container) return;
      const availableWidth = container.offsetWidth - 20; // margine
      const gap = isMobile ? 16 : 28;
      let count = 0;
      let totalWidth = 0;
      for (let i = 0; i < picks.length; i++) {
        const w = estimatePickWidth(picks[i], isMobile);
        if (totalWidth + w + (count > 0 ? gap : 0) > availableWidth) break;
        totalWidth += w + (count > 0 ? gap : 0);
        count++;
      }
      setItemsPerPage(Math.max(1, count));
    };
    calculateFit();
    window.addEventListener('resize', calculateFit);
    return () => window.removeEventListener('resize', calculateFit);
  }, [picks, isMobile]);

  const totalPages = Math.max(1, Math.ceil(picks.length / itemsPerPage));

  const getPagePicks = useCallback((idx: number) => {
    const start = idx * itemsPerPage;
    return picks.slice(start, start + itemsPerPage);
  }, [picks, itemsPerPage]);

  // Funzioni effetto pixel
  const extractPixels = useCallback((imgData: Uint8ClampedArray, w: number, h: number, ox: number, oy: number) => {
    const px: { x: number; y: number; r: number; g: number; b: number; a: number }[] = [];
    for (let y = 0; y < h; y += SAMPLE) {
      for (let x = 0; x < w; x += SAMPLE) {
        const i = (y * w + x) * 4;
        const a = imgData[i + 3];
        if (a < 15) continue;
        px.push({ x: ox + x, y: oy + y, r: imgData[i], g: imgData[i + 1], b: imgData[i + 2], a });
      }
    }
    return px;
  }, []);

  const buildMigration = useCallback((oldPx: ReturnType<typeof extractPixels>, newPx: ReturnType<typeof extractPixels>) => {
    const maxLen = Math.max(oldPx.length, newPx.length);
    const oldShuf = oldPx.slice().sort(() => Math.random() - 0.5);
    const newShuf = newPx.slice().sort(() => Math.random() - 0.5);
    const scatterX = isMobile ? 180 : 360;
    const scatterY = isMobile ? 120 : 240;
    const particles = [];
    for (let i = 0; i < maxLen; i++) {
      const src = oldShuf[i % oldShuf.length];
      const dst = newShuf[i % newShuf.length];
      particles.push({
        sx: src.x, sy: src.y, sr: src.r, sg: src.g, sb: src.b, sa: src.a,
        mx: (src.x + dst.x) / 2 + (Math.random() - 0.5) * scatterX,
        my: (src.y + dst.y) / 2 + (Math.random() - 0.5) * scatterY,
        dx: dst.x, dy: dst.y, dr: dst.r, dg: dst.g, db: dst.b, da: dst.a,
        delay: Math.random() * 0.25,
      });
    }
    return particles;
  }, [isMobile]);

  const animateMigration = useCallback((particles: ReturnType<typeof buildMigration>) => {
    return new Promise<void>(resolve => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) { resolve(); return; }

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(); return; }

      const start = performance.now();
      function frame(now: number) {
        const rawT = Math.min((now - start) / DURATION, 1);
        const cw = canvas!.width;
        const ch = canvas!.height;
        const imgOut = ctx!.createImageData(cw, ch);
        const data = imgOut.data;

        for (const p of particles) {
          const t = Math.max(0, Math.min(1, (rawT - p.delay) / (1 - p.delay)));
          let px: number, py: number, r: number, g: number, b: number, a: number;

          if (t <= SCATTER) {
            const sub = t / SCATTER;
            const ease = sub * sub;
            px = p.sx + (p.mx - p.sx) * ease;
            py = p.sy + (p.my - p.sy) * ease;
            r = p.sr; g = p.sg; b = p.sb; a = p.sa;
          } else {
            const sub = (t - SCATTER) / (1 - SCATTER);
            const ease = 1 - (1 - sub) * (1 - sub);
            px = p.mx + (p.dx - p.mx) * ease;
            py = p.my + (p.dy - p.my) * ease;
            const blend = ease;
            r = Math.round(p.sr + (p.dr - p.sr) * blend);
            g = Math.round(p.sg + (p.dg - p.sg) * blend);
            b = Math.round(p.sb + (p.db - p.sb) * blend);
            a = Math.round(p.sa + (p.da - p.sa) * blend);
          }

          const ix = Math.round(px);
          const iy = Math.round(py);
          if (ix >= 0 && ix < cw && iy >= 0 && iy < ch) {
            const off = (iy * cw + ix) * 4;
            data[off] = r; data[off + 1] = g; data[off + 2] = b; data[off + 3] = a;
          }
        }

        ctx!.putImageData(imgOut, 0, 0);
        if (rawT < 1) requestAnimationFrame(frame);
        else { canvas!.style.display = 'none'; resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }, []);

  // Transizione pixel
  const doTransition = useCallback(async (nextIdx: number) => {
    if (transitioning || picks.length === 0) return;
    const container = containerRef.current;
    const currentEl = currentRef.current;
    const offscreenEl = offscreenRef.current;
    if (!container || !currentEl || !offscreenEl) return;

    setTransitioning(true);

    try {
      const nextPicks = getPagePicks(nextIdx);
      const stemmaSize = isMobile ? 17 : 20;
      offscreenEl.innerHTML = '';
      for (const pick of nextPicks) {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:6px;white-space:nowrap;';

        const homeSrc = getStemmaUrl(pick.home_mongo_id, pick.league);
        const awaySrc = getStemmaUrl(pick.away_mongo_id, pick.league);
        const maxChars = isMobile ? 6 : 10;
        const homeName = pick.home.length > maxChars ? pick.home.slice(0, maxChars) + '..' : pick.home;
        const awayName = pick.away.length > maxChars ? pick.away.slice(0, maxChars) + '..' : pick.away;

        item.innerHTML = `
          ${homeSrc ? `<img src="${homeSrc}" style="width:${stemmaSize}px;height:${stemmaSize}px;object-fit:contain" crossorigin="anonymous" />` : ''}
          <span style="font-size:${isMobile ? 12 : 13}px;font-weight:700;color:${theme.text}">${homeName}</span>
          <span style="font-size:${isMobile ? 10 : 10}px;color:${theme.textDim}">vs</span>
          <span style="font-size:${isMobile ? 12 : 13}px;font-weight:700;color:${theme.text}">${awayName}</span>
          ${awaySrc ? `<img src="${awaySrc}" style="width:${stemmaSize}px;height:${stemmaSize}px;object-fit:contain" crossorigin="anonymous" />` : ''}
          <span style="font-size:${isMobile ? 11 : 12}px;font-weight:800;color:${theme.cyan};margin-left:2px">${pick.pronostico}</span>
          <span style="font-size:${isMobile ? 10 : 10}px">${Array.from({ length: pick.stars }, () => '<span style="color:#ffd700">&#9733;</span>').join('')}</span>
        `;
        offscreenEl.appendChild(item);
      }

      // Copia dimensioni e stile esatto del currentEl per l'offscreen
      const curRect = currentEl.getBoundingClientRect();
      offscreenEl.style.cssText = `opacity:1;position:fixed;left:-9999px;top:0;pointer-events:none;display:flex;gap:${isMobile ? 16 : 28}px;width:${curRect.width}px;justify-content:center;align-items:center;height:${curRect.height}px;`;

      const [snapOld, snapNew] = await Promise.all([
        html2canvas(currentEl, { backgroundColor: null, scale: 1, logging: false, useCORS: true, allowTaint: true }),
        html2canvas(offscreenEl, { backgroundColor: null, scale: 1, logging: false, useCORS: true, allowTaint: true }),
      ]);

      offscreenEl.style.cssText = 'display:none;';

      const oldCtx2 = snapOld.getContext('2d');
      const newCtx2 = snapNew.getContext('2d');
      if (!oldCtx2 || !newCtx2) throw new Error('no ctx');

      // Offset del currentEl dentro il container — uguale per old e new
      const contRect = container.getBoundingClientRect();
      const ox = curRect.left - contRect.left;
      const oy = curRect.top - contRect.top;

      const oldPx = extractPixels(oldCtx2.getImageData(0, 0, snapOld.width, snapOld.height).data, snapOld.width, snapOld.height, ox, oy);
      const newPx = extractPixels(newCtx2.getImageData(0, 0, snapNew.width, snapNew.height).data, snapNew.width, snapNew.height, ox, oy);

      if (oldPx.length === 0 || newPx.length === 0) throw new Error('no pixels');

      const particles = buildMigration(oldPx, newPx);
      currentEl.style.opacity = '0';
      await animateMigration(particles);

      setPageIndex(nextIdx);
      currentEl.style.opacity = '1';
    } catch (e) {
      console.error('Pixel transition error:', e);
      setPageIndex(nextIdx);
      if (currentEl) currentEl.style.opacity = '1';
    }

    setTransitioning(false);
  }, [transitioning, picks, getPagePicks, extractPixels, buildMigration, animateMigration, isMobile]);

  // Timer rotazione automatica
  useEffect(() => {
    if (picks.length <= itemsPerPage) return;
    timerRef.current = setTimeout(() => {
      const next = (pageIndex + 1) % totalPages;
      doTransition(next);
    }, 8000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [picks, pageIndex, totalPages, doTransition, itemsPerPage]);

  const currentPicks = getPagePicks(pageIndex);

  if (picks.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: theme.textDim, fontSize: isMobile ? '11px' : '12px',
        fontStyle: 'italic', opacity: 0.6, width: '100%',
      }}>
        Caricamento pronostici...
      </div>
    );
  }

  const stemmaSize = isMobile ? 17 : 20;
  const maxChars = isMobile ? 6 : 10;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          display: 'none', pointerEvents: 'none',
        }}
      />

      <div
        ref={currentRef}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: isMobile ? '16px' : '28px',
          transition: 'opacity 0.05s', width: '100%',
        }}
      >
        {currentPicks.map((pick, i) => {
          const homeName = pick.home.length > maxChars ? pick.home.slice(0, maxChars) + '..' : pick.home;
          const awayName = pick.away.length > maxChars ? pick.away.slice(0, maxChars) + '..' : pick.away;
          const homeSrc = getStemmaUrl(pick.home_mongo_id, pick.league);
          const awaySrc = getStemmaUrl(pick.away_mongo_id, pick.league);

          return (
            <div key={`${pageIndex}-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
            }}>
              {homeSrc && <StemmaImg src={homeSrc} size={stemmaSize} alt={pick.home} />}
              <span style={{
                fontSize: isMobile ? '12px' : '13px', fontWeight: 700, color: theme.text,
              }}>{homeName}</span>
              <span style={{ fontSize: isMobile ? '10px' : '10px', color: theme.textDim }}>vs</span>
              <span style={{
                fontSize: isMobile ? '12px' : '13px', fontWeight: 700, color: theme.text,
              }}>{awayName}</span>
              {awaySrc && <StemmaImg src={awaySrc} size={stemmaSize} alt={pick.away} />}
              <span style={{
                fontSize: isMobile ? '11px' : '12px', fontWeight: 800, color: theme.cyan, marginLeft: '2px',
              }}>{pick.pronostico}</span>
              <span style={{ fontSize: isMobile ? '10px' : '10px' }}>
                {Array.from({ length: pick.stars }, (_, j) => (
                  <span key={j} style={{ color: '#ffd700' }}>&#9733;</span>
                ))}
              </span>
            </div>
          );
        })}
      </div>

      <div ref={offscreenRef} style={{ display: 'none' }} />
    </div>
  );
}
