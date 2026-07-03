// Moteur de frappe : construit la séquence de tokens d'une page
// et gère l'avancement caractère par caractère selon les réglages.

import type { HarakatMode, PageData, SmallLettersMode } from '../types.ts';
import {
  BASMALA,
  charMatches,
  classifyChar,
  isCombining,
  isMarkChar,
  isOptional,
  isRequired,
  type CharKind,
} from './charsets.ts';

export interface Token {
  ch: string;
  kind: CharKind;
  /** Index de ligne dans page.lines (-1 pour les espaces inter-mots) */
  line: number;
  /** Index du mot dans la ligne (-1 pour les espaces) */
  word: number;
  /** Index du caractère dans le mot */
  charIdx: number;
}

export const ST_PENDING = 0;
export const ST_CORRECT = 1;
export const ST_AUTO = 2;

export interface EngineSettings {
  harakatMode: HarakatMode;
  smallLetters: SmallLettersMode;
}

export interface TypingSnapshot {
  /** Statut de chaque token (ST_*) */
  status: Uint8Array;
  /** 1 si une erreur a déjà été commise sur ce token */
  hadError: Uint8Array;
  /** Position courante (index du premier token non complété) */
  pos: number;
  /** Vrai si la page est terminée */
  done: boolean;
  /** Nombre total d'erreurs */
  errorCount: number;
  /** Nombre de frappes correctes */
  correctCount: number;
  /** Dernier caractère erroné tapé (null après une frappe correcte) */
  lastWrongChar: string | null;
}

/** État sérialisé d'une page en cours (reprise après fermeture) */
export interface SerializedState {
  /** status en base64 */
  s: string;
  /** hadError en base64 */
  e: string;
  errorCount: number;
  correctCount: number;
}

function u8ToB64(a: Uint8Array): string {
  let s = '';
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToU8(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

/** Mots de la basmala, pré-découpés */
const BASMALA_WORDS = BASMALA.split(' ');

/**
 * Construit la liste des tokens d'une page.
 * Les mots typables sont séparés par un token espace ;
 * les médaillons de fin de verset sont des tokens auto.
 */
export function buildTokens(page: PageData): Token[] {
  const tokens: Token[] = [];
  let firstTypableWordDone = false;

  page.lines.forEach((line, lineIdx) => {
    if (line.type === 'surah') return;

    const words =
      line.type === 'basmala'
        ? BASMALA_WORDS.map((t) => ({ t, e: 0 as const }))
        : (line.words ?? []);

    words.forEach((word, wordIdx) => {
      if (word.e) {
        // Médaillon de fin de verset : auto, pas d'espace requis autour
        tokens.push({ ch: word.t, kind: 'marker', line: lineIdx, word: wordIdx, charIdx: 0 });
        return;
      }
      if (firstTypableWordDone) {
        tokens.push({ ch: ' ', kind: 'space', line: -1, word: -1, charIdx: 0 });
      }
      firstTypableWordDone = true;
      const chars = [...word.t];
      chars.forEach((ch, charIdx) => {
        // Espace interne à un mot (ex. après l'ornement ۞) : automatique,
        // seul l'espace séparateur entre les mots est tapé
        const kind = ch === ' ' || ch === '\u00A0' ? 'other' : classifyChar(ch);
        tokens.push({ ch, kind, line: lineIdx, word: wordIdx, charIdx });
      });
    });
  });

  return tokens;
}

export class TypingEngine {
  readonly tokens: Token[];
  private status: Uint8Array;
  private hadError: Uint8Array;
  private pos = 0;
  private errorCount = 0;
  private correctCount = 0;
  private lastWrongChar: string | null = null;
  private settings: EngineSettings;

  constructor(tokens: Token[], settings: EngineSettings, initial?: SerializedState) {
    this.tokens = tokens;
    this.settings = settings;
    this.status = new Uint8Array(tokens.length);
    this.hadError = new Uint8Array(tokens.length);
    if (initial) this.restore(initial);
    this.advanceAuto();
  }

  /** État compact pour reprise ultérieure */
  serialize(): SerializedState {
    return {
      s: u8ToB64(this.status),
      e: u8ToB64(this.hadError),
      errorCount: this.errorCount,
      correctCount: this.correctCount,
    };
  }

  /** Restaure un état sérialisé ; ignoré silencieusement s'il ne correspond pas à la page */
  private restore(initial: SerializedState) {
    try {
      const status = b64ToU8(initial.s);
      const hadError = b64ToU8(initial.e);
      if (status.length !== this.tokens.length || hadError.length !== this.tokens.length) {
        return;
      }
      this.status = status;
      this.hadError = hadError;
      this.errorCount = initial.errorCount;
      this.correctCount = initial.correctCount;
      // Repositionne le curseur sur le premier token non complété
      this.pos = 0;
      while (this.pos < this.tokens.length && this.status[this.pos] !== ST_PENDING) {
        this.pos++;
      }
    } catch {
      // état corrompu → page vierge
    }
  }

  setSettings(settings: EngineSettings) {
    this.settings = settings;
    this.advanceAuto();
  }

  /** Avance automatiquement sur les tokens non requis (waqf, médaillons, harakats selon mode…) */
  private advanceAuto() {
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (this.status[this.pos] !== ST_PENDING) {
        this.pos++;
        continue;
      }
      // Optionnel (petite lettre en mode none) : reste en attente — sera
      // tapé, ou complété quand le token requis suivant sera validé
      if (isOptional(t.kind, this.settings.harakatMode)) break;
      if (!isRequired(t.kind, this.settings.harakatMode)) {
        this.status[this.pos] = ST_AUTO;
        this.pos++;
        continue;
      }
      break;
    }
    this.finalizeTrailing();
  }

  /** S'il ne reste aucun token requis, complète les optionnels restants (fin de page) */
  private finalizeTrailing() {
    for (let i = this.pos; i < this.tokens.length; i++) {
      if (
        this.status[i] === ST_PENDING &&
        isRequired(this.tokens[i].kind, this.settings.harakatMode)
      ) {
        return;
      }
    }
    for (let i = this.pos; i < this.tokens.length; i++) {
      if (this.status[i] === ST_PENDING) this.status[i] = ST_AUTO;
    }
    this.pos = this.tokens.length;
  }

  /**
   * Traite un caractère tapé.
   * Retourne 'ok' | 'error' | 'ignored' | 'done'.
   */
  handleChar(typed: string): 'ok' | 'error' | 'ignored' | 'done' {
    if (this.pos >= this.tokens.length) return 'done';

    const { harakatMode, smallLetters } = this.settings;
    const cur = this.tokens[this.pos];

    // Espace : accepte espace et entrée
    if (cur.kind === 'space') {
      if (typed === ' ' || typed === '\n' || typed === '\u00A0') {
        this.accept(this.pos);
        return 'ok';
      }
      // Tolérance : marque tapée alors qu'un espace est attendu → ignorée en mode none
      if (harakatMode === 'none' && isMarkChar(typed)) return 'ignored';
      this.fail(typed);
      return 'error';
    }

    // Petite lettre optionnelle (mode none) : priorité au prochain token
    // REQUIS — s'il est validé par la frappe, les optionnels sautés se
    // complètent ; sinon la petite lettre reste candidate (lettre normale
    // en mode souple). La priorité au requis résout l'ambiguïté du ya
    // suscrit suivi d'un vrai ya (ex. ٱلۡأُمِّيِّـۧنَ page 364).
    if (isOptional(cur.kind, harakatMode)) {
      let i = this.pos;
      while (
        i < this.tokens.length &&
        (this.status[i] !== ST_PENDING || !isRequired(this.tokens[i].kind, harakatMode))
      ) {
        i++;
      }
      if (i < this.tokens.length) {
        const target = this.tokens[i];
        const matches =
          target.kind === 'space'
            ? typed === ' ' || typed === '\n' || typed === '\u00A0'
            : charMatches(typed, target.ch, smallLetters);
        if (matches) {
          for (let j = this.pos; j < i; j++) {
            if (this.status[j] === ST_PENDING) this.status[j] = ST_AUTO;
          }
          this.accept(i);
          return 'ok';
        }
      }
    }

    // Candidats : le token courant + (si marques combinantes) les marques
    // suivantes du même cluster, dans n'importe quel ordre
    const candidates: number[] = [this.pos];
    if (isCombining(cur.kind)) {
      for (let i = this.pos + 1; i < this.tokens.length; i++) {
        const t = this.tokens[i];
        if (!isCombining(t.kind)) break;
        if (this.status[i] === ST_PENDING && isRequired(t.kind, harakatMode)) {
          candidates.push(i);
        }
      }
    }

    for (const i of candidates) {
      if (charMatches(typed, this.tokens[i].ch, smallLetters)) {
        this.accept(i);
        return 'ok';
      }
    }

    // En mode sans harakats, les marques tapées sont ignorées (ni erreur ni avancée)
    if (harakatMode === 'none' && isMarkChar(typed)) return 'ignored';
    // Les signes de pause tapés sont toujours ignorés
    if (classifyChar(typed) === 'waqf') return 'ignored';

    this.fail(typed);
    return 'error';
  }

  /** Traite une chaîne (mapping personnalisé pouvant émettre plusieurs caractères, ex. « لا ») */
  handleText(text: string): 'ok' | 'error' | 'ignored' | 'done' {
    let result: 'ok' | 'error' | 'ignored' | 'done' = 'ignored';
    for (const ch of text) {
      result = this.handleChar(ch);
      if (result === 'error') break;
    }
    return result;
  }

  private accept(i: number) {
    this.status[i] = ST_CORRECT;
    this.correctCount++;
    this.lastWrongChar = null;
    // Avance pos jusqu'au premier token pending
    while (this.pos < this.tokens.length && this.status[this.pos] !== ST_PENDING) {
      this.pos++;
    }
    this.advanceAuto();
  }

  private fail(typed: string) {
    this.hadError[this.pos] = 1;
    this.errorCount++;
    this.lastWrongChar = typed;
  }

  snapshot(): TypingSnapshot {
    return {
      status: this.status.slice(),
      hadError: this.hadError.slice(),
      pos: this.pos,
      done: this.pos >= this.tokens.length,
      errorCount: this.errorCount,
      correctCount: this.correctCount,
      lastWrongChar: this.lastWrongChar,
    };
  }
}
