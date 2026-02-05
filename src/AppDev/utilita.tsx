import React from 'react';
import { STEMMI_BASE } from './costanti';

// --- Funzione Helper Stemmi ---
export const getStemmaLeagueUrl = (mongoId: string | undefined, currentLeague: string): string => {
  if (!mongoId) return '';

  const input = currentLeague ? currentLeague.toUpperCase().trim() : '';

  let folder = 'Altro';

  switch (input) {
      // --- ITALIA ---
      case 'SERIE_A': case 'SERIE A':
      case 'SERIE_B': case 'SERIE B':
      case 'SERIE_C_A': case 'SERIE_C_B': case 'SERIE_C_C': case 'SERIE C':
          folder = 'Italy'; break;

      // --- INGHILTERRA ---
      case 'PREMIER_LEAGUE': case 'PREMIER LEAGUE':
      case 'CHAMPIONSHIP':
          folder = 'England'; break;

      // --- SPAGNA ---
      case 'LA_LIGA': case 'LA LIGA':
      case 'LA_LIGA_2': case 'LA LIGA 2':
          folder = 'Spain'; break;

      // --- GERMANIA ---
      case 'BUNDESLIGA': case 'BUNDESLIGA_2': case 'BUNDESLIGA 2':
          folder = 'Germany'; break;

      // --- FRANCIA ---
      case 'LIGUE_1': case 'LIGUE 1':
      case 'LIGUE_2': case 'LIGUE 2':
          folder = 'France'; break;

      // --- PORTOGALLO ---
      case 'LIGA_PORTUGAL': case 'LIGA PORTUGAL': case 'PRIMEIRA_LIGA':
          folder = 'Portugal'; break;

      // --- OLANDA ---
      case 'EREDIVISIE':
          folder = 'Netherlands'; break;

      // --- SCOZIA ---
      case 'SCOTTISH_PREMIERSHIP': case 'SCOTTISH PREMIERSHIP':
          folder = 'Scotland'; break;

      // --- NORD EUROPA ---
      case 'ALLSVENSKAN':
          folder = 'Sweden'; break;
      case 'ELITESERIEN':
          folder = 'Norway'; break;
      case 'SUPERLIGAEN': case 'SUPERLIGA':
          folder = 'Denmark'; break;
      case 'LEAGUE_OF_IRELAND': case 'LEAGUE OF IRELAND':
          folder = 'Ireland'; break;

      // --- BELGIO & TURCHIA ---
      case 'JUPILER_PRO_LEAGUE': case 'JUPILER PRO LEAGUE':
          folder = 'Belgium'; break;
      case 'SUPER_LIG': case 'SUPER LIG':
          folder = 'Turkey'; break;

      // --- RESTO DEL MONDO ---
      case 'BRASILEIRAO':
          folder = 'Brazil'; break;
      case 'PRIMERA_DIVISION_ARG': case 'PRIMERA DIVISION': case 'LIGA PROFESIONAL':
          folder = 'Argentina'; break;
      case 'MLS':
          folder = 'USA'; break;
      case 'J1_LEAGUE': case 'J1 LEAGUE': case 'J LEAGUE':
          folder = 'Japan'; break;

      default:
          folder = 'Altro';
  }

  return `${STEMMI_BASE}squadre%2F${folder}%2F${mongoId}.png?alt=media`;
};


// --- TIPO PER POSIZIONI FORMAZIONE ---
export type FormationPositions = {
  GK: {x: number; y: number}[];
  DEF: {x: number; y: number}[];
  MID: {x: number; y: number}[];
  ATT: {x: number; y: number}[];
};

// --- MAPPING MODULI (4 cifre -> 3 cifre) ---
export const FORMATION_MAPPING: {[key: string]: string} = {
  "3-4-2-1": "3-4-3",
  "4-2-2-2": "4-4-2",
  "4-2-3-1": "4-5-1",
  "4-3-1-2": "4-3-3",
};

// --- FUNZIONE PER NORMALIZZARE IL MODULO ---
export const normalizeModulo = (modulo: string): string => {
  return FORMATION_MAPPING[modulo] || modulo;
};

