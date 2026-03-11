# BENCHMARK & CALIBRAZIONE MOTORE — Stato Attuale

**Ultimo aggiornamento:** 11 Marzo 2026

---

## 1. ARCHITETTURA

### 1.1 Due sistemi separati
- **Simulazione Web** (grafica): `web_simulator_A.py`, algo 1-5, pesi GLOBAL, 500 cicli
- **Sistema C** (pronostici pubblicati): `run_daily_predictions_engine_c.py`, algo mode 6, pesi ALGO_C da MongoDB, 100 cicli, HR 65%
- **Sistemi A/S**: pesi propri, NON usano Monte Carlo
- **MoE**: combina A+S+C, non fa calcoli propri

### 1.2 I 7 Algoritmi del Benchmark
| ID | Nome | Pesi usati |
|----|------|------------|
| 1 | Statistico | ALGO_1 |
| 2 | Dinamico | ALGO_2 |
| 3 | Tattico | ALGO_3 |
| 4 | Caos | ALGO_4 |
| 5 | Master | Ensemble (1+2+3+4+GLOBAL) |
| 6 | MonteCarlo | GLOBAL (versione locale) |
| 7 | Sistema C | ALGO_C da MongoDB (versione produzione) |

### 1.3 Il Mixer (`calculate_goals_from_engine`)
- **Motore WIN**: 9 pesi → `win_shift` (chi vince)
- **Motore GOL**: base FBRef + modificatori → `raw_lambda`, poi `final_lambda = raw_lambda * (1 ± win_shift)`, Poisson genera gol

### 1.4 File duplicati
- `ai_engine/engine/` = locale (benchmark algo 1-6)
- `functions_python/ai_engine/engine/` = produzione (benchmark algo 7, Sistema C)
- **goals_converter.py ALLINEATO** (11/03/2026): locale ora identico a produzione (no /2, validate_tuning, settings_cache, is_cup, MongoDB)
- Algo 7 nel benchmark carica i moduli produzione via `importlib.util`

### 1.5 ALGO_C — Valori reali (MongoDB `algo_c_config`)
| Parametro | Valore |
|-----------|--------|
| DIVISORE_MEDIA_GOL | 1.75 |
| IMPATTO_DIFESA_TATTICA | 17.0 |
| TETTO_MAX_GOL_ATTESI | 4.0 |
| POTENZA_FAVORITA_WINSHIFT | 0.4 |

I valori nel `tuning_settings.json` locale per ALGO_C sono obsoleti — NON usarli.

### 1.6 Effetto Forbice del Sistema C
Con i valori JSON vecchi (DIVISORE=0.50 + IMPATTO_DIFESA=22.0), il Sistema C creava un **effetto forbice** pronunciato: le partite equilibrate producevano troppo pochi gol (molti 0-0, 0-1) perché il DIVISORE basso comprimeva il lambda base, mentre le partite sbilanciate esplodevano in gol (1-5, 2-6) perché il win_shift amplificava enormemente il divario. Con i valori reali da MongoDB (DIVISORE=1.75) il problema è ridotto ma l'effetto forbice esiste ancora in forma più lieve: su 19 partite analizzate dalla pipeline notturna, 12 avevano media gol totali sotto 2.0 (es. Cremonese-Fiorentina 1.40, Albacete-Las Palmas 1.23) contro una media reale dei campionati di 2.4-2.8.

---

## 2. PROBLEMA APERTO: Algo 1-5 generano troppi gol

### 2.1 Evidenza (Milan-Inter, 100 cicli, 5 ripetizioni)
| Algoritmo | Prob 1 | Prob X | Prob 2 | Gol Totali |
|-----------|--------|--------|--------|------------|
| 1-Statistico | ~13% | ~8% | ~79% | ~4.8 |
| **2-Dinamico** | **~20%** | **~16%** | **~63%** | **~3.5** |
| 3-Tattico | ~11% | ~12% | ~77% | ~4.7 |
| 4-Caos | ~9% | ~10% | ~81% | ~5.1 |
| 5-Master | ~11% | ~10% | ~79% | ~5.6 |
| 6-MonteCarlo | ~9% | ~8% | ~83% | ~5.4 |

**Quote reali:** Milan 28%, X 25%, Inter 47% — media gol reale Serie A: ~2.5

