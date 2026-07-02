import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HarakatMode, KeyboardMode, SmallLettersMode } from '../types';

interface SettingsState {
  harakatMode: HarakatMode;
  smallLetters: SmallLettersMode;
  blindMode: boolean;
  keyboardMode: KeyboardMode;
  page: number;
  setHarakatMode: (m: HarakatMode) => void;
  setSmallLetters: (m: SmallLettersMode) => void;
  setBlindMode: (b: boolean) => void;
  setKeyboardMode: (m: KeyboardMode) => void;
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
      page: 1,
      setHarakatMode: (harakatMode) => set({ harakatMode }),
      setSmallLetters: (smallLetters) => set({ smallLetters }),
      setBlindMode: (blindMode) => set({ blindMode }),
      setKeyboardMode: (keyboardMode) => set({ keyboardMode }),
      setPage: (page) =>
        set({ page: Math.min(TOTAL_PAGES, Math.max(1, Math.round(page))) }),
    }),
    { name: 'quran-typing-settings' }
  )
);
