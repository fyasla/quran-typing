// Tests de la pagination « livre relié » (mode 2 pages) : node scripts/test-spread.mjs
import { buildStaticSnapshot, getSpread } from '../src/typing/spread.ts';

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

// ---- Pages seules ----
check('page 1 : seule', JSON.stringify(getSpread(1)) === JSON.stringify({ right: 1, left: null }));
check(
  'page 604 (dernière) : seule',
  JSON.stringify(getSpread(604)) === JSON.stringify({ right: 604, left: null })
);

// ---- Paires ----
check('page 2 : paire (2,3)', JSON.stringify(getSpread(2)) === JSON.stringify({ right: 2, left: 3 }));
check('page 3 : paire (2,3)', JSON.stringify(getSpread(3)) === JSON.stringify({ right: 2, left: 3 }));
check(
  'page 602 : paire (602,603)',
  JSON.stringify(getSpread(602)) === JSON.stringify({ right: 602, left: 603 })
);
check(
  'page 603 : paire (602,603)',
  JSON.stringify(getSpread(603)) === JSON.stringify({ right: 602, left: 603 })
);

// Toutes les pages de 2 à 603 doivent appartenir à une paire cohérente,
// jamais chevaucher la voisine et jamais désigner 1 ou 604 comme partenaire.
let pairFailures = 0;
for (let p = 2; p <= 603; p++) {
  const s = getSpread(p);
  if (s.left === null || s.right < 2 || s.left > 603 || s.left !== s.right + 1) pairFailures++;
}
check('pages 2..603 : toutes appariées sans déborder sur 1/604', pairFailures === 0, `${pairFailures} anomalies`);

// ---- Instantané statique ----
const doneSnap = buildStaticSnapshot(5, true);
check('snapshot fait : done=true', doneSnap.done === true);
check('snapshot fait : pos = longueur', doneSnap.pos === 5);
check('snapshot fait : status tout ST_AUTO (2)', [...doneSnap.status].every((v) => v === 2));
check('snapshot fait : pas de mauvais caractère', doneSnap.lastWrongChar === null);

const pendingSnap = buildStaticSnapshot(5, false);
check('snapshot vierge : status tout ST_PENDING (0)', [...pendingSnap.status].every((v) => v === 0));
check('snapshot vierge : correctCount = 0', pendingSnap.correctCount === 0);
check('snapshot vierge : done=true (pas de curseur affiché)', pendingSnap.done === true);

console.log(failures > 0 ? `\n${failures} échec(s).` : '\nTous les contrôles passent.');
process.exit(failures > 0 ? 1 : 0);
