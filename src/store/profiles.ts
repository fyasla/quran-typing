// Profils locaux : plusieurs utilisateurs sur le même navigateur.
// Chaque profil a ses propres données de révision (voir progress.ts).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deleteProgress } from './progress';

export interface Profile {
  id: string;
  name: string;
  /** Date de création (ISO) */
  createdAt: string;
}

interface ProfilesState {
  profiles: Profile[];
  activeId: string | null;
  createProfile: (name: string) => void;
  switchProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeId: null,
      createProfile: (name) => {
        const profile: Profile = {
          id: makeId(),
          name: name.trim(),
          createdAt: new Date().toISOString(),
        };
        set({ profiles: [...get().profiles, profile], activeId: profile.id });
      },
      switchProfile: (id) => {
        if (get().profiles.some((p) => p.id === id)) set({ activeId: id });
      },
      renameProfile: (id, name) => {
        set({
          profiles: get().profiles.map((p) =>
            p.id === id ? { ...p, name: name.trim() } : p
          ),
        });
      },
      deleteProfile: (id) => {
        const profiles = get().profiles.filter((p) => p.id !== id);
        deleteProgress(id);
        set({
          profiles,
          activeId: get().activeId === id ? (profiles[0]?.id ?? null) : get().activeId,
        });
      },
    }),
    { name: 'quran-typing-profiles' }
  )
);

/** Profil actif (null si aucun) */
export function useActiveProfile(): Profile | null {
  const { profiles, activeId } = useProfiles();
  return profiles.find((p) => p.id === activeId) ?? null;
}
