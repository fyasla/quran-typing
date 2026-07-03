import { useEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, PageData, PageLine } from '../types';
import { BASMALA } from '../typing/charsets';
import {
  ST_AUTO,
  ST_CORRECT,
  ST_PENDING,
  type Token,
  type TypingSnapshot,
} from '../typing/engine';

interface Props {
  page: PageData;
  tokens: Token[];
  snapshot: TypingSnapshot;
  blindMode: boolean;
  errorFlash: boolean;
  chapters: Chapter[];
}

const BASMALA_WORDS = BASMALA.split(' ');

// L'API CSS Custom Highlight permet de colorer des plages de caractères
// SANS découper le texte en spans — indispensable car les ligatures de la
// police QPC s'étendent sur plusieurs codepoints et seraient peintes en
// entier avec la couleur du premier span.
const supportsHighlights =
  typeof CSS !== 'undefined' &&
  'highlights' in CSS &&
  typeof Highlight !== 'undefined';

const HL_NAMES = ['qt-ok', 'qt-err', 'qt-caret', 'qt-caret-space', 'qt-caret-flash'] as const;

/** Représentation lisible d'un caractère erroné (espaces et entrée rendus visibles) */
function displayWrongChar(ch: string): string {
  if (ch === ' ' || ch === '\u00A0') return '␣';
  if (ch === '\n') return '⏎';
  return ch;
}

