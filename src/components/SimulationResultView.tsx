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
  statistiche: Record<string, [string | number, string | number]>;
  cronaca: MatchEvent[];
  top3?: string[];
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
  homeName: string;
  awayName: string;
  onOpenBettingDetails: () => void;
  onOpenAIExplanation: () => void;
}

const SimulationResultView: React.FC<Props> = ({ data, homeName, awayName, onOpenBettingDetails, onOpenAIExplanation }) => {
  
  // Protezione contro caricamenti parziali
  //if (!data) return <div className="text-white p-10 text-center font-bold animate-pulse">ANALISI DATI IN CORSO...</div>;

  // Calcolo dinamico larghezza barre
  const calculateWidth = (home: any, away: any) => {
    const h = parseFloat(home?.toString().replace('%', '')) || 0;
    const a = parseFloat(away?.toString().replace('%', '')) || 0;
    const total = h + a;
    return total === 0 ? 50 : (h / total) * 100;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* 1. HEADER RISULTATO PROFESSIONALE */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-700 p-8 rounded-[2rem] text-center shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500"></div>
        
        <p className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-6 opacity-80">
          Analisi Monte Carlo Completata • {data.algo_name}
        </p>
        
        <div className="flex items-center justify-around mb-8">
          <div className="flex-1 text-center">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{homeName}</h2>
            <p className="text-slate-500 text-xs font-bold mt-1 uppercase">Casa</p>
          </div>
          
          <div className="bg-slate-950 border-2 border-slate-800 px-10 py-6 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <span className="text-7xl font-black text-white tabular-nums tracking-tighter">
              {data.gh} - {data.ga}
            </span>
          </div>
          
          <div className="flex-1 text-center">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{awayName}</h2>
            <p className="text-slate-500 text-xs font-bold mt-1 uppercase">Ospite</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <span className="text-slate-300 text-sm font-bold">Segno: <b className="text-white">{data.sign}</b></span>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-slate-300 text-sm font-bold">Confidence: <b className="text-emerald-400">{data.report_scommesse?.Analisi_Profonda?.Confidence_Globale || 'N/D'}</b></span>
          </div>
        </div>
      </div>

      {/* 2. BOX INFO EXTRA: VALORE E RISULTATI TOP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
          <div className="bg-emerald-500/10 p-3 rounded-lg"><DollarSign className="text-emerald-400" size={20} /></div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Market Value Match</p>
            <p className="text-white font-black">{data.info_extra?.valore_mercato || 'N/D'}</p>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 hover:border-purple-500/30 transition-colors">
          <div className="bg-purple-500/10 p-3 rounded-lg"><Star className="text-purple-400" size={20} /></div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Top 3 Esatti</p>
            <p className="text-white font-black italic">{(data.top3 || []).join(' • ')}</p>
          </div>
        </div>
      </div>

      {/* 3. TASTI AZIONE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={onOpenAIExplanation}
          className="flex items-center justify-center gap-2 p-5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded-2xl transition-all group"
        >
          <MessageSquare className="text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="text-white font-bold">Spiegami il pronostico</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded-2xl transition-all">
          <Activity className="text-cyan-400" />
          <span className="text-white font-bold">Partite Simili</span>
        </button>
        <button 
          onClick={onOpenBettingDetails}
          className="flex items-center justify-center gap-3 p-5 bg-gradient-to-r from-amber-600/20 to-amber-900/20 hover:from-amber-600/30 border border-amber-600/50 rounded-2xl transition-all group"
        >
          <Trophy className="text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-amber-400 font-black uppercase tracking-widest">Consiglio Scommessa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 4. STATISTICHE STILE TELEVISIVO */}
        <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
            <BarChart3 className="text-cyan-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Match Statistics</h3>
          </div>
          
          <div className="space-y-6">
            {data.statistiche && Object.entries(data.statistiche).map(([label, [valH, valA]]) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <span className="text-slate-300">{valH}</span>
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-300">{valA}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex p-[1px]">
                  <div 
                    className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                    style={{ width: `${calculateWidth(valH, valA)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. CRONACA LIVE (Timeline con Icone Intelligenti) */}
        <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
            <Clock className="text-cyan-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Match Events</h3>
          </div>
          
          <div className="relative space-y-6 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
            {data.cronaca && data.cronaca.map((event, idx) => (
              <div key={idx} className="flex gap-4 items-center group border-b border-slate-800/50 pb-4 last:border-0">
                
                {/* ICONA DINAMICA: Trofeo per Gol, Scudo per Cartellini (Risolve errore ShieldAlert) */}
                <div className={`p-2 rounded-xl flex-shrink-0 ${event.tipo === 'gol' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  {event.tipo === 'gol' ? (
                    <Trophy size={18} className="text-emerald-500" />
                  ) : (
                    <ShieldAlert size={18} className="text-amber-500" />
                  )}
                </div>

                <span className="text-cyan-500 font-black text-sm min-w-[35px] text-right">{event.minuto}'</span>
                
                <div className="flex-1">
                  <p className="text-slate-300 text-sm font-medium leading-relaxed">
                    {event.testo}
                  </p>
                </div>
              </div>
            ))}
            {(!data.cronaca || data.cronaca.length === 0) && (
              <p className="text-slate-500 text-center italic">Nessun evento registrato nella timeline.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SimulationResultView;