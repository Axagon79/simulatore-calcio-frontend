import { useState, useEffect } from 'react';
import { getTheme, getThemeMode } from '../AppDev/costanti';
import { checkAdmin } from '../permissions';

const theme = getTheme();
const isLight = getThemeMode() === 'light';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5001/puppals-456c7/us-central1/api'
  : 'https://api-6b34yfzjia-uc.a.run.app';

// --- COLORI TEMA ---
const C = isLight ? {
  bg: '#f0f2f5',
  card: '#ffffff',
  cardBorder: 'rgba(0,0,0,0.10)',
  text: '#1a1a2e',
  textDim: '#5a6377',
  accent: '#0077cc',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  headerBg: 'rgba(0,119,204,0.06)',
  rowEven: 'rgba(0,0,0,0.02)',
  barBg: 'rgba(0,0,0,0.08)',
  kpiBg: 'rgba(0,119,204,0.06)',
  kpiBorder: 'rgba(0,119,204,0.15)',
  selectBg: '#ffffff',
  selectBorder: 'rgba(0,0,0,0.15)',
  tagBg: 'rgba(0,0,0,0.05)',
  sectionBg: 'rgba(0,0,0,0.02)',
} : {
  bg: '#05070a',
  card: 'rgba(25, 28, 45, 0.95)',
  cardBorder: 'rgba(0, 240, 255, 0.2)',
  text: '#ffffff',
  textDim: '#8b9bb4',
  accent: '#00f0ff',
  success: '#05f9b6',
  danger: '#ff2a6d',
  warning: '#ff9f43',
  headerBg: 'rgba(0, 240, 255, 0.06)',
  rowEven: 'rgba(255,255,255,0.015)',
  barBg: 'rgba(255,255,255,0.08)',
  kpiBg: 'rgba(0, 240, 255, 0.08)',
  kpiBorder: 'rgba(0, 240, 255, 0.25)',
  selectBg: 'rgba(25, 28, 45, 0.95)',
  selectBorder: 'rgba(0, 240, 255, 0.3)',
  tagBg: 'rgba(255,255,255,0.06)',
  sectionBg: 'rgba(255,255,255,0.02)',
};

// --- TIPI ---
interface ReportSummary {
  mese: string;
  created_at: string;
  performance: {
    pronostici: number;
    partite: number;
    campionati: number;
    hr: number;
    pl: number;
    roi: number;
    z_score?: number;
    p_value?: number;
  };
}

interface PerTipo {
  tipo: string;
  n: number;
  hr: number;
  pl: number;
  roi: number;
}

interface PerCategoria {
  categoria: string;
  n: number;
  hr: number;
  pl: number;
  roi: number;
}

interface PerGiorno {
  giorno: string;
  n: number;
  hr: number;
  roi: number;
}

interface PerCampionato {
  league: string;
  n: number;
  hr: number;
  roi: number;
}

interface ComboTossica {
  combo: string;
  n: number;
  hr: number;
  delta: number;
  p_value: number;
}

interface FullReport {
  mese: string;
  periodo?: { da: string; a: string };
  created_at: string;
  performance: ReportSummary['performance'];
  per_tipo?: PerTipo[];
  per_categoria?: PerCategoria[];
  per_giorno?: PerGiorno[];
  per_campionato?: PerCampionato[];
  combo_tossiche?: ComboTossica[];
  regole_dt?: string[];
  filtri_raccomandati?: { trigger: string; azione: string; priorita: string }[];
  cluster?: { id: number; n: number; hr: number; quota_media: number; roi: number }[];
}

// --- HELPER ---
function rateColor(rate: number): string {
  if (rate >= 70) return C.success;
  if (rate >= 55) return C.accent;
  if (rate >= 45) return C.warning;
  return C.danger;
}

function profitColor(v: number): string {
  return v >= 0 ? C.success : C.danger;
}

function formatPl(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + 'u';
}

function formatRoi(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}

function meseLabel(mese: string): string {
  if (mese === 'globale') return 'Globale';
  const [y, m] = mese.split('-');
  const nomi = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  return `${nomi[parseInt(m)] || m} ${y}`;
}

// --- COMPONENTI HELPER ---
function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: C.barBg, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: '4px',
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        transition: 'width 0.5s ease'
      }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: C.kpiBg, border: `1px solid ${C.kpiBorder}`, borderRadius: '12px',
      padding: '16px', flex: 1, minWidth: '120px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '800', color, fontFamily: '"Inter", monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: C.textDim, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: '15px', fontWeight: '700', color: C.accent, marginBottom: '12px',
      paddingBottom: '8px', borderBottom: `1px solid ${C.cardBorder}`,
      textTransform: 'uppercase', letterSpacing: '0.5px'
    }}>{children}</h3>
  );
}

