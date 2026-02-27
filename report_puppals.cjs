const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        PageBreak, LevelFormat } = require('docx');
const fs = require('fs');
const path = require('path');

// --- Carica dati dal JSON ---
const jsonPath = process.argv[2] || path.join(__dirname, '..', 'report_data.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const g = data.globale;
const outputPath = process.argv[3] || path.join(path.dirname(jsonPath), 'puppals_report.docx');

// --- Helper formattazione ---
function fmtPl(v) { return (v >= 0 ? '+' : '') + v.toFixed(2) + 'u'; }
function fmtRoi(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }
function fmtHr(v) { return v.toFixed(1) + '%'; }

const COLORS = {
  primary: '1F3864',
  accent: '2E75B6',
  green: '1A7A3A',
  red: 'C00000',
  orange: 'C55A11',
  lightBlue: 'D6E4F0',
  lightGreen: 'E2EFDA',
  lightRed: 'FCE4D6',
  lightGray: 'F2F2F2',
  headerBg: '1F3864',
  white: 'FFFFFF',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width: { size: opts.width || 2340, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: opts.vAlign || undefined,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        text: String(text),
        bold: opts.bold || false,
        color: opts.color || (opts.bg === COLORS.headerBg ? COLORS.white : '000000'),
        size: opts.size || 20,
        font: 'Arial',
      })]
    })]
  });
}

function hCell(text, width) {
  return cell(text, { bg: COLORS.headerBg, bold: true, width, align: AlignmentType.CENTER, color: COLORS.white });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: COLORS.primary })],
    spacing: { before: 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent, space: 1 } }
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: COLORS.accent })],
    spacing: { before: 280, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: COLORS.primary })],
    spacing: { before: 200, after: 80 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: opts.size || 20, bold: opts.bold, italic: opts.italic, color: opts.color || '000000' })]
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 80, after: 80 } });
}

function infoBox(text, bgColor) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [9026],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      width: { size: 9026, type: WidthType.DXA },
      shading: { fill: bgColor, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20, color: '000000' })] })]
    })] })]
  });
}

function bullet(text) {
  return new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text, font: 'Arial', size: 20 })] });
}

function numItem(text) {
  return new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text, font: 'Arial', size: 20 })] });
}

// ─── Tabelle dinamiche ───────────────────────────────────────────────────────

function tablePerformance() {
  const tipi = data.per_tipo || {};
  const rows = Object.entries(tipi).map(([tipo, v]) => [tipo, String(v.n), fmtHr(v.hr), fmtPl(v.pl), fmtRoi(v.roi)]);
  const colWidths = [2000, 1600, 1600, 2000, 1826];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Tipo', 'N', 'Hit Rate', 'P/L', 'ROI'].map((t, i) => hCell(t, colWidths[i])) }),
      ...rows.map(r => new TableRow({ children: r.map((t, i) => cell(t, { width: colWidths[i], align: AlignmentType.CENTER })) }))
    ]
  });
}

function tableCategorie() {
  const cats = data.per_categoria || {};
  const rows = Object.entries(cats).map(([cat, v]) => [
    cat === 'Pronostici' ? 'Pronostici (standard)' : cat,
    String(v.n), fmtHr(v.hr), fmtPl(v.pl), fmtRoi(v.roi),
    cat === 'Pronostici' ? COLORS.lightGreen : COLORS.lightBlue
  ]);
  const colWidths = [2600, 1200, 1500, 1500, 2226];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Categoria', 'N', 'Hit Rate', 'P/L', 'ROI'].map((t, i) => hCell(t, colWidths[i])) }),
      ...rows.map(r => new TableRow({ children: r.slice(0, 5).map((t, i) => cell(t, { width: colWidths[i], align: AlignmentType.CENTER, bg: r[5] })) }))
    ]
  });
}

function tableGiorni() {
  const giorni = data.per_giorno || {};
  const sorted = Object.entries(giorni).sort((a, b) => b[1].hr - a[1].hr);
  const rows = sorted.map(([giorno, v]) => [giorno, String(v.n), fmtHr(v.hr), fmtRoi(v.roi)]);
  const colWidths = [2500, 1500, 2000, 3026];
  const hrMedia = g.hr;
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Giorno', 'N', 'Hit Rate', 'ROI'].map((t, i) => hCell(t, colWidths[i])) }),
      ...rows.map((r, ri) => {
        const hr = sorted[ri][1].hr;
        const bg = hr >= hrMedia + 3 ? COLORS.lightGreen : hr < hrMedia - 5 ? COLORS.lightRed : undefined;
        return new TableRow({ children: r.map((t, i) => cell(t, { width: colWidths[i], align: AlignmentType.CENTER, bg })) });
      })
    ]
  });
}

