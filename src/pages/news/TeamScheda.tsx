import React from 'react';

interface TeamSchedaProps {
  nome: string;
  loading: boolean;
  data: any | null;
  error: string | null;
  onClose: () => void;
}

const TeamScheda: React.FC<TeamSchedaProps> = ({ nome, loading, data, error, onClose }) => {
  const team = data?.team;
  const venue = data?.venue;
  const manager = data?.manager;
  const rank = data?.rank;
  const seasonal = data?.seasonal_stats;
  const displayName = team?.name || nome;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
          maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto',
          padding: '28px 28px 24px', color: 'var(--t)', fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 6 }}>Scheda squadra</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{displayName}</h2>
            {team?.country && <div style={{ fontSize: 12, color: 'var(--t-dim)', marginTop: 4 }}>{team.country} · {team.league_name || '—'}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--t-faint)', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}
            aria-label="Chiudi"
          >×</button>
        </div>

        {loading && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            Caricamento…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '20px 0', color: 'var(--t-dim)', fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}>Dati non disponibili per <b>{nome}</b>.</div>
            <div style={{ color: 'var(--t-faint)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>
          </div>
        )}

        {data && !loading && (
          <>
            {venue && (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 10, marginTop: 4 }}>Stadio</div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13.5, marginBottom: 18 }}>
                  <div style={{ color: 'var(--t-faint)' }}>Nome</div><div>{venue.name || '—'}</div>
                  <div style={{ color: 'var(--t-faint)' }}>Città</div><div>{venue.city || '—'}</div>
                  <div style={{ color: 'var(--t-faint)' }}>Capienza</div><div>{venue.capacity ? venue.capacity.toLocaleString('it-IT') : '—'}</div>
                  <div style={{ color: 'var(--t-faint)' }}>Costruito nel</div><div>{venue.built_year || '—'}</div>
                  {venue.pitch_length_m && (
                    <>
                      <div style={{ color: 'var(--t-faint)' }}>Campo</div><div>{venue.pitch_length_m}×{venue.pitch_width_m} m</div>
                    </>
                  )}
                </div>
              </>
            )}

            {manager && (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 10, borderTop: '1px solid var(--line)', paddingTop: 16 }}>Allenatore</div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13.5, marginBottom: 18 }}>
                  <div style={{ color: 'var(--t-faint)' }}>Nome</div><div style={{ fontWeight: 500 }}>{manager.name || '—'}</div>
                  <div style={{ color: 'var(--t-faint)' }}>Nazionalità</div><div>{manager.country || '—'}</div>
                  <div style={{ color: 'var(--t-faint)' }}>Modulo</div><div>{manager.preferred_formation || '—'}</div>
                  <div style={{ color: 'var(--t-faint)' }}>Profilo</div><div style={{ textTransform: 'capitalize' }}>{manager.tactical_profile || '—'}</div>
                  {manager.matches_total != null && (
                    <>
                      <div style={{ color: 'var(--t-faint)' }}>Record</div><div>{manager.wins}V {manager.draws}N {manager.losses}P <span style={{ color: 'var(--t-faint)' }}>· {manager.win_pct?.toFixed(1)}%</span></div>
                      <div style={{ color: 'var(--t-faint)' }}>Media gol</div><div>{manager.avg_goals_scored?.toFixed(2)} – {manager.avg_goals_conceded?.toFixed(2)}</div>
                      <div style={{ color: 'var(--t-faint)' }}>Possesso</div><div>{manager.avg_possession?.toFixed(1)}%</div>
                    </>
                  )}
                </div>
              </>
            )}

            {(rank || seasonal) && (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 10, borderTop: '1px solid var(--line)', paddingTop: 16 }}>Stagione corrente</div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13.5, marginBottom: 18 }}>
                  {rank?.rank != null && (
                    <>
                      <div style={{ color: 'var(--t-faint)' }}>Posizione</div><div style={{ color: 'var(--cyan)', fontWeight: 500 }}>{rank.rank}° · {rank.points} pt</div>
                      <div style={{ color: 'var(--t-faint)' }}>Record</div><div>{rank.wins}V {rank.draws}N {rank.losses}P</div>
                    </>
                  )}
                  {seasonal?.xg_avg != null && (
                    <>
                      <div style={{ color: 'var(--t-faint)' }}>xG medio</div><div>{seasonal.xg_avg.toFixed(2)}</div>
                    </>
                  )}
                </div>
              </>
            )}

            {team?.coppe_partecipa?.length > 0 && (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-faint)', marginBottom: 10, borderTop: '1px solid var(--line)', paddingTop: 16 }}>Coppe disputate</div>
                <div style={{ fontSize: 13, color: 'var(--t-dim)', marginBottom: 18 }}>{team.coppe_partecipa.join(' · ')}</div>
              </>
            )}

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 10.5, color: 'var(--t-faint)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textAlign: 'right' }}>
              fonte · bzzoiro · id {team?.bzzoiro_id || '?'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamScheda;