### 2.2 Sintomi
- Media gol totali 4.7-5.6 (dovrebbe essere 2.5-3.5)
- Pareggio 8-12% (dovrebbe essere 20-28%)
- Risultati esatti irrealistici: 1-4, 0-5, 2-6
- Il `win_shift` gonfia troppo i gol del favorito
- Solo il Dinamico (algo 2) produce risultati realistici

### 2.3 Perché il Dinamico funziona meglio
- `DIVISORE_MEDIA_GOL = 1.3` (il più alto → frena i gol)
- `POTENZA_WINSHIFT = -0.3` (negativo → riduce dominio favorito)

---

## 3. PESI COMPLETI

### 3.1 Pesi WIN
| Parametro | GLOBAL | ALGO_1 | ALGO_2 | ALGO_3 | ALGO_4 | ALGO_5 | ALGO_C |
|-----------|--------|--------|--------|--------|--------|--------|--------|
| RATING_ROSA | 1.3 | 1.4 | 1.4 | 1.1 | - | 1.0 | 1.3 |
| FORMA_RECENTE | 2.0 | 3.2 | 2.0 | 1.8 | 3.8 | 2.2 | 2.0 |
| MOTIVAZIONE | 1.2 | 1.8 | 1.5 | 0.9 | 3.5 | 1.3 | 1.2 |
| FATTORE_CAMPO | 1.4 | 1.6 | 1.5 | 1.3 | 0.3 | 1.5 | 1.4 |
| STORIA_H2H | -0.5 | 0.1 | 0.1 | 0.1 | 0.3 | 0.1 | -0.5 |
| BVS_QUOTE | 1.5 | 1.6 | 2.0 | 1.7 | 2.5 | 1.6 | 1.5 |
| AFFIDABILITA | 1.0 | 1.0 | 1.2 | 1.3 | 2.3 | 1.1 | 1.0 |
| VALORE_ROSA | 1.0 | 1.2 | 1.0 | 1.1 | 0.6 | 1.2 | 1.0 |
| STREAK | 2.0 | — | — | — | — | — | 2.0 |

ALGO_C ha pesi WIN identici a GLOBAL.

### 3.2 Parametri GOL
| Parametro | GLOBAL | ALGO_1 | ALGO_2 | ALGO_3 | ALGO_4 | ALGO_5 | ALGO_C |
|-----------|--------|--------|--------|--------|--------|--------|--------|
| DIVISORE_MEDIA_GOL | 1.1 | 0.9 | **1.3** | 1.2 | 1.1 | 1.0 | **1.75** |
| POTENZA_WINSHIFT | 0.45 | 0.5 | **-0.3** | 0.35 | 0.3 | 0.4 | **0.4** |
| IMPATTO_DIFESA | 18.0 | 19.0 | 17.0 | 16.0 | 17.5 | 17.5 | **17.0** |
| TETTO_MAX_GOL | 4.2 | 4.0 | 3.8 | 3.8 | 3.8 | 4.0 | **4.0** |

---

## 4. PIANO DI CALIBRAZIONE

### 4.1 Strategia
Modificare **SOLO GLOBAL** (simulazione grafica). **NON toccare ALGO_C** (65% HR).

### 4.2 Direzione modifiche (ispirate al Dinamico)
1. **DIVISORE_MEDIA_GOL:** aumentare (1.1 → 1.2-1.3) per ridurre gol
2. **POTENZA_WINSHIFT:** ridurre (0.45 → 0.1-0.2 o negativo) per ridurre dominio favorito
3. **TETTO_MAX_GOL:** ridurre (4.2 → 3.8-4.0) per evitare risultati estremi

### 4.3 Obiettivi
- Media gol totali: 2.5-3.5 (ora 4.7-5.6)
- Pareggio: 20-28% (ora 8-12%)
- Risultati esatti realistici (più 1-0, 2-1, 1-1)

### 4.4 Metodo
Usare `benchmark_convergenza.py` sulle stesse partite per misurare prima/dopo.

---

## 5. TOOL

### Benchmark Convergenza
- **File:** `ai_engine/benchmark_convergenza.py`
- **Output:** `ai_engine/benchmark_output/`
- Menu interattivo: lega → giornata → partita
- Scelta algoritmi, livelli cicli (default 10-500), ripetizioni
- Statistiche: prob 1X2, media gol, Over/Under, GG/NG, top 4 RE
- Grafici convergenza 1X2 e gol
- Ctrl+C funzionante con flag `_interrupted`
