// Trophées : conditions pures évaluées sur la progression.
// Les déblocages sont persistés (ProgressData.trophies) et fusionnés à la sync.

import type { ProgressData } from '../store/progress.ts';
import { computeStreak } from './srs.ts';

export interface TrophyDef {
  id: string;
  /** Icône lucide (nom logique consommé par l'UI) */
  icon:
    | 'sprout'
    | 'book'
    | 'library'
    | 'crown'
    | 'flame'
    | 'eye-off'
    | 'target'
    | 'gem';
  /** Condition remplie ? */
  test: (s: TrophyStats) => boolean;
}

export interface TrophyStats {
  /** Pages distinctes écrites au moins une fois */
  pages: Set<number>;
  /** Juz entièrement écrits */
  juzDone: number;
  streak: number;
  totals: { verses: number; sessions: number; blind: number; perfect: number };
}

/** Bornes des 30 juz sur le mushaf Madinah 604 pages */
export function juzRange(n: number): [number, number] {
  if (n === 1) return [1, 21];
  if (n === 30) return [582, 604];
  return [22 + (n - 2) * 20, 21 + (n - 1) * 20];
}

function countJuzDone(pages: Set<number>): number {
  let done = 0;
  for (let n = 1; n <= 30; n++) {
    const [a, b] = juzRange(n);
    let full = true;
    for (let p = a; p <= b; p++) {
      if (!pages.has(p)) {
        full = false;
        break;
      }
    }
    if (full) done++;
  }
  return done;
}

const pagesIn = (pages: Set<number>, a: number, b: number) => {
  for (let p = a; p <= b; p++) if (!pages.has(p)) return false;
  return true;
};

export const TROPHIES: TrophyDef[] = [
  { id: 'first-page', icon: 'sprout', test: (s) => s.pages.size >= 1 },
  { id: 'fatiha', icon: 'book', test: (s) => s.pages.has(1) },
  { id: 'pages-10', icon: 'book', test: (s) => s.pages.size >= 10 },
  { id: 'pages-50', icon: 'book', test: (s) => s.pages.size >= 50 },
  { id: 'pages-100', icon: 'library', test: (s) => s.pages.size >= 100 },
  { id: 'pages-300', icon: 'library', test: (s) => s.pages.size >= 300 },
  { id: 'quran', icon: 'crown', test: (s) => s.pages.size >= 604 },
  { id: 'juz-1', icon: 'library', test: (s) => s.juzDone >= 1 },
  { id: 'juz-5', icon: 'library', test: (s) => s.juzDone >= 5 },
  { id: 'juz-15', icon: 'crown', test: (s) => s.juzDone >= 15 },
  { id: 'baqara', icon: 'gem', test: (s) => pagesIn(s.pages, 2, 49) },
  { id: 'streak-3', icon: 'flame', test: (s) => s.streak >= 3 },
  { id: 'streak-7', icon: 'flame', test: (s) => s.streak >= 7 },
  { id: 'streak-30', icon: 'flame', test: (s) => s.streak >= 30 },
  { id: 'streak-100', icon: 'flame', test: (s) => s.streak >= 100 },
  { id: 'blind-1', icon: 'eye-off', test: (s) => s.totals.blind >= 1 },
  { id: 'blind-10', icon: 'eye-off', test: (s) => s.totals.blind >= 10 },
  { id: 'perfect-1', icon: 'target', test: (s) => s.totals.perfect >= 1 },
  { id: 'perfect-10', icon: 'target', test: (s) => s.totals.perfect >= 10 },
  { id: 'verses-1000', icon: 'gem', test: (s) => s.totals.verses >= 1000 },
];

export function buildStats(data: ProgressData, today: string): TrophyStats {
  const pages = new Set(Object.keys(data.cards).map(Number));
  return {
    pages,
    juzDone: countJuzDone(pages),
    streak: computeStreak(data.sessions, today),
    totals: data.totals ?? { verses: 0, sessions: 0, blind: 0, perfect: 0 },
  };
}

/** Ids remplis mais pas encore persistés dans data.trophies */
export function newlyUnlocked(data: ProgressData, today: string): string[] {
  const stats = buildStats(data, today);
  const owned = data.trophies ?? {};
  return TROPHIES.filter((t) => !owned[t.id] && t.test(stats)).map((t) => t.id);
}
