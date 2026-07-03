import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Flame, Goal as GoalIcon, LibraryBig, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { daysLeft, formatAmount, periodStart, progressSince } from '../review/goal';
import { computeStreak, duePages, toDay } from '../review/srs';
import type { ProgressData } from '../store/progress';
import { useSettings } from '../store/settings';

interface Props {
  open: boolean;
  onClose: () => void;
  progress: ProgressData;
  hasProfile: boolean;
  onGoToPage: (page: number) => void;
  /** Avancée en direct sur la page courante */
  live: { pageFraction: number; verses: number };
  onOpenSettings: () => void;
}

export default function ReviewPanel({
  open,
  onClose,
  progress,
  hasProfile,
  onGoToPage,
  live,
  onOpenSettings,
}: Props) {
  const { t } = useTranslation();
  const { goal } = useSettings();
  const today = toDay(new Date());

  // Progression vers l'objectif dans la période courante
  const goalState = useMemo(() => {
    if (!goal) return null;
    const done = progressSince(progress.sessions, periodStart(goal, today));
    const value =
      goal.unit === 'page' ? done.pages + live.pageFraction : done.verses + live.verses;
    return {
      value,
      ratio: Math.min(1, value / goal.amount),
      reached: value >= goal.amount,
      left: daysLeft(goal, today),
    };
  }, [goal, progress.sessions, today, live]);

  const due = useMemo(() => duePages(progress.cards, today), [progress.cards, today]);
  const streak = useMemo(
    () => computeStreak(progress.sessions, today),
    [progress.sessions, today]
  );
  const learned = Object.keys(progress.cards).length;
  const recent = useMemo(() => progress.sessions.slice(-8).reverse(), [progress.sessions]);
  const avgAccuracy = useMemo(() => {
    const last = progress.sessions.slice(-20);
    if (last.length === 0) return null;
    return Math.round(last.reduce((s, r) => s + r.accuracy, 0) / last.length);
  }, [progress.sessions]);

  const tiles = [
    { icon: CalendarCheck, value: String(due.length), label: t('review.dueToday') },
    { icon: Flame, value: String(streak), label: t('review.streak') },
    { icon: LibraryBig, value: String(learned), label: t('review.learned') },
    {
      icon: Target,
      value: avgAccuracy === null ? '—' : `${avgAccuracy}%`,
      label: t('review.avgAccuracy'),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="review-modal max-h-[88dvh] gap-5 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('review.title')}</DialogTitle>
        </DialogHeader>

        {!hasProfile && (
          <p className="review-hint bg-accent text-accent-foreground rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed">
            {t('review.createProfileHint')}
          </p>
        )}

        {goal && goalState ? (
          <section className="goal-card bg-muted/60 rounded-xl px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
                <GoalIcon className="text-primary size-4" />
                {t('goal.summary', {
                  amount: goal.unit === 'page' ? formatAmount(goal.amount) : goal.amount,
                  unit: t(goal.unit === 'page' ? 'goal.unitPage' : 'goal.unitVerse', {
                    count: Math.max(1, Math.ceil(goal.amount)),
                  }),
                  freq:
                    goal.every === 1
                      ? t(goal.perUnit === 'day' ? 'goal.everyDay' : 'goal.everyWeek')
                      : t(goal.perUnit === 'day' ? 'goal.everyNDays' : 'goal.everyNWeeks', {
                          count: goal.every,
                        }),
                })}
              </h3>
              <span className="text-muted-foreground shrink-0 text-xs">
                {t('goal.daysLeft', { count: goalState.left })}
              </span>
            </div>
            <div className="bg-border/70 mt-2.5 h-2 overflow-hidden rounded-full">
              <div
                className="goal-bar bg-primary h-full rounded-full transition-[width] duration-300"
                style={{ width: `${goalState.ratio * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium">
              {goalState.reached ? (
                <span className="text-primary">{t('goal.reached')}</span>
              ) : (
                <span className="text-muted-foreground goal-count">
                  {goal.unit === 'page'
                    ? formatAmount(Math.floor(goalState.value * 4) / 4)
                    : Math.floor(goalState.value)}{' '}
                  / {goal.unit === 'page' ? formatAmount(goal.amount) : goal.amount}
                </span>
              )}
            </p>
          </section>
        ) : (
          <Button variant="outline" size="sm" className="goal-set self-start" onClick={onOpenSettings}>
            <GoalIcon />
            {t('goal.set')}
          </Button>
        )}

        <div className="stat-tiles grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tiles.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="stat-tile bg-muted/60 flex flex-col items-center gap-0.5 rounded-xl px-2 py-3.5 text-center"
            >
              <Icon className="text-primary/70 mb-1 size-4" strokeWidth={2} />
              <strong className="text-primary text-xl leading-none font-semibold tabular-nums">
                {value}
              </strong>
              <span className="text-muted-foreground text-[11px] leading-tight">{label}</span>
            </div>
          ))}
        </div>

        <section className="review-section">
          <h3 className="text-muted-foreground mb-2 text-[13px] font-semibold">
            {t('review.due')}
          </h3>
          {due.length === 0 ? (
            <p className="review-empty text-muted-foreground text-sm">{t('review.none')}</p>
          ) : (
            <div className="due-list flex flex-wrap gap-1.5">
              {due.map((card) => (
                <button
                  key={card.page}
                  type="button"
                  className="due-page border-primary/50 text-primary hover:bg-primary rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:text-white"
                  title={t('review.lastAccuracy', { accuracy: card.lastAccuracy })}
                  onClick={() => {
                    onGoToPage(card.page);
                    onClose();
                  }}
                >
                  {t('nav.page')} {card.page}
                </button>
              ))}
            </div>
          )}
        </section>

        {recent.length > 0 && (
          <section className="review-section">
            <h3 className="text-muted-foreground mb-1 text-[13px] font-semibold">
              {t('review.recent')}
            </h3>
            <ul className="session-list divide-border/70 divide-y text-sm">
              {recent.map((s, i) => (
                <li key={`${s.date}-${i}`} className="flex items-baseline gap-3 py-2">
                  <span className="flex-1">
                    {t('nav.page')} {s.page}
                  </span>
                  <span className="muted text-muted-foreground text-xs">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span
                    className={`text-[13px] font-semibold tabular-nums ${
                      s.accuracy >= 90 ? 'acc-good text-primary' : 'acc-low text-destructive'
                    }`}
                  >
                    {s.accuracy}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
