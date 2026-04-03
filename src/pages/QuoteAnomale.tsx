import React, { useState, useEffect, useMemo } from 'react';
import { getTheme, getThemeMode, API_BASE } from '../AppDev/costanti';
import { checkAdmin } from '../permissions';
import QuoteAnomaleDetail from './QuoteAnomaleDetail';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

// --- TIPI ---
interface QuoteSet { '1': number; 'X': number; '2': number }
interface Semaforo { delta_pp: number; livello: string }
interface AlertBE { aggio_specifico: number; alert: boolean }
interface VIndex { valore: number }
interface Rendimento {
  ritorno_pct: number; hwr: number; dr: number; awr: number;
  aggio_1: number; aggio_x: number; aggio_2: number;
}
interface MatchDoc {
  match_key: string; date: string; league?: string; league_raw?: string;
  match_time: string; home_raw: string; away_raw: string;
  quote_apertura: QuoteSet; quote_chiusura?: QuoteSet;
  semaforo?: { '1': Semaforo; 'X': Semaforo; '2': Semaforo };
  alert_breakeven?: { aggio_tot: number; '1': AlertBE; 'X': AlertBE; '2': AlertBE };
  direzione?: { '1': string; 'X': string; '2': string };
  v_index_rel?: { '1': VIndex; 'X': VIndex; '2': VIndex };
  v_index_abs?: { '1': VIndex; 'X': VIndex; '2': VIndex };
  rendimento_apertura?: Rendimento; rendimento_chiusura?: Rendimento;
  n_aggiornamenti?: number; ts_chiusura?: string;
  real_score?: string;
  live_score?: string; live_status?: string; live_minute?: number;
}

const SIGNS = ['1', 'X', '2'] as const;
const SEMAFORO_COLORS: Record<string, string> = { verde: '#10b981', giallo: '#f59e0b', arancione: '#f97316', rosso: '#ef4444' };

const INFO_TEXTS: Record<string, string> = {
  'Aper.': 'Quote di apertura: il primo prezzo pubblicato dal bookmaker. Serve come riferimento per misurare tutti i movimenti successivi.',
  'Live': 'Quote live: l\'ultimo aggiornamento disponibile. Il confronto con l\'apertura rivela la direzione del mercato.',
  'Δ pp': 'Delta punti percentuali: converte le quote in probabilità (1/quota) e misura la differenza tra apertura e live. Es: 2.10→1.85 = +6.5pp (forte), 8.00→7.50 = +0.8pp (trascurabile). Il pallino colorato indica l\'intensità: 🟢 verde (<2pp), 🟡 giallo (2-5pp), 🟠 arancione (5-10pp), 🔴 rosso (>10pp).',
  'BEv': 'Break-Even: confronta il delta PP con l\'aggio specifico del book su quell\'esito. "ok" = il movimento rientra nel margine normale del bookmaker (potrebbe essere rumore). "!!" = il movimento supera il margine → è un segnale reale.',
  'Agg%': 'Aggio specifico: la fetta di margine del bookmaker su ogni singolo esito. Es: se l\'aggio totale è 7% e la quota 1 pesa il 50%, il suo aggio specifico è ~3.5%. Serve come soglia per il Break-Even.',
  'HWR/D/A': 'Home Win Return / Draw Return / Away Win Return: come il bookmaker distribuisce il ritorno tra i 3 esiti. Indica su quale esito il book è più generoso.',
  'V-Abs': 'V-Index Assoluto: confronta la quota live con un valore di riferimento calcolato dalla media tra modello statistico e bookmaker all\'apertura. Sopra 100 = possibile valore (il book paga più del dovuto). Sotto 100 = quota compressa.',
  'Rit%': 'Ritorno percentuale: quanto il bookmaker restituisce ai giocatori sul totale delle puntate. Es: 93% = il book trattiene il 7% di margine. Più è alto, meglio è per lo scommettitore.',
  'Ris.': 'Risultato finale della partita, se disponibile.',
};

function hwrColors(hwr: number, dr: number, awr: number): [string, string, string] {
  const vals = [hwr, dr, awr];
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max - min < 2) return [theme.textDim, theme.textDim, theme.textDim]; // tutti simili → neutro
  return vals.map(v => v === max ? '#10b981' : v === min ? '#ef4444' : '#f59e0b') as [string, string, string];
}

function vAbsColor(v: number): string {
  if (v >= 105) return '#10b981';   // verde — molto valore
  if (v >= 102) return '#84cc16';   // verde-giallo — discreto valore
  if (v > 98)   return theme.textDim; // neutro
  if (v > 95)   return '#f97316';   // arancione — poco valore
  return '#ef4444';                 // rosso — nessun valore
}

function bevLevel(deltaPp: number, aggio: number): { color: string; label: string } {
  if (aggio <= 0 || deltaPp <= aggio) return { color: '#10b981', label: 'ok' };
  if (deltaPp <= aggio * 2) return { color: '#f59e0b', label: '!' };
  return { color: '#ef4444', label: '!!!' };
}

type PredEntry = { source: string; bestPick?: boolean; pronostico: string; tipo?: string; confidence: number | null; sezione: string | null; home?: string; away?: string };

// Mappa DC a segni coinvolti: "1X" → ["1","X"], "X2" → ["X","2"], "12" → ["1","2"]
function dcToSigns(dc: string): ('1' | 'X' | '2')[] {
  const map: Record<string, ('1' | 'X' | '2')[]> = { '1X': ['1', 'X'], 'X2': ['X', '2'], '12': ['1', '2'] };
  return map[dc] || [];
}

const SOURCE_COLORS: Record<string, string> = {
  MoE: '#f59e0b', A: '#3b82f6', S: '#8b5cf6', C: '#ec4899',
};

function predDotColor(preds?: PredEntry[]): string {
  if (!preds || preds.length === 0) return isLight ? '#cbd5e1' : '#475569'; // grigio
  if (preds.some(p => p.bestPick)) return '#10b981'; // verde — Best Pick
  return '#f59e0b'; // arancione — non nelle Best Picks
}

