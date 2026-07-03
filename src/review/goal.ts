// Objectif de rythme : découpage en périodes ancrées à la date de création,
// et progression dans la période courante à partir de l'historique de sessions.

import type { Goal } from '../types.ts';
import { toDay, type SessionRecord } from './srs.ts';

/** Objectif par défaut proposé (1 page chaque jour) */
export function defaultGoal(today: string): Goal {
  return { amount: 1, unit: 'page', every: 1, perUnit: 'day', since: today };
}

/** Longueur d'une période en jours */
export function periodLength(goal: Goal): number {
  return goal.every * (goal.perUnit === 'week' ? 7 : 1);
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86400000);
}

function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

/** Premier jour de la période courante (ancrage : goal.since) */
export function periodStart(goal: Goal, today: string): string {
  const len = periodLength(goal);
  const diff = Math.max(0, diffDays(goal.since, today));
  return addDays(goal.since, Math.floor(diff / len) * len);
}

/** Jours restants dans la période courante (>= 1 le dernier jour) */
export function daysLeft(goal: Goal, today: string): number {
  const len = periodLength(goal);
  return len - diffDays(periodStart(goal, today), today);
}

/** Pages et versets complétés depuis `start` (inclus) */
export function progressSince(
  sessions: SessionRecord[],
  start: string
): { pages: number; verses: number } {
  let pages = 0;
  let verses = 0;
  for (const s of sessions) {
    if (s.date.slice(0, 10) >= start) {
      pages += 1;
      verses += s.verses ?? 0;
    }
  }
  return { pages, verses };
}

/** Formate une quantité de pages avec fractions (0.25 → ¼, 1.5 → 1½) */
export function formatAmount(amount: number): string {
  const whole = Math.floor(amount);
  const frac = Math.round((amount - whole) * 4);
  const fracChar = ['', '¼', '½', '¾'][frac] ?? '';
  if (frac === 0) return String(whole);
  return whole === 0 ? fracChar : `${whole}${fracChar}`;
}
