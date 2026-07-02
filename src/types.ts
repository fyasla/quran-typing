// Types du dataset généré par scripts/fetch-quran-data.mjs

export interface QuranWord {
  /** Texte QPC Hafs (Unicode) */
  t: string;
  /** Clé du verset, ex. "2:255" */
  k: string;
  /** Numéro de sourate */
  s: number;
  /** 1 si médaillon de fin de verset (numéro), non tapé */
  e: 0 | 1;
}

export interface PageLine {
  /** Numéro de ligne (1 à 15) */
  n: number;
  type: 'ayah' | 'surah' | 'basmala';
  /** Numéro de sourate (lignes surah/basmala) */
  surah?: number;
  /** 1 si ligne centrée */
  c?: 1;
  words?: QuranWord[];
}

export interface PageData {
  page: number;
  lines: PageLine[];
}

export interface Chapter {
  id: number;
  nameArabic: string;
  nameSimple: string;
  translatedName: string;
  versesCount: number;
  pages: [number, number];
  bismillahPre: boolean;
}

// Réglages

export type HarakatMode = 'none' | 'important' | 'all';
export type SmallLettersMode = 'strict' | 'flexible';
export type KeyboardMode = 'system' | 'custom';
export type Theme = 'auto' | 'light' | 'dark';
