// Classification des caractères du script QPC Hafs (Unicode)
// et équivalences de frappe selon les modes.

import type { HarakatMode, SmallLettersMode } from '../types.ts';

export type CharKind =
  | 'letter' // lettres de base (toujours requises)
  | 'harakat' // voyelles brèves, tanwin, shadda, sukun (requises sauf mode 'none')
  | 'small' // petites lettres : alif/waw/ya saghira (requises sauf mode 'none')
  | 'minor' // marques mineures : maddah, zéro rond (lettre muette), mîm d'iqlab… (requises seulement en mode 'all')
  | 'waqf' // signes de pause — jamais tapés (auto)
  | 'space' // espace entre les mots
  | 'marker' // médaillon de fin de verset (auto)
  | 'other'; // tatweel, etc. (auto)

// Harakats « cœur »
const HARAKAT = new Set([
  '\u064B', // fathatan
  '\u064C', // dammatan
  '\u064D', // kasratan
  '\u064E', // fatha
  '\u064F', // damma
  '\u0650', // kasra
  '\u0651', // shadda
  '\u0652', // sukun (standard)
  '\u06E1', // petit sukun QPC (tête de kha)
  // Tanwins « ouverts » (idgham/ikhfa) — codepoints réutilisés par le script
  // QPC Hafs (vérifié sur le corpus : هُدٗى، عَظِيمٞ، شَيۡءٖ)
  '\u0657', // fathatan ouvert (glyphe « damma inversé »)
  '\u065E', // dammatan ouvert (glyphe « fatha deux points »)
  '\u0656', // kasratan ouvert (glyphe « alef souscrit »)
  '\u08F0', // fathatan ouvert (forme Unicode standard, absente du corpus QPC)
  '\u08F1', // dammatan ouvert
  '\u08F2', // kasratan ouvert
]);

// Petites lettres (saghira)
const SMALL = new Set([
  '\u0670', // alif suscrit (dagger alif)
  '\u06E5', // petit waw
  '\u06E6', // petit ya
  '\u06E7', // petit ya suscrit
]);

// Marques mineures
// NB : les hamzas combinantes (U+0654/0655) ne sont PAS ici — ce sont de
// vraies consonnes (ex. أَنۢبِـُٔونِي), classées lettres avec équivalence ء.
const MINOR = new Set([
  '\u0653', // maddah
  '\u06E4', // petite maddah haute
  '\u06DF', // petit zéro rond (lettre muette / prolongation non lue)
  '\u06E0', // zéro rectangulaire
  '\u06E2', // petit mîm haut (iqlab)
  '\u06ED', // petit mîm bas (iqlab)
  '\u06E8', // petit noun haut
  '\u06EA', // point bas (idgham)
  '\u06EB', // point haut
  '\u06EC', // rond plein (idgham)
]);

// Signes de pause (waqf) — affichés mais jamais tapés
const WAQF = new Set([
  '\u06D6',
  '\u06D7',
  '\u06D8',
  '\u06D9',
  '\u06DA',
  '\u06DB',
  '\u06DC',
  '\u06E9', // signe de sajda
  '\u06DE', // ۞ rub el-hizb (ornement)
  '\u0615',
]);

const ARABIC_DIGITS = /[\u0660-\u0669]/;

export function classifyChar(ch: string): CharKind {
  if (ch === ' ' || ch === '\u00A0') return 'space';
  if (HARAKAT.has(ch)) return 'harakat';
  if (SMALL.has(ch)) return 'small';
  if (MINOR.has(ch)) return 'minor';
  if (WAQF.has(ch)) return 'waqf';
  if (ch === '\u0640') return 'other'; // tatweel
  if (ch === '\u06DD' || ARABIC_DIGITS.test(ch)) return 'marker';
  // Lettres arabes et tout le reste
  return 'letter';
}

/** Vrai si le caractère est une marque combinante (peut être tapée dans le désordre au sein d'un cluster) */
export function isCombining(kind: CharKind): boolean {
  return kind === 'harakat' || kind === 'small' || kind === 'minor';
}

/** Le caractère tapé `typed` valide-t-il le caractère attendu `expected` ? */
export function charMatches(
  typed: string,
  expected: string,
  smallMode: SmallLettersMode
): boolean {
  if (typed === expected) return true;

  switch (expected) {
    // Sukun QPC ← sukun standard du clavier
    case '\u06E1':
      return typed === '\u0652';
    // Tanwins ouverts ← tanwins standards du clavier
    case '\u0657':
    case '\u08F0':
      return typed === '\u064B';
    case '\u065E':
    case '\u08F1':
      return typed === '\u064C';
    case '\u0656':
    case '\u08F2':
      return typed === '\u064D';
    // Hamza combinante (au-dessus / en dessous) ← hamza ء
    case '\u0654':
    case '\u0655':
      return typed === '\u0621';
  }

  if (smallMode === 'flexible') {
    switch (expected) {
      case '\u0671': // alif wasla ← alif (mode souple ; en strict : Shift+U du mapping intégré)
        return typed === '\u0627';
      case '\u0670': // alif suscrit ← alif
        return typed === '\u0627';
      case '\u06E5': // petit waw ← waw
        return typed === '\u0648';
      case '\u06E6': // petit ya ← ya
      case '\u06E7':
        return typed === '\u064A';
    }
  }

  return false;
}

/** Le caractère tapé est-il une harakat/marque (à ignorer en mode 'none') ? */
export function isMarkChar(ch: string): boolean {
  const kind = classifyChar(ch);
  return isCombining(kind) || kind === 'waqf';
}

/** Un token de ce type doit-il être tapé, selon les réglages ? */
export function isRequired(kind: CharKind, harakatMode: HarakatMode): boolean {
  switch (kind) {
    case 'letter':
    case 'space':
      return true;
    case 'harakat':
    case 'small':
      return harakatMode !== 'none';
    case 'minor':
      return harakatMode === 'all';
    case 'waqf':
    case 'marker':
    case 'other':
      return false;
  }
}

/** Texte de la basmala (script QPC Hafs) */
export const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
