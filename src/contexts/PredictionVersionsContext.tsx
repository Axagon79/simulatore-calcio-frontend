import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { API_BASE } from '../AppDev/costanti';

// --- Tipi ---
interface PredictionVersionLight {
  match_key: string;
  home: string;
  away: string;
  league?: string;
  match_time?: string;
  home_mongo_id?: string;
  away_mongo_id?: string;
  odds?: Record<string, number>;
  pronostici_tipi?: string[][];
}

interface PredictionVersionFull {
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
  getVersionsLight: (date: string) => PredictionVersionLight[] | null;
  fetchVersionsLight: (date: string) => Promise<PredictionVersionLight[]>;
  fetchVersionsFull: (date: string, match_key: string) => Promise<PredictionVersionFull[]>;
  loading: boolean;
}

const PredictionVersionsContext = createContext<PredictionVersionsContextType | null>(null);

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

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const adminHeaders: HeadersInit = isLocalhost ? { 'x-admin-key': '000128' } : {};

// Fetch leggera: solo campi minimi per partite ritirate
async function fetchLight(date: string): Promise<PredictionVersionLight[]> {
  try {
    const res = await fetch(`${API_BASE}/prediction-versions?date=${date}&keys_only=true`, { headers: adminHeaders });
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions || [];
  } catch {
    return [];
  }
}

// Fetch completa: storico versioni per singola partita
async function fetchFull(date: string, match_key: string): Promise<PredictionVersionFull[]> {
  try {
    const res = await fetch(`${API_BASE}/prediction-versions?date=${date}&match_key=${encodeURIComponent(match_key)}`, { headers: adminHeaders });
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions || [];
  } catch {
    return [];
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minuti

export function PredictionVersionsProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Record<string, PredictionVersionLight[]>>({});
  const inflightRef = useRef<Record<string, Promise<PredictionVersionLight[]>>>({});
  const [loading, setLoading] = useState(true);

  const fetchWithDedup = useCallback(async (date: string): Promise<PredictionVersionLight[]> => {
    if (cacheRef.current[date]) return cacheRef.current[date];
    if (date in inflightRef.current) return inflightRef.current[date];
    const promise = fetchLight(date).then(versions => {
      cacheRef.current[date] = versions;
      delete inflightRef.current[date];
      return versions;
    });
    inflightRef.current[date] = promise;
    return promise;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const prefetchAll = async () => {
      const today = getToday();
      const versions = await fetchWithDedup(today);
      if (cancelled) return;
      cacheRef.current[today] = versions;
      setLoading(false);

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

  const getVersionsLight = useCallback((date: string): PredictionVersionLight[] | null => {
    return cacheRef.current[date] ?? null;
  }, []);

  const fetchVersionsLight = useCallback(async (date: string): Promise<PredictionVersionLight[]> => {
    return fetchWithDedup(date);
  }, [fetchWithDedup]);

  const fetchVersionsFull = useCallback(async (date: string, match_key: string): Promise<PredictionVersionFull[]> => {
    return fetchFull(date, match_key);
  }, []);

  return (
    <PredictionVersionsContext.Provider value={{ getVersionsLight, fetchVersionsLight, fetchVersionsFull, loading }}>
      {children}
    </PredictionVersionsContext.Provider>
  );
}

export function usePredictionVersions() {
  const ctx = useContext(PredictionVersionsContext);
  if (!ctx) throw new Error('usePredictionVersions deve essere usato dentro PredictionVersionsProvider');
  return ctx;
}
