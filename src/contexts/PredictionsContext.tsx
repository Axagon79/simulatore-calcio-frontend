import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { API_BASE } from '../AppDev/costanti';

// --- Tipi ---
interface PredictionData {
  predictions: any[];
  stats: any;
  count: number;
}

interface PredictionsContextType {
  getPredictions: (date: string) => PredictionData | null;
  fetchPredictions: (date: string) => Promise<PredictionData>;
  invalidate: (date: string) => void;
  loading: boolean;
}

const PredictionsContext = createContext<PredictionsContextType | null>(null);

// [DISATTIVATO 24/05/2026] getToday / getOtherDates erano usati dal vecchio
// prefetchAll. Tenuti commentati per rollback rapido se serve riattivare il
// preload massivo. Vedi commento dentro PredictionsProvider sotto.
/*
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getOtherDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const future = new Date(now); future.setDate(future.getDate() + i);
    const past = new Date(now); past.setDate(past.getDate() - i);
    dates.push(future.toISOString().split('T')[0]);
    dates.push(past.toISOString().split('T')[0]);
  }
  return dates;
}
*/

const EMPTY: PredictionData = { predictions: [], stats: {}, count: 0 };
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const adminHeaders: HeadersInit = isLocalhost ? { 'x-admin-key': '000128' } : {};

async function fetchOne(date: string): Promise<{ date: string; data: PredictionData }> {
  try {
    const res = await fetch(`${API_BASE}/simulation/daily-predictions-unified?date=${date}`, { headers: adminHeaders });
    if (!res.ok) return { date, data: EMPTY };
    const json = await res.json();
    return {
      date,
      data: {
        predictions: json.success ? (json.predictions || []) : [],
        stats: json.stats || {},
        count: json.count || 0,
      }
    };
  } catch {
    return { date, data: EMPTY };
  }
}

// [DISATTIVATO 24/05/2026] delay / POLL_INTERVAL erano usati dal vecchio prefetchAll.
// Tenuti commentati per rollback rapido.
// const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
// const POLL_INTERVAL = 15 * 60 * 1000; // 15 minuti

export function PredictionsProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Record<string, PredictionData>>({});
  const inflightRef = useRef<Record<string, Promise<PredictionData>>>({});
  const [loading, setLoading] = useState(true);

  // Fetch singola con dedup: se già in corso, ritorna la stessa Promise
  const fetchWithDedup = useCallback(async (date: string): Promise<PredictionData> => {
    if (cacheRef.current[date]) return cacheRef.current[date];
    if (date in inflightRef.current) return inflightRef.current[date];
    const promise = fetchOne(date).then(r => {
      cacheRef.current[date] = r.data;
      delete inflightRef.current[date];
      return r.data;
    });
    inflightRef.current[date] = promise;
    return promise;
  }, []);

  useEffect(() => {
    // [DISATTIVATO 24/05/2026] Preload aggressivo di sistema-z-predictions disabilitato.
    // Motivo: il preload scaricava ~3.3 MB × 3 giorni = ~10 MB anche se l'utente
    // non andava mai sulla pagina News. Nuova filosofia "lazy + minimo": ogni pagina
    // fetcha i suoi dati solo quando l'utente ci arriva, e fetcha solo lo stretto
    // necessario. Vedi sessione 24/05/2026 sulla velocizzazione end-to-end.
    // Codice originale tenuto come commento per rollback rapido se serve.
    /*
    const preloadSistemaZ = async (date: string) => {
      try {
        const key = `sz-v2-${date}`;
        const existing = sessionStorage.getItem(key);
        if (existing) {
          // Se c'e' gia' qualcosa fresco (< 5 min) non rifaccio
          try {
            const parsed = JSON.parse(existing);
            if (Date.now() - (parsed.ts || 0) < 5 * 60 * 1000) return;
          } catch { // cache corrotta, sovrascrivi
          }
        }
        const res = await fetch(`${API_BASE}/simulation/sistema-z-predictions?date=${date}`);
        if (!res.ok) return;
        const json = await res.json();
        const preds = Array.isArray(json?.predictions) ? json.predictions : [];
        sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), predictions: preds }));
      } catch { // preload fallito: ignora, l'utente fara' la fetch normale
      }
    };
    */

    // [DISATTIVATO 24/05/2026] prefetchAll disabilitato per filosofia "lazy + minimo".
    // Il PredictionsContext NON precarica più daily-predictions-unified all'avvio
    // dell'app (in precedenza scaricava ~1 MB di oggi + ~6-10 MB delle altre date
    // su un ciclo background). Resta attivo solo come cache/dedup per chiamate
    // esplicite via `fetchPredictions(date)` da componenti che davvero ne hanno
    // bisogno. Per recuperare il codice originale del prefetchAll vedi git log
    // pre-commit di questa modifica.
    setLoading(false);
  }, [fetchWithDedup]);

  const getPredictions = useCallback((date: string): PredictionData | null => {
    return cacheRef.current[date] ?? null;
  }, []);

  const fetchPredictions = useCallback(async (date: string): Promise<PredictionData> => {
    return fetchWithDedup(date);
  }, [fetchWithDedup]);

  const invalidate = useCallback((date: string) => {
    delete cacheRef.current[date];
  }, []);

  return (
    <PredictionsContext.Provider value={{ getPredictions, fetchPredictions, invalidate, loading }}>
      {children}
    </PredictionsContext.Provider>
  );
}

export function usePredictionsCache() {
  const ctx = useContext(PredictionsContext);
  if (!ctx) throw new Error('usePredictionsCache deve essere usato dentro PredictionsProvider');
  return ctx;
}
