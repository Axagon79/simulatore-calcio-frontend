import React, { useState } from 'react';
import {
  Trophy, BarChart3, Clock, ShieldAlert,
  TrendingUp, DollarSign, Star, AlertTriangle,
  Target
} from 'lucide-react';
import type { MatchEvent } from '../types';
import { getThemeMode } from '../AppDev/costanti';

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
  report_html?: string;  // ✅ AGGIUNGI QUESTA RIGA
  confidence_html?: string;  // ✅ AGGIUNGI QUESTA RIGA
}

interface Props {
  data: SimulationData;
  homeName: string;
  awayName: string;
}

const SimulationResultView: React.FC<Props> = ({
  data,
  homeName = 'Team Casa',
  awayName = 'Team Ospite',
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'stats' | 'betting'>('betting');
  const pro = data?.report_scommesse_pro;
  const isLight = getThemeMode() === 'light';

  // Palette tema (light/dark)
  const t = {
    // Container/card
    cardBg: isLight ? 'bg-white' : 'bg-slate-900',
    cardBgSoft: isLight ? 'bg-slate-50' : 'bg-slate-900',
    cardBgStrong: isLight ? 'bg-white' : 'bg-slate-900',
    border: isLight ? 'border-slate-200' : 'border-slate-800',
    borderStrong: isLight ? 'border-slate-300' : 'border-slate-700',
    headerBg: isLight
      ? 'bg-linear-to-br from-slate-50 via-white to-slate-50'
      : 'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900',
    headerBorder: isLight ? 'border-slate-200' : 'border-slate-700',
    scoreBg: isLight ? 'bg-slate-100' : 'bg-slate-950',
    scoreBorder: isLight ? 'border-slate-300' : 'border-slate-700',
    badgeBg: isLight ? 'bg-slate-100' : 'bg-slate-800',
    badgeBorder: isLight ? 'border-slate-300' : 'border-slate-700',
    progressBg: isLight ? 'bg-slate-200' : 'bg-slate-800',
    tabBg: isLight ? 'bg-slate-100' : 'bg-slate-900',
    tabBorder: isLight ? 'border-slate-200' : 'border-slate-800',
    tabActiveBg: isLight ? 'bg-white' : 'bg-slate-800',
    tabHoverBg: isLight ? 'hover:bg-slate-200/60' : 'hover:bg-slate-800/60',
    // Testo
    textPrimary: isLight ? 'text-slate-900' : 'text-white',
    textSecondary: isLight ? 'text-slate-700' : 'text-slate-300',
    textMuted: isLight ? 'text-slate-500' : 'text-slate-400',
    textFaint: isLight ? 'text-slate-400' : 'text-slate-500',
    textInverted: isLight ? 'text-white' : 'text-slate-950',
    // Accenti
    cyan: isLight ? 'text-cyan-600' : 'text-cyan-400',
    pink: isLight ? 'text-pink-600' : 'text-pink-400',
    purple: isLight ? 'text-purple-600' : 'text-purple-400',
    amber: isLight ? 'text-amber-600' : 'text-amber-400',
    emerald: isLight ? 'text-emerald-600' : 'text-emerald-400',
    red: isLight ? 'text-red-600' : 'text-red-400',
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-4 md:px-8 py-4 md:py-6">
      
      {/* HEADER: SCOREBOARD MODERNO */}
      <div className={`relative overflow-hidden rounded-3xl border ${t.headerBorder} ${t.headerBg}`}>
        {/* Pattern di sfondo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${isLight ? 'black' : 'white'} 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 p-6 md:p-10">
          {/* Scoreboard */}
          <div className="flex items-center justify-between gap-2 md:gap-8 max-w-5xl mx-auto">
            {/* Team Casa */}
            <div className="flex-1 min-w-0 text-center space-y-1 md:space-y-2">
              <div className={`flex items-center justify-center gap-1.5 text-[10px] md:text-xs font-semibold ${t.textFaint} uppercase tracking-[0.2em] mb-1 md:mb-2`}>
                <span
                  className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0"
                  style={{ boxShadow: '0 0 6px rgba(6,182,212,0.5)' }}
                />
                Casa
              </div>
              <h2 className={`text-base sm:text-xl md:text-3xl lg:text-4xl font-bold ${t.textPrimary} uppercase tracking-tight leading-tight wrap-break-word hyphens-auto`}>
                {homeName}
              </h2>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-2 md:gap-3 shrink-0">
              <div className={`${t.scoreBg} border ${t.scoreBorder} px-4 md:px-10 py-2 md:py-5 rounded-xl`}>
                <div className={`text-3xl md:text-6xl font-bold ${t.textPrimary} tabular-nums tracking-tight flex items-center gap-3 md:gap-5`}>
                  <span>{data?.gh || 0}</span>
                  <span className={`${t.textFaint} font-normal`}>:</span>
                  <span>{data?.ga || 0}</span>
                </div>
              </div>
            </div>

            {/* Team Ospite */}
            <div className="flex-1 min-w-0 text-center space-y-1 md:space-y-2">
              <div className={`flex items-center justify-center gap-1.5 text-[10px] md:text-xs font-semibold ${t.textFaint} uppercase tracking-[0.2em] mb-1 md:mb-2`}>
                <span
                  className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0"
                  style={{ boxShadow: '0 0 6px rgba(236,72,153,0.5)' }}
                />
                Ospite
              </div>
              <h2 className={`text-base sm:text-xl md:text-3xl lg:text-4xl font-bold ${t.textPrimary} uppercase tracking-tight leading-tight wrap-break-word hyphens-auto`}>
                {awayName}
              </h2>
            </div>
          </div>

          {/* Barra chip riassuntiva — 4 mercati a colpo d'occhio */}
          {(() => {
            const probs = pro?.probabilita_1x2 ?? {};
            const segniEntries = Object.entries(probs);
            let best1x2: { segno: string; prob: number } = { segno: '-', prob: 0 };
            for (const [s, p] of segniEntries) {
              if ((p as number) > best1x2.prob) best1x2 = { segno: s, prob: p as number };
            }

            const uoEntries = Object.entries(pro?.under_over ?? {});
            let bestUO: { key: string; prob: number } = { key: '-', prob: 0 };
            for (const [k, v] of uoEntries) {
              if ((v as number) > bestUO.prob) bestUO = { key: k, prob: v as number };
            }

            const ggEntries = Object.entries(pro?.gol_nogol ?? {});
            let bestGG: { key: string; prob: number } = { key: '-', prob: 0 };
            for (const [k, v] of ggEntries) {
              if ((v as number) > bestGG.prob) bestGG = { key: k, prob: v as number };
            }

            const topRis = pro?.top_risultati?.[0];

            const chipBg = isLight ? 'bg-white' : 'bg-slate-950';
            const chipBorder = isLight ? 'border-slate-200' : 'border-slate-800';

            const Chip = ({ label, value, prob }: { label: string; value: string; prob: number | string }) => (
              <div className={`flex items-center gap-2 ${chipBg} border ${chipBorder} rounded-lg px-3 py-2 min-w-0`}>
                <span className={`text-[10px] ${t.textFaint} font-bold uppercase tracking-wider shrink-0`}>{label}</span>
                <span className={`text-sm ${t.textPrimary} font-bold`}>{value}</span>
                <span className={`text-sm ${t.cyan} font-black ml-auto`}>{typeof prob === 'number' ? `${Math.round(prob)}%` : prob}</span>
              </div>
            );

            return (
              <div className={`mt-6 pt-6 border-t-2 ${isLight ? 'border-slate-300' : 'border-slate-700'} max-w-5xl mx-auto`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Chip label="1X2" value={best1x2.segno} prob={best1x2.prob} />
                  <Chip label="U/O 2.5" value={bestUO.key} prob={bestUO.prob} />
                  <Chip label="GG/NG" value={bestGG.key} prob={bestGG.prob} />
                  <Chip label="Esatto" value={topRis?.score || '-'} prob={topRis?.prob ?? '-'} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className={`flex gap-1 p-1 ${t.tabBg} border ${t.tabBorder} rounded-xl`}>
        {[
          { id: 'betting', label: 'Betting Pro', icon: Trophy },
          { id: 'stats', label: 'Statistiche', icon: BarChart3 },
          { id: 'match', label: 'Timeline', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${
                isActive
                  ? `${t.tabActiveBg} ${t.textPrimary} ${isLight ? 'shadow-sm' : ''}`
                  : `bg-transparent ${t.textFaint} ${t.tabHoverBg}`
              }`}
            >
              <Icon size={14} />
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

            {/* Risk Score Banner — sempre visibile */}
            {(() => {
              // Segnale 1: dispersione 1X2 dal backend (peso 50%)
              const dispersione = pro?.analisi_dispersione?.score_imprevedibilita ?? 0;

              // Segnale 2: prob pareggio (peso 30%) — il pareggio è il killer silenzioso
              const probX = pro?.probabilita_1x2?.['X'] ?? 0;

              // Segnale 3: volatilità multigol — quanto sono uniformi i top 5 risultati esatti (peso 20%)
              const top5 = (pro?.top_risultati ?? []).slice(0, 5).map(r => r.prob || 0);
              let volatilita = 0;
              if (top5.length >= 2 && top5[0] > 0) {
                const last = top5[top5.length - 1];
                const spread = (top5[0] - last) / top5[0];
                volatilita = Math.max(0, Math.min(100, (1 - spread) * 100));
              }

              const riskScore = Math.round(Math.max(0, Math.min(100,
                0.5 * dispersione + 0.3 * probX + 0.2 * volatilita
              )));

              // Mappa Risk Score → fascia colore + titolo (light/dark)
              type Fascia = {
                titolo: string;
                bg: string;
                border: string;
                iconBg: string;
                iconColor: string;
                titleColor: string;
                textColor: string;
                numColor: string;
                numBorder: string;
              };
              let f: Fascia;
              const neutralBg = isLight ? 'bg-slate-50' : 'bg-slate-900';
              const neutralNumBorder = isLight ? 'border-slate-300' : 'border-slate-700';
              if (riskScore <= 33) {
                f = {
                  titolo: 'Rischio Basso',
                  bg: neutralBg,
                  border: isLight ? 'border-emerald-300' : 'border-emerald-700',
                  iconBg: 'bg-emerald-500',
                  iconColor: 'text-white',
                  titleColor: isLight ? 'text-emerald-700' : 'text-emerald-400',
                  textColor: isLight ? 'text-slate-600' : 'text-slate-400',
                  numColor: isLight ? 'text-emerald-700' : 'text-emerald-400',
                  numBorder: neutralNumBorder,
                };
              } else if (riskScore <= 66) {
                f = {
                  titolo: 'Rischio Medio',
                  bg: neutralBg,
                  border: isLight ? 'border-amber-300' : 'border-amber-700',
                  iconBg: 'bg-amber-500',
                  iconColor: 'text-white',
                  titleColor: isLight ? 'text-amber-700' : 'text-amber-400',
                  textColor: isLight ? 'text-slate-600' : 'text-slate-400',
                  numColor: isLight ? 'text-amber-700' : 'text-amber-400',
                  numBorder: neutralNumBorder,
                };
              } else {
                f = {
                  titolo: 'Partita ad Alta Variabilità',
                  bg: neutralBg,
                  border: isLight ? 'border-red-300' : 'border-red-700',
                  iconBg: 'bg-red-500',
                  iconColor: 'text-white',
                  titleColor: isLight ? 'text-red-700' : 'text-red-400',
                  textColor: isLight ? 'text-slate-600' : 'text-slate-400',
                  numColor: isLight ? 'text-red-700' : 'text-red-400',
                  numBorder: neutralNumBorder,
                };
              }

              const warningText = pro?.analisi_dispersione?.is_dispersed
                ? (pro.analisi_dispersione.warning || 'Risultato difficile da prevedere con certezza')
                : 'Pronostico nella norma';

              const numBg = isLight ? 'bg-white' : 'bg-slate-950';

              return (
                <div className={`${f.bg} border-2 ${f.border} rounded-2xl p-6 flex items-start gap-4`}>
                  <div className={`${f.iconBg} p-3 rounded-xl shrink-0`}>
                    <AlertTriangle size={24} className={f.iconColor} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`${f.titleColor} font-black text-lg mb-1`}>
                      {f.titolo}
                    </h4>
                    <p className={`${f.textColor} text-sm`}>
                      {warningText}
                    </p>
                  </div>
                  <div className={`${numBg} px-4 py-3 rounded-xl border ${f.numBorder} text-center shrink-0`}>
                    <div className={`text-3xl font-black ${f.numColor}`}>
                      {riskScore}
                    </div>
                    <div className={`text-[10px] ${t.textFaint} uppercase font-bold`}>Risk Score</div>
                  </div>
                </div>
              );
            })()}

            {/* Affidabilità */}
            {(() => {
              // Segnale 1: chiarezza segno 1X2 (peso 50%)
              const probs = pro?.probabilita_1x2 ? Object.values(pro.probabilita_1x2) : [];
              const maxProb1x2 = probs.length ? Math.max(...probs) : 0;

              // Segnale 2: concentrazione top 5 risultati esatti (peso 30%)
              const top5Sum = (pro?.top_risultati ?? [])
                .slice(0, 5)
                .reduce((acc, r) => acc + (r.prob || 0), 0);

              // Segnale 3: coerenza Under/Over con predicted_score (peso 20%)
              let uoCoerente = 0;
              const totGol = (data?.gh ?? 0) + (data?.ga ?? 0);
              if (pro?.under_over) {
                uoCoerente = totGol <= 2 ? (pro.under_over['U2.5'] ?? 0) : (pro.under_over['O2.5'] ?? 0);
              }

              const affidabilita = Math.max(0, Math.min(100,
                0.5 * maxProb1x2 + 0.3 * top5Sum + 0.2 * uoCoerente
              ));
              const emptyStarColor = isLight ? '#cbd5e1' : '#334155';
              return (
                <div className={`${
                  isLight
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-slate-900 border-emerald-800'
                } border rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-6`}>
                  <div className="space-y-2">
                    <div className={`${t.textMuted} text-xs font-bold uppercase tracking-widest`}>
                      Affidabilità
                    </div>
                    <div className={`text-5xl font-black ${t.cyan}`}>
                      {Math.round(affidabilita)}%
                    </div>
                  </div>

                  {/* 5 stelle con riempimento lineare continuo */}
                  <div style={{ display: 'flex', gap: '4px', lineHeight: 0 }}>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const fillPct = Math.max(0, Math.min(100, (affidabilita - i * 20) * 5));
                      const gradId = `star-grad-${i}`;
                      return (
                        <svg key={i} width={28} height={28} viewBox="0 0 24 24">
                          <defs>
                            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                              <stop offset={`${fillPct}%`} stopColor="#fbbf24" />
                              <stop offset={`${fillPct}%`} stopColor={emptyStarColor} />
                            </linearGradient>
                          </defs>
                          <polygon
                            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                            fill={`url(#${gradId})`}
                          />
                        </svg>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Value Bets 1X2 */}
            <div>
              <h3 className={`${t.textPrimary} font-black text-xl mb-4 flex items-center gap-2`}>
                <Star className={t.amber} size={20} />
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
                          ? (isLight
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-linear-to-br from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-xl shadow-amber-500/10')
                          : `${t.cardBgSoft} ${t.border} ${isLight ? 'hover:border-slate-300' : 'hover:border-slate-700'}`
                      }`}
                    >
                      {isValue && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase flex items-center gap-1">
                          <Star size={10} fill="currentColor" />
                          Value Bet
                        </div>
                      )}

                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white ${
                            segno === '1' ? 'bg-cyan-500' :
                            segno === 'X' ? 'bg-purple-500' :
                            'bg-pink-500'
                          }`}>
                            {segno}
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-black ${t.textPrimary}`}>{prob1x2}%</div>
                            <div className={`text-[10px] ${t.textFaint} uppercase font-bold`}>Probabilità IA</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className={`h-2 ${t.progressBg} rounded-full overflow-hidden`}>
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isValue
                                  ? 'bg-linear-to-r from-amber-400 to-orange-500'
                                  : (isLight ? 'bg-slate-400' : 'bg-slate-600')
                              }`}
                              style={{ width: `${prob1x2}%` }}
                            ></div>
                          </div>

                          {val && (
                            <div className="flex justify-between items-center text-xs">
                              <span className={`${t.textFaint} font-bold`}>Bookmaker</span>
                              <span className={`${t.textMuted} font-bold`}>{val.book_prob}%</span>
                            </div>
                          )}
                        </div>

                        {isValue && val && (
                          <div className={`pt-2 border-t ${isLight ? 'border-amber-300' : 'border-amber-500/20'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs ${t.amber} font-bold`}>Value Edge</span>
                              <span className={`${t.amber} font-black`}>+{Math.abs(val.diff).toFixed(1)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Risultati Esatti */}
            <div className={`${t.cardBgSoft} border ${t.border} rounded-2xl p-6`}>
              <div className="flex items-center gap-2 mb-6">
                <Target className={t.purple} size={20} />
                <h3 className={`${t.textPrimary} font-black text-sm uppercase`}>Top Risultati Esatti</h3>
              </div>
              <div className="space-y-4">
                {pro?.top_risultati?.slice(0, 5).map((res, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`w-8 h-8 rounded-lg ${isLight ? 'bg-purple-100 border-purple-300' : 'bg-purple-500/20 border-purple-500/30'} border flex items-center justify-center text-xs font-black ${t.purple}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`${t.textPrimary} font-bold`}>{res.score}</span>
                        <span className={`${t.purple} font-bold text-sm`}>{res.prob}%</span>
                      </div>
                      <div className={`h-1.5 ${t.progressBg} rounded-full overflow-hidden`}>
                        <div
                          className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(res.prob * 3, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )) || <p className={`${t.textFaint} text-sm text-center py-4`}>Dati non disponibili</p>}
              </div>
            </div>

            {/* Under/Over e Gol/NoGol */}
            {(pro?.under_over || pro?.gol_nogol) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pro.under_over && (
                  <div className={`${t.cardBgSoft} border ${t.border} rounded-2xl p-6`}>
                    <h4 className={`${t.textPrimary} font-black text-sm uppercase mb-4 flex items-center gap-2`}>
                      <TrendingUp className={t.cyan} size={16} />
                      Under / Over 2.5
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(pro.under_over).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className={`${t.textMuted} text-sm font-bold capitalize`}>{key}</span>
                          <div className="flex items-center gap-3">
                            <div className={`w-32 h-2 ${t.progressBg} rounded-full overflow-hidden`}>
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${val}%` }}></div>
                            </div>
                            <span className={`${t.textPrimary} font-black text-sm w-12 text-right`}>{val}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pro.gol_nogol && (
                  <div className={`${t.cardBgSoft} border ${t.border} rounded-2xl p-6`}>
                    <h4 className={`${t.textPrimary} font-black text-sm uppercase mb-4 flex items-center gap-2`}>
                      <Trophy className={t.amber} size={16} />
                      Gol / NoGol
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(pro.gol_nogol).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className={`${t.textMuted} text-sm font-bold capitalize`}>{key}</span>
                          <div className="flex items-center gap-3">
                            <div className={`w-32 h-2 ${t.progressBg} rounded-full overflow-hidden`}>
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${val}%` }}></div>
                            </div>
                            <span className={`${t.textPrimary} font-black text-sm w-12 text-right`}>{val}%</span>
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
          <div className={`${t.cardBgSoft} border ${t.border} rounded-2xl p-4 md:p-5 animate-in fade-in slide-in-from-right-4 duration-500`}>
            <div className={`flex items-center justify-between mb-3 pb-3 border-b ${t.border}`}>
              <div className="flex items-center gap-2">
                <BarChart3 className={t.cyan} size={16} />
                <h3 className={`text-xs font-bold ${t.textPrimary} uppercase tracking-[0.15em]`}>Statistiche Partita</h3>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className={t.textMuted}>{homeName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span className={t.textMuted}>{awayName}</span>
                </div>
              </div>
            </div>

            {(() => {
              const CATEGORIE: { titolo: string; items: string[] }[] = [
                { titolo: 'Generali', items: ['Possesso Palla', "Calci d'Angolo", 'Fuorigioco'] },
                { titolo: 'Tiri', items: ['Tiri Totali', 'Tiri in Porta', 'Tiri Fuori', 'Tiri Respinti', 'Pali Colpiti'] },
                { titolo: 'Passaggi', items: ['Passaggi Totali', 'Passaggi Riusciti', 'Precisione Passaggi', 'Cross', 'Lanci Lunghi'] },
                { titolo: 'Attacco', items: ['Attacchi', 'Attacchi Pericolosi', 'Dribbling'] },
                { titolo: 'Difesa', items: ['Tackle Totali', 'Intercettazioni', 'Parate'] },
                { titolo: 'Disciplina', items: ['Falli', 'Ammonizioni', 'Sostituzioni'] },
              ];

              const stats = data?.statistiche || {};

              const renderRiga = (label: string, valH: any, valA: any) => {
                const nH = typeof valH === 'number' ? valH : parseFloat(String(valH)) || 0;
                const nA = typeof valA === 'number' ? valA : parseFloat(String(valA)) || 0;
                const total = nH + nA;
                const pctH = total > 0 ? (nH / total) * 100 : 50;
                const pctA = total > 0 ? (nA / total) * 100 : 50;

                return (
                  <div key={label} className="py-1.5">
                    <div className="grid grid-cols-[50px_1fr_50px] sm:grid-cols-[70px_1fr_70px] items-center gap-2 mb-1">
                      <span className={`text-sm font-bold ${t.cyan} text-left tabular-nums`}>{valH}</span>
                      <span className={`text-[10px] sm:text-[11px] font-semibold ${t.textMuted} uppercase tracking-wider text-center`}>
                        {label}
                      </span>
                      <span className={`text-sm font-bold ${t.pink} text-right tabular-nums`}>{valA}</span>
                    </div>
                    <div className="flex items-center gap-1 h-1">
                      <div className={`flex-1 ${t.progressBg} rounded-full overflow-hidden flex justify-end`}>
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all duration-700"
                          style={{ width: `${pctH}%` }}
                        />
                      </div>
                      <div className={`flex-1 ${t.progressBg} rounded-full overflow-hidden`}>
                        <div
                          className="h-full bg-pink-500 rounded-full transition-all duration-700"
                          style={{ width: `${pctA}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div>
                  {CATEGORIE.map((cat, ci) => {
                    const righe = cat.items
                      .filter(lbl => stats[lbl] !== undefined)
                      .map(lbl => ({ lbl, vals: stats[lbl] as [any, any] }));
                    if (righe.length === 0) return null;
                    return (
                      <div key={cat.titolo} className={ci > 0 ? 'mt-3' : ''}>
                        <div className={`text-center text-[10px] font-bold ${t.textMuted} uppercase tracking-[0.25em] py-1.5 mb-2 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
                          {cat.titolo}
                        </div>
                        {righe.map(r => renderRiga(r.lbl, r.vals[0], r.vals[1]))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB TIMELINE */}
        {activeTab === 'match' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <div className={`${t.cardBgSoft} border ${t.border} rounded-2xl p-4 md:p-5`}>
              <div className={`flex items-center justify-between gap-3 mb-3 pb-3 border-b ${t.border}`}>
                <div className="flex items-center gap-2">
                  <Clock className={t.emerald} size={16} />
                  <h3 className={`text-xs font-bold ${t.textPrimary} uppercase tracking-[0.15em]`}>Timeline Eventi</h3>
                </div>
                {data?.info_extra?.valore_mercato && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} border`}>
                    <DollarSign size={12} className={t.emerald} />
                    <span className={`text-[10px] ${t.textFaint} font-bold uppercase tracking-wider`}>Valore</span>
                    <span className={`text-[11px] ${t.textPrimary} font-bold truncate`}>
                      {data.info_extra.valore_mercato}
                    </span>
                  </div>
                )}
              </div>

              {data?.cronaca?.length > 0 ? (() => {
                const eventi = data.cronaca;
                const primoTempo = eventi.filter(e => (e.minuto ?? 0) <= 45);
                const secondoTempo = eventi.filter(e => (e.minuto ?? 0) > 45);

                const renderEvento = (event: MatchEvent, idx: number) => {
                  const isCasa = event.squadra === 'casa';
                  const dotColor = isCasa ? 'bg-cyan-500' : 'bg-pink-500';
                  const isGol = event.tipo === 'gol';
                  const iconColor =
                    isGol ? 'bg-emerald-500 text-white' :
                    event.tipo === 'cartellino' ? 'bg-amber-500 text-white' :
                    (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300');
                  const rowBg = isGol
                    ? (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950 border-emerald-800')
                    : 'border-transparent';

                  return (
                    <div key={idx} className={`flex items-center gap-3 py-1.5 px-2 rounded-md border ${rowBg}`}>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}
                        style={{ boxShadow: `0 0 6px ${isCasa ? 'rgba(6,182,212,0.5)' : 'rgba(236,72,153,0.5)'}` }}
                      />
                      <span className={`${t.textMuted} font-bold text-xs tabular-nums w-7 text-right shrink-0`}>
                        {event.minuto}'
                      </span>
                      <div className={`p-1 rounded shrink-0 ${iconColor}`}>
                        {isGol ? <Trophy size={11} /> : <ShieldAlert size={11} />}
                      </div>
                      <p className={`${isGol ? (isLight ? 'text-emerald-900 font-semibold' : 'text-emerald-100 font-semibold') : t.textPrimary} text-xs sm:text-sm flex-1 leading-snug min-w-0`}>
                        {event.testo}
                      </p>
                    </div>
                  );
                };

                const SectionLabel = ({ label }: { label: string }) => (
                  <div className={`text-center text-[10px] font-bold ${t.textMuted} uppercase tracking-[0.25em] py-1.5 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-800'} my-2`}>
                    {label}
                  </div>
                );

                return (
                  <div className="max-h-150 overflow-y-auto pr-1">
                    {primoTempo.length > 0 && (
                      <>
                        <SectionLabel label="Primo Tempo" />
                        {primoTempo.map((e, i) => renderEvento(e, i))}
                      </>
                    )}
                    {secondoTempo.length > 0 && (
                      <>
                        <SectionLabel label="Secondo Tempo" />
                        {secondoTempo.map((e, i) => renderEvento(e, i + primoTempo.length))}
                      </>
                    )}
                  </div>
                );
              })() : (
                <div className="text-center py-10">
                  <Clock className={`mx-auto mb-2 ${t.textFaint}`} size={36} />
                  <p className={`${t.textMuted} text-xs`}>Nessun evento disponibile</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default SimulationResultView;