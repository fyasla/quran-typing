import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { KeyboardMode } from '../types';
import { mapKeyEvent } from '../typing/keymap';

interface Props {
  keyboardMode: KeyboardMode;
  onText: (text: string) => void;
  children: ReactNode;
}

/**
 * Zone de frappe : un input invisible capture le clavier.
 * - mode « system » : on lit les caractères produits par la disposition de l'OS (beforeinput)
 * - mode « custom » : on mappe les touches physiques (Arabic 101 émulé)
 */
export default function TypingArea({ keyboardMode, onText, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const { t } = useTranslation();

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const ev = e.nativeEvent as InputEvent;
    ev.preventDefault();
    if (keyboardMode !== 'system') return;
    if (ev.data) onText(ev.data);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Gérer l'espace et Enter dans tous les modes
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onText(' ');
      return;
    }

    if (keyboardMode !== 'custom') return;
    const mapped = mapKeyEvent(e);
    if (mapped !== null) {
      e.preventDefault();
      onText(mapped);
    }
  };

  return (
    <div className="typing-area" onMouseDown={(e) => { e.preventDefault(); focusInput(); }}>
      <input
        ref={inputRef}
        className="hidden-input"
        type="text"
        value=""
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        onChange={() => {}}
        onBeforeInput={handleBeforeInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="zone de frappe"
      />
      {children}
      {!focused && (
        <div className="focus-hint" role="button" tabIndex={-1}>
          {t('typing.clickToFocus')}
        </div>
      )}
    </div>
  );
}