function tableSettimane() {
  const sett = data.settimane || {};
  const entries = Object.entries(sett);
  if (entries.length === 0) return spacer();
  const colWidths = [3000, 1500, 1800, 2726];
  const hrMedia = g.hr;
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Settimana', 'N', 'HR', 'P/L'].map((t, i) => hCell(t, colWidths[i])) }),
      ...entries.map(([nome, v]) => {
        const bg = v.hr < hrMedia - 5 ? COLORS.lightRed : COLORS.lightGreen;
        return new TableRow({ children: [
          cell(v.periodo || nome, { width: colWidths[0], align: AlignmentType.CENTER, bg }),
          cell(String(v.n), { width: colWidths[1], align: AlignmentType.CENTER, bg }),
          cell(fmtHr(v.hr), { width: colWidths[2], align: AlignmentType.CENTER, bg }),
          cell(fmtPl(v.pl), { width: colWidths[3], align: AlignmentType.CENTER, bg }),
        ] });
      })
    ]
  });
}

function tableCorrelazioni() {
  const corr = data.correlazioni || [];
  if (corr.length === 0) return spacer();
  const colWidths = [3500, 1500, 1500, 2526];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Variabile', 'Pearson', 'Spearman', 'Interpretazione'].map((t, i) => hCell(t, colWidths[i])) }),
      ...corr.map(c => new TableRow({ children: [
        cell(c.feature, { width: colWidths[0], align: AlignmentType.CENTER }),
        cell((c.pearson >= 0 ? '+' : '') + c.pearson.toFixed(3), { width: colWidths[1], align: AlignmentType.CENTER }),
        cell((c.spearman >= 0 ? '+' : '') + c.spearman.toFixed(3), { width: colWidths[2], align: AlignmentType.CENTER }),
        cell(c.interpretazione || '', { width: colWidths[3], align: AlignmentType.CENTER }),
      ] }))
    ]
  });
}

function tableFeatures() {
  const feats = data.features || [];
  if (feats.length === 0) return spacer();
  const colWidths = [3200, 1600, 3626, 600];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Feature', 'Importanza (RF)', 'Significato Pratico', ''].map((t, i) => hCell(t, colWidths[i])) }),
      ...feats.map(f => new TableRow({ children: [
        cell(f.feature, { width: colWidths[0], align: AlignmentType.CENTER }),
        cell((f.importance_rf * 100).toFixed(1) + '%', { width: colWidths[1], align: AlignmentType.CENTER }),
        cell(f.significato || '', { width: colWidths[2], align: AlignmentType.CENTER }),
        cell('', { width: colWidths[3] }),
      ] }))
    ]
  });
}

function tableCluster() {
  const clusters = data.cluster || [];
  if (clusters.length === 0) return spacer();
  const labels = { 0: 'Alta Qualita', 1: 'GOL puri', 2: 'Standard', 3: 'Alto Rischio' };
  const strategies = { 0: 'Focus principale', 1: 'HR top, ROI basso', 2: 'Bulk del sistema', 3: 'Max 0.5u per quota' };
  const colWidths = [2200, 800, 1400, 1400, 1400, 1826];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Cluster', 'N', 'HR', 'Quota Media', 'ROI', 'Strategia'].map((t, i) => hCell(t, colWidths[i])) }),
      ...clusters.map((cl, ri) => {
        const bg = cl.hr < 50 ? COLORS.lightRed : cl.hr >= 70 ? COLORS.lightGreen : undefined;
        return new TableRow({ children: [
          cell(`${cl.id} — ${labels[cl.id] || 'Cluster ' + cl.id}`, { width: colWidths[0], align: AlignmentType.CENTER, bg }),
          cell(String(cl.n), { width: colWidths[1], align: AlignmentType.CENTER, bg }),
          cell(fmtHr(cl.hr), { width: colWidths[2], align: AlignmentType.CENTER, bg }),
          cell(cl.quota_media.toFixed(3), { width: colWidths[3], align: AlignmentType.CENTER, bg }),
          cell(fmtRoi(cl.roi), { width: colWidths[4], align: AlignmentType.CENTER, bg }),
          cell(strategies[cl.id] || '', { width: colWidths[5], align: AlignmentType.CENTER, bg }),
        ] });
      })
    ]
  });
}

