// src/config/permissions.ts

export const PERMISSIONS = {
    // ========================================
    // 🎮 MENU PRINCIPALE
    // ========================================
    ALLOWED_MAIN_MODES: [0, 1, 2, 3, 4],  // 0=Total, 1-3=Massivo, 4=Singola
    DEFAULT_MAIN_MODE: 4,                 // Default su Singola Match
    
    // ========================================
    // 🧠 ALGORITMI
    // ========================================
    VISIBLE_ALGOS: [0, 1, 2, 3, 4, 5, 6], // 0=Tutti, 1-6=Singoli
    DEFAULT_ALGO: 6,                       // Default MonteCarlo
    CAN_USE_CUSTOM_ALGO: false,            // [7] CUSTOM (Algo+Cicli)
    
    // ========================================
    // ⚡ CICLI SIMULAZIONE
    // ========================================
    
    // --- Preset Velocità (Algoritmi 1-5) ---
    ALLOWED_SPEED_PRESETS_SINGLE: [1,2,3,4,5,6,7,8], // IDs preset
    DEFAULT_SPEED_SINGLE: 3,               // Default VELOCE (500 cicli)
    
    // Limiti cicli personalizzati (Preset 8)
    MIN_CYCLES_SINGLE: 50,
    MAX_CYCLES_SINGLE: 20000,
    CAN_USE_CUSTOM_CYCLES_SINGLE: false,   // Abilita input manuale
    
    // --- Preset Monte Carlo (Algo 6) ---
    ALLOWED_SPEED_PRESETS_MC: [1,2,3,4,5,6,7,8], // IDs preset MC
    DEFAULT_SPEED_MC: 4,                   // Default STANDARD (5000 tot)
    
    // Limiti cicli Monte Carlo (Preset 8)
    MIN_CYCLES_MC: 40,
    MAX_CYCLES_MC: 100000,
    CAN_USE_CUSTOM_CYCLES_MC: false,       // Abilita input manuale MC
    
    // ========================================
    // 🌍 GEOGRAFIA
    // ========================================
    
    // Nazioni (usare CODICI esatti del Python)
    ALLOWED_COUNTRIES: [
        '🇮🇹 ITALIA', 
        '🇬🇧 INGHILTERRA', 
        '🇪🇸 SPAGNA'
    ],  // [] = tutte, altrimenti array specifico
    
    CAN_SELECT_ALL_COUNTRIES: false,       // [0] TUTTI I CAMPIONATI
    
    // Campionati (usare NOMI esatti del Python)
    ALLOWED_LEAGUES: [
        'Serie A', 
        'Serie B', 
        'Premier League', 
        'La Liga'
    ],  // [] = tutte
    
    CAN_SELECT_ALL_LEAGUES_PER_NATION: false, // [0] TUTTI per nazione
    
    // ========================================
    // 📅 PERIODI TEMPORALI
    // ========================================
    CAN_SEE_PREVIOUS_ROUND: true,          // [1] Precedente
    CAN_SEE_CURRENT_ROUND: true,           // [2] In Corso
    CAN_SEE_NEXT_ROUND: true,              // [3] Successiva
    
    // ========================================
    // 💾 DATABASE & SALVATAGGIO
    // ========================================
    CAN_SAVE_TO_DB: false,                 // [S] Salva Database
    CAN_CHOOSE_DB_TARGET: false,           // [1]Sandbox/[2]Ufficiale
    FORCED_DB_TARGET: 'sandbox',           // 'sandbox' | 'official'
    
    CAN_EXPORT_CSV: true,                  // Genera CSV
    CAN_EXPORT_HTML: true,                 // Genera HTML Dashboard
    CAN_EXPORT_JSON: true,                 // Deep Analysis JSON
    
    // ========================================
    // 🔬 FEATURES AVANZATE
    // ========================================
    SHOW_DEEP_ANALYSIS: true,              // Report approfondito
    SHOW_DISPERSION_WARNING: true,         // Alert alta varianza
    SHOW_VALUE_BETS: true,                 // Confronto IA vs Bookmaker
    SHOW_BETTING_SUGGESTIONS: true,        // Suggerimenti scommesse
    SHOW_ODDS_IN_REPORTS: true,            // Quote nei report
    SHOW_REAL_SCORES_IN_REPORTS: true,     // Punteggi reali
    
    // ========================================
    // 🛡️ LIMITAZIONI RISORSE
    // ========================================
    MAX_MATCHES_PER_SESSION: 100,          // Massimo partite/sessione
    MAX_CONCURRENT_SIMULATIONS: 50,        // Massimo parallele
    ENABLE_PROGRESS_BARS: true,            // Barre progresso tqdm
    
    // ========================================
    // 🔑 AMMINISTRAZIONE
    // ========================================
    ADMIN_KEY: "000128",
    SHOW_ADMIN_BADGE: true,
    ENABLE_DEBUG_LOGS: false,              // Stampa debug verbose
};

// ========================================
// 🔐 FUNZIONI HELPER
// ========================================

export const checkAdmin = (): boolean => {
    // 🔥 Su localhost sei SEMPRE admin automaticamente
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔑 Admin Mode: Localhost Detected');
        return true;
    }
    return false;
};

