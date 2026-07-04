// Fusion de deux jeux de progression (local ↔ cloud), sans perte :
// deux appareils ayant travaillé hors-ligne ne s'écrasent pas mutuellement.

import type { Checkin, ProgressData, Totals } from './progress';

const MAX_SESSIONS = 1000;
const MAX_CHECKINS = 500;

/**
 * - sessions : union dédupliquée par (date, page), triée chronologiquement,
 *   plafonnée aux MAX_SESSIONS plus récentes
 * - cartes : par page, celle revue le plus récemment gagne
 * - checkins : union dédupliquée par (date, amount, occurrence)
 * - totals : max champ par champ (évite le double comptage des allers-retours)
 * - trophées : union, date de déblocage la plus ancienne
 */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const seen = new Set<string>();
  const sessions = [...a.sessions, ...b.sessions]
    .filter((s) => {
      if (!s || typeof s.date !== 'string' || typeof s.page !== 'number') return false;
      const key = `${s.date}|${s.page}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0))
    .slice(-MAX_SESSIONS);

  const cards: ProgressData['cards'] = { ...a.cards };
  for (const [page, card] of Object.entries(b.cards)) {
    if (!card) continue;
    const mine = cards[Number(page)];
    if (!mine || (card.lastReviewed ?? '') > (mine.lastReviewed ?? '')) {
      cards[Number(page)] = card;
    }
  }

  // Checkins : union avec déduplication par (date, amount, rang d'occurrence)
  const counts = new Map<string, number>();
  const checkins: Checkin[] = [];
  for (const list of [a.checkins ?? [], b.checkins ?? []]) {
    const local = new Map<string, number>();
    for (const c of list) {
      if (!c || typeof c.date !== 'string' || typeof c.amount !== 'number') continue;
      const key = `${c.date}|${c.amount}`;
      const rank = (local.get(key) ?? 0) + 1;
      local.set(key, rank);
      if ((counts.get(key) ?? 0) < rank) {
        counts.set(key, rank);
        checkins.push(c);
      }
    }
  }
  checkins.sort((x, y) => (x.date < y.date ? -1 : 1));

  const ta = a.totals;
  const tb = b.totals;
  const totals: Totals | undefined =
    ta || tb
      ? {
          verses: Math.max(ta?.verses ?? 0, tb?.verses ?? 0),
          sessions: Math.max(ta?.sessions ?? 0, tb?.sessions ?? 0),
          blind: Math.max(ta?.blind ?? 0, tb?.blind ?? 0),
          perfect: Math.max(ta?.perfect ?? 0, tb?.perfect ?? 0),
        }
      : undefined;

  let trophies: Record<string, string> | undefined;
  if (a.trophies || b.trophies) {
    trophies = { ...(b.trophies ?? {}) };
    for (const [id, date] of Object.entries(a.trophies ?? {})) {
      if (!trophies[id] || date < trophies[id]) trophies[id] = date;
    }
  }

  return {
    version: 1,
    sessions,
    cards,
    checkins: checkins.length > 0 ? checkins.slice(-MAX_CHECKINS) : undefined,
    totals,
    trophies,
  };
}
