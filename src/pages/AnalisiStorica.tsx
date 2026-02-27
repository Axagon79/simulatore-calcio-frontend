import { useState, useEffect, useMemo } from 'react';
import { getTheme, getThemeMode } from '../AppDev/costanti';
import { checkAdmin } from '../permissions';
import {
  commentoGlobale, commentoPerTipo, commentoCategorie,
  commentoGiorni, commentoSettimane, commentoCorrelazioni, commentoFeatures,
  commentoCluster, commentoCampionati,
  commentoMeleMarcePrincipale, commentoDecisionTree, commentoErroriAltaConf, commentoErroriInspiegabili,
  commentoFiltriSim, commentoRaccomandazioni, commentoSintesi, notaStatistica,
} from '../utils/commentiReport';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// --- COLORI TEMA ---
const C = isLight ? {
  bg: '#f0f2f5', card: '#ffffff', cardBorder: 'rgba(0,0,0,0.10)', text: '#1a1a2e',
  textDim: '#5a6377', accent: '#0077cc', success: '#059669', danger: '#dc2626',
  warning: '#d97706', headerBg: 'rgba(0,119,204,0.06)', rowEven: 'rgba(0,0,0,0.02)',
  barBg: 'rgba(0,0,0,0.08)', kpiBg: 'rgba(0,119,204,0.06)', kpiBorder: 'rgba(0,119,204,0.15)',
  selectBg: '#ffffff', selectBorder: 'rgba(0,0,0,0.15)', tagBg: 'rgba(0,0,0,0.05)',
  sectionBg: 'rgba(0,0,0,0.02)', infoBg: 'rgba(0,119,204,0.04)', infoBorder: 'rgba(0,119,204,0.12)',
} : {
  bg: '#05070a', card: 'rgba(25, 28, 45, 0.95)', cardBorder: 'rgba(0, 240, 255, 0.2)',
  text: '#ffffff', textDim: '#8b9bb4', accent: '#00f0ff', success: '#05f9b6',
  danger: '#ff2a6d', warning: '#ff9f43', headerBg: 'rgba(0, 240, 255, 0.06)',
  rowEven: 'rgba(255,255,255,0.015)', barBg: 'rgba(255,255,255,0.08)',
  kpiBg: 'rgba(0, 240, 255, 0.08)', kpiBorder: 'rgba(0, 240, 255, 0.25)',
  selectBg: 'rgba(25, 28, 45, 0.95)', selectBorder: 'rgba(0, 240, 255, 0.3)',
  tagBg: 'rgba(255,255,255,0.06)', sectionBg: 'rgba(255,255,255,0.02)',
  infoBg: 'rgba(0, 240, 255, 0.04)', infoBorder: 'rgba(0, 240, 255, 0.12)',
};

// --- TIPI ---
interface ReportSummary {
  mese: string;
  created_at: string;
  performance: {
    pronostici: number; partite: number; campionati: number;
    hr: number; pl: number; roi: number;
    z_score?: number; p_value?: number;
  };
}

interface FullReport {
  mese: string;
  periodo?: { da: string; a: string };
  created_at: string;
  performance: ReportSummary['performance'];
  per_tipo?: { tipo: string; n: number; hr: number; pl: number; roi: number }[];
  per_categoria?: { categoria: string; n: number; hr: number; pl: number; roi: number }[];
  per_giorno?: { giorno: string; n: number; hr: number; roi: number; pl: number }[];
  per_campionato?: { league: string; n: number; hr: number; pl: number; roi: number }[];
  settimane?: { nome: string; periodo: string; n: number; hr: number; pl: number }[];
  top_correlazioni?: { feature: string; pearson: number; spearman: number }[];
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
  calibrazione?: { fascia: string; n: number; hr_reale: number }[];
  sintesi?: { metrica: string; valore: string }[];
}

// --- HELPER ---
function rateColor(rate: number): string {
  if (rate >= 70) return C.success;
  if (rate >= 55) return C.accent;
  if (rate >= 45) return C.warning;
  return C.danger;
}
function profitColor(v: number): string { return v >= 0 ? C.success : C.danger; }
function formatPl(v: number): string { return (v >= 0 ? '+' : '') + v.toFixed(2) + 'u'; }
function formatRoi(v: number): string { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }

