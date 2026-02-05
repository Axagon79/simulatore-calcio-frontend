interface CronacaEvent {
  tipo: string;
  minuto: number;
  testo: string;
  squadra?: 'casa' | 'ospite';
  decision?: string;
  var_type?: string;
}

interface SimResult {
  gh: number;
  ga: number;
  cronaca?: CronacaEvent[];
  statistiche?: { [key: string]: [string | number, string | number] };
}

interface Match {
  home: string;
  away: string;
}

interface Theme {
  purple: string;
  text: string;
  textDim: string;
  cyan: string;
  danger: string;
}

interface PopupRiepilogoProps {
  show: boolean;
  simResult: SimResult | null;
  selectedMatch: Match | null;
  onClose: () => void;
  theme: Theme;
}

export default function PopupRiepilogo({
  show,
  simResult,
  selectedMatch,
  onClose,
  theme
}: PopupRiepilogoProps) {

  if (!show || !simResult) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          border: `2px solid ${theme.purple}`,
          boxShadow: `0 0 40px rgba(188,19,254,0.4)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: theme.text, margin: 0, fontSize: '18px' }}>
            📊 RIEPILOGO PARTITA
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.text,
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >✕</button>
        </div>

        {/* Risultato */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '14px', color: theme.textDim, marginBottom: '5px' }}>RISULTATO FINALE</div>
          <div style={{ fontSize: '36px', fontWeight: '900' }}>
            <span style={{ color: theme.cyan }}>{simResult.gh}</span>
            <span style={{ color: theme.textDim }}> - </span>
            <span style={{ color: theme.danger }}>{simResult.ga}</span>
          </div>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>
            <span style={{ color: theme.cyan }}>{selectedMatch?.home}</span>
            <span style={{ color: theme.textDim }}> vs </span>
            <span style={{ color: theme.danger }}>{selectedMatch?.away}</span>
          </div>
        </div>

        {/* Marcatori */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: theme.textDim, marginBottom: '8px' }}>⚽ MARCATORI</div>
          <div style={{ fontSize: '13px', color: theme.text }}>
            {simResult.cronaca?.filter((e) => {
              // Mostra solo i gol che NON hanno un VAR_VERDICT annullato
              if (e.tipo !== 'gol') return false;

              // Cerca se c'è un VAR che annulla questo gol
              const varAnnullato = simResult.cronaca?.find((v) =>
                v.minuto === e.minuto &&
                v.tipo === 'VAR_VERDICT' &&
                v.decision === 'annullato' &&
                v.var_type === 'gol'
              );

              // Mostra il gol SOLO se NON è stato annullato
              return !varAnnullato;
            }).map((e, i) => {

              const testoPulito = e.testo
                .replace(/^\d+'/, '')           // Rimuove "22' "
                .replace('⚽ ', '')             // Rimuove "⚽ "
                .replace(/\[.*?\]\s*/, '')      // Rimuove "[CELTA VIGO] "
                .replace('GOOOL! ', '')         // Rimuove "GOOOL! "
                .replace(/ - .*$/, '')          // Rimuove " - Zittisce lo stadio!"
                .trim();

              const squadraNome = e.squadra === 'casa' ? selectedMatch?.home : selectedMatch?.away;

              return (
                <div key={i} style={{
                  marginBottom: '3px',
                  color: e.squadra === 'casa' ? theme.cyan : theme.danger
                }}>
                  <strong>{e.minuto}'</strong> {testoPulito} ({squadraNome})
                </div>
              );
            })}
          </div>
        </div>

        {/* Statistiche con barre */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '11px',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {simResult.statistiche && Object.entries(simResult.statistiche)
            .filter(([key]) =>
              !key.includes('PT') &&
              ['Possesso', 'Tiri Totali', 'Tiri in Porta', 'Tiri Fuori', 'Calci d\'Angolo', 'Attacchi', 'Attacchi Pericolosi'].some(stat => key.includes(stat))
            )
            .map(([key, val]) => {
              const homeVal = Number(val[0]);
              const awayVal = Number(val[1]);
              const total = homeVal + awayVal;

              return (
                <div key={key} style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '6px',
                  border: '1px solid rgba(0,240,255,0.1)'
                }}>
                  <div style={{ fontSize: '9px', color: theme.textDim, textAlign: 'center', marginBottom: '6px' }}>
                    {key.replace('PT', '')}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    width: '100%'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: theme.cyan,
                      minWidth: '20px',
                      textAlign: 'right'
                    }}>
                      {val[0]}
                    </span>

                    <div style={{
                      flex: 1,
                      height: '8px',
                      position: 'relative',
                      display: 'flex'
                    }}>
                      {/* CASA - Centro → Sinistra */}
                      <div style={{
                        position: 'absolute',
                        right: 'calc(50% + 4px)',
                        width: `${(homeVal / total) * 48}%`,
                        height: '100%',
                        background: theme.cyan,
                        boxShadow: '0 0 8px rgba(0,240,255,0.5)',
                        borderRadius: '4px 0 0 4px'
                      }} />

                      {/* "-" CENTRALE */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        width: '8px',
                        height: '100%',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                        color: theme.textDim,
                        transform: 'translateX(-50%)'
                      }}>
                        -
                      </div>

                      {/* TRASFERTA - Centro → Destra */}
                      <div style={{
                        position: 'absolute',
                        left: 'calc(50% + 4px)',
                        width: `${(awayVal / total) * 48}%`,
                        height: '100%',
                        background: theme.danger,
                        boxShadow: '0 0 8px rgba(255,42,109,0.5)',
                        borderRadius: '0 4px 4px 0'
                      }} />
                    </div>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: theme.danger,
                      minWidth: '20px',
                      textAlign: 'left'
                    }}>
                      {val[1]}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

      </div>
    </div>
  );
}
