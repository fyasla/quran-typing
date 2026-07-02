import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MushafPage from './components/MushafPage';
import ReviewPanel from './components/ReviewPanel';
import SettingsPanel from './components/SettingsPanel';
import TopBar from './components/TopBar';
import TypingArea from './components/TypingArea';
import { loadChapters, loadPage } from './data/loader';
import { useTypingEngine } from './hooks/useTypingEngine';
import { duePages, toDay, type ReviewCard } from './review/srs';
import { useProgress } from './store/progress';
import { useActiveProfile } from './store/profiles';
import { TOTAL_PAGES, useSettings } from './store/settings';
import type { Chapter, PageData } from './types';

export default function App() {
  const { t } = useTranslation();
  const { page, setPage, harakatMode, smallLetters, blindMode, keyboardMode } =
    useSettings();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const activeProfile = useActiveProfile();
  const { data: progress, recordSession, reload } = useProgress(activeProfile?.id ?? null);
  /** Carte planifiée après la page terminée (pour afficher la prochaine échéance) */
  const [scheduledCard, setScheduledCard] = useState<ReviewCard | null>(null);
  const startRef = useRef<number | null>(null);
  const recordedRef = useRef(false);

  // Chargement des métadonnées
  useEffect(() => {
    loadChapters().then(setChapters).catch(() => setLoadError(true));
  }, []);

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

  const { tokens, snapshot, handleText, restart, errorFlash } = useTypingEngine(
    pageData,
    engineSettings
  );

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
    restart();
  }, [restart]);

  const accuracy =
    snapshot && snapshot.correctCount + snapshot.errorCount > 0
      ? Math.round(
          (snapshot.correctCount / (snapshot.correctCount + snapshot.errorCount)) * 100
        )
      : 100;

  // Page terminée → enregistre la session et planifie la révision
  useEffect(() => {
    if (!snapshot?.done || recordedRef.current || tokens.length === 0) return;
    recordedRef.current = true;
    if (!activeProfile) return;
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    setScheduledCard(recordSession(page, accuracy, snapshot.errorCount, durationMs));
  }, [snapshot, tokens, activeProfile, recordSession, page, accuracy]);

  // Sourate courante (premier mot de la page)
  const currentSurah = useMemo(() => {
    if (!pageData) return null;
    for (const line of pageData.lines) {
      if (line.type === 'surah' || line.type === 'basmala') return line.surah ?? null;
      const w = line.words?.[0];
      if (w) return w.s;
    }
    return null;
  }, [pageData]);

  const progressRatio =
    snapshot && tokens.length > 0 ? Math.min(1, snapshot.pos / tokens.length) : 0;

  const dueCount = useMemo(
    () => duePages(progress.cards, toDay(new Date())).length,
    [progress.cards]
  );

  return (
    <div className="app">
      <TopBar
        chapters={chapters}
        currentSurah={currentSurah}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenReview={() => setReviewOpen(true)}
        dueCount={dueCount}
        onDataImported={reload}
      />

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressRatio * 100}%` }} />
      </div>

      <main className="main">
        {loadError && <p className="load-error">{t('typing.loadError')}</p>}
        {!loadError && (!pageData || !snapshot) && (
          <p className="loading">{t('typing.loading')}</p>
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
              <div className="complete-overlay">
                <div className="complete-card">
                  <h2>{t('typing.pageComplete')}</h2>
                  <p>
                    {t('typing.accuracy')} : {accuracy}% — {snapshot.errorCount}{' '}
                    {t('typing.errors')}
                  </p>
                  {scheduledCard && (
                    <p className="next-review">
                      {t('review.nextReview', { count: scheduledCard.intervalDays })}
                    </p>
                  )}
                  {!activeProfile && (
                    <p className="next-review muted">{t('review.createProfileHint')}</p>
                  )}
                  <div className="complete-actions">
                    <button type="button" onClick={onRestart}>
                      {t('typing.restart')}
                    </button>
                    {page < TOTAL_PAGES && (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setPage(page + 1)}
                      >
                        {t('typing.continueNext')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TypingArea>
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ReviewPanel
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        progress={progress}
        hasProfile={!!activeProfile}
        onGoToPage={setPage}
      />
    </div>
  );
}
