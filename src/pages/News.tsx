import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getThemeMode, API_BASE } from '../AppDev/costanti';

const isLight = getThemeMode() === 'light';

// Palette: rispetta il design Mockup D Home (vedi news_mockups/claude_design_bundle/project/Mockup D - Home.html)
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
};

const FONT_SANS = '"Inter","Segoe UI",system-ui,sans-serif';
const FONT_MONO = '"JetBrains Mono","Consolas",ui-monospace,monospace';

interface NewsProps {
  onBack: () => void;
}

type TabKey = 'today' | 'tomorrow' | 'after';

const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function formatDateLabel(d: Date): string {
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
}

function isoDate(d: Date): string {
  // YYYY-MM-DD locale (non UTC)
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const VALID_TABS: TabKey[] = ['today', 'tomorrow', 'after'];

// Mappa league name -> chiave nazione per il filtro cascata
// Solo nazioni con copertura attiva nel prodotto; estendibile.
const LEAGUE_TO_COUNTRY: Record<string, string> = {
  'Premier League': 'inghilterra',
  'Championship': 'inghilterra',
  'Serie A': 'italia',
  'Serie B': 'italia',
  'LaLiga': 'spagna',
  'La Liga': 'spagna',
  'Bundesliga': 'germania',
  '2. Bundesliga': 'germania',
  'Ligue 1': 'francia',
  'Ligue 2': 'francia',
  'Eredivisie': 'olanda',
  'Primeira Liga': 'portogallo',
  'Allsvenskan': 'svezia',
  'Veikkausliiga': 'finlandia',
  'Brasileirao': 'brasile',
  'Brasileirão': 'brasile',
  'Brasileirão Serie A': 'brasile',
  'Major League Soccer': 'usa',
  'MLS': 'usa',
  'Champions League': 'europa',
  'Europa League': 'europa',
};

const COUNTRY_LABEL: Record<string, string> = {
  inghilterra: 'Inghilterra',
  italia: 'Italia',
  spagna: 'Spagna',
  germania: 'Germania',
  francia: 'Francia',
  olanda: 'Olanda',
  portogallo: 'Portogallo',
  svezia: 'Svezia',
  finlandia: 'Finlandia',
  brasile: 'Brasile',
  usa: 'USA',
  europa: 'Coppe europee',
};

// Colore "dot" per lega (visivo nell'eyebrow articolo)
function leagueDotColor(league: string): string {
  if (league.includes('Premier')) return '#a855f7';
  if (league.includes('Allsvenskan')) return c.yellow;
  if (league.includes('Brasil')) return c.green;
  if (league.includes('Veikkaus')) return c.cyan;
  if (league.includes('Serie A') || league.includes('Serie B')) return '#3b82f6';
  if (league.includes('LaLiga') || league.includes('La Liga')) return '#ef4444';
  if (league.includes('Bundesliga')) return '#f97316';
  if (league.includes('Ligue')) return '#6366f1';
  if (league.includes('MLS') || league.includes('Major League')) return '#0ea5e9';
  return c.textDim;
}

// Crest gradient deterministico dal nome squadra (no foto, identità AI-first)
function crestGradient(name: string): string {
  // Hash semplice del nome
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

// Iniziale per crest (3 char max)
function crestLabel(name: string): string {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

interface PronosticoTip {
  tipo?: string;
  pronostico?: string;
  confidence?: number;
  quota?: number | null;
  source?: string;
  peso_ai?: number;
  stake?: number;
}

interface Match {
  home: string;
  away: string;
  date: string;
  match_time?: string;
  league?: string;
  lega?: string;
  pronostici?: PronosticoTip[];
  source_primary?: string;
  scout_lite?: { decisione?: string; segno?: any; gol?: any; scout_text?: string; computed_at?: string };
  scout_deep?: { decisione?: string; segno?: any; gol?: any; scout_text?: string; computed_at?: string };
  motivazione?: string;
}

interface ApiResp {
  success?: boolean;
  predictions?: Match[];
  date?: string;
}

export default function News({ onBack }: NewsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTab: TabKey = (() => {
    const t = searchParams.get('tab');
    return t && (VALID_TABS as string[]).includes(t) ? (t as TabKey) : 'today';
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [activeCountry, setActiveCountry] = useState<string>(searchParams.get('paese') || '');
  const [activeLeague, setActiveLeague] = useState<string>(searchParams.get('lega') || '');

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Tick del clock ogni secondo (per il chyron stile broadcast)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync URL ↔ stato (tab + filtri)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (next.get('tab') !== activeTab) next.set('tab', activeTab);
    if (activeCountry) next.set('paese', activeCountry); else next.delete('paese');
    if (activeLeague) next.set('lega', activeLeague); else next.delete('lega');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, activeCountry, activeLeague, searchParams, setSearchParams]);

  // Date per le 3 tab (locale browser)
  const dates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const after = new Date(today); after.setDate(today.getDate() + 2);
    return { today, tomorrow, after };
  }, []);

  const activeDate = activeTab === 'today' ? dates.today : activeTab === 'tomorrow' ? dates.tomorrow : dates.after;

  // Fetch articoli per la tab attiva (usa endpoint OST: ha tutti i campi + scout_lite/deep + source_primary)
  useEffect(() => {
    let cancelled = false;
    const dstr = isoDate(activeDate);
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/simulation/sistema-z-predictions?date=${dstr}`)
      .then(r => r.json())
      .then((data: ApiResp) => {
        if (cancelled) return;
        const preds = Array.isArray(data?.predictions) ? data.predictions : [];
        // Filtro: solo partite con articolo (scout_lite o scout_deep popolato).
        // Se non popolato, niente "articolo" da mostrare nella sezione News.
        const withArticle = preds.filter(p => !!(p.scout_deep?.scout_text || p.scout_lite?.scout_text));
        setMatches(withArticle);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || 'Errore di rete');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeDate]);

  // Helper: ricava nazione da league
  const countryOfMatch = (m: Match): string => {
    const league = m.league || m.lega || '';
    return LEAGUE_TO_COUNTRY[league] || '';
  };
  // Helper: slug lega (lower + senza spazi + senza accenti)
  const leagueSlug = (league: string): string =>
    league.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');

  // Nazioni e leghe disponibili per la giornata (solo quelle con almeno 1 articolo)
  const { countries, leagues } = useMemo(() => {
    const cset = new Set<string>();
    const lset = new Map<string, { slug: string; name: string; country: string }>();
    matches.forEach(m => {
      const ctry = countryOfMatch(m);
      if (ctry) cset.add(ctry);
      const lg = m.league || m.lega;
      if (lg) {
        const slug = leagueSlug(lg);
        if (!lset.has(slug)) lset.set(slug, { slug, name: lg, country: ctry });
      }
    });
    return {
      countries: Array.from(cset).sort(),
      leagues: Array.from(lset.values()),
    };
  }, [matches]);

  // Articoli filtrati
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (activeCountry && countryOfMatch(m) !== activeCountry) return false;
      if (activeLeague) {
        const lg = m.league || m.lega || '';
        if (leagueSlug(lg) !== activeLeague) return false;
      }
      return true;
    }).sort((a, b) => (a.match_time || '').localeCompare(b.match_time || ''));
  }, [matches, activeCountry, activeLeague]);

  // Leghe da mostrare nella riga "leghe": solo del paese attivo
  const leaguesForCountry = useMemo(() => {
    if (!activeCountry) return [];
    return leagues.filter(l => l.country === activeCountry);
  }, [leagues, activeCountry]);

  // Apri pagina articolo (route /news/articolo con home+away+date)
  const openArticle = (m: Match) => {
    const params = new URLSearchParams({ home: m.home, away: m.away, date: m.date });
    if (activeCountry) params.set('paese', activeCountry);
    if (activeLeague) params.set('lega', activeLeague);
    navigate(`/news/articolo?${params.toString()}`);
  };

  const tabs: Array<{ key: TabKey; label: string; subLabel: string }> = [
    { key: 'today', label: 'Oggi', subLabel: formatDateLabel(dates.today) },
    { key: 'tomorrow', label: 'Domani', subLabel: formatDateLabel(dates.tomorrow) },
    { key: 'after', label: 'Dopodomani', subLabel: formatDateLabel(dates.after) },
  ];

  // Conteggio leghe nella view corrente
  const visibleLeagues = new Set(filteredMatches.map(m => m.league || m.lega || ''));

  // Clock formattato
  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = `${['dom','lun','mar','mer','gio','ven','sab'][now.getDay()]} ${now.getDate()} ${MESI[now.getMonth()]} ${now.getFullYear()}`;

  // Helper: estrai pronostico principale per ticker e sidecar
  const getPrimaryTip = (m: Match): { label: string; confidence: number } | null => {
    if (!m.pronostici || m.pronostici.length === 0) return null;
    // Prendi quello con confidenza piu' alta
    const sorted = [...m.pronostici].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const top = sorted[0];
    if (!top.pronostico || top.pronostico === 'NO BET') return null;
    return { label: top.pronostico, confidence: top.confidence || 0 };
  };

  // Estrai lede dal testo scout (prime 2-3 frasi pulite, senza titoli di sezione e senza blocco JSON)
  const getLede = (m: Match): string => {
    const text = m.scout_deep?.scout_text || m.scout_lite?.scout_text || '';
    if (!text) return '';
    // strip citazioni [[N]], strip blocco json finale, strip titoli **...**
    let clean = text
      .replace(/```\s*json[\s\S]*?```/gi, '')
      .replace(/```\s*json[\s\S]*$/i, '')
      .replace(/\s*\[\[[\d,\s]+\]\]/g, '')
      .replace(/\*\*[^*]+\*\*/g, ' ');
    // prendi le prime 280 caratteri
    clean = clean.replace(/\s+/g, ' ').trim();
    if (clean.length > 280) clean = clean.substring(0, 280).replace(/\s+\S*$/, '') + '…';
    return clean;
  };

  // Quale modello? deep / lite badge
  const articleEffort = (m: Match): 'DEEP' | 'LITE' => (m.scout_deep?.scout_text ? 'DEEP' : 'LITE');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: c.bg,
      fontFamily: FONT_SANS,
      fontSize: 15,
      lineHeight: 1.55,
      color: c.text,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        @keyframes news-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes news-slide { from{transform:translateX(0)} to{transform:translateX(-50%)} }
      `}</style>

      {/* CHYRON (testata broadcast) */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: c.bg,
        borderBottom: `1px solid ${c.line}`,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center', gap: 16, padding: '10px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack} style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#22d3ee 0%, #0ea5b7 100%)',
              display: 'grid', placeItems: 'center', color: '#04141a',
              fontWeight: 700, fontFamily: FONT_MONO, fontSize: 14,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
              border: 'none', cursor: 'pointer',
            }} title="Torna indietro">A</button>
            <div>
              <div style={{ fontWeight: 600, letterSpacing: '-0.01em', fontSize: 14.5, lineHeight: 1.1 }}>
                AI<span style={{ color: c.cyan }}>·</span>Simulator
              </div>
              <div style={{
                fontSize: 11, color: c.textDim,
                letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2,
              }}>Newsroom synth · v2.4</div>
            </div>
          </div>
          <div style={{ justifySelf: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 10px', border: `1px solid ${c.line}`, borderRadius: 999,
              fontSize: 11, color: c.textDim,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: c.red, boxShadow: `0 0 8px ${c.red}`,
                animation: 'news-pulse 1.4s infinite',
              }} />
              News feed live
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: c.textDim, fontSize: 12 }}>
            <span>{dateStr}</span>
            <span style={{ fontFamily: FONT_MONO, color: c.text }}>{clockStr} CEST</span>
          </div>
        </div>

        {/* TICKER */}
        <div style={{
          borderTop: `1px solid ${c.line}`,
          background: c.bg3,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'stretch', height: 38 }}>
            <div style={{
              padding: '0 14px', display: 'grid', placeItems: 'center',
              background: c.cyan, color: c.cyanInk,
              fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', flex: 'none',
              fontFamily: FONT_MONO,
            }}>AI · DESK</div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 36, height: '100%',
                animation: filteredMatches.length > 0 ? 'news-slide 60s linear infinite' : 'none',
                whiteSpace: 'nowrap', paddingLeft: 24,
              }}>
                {[...filteredMatches, ...filteredMatches].map((m, i) => {
                  const tip = getPrimaryTip(m);
                  return (
                    <span key={`tk-${i}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      fontSize: 12.5, color: c.textDim,
                    }}>
                      <span style={{ fontFamily: FONT_MONO, color: c.cyan, fontSize: 11.5 }}>{m.match_time || '—'}</span>
                      <b style={{ color: c.text, fontWeight: 500 }}>{m.league} · {m.home}–{m.away}</b>
                      {tip && (
                        <>
                          <span style={{ color: c.textFaint }}>·</span>
                          <span>pronostico <b style={{ color: c.text, fontWeight: 500 }}>{tip.label}</b></span>
                          <span>conf. <span style={{ fontFamily: FONT_MONO, color: c.cyan }}>{tip.confidence.toFixed(0)}%</span></span>
                        </>
                      )}
                    </span>
                  );
                })}
                {filteredMatches.length === 0 && !loading && (
                  <span style={{ fontSize: 12.5, color: c.textDim, fontStyle: 'italic' }}>
                    Nessun articolo per la giornata selezionata
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div style={{ borderBottom: `1px solid ${c.line}`, background: c.bg }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map(t => {
              const active = t.key === activeTab;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  padding: '18px 22px 16px',
                  color: active ? c.text : c.textDim,
                  fontWeight: 500, fontSize: 13.5,
                  borderBottom: `2px solid ${active ? c.cyan : 'transparent'}`,
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex', gap: 10, alignItems: 'baseline',
                  background: 'transparent',
                  fontFamily: 'inherit',
                }}>
                  <span style={{ color: active ? c.text : c.textDim }}>{t.label}</span>
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 11.5,
                    color: active ? c.cyan : c.textFaint,
                  }}>{t.subLabel}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: c.textDim }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${c.line}`, borderRadius: 999,
              padding: '5px 12px', color: c.text, fontSize: 11.5,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: c.green, boxShadow: `0 0 6px ${c.green}`,
              }} />
              Modello DEEP · T-6h
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: c.textDim }}>
              {filteredMatches.length} articol{filteredMatches.length === 1 ? 'o' : 'i'} · {visibleLeagues.size} {visibleLeagues.size === 1 ? 'lega' : 'leghe'}
            </span>
          </div>
        </div>
      </div>

      {/* MASTHEAD EDITORIALE */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 28px 22px' }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: c.textFaint,
          display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap',
        }}>
          <span>Edizione del giorno</span>
          <span style={{ color: c.textFaint }}>·</span>
          <span style={{ fontFamily: FONT_MONO }}>{isoDate(activeDate).replace(/-/g, ' · ')}</span>
          <span style={{ color: c.textFaint }}>·</span>
          <b style={{ color: c.cyan, fontWeight: 500 }}>
            {filteredMatches.length} articol{filteredMatches.length === 1 ? 'o pubblicato' : 'i pubblicati'}
          </b>
          <span style={{ color: c.textFaint }}>·</span>
          <span>generati da redazione AI</span>
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.03em',
          margin: 0, fontWeight: 600, maxWidth: 1000,
        }}>
          Una redazione che <em style={{ fontStyle: 'normal', color: c.cyan }}>scrive sola</em>. {filteredMatches.length} articol{filteredMatches.length === 1 ? 'o' : 'i'} per le partite di {activeTab === 'today' ? 'oggi' : activeTab === 'tomorrow' ? 'domani' : 'dopodomani'}.
        </h1>
        <p style={{ color: c.textDim, fontSize: 16, marginTop: 14, maxWidth: 760, lineHeight: 1.6 }}>
          Ogni giorno il nostro motore di sintesi legge <b style={{ color: c.text, fontWeight: 500 }}>conferenze stampa, statistiche e copertura locale</b>, e produce un articolo per ciascun match in programma — completo di <b style={{ color: c.text, fontWeight: 500 }}>pronostico AI</b> con livello di confidenza. Nessun giornalista umano è coinvolto. È pubblicato per trasparenza: vediamo gli stessi dati che usa l'algoritmo per la previsione.
        </p>
      </section>

      {/* FILTRO */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 28px 0' }}>
        <div style={{
          borderTop: `1px solid ${c.line}`, borderBottom: `1px solid ${c.line}`,
          padding: '14px 0',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', overflowX: 'auto',
          }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: c.textFaint, paddingRight: 4,
            }}>Notizie da</span>
            <FilterLink
              label="Tutte"
              active={!activeCountry}
              onClick={() => { setActiveCountry(''); setActiveLeague(''); }}
            />
            {countries.map(ctry => (
              <span key={ctry} style={{ display: 'inline-flex', alignItems: 'center', gap: 18 }}>
                <span style={{ color: c.textFaint }}>·</span>
                <FilterLink
                  label={COUNTRY_LABEL[ctry] || ctry}
                  active={activeCountry === ctry}
                  onClick={() => { setActiveCountry(activeCountry === ctry ? '' : ctry); setActiveLeague(''); }}
                />
              </span>
            ))}
          </div>
          {activeCountry && leaguesForCountry.length > 0 && (
            <div style={{
              marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${c.line}`,
              display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
            }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: c.textFaint,
              }}>↳ Leghe</span>
              <FilterLink
                label="Tutte"
                active={!activeLeague}
                onClick={() => setActiveLeague('')}
                size="small"
              />
              {leaguesForCountry.map(l => (
                <span key={l.slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 18 }}>
                  <span style={{ color: c.textFaint }}>·</span>
                  <FilterLink
                    label={l.name}
                    active={activeLeague === l.slug}
                    onClick={() => setActiveLeague(activeLeague === l.slug ? '' : l.slug)}
                    size="small"
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BREADCRUMB ATTIVO */}
      {activeCountry && (
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '18px 28px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: FONT_MONO, fontSize: 11.5, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: c.textDim,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: c.text }}>Notizie</span>
            <span style={{ color: c.textFaint }}>/</span>
            <span style={{ color: c.text }}>{COUNTRY_LABEL[activeCountry] || activeCountry}</span>
            {activeLeague && (
              <>
                <span style={{ color: c.textFaint }}>/</span>
                <b style={{ color: c.cyan, fontWeight: 500 }}>
                  {leaguesForCountry.find(l => l.slug === activeLeague)?.name || activeLeague}
                </b>
              </>
            )}
          </div>
          <span
            onClick={() => { setActiveCountry(''); setActiveLeague(''); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              color: c.textDim, border: `1px solid ${c.line}`, padding: '5px 11px',
              borderRadius: 999,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> Rimuovi filtro
          </span>
        </div>
      )}

      {/* LAYOUT: index rail + articoli */}
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '32px 28px 80px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 180px) 1fr',
        gap: 48, alignItems: 'start',
      }}
        className="news-layout"
      >
        {/* INDEX RAIL */}
        <aside style={{ position: 'sticky', top: 128, alignSelf: 'start' }} className="news-index-rail">
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: c.textFaint, marginBottom: 14,
          }}>
            Indice · {activeTab === 'today' ? 'oggi' : activeTab === 'tomorrow' ? 'domani' : 'dopodomani'}{' '}
            <span style={{ color: c.cyan }}>({filteredMatches.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${c.line}`, paddingLeft: 14, gap: 1 }}>
            {filteredMatches.map(m => (
              <a
                key={`ir-${m.home}-${m.away}`}
                onClick={() => openArticle(m)}
                style={{
                  padding: '9px 0', fontFamily: FONT_MONO, fontSize: 12.5,
                  color: c.textDim, position: 'relative', cursor: 'pointer', lineHeight: 1.3,
                }}
              >
                <span style={{
                  position: 'absolute', left: -19, top: 14,
                  width: 8, height: 8, borderRadius: '50%',
                  background: c.bg, border: `1px solid ${c.lineStrong}`,
                }} />
                {m.match_time || '—'}
                <span style={{
                  display: 'block', fontFamily: FONT_SANS, fontSize: 11,
                  color: c.textFaint, marginTop: 1,
                }}>{m.home} · {m.away}</span>
              </a>
            ))}
          </div>
          <div style={{
            marginTop: 24, paddingTop: 18,
            borderTop: `1px solid ${c.line}`,
            fontFamily: FONT_MONO, fontSize: 10.5, color: c.textFaint, lineHeight: 1.5,
          }}>
            Pubblicazione automatica T-6h dal kickoff. Nessun intervento editoriale umano.
          </div>
        </aside>

        {/* STACK ARTICOLI */}
        <main style={{ display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: c.textDim }}>
              Caricamento articoli…
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: c.red }}>
              Errore: {error}
            </div>
          )}
          {!loading && !error && filteredMatches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: c.textDim, maxWidth: 480, margin: '0 auto' }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: c.textFaint, marginBottom: 14,
              }}>Nessun articolo</div>
              <p>
                {activeCountry || activeLeague
                  ? 'Nessuna partita corrisponde al filtro selezionato per questa giornata.'
                  : 'Nessun articolo disponibile per questa giornata. Gli articoli vengono pubblicati a partire da T-6h dal kickoff.'}
              </p>
            </div>
          )}
          {!loading && !error && filteredMatches.map((m, idx) => {
            const tip = getPrimaryTip(m);
            const effort = articleEffort(m);
            const lede = getLede(m);
            const isFeature = idx === 0;
            return (
              <article
                key={`art-${m.home}-${m.away}`}
                style={{
                  padding: idx === 0 ? '0 0 40px' : '36px 0 40px',
                  borderBottom: idx < filteredMatches.length - 1 ? `1px solid ${c.line}` : 'none',
                  display: 'grid',
                  gridTemplateColumns: '1fr 260px',
                  gap: 36, alignItems: 'start',
                }}
                className="news-article"
              >
                <div>
                  {/* eyebrow */}
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14,
                    fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: c.textFaint, flexWrap: 'wrap',
                  }}>
                    <span style={{ color: c.textDim }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                        marginRight: 6, verticalAlign: 'middle',
                        background: leagueDotColor(m.league || ''),
                      }} />
                      {m.league}
                    </span>
                    <span style={{
                      color: c.text, background: c.bg3, padding: '3px 8px', borderRadius: 4,
                      letterSpacing: '0.06em',
                    }}>Kickoff {m.match_time || '—'}</span>
                    <span style={{
                      color: effort === 'DEEP' ? c.green : c.yellow,
                      border: `1px solid currentColor`, padding: '3px 8px', borderRadius: 4,
                      fontWeight: 600,
                    }}>{effort}</span>
                  </div>

                  {/* match line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0 18px' }}>
                    <CrestMatch name={m.home} feature={isFeature} />
                    <span style={{ color: c.textFaint, fontFamily: FONT_MONO, fontSize: 13 }}>vs</span>
                    <CrestMatch name={m.away} feature={isFeature} />
                  </div>

                  {/* title */}
                  <h2 style={{
                    fontSize: isFeature ? 36 : 28, lineHeight: isFeature ? 1.1 : 1.18,
                    letterSpacing: '-0.022em', margin: '0 0 14px', fontWeight: 600,
                  }}>
                    <a onClick={() => openArticle(m)} style={{ cursor: 'pointer' }}>
                      Pronostico {m.home}-{m.away}: {tip ? `${tip.label} con confidenza ${tip.confidence.toFixed(0)}%` : 'analisi pre-partita'}
                    </a>
                  </h2>

                  {/* lede */}
                  {lede && (
                    <p style={{
                      color: c.textDim, fontSize: 15, lineHeight: 1.65, margin: '0 0 14px',
                    }}>{lede}</p>
                  )}

                  {/* footer */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 14,
                    borderTop: `1px dashed ${c.line}`, paddingTop: 14, marginTop: 8,
                  }}>
                    <div style={{
                      fontFamily: FONT_MONO, fontSize: 11.5, color: c.textFaint,
                      display: 'flex', gap: 10, flexWrap: 'wrap',
                    }}>
                      <b style={{ color: c.textDim, fontWeight: 500 }}>La Redazione di AI Simulator</b>
                    </div>
                    <a onClick={() => openArticle(m)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: c.cyan, fontSize: 13.5, fontWeight: 500,
                      borderBottom: '1px solid currentColor', paddingBottom: 1, opacity: 0.8,
                      cursor: 'pointer',
                    }}>Leggi l'articolo completo →</a>
                  </div>
                </div>

                {/* sidecar pronostico */}
                <aside style={{
                  background: c.bg2, border: `1px solid ${c.line}`, borderRadius: 10, padding: 18,
                  display: 'flex', flexDirection: 'column', gap: 14,
                }} className="news-sidecar">
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: c.textFaint,
                  }}>Pronostico AI</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
                    <div style={{ fontSize: 13, color: c.textDim }}>
                      <b style={{ display: 'block', fontSize: 20, color: c.text, fontWeight: 600, marginBottom: 2, letterSpacing: '-0.01em' }}>
                        {tip?.label || '—'}
                      </b>
                      {effort === 'DEEP' ? 'Scout Deep · T-6h' : 'Scout Lite · notturna'}
                    </div>
                    <div style={{
                      fontFamily: FONT_MONO, fontSize: 34, fontWeight: 600,
                      color: (tip?.confidence || 0) >= 60 ? c.cyan : c.yellow,
                      lineHeight: 1, letterSpacing: '-0.03em',
                    }}>
                      {tip ? tip.confidence.toFixed(0) : '—'}
                      <small style={{ fontSize: 14, color: c.textDim, marginLeft: 1, fontWeight: 400 }}>%</small>
                    </div>
                  </div>
                  <div style={{ height: 5, background: c.pronBarBg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${tip?.confidence || 0}%`,
                      background: (tip?.confidence || 0) >= 60 ? c.cyan : c.yellow,
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <a onClick={() => openArticle(m)} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: c.cyan, color: c.cyanInk, border: `1px solid ${c.cyan}`,
                      fontWeight: 600, padding: '10px 14px', borderRadius: 999, fontSize: 12.5,
                      cursor: 'pointer',
                    }}>Apri articolo completo →</a>
                  </div>
                </aside>
              </article>
            );
          })}
        </main>
      </div>

      {/* FOOTER */}
      <footer style={{
        maxWidth: 1280, margin: '0 auto', padding: '32px 28px 60px',
        borderTop: `1px solid ${c.line}`,
        fontFamily: FONT_MONO, fontSize: 11, color: c.textFaint,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 14,
      }}>
        <div>Tutti i contenuti sono generati da modelli linguistici. <b style={{ color: c.textDim, fontWeight: 500 }}>Le previsioni non costituiscono consigli di scommessa.</b></div>
        <div>build · {isoDate(new Date()).replace(/-/g, '.')} · pipeline</div>
      </footer>

      {/* Responsive */}
      <style>{`
        @media (max-width: 1080px) {
          .news-layout { grid-template-columns: 1fr !important; gap: 24px !important; }
          .news-index-rail { position: static !important; background: ${c.bg2}; border: 1px solid ${c.line}; border-radius: 10px; padding: 16px; }
          .news-article { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .news-layout { padding: 24px 16px 60px !important; }
        }
      `}</style>
    </div>
  );
}

function FilterLink({ label, active, onClick, size }: {
  label: string;
  active: boolean;
  onClick: () => void;
  size?: 'small' | 'normal';
}) {
  return (
    <span
      onClick={onClick}
      style={{
        fontSize: size === 'small' ? 13 : 14,
        color: active ? c.cyan : c.textDim,
        cursor: 'pointer', whiteSpace: 'nowrap',
        padding: '2px 0',
        fontWeight: active ? 500 : 400,
      }}
    >{label}</span>
  );
}

function CrestMatch({ name, feature }: { name: string; feature: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: feature ? 44 : 34, height: feature ? 44 : 34, borderRadius: '50%',
        display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: feature ? 15 : 13, color: '#0a0b0f',
        boxShadow: c.crestShadow, flex: 'none',
        background: crestGradient(name),
      }}>{crestLabel(name)}</div>
      <div style={{ fontSize: feature ? 18 : 15, fontWeight: 500, letterSpacing: '-0.005em' }}>{name}</div>
    </div>
  );
}
