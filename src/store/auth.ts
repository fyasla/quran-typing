// Session utilisateur Supabase : état global + actions d'authentification.
// Tout est inopérant (user null, actions rejetées) si Supabase n'est pas configuré.

import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';

interface AuthState {
  /** Utilisateur connecté (null si déconnecté ou cloud désactivé) */
  user: User | null;
  /** Vrai tant que la session initiale n'a pas été lue */
  loading: boolean;
  /** État de la synchronisation des données */
  syncState: SyncState;
  setSyncState: (s: SyncState) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}

function required() {
  if (!supabase) throw new Error('cloud-disabled');
  return supabase;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: supabase !== null,
  syncState: 'synced',
  setSyncState: (syncState) => set({ syncState }),

  signUp: async (email, password) => {
    const { error } = await required().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  signIn: async (email, password) => {
    const { error } = await required().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const { error } = await required().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await required().auth.signOut();
    if (error) throw error;
  },

  resetPassword: async (email) => {
    const { error } = await required().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  resendConfirmation: async (email) => {
    const { error } = await required().auth.resend({ type: 'signup', email });
    if (error) throw error;
  },
}));

// Abonnement unique à la session (module chargé une fois)
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuth.setState({ user: data.session?.user ?? null, loading: false });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ user: session?.user ?? null, loading: false });
  });
}
