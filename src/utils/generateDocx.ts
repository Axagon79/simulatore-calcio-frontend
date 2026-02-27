/**
 * Genera report .docx client-side — stessa struttura di report_puppals.cjs
 * Usa il package `docx` che supporta browser (Packer.toBlob)
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak
} from 'docx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

const COLORS = {
  primary: '1F3864', accent: '2E75B6', green: '1A7A3A', red: 'C00000',
  lightGreen: 'E2EFDA', lightRed: 'FCE4D6', lightGray: 'F2F2F2',
  lightBlue: 'D6E4F0', headerBg: '1F3864', white: 'FFFFFF',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const W = 9026; // page width DXA

function fmtPl(v: number) { return (v >= 0 ? '+' : '') + v.toFixed(2) + 'u'; }
function fmtRoi(v: number) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }
function fmtHr(v: number) { return v.toFixed(1) + '%'; }

function c(text: string, opts: { width?: number; bg?: string; bold?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {}) {
  return new TableCell({
    borders, width: { size: opts.width || 2340, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: opts.bold || false, color: opts.color || (opts.bg === COLORS.headerBg ? COLORS.white : '000000'), size: opts.size || 20, font: 'Arial' })]
    })]
  });
}

function hc(text: string, width: number) {
  return c(text, { bg: COLORS.headerBg, bold: true, width, align: AlignmentType.CENTER, color: COLORS.white });
}

function h1(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: COLORS.primary })], spacing: { before: 360, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent, space: 1 } } });
}

function h2(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: COLORS.accent })], spacing: { before: 280, after: 120 } });
}

function p(text: string, opts: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text, font: 'Arial', size: opts.size || 20, bold: opts.bold, italics: opts.italics, color: opts.color || '000000' })] });
}

function infoBox(text: string, bg: string = COLORS.lightBlue) {
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ children: [new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: W, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 200, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20 })] })] })] })] });
}

function spacer() { return new Paragraph({ children: [new TextRun('')], spacing: { before: 80, after: 80 } }); }
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function makeTable(headers: string[], colWidths: number[], rows: string[][], rowBgs?: (string | undefined)[]) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((t, i) => hc(t, colWidths[i])) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((t, ci) => c(t, { width: colWidths[ci], align: AlignmentType.CENTER, bg: rowBgs?.[ri] }))
      }))
    ]
  });
}

export async function generateReport(data: R): Promise<Blob> {
  const perf = data.performance || {};
  const sections: (typeof Paragraph.prototype | typeof Table.prototype)[] = [];

  // --- COPERTINA ---
  sections.push(
    spacer(), spacer(), spacer(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PUPPALS', font: 'Arial', size: 72, bold: true, color: COLORS.primary })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: 'REPORT ANALISI PRONOSTICI', font: 'Arial', size: 32, color: COLORS.accent })] }),
    spacer(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${perf.pronostici || '?'} pronostici  |  ${perf.partite || '?'} partite  |  ${perf.campionati || '?'} campionati`, font: 'Arial', size: 22, color: '666666' })] }),
    data.periodo ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: `Periodo: ${data.periodo.da || '?'} — ${data.periodo.a || '?'}`, font: 'Arial', size: 20, color: '999999' })] }) : spacer(),
    pageBreak(),
  );

  // --- SEZ 1: PERFORMANCE ---
  sections.push(h1('1. Performance Globale'));
  sections.push(infoBox(`HR: ${fmtHr(perf.hr || 0)}  |  P/L: ${fmtPl(perf.pl || 0)}  |  ROI: ${fmtRoi(perf.roi || 0)}${perf.z_score ? `  |  z-score: ${perf.z_score.toFixed(2)}` : ''}`, COLORS.lightGreen));
  sections.push(spacer());

  // 1.1 Per tipo
  if (data.per_tipo?.length) {
    sections.push(h2('1.1 Performance per Tipo'));
    const cw = [2000, 1600, 1600, 2000, 1826];
    sections.push(makeTable(['Tipo', 'N', 'Hit Rate', 'P/L', 'ROI'], cw,
      data.per_tipo.map((t: R) => [t.tipo, String(t.n), fmtHr(t.hr), fmtPl(t.pl), fmtRoi(t.roi)])));
    sections.push(spacer());
  }

  // 1.2 Per categoria
  if (data.per_categoria?.length) {
    sections.push(h2('1.2 Performance per Categoria'));
    const cw = [2600, 1200, 1500, 1500, 2226];
    sections.push(makeTable(['Categoria', 'N', 'Hit Rate', 'P/L', 'ROI'], cw,
      data.per_categoria.map((cat: R) => [cat.categoria, String(cat.n), fmtHr(cat.hr), fmtPl(cat.pl), fmtRoi(cat.roi)]),
      data.per_categoria.map((cat: R) => cat.categoria === 'Pronostici' ? COLORS.lightGreen : COLORS.lightBlue)));
    sections.push(spacer());
  }

  sections.push(pageBreak());

  // --- SEZ 2: PATTERN TEMPORALI ---
  sections.push(h1('2. Pattern Temporali e Stagionali'));

  if (data.per_giorno?.length) {
    sections.push(h2('2.1 Per Giorno della Settimana'));
    const cw = [2500, 1500, 2000, 3026];
    const hrMedia = perf.hr || 60;
    sections.push(makeTable(['Giorno', 'N', 'Hit Rate', 'ROI'], cw,
      [...data.per_giorno].sort((a: R, b: R) => b.hr - a.hr).map((g: R) => [g.giorno, String(g.n), fmtHr(g.hr), fmtRoi(g.roi)]),
      [...data.per_giorno].sort((a: R, b: R) => b.hr - a.hr).map((g: R) => g.hr >= hrMedia + 3 ? COLORS.lightGreen : g.hr < hrMedia - 5 ? COLORS.lightRed : undefined)));
  }

  if (data.chi_squared?.p_value != null) {
    sections.push(infoBox(`Chi-squared p-value: ${data.chi_squared.p_value.toFixed(4)}${data.chi_squared.p_value > 0.05 ? ' — Distribuzione uniforme (nessun giorno statisticamente diverso)' : ' — Differenza significativa tra giorni'}`));
  }

  if (data.settimane?.length) {
    sections.push(h2('2.2 Andamento Settimanale'));
    const cw = [3000, 1500, 1800, 2726];
    sections.push(makeTable(['Settimana', 'N', 'HR', 'P/L'], cw,
      data.settimane.map((s: R) => [s.nome || s.periodo, String(s.n), fmtHr(s.hr), fmtPl(s.pl)])));
  }

  sections.push(pageBreak());

  // --- SEZ 3: CORRELAZIONI E FEATURES ---
  if (data.top_correlazioni?.length || data.top_features?.length) {
    sections.push(h1('3. Correlazioni e Feature Importance'));

    if (data.top_correlazioni?.length) {
      sections.push(h2('3.1 Correlazioni con WIN'));
      const cw = [3000, 2013, 2013, 2000];
      sections.push(makeTable(['Feature', 'Pearson', 'Spearman', ''], cw,
        data.top_correlazioni.map((r: R) => [r.feature, r.pearson.toFixed(4), r.spearman.toFixed(4), ''])));
      sections.push(spacer());
    }

    if (data.top_features?.length) {
      sections.push(h2('3.2 Feature Importance'));
      const cw = [3000, 2013, 2013, 2000];
      sections.push(makeTable(['Feature', 'Importanza (RF)', 'Importanza (XGB)', ''], cw,
        data.top_features.map((r: R) => [r.feature, r.importance_rf.toFixed(4), r.importance_xgb.toFixed(4), ''])));
    }
    sections.push(pageBreak());
  }

  // --- SEZ 4: CLUSTER ---
  if (data.cluster?.length) {
    sections.push(h1('4. Clustering Pronostici'));
    const cw = [1500, 1200, 1600, 1800, 1500, 1426];
    sections.push(makeTable(['Cluster', 'N', 'Hit Rate', 'Quota Media', 'ROI', ''], cw,
      data.cluster.map((cl: R) => [String(cl.id), String(cl.n), fmtHr(cl.hr), cl.quota_media.toFixed(3), fmtRoi(cl.roi), '']),
      data.cluster.map((cl: R) => cl.hr < 50 ? COLORS.lightRed : cl.hr >= 70 ? COLORS.lightGreen : undefined)));
    sections.push(spacer());
  }

  // --- SEZ 5: CAMPIONATI ---
  if (data.per_campionato?.length) {
    sections.push(h1('5. Analisi per Campionato'));
    const sorted = [...data.per_campionato].sort((a: R, b: R) => b.hr - a.hr);
    const cw = [2800, 1000, 1500, 1500, 2226];
    sections.push(makeTable(['Campionato', 'N', 'Hit Rate', 'ROI', 'Stato'], cw,
      sorted.map((l: R) => {
        const stato = l.hr >= 55 && l.roi >= 0 ? '\u2713 Positivo' : l.hr < 45 || l.roi < -20 ? '\u26A0 Critico' : '\u26A0 Attenzione';
        return [l.league, String(l.n), fmtHr(l.hr), fmtRoi(l.roi), stato];
      }),
      sorted.map((l: R) => l.hr >= 55 && l.roi >= 0 ? COLORS.lightGreen : l.hr < 45 ? COLORS.lightRed : undefined)));
    sections.push(pageBreak());
  }

  // --- SEZ 6: MELE MARCE ---
  if (data.combo_tossiche?.length || data.regole_dt?.length) {
    sections.push(h1('6. Negative Pattern Detection'));

    if (data.combo_tossiche?.length) {
      sections.push(h2('6.1 Combo Tossiche'));
      const cw = [3200, 900, 1300, 1300, 2326];
      sections.push(makeTable(['Combinazione', 'N', 'HR', 'Delta', 'Azione'], cw,
        data.combo_tossiche.slice(0, 10).map((ct: R) => [ct.combo, String(ct.n), fmtHr(ct.hr), `${ct.delta?.toFixed(1) ?? ct.hr_diff?.toFixed(1) ?? '?'}pp`, ct.hr < 35 ? 'SCARTA' : 'Dimezza']),
        data.combo_tossiche.slice(0, 10).map((ct: R) => ct.hr < 35 ? COLORS.lightRed : COLORS.lightGray)));
      sections.push(spacer());
    }

    if (data.regole_dt?.length) {
      sections.push(h2('6.2 Regole Decision Tree'));
      const cw = [1500, 5026, 2500];
      const rules = data.regole_dt.map((r: R) => typeof r === 'string' ? ['-', r, 'LOSS'] : [r.id || '-', r.condizione || r, r.esito || 'LOSS']);
      sections.push(makeTable(['ID', 'Condizione', 'Esito'], cw, rules, rules.map(() => COLORS.lightRed)));
      sections.push(spacer());
    }

    // 6.3 Errori alta confidenza
    if (data.errori_alta_conf?.totale) {
      sections.push(h2('6.3 Profilo Errori Alta Confidenza'));
      const ea = data.errori_alta_conf;
      sections.push(p(`Soglia: ${ea.soglia || 65} — Totale: ${ea.totale} pronostici. WIN: ${ea.win?.n || 0} (${ea.win?.pct || 0}%) | LOSS: ${ea.loss?.n || 0} (${ea.loss?.pct || 0}%)`));
      if (ea.profilo_win && ea.profilo_loss) {
        const features = Object.keys(ea.profilo_win);
        const cw2 = [3000, 3013, 3013];
        sections.push(makeTable(['Feature', 'Media WIN', 'Media LOSS'], cw2,
          features.map(f => [f, String(ea.profilo_win[f] ?? '?'), String(ea.profilo_loss[f] ?? '?')]),
          features.map((_f, i) => i % 2 === 0 ? COLORS.lightGray : undefined)));
      }
      sections.push(spacer());
    }

    // 6.4 Errori inspiegabili
    if (data.errori_inspiegabili?.totale) {
      sections.push(h2('6.4 Errori Inspiegabili'));
      const ei = data.errori_inspiegabili;
      sections.push(p(`Totale: ${ei.totale} — Quota media: ${ei.quota_media?.toFixed(2) ?? '?'}${ei.gol_media ? ` — Gol media: ${ei.gol_media.toFixed(2)}` : ''}`));
      if (ei.per_campionato?.length) {
        sections.push(p('Per campionato:', { bold: true }));
        ei.per_campionato.slice(0, 5).forEach((l: R) => sections.push(p(`  ${l.league}: ${l.n}`)));
      }
    }
    sections.push(pageBreak());
  }

  // --- SEZ 7: FILTRI SIMULAZIONE ---
  if (data.filtri_sim?.length) {
    sections.push(h1('7. Simulazione Filtri'));
    const cw = [2200, 1100, 1200, 1200, 1200, 2126];
    sections.push(makeTable(['Filtro', 'Eliminati', 'HR Prima', 'HR Dopo', 'Delta HR', 'Delta P/L'], cw,
      data.filtri_sim.map((f: R) => [f.filtro, String(f.eliminati), fmtHr(f.hr_prima), fmtHr(f.hr_dopo), `${f.hr_delta >= 0 ? '+' : ''}${f.hr_delta.toFixed(1)}pp`, fmtPl(f.pl_delta)]),
      data.filtri_sim.map(() => COLORS.lightGray)));
    sections.push(spacer());
  }

  // --- SEZ 8: FILTRI RACCOMANDATI ---
  if (data.filtri_raccomandati?.length) {
    sections.push(h1('8. Filtri Raccomandati'));
    const cw = [600, 2800, 1500, 1200, 2926];
    sections.push(makeTable(['#', 'Trigger', 'Azione', 'Priorita', 'Razionale'], cw,
      data.filtri_raccomandati.map((f: R) => [f.id || '-', f.trigger, f.azione, f.priorita, f.razionale || '']),
      data.filtri_raccomandati.map((f: R) => f.priorita === 'ALTA' ? COLORS.lightRed : COLORS.lightGray)));
    sections.push(pageBreak());
  }

  // --- SEZ 9: SINTESI ---
  sections.push(h1('9. Sintesi e Conclusioni'));

  if (data.sintesi?.length) {
    const cw = [3500, 5526];
    sections.push(makeTable(['Metrica', 'Valore'], cw,
      data.sintesi.map((s: R) => [s.metrica, s.valore]),
      data.sintesi.map((_: R, i: number) => i % 2 === 0 ? COLORS.lightGray : undefined)));
    sections.push(spacer());
  }

  if (data.roi_ci?.ci_low != null) {
    sections.push(infoBox(`ROI Confidence Interval (95%): ${(data.roi_ci.ci_low * 100).toFixed(1)}% — ${(data.roi_ci.ci_high * 100).toFixed(1)}% (medio: ${(data.roi_ci.roi_medio * 100).toFixed(1)}%)`));
  }

  if (data.backtesting?.cv_media != null) {
    let btText = `Backtesting CV: ${(data.backtesting.cv_media * 100).toFixed(1)}%`;
    if (data.backtesting.accuracy_train != null) btText += ` | Train: ${(data.backtesting.accuracy_train * 100).toFixed(1)}%`;
    if (data.backtesting.accuracy_test != null) btText += ` | Test: ${(data.backtesting.accuracy_test * 100).toFixed(1)}%`;
    sections.push(infoBox(btText));
  }

  sections.push(spacer());
  sections.push(p(`Puppals Analytics — ${data.mese === 'globale' ? 'Report Globale' : data.mese}`, { italics: true, color: '999999', size: 18 }));

  // --- BUILD DOCUMENT ---
  const doc = new Document({
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ]
    },
    sections: [{ children: sections as Paragraph[] }]
  });

  return await Packer.toBlob(doc);
}
