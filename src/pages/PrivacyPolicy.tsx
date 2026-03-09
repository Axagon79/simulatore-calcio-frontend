import { getThemeMode } from '../AppDev/costanti';

interface Props { onBack: () => void; }

export default function PrivacyPolicy({ onBack }: Props) {
  const isLight = getThemeMode() === 'light';
  const bg = isLight ? '#f9fafb' : '#0f0f1a';
  const card = isLight ? '#fff' : '#1a1a2e';
  const text = isLight ? '#374151' : 'rgba(255,255,255,0.82)';
  const heading = isLight ? '#111827' : 'rgba(255,255,255,0.92)';
  const accent = isLight ? '#2563eb' : '#60a5fa';
  const border = isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)';

  const h2Style: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: heading, margin: '28px 0 12px' };
  const pStyle: React.CSSProperties = { fontSize: '14px', lineHeight: 1.7, color: text, margin: '0 0 12px' };

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px 16px', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', color: accent,
          cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: 0, marginBottom: 20,
        }}>
          &larr; Indietro
        </button>

        <div style={{
          background: card, borderRadius: '12px', padding: '32px 28px',
          border: `1px solid ${border}`,
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: heading, margin: '0 0 6px' }}>
            Informativa sulla Privacy
          </h1>
          <p style={{ ...pStyle, fontSize: '13px', color: isLight ? '#9ca3af' : 'rgba(255,255,255,0.45)' }}>
            Ultimo aggiornamento: 8 marzo 2026
          </p>

          <h2 style={h2Style}>1. Titolare del Trattamento</h2>
          <p style={pStyle}>
            <strong>Lorenzo Casciano</strong><br />
            Email: <a href="mailto:aisimulator.info@proton.me" style={{ color: accent }}>aisimulator.info@proton.me</a>
          </p>

          <h2 style={h2Style}>2. Dati Raccolti</h2>
          <p style={pStyle}>Il sito raccoglie i seguenti dati personali:</p>
          <ul style={{ ...pStyle, paddingLeft: 20 }}>
            <li><strong>Dati di autenticazione</strong>: indirizzo email e nome forniti tramite accesso con Google (Firebase Authentication).</li>
            <li><strong>Dati di utilizzo</strong>: preferenze salvate localmente nel browser (tema, impostazioni).</li>
          </ul>
          <p style={pStyle}>
            Non vengono raccolti dati sensibili, dati di pagamento o dati di profilazione.
          </p>

          <h2 style={h2Style}>3. Finalità del Trattamento</h2>
          <p style={pStyle}>I dati sono trattati per le seguenti finalità:</p>
          <ul style={{ ...pStyle, paddingLeft: 20 }}>
            <li><strong>Autenticazione</strong>: permettere l'accesso all'area riservata del sito.</li>
            <li><strong>Funzionamento del servizio</strong>: memorizzare le preferenze dell'utente (tema, impostazioni).</li>
          </ul>

          <h2 style={h2Style}>4. Base Giuridica</h2>
          <p style={pStyle}>
            Il trattamento dei dati si basa sul <strong>consenso dell'utente</strong> (art. 6, par. 1, lett. a GDPR)
            e sull'<strong>esecuzione del servizio</strong> richiesto (art. 6, par. 1, lett. b GDPR).
          </p>

          <h2 style={h2Style}>5. Cookie Utilizzati</h2>
          <p style={pStyle}>Il sito utilizza esclusivamente <strong>cookie tecnici</strong> necessari al funzionamento:</p>
          <ul style={{ ...pStyle, paddingLeft: 20 }}>
            <li><strong>Cookie di sessione Firebase</strong>: per mantenere l'autenticazione dell'utente.</li>
            <li><strong>localStorage</strong>: per salvare preferenze (tema, consenso cookie, impostazioni).</li>
          </ul>
          <p style={pStyle}>
            Se l'utente accetta i cookie, viene caricato <strong>Google Analytics</strong> (gtag.js) per analisi
            anonime sull'utilizzo del sito. Se l'utente rifiuta, nessun cookie di terze parti verrà caricato.
          </p>

          <h2 style={h2Style}>6. Conservazione dei Dati</h2>
          <p style={pStyle}>
            I dati di autenticazione sono conservati per tutta la durata dell'account.
            L'utente può richiedere la cancellazione in qualsiasi momento contattando il Titolare.
          </p>

          <h2 style={h2Style}>7. Condivisione dei Dati</h2>
          <p style={pStyle}>
            I dati non vengono venduti né condivisi con terze parti, ad eccezione dei servizi tecnici necessari:
          </p>
          <ul style={{ ...pStyle, paddingLeft: 20 }}>
            <li><strong>Google Firebase</strong>: per autenticazione e hosting (server UE/USA con Standard Contractual Clauses).</li>
            <li><strong>MongoDB Atlas</strong>: per la memorizzazione dei dati del servizio.</li>
            <li><strong>Vercel</strong>: per l'hosting del frontend.</li>
          </ul>

          <h2 style={h2Style}>8. Diritti dell'Utente</h2>
          <p style={pStyle}>Ai sensi del GDPR (artt. 15-22), l'utente ha diritto di:</p>
          <ul style={{ ...pStyle, paddingLeft: 20 }}>
            <li><strong>Accesso</strong>: ottenere conferma dei dati trattati.</li>
            <li><strong>Rettifica</strong>: correggere dati inesatti.</li>
            <li><strong>Cancellazione</strong>: richiedere la rimozione dei propri dati.</li>
            <li><strong>Limitazione</strong>: limitare il trattamento in determinati casi.</li>
            <li><strong>Portabilità</strong>: ricevere i propri dati in formato strutturato.</li>
            <li><strong>Opposizione</strong>: opporsi al trattamento dei dati.</li>
            <li><strong>Reclamo</strong>: presentare reclamo al Garante per la Protezione dei Dati Personali.</li>
          </ul>
          <p style={pStyle}>
            Per esercitare questi diritti, contattare: <a href="mailto:aisimulator.info@proton.me" style={{ color: accent }}>aisimulator.info@proton.me</a>
          </p>

          <h2 style={h2Style}>9. Modifiche alla Privacy Policy</h2>
          <p style={pStyle}>
            Il Titolare si riserva il diritto di modificare questa informativa.
            Le modifiche saranno pubblicate su questa pagina con aggiornamento della data.
          </p>
        </div>
      </div>
    </div>
  );
}
