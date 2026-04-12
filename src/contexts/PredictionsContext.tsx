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

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minuti

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
    let cancelled = false;

    const prefetchAll = async () => {
      // Carica solo oggi subito
      const today = getToday();
      const data = await fetchWithDedup(today);
      if (cancelled) return;
      cacheRef.current[today] = data;
      setLoading(false);

      // Poi carica le altre date in background con calma
      const others = getOtherDates();
      for (const date of others) {
        if (cancelled) return;
        if (cacheRef.current[date]) continue;
        await delay(500);
        await fetchWithDedup(date);
      }
    };

    prefetchAll();

    const interval = setInterval(() => {
      if (!cancelled) prefetchAll();
    }, POLL_INTERVAL);

    return () => { cancelled = true; clearInterval(interval); };
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
