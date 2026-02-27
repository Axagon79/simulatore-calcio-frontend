// ============================================================
// commentiReport.ts
// 17 funzioni di commento analitico per il report Puppals.
// Port TypeScript di commenti.js, adattato al formato FullReport (MongoDB).
// ============================================================

import * as v from './variantiCommenti';

// --- TIPI (duplicati da AnalisiStorica per evitare import circolare) ---
export interface FullReportForComments {
  mese: string;
  periodo?: { da: string; a: string };
  performance: {
    pronostici: number; partite: number; campionati: number;
    hr: number; pl: number; roi: number;
    z_score?: number; p_value?: number;
  };
  per_tipo?: { tipo: string; n: number; hr: number; pl: number; roi: number }[];
  per_categoria?: { categoria: string; n: number; hr: number; pl: number; roi: number }[];
  per_giorno?: { giorno: string; n: number; hr: number; roi: number; pl: number }[];
  per_campionato?: { league: string; n: number; hr: number; pl: number; roi: number }[];
  settimane?: { nome: string; periodo: string; n: number; hr: number; pl: number }[];
  top_correlazioni?: { feature: string; pearson: number; spearman: number; interpretazione?: string }[];
  top_features?: { feature: string; importance_rf: number; importance_xgb: number }[];
  cluster?: { id: number; n: number; hr: number; quota_media: number; roi: number }[];
  combo_tossiche?: { combo: string; n: number; hr: number; delta: number; p_value: number }[];
  regole_dt?: ({ id: string; condizione: string; esito: string } | string)[];
  errori_alta_conf?: {
    soglia?: number; totale?: number;
    win?: { n: number; pct: number }; loss?: { n: number; pct: number };
    profilo_win?: Record<string, number>; profilo_loss?: Record<string, number>;
  };
  errori_inspiegabili?: {
    totale?: number; quota_media?: number; gol_media?: number;
    per_campionato?: { league: string; n: number }[];
    per_tipo?: { tipo: string; n: number }[];
    per_partita?: { tipo: string; n: number }[];
  };
  filtri_sim?: { filtro: string; eliminati: number; rimasti?: number; hr_prima: number; hr_dopo: number; hr_delta: number; pl_delta: number; nota?: string }[];
  filtri_raccomandati?: { id?: string; trigger: string; azione: string; priorita: string; razionale?: string }[];
  chi_squared?: { chi2: number; p_value: number };
  roi_ci?: { roi_medio: number; ci_low: number; ci_high: number };
  backtesting?: { cv_media?: number; cv_std?: number; accuracy_train?: number; accuracy_test?: number; folds?: number[] };
  sintesi?: { metrica: string; valore: string }[];
}

// --- SOGLIE ---
const SOGLIE = {
  HR_ECCELLENTE: 70,
  HR_OTTIMO: 66,
  HR_BUONO: 62,
  HR_SUFFICIENTE: 58,
  ROI_OTTIMO: 20,
  ROI_BUONO: 10,
  ROI_NEGATIVO: 0,
  CAMPIONATO_PROBLEMATICO_HR: 57,
  CAMPIONATO_PROBLEMATICO_ROI: 0,
  CONF_ALTA: 70,
  MIN_CAMPIONI_SIGNIFICATIVI: 20,
};

