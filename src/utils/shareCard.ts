import html2canvas from 'html2canvas';

async function renderAndShare(wrapper: HTMLElement, filename: string): Promise<void> {
  document.body.appendChild(wrapper);

  // Forza layout prima del render
  wrapper.offsetHeight;

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#0a0b0f',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      // Non usare position fixed — sposta visivamente fuori schermo con left
      x: 0,
      y: 0,
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!blob) {
      console.error('shareCard: toBlob ha restituito null');
      return;
    }

    // Prova Web Share API con file (mobile nativo — Instagram, Telegram, WhatsApp, ecc.)
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share) {
        // Prova prima con file
        const shareData: ShareData = { files: [file], title: 'AI Simulator', text: 'Pronostici AI gratuiti su aisimulator.vercel.app' };
        if (navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
          return;
        }
        // Fallback: share senza file (solo testo + url) — apre comunque il menu nativo
        await navigator.share({ title: 'AI Simulator', text: 'Pronostici AI gratuiti su aisimulator.vercel.app', url: 'https://aisimulator.vercel.app' });
        // E scarica anche l'immagine
      }
    } catch (err) {
      // L'utente ha annullato lo share o non supportato — ignora
      if ((err as Error).name === 'AbortError') return;
    }

    // Fallback desktop/HTTP: download diretto
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    document.body.removeChild(wrapper);
  }
}

function brandingHeader(): HTMLElement {
  const h = document.createElement('div');
  h.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:16px 16px 12px;background:linear-gradient(135deg,#0d1117,#1a1d2e);border-bottom:2px solid rgba(6,182,212,0.4);';
  h.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">&#9917;</span><span style="font-size:22px;font-weight:800;color:#06b6d4;">AI Simulator</span></div><span style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;letter-spacing:0.8px;">PRONOSTICI AI &bull; 4 MOTORI PREDITTIVI</span>';
  return h;
}

function brandingFooter(): HTMLElement {
  const f = document.createElement('div');
  f.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:12px 16px 14px;background:linear-gradient(135deg,#1a1d2e,#0d1117);border-top:2px solid rgba(6,182,212,0.4);';
  f.innerHTML = '<span style="font-size:13px;font-weight:700;color:#06b6d4;">aisimulator.vercel.app</span><span style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">Registrati gratis &bull; Pronostici ogni giorno</span>';
  return f;
}

function createWrapper(width: number): HTMLElement {
  const w = document.createElement('div');
  // Usa left negativo grande ma NON position:fixed — html2canvas lo gestisce meglio
  w.style.cssText = `position:absolute;left:-9999px;top:0;width:${width}px;background:#0a0b0f;font-family:'Inter','Segoe UI',sans-serif;border-radius:12px;overflow:hidden;`;
  return w;
}

/** Cattura un elemento DOM (es. bolletta) come immagine con branding */
export async function shareElement(element: HTMLElement, filename = 'ai-simulator-ticket.png'): Promise<void> {
  const w = createWrapper(Math.max(element.offsetWidth, 340));
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.borderRadius = '0';
  clone.style.margin = '0';
  clone.style.border = 'none';
  clone.style.boxShadow = 'none';
  // Converti input puntata in testo statico, rimuovi il resto
  clone.querySelectorAll('input').forEach(inp => {
    const input = inp as HTMLInputElement;
    const val = input.value;
    if (val && (val.includes('€') || parseFloat(val) > 0)) {
      // Sostituisci input con span statico
      const span = document.createElement('span');
      span.textContent = val;
      span.style.cssText = input.style.cssText;
      span.style.display = 'inline-block';
      input.parentElement?.replaceChild(span, input);
    } else {
      input.style.display = 'none';
    }
  });
  // Rimuovi bottoni interattivi
  clone.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent || '';
    if (t === '−' || t === '+' || t.includes('Salva') || t.includes('Salvata') ||
        t.includes('Iniziata') || t.includes('€ ?') || t.includes('Condividi') || t.includes('Scommetti')) {
      btn.style.display = 'none';
    }
  });
  // Rimuovi icone share clonate
  clone.querySelectorAll('img[src*="share-icon"]').forEach(img => {
    const parent = img.parentElement;
    if (parent) parent.style.display = 'none';
  });
  w.appendChild(brandingHeader());
  w.appendChild(clone);
  w.appendChild(brandingFooter());
  await renderAndShare(w, filename);
}

/** Genera card singolo pronostico (costruita da dati, non da DOM) */
export interface SharePredictionData {
  home: string;
  away: string;
  league?: string;
  matchTime?: string;
  date?: string;
  pronostico: string;
  tipo: string;
  quota?: number;
  confidence?: number;
  hit?: boolean | null;
}

export async function sharePrediction(data: SharePredictionData): Promise<void> {
  const w = createWrapper(360);

  const tipoLabel: Record<string, string> = { SEGNO: 'Segno', DOPPIA_CHANCE: 'Doppia Chance', GOL: 'Over/Under & GG/NG', RISULTATO_ESATTO: 'Risultato Esatto', MULTI_GOAL: 'Multi Goal' };
  const mercato = tipoLabel[data.tipo] || data.tipo;
  const stars = data.confidence ? '\u2605'.repeat(Math.min(5, Math.round(data.confidence))) + '\u2606'.repeat(Math.max(0, 5 - Math.round(data.confidence))) : '';
  const hitColor = data.hit === true ? '#34d399' : data.hit === false ? '#ff2a6d' : '#06b6d4';
  const hitLabel = data.hit === true ? '\u2705 CENTRATO' : data.hit === false ? '\u274C MANCATO' : '';
  const dateStr = data.date ? data.date.split('-').reverse().join('/') : '';

  const c = document.createElement('div');
  c.style.cssText = 'padding:20px;background:#1a1d2e;';
  c.innerHTML = `
    ${data.league ? `<div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;text-align:center;">${data.league}</div>` : ''}
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:14px;">
      <span style="font-size:18px;font-weight:800;color:#fff;text-align:right;flex:1;">${data.home}</span>
      <span style="font-size:12px;color:rgba(255,255,255,0.3);">vs</span>
      <span style="font-size:18px;font-weight:800;color:#fff;text-align:left;flex:1;">${data.away}</span>
    </div>
    ${dateStr || data.matchTime ? `<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;">${dateStr}${data.matchTime ? ' - ' + data.matchTime : ''}</div>` : ''}
    <div style="text-align:center;margin-bottom:8px;"><span style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">${mercato}</span></div>
    <div style="text-align:center;margin-bottom:10px;">
      <span style="display:inline-block;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.4);border-radius:8px;padding:8px 24px;">
        <span style="font-size:22px;font-weight:900;color:${hitColor};">${data.pronostico}</span>
        ${data.quota ? `<span style="font-size:16px;font-weight:700;color:#facc15;margin-left:12px;">@${data.quota.toFixed(2)}</span>` : ''}
      </span>
    </div>
    ${stars ? `<div style="text-align:center;font-size:14px;color:#facc15;letter-spacing:2px;">${stars}</div>` : ''}
    ${hitLabel ? `<div style="text-align:center;margin-top:8px;font-size:13px;font-weight:700;color:${hitColor};">${hitLabel}</div>` : ''}
  `;

  w.appendChild(brandingHeader());
  w.appendChild(c);
  w.appendChild(brandingFooter());

  const fn = `ai-simulator-${data.home}-vs-${data.away}-${data.pronostico}.png`.replace(/\s+/g, '-').replace(/[/\\]/g, '-').toLowerCase();
  await renderAndShare(w, fn);
}
