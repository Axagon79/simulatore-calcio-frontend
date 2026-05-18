// assegnazione.ts
// ================
// Due funzioni pure per la pagina News:
//
//   1) assegnaRedattore(match) -> Redattore
//      Hash deterministico su home+away+date. 80% specialista della lega,
//      20% redattore random tra gli altri. Stessa partita = sempre stesso
//      redattore, indipendentemente da quando ricarichi la pagina.
//
//   2) selezionaTopPronostici(pronostici, m_odds) -> Top3
//      Restituisce massimo 3 pronostici ordinati per confidence decrescente,
//      MAX 1 per famiglia (segno / over-under / gol-no-gol), con tie-break
//      casuale a parita' di confidence. Per ognuno calcola la quota dal
//      blocco odds se non gia' presente.

import { REDATTORI, SPECIALISTA_LEGA, type Redattore } from './redattori';

// ============================================================
// HASH deterministico (FNV-1a 32 bit) — stabile cross-platform.
// ============================================================
function fnv1aHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ============================================================
// ASSEGNAZIONE REDATTORE
// ============================================================
export interface MatchKey {
  home: string;
  away: string;
  date: string;       // ISO YYYY-MM-DD
  league?: string | null;
}

/**
 * Assegna un redattore alla partita.
 *
 * Logica:
 *   - 80% delle volte: specialista della lega (es. Serie A -> Luca)
 *   - 20% delle volte: redattore random scelto fra gli altri 11
 *   - Se nessuno e' specialista per quella lega (es. coppa non mappata),
 *     fallback al "tappabuchi" Marco; se anche lui non e' nelle leghe
 *     mappate, ripiega su un redattore qualsiasi via hash.
 *
 * L'hash su (home, away, date) rende l'assegnazione stabile:
 *   stessa partita = sempre stesso redattore, su qualunque dispositivo.
 */
export function assegnaRedattore(m: MatchKey): Redattore {
  const seed = `${m.home}__${m.away}__${m.date}`;
  const h = fnv1aHash(seed);

  const specialista =
    (m.league && SPECIALISTA_LEGA[m.league]) ||
    SPECIALISTA_LEGA['Champions League'] || // Marco copre coppe come fallback
    REDATTORI[0];

  // 80/20: il primo byte dell'hash modulo 100 decide.
  const dieci_su_cento = h % 100;
  if (dieci_su_cento < 80) {
    return specialista;
  }

  // 20% random tra gli altri.
  const altri = REDATTORI.filter(r => r.id !== specialista.id);
  if (altri.length === 0) return specialista;
  const idx = (h >>> 8) % altri.length;
  return altri[idx];
}


// ============================================================
// SELEZIONE TOP 3 PRONOSTICI ANTI-CONFLITTO
// ============================================================
export type PronosticoFamiglia = 'segno' | 'over_under' | 'gol_no_gol' | 'altro';

export interface PronosticoMostrato {
  pronostico: string;       // es. "X2", "Over 2.5", "Gol"
  confidence: number;       // 0-100
  famiglia: PronosticoFamiglia;
  quota: number | null;     // dal blocco odds se calcolabile
  source?: string | null;   // motore: 'sistema_z', 'scout', 'pme', ...
  peso?: number | null;     // peso_ai se presente
}

export interface PronosticoIn {
  pronostico?: string | null;
  tipo?: string | null;
  confidence?: number | null;
  quota?: number | null;
  peso_ai?: number | null;
  source?: string | null;
}

/**
 * Classifica un pronostico nella sua famiglia.
 * - SEGNO: 1, X, 2, 1X, X2, 12, Doppia Chance ...
 * - OVER/UNDER: Over 1.5/2.5/3.5, Under 1.5/2.5/3.5
 * - GOL/NO GOL: Gol, No Gol, Goal, No Goal, GG, NG
 * - ALTRO: tutto il resto (Multigol, Risultato Esatto, ...)
 */
export function classificaFamiglia(p: string | null | undefined): PronosticoFamiglia {
  const n = (p || '').toString().toLowerCase().trim();
  if (!n) return 'altro';
  if (n === '1' || n === 'x' || n === '2') return 'segno';
  if (n === '1x' || n === 'x2' || n === '12') return 'segno';
  if (n.startsWith('doppia chance')) return 'segno';
  if (n.startsWith('over ') || n.startsWith('under ')) return 'over_under';
  if (n.replace(/\s+/g, '') === 'gol' || n.replace(/\s+/g, '') === 'nogol') return 'gol_no_gol';
  if (n.replace(/\s+/g, '') === 'goal' || n.replace(/\s+/g, '') === 'nogoal') return 'gol_no_gol';
  if (n === 'gg' || n === 'ng') return 'gol_no_gol';
  return 'altro';
}

/**
 * Calcola la quota dal blocco odds della partita.
 * Funziona per 1/X/2, doppie chance (combinazione formula 1/(1/a+1/b)),
 * Over/Under 1.5/2.5/3.5, Gol/No Gol.
 */
export function quotaDaOdds(
  odds: Record<string, any> | null | undefined,
  pronostico: string | null | undefined
): number | null {
  if (!odds || !pronostico) return null;
  const p = String(pronostico).trim();
  const num = (v: any) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : null);
  const o1 = num(odds['1']);
  const oX = num(odds['X']);
  const o2 = num(odds['2']);
  const dc = (a: number | null, b: number | null) => (a != null && b != null ? 1 / (1 / a + 1 / b) : null);

  if (p === '1') return o1;
  if (p === 'X') return oX;
  if (p === '2') return o2;
  if (p === 'Doppia Chance 1X' || p === '1X') return dc(o1, oX);
  if (p === 'Doppia Chance X2' || p === 'X2') return dc(oX, o2);
  if (p === 'Doppia Chance 12' || p === '12') return dc(o1, o2);

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
}

/**
 * Seleziona top 3 pronostici per confidence, con:
 *   - max 1 per famiglia (segno / over_under / gol_no_gol / altro)
 *   - tie-break random per parita' di confidence
 *   - quota popolata dal blocco odds della partita se non gia' presente nel tip
 *
 * Filtra pronostici con confidence <= 0 o etichetta vuota / "NO BET".
 */
export function selezionaTopPronostici(
  pronostici: PronosticoIn[] | null | undefined,
  odds: Record<string, any> | null | undefined,
  max: number = 3
): PronosticoMostrato[] {
  const lista = (pronostici || [])
    .filter(p => {
      const lbl = (p?.pronostico || '').trim();
      const conf = Number(p?.confidence || 0);
      if (!lbl) return false;
      if (lbl.toUpperCase() === 'NO BET') return false;
      if (conf <= 0) return false;
      return true;
    })
    .map<PronosticoMostrato & { _r: number }>(p => ({
      pronostico: (p.pronostico || '').trim(),
      confidence: Number(p.confidence || 0),
      famiglia: classificaFamiglia(p.pronostico),
      quota: p.quota ?? quotaDaOdds(odds, p.pronostico),
      source: p.source ?? null,
      peso: p.peso_ai ?? null,
      _r: Math.random(),  // tie-break random
    }));

  // Ordina per confidence desc, poi tie-break random.
  lista.sort((a, b) => (b.confidence - a.confidence) || (a._r - b._r));

  // Screma con anti-conflitto: max 1 per famiglia.
  const visti = new Set<PronosticoFamiglia>();
  const out: PronosticoMostrato[] = [];
  for (const p of lista) {
    if (visti.has(p.famiglia)) continue;
    visti.add(p.famiglia);
    const { _r, ...clean } = p as any;
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}