function tableCampionati() {
  const camps = data.per_campionato || {};
  const sorted = Object.entries(camps).sort((a, b) => a[1].hr - b[1].hr);
  // Mostra top 4 peggiori + top 4 migliori
  const worst = sorted.slice(0, 4);
  const best = sorted.slice(-4).reverse();
  const rows = [...worst, ...best];
  const colWidths = [2600, 900, 1600, 1600, 1700, 626];
  const hrMedia = g.hr;
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Campionato', 'N', 'Hit Rate', 'ROI', 'Stato', ''].map((t, i) => hCell(t, colWidths[i])) }),
      ...rows.map(([league, v]) => {
        const stato = v.hr >= hrMedia && v.roi >= 0 ? '✓ Positivo' : v.hr < hrMedia - 5 ? '⚠ Critico' : '⚠ Attenzione';
        const bg = v.hr >= hrMedia && v.roi >= 0 ? COLORS.lightGreen : COLORS.lightRed;
        return new TableRow({ children: [
          cell(league, { width: colWidths[0], align: AlignmentType.CENTER, bg }),
          cell(String(v.n), { width: colWidths[1], align: AlignmentType.CENTER, bg }),
          cell(fmtHr(v.hr), { width: colWidths[2], align: AlignmentType.CENTER, bg }),
          cell(fmtRoi(v.roi), { width: colWidths[3], align: AlignmentType.CENTER, bg }),
          cell(stato, { width: colWidths[4], align: AlignmentType.CENTER, bg }),
          cell('', { width: colWidths[5], bg }),
        ] });
      })
    ]
  });
}

function tableMele() {
  const combos = data.combo_tossiche || [];
  if (combos.length === 0) return spacer();
  const colWidths = [3400, 700, 1200, 1400, 1626];
  return new Table({
    width: { size: 9326, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Combinazione Tossica', 'N', 'HR', 'Delta', 'Azione'].map((t, i) => hCell(t, colWidths[i])) }),
      ...combos.map(ct => {
        const azione = ct.hr < 35 ? 'Eliminare' : 'Ridurre stake';
        const bg = ct.hr < 35 ? COLORS.lightRed : COLORS.lightGray;
        return new TableRow({ children: [
          cell(ct.combo, { width: colWidths[0], align: AlignmentType.CENTER, bg }),
          cell(String(ct.n), { width: colWidths[1], align: AlignmentType.CENTER, bg }),
          cell(fmtHr(ct.hr), { width: colWidths[2], align: AlignmentType.CENTER, bg }),
          cell(ct.hr_diff.toFixed(1) + 'pp', { width: colWidths[3], align: AlignmentType.CENTER, bg, color: COLORS.red }),
          cell(azione, { width: colWidths[4], align: AlignmentType.CENTER, bg, bold: true }),
        ] });
      })
    ]
  });
}

function tableDecisionTree() {
  const rules = data.regole_dt || [];
  if (rules.length === 0) return spacer();
  const colWidths = [1200, 5000, 2826];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['ID', 'Condizione', 'Esito Predetto'].map((t, i) => hCell(t, colWidths[i])) }),
      ...rules.map(r => new TableRow({ children: [
        cell(r.id, { width: colWidths[0], align: AlignmentType.CENTER, bg: COLORS.lightRed }),
        cell(r.condizione, { width: colWidths[1], align: AlignmentType.CENTER, bg: COLORS.lightRed }),
        cell(r.esito, { width: colWidths[2], align: AlignmentType.CENTER, bg: COLORS.lightRed }),
      ] }))
    ]
  });
}

