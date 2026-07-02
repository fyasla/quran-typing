// Smoke tests du moteur de frappe : node scripts/test-engine.mjs
import { readFileSync } from 'node:fs';
import { buildTokens, TypingEngine } from '../src/typing/engine.ts';

const page1 = JSON.parse(readFileSync('public/data/pages/page-1.json', 'utf8'));

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

function typeString(engine, str) {
  const results = [];
  for (const ch of str) results.push(engine.handleChar(ch));
  return results;
}

// ---- Mode 'none' : lettres seules ----
{
  const tokens = buildTokens(page1);
  const e = new TypingEngine(tokens, { harakatMode: 'none', smallLetters: 'flexible' });
  // بسم الله الرحمن الرحيم — lettres seules (alif normal pour wasla et dagger alif)
  const res = typeString(e, 'بسم الله الرحمن الرحيم');
  check("mode none : basmala lettres seules", !res.includes('error'), JSON.stringify(res));
  // harakat tapée en mode none → ignorée
  const r2 = e.handleChar('\u064E');
  check("mode none : harakat ignorée", r2 === 'ignored', r2);
}

// ---- Mode 'important' : avec harakats ----
{
  const tokens = buildTokens(page1);
  const e = new TypingEngine(tokens, { harakatMode: 'important', smallLetters: 'flexible' });
  // بِسۡمِ : ب + kasra + س + sukun(06E1 accepté via 0652) + م + kasra
  const res = typeString(e, 'بِسْمِ');
  check("mode important : bismi avec sukun standard", !res.includes('error'), JSON.stringify(res));
  // espace puis ٱللَّهِ avec alif normal + lam, lam+shadda+fatha, ha+kasra
  const res2 = typeString(e, ' اللَّهِ');
  check("mode important : Allah (wasla via alif)", !res2.includes('error'), JSON.stringify(res2));
  // الرَّحْمَٰنِ — dagger alif via alif normal (souple)
  const res3 = typeString(e, ' الرَّحْمَانِ');
  check("mode important : ar-Rahman (dagger alif souple)", !res3.includes('error'), JSON.stringify(res3));
}

// ---- Mode 'important' strict : dagger alif exigé ----
{
  const tokens = buildTokens(page1);
  const e = new TypingEngine(tokens, { harakatMode: 'important', smallLetters: 'strict' });
  // En strict, la wasla ٱ doit être tapée telle quelle (pas d'équivalence alif)
  typeString(e, 'بِسْمِ ٱللَّهِ ٱلرَّحْ');
  const wrong = e.handleChar('م'); // م ok (lettre)
  const fatha = e.handleChar('\u064E');
  const alifNormal = e.handleChar('ا'); // refusé : il faut ٰ (0670)
  const alifSaghira = e.handleChar('\u0670');
  check('mode strict : alif normal refusé pour saghira', alifNormal === 'error', alifNormal);
  check('mode strict : alif saghira accepté', wrong === 'ok' && fatha === 'ok' && alifSaghira === 'ok');
}

// ---- Mode 'all' : exhaustif au caractère près ----
{
  const tokens = buildTokens(page1);
  const e = new TypingEngine(tokens, { harakatMode: 'all', smallLetters: 'strict' });
  // Texte source exact de la page (sans médaillons)
  const exact = tokens
    .filter((t) => t.kind !== 'marker')
    .map((t) => t.ch)
    .join('');
  const res = typeString(e, exact);
  check(
    "mode all : frappe du texte exact de la page 1 → aucune erreur",
    !res.includes('error'),
    `première erreur à l'index ${res.indexOf('error')} sur ${res.length}`
  );
  check('mode all : page terminée', e.snapshot().done);
}

// ---- Erreurs comptées ----
{
  const tokens = buildTokens(page1);
  const e = new TypingEngine(tokens, { harakatMode: 'none', smallLetters: 'flexible' });
  const r1 = e.handleChar('ت'); // attendu ب → erreur
  const r2 = e.handleChar('ب');
  const snap = e.snapshot();
  check('erreur détectée puis corrigée', r1 === 'error' && r2 === 'ok');
  check('hadError conservé', snap.hadError.some((x) => x === 1));
}

// ---- Désordre toléré dans un cluster (shadda/fatha) ----
{
  const tokens = buildTokens(page1);
  const e = new TypingEngine(tokens, { harakatMode: 'important', smallLetters: 'flexible' });
  typeString(e, 'بِسْمِ ال'); // jusqu'au lam de Allah
  const l2 = e.handleChar('ل');
  // texte : ل + shadda(0651) + fatha(064E) — on tape fatha d'abord
  const f = e.handleChar('\u064E');
  const sh = e.handleChar('\u0651');
  check('cluster : ordre fatha/shadda inversé accepté', l2 === 'ok' && f === 'ok' && sh === 'ok', `${l2},${f},${sh}`);
}

console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} échec(s).`);
process.exit(failures === 0 ? 0 : 1);