function buildPredAnalysis(sign: string, isDC: boolean, m: MatchDoc, isBestPick: boolean): string {
  const signs: ('1' | 'X' | '2')[] = ['1', 'X', '2'].includes(sign)
    ? [sign as '1' | 'X' | '2']
    : dcToSigns(sign);
  const signLabel = isDC ? `doppia chance ${sign}` : `segno ${sign}`;
  const SL = signLabel.charAt(0).toUpperCase() + signLabel.slice(1);
  const signNameMap: Record<string, string> = { '1': 'vittoria casa', 'X': 'pareggio', '2': 'vittoria trasferta' };

  // Hash semplice per variare i testi in modo deterministico per partita
  let h = 0;
  for (let i = 0; i < m.match_key.length; i++) h = ((h << 5) - h + m.match_key.charCodeAt(i)) | 0;
  const pick = (arr: string[]) => arr[Math.abs(h++) % arr.length];

  const lines: string[] = [];

  // Intro
  if (isBestPick) {
    lines.push(pick([
      `Pronostico ${signLabel} — presente tra le nostre Best Picks. Puoi trovarlo nella pagina Best Picks per un approfondimento completo con analisi dettagliata, stake consigliato e probabilità stimata.`,
      `Il ${signLabel} è tra i pronostici consigliati per questa partita. L'analisi completa è disponibile nella sezione Best Picks, dove puoi consultare tutti i dettagli.`,
      `${SL} — selezionato tra le Best Picks. Per maggiori dettagli (probabilità, stake, edge) consulta la pagina dedicata.`,
      `Il ${signLabel} fa parte delle nostre Best Picks per oggi. Nella pagina dedicata trovi probabilità stimata, stake suggerito e analisi approfondita.`,
      `Pronostico ${signLabel}, incluso nelle Best Picks. Tutti i dettagli — edge, confidence, stake — sono consultabili nella sezione pronostici.`,
      `${SL} — questo pronostico è stato selezionato per le Best Picks del giorno. Per l'analisi completa vai alla pagina dedicata.`,
    ]));
  } else {
    lines.push(pick([
      `Pronostico ${signLabel} — generato dai nostri algoritmi ma non presente tra le Best Picks. È stato analizzato senza superare i criteri di selezione finale.`,
      `I nostri sistemi hanno individuato il ${signLabel} per questa partita, ma non rientra tra le Best Picks. Ha superato l'analisi iniziale senza raggiungere la soglia di selezione.`,
      `${SL} — emerso dall'analisi algoritmica ma non tra i pronostici consigliati. Non ha soddisfatto tutti i requisiti per entrare nelle Best Picks.`,
      `Il ${signLabel} è stato valutato dai nostri modelli ma non è stato incluso nelle Best Picks. I criteri di selezione non sono stati pienamente soddisfatti.`,
      `Pronostico ${signLabel}, individuato dall'analisi ma rimasto fuori dalle Best Picks. La soglia di inclusione non è stata raggiunta.`,
      `${SL} — i nostri algoritmi lo hanno considerato, senza però promuoverlo tra le Best Picks. Non tutti i parametri hanno superato la selezione.`,
    ]));
  }

  // Contesto di mercato: il pronostico va col favorito o contro?
  const qRef = m.quote_chiusura || m.quote_apertura;
  if (qRef) {
    const q1 = qRef['1'] ?? 99; const qX = qRef['X'] ?? 99; const q2 = qRef['2'] ?? 99;
    const minQ = Math.min(q1, qX, q2);
    const favorito = q1 === minQ ? '1' : q2 === minQ ? '2' : 'X';
    const favLabel = favorito === '1' ? 'casa' : favorito === '2' ? 'trasferta' : 'pareggio';
    const favQuota = minQ;
    const pronoCopreFavorito = signs.includes(favorito as '1' | 'X' | '2');

    if (!pronoCopreFavorito) {
      // Il pronostico va CONTRO il favorito
      const coveredLabels = signs.map(s => signNameMap[s] || s).join(' o ');
      const ql = m.quote_chiusura ? ' live' : '';
      lines.push(pick([
        `Nota importante: questo pronostico va contro il favorito del mercato. Le quote${ql} indicano la ${favLabel} come esito più probabile (quota ${favQuota.toFixed(2)}), mentre il ${signLabel} copre ${coveredLabels}. Il mercato non è dalla parte di questa scommessa.`,
        `Attenzione al contesto: il mercato${ql} dà favorita la ${favLabel} (${favQuota.toFixed(2)}), e il ${signLabel} non la include. Questo pronostico si gioca contro l'esito ritenuto più probabile dal book.`,
        `Da considerare: le quote${ql} puntano sulla ${favLabel} come favorita (${favQuota.toFixed(2)}). Il ${signLabel} va nella direzione opposta — si scommette contro il favorito del mercato.`,
        `Elemento chiave: il favorito secondo le quote${ql} è la ${favLabel} (${favQuota.toFixed(2)}), ma il ${signLabel} non copre questo esito. È una scommessa controcorrente rispetto all'indicazione del mercato.`,
        `Il mercato${ql} è chiaro: la ${favLabel} è l'esito più atteso (${favQuota.toFixed(2)}). Il ${signLabel} non lo include — questa scommessa va in direzione opposta rispetto a dove puntano le quote.`,
        `Le quote${ql} parlano: favorita la ${favLabel} a ${favQuota.toFixed(2)}, mentre il ${signLabel} copre ${coveredLabels}. Siamo dalla parte opposta rispetto al favorito del book.`,
      ]));
    } else if (signs.length === 1 && signs[0] === favorito) {
      const ql = m.quote_chiusura ? ' live' : '';
      lines.push(pick([
        `Il pronostico è in linea con il favorito del mercato: le quote${ql} danno la ${favLabel} come esito più probabile (${favQuota.toFixed(2)}).`,
        `Contesto favorevole: il ${signLabel} coincide con il favorito del mercato${ql} (${favLabel}, quota ${favQuota.toFixed(2)}).`,
        `Le quote${ql} confermano: la ${favLabel} è il favorito (${favQuota.toFixed(2)}), esattamente nella direzione di questo pronostico.`,
        `Il mercato${ql} va nella stessa direzione: ${favLabel} favorita a ${favQuota.toFixed(2)}, e questo pronostico la segue.`,
        `Scommessa allineata al mercato: la ${favLabel} (${favQuota.toFixed(2)}) è l'esito più probabile secondo le quote${ql}, e il ${signLabel} punta proprio lì.`,
        `Quote${ql} e pronostico concordano: la ${favLabel} è il favorito (${favQuota.toFixed(2)}). Il mercato supporta questa direzione.`,
      ]));
    } else if (isDC && pronoCopreFavorito) {
      const ql = m.quote_chiusura ? ' live' : '';
      lines.push(pick([
        `Il ${signLabel} copre il favorito del mercato (${favLabel}, quota${ql} ${favQuota.toFixed(2)}), più un secondo esito. La scommessa include l'esito più probabile secondo le quote.`,
        `Contesto: la ${favLabel} è il favorito (${favQuota.toFixed(2)}) e rientra nel ${signLabel}. La doppia chance include l'esito che il mercato ritiene più probabile.`,
        `Le quote${ql} danno favorita la ${favLabel} (${favQuota.toFixed(2)}), che è coperta da questo ${signLabel}. La scommessa è dalla parte del mercato.`,
        `La doppia chance ${sign} include la ${favLabel}, favorita a ${favQuota.toFixed(2)}. Il mercato${ql} è dalla parte di almeno uno dei due esiti coperti.`,
        `Il favorito${ql} è la ${favLabel} (${favQuota.toFixed(2)}), e il ${signLabel} lo comprende. Si gioca con il mercato, non contro.`,
        `Buon segnale strutturale: il ${signLabel} copre la ${favLabel}, che le quote${ql} indicano come favorita (${favQuota.toFixed(2)}). La scommessa ha il mercato dalla sua parte.`,
      ]));
    }
  }

  for (const s of signs) {
    const qAp = m.quote_apertura?.[s];
    const qLive = m.quote_chiusura?.[s];
    const vAbs = m.v_index_abs?.[s]?.valore;
    const delta = m.semaforo?.[s]?.delta_pp;
    const livello = m.semaforo?.[s]?.livello;
    const bev = m.alert_breakeven?.[s];
    const rend = m.rendimento_chiusura || m.rendimento_apertura;
    const hwrMap: Record<string, number | undefined> = { '1': rend?.hwr, 'X': rend?.dr, '2': rend?.awr };
    const hwrVal = hwrMap[s];
    const sName = signNameMap[s] || s;
    const prefix = signs.length > 1 ? `[${s}] ` : '';

    // 1. Movimento quota
    if (qAp && qLive) {
      const diff = qLive - qAp;
      if (diff < -0.05) {
        lines.push(prefix + pick([
          `La quota per la ${sName} è passata da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il calo può essere dovuto a un aumento delle puntate su questo esito, oppure a una correzione del bookmaker in base a informazioni come formazioni, condizioni del campo o notizie dell'ultima ora.`,
          `Quota ${sName} in discesa: da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il bookmaker ha rivisto al ribasso questo esito. Le cause possono essere molteplici: flusso di scommesse, aggiornamenti sulla formazione, infortuni o semplicemente un ribilanciamento del proprio portafoglio.`,
          `Da ${qAp.toFixed(2)} a ${qLive.toFixed(2)} per la ${sName}. La riduzione della quota riflette un cambiamento nella percezione di questo esito — sia da parte degli scommettitori che del bookmaker stesso, che potrebbe aver ricevuto nuove informazioni.`,
          `La ${sName} è scesa da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Qualcosa ha spinto il book a rivedere il prezzo: potrebbe essere il volume di puntate, una notizia sulle formazioni, o un semplice ribilanciamento interno.`,
          `Quota in calo per la ${sName}: ${qAp.toFixed(2)} → ${qLive.toFixed(2)}. Il mercato ha ridotto il prezzo, segno che questo esito è diventato più "popolare" — per scommesse ricevute o per una rivalutazione del book.`,
          `Per la ${sName} si registra un calo da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il bookmaker offre meno di prima: possibili cause vanno dal flusso di denaro a informazioni dell'ultimo minuto.`,
        ]));
      } else if (diff > 0.05) {
        lines.push(prefix + pick([
          `La quota per la ${sName} è salita da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. L'aumento può indicare che il bookmaker ritiene meno probabile questo esito, oppure che il flusso di scommesse si è concentrato sugli altri segni.`,
          `Quota ${sName} in aumento: da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il bookmaker ha alzato il prezzo, segnalando una minore fiducia verso questo esito o una redistribuzione del rischio.`,
          `Da ${qAp.toFixed(2)} a ${qLive.toFixed(2)} per la ${sName}. L'incremento riflette uno spostamento del mercato: i soldi si muovono verso altri esiti, oppure il book ha corretto al rialzo per nuove valutazioni.`,
          `La ${sName} è salita da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il book ha ritoccato al rialzo: meno fiducia verso questo esito, o semplicemente le puntate stanno andando altrove.`,
          `Quota in salita per la ${sName}: ${qAp.toFixed(2)} → ${qLive.toFixed(2)}. Il mercato si allontana da questo segno — potrebbe essere un aggiustamento tecnico o una reazione a nuove informazioni.`,
          `Per la ${sName} la quota è cresciuta da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il bookmaker paga di più, il che segnala una percezione di minor probabilità per questo esito.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `La quota per la ${sName} è rimasta stabile (${qAp.toFixed(2)} → ${qLive.toFixed(2)}). Nessun movimento significativo da parte del mercato su questo segno.`,
          `Quota ${sName} invariata: ${qAp.toFixed(2)} → ${qLive.toFixed(2)}. Il bookmaker non ha ritenuto necessario correggere questo esito.`,
          `Nessuna variazione rilevante per la ${sName} (${qAp.toFixed(2)} → ${qLive.toFixed(2)}). Il mercato è rimasto fermo su questo segno.`,
          `Per la ${sName} tutto fermo: ${qAp.toFixed(2)} → ${qLive.toFixed(2)}. Il book non ha toccato questa quota, segno di stabilità.`,
          `Quota stabile per la ${sName}: da ${qAp.toFixed(2)} a ${qLive.toFixed(2)}. Il mercato non ha espresso alcun movimento su questo esito.`,
        ]));
      }
    }

    // 2. Delta pp + semaforo
    if (delta !== undefined && livello) {
      const livelloDesc: Record<string, string> = {
        verde: 'contenuto e nella norma',
        giallo: 'moderato, merita attenzione',
        arancione: 'significativo, da tenere sotto controllo',
        rosso: 'molto forte, possibile anomalia di mercato',
      };
      lines.push(prefix + pick([
        `Lo scostamento (Δpp) tra apertura e chiusura è di ${delta.toFixed(1)} punti percentuali: un movimento ${livelloDesc[livello] || livello}.`,
        `La differenza tra le probabilità implicite di apertura e quelle attuali è ${delta.toFixed(1)} pp. Il livello è ${livello}: ${livelloDesc[livello] || ''}.`,
        `Δpp di ${delta.toFixed(1)} — semaforo ${livello}. Questo scostamento è ${livelloDesc[livello] || livello}.`,
        `Il Δpp registrato è ${delta.toFixed(1)}: semaforo ${livello}, ovvero un movimento ${livelloDesc[livello] || livello}.`,
        `Tra apertura e chiusura la probabilità implicita si è mossa di ${delta.toFixed(1)} pp. Il semaforo segna ${livello}: ${livelloDesc[livello] || livello}.`,
        `Scostamento di ${delta.toFixed(1)} punti percentuali, classificato come ${livello} — ${livelloDesc[livello] || livello}.`,
      ]));
    }

    // 3. Break-even
    if (bev && delta !== undefined) {
      if (bev.alert) {
        lines.push(prefix + pick([
          `Il movimento (${delta.toFixed(1)} pp) supera l'aggio che il bookmaker applica su questo segno (${bev.aggio_specifico.toFixed(1)}%). Quando lo scostamento va oltre il margine del book, può indicare un evento rilevante: un infortunio chiave, una formazione inattesa, condizioni meteo avverse o un flusso anomalo di puntate.`,
          `Attenzione: il Δpp (${delta.toFixed(1)}) eccede l'aggio specifico (${bev.aggio_specifico.toFixed(1)}%). Il bookmaker sta muovendo la quota oltre il proprio margine di sicurezza, il che suggerisce che qualcosa di concreto sta influenzando questo esito — non è un semplice aggiustamento di routine.`,
          `Con un Δpp di ${delta.toFixed(1)} contro un aggio di ${bev.aggio_specifico.toFixed(1)}%, il movimento di mercato ha superato la soglia di break-even. In pratica il book sta accettando di guadagnare meno (o rischiare di più) su questo segno: un segnale che merita approfondimento.`,
          `Il Δpp di ${delta.toFixed(1)} va oltre l'aggio del book (${bev.aggio_specifico.toFixed(1)}%). Significa che il bookmaker sta spostando la quota più di quanto il suo margine consenta normalmente — c'è qualcosa dietro questo movimento.`,
          `Soglia di break-even superata: Δpp ${delta.toFixed(1)} vs aggio ${bev.aggio_specifico.toFixed(1)}%. Il book muove la quota oltre il proprio margine, cosa che di solito accade solo quando c'è un motivo concreto.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Il Δpp (${delta.toFixed(1)}) rientra nell'aggio specifico del book (${bev.aggio_specifico.toFixed(1)}%). La correzione è fisiologica e rientra nel normale margine operativo del bookmaker.`,
          `Con un Δpp di ${delta.toFixed(1)} e un aggio di ${bev.aggio_specifico.toFixed(1)}%, il movimento è entro i limiti. Il bookmaker ha ritoccato la quota senza uscire dal proprio margine: nessuna anomalia rilevata.`,
          `Lo scostamento (${delta.toFixed(1)} pp) resta sotto l'aggio specifico (${bev.aggio_specifico.toFixed(1)}%). Un aggiustamento ordinario, che non segnala situazioni particolari.`,
          `Δpp di ${delta.toFixed(1)} con aggio a ${bev.aggio_specifico.toFixed(1)}%: tutto nella norma. Il book si è mosso restando dentro il proprio margine.`,
          `Nessun superamento del break-even: il Δpp (${delta.toFixed(1)}) è contenuto rispetto all'aggio (${bev.aggio_specifico.toFixed(1)}%). Aggiustamento fisiologico.`,
        ]));
      }
    }

    // 4. HWR/DR/AWR
    if (hwrVal !== undefined && rend) {
      const vals = [rend.hwr, rend.dr, rend.awr];
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const labelMap: Record<string, string> = { '1': 'HWR', 'X': 'DR', '2': 'AWR' };
      if (hwrVal === max) {
        lines.push(prefix + pick([
          `Sul fronte del ritorno, il bookmaker è più generoso su questo segno (${labelMap[s]} ${hwrVal.toFixed(1)}%): rispetto agli altri due esiti, è quello che restituisce di più allo scommettitore.`,
          `Il ritorno del book è al massimo proprio su questo esito (${labelMap[s]} ${hwrVal.toFixed(1)}%). Tra i tre segni, è quello su cui il bookmaker trattiene meno margine.`,
          `Con un ${labelMap[s]} di ${hwrVal.toFixed(1)}%, questo segno ha il ritorno più generoso tra i tre. Il bookmaker distribuisce una fetta maggiore del payout qui.`,
          `${labelMap[s]} ${hwrVal.toFixed(1)}% — il payout più alto tra i tre esiti. Il book trattiene meno margine su questo segno rispetto agli altri.`,
          `Questo esito offre il ritorno migliore (${labelMap[s]} ${hwrVal.toFixed(1)}%). Il bookmaker è più generoso qui che sugli altri due segni.`,
        ]));
      } else if (hwrVal === min) {
        lines.push(prefix + pick([
          `Il ritorno del book su questo segno è il più basso tra i tre (${labelMap[s]} ${hwrVal.toFixed(1)}%). Il bookmaker trattiene più margine qui.`,
          `Con un ${labelMap[s]} di ${hwrVal.toFixed(1)}%, questo è il segno meno remunerato. Il book concentra il proprio margine su questo esito.`,
          `${labelMap[s]} ${hwrVal.toFixed(1)}% — il ritorno più contenuto tra i tre esiti. Il bookmaker penalizza di più questo segno.`,
          `Questo esito ha il payout più basso (${labelMap[s]} ${hwrVal.toFixed(1)}%). Il book trattiene più margine qui che sugli altri segni.`,
          `Il bookmaker è meno generoso su questo segno: ${labelMap[s]} ${hwrVal.toFixed(1)}%, il più basso dei tre.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Il ritorno del book su questo segno (${labelMap[s]} ${hwrVal.toFixed(1)}%) è nella fascia intermedia: né il più generoso né il più penalizzato.`,
          `${labelMap[s]} ${hwrVal.toFixed(1)}%: un ritorno nella media tra i tre esiti. Il bookmaker non favorisce né sfavorisce questo segno.`,
          `Ritorno equilibrato per questo esito: ${labelMap[s]} ${hwrVal.toFixed(1)}%, nella fascia centrale rispetto agli altri due segni.`,
          `Con un ${labelMap[s]} di ${hwrVal.toFixed(1)}%, il payout è intermedio. Nessuna particolarità dal punto di vista del ritorno.`,
        ]));
      }
    }

    // 5. V-Abs
    if (vAbs !== undefined) {
      if (vAbs >= 105) {
        lines.push(prefix + pick([
          `Il V-Abs è ${vAbs.toFixed(1)}: la quota attuale è superiore al riferimento calcolato dal modello. Il bookmaker paga più del dovuto su questo segno — questa quota ha molto valore.`,
          `V-Abs a ${vAbs.toFixed(1)} — nettamente sopra 100. La quota offerta è più alta di quanto il modello ritenga corretto: uno scarto favorevole. Questa quota ha valore.`,
          `Con un V-Abs di ${vAbs.toFixed(1)}, il book offre un prezzo più alto rispetto alla probabilità stimata. Buon valore su questo segno.`,
          `V-Abs ${vAbs.toFixed(1)}: quota sopra il fair value. Il bookmaker sta pagando più di quanto dovrebbe secondo il modello — valore presente.`,
          `Il V-Abs a ${vAbs.toFixed(1)} indica che questa quota ha valore: il prezzo è più alto di quello che il modello considera equo.`,
          `Valore alto su questo segno: V-Abs ${vAbs.toFixed(1)}, ben sopra la soglia di 100. Il book offre più del dovuto.`,
        ]));
      } else if (vAbs >= 100) {
        lines.push(prefix + pick([
          `Il V-Abs è ${vAbs.toFixed(1)}: in linea con il riferimento. La quota è sostanzialmente corretta, senza valore aggiunto né penalizzazione.`,
          `V-Abs a ${vAbs.toFixed(1)} — nella norma. Il prezzo offerto corrisponde al valore stimato. Quota neutra.`,
          `Con un V-Abs di ${vAbs.toFixed(1)}, la quota è allineata al riferimento. Il bookmaker paga il giusto, né di più né di meno.`,
          `V-Abs ${vAbs.toFixed(1)}: quota in linea con il fair value. Non c'è valore aggiunto, ma nemmeno penalizzazione.`,
          `Valore neutro per questo segno (V-Abs ${vAbs.toFixed(1)}). Il prezzo è coerente con il modello.`,
        ]));
      } else if (vAbs >= 95) {
        lines.push(prefix + pick([
          `Il V-Abs è ${vAbs.toFixed(1)}: leggermente sotto il riferimento. La quota è lievemente compressa, con poco valore su questo segno.`,
          `V-Abs a ${vAbs.toFixed(1)} — appena sotto 100. Il book paga un po' meno del dovuto. Valore scarso, anche se lo scarto è contenuto.`,
          `Con un V-Abs di ${vAbs.toFixed(1)}, la quota è lievemente inferiore al riferimento. Non c'è valore evidente su questo segno.`,
          `V-Abs ${vAbs.toFixed(1)}: quota leggermente sotto il fair value. Poco valore, ma nella zona di normalità.`,
          `Valore scarso su questo segno (V-Abs ${vAbs.toFixed(1)}). Il book paga un po' meno del dovuto, senza eccessi.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Il V-Abs è ${vAbs.toFixed(1)}: il bookmaker paga meno del dovuto su questo segno. Quota compressa, senza valore.`,
          `V-Abs a ${vAbs.toFixed(1)} — significativamente sotto 100. Il prezzo offerto è inferiore a quanto stimato: valore assente.`,
          `Con un V-Abs di ${vAbs.toFixed(1)}, la quota è nettamente sotto il riferimento. Il bookmaker trattiene più margine del previsto.`,
          `V-Abs ${vAbs.toFixed(1)}: quota ben sotto il fair value. Il book penalizza questo esito — valore assente.`,
          `Valore assente su questo segno (V-Abs ${vAbs.toFixed(1)}). La quota è compressa rispetto a quello che il modello ritiene equo.`,
        ]));
      }
    }
  }

  // Conclusione basata sui segnali raccolti — score pesato
  // Per DC: basta che UNO dei segni coperti abbia segnali positivi (la scommessa vince se esce uno qualsiasi)
  let score = 0; // positivo = favorevole, negativo = sfavorevole
  const positivi: string[] = [];
  const negativi: string[] = [];

  // Per DC prendiamo il MIGLIOR segnale tra i segni coperti per ogni indicatore
  const bestQuotaDiff = Math.min(...signs.map(s => {
    const qAp = m.quote_apertura?.[s]; const qLive = m.quote_chiusura?.[s];
    return (qAp && qLive) ? qLive - qAp : 0;
  }));
  const bestVAbs = Math.max(...signs.map(s => m.v_index_abs?.[s]?.valore ?? 100));
  const bestLivello = signs.some(s => m.semaforo?.[s]?.livello === 'verde') ? 'verde'
    : signs.some(s => m.semaforo?.[s]?.livello === 'giallo') ? 'giallo'
    : signs.some(s => m.semaforo?.[s]?.livello === 'arancione') ? 'arancione' : 'rosso';
  const anyBevAlert = signs.some(s => m.alert_breakeven?.[s]?.alert);
  const allBevAlert = signs.every(s => m.alert_breakeven?.[s]?.alert);
  const rend = m.rendimento_chiusura || m.rendimento_apertura;
  const bestHwr = rend ? Math.max(...signs.map(s => {
    const map: Record<string, number | undefined> = { '1': rend.hwr, 'X': rend.dr, '2': rend.awr };
    return map[s] ?? 0;
  })) : null;
  const allVals = rend ? [rend.hwr, rend.dr, rend.awr] : [];

  // Contesto favorito/sfavorito: peso 2
  const qRefScore = m.quote_chiusura || m.quote_apertura;
  if (qRefScore) {
    const sq1 = qRefScore['1'] ?? 99; const sqX = qRefScore['X'] ?? 99; const sq2 = qRefScore['2'] ?? 99;
    const minQs = Math.min(sq1, sqX, sq2);
    const favS = sq1 === minQs ? '1' : sq2 === minQs ? '2' : 'X';
    const pronoCopreFavS = signs.includes(favS as '1' | 'X' | '2');
    if (!pronoCopreFavS) {
      score -= 2; negativi.push('contro il favorito del mercato');
    } else if (signs.length === 1 && signs[0] === favS) {
      score += 1; positivi.push('in linea col favorito del mercato');
    }
    // DC che copre favorito: neutro (vantaggio già implicito nella DC)
  }

  // Quota: peso 2
  if (bestQuotaDiff < -0.05) { score += 2; positivi.push('quota in calo' + (isDC ? ' su almeno un segno coperto' : '')); }
  else if (bestQuotaDiff > 0.15) { score -= 2; negativi.push('quota in salita' + (isDC ? ' su tutti i segni coperti' : '')); }
  else if (bestQuotaDiff > 0.05) { score -= 1; negativi.push('quota in leggera salita'); }

  // V-Abs: peso 3 (indicatore più importante)
  if (bestVAbs >= 105) { score += 3; positivi.push(`valore alto (V-Abs ${bestVAbs.toFixed(1)})`); }
  else if (bestVAbs >= 102) { score += 2; positivi.push(`buon valore (V-Abs ${bestVAbs.toFixed(1)})`); }
  else if (bestVAbs >= 98) { score += 0; } // neutro, non menzionare
  else if (bestVAbs >= 95) { score -= 1; negativi.push(`valore scarso (V-Abs ${bestVAbs.toFixed(1)})`); }
  else { score -= 3; negativi.push(`valore assente (V-Abs ${bestVAbs.toFixed(1)})`); }

  // Semaforo: peso 1
  if (bestLivello === 'verde') { score += 1; positivi.push('scostamento contenuto'); }
  else if (bestLivello === 'rosso') { score -= 2; negativi.push('scostamento molto forte'); }
  else if (bestLivello === 'arancione') { score -= 1; negativi.push('scostamento significativo'); }

  // Break-even: peso 2
  if (isDC ? allBevAlert : anyBevAlert) { score -= 2; negativi.push('superamento break-even'); }
  else if (!anyBevAlert) { score += 1; positivi.push('entro il margine del book'); }

  // HWR: peso 1
  if (bestHwr !== null && allVals.length > 0) {
    if (bestHwr === Math.max(...allVals)) { score += 1; positivi.push('ritorno più generoso tra i 3 esiti'); }
    else if (bestHwr === Math.min(...allVals)) { score -= 1; negativi.push('ritorno meno generoso tra i 3 esiti'); }
  }

  // Genera conclusione — chiara, schierata, onesta
  lines.push('');
  const dcNota = isDC ? ` Con la ${signLabel} hai due possibilità di vincere: basta che esca ${signs.join(' o ')}.` : '';

  if (score >= 4) {
    lines.push(pick([
      `Tutto sommato, le indicazioni sono nettamente a favore. ${positivi.join(', ')} — gli indicatori vanno tutti nella stessa direzione.${dcNota}`,
      `Nel complesso il quadro è molto positivo: ${positivi.join(', ')}. Il mercato si muove dalla parte di questo pronostico.${dcNota}`,
      `Le indicazioni parlano chiaro: ${positivi.join(', ')}. Un contesto solido, con tutti gli elementi a favore.${dcNota}`,
      `Quadro decisamente positivo. ${positivi.join(', ')}: il mercato conferma questo pronostico su tutta la linea.${dcNota}`,
      `Gli indicatori convergono tutti nella stessa direzione: ${positivi.join(', ')}. Le indicazioni sono chiaramente a favore.${dcNota}`,
      `In conclusione: indicazioni a favore senza riserve. ${positivi.join(', ')} — il mercato è dalla parte di questo esito.${dcNota}`,
    ]));
  } else if (score >= 2) {
    lines.push(pick([
      `Nel complesso le indicazioni sono a favore. ${positivi.join(', ')}${negativi.length ? ` — c'è qualche dettaglio secondario (${negativi.join(', ')}) ma il quadro resta positivo` : ''}.${dcNota}`,
      `Tutto considerato, il contesto è buono: ${positivi.join(', ')}. ${negativi.length ? `Qualche nota minore (${negativi.join(', ')}), nulla che cambi la sostanza. ` : ''}Le indicazioni vanno a favore.${dcNota}`,
      `Complessivamente a favore. ${positivi.join(', ')}${negativi.length ? `, con aspetti marginali (${negativi.join(', ')})` : ''}. Il peso degli indicatori positivi è maggiore.${dcNota}`,
      `Le indicazioni pendono dalla parte giusta: ${positivi.join(', ')}. ${negativi.length ? `C'è da notare ${negativi.join(', ')}, ma non sposta il bilancio. ` : ''}Contesto favorevole.${dcNota}`,
      `Il quadro è positivo. ${positivi.join(', ')}${negativi.length ? ` — qualche dettaglio (${negativi.join(', ')}) che non compromette l'insieme` : ''}. Le indicazioni sono dalla parte di questo pronostico.${dcNota}`,
      `Buone indicazioni: ${positivi.join(', ')}. ${negativi.length ? `Da tenere presente: ${negativi.join(', ')}. Ma ` : ''}il bilancio complessivo è a favore.${dcNota}`,
    ]));
  } else if (score >= 0) {
    lines.push(pick([
      `Le indicazioni sono neutre, né a favore né a sfavore. ${positivi.length ? positivi.join(', ') : 'Nessun segnale forte'}${negativi.length ? `, bilanciati da ${negativi.join(', ')}` : ''}. Il mercato non si esprime chiaramente.${dcNota}`,
      `Quadro equilibrato. ${positivi.length ? `Da un lato ${positivi.join(', ')}` : ''}${negativi.length ? `, dall'altro ${negativi.join(', ')}` : ''}. Le indicazioni non pendono in nessuna direzione.${dcNota}`,
      `Situazione bilanciata: ${positivi.length ? positivi.join(', ') : 'nessun elemento forte'}${negativi.length ? ` vs ${negativi.join(', ')}` : ''}. Gli indicatori si compensano.${dcNota}`,
      `Né pro né contro: ${positivi.length ? positivi.join(', ') : 'nessun segnale dominante'}${negativi.length ? `, ma anche ${negativi.join(', ')}` : ''}. Il mercato non dà indicazioni chiare.${dcNota}`,
      `Le indicazioni si bilanciano. ${positivi.length ? `A favore: ${positivi.join(', ')}. ` : ''}${negativi.length ? `A sfavore: ${negativi.join(', ')}. ` : ''}Nessuno dei due pesa abbastanza da prevalere.${dcNota}`,
    ]));
  } else if (score >= -3) {
    lines.push(pick([
      `Le indicazioni sono leggermente a sfavore. ${negativi.join(', ')}${positivi.length ? `, anche se c'è del buono (${positivi.join(', ')})` : ''}. Il mercato non è dalla parte di questo esito.${dcNota}`,
      `Il peso degli indicatori pende a sfavore: ${negativi.join(', ')}. ${positivi.length ? `Non mancano aspetti positivi (${positivi.join(', ')}), ma ` : ''}il contesto non è dei migliori.${dcNota}`,
      `Complessivamente a sfavore. ${negativi.join(', ')}${positivi.length ? ` — parzialmente bilanciati da ${positivi.join(', ')}` : ''}. Le indicazioni non sono dalla parte di questo pronostico.${dcNota}`,
      `Il mercato non spinge nella direzione di questo pronostico: ${negativi.join(', ')}. ${positivi.length ? `Qualcosa di buono c'è (${positivi.join(', ')}), ma ` : ''}il quadro generale è a sfavore.${dcNota}`,
      `Indicazioni prevalentemente a sfavore: ${negativi.join(', ')}. ${positivi.length ? `${positivi.join(', ')} non bastano a compensare. ` : ''}Il contesto delle quote non aiuta.${dcNota}`,
    ]));
  } else {
    lines.push(pick([
      `Le indicazioni sono chiaramente a sfavore: ${negativi.join(', ')}. Il mercato va nella direzione opposta a questo pronostico.${dcNota}`,
      `Il quadro è negativo. ${negativi.join(', ')} — gli indicatori sono tutti a sfavore di questo esito.${dcNota}`,
      `Le indicazioni vanno contro questo pronostico: ${negativi.join(', ')}. Il mercato esprime una visione diversa.${dcNota}`,
      `Tutti gli indicatori puntano nella direzione opposta: ${negativi.join(', ')}. Le indicazioni sono nettamente a sfavore.${dcNota}`,
      `Il mercato è chiaramente dalla parte opposta. ${negativi.join(', ')}: le indicazioni non lasciano spazio a dubbi.${dcNota}`,
      `Quadro negativo su tutta la linea: ${negativi.join(', ')}. Le quote non confermano questo pronostico.${dcNota}`,
    ]));
  }

  return lines.join(' ');
}

