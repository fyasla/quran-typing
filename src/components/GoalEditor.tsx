import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '../review/goal';
import type { Goal, GoalPeriodUnit, GoalUnit } from '../types';

interface Props {
  value: Goal;
  onChange: (g: Goal) => void;
}

function Stepper({
  value,
  display,
  onDelta,
  decDisabled,
  incDisabled,
}: {
  value: number;
  display: string;
  onDelta: (dir: 1 | -1) => void;
  decDisabled: boolean;
  incDisabled: boolean;
}) {
  return (
    <div className="border-input bg-card flex items-center rounded-lg border">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={decDisabled}
        onClick={() => onDelta(-1)}
        aria-label="−"
      >
        <Minus />
      </Button>
      <span
        className="min-w-10 text-center text-sm font-semibold tabular-nums"
        data-value={value}
      >
        {display}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={incDisabled}
        onClick={() => onDelta(1)}
        aria-label="+"
      >
        <Plus />
      </Button>
    </div>
  );
}

/**
 * Éditeur d'objectif : quantité (pages par pas de ¼, min ¼ — versets entiers,
 * min 1) et fréquence « tous les N jours/semaines ».
 */
export default function GoalEditor({ value, onChange }: Props) {
  const { t } = useTranslation();

  const setUnit = (unit: GoalUnit) => {
    if (unit === value.unit) return;
    // Quantité par défaut raisonnable en changeant d'unité
    onChange({ ...value, unit, amount: unit === 'page' ? 1 : 5 });
  };

  const stepAmount = (dir: 1 | -1) => {
    const step = value.unit === 'page' ? 0.25 : 1;
    const min = value.unit === 'page' ? 0.25 : 1;
    const max = value.unit === 'page' ? 20 : 100;
    const amount = Math.min(max, Math.max(min, +(value.amount + dir * step).toFixed(2)));
    onChange({ ...value, amount });
  };

  const stepEvery = (dir: 1 | -1) => {
    const every = Math.min(30, Math.max(1, value.every + dir));
    onChange({ ...value, every });
  };

  return (
    <div className="goal-editor flex flex-col gap-3">
      {/* Quantité + unité */}
      <div className="flex items-center gap-2.5">
        <Stepper
          value={value.amount}
          display={value.unit === 'page' ? formatAmount(value.amount) : String(value.amount)}
          onDelta={stepAmount}
          decDisabled={value.amount <= (value.unit === 'page' ? 0.25 : 1)}
          incDisabled={value.amount >= (value.unit === 'page' ? 20 : 100)}
        />
        <Tabs
          value={value.unit}
          onValueChange={(v) => setUnit(v as GoalUnit)}
          className="flex-1"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="page" className="goal-unit-page">
              {t('goal.unitPage', { count: Math.max(1, Math.ceil(value.amount)) })}
            </TabsTrigger>
            <TabsTrigger value="verse" className="goal-unit-verse">
              {t('goal.unitVerse', { count: Math.max(1, Math.ceil(value.amount)) })}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Fréquence */}
      <div className="flex items-center gap-2.5">
        <span className="text-muted-foreground shrink-0 text-sm">{t('goal.every')}</span>
        <Stepper
          value={value.every}
          display={String(value.every)}
          onDelta={stepEvery}
          decDisabled={value.every <= 1}
          incDisabled={value.every >= 30}
        />
        <Tabs
          value={value.perUnit}
          onValueChange={(v) => onChange({ ...value, perUnit: v as GoalPeriodUnit })}
          className="flex-1"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="day" className="goal-per-day">
              {t('goal.perDay', { count: value.every })}
            </TabsTrigger>
            <TabsTrigger value="week" className="goal-per-week">
              {t('goal.perWeek', { count: value.every })}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-primary text-sm font-medium">
        {t('goal.summary', {
          amount: value.unit === 'page' ? formatAmount(value.amount) : value.amount,
          unit: t(value.unit === 'page' ? 'goal.unitPage' : 'goal.unitVerse', {
            count: Math.max(1, Math.ceil(value.amount)),
          }),
          freq:
            value.every === 1
              ? t(value.perUnit === 'day' ? 'goal.everyDay' : 'goal.everyWeek')
              : t(value.perUnit === 'day' ? 'goal.everyNDays' : 'goal.everyNWeeks', {
                  count: value.every,
                }),
        })}
      </p>
    </div>
  );
}
