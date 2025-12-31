import React, { useState } from 'react';
import { 
  Trophy, Activity, BarChart3, Clock, ShieldAlert, 
  TrendingUp, MessageSquare, DollarSign, Star, AlertTriangle, 
  Percent, ChevronRight, Swords, Target, Info
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
  // RIPRISTINATO: Vecchio report per compatibilità con l'header
  report_scommesse: {
    Bookmaker: Record<string, string>;
    Analisi_Profonda: {
      Confidence_Globale: string;
      Deviazione_Standard_Totale: number;
      Affidabilita_Previsione: string;
    };
  };
  // Nuovo report PRO
  report_scommesse_pro?: {
    analisi_dispersione: {
      std_dev: number;
      score_imprevedibilita: number;
      is_dispersed: boolean;
      warning: string | null;
    };
    probabilita_1x2: Record<string, number>;
    value_bets: Record<string, {
      ia_prob: number;
      book_prob: number;
      diff: number;
      is_value: boolean;
    }>;
    scommessa_consigliata: string;
    under_over: Record<string, number>;
    gol_nogol: Record<string, number>;
    top_risultati: Array<{ score: string; prob: number }>;
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
  const [activeTab, setActiveTab] = useState<'match' | 'stats' | 'betting'>('match');
  const pro = data.report_scommesse_pro;

  const calculateWidth = (home: any, away: any) => {
    const h = parseFloat(home?.toString().replace('%', '')) || 0;
    const a = parseFloat(away?.toString().replace('%', '')) || 0;
    const total = h + a;
    return total === 0 ? 50 : (h / total) * 100;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700 pb-12">
      
      {/* 1. HEADER: IL CAMPO DA CALCIO VIRTUALE */}
      <div className="relative h-64 md:h-80 w-full rounded-[2.5rem] overflow-hidden border border-emerald-500/30 shadow-2xl">
        {/* Sfondo Erba con Linee Campo */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900 to-slate-950">
            <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: `radial-gradient(circle at center, white 2px, transparent 2px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 50px 50px, 50px 50px'
            }}></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/20 rounded-full"></div>
        </div>

        {/* Contenuto Scoreboard */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
            <div className="flex items-center justify-between w-full max-w-4xl">
                <div className="text-center flex-1">
                    <h2 className="text-2xl md:text-4xl font-black text-white uppercase drop-shadow-lg">{homeName}</h2>
                    <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Casa</span>
                </div>

                <div className="flex flex-col items-center mx-4 md:mx-12">
                    <div className="bg-slate-950/90 backdrop-blur-md border-2 border-emerald-500/50 px-8 py-4 rounded-3xl shadow-2xl scale-110">
                        <span className="text-5xl md:text-7xl font-black text-white tabular-nums tracking-tighter">
                            {data.gh} - {data.ga}
                        </span>
                    </div>
                    <div className="mt-4 bg-emerald-500 text-slate-950 px-4 py-1 rounded-full text-xs font-black uppercase">
                        Segno {data.sign}
                    </div>
                </div>

                <div className="text-center flex-1">
                    <h2 className="text-2xl md:text-4xl font-black text-white uppercase drop-shadow-lg">{awayName}</h2>
                    <span className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Ospite</span>
                </div>
            </div>
            
            <div className="absolute bottom-6 flex gap-3">
              <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  {/* ABBIAMO TOLTO ZAP E MESSO ACTIVITY PER TOGLIERE L'ERRORE */}
                  <Activity size={14} className="text-emerald-400" /> 
                  <span className="text-white text-[10px] font-bold uppercase tracking-tight">
                      Confidence: {data.report_scommesse?.Analisi_Profonda?.Confidence_Globale || 'N/D'}
                  </span>
              </div>
              <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
        {/* ABBIAMO USATO TRENDINGUP QUI PER TOGLIERE L'ERRORE */}
        <TrendingUp size={14} className="text-cyan-400" />
        <span className="text-white text-[10px] font-bold uppercase tracking-tight">
            Segno {data.sign}
        </span>
    </div>
</div>
        </div>
      </div>

      {/* 2. SISTEMA A TAB PROFESSIONALE */}
      <div className="flex p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl gap-2 w-full max-w-lg mx-auto shadow-xl">
        {[
          { id: 'match', label: 'Match', icon: Swords },
          { id: 'stats', label: 'Statistiche', icon: BarChart3 },
          { id: 'betting', label: 'Betting Pro', icon: Trophy }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === tab.id 
                ? 'bg-emerald-500 text-slate-950 shadow-lg scale-105' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.id === 'match' && <Swords size={16} />}
            {tab.id === 'stats' && <BarChart3 size={16} />}
            {tab.id === 'betting' && <Trophy size={16} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. CONTENUTO TAB DINAMICO */}
      <div className="mt-8">
        
        {/* TAB 1: MATCH (Timeline e Info) */}
        {activeTab === 'match' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-500">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
                  <Clock className="text-emerald-400" size={20} />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Timeline Eventi</h3>
                </div>
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {data.cronaca?.map((event, idx) => (
                    <div key={idx} className={`flex gap-4 items-center p-4 rounded-2xl border transition-all ${event.squadra === 'casa' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-slate-800/20 border-slate-700/50'}`}>
                      <div className={`p-3 rounded-xl ${event.tipo === 'gol' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
                        {event.tipo === 'gol' ? <Trophy size={16} /> : <ShieldAlert size={16} />}
                      </div>
                      <span className="text-emerald-400 font-black text-lg min-w-[40px]">{event.minuto}'</span>
                      <p className="text-white text-sm font-bold leading-relaxed">{event.testo}</p>
                      <ChevronRight size={18} className="text-slate-600 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <Info className="text-cyan-400" />
                  <h4 className="text-white font-black uppercase text-xs">Match Info</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <DollarSign className="text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Valore Mercato</p>
                      <p className="text-white font-black">{data.info_extra?.valore_mercato || 'N/D'}</p>
                    </div>
                  </div>
                  <button onClick={onOpenAIExplanation} className="w-full flex items-center justify-between p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-2xl transition-all group">
                    <span className="text-purple-400 font-bold text-sm italic">Perché questo risultato?</span>
                    <MessageSquare size={18} className="text-purple-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STATISTICHE (Stile TV) */}
        {activeTab === 'stats' && (
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-12 border-b border-slate-800 pb-6">
              <BarChart3 className="text-cyan-400" />
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Performance Analysis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
              {data.statistiche && Object.entries(data.statistiche).map(([label, [valH, valA]]) => (
                <div key={label} className="group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-black text-white">{valH}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-cyan-400 transition-colors">{label}</span>
                    <span className="text-lg font-black text-white">{valA}</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex p-[2px]">
                    <div 
                      className="h-full bg-cyan-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      style={{ width: `${calculateWidth(valH, valA)}%` }}
                    ></div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BETTING PRO (Il Cervello IA) */}
        {activeTab === 'betting' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {pro?.analisi_dispersione.is_dispersed && (
              <div className="bg-amber-500/10 border-2 border-amber-500/50 p-6 rounded-3xl flex items-center gap-6 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <div className="bg-amber-500 p-4 rounded-2xl shadow-lg"><AlertTriangle size={32} className="text-slate-950" /></div>
                <div className="flex-1">
                  <h4 className="text-amber-500 font-black text-lg uppercase">Partita ad Alta Varianza</h4>
                  <p className="text-amber-200/60 font-medium">{pro.analisi_dispersione.warning}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl text-center border border-amber-500/20">
                  <span className="block text-amber-500 font-black text-2xl">{pro.analisi_dispersione.score_imprevedibilita}/100</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Risk Score</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['1', 'X', '2'].map((segno) => {
                const val = pro?.value_bets[segno];
                return (
                  <div key={segno} className={`p-6 rounded-[2rem] border transition-all ${val?.is_value ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/40 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-slate-800 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg">{segno}</span>
                      {val?.is_value && (
                        <div className="flex items-center gap-1.5 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">
                          <Star size={12} fill="currentColor" /> Value Bet
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-xs font-bold uppercase">Probabilità IA</span>
                            <span className="text-2xl font-black text-white">{val?.ia_prob}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${val?.is_value ? 'bg-amber-500' : 'bg-slate-600'}`} style={{ width: `${val?.ia_prob}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>Bookmaker</span>
                            <span>{val?.book_prob}%</span>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-8">
                <Percent className="text-purple-400" size={20} />
                    <Target className="text-purple-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Top Risultati Esatti</h3>
                </div>
                <div className="space-y-5">
                    {pro?.top_risultati.map((res, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <span className="w-12 text-xs font-black text-purple-400">{res.score}</span>
                            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]" style={{ width: `${res.prob * 4}%` }}></div>
                            </div>
                            <span className="w-12 text-right text-xs font-bold text-white">{res.prob}%</span>
                        </div>
                    ))}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-[2rem] flex flex-col justify-center text-center">
                 <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Suggerimento Finale</h4>
                 <p className={`text-4xl font-black mb-6 ${pro?.scommessa_consigliata === 'CONSIGLIATA' ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {pro?.scommessa_consigliata}
                 </p>
                 <button onClick={onOpenBettingDetails} className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">
                    Vedi Report Completo
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationResultView;