import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectLanguage, type Language } from '../i18n';
import type { Goal, HarakatMode, KeyboardMode, SmallLettersMode, Theme } from '../types';

interface SettingsState {
  harakatMode: HarakatMode;
  smallLetters: SmallLettersMode;
  blindMode: boolean;
  /** Écrire aussi les titres de sourates */
  typeSurah: boolean;
  keyboardMode: KeyboardMode;
  theme: Theme;
  language: Language;
  /** Objectif d'apprentissage (null tant que non défini) */
  goal: Goal | null;
  /** Objectif de révision optionnel (récitation hors app pointable) */
  reviewGoal: Goal | null;
  page: number;
  setHarakatMode: (m: HarakatMode) => void;
  setSmallLetters: (m: SmallLettersMode) => void;
  setBlindMode: (b: boolean) => void;
  setTypeSurah: (b: boolean) => void;
  setKeyboardMode: (m: KeyboardMode) => void;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setGoal: (g: Goal) => void;
  setReviewGoal: (g: Goal | null) => void;
  setPage: (p: number) => void;
}

export const TOTAL_PAGES = 604;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      harakatMode: 'important',
      smallLetters: 'flexible',
      blindMode: false,
      typeSurah: false,
      keyboardMode: 'system',
      theme: 'auto',
      language: detectLanguage(),
      goal: null,
      reviewGoal: null,
      page: 1,
      setHarakatMode: (harakatMode) => set({ harakatMode }),
      setSmallLetters: (smallLetters) => set({ smallLetters }),
      setBlindMode: (blindMode) => set({ blindMode }),
      setTypeSurah: (typeSurah) => set({ typeSurah }),
      setKeyboardMode: (keyboardMode) => set({ keyboardMode }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setGoal: (goal) => set({ goal }),
      setReviewGoal: (reviewGoal) => set({ reviewGoal }),
      setPage: (page) =>
        set({ page: Math.min(TOTAL_PAGES, Math.max(1, Math.round(page))) }),
    }),
    { name: 'quran-typing-settings' }
  )
);
