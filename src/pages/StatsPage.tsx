import { Button } from '@/components/ui/button';
import {
  CalendarCheck,
  Flame,
  Goal as GoalIcon,
  LibraryBig,
  Target,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { daysLeft, formatAmount, periodStart, progressSince } from '../review/goal';
import { computeStreak, duePages, toDay, type SessionRecord } from '../review/srs';
import type { ProgressData } from '../store/progress';
import { TOTAL_PAGES, useSettings } from '../store/settings';
import PageShell from './PageShell';

interface Props {
  progress: ProgressData;
  hasProfile: boolean;
  /** Avancée en direct sur la page courante */
  live: { pageFraction: number; verses: number };
}

/** Activité des 14 derniers jours (pages + versets par jour local) */
function buildActivity(sessions: SessionRecord[], today: string) {
  const days: { day: string; pages: number; verses: number }[] = [];
  const [y, m, d] = today.split('-').map(Number);
  for (let i = 13; i >= 0; i--) {
    const date = new Date(y, m - 1, d - i);
    days.push({ day: toDay(date), pages: 0, verses: 0 });
  }
  const index = new Map(days.map((e, i) => [e.day, i]));
  for (const s of sessions) {
    const i = index.get(s.date.slice(0, 10));
    if (i !== undefined) {
      days[i].pages += 1;
      days[i].verses += s.verses ?? 0;
    }
  }
  return days;
}

export default function StatsPage({ progress, hasProfile, live }: Props) {
  const { t, i18n } = useTranslation();
  const { goal, setPage } = useSettings();
  const [, navigate] = useLocation();
  const today = toDay(new Date());

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
  const recent = useMemo(() => progress.sessions.slice(-20).reverse(), [progress.sessions]);
  const avgAccuracy = useMemo(() => {
    const last = progress.sessions.slice(-20);
    if (last.length === 0) return null;
    return Math.round(last.reduce((s, r) => s + r.accuracy, 0) / last.length);
  }, [progress.sessions]);
  const activity = useMemo(
    () => buildActivity(progress.sessions, today),
    [progress.sessions, today]
  );
  const maxPages = Math.max(1, ...activity.map((a) => a.pages));
  const globalRatio = learned / TOTAL_PAGES;

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

  const dayLabel = (day: string) =>
    new Date(day).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  return (
    <PageShell
      title={t('stats.title')}
      subtitle={t('stats.subtitle')}
      className="stats-page"
    >
      {!hasProfile && (
        <p className="review-hint bg-accent text-accent-foreground rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed">
          {t('review.createProfileHint')}
        </p>
      )}

      {/* Objectif */}
      {goal && goalState ? (
        <section className="goal-card bg-card rounded-xl border px-4 py-3.5">
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
          <div className="bg-muted mt-2.5 h-2 overflow-hidden rounded-full">
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
        <Button asChild variant="outline" size="sm" className="goal-set self-start">
          <Link href="/settings">
            <GoalIcon />
            {t('goal.set')}
          </Link>
        </Button>
      )}

      {/* Tuiles */}
      <div className="stat-tiles grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="stat-tile bg-card flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3.5 text-center"
          >
            <Icon className="text-primary/70 mb-1 size-4" strokeWidth={2} />
            <strong className="text-primary text-xl leading-none font-semibold tabular-nums">
              {value}
            </strong>
            <span className="text-muted-foreground text-[11px] leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Activité — pages par jour, 14 derniers jours */}
      <section className="activity-chart bg-card rounded-xl border px-4 py-3.5">
        <h3 className="text-[13px] font-semibold">{t('stats.activity')}</h3>
        <div className="mt-3 flex h-24 items-end gap-0.5" dir="ltr" role="img" aria-label={t('stats.activity')}>
          {activity.map((a) => (
            <div key={a.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] transition-colors"
                style={{
                  height: a.pages > 0 ? `${Math.max(8, (a.pages / maxPages) * 100)}%` : '3px',
                  background: a.pages > 0 ? 'var(--chart-1)' : 'var(--muted)',
                }}
                aria-label={`${dayLabel(a.day)} : ${a.pages} ${t('goal.unitPage', { count: a.pages })}`}
              />
              {/* Info-bulle au survol */}
              <div className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md group-hover:block">
                <span className="font-medium">{dayLabel(a.day)}</span>
                <br />
                {a.pages} {t('goal.unitPage', { count: a.pages })} · {a.verses}{' '}
                {t('goal.unitVerse', { count: a.verses })}
              </div>
            </div>
          ))}
        </div>
        <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px]" dir="ltr">
          <span>{dayLabel(activity[0].day)}</span>
          <span>{dayLabel(activity[13].day)}</span>
        </div>
      </section>

      {/* Progression globale */}
      <section className="bg-card rounded-xl border px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold">{t('stats.global')}</h3>
          <span className="text-muted-foreground text-xs tabular-nums">
            {learned} / {TOTAL_PAGES}
          </span>
        </div>
        <div className="bg-muted mt-2.5 h-2 overflow-hidden rounded-full">
          <div
            className="bg-gold dark:bg-primary/70 h-full rounded-full"
            style={{ width: `${Math.max(0.5, globalRatio * 100)}%` }}
          />
        </div>
      </section>

      {/* Pages à réviser */}
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
                  setPage(card.page);
                  navigate('/');
                }}
              >
                {t('nav.page')} {card.page}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Historique */}
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
                {s.durationMs > 0 && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {Math.max(1, Math.round(s.durationMs / 60000))} min
                  </span>
                )}
                <span className="muted text-muted-foreground text-xs">
                  {new Date(s.date).toLocaleDateString(i18n.language, {
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
    </PageShell>
  );
}