function buildMarketOverview(m: MatchDoc): string {
  const signNameMap: Record<string, string> = { '1': 'vittoria casa', 'X': 'pareggio', '2': 'vittoria trasferta' };
  let h = 0;
  for (let i = 0; i < m.match_key.length; i++) h = ((h << 5) - h + m.match_key.charCodeAt(i)) | 0;
  const pick = (arr: string[]) => arr[Math.abs(h++) % arr.length];
  const lines: string[] = [];
  const qRef = m.quote_chiusura || m.quote_apertura;
  if (!qRef) return 'Dati quote non disponibili per questa partita.';
  const ql = m.quote_chiusura ? ' live' : '';

  // Calcola dati per tutti i segni
  const signData = (['1', 'X', '2'] as const).map(s => {
    const qAp = m.quote_apertura?.[s]; const qLive = m.quote_chiusura?.[s];
    const q = qLive ?? qAp ?? 99;
    const vAbs = m.v_index_abs?.[s]?.valore;
    const delta = m.semaforo?.[s]?.delta_pp;
    const livello = m.semaforo?.[s]?.livello;
    const bev = m.alert_breakeven?.[s];
    return { s, q, qAp, qLive, vAbs, delta, livello, bev };
  });

  const favorito = signData.reduce((a, b) => a.q < b.q ? a : b);
  const rend = m.rendimento_chiusura || m.rendimento_apertura;
  const hwrMap: Record<string, number> = { '1': rend?.hwr ?? 0, 'X': rend?.dr ?? 0, '2': rend?.awr ?? 0 };
  const hwrLabels: Record<string, string> = { '1': 'HWR', 'X': 'DR', '2': 'AWR' };

  // 1. INTRO
  const favQ = favorito.q.toFixed(2);
  const favName = signNameMap[favorito.s];
  lines.push(pick([
    `I nostri sistemi non hanno emesso un pronostico nel mercato dei segni per questa partita, ma le quote${ql} offrono comunque una lettura interessante. Il favorito del bookmaker è la ${favName}, quotata a ${favQ}: è l'esito che il mercato ritiene più probabile. Vediamo nel dettaglio cosa ci dicono gli indicatori su ciascun segno.`,
    `Nessun pronostico SEGNO emesso dai nostri algoritmi per questa partita, ma le quote${ql} parlano chiaro: la ${favName} è il favorito (${favQ}). Questo non significa che sia la scelta migliore per lo scommettitore — il prezzo offerto dal bookmaker conta quanto la probabilità dell'evento. Ecco l'analisi completa.`,
    `Per questa partita non abbiamo un pronostico nel mercato dei segni, ma il mercato${ql} fornisce indicazioni preziose. La ${favName} è data come esito più probabile (${favQ}). Tuttavia, essere favoriti non equivale automaticamente ad avere valore: il prezzo che il bookmaker offre può essere vantaggioso o penalizzante. Analizziamo ogni segno.`,
    `Partita senza pronostico SEGNO dai nostri sistemi. Le quote${ql} inquadrano la ${favName} come favorita a ${favQ}. Ma la domanda vera non è chi vince — è dove il bookmaker offre un prezzo interessante rispetto alla probabilità reale dell'evento. Approfondiamo segno per segno.`,
    `I nostri algoritmi non hanno selezionato un pronostico SEGNO, ma questo non rende la partita meno interessante dal punto di vista del mercato. Le quote${ql} favoriscono la ${favName} (${favQ}). Quello che conta davvero, però, è capire se il prezzo offerto riflette il valore reale di ciascun esito.`,
    `Nessuna selezione nel mercato dei segni per questa partita. Il bookmaker${ql} indica la ${favName} come favorita (${favQ}), ma le quote nascondono sempre dettagli importanti: dove c'è valore, dove il margine è più alto, e dove il mercato si è mosso in modo anomalo. Ecco cosa emerge dall'analisi.`,
  ]));

  // 2. ANALISI SEGNO PER SEGNO (come buildPredAnalysis)
  for (const d of signData) {
    const sName = signNameMap[d.s];
    const isFav = d.s === favorito.s;
    const prefix = `[${d.s}] `;

    // Movimento quota
    if (d.qAp && d.qLive) {
      const diff = d.qLive - d.qAp;
      if (diff < -0.05) {
        lines.push(prefix + pick([
          `La quota per la ${sName} è scesa da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. Questo calo indica che il bookmaker ha rivisto al ribasso questo esito, probabilmente per un aumento delle puntate su questo segno o per nuove informazioni (formazioni, infortuni, condizioni del campo).`,
          `Quota ${sName} in discesa: da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. Il mercato si è spostato verso questo esito — il bookmaker offre meno di prima perché lo ritiene più probabile rispetto all'apertura, oppure ha ricevuto un volume di scommesse significativo.`,
          `Da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)} per la ${sName}. La riduzione del prezzo è un segnale: qualcosa ha portato il bookmaker a rivalutare questo esito come più probabile rispetto a quanto pensava in apertura.`,
          `Per la ${sName} si registra un calo da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. Il bookmaker ha abbassato il prezzo, il che in genere significa che il flusso di denaro o nuove informazioni hanno reso questo esito più credibile agli occhi del mercato.`,
        ]));
      } else if (diff > 0.05) {
        lines.push(prefix + pick([
          `La quota per la ${sName} è salita da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. L'aumento suggerisce che il bookmaker ritiene meno probabile questo esito rispetto all'apertura, oppure che il flusso di scommesse si è concentrato altrove.`,
          `Quota ${sName} in aumento: da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. Il mercato si allontana da questo esito — il bookmaker offre un prezzo più alto perché lo ritiene meno probabile o perché le puntate stanno andando su altri segni.`,
          `Da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)} per la ${sName}. L'incremento della quota significa che il bookmaker è disposto a pagare di più per attirare scommesse su questo segno, segno che il mercato non ci crede troppo.`,
          `Per la ${sName} la quota è cresciuta da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. Il bookmaker paga di più, il che paradossalmente non è un buon segno: indica una minore fiducia del mercato verso questo esito.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Quota ${sName} sostanzialmente stabile (${d.qAp.toFixed(2)} → ${d.qLive.toFixed(2)}). Il bookmaker non ha avuto motivo di correggere significativamente questo esito tra apertura e chiusura.`,
          `Per la ${sName} la quota è rimasta ferma (${d.qAp.toFixed(2)} → ${d.qLive.toFixed(2)}). Nessun segnale dal mercato: né flussi di puntate significativi, né nuove informazioni che abbiano cambiato la valutazione del bookmaker.`,
          `Quota ${sName} invariata: ${d.qAp.toFixed(2)} → ${d.qLive.toFixed(2)}. Il mercato non si è espresso in modo particolare su questo segno — la valutazione del bookmaker resta quella dell'apertura.`,
          `Nessun movimento sulla ${sName}: da ${d.qAp.toFixed(2)} a ${d.qLive.toFixed(2)}. Il book ha confermato la propria valutazione iniziale, senza correzioni.`,
        ]));
      }
    }

    // Semaforo + Break-even (combinati per fluidità)
    if (d.delta !== undefined && d.livello && d.bev) {
      const livelloDesc: Record<string, string> = {
        verde: 'contenuto e nella norma',
        giallo: 'moderato, merita un minimo di attenzione',
        arancione: 'significativo e da tenere sotto controllo',
        rosso: 'molto forte, potrebbe indicare un\'anomalia di mercato',
      };
      if (d.bev.alert) {
        lines.push(prefix + pick([
          `Lo scostamento tra apertura e chiusura è di ${d.delta.toFixed(1)} punti percentuali — un movimento ${livelloDesc[d.livello]}. Ancora più rilevante: questo scostamento supera l'aggio che il bookmaker applica su questo segno (${d.bev.aggio_specifico.toFixed(1)}%). Quando il book muove la quota oltre il proprio margine, di solito c'è un motivo concreto: un infortunio chiave, una formazione inattesa, o un flusso anomalo di puntate.`,
          `Δpp di ${d.delta.toFixed(1)} — semaforo ${d.livello}: ${livelloDesc[d.livello]}. Il dato più importante è che questo scostamento eccede l'aggio specifico (${d.bev.aggio_specifico.toFixed(1)}%), il che significa che il bookmaker sta accettando di guadagnare meno del previsto su questo esito. Non è un aggiustamento ordinario.`,
          `Il movimento su questo segno è di ${d.delta.toFixed(1)} pp (${d.livello}), e ha superato la soglia di break-even: l'aggio specifico è ${d.bev.aggio_specifico.toFixed(1)}%. In pratica, il bookmaker si espone oltre il proprio margine di sicurezza. Questo tipo di correzione segnala che qualcosa di concreto sta influenzando il mercato.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Lo scostamento è di ${d.delta.toFixed(1)} pp (${d.livello}): un movimento ${livelloDesc[d.livello]}. Rientra nell'aggio specifico del bookmaker (${d.bev.aggio_specifico.toFixed(1)}%), quindi si tratta di un aggiustamento fisiologico, che non segnala situazioni particolari.`,
          `Δpp di ${d.delta.toFixed(1)} — semaforo ${d.livello}. Il movimento è ${livelloDesc[d.livello]} e resta dentro il margine del book (aggio ${d.bev.aggio_specifico.toFixed(1)}%). Nessuna anomalia: il bookmaker ha ritoccato senza uscire dalla propria zona di comfort.`,
          `Scostamento di ${d.delta.toFixed(1)} pp, classificato ${d.livello}: ${livelloDesc[d.livello]}. Con un aggio di ${d.bev.aggio_specifico.toFixed(1)}%, il bookmaker si è mosso restando dentro il proprio margine operativo. Un aggiustamento nella norma.`,
          `Il Δpp registrato è ${d.delta.toFixed(1)} (${d.livello}), entro l'aggio del book (${d.bev.aggio_specifico.toFixed(1)}%). Niente di anomalo — il bookmaker ha calibrato la quota senza esporsi oltre il proprio margine. Movimento ordinario.`,
        ]));
      }
    }

    // V-Abs (la parte più importante — spiega il valore)
    if (d.vAbs !== undefined) {
      if (d.vAbs >= 105) {
        lines.push(prefix + pick([
          `Il V-Abs è ${d.vAbs.toFixed(1)} — nettamente sopra 100. Questo significa che il bookmaker sta offrendo un prezzo superiore a quello che il modello ritiene corretto per la ${sName}. In altre parole, questa quota ha valore: chi scommette su questo esito paga meno di quanto dovrebbe rispetto alla probabilità reale.${isFav ? '' : ' È interessante notare che il valore è proprio sul segno meno atteso dal mercato.'}`,
          `V-Abs a ${d.vAbs.toFixed(1)}: la quota per la ${sName} è decisamente più alta di quanto il modello stimi equo. Il bookmaker paga più del dovuto su questo esito — un segnale chiaro di valore.${isFav ? ' Caso raro: il favorito che offre anche valore.' : ' Il valore, come spesso accade, si trova lontano dal favorito.'}`,
          `Con un V-Abs di ${d.vAbs.toFixed(1)}, la ${sName} offre molto valore. Il prezzo è significativamente sopra il fair value: il bookmaker, per qualche ragione, sta pagando più di quanto il modello ritenga giusto per questo esito.${isFav ? '' : ' Chi cerca valore, lo trova qui — non sul favorito.'}`,
          `${d.vAbs.toFixed(1)} di V-Abs sulla ${sName}: il bookmaker offre un prezzo che eccede notevolmente la probabilità stimata dal modello. Questo è il tipo di situazione in cui il mercato nasconde un'opportunità — la quota ha valore concreto.${isFav ? '' : ' Ed è significativo che il valore sia proprio sull\'esito meno scontato.'}`,
        ]));
      } else if (d.vAbs >= 100) {
        lines.push(prefix + pick([
          `V-Abs a ${d.vAbs.toFixed(1)} per la ${sName}: la quota è sostanzialmente allineata al fair value. Il bookmaker paga il prezzo giusto — né troppo, né troppo poco. Non c'è un vantaggio evidente nello scommettere su questo esito dal punto di vista del valore puro.`,
          `Il V-Abs della ${sName} è ${d.vAbs.toFixed(1)} — in linea con il riferimento. La quota riflette in modo corretto la probabilità stimata: il bookmaker non regala nulla, ma non penalizza nemmeno. Situazione neutra.`,
          `Con un V-Abs di ${d.vAbs.toFixed(1)}, la quota per la ${sName} è coerente con il modello. Non c'è valore aggiunto, ma nemmeno una penalizzazione. Il bookmaker ha prezzato correttamente questo esito.`,
        ]));
      } else if (d.vAbs >= 95) {
        lines.push(prefix + pick([
          `Il V-Abs è ${d.vAbs.toFixed(1)} — leggermente sotto 100. La quota per la ${sName} è lievemente compressa: il bookmaker paga un po' meno di quanto il modello ritenga equo. Non c'è valore su questo esito.${isFav ? ' Il favorito, come spesso accade, viene prezzato in modo conservativo dal book.' : ''}`,
          `V-Abs a ${d.vAbs.toFixed(1)} per la ${sName}: poco valore. Il bookmaker trattiene un margine leggermente superiore alla media su questo segno, offrendo una quota inferiore al fair value.${isFav ? ' È tipico dei favoriti: il book sa che molti scommetteranno su questo esito e si regola di conseguenza.' : ''}`,
          `Con un V-Abs di ${d.vAbs.toFixed(1)}, la ${sName} non offre valore. La quota è sotto il riferimento del modello — il bookmaker è leggermente conservativo su questo esito.${isFav ? ' Essendo il favorito, il book si protegge offrendo un prezzo più basso.' : ''}`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Il V-Abs della ${sName} è ${d.vAbs.toFixed(1)} — significativamente sotto 100. Il bookmaker paga decisamente meno del dovuto su questo esito. La quota è compressa: chi scommette qui lo fa a un prezzo svantaggioso rispetto alla probabilità reale dell'evento.${isFav ? ' Nonostante sia il favorito, il prezzo offerto non riflette il valore reale.' : ''}`,
          `V-Abs a ${d.vAbs.toFixed(1)}: la ${sName} non ha valore. Il bookmaker trattiene un margine elevato su questo segno, offrendo una quota nettamente inferiore a quanto il modello stima corretto. Scommettere qui significa pagare un prezzo penalizzante.${isFav ? ' Il favorito è spesso il segno dove il book guadagna di più — e questo caso non fa eccezione.' : ''}`,
          `Con un V-Abs di ${d.vAbs.toFixed(1)}, la quota per la ${sName} è fortemente compressa. Il bookmaker sa che questo esito attira scommesse e lo prezza di conseguenza: il ritorno per lo scommettitore è sfavorevole rispetto alla probabilità reale.${isFav ? ' Il favorito paga poco — e in questo caso, paga ancora meno di quanto dovrebbe.' : ''}`,
          `${d.vAbs.toFixed(1)} di V-Abs sulla ${sName}: quota molto penalizzata. Il bookmaker offre meno del dovuto, trattenendo un margine superiore alla norma. Dal punto di vista del valore, questo è il segno da evitare.${isFav ? ' Essere favoriti non significa avere valore — anzi, è spesso il contrario.' : ''}`,
        ]));
      }
    }

    // HWR/DR/AWR
    const hwrVal = hwrMap[d.s];
    if (hwrVal !== undefined && rend) {
      const allVals = [rend.hwr, rend.dr, rend.awr];
      const max = Math.max(...allVals);
      const min = Math.min(...allVals);
      const label = hwrLabels[d.s];
      if (hwrVal === max) {
        lines.push(prefix + pick([
          `Sul fronte del ritorno, il bookmaker è più generoso sulla ${sName} (${label} ${hwrVal.toFixed(1)}%): rispetto agli altri due segni, è quello su cui trattiene meno margine. Questo è coerente con un esito su cui il book vuole attirare equilibrio nelle scommesse.`,
          `Il ritorno del book è al massimo proprio sulla ${sName} (${label} ${hwrVal.toFixed(1)}%). Tra i tre esiti, è quello che restituisce di più allo scommettitore — il bookmaker applica qui il margine più sottile.`,
          `Con un ${label} di ${hwrVal.toFixed(1)}%, la ${sName} ha il ritorno più generoso. Il bookmaker distribuisce una fetta maggiore del payout su questo segno, trattenendo meno margine rispetto agli altri.`,
        ]));
      } else if (hwrVal === min) {
        lines.push(prefix + pick([
          `Il ritorno del book sulla ${sName} è il più basso dei tre (${label} ${hwrVal.toFixed(1)}%). Il bookmaker trattiene più margine qui — è il segno su cui guadagna di più. Questo può indicare che il book si aspetta molte puntate su questo esito e si protegge di conseguenza.`,
          `Con un ${label} di ${hwrVal.toFixed(1)}%, la ${sName} è il segno meno remunerato per lo scommettitore. Il bookmaker concentra il proprio guadagno su questo esito, offrendo il ritorno peggiore tra i tre.`,
          `${label} ${hwrVal.toFixed(1)}%: il ritorno più contenuto. Il bookmaker penalizza di più la ${sName} in termini di payout — è il segno dove trattiene il margine maggiore.`,
        ]));
      } else {
        lines.push(prefix + pick([
          `Il ritorno sulla ${sName} (${label} ${hwrVal.toFixed(1)}%) è nella fascia intermedia: il bookmaker non favorisce né sfavorisce particolarmente questo segno rispetto agli altri.`,
          `${label} ${hwrVal.toFixed(1)}%: ritorno nella media dei tre esiti. Nessuna particolarità dal punto di vista del margine applicato dal book su questo segno.`,
        ]));
      }
    }
  }

  // 3. CONCLUSIONE: ritorno complessivo
  if (rend) {
    lines.push(pick([
      `Nel complesso, il ritorno totale di questa partita è del ${rend.ritorno_pct}%: significa che per ogni 100€ scommessi, il bookmaker ne restituisce mediamente ${rend.ritorno_pct.toFixed(0)}€ e ne trattiene ${(100 - rend.ritorno_pct).toFixed(1)}€ come margine.`,
      `Ritorno complessivo: ${rend.ritorno_pct}%. Il bookmaker trattiene ${(100 - rend.ritorno_pct).toFixed(1)}% come margine su questa partita — ${rend.ritorno_pct >= 94 ? 'un margine relativamente contenuto' : rend.ritorno_pct >= 90 ? 'un margine nella norma' : 'un margine elevato, il book è conservativo su questa partita'}.`,
      `La resa complessiva è del ${rend.ritorno_pct}%: il bookmaker trattiene il ${(100 - rend.ritorno_pct).toFixed(1)}% come proprio margine. ${rend.ritorno_pct >= 94 ? 'Un margine basso, che indica quote relativamente generose nel complesso.' : rend.ritorno_pct >= 90 ? 'Un margine standard per il mercato.' : 'Un margine alto — il book tiene le quote strette su questa partita.'}`,
    ]));
  }

  return lines.join(' ');
}