/** Index des tokens par mot : clé "ligne:mot" → index de token par caractère */
function buildTokenMap(tokens: Token[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  tokens.forEach((t, i) => {
    if (t.line < 0) return;
    const key = `${t.line}:${t.word}`;
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr[t.charIdx] = i;
  });
  return map;
}

export default function MushafPage({
  page,
  tokens,
  snapshot,
  blindMode,
  errorFlash,
  chapters,
}: Props) {
  const pageRef = useRef<HTMLDivElement>(null);
  const tokenMap = useMemo(() => buildTokenMap(tokens), [tokens]);
  const [wrongCharPos, setWrongCharPos] = useState<{ left: number; top: number } | null>(
    null
  );
  /**
   * Remplissage progressif du mot en cours : la couleur des ::highlight ne se
   * peint que par ligature complète (écritures complexes), alors une copie du
   * texte, colorée et découpée géométriquement à la largeur tapée, est
   * superposée — le glyphe noircit ainsi frappe après frappe, même dans الله.
   */
  const [fill, setFill] = useState<{
    key: string;
    runs: { left: number; width: number; err: boolean }[];
  } | null>(null);
  const fillSig = useRef('');

  // Position du curseur (reste sur l'espace si c'est un espace qui est attendu)
  const caretIdx = useMemo(() => {
    if (snapshot.done || snapshot.pos >= tokens.length) return -1;
    return snapshot.pos;
  }, [snapshot, tokens]);

  // ===== Badge « mauvais caractère » : positionné au-dessus du caractère attendu =====
  useEffect(() => {
    const root = pageRef.current;
    if (!snapshot.lastWrongChar || !root || caretIdx < 0) {
      setWrongCharPos(null);
      return;
    }
    const token = tokens[caretIdx];
    let rect: DOMRect | null = null;
    if (token.kind === 'space') {
      rect = root.querySelector(`[data-space="${caretIdx}"]`)?.getBoundingClientRect() ?? null;
    } else if (supportsHighlights) {
      const textNode = root.querySelector(`[data-w="${token.line}:${token.word}"]`)?.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const len = (textNode.textContent ?? '').length;
        if (token.charIdx < len) {
          const r = new Range();
          r.setStart(textNode, token.charIdx);
          r.setEnd(textNode, token.charIdx + 1);
          rect = r.getBoundingClientRect();
        }
      }
    } else {
      rect = root.querySelector('.caret')?.getBoundingClientRect() ?? null;
    }
    if (!rect) {
      setWrongCharPos(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    setWrongCharPos({
      left: rect.left + rect.width / 2 - rootRect.left,
      top: rect.top - rootRect.top,
    });
  }, [snapshot, tokens, caretIdx]);

  // ===== Chemin moderne : plages colorées via CSS.highlights =====
  useEffect(() => {
    if (!supportsHighlights) return;
    const root = pageRef.current;
    if (!root) return;

    const okRanges: Range[] = [];
    const errRanges: Range[] = [];
    let caretRange: Range | null = null;
    let activeFill: typeof fill = null;

    // Si le curseur est sur un espace, le trouver
    const caretToken = caretIdx >= 0 ? tokens[caretIdx] : null;
    const caretWordKey =
      caretToken && caretToken.line >= 0 ? `${caretToken.line}:${caretToken.word}` : null;
    if (caretToken && caretToken.kind === 'space') {
      // Trouver l'élément espace dans le DOM
      const spaceEl = root.querySelector(`[data-space="${caretIdx}"]`);
      if (spaceEl && spaceEl.firstChild) {
        caretRange = new Range();
        caretRange.setStart(spaceEl.firstChild, 0);
        caretRange.setEnd(spaceEl.firstChild, 1);
      }
    }

    root.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => {
      const indices = tokenMap.get(el.dataset.w as string);
      if (!indices) return;
      const textNode = el.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
      const len = (textNode.textContent ?? '').length;

      // Fusionne les caractères contigus de même état en une seule plage
      // (0 = en attente, 1 = correct, 2 = erreur)
      const isActiveWord = el.dataset.w === caretWordKey;
      const wordLeft = isActiveWord ? el.getBoundingClientRect().left : 0;
      let runState = 0;
      let runStart = 0;
      const flush = (end: number) => {
        if (runState === 0 || end <= runStart) return;
        const r = new Range();
        r.setStart(textNode, runStart);
        r.setEnd(textNode, end);
        (runState === 1 ? okRanges : errRanges).push(r);
        // Mot en cours : mesure géométrique du run pour le remplissage superposé
        if (isActiveWord) {
          const rect = r.getBoundingClientRect();
          if (!activeFill) activeFill = { key: el.dataset.w as string, runs: [] };
          activeFill.runs.push({
            left: rect.left - wordLeft,
            width: rect.width,
            err: runState === 2,
          });
        }
      };

      for (let ci = 0; ci < len; ci++) {
        const ti = indices[ci];
        let st = 0;
        if (ti !== undefined) {
          const status = snapshot.status[ti];
          const hadError = snapshot.hadError[ti] === 1;
          if (status === ST_CORRECT) {
            st = hadError ? 2 : 1;
          } else if (status === ST_AUTO && ti < snapshot.pos) {
            st = 1;
          } else if (status === ST_PENDING && hadError && !blindMode) {
            // Lettre courante mal tapée : rouge (caché en mode aveugle)
            st = 2;
          }
          if (ti === caretIdx) {
            caretRange = new Range();
            caretRange.setStart(textNode, ci);
            caretRange.setEnd(textNode, ci + 1);
          }
        }
        if (st !== runState) {
          flush(ci);
          runState = st;
          runStart = ci;
        }
      }
      flush(len);
    });

    CSS.highlights.set('qt-ok', new Highlight(...okRanges));
    CSS.highlights.set('qt-err', new Highlight(...errRanges));
    CSS.highlights.delete('qt-caret');
    CSS.highlights.delete('qt-caret-flash');
    if (caretRange) {
      const name = errorFlash ? 'qt-caret-flash' : 'qt-caret';
      CSS.highlights.set(name, new Highlight(caretRange));
    }

    // Ne re-rend le remplissage que s'il a changé
    const sig = JSON.stringify(activeFill);
    if (sig !== fillSig.current) {
      fillSig.current = sig;
      setFill(activeFill);
    }
  }, [snapshot, tokenMap, tokens, caretIdx, blindMode, errorFlash]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (!supportsHighlights) return;
      for (const n of HL_NAMES) CSS.highlights.delete(n);
    };
  }, []);

  // ===== Chemin de secours : spans par caractère (navigateurs anciens) =====
  const charClass = (tokenIdx: number | undefined, isSpace = false): string => {
    if (tokenIdx === undefined) return 'c-pending';
    const st = snapshot.status[tokenIdx];
    const hadError = snapshot.hadError[tokenIdx] === 1;
    const classes: string[] = [];
    if (st === ST_PENDING) {
      classes.push(hadError ? 'c-pending c-wrong-now' : 'c-pending');
    } else if (st === ST_CORRECT) {
      classes.push(hadError ? 'c-error' : 'c-ok');
    } else if (st === ST_AUTO) {
      // Auto avant le curseur = passé (affiché), après = pas encore atteint
      classes.push(tokenIdx < snapshot.pos ? 'c-auto' : 'c-pending');
    }
    if (tokenIdx === caretIdx) {
      classes.push('caret');
      if (errorFlash && !isSpace) classes.push('flash');
    }
    return classes.join(' ');
  };

  const renderWordLegacy = (
    lineIdx: number,
    wordIdx: number,
    text: string,
    isMarker: boolean
  ) => {
    const indices = tokenMap.get(`${lineIdx}:${wordIdx}`);
    const chars = [...text];
    return (
      <span className={isMarker ? 'word marker' : 'word'} key={wordIdx}>
        {isMarker ? '\u06DD' : null}
        {chars.map((ch, ci) => (
          // Le médaillon (marker) est un token unique pour tous ses chiffres
          <span key={ci} className={charClass(isMarker ? indices?.[0] : indices?.[ci])}>
            {ch}
          </span>
        ))}
      </span>
    );
  };

  const renderWord = (lineIdx: number, wordIdx: number, text: string, isMarker: boolean) => {
    if (!supportsHighlights) return renderWordLegacy(lineIdx, wordIdx, text, isMarker);

    if (isMarker) {
      // Médaillon de fin de verset : token unique, jamais tapé — son état
      // (passé ou non) est géré par classe, pas par plage.
      const ti = tokenMap.get(`${lineIdx}:${wordIdx}`)?.[0];
      const done = ti !== undefined && snapshot.status[ti] === ST_AUTO && ti < snapshot.pos;
      return (
        <span className={`word marker${done ? ' done' : ''}`} key={wordIdx}>
          {'\u06DD' + text}
        </span>
      );
    }

    // Un seul nœud texte par mot → ligatures intactes.
    // NB : le nœud texte doit rester firstChild (les plages s'y accrochent).
    const key = `${lineIdx}:${wordIdx}`;
    return (
      <span className="word" data-w={key} key={wordIdx}>
        {text}
        {fill && fill.key === key && (
          <span aria-hidden="true">
            {fill.runs.map((r, i) => (
              <span
                key={i}
                className={`word-fill${r.err ? ' err' : ''}`}
                style={{ left: r.left, width: r.width }}
              >
                <span style={{ left: -r.left }}>{text}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    );
  };

  const renderLine = (line: PageLine, lineIdx: number) => {
    if (line.type === 'surah') {
      const chapter = chapters.find((c) => c.id === line.surah);
      return (
        <div className="line surah-header" key={lineIdx}>
          <span className="surah-frame">
            {chapter ? `سُورَةُ ${chapter.nameArabic}` : ''}
          </span>
        </div>
      );
    }

    const isBasmala = line.type === 'basmala';
    const words = isBasmala ? BASMALA_WORDS : (line.words ?? []).map((w) => w.t);
    const markers = isBasmala ? [] : (line.words ?? []).map((w) => w.e === 1);
    const centered = isBasmala || line.c === 1;

    // Trouve les indices des espaces entre les mots de cette ligne
    const spaceIndices: number[] = [];
    tokens.forEach((t, i) => {
      if (t.kind === 'space') {
        // Vérifie si cet espace est entre des mots de cette ligne
        const prevToken = i > 0 ? tokens[i - 1] : null;
        const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;
        if (prevToken?.line === lineIdx && (nextToken?.line === lineIdx || !nextToken)) {
          spaceIndices.push(i);
        }
      }
    });

    const elements: React.ReactNode[] = [];
    words.forEach((text, wi) => {
      if (wi > 0 && !markers[wi - 1]) {
        // Ajouter un espace entre les mots (sauf après un marker)
        const spaceIdx = spaceIndices.shift();
        if (spaceIdx !== undefined) {
          const isSpaceCaret = caretIdx === spaceIdx;
          const spaceStatus = snapshot.status[spaceIdx];
          const spaceClass = spaceStatus === ST_CORRECT ? 'space-ok' :
                             isSpaceCaret ? 'space-caret' : 'space-pending';
          elements.push(
            <span
              key={`space-${wi}`}
              className={`word-space ${spaceClass}`}
              data-space={spaceIdx}
            >
              {' '}
            </span>
          );
        }
      }
      elements.push(renderWord(lineIdx, wi, text, markers[wi] ?? false));
    });

    return (
      <div className={`line ayah${centered ? ' centered' : ''}`} key={lineIdx}>
        {elements}
      </div>
    );
  };

  return (
    <div
      ref={pageRef}
      className={`mushaf-page${supportsHighlights ? ' hl' : ''}${blindMode ? ' blind' : ''}${errorFlash ? ' page-error' : ''}`}
      dir="rtl"
      lang="ar"
    >
      {page.lines.map((line, idx) => renderLine(line, idx))}
      {snapshot.lastWrongChar && wrongCharPos && (
        <div
          className="wrong-char-badge"
          style={{ left: wrongCharPos.left, top: wrongCharPos.top }}
          aria-hidden="true"
        >
          {displayWrongChar(snapshot.lastWrongChar)}
        </div>
      )}
    </div>
  );
}
