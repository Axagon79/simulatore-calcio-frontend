// RedattoreProfilo.tsx
// ====================
// Modale che mostra il profilo del redattore quando l'utente clicca sul nome.
// Avatar = iniziali colorate (placeholder, in futuro illustrazione AI).

import React, { useEffect } from 'react';
import type { Redattore } from './redattori';

interface Props {
  redattore: Redattore;
  onClose: () => void;
}

// Gradient deterministico da hash dell'id redattore (palette warm/cool).
function avatarGradient(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const pairs: Array<[string, string]> = [
    ['#22d3ee', '#0ea5b7'], ['#a855f7', '#6b21a8'], ['#f87171', '#991b1b'],
    ['#facc15', '#b45309'], ['#4ade80', '#166534'], ['#60a5fa', '#1e40af'],
    ['#f472b6', '#9d174d'], ['#fb923c', '#9a3412'], ['#38bdf8', '#0369a1'],
    ['#a78bfa', '#5b21b6'], ['#34d399', '#065f46'], ['#fcd34d', '#92400e'],
  ];
  const p = pairs[Math.abs(h) % pairs.length];
  return `radial-gradient(circle at 35% 30%, ${p[0]}, ${p[1]} 75%)`;
}

const RedattoreProfilo: React.FC<Props> = ({ redattore, onClose }) => {
  // Chiude su ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const eta = new Date().getFullYear() - redattore.classe;
  const inizialeAvatar = redattore.nome.charAt(0).toUpperCase();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-2, #0d0f15)',
          border: '1px solid var(--line, rgba(255,255,255,0.12))',
          borderRadius: 14, maxWidth: 520, width: '100%',
          padding: 32, position: 'relative',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: 'var(--t, rgba(255,255,255,0.92))',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--t-faint, rgba(255,255,255,0.4))', fontSize: 22,
            width: 32, height: 32, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
          }}
        >×</button>

        {/* HEADER avatar + nome */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: avatarGradient(redattore.id),
            display: 'grid', placeItems: 'center',
            color: '#fff', fontWeight: 700, fontSize: 36,
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)', flex: 'none',
          }}>{inizialeAvatar}</div>
          <div>
            <div style={{
              fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>{redattore.nome}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--cyan, #22d3ee)', marginTop: 6,
            }}>Redazione AI Simulator</div>
          </div>
        </div>

        {/* BIO */}
        <p style={{
          color: 'var(--t-dim, rgba(255,255,255,0.65))',
          fontSize: 15, lineHeight: 1.6, margin: '0 0 22px',
        }}>{redattore.bio}</p>

        {/* SCHEDA tecnica */}
        <div style={{
          border: '1px solid var(--line, rgba(255,255,255,0.08))',
          borderRadius: 10, padding: '14px 18px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        }}>
          <Riga label="Età" value={`${eta} anni · classe ${redattore.classe}`} />
          <Riga label="Città" value={redattore.citta} />
          {redattore.paese_origine && (
            <Riga label="Origine" value={redattore.paese_origine} />
          )}
          <Riga label="Squadra del cuore" value={redattore.squadra_cuore} />
          {redattore.leghe_specialista.length > 0 && (
            <Riga label="Specializzazione" value={dedupListLabels(redattore.leghe_specialista).join(' · ')} />
          )}
          <Riga label="Mercato preferito" value={redattore.mercati_preferiti.join(' + ')} />
        </div>
      </div>
    </div>
  );
};

// Toglie i duplicati visivi nelle leghe specialista (es. Brasileirão Serie A vs Brasileirao Serie A).
function dedupListLabels(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

const Riga: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', gap: 14,
    padding: '7px 0',
    borderBottom: '1px dotted var(--line, rgba(255,255,255,0.08))',
    fontSize: 12,
  }}>
    <span style={{ color: 'var(--t-faint, rgba(255,255,255,0.4))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    <span style={{ color: 'var(--t, rgba(255,255,255,0.92))', fontWeight: 500, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
  </div>
);

export default RedattoreProfilo;
