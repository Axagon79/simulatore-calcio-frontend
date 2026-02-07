// src/pages/PredictionsMixer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AI_ENGINE_BASE = 'https://us-central1-puppals-456c7.cloudfunctions.net';

// --- TAB E COSTANTI ---
type TabId = 'SEGNO' | 'GOL' | 'BOMBA' | 'SOGLIE';

const TABS: { id: TabId; label: string; icon: string; color: string }[] = [
  { id: 'SEGNO', label: 'SEGNO', icon: '1X2', color: '#3b82f6' },
  { id: 'GOL', label: 'GOL', icon: '\u26BD', color: '#22c55e' },
  { id: 'BOMBA', label: 'BOMBA', icon: '\uD83D\uDCA3', color: '#ef4444' },
  { id: 'SOGLIE', label: 'SOGLIE', icon: '\uD83C\uDF9A\uFE0F', color: '#eab308' },
];

const PESI_SEGNO_KEYS = ['bvs', 'quote', 'lucifero', 'affidabilita', 'dna', 'motivazioni', 'h2h', 'campo'];
const PESI_GOL_KEYS = ['media_gol', 'att_vs_def', 'xg', 'h2h_gol', 'media_lega', 'dna_off_def'];
const PESI_BOMBA_KEYS = ['lucifero_sfi', 'bvs_anomalo', 'motivazione_sfi', 'affidabilita', 'h2h_sfi'];
const SOGLIE_KEYS = ['THRESHOLD_INCLUDE', 'THRESHOLD_HIGH', 'THRESHOLD_BOMBA'];

const LABELS: Record<string, string> = {
  bvs: 'BVS (Quote)', quote: 'Quote Dirette', lucifero: 'Lucifero', affidabilita: 'Affidabilita',
  dna: 'DNA Squadra', motivazioni: 'Motivazioni', h2h: 'Head to Head', campo: 'Fattore Campo',
  media_gol: 'Media Gol', att_vs_def: 'Attacco vs Difesa', xg: 'Expected Goals',
  h2h_gol: 'H2H Gol', media_lega: 'Media Lega', dna_off_def: 'DNA Off/Def',
  lucifero_sfi: 'Lucifero Sfi', bvs_anomalo: 'BVS Anomalo', motivazione_sfi: 'Motivazione Sfi',
  h2h_sfi: 'H2H Sfi',
  THRESHOLD_INCLUDE: 'Soglia Inclusione', THRESHOLD_HIGH: 'Soglia Alta Confidence', THRESHOLD_BOMBA: 'Soglia Bomba',
};

interface PredConfig {
  PESI_SEGNO: Record<string, number>;
  PESI_GOL: Record<string, number>;
  PESI_BOMBA: Record<string, number>;
  SOGLIE: Record<string, number>;
}

const DEFAULT_CONFIG: PredConfig = {
  PESI_SEGNO: { bvs: 0.25, quote: 0.18, lucifero: 0.18, affidabilita: 0.14, dna: 0.08, motivazioni: 0.08, h2h: 0.05, campo: 0.04 },
  PESI_GOL: { media_gol: 0.25, att_vs_def: 0.22, xg: 0.20, h2h_gol: 0.15, media_lega: 0.10, dna_off_def: 0.08 },
  PESI_BOMBA: { lucifero_sfi: 0.30, bvs_anomalo: 0.25, motivazione_sfi: 0.20, affidabilita: 0.15, h2h_sfi: 0.10 },
  SOGLIE: { THRESHOLD_INCLUDE: 60, THRESHOLD_HIGH: 70, THRESHOLD_BOMBA: 65 },
};

const deepClone = (obj: PredConfig): PredConfig => JSON.parse(JSON.stringify(obj));

