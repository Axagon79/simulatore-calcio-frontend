import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../costanti';
import type { League, RoundInfo, Match } from '../../types';

export function useDatiCampionato() {
  const [country, setCountry] = useState('');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [league, setLeague] = useState('');
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [selectedRound, setSelectedRound] = useState<RoundInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [availableCountries, setAvailableCountries] = useState<{code: string, name: string, flag: string}[]>([]);
  const [isLoadingNations, setIsLoadingNations] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [sidebarPredictions, setSidebarPredictions] = useState<any[]>([]);
  const countrySetByUser = useRef(false);

  const initFromDashboard = (dashCountry: string, dashLeague: string) => {
    countrySetByUser.current = true;
    setCountry(dashCountry);
    setLeague(dashLeague);
  };

  // --- CARICAMENTO NAZIONI DINAMICHE ---
  useEffect(() => {
    const fetchNations = async () => {
      setIsLoadingNations(true);
      try {
        const response = await fetch('https://us-central1-puppals-456c7.cloudfunctions.net/get_nations');
        const nationsFromDb = await response.json();

        if (Array.isArray(nationsFromDb)) {
          const formatted = nationsFromDb.map((n: string) => ({
            code: n,
            name: n,
            flag: n === 'Italy' ? '\u{1F1EE}\u{1F1F9}' : n === 'Spain' ? '\u{1F1EA}\u{1F1F8}' : n === 'England' ? '\u{1F1EC}\u{1F1E7}' : n === 'Germany' ? '\u{1F1E9}\u{1F1EA}' : n === 'France' ? '\u{1F1EB}\u{1F1F7}' : n === 'Netherlands' ? '\u{1F1F3}\u{1F1F1}' : n === 'Portugal' ? '\u{1F1F5}\u{1F1F9}' : n === 'Argentina' ? '\u{1F1E6}\u{1F1F7}' : n === 'Belgium' ? '\u{1F1E7}\u{1F1EA}' : n === 'Brazil' ? '\u{1F1E7}\u{1F1F7}' : n === 'Denmark' ? '\u{1F1E9}\u{1F1F0}' : n === 'Ireland' ? '\u{1F1EE}\u{1F1EA}' : n === 'Japan' ? '\u{1F1EF}\u{1F1F5}' : n === 'Norway' ? '\u{1F1F3}\u{1F1F4}' : n === 'Scotland' ? '\u{1F1EC}\u{1F1E7}' : n === 'Sweden' ? '\u{1F1F8}\u{1F1EA}' : n === 'Turkey' ? '\u{1F1F9}\u{1F1F7}' : n === 'USA' ? '\u{1F1FA}\u{1F1F8}' : '\u{1F30D}'
          }));

          setAvailableCountries(formatted);

          if (formatted.length > 0 && !countrySetByUser.current) {
            setCountry(formatted[0].code);
          }
        }
      } catch (err) {
        console.error("Errore API nazioni:", err);
      } finally {
        setIsLoadingNations(false);
      }
    };

    fetchNations();
  }, []);

  // --- FETCH LEGHE ---
  useEffect(() => {
    if (!country) return;

    fetch(`${API_BASE}/leagues?country=${country}`)
      .then(r => r.json())
      .then(d => {
          setLeagues(d);

          const isCurrentLeagueValid = d.find((l: any) => l.id === league);

          if (isCurrentLeagueValid) {
            // Vengo dalla Dashboard: mantengo la selezione
          } else {
            // Ho cambiato nazione: resetto
            setLeague("");
          }
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // --- FETCH GIORNATE ---
  useEffect(() => {
    if (!league) return;
    setMatches([]);
    setSelectedRound(null);
    fetch(`${API_BASE}/rounds?league=${league}`).then(r => r.json()).then(d => {
      setRounds(d.rounds || []);
      const curr = d.rounds?.find((r: any) => r.type === 'current');
      if (curr) setSelectedRound(curr);
    });
  }, [league]);

  // --- FETCH PARTITE ---
  useEffect(() => {
    if (!league || !selectedRound) return;
    setIsLoadingMatches(true);
    fetch(`${API_BASE}/matches?league=${league}&round=${selectedRound.name}`)
      .then(r => r.json())
      .then(data => {
        const validMatches = Array.isArray(data) ? data.filter(m => m && m.date_obj) : [];
        setMatches(validMatches);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMatches(false));
  }, [league, selectedRound]);

  // --- CARICA PRONOSTICI PER SIDEBAR ---
  useEffect(() => {
    const fetchSidebarPredictions = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE}/simulation/daily-predictions?date=${today}`);
        const data = await response.json();
        if (data.success && data.predictions && data.predictions.length > 0) {
          const shuffled = [...data.predictions].sort(() => 0.5 - Math.random());
          setSidebarPredictions(shuffled.slice(0, 3));
        }
      } catch (err) {
        console.error('Errore caricamento pronostici sidebar:', err);
      }
    };
    fetchSidebarPredictions();
  }, []);

  return {
    country, setCountry,
    leagues, setLeagues,
    league, setLeague,
    rounds, setRounds,
    selectedRound, setSelectedRound,
    matches, setMatches,
    availableCountries,
    isLoadingNations,
    isLoadingMatches,
    initFromDashboard,
    sidebarPredictions,
  };
}
