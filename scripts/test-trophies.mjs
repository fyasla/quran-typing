// Tests des trophées et de la fusion étendue : node scripts/test-trophies.mjs
import { TROPHIES, buildStats, juzRange, newlyUnlocked } from '../src/review/trophies.ts';
import { mergeProgress } from '../src/store/merge.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const card = (page) => ({
  page, ease: 2.5, intervalDays: 1, due: '2099-01-01', reps: 1, lapses: 0,
  lastAccuracy: 95, lastReviewed: '2026-07-01',
});
const data = (pages, over = {}) => ({
  version: 1,
  sessions: [],
  cards: Object.fromEntries(pages.map((p) => [p, card(p)])),
  ...over,
});
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ---- Découpage des juz ----
check('juz 1 = pages 1–21', JSON.stringify(juzRange(1)) === '[1,21]');
check('juz 2 = pages 22–41', JSON.stringify(juzRange(2)) === '[22,41]');
check('juz 29 = pages 562–581', JSON.stringify(juzRange(29)) === '[562,581]');
check('juz 30 = pages 582–604', JSON.stringify(juzRange(30)) === '[582,604]');
{
  // Les 30 juz couvrent exactement 1..604 sans trou ni chevauchement
  const covered = new Set();
  for (let n = 1; n <= 30; n++) {
    const [a, b] = juzRange(n);
    for (let p = a; p <= b; p++) {
      check(`page ${p} couverte une seule fois`, !covered.has(p));
      covered.add(p);
      if (covered.has(p) && failures) break;
    }
    if (failures) break;
  }
  if (!failures) check('couverture complète 604 pages', covered.size === 604);
}

// ---- Déblocages ----
check('rien au départ', newlyUnlocked(data([]), '2026-07-04').length === 0);
{
  const ids = newlyUnlocked(data([1]), '2026-07-04');
  check('première page → first-page + fatiha', ids.includes('first-page') && ids.includes('fatiha'));
  check('pas de pages-10 avec 1 page', !ids.includes('pages-10'));
}
{
  const ids = newlyUnlocked(data(range(1, 21)), '2026-07-04');
  check('pages 1–21 → juz-1', ids.includes('juz-1'));
  check('pages 1–21 → pages-10', ids.includes('pages-10'));
}
{
  const ids = newlyUnlocked(data(range(2, 49)), '2026-07-04');
  check('pages 2–49 → baqara (sans fatiha)', ids.includes('baqara') && !ids.includes('fatiha'));
}
{
  const ids = newlyUnlocked(data(range(1, 604)), '2026-07-04');
  check('604 pages → quran + juz-15', ids.includes('quran') && ids.includes('juz-15'));
}
{
  const d = data([1], { totals: { verses: 1200, sessions: 3, blind: 1, perfect: 10 } });
  const ids = newlyUnlocked(d, '2026-07-04');
  check('compteurs → verses-1000, blind-1, perfect-1 et perfect-10',
    ids.includes('verses-1000') && ids.includes('blind-1') &&
    ids.includes('perfect-1') && ids.includes('perfect-10'));
}
{
  const s = (day) => ({ page: 1, date: `${day}T10:00:00Z`, accuracy: 95, errors: 0, durationMs: 0 });
  const d = data([1], { sessions: [s('2026-07-02'), s('2026-07-03'), s('2026-07-04')] });
  check('3 jours de suite → streak-3', newlyUnlocked(d, '2026-07-04').includes('streak-3'));
}
{
  // Déjà possédé → pas re-débloqué
  const d = data([1], { trophies: { 'first-page': '2026-07-01', fatiha: '2026-07-01' } });
  const ids = newlyUnlocked(d, '2026-07-04');
  check('trophées possédés non redébloqués', !ids.includes('first-page') && !ids.includes('fatiha'));
}
check('20 trophées définis', TROPHIES.length === 20);
check('buildStats compte les juz', buildStats(data(range(1, 41)), '2026-07-04').juzDone === 2);

// ---- Fusion des nouveaux champs ----
{
  const a = data([1], {
    totals: { verses: 100, sessions: 5, blind: 1, perfect: 2 },
    trophies: { 'first-page': '2026-07-01' },
    checkins: [{ date: '2026-07-03', amount: 1 }],
  });
  const b = data([2], {
    totals: { verses: 80, sessions: 7, blind: 0, perfect: 3 },
    trophies: { 'first-page': '2026-06-30', fatiha: '2026-07-02' },
    checkins: [{ date: '2026-07-03', amount: 1 }, { date: '2026-07-04', amount: 2 }],
  });
  const m = mergeProgress(a, b);
  check('fusion totals = max par champ',
    m.totals.verses === 100 && m.totals.sessions === 7 && m.totals.blind === 1 && m.totals.perfect === 3);
  check('fusion trophées = union, date la plus ancienne',
    m.trophies['first-page'] === '2026-06-30' && m.trophies.fatiha === '2026-07-02');
  check('fusion checkins = union dédupliquée', m.checkins.length === 2);
  const doubled = mergeProgress(a, a);
  check('fusion avec soi-même = idempotente (checkins)', doubled.checkins.length === 1);
}

if (failures > 0) {
  console.error(`\n${failures} échec(s).`);
  process.exit(1);
}
console.log('\nTous les tests passent.');
