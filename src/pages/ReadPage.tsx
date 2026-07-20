import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight,
  Book,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Keyboard,
  KeyboardOff,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MushafPage from '../components/MushafPage';
import TypingArea from '../components/TypingArea';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { loadPage } from '../data/loader';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { formatAmount, periodStart, progressSince } from '../review/goal';
import { toDay } from '../review/srs';
import { useAuth } from '../store/auth';
import type { ProgressData, UseProgress } from '../store/progress';
import { clearResume, loadResume, saveResume } from '../store/resume';
import { schedulePush } from '../store/sync';
import { TOTAL_PAGES, useSettings } from '../store/settings';
import { buildTokens } from '../typing/engine';
import { buildStaticSnapshot, getSpread } from '../typing/spread';
import type { Chapter, PageData } from '../types';

interface Props {
  chapters: Chapter[];
  /** Id de progression effectif (compte cloud ou profil local, null = invité pur) */
  profileId: string | null;
  progress: ProgressData;
  recordSession: UseProgress['recordSession'];
  /** Remonte l'avancée en direct (fraction de page, versets passés) vers App */
  onLive: (live: { pageFraction: number; verses: number }) => void;
}

/** Page de lecture/frappe : moteur, reprise mi-page, enregistrement de session */
export default function ReadPage({
  chapters,
  profileId,
  progress,
  recordSession,
  onLive,
}: Props) {
  const { t } = useTranslation();
  const {
    page,
    setPage,
    harakatMode,
    smallLetters,
    blindMode,
    setBlindMode,
    keyboardMode,
    typeSurah,
    virtualKeyboard,
    setVirtualKeyboard,
    bookMode,
    setBookMode,
    goal,
  } = useSettings();
  const { user } = useAuth();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [neighborData, setNeighborData] = useState<PageData | null>(null);
  /** Trophées débloqués par la page qui vient d'être terminée */
  const [unlocked, setUnlocked] = useState<string[]>([]);
  /** Hauteur mesurée du clavier virtuel (pour ne pas masquer le bas de page) */
  const [kbHeight, setKbHeight] = useState(0);
  const startRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  /** Le mode aveugle doit être actif de la première frappe à la fin pour compter */
  const blindAllRef = useRef(false);
  /** Une page reprise (déjà entamée avant) ne compte jamais comme aveugle */
  const hadResumeRef = useRef(false);

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

  // Mode livre : paire de pages du mushaf relié + chargement de la voisine statique
  const spread = useMemo(() => getSpread(page), [page]);
  const neighborPageNum =
    bookMode && spread.left !== null ? (spread.right === page ? spread.left : spread.right) : null;

  useEffect(() => {
    if (!neighborPageNum) {
      setNeighborData(null);
      return;
    }
    let cancelled = false;
    loadPage(neighborPageNum)
      .then((data) => {
        if (!cancelled) setNeighborData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [neighborPageNum]);

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

  // Titres de sourates typables (option) : noms arabes par numéro
  const buildOpts = useMemo(
    () =>
      typeSurah
        ? { surahNames: new Map(chapters.map((c) => [c.id, c.nameArabic])) }
        : undefined,
    [typeSurah, chapters]
  );

  const { tokens, snapshot, handleText, restart, errorFlash, getState } = useTypingEngine(
    pageData,
    engineSettings,
    initialState,
    buildOpts
  );

  // Page voisine (mode livre) : statique, jamais tapée — token+snapshot dérivés,
  // pas de moteur de frappe dédié (voir buildStaticSnapshot).
  const neighborTokens = useMemo(
    () => (neighborData ? buildTokens(neighborData, buildOpts) : []),
    [neighborData, buildOpts]
  );
  const neighborDone = neighborPageNum !== null && !!progress.cards[neighborPageNum];
  const neighborSnapshot = useMemo(
    () => buildStaticSnapshot(neighborTokens.length, neighborDone),
    [neighborTokens.length, neighborDone]
  );
  const showBook = bookMode && spread.left !== null && neighborData !== null;
  const isRightActive = spread.right === page;

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
    setUnlocked([]);
    hadResumeRef.current = initialState !== null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Désactiver le mode aveugle en cours de page invalide la session « aveugle »
  useEffect(() => {
    if (!blindMode) blindAllRef.current = false;
  }, [blindMode]);

  // Le chrono démarre à la première frappe (et fige l'éligibilité « aveugle »)
  const onText = useCallback(
    (text: string) => {
      if (startRef.current === null) {
        startRef.current = Date.now();
        blindAllRef.current = blindMode && !hadResumeRef.current;
      }
      handleText(text);
    },
    [handleText, blindMode]
  );

  const onRestart = useCallback(() => {
    startRef.current = null;
    recordedRef.current = false;
    setUnlocked([]);
    hadResumeRef.current = false;
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

  // Page terminée → enregistre la session (et récolte les trophées débloqués)
  useEffect(() => {
    if (!snapshot?.done || recordedRef.current || tokens.length === 0) return;
    recordedRef.current = true;
    if (!profileId) return;
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    setUnlocked(
      recordSession(
        page,
        accuracy,
        snapshot.errorCount,
        durationMs,
        pageVerses,
        blindAllRef.current
      )
    );
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

  // Objectif d'apprentissage : progression de la période (affichée à la complétion)
  const goalDone = useMemo(() => {
    if (!goal) return null;
    const today = toDay(new Date());
    const done = progressSince(progress.sessions, periodStart(goal, today));
    const value = goal.unit === 'page' ? done.pages : done.verses;
    return {
      text: `${goal.unit === 'page' ? formatAmount(Math.floor(value * 4) / 4) : Math.floor(value)} / ${
        goal.unit === 'page' ? formatAmount(goal.amount) : goal.amount
      }`,
      reached: value >= goal.amount,
    };
  }, [goal, progress.sessions]);

  // Mesure la hauteur du clavier virtuel pour ne pas masquer le bas de page
  const kbRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) {
      setKbHeight(0);
      return;
    }
    const ro = new ResizeObserver(([entry]) => setKbHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="read-page flex w-full flex-col" style={{ paddingBottom: kbHeight }}>
      <div className="bg-muted h-1">
        <div
          className="bg-primary h-full transition-[width] duration-150"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {/* Barre d'outils de frappe */}
      <div
        className={`mx-auto flex w-full items-center justify-end gap-3 px-3 pt-2.5 ${showBook ? 'max-w-[1400px]' : 'max-w-[720px]'}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="book-toggle text-muted-foreground hidden md:inline-flex"
          aria-pressed={bookMode}
          aria-label={t(bookMode ? 'book.hide' : 'book.show')}
          onClick={() => setBookMode(!bookMode)}
        >
          {bookMode ? <BookOpen className="text-primary" /> : <Book />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="vk-toggle text-muted-foreground"
          aria-pressed={virtualKeyboard}
          aria-label={t(virtualKeyboard ? 'vk.hideKeyboard' : 'vk.showKeyboard')}
          onClick={() => setVirtualKeyboard(!virtualKeyboard)}
        >
          {virtualKeyboard ? (
            <Keyboard className="text-primary" />
          ) : (
            <KeyboardOff />
          )}
        </Button>
        <label className="blind-toggle text-muted-foreground flex cursor-pointer items-center gap-2 text-[13px] font-medium select-none">
          {blindMode ? (
            <EyeOff className="text-primary size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          {t('settings.blind.label')}
          <Switch
            checked={blindMode}
            onCheckedChange={setBlindMode}
            aria-label={t('settings.blind.label')}
          />
        </label>
      </div>

      <div className="flex flex-1 items-start justify-center px-2 pt-2 pb-6 sm:px-3">
        {loadError && (
          <p className="load-error text-destructive mt-16 max-w-md text-center text-sm">
            {t('typing.loadError')}
          </p>
        )}
        {!loadError && (!pageData || !snapshot) && (
          <p className="loading text-muted-foreground mt-16 text-sm">{t('typing.loading')}</p>
        )}
        {pageData && snapshot && (
          <TypingArea
            keyboardMode={keyboardMode}
            onText={onText}
            className={showBook ? 'typing-area-book' : undefined}
          >
            {showBook ? (
              <div className="book-spread" dir="rtl">
                {isRightActive ? (
                  <>
                    <MushafPage
                      page={pageData}
                      tokens={tokens}
                      snapshot={snapshot}
                      blindMode={blindMode}
                      errorFlash={errorFlash}
                      chapters={chapters}
                    />
                    <MushafPage
                      page={neighborData!}
                      tokens={neighborTokens}
                      snapshot={neighborSnapshot}
                      blindMode={blindMode}
                      errorFlash={false}
                      chapters={chapters}
                      interactive={false}
                    />
                  </>
                ) : (
                  <>
                    <MushafPage
                      page={neighborData!}
                      tokens={neighborTokens}
                      snapshot={neighborSnapshot}
                      blindMode={blindMode}
                      errorFlash={false}
                      chapters={chapters}
                      interactive={false}
                    />
                    <MushafPage
                      page={pageData}
                      tokens={tokens}
                      snapshot={snapshot}
                      blindMode={blindMode}
                      errorFlash={errorFlash}
                      chapters={chapters}
                    />
                  </>
                )}
              </div>
            ) : (
              <MushafPage
                page={pageData}
                tokens={tokens}
                snapshot={snapshot}
                blindMode={blindMode}
                errorFlash={errorFlash}
                chapters={chapters}
              />
            )}
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

                  {/* Objectif du jour */}
                  {profileId && goalDone && (
                    <p
                      className={`next-review mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
                        goalDone.reached
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {t('goal.label')} : {goalDone.text} {goalDone.reached ? '✓' : ''}
                    </p>
                  )}

                  {/* Trophées débloqués */}
                  {unlocked.map((id, i) => (
                    <p
                      key={id}
                      className="trophy-banner bg-gold/25 text-foreground animate-in fade-in slide-in-from-bottom-2 mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                      style={{ animationDelay: `${200 + i * 150}ms`, animationFillMode: 'both' }}
                    >
                      <Trophy className="text-trophy size-4 shrink-0" />
                      {t('trophies.unlocked')} {t(`trophies.${id}.name`)}
                    </p>
                  ))}

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

      {virtualKeyboard && <VirtualKeyboard ref={kbRef} onText={onText} onHide={() => setVirtualKeyboard(false)} />}
    </div>
  );
}
