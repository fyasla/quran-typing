// Tests de la fusion de progression (sync multi-appareils) : node scripts/test-sync.mjs
import { mergeProgress } from '../src/store/merge.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const session = (date, page, accuracy = 95) => ({
  page,
  date,
  accuracy,
  errors: 1,
  durationMs: 60000,
});
const card = (page, lastReviewed, interval = 3) => ({
  page,
  ease: 2.5,
  intervalDays: interval,
  due: '2026-07-10',
  reps: 1,
  lapses: 0,
  lastAccuracy: 95,
  lastReviewed,
});
const data = (sessions, cards) => ({
  version: 1,
  sessions,
  cards: Object.fromEntries(cards.map((c) => [c.page, c])),
});

// ---- Union des sessions, dédupliquée et triée ----
{
  const a = data([session('2026-07-01T10:00:00Z', 1), session('2026-07-02T10:00:00Z', 2)], []);
  const b = data([session('2026-07-01T10:00:00Z', 1), session('2026-06-30T10:00:00Z', 3)], []);
  const m = mergeProgress(a, b);
  check('sessions : union dédupliquée', m.sessions.length === 3, `len=${m.sessions.length}`);
  check('sessions : tri chronologique', m.sessions[0].page === 3 && m.sessions[2].page === 2);
}

// ---- Conflit de cartes : la révision la plus récente gagne ----
{
  const a = data([], [card(5, '2026-07-01', 3)]);
  const b = data([], [card(5, '2026-07-02', 8), card(9, '2026-06-20')]);
  const m = mergeProgress(a, b);
  check('cartes : la plus récente gagne', m.cards[5].intervalDays === 8);
  check('cartes : union des pages', Object.keys(m.cards).length === 2);
  // Symétrie
  const m2 = mergeProgress(b, a);
  check('cartes : fusion symétrique', m2.cards[5].intervalDays === 8);
}

// ---- Plafond de sessions ----
{
  const many = Array.from({ length: 1100 }, (_, i) =>
    session(`2026-01-01T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.${i}Z`, i)
  );
  const m = mergeProgress(data(many, []), data([], []));
  check('sessions : plafonnées à 1000', m.sessions.length === 1000, `len=${m.sessions.length}`);
}

// ---- Entrées corrompues ignorées ----
{
  const a = data([session('2026-07-01T10:00:00Z', 1), null, { pas: 'valide' }], []);
  const m = mergeProgress(a, data([], []));
  check('sessions : entrées corrompues filtrées', m.sessions.length === 1);
}

// ---- Fusion avec vide = identité ----
{
  const a = data([session('2026-07-01T10:00:00Z', 1)], [card(1, '2026-07-01')]);
  const m = mergeProgress(a, data([], []));
  check(
    'fusion avec vide = identité',
    m.sessions.length === 1 && Object.keys(m.cards).length === 1
  );
}

if (failures > 0) {
  console.error(`\n${failures} échec(s).`);
  process.exit(1);
}
console.log('\nTous les tests passent.');