// --- MAPPA POSIZIONI GIOCATORI - REALISTICHE ---
export const getFormationPositions = (modulo: string, isHome: boolean): FormationPositions => {
  const moduloNorm = FORMATION_MAPPING[modulo] || modulo;

  const positions: {[key: string]: FormationPositions} = {
    "3-4-3": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 18, y: 25}, {x: 15, y: 50}, {x: 18, y: 75}],
      MID: [{x: 30, y: 12}, {x: 26, y: 38}, {x: 26, y: 62}, {x: 30, y: 88}],
      ATT: [{x: 40, y: 22}, {x: 44, y: 50}, {x: 40, y: 78}]
    },
    "3-5-2": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 18, y: 25}, {x: 15, y: 50}, {x: 18, y: 75}],
      MID: [{x: 32, y: 8}, {x: 26, y: 30}, {x: 23, y: 50}, {x: 26, y: 70}, {x: 32, y: 92}],
      ATT: [{x: 42, y: 35}, {x: 42, y: 65}]
    },
    "4-3-3": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 22, y: 12}, {x: 16, y: 35}, {x: 16, y: 65}, {x: 22, y: 88}],
      MID: [{x: 30, y: 28}, {x: 26, y: 50}, {x: 30, y: 72}],
      ATT: [{x: 40, y: 18}, {x: 44, y: 50}, {x: 40, y: 82}]
    },
    "4-4-2": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 22, y: 12}, {x: 16, y: 35}, {x: 16, y: 65}, {x: 22, y: 88}],
      MID: [{x: 32, y: 12}, {x: 26, y: 38}, {x: 26, y: 62}, {x: 32, y: 88}],
      ATT: [{x: 42, y: 35}, {x: 42, y: 65}]
    },
    "4-5-1": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 22, y: 12}, {x: 16, y: 35}, {x: 16, y: 65}, {x: 22, y: 88}],
      MID: [{x: 32, y: 8}, {x: 26, y: 30}, {x: 23, y: 50}, {x: 26, y: 70}, {x: 32, y: 92}],
      ATT: [{x: 44, y: 50}]
    },
    "5-3-2": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 24, y: 8}, {x: 18, y: 28}, {x: 15, y: 50}, {x: 18, y: 72}, {x: 24, y: 92}],
      MID: [{x: 30, y: 28}, {x: 26, y: 50}, {x: 30, y: 72}],
      ATT: [{x: 42, y: 35}, {x: 42, y: 65}]
    },
    "5-4-1": {
      GK: [{x: 6, y: 50}],
      DEF: [{x: 24, y: 8}, {x: 18, y: 28}, {x: 15, y: 50}, {x: 18, y: 72}, {x: 24, y: 92}],
      MID: [{x: 32, y: 15}, {x: 28, y: 38}, {x: 28, y: 62}, {x: 32, y: 85}],
      ATT: [{x: 44, y: 50}]
    }
  };

  const formation = positions[moduloNorm] || positions["4-3-3"];

  // Per squadra OSPITE: specchia orizzontalmente
  if (!isHome) {
    return {
      GK: formation.GK.map(p => ({ x: 100 - p.x, y: p.y })),
      DEF: formation.DEF.map(p => ({ x: 100 - p.x, y: p.y })),
      MID: formation.MID.map(p => ({ x: 100 - p.x, y: p.y })),
      ATT: formation.ATT.map(p => ({ x: 100 - p.x, y: p.y }))
    };
  }

  return formation;
};

// --- COMPONENTE MAGLIETTA SVG ---
export const JerseySVG = ({ color, size = 20 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
    <path d="M6.5 2L2 6.5V10h3v10h14V10h3V6.5L17.5 2h-4L12 4l-1.5-2h-4zM8 4h2l2 2 2-2h2l3 3v2h-2v9H7v-9H5V7l3-3z"/>
    <path d="M7 10h10v9H7z" fill={color}/>
    <path d="M5 7l3-3h2l2 2 2-2h2l3 3v2h-2v-1H7v1H5V7z" fill={color} opacity="0.8"/>
  </svg>
);
