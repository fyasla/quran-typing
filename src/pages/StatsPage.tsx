import { Button } from '@/components/ui/button';
import {
  BookOpenCheck,
  Crown,
  EyeOff,
  Flame,
  Gem,
  Goal as GoalIcon,
  LibraryBig,
  Lock,
  Plus,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { daysLeft, formatAmount, periodStart, progressSince } from '../review/goal';
import { computeStreak, toDay, type SessionRecord } from '../review/srs';
import { TROPHIES, type TrophyDef } from '../review/trophies';
import type { ProgressData, UseProgress } from '../store/progress';
import { TOTAL_PAGES, useSettings } from '../store/settings';
import type { Goal } from '../types';
import PageShell from './PageShell';

interface Props {
  progress: ProgressData;
  hasProfile: boolean;
  /** Avancée en direct sur la page courante */
  live: { pageFraction: number; verses: number };
  addCheckin: UseProgress['addCheckin'];
}

const TROPHY_ICONS: Record<TrophyDef['icon'], typeof Sprout> = {
  sprout: Sprout,
  book: BookOpenCheck,
  library: LibraryBig,
  crown: Crown,
  flame: Flame,
  'eye-off': EyeOff,
  target: Target,
  gem: Gem,
};

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

/** Libellé du résumé d'objectif ("1 page chaque jour"…) */
function useGoalSummary() {
  const { t } = useTranslation();
  return (goal: Goal) =>
    t('goal.summary', {
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
    });
}

function GoalCard({
  title,
  goal,
  value,
  action,
}: {
  title: string;
  goal: Goal;
  value: number;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const summary = useGoalSummary();
  const today = toDay(new Date());
  const ratio = Math.min(1, value / goal.amount);
  const reached = value >= goal.amount;

  return (
    <section className="goal-card bg-card rounded-xl border px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <GoalIcon className="text-primary size-4" />
          {title} — {summary(goal)}
        </h3>
        <span className="text-muted-foreground shrink-0 text-xs">
          {t('goal.daysLeft', { count: daysLeft(goal, today) })}
        </span>
      </div>
      <div className="bg-muted mt-2.5 h-2 overflow-hidden rounded-full">
        <div
          className="goal-bar bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs font-medium">
        {reached ? (
          <span className="text-primary">{t('goal.reached')}</span>
        ) : (
          <span className="text-muted-foreground goal-count">
            {goal.unit === 'page' ? formatAmount(Math.floor(value * 4) / 4) : Math.floor(value)}{' '}
            / {goal.unit === 'page' ? formatAmount(goal.amount) : goal.amount}
          </span>
        )}
        {action}
      </div>
    </section>
  );
}

export default function StatsPage({ progress, hasProfile, live, addCheckin }: Props) {
  const { t, i18n } = useTranslation();
  const { goal, reviewGoal } = useSettings();
  const today = toDay(new Date());

  // Objectif d'apprentissage : pages/versets tapés dans la période
  const learnValue = useMemo(() => {
    if (!goal) return 0;
    const done = progressSince(progress.sessions, periodStart(goal, today));
    return goal.unit === 'page' ? done.pages + live.pageFraction : done.verses + live.verses;
  }, [goal, progress.sessions, today, live]);

  // Objectif de révision : pointages manuels dans la période
  const reviewValue = useMemo(() => {
    if (!reviewGoal) return 0;
    const start = periodStart(reviewGoal, today);
    return (progress.checkins ?? [])
      .filter((c) => c.date >= start)
      .reduce((sum, c) => sum + c.amount, 0);
  }, [reviewGoal, progress.checkins, today]);

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
  const trophiesOwned = progress.trophies ?? {};
  const trophyCount = Object.keys(trophiesOwned).length;

  const tiles = [
    { icon: Trophy, value: `${trophyCount}/${TROPHIES.length}`, label: t('trophies.title') },
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
    <PageShell title={t('stats.title')} subtitle={t('stats.subtitle')} className="stats-page">
      {!hasProfile && (
        <p className="review-hint bg-accent text-accent-foreground rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed">
          {t('review.createProfileHint')}
        </p>
      )}

      {/* Objectif d'apprentissage */}
      {goal ? (
        <GoalCard title={t('goal.learning')} goal={goal} value={learnValue} />
      ) : (
        <Button asChild variant="outline" size="sm" className="goal-set self-start">
          <Link href="/settings">
            <GoalIcon />
            {t('goal.set')}
          </Link>
        </Button>
      )}

      {/* Objectif de révision (optionnel, pointable hors app) */}
      {reviewGoal && (
        <GoalCard
          title={t('goal.review')}
          goal={reviewGoal}
          value={reviewValue}
          action={
            <Button
              variant="outline"
              size="xs"
              className="checkin-btn"
              disabled={!hasProfile}
              onClick={() => addCheckin(1)}
            >
              <Plus />
              {t('goal.checkin', {
                unit: t(reviewGoal.unit === 'page' ? 'goal.unitPage' : 'goal.unitVerse', {
                  count: 1,
                }),
              })}
            </Button>
          }
        />
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
        <div
          className="mt-3 flex h-24 items-end gap-0.5"
          dir="ltr"
          role="img"
          aria-label={t('stats.activity')}
        >
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
            style={{ width: `${Math.max(0.5, (learned / TOTAL_PAGES) * 100)}%` }}
          />
        </div>
      </section>

      {/* Trophées */}
      <section className="trophies-section">
        <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Trophy className="text-trophy size-4" />
          {t('trophies.title')} ({trophyCount}/{TROPHIES.length})
        </h3>
        <div className="trophy-grid grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {TROPHIES.map((def) => {
            const date = trophiesOwned[def.id];
            const Icon = date ? TROPHY_ICONS[def.icon] : Lock;
            return (
              <div
                key={def.id}
                className={`trophy-card rounded-xl border px-3 py-3 ${
                  date
                    ? 'bg-card border-trophy/40 unlocked'
                    : 'bg-muted/40 border-transparent opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                      date ? 'bg-gold/30 text-trophy' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {t(`trophies.${def.id}.name`)}
                    </p>
                    {date && (
                      <p className="text-muted-foreground text-[10px]">
                        {new Date(date).toLocaleDateString(i18n.language, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs leading-snug">
                  {t(`trophies.${def.id}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
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
                <span className="flex flex-1 items-center gap-1.5">
                  {t('nav.page')} {s.page}
                  {s.blind && <EyeOff className="text-primary/60 size-3.5" />}
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