// --- COMPONENTE PRINCIPALE ---
const PredictionsMixer: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('SEGNO');
  const [config, setConfig] = useState<PredConfig>(deepClone(DEFAULT_CONFIG));
  const [hasChanges, setHasChanges] = useState(false);

  const [presetsList, setPresetsList] = useState<string[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  // --- API ---
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${AI_ENGINE_BASE}/get_prediction_tuning`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      } else {
        setConfig(deepClone(DEFAULT_CONFIG));
      }
    } catch {
      setConfig(deepClone(DEFAULT_CONFIG));
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${AI_ENGINE_BASE}/save_prediction_tuning`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.success) {
        setHasChanges(false);
        setSuccess('Salvato!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Errore salvataggio');
      }
    } catch {
      setError('Errore connessione');
    } finally {
      setSaving(false);
    }
  };

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch(`${AI_ENGINE_BASE}/list_prediction_presets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setPresetsList(data.presets.map((p: { name: string }) => p.name));
      }
    } catch { /* silent */ }
  }, []);

  const handleSavePreset = async () => {
    if (!presetName.trim()) { alert('Inserisci un nome!'); return; }
    if (presetsList.includes(presetName) && !window.confirm(`"${presetName}" esiste. Sovrascrivere?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`${AI_ENGINE_BASE}/save_prediction_preset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: presetName, config }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Preset "${presetName}" salvato!`);
        setTimeout(() => setSuccess(null), 3000);
        loadPresets();
        setPresetName('');
      } else setError(data.error || 'Errore');
    } catch { setError('Errore connessione'); }
    finally { setSaving(false); }
  };

  const handleLoadPreset = async () => {
    if (!selectedPreset) { alert('Seleziona un preset!'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${AI_ENGINE_BASE}/load_prediction_preset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedPreset }),
      });
      const data = await res.json();
      if (data.success && data.preset?.config) {
        setConfig(data.preset.config);
        setHasChanges(true);
        setSuccess(`Preset "${selectedPreset}" caricato!`);
        setTimeout(() => setSuccess(null), 3000);
      } else setError(data.error || 'Errore');
    } catch { setError('Errore connessione'); }
    finally { setLoading(false); }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;
    if (!window.confirm(`Eliminare "${selectedPreset}"?`)) return;
    try {
      const res = await fetch(`${AI_ENGINE_BASE}/delete_prediction_preset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedPreset }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Eliminato!`);
        setTimeout(() => setSuccess(null), 3000);
        setSelectedPreset('');
        loadPresets();
      }
    } catch { setError('Errore connessione'); }
  };

  useEffect(() => { loadConfig(); loadPresets(); }, [loadConfig, loadPresets]);

  // --- LOGICA PESI ---
  const getSection = (): 'PESI_SEGNO' | 'PESI_GOL' | 'PESI_BOMBA' | 'SOGLIE' => {
    if (activeTab === 'SEGNO') return 'PESI_SEGNO';
    if (activeTab === 'GOL') return 'PESI_GOL';
    if (activeTab === 'BOMBA') return 'PESI_BOMBA';
    return 'SOGLIE';
  };

  const getKeys = (): string[] => {
    if (activeTab === 'SEGNO') return PESI_SEGNO_KEYS;
    if (activeTab === 'GOL') return PESI_GOL_KEYS;
    if (activeTab === 'BOMBA') return PESI_BOMBA_KEYS;
    return SOGLIE_KEYS;
  };

  const isSoglieTab = activeTab === 'SOGLIE';
  const section = getSection();
  const keys = getKeys();
  const currentValues = config[section];

  const sum = isSoglieTab ? 0 : Object.values(currentValues).reduce((a, b) => a + b, 0);
  const sumOk = isSoglieTab || Math.abs(sum - 1.0) < 0.001;
  const canSave = sumOk;

  const handleChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setHasChanges(true);
  };

  const resetToDefault = () => {
    setConfig(deepClone(DEFAULT_CONFIG));
    setHasChanges(true);
  };

  const tabColor = TABS.find(t => t.id === activeTab)?.color || '#3b82f6';

  if (loading) {
    return (
      <div style={st.loadingWrap}>
        <div style={st.spinner} />
        <p style={{ color: '#666', marginTop: 20 }}>Caricamento Predictions Mixer...</p>
      </div>
    );
  }

  return (
    <div style={st.wrapper}>
      {/* HEADER */}
      <header style={st.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button style={st.backBtn} onClick={() => navigate('/')}>← Dashboard</button>
          <span style={{ fontSize: 24 }}>{'\uD83D\uDD2E'}</span>
          <div>
            <h1 style={st.title}>PREDICTIONS MIXER</h1>
            <span style={st.subtitle}>Daily Predictions Tuning • Sandbox</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Preset controls */}
          <input type="text" placeholder="Nome preset..." value={presetName}
            onChange={e => setPresetName(e.target.value)}
            style={st.presetInput} />
          <button onClick={handleSavePreset} disabled={saving} style={st.presetSaveBtn}>
            {'\uD83D\uDCBE'} Salva
          </button>
          <select value={selectedPreset} onChange={e => setSelectedPreset(e.target.value)} style={st.presetSelect}>
            <option value="" style={{ background: '#1a1a2e', color: '#fff' }}>-- Preset --</option>
            {presetsList.map(n => <option key={n} value={n} style={{ background: '#1a1a2e', color: '#fff' }}>{n}</option>)}
          </select>
          <button onClick={handleLoadPreset} disabled={!selectedPreset}
            style={{ ...st.presetActionBtn, borderColor: '#3b82f6', color: '#3b82f6', opacity: selectedPreset ? 1 : 0.4 }}>
            {'\uD83D\uDCE5'} Carica
          </button>
          <button onClick={handleDeletePreset} disabled={!selectedPreset}
            style={{ ...st.presetActionBtn, borderColor: '#ef4444', color: '#ef4444', opacity: selectedPreset ? 1 : 0.4 }}>
            {'\uD83D\uDDD1\uFE0F'} Elimina
          </button>
        </div>
      </header>

      {/* TABS */}
      <div style={st.tabBar}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            ...st.tab,
            background: activeTab === tab.id ? tab.color : 'transparent',
            color: activeTab === tab.id ? '#000' : '#666',
            borderColor: activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.1)',
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        {error && <span style={st.errorBadge}>{'❌'} {error}</span>}
        {success && <span style={st.successBadge}>{'✅'} {success}</span>}
        {hasChanges && <span style={st.changeBadge}>{'\u26A0\uFE0F'} Modifiche non salvate</span>}
      </div>

      {/* SUM BAR (solo per pesi, non soglie) */}
      {!isSoglieTab && (
        <div style={st.sumBarWrap}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <span style={{ fontSize: 12, color: '#888', minWidth: 80 }}>Somma: {(sum * 100).toFixed(1)}%</span>
            <div style={st.sumTrack}>
              <div style={{
                ...st.sumFill,
                width: `${Math.min(sum * 100, 100)}%`,
                background: sumOk ? '#22c55e' : '#ef4444',
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: sumOk ? '#22c55e' : '#ef4444' }}>
              {sumOk ? '100% OK' : `${(sum * 100).toFixed(1)}% \u2260 100%`}
            </span>
          </div>
        </div>
      )}

      {/* SLIDERS / INPUTS */}
      <main style={st.main}>
        <div style={st.grid}>
          {keys.map(key => {
            const value = currentValues[key] ?? (isSoglieTab ? 60 : 0);
            const defaultVal = DEFAULT_CONFIG[section][key];
            const isSoglia = isSoglieTab;

            return (
              <div key={key} style={st.sliderCard}>
                <div style={st.sliderHeader}>
                  <span style={st.sliderName}>{LABELS[key] || key}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number"
                      step={isSoglia ? 1 : 0.01}
                      min={isSoglia ? 0 : 0}
                      max={isSoglia ? 100 : 1}
                      value={isSoglia ? value : parseFloat(value.toFixed(2))}
                      onChange={e => handleChange(key, parseFloat(e.target.value) || 0)}
                      style={st.numInput}
                    />
                    <span style={{ fontSize: 11, color: '#555' }}>{isSoglia ? '%' : ''}</span>
                  </div>
                </div>

                {/* Slider track */}
                <div style={st.sliderTrack}>
                  <div style={{
                    ...st.sliderFill,
                    width: isSoglia ? `${value}%` : `${value * 100}%`,
                    background: `linear-gradient(90deg, ${tabColor}66, ${tabColor})`,
                  }} />
                  {/* Default marker */}
                  <div style={{
                    ...st.defaultMarker,
                    left: isSoglia ? `${defaultVal}%` : `${defaultVal * 100}%`,
                  }} title={`Default: ${defaultVal}`} />
                  <input
                    type="range"
                    min={isSoglia ? 0 : 0}
                    max={isSoglia ? 100 : 1}
                    step={isSoglia ? 1 : 0.01}
                    value={value}
                    onChange={e => handleChange(key, parseFloat(e.target.value))}
                    style={st.sliderInput}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* AZIONI */}
        <div style={st.actions}>
          <button style={st.resetBtn} onClick={resetToDefault}>{'\uD83D\uDD04'} Reset Default</button>
          <button
            style={{
              ...st.saveBtn,
              background: canSave && hasChanges
                ? `linear-gradient(135deg, ${tabColor}, #8b5cf6)`
                : 'rgba(255,255,255,0.1)',
              opacity: saving ? 0.6 : 1,
              cursor: canSave && hasChanges ? 'pointer' : 'not-allowed',
            }}
            onClick={saveConfig}
            disabled={saving || !canSave || !hasChanges}
          >
            {saving ? '\u23F3 Salvataggio...' : !sumOk ? '\u26D4 Somma \u2260 100%' : '\uD83D\uDCBE SALVA CONFIG'}
          </button>
        </div>
      </main>
    </div>
  );
};

// --- STILI ---
const st: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh', width: '100vw',
    background: 'linear-gradient(135deg, #0a0a12 0%, #12121a 50%, #0a0a12 100%)',
    color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif",
    display: 'flex', flexDirection: 'column',
  },
  loadingWrap: {
    minHeight: '100vh', width: '100vw', background: '#0a0a12',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  spinner: {
    width: 50, height: 50, border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  header: {
    height: 60, background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', backdropFilter: 'blur(20px)', flexShrink: 0,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#888', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
  },
  title: {
    fontSize: 16, fontWeight: 900, letterSpacing: 2, margin: 0,
    background: 'linear-gradient(90deg, #f97316, #eab308)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subtitle: { fontSize: 9, color: '#555', letterSpacing: 1 },
  presetInput: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, width: 140,
  },
  presetSaveBtn: {
    background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', color: '#22c55e',
    padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
  },
  presetSelect: {
    background: '#fde000', border: '1px solid rgba(255,255,255,0.2)', color: '#000',
    padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  presetActionBtn: {
    background: 'transparent', border: '1px solid', padding: '6px 10px',
    borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
  },
  tabBar: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
    background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  tab: {
    padding: '8px 16px', border: '2px solid', borderRadius: 8,
    cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
  },
  errorBadge: {
    background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '5px 10px',
    borderRadius: 6, fontSize: 11,
  },
  successBadge: {
    background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '5px 10px',
    borderRadius: 6, fontSize: 11,
  },
  changeBadge: {
    background: 'rgba(234,179,8,0.15)', color: '#eab308', padding: '5px 10px',
    borderRadius: 6, fontSize: 11, fontWeight: 600,
  },
  sumBarWrap: {
    padding: '8px 20px', background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center',
    flexShrink: 0,
  },
  sumTrack: {
    flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3,
    position: 'relative' as const, overflow: 'hidden',
  },
  sumFill: { height: '100%', borderRadius: 3, transition: 'width 0.2s, background 0.2s' },
  main: { flex: 1, padding: 20, overflowY: 'auto' as const },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 12,
  },
  sliderCard: {
    background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  sliderHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  sliderName: { fontSize: 13, fontWeight: 700, color: '#ddd' },
  numInput: {
    width: 65, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5, padding: '5px 8px', color: '#fff', fontSize: 13, fontWeight: 700,
    textAlign: 'center' as const, fontFamily: 'monospace',
  },
  sliderTrack: {
    height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4,
    position: 'relative' as const, overflow: 'visible',
  },
  sliderFill: {
    height: '100%', borderRadius: 4, position: 'absolute' as const, top: 0, left: 0,
    transition: 'width 0.1s',
  },
  defaultMarker: {
    position: 'absolute' as const, top: -2, width: 2, height: 12,
    background: 'rgba(255,255,255,0.4)', borderRadius: 1, transform: 'translateX(-50%)',
  },
  sliderInput: {
    position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%',
    opacity: 0, cursor: 'pointer', margin: 0,
  },
  actions: {
    display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center',
  },
  resetBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444', padding: '12px 24px', borderRadius: 10, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  },
  saveBtn: {
    border: 'none', color: '#fff', padding: '12px 40px', borderRadius: 10,
    fontSize: 14, fontWeight: 800, letterSpacing: 1,
    boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
  },
};

// CSS Animation
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleEl);

export default PredictionsMixer;
