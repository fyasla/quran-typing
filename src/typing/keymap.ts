// Mapping clavier personnalisé : disposition « Arabic 101 » émulée
// sur les codes physiques des touches (fonctionne quelle que soit la
// disposition système : AZERTY, QWERTY…), enrichie de touches pour les
// petites lettres et marques spéciales du script QPC Hafs.

const BASE: Record<string, string> = {
  Backquote: 'ذ',
  KeyQ: 'ض',
  KeyW: 'ص',
  KeyE: 'ث',
  KeyR: 'ق',
  KeyT: 'ف',
  KeyY: 'غ',
  KeyU: 'ع',
  KeyI: 'ه',
  KeyO: 'خ',
  KeyP: 'ح',
  BracketLeft: 'ج',
  BracketRight: 'د',
  KeyA: 'ش',
  KeyS: 'س',
  KeyD: 'ي',
  KeyF: 'ب',
  KeyG: 'ل',
  KeyH: 'ا',
  KeyJ: 'ت',
  KeyK: 'ن',
  KeyL: 'م',
  Semicolon: 'ك',
  Quote: 'ط',
  KeyZ: 'ئ',
  KeyX: 'ء',
  KeyC: 'ؤ',
  KeyV: 'ر',
  KeyB: 'لا',
  KeyN: 'ى',
  KeyM: 'ة',
  Comma: 'و',
  Period: 'ز',
  Slash: 'ظ',
  Space: ' ',
  // Extensions QPC Hafs (n'existent pas sur le clavier arabe standard)
  Minus: '\u0670', // ٰ alif suscrit (saghira)
  Equal: '\u06E5', // ۥ petit waw
  Backslash: '\u06E6', // ۦ petit ya
};

const SHIFT: Record<string, string> = {
  Backquote: '\u0651', // ّ shadda
  KeyQ: '\u064E', // َ fatha
  KeyW: '\u064B', // ً fathatan
  KeyE: '\u064F', // ُ damma
  KeyR: '\u064C', // ٌ dammatan
  KeyT: 'لإ',
  KeyY: 'إ',
  KeyU: 'ٱ', // alif wasla (extension)
  KeyA: '\u0650', // ِ kasra
  KeyS: '\u064D', // ٍ kasratan
  KeyG: 'لأ',
  KeyH: 'أ',
  KeyJ: '\u0640', // ـ tatweel
  KeyX: '\u0652', // ْ sukun
  KeyB: 'لآ',
  KeyN: 'آ',
  Space: ' ',
  // Extensions QPC Hafs
  Minus: '\u0653', // ٓ maddah
  Equal: '\u06DF', // ۟ petit zéro rond
  Backslash: '\u06E7', // ۧ petit ya suscrit
  KeyM: '\u06E2', // ۢ petit mîm haut (iqlab)
  Comma: '\u06ED', // ۭ petit mîm bas (iqlab)
  KeyZ: '\u0654', // ٔ hamza combinante au-dessus
  KeyV: '\u0655', // ٕ hamza combinante en dessous
};

/**
 * Convertit un événement clavier en texte arabe selon le mapping personnalisé.
 * Retourne null si la touche n'est pas mappée.
 */
export function mapKeyEvent(e: {
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): string | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  const table = e.shiftKey ? SHIFT : BASE;
  return table[e.code] ?? null;
}