// --- COMPONENTE PRINCIPALE ---
interface AnalisiStoricaProps {
  onBack: () => void;
}

export default function AnalisiStorica({ onBack }: AnalisiStoricaProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedMese, setSelectedMese] = useState<string>('');
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile] = useState(window.innerWidth < 768);

  // Admin check
  useEffect(() => {
    const admin = checkAdmin();
    setIsAdmin(admin);
    if (!admin) {
      setLoading(false);
      return;
    }
    // Carica lista report
    fetch(`${API_BASE}/analytics/reports`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.reports?.length) {
          setReports(data.reports);
          setSelectedMese(data.reports[0].mese); // Ultimo mese
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Carica dettaglio quando cambia mese
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

  // Non admin
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.danger, fontSize: '18px', fontWeight: '700' }}>Accesso non autorizzato</div>
      </div>
    );
  }

  // Delta: mese selezionato vs Globale (se selezionato Globale → nessun delta)
  const globaleReport = reports.find(r => r.mese === 'globale') || null;
  const compareReport = selectedMese !== 'globale' ? globaleReport : null;

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      padding: isMobile ? '16px' : '24px 40px'
    }}>
      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: `1px solid ${C.cardBorder}`, borderRadius: '10px',
          color: C.textDim, padding: '8px 14px', cursor: 'pointer', fontSize: '14px',
          fontFamily: theme.font
        }}>
          ← Indietro
        </button>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', color: C.accent, margin: 0 }}>
          Analisi Storica
        </h1>

        {/* SELETTORE MESE */}
        {reports.length > 0 && (
          <select
            value={selectedMese}
            onChange={e => setSelectedMese(e.target.value)}
            style={{
              marginLeft: 'auto', padding: '8px 14px', borderRadius: '10px',
              background: C.selectBg, color: C.text, border: `1px solid ${C.selectBorder}`,
              fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: theme.font
            }}
          >
            {reports.map(r => (
              <option key={r.mese} value={r.mese} style={{ background: C.selectBg, color: C.text }}>
                {meseLabel(r.mese)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* LOADING / ERROR */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: C.textDim }}>
          Caricamento report...
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: '60px', color: C.danger }}>
          Errore: {error}
        </div>
      )}

      {/* NESSUN REPORT */}
      {!loading && !error && reports.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px', color: C.textDim,
          background: C.card, borderRadius: '16px', border: `1px solid ${C.cardBorder}`
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Nessun report disponibile</div>
          <div style={{ fontSize: '13px', marginTop: '8px' }}>I report mensili appariranno qui dopo la prima esecuzione.</div>
        </div>
      )}

      {/* CONTENUTO REPORT */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* KPI TOP */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <KpiCard
              label="Hit Rate"
              value={`${report.performance.hr.toFixed(1)}%`}
              sub={compareReport ? `${(report.performance.hr - compareReport.performance.hr) >= 0 ? '+' : ''}${(report.performance.hr - compareReport.performance.hr).toFixed(1)}pp vs globale` : undefined}
              color={rateColor(report.performance.hr)}
            />
            <KpiCard
              label="P/L"
              value={formatPl(report.performance.pl)}
              sub={compareReport ? `Globale: ${formatPl(compareReport.performance.pl)}` : undefined}
              color={profitColor(report.performance.pl)}
            />
            <KpiCard
              label="ROI"
              value={formatRoi(report.performance.roi)}
              sub={compareReport ? `${(report.performance.roi - compareReport.performance.roi) >= 0 ? '+' : ''}${(report.performance.roi - compareReport.performance.roi).toFixed(1)}pp vs globale` : undefined}
              color={profitColor(report.performance.roi)}
            />
            <KpiCard
              label="Pronostici"
              value={String(report.performance.pronostici)}
              sub={`${report.performance.partite} partite, ${report.performance.campionati} leghe`}
              color={C.accent}
            />
          </div>

          {/* Z-SCORE */}
          {report.performance.z_score != null && (
            <div style={{
              background: C.kpiBg, border: `1px solid ${C.kpiBorder}`, borderRadius: '10px',
              padding: '10px 16px', fontSize: '12px', color: C.textDim, textAlign: 'center'
            }}>
              z-score: <b style={{ color: C.accent }}>{report.performance.z_score.toFixed(2)}</b>
              {report.performance.p_value != null && (
                <> — p-value: <b style={{ color: report.performance.p_value < 0.05 ? C.success : C.warning }}>
                  {report.performance.p_value < 0.0001 ? '<0.0001' : report.performance.p_value.toFixed(4)}
                </b></>
              )}
              {report.performance.z_score > 2.58 && (
                <span style={{ marginLeft: '8px', color: C.success }}>Statisticamente significativo (99%)</span>
              )}
            </div>
          )}

          {/* PER TIPO */}
          {report.per_tipo && report.per_tipo.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Performance per Tipo</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: C.headerBg }}>
                    {['Tipo', 'N', 'Hit Rate', 'P/L', 'ROI'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Tipo' ? 'left' : 'right', color: C.textDim, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${C.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.per_tipo.map((t, i) => (
                    <tr key={t.tipo} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '700' }}>
                        <span style={{ background: C.tagBg, padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>{t.tipo}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textDim }}>{t.n}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ color: rateColor(t.hr), fontWeight: '700' }}>{t.hr.toFixed(1)}%</span>
                        <div style={{ marginTop: '4px' }}><ProgressBar value={t.hr} color={rateColor(t.hr)} /></div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: profitColor(t.pl), fontWeight: '600' }}>{formatPl(t.pl)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: profitColor(t.roi), fontWeight: '600' }}>{formatRoi(t.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PER CATEGORIA */}
          {report.per_categoria && report.per_categoria.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Pronostici vs Alto Rendimento</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {report.per_categoria.map(cat => (
                  <div key={cat.categoria} style={{
                    flex: 1, minWidth: '200px', background: C.sectionBg, borderRadius: '12px',
                    padding: '16px', border: `1px solid ${C.cardBorder}`
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.accent, marginBottom: '10px' }}>{cat.categoria}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: C.textDim, fontSize: '12px' }}>N:</span>
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{cat.n}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: C.textDim, fontSize: '12px' }}>HR:</span>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: rateColor(cat.hr) }}>{cat.hr.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={cat.hr} color={rateColor(cat.hr)} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ color: C.textDim, fontSize: '12px' }}>P/L:</span>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: profitColor(cat.pl) }}>{formatPl(cat.pl)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ color: C.textDim, fontSize: '12px' }}>ROI:</span>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: profitColor(cat.roi) }}>{formatRoi(cat.roi)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PER GIORNO */}
          {report.per_giorno && report.per_giorno.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Performance per Giorno</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...report.per_giorno].sort((a, b) => b.hr - a.hr).map(g => {
                  const giorniIt: Record<string, string> = {
                    'Monday': 'Lunedi', 'Tuesday': 'Martedi', 'Wednesday': 'Mercoledi',
                    'Thursday': 'Giovedi', 'Friday': 'Venerdi', 'Saturday': 'Sabato', 'Sunday': 'Domenica'
                  };
                  return (
                    <div key={g.giorno} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '8px 12px', borderRadius: '8px', background: C.sectionBg
                    }}>
                      <div style={{ width: '90px', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                        {giorniIt[g.giorno] || g.giorno}
                      </div>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={g.hr} color={rateColor(g.hr)} />
                      </div>
                      <div style={{ width: '50px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: rateColor(g.hr) }}>
                        {g.hr.toFixed(1)}%
                      </div>
                      <div style={{ width: '30px', textAlign: 'right', fontSize: '11px', color: C.textDim }}>
                        n={g.n}
                      </div>
                      <div style={{ width: '55px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: profitColor(g.roi) }}>
                        {formatRoi(g.roi)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PER CAMPIONATO */}
          {report.per_campionato && report.per_campionato.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Performance per Campionato</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: C.headerBg }}>
                    {['Campionato', 'N', 'Hit Rate', 'ROI', 'Stato'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Campionato' ? 'left' : 'right', color: C.textDim, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${C.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...report.per_campionato].sort((a, b) => b.roi - a.roi).map((c, i) => {
                    const stato = c.hr >= 55 && c.roi >= 0 ? { icon: '✓', color: C.success }
                      : c.hr < 45 || c.roi < -20 ? { icon: '✗', color: C.danger }
                      : { icon: '⚠', color: C.warning };
                    return (
                      <tr key={c.league} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '600', fontSize: '12px' }}>{c.league}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textDim }}>{c.n}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ color: rateColor(c.hr), fontWeight: '700' }}>{c.hr.toFixed(1)}%</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: profitColor(c.roi), fontWeight: '600' }}>{formatRoi(c.roi)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ color: stato.color, fontWeight: '800', fontSize: '14px' }}>{stato.icon}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CLUSTER */}
          {report.cluster && report.cluster.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Clustering Pronostici</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {report.cluster.map(cl => (
                  <div key={cl.id} style={{
                    flex: 1, minWidth: '150px', background: C.sectionBg, borderRadius: '12px',
                    padding: '14px', border: `1px solid ${C.cardBorder}`, textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '6px', textTransform: 'uppercase' }}>Cluster {cl.id}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: rateColor(cl.hr), marginBottom: '4px' }}>{cl.hr.toFixed(1)}%</div>
                    <div style={{ fontSize: '11px', color: C.textDim }}>n={cl.n} | Q {cl.quota_media.toFixed(2)}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: profitColor(cl.roi), marginTop: '4px' }}>ROI {formatRoi(cl.roi)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MELE MARCE */}
          {report.combo_tossiche && report.combo_tossiche.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Mele Marce — Combo Tossiche</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: C.headerBg }}>
                    {['Combinazione', 'N', 'HR', 'Delta HR', 'p-value'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Combinazione' ? 'left' : 'right', color: C.textDim, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', borderBottom: `1px solid ${C.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.combo_tossiche.slice(0, 10).map((ct, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                      <td style={{ padding: '8px 10px', fontWeight: '600', maxWidth: isMobile ? '150px' : '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ct.combo}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.textDim }}>{ct.n}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: rateColor(ct.hr), fontWeight: '700' }}>{ct.hr.toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.danger, fontWeight: '600' }}>{ct.delta.toFixed(1)}pp</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: C.textDim }}>{ct.p_value < 0.001 ? '<0.001' : ct.p_value.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* REGOLE DECISION TREE */}
          {report.regole_dt && report.regole_dt.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Regole Decision Tree</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.regole_dt.map((rule, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: '8px', background: C.sectionBg,
                    border: `1px solid ${C.cardBorder}`, fontSize: '12px', fontFamily: 'monospace',
                    color: rule.toUpperCase().includes('LOSS') ? C.danger : C.success,
                    lineHeight: '1.5'
                  }}>
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FILTRI RACCOMANDATI */}
          {report.filtri_raccomandati && report.filtri_raccomandati.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Filtri Raccomandati</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: C.headerBg }}>
                    {['Trigger', 'Azione', 'Priorita'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textDim, fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', borderBottom: `1px solid ${C.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.filtri_raccomandati.map((f, i) => {
                    const prioColor = f.priorita === 'ALTA' ? C.danger : f.priorita === 'MEDIA' ? C.warning : C.textDim;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? C.rowEven : 'transparent' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '600' }}>{f.trigger}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            background: f.azione === 'Scarta' ? `${C.danger}22` : `${C.warning}22`,
                            color: f.azione === 'Scarta' ? C.danger : C.warning,
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700'
                          }}>{f.azione}</span>
                        </td>
                        <td style={{ padding: '8px 10px', color: prioColor, fontWeight: '700' }}>{f.priorita}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TREND MESE SU MESE */}
          {reports.length >= 2 && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: '16px', padding: '20px' }}>
              <SectionTitle>Trend Storico</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: C.headerBg }}>
                    {['Mese', 'Pronostici', 'HR', 'P/L', 'ROI'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Mese' ? 'left' : 'right', color: C.textDim, fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${C.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={r.mese} style={{
                      background: r.mese === selectedMese ? `${C.accent}11` : i % 2 === 0 ? C.rowEven : 'transparent',
                      fontWeight: r.mese === selectedMese ? '700' : '400'
                    }}>
                      <td style={{ padding: '10px 12px' }}>
                        {meseLabel(r.mese)}
                        {r.mese === selectedMese && <span style={{ color: C.accent, marginLeft: '6px', fontSize: '10px' }}>●</span>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textDim }}>{r.performance.pronostici}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ color: rateColor(r.performance.hr), fontWeight: '700' }}>{r.performance.hr.toFixed(1)}%</span>
                        <div style={{ marginTop: '4px' }}><ProgressBar value={r.performance.hr} color={rateColor(r.performance.hr)} /></div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: profitColor(r.performance.pl), fontWeight: '600' }}>{formatPl(r.performance.pl)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: profitColor(r.performance.roi), fontWeight: '600' }}>{formatRoi(r.performance.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ textAlign: 'center', padding: '20px', color: C.textDim, fontSize: '11px' }}>
            Puppals Analytics — {meseLabel(report.mese)}
            {report.created_at && (
              <span> — Generato il {new Date(report.created_at).toLocaleDateString('it-IT')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
