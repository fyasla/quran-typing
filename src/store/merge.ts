// Fusion de deux jeux de progression (local ↔ cloud), sans perte :
// deux appareils ayant travaillé hors-ligne ne s'écrasent pas mutuellement.

import type { ProgressData } from './progress';

const MAX_SESSIONS = 1000;

/**
 * - sessions : union dédupliquée par (date, page), triée chronologiquement,
 *   plafonnée aux MAX_SESSIONS plus récentes
 * - cartes : par page, celle revue le plus récemment gagne
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

  return { version: 1, sessions, cards };
}
