// Test corpus complet : simule la frappe des 604 pages dans chaque mode,
// en n'utilisant QUE les caractères d'un clavier arabe standard.
// Usage : node scripts/test-corpus.mjs

import { readFileSync } from 'node:fs';
import { buildTokens, TypingEngine } from '../src/typing/engine.ts';
import { isRequired } from '../src/typing/charsets.ts';

// Caractères produits par un clavier arabe standard (Arabic 101)
const KEYBOARD = new Set([
  ...'ضصثقفغعهخحجدشسيبلاتنمكطئءؤرىةوزظذ',
  ...'أإآلألإلآ',
  '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650',
  '\u0651', '\u0652', '\u0640', ' ',
]);

// Forme « clavier standard » d'un caractère attendu (mode souple)
function baseForm(ch) {
  switch (ch) {
    case '\u06E1': return '\u0652'; // sukun QPC ← sukun
    case '\u0657': case '\u08F0': return '\u064B'; // fathatan ouvert
    case '\u065E': case '\u08F1': return '\u064C'; // dammatan ouvert
    case '\u0656': case '\u08F2': return '\u064D'; // kasratan ouvert
    case '\u0671': return '\u0627'; // alif wasla ← alif
    case '\u0654': case '\u0655': return '\u0621'; // hamza combinante ← ء
    case '\u0670': return '\u0627'; // alif saghira ← alif (souple)
    case '\u06E5': return '\u0648'; // petit waw ← waw (souple)
    case '\u06E6': case '\u06E7': return '\u064A'; // petit ya ← ya (souple)
    default: return ch;
  }
}

let failures = 0;

for (const harakatMode of ['none', 'important', 'all']) {
  let untypeable = new Map(); // caractères requis sans forme clavier (hors mode all)
  let errorPages = [];
  let incompletePages = [];

  for (let p = 1; p <= 604; p++) {
    const page = JSON.parse(readFileSync(`public/data/pages/page-${p}.json`, 'utf8'));
    const tokens = buildTokens(page);
    const engine = new TypingEngine(tokens, { harakatMode, smallLetters: 'flexible' });

    for (const t of tokens) {
      if (!isRequired(t.kind, harakatMode)) continue;
      // En mode 'all', on tape le caractère exact ; sinon la forme clavier
      const typed = harakatMode === 'all' ? t.ch : baseForm(t.ch);
      if (harakatMode !== 'all' && !KEYBOARD.has(typed)) {
        const cp = 'U+' + typed.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        untypeable.set(cp, (untypeable.get(cp) ?? 0) + 1);
      }
      const res = engine.handleChar(typed);
      if (res === 'error') {
        if (errorPages.length < 5)
          errorPages.push(`page ${p} : « ${typed} » refusé pour « ${t.ch} » (${t.kind})`);
        else errorPages.push('…');
        break;
      }
    }
    const snap = engine.snapshot();
    if (!snap.done && errorPages.length === 0) incompletePages.push(p);
  }

  const ok = errorPages.length === 0 && incompletePages.length === 0 && untypeable.size === 0;
  if (!ok) failures++;
  console.log(`mode ${harakatMode.padEnd(10)} : ${ok ? 'OK (604 pages)' : 'ÉCHEC'}`);
  if (untypeable.size) console.log('  intapables :', [...untypeable.entries()].join(' '));
  if (errorPages.length) console.log('  erreurs :', errorPages.slice(0, 5).join('\n    '));
  if (incompletePages.length)
    console.log('  pages incomplètes :', incompletePages.slice(0, 10).join(', '));
}

console.log(failures === 0 ? '\nCorpus entier validé dans les 3 modes.' : `\n${failures} mode(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