function PredictionRow({ preds, m, compact }: { preds?: PredEntry[]; m: MatchDoc; compact?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const hasPreds = preds && preds.length > 0;
  const accent = theme.cyan;

  return (
    <div style={{
      padding: compact ? '6px 8px' : '8px 12px',
      margin: compact ? '4px 0' : '6px 0',
      background: isLight ? 'linear-gradient(135deg, #eef6ff 0%, #f0f4ff 100%)' : 'linear-gradient(135deg, #0a1628 0%, #0d1b2a 100%)',
      border: `1px solid ${isLight ? '#d0e0f0' : '#1a2a40'}`,
      borderRadius: 6,
      borderLeft: `3px solid ${hasPreds ? accent : (isLight ? '#cbd5e1' : '#334155')}`,
    }}>
      <div style={{ fontSize: compact ? 8 : 9, color: theme.textDim, marginBottom: hasPreds ? 5 : 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Pronostici Segno
      </div>
      {!hasPreds ? (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: compact ? 9 : 10, color: theme.textDim, fontStyle: 'italic',
            padding: '2px 0',
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: isLight ? '#cbd5e1' : '#475569' }} />
            Nessun pronostico SEGNO emesso dai nostri sistemi per questa partita
          </div>
          {/* Analisi di mercato standalone */}
          <div style={{ marginTop: 4 }}>
            <div onClick={() => setExpanded(expanded === '_market' ? null : '_market')} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: isLight ? '#fff' : '#111827',
              border: `1.5px solid ${expanded === '_market' ? theme.cyan : theme.cyan + '44'}`,
              borderRadius: 6, padding: compact ? '1px 6px' : '2px 8px',
              cursor: 'pointer', userSelect: 'none' as const,
              fontSize: compact ? 9 : 10, whiteSpace: 'nowrap' as const,
            }}>
              <span style={{ fontWeight: 600, color: theme.text }}>Analisi mercato</span>
              <span style={{ fontSize: 7, color: theme.textDim, transform: expanded === '_market' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
            </div>
            {expanded === '_market' && (
              <div style={{
                marginTop: 6, padding: '8px 10px',
                background: isLight ? '#f8fafc' : '#0f172a',
                border: `1px solid ${theme.cyan}33`,
                borderRadius: 4, fontSize: compact ? 10 : 11,
                lineHeight: 1.7, color: theme.text,
              }}>
                {buildMarketOverview(m)}
              </div>
            )}
          </div>
        </div>
      ) : [...new Map<string, PredEntry>(preds!.map(p => [p.pronostico, p] as [string, PredEntry])).entries()].map(([sign, entry]) => {
        const isDC = entry.tipo === 'DOPPIA_CHANCE';
        const isBP = preds.some(p => p.pronostico === sign && p.bestPick);
        const isOpen = expanded === sign;
        const tipoLabel = isDC ? 'DC' : 'Segno';
        const bpColor = isBP ? '#10b981' : '#f59e0b';

        return (
          <div key={sign} style={{ marginBottom: compact ? 4 : 6 }}>
            {/* Riga badge + link Best Picks */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: compact ? 6 : 8, flexWrap: 'nowrap' }}>
              {/* Badge pronostico cliccabile */}
              <div onClick={() => setExpanded(isOpen ? null : sign)} style={{
                display: 'inline-flex', alignItems: 'center', gap: compact ? 5 : 7,
                background: isLight ? '#fff' : '#111827',
                border: `1.5px solid ${isOpen ? accent : accent + '44'}`,
                borderRadius: 6, padding: compact ? '1px 6px' : '2px 8px',
                cursor: 'pointer', userSelect: 'none' as const,
                fontSize: compact ? 9 : 10, whiteSpace: 'nowrap' as const,
              }}>
                <span style={{ fontWeight: 600, color: theme.text }}>Pronostico {tipoLabel}:</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: compact ? 16 : 18, height: compact ? 16 : 18,
                  borderRadius: isDC ? 3 : '50%',
                  padding: isDC ? '0 3px' : 0,
                  background: accent, color: '#fff',
                  fontWeight: 800, fontSize: compact ? 9 : 10, fontFamily: 'monospace',
                }}>{sign}</span>
                <span style={{ color: theme.textDim }}>—</span>
                <span style={{
                  fontSize: compact ? 8 : 9, fontWeight: 600,
                  padding: '1px 5px', borderRadius: 3,
                  background: isBP ? (isLight ? '#dcfce7' : '#052e16') : (isLight ? '#fef3c7' : '#1c1504'),
                  color: bpColor, border: `1px solid ${bpColor}33`,
                }}>
                  {isBP ? '★ Presente nelle Best Picks' : 'Assente dalle Best Picks'}
                </span>
                <span style={{
                  fontSize: 7, color: theme.textDim,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s',
                }}>▼</span>
              </div>

              {/* Link Best Picks — solo se è Best Pick */}
              {isBP && (
                <a
                  href={`/best-picks?focus=${encodeURIComponent((entry.home || m.home_raw) + ' vs ' + (entry.away || m.away_raw))}`}
                  onClick={e => { e.stopPropagation(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: compact ? '0 8px' : '0 10px',
                    background: isLight ? '#dcfce7' : '#052e16',
                    border: `1.5px solid #10b98144`,
                    borderRadius: 6, fontSize: compact ? 9 : 10,
                    fontWeight: 600, color: '#10b981',
                    textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  }}
                >
                  Analizza in B.Picks →
                </a>
              )}
            </div>

            {/* Analisi espansa */}
            {isOpen && (
              <div style={{
                marginTop: 6, padding: '8px 10px',
                background: isLight ? '#f8fafc' : '#0f172a',
                border: `1px solid ${accent}33`,
                borderRadius: 4, fontSize: compact ? 10 : 11,
                lineHeight: 1.7, color: theme.text,
              }}>
                {buildPredAnalysis(sign, isDC, m, isBP)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoBubble({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const text = INFO_TEXTS[id];
  if (!text) return null;
  return (
    <>
      <span onClick={e => { e.stopPropagation(); setOpen(true); }} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 13, height: 13, borderRadius: '50%', fontSize: 9, fontWeight: 700,
        fontStyle: 'italic', fontFamily: 'Georgia, serif', textTransform: 'none' as const,
        background: isLight ? 'rgba(0, 100, 200, 0.15)' : 'rgba(0, 150, 255, 0.20)',
        color: isLight ? '#2563eb' : '#60a5fa',
        cursor: 'pointer', marginLeft: 3, verticalAlign: 'middle',
        lineHeight: 1, flexShrink: 0,
      }}>i</span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: isLight ? '#fff' : '#1c2128', border: isLight ? '1px solid #d0d7de' : `1px solid ${theme.cyan}44`,
            borderRadius: 8, padding: '14px 16px', maxWidth: 360, width: '100%',
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: theme.cyan, textTransform: 'none', whiteSpace: 'normal', fontFamily: 'sans-serif' }}>{id}</span>
              <span onClick={() => setOpen(false)} style={{ cursor: 'pointer', color: theme.textDim, fontSize: 18, padding: '0 4px' }}>✕</span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: theme.text, margin: 0, wordBreak: 'break-word', textTransform: 'none', whiteSpace: 'normal', fontFamily: 'sans-serif', fontWeight: 400, letterSpacing: 'normal' }}>{text}</p>
          </div>
        </div>
      )}
    </>
  );
}

const CHART_TABS = [
  { key: 'quote', label: 'Quote', tip: 'Evoluzione quote 1/X/2 nel tempo' },
  { key: 'delta', label: 'Δ pp', tip: 'Delta punti percentuali (prob. implicita apertura vs live)' },
  { key: 'aggio', label: 'Aggio', tip: 'Margine del bookmaker per quota (BEv + Agg%)' },
  { key: 'rend', label: 'Rendim.', tip: 'Home Win / Draw / Away Win Return %' },
  { key: 'vAbs', label: 'V-Abs', tip: 'V-Index Assoluto: live vs fair odds (>100 = possibile valore)' },
];

function formatDate(d: Date): string { return d.toISOString().slice(0, 10); }

// --- CARD MOBILE ---
function MobileCard({ m, date, preds }: {
  m: MatchDoc; date: string; preds?: PredEntry[];
}) {
  const rend = m.rendimento_chiusura || m.rendimento_apertura;
  const [showIndicators, setShowIndicators] = useState(false);
  const [showChart, setShowChart] = useState(false);

  return (
    <div style={{
      background: theme.panel,
      border: showChart ? `1px solid ${theme.cyan}66` : theme.panelBorder,
      borderRadius: 6, marginBottom: 6, overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setShowIndicators(!showIndicators)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px', gap: 6,
        background: isLight ? 'rgba(0,119,204,0.04)' : 'rgba(0,240,255,0.04)',
        borderBottom: theme.cellBorder, cursor: 'pointer', userSelect: 'none',
      }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: predDotColor(preds), flexShrink: 0 }} />
        {m.live_status && m.live_status !== 'Finished' && m.live_score ? (
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, color: m.live_status === 'HT' ? '#f59e0b' : '#ef4444', animation: m.live_status !== 'HT' ? 'qaPulseLive 1.5s ease-in-out infinite' : undefined }}>
            {m.live_status === 'HT' ? 'HT' : `${m.live_minute || ''}'`}
          </span>
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: theme.textDim }}>{m.match_time}</span>
        )}
        <span style={{ fontWeight: 600, fontSize: 11, color: theme.text, flex: 1 }}>
          {m.home_raw} vs {m.away_raw}
        </span>
        {m.live_score && !m.real_score && m.live_status !== 'Finished' ? (
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 900, color: m.live_status === 'HT' ? '#f59e0b' : '#ef4444', letterSpacing: 1, animation: m.live_status !== 'HT' ? 'qaPulseLive 1.5s ease-in-out infinite' : undefined, background: isLight ? '#fef3c7' : 'rgba(255,50,50,0.1)', borderRadius: 3, padding: '1px 5px', minWidth: 38, textAlign: 'center', display: 'inline-block' }}>
            {m.live_score.replace(':', ' - ')}
          </span>
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: m.real_score ? theme.text : theme.textDim, letterSpacing: 1, background: isLight ? '#f0f0f0' : 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 5px', minWidth: 38, textAlign: 'center', display: 'inline-block' }}>
            {m.real_score ? m.real_score.replace(':', ' - ') : '-'}
          </span>
        )}
        {rend && (
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: isLight ? '#fff' : rend.ritorno_pct >= 95 ? theme.success : rend.ritorno_pct >= 90 ? theme.warning : theme.danger, background: isLight ? (rend.ritorno_pct >= 95 ? '#22c55e' : rend.ritorno_pct >= 90 ? '#e0a030' : '#ef4444') : 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 5px', minWidth: 38, textAlign: 'center', display: 'inline-block' }}>
            {rend.ritorno_pct}%
          </span>
        )}
        <span style={{ fontSize: 8, color: theme.cyan, transform: showIndicators ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {/* Tabella indicatori — collassabile */}
      {showIndicators && (
        <>
          {/* Pronostici SEGNO */}
          {<PredictionRow preds={preds} m={m} compact />}
          {/* Tabella unica: quote + indicatori */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ background: theme.headerBg }}>
                <th style={mThStyle}></th>
                {SIGNS.map(s => <th key={s} style={mThStyle}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* Blocco quote — sfondo trading */}
              <tr style={{ background: isLight ? '#f5f7fa' : '#0d1117' }}>
                <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.cyan}` }}>Aper.<InfoBubble id="Aper." /></td>
                {SIGNS.map(s => <td key={s} style={{ ...mCellStyle, color: isLight ? '#57606a' : '#8b949e' }}>{m.quote_apertura[s]?.toFixed(2) ?? '—'}<span style={{ fontSize: 8, marginLeft: 4, width: 0, display: 'inline-block', overflow: 'visible', visibility: 'hidden' }}>▼</span></td>)}
              </tr>
              {m.quote_chiusura && (
                <tr style={{ background: isLight ? '#eaecf0' : '#161b22', borderBottom: `2px solid ${theme.cyan}33` }}>
                  <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.cyan}` }}>Live<InfoBubble id="Live" /></td>
                  {SIGNS.map(s => {
                    const qLive = m.quote_chiusura![s];
                    const qAp = m.quote_apertura[s];
                    const diff = qLive && qAp ? qLive - qAp : 0;
                    const arrow = diff < -0.02 ? '▼' : diff > 0.02 ? '▲' : '=';
                    const color = diff < -0.02 ? '#10b981' : diff > 0.02 ? '#ef4444' : isLight ? '#24292f' : '#c9d1d9';
                    return (
                      <td key={s} style={{ ...mCellStyle, color, fontWeight: 700 }}>
                        {qLive?.toFixed(2) ?? '—'}<span style={{ fontSize: 8, marginLeft: 4, verticalAlign: 'middle', width: 0, display: 'inline-block', overflow: 'visible' }}>{arrow}</span>
                      </td>
                    );
                  })}
                </tr>
              )}
              {/* Blocco scostamento: Δ pp / BEv / Agg% */}
              {m.semaforo && (
                <tr style={{ background: isLight ? '#faf5f0' : '#1a1510' }}>
                  <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.warning}` }}>Δ pp<InfoBubble id="Δ pp" /></td>
                  {SIGNS.map(s => (
                    <td key={s} style={mCellStyle}>
                      <span style={{ marginRight: 2 }}>{m.semaforo![s].delta_pp.toFixed(1)}</span>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: SEMAFORO_COLORS[m.semaforo![s].livello] || '#666', verticalAlign: 'middle' }} />
                    </td>
                  ))}
                </tr>
              )}
              {m.alert_breakeven && (
                <tr style={{ background: isLight ? '#f7f2ec' : '#181310' }}>
                  <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.warning}` }}>BEv<InfoBubble id="BEv" /></td>
                  {SIGNS.map(s => {
                    const bev = m.semaforo ? bevLevel(m.semaforo![s].delta_pp, m.alert_breakeven![s].aggio_specifico) : { color: '#10b981', label: 'ok' };
                    return (
                      <td key={s} style={mCellStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 13, borderRadius: 6, background: bev.color, color: '#fff', fontSize: 8, fontWeight: 700 }}>{bev.label}</span>
                      </td>
                    );
                  })}
                </tr>
              )}
              {m.alert_breakeven && (
                <tr style={{ background: isLight ? '#f5f0ea' : '#161110', borderBottom: `2px solid ${theme.warning}33` }}>
                  <td style={{ ...mLabelStyle, borderLeft: `1px solid ${theme.warning}` }}>Agg%<InfoBubble id="Agg%" /></td>
                  {SIGNS.map(s => <td key={s} style={mCellStyle}>{m.alert_breakeven![s].aggio_specifico.toFixed(2)}</td>)}
                </tr>
              )}
              {rend && (
                <tr style={{ background: theme.rowOdd }}>
                  <td style={mLabelStyle}>HWR/D/A<InfoBubble id="HWR/D/A" /></td>
                  {(() => { const c = hwrColors(rend.hwr, rend.dr, rend.awr); return [
                    <td key="h" style={{ ...mCellStyle, color: c[0], fontWeight: c[0] !== theme.textDim ? 600 : 400 }}>{rend.hwr.toFixed(1)}%</td>,
                    <td key="d" style={{ ...mCellStyle, color: c[1], fontWeight: c[1] !== theme.textDim ? 600 : 400 }}>{rend.dr.toFixed(1)}%</td>,
                    <td key="a" style={{ ...mCellStyle, color: c[2], fontWeight: c[2] !== theme.textDim ? 600 : 400 }}>{rend.awr.toFixed(1)}%</td>,
                  ]; })()}
                </tr>
              )}
              {m.v_index_abs && (
                <tr style={{ background: theme.rowEven }}>
                  <td style={mLabelStyle}>V-Abs<InfoBubble id="V-Abs" /></td>
                  {SIGNS.map(s => { const v = m.v_index_abs![s].valore; return <td key={s} style={{ ...mCellStyle, color: vAbsColor(v), fontWeight: v >= 102 ? 600 : 400 }}>{v.toFixed(1)}</td>; })}
                </tr>
              )}
            </tbody>
          </table>

          {/* Bottone grafici */}
          <div onClick={() => setShowChart(!showChart)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '6px 0', cursor: 'pointer', userSelect: 'none',
            background: theme.headerBg,
            color: showChart ? theme.cyan : theme.textDim, fontSize: 10,
          }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span>{showChart ? 'Chiudi grafici' : 'Apri grafici'}</span>
          </div>
        </>
      )}

      {/* Grafici — collassabili separatamente */}
      {showChart && (
        <div style={{ borderTop: `1px solid ${theme.cyan}33`, background: isLight ? 'rgba(0,119,204,0.02)' : 'rgba(0,240,255,0.02)' }}>
          <QuoteAnomaleDetail date={date} matchKey={m.match_key} />
        </div>
      )}
    </div>
  );
}

