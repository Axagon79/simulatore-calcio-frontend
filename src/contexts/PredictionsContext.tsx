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

function getDateRange(): string[] {
  const dates: string[] = [];
  const now = new Date();
  // Ordine: oggi prima, poi +1,-1, +2,-2... così i giorni più utili arrivano prima
  dates.push(now.toISOString().split('T')[0]);
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

export function PredictionsProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Record<string, PredictionData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const prefetch = async () => {
      const dates = getDateRange();
      // Uno alla volta con piccola pausa per non saturare il rate limiter
      for (const date of dates) {
        if (cancelled) return;
        const result = await fetchOne(date);
        cacheRef.current[date] = result.data;
        // Piccola pausa tra le richieste
        if (!cancelled) await delay(200);
      }
      if (!cancelled) setLoading(false);
    };
    prefetch();
    return () => { cancelled = true; };
  }, []);

  const getPredictions = useCallback((date: string): PredictionData | null => {
    return cacheRef.current[date] ?? null;
  }, []);

  const fetchPredictions = useCallback(async (date: string): Promise<PredictionData> => {
    if (cacheRef.current[date]) return cacheRef.current[date];
    const result = await fetchOne(date);
    cacheRef.current[date] = result.data;
    return result.data;
  }, []);

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
