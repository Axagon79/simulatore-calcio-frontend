import { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { getThemeMode } from '../AppDev/costanti';

// ScoutArticle — rendering "magazine" del testo Scout per la pagina News articolo.
//
// Differenza con `ScoutAnalysis` (capsula): qui niente box colorati, niente
// header gradient verde, niente sezioni a strisce. Stile pulito da giornale:
// titoli sezione H2 numerati con eyebrow mono ciano, paragrafi a line-height 1.75,
// dropcap sulla prima lettera del primo paragrafo, bullet list discrete.
//
// Le 4 sezioni dello Scout (Formazioni / Tattica / Notizie / Contesto)
// vengono spezzate e renderizzate ognuna con la sua numerazione.
// La 5a sezione "Ipotizza un pronostico" viene esclusa: e' gia' mostrata
// nel sidecar pronostico della pagina articolo.

// Font allineati al Mockup D: Inter per testo, JetBrains Mono per dati/eyebrow.
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
const FONT_FAMILY = '"Inter", "Segoe UI", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", "Consolas", ui-monospace, monospace';

const isLight = getThemeMode() === 'light';

// Palette allineata al Mockup D Articolo (--t / --t-dim / --t-faint)
const c = {
  text: isLight ? '#111827' : 'rgba(255,255,255,0.92)',
  textDim: isLight ? '#6b7280' : 'rgba(255,255,255,0.55)',
  textFaint: isLight ? '#9ca3af' : 'rgba(255,255,255,0.30)',
  cyan: isLight ? '#0891b2' : '#22d3ee',
  line: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
};

// ============ STRIP FUNCTIONS (identiche a ScoutAnalysis, ma duplicate per
// non creare dipendenza circolare con la capsula) ============

const stripCitations = (raw: string): string =>
  raw.replace(/\s*\[\[[\d,\s]+\]\]/g, '');

const stripJsonBlock = (raw: string): string => {
  let cleaned = raw.replace(/```\s*json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```\s*json[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\{\s*"decisione"\s*:[\s\S]*\}\s*$/, '');
  return cleaned.trimEnd();
};

const stripPeso = (raw: string): string =>
  raw.replace(/(\d{1,3}\s*%)\s*[,;]?\s*peso\s*\d+/gi, '$1');

// ============ SPLIT SECTIONS ============
//
// Lo Scout produce sezioni con titoli in **bold** che iniziano con:
//   Formazioni / Tattica / Notizie / Contesto / Ipotizza
// Spezziamo il testo in array di sezioni (ognuna inizia col titolo bold).

interface Section {
  titleRaw: string;  // testo originale del titolo (es. "Formazioni e assenze")
  body: string;      // testo dopo il titolo
  kind: 'formazioni' | 'tattica' | 'notizie' | 'contesto' | 'ipotizza' | 'other';
}

const splitSections = (text: string): Section[] => {
  const re = /\*\*([^*]+)\*\*/g;
  const sections: Section[] = [];
  let lastIdx = 0;
  let lastTitle: string | null = null;

  const matches: Array<{ title: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ title: m[1].trim(), start: m.index, end: m.index + m[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    if (lastTitle !== null) {
      const body = text.slice(lastIdx, cur.start).trim();
      sections.push({ titleRaw: lastTitle, body, kind: classifyKind(lastTitle) });
    }
    lastTitle = cur.title;
    lastIdx = cur.end;
  }
  if (lastTitle !== null) {
    const body = text.slice(lastIdx).trim();
    sections.push({ titleRaw: lastTitle, body, kind: classifyKind(lastTitle) });
  }
  if (sections.length === 0) {
    // Niente titoli **bold**: tutto in un'unica sezione "other"
    sections.push({ titleRaw: '', body: text.trim(), kind: 'other' });
  }
  return sections;
};

const classifyKind = (title: string): Section['kind'] => {
  const t = title.toLowerCase();
  if (t.startsWith('formazioni')) return 'formazioni';
  if (t.startsWith('tattica')) return 'tattica';
  if (t.startsWith('notizie')) return 'notizie';
  if (t.startsWith('contesto')) return 'contesto';
  if (t.startsWith('ipotizza')) return 'ipotizza';
  return 'other';
};

const SECTION_NUMBER: Record<Section['kind'], string> = {
  formazioni: '01',
  tattica: '02',
  notizie: '03',
  contesto: '04',
  ipotizza: '',
  other: '',
};

const SECTION_LABEL: Record<Section['kind'], string> = {
  formazioni: 'Formazioni e assenze',
  tattica: 'Tattica e stato squadra',
  notizie: 'Notizie e dichiarazioni',
  contesto: 'Contesto partita',
  ipotizza: 'Pronostico',
  other: '',
};

const SECTION_ANCHOR: Record<Section['kind'], string> = {
  formazioni: 'sez-1',
  tattica: 'sez-2',
  notizie: 'sez-3',
  contesto: 'sez-4',
  ipotizza: '',
  other: '',
};

// ============ MARKDOWN COMPONENTS (stile magazine) ============

const articleMdComponents = (isFirstParagraphOfArticle: boolean) => ({
  p: ({ children, node, ...rest }: any) => {
    void node; void rest;
    return (
      <p style={{
        fontSize: 17,
        lineHeight: 1.75,
        color: c.textDim,
        margin: '0 0 18px',
        // text-wrap: pretty quando supportato
        textWrap: 'pretty' as any,
      }}>
        {isFirstParagraphOfArticle && (
          <FirstLetterDropcap />
        )}
        {children}
      </p>
    );
  },
  strong: ({ children }: any) => (
    <strong style={{ color: c.text, fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }: any) => (
    <em style={{ fontStyle: 'italic', color: c.text }}>{children}</em>
  ),
  ul: ({ children }: any) => (
    <ul style={{
      listStyle: 'none', padding: 0, margin: '0 0 24px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol style={{
      listStyle: 'none', padding: 0, margin: '0 0 24px', counterReset: 'art-li',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>{children}</ol>
  ),
  li: ({ children }: any) => (
    <li style={{
      paddingLeft: 22, position: 'relative',
      fontSize: 16, lineHeight: 1.65, color: c.textDim,
    }}>
      <span style={{
        position: 'absolute', left: 0, top: 0,
        color: c.cyan, fontFamily: FONT_MONO, fontWeight: 500,
      }}>→</span>
      {children}
    </li>
  ),
  blockquote: ({ children }: any) => (
    <blockquote style={{
      margin: '32px 0', padding: '8px 0 8px 28px',
      borderLeft: `3px solid ${c.cyan}`,
      fontSize: 22, lineHeight: 1.4, color: c.text,
      fontWeight: 500, letterSpacing: '-0.01em',
      fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
  a: ({ children, href }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: c.cyan, textDecoration: 'underline', textDecorationThickness: 1 }}>
      {children}
    </a>
  ),
  h1: ({ children }: any) => <h2 style={sectionHStyle}>{children}</h2>,
  h2: ({ children }: any) => <h2 style={sectionHStyle}>{children}</h2>,
  h3: ({ children }: any) => <h2 style={sectionHStyle}>{children}</h2>,
});

const sectionHStyle: React.CSSProperties = {
  fontSize: 28, letterSpacing: '-0.02em', margin: '0 0 22px',
  fontWeight: 600, lineHeight: 1.18, color: c.text,
};

// Dropcap usando ::first-letter via CSS sarebbe la via classica; React/inline
// styles non lo supportano direttamente. Soluzione: pattern componente che
// "stacca" la prima lettera del primo testo del primo paragrafo.
// Per semplicita' e robustezza, applichiamo dropcap via CSS class generata.
function FirstLetterDropcap() {
  // niente da renderizzare; il dropcap e' applicato via CSS sulla classe
  return null;
}

interface Props {
  text: string;
}

export default function ScoutArticle({ text }: Props) {
  useEffect(() => {
    const id = 'scout-article-font-link';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const clean = useMemo(() => stripPeso(stripJsonBlock(stripCitations(text || ''))), [text]);
  const sections = useMemo(() => splitSections(clean), [clean]);

  return (
    <div style={{
      fontFamily: FONT_FAMILY,
      color: c.textDim,
      fontSize: 17,
      lineHeight: 1.75,
    }}>
      {/* CSS scoped per dropcap della prima lettera del primo paragrafo della prima sezione */}
      <style>{`
        .scout-article-dropcap > section.is-first p:first-of-type::first-letter {
          float: left;
          font-family: 'Inter', system-ui, sans-serif;
          font-weight: 600;
          font-size: 64px;
          line-height: 0.9;
          padding: 6px 12px 0 0;
          color: ${c.cyan};
          letter-spacing: -0.04em;
        }
        .scout-article-dropcap section + section {
          margin-top: 48px;
        }
      `}</style>

      <div className="scout-article-dropcap">
        {sections
          .filter(s => s.kind !== 'ipotizza') // l'ipotesi pronostico va nel sidecar
          .map((sec, idx) => {
            const isFirst = idx === 0;
            const num = SECTION_NUMBER[sec.kind];
            const label = SECTION_LABEL[sec.kind];
            const anchor = SECTION_ANCHOR[sec.kind];
            return (
              <section
                key={`sec-${idx}`}
                id={anchor || undefined}
                className={isFirst ? 'is-first' : ''}
                style={{ scrollMarginTop: 100 }}
              >
                {label && (
                  <>
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: c.cyan,
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      {num && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24, height: 24,
                          border: `1px solid currentColor`,
                          borderRadius: '50%',
                          fontSize: 10, fontWeight: 600,
                        }}>{num}</span>
                      )}
                      <span>{label}</span>
                    </div>
                  </>
                )}
                <ReactMarkdown components={articleMdComponents(isFirst) as any}>
                  {sec.body}
                </ReactMarkdown>
              </section>
            );
          })}
      </div>
    </div>
  );
}
