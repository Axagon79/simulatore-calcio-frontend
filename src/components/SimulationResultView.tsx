import React, { useState } from 'react';
import { 
  Trophy, Activity, BarChart3, Clock, ShieldAlert, 
  TrendingUp, MessageSquare, DollarSign, Star, AlertTriangle, 
  ChevronRight, Target, Info, Zap, ChevronDown, ChevronUp
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

const SimulationResultView: React.FC<Props> = ({ 
  data, 
  homeName = 'Team Casa', 
  awayName = 'Team Ospite', 
  onOpenBettingDetails, 
  onOpenAIExplanation 
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'stats' | 'betting'>('betting');
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const pro = data?.report_scommesse_pro;

  const calculateWidth = (home: any, away: any) => {
    const h = parseFloat(home?.toString().replace('%', '')) || 0;
    const a = parseFloat(away?.toString().replace('%', '')) || 0;
    const total = h + a;
    return total === 0 ? 50 : (h / total) * 100;
  };

  const getConfidenceColor = (confidence: string) => {
    const conf = confidence?.toLowerCase() || '';
    if (conf.includes('alta') || conf.includes('high')) return 'text-emerald-400';
    if (conf.includes('media') || conf.includes('medium')) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSignColor = (sign: string) => {
    if (sign === '1') return 'bg-gradient-to-br from-cyan-500 to-cyan-600';
    if (sign === 'X') return 'bg-gradient-to-br from-purple-500 to-purple-600';
    return 'bg-gradient-to-br from-pink-500 to-pink-600';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      
      {/* HEADER: SCOREBOARD MODERNO */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Pattern di sfondo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 p-6 md:p-10">
          {/* Badge Superiore */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50">
              <Zap size={14} className="text-cyan-400" />
              <span className="text-xs font-bold text-slate-300">
                {data?.algo_name || 'MonteCarlo AI'}
              </span>
            </div>
            <div className={`flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border ${
              data?.report_scommesse?.Analisi_Profonda?.Confidence_Globale 
                ? 'bg-emerald-500/20 border-emerald-500/50' 
                : 'bg-slate-800/80 border-slate-700/50'
            }`}>
              <Activity size={14} className={getConfidenceColor(data?.report_scommesse?.Analisi_Profonda?.Confidence_Globale || '')} />
              <span className="text-xs font-bold text-white">
                Confidence: {data?.report_scommesse?.Analisi_Profonda?.Confidence_Globale || 'N/D'}
              </span>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="flex items-center justify-between gap-4 md:gap-8 max-w-5xl mx-auto">
            {/* Team Casa */}
            <div className="flex-1 text-center space-y-2">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Casa</div>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                {homeName}
              </h2>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-linear-to-br from-slate-950 to-slate-900 border-2 border-cyan-500/30 px-6 md:px-10 py-4 md:py-6 rounded-2xl shadow-2xl shadow-cyan-500/10">
                <div className="text-5xl md:text-7xl font-black text-white tabular-nums tracking-tight flex items-center gap-3 md:gap-4">
                  <span className="text-cyan-400">{data?.gh || 0}</span>
                  <span className="text-slate-600">-</span>
                  <span className="text-pink-400">{data?.ga || 0}</span>
                </div>
              </div>
              
              <div className={`${getSignColor(data?.sign || '1')} px-6 py-2 rounded-full shadow-lg`}>
                <span className="text-white text-sm font-black uppercase tracking-wider">
                  Segno {data?.sign || '1'}
                </span>
              </div>
            </div>

            {/* Team Ospite */}
            <div className="flex-1 text-center space-y-2">
              <div className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">Ospite</div>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                {awayName}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-2 p-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl">
        {[
          { id: 'betting', label: 'Betting Pro', icon: Trophy, color: 'emerald' },
          { id: 'stats', label: 'Statistiche', icon: BarChart3, color: 'cyan' },
          { id: 'match', label: 'Timeline', icon: Clock, color: 'purple' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all duration-300 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENUTO TAB */}
      <div className="min-h-150">
        
        {/* TAB BETTING PRO */}
        {activeTab === 'betting' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Alert Dispersione */}
            {pro?.analisi_dispersione?.is_dispersed && (
              <div className="bg-linear-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-2xl p-6 flex items-start gap-4">
                <div className="bg-amber-500 p-3 rounded-xl shrink-0">
                  <AlertTriangle size={24} className="text-slate-950" />
                </div>
                <div className="flex-1">
                  <h4 className="text-amber-400 font-black text-lg mb-1">
                    Partita ad Alta Variabilità
                  </h4>
                  <p className="text-amber-200/70 text-sm">
                    {pro.analisi_dispersione.warning || 'Risultato difficile da prevedere con certezza'}
                  </p>
                </div>
                <div className="bg-slate-950/80 backdrop-blur px-4 py-3 rounded-xl border border-amber-500/20 text-center shrink-0">
                  <div className="text-3xl font-black text-amber-400">
                    {pro.analisi_dispersione.score_imprevedibilita || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Risk Score</div>
                </div>
              </div>
            )}

            {/* Value Bets 1X2 */}
            <div>
              <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
                <Star className="text-amber-400" size={20} />
                Analisi 1X2 Value Betting
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['1', 'X', '2'].map((segno) => {
                  const val = pro?.value_bets?.[segno];
                  const isValue = val?.is_value;
                  const prob1x2 = pro?.probabilita_1x2?.[segno] || val?.ia_prob || 0;
                  
                  return (
                    <div
                      key={segno}
                      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                        isValue
                          ? 'bg-linear-to-br from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-xl shadow-amber-500/10'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isValue && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase flex items-center gap-1">
                          <Star size={10} fill="currentColor" />
                          Value Bet
                        </div>
                      )}
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black ${
                            segno === '1' ? 'bg-cyan-500 text-white' :
                            segno === 'X' ? 'bg-purple-500 text-white' :
                            'bg-pink-500 text-white'
                          }`}>
                            {segno}
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-white">{prob1x2}%</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Probabilità IA</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isValue ? 'bg-linear-to-r from-amber-400 to-orange-500' : 'bg-slate-600'
                              }`}
                              style={{ width: `${prob1x2}%` }}
                            ></div>
                          </div>
                          
                          {val && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">Bookmaker</span>
                              <span className="text-slate-400 font-bold">{val.book_prob}%</span>
                            </div>
                          )}
                        </div>

                        {isValue && val && (
                          <div className="pt-2 border-t border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-amber-400 font-bold">Value Edge</span>
                              <span className="text-amber-400 font-black">+{Math.abs(val.diff).toFixed(1)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Grid: Top Risultati + Suggerimento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Risultati Esatti */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="text-purple-400" size={20} />
                  <h3 className="text-white font-black text-sm uppercase">Top Risultati Esatti</h3>
                </div>
                <div className="space-y-4">
                  {pro?.top_risultati?.slice(0, 5).map((res, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-black text-purple-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">{res.score}</span>
                          <span className="text-purple-400 font-bold text-sm">{res.prob}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(res.prob * 3, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )) || <p className="text-slate-500 text-sm text-center py-4">Dati non disponibili</p>}
                </div>
              </div>

              {/* Suggerimento Finale */}
              <div className="bg-linear-to-br from-emerald-900/30 via-slate-900 to-cyan-900/30 border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="space-y-2">
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Suggerimento AI
                  </div>
                  <div className={`text-5xl font-black ${
                    pro?.scommessa_consigliata?.toLowerCase().includes('consigliata')
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {pro?.scommessa_consigliata || 'ANALISI IN CORSO'}
                  </div>
                </div>
                
                <button
                  onClick={onOpenBettingDetails}
                  className="w-full py-4 bg-linear-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  📊 Report Completo
                </button>
                
                <button
                  onClick={onOpenAIExplanation}
                  className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-xl font-bold text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} />
                  Spiegazione AI
                </button>
              </div>
            </div>

            {/* Under/Over e Gol/NoGol */}
            {(pro?.under_over || pro?.gol_nogol) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pro.under_over && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-white font-black text-sm uppercase mb-4 flex items-center gap-2">
                      <TrendingUp className="text-cyan-400" size={16} />
                      Under / Over 2.5
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(pro.under_over).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm font-bold capitalize">{key}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${val}%` }}></div>
                            </div>
                            <span className="text-white font-black text-sm w-12 text-right">{val}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pro.gol_nogol && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-white font-black text-sm uppercase mb-4 flex items-center gap-2">
                      <Trophy className="text-amber-400" size={16} />
                      Gol / NoGol
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(pro.gol_nogol).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm font-bold capitalize">{key}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${val}%` }}></div>
                            </div>
                            <span className="text-white font-black text-sm w-12 text-right">{val}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB STATISTICHE */}
        {activeTab === 'stats' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
              <BarChart3 className="text-cyan-400" size={24} />
              <h3 className="text-xl font-black text-white uppercase">Performance Analysis</h3>
            </div>
            
            <div className="space-y-6">
              {data?.statistiche && Object.entries(data.statistiche).map(([label, [valH, valA]]) => {
                const isExpanded = expandedStat === label;
                return (
                  <div key={label} className="group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xl font-black text-cyan-400">{valH}</span>
                      <button
                        onClick={() => setExpandedStat(isExpanded ? null : label)}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <span className="text-xs font-black uppercase tracking-wider">{label}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <span className="text-xl font-black text-pink-400">{valA}</span>
                    </div>
                    
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-1000 shadow-lg shadow-cyan-500/30"
                        style={{ width: `${calculateWidth(valH, valA)}%` }}
                      ></div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-slate-500 text-xs font-bold mb-1">Casa</div>
                            <div className="text-white font-black">{valH}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-500 text-xs font-bold mb-1">Ospite</div>
                            <div className="text-white font-black">{valA}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB TIMELINE */}
        {activeTab === 'match' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                  <Clock className="text-emerald-400" size={20} />
                  <h3 className="text-sm font-black text-white uppercase">Timeline Eventi</h3>
                </div>
                
                <div className="space-y-4 max-h-150 overflow-y-auto pr-2">
                  {data?.cronaca?.length > 0 ? data.cronaca.map((event, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                        event.squadra === 'casa'
                          ? 'bg-cyan-500/5 border-cyan-500/20'
                          : 'bg-slate-800/40 border-slate-700/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${
                        event.tipo === 'gol'
                          ? 'bg-emerald-500 text-white'
                          : event.tipo === 'cartellino'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700 text-white'
                      }`}>
                        {event.tipo === 'gol' ? <Trophy size={16} /> : <ShieldAlert size={16} />}
                      </div>
                      
                      <span className="text-emerald-400 font-black text-base min-w-11.25">
                        {event.minuto}'
                      </span>
                      
                      <p className="text-white text-sm font-medium flex-1 leading-relaxed">
                        {event.testo}
                      </p>
                      
                      <ChevronRight size={16} className="text-slate-600 shrink-0" />
                    </div>
                  )) : (
                    <div className="text-center py-12">
                      <Clock className="mx-auto mb-3 text-slate-700" size={48} />
                      <p className="text-slate-500 text-sm">Nessun evento disponibile</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Match Info */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="text-cyan-400" size={18} />
                  <h4 className="text-white font-black uppercase text-xs">Match Info</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                    <DollarSign className="text-emerald-400 shrink-0" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Valore</p>
                      <p className="text-white font-black text-sm truncate">
                        {data?.info_extra?.valore_mercato || 'N/D'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={onOpenAIExplanation}
                className="w-full p-4 bg-linear-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-xl transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-purple-400 font-bold text-sm">Perché questo risultato?</span>
                  <MessageSquare className="text-purple-400" size={18} />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default SimulationResultView;