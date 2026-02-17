const theme = {
  bg: '#05070a',
  panel: 'rgba(18, 20, 35, 0.85)',
  panelBorder: '1px solid rgba(0, 240, 255, 0.2)',
  cyan: '#00f0ff',
  text: '#ffffff',
  textDim: '#8b9bb4',
  danger: '#ff2a6d',
  success: '#05f9b6',
  warning: '#ff9f43',
  gold: '#ffd700',
  font: '"Inter", "Segoe UI", sans-serif'
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: theme.panel, border: theme.panelBorder, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
    <h2 style={{ color: theme.cyan, fontSize: '16px', fontWeight: '800', marginBottom: '12px', margin: 0 }}>{title}</h2>
    <div style={{ color: theme.textDim, fontSize: '13px', lineHeight: 1.8 }}>{children}</div>
  </div>
);

export default function MoneyManagement({ onBack }: { onBack?: () => void }) {
  return (
    <div style={{ background: theme.bg, minHeight: '100vh', fontFamily: theme.font }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: theme.text, fontSize: '22px', fontWeight: '900', margin: 0 }}>Money Management</h1>
        {onBack && <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', color: theme.textDim, border: 'none', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Indietro</button>}
      </div>

      <Section title="Cos'e il Bankroll Management?">
        <p>Il <strong style={{ color: theme.text }}>bankroll management</strong> e la disciplina di gestire il proprio capitale dedicato alle scommesse in modo professionale e sostenibile.</p>
        <p>L'obiettivo non e vincere ogni singola scommessa, ma <strong style={{ color: theme.success }}>generare profitto nel lungo periodo</strong> mantenendo il rischio sotto controllo.</p>
        <p>Un buon bankroll management e la differenza tra uno scommettitore amatoriale e uno professionista.</p>
      </Section>

      <Section title="Il Criterio di Kelly (Quarter Kelly)">
        <p>Il <strong style={{ color: theme.text }}>Criterio di Kelly</strong> e una formula matematica che determina la dimensione ottimale di ogni puntata basandosi su:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong style={{ color: theme.text }}>Probabilita stimata</strong> — quanto e probabile che il pronostico sia corretto</li>
          <li><strong style={{ color: theme.text }}>Quota offerta</strong> — il moltiplicatore del bookmaker</li>
          <li><strong style={{ color: theme.text }}>Edge</strong> — il vantaggio stimato rispetto al mercato</li>
        </ul>
        <p>Noi utilizziamo il <strong style={{ color: theme.gold }}>Quarter Kelly</strong> (1/4 del Kelly pieno), una versione molto piu conservativa che riduce drasticamente il rischio di rovina mantenendo una buona crescita del bankroll.</p>
        <div style={{ background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '8px', padding: '12px', margin: '10px 0', fontFamily: 'monospace', fontSize: '12px', color: theme.cyan }}>
          stake = (prob × quota - 1) / (quota - 1) / 4 × 100
        </div>
      </Section>

      <Section title="Scala Stake 1-10">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '8px', color: theme.textDim }}>Stake</th>
              <th style={{ textAlign: 'left', padding: '8px', color: theme.textDim }}>Livello</th>
              <th style={{ textAlign: 'right', padding: '8px', color: theme.textDim }}>% Bankroll</th>
              <th style={{ textAlign: 'left', padding: '8px', color: theme.textDim }}>Quando</th>
            </tr>
          </thead>
          <tbody>
            {[
              { s: '0', l: 'No Value', p: '0%', w: 'Edge negativo - non scommettere', c: '#666' },
              { s: '1', l: 'Prudenziale', p: '1%', w: 'Edge minimo, valore incerto', c: '#4dd0e1' },
              { s: '2', l: 'Standard', p: '2%', w: 'Valore moderato, buon compromesso', c: '#4dd0e1' },
              { s: '3', l: 'Buona confidenza', p: '3%', w: 'Segnali concordi, edge significativo', c: '#66bb6a' },
              { s: '4-5', l: 'Alta / Top Bet', p: '4-5%', w: 'Edge forte, alta probabilita', c: '#ffa726' },
              { s: '6-10', l: 'Sure Bet', p: '6-10%', w: 'Rarissimo, edge eccezionale', c: '#ff5252' },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px', color: r.c, fontWeight: '800' }}>{r.s}</td>
                <td style={{ padding: '8px', color: theme.text }}>{r.l}</td>
                <td style={{ textAlign: 'right', padding: '8px', color: theme.textDim }}>{r.p}</td>
                <td style={{ padding: '8px', color: theme.textDim, fontSize: '11px' }}>{r.w}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Regole d'Oro">
        <ol style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: theme.text }}>Definisci il tuo bankroll</strong> — Stabilisci un importo che puoi permetterti di perdere completamente. Questo e il tuo bankroll.</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: theme.text }}>Mai piu del 5% su una singola scommessa</strong> — Anche con la massima confidenza, non superare mai il 5% del bankroll.</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: theme.text }}>Non inseguire le perdite</strong> — Se hai una giornata negativa, non aumentare gli stake per "recuperare". Rispetta il piano.</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: theme.text }}>Tieni traccia di tutto</strong> — Monitora i tuoi risultati. La pagina Bankroll ti aiuta a farlo automaticamente.</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: theme.text }}>Scommetti solo con edge positivo</strong> — Se lo stake suggerito e 0 (No Value), non scommettere. Non esiste "l'intuizione".</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: theme.text }}>Pensa nel lungo periodo</strong> — Anche il miglior sistema ha periodi negativi. Il profitto si vede su 500+ scommesse.</li>
        </ol>
      </Section>

      <Section title="Confidence vs Stake: Perche Possono Differire">
        <p>Potresti notare una partita con <strong style={{ color: theme.gold }}>confidence 85%</strong> ma <strong style={{ color: '#4dd0e1' }}>stake solo 2</strong>. Non e un errore!</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong style={{ color: theme.text }}>Confidence</strong> = quanto l'algoritmo e sicuro della previsione (basato sui segnali)</li>
          <li><strong style={{ color: theme.text }}>Stake</strong> = quanto conviene puntare (basato sul VALUE = probabilita vs quota)</li>
        </ul>
        <p>Se una favorita ha confidence 85% ma quota 1.15, il VALUE e minimo perche il bookmaker gia offre una quota bassissima. Alta confidence, basso stake.</p>
        <p>Al contrario, uno stake 4 con confidence 65% significa che le quote offrono un valore eccezionale rispetto alla nostra stima.</p>
      </Section>

      {/* Disclaimer */}
      <div style={{
        background: 'rgba(255,42,109,0.05)',
        border: '1px solid rgba(255,42,109,0.15)',
        borderRadius: '10px', padding: '16px', marginBottom: '20px',
        fontSize: '11px', color: theme.textDim, lineHeight: 1.6
      }}>
        <div style={{ fontWeight: '800', color: theme.danger, marginBottom: '8px', fontSize: '12px' }}>Avvertenze importanti</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li><strong>Il gioco d'azzardo puo causare dipendenza.</strong> Gioca responsabilmente.</li>
          <li>Questo servizio e riservato a maggiorenni (18+).</li>
          <li>Le statistiche e i pronostici non costituiscono garanzia di profitto.</li>
          <li>Non puntare mai denaro che non puoi permetterti di perdere.</li>
          <li>I risultati passati non garantiscono rendimenti futuri.</li>
          <li>Stabilisci un budget mensile e rispettalo.</li>
        </ul>
        <div style={{ marginTop: '8px' }}>
          <strong>Hai bisogno di aiuto?</strong> Numero Verde Dipendenze: <span style={{ color: theme.cyan }}>800 55 88 22</span>
        </div>
      </div>
      </div>
    </div>
  );
}
