// Répétition espacée : SM-2 simplifié, une carte par page du mushaf.
// La note est dérivée automatiquement de la précision de frappe.

export type Grade = 'again' | 'good' | 'easy';

export interface ReviewCard {
  /** Numéro de page (1–604) */
  page: number;
  /** Facteur de facilité (≥ 1.3) */
  ease: number;
  /** Intervalle courant en jours */
  intervalDays: number;
  /** Date d'échéance (ISO, jour) */
  due: string;
  /** Nombre de révisions réussies consécutives */
  reps: number;
  /** Nombre d'oublis */
  lapses: number;
  /** Précision de la dernière révision (0–100) */
  lastAccuracy: number;
  /** Date de la dernière révision (ISO, jour) */
  lastReviewed: string;
}

export interface SessionRecord {
  page: number;
  /** Date/heure de fin (ISO) */
  date: string;
  /** Précision 0–100 */
  accuracy: number;
  errors: number;
  /** Durée de la session en millisecondes */
  durationMs: number;
}

/** Jour local au format YYYY-MM-DD */
export function toDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return toDay(date);
}

/** Note automatique selon la précision de frappe */
export function gradeFromAccuracy(accuracy: number): Grade {
  if (accuracy < 90) return 'again';
  if (accuracy < 98) return 'good';
  return 'easy';
}

/** Carte neuve pour une page jamais révisée */
export function newCard(page: number, today: string): ReviewCard {
  return {
    page,
    ease: 2.5,
    intervalDays: 0,
    due: today,
    reps: 0,
    lapses: 0,
    lastAccuracy: 0,
    lastReviewed: today,
  };
}

/**
 * Applique une révision à la carte (SM-2 simplifié) :
 * - again : la page redevient due demain, la facilité baisse
 * - good  : 1 j puis intervalle × facilité
 * - easy  : 3 j puis intervalle × facilité × 1.3, la facilité monte
 */
export function reviewCard(
  card: ReviewCard,
  accuracy: number,
  today: string
): ReviewCard {
  const grade = gradeFromAccuracy(accuracy);
  let { ease, intervalDays, reps, lapses } = card;

  if (grade === 'again') {
    ease = Math.max(1.3, ease - 0.2);
    intervalDays = 1;
    reps = 0;
    lapses += 1;
  } else if (grade === 'good') {
    intervalDays = reps === 0 ? 1 : Math.round(intervalDays * ease);
    reps += 1;
  } else {
    ease = Math.min(3.0, ease + 0.05);
    intervalDays = reps === 0 ? 3 : Math.round(intervalDays * ease * 1.3);
    reps += 1;
  }
  intervalDays = Math.max(1, Math.min(365, intervalDays));

  return {
    ...card,
    ease,
    intervalDays,
    reps,
    lapses,
    due: addDays(today, intervalDays),
    lastAccuracy: accuracy,
    lastReviewed: today,
  };
}

/** Pages dues aujourd'hui ou avant, les plus en retard d'abord */
export function duePages(cards: Record<number, ReviewCard>, today: string): ReviewCard[] {
  return Object.values(cards)
    .filter((c) => c.due <= today)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.page - b.page));
}

/** Série de jours consécutifs avec au moins une session, en remontant depuis aujourd'hui */
export function computeStreak(sessions: SessionRecord[], today: string): number {
  const days = new Set(sessions.map((s) => s.date.slice(0, 10)));
  let streak = 0;
  let day = today;
  // Le jour courant compte s'il a une session, sinon on regarde à partir d'hier
  if (!days.has(day)) day = addDays(day, -1);
  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
