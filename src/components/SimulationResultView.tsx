import React from 'react';
import { 
  Trophy, 
  Activity, 
  BarChart3, 
  Clock, 
  Zap, 
  ShieldAlert, 
  TrendingUp, 
  MessageSquare,
  DollarSign,
  Star
} from 'lucide-react';

// Interfacce più flessibili per evitare crash di tipo
interface MatchEvent {
  minuto: number;
  squadra?: string; // Modificato da 'casa' | 'ospite' a string per sicurezza
  tipo: string;     // Modificato a string generica
  testo: string;
}

interface SimulationData {
  predicted_score: string;
  gh: number;
  ga: number;
  sign: string;
  algo_name: string;
  statistiche: Record<string, any[]>; // Accetta qualsiasi tipo di array
  cronaca: MatchEvent[];
  top3?: string[];
  report_scommesse: any; // Rilassato per evitare blocchi su strutture annidate
  info_extra?: {
    valore_mercato?: string;
    motivazione?: string;
  };
}

interface Props {
  data: SimulationData;
  homeName: string;
  awayName: string;
  onOpenBettingDetails: () => void;
  onOpenAIExplanation: () => void;
}

const SimulationResultView: React.FC<Props> = ({ data, homeName, awayName, onOpenBettingDetails, onOpenAIExplanation }) => {
  
  // Debug in console per vedere se il componente viene renderizzato
  console.log("Rendering SimulationResultView con dati:", data);

  if (!data) return <div className="text-white p-10 text-center animate-pulse">CARICAMENTO DATI...</div>;

  // Funzione ultra-sicura per calcolare la larghezza (gestisce numeri, stringhe con %, null, undefined)
  const calculateWidth = (val: any) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Rimuove tutto ciò che non è numero o punto (es. "52%" -> "52")
      const clean = val.replace(/[^0-9.]/g, '');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const getWidthPercent = (valH: any, valA: any) => {
    const h = calculateWidth(valH);
    const a = calculateWidth(valA);
    const total = h + a;
    if (total === 0) return 50; // Default 50/50 se dati mancanti
    return (h / total) * 100;
  };

  // Estrazione sicura dei dati annidati
  const confidence = data.report_scommesse?.Analisi_Profonda?.Confidence_Globale || 'N/D';
  const marketValue = data.info_extra?.valore_mercato || 'N/D';
  
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* HEADER RISULTATO */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-700 p-8 rounded-[2rem] text-center shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500"></div>
        
        <p className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-6 opacity-80">
          Analisi Completata • {data.algo_name || 'Algoritmo'}
        </p>
        
        <div className="flex items-center justify-around mb-8">
          <div className="flex-1 text-center">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter truncate px-2">{homeName}</h2>
          </div>
          
          <div className="bg-slate-950 border-2 border-slate-800 px-8 py-6 rounded-3xl shadow-xl min-w-[180px]">
            <span className="text-6xl font-black text-white tabular-nums tracking-tighter">
              {data.gh ?? '-'} - {data.ga ?? '-'}
            </span>
          </div>
          
          <div className="flex-1 text-center">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter truncate px-2">{awayName}</h2>
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <span className="text-slate-300 text-sm font-bold">Segno: <b className="text-white">{data.sign}</b></span>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-slate-300 text-sm font-bold">Confidence: <b className="text-emerald-400">{confidence}</b></span>
          </div>
        </div>
      </div>

      {/* BOX INFO EXTRA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-lg"><DollarSign className="text-emerald-400" size={20} /></div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Valore Mercato Match</p>
            <p className="text-white font-black">{marketValue}</p>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-purple-500/10 p-3 rounded-lg"><Star className="text-purple-400" size={20} /></div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Top 3 Probabili</p>
            <p className="text-white font-black italic text-sm">{(data.top3 || []).join(' • ')}</p>
          </div>
        </div>
      </div>

      {/* TASTI AZIONE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={onOpenAIExplanation} className="flex items-center justify-center gap-2 p-5 bg-slate-800/50 hover:bg-slate-700 border border-slate-600 rounded-2xl transition-all group">
          <MessageSquare className="text-purple-400" /> <span className="text-white font-bold">Analisi AI</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-5 bg-slate-800/50 hover:bg-slate-700 border border-slate-600 rounded-2xl transition-all">
          <Activity className="text-cyan-400" /> <span className="text-white font-bold">Simili</span>
        </button>
        <button onClick={onOpenBettingDetails} className="flex items-center justify-center gap-3 p-5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-2xl transition-all text-amber-500 font-black">
          <Trophy size={18} /> SCOMMESSE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* STATISTICHE */}
        <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-[2rem]">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <BarChart3 className="text-cyan-400" /> STATISTICHE
          </h3>
          <div className="space-y-6">
            {data.statistiche && Object.entries(data.statistiche).map(([label, vals]) => {
              if (!Array.isArray(vals) || vals.length < 2) return null;
              return (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                    <span className="text-slate-300">{vals[0]}</span>
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-300">{vals[1]}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex p-[1px]">
                    <div 
                      className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                      style={{ width: `${getWidthPercent(vals[0], vals[1])}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CRONACA */}
        <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-[2rem]">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
            <Clock className="text-cyan-400" /> TIMELINE
          </h3>
          <div className="relative space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {data.cronaca && data.cronaca.map((event, idx) => (
              <div key={idx} className="flex gap-4 items-center border-b border-slate-800/50 pb-3 last:border-0">
                <div className={`p-2 rounded-xl flex-shrink-0 ${event.tipo === 'gol' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  {event.tipo === 'gol' ? <Trophy size={16} className="text-emerald-500" /> : <ShieldAlert size={16} className="text-amber-500" />}
                </div>
                <span className="text-cyan-500 font-bold text-xs min-w-[25px]">{event.minuto}'</span>
                <p className="text-slate-300 text-sm">{event.testo}</p>
              </div>
            ))}
            {(!data.cronaca || data.cronaca.length === 0) && (
              <p className="text-slate-500 text-center text-sm italic py-10">Nessun evento registrato</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SimulationResultView;