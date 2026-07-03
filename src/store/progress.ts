// Progression par profil : historique de sessions + cartes de révision espacée.
// Stockée dans localStorage sous une clé par profil.

import { useCallback, useEffect, useState } from 'react';
import {
  newCard,
  reviewCard,
  toDay,
  type ReviewCard,
  type SessionRecord,
} from '../review/srs';

export interface ProgressData {
  version: 1;
  sessions: SessionRecord[];
  cards: Record<number, ReviewCard>;
}

const KEY_PREFIX = 'quran-typing-progress-';
/** Limite d'historique pour éviter une croissance illimitée du localStorage */
const MAX_SESSIONS = 1000;

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
    saveProgress(profileId, { version: 1, sessions: data.sessions, cards: data.cards });
    return true;
  } catch {
    return false;
  }
}

export interface UseProgress {
  data: ProgressData;
  /** Enregistre une page terminée et met à jour sa carte de révision. Retourne la carte planifiée. */
  recordSession: (
    page: number,
    accuracy: number,
    errors: number,
    durationMs: number,
    verses: number
  ) => ReviewCard;
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

  const recordSession = useCallback(
    (
      page: number,
      accuracy: number,
      errors: number,
      durationMs: number,
      verses: number
    ): ReviewCard => {
      const today = toDay(new Date());
      const session: SessionRecord = {
        page,
        date: new Date().toISOString(),
        accuracy,
        errors,
        durationMs,
        verses,
      };
      const prev = data.cards[page] ?? newCard(page, today);
      const card = reviewCard(prev, accuracy, today);
      const next: ProgressData = {
        version: 1,
        sessions: [...data.sessions, session].slice(-MAX_SESSIONS),
        cards: { ...data.cards, [page]: card },
      };
      setData(next);
      if (profileId) saveProgress(profileId, next);
      return card;
    },
    [data, profileId]
  );

  const reload = useCallback(() => {
    if (profileId) setData(loadProgress(profileId));
  }, [profileId]);

  return { data, recordSession, reload };
}
