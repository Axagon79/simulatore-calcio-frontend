import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getThemeMode } from '../AppDev/costanti';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
const FONT_FAMILY = '"Inter", system-ui, sans-serif';

const isLight = getThemeMode() === 'light';

const accentColor = isLight ? '#047857' : '#6ee7b7';
const strongColor = isLight ? '#065f46' : '#a7f3d0';
const bodyColor = isLight ? '#1f2937' : '#ffffff';

const bgA = isLight ? '#ffffff' : '#222222';
const bgB = isLight ? '#e5e7eb' : 'rgb(17, 21, 23)';

const stripCitations = (raw: string): string =>
  raw.replace(/\s*\[\[[\d,\s]+\]\]/g, '');

// Lo Scout LITE (e in alcuni casi anche il DEEP) aggiunge in coda all'articolo
// un blocco JSON delimitato da ```json ... ``` con il pronostico strutturato.
// Quel blocco e' inteso SOLO per il parser backend (scout_nightly_lite.py /
// scout_prematch_deep.py): non deve essere mostrato all'utente nella capsula.
// Il LITE meno potente del DEEP a volte non chiude correttamente il fence,
// quindi tolleriamo anche fence aperto (fino a fine testo).
const stripJsonBlock = (raw: string): string => {
  // 1. Blocco ben formato: ```json ... ```
  let cleaned = raw.replace(/```\s*json[\s\S]*?```/gi, '');
  // 2. Fence aperto non chiuso: ```json fino a fine stringa
  cleaned = cleaned.replace(/```\s*json[\s\S]*$/i, '');
  // 3. JSON nudo a fine articolo (senza fence): `{ "decisione": ... }` finale
  cleaned = cleaned.replace(/\{\s*"decisione"\s*:[\s\S]*\}\s*$/, '');
  return cleaned.trimEnd();
};

// Lo Scout (LITE e DEEP) mette nei pronostici testuali la coppia
// "confidenza X%, peso Y" per fornire all'utente entrambe le metriche.
// Il peso pero' e' telemetria interna (convinzione AI), non e' un dato
// che l'utente capisce. Strippato dal render lasciando solo la confidenza.
// Esempi gestiti:
//   "Over 2.5 (confidenza 60%, peso 6)"  ->  "Over 2.5 (confidenza 60%)"
//   "Over 2.5 (confidenza 60% , peso 6)" ->  "Over 2.5 (confidenza 60%)"
//   "Over 2.5 (confidenza 60% peso 6)"   ->  "Over 2.5 (confidenza 60%)"
const stripPeso = (raw: string): string =>
  raw.replace(/(\d{1,3}\s*%)\s*[,;]?\s*peso\s*\d+/gi, '$1');

// Il modello LITE a volte ignora la regola "due pronostici su due righe"
// e li scrive sulla stessa riga (anche dopo strip peso). Riformattiamo
// uniformemente sia LITE che DEEP: estraiamo i pronostici dalla riga
// finale dell'articolo (pattern "Nome (confidenza N%)") e li riscriviamo
// come lista bullet, con titolo "Pronostico:" / "Pronostici:" in base al
// conteggio.
const formatPronostici = (raw: string): string => {
  // STEP 1: rimuovi tutto da "Pronostici:" (o "Pronostico:") in poi.
  // I tip strutturati arrivano dal JSON scout_lite/scout_deep e vengono passati
  // come Props (segno/gol). Qui dobbiamo solo lasciare la prosa pulita.
  // Bug reale 19/05/2026 (Bournemouth-MC): il regex precedente provava a
  // estrarre i tip dal testo libero e finiva per inglobare frasi intere
  // ("e aspettarsi almeno due gol complessivi...Doppia Chance X2...").
  // Soluzione: niente piu' parsing del testo, usiamo il JSON strutturato.
  const labelRe = /\n+\s*\*{0,2}\s*\b(pronostici|pronostico|prediction)s?\s*:\*{0,2}[\s\S]*$/i;
  return raw.replace(labelRe, '').trimEnd();
};

const splitSections = (text: string): string[] => {
  const re = /(\*\*(?:Formazioni|Tattica|Notizie|Contesto|Ipotizza)[^*]*\*\*)/i;
  const parts = text.split(re).filter((s) => s && s.trim());
  const sections: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (re.test(p) && i + 1 < parts.length) {
      sections.push(`${p}\n\n${parts[i + 1]}`);
      i++;
    } else if (sections.length === 0) {
      sections.push(p);
    } else {
      sections[sections.length - 1] += `\n\n${p}`;
    }
  }
  return sections.length ? sections : [text];
};

interface ScoutTip {
  emit?: boolean;
  mercato?: string;
  esito?: string;
  pronostico?: string;  // alternativa: alcuni doc usano "pronostico" invece di esito+mercato
  confidence?: number;
}

interface Props {
  text: string;
  segno?: ScoutTip | null;
  gol?: ScoutTip | null;
}

// Converte un ScoutTip in label leggibile per bullet.
// Esempi:
//   {mercato:'DC', esito:'X2'} -> "Doppia Chance X2"
//   {mercato:'OVER_UNDER_2_5', esito:'Over'} -> "Over 2.5"
//   {mercato:'OVER_UNDER_1_5', esito:'Under'} -> "Under 1.5"
//   {mercato:'GG_NG', esito:'Goal'} -> "Goal"
//   {pronostico:'1X'} -> "Doppia Chance 1X"
const formatTipLabel = (tip: ScoutTip): string => {
  if (tip.pronostico) {
    const p = tip.pronostico.trim();
    if (/^(1X|X2|12)$/i.test(p)) return `Doppia Chance ${p.toUpperCase()}`;
    return p;
  }
  const mercato = (tip.mercato || '').toUpperCase();
  const esito = tip.esito || '';
  if (mercato === 'DC' || mercato === 'DOPPIA_CHANCE') return `Doppia Chance ${esito}`;
  if (mercato.startsWith('OVER_UNDER_')) {
    const soglia = mercato.replace('OVER_UNDER_', '').replace('_', '.');
    return `${esito} ${soglia}`;
  }
  if (mercato === 'GG_NG' || mercato === 'GG' || mercato === 'NG') return esito || mercato;
  if (mercato === '1X2' || mercato === 'SEGNO') return esito;
  if (mercato === 'MULTIGOL' || mercato.startsWith('MG_')) {
    const range = mercato.replace('MG_', '').replace('_', '-');
    return `Multigol ${esito || range}`;
  }
  return esito || mercato;
};

const PronosticoPill = ({ children }: { children: any }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '1px 18px',
      marginLeft: '4px',
      background: 'rgba(46,162,30,0.70)',
      color: '#000000',
      borderRadius: '999px',
      border: '1px solid #6b7280',
      fontWeight: 800,
      letterSpacing: '0.5px',
      fontSize: '15px',
    }}
  >
    {children}
  </span>
);

const splitLastColon = (s: string): { before: string; after: string } | null => {
  const idx = s.lastIndexOf(':');
  if (idx < 0 || idx === s.length - 1) return null;
  const before = s.slice(0, idx + 1);
  const after = s.slice(idx + 1).trim();
  if (!after) return null;
  return { before, after };
};

const buildComponents = (isLastSection: boolean) => ({
  p: ({ children }: any) => {
    const arr: any[] = Array.isArray(children) ? children : [children];
    const sentences: any[][] = [[]];
    const sentenceEnd = /([.!?])\s+(?=[A-ZÀ-Ý"“'«])/;
    arr.forEach((child) => {
      if (typeof child === 'string') {
        let remaining = child;
        while (true) {
          const m = remaining.match(sentenceEnd);
          if (!m || m.index === undefined) break;
          const cut = m.index + m[1].length;
          sentences[sentences.length - 1].push(remaining.slice(0, cut));
          sentences.push([]);
          remaining = remaining.slice(cut).replace(/^\s+/, '');
        }
        if (remaining) sentences[sentences.length - 1].push(remaining);
      } else {
        sentences[sentences.length - 1].push(child);
      }
    });
    const filtered = sentences.filter((s) => s.length > 0);
    const lastSentenceIdx = filtered.length - 1;
    return (
      <p style={{ margin: '0 0 14px 0' }}>
        {filtered.map((parts, i) => {
          if (isLastSection && i === lastSentenceIdx) {
            const lastPartIdx = parts.length - 1;
            const lastPart = parts[lastPartIdx];
            if (typeof lastPart === 'string') {
              const split = splitLastColon(lastPart);
              if (split) {
                return (
                  <span key={i} style={{ display: 'block', marginBottom: '6px' }}>
                    {parts.slice(0, lastPartIdx).map((pp: any, j: number) => (
                      <span key={j}>{pp}</span>
                    ))}
                    <span>{split.before}</span>
                    <PronosticoPill>{split.after.replace(/[.!?]\s*$/, '')}</PronosticoPill>
                  </span>
                );
              }
            }
          }
          return (
            <span key={i} style={{ display: 'block', marginBottom: '6px' }}>
              {parts.map((pp: any, j: number) => (
                <span key={j}>{pp}</span>
              ))}
            </span>
          );
        })}
      </p>
    );
  },
  strong: ({ children }: any) => {
    const txt = String(
      Array.isArray(children)
        ? children.map((c: any) => (typeof c === 'string' ? c : '')).join('')
        : children || ''
    ).trim();
    const isSectionTitle = /^(Formazioni|Tattica|Notizie|Contesto|Ipotizza)/i.test(txt);
    if (isSectionTitle) {
      return (
        <strong
          style={{
            display: 'block',
            marginTop: '0',
            marginBottom: '12px',
            padding: '10px 14px',
            background:
              'linear-gradient(90deg, rgba(46,162,30,0) 0%, rgba(46,162,30,0.70) 50%, rgba(46,162,30,0) 100%)',
            color: '#000000',
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            textAlign: 'center',
            borderRadius: '4px',
          }}
        >
          {children}
        </strong>
      );
    }
    return <strong style={{ color: strongColor, fontWeight: 600 }}>{children}</strong>;
  },
  ul: ({ children }: any) => (
    <ul style={{ margin: '0 0 10px 0', paddingLeft: '18px' }}>{children}</ul>
  ),
  li: ({ children }: any) => <li style={{ marginBottom: '4px' }}>{children}</li>,
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: accentColor, textDecoration: 'underline' }}
    >
      {children}
    </a>
  ),
});

export default function ScoutAnalysis({ text, segno, gol }: Props) {
  const clean = formatPronostici(stripPeso(stripJsonBlock(stripCitations(text || ''))));
  const sections = splitSections(clean);
  useEffect(() => {
    const id = 'scout-font-link';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Bullet pronostici dal JSON strutturato (scout_lite/scout_deep).
  // Mostrati nell'ultima sezione (sotto "Ipotizza un pronostico").
  // Niente piu' parsing fragile del testo: prendiamo solo emit=true.
  const tipsFromJson = [segno, gol]
    .filter((t): t is ScoutTip => !!t && t.emit !== false && (!!t.esito || !!t.pronostico || !!t.mercato))
    .map(t => ({ label: formatTipLabel(t), conf: t.confidence }));

  return (
    <div
      style={{
        fontSize: '15px',
        lineHeight: 1.8,
        color: bodyColor,
        fontFamily: FONT_FAMILY,
        fontWeight: 400,
      }}
    >
      {sections.map((sec, idx) => {
        const isLast = idx === sections.length - 1;
        return (
          <div
            key={idx}
            style={{
              background: idx % 2 === 0 ? bgA : bgB,
              padding: '12px 14px',
              borderRadius: '6px',
              marginBottom: '10px',
              border: `2px solid ${isLight ? 'rgba(46,162,30,0.30)' : 'rgba(46,162,30,0.35)'}`,
            }}
          >
            <ReactMarkdown components={buildComponents(isLast)}>{sec}</ReactMarkdown>
            {isLast && tipsFromJson.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 8, fontWeight: 600, color: bodyColor }}>
                  {tipsFromJson.length === 1 ? 'Pronostico:' : 'Pronostici:'}
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {tipsFromJson.map((t, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <strong>{t.label}</strong>
                      {typeof t.conf === 'number' && ` (confidenza ${t.conf}%)`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
