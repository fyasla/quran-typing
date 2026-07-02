// Synchronisation de la progression avec Supabase (table public.progress,
// une ligne par utilisateur). Hors-ligne d'abord : le cache local
// (localStorage via progress.ts) reste la source immédiate, le cloud suit.

import { supabase } from '../lib/supabase';
import { useAuth } from './auth';
import { mergeProgress } from './merge';
import { loadProgress, type ProgressData } from './progress';

/** Id de progression locale d'un utilisateur connecté */
export const cloudProfileId = (uid: string) => `cloud-${uid}`;

function saveLocal(profileId: string, data: ProgressData) {
  localStorage.setItem(`quran-typing-progress-${profileId}`, JSON.stringify(data));
}

/**
 * Récupère les données cloud, les fusionne avec le cache local (et, à la
 * première connexion, avec le profil local actif — migration douce) puis
 * réécrit cache + cloud. Retourne les données fusionnées.
 */
export async function pullAndMerge(
  uid: string,
  localProfileId: string | null
): Promise<ProgressData | null> {
  if (!supabase) return null;
  const setSyncState = useAuth.getState().setSyncState;
  try {
    const { data: row, error } = await supabase
      .from('progress')
      .select('data')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;

    let merged = loadProgress(cloudProfileId(uid));
    if (row?.data) merged = mergeProgress(merged, row.data as ProgressData);

    // Première connexion sur cet appareil : rapatrie le profil local actif
    const migrationKey = `quran-typing-migrated-${uid}`;
    if (localProfileId && !localStorage.getItem(migrationKey)) {
      merged = mergeProgress(merged, loadProgress(localProfileId));
      localStorage.setItem(migrationKey, '1');
    }

    saveLocal(cloudProfileId(uid), merged);
    await pushNow(uid, merged);
    setSyncState('synced');
    return merged;
  } catch {
    setSyncState(navigator.onLine ? 'error' : 'offline');
    return null;
  }
}

async function pushNow(uid: string, data: ProgressData) {
  if (!supabase) return;
  const { error } = await supabase.from('progress').upsert({
    user_id: uid,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

let pushTimer: number | undefined;

/** Pousse la progression vers le cloud, débouncé (~2 s), re-tenté au retour en ligne */
export function schedulePush(uid: string) {
  if (!supabase) return;
  const setSyncState = useAuth.getState().setSyncState;
  setSyncState('pending');
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(async () => {
    try {
      await pushNow(uid, loadProgress(cloudProfileId(uid)));
      useAuth.getState().setSyncState('synced');
    } catch {
      useAuth.getState().setSyncState(navigator.onLine ? 'error' : 'offline');
    }
  }, 2000);
}

// Retour en ligne : nouvelle tentative de push si nécessaire
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const { user, syncState } = useAuth.getState();
    if (user && (syncState === 'offline' || syncState === 'error')) {
      schedulePush(user.id);
    }
  });
}
