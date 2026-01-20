// src/pages/TuningMixer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURAZIONE API ---
const AI_ENGINE_BASE = 'https://us-central1-puppals-456c7.cloudfunctions.net';

// --- MAPPING E COSTANTI ---
const ALGO_MAP: Record<string, string> = {
  "global": "GLOBAL",
  "1": "ALGO_1",
  "2": "ALGO_2",
  "3": "ALGO_3",
  "4": "ALGO_4",
  "5": "ALGO_5",
};

const ALGO_LABELS: Record<string, string> = {
  "global": "🎛️ MASTER",
  "1": "📊 ALGO 1",
  "2": "📈 ALGO 2", 
  "3": "🎯 ALGO 3",
  "4": "🎲 ALGO 4",
  "5": "🤖 ALGO 5",
};

const ALGO_FULL_NAMES: Record<string, string> = {
  "global": "Master Globale",
  "1": "Statistica Pura",
  "2": "Dinamico (Forma)",
  "3": "Tattico (Complesso)",
  "4": "Caos Estremo",
  "5": "Master Ensemble",
};

const ALGO_COLORS: Record<string, string> = {
  "global": "#a855f7",
  "1": "#3b82f6",
  "2": "#22c55e",
  "3": "#f97316",
  "4": "#ef4444",
  "5": "#eab308",
};

const DEFAULTS: Record<string, number> = {
  "PESO_RATING_ROSA": 1.0,
  "PESO_FORMA_RECENTE": 1.0,
  "PESO_MOTIVAZIONE": 1.0,
  "PESO_FATTORE_CAMPO": 1.0,
  "PESO_STORIA_H2H": 1.0,
  "PESO_BVS_QUOTE": 1.0,
  "PESO_AFFIDABILITA": 1.0,
  "PESO_VALORE_ROSA": 1.0,
  "DIVISORE_MEDIA_GOL": 2.0,
  "POTENZA_FAVORITA_WINSHIFT": 0.40,
  "IMPATTO_DIFESA_TATTICA": 15.0,
  "TETTO_MAX_GOL_ATTESI": 3.8,
  "THR_1X2_RED": 40.0,
  "THR_1X2_GREEN": 60.0,
  "THR_UO_RED": 40.0,
  "THR_UO_GREEN": 60.0,
  "THR_GG_RED": 40.0,
  "THR_GG_GREEN": 60.0,
};

const PARAM_INFO: Record<string, { short: string; desc: string }> = {
  "PESO_RATING_ROSA": { short: "Rating Rosa", desc: "Se lo aumenti, favorisce le big; se lo diminuisci, contano di piu forma e contesto." },
  "PESO_FORMA_RECENTE": { short: "Forma", desc: "Quanto incidono i risultati/andamento recente (ultime partite) sulla valutazione." },
  "PESO_MOTIVAZIONE": { short: "Motivazione", desc: "Se lo aumenti, partite 'da dentro/fuori' o con forti obiettivi spostano di piu il segno; se lo diminuisci, il motore resta piu freddo e numerico." },
  "PESO_FATTORE_CAMPO": { short: "Fattore Campo", desc: "Se lo aumenti, il segno 1 diventa piu frequente; se lo diminuisci, casa/trasferta incide meno e aumentano pareggi/colpi esterni." },
  "PESO_STORIA_H2H": { short: "H2H", desc: "Se lo aumenti troppo, pochi precedenti possono 'sporcare' la valutazione; se lo tieni basso, gli H2H fanno solo da rifinitura." },
  "PESO_BVS_QUOTE": { short: "Quote BVS", desc: "Se lo aumenti, ti avvicini di piu al mercato delle quote e riduci la varianza; se lo diminuisci, il motore diventa piu indipendente (ma anche piu rischioso)." },
  "PESO_AFFIDABILITA": { short: "Affidabilità", desc: "Se lo aumenti, premi squadre costanti e penalizzi upset; se lo diminuisci, accetti piu volatilita e sorprese nei risultati." },
  "PESO_VALORE_ROSA": { short: "Valore Rosa", desc: "Se lo aumenti insieme al rating, schiacci le piccole; se lo diminuisci, il valore di mercato pesa meno e contano di piu forma e match-up." },
  "DIVISORE_MEDIA_GOL": { short: "Divisore Gol", desc: "Se lo aumenti, escono piu spesso Under e punteggi bassi; se lo diminuisci, aumentano Over e risultati larghi." },
  "POTENZA_FAVORITA_WINSHIFT": { short: "Win Shift", desc: "Se lo aumenti, la favorita segna mediamente di piu e la sfavorita di meno; se lo diminuisci, i punteggi diventano piu equilibrati." },
  "IMPATTO_DIFESA_TATTICA": { short: "Difesa Tattica", desc: "Se lo abbassi, le difese 'pesano di piu' e aumentano 0-0/1-0; se lo alzi, le difese incidono meno e le partite diventano piu aperte." },
  "TETTO_MAX_GOL_ATTESI": { short: "Max Gol", desc: "Se lo aumenti, permetti risultati piu estremi e goleade; se lo diminuisci, tagli gli eccessi e schiacci verso punteggi piu normali." },
};

