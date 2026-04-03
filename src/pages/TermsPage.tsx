import React from 'react';
import { useLocation } from 'react-router-dom';
import { getThemeMode } from '../AppDev/costanti';

interface SectionDef {
  title: string;
  content: React.ReactNode;
}

export default function TermsPage() {
  const location = useLocation();
  const path = location.pathname.replace('/', '');
  const isLight = getThemeMode() === 'light';
  const bg = isLight ? '#f9fafb' : '#0f0f1a';
  const card = isLight ? '#fff' : '#1a1a2e';
  const text = isLight ? '#374151' : 'rgba(255,255,255,0.82)';
  const heading = isLight ? '#111827' : 'rgba(255,255,255,0.92)';
  const accent = isLight ? '#2563eb' : '#60a5fa';
  const border = isLight ? '#e5e7eb' : 'rgba(255,255,255,0.08)';
  const dimText = isLight ? '#6b7280' : 'rgba(255,255,255,0.5)';

  const h2: React.CSSProperties = { fontSize: '18px', fontWeight: 700, color: heading, margin: '28px 0 12px' };
  const h3: React.CSSProperties = { fontSize: '15px', fontWeight: 600, color: heading, margin: '20px 0 8px' };
  const p: React.CSSProperties = { fontSize: '14px', lineHeight: 1.7, color: text, margin: '0 0 12px' };
  const ul: React.CSSProperties = { fontSize: '14px', lineHeight: 1.7, color: text, margin: '0 0 12px', paddingLeft: '20px' };
  const warn: React.CSSProperties = { ...p, fontStyle: 'italic', padding: '12px 16px', borderRadius: '8px', background: isLight ? '#fef3c7' : 'rgba(255,200,0,0.08)', border: `1px solid ${isLight ? '#fcd34d' : 'rgba(255,200,0,0.15)'}` };

  const sections: Record<string, SectionDef> = {
    termini: {
      title: 'Termini e Condizioni d\'uso',
      content: (
        <>
          <p style={{ ...p, fontSize: '12px', color: dimText }}>Versione 1.1 — 3 aprile 2026 | Sezioni 1–12</p>

          <h2 style={h2}>1. Presentazione del Servizio</h2>
          <p style={p}><strong>AI Simulator</strong> e una piattaforma digitale che fornisce analisi statistiche, pronostici sportivi e indicatori di probabilita relativi a eventi calcistici, elaborati attraverso algoritmi proprietari di intelligenza artificiale e machine learning.</p>
          <p style={p}>AI Simulator e uno <strong>strumento informativo e di supporto decisionale</strong>. Non e un sito di scommesse, non accetta puntate, non e affiliato ad alcun operatore di gioco e non costituisce in alcun modo un servizio di consulenza finanziaria, fiscale o di investimento.</p>
          <p style={p}>Tutto il contenuto prodotto dalla piattaforma ha natura <strong>esclusivamente informativa</strong> e non rappresenta in nessun caso un invito, una sollecitazione o una raccomandazione a effettuare scommesse o puntate di denaro.</p>

          <h2 style={h2}>2. Accettazione dei Termini</h2>
          <p style={p}>L'accesso e l'utilizzo di AI Simulator implicano la <strong>piena e incondizionata accettazione</strong> del presente documento nella sua interezza.</p>
          <p style={p}>L'accettazione avviene tramite <strong>tripla conferma esplicita al momento della registrazione</strong>: Termini e Condizioni, Privacy e Cookie Policy, Disclaimer e Gioco Responsabile.</p>

          <h2 style={h2}>3. Requisiti di Accesso</h2>
          <h3 style={h3}>3.1 Eta minima</h3>
          <p style={p}>L'utilizzo di AI Simulator e <strong>vietato ai minori di 18 anni</strong>.</p>
          <h3 style={h3}>3.2 Residenza</h3>
          <p style={p}>Il servizio e disponibile esclusivamente in Paesi in cui l'accesso a strumenti di analisi per scommesse sportive e legalmente consentito.</p>
          <h3 style={h3}>3.3 Capacita d'agire</h3>
          <p style={p}>L'utente dichiara di possedere piena capacita giuridica e di agire per scopi personali, non commerciali.</p>

          <h2 style={h2}>4. Crediti, Abbonamenti e Acquisti</h2>
          <h3 style={h3}>4.1 Sistema a crediti</h3>
          <p style={p}>AI Simulator adotta un sistema a crediti per l'accesso ai pronostici. I crediti vengono scalati al momento dell'acquisto di un singolo pronostico.</p>
          <h3 style={h3}>4.2 Abbonamenti</h3>
          <p style={p}>AI Simulator puo offrire piani in abbonamento che includono crediti periodici o accesso illimitato a determinate funzionalita.</p>
          <h3 style={h3}>4.3 Pagamenti</h3>
          <p style={p}>I pagamenti sono gestiti tramite provider terzi certificati (es. Stripe). AI Simulator non archivia dati di pagamento dell'utente.</p>
          <h3 style={h3}>4.4 Rimborsi</h3>
          <p style={p}>I crediti acquistati non sono rimborsabili in denaro, salvo nei casi espressamente previsti dal presente documento (sezione 5.4) o per obbligo di legge.</p>

          <h2 style={h2}>5. Pronostici — Natura, Aggiornamenti e Ritiri</h2>
          <h3 style={h3}>5.1 Natura dei pronostici</h3>
          <p style={p}>I pronostici rappresentano una <strong>valutazione probabilistica</strong> e non una previsione certa. AI Simulator non garantisce la correttezza o la redditivita dei pronostici.</p>
          <h3 style={h3}>5.2 Generazione e tempistica</h3>
          <p style={p}>I pronostici vengono generati in anticipo e il sistema puo eseguire <strong>aggiornamenti successivi</strong> incorporando nuovi dati.</p>
          <h3 style={h3}>5.3 Aggiornamento post-acquisto</h3>
          <p style={warn}>Il pronostico acquistato potrebbe essere aggiornato fino a 1 ora prima dell'inizio del match. Si consiglia di attendere l'aggiornamento finale prima di effettuare puntate.</p>
          <p style={p}>In caso di aggiornamento: l'utente visualizza il pronostico originale barrato affiancato dal nuovo, riceve notifica e un disclaimer. <strong>Nessun rimborso</strong> per semplice aggiornamento.</p>
          <h3 style={h3}>5.4 Ritiro del pronostico</h3>
          <p style={p}>In caso di ritiro di un pronostico gia acquistato: notifica immediata, <strong>rimborso automatico dei 3 crediti</strong>, pronostico originale visibile con badge "RITIRATO". Rimborso solo se il ritiro avviene prima del fischio d'inizio.</p>
          <h3 style={h3}>5.5 Raccomandazione generale</h3>
          <ul style={ul}>
            <li>Attendere il piu possibile prima di effettuare puntate</li>
            <li>Non basare decisioni esclusivamente sui pronostici della piattaforma</li>
            <li>Considerare i pronostici come uno dei tanti strumenti di analisi</li>
          </ul>

          <h2 style={h2}>5.6 Copertura dei campionati e fasi playoff</h2>
          <p style={p}>I pronostici vengono emessi principalmente per le partite della <strong>stagione regolare</strong> dei campionati nazionali coperti dalla piattaforma.</p>
          <p style={p}>Di norma, AI Simulator <strong>non emette pronostici</strong> per le seguenti fasi dei campionati nazionali:</p>
          <ul style={ul}>
            <li>Playoff promozione e spareggi</li>
            <li>Playout retrocessione</li>
            <li>Gironi di championship/relegation post-season (es. Superligaen danese, Jupiler Pro League belga)</li>
          </ul>
          <p style={p}>Il motore AI e ottimizzato per la stagione regolare, dove il volume di dati storici e la continuita del formato garantiscono l'affidabilita statistica del modello. Le fasi post-season, con campioni ridotti e dinamiche competitive diverse, non raggiungono di norma gli standard di affidabilita richiesti dalla piattaforma.</p>
          <h3 style={h3}>5.6.1 Competizioni europee per club</h3>
          <p style={p}>Per le <strong>coppe europee</strong> (Champions League, Europa League, Conference League) la piattaforma utilizza <strong>algoritmi proprietari dedicati</strong> ottimizzati per il formato di queste competizioni. I pronostici per le coppe europee vengono pertanto emessi regolarmente.</p>
          <h3 style={h3}>5.6.2 Eccezioni occasionali</h3>
          <p style={p}>AI Simulator si riserva la facolta di emettere occasionalmente pronostici anche per fasi di playoff o playout di campionati nazionali, qualora ritenga che i dati disponibili siano sufficienti a garantire un livello di affidabilita adeguato. Tali pronostici saranno chiaramente identificati.</p>
          <p style={p}>L'elenco aggiornato dei campionati coperti e delle relative date di inizio/fine copertura e consultabile nella sezione dedicata dell'app.</p>

          <h2 style={h2}>6. Quote — Natura e Limitazioni</h2>
          <p style={p}>Le quote mostrate hanno natura <strong>indicativa e algoritmica</strong>. Possono differire dalle quote reali dei bookmakers. Non costituiscono un'offerta commerciale.</p>

          <h2 style={h2}>7. Stake — Natura e Variabilita</h2>
          <p style={p}>Lo stake consigliato rappresenta una <strong>percentuale indicativa del bankroll</strong>. Puo variare tra aggiornamenti. L'importo da puntare e una decisione personale dell'utente.</p>

          <h2 style={h2}>10. Proprieta Intellettuale</h2>
          <p style={p}>Tutti i contenuti sono di <strong>esclusiva proprieta di AI Simulator</strong>. E vietata la riproduzione o l'utilizzo commerciale senza autorizzazione scritta.</p>

          <h2 style={h2}>11. Modifiche al Servizio e ai Termini</h2>
          <p style={p}>AI Simulator si riserva il diritto di modificare termini, funzionalita, crediti e algoritmi. Le modifiche sostanziali verranno comunicate con un preavviso minimo di 15 giorni.</p>

          <h2 style={h2}>12. Legge Applicabile e Foro Competente</h2>
          <p style={p}>Documento regolato dalla <strong>legge italiana</strong>. Foro competente: <strong>Trieste</strong>.</p>
        </>
      )
    },
    privacy: {
      title: 'Privacy e Cookie Policy',
      content: (
        <>
          <p style={{ ...p, fontSize: '12px', color: dimText }}>Versione 1.0 — 11 marzo 2026 | Sezioni 13–14</p>

          <h2 style={h2}>13. Privacy Policy — Trattamento dei Dati Personali (GDPR)</h2>
          <p style={p}>Ai sensi del <strong>Regolamento (UE) 2016/679 (GDPR)</strong> e del <strong>D.Lgs. 196/2003</strong>.</p>

          <h3 style={h3}>13.1 Titolare del Trattamento</h3>
          <p style={p}><strong>Casciano Lorenzo</strong><br />Via di Rivalto, 1 — 34137 Trieste (TS)<br />C.F. CSCLNZ79M31L424G<br />Email: aisimulator.info@proton.me</p>

          <h3 style={h3}>13.2 Dati raccolti</h3>
          <p style={p}><strong>Dati forniti dall'utente:</strong> nome, cognome, email, password (criptata), dati di fatturazione.</p>
          <p style={p}><strong>Dati automatici:</strong> IP, browser, dispositivo, pagine visitate, durata sessione, cronologia acquisti.</p>
          <p style={p}><strong>Dati di pagamento:</strong> gestiti esclusivamente da Stripe Inc. AI Simulator non archivia ne ha accesso a tali dati.</p>

          <h3 style={h3}>13.3 Finalita del trattamento</h3>
          <ul style={ul}>
            <li>Erogazione del servizio (esecuzione contratto) — conservazione: durata rapporto + 10 anni</li>
            <li>Gestione pagamenti — come da normativa fiscale</li>
            <li>Comunicazioni di servizio — durata del rapporto</li>
            <li>Sicurezza e prevenzione frodi (interesse legittimo) — 12 mesi</li>
            <li>Marketing (solo con consenso esplicito) — fino a revoca</li>
            <li>Adempimenti fiscali e legali — come da normativa</li>
            <li>Analisi statistica anonima — tempo indeterminato</li>
          </ul>

          <h3 style={h3}>13.4 Condivisione con terze parti</h3>
          <ul style={ul}>
            <li><strong>Stripe Inc.</strong> — gestione pagamenti</li>
            <li><strong>Google Firebase / Google LLC</strong> — infrastruttura cloud e autenticazione</li>
            <li><strong>Provider email / notifiche</strong> — comunicazioni transazionali</li>
            <li><strong>Autorita competenti</strong> — in caso di obbligo di legge</li>
          </ul>
          <p style={p}>I dati non vengono venduti, ceduti o condivisi con terzi per scopi commerciali senza consenso esplicito.</p>

          <h3 style={h3}>13.5 Trasferimento dati extra-UE</h3>
          <p style={p}>Alcuni provider potrebbero trattare i dati in Paesi extra-UE. Il trasferimento avviene con adeguate garanzie contrattuali (Standard Contractual Clauses).</p>

          <h3 style={h3}>13.6 Diritti dell'utente</h3>
          <ul style={ul}>
            <li><strong>Accesso</strong>: ottenere conferma e copia dei propri dati</li>
            <li><strong>Rettifica</strong>: correggere dati inesatti</li>
            <li><strong>Cancellazione</strong>: diritto all'oblio</li>
            <li><strong>Limitazione</strong>: limitare il trattamento</li>
            <li><strong>Portabilita</strong>: ricevere i dati in formato strutturato</li>
            <li><strong>Opposizione</strong>: opporsi al trattamento</li>
            <li><strong>Revoca del consenso</strong>: in qualsiasi momento</li>
          </ul>
          <p style={p}>Contatto: <strong>aisimulator.info@proton.me</strong></p>
          <p style={p}>Reclamo: <strong>Garante per la Protezione dei Dati Personali</strong> (www.garanteprivacy.it)</p>

          <h3 style={h3}>13.7 Sicurezza dei dati</h3>
          <p style={p}>Misure adottate: cifratura HTTPS/TLS, hashing password, accesso limitato, backup periodici.</p>

          <h2 style={h2}>14. Cookie Policy</h2>
          <h3 style={h3}>14.1 Tipologie di cookie</h3>
          <ul style={ul}>
            <li><strong>Tecnici / di sessione</strong> — funzionamento sito, autenticazione (no consenso)</li>
            <li><strong>Funzionali</strong> — preferenze utente, lingua — 12 mesi (no consenso)</li>
            <li><strong>Analitici anonimizzati</strong> — statistiche — 13 mesi (no consenso se anonimizzati)</li>
            <li><strong>Marketing / profilazione</strong> — pubblicita personalizzata (consenso richiesto)</li>
          </ul>
          <h3 style={h3}>14.2 Gestione dei cookie</h3>
          <p style={p}>Gestibile tramite banner cookie, impostazioni browser o pagina preferenze privacy. La disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento del servizio.</p>
        </>
      )
    },
    disclaimer: {
      title: 'Disclaimer e Gioco Responsabile',
      content: (
        <>
          <p style={{ ...p, fontSize: '12px', color: dimText }}>Versione 1.0 — 11 marzo 2026 | Sezioni 8–9</p>

          <h2 style={h2}>8. Disclaimer di Non Responsabilita</h2>

          <h3 style={h3}>8.1 Esclusione generale di responsabilita</h3>
          <p style={p}>AI Simulator e uno <strong>strumento di analisi informatica a scopo puramente informativo</strong>.</p>
          <p style={p}><strong>AI Simulator non e in alcun modo responsabile per:</strong></p>
          <ul style={ul}>
            <li>Perdite economiche derivanti da puntate effettuate sulla base dei contenuti della piattaforma</li>
            <li>Decisioni di scommessa prese dall'utente</li>
            <li>Danni diretti, indiretti, incidentali, consequenziali o punitivi</li>
            <li>Malfunzionamenti tecnici, interruzioni del servizio o errori nei dati</li>
            <li>Discrepanze tra quote mostrate e quote reali dei bookmakers</li>
            <li>Comportamenti di terzi, inclusi bookmakers e operatori di gioco</li>
          </ul>

          <h3 style={h3}>8.2 Responsabilita esclusiva dell'utente</h3>
          <p style={p}>Qualsiasi decisione presa dall'utente e di <strong>esclusiva e totale responsabilita dell'utente stesso</strong>.</p>
          <ul style={ul}>
            <li>Il gioco d'azzardo comporta rischi economici reali</li>
            <li>Nessun sistema algoritmico puo prevedere con certezza l'esito di un evento sportivo</li>
            <li>L'utilizzo di AI Simulator non riduce ne elimina il rischio</li>
            <li>AI Simulator non e un consulente finanziario</li>
          </ul>

          <h3 style={h3}>8.3 Esclusione di responsabilita per dipendenza patologica</h3>
          <p style={p}>AI Simulator declina ogni responsabilita per lo sviluppo di comportamenti compulsivi o dipendenza dal gioco d'azzardo (ludopatia).</p>

          <h3 style={h3}>8.4 Limitazione di responsabilita tecnica</h3>
          <p style={p}>Il servizio e offerto "cosi com'e" (<em>as-is</em>) senza garanzie implicite o esplicite.</p>

          <h2 style={h2}>9. Gioco Responsabile</h2>
          <p style={p}>AI Simulator non incentiva il gioco d'azzardo. La piattaforma e uno <strong>strumento di analisi per utenti adulti</strong>.</p>

          <h3 style={h3}>9.1 Principi fondamentali</h3>
          <ul style={ul}>
            <li>Scommetti solo su siti autorizzati <strong>ADM</strong> (Agenzia delle Dogane e dei Monopoli)</li>
            <li>Gioca solo con somme che puoi permetterti di perdere</li>
            <li>Non inseguire le perdite aumentando le puntate</li>
            <li>Stabilisci in anticipo un limite di spesa e rispettalo</li>
            <li>Il gioco deve rimanere un'attivita ricreativa, non una fonte di reddito</li>
          </ul>

          <h3 style={h3}>9.2 Segnali di allarme</h3>
          <ul style={ul}>
            <li>Pensi al gioco in modo ossessivo</li>
            <li>Scommetti somme sempre piu elevate</li>
            <li>Hai difficolta a smettere di giocare</li>
            <li>Il gioco interferisce con lavoro, famiglia o vita sociale</li>
            <li>Hai mentito riguardo alle abitudini di gioco</li>
            <li>Hai contratto debiti per giocare</li>
          </ul>

          <h3 style={h3}>9.3 Risorse di supporto</h3>
          <ul style={ul}>
            <li><strong>Numero Verde Nazionale</strong>: 800 558 822 (gratuito, attivo 24h)</li>
            <li><strong>ADM Gioco Responsabile</strong>: <a href="https://www.adm.gov.it" target="_blank" rel="noopener noreferrer" style={{ color: accent }}>www.adm.gov.it</a></li>
            <li><strong>Gambling Therapy</strong>: <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer" style={{ color: accent }}>www.gamblingtherapy.org</a></li>
            <li><strong>Giocatori Anonimi Italia</strong>: <a href="https://www.giocatorianonimi.it" target="_blank" rel="noopener noreferrer" style={{ color: accent }}>www.giocatorianonimi.it</a></li>
          </ul>
        </>
      )
    }
  };

  const info = sections[path] || sections.termini;

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px 16px', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button onClick={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.close();
          }
        }} style={{
          background: 'transparent', border: 'none', color: accent,
          cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: 0, marginBottom: 20,
        }}>
          &larr; {window.history.length > 1 ? 'Indietro' : 'Chiudi'}
        </button>

        <div style={{
          background: card, borderRadius: '12px', padding: '32px 28px',
          border: `1px solid ${border}`,
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: heading, margin: '0 0 4px' }}>
            {info.title}
          </h1>
          {info.content}

          <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${border}`, fontSize: '12px', color: dimText }}>
            <p style={{ margin: '0 0 4px' }}>Titolare: Casciano Lorenzo — Via di Rivalto, 1 — 34137 Trieste (TS)</p>
            <p style={{ margin: '0 0 4px' }}>C.F. CSCLNZ79M31L424G — Email: aisimulator.info@proton.me</p>
            <p style={{ margin: '0 0 4px' }}>
              Vedi anche:{' '}
              {path !== 'termini' && <a href="/termini" style={{ color: accent }}>Termini</a>}
              {path !== 'termini' && path !== 'privacy' && ' | '}
              {path !== 'privacy' && <a href="/privacy" style={{ color: accent }}>Privacy</a>}
              {path !== 'disclaimer' && ' | '}
              {path !== 'disclaimer' && <a href="/disclaimer" style={{ color: accent }}>Disclaimer</a>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
