import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { API_BASE } from '../AppDev/costanti';

// --- Tipi ---
interface PredictionVersion {
  match_key: string;
  date: string;
  home: string;
  away: string;
  league?: string;
  match_time?: string;
  home_mongo_id?: string;
  away_mongo_id?: string;
  odds?: Record<string, number>;
  pronostici?: Array<{ tipo: string; pronostico: string; [key: string]: any }>;
  version_order?: number;
  [key: string]: any;
}

interface PredictionVersionsContextType {
  getVersions: (date: string) => PredictionVersion[] | null;
  fetchVersions: (date: string) => Promise<PredictionVersion[]>;
  loading: boolean;
}

const PredictionVersionsContext = createContext<PredictionVersionsContextType | null>(null);

function getDateRange(): string[] {
  const dates: string[] = [];
  const now = new Date();
  dates.push(now.toISOString().split('T')[0]);
  for (let i = 1; i <= 7; i++) {
    const future = new Date(now); future.setDate(future.getDate() + i);
    const past = new Date(now); past.setDate(past.getDate() - i);
    dates.push(future.toISOString().split('T')[0]);
    dates.push(past.toISOString().split('T')[0]);
  }
  return dates;
}

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const adminHeaders: HeadersInit = isLocalhost ? { 'x-admin-key': '000128' } : {};

async function fetchOne(date: string): Promise<{ date: string; versions: PredictionVersion[] }> {
  try {
    const res = await fetch(`${API_BASE}/prediction-versions?date=${date}`, { headers: adminHeaders });
    if (!res.ok) return { date, versions: [] };
    const data = await res.json();
    return { date, versions: data.versions || [] };
  } catch {
    return { date, versions: [] };
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minuti

export function PredictionVersionsProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Record<string, PredictionVersion[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const prefetchAll = async () => {
      const dates = getDateRange();
      for (const date of dates) {
        if (cancelled) return;
        const result = await fetchOne(date);
        cacheRef.current[date] = result.versions;
        if (!cancelled) await delay(200);
      }
      if (!cancelled) setLoading(false);
    };

    prefetchAll();

    const interval = setInterval(() => {
      if (!cancelled) prefetchAll();
    }, POLL_INTERVAL);

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const getVersions = useCallback((date: string): PredictionVersion[] | null => {
    return cacheRef.current[date] ?? null;
  }, []);

  const fetchVersions = useCallback(async (date: string): Promise<PredictionVersion[]> => {
    if (cacheRef.current[date]) return cacheRef.current[date];
    const result = await fetchOne(date);
    cacheRef.current[date] = result.versions;
    return result.versions;
  }, []);

  return (
    <PredictionVersionsContext.Provider value={{ getVersions, fetchVersions, loading }}>
      {children}
    </PredictionVersionsContext.Provider>
  );
}

export function usePredictionVersions() {
  const ctx = useContext(PredictionVersionsContext);
  if (!ctx) throw new Error('usePredictionVersions deve essere usato dentro PredictionVersionsProvider');
  return ctx;
}
