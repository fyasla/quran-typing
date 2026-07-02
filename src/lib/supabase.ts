// Client Supabase (comptes + synchronisation).
// Si les variables VITE_SUPABASE_* ne sont pas définies, le client vaut null :
// l'app fonctionne alors en mode 100 % local (profils invités), sans UI compte.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

/** Vrai si les fonctionnalités cloud (compte, sync) sont disponibles */
export const cloudEnabled = supabase !== null;
