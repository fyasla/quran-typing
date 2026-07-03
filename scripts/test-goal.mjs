// Tests de l'objectif de rythme : node scripts/test-goal.mjs
import {
  daysLeft,
  formatAmount,
  periodStart,
  progressSince,
} from '../src/review/goal.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const goal = (over = {}) => ({
  amount: 1,
  unit: 'page',
  every: 1,
  perUnit: 'day',
  since: '2026-07-01',
  ...over,
});

// ---- Découpage en périodes ----
check('quotidien : période = le jour même', periodStart(goal(), '2026-07-03') === '2026-07-03');
check(
  'tous les 3 jours : ancrage sur since',
  periodStart(goal({ every: 3 }), '2026-07-05') === '2026-07-04'
);
check(
  'hebdomadaire : début de période',
  periodStart(goal({ perUnit: 'week' }), '2026-07-09') === '2026-07-08'
);
check(
  'passage de mois',
  periodStart(goal({ every: 7 }), '2026-08-02') === '2026-07-29'
);

// ---- Jours restants ----
check('quotidien : reste 1 jour', daysLeft(goal(), '2026-07-03') === 1);
check(
  'tous les 3 jours : reste 2 le 2e jour',
  daysLeft(goal({ every: 3 }), '2026-07-05') === 2
);
check(
  'hebdo : reste 7 le premier jour',
  daysLeft(goal({ perUnit: 'week' }), '2026-07-08') === 7
);

// ---- Progression ----
{
  const s = (day, verses) => ({
    page: 1,
    date: `${day}T10:00:00.000Z`,
    accuracy: 95,
    errors: 0,
    durationMs: 0,
    verses,
  });
  const sessions = [s('2026-07-01', 7), s('2026-07-03', 5), s('2026-07-04', 3)];
  const p = progressSince(sessions, '2026-07-03');
  check('progression : pages depuis le début de période', p.pages === 2);
  check('progression : versets cumulés', p.verses === 8);
  // Session sans champ verses (ancien format) → 0
  const p2 = progressSince([{ page: 1, date: '2026-07-03T10:00:00Z', accuracy: 90, errors: 1, durationMs: 0 }], '2026-07-03');
  check('progression : ancien format sans versets toléré', p2.verses === 0 && p2.pages === 1);
}

// ---- Formatage des fractions ----
check('¼', formatAmount(0.25) === '¼');
check('½', formatAmount(0.5) === '½');
check('1¾', formatAmount(1.75) === '1¾');
check('2', formatAmount(2) === '2');

if (failures > 0) {
  console.error(`\n${failures} échec(s).`);
  process.exit(1);
}
console.log('\nTous les tests passent.');
