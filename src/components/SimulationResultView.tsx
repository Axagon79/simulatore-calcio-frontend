import React from 'react';
import { 
  Trophy, 
  Activity, 
  BarChart3, 
  Clock, 
  Zap, 
  ShieldAlert, 
  TrendingUp, 
  MessageSquare 
} from 'lucide-react';

interface MatchEvent {
  minuto: number;
  squadra?: 'casa' | 'ospite';
  tipo: 'gol' | 'cartellino' | 'cambio';
  testo: string;
}

interface SimulationData {
  predicted_score: string;
  gh: number;
  ga: number;
  sign: string;
  algo_name: string;
  statistiche: Record<string, [string | number, string | number]>; // Nome corretto dal log
  cronaca: MatchEvent[]; // Nome corretto dal log
  report_scommesse: {
    Bookmaker: Record<string, string>;
    Analisi_Profonda: {
      Confidence_Globale: string;
      Deviazione_Standard_Totale: number;
      Affidabilita_Previsione: string;
    };
  };
  info_extra?: {
    valore_mercato: string;
    motivazione: string;
  };
}

interface Props {
  data: SimulationData;
  onOpenBettingDetails: () => void;
  onOpenAIExplanation: () => void;
}

const SimulationResultView: React.FC<Props> = ({ data, onOpenBettingDetails, onOpenAIExplanation }) => {
  
  // Protezione contro dati mancanti per evitare il crash 'undefined'
  if (!data) return <div className="text-white p-10 text-center">In attesa dei dati della simulazione...</div>;

  // Helper per calcolare la larghezza delle barre statistiche
  const calculateWidth = (home: any, away: any) => {
    const h = parseFloat(home?.toString().replace('%', '')) || 0;
    const a = parseFloat(away?.toString().replace('%', '')) || 0;
    const total = h + a;
    return total === 0 ? 50 : (h / total) * 100;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER: RISULTATO E AFFIDABILITÀ */}
      <div className="relative overflow-hidden bg-slate-900/50 border border-slate-700 p-8 rounded-3xl text-center shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500"></div>
        
        <p className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-4">
          Simulazione Completata • {data.algo_name || 'MonteCarlo'}
        </p>
        
        <div className="flex items-center justify-center gap-12 mb-6">
          <div className="text-right">
            <h2 className="text-2xl font-bold text-white">CASA</h2>
            <p className="text-slate-400 text-sm">Squadra Ospitante</p>
          </div>
          
          <div className="bg-slate-800 border-2 border-cyan-500/50 px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <span className="text-6xl font-black text-white tabular-nums tracking-tighter">
              {data.gh} - {data.ga}
            </span>
          </div>
          
          <div className="text-left">
            <h2 className="text-2xl font-bold text-white">OSPITE</h2>
            <p className="text-slate-400 text-sm">Squadra Sfidante</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <span className="text-slate-200 text-sm font-medium">Segno: <b className="text-cyan-400">{data.sign}</b></span>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600 flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-slate-200 text-sm font-medium">Affidabilità: <b className="text-emerald-400">{data.report_scommesse?.Analisi_Profonda?.Confidence_Globale || 'N/D'}</b></span>
          </div>
        </div>
      </div>

      {/* TASTI AZIONE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={onOpenAIExplanation}
          className="flex items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded-xl transition-all group"
        >
          <MessageSquare className="text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="text-white font-medium">Spiegami il pronostico</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded-xl transition-all">
          <Activity className="text-cyan-400" />
          <span className="text-white font-medium">Partite Simili</span>
        </button>
        <button 
          onClick={onOpenBettingDetails}
          className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-amber-600/20 to-amber-900/20 hover:from-amber-600/30 border border-amber-600/50 rounded-xl transition-all group"
        >
          <Trophy className="text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">Consiglio Scommessa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* STATISTICHE STILE TELEVISIVO (Mappate su data.statistiche) */}
        <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
            <BarChart3 className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Statistiche Partita</h3>
          </div>
          
          <div className="space-y-6">
            {data.statistiche && Object.entries(data.statistiche).map(([label, [valH, valA]]) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{valH}</span>
                  <span className="text-slate-200">{label}</span>
                  <span>{valA}</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-1000 ease-out"
                    style={{ width: `${calculateWidth(valH, valA)}%` }}
                  ></div>
                  <div 
                    className="h-full bg-slate-600 transition-all duration-1000 ease-out"
                    style={{ width: `${100 - calculateWidth(valH, valA)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CRONACA LIVE (Timeline mappata su data.cronaca) */}
        <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
            <Clock className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Timeline Eventi</h3>
          </div>
          
          <div className="relative space-y-8 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
            {data.cronaca && data.cronaca.map((event, idx) => (
              <div key={idx} className="relative pl-12 flex items-center group">
                <div className={`absolute left-0 w-9 h-9 rounded-full border-2 flex items-center justify-center bg-slate-900 z-10 transition-transform group-hover:scale-110 
                  ${event.tipo === 'gol' ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-amber-500'}`}>
                  {event.tipo === 'gol' ? <Trophy size={14} className="text-emerald-500" /> : <ShieldAlert size={14} className="text-amber-500" />}
                </div>
                <div className="flex-1 bg-slate-800/40 p-3 rounded-xl border border-slate-700 group-hover:border-slate-500 transition-colors">
                  <span className="text-cyan-400 font-bold text-sm mr-3">{event.minuto}'</span>
                  <span className="text-slate-200 text-sm">{event.testo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SimulationResultView;