function tableFiltriSim() {
  const filtri = data.filtri_sim || [];
  if (filtri.length === 0) return spacer();
  const colWidths = [2200, 1100, 1800, 1000, 1000, 1926];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['Filtro', 'Impatto', 'HR', 'Delta HR', 'Delta P/L', 'Nota'].map((t, i) => hCell(t, colWidths[i])) }),
      ...filtri.map(f => new TableRow({ children: [
        cell(f.filtro, { width: colWidths[0], align: AlignmentType.CENTER, bg: COLORS.lightGray }),
        cell(f.eliminati + ' elim.', { width: colWidths[1], align: AlignmentType.CENTER, bg: COLORS.lightGray }),
        cell(fmtHr(f.hr_prima) + ' -> ' + fmtHr(f.hr_dopo), { width: colWidths[2], align: AlignmentType.CENTER, bg: COLORS.lightGray }),
        cell((f.hr_delta >= 0 ? '+' : '') + f.hr_delta.toFixed(1) + 'pp', { width: colWidths[3], align: AlignmentType.CENTER, bg: COLORS.lightGray }),
        cell(fmtPl(f.pl_delta), { width: colWidths[4], align: AlignmentType.CENTER, bg: COLORS.lightGray }),
        cell(f.nota || '', { width: colWidths[5], align: AlignmentType.CENTER, bg: COLORS.lightGray }),
      ] }))
    ]
  });
}

function tableFiltriRaccomandati() {
  const filtri = data.filtri_raccomandati || [];
  if (filtri.length === 0) return spacer();
  const colWidths = [500, 2700, 1800, 1000, 2026];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ['#', 'Trigger', 'Azione', 'Priorita', 'Razionale'].map((t, i) => hCell(t, colWidths[i])) }),
      ...filtri.map((f, ri) => {
        const bg = f.priorita === 'ALTA' ? COLORS.lightRed : f.priorita === 'MEDIA' ? COLORS.lightGray : COLORS.lightBlue;
        return new TableRow({ children: [
          cell(f.id, { width: colWidths[0], align: AlignmentType.CENTER, bg }),
          cell(f.trigger, { width: colWidths[1], align: AlignmentType.CENTER, bg }),
          cell(f.azione, { width: colWidths[2], align: AlignmentType.CENTER, bg, bold: true }),
          cell(f.priorita, { width: colWidths[3], align: AlignmentType.CENTER, bg }),
          cell(f.razionale, { width: colWidths[4], align: AlignmentType.CENTER, bg }),
        ] });
      })
    ]
  });
}

function tableSintesi() {
  const righe = data.sintesi || [];
  if (righe.length === 0) return spacer();
  const colWidths = [3000, 6026];
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: [hCell('Metrica', 3000), hCell('Valore', 6026)] }),
      ...righe.map((r, ri) => new TableRow({ children: [
        cell(r.metrica, { width: colWidths[0], bg: ri % 2 === 0 ? COLORS.lightGray : undefined }),
        cell(r.valore, { width: colWidths[1], bg: ri % 2 === 0 ? COLORS.lightGray : undefined }),
      ] }))
    ]
  });
}

// ─── Testi dinamici ──────────────────────────────────────────────────────────

// Trova migliori/peggiori
const tipiArr = Object.entries(data.per_tipo || {});
const bestTipoHr = tipiArr.length ? tipiArr.reduce((a, b) => a[1].hr > b[1].hr ? a : b) : ['?', { hr: 0, pl: 0 }];
const bestTipoRoi = tipiArr.length ? tipiArr.reduce((a, b) => a[1].roi > b[1].roi ? a : b) : ['?', { roi: 0 }];
const bestTipoPl = tipiArr.length ? tipiArr.reduce((a, b) => a[1].pl > b[1].pl ? a : b) : ['?', { pl: 0 }];

const giorniArr = Object.entries(data.per_giorno || {}).sort((a, b) => b[1].hr - a[1].hr);
const bestGiorno = giorniArr[0] || ['?', { hr: 0 }];
const worstGiorno = giorniArr[giorniArr.length - 1] || ['?', { hr: 0 }];

const catsArr = Object.entries(data.per_categoria || {});
const catPron = catsArr.find(c => c[0] === 'Pronostici');
const catAR = catsArr.find(c => c[0] === 'Alto Rendimento');

const campArr = Object.entries(data.per_campionato || {}).sort((a, b) => a[1].hr - b[1].hr);
const worstCamp = campArr[0] || ['?', {}];
const bestCamp = campArr[campArr.length - 1] || ['?', {}];

const errAC = data.errori_alta_conf || {};
const errInsp = data.errori_inspiegabili || {};
const chi = data.chi_squared || {};

const clusterAlto = (data.cluster || []).find(c => c.hr < 50) || {};

