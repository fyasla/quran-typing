// Smoke tests de la répétition espacée : node scripts/test-srs.mjs
import {
  computeStreak,
  duePages,
  gradeFromAccuracy,
  newCard,
  reviewCard,
} from '../src/review/srs.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

// ---- Notes selon la précision ----
check('note : <90% → again', gradeFromAccuracy(85) === 'again');
check('note : 90–97% → good', gradeFromAccuracy(94) === 'good');
check('note : ≥98% → easy', gradeFromAccuracy(99) === 'easy');

// ---- Planification ----
{
  const today = '2026-07-02';
  let card = newCard(42, today);
  check('carte neuve : due aujourd’hui', card.due === today);

  // Première réussite (good) → 1 jour
  card = reviewCard(card, 95, today);
  check('good #1 : intervalle 1 j', card.intervalDays === 1, `interval=${card.intervalDays}`);
  check('good #1 : due demain', card.due === '2026-07-03', card.due);

  // Deuxième réussite → intervalle × facilité (1 × 2.5 → 3 j, arrondi)
  card = reviewCard(card, 95, card.due);
  check('good #2 : intervalle croît', card.intervalDays === 3, `interval=${card.intervalDays}`);

  // Échec → retour à 1 jour, facilité baisse
  const before = card.ease;
  card = reviewCard(card, 60, card.due);
  check('again : intervalle retombe à 1 j', card.intervalDays === 1);
  check('again : facilité baisse', card.ease < before);
  check('again : lapse compté', card.lapses === 1);

  // easy sur carte neuve → 3 jours
  let c2 = reviewCard(newCard(7, today), 100, today);
  check('easy #1 : intervalle 3 j', c2.intervalDays === 3, `interval=${c2.intervalDays}`);
  check('easy : facilité monte', c2.ease > 2.5);
}

// ---- Fin de mois / d'année ----
{
  const card = reviewCard(newCard(1, '2026-12-31'), 95, '2026-12-31');
  check('passage d’année : due 2027-01-01', card.due === '2027-01-01', card.due);
}

// ---- Pages dues ----
{
  const today = '2026-07-02';
  const cards = {
    1: { ...newCard(1, today), due: '2026-06-30' },
    2: { ...newCard(2, today), due: '2026-07-02' },
    3: { ...newCard(3, today), due: '2026-07-10' },
  };
  const due = duePages(cards, today);
  check('dues : 2 pages (retard + aujourd’hui)', due.length === 2, `len=${due.length}`);
  check('dues : la plus en retard d’abord', due[0].page === 1);
}

// ---- Streak ----
{
  const today = '2026-07-02';
  const s = (d) => ({ page: 1, date: `${d}T10:00:00.000Z`, accuracy: 95, errors: 1, durationMs: 60000 });
  check('streak : vide → 0', computeStreak([], today) === 0);
  check(
    'streak : aujourd’hui + hier → 2',
    computeStreak([s('2026-07-01'), s('2026-07-02')], today) === 2
  );
  check(
    'streak : pas de session aujourd’hui, hier + avant-hier → 2',
    computeStreak([s('2026-06-30'), s('2026-07-01')], today) === 2
  );
  check(
    'streak : trou → série cassée',
    computeStreak([s('2026-06-28'), s('2026-07-02')], today) === 1
  );
}

if (failures > 0) {
  console.error(`\n${failures} échec(s).`);
  process.exit(1);
}
console.log('\nTous les tests passent.');
