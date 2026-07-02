import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PageData } from '../types';
import {
  buildTokens,
  TypingEngine,
  type EngineSettings,
  type Token,
  type TypingSnapshot,
} from '../typing/engine';

export interface UseTypingEngine {
  tokens: Token[];
  snapshot: TypingSnapshot | null;
  handleText: (text: string) => void;
  restart: () => void;
  /** Vrai pendant ~150 ms après une frappe erronée (feedback visuel/sonore) */
  errorFlash: boolean;
}

export function useTypingEngine(
  page: PageData | null,
  settings: EngineSettings
): UseTypingEngine {
  const tokens = useMemo(() => (page ? buildTokens(page) : []), [page]);
  const engineRef = useRef<TypingEngine | null>(null);
  const [snapshot, setSnapshot] = useState<TypingSnapshot | null>(null);
  const [errorFlash, setErrorFlash] = useState(false);
  const flashTimer = useRef<number | undefined>(undefined);

  // (Re)création du moteur quand la page change
  useEffect(() => {
    if (!page) {
      engineRef.current = null;
      setSnapshot(null);
      return;
    }
    const engine = new TypingEngine(tokens, settings);
    engineRef.current = engine;
    setSnapshot(engine.snapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, page]);

  // Mise à jour des réglages sans perdre la progression
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSettings(settings);
    setSnapshot(engine.snapshot());
  }, [settings]);

  const handleText = useCallback((text: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const result = engine.handleText(text);
    setSnapshot(engine.snapshot());
    if (result === 'error') {
      setErrorFlash(true);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setErrorFlash(false), 150);
    }
  }, []);

  const restart = useCallback(() => {
    const engine = new TypingEngine(tokens, settings);
    engineRef.current = engine;
    setSnapshot(engine.snapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, settings]);

  return { tokens, snapshot, handleText, restart, errorFlash };
}