function meseLabel(mese: string): string {
  if (mese === 'globale') return 'Globale';
  const [y, m] = mese.split('-');
  const nomi = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  return `${nomi[parseInt(m)] || m} ${y}`;
}

const giorniIt: Record<string, string> = {
  'Monday': 'Lunedi', 'Tuesday': 'Martedi', 'Wednesday': 'Mercoledi',
  'Thursday': 'Giovedi', 'Friday': 'Venerdi', 'Saturday': 'Sabato', 'Sunday': 'Domenica'
};

// --- COMPONENTI HELPER ---
function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: C.barBg, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${color}88, ${color})`, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: C.kpiBg, border: `1px solid ${C.kpiBorder}`, borderRadius: '12px', padding: '16px', flex: 1, minWidth: '120px', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '800', color, fontFamily: '"Inter", monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children, num }: { children: React.ReactNode; num?: number }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: '700', color: C.accent, marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${C.cardBorder}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {num != null && <span style={{ opacity: 0.5, marginRight: '8px' }}>{num}.</span>}{children}
    </h3>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.infoBg, border: `1px solid ${C.infoBorder}`, borderRadius: '10px', padding: '10px 16px', fontSize: '12px', color: C.textDim, marginTop: '12px' }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>{children}</div>;
}

function CommentBox({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ background: C.infoBg, borderLeft: `4px solid ${C.accent}`, padding: '12px 16px', margin: '12px 0 4px', borderRadius: '0 8px 8px 0' }}>
      <p style={{ margin: 0, fontSize: '13px', color: C.text, lineHeight: 1.7, opacity: 0.9 }}>{text}</p>
    </div>
  );
}

const thStyle = (align: string = 'right') => ({ padding: '10px 12px', textAlign: align as 'left' | 'right', color: C.textDim, fontWeight: '600' as const, fontSize: '11px', textTransform: 'uppercase' as const, borderBottom: `1px solid ${C.cardBorder}` });
const tdStyle = (align: string = 'right') => ({ padding: '10px 12px', textAlign: align as 'left' | 'right' });

// --- COMPONENTE PRINCIPALE ---
interface AnalisiStoricaProps { onBack: () => void; }

export default function AnalisiStorica({ onBack }: AnalisiStoricaProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedMese, setSelectedMese] = useState<string>('');
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile] = useState(window.innerWidth < 768);
  const [downloading, setDownloading] = useState(false);

  const commenti = useMemo(() => {
    if (!report) return null;
    return {
      globale: commentoGlobale(report),
      perTipo: commentoPerTipo(report),
      categorie: commentoCategorie(report),
      giorni: commentoGiorni(report),
      settimane: commentoSettimane(report),
      correlazioni: commentoCorrelazioni(report),
      features: commentoFeatures(report),
      cluster: commentoCluster(report),
      campionati: commentoCampionati(report),
      meleMarcePrincipale: commentoMeleMarcePrincipale(report),
      decisionTree: commentoDecisionTree(report),
      erroriAltaConf: commentoErroriAltaConf(report),
      erroriInspiegabili: commentoErroriInspiegabili(report),
      filtriSim: commentoFiltriSim(report),
      raccomandazioni: commentoRaccomandazioni(report),
      sintesi: commentoSintesi(report),
      nota: notaStatistica(report),
    };
  }, [report]);

  useEffect(() => {
    const admin = checkAdmin();
    setIsAdmin(admin);
    if (!admin) { setLoading(false); return; }
    fetch(`${API_BASE}/analytics/reports`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.reports?.length) {
          setReports(data.reports);
          setSelectedMese(data.reports[0].mese);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedMese) return;
    setReport(null);
    fetch(`${API_BASE}/analytics/report/${selectedMese}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setReport(data.report);
        else setError('Report non trovato');
      })
      .catch(e => setError(e.message));
  }, [selectedMese]);

  async function handleDownload() {
    if (!report) return;
    setDownloading(true);
    try {
      const { generateReport } = await import('../utils/generateDocx');
      const { saveAs } = await import('file-saver');
      const blob = await generateReport(report);
      const nome = report.mese === 'globale' ? 'report_globale.docx' : `report_${meseLabel(report.mese).replace(' ', '_').toLowerCase()}.docx`;
      saveAs(blob, nome);
    } catch (err) {
      console.error('Download error:', err);
      alert('Errore nella generazione del report');
    }
    setDownloading(false);
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.danger, fontSize: '18px', fontWeight: '700' }}>Accesso non autorizzato</div>
      </div>
    );
  }

  const globaleReport = reports.find(r => r.mese === 'globale') || null;
  const compareReport = selectedMese !== 'globale' ? globaleReport : null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Inter", "Segoe UI", sans-serif', padding: isMobile ? '16px' : '24px 40px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${C.cardBorder}`, borderRadius: '10px', color: C.textDim, padding: '8px 14px', cursor: 'pointer', fontSize: '14px', fontFamily: theme.font }}>
          ← Indietro
        </button>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', color: C.accent, margin: 0 }}>Analisi Storica</h1>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {report && (
            <button onClick={handleDownload} disabled={downloading} style={{
              background: C.accent, color: isLight ? '#fff' : '#000', border: 'none', borderRadius: '10px',
              padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: downloading ? 'wait' : 'pointer',
              opacity: downloading ? 0.6 : 1, fontFamily: theme.font
            }}>
              {downloading ? 'Generazione...' : 'Scarica .docx'}
            </button>
          )}
          {reports.length > 0 && (
            <select value={selectedMese} onChange={e => setSelectedMese(e.target.value)} style={{
              padding: '8px 14px', borderRadius: '10px', background: C.selectBg, color: C.text,
              border: `1px solid ${C.selectBorder}`, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: theme.font
            }}>
              {reports.map(r => (
                <option key={r.mese} value={r.mese} style={{ background: C.selectBg, color: C.text }}>{meseLabel(r.mese)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: C.textDim }}>Caricamento report...</div>}
      {error && <div style={{ textAlign: 'center', padding: '60px', color: C.danger }}>Errore: {error}</div>}
      {!loading && !error && reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: C.textDim, background: C.card, borderRadius: '16px', border: `1px solid ${C.cardBorder}` }}>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Nessun report disponibile</div>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>I report appariranno qui dopo la prima esecuzione.</div>
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* === SEZIONE 1: PERFORMANCE GLOBALE === */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <KpiCard label="Hit Rate" value={`${report.performance.hr.toFixed(1)}%`}
              sub={compareReport ? `${(report.performance.hr - compareReport.performance.hr) >= 0 ? '+' : ''}${(report.performance.hr - compareReport.performance.hr).toFixed(1)}pp vs globale` : undefined}
              color={rateColor(report.performance.hr)} />
            <KpiCard label="P/L" value={formatPl(report.performance.pl)}
              sub={compareReport ? `Globale: ${formatPl(compareReport.performance.pl)}` : undefined}
              color={profitColor(report.performance.pl)} />
            <KpiCard label="ROI" value={formatRoi(report.performance.roi)}
              sub={compareReport ? `${(report.performance.roi - compareReport.performance.roi) >= 0 ? '+' : ''}${(report.performance.roi - compareReport.performance.roi).toFixed(1)}pp vs globale` : undefined}
              color={profitColor(report.performance.roi)} />
            <KpiCard label="Pronostici" value={String(report.performance.pronostici)}
              sub={`${report.performance.partite} partite, ${report.performance.campionati} leghe`} color={C.accent} />
          </div>

          {report.performance.z_score != null && (
            <InfoBox>
              z-score: <b style={{ color: C.accent }}>{report.performance.z_score.toFixed(2)}</b>
              {report.performance.p_value != null && (
                <> — p-value: <b style={{ color: report.performance.p_value < 0.05 ? C.success : C.warning }}>
                  {report.performance.p_value < 0.0001 ? '<0.0001' : report.performance.p_value.toFixed(4)}
                </b></>
              )}
              {report.performance.z_score > 2.58 && <span style={{ marginLeft: '8px', color: C.success }}>Statisticamente significativo (99%)</span>}
            </InfoBox>
          )}
          {commenti && <CommentBox text={commenti.globale} />}

          {/* 1.1 Per tipo */}
          {report.per_tipo && report.per_tipo.length > 0 && (
            <Card>
              <SectionTitle num={1}>Performance per Tipo</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Tipo', 'N', 'Hit Rate', 'P/L', 'ROI'].map(h => <th key={h} style={thStyle(h === 'Tipo' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.per_tipo.map((t, i) => (
                    <tr key={t.tipo} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '700' }}><span style={{ background: C.tagBg, padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>{t.tipo}</span></td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{t.n}</td>
                      <td style={tdStyle()}><span style={{ color: rateColor(t.hr), fontWeight: '700' }}>{t.hr.toFixed(1)}%</span><div style={{ marginTop: '4px' }}><ProgressBar value={t.hr} color={rateColor(t.hr)} /></div></td>
                      <td style={{ ...tdStyle(), color: profitColor(t.pl), fontWeight: '600' }}>{formatPl(t.pl)}</td>
                      <td style={{ ...tdStyle(), color: profitColor(t.roi), fontWeight: '600' }}>{formatRoi(t.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.perTipo} />}
            </Card>
          )}

          {/* 1.2 Per categoria */}
          {report.per_categoria && report.per_categoria.length > 0 && (
            <Card>
              <SectionTitle>Pronostici vs Alto Rendimento</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {report.per_categoria.map(cat => (
                  <div key={cat.categoria} style={{ flex: 1, minWidth: '200px', background: C.sectionBg, borderRadius: '12px', padding: '16px', border: `1px solid ${C.cardBorder}` }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.accent, marginBottom: '10px' }}>{cat.categoria}</div>
                    {[{ l: 'N', v: String(cat.n) }, { l: 'HR', v: `${cat.hr.toFixed(1)}%`, c: rateColor(cat.hr) }, { l: 'P/L', v: formatPl(cat.pl), c: profitColor(cat.pl) }, { l: 'ROI', v: formatRoi(cat.roi), c: profitColor(cat.roi) }].map(r => (
                      <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: C.textDim, fontSize: '12px' }}>{r.l}:</span>
                        <span style={{ fontWeight: '600', fontSize: '13px', color: r.c || C.text }}>{r.v}</span>
                      </div>
                    ))}
                    <ProgressBar value={cat.hr} color={rateColor(cat.hr)} />
                  </div>
                ))}
              </div>
              {commenti && <CommentBox text={commenti.categorie} />}
            </Card>
          )}

          {/* === SEZIONE 2: PATTERN TEMPORALI === */}
          {report.per_giorno && report.per_giorno.length > 0 && (
            <Card>
              <SectionTitle num={2}>Pattern Temporali — Per Giorno</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...report.per_giorno].sort((a, b) => b.hr - a.hr).map(g => (
                  <div key={g.giorno} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: C.sectionBg }}>
                    <div style={{ width: '90px', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{giorniIt[g.giorno] || g.giorno}</div>
                    <div style={{ flex: 1 }}><ProgressBar value={g.hr} color={rateColor(g.hr)} /></div>
                    <div style={{ width: '50px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: rateColor(g.hr) }}>{g.hr.toFixed(1)}%</div>
                    <div style={{ width: '30px', textAlign: 'right', fontSize: '11px', color: C.textDim }}>n={g.n}</div>
                    <div style={{ width: '55px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: profitColor(g.roi) }}>{formatRoi(g.roi)}</div>
                  </div>
                ))}
              </div>
              {report.chi_squared && report.chi_squared.p_value != null && (
                <InfoBox>
                  Chi-squared: <b style={{ color: C.accent }}>{report.chi_squared.chi2}</b> — p-value: <b style={{ color: report.chi_squared.p_value < 0.05 ? C.success : C.textDim }}>{report.chi_squared.p_value.toFixed(4)}</b>
                  {report.chi_squared.p_value > 0.05 && <span> — Distribuzione uniforme (nessun giorno statisticamente diverso)</span>}
                </InfoBox>
              )}
              {commenti && <CommentBox text={commenti.giorni} />}
            </Card>
          )}

          {/* 2.2 Settimane */}
          {report.settimane && report.settimane.length > 0 && (
            <Card>
              <SectionTitle>Andamento Settimanale</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Settimana', 'Periodo', 'N', 'HR', 'P/L'].map(h => <th key={h} style={thStyle(h === 'Settimana' || h === 'Periodo' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.settimane.map((s, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '700' }}>{s.nome}</td>
                      <td style={{ ...tdStyle('left'), color: C.textDim, fontSize: '11px' }}>{s.periodo}</td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{s.n}</td>
                      <td style={tdStyle()}><span style={{ color: rateColor(s.hr), fontWeight: '700' }}>{s.hr.toFixed(1)}%</span></td>
                      <td style={{ ...tdStyle(), color: profitColor(s.pl), fontWeight: '600' }}>{formatPl(s.pl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.settimane} />}
            </Card>
          )}

          {/* === SEZIONE 3: CORRELAZIONI E FEATURES === */}
          {report.top_correlazioni && report.top_correlazioni.length > 0 && (
            <Card>
              <SectionTitle num={3}>Correlazioni con WIN</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Feature', 'Pearson', 'Spearman'].map(h => <th key={h} style={thStyle(h === 'Feature' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.top_correlazioni.map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>{c.feature}</td>
                      <td style={{ ...tdStyle(), color: Math.abs(c.pearson) > 0.1 ? C.accent : C.textDim, fontWeight: '600' }}>{c.pearson.toFixed(4)}</td>
                      <td style={{ ...tdStyle(), color: Math.abs(c.spearman) > 0.1 ? C.accent : C.textDim, fontWeight: '600' }}>{c.spearman.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.correlazioni} />}
            </Card>
          )}

          {report.top_features && report.top_features.length > 0 && (
            <Card>
              <SectionTitle>Feature Importance</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Feature', 'Random Forest', 'XGBoost'].map(h => <th key={h} style={thStyle(h === 'Feature' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.top_features.map((f, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>{f.feature}</td>
                      <td style={tdStyle()}><span style={{ color: C.accent, fontWeight: '600' }}>{f.importance_rf.toFixed(4)}</span>
                        <div style={{ marginTop: '4px' }}><ProgressBar value={f.importance_rf} max={report.top_features![0].importance_rf} color={C.accent} /></div></td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{f.importance_xgb.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.features} />}
            </Card>
          )}

          {/* === SEZIONE 4: CLUSTERING === */}
          {report.cluster && report.cluster.length > 0 && (
            <Card>
              <SectionTitle num={4}>Clustering Pronostici</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {report.cluster.map(cl => (
                  <div key={cl.id} style={{ flex: 1, minWidth: '150px', background: C.sectionBg, borderRadius: '12px', padding: '14px', border: `1px solid ${C.cardBorder}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '6px', textTransform: 'uppercase' }}>Cluster {cl.id}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: rateColor(cl.hr), marginBottom: '4px' }}>{cl.hr.toFixed(1)}%</div>
                    <div style={{ fontSize: '11px', color: C.textDim }}>n={cl.n} | Q {cl.quota_media.toFixed(2)}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: profitColor(cl.roi), marginTop: '4px' }}>ROI {formatRoi(cl.roi)}</div>
                  </div>
                ))}
              </div>
              {commenti && <CommentBox text={commenti.cluster} />}
            </Card>
          )}

          {/* === SEZIONE 5: PER CAMPIONATO === */}
          {report.per_campionato && report.per_campionato.length > 0 && (
            <Card>
              <SectionTitle num={5}>Performance per Campionato</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Campionato', 'N', 'Hit Rate', 'P/L', 'ROI', 'Stato'].map(h => <th key={h} style={thStyle(h === 'Campionato' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[...report.per_campionato].sort((a, b) => b.roi - a.roi).map((c, i) => {
                    const stato = c.hr >= 55 && c.roi >= 0 ? { icon: '\u2713', color: C.success } : c.hr < 45 || c.roi < -20 ? { icon: '\u2717', color: C.danger } : { icon: '\u26A0', color: C.warning };
                    return (
                      <tr key={c.league} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                        <td style={{ ...tdStyle('left'), fontWeight: '600', fontSize: '12px' }}>{c.league}</td>
                        <td style={{ ...tdStyle(), color: C.textDim }}>{c.n}</td>
                        <td style={tdStyle()}><span style={{ color: rateColor(c.hr), fontWeight: '700' }}>{c.hr.toFixed(1)}%</span></td>
                        <td style={{ ...tdStyle(), color: profitColor(c.pl), fontWeight: '600' }}>{formatPl(c.pl)}</td>
                        <td style={{ ...tdStyle(), color: profitColor(c.roi), fontWeight: '600' }}>{formatRoi(c.roi)}</td>
                        <td style={tdStyle()}><span style={{ color: stato.color, fontWeight: '800', fontSize: '14px' }}>{stato.icon}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.campionati} />}
            </Card>
          )}

          {/* === SEZIONE 6: NEGATIVE PATTERN — MELE MARCE === */}
          {report.combo_tossiche && report.combo_tossiche.length > 0 && (
            <Card>
              <SectionTitle num={6}>Mele Marce — Combo Tossiche</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Combinazione', 'N', 'HR', 'Delta HR', 'p-value'].map(h => <th key={h} style={thStyle(h === 'Combinazione' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.combo_tossiche.slice(0, 10).map((ct, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '600', maxWidth: isMobile ? '150px' : '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ct.combo}</td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{ct.n}</td>
                      <td style={tdStyle()}><span style={{ color: rateColor(ct.hr), fontWeight: '700' }}>{ct.hr.toFixed(1)}%</span></td>
                      <td style={{ ...tdStyle(), color: C.danger, fontWeight: '600' }}>{ct.delta.toFixed(1)}pp</td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{ct.p_value < 0.001 ? '<0.001' : ct.p_value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.meleMarcePrincipale} />}
            </Card>
          )}

          {/* 6.2 Regole DT */}
          {report.regole_dt && report.regole_dt.length > 0 && (
            <Card>
              <SectionTitle>Regole Decision Tree</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['ID', 'Condizione', 'Esito'].map(h => <th key={h} style={thStyle('left')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.regole_dt.map((rule, i) => {
                    const isObj = typeof rule === 'object';
                    const id = isObj ? rule.id : `R${i + 1}`;
                    const cond = isObj ? rule.condizione : rule;
                    const esito = isObj ? rule.esito : '';
                    return (
                      <tr key={i} style={{ background: `${C.danger}08` }}>
                        <td style={{ ...tdStyle('left'), fontWeight: '700', width: '80px', color: C.danger }}>{id}</td>
                        <td style={{ ...tdStyle('left'), fontFamily: 'monospace', fontSize: '11px' }}>{cond}</td>
                        <td style={{ ...tdStyle('left'), color: C.danger, fontWeight: '600' }}>{esito}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.decisionTree} />}
            </Card>
          )}

          {/* 6.3 Errori alta confidenza */}
          {report.errori_alta_conf && report.errori_alta_conf.totale != null && report.errori_alta_conf.totale > 0 && (
            <Card>
              <SectionTitle>Profilo Errori Alta Confidenza</SectionTitle>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[{ label: 'WIN', data: report.errori_alta_conf.win, profilo: report.errori_alta_conf.profilo_win, color: C.success },
                  { label: 'LOSS', data: report.errori_alta_conf.loss, profilo: report.errori_alta_conf.profilo_loss, color: C.danger }].map(side => (
                  <div key={side.label} style={{ flex: 1, minWidth: '200px', background: C.sectionBg, borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${side.color}` }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: side.color, marginBottom: '8px' }}>{side.label} — {side.data?.n ?? 0} ({side.data?.pct ?? 0}%)</div>
                    {side.profilo && Object.entries(side.profilo).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                        <span style={{ color: C.textDim, fontFamily: 'monospace', fontSize: '11px' }}>{k}</span>
                        <span style={{ fontWeight: '600' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <InfoBox>Soglia confidenza: {report.errori_alta_conf.soglia ?? 65} — Totale: {report.errori_alta_conf.totale} pronostici ad alta confidenza</InfoBox>
              {commenti && <CommentBox text={commenti.erroriAltaConf} />}
            </Card>
          )}

          {/* 6.4 Errori inspiegabili */}
          {report.errori_inspiegabili && report.errori_inspiegabili.totale != null && report.errori_inspiegabili.totale > 0 && (
            <Card>
              <SectionTitle>Errori Inspiegabili</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <KpiCard label="Totale" value={String(report.errori_inspiegabili.totale)} color={C.danger} />
                <KpiCard label="Quota Media" value={report.errori_inspiegabili.quota_media?.toFixed(2) ?? '?'} color={C.warning} />
                {report.errori_inspiegabili.gol_media != null && <KpiCard label="Gol Media" value={report.errori_inspiegabili.gol_media.toFixed(2)} color={C.textDim} />}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {report.errori_inspiegabili.per_campionato && report.errori_inspiegabili.per_campionato.length > 0 && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '11px', color: C.textDim, fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase' }}>Per Campionato</div>
                    {report.errori_inspiegabili.per_campionato.slice(0, 5).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                        <span>{c.league}</span><span style={{ fontWeight: '700', color: C.danger }}>{c.n}</span>
                      </div>
                    ))}
                  </div>
                )}
                {report.errori_inspiegabili.per_tipo && report.errori_inspiegabili.per_tipo.length > 0 && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '11px', color: C.textDim, fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase' }}>Per Tipo</div>
                    {report.errori_inspiegabili.per_tipo.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                        <span>{t.tipo}</span><span style={{ fontWeight: '700', color: C.danger }}>{t.n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {commenti && <CommentBox text={commenti.erroriInspiegabili} />}
            </Card>
          )}

          {/* === SEZIONE 7: FILTRI SIMULAZIONE === */}
          {report.filtri_sim && report.filtri_sim.length > 0 && (
            <Card>
              <SectionTitle num={7}>Simulazione Filtri — Impatto su P/L</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Filtro', 'Eliminati', 'HR Prima', 'HR Dopo', 'Delta HR', 'Delta P/L'].map(h => <th key={h} style={thStyle(h === 'Filtro' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.filtri_sim.map((f, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '600', fontSize: '11px' }}>{f.filtro}</td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{f.eliminati}</td>
                      <td style={tdStyle()}>{f.hr_prima.toFixed(1)}%</td>
                      <td style={tdStyle()}><span style={{ color: rateColor(f.hr_dopo), fontWeight: '600' }}>{f.hr_dopo.toFixed(1)}%</span></td>
                      <td style={{ ...tdStyle(), color: f.hr_delta >= 0 ? C.success : C.danger, fontWeight: '600' }}>{f.hr_delta >= 0 ? '+' : ''}{f.hr_delta.toFixed(1)}pp</td>
                      <td style={{ ...tdStyle(), color: f.pl_delta >= 0 ? C.success : C.danger, fontWeight: '600' }}>{f.pl_delta >= 0 ? '+' : ''}{f.pl_delta.toFixed(2)}u</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.filtriSim} />}
            </Card>
          )}

          {/* === SEZIONE 8: FILTRI RACCOMANDATI === */}
          {report.filtri_raccomandati && report.filtri_raccomandati.length > 0 && (
            <Card>
              <SectionTitle num={8}>Filtri Raccomandati — Piano Operativo</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['#', 'Trigger', 'Azione', 'Priorita', ...(report.filtri_raccomandati.some(f => f.razionale) ? ['Razionale'] : [])].map(h =>
                    <th key={h} style={thStyle(h === '#' || h === 'Priorita' ? 'center' : 'left')}>{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {report.filtri_raccomandati.map((f, i) => {
                    const prioColor = f.priorita === 'ALTA' ? C.danger : f.priorita === 'MEDIA' ? C.warning : C.textDim;
                    const prioStyle = f.priorita === 'ALTA' ? { background: `${C.danger}15` } : {};
                    return (
                      <tr key={i} style={{ ...prioStyle, ...(i % 2 === 0 && !prioStyle.background ? { background: C.rowEven } : {}) }}>
                        <td style={{ ...tdStyle('center'), fontWeight: '700', color: C.textDim }}>{f.id || i + 1}</td>
                        <td style={{ ...tdStyle('left'), fontWeight: '600', maxWidth: '250px' }}>{f.trigger}</td>
                        <td style={tdStyle('left')}>
                          <span style={{
                            background: f.azione.includes('Scarta') ? `${C.danger}22` : `${C.warning}22`,
                            color: f.azione.includes('Scarta') ? C.danger : C.warning,
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700'
                          }}>{f.azione}</span>
                        </td>
                        <td style={{ ...tdStyle('center'), color: prioColor, fontWeight: '700' }}>{f.priorita}</td>
                        {f.razionale !== undefined && <td style={{ ...tdStyle('left'), color: C.textDim, fontSize: '11px' }}>{f.razionale}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {commenti && <CommentBox text={commenti.raccomandazioni} />}
            </Card>
          )}

          {/* === SEZIONE 9: SINTESI E CONCLUSIONI === */}
          {report.sintesi && report.sintesi.length > 0 && (
            <Card>
              <SectionTitle num={9}>Sintesi e Conclusioni</SectionTitle>
              {commenti && <CommentBox text={commenti.sintesi} />}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Metrica', 'Valore'].map(h => <th key={h} style={thStyle('left')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.sintesi.map((s, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ ...tdStyle('left'), fontWeight: '700', color: C.accent }}>{s.metrica}</td>
                      <td style={{ ...tdStyle('left'), fontWeight: '600' }}>{s.valore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ROI CI + Backtesting */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                {report.roi_ci && report.roi_ci.ci_low != null && (
                  <InfoBox>
                    ROI Confidence Interval (95%): <b style={{ color: C.accent }}>{(report.roi_ci.ci_low * 100).toFixed(1)}%</b> — <b style={{ color: C.accent }}>{(report.roi_ci.ci_high * 100).toFixed(1)}%</b>
                    <span style={{ marginLeft: '8px' }}>(medio: {(report.roi_ci.roi_medio * 100).toFixed(1)}%)</span>
                  </InfoBox>
                )}
                {report.backtesting && report.backtesting.cv_media != null && (
                  <InfoBox>
                    Backtesting CV: <b style={{ color: C.accent }}>{(report.backtesting.cv_media * 100).toFixed(1)}%</b>
                    {report.backtesting.cv_std != null && <span> (std: {(report.backtesting.cv_std * 100).toFixed(1)}%)</span>}
                    {report.backtesting.accuracy_train != null && <> — Train: <b>{(report.backtesting.accuracy_train * 100).toFixed(1)}%</b></>}
                    {report.backtesting.accuracy_test != null && <> — Test: <b>{(report.backtesting.accuracy_test * 100).toFixed(1)}%</b></>}
                  </InfoBox>
                )}
              </div>
              {commenti && <CommentBox text={commenti.nota} />}
            </Card>
          )}

          {/* TREND STORICO */}
          {reports.length >= 2 && (
            <Card>
              <SectionTitle>Trend Storico</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ background: C.headerBg }}>
                  {['Mese', 'Pronostici', 'HR', 'P/L', 'ROI'].map(h => <th key={h} style={thStyle(h === 'Mese' ? 'left' : 'right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {reports.filter(r => r.mese !== 'globale').map((r, i) => (
                    <tr key={r.mese} style={{
                      background: r.mese === selectedMese ? `${C.accent}11` : i % 2 === 0 ? C.rowEven : 'transparent',
                      fontWeight: r.mese === selectedMese ? '700' : '400', cursor: 'pointer'
                    }} onClick={() => setSelectedMese(r.mese)}>
                      <td style={tdStyle('left')}>
                        {meseLabel(r.mese)}
                        {r.mese === selectedMese && <span style={{ color: C.accent, marginLeft: '6px', fontSize: '10px' }}>●</span>}
                      </td>
                      <td style={{ ...tdStyle(), color: C.textDim }}>{r.performance.pronostici}</td>
                      <td style={tdStyle()}><span style={{ color: rateColor(r.performance.hr), fontWeight: '700' }}>{r.performance.hr.toFixed(1)}%</span>
                        <div style={{ marginTop: '4px' }}><ProgressBar value={r.performance.hr} color={rateColor(r.performance.hr)} /></div></td>
                      <td style={{ ...tdStyle(), color: profitColor(r.performance.pl), fontWeight: '600' }}>{formatPl(r.performance.pl)}</td>
                      <td style={{ ...tdStyle(), color: profitColor(r.performance.roi), fontWeight: '600' }}>{formatRoi(r.performance.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* FOOTER */}
          <div style={{ textAlign: 'center', padding: '20px', color: C.textDim, fontSize: '11px' }}>
            Puppals Analytics — {meseLabel(report.mese)}
            {report.periodo && <span> — Periodo: {report.periodo.da} / {report.periodo.a}</span>}
            {report.created_at && <span> — Generato il {new Date(report.created_at).toLocaleDateString('it-IT')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
