// src/types/index.ts
// Interfacce condivise per tutto il progetto

// --- ENTITÀ BASE ---

export interface League {
  id: string;
  name: string;
  country: string;
}

export interface RoundInfo {
  name: string;
  label: string;
  type: 'previous' | 'current' | 'next';
}

// --- QUOTE ---

export interface Odds {
  home?: number;
  draw?: number;
  away?: number;
  over_2_5?: number;
  under_2_5?: number;
  gg?: number;
  ng?: number;
  [key: string]: number | undefined;  // Per altri campi dinamici
}

// --- BVS (Betting Value System) ---

// BvsData contiene molti campi dinamici dal backend
// Usiamo un tipo base con i campi principali + index signature per flessibilità
export interface BvsData {
  // Campi principali (sempre presenti)
  bvs_match_index?: number;
  bvs_index?: number;
  bvs_away?: number;
  tip_market?: string;
  tip_sign?: string;
  bvs_advice?: string;
  classification?: string;
  trust_home_letter?: string;
  trust_away_letter?: string;
  qt_1?: number;
  gap_reale?: number;

  // Permetti qualsiasi altro campo dal backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// --- MATCH ---

export interface Match {
  id: string;
  home: string;
  away: string;
  home_id: number;
  away_id: number;
  home_mongo_id?: string;
  away_mongo_id?: string;
  real_score?: string | null;
  match_time: string;
  status: string;
  date_obj: string;
  h2h_data?: BvsData;
  odds?: Odds;
}

// --- EVENTI CRONACA ---

export type EventType =
  | "gol"
  | "cartellino"
  | "cambio"
  | "info"
  | "rigore_fischio"
  | "rigore_sbagliato"
  | "rosso"
  | "VAR_PROCESS"
  | "VAR_VERDICT"
  | "formazione";

export type VarType =
  | "gol"
  | "rigore"
  | "rigore_on_field_review"
  | "rosso"
  | "gol_fantasma";

export interface MatchEvent {
  minuto: number;
  squadra?: 'casa' | 'ospite' | 'info';
  tipo: "gol" | "cartellino" | "cambio" | "info" | "rigore_fischio" | "rigore_sbagliato" | "rosso" | "VAR_PROCESS" | "VAR_VERDICT" | "formazione";
  testo: string;
  var_type?: "gol" | "rigore" | "rigore_on_field_review" | "rosso" | "gol_fantasma";
  decision?: "confermato" | "annullato";
}

// --- RISULTATO SIMULAZIONE ---

export interface AnalisiDispersione {
  std_dev: number;
  score_imprevedibilita: number;
  is_dispersed: boolean;
  warning: string | null;
}

export interface ValueBet {
  ia_prob: number;
  book_prob: number;
  diff: number;
  is_value: boolean;
}

export interface ReportScommessePro {
  analisi_dispersione: AnalisiDispersione;
  probabilita_1x2: Record<string, number>;
  value_bets: Record<string, ValueBet>;
  scommessa_consigliata: string;
  under_over: Record<string, number>;
  gol_nogol: Record<string, number>;
  top_risultati: Array<{ score: string; prob: number }>;
}

export interface SimulationResult {
  // Dati identificativi e stato
  success: boolean;
  predicted_score: string;
  gh: number;
  ga: number;
  sign: string;
  algo_name: string;
  top3: string[];

  // Dati per la visualizzazione
  statistiche: Record<string, [string | number, string | number]>;
  cronaca: MatchEvent[];

  // Modulo Scommesse base
  report_scommesse: {
    Bookmaker: Record<string, string>;
    Analisi_Profonda: {
      Confidence_Globale: string;
      Deviazione_Standard_Totale: number;
      Affidabilita_Previsione: string;
    };
  };

  // Modulo Scommesse Professionale
  report_scommesse_pro?: ReportScommessePro;

  // Informazioni di contesto
  info_extra?: {
    valore_mercato: string;
    motivazione: string;
  };

  // Metadati tecnici
  timestamp?: string;
  execution_time?: number;
}

// --- CHAT ---

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

// --- FORMAZIONI ---

export interface Player {
  nome: string;
  numero?: number;
  ruolo?: string;
}

export interface Formation {
  modulo?: string;
  titolari?: Player[];
  panchina?: Player[];
}

export interface Formations {
  home_formation?: Formation;
  away_formation?: Formation;
}

// --- CONFIG SIMULAZIONE ---

export interface SimulationConfig {
  algoId: number;
  cycles: number;
  animated?: boolean;
}

// --- OPZIONI UI ---

export interface SelectOption {
  id: number;
  label: string;
  desc?: string;
}

export interface SpeedPreset {
  id: number;
  label: string;
  cycles: number;
}
