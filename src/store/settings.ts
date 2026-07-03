import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectLanguage, type Language } from '../i18n';
import type { Goal, HarakatMode, KeyboardMode, SmallLettersMode, Theme } from '../types';

interface SettingsState {
  harakatMode: HarakatMode;
  smallLetters: SmallLettersMode;
  blindMode: boolean;
  keyboardMode: KeyboardMode;
  theme: Theme;
  language: Language;
  /** Objectif de rythme (null tant que non défini) */
  goal: Goal | null;
  page: number;
  setHarakatMode: (m: HarakatMode) => void;
  setSmallLetters: (m: SmallLettersMode) => void;
  setBlindMode: (b: boolean) => void;
  setKeyboardMode: (m: KeyboardMode) => void;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setGoal: (g: Goal) => void;
  setPage: (p: number) => void;
}

export const TOTAL_PAGES = 604;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      harakatMode: 'important',
      smallLetters: 'flexible',
      blindMode: false,
      keyboardMode: 'system',
      theme: 'auto',
      language: detectLanguage(),
      goal: null,
      page: 1,
      setHarakatMode: (harakatMode) => set({ harakatMode }),
      setSmallLetters: (smallLetters) => set({ smallLetters }),
      setBlindMode: (blindMode) => set({ blindMode }),
      setKeyboardMode: (keyboardMode) => set({ keyboardMode }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setGoal: (goal) => set({ goal }),
      setPage: (page) =>
        set({ page: Math.min(TOTAL_PAGES, Math.max(1, Math.round(page))) }),
    }),
    { name: 'quran-typing-settings' }
  )
);
