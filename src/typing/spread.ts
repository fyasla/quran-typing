// Pagination « livre relié » pour le mode 2 pages : calcule la paire de
// pages à afficher côte à côte, et construit un instantané statique pour
// la page voisine (non interactive, jamais tapée).

import { ST_AUTO, ST_PENDING, type TypingSnapshot } from './engine.ts';

/** Nombre total de pages du mushaf (dupliqué depuis store/settings.ts pour
 * garder ce module pur, sans dépendance au store — testable en Node nu). */
const TOTAL_PAGES = 604;

export interface Spread {
  /** Page à droite (lue en premier en RTL) */
  right: number;
  /** Page à gauche, ou null si `right` est seule (page 1 ou dernière page) */
  left: number | null;
}

/**
 * Un vrai mushaf relié : la page 1 et la dernière page sont seules ; sinon
 * les pages se relient par paires (droite = numéro pair, gauche = pair+1).
 */
export function getSpread(page: number): Spread {
  if (page <= 1 || page >= TOTAL_PAGES) return { right: page, left: null };
  const right = page % 2 === 0 ? page : page - 1;
  return { right, left: right + 1 };
}

/**
 * Instantané figé pour une page voisine non interactive : `done` uniforme
 * (tout l'encre si déjà complétée au moins une fois, tout fantôme sinon),
 * pas de curseur ni de badge d'erreur (`pos` = longueur, `lastWrongChar` = null).
 */
export function buildStaticSnapshot(tokenCount: number, done: boolean): TypingSnapshot {
  return {
    status: new Uint8Array(tokenCount).fill(done ? ST_AUTO : ST_PENDING),
    hadError: new Uint8Array(tokenCount),
    pos: tokenCount,
    done: true,
    errorCount: 0,
    correctCount: done ? tokenCount : 0,
    lastWrongChar: null,
  };
}