// --- PAGINA PRINCIPALE ---
export default function QuoteAnomale({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState(formatDate(new Date()));
  const [matches, setMatches] = useState<MatchDoc[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Desktop: tabellone + detail
  const [selectedMatchKey, setSelectedMatchKey] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState('quote');
  const [predictions, setPredictions] = useState<Record<string, PredEntry[]>>({});
  const [predDebug, setPredDebug] = useState<{
    matched_count: number; qa_partite: number;
    per_source: Record<string, { total_segno: number; matched: number; unmatched: number }>;
    unmatched: { source: string; home: string; away: string; league?: string }[];
  } | null>(null);
  const isAdmin = checkAdmin();
  // Mobile
  // Responsive
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/quote-anomale/leagues?date=${date}`)
      .then(r => r.json())
      .then(d => { if (d.success) setLeagues(d.data); })
      .catch(() => {});
    fetch(`${API_BASE}/quote-anomale/predictions?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPredictions(d.data);
          const matchedKeys = Object.keys(d.data).length;
          // Se il backend ritorna debug, usalo; altrimenti calcola dal data
          if (d.debug) {
            setPredDebug({ matched_count: d.matched_count ?? matchedKeys, qa_partite: d.debug.qa_partite ?? 0, per_source: d.debug.per_source ?? {}, unmatched: d.debug.unmatched ?? [] });
          } else {
            // Calcola dai dati: conta partite per source (non singoli pronostici)
            const sources: Record<string, { total_segno: number; matched: number; unmatched: number }> = {};
            for (const preds of Object.values(d.data) as PredEntry[][]) {
              const seenSources = new Set<string>();
              for (const p of preds) {
                if (seenSources.has(p.source)) continue;
                seenSources.add(p.source);
                if (!sources[p.source]) sources[p.source] = { total_segno: 0, matched: 0, unmatched: 0 };
                sources[p.source].total_segno++;
                sources[p.source].matched++;
              }
            }
            setPredDebug({ matched_count: matchedKeys, qa_partite: 0, per_source: sources, unmatched: [] });
          }
        }
      })
      .catch(() => {});
  }, [date]);

  useEffect(() => {
    setLoading(true); setError(''); setSelectedMatchKey(null);
    const url = `${API_BASE}/quote-anomale/matches?date=${date}${selectedLeague ? `&league=${encodeURIComponent(selectedLeague)}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.success) setMatches(d.data); else setError(d.message || 'Errore'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [date, selectedLeague]);

  const kpi = useMemo(() => {
    let alertRossi = 0, beAlert = 0, aggioSum = 0, aggioCount = 0;
    for (const m of matches) {
      if (m.semaforo) for (const s of SIGNS) { if (m.semaforo[s]?.livello === 'rosso') alertRossi++; }
      if (m.alert_breakeven) {
        for (const s of SIGNS) { if (m.alert_breakeven[s]?.alert) beAlert++; }
        if (m.alert_breakeven.aggio_tot > 0) { aggioSum += m.alert_breakeven.aggio_tot; aggioCount++; }
      }
    }
    return { total: matches.length, alertRossi, beAlert, aggioMedio: aggioCount > 0 ? (aggioSum / aggioCount).toFixed(1) : '—' };
  }, [matches]);

  const grouped = useMemo(() => {
    const map = new Map<string, MatchDoc[]>();
    for (const m of matches) {
      const key = m.league || m.league_raw || 'Altro';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());

  const toggleLeague = (league: string) => {
    setCollapsedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(league)) next.delete(league); else next.add(league);
      return next;
    });
  };

  const handleRowClick = (matchKey: string) => {
    if (selectedMatchKey === matchKey) { setSelectedMatchKey(null); return; }
    setSelectedMatchKey(matchKey);
    setChartTab('');
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font }}>
      <style>{`
        @keyframes qaPulseLive { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: theme.panelSolid, borderBottom: theme.panelBorder, padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', outline: 'none', color: theme.cyan, cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4, lineHeight: 1 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Odds Monitor</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: isLight ? '#f5f5f5' : 'rgba(255,255,255,0.08)', border: theme.cellBorder, borderRadius: 4, padding: '3px 6px', color: theme.text, fontSize: 11, marginLeft: 'auto' }} />
          <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}
            style={{ background: isLight ? '#f5f5f5' : '#1e293b', border: theme.cellBorder, borderRadius: 4, padding: '3px 6px', color: isLight ? '#1e293b' : '#e2e8f0', fontSize: 11 }}>
            <option value="" style={{ background: isLight ? '#f5f5f5' : '#1e293b', color: isLight ? '#1e293b' : '#e2e8f0' }}>Tutti</option>
            {leagues.map(l => <option key={l} value={l} style={{ background: isLight ? '#f5f5f5' : '#1e293b', color: isLight ? '#1e293b' : '#e2e8f0' }}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* KPI BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 6, padding: '8px 12px' }}>
        {[
          { label: 'Partite', value: kpi.total, color: theme.cyan },
          { label: 'Alert rossi', value: kpi.alertRossi, color: '#ef4444' },
          { label: 'B-Even alert', value: kpi.beAlert, color: '#f97316' },
          { label: 'Aggio medio', value: `${kpi.aggioMedio}%`, color: theme.textDim },
        ].map((k, i) => (
          <div key={i} style={{ background: theme.cardBg, border: theme.cellBorder, borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
            <div style={{ fontSize: 9, color: theme.textDim }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ADMIN: Debug pronostici */}
      {isAdmin && predDebug && (() => {
        // Conta partite uniche (match_key) — non per source
        const totalPartite = predDebug.matched_count;  // match_keys con almeno 1 pronostico
        let conBestPick = 0, soloAltri = 0;
        for (const preds of Object.values(predictions)) {
          const hasBP = preds.some(p => p.bestPick);
          if (hasBP) conBestPick++;
          else soloAltri++;
        }
        const miss = predDebug.unmatched.length;
        const missColor = miss === 0 ? '#10b981' : miss <= 5 ? '#f59e0b' : '#ef4444';

        return (
          <div style={{
            margin: '0 12px 6px', padding: '6px 10px', borderRadius: 4,
            background: isLight ? '#fffbeb' : '#1a1500',
            border: `1px solid ${isLight ? '#fde68a' : '#78350f'}`,
            fontSize: 10, fontFamily: 'monospace', color: theme.text,
            display: 'flex', flexWrap: 'wrap', gap: isDesktop ? 16 : 8, alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, color: theme.textDim, fontSize: 9 }}>🔧 ADMIN</span>
            <span>Partite con pronostico: <b style={{ color: theme.cyan }}>{totalPartite}</b></span>
            <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginRight: 3, verticalAlign: 'middle' }}/>Best Picks: <b>{conBestPick}</b></span>
            <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginRight: 3, verticalAlign: 'middle' }}/>Solo A/S/C: <b>{soloAltri}</b></span>
            {miss > 0 && <span style={{ color: missColor }}>⚠ {miss} non matchati</span>}
            {predDebug.unmatched.length > 0 && (
              <details style={{ width: '100%', marginTop: 2 }}>
                <summary style={{ cursor: 'pointer', color: '#ef4444', fontSize: 9 }}>
                  Mostra {predDebug.unmatched.length} partite non trovate
                </summary>
                <div style={{ marginTop: 4, fontSize: 9, color: theme.textDim, lineHeight: 1.6 }}>
                  {predDebug.unmatched.map((u, i) => (
                    <div key={i}><span style={{ color: SOURCE_COLORS[u.source] || theme.textDim, fontWeight: 700 }}>{u.source}</span> {u.home} vs {u.away} <span style={{ color: theme.textDim, fontSize: 8 }}>({u.league || '?'})</span></div>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })()}

      {/* CONTENUTO */}
      <div style={{ padding: '0 12px 40px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 30, color: theme.textDim, fontSize: 11 }}>Caricamento...</div>}
        {error && <div style={{ textAlign: 'center', padding: 16, color: theme.danger, fontSize: 11 }}>{error}</div>}
        {!loading && !error && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: theme.textDim, fontSize: 11 }}>Nessuna partita per questa data</div>
        )}

        {/* ===== DESKTOP: TABELLONE ===== */}
        {isDesktop && !loading && matches.length > 0 && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 45 }} />   {/* Ora */}
                  <col style={{ width: 220 }} />  {/* Partita */}
                  <col style={{ width: 50 }} />   {/* 1 */}
                  <col style={{ width: 50 }} />   {/* X */}
                  <col style={{ width: 50 }} />   {/* 2 */}
                  <col style={{ width: 55 }} />   {/* Δ1 */}
                  <col style={{ width: 55 }} />   {/* ΔX */}
                  <col style={{ width: 55 }} />   {/* Δ2 */}
                  <col style={{ width: 60 }} />   {/* BEv */}
                  <col style={{ width: 70 }} />   {/* Agg% */}
                  <col style={{ width: 70 }} />   {/* V-Abs */}
                  <col style={{ width: 80 }} />   {/* HWR/D/A */}
                  <col style={{ width: 45 }} />   {/* Rit% */}
                  <col style={{ width: 45 }} />   {/* Ris. */}
                </colgroup>
                <thead>
                  <tr style={{ background: theme.headerBg }}>
                    <th style={hStyle}>Ora</th>
                    <th style={hStyle}>Partita</th>
                    <th style={hStyle}>1</th>
                    <th style={hStyle}>X</th>
                    <th style={hStyle}>2</th>
                    <th style={hStyle}>Δ1<InfoBubble id="Δ pp" /></th>
                    <th style={hStyle}>ΔX</th>
                    <th style={hStyle}>Δ2</th>
                    <th style={hStyle}>BEv<InfoBubble id="BEv" /></th>
                    <th style={hStyle}>Agg%<InfoBubble id="Agg%" /></th>
                    <th style={hStyle}>V-Abs<InfoBubble id="V-Abs" /></th>
                    <th style={hStyle}>HWR/D/A<InfoBubble id="HWR/D/A" /></th>
                    <th style={hStyle}>Rit%<InfoBubble id="Rit%" /></th>
                    <th style={hStyle}>Ris.</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([league, leagueMatches]) => {
                    const collapsed = collapsedLeagues.has(league);
                    return (
                    <React.Fragment key={`lg-${league}`}>
                      <tr onClick={() => toggleLeague(league)} style={{ cursor: 'pointer' }}>
                        <td colSpan={14} style={{
                          padding: '6px 8px', fontSize: 11, fontWeight: 600,
                          color: theme.cyan, fontFamily: theme.font,
                          background: isLight ? '#f0f4f8' : 'rgba(0,150,255,0.10)',
                          border: isLight ? '1px solid #d0d7de' : `1px solid ${theme.cyan}33`,
                          borderRadius: 4,
                          userSelect: 'none',
                        }}>
                          <span style={{ display: 'inline-block', width: 10, fontSize: 8, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', verticalAlign: 'middle', marginRight: 5 }}>▼</span>
                          {league} ({leagueMatches.length})
                        </td>
                      </tr>
                      {!collapsed && leagueMatches.map((m, idx) => {
                        const sel = selectedMatchKey === m.match_key;
                        const hov = hoveredKey === m.match_key;
                        const hasLive = !!m.quote_chiusura;
                        const rend = m.rendimento_chiusura || m.rendimento_apertura;
                        const hoverBg = isLight ? 'rgba(0,119,204,0.07)' : 'rgba(0,240,255,0.07)';
                        const bg = sel
                          ? (isLight ? 'rgba(0,119,204,0.12)' : 'rgba(0,240,255,0.12)')
                          : hov ? hoverBg
                          : idx % 2 === 0 ? theme.rowOdd : theme.rowEven;
                        const bgAlt = sel
                          ? (isLight ? 'rgba(0,119,204,0.08)' : 'rgba(0,240,255,0.08)')
                          : hov ? hoverBg
                          : idx % 2 === 0 ? theme.rowEven : theme.rowOdd;

                        return (
                          <React.Fragment key={m.match_key}>
                            {/* RIGA 1: Apertura */}
                            <tr onClick={() => handleRowClick(m.match_key)}
                              onMouseEnter={() => setHoveredKey(m.match_key)} onMouseLeave={() => setHoveredKey(null)}
                              style={{ background: bg, cursor: 'pointer', borderLeft: sel ? `3px solid ${theme.cyan}` : '3px solid transparent', transition: 'background 0.15s' }}>
                              <td rowSpan={2} style={{ ...cStyle, color: m.live_status && m.live_status !== 'Finished' && m.live_score ? (m.live_status === 'HT' ? '#f59e0b' : '#ef4444') : theme.textDim, fontWeight: m.live_status && m.live_status !== 'Finished' && m.live_score ? 900 : 400, verticalAlign: 'middle', animation: m.live_status && m.live_status !== 'Finished' && m.live_status !== 'HT' && m.live_score ? 'qaPulseLive 1.5s ease-in-out infinite' : undefined }}><span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: predDotColor(predictions[m.match_key]), marginRight: 3, verticalAlign: 'middle' }} />{m.live_status && m.live_status !== 'Finished' && m.live_score ? (m.live_status === 'HT' ? 'HT' : `${m.live_minute || ''}'`) : m.match_time}</td>
                              <td rowSpan={2} style={{ ...cStyle, textAlign: 'left', fontFamily: theme.font, fontWeight: 500, verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.home_raw} vs {m.away_raw}
                              </td>
                              {/* Quote apertura */}
                              {SIGNS.map(s => (
                                <td key={s} style={{ ...cStyle, color: theme.textDim }}>{m.quote_apertura[s]?.toFixed(2) ?? '—'}<span style={{ fontSize: 9, marginLeft: 5, width: 0, display: 'inline-block', overflow: 'visible', visibility: 'hidden' }}>▼</span></td>
                              ))}
                              {/* Δ pp vuoto in riga apertura */}
                              <td colSpan={3} style={{ ...cStyle, fontSize: 9, color: theme.textDim, textAlign: 'center' }}>apertura</td>
                              {/* BEv, Agg%, V-Abs, HWR, Rit% vuoti in riga apertura */}
                              <td colSpan={5} style={{ ...cStyle, fontSize: 9, color: theme.textDim }}></td>
                              {/* Risultato — ultima colonna */}
                              <td rowSpan={2} style={{ ...cStyle, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1, verticalAlign: 'middle', color: m.live_score && !m.real_score && m.live_status !== 'Finished' ? (m.live_status === 'HT' ? '#f59e0b' : '#ef4444') : m.real_score ? theme.cyan : theme.textDim, animation: m.live_score && !m.real_score && m.live_status !== 'Finished' && m.live_status !== 'HT' ? 'qaPulseLive 1.5s ease-in-out infinite' : undefined }}>
                                {m.live_score && !m.real_score && m.live_status !== 'Finished' ? m.live_score.replace(':', '-') : m.real_score ? m.real_score.replace(':', '-') : '—'}
                              </td>
                            </tr>
                            {/* RIGA 2: Live + tutti gli indicatori */}
                            <tr onClick={() => handleRowClick(m.match_key)}
                              onMouseEnter={() => setHoveredKey(m.match_key)} onMouseLeave={() => setHoveredKey(null)}
                              style={{ background: bgAlt, cursor: 'pointer', borderLeft: sel ? `3px solid ${theme.cyan}` : '3px solid transparent', borderBottom: `1px solid ${theme.textDim}22`, transition: 'background 0.15s' }}>
                              {/* Quote live + freccia colorata */}
                              {SIGNS.map(s => {
                                if (!hasLive) return <td key={s} style={cStyle}>—</td>;
                                const qLive = m.quote_chiusura![s];
                                const qAp = m.quote_apertura[s];
                                const diff = qLive && qAp ? qLive - qAp : 0;
                                const arrow = diff < -0.02 ? '▼' : diff > 0.02 ? '▲' : '=';
                                const color = diff < -0.02 ? '#10b981' : diff > 0.02 ? '#ef4444' : theme.textDim;
                                return (
                                  <td key={s} style={{ ...cStyle, fontWeight: 600, color }}>
                                    {qLive?.toFixed(2) ?? '—'}<span style={{ fontSize: 9, marginLeft: 5, verticalAlign: 'middle', width: 0, display: 'inline-block', overflow: 'visible' }}>{arrow}</span>
                                  </td>
                                );
                              })}
                              {/* Δ pp + semaforo */}
                              {SIGNS.map(s => (
                                <td key={`d${s}`} style={cStyle}>
                                  {m.semaforo ? (
                                    <>
                                      <span style={{ marginRight: 2 }}>{m.semaforo[s].delta_pp.toFixed(1)}</span>
                                      <span style={{
                                        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                                        background: SEMAFORO_COLORS[m.semaforo[s].livello] || '#666', verticalAlign: 'middle',
                                      }} />
                                    </>
                                  ) : '—'}
                                </td>
                              ))}
                              {/* Break-even */}
                              <td style={cStyle}>
                                {m.alert_breakeven && m.semaforo ? SIGNS.map(s => {
                                  const bev = bevLevel(m.semaforo![s].delta_pp, m.alert_breakeven![s].aggio_specifico);
                                  return (
                                    <span key={s} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 12, borderRadius: 6, marginRight: 2, background: bev.color, color: '#fff', fontSize: 7, fontWeight: 700, verticalAlign: 'middle' }}>{bev.label}</span>
                                  );
                                }) : '—'}
                              </td>
                              {/* Aggio % */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {m.alert_breakeven ? SIGNS.map(s => (
                                  <span key={s} style={{ marginRight: 3 }}>{m.alert_breakeven![s].aggio_specifico.toFixed(1)}</span>
                                )) : '—'}
                              </td>
                              {/* V-Abs */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {m.v_index_abs ? SIGNS.map(s => {
                                  const v = m.v_index_abs![s].valore;
                                  return <span key={s} style={{ marginRight: 3, color: vAbsColor(v), fontWeight: v >= 102 ? 600 : 400 }}>{v.toFixed(0)}</span>;
                                }) : '—'}
                              </td>
                              {/* HWR / DR / AWR */}
                              <td style={{ ...cStyle, fontSize: 10 }}>
                                {rend ? (() => { const c = hwrColors(rend.hwr, rend.dr, rend.awr); return (
                                  <>
                                    <span style={{ marginRight: 3, color: c[0], fontWeight: c[0] !== theme.textDim ? 600 : 400 }}>{rend.hwr.toFixed(0)}</span>
                                    <span style={{ marginRight: 3, color: c[1], fontWeight: c[1] !== theme.textDim ? 600 : 400 }}>{rend.dr.toFixed(0)}</span>
                                    <span style={{ color: c[2], fontWeight: c[2] !== theme.textDim ? 600 : 400 }}>{rend.awr.toFixed(0)}</span>
                                  </>
                                ); })() : '—'}
                              </td>
                              {/* Rit% */}
                              <td style={{
                                ...cStyle, fontWeight: 600,
                                color: rend ? (rend.ritorno_pct >= 95 ? theme.success : rend.ritorno_pct >= 90 ? theme.warning : theme.danger) : theme.textDim,
                              }}>
                                {rend ? `${rend.ritorno_pct}%` : '—'}
                              </td>
                            </tr>
                            {/* RIGA 3: Pronostici SEGNO (sempre visibile quando selezionata) */}
                            {sel && (
                              <tr style={{ background: isLight ? '#f0f7ff' : '#0c1929' }}>
                                <td colSpan={14} style={{ padding: 0, borderBottom: `1px solid ${theme.textDim}22` }}>
                                  <PredictionRow preds={predictions[m.match_key]} m={m} />
                                </td>
                              </tr>
                            )}
                            {/* RIGA 4: Capsule tab grafici */}
                            {sel && (
                              <tr style={{ background: isLight ? '#f0f7ff' : '#0c1929' }}>
                                <td colSpan={14} style={{ padding: '6px 10px', borderBottom: `1px solid ${theme.textDim}22` }}>
                                  <DetailSummary m={m} />
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                    {CHART_TABS.map(t => (
                                      <button key={t.key} onClick={(e) => { e.stopPropagation(); setChartTab(chartTab === t.key ? '' : t.key); }} title={t.tip}
                                        style={{
                                          padding: '4px 12px', borderRadius: 12, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                          background: chartTab === t.key ? theme.cyan : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                                          color: chartTab === t.key ? '#fff' : theme.textDim,
                                          transition: 'all 0.15s',
                                        }}>
                                        {t.label}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                            {/* RIGA 5: Grafico selezionato */}
                            {sel && chartTab && (
                              <tr style={{ background: isLight ? '#f0f7ff' : '#0c1929' }}>
                                <td colSpan={14} style={{ padding: '0 8px 8px', borderBottom: `2px solid ${theme.cyan}33` }}>
                                  <QuoteAnomaleDetail date={date} matchKey={m.match_key} chartFilter={chartTab} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </>
        )}

        {/* ===== MOBILE: CARD ESPANDIBILI ===== */}
        {!isDesktop && !loading && matches.length > 0 && (
          <>
            {grouped.map(([league, leagueMatches]) => {
              const collapsed = collapsedLeagues.has(league);
              return (
              <div key={league} style={{ marginBottom: 8 }}>
                <div onClick={() => toggleLeague(league)} style={{ fontSize: 11, fontWeight: 600, color: theme.cyan, padding: '6px 8px', marginBottom: 4, cursor: 'pointer', userSelect: 'none', background: isLight ? '#f0f4f8' : 'rgba(0,240,255,0.05)', border: isLight ? '1px solid #d0d7de' : `1px solid ${theme.cyan}22`, borderRadius: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, fontSize: 8, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', verticalAlign: 'middle', marginRight: 5 }}>▼</span>
                  {league} ({leagueMatches.length})
                </div>
                {!collapsed && leagueMatches.map(m => (
                  <MobileCard
                    key={m.match_key}
                    m={m}
                    date={date}
                    preds={predictions[m.match_key]}
                  />
                ))}
              </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// --- RIEPILOGO COMPATTO (desktop detail) ---
function DetailSummary({ m }: { m: MatchDoc }) {
  const rend = m.rendimento_chiusura || m.rendimento_apertura;
  return (
    <div style={{
      padding: '5px 12px',
      display: 'flex', flexWrap: 'wrap', gap: '3px 14px',
      fontSize: 10, fontFamily: 'monospace', color: theme.textDim,
      borderBottom: theme.cellBorder,
    }}>
      <span>Ap: {SIGNS.map(s => m.quote_apertura[s]?.toFixed(2)).join(' / ')}</span>
      {m.quote_chiusura && <span>Live: {SIGNS.map(s => m.quote_chiusura![s]?.toFixed(2)).join(' / ')}</span>}
      {m.direzione && (
        <span>Dir: {SIGNS.map(s => {
          const d = m.direzione![s];
          return d === 'conferma' ? '↓cf' : d === 'dubbio' ? '↑du' : '—st';
        }).join(' ')}</span>
      )}
      {m.alert_breakeven && (
        <span>BEv: {SIGNS.map((s, i) =>
          <span key={i}>{m.alert_breakeven![s].alert ? <span style={{ color: '#ef4444' }}>!! </span> : 'ok '}</span>
        )}</span>
      )}
      {m.alert_breakeven && <span>Agg: {SIGNS.map(s => m.alert_breakeven![s].aggio_specifico.toFixed(2)).join(' / ')}</span>}
      {rend && <span>HWR:{rend.hwr.toFixed(1)}% DR:{rend.dr.toFixed(1)}% AWR:{rend.awr.toFixed(1)}%</span>}
      {m.v_index_abs && <span>V-Abs: {SIGNS.map(s => { const v = m.v_index_abs![s].valore; return <span key={s} style={{ color: vAbsColor(v), fontWeight: v >= 102 ? 600 : 400 }}>{v.toFixed(1)}</span>; }).reduce((a: React.ReactNode[], b, i) => i ? [...a, ' / ', b] : [b], [] as React.ReactNode[])}</span>}
    </div>
  );
}

// --- STILI DESKTOP ---
const hStyle: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'center', color: theme.cyan,
  fontWeight: 600, fontSize: 10, borderBottom: theme.cellBorder, whiteSpace: 'nowrap',
  border: '1px solid rgba(128,128,128,0.3)',
};
const cStyle: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'center', color: theme.text,
  border: '1px solid rgba(128,128,128,0.3)',
};

// --- STILI MOBILE ---
const mThStyle: React.CSSProperties = {
  padding: '3px 6px', textAlign: 'center', color: theme.cyan,
  fontWeight: 600, fontSize: 10, borderBottom: theme.cellBorder,
};
const mLabelStyle: React.CSSProperties = {
  padding: '3px 6px', color: theme.textDim, fontWeight: 500, fontSize: 9,
  textTransform: 'uppercase', letterSpacing: 0.3, borderRight: theme.cellBorder, whiteSpace: 'nowrap',
};
const mCellStyle: React.CSSProperties = {
  padding: '3px 6px', textAlign: 'center', color: theme.text, borderRight: theme.cellBorder,
};