// --- HELPER ---
function segno(n: number): string {
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

function segnoPct(n: number): string {
  return n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`;
}

// ============================================================
// SEZIONE 1 — PERFORMANCE GLOBALE
// ============================================================

export function commentoGlobale(data: FullReportForComments): string {
  const { hr, pl, roi, pronostici: n, z_score, p_value, partite, campionati } = data.performance;

  let qualitaHR: string;
  if (hr >= SOGLIE.HR_ECCELLENTE)       qualitaHR = v.getHREccellente();
  else if (hr >= SOGLIE.HR_OTTIMO)      qualitaHR = v.getHROttimo();
  else if (hr >= SOGLIE.HR_BUONO)       qualitaHR = v.getHRBuono();
  else if (hr >= SOGLIE.HR_SUFFICIENTE) qualitaHR = v.getHRSufficiente();
  else                                   qualitaHR = v.getHRNegativo();

  let qualitaROI: string;
  if (roi >= SOGLIE.ROI_OTTIMO)       qualitaROI = v.getROIOttimo();
  else if (roi >= SOGLIE.ROI_BUONO)   qualitaROI = v.getROIBuono();
  else if (roi > SOGLIE.ROI_NEGATIVO) qualitaROI = v.getROIModesto();
  else                                 qualitaROI = v.getROINegativo();

  let sigStr: string;
  if (p_value != null && p_value < 0.0001)    sigStr = v.getSigAltissima();
  else if (p_value != null && p_value < 0.01) sigStr = v.getSigAlta();
  else if (p_value != null && p_value < 0.05) sigStr = v.getSigMedia();
  else                                         sigStr = v.getSigBassa();

  return `Il sistema ha prodotto un Hit Rate del ${hr}% su ${n} pronostici ` +
    `(${partite} partite, ${campionati} campionati) — ${qualitaHR}. ` +
    `Il dato è ${sigStr} (z-score ${z_score != null ? z_score.toFixed(2) : 'n/d'}). ` +
    `${qualitaROI}: P/L ${segno(pl)}u, ROI ${segnoPct(roi)}.`;
}

// ============================================================
// SEZIONE 1 — PER TIPO DI PRONOSTICO
// ============================================================

export function commentoPerTipo(data: FullReportForComments): string {
  const tipi = data.per_tipo;
  if (!tipi || tipi.length === 0) return '';

  const gol = tipi.find(t => t.tipo === 'GOL');
  const segnoTipo = tipi.find(t => t.tipo === 'SEGNO');
  const dc = tipi.find(t => t.tipo === 'DOPPIA_CHANCE');

  let commentoGOL = '';
  if (gol) {
    if (gol.hr >= 68)
      commentoGOL = `I pronostici GOL (${gol.n} giocate) sono il punto di forza con ${gol.hr}% HR.`;
    else if (gol.hr >= 63)
      commentoGOL = `I pronostici GOL (${gol.n} giocate) performano regolarmente a ${gol.hr}% HR.`;
    else
      commentoGOL = `I pronostici GOL (${gol.n} giocate) mostrano un HR contenuto di ${gol.hr}% — monitorare.`;
  }

  let commentoSEGNO = '';
  if (segnoTipo) {
    if (segnoTipo.roi >= 25)
      commentoSEGNO = ` Il SEGNO è il principale driver di P/L (${segno(segnoTipo.pl)}u, ROI ${segnoPct(segnoTipo.roi)}) grazie alle quote medie più alte.`;
    else if (segnoTipo.roi >= 10)
      commentoSEGNO = ` Il SEGNO contribuisce positivamente con ROI ${segnoPct(segnoTipo.roi)}.`;
    else if (segnoTipo.roi < 0)
      commentoSEGNO = ` Attenzione al SEGNO: ROI negativo (${segnoPct(segnoTipo.roi)}) — rivedere la selezione.`;
  }

  let commentoDC = '';
  if (dc) {
    if (dc.n < 15)
      commentoDC = ` La DOPPIA CHANCE (${dc.n} pronostici) ha un campione troppo piccolo per conclusioni definitive.`;
    else if (dc.hr >= 80)
      commentoDC = ` La DOPPIA CHANCE eccelle con ${dc.hr}% HR su ${dc.n} pronostici.`;
  }

  return commentoGOL + commentoSEGNO + commentoDC;
}

// ============================================================
// SEZIONE 1 — CATEGORIE
// ============================================================

export function commentoCategorie(data: FullReportForComments): string {
  const cats = data.per_categoria;
  if (!cats || cats.length === 0) return '';

  const std = cats.find(c => c.categoria === 'Pronostici');
  const ar = cats.find(c => c.categoria === 'Alto Rendimento');
  if (!std || !ar) return '';

  const arParadox = ar.roi > std.roi && ar.hr < std.hr;

  let base = `I Pronostici standard (${std.hr}% HR, ROI ${segnoPct(std.roi)}) costituiscono ` +
    `il backbone affidabile del sistema. L'Alto Rendimento mostra `;

  if (arParadox) {
    base += `un pattern controintuitivo ma razionale: HR più basso (${ar.hr}%) compensato da quote ` +
      `più alte, risultando in ROI superiore (${segnoPct(ar.roi)}). ` +
      `Sono due strategie distinte — vanno lette e valutate sempre separatamente.`;
  } else if (ar.hr >= std.hr) {
    base += `performance superiori anche in HR (${ar.hr}% vs ${std.hr}%) — risultato molto positivo.`;
  } else {
    base += `HR ${ar.hr}% con ROI ${segnoPct(ar.roi)} — monitorare l'andamento nelle prossime settimane.`;
  }

  return base;
}

// ============================================================
// SEZIONE 2 — GIORNI DELLA SETTIMANA
// ============================================================

export function commentoGiorni(data: FullReportForComments): string {
  const giorni = data.per_giorno;
  if (!giorni || giorni.length === 0) return '';

  const sorted = [...giorni].sort((a, b) => b.hr - a.hr);
  const giornoTop = sorted[0];
  const giornoBottom = sorted[sorted.length - 1];
  const chiSq = data.chi_squared;
  const significativo = chiSq && chiSq.p_value < 0.05;

  let commento = `${giornoTop.giorno}`;
  if (sorted.length > 1) commento += ` e ${sorted[1].giorno}`;
  commento += ` sono i giorni migliori per HR. ${giornoBottom.giorno} mostra la performance più bassa (${giornoBottom.hr}%). `;

  if (!significativo) {
    commento += `Il chi-squared test (p=${chiSq ? chiSq.p_value.toFixed(2) : 'n/d'}) indica che ` +
      `le differenze tra giorni NON sono statisticamente significative su questo campione — ` +
      `raccogliere più dati prima di applicare filtri basati sul giorno.`;
  } else {
    commento += `Il chi-squared test conferma che il giorno influenza significativamente il risultato ` +
      `(p=${chiSq!.p_value.toFixed(3)}) — considerare filtri sui giorni peggiori.`;
  }

  return commento;
}

// ============================================================
// SEZIONE 2 — SETTIMANE
// ============================================================

export function commentoSettimane(data: FullReportForComments): string {
  const settimane = data.settimane;
  if (!settimane || settimane.length === 0) return '';

  const sorted = [...settimane].sort((a, b) => b.hr - a.hr);
  const migliore = sorted[0];
  const peggiore = sorted[sorted.length - 1];
  const deltaMB = migliore.hr - peggiore.hr;

  let commento: string;
  if (deltaMB <= 8)       commento = v.getSettimaneStabile();
  else if (deltaMB <= 15) commento = v.getSettimaneVariabile();
  else                    commento = v.getSettimaneAltaVariab();

  const hrMedia = data.performance.hr;
  if (peggiore.hr < hrMedia - 8) {
    commento += ` ${peggiore.nome} ha mostrato un calo significativo (${peggiore.hr}% HR, ` +
      `-${(hrMedia - peggiore.hr).toFixed(1)}pp sotto la media).`;
  }

  return commento;
}

// ============================================================
// SEZIONE 3 — CORRELAZIONI
// ============================================================

export function commentoCorrelazioni(data: FullReportForComments): string {
  const corr = data.top_correlazioni;
  if (!corr || corr.length === 0) return '';

  const topFeature = corr.find(c => c.pearson > 0);
  const nonLineare = corr.find(c => Math.abs(c.spearman - c.pearson) > 0.05);

  let commento = v.getCorrIntro() + ' ';

  if (topFeature) {
    commento += `La variabile più correlata è "${topFeature.feature}" ` +
      `(Pearson ${topFeature.pearson > 0 ? '+' : ''}${topFeature.pearson.toFixed(3)}, ` +
      `Spearman ${topFeature.spearman > 0 ? '+' : ''}${topFeature.spearman.toFixed(3)}), ` +
      `confermando che ${topFeature.interpretazione || 'questa variabile è informativa per il modello'}. `;
  }

  if (nonLineare) {
    commento += `La variabile "${nonLineare.feature}" mostra non-linearità significativa ` +
      `(Pearson ${nonLineare.pearson.toFixed(3)} vs Spearman ${nonLineare.spearman.toFixed(3)}) — ` +
      `suggerisce l'esistenza di una soglia oltre la quale l'effetto cambia natura.`;
  }

  return commento;
}

// ============================================================
// SEZIONE 3 — FEATURE IMPORTANCE
// ============================================================

export function commentoFeatures(data: FullReportForComments): string {
  const features = data.top_features;
  if (!features || features.length === 0) return '';

  const top = features[0];
  const maxImportance = top.importance_rf || top.importance_xgb || 0;

  let commento = maxImportance < 0.08
    ? v.getFeatureDistribuita()
    : v.getFeatureConcentrata();

  const concordanti = features.filter(f =>
    f.importance_rf && f.importance_xgb &&
    Math.abs(f.importance_rf - f.importance_xgb) < 0.015
  ).length;

  if (concordanti >= 5) {
    commento += ` I due modelli (Random Forest e XGBoost) concordano sui driver principali — buon segnale di stabilità.`;
  }

  return commento;
}

// ============================================================
// SEZIONE 4 — CLUSTERING
// ============================================================

export function commentoCluster(data: FullReportForComments): string {
  const cluster = data.cluster;
  if (!cluster || cluster.length === 0) return '';

  const topHR = cluster.reduce((a, b) => a.hr > b.hr ? a : b);
  const bottomHR = cluster.reduce((a, b) => a.hr < b.hr ? a : b);

  let commento = `${v.getClusterIntro()} `;

  commento += `Il cluster con HR più alta (${topHR.hr}%, quota media ${topHR.quota_media}, ` +
    `ROI ${segnoPct(topHR.roi)}) è il gruppo su cui concentrare l'esposizione principale. `;

  if (bottomHR.hr < 50) {
    commento += `Il segmento più volatile (${bottomHR.hr}% HR): `;
    if (bottomHR.roi > 30) {
      commento += `nonostante l'HR basso genera ROI ${segnoPct(bottomHR.roi)} grazie a quote alte — ` +
        `gestire con stake ridotto (max 0.5u) per limitare la volatilità senza rinunciare al valore.`;
    } else {
      commento += `ROI contenuto e HR bassa — valutare se escluderlo o ridurne drasticamente lo stake.`;
    }
  }

  return commento;
}

// ============================================================
// SEZIONE 5 — CAMPIONATI
// ============================================================

export function commentoCampionati(data: FullReportForComments): string {
  const campionati = data.per_campionato;
  if (!campionati || campionati.length === 0) return '';

  const significativi = campionati.filter(c => c.n >= SOGLIE.MIN_CAMPIONI_SIGNIFICATIVI);

  const problematici = significativi
    .filter(c => c.hr < SOGLIE.CAMPIONATO_PROBLEMATICO_HR || c.roi < SOGLIE.CAMPIONATO_PROBLEMATICO_ROI)
    .map(c => `${c.league} (${c.hr}% HR, ROI ${segnoPct(c.roi)})`);

  const eccellenti = significativi
    .filter(c => c.hr >= 70)
    .map(c => `${c.league} (${c.hr}% HR)`);

  let commento = v.getCampionatiIntro() + ' ';

  if (eccellenti.length > 0) {
    commento += `I campionati migliori: ${eccellenti.join(', ')}. `;
  }

  if (problematici.length > 0) {
    commento += `Campionati problematici (HR o ROI sotto soglia): ${problematici.join('; ')}. `;
    const roiNeg = significativi.filter(c => c.roi < 0).map(c => c.league);
    if (roiNeg.length > 0) {
      commento += `Attenzione: ${roiNeg.join(', ')} mostrano ROI negativo — ` +
        `valutare la riduzione dell'esposizione o l'esclusione temporanea.`;
    }
  } else {
    commento += v.getCampionatiTuttiOK();
  }

  commento += ` Nota: le leghe con n < ${SOGLIE.MIN_CAMPIONI_SIGNIFICATIVI} non sono ` +
    `statisticamente conclusive — monitorare nei mesi successivi.`;

  return commento;
}

// ============================================================
// SEZIONE 6 — MELE MARCE
// ============================================================

export function commentoMeleMarcePrincipale(data: FullReportForComments): string {
  const combo = data.combo_tossiche;
  if (!combo || combo.length === 0) return 'Nessuna combinazione tossica identificata nel periodo.';

  const peggiore = combo[0];
  const significative = combo.filter(c => c.p_value < 0.01).length;

  return `${v.getMeleIntro()} ` +
    `La più tossica è "${peggiore.combo}": solo ${peggiore.hr}% HR su ${peggiore.n} partite, ` +
    `${Math.abs(peggiore.delta).toFixed(1)}pp sotto la media ` +
    `(p-value ${peggiore.p_value < 0.001 ? '< 0.001' : peggiore.p_value.toFixed(4)}). ` +
    `Di queste, ${significative} sono statisticamente significative (p < 0.01) ` +
    `e meritano un filtro di esclusione immediato.`;
}

export function commentoDecisionTree(data: FullReportForComments): string {
  const regole = data.regole_dt;
  if (!regole || regole.length === 0) return '';

  return `Il Decision Tree ha estratto ${regole.length} regole interpretabili per predire le sconfitte. ` +
    `La variabile discriminante principale è "prob_mercato": quando il mercato non concorda ` +
    `con la nostra stima, il rischio di LOSS aumenta significativamente. ` +
    `Queste regole possono essere implementate come pre-screening automatico ` +
    `prima dell'emissione del pronostico.`;
}

export function commentoErroriAltaConf(data: FullReportForComments): string {
  const err = data.errori_alta_conf;
  if (!err || !err.win || !err.loss) return '';

  const totale = err.win.n + err.loss.n;
  const hrLoss = totale > 0 ? ((err.loss.n / totale) * 100).toFixed(1) : '?';

  let commento = `Tra i pronostici con confidence >= ${err.soglia ?? SOGLIE.CONF_ALTA}, ` +
    `il ${hrLoss}% risulta comunque LOSS. `;

  if (err.profilo_loss && err.profilo_win) {
    const sistWin = err.profilo_win.n_sistemi_attivi;
    const sistLoss = err.profilo_loss.n_sistemi_attivi;
    if (sistLoss != null && sistWin != null && sistLoss > sistWin) {
      commento += `Dato controintuitivo: i LOSS ad alta confidence mostrano mediamente più sistemi attivi ` +
        `(${sistLoss.toFixed(1)} vs ${sistWin.toFixed(1)}) — quando tutti i sistemi concordano, ` +
        `potrebbe indicare un bias condiviso. Segnale da tenere d'occhio.`;
    }
  }

  return commento;
}

export function commentoErroriInspiegabili(data: FullReportForComments): string {
  const err = data.errori_inspiegabili;
  if (!err || !err.totale) return '';

  const n = data.performance.pronostici;
  const pct = ((err.totale / n) * 100).toFixed(1);

  let commento = `Gli errori inspiegabili (alta confidence + edge positivo + LOSS) sono ` +
    `${err.totale} su ${n} totali (${pct}%). `;

  if (err.per_partita && err.per_partita.length > 0) {
    const tipoTop = [...err.per_partita].sort((a, b) => b.n - a.n)[0];
    if (tipoTop && tipoTop.n > err.totale * 0.3) {
      commento += `Le partite "${tipoTop.tipo}" concentrano il ${((tipoTop.n / err.totale) * 100).toFixed(0)}% ` +
        `degli errori — il sistema fatica strutturalmente quando le probabilità sono simili. `;
    }
  }

  if (err.quota_media && err.quota_media > 1.8) {
    commento += `La quota media di questi errori (${err.quota_media.toFixed(2)}) è sopra la media — ` +
      `le partite più aperte producono più sorprese indipendentemente dalla stima.`;
  }

  return commento;
}

// ============================================================
// SEZIONE 7 — SIMULAZIONE FILTRI
// ============================================================

export function commentoFiltriSim(data: FullReportForComments): string {
  const filtri = data.filtri_sim;
  if (!filtri || filtri.length === 0) return '';

  const tuttiNegativi = filtri.every(f => f.pl_delta < 0);

  let commento = tuttiNegativi
    ? v.getFiltriNessunoPositivo()
    : `Alcuni filtri migliorano il P/L netto: ${filtri.filter(f => f.pl_delta >= 0).map(f => f.filtro).join(', ')}.`;

  commento += ` La strategia corretta è applicare i filtri alle combinazioni tossiche con HR < 30% ` +
    `e ridurre lo stake (non eliminare) sulle combinazioni a rischio medio.`;

  return commento;
}

// ============================================================
// SEZIONE 8 — RACCOMANDAZIONI
// ============================================================

export function commentoRaccomandazioni(data: FullReportForComments): string {
  const filtri = data.filtri_raccomandati;
  if (!filtri || filtri.length === 0) return '';

  const alta = filtri.filter(f => f.priorita === 'ALTA').length;
  const media = filtri.filter(f => f.priorita === 'MEDIA').length;
  const bassa = filtri.filter(f => f.priorita === 'BASSA').length;

  return `Il piano operativo prevede ${filtri.length} filtri in ordine di priorità: ` +
    `${alta} ad alta priorità (implementazione immediata), ` +
    `${media} a media priorità (riduzione stake, monitoraggio 4 settimane)` +
    `${bassa > 0 ? `, ${bassa} a bassa priorità (osservazione)` : ''}. ` +
    v.getRaccomandazioniChiusura();
}

// ============================================================
// SEZIONE 9 — SINTESI FINALE
// ============================================================

export function commentoSintesi(data: FullReportForComments): string {
  const { hr, roi } = data.performance;

  let valutazione: string;
  if (hr >= SOGLIE.HR_ECCELLENTE && roi >= SOGLIE.ROI_OTTIMO)
    valutazione = v.getSintesiEccellente();
  else if (hr >= SOGLIE.HR_OTTIMO)
    valutazione = v.getSintesiOttima();
  else if (hr >= SOGLIE.HR_BUONO)
    valutazione = v.getSintesiBuona();
  else
    valutazione = v.getSintesiDifficile();

  return `${valutazione} ${v.getSintesiChiusura()}`;
}

export function notaStatistica(data: FullReportForComments): string {
  const n = data.performance.pronostici;
  const dal = data.periodo?.da || '';
  const al = data.periodo?.a || '';
  let giorni = '?';
  if (dal && al) {
    const diff = Math.round((new Date(al).getTime() - new Date(dal).getTime()) / (1000 * 60 * 60 * 24));
    giorni = String(diff);
  }

  return `L'analisi è basata su ${n} pronostici in ${giorni} giorni (${dal} - ${al}). ` +
    `Le conclusioni sono robuste per le combinazioni con n >= ${SOGLIE.MIN_CAMPIONI_SIGNIFICATIVI} e p < 0.01. ` +
    `Per campionati con campione ridotto servono 90+ giorni prima di decisioni definitive.`;
}
