// Reprise mi-page : sauvegarde de l'état de frappe de la page en cours
// (une seule page en cours à la fois, par profil).

import type { HarakatMode } from '../types';
import type { SerializedState } from '../typing/engine';

export interface ResumeRecord {
  page: number;
  /** Le mode harakats au moment de la sauvegarde : l'état n'est valide que pour ce mode */
  harakatMode: HarakatMode;
  state: SerializedState;
}

const key = (profileId: string | null) => `quran-typing-resume-${profileId ?? 'guest'}`;

export function loadResume(profileId: string | null): ResumeRecord | null {
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return null;
    const rec = JSON.parse(raw) as ResumeRecord;
    if (typeof rec.page !== 'number' || !rec.state) return null;
    return rec;
  } catch {
    return null;
  }
}

export function saveResume(profileId: string | null, rec: ResumeRecord) {
  try {
    localStorage.setItem(key(profileId), JSON.stringify(rec));
  } catch {
    // stockage plein/indisponible : la reprise est un confort, pas une donnée critique
  }
}

export function clearResume(profileId: string | null) {
  localStorage.removeItem(key(profileId));
}
