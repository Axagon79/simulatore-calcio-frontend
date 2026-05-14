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

// 'moe'       = endpoint /prediction-versions          (storico MoE/Mixer/SuperSelection).
// 'pme'       = endpoint /prediction-versions-pme      (storico PME, deprecato, collezione separata).
// 'sistema_z' = endpoint /prediction-versions-sistema-z (storico AI OST / Sistema Z, 2 fasi).
type PredictionSource = 'moe' | 'pme' | 'sistema_z';

interface PredictionVersionsContextType {
  getVersionsLight: (date: string, source?: PredictionSource) => PredictionVersionLight[] | null;
  fetchVersionsLight: (date: string, source?: PredictionSource) => Promise<PredictionVersionLight[]>;
  fetchVersionsFull: (date: string, match_key: string, source?: PredictionSource) => Promise<PredictionVersionFull[]>;
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

// Helper: sceglie l'endpoint corretto in base al source.
function endpointFor(source: PredictionSource): string {
  if (source === 'sistema_z') return '/prediction-versions-sistema-z';
  if (source === 'pme') return '/prediction-versions-pme';
  return '/prediction-versions';
}

// Fetch leggera: solo campi minimi per partite ritirate
async function fetchLight(date: string, source: PredictionSource = 'moe'): Promise<PredictionVersionLight[]> {
  try {
    const res = await fetch(`${API_BASE}${endpointFor(source)}?date=${date}&keys_only=true`, { headers: adminHeaders });
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions || [];
  } catch {
    return [];
  }
}

// Fetch completa: storico versioni per singola partita
async function fetchFull(date: string, match_key: string, source: PredictionSource = 'moe'): Promise<PredictionVersionFull[]> {
  try {
    const res = await fetch(`${API_BASE}${endpointFor(source)}?date=${date}&match_key=${encodeURIComponent(match_key)}`, { headers: adminHeaders });
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
  // Cache separate per source: 'moe', 'pme' e 'sistema_z' hanno endpoint e collezioni distinte
  // → niente mescolamento tra storici (regola: doc PME stanno in
  // daily_predictions_pme + prediction_versions_pme, MoE in unified+versions,
  // Sistema Z in predictions_sistema_z + prediction_versions_sistema_z).
  const cacheRef = useRef<Record<PredictionSource, Record<string, PredictionVersionLight[]>>>({
    moe: {}, pme: {}, sistema_z: {},
  });
  const inflightRef = useRef<Record<PredictionSource, Record<string, Promise<PredictionVersionLight[]>>>>({
    moe: {}, pme: {}, sistema_z: {},
  });
  const [loading, setLoading] = useState(true);

  const fetchWithDedup = useCallback(async (date: string, source: PredictionSource = 'moe'): Promise<PredictionVersionLight[]> => {
    const cache = cacheRef.current[source];
    const inflight = inflightRef.current[source];
    if (cache[date]) return cache[date];
    if (date in inflight) return inflight[date];
    const promise = fetchLight(date, source).then(versions => {
      cache[date] = versions;
      delete inflight[date];
      return versions;
    });
    inflight[date] = promise;
    return promise;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const prefetchAll = async () => {
      const today = getToday();
      // Prefetch parallelo MoE + PME per oggi (sblocca loading appena MoE ok)
      const moeToday = await fetchWithDedup(today, 'moe');
      if (cancelled) return;
      cacheRef.current.moe[today] = moeToday;
      setLoading(false);
      // PME today subito dopo (best-effort)
      fetchWithDedup(today, 'pme').catch(() => undefined);

      const others = getOtherDates();
      for (const date of others) {
        if (cancelled) return;
        if (!cacheRef.current.moe[date]) {
          await delay(500);
          await fetchWithDedup(date, 'moe');
        }
        if (!cacheRef.current.pme[date]) {
          await delay(500);
          await fetchWithDedup(date, 'pme').catch(() => undefined);
        }
      }
    };

    prefetchAll();

    const interval = setInterval(() => {
      if (!cancelled) prefetchAll();
    }, POLL_INTERVAL);

    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchWithDedup]);

  const getVersionsLight = useCallback((date: string, source: PredictionSource = 'moe'): PredictionVersionLight[] | null => {
    return cacheRef.current[source][date] ?? null;
  }, []);

  const fetchVersionsLight = useCallback(async (date: string, source: PredictionSource = 'moe'): Promise<PredictionVersionLight[]> => {
    return fetchWithDedup(date, source);
  }, [fetchWithDedup]);

  const fetchVersionsFull = useCallback(async (date: string, match_key: string, source: PredictionSource = 'moe'): Promise<PredictionVersionFull[]> => {
    return fetchFull(date, match_key, source);
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