export const getPermissions = () => {
    const isAdmin = checkAdmin();
    
    if (isAdmin) {
        // 👑 ADMIN: TUTTO SBLOCCATO
        return {
            ...PERMISSIONS,
            
            // Menu
            ALLOWED_MAIN_MODES: [0, 1, 2, 3, 4],
            
            // Algoritmi
            VISIBLE_ALGOS: [0, 1, 2, 3, 4, 5, 6],
            CAN_USE_CUSTOM_ALGO: true,
            
            // Cicli
            ALLOWED_SPEED_PRESETS_SINGLE: [1,2,3,4,5,6,7,8],
            ALLOWED_SPEED_PRESETS_MC: [1,2,3,4,5,6,7,8],
            MAX_CYCLES_SINGLE: 20000,
            MAX_CYCLES_MC: 100000,
            CAN_USE_CUSTOM_CYCLES_SINGLE: true,
            CAN_USE_CUSTOM_CYCLES_MC: true,
            
            // Geografia
            ALLOWED_COUNTRIES: [],  // Tutte
            ALLOWED_LEAGUES: [],    // Tutte
            CAN_SELECT_ALL_COUNTRIES: true,
            CAN_SELECT_ALL_LEAGUES_PER_NATION: true,
            
            // Periodi
            CAN_SEE_PREVIOUS_ROUND: true,
            CAN_SEE_CURRENT_ROUND: true,
            CAN_SEE_NEXT_ROUND: true,
            
            // Database
            CAN_SAVE_TO_DB: true,
            CAN_CHOOSE_DB_TARGET: true,
            
            // Features
            SHOW_DEEP_ANALYSIS: true,
            SHOW_DISPERSION_WARNING: true,
            SHOW_VALUE_BETS: true,
            SHOW_BETTING_SUGGESTIONS: true,
            
            // Limiti
            MAX_MATCHES_PER_SESSION: 999,
            MAX_CONCURRENT_SIMULATIONS: 999,
            ENABLE_DEBUG_LOGS: true,
        };
    }
    
    return PERMISSIONS; // Utente normale
};

// ========================================
// 📋 MAPPATURA NOMI → IDS
// ========================================

export const SIMULATOR_CONSTANTS = {
    // Main Modes
    MAIN_MODES: {
        TOTAL: 0,
        MASSIVO_PREV: 1,
        MASSIVO_CURR: 2,
        MASSIVO_NEXT: 3,
        SINGOLA: 4
    },
    
    // Algoritmi
    ALGOS: {
        TUTTI: 0,
        STATISTICO: 1,
        DINAMICO: 2,
        TATTICO: 3,
        CAOS: 4,
        MASTER: 5,
        MONTECARLO: 6,
        CUSTOM: 7
    },
    
    // Preset Velocità (Algoritmi 1-5)
    SPEED_SINGLE: {
        TURBO: 1,      // 100
        RAPIDO: 2,     // 250
        VELOCE: 3,     // 500
        STANDARD: 4,   // 1250
        ACCURATO: 5,   // 2500
        PRECISO: 6,    // 5000
        ULTRA: 7,      // 12500
        CUSTOM: 8      // Input manuale
    },
    
    // Preset Monte Carlo
    SPEED_MC: {
        TURBO: 1,      // 400 tot
        RAPIDO: 2,     // 1000 tot
        VELOCE: 3,     // 2000 tot
        STANDARD: 4,   // 5000 tot
        ACCURATO: 5,   // 10000 tot
        PRECISO: 6,    // 20000 tot
        ULTRA: 7,      // 50000 tot
        CUSTOM: 8      // Input manuale
    },
    
    // Nazioni (CODICI ESATTI PYTHON)
    NATIONS: {
        ALL: 0,
        ITALIA: '🇮🇹 ITALIA',
        INGHILTERRA: '🇬🇧 INGHILTERRA',
        SPAGNA: '🇪🇸 SPAGNA',
        GERMANIA: '🇩🇪 GERMANIA',
        FRANCIA: '🇫🇷 FRANCIA',
        OLANDA: '🇳🇱 OLANDA',
        PORTOGALLO: '🇵🇹 PORTOGALLO'
    },
    
    // Campionati (NOMI ESATTI PYTHON)
    LEAGUES: {
        // Italia
        SERIE_A: 'Serie A',
        SERIE_B: 'Serie B',
        SERIE_C_A: 'Serie C - Girone A',
        SERIE_C_B: 'Serie C - Girone B',
        SERIE_C_C: 'Serie C - Girone C',
        
        // Altri
        PREMIER: 'Premier League',
        LA_LIGA: 'La Liga',
        BUNDESLIGA: 'Bundesliga',
        LIGUE_1: 'Ligue 1',
        EREDIVISIE: 'Eredivisie',
        LIGA_PORTUGAL: 'Liga Portugal'
    },
    
    // Periodi
    PERIODS: {
        PRECEDENTE: 1,
        IN_CORSO: 2,
        SUCCESSIVA: 3
    },
    
    // Database
    DB_TARGETS: {
        SANDBOX: 1,
        UFFICIALE: 2
    }
};