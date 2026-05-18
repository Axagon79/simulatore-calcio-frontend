import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getThemeMode, API_BASE } from '../AppDev/costanti';
import ScoutArticle from '../components/ScoutArticle';

const isLight = getThemeMode() === 'light';

const c = {
  bg: isLight ? '#f0f2f5' : '#0a0b0f',
  bg2: isLight ? '#ffffff' : '#0d0f15',
  bg3: isLight ? '#e8eaef' : '#11141c',
  line: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  lineStrong: isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.14)',
  text: isLight ? '#111827' : 'rgba(255,255,255,0.92)',
  textDim: isLight ? '#6b7280' : 'rgba(255,255,255,0.55)',
  textFaint: isLight ? '#9ca3af' : 'rgba(255,255,255,0.30)',
  cyan: isLight ? '#0891b2' : '#22d3ee',
  cyanInk: isLight ? '#ffffff' : '#04141a',
  green: isLight ? '#16a34a' : '#4ade80',
  yellow: isLight ? '#ca8a04' : '#facc15',
  red: isLight ? '#dc2626' : '#ef4444',
  pronBarBg: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
  crestShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.10)' : 'inset 0 0 0 1px rgba(255,255,255,0.18)',
  posterOverlay: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
};

const FONT_SANS = '"Inter","Segoe UI",system-ui,sans-serif';
const FONT_MONO = '"JetBrains Mono","Consolas",ui-monospace,monospace';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const GIORNI = ['dom','lun','mar','mer','gio','ven','sab'];

function crestGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const palette: Array<[string, string]> = [
    ['#ff7373', '#c81919'],
    ['#6b7280', '#0a0b0f'],
    ['#f87171', '#991b1b'],
    ['#60a5fa', '#1e40af'],
    ['#93c5fd', '#1e3a8a'],
    ['#38bdf8', '#0369a1'],
    ['#4ade80', '#166534'],
    ['#fbbf24', '#b45309'],
    ['#a78bfa', '#5b21b6'],
    ['#f472b6', '#9d174d'],
  ];
  const p = palette[Math.abs(h) % palette.length];
  return `radial-gradient(circle at 35% 30%, ${p[0]}, ${p[1]} 70%)`;
}
function crestLabel(name: string): string {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

interface NewsArticoloProps {
  onBack?: () => void;
}

interface MatchData {
  home: string;
  away: string;
  date: string;
  match_time?: string;
  league?: string;
  pronostici?: Array<{ tipo?: string; pronostico?: string; confidence?: number; quota?: number | null; source?: string }>;
  scout_lite?: { decisione?: string; segno?: any; gol?: any; scout_text?: string; computed_at?: string };
  scout_deep?: { decisione?: string; segno?: any; gol?: any; scout_text?: string; computed_at?: string };
}

interface ApiResp {
  success?: boolean;
  predictions?: MatchData[];
}

export default function NewsArticolo({ onBack }: NewsArticoloProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const home = searchParams.get('home') || '';
  const away = searchParams.get('away') || '';
  const date = searchParams.get('date') || '';
  const paese = searchParams.get('paese') || '';
  const lega = searchParams.get('lega') || '';

  const [match, setMatch] = useState<MatchData | null>(null);
  const [dayMatches, setDayMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!home || !away || !date) {
      setError('Parametri mancanti (home/away/date)');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/simulation/sistema-z-predictions?date=${date}`)
      .then(r => r.json())
      .then((data: ApiResp) => {
        if (cancelled) return;
        const preds = Array.isArray(data?.predictions) ? data.predictions : [];
        setDayMatches(preds);
        const found = preds.find(p => p.home === home && p.away === away);
        if (!found) {
          setError(`Articolo non trovato per ${home} – ${away}`);
        } else {
          setMatch(found);
        }
      })
      .catch(err => { if (!cancelled) setError(err?.message || 'Errore di rete'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [home, away, date]);

  // Navigazione prev/next rispettando filtri attivi (paese/lega via URL)
  const { prev, next } = useMemo(() => {
    if (!match || dayMatches.length === 0) return { prev: null, next: null };
    // Per ora applico solo l'ordinamento cronologico; il filtro paese/lega lato home gia' filtra,
    // qui lavoriamo sull'array completo del giorno.
    const sorted = [...dayMatches].sort((a, b) => (a.match_time || '').localeCompare(b.match_time || ''));
    const idx = sorted.findIndex(p => p.home === match.home && p.away === match.away);
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [match, dayMatches]);

  const effort: 'DEEP' | 'LITE' = match?.scout_deep?.scout_text ? 'DEEP' : 'LITE';
  const scoutText = match?.scout_deep?.scout_text || match?.scout_lite?.scout_text || '';
  const scoutTs = match?.scout_deep?.computed_at || match?.scout_lite?.computed_at || '';

  // Best tip
  const topTip = useMemo(() => {
    if (!match?.pronostici || match.pronostici.length === 0) return null;
    const sorted = [...match.pronostici].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const top = sorted[0];
    if (!top.pronostico || top.pronostico === 'NO BET') return null;
    return top;
  }, [match]);

  const goHome = () => {
    const p = new URLSearchParams();
    if (paese) p.set('paese', paese);
    if (lega) p.set('lega', lega);
    const qs = p.toString();
    navigate(`/news${qs ? '?' + qs : ''}`);
  };
  const openOther = (m: MatchData) => {
    const p = new URLSearchParams({ home: m.home, away: m.away, date: m.date });
    if (paese) p.set('paese', paese);
    if (lega) p.set('lega', lega);
    navigate(`/news/articolo?${p.toString()}`);
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const todayLabel = `${GIORNI[now.getDay()]} ${now.getDate()} ${MESI[now.getMonth()]}`;

  const pubStr = useMemo(() => {
    if (!scoutTs) return '';
    try {
      const d = new Date(scoutTs);
      return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())} CEST`;
    } catch { return ''; }
  }, [scoutTs]);

  const readingMin = useMemo(() => {
    if (!scoutText) return 0;
    return Math.max(1, Math.round(scoutText.length / 1100));
  }, [scoutText]);

  const wordCount = useMemo(() => scoutText.split(/\s+/).filter(Boolean).length, [scoutText]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: c.bg,
      fontFamily: FONT_SANS,
      fontSize: 15, lineHeight: 1.55, color: c.text,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* TOP BAR compressa */}
      <header style={{
        borderBottom: `1px solid ${c.line}`, background: c.bg,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '12px 28px',
          display: 'grid', gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center', gap: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack || goHome} style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg,#22d3ee 0%, #0ea5b7 100%)',
              display: 'grid', placeItems: 'center', color: '#04141a',
              fontWeight: 700, fontFamily: FONT_MONO, fontSize: 13,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
              border: 'none', cursor: 'pointer',
            }}>A</button>
            <div style={{ fontWeight: 600, letterSpacing: '-0.01em', fontSize: 14, lineHeight: 1.1 }}>
              AI<span style={{ color: c.cyan }}>·</span>Simulator <em style={{ fontStyle: 'normal', color: c.textFaint, fontWeight: 400, marginLeft: 4 }}>/ News</em>
            </div>
          </div>
          <div style={{
            justifySelf: 'center', display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: c.textDim,
          }}>
            <a onClick={goHome} style={{ color: c.textDim, cursor: 'pointer' }}>Notizie</a>
            {match?.league && (
              <>
                <span style={{ color: c.textFaint }}>/</span>
                <b style={{ color: c.text, fontWeight: 500 }}>{match.league}</b>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: c.textDim, fontSize: 12 }}>
            <span>{todayLabel}</span>
            <span style={{ fontFamily: FONT_MONO, color: c.text }}>{clockStr}</span>
          </div>
        </div>
      </header>

      {/* Stati di caricamento/errore */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '120px 20px', color: c.textDim }}>
          Caricamento articolo…
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '120px 20px', color: c.red }}>
          {error}
        </div>
      )}

      {!loading && !error && match && (
        <>
          {/* HEADER ARTICOLO */}
          <section style={{
            maxWidth: 1280, margin: '0 auto', padding: '36px 28px 0',
          }}>
            <a onClick={goHome} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: c.textDim, marginBottom: 24,
              cursor: 'pointer',
            }}>← Torna alle notizie di oggi</a>
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18,
              fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: c.textFaint, flexWrap: 'wrap',
            }}>
              <span style={{ color: c.textDim }}>{match.league}</span>
              <span style={{ color: c.textFaint }}>·</span>
              <span style={{
                color: effort === 'DEEP' ? c.green : c.yellow,
                border: '1px solid currentColor', padding: '3px 8px', borderRadius: 4,
                fontWeight: 600,
              }}>{effort}</span>
            </div>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 52px)', lineHeight: 1.05,
              letterSpacing: '-0.028em', margin: '0 0 18px',
              fontWeight: 600, maxWidth: 820,
            }}>
              {match.home} vs {match.away}: {topTip ? `pronostico ${topTip.pronostico} con confidenza ${(topTip.confidence || 0).toFixed(0)}%` : 'analisi pre-partita'}
            </h1>
            <p style={{
              fontSize: 19, color: c.textDim, lineHeight: 1.55,
              margin: '0 0 26px', maxWidth: 760, fontWeight: 400,
            }}>
              Analisi {effort === 'DEEP' ? 'approfondita' : 'preliminare'} della partita prodotta dalla redazione AI di AI Simulator a partire da conferenze stampa, statistiche e copertura locale.
            </p>
            <div style={{
              display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
              fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: c.textFaint,
              padding: '14px 0', borderTop: `1px solid ${c.line}`, borderBottom: `1px solid ${c.line}`,
            }}>
              <span><b style={{ color: c.textDim, fontWeight: 500 }}>Firmato</b> <span style={{ color: c.text }}>La Redazione di AI Simulator</span></span>
              {pubStr && (
                <>
                  <span style={{ color: c.textFaint }}>·</span>
                  <span>Pub. <b style={{ color: c.textDim, fontWeight: 500 }}>{pubStr}</b></span>
                </>
              )}
              <span style={{ color: c.textFaint }}>·</span>
              <span><b style={{ color: c.textDim, fontWeight: 500 }}>{readingMin} min</b> di lettura</span>
              <span style={{ color: c.textFaint }}>·</span>
              <span><b style={{ color: c.textDim, fontWeight: 500 }}>{wordCount.toLocaleString('it-IT')}</b> parole</span>
            </div>
          </section>

          {/* POSTER PRE-PARTITA */}
          <section style={{ maxWidth: 1280, margin: '32px auto 0', padding: '0 28px' }}>
            <div style={{
              border: `1px solid ${c.line}`, borderRadius: 14, overflow: 'hidden',
              background: `
                radial-gradient(600px 240px at 15% 50%, rgba(239,68,68,0.10), transparent 70%),
                radial-gradient(600px 240px at 85% 50%, rgba(75,85,99,0.18), transparent 70%),
                ${c.posterOverlay},
                ${c.bg2}
              `,
              padding: '44px 36px',
              display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 36, alignItems: 'center',
            }} className="poster-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 38, color: '#0a0b0f',
                  boxShadow: `${c.crestShadow}, 0 8px 30px rgba(0,0,0,0.25)`,
                  background: crestGradient(match.home),
                  flex: 'none',
                }}>{crestLabel(match.home)}</div>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{match.home}</div>
                </div>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '0 20px',
                borderLeft: `1px solid ${c.line}`, borderRight: `1px solid ${c.line}`,
                minWidth: 160,
              }}>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 54, fontWeight: 600, color: c.text,
                  letterSpacing: '-0.04em', lineHeight: 1,
                }}>{match.match_time || '—'}</div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 11, color: c.textFaint,
                  letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 8, textAlign: 'center',
                }}>
                  Kickoff · <b style={{ color: c.textDim, fontWeight: 500 }}>{date}</b>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexDirection: 'row-reverse', textAlign: 'right' as const }}>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 38, color: '#0a0b0f',
                  boxShadow: `${c.crestShadow}, 0 8px 30px rgba(0,0,0,0.25)`,
                  background: crestGradient(match.away),
                  flex: 'none',
                }}>{crestLabel(match.away)}</div>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{match.away}</div>
                </div>
              </div>
            </div>
          </section>

          {/* LAYOUT: body + sidecar */}
          <div style={{
            maxWidth: 1280, margin: '0 auto', padding: '48px 28px 60px',
            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 60,
            alignItems: 'start',
          }} className="article-layout">

            <article style={{ minWidth: 0, maxWidth: 760 }}>
              {scoutText ? (
                <ScoutArticle text={scoutText} />
              ) : (
                <div style={{ color: c.textDim, fontStyle: 'italic' }}>
                  Articolo non disponibile per questa partita.
                </div>
              )}
            </article>

            {/* SIDECAR */}
            <aside style={{
              position: 'sticky', top: 88,
              display: 'flex', flexDirection: 'column', gap: 18,
            }} className="article-sidecar">
              {topTip && (
                <div style={{
                  background: c.bg2, border: `1px solid ${c.line}`, borderRadius: 12, padding: 22,
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: c.textFaint,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: `1px solid ${c.line}`, paddingBottom: 12,
                  }}>
                    <span>Pronostico AI</span>
                    <b style={{ color: c.cyan, fontWeight: 500 }}>{effort}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
                    <div style={{ fontSize: 13, color: c.textDim }}>
                      <b style={{
                        display: 'block', fontSize: 22, color: c.text, fontWeight: 600,
                        marginBottom: 2, letterSpacing: '-0.01em',
                      }}>{topTip.pronostico}</b>
                      {effort === 'DEEP' ? 'Scout Deep · T-6h' : 'Scout Lite · notturna'}
                    </div>
                    <div style={{
                      fontFamily: FONT_MONO, fontSize: 42, fontWeight: 600,
                      color: (topTip.confidence || 0) >= 60 ? c.cyan : c.yellow,
                      lineHeight: 1, letterSpacing: '-0.03em',
                    }}>
                      {(topTip.confidence || 0).toFixed(0)}
                      <small style={{ fontSize: 16, color: c.textDim, marginLeft: 1, fontWeight: 400 }}>%</small>
                    </div>
                  </div>
                  <div style={{ height: 6, background: c.pronBarBg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${topTip.confidence || 0}%`,
                      background: (topTip.confidence || 0) >= 60 ? c.cyan : c.yellow,
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 6,
                    fontFamily: FONT_MONO, fontSize: 9.5, color: c.textFaint,
                  }}>
                    <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                  </div>
                  {topTip.quota != null && (
                    <div style={{
                      display: 'flex', flexDirection: 'column',
                      borderTop: `1px solid ${c.line}`, paddingTop: 12,
                    }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 0', fontFamily: FONT_MONO, fontSize: 11.5, color: c.textFaint,
                      }}>
                        <span>Quota mercato</span>
                        <b style={{ color: c.text, fontWeight: 500 }}>{topTip.quota.toFixed(2)}</b>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card "tutti i tip" */}
              {match.pronostici && match.pronostici.length > 1 && (
                <div style={{
                  background: c.bg2, border: `1px solid ${c.line}`, borderRadius: 12, padding: 18,
                }}>
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: c.textFaint, marginBottom: 14,
                  }}>Tutti i tip</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {match.pronostici.filter(p => p.pronostico && p.pronostico !== 'NO BET').map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 0', fontFamily: FONT_MONO, fontSize: 11.5,
                        color: c.textFaint, borderBottom: `1px dotted ${c.line}`,
                      }}>
                        <span>{p.pronostico}</span>
                        <b style={{ color: c.text, fontWeight: 500 }}>{(p.confidence || 0).toFixed(0)}%</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* DISCLAIMER */}
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 0' }}>
            <div style={{
              background: c.bg2, border: `1px solid ${c.line}`, borderRadius: 12,
              padding: '22px 26px',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
            }} className="disclaimer-grid">
              <p style={{
                margin: 0, fontFamily: FONT_MONO, fontSize: 11.5, color: c.textDim,
                lineHeight: 1.6, letterSpacing: '0.04em',
              }}>
                <b style={{ color: c.text, fontWeight: 500 }}>Articolo generato automaticamente</b> dalla redazione AI di AI Simulator a partire da fonti pubbliche, conferenze stampa e dati statistici. Nessun intervento editoriale umano. Le previsioni non costituiscono consigli di scommessa.
              </p>
            </div>
          </section>

          {/* NAV PREV / NEXT */}
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="nav-grid">
              <a
                onClick={() => prev && openOther(prev)}
                style={{
                  background: c.bg2, border: `1px solid ${c.line}`, borderRadius: 12,
                  padding: '18px 22px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  cursor: prev ? 'pointer' : 'default',
                  opacity: prev ? 1 : 0.5,
                }}>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: c.textFaint,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>← Articolo precedente</span>
                  <span style={{ color: c.textDim }}>{prev?.match_time || '—'}</span>
                </div>
                {prev ? (
                  <div style={{ color: c.text, fontWeight: 500, fontSize: 15 }}>
                    {prev.home} – {prev.away}
                    <div style={{ fontSize: 12, color: c.textDim, fontWeight: 400, marginTop: 2 }}>{prev.league}</div>
                  </div>
                ) : (
                  <div style={{ color: c.textFaint, fontFamily: FONT_MONO, fontSize: 13 }}>
                    Nessun articolo precedente nella giornata
                  </div>
                )}
              </a>
              <a
                onClick={() => next && openOther(next)}
                style={{
                  background: c.bg2, border: `1px solid ${c.line}`, borderRadius: 12,
                  padding: '18px 22px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  cursor: next ? 'pointer' : 'default',
                  opacity: next ? 1 : 0.5,
                  textAlign: 'right' as const,
                }}>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.16em',
                  textTransform: 'uppercase', color: c.textFaint,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexDirection: 'row-reverse' as const,
                }}>
                  <span>Articolo successivo →</span>
                  <span style={{ color: c.textDim }}>{next?.match_time || '—'}</span>
                </div>
                {next ? (
                  <div style={{ color: c.text, fontWeight: 500, fontSize: 15 }}>
                    {next.home} – {next.away}
                    <div style={{ fontSize: 12, color: c.textDim, fontWeight: 400, marginTop: 2 }}>{next.league}</div>
                  </div>
                ) : (
                  <div style={{ color: c.textFaint, fontFamily: FONT_MONO, fontSize: 13 }}>
                    Nessun articolo successivo
                  </div>
                )}
              </a>
            </div>
          </section>
        </>
      )}

      <footer style={{
        maxWidth: 1280, margin: '40px auto 0', padding: '24px 28px 50px',
        borderTop: `1px solid ${c.line}`,
        fontFamily: FONT_MONO, fontSize: 11, color: c.textFaint,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 14,
      }}>
        <div>Tutti i contenuti sono generati da modelli linguistici. <b style={{ color: c.textDim, fontWeight: 500 }}>Le previsioni non costituiscono consigli di scommessa.</b></div>
        <div>build · pipeline</div>
      </footer>

      <style>{`
        @media (max-width: 1080px) {
          .article-layout { grid-template-columns: 1fr !important; gap: 36px !important; }
          .article-sidecar { position: static !important; }
          .poster-inner { padding: 32px 22px !important; gap: 18px !important; }
        }
        @media (max-width: 760px) {
          .article-layout { padding-left: 16px !important; padding-right: 16px !important; }
          .poster-inner { padding: 24px 18px !important; gap: 12px !important; grid-template-columns: 1fr auto 1fr !important; }
          .disclaimer-grid { grid-template-columns: 1fr !important; }
          .nav-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
