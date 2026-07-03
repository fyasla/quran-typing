import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MushafPage from '../components/MushafPage';
import TypingArea from '../components/TypingArea';
import { loadPage } from '../data/loader';
import { useTypingEngine } from '../hooks/useTypingEngine';
import type { ReviewCard } from '../review/srs';
import { useAuth } from '../store/auth';
import type { UseProgress } from '../store/progress';
import { clearResume, loadResume, saveResume } from '../store/resume';
import { schedulePush } from '../store/sync';
import { TOTAL_PAGES, useSettings } from '../store/settings';
import type { Chapter, PageData } from '../types';

interface Props {
  chapters: Chapter[];
  /** Id de progression effectif (compte cloud ou profil local, null = invité pur) */
  profileId: string | null;
  recordSession: UseProgress['recordSession'];
  /** Remonte l'avancée en direct (fraction de page, versets passés) vers App */
  onLive: (live: { pageFraction: number; verses: number }) => void;
}

/** Page de lecture/frappe : moteur, reprise mi-page, enregistrement de session */
export default function ReadPage({ chapters, profileId, recordSession, onLive }: Props) {
  const { t } = useTranslation();
  const { page, setPage, harakatMode, smallLetters, blindMode, keyboardMode } = useSettings();
  const { user } = useAuth();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loadError, setLoadError] = useState(false);
  /** Carte planifiée après la page terminée (prochaine échéance affichée) */
  const [scheduledCard, setScheduledCard] = useState<ReviewCard | null>(null);
  const startRef = useRef<number | null>(null);
  const recordedRef = useRef(false);

  // Chargement de la page courante
  useEffect(() => {
    let cancelled = false;
    setPageData(null);
    setLoadError(false);
    loadPage(page)
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const engineSettings = useMemo(
    () => ({ harakatMode, smallLetters }),
    [harakatMode, smallLetters]
  );

  // Reprise mi-page : état sauvegardé si même page et même mode harakats
  const initialState = useMemo(() => {
    const rec = loadResume(profileId);
    return rec && rec.page === page && rec.harakatMode === harakatMode ? rec.state : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, page]);

  const { tokens, snapshot, handleText, restart, errorFlash, getState } = useTypingEngine(
    pageData,
    engineSettings,
    initialState
  );

  // Sauvegarde de la progression en cours (et nettoyage à la complétion)
  useEffect(() => {
    if (!snapshot || tokens.length === 0) return;
    if (snapshot.done) {
      clearResume(profileId);
      return;
    }
    if (snapshot.correctCount === 0) return;
    const state = getState();
    if (state) saveResume(profileId, { page, harakatMode, state });
  }, [snapshot, tokens, profileId, page, harakatMode, getState]);

  // Nouvelle page = nouvelle session de frappe
  useEffect(() => {
    startRef.current = null;
    recordedRef.current = false;
    setScheduledCard(null);
  }, [page]);

  // Le chrono démarre à la première frappe
  const onText = useCallback(
    (text: string) => {
      if (startRef.current === null) startRef.current = Date.now();
      handleText(text);
    },
    [handleText]
  );

  const onRestart = useCallback(() => {
    startRef.current = null;
    recordedRef.current = false;
    setScheduledCard(null);
    clearResume(profileId);
    restart();
  }, [restart, profileId]);

  const accuracy =
    snapshot && snapshot.correctCount + snapshot.errorCount > 0
      ? Math.round(
          (snapshot.correctCount / (snapshot.correctCount + snapshot.errorCount)) * 100
        )
      : 100;

  // Versets de la page (médaillons) — pour l'objectif de rythme
  const pageVerses = useMemo(() => tokens.filter((t) => t.kind === 'marker').length, [tokens]);

  // Page terminée → enregistre la session et planifie la révision
  useEffect(() => {
    if (!snapshot?.done || recordedRef.current || tokens.length === 0) return;
    recordedRef.current = true;
    if (!profileId) return;
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    setScheduledCard(recordSession(page, accuracy, snapshot.errorCount, durationMs, pageVerses));
    if (user) schedulePush(user.id);
  }, [snapshot, tokens, profileId, user, recordSession, page, accuracy, pageVerses]);

  const progressRatio =
    snapshot && tokens.length > 0 ? Math.min(1, snapshot.pos / tokens.length) : 0;

  // Avancée en direct remontée à App (affichée sur la page Stats)
  useEffect(() => {
    if (!snapshot || snapshot.done || tokens.length === 0) {
      onLive({ pageFraction: 0, verses: 0 });
      return;
    }
    let verses = 0;
    for (let i = 0; i < snapshot.pos; i++) if (tokens[i].kind === 'marker') verses++;
    onLive({ pageFraction: snapshot.pos / tokens.length, verses });
  }, [snapshot, tokens, onLive]);

  return (
    <div className="read-page flex w-full flex-col">
      <div className="bg-muted h-1">
        <div
          className="bg-primary h-full transition-[width] duration-150"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      <div className="flex flex-1 items-start justify-center px-2 pt-4 pb-6 sm:px-3">
        {loadError && (
          <p className="load-error text-destructive mt-16 max-w-md text-center text-sm">
            {t('typing.loadError')}
          </p>
        )}
        {!loadError && (!pageData || !snapshot) && (
          <p className="loading text-muted-foreground mt-16 text-sm">{t('typing.loading')}</p>
        )}
        {pageData && snapshot && (
          <TypingArea keyboardMode={keyboardMode} onText={onText}>
            <MushafPage
              page={pageData}
              tokens={tokens}
              snapshot={snapshot}
              blindMode={blindMode}
              errorFlash={errorFlash}
              chapters={chapters}
            />
            {snapshot.done && (
              <div className="complete-overlay absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-[2px]">
                <div className="complete-card bg-card animate-in fade-in zoom-in-95 mx-4 w-full max-w-sm rounded-2xl border p-7 text-center shadow-xl duration-200">
                  <CheckCircle2 className="text-primary mx-auto mb-3 size-10" strokeWidth={1.8} />
                  <h2 className="text-primary text-xl font-semibold">
                    {t('typing.pageComplete')}
                  </h2>
                  <p className="text-muted-foreground mt-1.5 text-sm">
                    {t('typing.accuracy')} : {accuracy}% — {snapshot.errorCount}{' '}
                    {t('typing.errors')}
                  </p>
                  {scheduledCard && (
                    <p className="next-review bg-accent text-accent-foreground mt-3 rounded-lg px-3 py-2 text-sm font-medium">
                      {t('review.nextReview', { count: scheduledCard.intervalDays })}
                    </p>
                  )}
                  {!profileId && (
                    <p className="next-review muted text-muted-foreground mt-3 text-xs">
                      {t('review.createProfileHint')}
                    </p>
                  )}
                  <div className="complete-actions mt-5 flex justify-center gap-2.5">
                    <Button variant="secondary" onClick={onRestart}>
                      {t('typing.restart')}
                    </Button>
                    {page < TOTAL_PAGES && (
                      <Button className="primary" onClick={() => setPage(page + 1)}>
                        {t('typing.continueNext')}
                        <ArrowRight className="rtl:rotate-180" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TypingArea>
        )}
      </div>
    </div>
  );
}