// --- TIPI ---
interface ParamData {
  valore: number;
  isCustom: boolean;
  source: 'local' | 'global' | 'default';
}

// --- COMPONENTE PRINCIPALE ---
const TuningMixer: React.FC = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [activeAlgo, setActiveAlgo] = useState<string>("global");
  const [fullConfig, setFullConfig] = useState<Record<string, Record<string, { valore: number }>>>({});
  const [currentData, setCurrentData] = useState<Record<string, ParamData>>({});
  const [modifiedParams, setModifiedParams] = useState<Set<string>>(new Set());
  
  const [masterLocked, setMasterLocked] = useState(false);
  const [paramLocks, setParamLocks] = useState<Record<string, boolean>>({});

  const [presetsList, setPresetsList] = useState<string[]>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');


  const [globalPresetsList, setGlobalPresetsList] = useState<string[]>([]);
  const [globalPresetName, setGlobalPresetName] = useState('');
  const [selectedGlobalPreset, setSelectedGlobalPreset] = useState('');



  // --- CARICA DATI DA MONGODB ---
  const loadTuning = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/get_tuning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success && data.config) {
        setFullConfig(data.config);
        processAlgoData(data.config, activeAlgo);
      } else {
        setError(data.error || 'Errore caricamento tuning');
      }
    } catch (err) {
      setError('Errore connessione al server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const processAlgoData = (config: Record<string, Record<string, { valore: number }>>, algoId: string) => {
    const targetKey = ALGO_MAP[algoId];
    const globalKey = ALGO_MAP["global"];
    const algoData = config[targetKey] || {};
    const globalData = config[globalKey] || {};
    
    const result: Record<string, ParamData> = {};
    
    Object.keys(DEFAULTS).forEach(k => {
      if (algoId === "global") {
        if (globalData[k] && globalData[k].valore !== undefined) {
          result[k] = { valore: globalData[k].valore, isCustom: true, source: 'local' };
        } else {
          result[k] = { valore: DEFAULTS[k], isCustom: false, source: 'default' };
        }
      } else {
        if (algoData[k] && algoData[k].valore !== undefined) {
          result[k] = { valore: algoData[k].valore, isCustom: true, source: 'local' };
        } else if (globalData[k] && globalData[k].valore !== undefined) {
          result[k] = { valore: globalData[k].valore, isCustom: true, source: 'global' };
        } else {
          result[k] = { valore: DEFAULTS[k], isCustom: false, source: 'default' };
        }
      }
    });
    
    setCurrentData(result);
    setModifiedParams(new Set());
  };

  const saveTuning = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const targetKey = ALGO_MAP[activeAlgo];
      const updatedConfig = { ...fullConfig };
      
      if (!updatedConfig[targetKey]) {
        updatedConfig[targetKey] = {};
      }
      
      Object.keys(currentData).forEach(k => {
        updatedConfig[targetKey][k] = { valore: currentData[k].valore };
      });
      
      if (activeAlgo === "global") {
        ["1", "2", "3", "4", "5"].forEach(algoId => {
          const algoKey = ALGO_MAP[algoId];
          if (!updatedConfig[algoKey]) {
            updatedConfig[algoKey] = {};
          }
          
          Object.keys(currentData).forEach(k => {
            const isParamLocked = paramLocks[k] || false;
            if (!isParamLocked && !masterLocked) {
              updatedConfig[algoKey][k] = { valore: currentData[k].valore };
            }
          });
        });
      }
      
      const response = await fetch(`${AI_ENGINE_BASE}/save_tuning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFullConfig(updatedConfig);
        setModifiedParams(new Set());
        setSuccess(`Salvato!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Errore salvataggio');
      }
    } catch (err) {
      setError('Errore connessione');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('Inserisci un nome per il preset!');
      return;
    }
    
    // Controlla se esiste già
    if (presetsList.includes(`${ALGO_MAP[activeAlgo]}_${presetName}`)) {

      if (!window.confirm(`Il preset "${presetName}" esiste già. Vuoi sovrascriverlo?`)) {
        return;
      }
    }
    
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/save_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${ALGO_MAP[activeAlgo]}_${presetName}`,
          config: currentData
        }),
        
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Preset "${presetName}" salvato!`);
        setTimeout(() => setSuccess(null), 3000);
        loadPresetsList();
        setPresetName('');
      } else {
        setError(data.error || 'Errore salvataggio preset');
      }
    } catch (err) {
      setError('Errore connessione');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  const handleLoadPreset = async () => {
    if (!selectedPreset) {
      alert('Seleziona un preset da caricare!');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/load_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedPreset }),
      });
      const data = await response.json();
      if (data.success && data.preset && data.preset.config) {
        setCurrentData(data.preset.config);
        setSuccess(`Preset "${selectedPreset}" caricato!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Errore caricamento preset');
      }
    } catch (err) {
      setError('Errore connessione');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeletePreset = async () => {
    if (!selectedPreset) {
      alert('Seleziona un preset da eliminare!');
      return;
    }
    
    if (!window.confirm(`Sei sicuro di voler eliminare il preset "${selectedPreset}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/delete_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedPreset }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Preset "${selectedPreset}" eliminato!`);
        setTimeout(() => setSuccess(null), 3000);
        setSelectedPreset('');
        loadPresetsList();
      } else {
        setError(data.error || 'Errore eliminazione preset');
      }
    } catch (err) {
      setError('Errore connessione');
      console.error(err);
    }
  };


  const handleSaveGlobalPreset = async () => {
    if (!globalPresetName.trim()) {
      alert('Inserisci un nome per il preset globale!');
      return;
    }
    
    const fullName = `FULL_${globalPresetName}`;
    
    // Controlla se esiste già
    if (globalPresetsList.includes(fullName)) {
      if (!window.confirm(`Il preset globale "${globalPresetName}" esiste già. Vuoi sovrascriverlo?`)) {
        return;
      }
    }
    
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/save_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          config: fullConfig  // Salva TUTTA la config
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(`Preset globale "${globalPresetName}" salvato!`);
        setTimeout(() => setSuccess(null), 3000);
        loadGlobalPresetsList();
        setGlobalPresetName('');
      } else {
        setError(data.error || 'Errore salvataggio preset globale');
      }
    } catch (err) {
      setError('Errore connessione');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleLoadGlobalPreset = async () => {
    if (!selectedGlobalPreset) {
      alert('Seleziona un preset globale da caricare!');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/load_preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedGlobalPreset }),
      });
      const data = await response.json();
      if (data.success && data.preset && data.preset.config) {
        setFullConfig(data.preset.config);
        processAlgoData(data.preset.config, activeAlgo);
        setSuccess(`Preset globale caricato!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Errore caricamento preset globale');
      }
    } catch (err) {
      setError('Errore connessione');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
    
  const resetToDefault = () => {
    if (!window.confirm(`Reset ${ALGO_FULL_NAMES[activeAlgo]} ai valori di default?`)) return;
    
    const result: Record<string, ParamData> = {};
    Object.keys(DEFAULTS).forEach(k => {
      result[k] = { valore: DEFAULTS[k], isCustom: false, source: 'default' };
    });
    setCurrentData(result);
    setModifiedParams(new Set(Object.keys(DEFAULTS)));
  };

  const handleParamChange = (key: string, value: number) => {
    // Definisci i limiti per ogni parametro
    const limits: Record<string, { min: number; max: number }> = {
      // Pesi che possono andare in negativo
      PESO_RATING_ROSA: { min: -5, max: 10 },
      PESO_FORMA_RECENTE: { min: -5, max: 10 },
      PESO_BVS_QUOTE: { min: -5, max: 10 },
      PESO_AFFIDABILITA: { min: -5, max: 10 },
      PESO_VALORE_ROSA: { min: -5, max: 10 },
      // Pesi solo positivi
      PESO_MOTIVAZIONE: { min: 0, max: 10 },
      PESO_FATTORE_CAMPO: { min: 0, max: 10 },
      PESO_STORIA_H2H: { min: 0, max: 10 },
      // Parametri gol
      DIVISORE_MEDIA_GOL: { min: 0.1, max: 10 },
      POTENZA_FAVORITA_WINSHIFT: { min: -1, max: 1 },
      IMPATTO_DIFESA_TATTICA: { min: 0.1, max: 50 },
      TETTO_MAX_GOL_ATTESI: { min: 0.5, max: 10 },
      // Soglie
      THR_1X2_RED: { min: 0, max: 100 },
      THR_1X2_GREEN: { min: 0, max: 100 },
      THR_UO_RED: { min: 0, max: 100 },
      THR_UO_GREEN: { min: 0, max: 100 },
      THR_GG_RED: { min: 0, max: 100 },
      THR_GG_GREEN: { min: 0, max: 100 },
    };
  
    // Applica i limiti
    let clampedValue = value;
    if (limits[key]) {
      clampedValue = Math.max(limits[key].min, Math.min(limits[key].max, value));
    }
  
    setCurrentData(prev => ({
      ...prev,
      [key]: { ...prev[key], valore: clampedValue }
    }));
    setModifiedParams(prev => new Set(prev).add(key));
  };

  const toggleParamLock = (key: string) => {
    if (masterLocked) return;
    setParamLocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAlgoChange = (algoId: string) => {
    if (modifiedParams.size > 0) {
      if (!window.confirm('Hai modifiche non salvate. Continuare?')) return;
    }
    setActiveAlgo(algoId);
    processAlgoData(fullConfig, algoId);
  };

  const loadPresetsList = useCallback(async () => {
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/list_presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success && data.presets) {
        // Filtra i preset per l'algoritmo corrente
        const targetKey = ALGO_MAP[activeAlgo];
        const filtered = data.presets
          .filter((p: any) => p.name && p.name.includes(targetKey))
          .map((p: any) => p.name);
        setPresetsList(filtered);
      }
    } catch (err) {
      console.error('Errore caricamento preset:', err);
    }
  }, [activeAlgo]);


  const loadGlobalPresetsList = useCallback(async () => {
    try {
      const response = await fetch(`${AI_ENGINE_BASE}/list_presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success && data.presets) {
        // Filtra solo i preset che iniziano con "FULL_"
        const filtered = data.presets
          .filter((p: any) => p.name && p.name.startsWith('FULL_'))
          .map((p: any) => p.name);
        setGlobalPresetsList(filtered);
      }
    } catch (err) {
      console.error('Errore caricamento preset globali:', err);
    }
  }, []);
  
  

  useEffect(() => { 
    loadTuning(); 
    loadPresetsList();
    loadGlobalPresetsList();
  }, []);
  
  

  useEffect(() => {
    if (Object.keys(fullConfig).length > 0) {
      processAlgoData(fullConfig, activeAlgo);
    }
  }, [activeAlgo, fullConfig]);

  const ordineMotore = Object.keys(DEFAULTS).filter(k => k.includes('PESO'));
  const ordineGol = Object.keys(DEFAULTS).filter(k => !k.includes('PESO') && !k.includes('THR'));
  const ordineSoglie = [
    { red: 'THR_1X2_RED', green: 'THR_1X2_GREEN', label: '1X2' },
    { red: 'THR_UO_RED', green: 'THR_UO_GREEN', label: 'U/O' },
    { red: 'THR_GG_RED', green: 'THR_GG_GREEN', label: 'GG' },
  ];

  const currentColor = ALGO_COLORS[activeAlgo];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#666', marginTop: 20 }}>Caricamento Mixer...</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* === HEADER === */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← Dashboard</button>
          <div style={styles.logo}>
            <span style={{ fontSize: 28 }}>🎛️</span>
            <div>
              <h1 style={styles.logoTitle}>TUNING MIXER</h1>
              <span style={styles.logoSub}>Engine Control System • MongoDB Live</span>
            </div>
          </div>
        </div>
        
        <div style={styles.headerCenter}>
          {Object.keys(ALGO_MAP).map(key => (
            <button
              key={key}
              onClick={() => handleAlgoChange(key)}
              style={{
                ...styles.algoTab,
                background: activeAlgo === key ? ALGO_COLORS[key] : 'transparent',
                color: activeAlgo === key ? '#000' : '#666',
                borderColor: activeAlgo === key ? ALGO_COLORS[key] : 'rgba(255,255,255,0.1)',
              }}
            >
              {ALGO_LABELS[key]}
            </button>
          ))}
        </div>
        
        <div style={styles.headerRight}>


          {/* PRESET GLOBALE */}
          <input
            type="text"
            placeholder="Nome preset globale..."
            value={globalPresetName}
            onChange={(e) => setGlobalPresetName(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              width: 160,
            }}
          />
          <button
            onClick={handleSaveGlobalPreset}
            disabled={saving}
            style={{
              background: 'rgba(168,85,247,0.2)',
              border: '1px solid #a855f7',
              color: '#a855f7',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            💾💾 Salva TUTTO
          </button>
          <select
            value={selectedGlobalPreset}
            onChange={(e) => setSelectedGlobalPreset(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="">-- Preset Globale --</option>
            {globalPresetsList.map(name => (
              <option key={name} value={name}>{name.replace('FULL_', '')}</option>
            ))}
          </select>
          <button
            onClick={handleLoadGlobalPreset}
            disabled={!selectedGlobalPreset}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid #3b82f6',
              color: '#3b82f6',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: selectedGlobalPreset ? 'pointer' : 'not-allowed',
              fontSize: 11,
              fontWeight: 700,
              opacity: selectedGlobalPreset ? 1 : 0.5,
            }}
          >
            📥 Carica TUTTO
          </button>



          
 
          {modifiedParams.size > 0 && (
            <span style={styles.unsavedBadge}>⚠️ {modifiedParams.size} modifiche</span>
          )}
          {error && <span style={styles.errorBadge}>❌ {error}</span>}
          {success && <span style={styles.successBadge}>✅ {success}</span>}
          
          <button
            style={{
              ...styles.lockBtn,
              background: masterLocked ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              borderColor: masterLocked ? '#ef4444' : '#22c55e',
              color: masterLocked ? '#ef4444' : '#22c55e',
            }}
            onClick={() => setMasterLocked(!masterLocked)}
          >
            {masterLocked ? '🔒 LOCKED' : '🔓 OPEN'}
          </button>
        </div>
      </header>

      {/* === ALGO INFO BAR === */}
      <div style={{ ...styles.infoBar, borderLeftColor: currentColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...styles.infoBadge, background: currentColor }}>{ALGO_LABELS[activeAlgo]}</span>
          <span style={styles.infoName}>{ALGO_FULL_NAMES[activeAlgo]}</span>
        </div>

        {/* PRESET SINGOLO ALGORITMO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="Nome preset..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              width: 130,
            }}
          />
          <button
            onClick={handleSavePreset}
            disabled={saving}
            style={{
              background: 'rgba(34,197,94,0.2)',
              border: '1px solid #22c55e',
              color: '#22c55e',
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            💾 Salva
          </button>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 10,
              cursor: 'pointer',
              width: 150,
            }}
          >
            <option value="">-- Carica Preset --</option>
            {presetsList.map(name => (
              <option key={name} value={name}>{name.replace(`${ALGO_MAP[activeAlgo]}_`, '')}</option>
            ))}
          </select>
          <button
            onClick={handleLoadPreset}
            disabled={!selectedPreset}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid #3b82f6',
              color: '#3b82f6',
              padding: '5px 10px',
              borderRadius: 6,
              cursor: selectedPreset ? 'pointer' : 'not-allowed',
              fontSize: 10,
              fontWeight: 700,
              opacity: selectedPreset ? 1 : 0.5,
            }}
          >
            📥 Carica
          </button>
          <button
            onClick={handleDeletePreset}
            disabled={!selectedPreset}
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '5px 10px',
              borderRadius: 6,
              cursor: selectedPreset ? 'pointer' : 'not-allowed',
              fontSize: 10,
              fontWeight: 700,
              opacity: selectedPreset ? 1 : 0.5,
            }}
          >
            🗑️ Elimina
          </button>
        </div>
      </div>


      {/* === MAIN CONTENT === */}
      <main style={{ ...styles.main, opacity: masterLocked ? 0.4 : 1, pointerEvents: masterLocked ? 'none' : 'auto' }}>
        <div style={styles.grid3Col}>
          
          {/* COLONNA 1: PESI MOTORE */}
          <div style={styles.column}>
            <div style={styles.colHeader}>
              <span style={{ ...styles.colIcon, background: '#3b82f6' }}>⚖️</span>
              <span>PESI MOTORE</span>
            </div>
            <div style={styles.colContent}>
            {ordineMotore.map(key => {
            // Range specifici per ogni peso
            let minVal = 0;
            const maxVal = 10;
            
            // Questi possono andare in negativo
            if (key === 'PESO_RATING_ROSA' || 
                key === 'PESO_FORMA_RECENTE' || 
                key === 'PESO_BVS_QUOTE' || 
                key === 'PESO_AFFIDABILITA' || 
                key === 'PESO_VALORE_ROSA') {
                minVal = -5;
            }
            
            return (
                <SliderRow
                key={key}
                paramKey={key}
                value={currentData[key]?.valore ?? DEFAULTS[key]}
                defaultValue={DEFAULTS[key]}
                isLocked={paramLocks[key] || false}
                isModified={modifiedParams.has(key)}
                source={currentData[key]?.source || 'default'}
                color={currentColor}
                onChange={handleParamChange}
                onToggleLock={toggleParamLock}
                min={minVal}
                max={maxVal}
                />
            );
            })}
            </div>
          </div>

          {/* COLONNA 2: PARAMETRI GOL */}
          <div style={styles.column}>
            <div style={styles.colHeader}>
              <span style={{ ...styles.colIcon, background: '#22c55e' }}>⚽</span>
              <span>PARAMETRI GOL</span>
            </div>
            <div style={styles.colContent}>
            {ordineGol.map(key => {
            let minVal = 0;
            let maxVal = 20;
            
            if (key === 'DIVISORE_MEDIA_GOL') {
                minVal = 0.1;  // Mai zero - causa crash
                maxVal = 10;
            } else if (key === 'IMPATTO_DIFESA_TATTICA') {
                minVal = 0.1;  // Mai zero - causa crash
                maxVal = 50;
            } else if (key === 'POTENZA_FAVORITA_WINSHIFT') {
                minVal = -1;   // Può andare negativo
                maxVal = 1;
            } else if (key === 'TETTO_MAX_GOL_ATTESI') {
                minVal = 0.5;
                maxVal = 10;
            }
            
            return (
                <SliderRow
                key={key}
                paramKey={key}
                value={currentData[key]?.valore ?? DEFAULTS[key]}
                defaultValue={DEFAULTS[key]}
                isLocked={paramLocks[key] || false}
                isModified={modifiedParams.has(key)}
                source={currentData[key]?.source || 'default'}
                color={currentColor}
                onChange={handleParamChange}
                onToggleLock={toggleParamLock}
                min={minVal}
                max={maxVal}
                />
            );
            })}
            </div>
          </div>

          {/* COLONNA 3: SOGLIE */}
          <div style={styles.column}>
            <div style={styles.colHeader}>
              <span style={{ ...styles.colIcon, background: '#eab308' }}>🎚️</span>
              <span>SOGLIE REPORT</span>
            </div>
            <div style={styles.colContent}>
              {ordineSoglie.map(({ red, green, label }) => (
                <div key={label} style={styles.sogliaBox}>
                  <div style={styles.sogliaTitle}>{label}</div>
                  <div style={styles.sogliaRow}>
                    <span style={{ ...styles.sogliaTag, background: '#ef4444' }}>R</span>
                    <input
                      type="number"
                      style={styles.sogliaInput}
                      value={currentData[red]?.valore ?? DEFAULTS[red]}
                      onChange={(e) => handleParamChange(red, parseFloat(e.target.value) || 0)}
                    />
                    <span style={styles.sogliaUnit}>%</span>
                  </div>
                  <div style={styles.sogliaRow}>
                    <span style={{ ...styles.sogliaTag, background: '#22c55e' }}>V</span>
                    <input
                      type="number"
                      style={styles.sogliaInput}
                      value={currentData[green]?.valore ?? DEFAULTS[green]}
                      onChange={(e) => handleParamChange(green, parseFloat(e.target.value) || 0)}
                    />
                    <span style={styles.sogliaUnit}>%</span>
                  </div>
                </div>
              ))}
              
              {/* AZIONI IN BASSO */}
              <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                <button style={styles.resetBtn} onClick={resetToDefault}>🔄 Reset Default</button>
                <button
                  style={{
                    ...styles.saveBtn,
                    background: modifiedParams.size > 0 
                      ? `linear-gradient(135deg, ${currentColor}, #8b5cf6)` 
                      : 'rgba(255,255,255,0.1)',
                    opacity: saving ? 0.6 : 1,
                  }}
                  onClick={saveTuning}
                  disabled={saving}
                >
                  {saving ? '⏳ Salvataggio...' : '💾 SALVA TUTTO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTE SLIDER ORIZZONTALE ---
interface SliderRowProps {
  paramKey: string;
  value: number;
  defaultValue: number;
  isLocked: boolean;
  isModified: boolean;
  source: string;
  color: string;
  onChange: (key: string, value: number) => void;
  onToggleLock: (key: string) => void;
  min: number;
  max: number;
}

const SliderRow: React.FC<SliderRowProps> = ({
  paramKey, value, defaultValue, isLocked, isModified, source, color,
  onChange, onToggleLock, min, max
}) => {
  const info = PARAM_INFO[paramKey] || { short: paramKey, desc: '' };
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div style={{
      ...sliderStyles.row,
      opacity: isLocked ? 0.4 : 1,
      borderLeftColor: isModified ? '#eab308' : 'transparent',
    }}>
      {/* HEADER */}
      <div style={sliderStyles.rowHeader}>
        <div style={sliderStyles.nameSection}>
          <button
            style={{ ...sliderStyles.lockIcon, color: isLocked ? '#ef4444' : '#22c55e' }}
            onClick={() => onToggleLock(paramKey)}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
          <div>
            <div style={sliderStyles.name}>{info.short}</div>
            <div style={sliderStyles.desc}>{info.desc}</div>
          </div>
        </div>
        
        <div style={sliderStyles.valueSection}>
          {source === 'global' && <span style={sliderStyles.sourceBadge}>↑G</span>}
          {isModified && <span style={sliderStyles.modifiedDot}>●</span>}
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => onChange(paramKey, parseFloat(e.target.value) || 0)}
            disabled={isLocked}
            style={sliderStyles.numInput}
          />
        </div>
      </div>
      
      {/* SLIDER */}
      <div style={sliderStyles.sliderTrack}>
        <div
          style={{
            ...sliderStyles.sliderFill,
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
          }}
        />
        <div
          style={{
            ...sliderStyles.defaultMarker,
            left: `${((defaultValue - min) / (max - min)) * 100}%`,
          }}
          title={`Default: ${defaultValue}`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value}
          onChange={(e) => onChange(paramKey, parseFloat(e.target.value))}
          disabled={isLocked}
          style={sliderStyles.sliderInput}
        />
      </div>
    </div>
  );
};

// --- STILI ---
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #0a0a12 0%, #12121a 50%, #0a0a12 100%)',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loadingContainer: {
    minHeight: '100vh',
    width: '100vw',
    background: '#0a0a12',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 50,
    height: 50,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#a855f7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  // HEADER
  header: {
    height: 60,
    background: 'rgba(0,0,0,0.5)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    backdropFilter: 'blur(20px)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#888',
    padding: '8px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 2,
    background: 'linear-gradient(90deg, #a855f7, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  logoSub: {
    fontSize: 9,
    color: '#555',
    letterSpacing: 1,
  },
  headerCenter: {
    display: 'flex',
    gap: 4,
    background: 'rgba(255,255,255,0.03)',
    padding: 4,
    borderRadius: 10,
  },
  algoTab: {
    padding: '7px 12px',
    border: '2px solid',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    transition: 'all 0.2s',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  unsavedBadge: {
    background: 'rgba(234,179,8,0.15)',
    color: '#eab308',
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  errorBadge: {
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 11,
  },
  successBadge: {
    background: 'rgba(34,197,94,0.15)',
    color: '#22c55e',
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 11,
  },
  lockBtn: {
    padding: '8px 16px',
    border: '2px solid',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },
  
  // INFO BAR
  infoBar: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderLeft: '4px solid',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  infoBadge: {
    padding: '4px 10px',
    borderRadius: 5,
    fontSize: 10,
    fontWeight: 800,
    color: '#000',
  },
  infoName: {
    fontSize: 13,
    color: '#777',
  },
  
  // MAIN
  main: {
    flex: 1,
    padding: 5,
    overflow: 'hidden',
    display: 'flex',
    transition: 'opacity 0.3s',
  },
  grid3Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 20,
    width: '100%',
    height: '100%',
  },
  
  // COLUMNS
  column: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  colHeader: {
    padding: '14px 18px',
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  colIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
  },
  colContent: {
    flex: 1,
    padding: 14,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  
  // SOGLIE
  sogliaBox: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  sogliaTitle: {
    fontSize: 16,
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: 10,
    color: '#fff',
  },
  sogliaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sogliaTag: {
    width: 22,
    height: 22,
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 800,
    color: '#fff',
  },
  sogliaInput: {
    flex: 1,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
  },
  sogliaUnit: {
    color: '#555',
    fontSize: 11,
    width: 20,
  },
  
  // BUTTONS
  resetBtn: {
    width: '100%',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444',
    padding: '12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 10,
  },
  saveBtn: {
    width: '100%',
    border: 'none',
    color: '#fff',
    padding: '14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 1,
    boxShadow: '0 4px 20px rgba(168,85,247,0.3)',
  },
};

// --- STILI SLIDER ---
const sliderStyles: Record<string, React.CSSProperties> = {
  row: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: '12px 14px',
    borderLeft: '3px solid transparent',
    transition: 'all 0.2s',
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  },
  name: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ddd',
  },
  desc: {
    fontSize: 12,
    color: '#d8e4818f',
  },
  valueSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sourceBadge: {
    fontSize: 8,
    color: '#666',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 5px',
    borderRadius: 3,
  },
  modifiedDot: {
    color: '#eab308',
    fontSize: 10,
  },
  numInput: {
    width: 60,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    padding: '5px 8px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  sliderTrack: {
    height: 8,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    position: 'relative',
    overflow: 'visible',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    transition: 'width 0.1s',
  },
  defaultMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    background: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
    transform: 'translateX(-50%)',
  },
  sliderInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    margin: 0,
  },
};

// CSS Animation
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleEl);

export default TuningMixer;