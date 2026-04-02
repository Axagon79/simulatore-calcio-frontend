import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { API_BASE } from '../AppDev/costanti';

// --- Tipi ---
interface SezioneData {
  pl: number;
  bets: number;
  wins: number;
  staked: number;
  hr: number;
  roi: number;
}

interface PLGiorno {
  date: string;
  tutti: SezioneData;
  pronostici: SezioneData;
  elite: SezioneData;
  alto_rendimento: SezioneData;
}

interface PLCalcolato {
  giorno: Record<string, SezioneData>;
  mese: Record<string, SezioneData>;
  totale: Record<string, SezioneData>;
}

interface PLStoricoContextType {
  /** Dati grezzi giorno-per-giorno */
  giorni: PLGiorno[];
  /** Calcola giorno/mese/totale per una data specifica */
  calcola: (date: string) => PLCalcolato;
  /** True durante il primo fetch */
  loading: boolean;
  /** Forza un refresh dei dati */
  refresh: () => void;
}

const PLStoricoContext = createContext<PLStoricoContextType | null>(null);

// --- Helper: somma sezioni ---
const EMPTY_SEZ: SezioneData = { pl: 0, bets: 0, wins: 0, staked: 0, hr: 0, roi: 0 };
const SEZIONI = ['tutti', 'pronostici', 'elite', 'alto_rendimento'] as const;

function sommaSezioni(docs: PLGiorno[]): Record<string, SezioneData> {
  const result: Record<string, SezioneData> = {};
  for (const key of SEZIONI) {
    const sum = { pl: 0, bets: 0, wins: 0, staked: 0, hr: 0, roi: 0 };
    for (const doc of docs) {
      const s = doc[key];
      if (!s) continue;
      sum.pl += s.pl;
      sum.bets += s.bets;
      sum.wins += s.wins;
      sum.staked += s.staked;
    }
    sum.pl = Math.round(sum.pl * 100) / 100;
    sum.staked = Math.round(sum.staked * 100) / 100;
    sum.hr = sum.bets > 0 ? Math.round((sum.wins / sum.bets) * 1000) / 10 : 0;
    sum.roi = sum.staked > 0 ? Math.round((sum.pl / sum.staked) * 1000) / 10 : 0;
    result[key] = sum;
  }
  return result;
}

// --- Provider ---
export function PLStoricoProvider({ children }: { children: ReactNode }) {
  const [giorni, setGiorni] = useState<PLGiorno[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/simulation/pl-storico`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setGiorni(json.data);
      }
    } catch {
      // Silenzioso — riprova tra 30s
      setTimeout(fetchData, 30000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calcola = useCallback((date: string): PLCalcolato => {
    if (giorni.length === 0) {
      const empty = { tutti: { ...EMPTY_SEZ }, pronostici: { ...EMPTY_SEZ }, elite: { ...EMPTY_SEZ }, alto_rendimento: { ...EMPTY_SEZ } };
      return { giorno: empty, mese: empty, totale: empty };
    }

    // Giorno: dati esatti del giorno selezionato
    const giornoDoc = giorni.find(g => g.date === date);
    const giorno = giornoDoc
      ? { tutti: giornoDoc.tutti, pronostici: giornoDoc.pronostici, elite: giornoDoc.elite, alto_rendimento: giornoDoc.alto_rendimento }
      : { tutti: { ...EMPTY_SEZ }, pronostici: { ...EMPTY_SEZ }, elite: { ...EMPTY_SEZ }, alto_rendimento: { ...EMPTY_SEZ } };

    // Mese: somma dal primo del mese fino alla data selezionata
    const monthStart = date.slice(0, 8) + '01';
    const meseDocs = giorni.filter(g => g.date >= monthStart && g.date <= date);
    const mese = sommaSezioni(meseDocs);

    // Totale: somma di tutto lo storico fino alla data selezionata
    const totaleDocs = giorni.filter(g => g.date <= date);
    const totale = sommaSezioni(totaleDocs);

    return { giorno, mese, totale };
  }, [giorni]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PLStoricoContext.Provider value={{ giorni, calcola, loading, refresh }}>
      {children}
    </PLStoricoContext.Provider>
  );
}

// --- Hook ---
export function usePLStorico() {
  const ctx = useContext(PLStoricoContext);
  if (!ctx) throw new Error('usePLStorico deve essere usato dentro PLStoricoProvider');
  return ctx;
}
