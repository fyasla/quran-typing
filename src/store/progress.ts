// Progression par profil : historique de sessions, fiches par page (pages
// écrites), pointages de révision, compteurs cumulés et trophées.
// Stockée dans localStorage sous une clé par profil.

import { useCallback, useEffect, useState } from 'react';
import {
  newCard,
  reviewCard,
  toDay,
  type ReviewCard,
  type SessionRecord,
} from '../review/srs';
import { newlyUnlocked } from '../review/trophies';

/** Pointage manuel de révision (récitation faite hors app) */
export interface Checkin {
  date: string;
  amount: number;
}

/** Compteurs cumulés (non plafonnés, contrairement à l'historique de sessions) */
export interface Totals {
  verses: number;
  sessions: number;
  blind: number;
  perfect: number;
}

export interface ProgressData {
  version: 1;
  sessions: SessionRecord[];
  /** Fiche par page écrite au moins une fois (source des trophées juz/Coran) */
  cards: Record<number, ReviewCard>;
  checkins?: Checkin[];
  totals?: Totals;
  /** Trophées débloqués : id → date (YYYY-MM-DD) */
  trophies?: Record<string, string>;
}

const KEY_PREFIX = 'quran-typing-progress-';
/** Limites d'historique pour éviter une croissance illimitée du localStorage */
const MAX_SESSIONS = 1000;
const MAX_CHECKINS = 500;

const EMPTY_TOTALS: Totals = { verses: 0, sessions: 0, blind: 0, perfect: 0 };

function emptyProgress(): ProgressData {
  return { version: 1, sessions: [], cards: {} };
}

export function loadProgress(profileId: string): ProgressData {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + profileId);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as ProgressData;
    if (data.version !== 1 || !Array.isArray(data.sessions) || !data.cards) {
      return emptyProgress();
    }
    return data;
  } catch {
    return emptyProgress();
  }
}

function saveProgress(profileId: string, data: ProgressData) {
  localStorage.setItem(KEY_PREFIX + profileId, JSON.stringify(data));
}

export function deleteProgress(profileId: string) {
  localStorage.removeItem(KEY_PREFIX + profileId);
}

/** Export JSON (téléchargeable) des données d'un profil */
export function exportProgress(profileId: string, profileName: string): string {
  return JSON.stringify(
    { app: 'quran-typing', profileName, exportedAt: new Date().toISOString(), ...loadProgress(profileId) },
    null,
    2
  );
}

/** Import JSON : remplace les données du profil. Retourne false si le fichier est invalide. */
export function importProgress(profileId: string, json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.app !== 'quran-typing' || data.version !== 1) return false;
    if (!Array.isArray(data.sessions) || typeof data.cards !== 'object') return false;
    saveProgress(profileId, {
      version: 1,
      sessions: data.sessions,
      cards: data.cards,
      checkins: Array.isArray(data.checkins) ? data.checkins : undefined,
      totals: data.totals,
      trophies: data.trophies,
    });
    return true;
  } catch {
    return false;
  }
}

/** Persiste les trophées nouvellement remplis ; retourne leurs ids */
function unlockTrophies(data: ProgressData, today: string): string[] {
  const ids = newlyUnlocked(data, today);
  if (ids.length > 0) {
    data.trophies = { ...(data.trophies ?? {}) };
    for (const id of ids) data.trophies[id] = today;
  }
  return ids;
}

export interface UseProgress {
  data: ProgressData;
  /**
   * Enregistre une page terminée : session, fiche de page, compteurs,
   * trophées. Retourne les ids des trophées nouvellement débloqués.
   */
  recordSession: (
    page: number,
    accuracy: number,
    errors: number,
    durationMs: number,
    verses: number,
    blind: boolean
  ) => string[];
  /** Pointage manuel de révision (hors app). Retourne les trophées débloqués. */
  addCheckin: (amount: number) => string[];
  /** Recharge depuis le localStorage (après un import) */
  reload: () => void;
}

export function useProgress(profileId: string | null): UseProgress {
  const [data, setData] = useState<ProgressData>(() =>
    profileId ? loadProgress(profileId) : emptyProgress()
  );

  useEffect(() => {
    setData(profileId ? loadProgress(profileId) : emptyProgress());
  }, [profileId]);

  const commit = useCallback(
    (next: ProgressData) => {
      setData(next);
      if (profileId) saveProgress(profileId, next);
    },
    [profileId]
  );

  const recordSession = useCallback(
    (
      page: number,
      accuracy: number,
      errors: number,
      durationMs: number,
      verses: number,
      blind: boolean
    ): string[] => {
      const today = toDay(new Date());
      const session: SessionRecord = {
        page,
        date: new Date().toISOString(),
        accuracy,
        errors,
        durationMs,
        verses,
        blind: blind || undefined,
      };
      const prev = data.cards[page] ?? newCard(page, today);
      const totals = data.totals ?? EMPTY_TOTALS;
      const next: ProgressData = {
        ...data,
        version: 1,
        sessions: [...data.sessions, session].slice(-MAX_SESSIONS),
        cards: { ...data.cards, [page]: reviewCard(prev, accuracy, today) },
        totals: {
          verses: totals.verses + verses,
          sessions: totals.sessions + 1,
          blind: totals.blind + (blind ? 1 : 0),
          perfect: totals.perfect + (accuracy >= 100 ? 1 : 0),
        },
      };
      const unlocked = unlockTrophies(next, today);
      commit(next);
      return unlocked;
    },
    [data, commit]
  );

  const addCheckin = useCallback(
    (amount: number): string[] => {
      const today = toDay(new Date());
      const next: ProgressData = {
        ...data,
        checkins: [...(data.checkins ?? []), { date: today, amount }].slice(-MAX_CHECKINS),
      };
      const unlocked = unlockTrophies(next, today);
      commit(next);
      return unlocked;
    },
    [data, commit]
  );

  const reload = useCallback(() => {
    if (profileId) setData(loadProgress(profileId));
  }, [profileId]);

  return { data, recordSession, addCheckin, reload };
}