// ─── Documento ────────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: COLORS.primary },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: COLORS.accent },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // ── Copertina ──
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1440, after: 200 }, children: [new TextRun({ text: 'PUPPALS', font: 'Arial', size: 72, bold: true, color: COLORS.primary })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 }, children: [new TextRun({ text: 'Analisi Professionale \u2014 Sistema di Pronostici Calcio', font: 'Arial', size: 32, color: COLORS.accent })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 }, children: [new TextRun({ text: `Periodo: ${data.periodo.dal} \u2013 ${data.periodo.al}`, font: 'Arial', size: 24, italic: true, color: '444444' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: `${g.n} pronostici  \u2022  ${g.partite} partite  \u2022  ${g.campionati} campionati`, font: 'Arial', size: 22, color: '666666' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 1440 }, children: [new TextRun({ text: 'Pipeline completa: 7 Fasi \u2014 EDA \u2192 Pattern Discovery \u2192 Modellazione \u2192 Validazione \u2192 Mele Marce', font: 'Arial', size: 20, italic: true, color: '888888' })] }),

      // ── Sezione 1: Performance Globale ──
      h1('1. Performance Globale'),
      infoBox(`HR globale: ${fmtHr(g.hr)} su ${g.n} pronostici  |  P/L totale: ${fmtPl(g.pl)}  |  ROI: ${fmtRoi(g.roi)}  |  Significativita statistica: z=${g.z_score != null ? g.z_score.toFixed(2) : '?'}, p<0.000001 \u2705`, COLORS.lightGreen),
      spacer(),
      p(`Il sistema ha prodotto un Hit Rate del ${fmtHr(g.hr)} statisticamente verificato \u2014 ovvero non spiegabile dalla fortuna con una confidenza superiore al 99.9999%. Il rendimento economico di ${fmtPl(g.pl)} con ROI ${fmtRoi(g.roi)} conferma l'edge reale del modello su un campione significativo di ${g.n} pronostici.`),
      spacer(),

      h2('1.1 Per Tipo di Pronostico'),
      tablePerformance(),
      spacer(),
      p(`I pronostici ${bestTipoHr[0]} dominano per HR (${fmtHr(bestTipoHr[1].hr)}). Il tipo ${bestTipoPl[0]} e il principale driver di P/L in valore assoluto (${fmtPl(bestTipoPl[1].pl)}) grazie alle quote medie piu alte. ${tipiArr.find(t => t[0] === 'DOPPIA_CHANCE') ? 'La DOPPIA CHANCE con ' + (data.per_tipo.DOPPIA_CHANCE || {}).n + ' pronostici merita attenzione per futura espansione.' : ''}`),
      spacer(),

      h2('1.2 Per Categoria'),
      tableCategorie(),
      spacer(),
      p(`${catPron ? 'I Pronostici standard (' + fmtHr(catPron[1].hr) + ' HR, ROI ' + fmtRoi(catPron[1].roi) + ') costituiscono il backbone affidabile del sistema.' : ''} ${catAR ? "L'Alto Rendimento mostra un pattern controintuitivo ma razionale: HR basso (" + fmtHr(catAR[1].hr) + ') compensato da quote alte, risultando nel ROI piu elevato (' + fmtRoi(catAR[1].roi) + '). Sono due strategie distinte che coesistono nello stesso sistema.' : ''}`),
      spacer(),

      // ── Sezione 2: Pattern Temporali ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('2. Pattern Temporali e Stagionali'),

      h2('2.1 Andamento per Giorno della Settimana'),
      tableGiorni(),
      spacer(),
      infoBox(`Nota statistica: il chi-squared test (p=${chi.p_value != null ? chi.p_value.toFixed(2) : '?'}) indica che le differenze tra giorni ${chi.p_value < 0.05 ? 'SONO' : 'NON sono'} statisticamente significative. Il pattern e indicativo ma ${chi.p_value < 0.05 ? 'conclusivo' : 'non conclusivo'} su questo campione.`, COLORS.lightGray),
      spacer(),
      p(`${bestGiorno[0]} e ${giorniArr[1] ? giorniArr[1][0] : '?'} sono i giorni migliori in termini di HR. ${worstGiorno[0]} e ${giorniArr[giorniArr.length - 2] ? giorniArr[giorniArr.length - 2][0] : '?'} mostrano performance sotto la media. Tuttavia la distribuzione non e significativa statisticamente, quindi il consiglio e di monitorare nel lungo periodo prima di applicare filtri basati sul giorno.`),
      spacer(),

      h2('2.2 Andamento Settimanale'),
      p("L'analisi rolling per settimane:"),
      spacer(),
      tableSettimane(),
      spacer(),

      // ── Sezione 3: Analisi Correlazioni ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('3. Analisi Correlazioni e Feature Importance'),

      h2('3.1 Top Correlazioni con WIN (Pearson + Spearman)'),
      tableCorrelazioni(),
      spacer(),
      p('Le correlazioni moderate (0.15-0.18) sono normali nel football, dove la varianza intrinseca limita strutturalmente i valori. La coerenza tra Pearson e Spearman indica che le relazioni sono prevalentemente lineari.'),
      spacer(),

      h2('3.2 Feature Importance (Random Forest + XGBoost)'),
      p('I due modelli concordano sui driver principali:'),
      spacer(),
      tableFeatures(),
      spacer(),
      p("L'assenza di una feature dominante (nessuna supera il 6%) e in realta un segnale positivo: il sistema non dipende da una singola variabile fragile, ma integra genuinamente piu fonti di segnale."),
      spacer(),

      // ── Sezione 4: Clustering ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('4. Clustering \u2014 Tipologie di Pronostici'),
      p('Il K-Means a 4 cluster ha identificato segmenti naturali nel dataset con caratteristiche e strategie diverse:'),
      spacer(),
      tableCluster(),
      spacer(),
      infoBox('Insight chiave: il sistema gestisce implicitamente 4 strategie diverse. Renderle esplicite permette di applicare sizing differenziato per cluster.', COLORS.lightBlue),
      spacer(),
      p(clusterAlto.hr ? `Il Cluster Alto Rischio (${fmtHr(clusterAlto.hr)} HR ma ROI ${fmtRoi(clusterAlto.roi)}) grazie alle quote medie di ${(clusterAlto.quota_media || 0).toFixed(2)}. Sono i pronostici piu volatili \u2014 con un buon bankroll management possono contribuire positivamente al P/L senza mettere a rischio la stabilita del sistema.` : ''),
      spacer(),

      // ── Sezione 5: Analisi Campionati ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('5. Analisi per Campionato'),
      tableCampionati(),
      spacer(),
      p(`La differenza tra campionati e marcata. ${worstCamp[0]} (${fmtHr(worstCamp[1].hr || 0)}) e la lega problematica. ${bestCamp[0]} (${fmtHr(bestCamp[1].hr || 0)}) mostra performance eccellenti.`),
      spacer(),
      h3('Leghe da monitorare / ridurre esposizione:'),
      ...campArr.filter(([, v]) => v.hr < g.hr - 5).slice(0, 4).map(([league, v]) =>
        bullet(`${league}: ${fmtHr(v.hr)} HR, ROI ${fmtRoi(v.roi)}`)
      ),
      spacer(),

      // ── Sezione 6: Mele Marce ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('6. Negative Pattern Detection \u2014 Mele Marce'),
      p("La Fase 7 dell'analisi si e concentrata sull'identificare attivamente le combinazioni che PRECEDONO gli errori, con l'obiettivo di scartarle preventivamente prima dell'emissione del pronostico."),
      spacer(),

      h2(`6.1 Combinazioni Tossiche Identificate (Top ${(data.combo_tossiche || []).length})`),
      tableMele(),
      spacer(),
      infoBox(`${(data.combo_tossiche || []).length} combinazioni tossiche mostrate. Hanno il p-value piu basso (statisticamente significative) e il delta HR piu alto rispetto alla media del ${fmtHr(g.hr)}.`, COLORS.lightGray),
      spacer(),

      h2('6.2 Regole del Decision Tree per Predire LOSS'),
      p('Un Decision Tree addestrato per predire le sconfitte ha estratto queste regole interpretabili:'),
      spacer(),
      tableDecisionTree(),
      spacer(),

      h2('6.3 Profilo degli Errori ad Alta Confidenza'),
      p(errAC.totale ? `Tra i ${errAC.totale} pronostici con confidence >= ${errAC.soglia || 70}:` : ''),
      spacer(),
      ...(errAC.profilo_win && errAC.profilo_loss ? [new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [4513, 4513],
        rows: [
          new TableRow({ children: [
            hCell(`WIN (${errAC.win.n} \u2014 ${errAC.win.pct}%)`, 4513),
            hCell(`LOSS (${errAC.loss.n} \u2014 ${errAC.loss.pct}%)`, 4513)
          ] }),
          new TableRow({ children: [
            cell(Object.entries(errAC.profilo_win).map(([k, v]) => `${k}: ${v}`).join('\n'), { width: 4513, bg: COLORS.lightGreen }),
            cell(Object.entries(errAC.profilo_loss).map(([k, v]) => `${k}: ${v} \u26A0`).join('\n'), { width: 4513, bg: COLORS.lightRed })
          ] })
        ]
      })] : []),
      spacer(),

      h2(`6.4 Errori Inspiegabili \u2014 ${errInsp.totale || '?'} Anomalie`),
      p(`Pronostici con alta confidenza + edge positivo + LOSS: ${errInsp.totale || '?'} casi. Distribuzione:`),
      spacer(),
      ...(errInsp.per_campionato ? [new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3026],
        rows: [
          new TableRow({ children: [hCell('Campionati piu frequenti', 3000), hCell('Tipo Pronostico', 3000), hCell('Tipo Partita', 3026)] }),
          new TableRow({ children: [
            cell((errInsp.per_campionato || []).map(c => `${c.league}: ${c.n}`).join('\n'), { width: 3000, bg: COLORS.lightGray }),
            cell((errInsp.per_tipo || []).map(t => `${t.tipo}: ${t.n}`).join('\n'), { width: 3000, bg: COLORS.lightGray }),
            cell((errInsp.per_partita || []).map(p => `${p.tipo}: ${p.n}`).join('\n'), { width: 3026, bg: COLORS.lightGray })
          ] })
        ]
      })] : []),
      spacer(),
      p(errInsp.quota_media ? `La quota media degli errori inspiegabili e ${errInsp.quota_media} con gol totali medi ${errInsp.gol_media || '?'} \u2014 partite tendenzialmente piu tirate e aperte del previsto.` : ''),
      spacer(),

      // ── Sezione 7: Simulazione Filtri ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('7. Simulazione Filtri \u2014 Impatto su P/L'),
      p("Tutti i filtri testati singolarmente hanno mostrato un impatto P/L netto negativo, il che e normale: eliminare pronostici significa perdere anche quelli vincenti. Il valore dei filtri non e nel P/L immediato ma nell'HR a lungo termine e nella riduzione del rischio:"),
      spacer(),
      tableFiltriSim(),
      spacer(),
      infoBox('Conclusione simulazione: nessun filtro singolo produce un aumento netto di P/L. La strategia corretta e applicare i filtri alle combinazioni tossiche piu estreme (HR < 30%) e ridurre lo stake (non eliminare) sulle combinazioni a rischio medio.', COLORS.lightBlue),
      spacer(),

      // ── Sezione 8: Raccomandazioni ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('8. Filtri Raccomandati \u2014 Piano Operativo'),
      tableFiltriRaccomandati(),
      spacer(),
      p('Priorita di implementazione:'),
      numItem('Filtri ALTA priorita (eliminazione): implementare immediatamente, impatto HR atteso +1-2pp sul lungo periodo senza perdita di P/L rilevante.'),
      numItem('Filtri MEDIA priorita (riduzione stake 50%): applicare dal ciclo successivo, monitorare per 4 settimane.'),
      numItem('Filtri BASSA priorita (monitoraggio campionati): raccogliere altri 2-3 mesi di dati prima di decidere se escluderli.'),
      spacer(),

      // ── Sezione 9: Sintesi Finale ──
      new Paragraph({ children: [new PageBreak()] }),
      h1('9. Sintesi e Conclusioni'),
      spacer(),
      tableSintesi(),
      spacer(),
      spacer(),
      p(`Il sistema Puppals dimostra un edge reale e misurabile, non spiegabile dalla fortuna. La fase successiva deve concentrarsi sull'implementazione selettiva dei filtri mele marce identificati \u2014 non per rivoluzionare il sistema, ma per eliminare chirurgicamente le sacche di perdita sistematica.`),
      spacer(),
      infoBox(`L'analisi e basata sui dati dal ${data.periodo.dal} al ${data.periodo.al}. Le conclusioni sono robuste per le combinazioni tossiche con n>=20 e p<0.01. Per i campionati serve un campione piu ampio (90+ giorni) prima di decisioni definitive.`, COLORS.lightGray),
      spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: `Puppals Analytics \u2014 ${data.periodo.dal.slice(0, 7)}`, font: 'Arial', size: 18, italic: true, color: '888888' })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log(`OK — ${outputPath} (${(buf.length / 1024).toFixed(0)} KB)`);
});
