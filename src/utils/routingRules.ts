// =====================================================
// ROUTING RULES — Mappa completa regole orchestratore
// Usato in: Best Picks, Track Record, Analisi Storica
// =====================================================

export interface RoutingRuleDef {
  label: string;         // Sigla breve per badge (max 6-7 char)
  color: string;         // Colore testo
  bg: string;            // Colore sfondo
  description: string;   // Tooltip descrittivo
  category: RoutingCategory;
}

export type RoutingCategory =
  | 'base'           // Regole di selezione base (single, consensus, priority)
  | 'scrematura'     // Scrematura SEGNO → DC/Over/eliminato
  | 'filtro_mc'      // Filtro Monte Carlo
  | 'recovery'       // Recovery Over 2.5 → alternativa
  | 'conversione'    // Conversioni mercato (→Goal, →NG, →U25, →O25, →DC)
  | 'filtro_nobet'   // Filtri che portano a NO BET
  | 'cap_stake'      // Riduzione stake
  | 'combo'          // Combo inserite (Home-Win, X-Draw, DC-Flip)
  | 'multigol'       // Multi-goal
  | 'diamond'        // Pattern Diamante
  | 'downgrade'      // Downgrade mercato
  | 'altro';         // Regole non categorizzate

// Colori per categoria
const CAT_COLORS: Record<RoutingCategory, { color: string; bg: string }> = {
  base:         { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  scrematura:   { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  filtro_mc:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  recovery:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  conversione:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  filtro_nobet: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  cap_stake:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  combo:        { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  multigol:     { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  diamond:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  downgrade:    { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  altro:        { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

// Colori light mode per categoria
const CAT_COLORS_LIGHT: Record<RoutingCategory, { color: string; bg: string }> = {
  base:         { color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
  scrematura:   { color: '#9333ea', bg: 'rgba(147,51,234,0.10)' },
  filtro_mc:    { color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  recovery:     { color: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
  conversione:  { color: '#ea580c', bg: 'rgba(234,88,12,0.10)' },
  filtro_nobet: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  cap_stake:    { color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  combo:        { color: '#0891b2', bg: 'rgba(8,145,178,0.10)' },
  multigol:     { color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  diamond:      { color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  downgrade:    { color: '#ea580c', bg: 'rgba(234,88,12,0.10)' },
  altro:        { color: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
};

// =====================================================
// MAPPA REGOLE STATICHE (exact match)
// =====================================================
const STATIC_RULES: Record<string, RoutingRuleDef> = {
  // --- BASE ---
  single: {
    label: 'SNG', description: 'Sorgente singola (un solo sistema)',
    category: 'base', color: '', bg: '',
  },
  consensus_both: {
    label: 'A+S', description: 'Consenso: sistemi A e S concordi',
    category: 'base', color: '', bg: '',
  },
  priority_chain: {
    label: 'PRI', description: 'Catena di priorità tra sistemi',
    category: 'base', color: '', bg: '',
  },
  union: {
    label: 'UNI', description: 'Unione segnali da più sistemi',
    category: 'base', color: '', bg: '',
  },

  // --- SCREMATURA SEGNO ---
  scrematura_segno: {
    label: 'SCR', description: 'Scrematura: SEGNO convertito o eliminato in base alla fascia quota',
    category: 'scrematura', color: '', bg: '',
  },
  scrematura_segno_x: {
    label: 'SCR→X', description: 'Scrematura: SEGNO convertito in pareggio X',
    category: 'scrematura', color: '', bg: '',
  },
  screm_dc_to_over15: {
    label: 'SCR→O1.5', description: 'Scrematura: DC convertita in Over 1.5',
    category: 'scrematura', color: '', bg: '',
  },
  screm_dc_to_under25: {
    label: 'SCR→U25', description: 'Scrematura: DC convertita in Under 2.5',
    category: 'scrematura', color: '', bg: '',
  },
  screm_o15_to_dc: {
    label: 'SCR→DC', description: 'Scrematura: Over 1.5 convertito in DC',
    category: 'scrematura', color: '', bg: '',
  },

  // --- FILTRO MONTE CARLO ---
  mc_filter_convert: {
    label: 'MCF', description: 'Filtro Monte Carlo: bloccato o convertito',
    category: 'filtro_mc', color: '', bg: '',
  },

  // --- RECOVERY OVER 2.5 ---
  as_o25_to_dc: {
    label: 'REC→DC', description: 'Recovery: Over 2.5 scartato → recuperato come DC',
    category: 'recovery', color: '', bg: '',
  },
  as_o25_to_segno1: {
    label: 'REC→1', description: 'Recovery: Over 2.5 scartato → recuperato come SEGNO 1',
    category: 'recovery', color: '', bg: '',
  },
  as_o25_to_under25: {
    label: 'REC→U25', description: 'Recovery: Over 2.5 scartato → recuperato come Under 2.5',
    category: 'recovery', color: '', bg: '',
  },

  // --- CONVERSIONI MERCATO ---
  goal_to_u25: {
    label: 'G→U25', description: 'Conversione: Goal fascia 1.90-1.99 → Under 2.5',
    category: 'conversione', color: '', bg: '',
  },
  goal_to_o15: {
    label: 'G→O15', description: 'Conversione: Goal fascia 1.70-1.79 → Over 1.5',
    category: 'conversione', color: '', bg: '',
  },
  o25_s6_to_goal: {
    label: 'O25→G', description: 'Conversione: Over 2.5 stake 6 → Goal (fascia quota)',
    category: 'conversione', color: '', bg: '',
  },
  dc_s6_to_goal: {
    label: 'DC→G', description: 'Conversione: DC stake 6 → Goal',
    category: 'conversione', color: '', bg: '',
  },
  dc_s1_to_u25: {
    label: 'DC→U25', description: 'Conversione: DC stake 1 → Under 2.5',
    category: 'conversione', color: '', bg: '',
  },
  mg23_s4_to_u25: {
    label: 'MG→U25', description: 'Conversione: MG 2-3 stake 4 → Under 2.5',
    category: 'conversione', color: '', bg: '',
  },
  o15_s5_low_to_u25: {
    label: 'O15→U25', description: 'Conversione: Over 1.5 stake 5 quota <1.40 → Under 2.5',
    category: 'conversione', color: '', bg: '',
  },
  gol_s1_to_ng: {
    label: 'G1→NG', description: 'Conversione: GOL stake 1 → NoGoal',
    category: 'conversione', color: '', bg: '',
  },
  gol_s2_to_ng: {
    label: 'G2→NG', description: 'Conversione: GOL stake 2 → NoGoal',
    category: 'conversione', color: '', bg: '',
  },
  gol_s5_q160_to_ng: {
    label: 'G5→NG', description: 'Conversione: GOL stake 5 quota 1.60-1.69 → NoGoal',
    category: 'conversione', color: '', bg: '',
  },
  dc_s4_to_ng: {
    label: 'DC→NG', description: 'Conversione: DC stake 4 → NoGoal',
    category: 'conversione', color: '', bg: '',
  },
  dcx2_s9_f180_to_ng: {
    label: 'X2→NG', description: 'Conversione: DC X2 stake 9 fascia 1.80-1.99 → NoGoal',
    category: 'conversione', color: '', bg: '',
  },
  segno_s6_to_o25: {
    label: 'SE→O25', description: 'Conversione: SEGNO stake 6 → Over 2.5',
    category: 'conversione', color: '', bg: '',
  },
  segno_s9_f150_to_goal: {
    label: 'SE9→G', description: 'Conversione: SEGNO stake 9 fascia 1.50 → Goal',
    category: 'conversione', color: '', bg: '',
  },
  gg_conf_dc_downgrade: {
    label: 'GG→DC', description: 'Downgrade: GG confidence bassa → DC',
    category: 'conversione', color: '', bg: '',
  },
  u25_high_segno_add: {
    label: '+SE', description: 'Aggiunta: SEGNO aggiunto a Under 2.5 alto',
    category: 'conversione', color: '', bg: '',
  },

  // --- FILTRI NO BET ---
  gol_s3_filter: {
    label: 'G3✗', description: 'Filtro: GOL stake 3 (Over 2.5/MG 2-3) → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  gol_s4_filter: {
    label: 'G4✗', description: 'Filtro: GOL stake 4 (Over 2.5) → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  gol_s4_q180_filter: {
    label: 'G4q✗', description: 'Filtro: GOL stake 4 quota 1.80-1.89 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  gol_s7_filter: {
    label: 'G7✗', description: 'Filtro: GOL stake 7 (Under 2.5/MG 2-3/q1.90) → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  u25_s7_nobet: {
    label: 'U25✗', description: 'Filtro: Under 2.5 stake 7 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  mg23_s7_nobet: {
    label: 'MG✗', description: 'Filtro: MG 2-3 stake 7 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  gol_s7_q190_nobet: {
    label: 'G7q✗', description: 'Filtro: GOL stake 7 quota 1.90-1.99 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  segno_s1_low_q_filter: {
    label: 'SE1✗', description: 'Filtro: SEGNO stake 1 quota <1.60 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  x2_s2_filter: {
    label: 'X2✗', description: 'Filtro: X2 stake 2 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  segno_s2_toxic_q_filter: {
    label: 'SE2✗', description: 'Filtro: SEGNO stake 2 fascia quota tossica → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },
  se2_s8_q190_filter: {
    label: 'SE8✗', description: 'Filtro: SEGNO 2 stake 8 quota 1.90-1.99 → NO BET',
    category: 'filtro_nobet', color: '', bg: '',
  },

  // --- CAP STAKE ---
  se2_s9_f180_cap6: {
    label: 'CAP6', description: 'Cap stake: SEGNO 2 stake 9 fascia 1.80-1.99 → ridotto a 6',
    category: 'cap_stake', color: '', bg: '',
  },
  gol_s8_q150_cap6: {
    label: 'CAP6', description: 'Cap stake: GOL stake 8 quota 1.50-1.59 → ridotto a 6',
    category: 'cap_stake', color: '', bg: '',
  },
  segno_s7_weak_q_cap5: {
    label: 'CAP5', description: 'Cap stake: SEGNO/DC stake 7 quota debole → ridotto a 5',
    category: 'cap_stake', color: '', bg: '',
  },

  // --- COMBO DC FLIP ---
  combo_96_dc_flip: {
    label: 'FLIP', description: 'Combo: DC invertita (score ≥96)',
    category: 'combo', color: '', bg: '',
  },

  // --- MULTIGOL ---
  multigol_v6: {
    label: 'MG', description: 'Multi-goal v6: fascia gol calcolata',
    category: 'multigol', color: '', bg: '',
  },

  // --- DOWNGRADE ---
  downgrade_o35: {
    label: 'DWG', description: 'Downgrade: Over 3.5 → Over 2.5',
    category: 'downgrade', color: '', bg: '',
  },
};

// =====================================================
// PATTERN DINAMICI (regex match per regole con suffisso)
// =====================================================
interface DynamicPattern {
  regex: RegExp;
  build: (match: RegExpMatchArray) => RoutingRuleDef;
}

const DYNAMIC_PATTERNS: DynamicPattern[] = [
  {
    regex: /^home_win_combo_(\d+)$/,
    build: (m) => ({
      label: `HW${m[1]}`, description: `Combo Home-Win #${m[1]}: SEGNO 1 inserito`,
      category: 'combo', color: '', bg: '',
    }),
  },
  {
    regex: /^x_draw_combo_(\d+)$/,
    build: (m) => ({
      label: `XD${m[1]}`, description: `Combo X-Draw #${m[1]}: pareggio inserito`,
      category: 'combo', color: '', bg: '',
    }),
  },
  {
    regex: /^diamond_pattern_(\d+)(_L\d+)?$/,
    build: (m) => ({
      label: `DIA${m[1]}`, description: `Pattern Diamante #${m[1]}${m[2] ? ` (${m[2].slice(1)})` : ''}: pronostico da scartati`,
      category: 'diamond', color: '', bg: '',
    }),
  },
];

// =====================================================
// FUNZIONI PUBBLICHE
// =====================================================

/**
 * Ottieni la definizione completa di una routing_rule.
 * Ritorna null se la regola non esiste o è vuota.
 */
export function getRoutingRule(rule: string | undefined | null, isLight = false): RoutingRuleDef | null {
  if (!rule) return null;

  // 1. Cerca nelle regole statiche
  let def = STATIC_RULES[rule];

  // 2. Se non trovata, prova i pattern dinamici
  if (!def) {
    for (const pattern of DYNAMIC_PATTERNS) {
      const m = rule.match(pattern.regex);
      if (m) {
        def = pattern.build(m);
        break;
      }
    }
  }

  // 3. Regola sconosciuta → badge generico
  if (!def) {
    def = {
      label: rule.length > 7 ? rule.slice(0, 6) + '…' : rule,
      description: `Regola: ${rule}`,
      category: 'altro',
      color: '', bg: '',
    };
  }

  // Applica colori dalla categoria
  const palette = isLight ? CAT_COLORS_LIGHT : CAT_COLORS;
  const catColors = palette[def.category] || palette.altro;
  return {
    ...def,
    color: def.color || catColors.color,
    bg: def.bg || catColors.bg,
  };
}

/**
 * Ottieni la categoria di una routing_rule.
 */
export function getRoutingCategory(rule: string | undefined | null): RoutingCategory {
  const def = getRoutingRule(rule);
  return def?.category || 'altro';
}

/**
 * Lista di tutte le categorie con etichetta leggibile.
 */
export const CATEGORY_LABELS: Record<RoutingCategory, string> = {
  base: 'Selezione Base',
  scrematura: 'Scrematura',
  filtro_mc: 'Filtro Monte Carlo',
  recovery: 'Recovery',
  conversione: 'Conversione Mercato',
  filtro_nobet: 'Filtro → NO BET',
  cap_stake: 'Cap Stake',
  combo: 'Combo',
  multigol: 'Multi-Goal',
  diamond: 'Pattern Diamante',
  downgrade: 'Downgrade',
  altro: 'Altro',
};

/**
 * Verifica se un pronostico è stato ottimizzato (non è base).
 */
export function isOptimized(rule: string | undefined | null): boolean {
  if (!rule) return false;
  const def = getRoutingRule(rule);
  return def?.category !== 'base';
}
