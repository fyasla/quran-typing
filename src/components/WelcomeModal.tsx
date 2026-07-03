import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultGoal } from '../review/goal';
import { toDay } from '../review/srs';
import { useSettings } from '../store/settings';
import type { HarakatMode, KeyboardMode } from '../types';
import GoalEditor from './GoalEditor';

interface Props {
  open: boolean;
  onClose: () => void;
}

function ChoiceList<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; desc: string }[];
}) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} className="gap-1.5">
      {options.map((o) => (
        <Label
          key={o.value}
          className="radio-row hover:bg-muted/60 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-accent/60 flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-start transition-colors"
        >
          <RadioGroupItem value={o.value} id={`w-${name}-${o.value}`} className="mt-0.5" />
          <span className="grid gap-0.5 font-normal">
            <span className="text-sm font-medium">{o.label}</span>
            <span className="text-muted-foreground text-xs leading-relaxed">{o.desc}</span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  );
}

const STEPS = 4;

/** Onboarding : principe, clavier, niveau de difficulté, objectif de rythme */
export default function WelcomeModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const s = useSettings();
  const [step, setStep] = useState(0);
  const goalValue = s.goal ?? defaultGoal(toDay(new Date()));

  const close = () => {
    // L'objectif affiché devient l'objectif retenu, même sans interaction
    if (!s.goal) s.setGoal(goalValue);
    setStep(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="welcome-modal max-h-[88dvh] gap-4 overflow-y-auto sm:max-w-md">
        {step === 0 && (
          <div className="text-center">
            <div className="welcome-icon brand-glyph text-primary mt-2 text-6xl leading-tight">
              قٓ
            </div>
            <DialogTitle className="text-primary mt-2 text-xl">
              {t('welcome.title')}
            </DialogTitle>
            <p className="text-muted-foreground mt-3 text-start text-sm leading-relaxed">
              {t('welcome.intro1')}
            </p>
            <p className="text-muted-foreground mt-2 text-start text-sm leading-relaxed">
              {t('welcome.intro2')}
            </p>
          </div>
        )}

        {step === 1 && (
          <>
            <DialogTitle>{t('welcome.kbTitle')}</DialogTitle>
            <p className="text-muted-foreground -mt-1 text-sm">{t('welcome.kbIntro')}</p>
            <ChoiceList<KeyboardMode>
              name="kb"
              value={s.keyboardMode}
              onChange={s.setKeyboardMode}
              options={[
                {
                  value: 'custom',
                  label: t('settings.keyboard.custom'),
                  desc: t('settings.keyboard.customDesc'),
                },
                {
                  value: 'system',
                  label: t('settings.keyboard.system'),
                  desc: t('settings.keyboard.systemDesc'),
                },
              ]}
            />
            <details className="welcome-help text-muted-foreground text-[13px]">
              <summary className="text-primary cursor-pointer font-medium">
                {t('welcome.kbHelpTitle')}
              </summary>
              <ul className="mt-2 list-disc space-y-1.5 ps-5">
                <li>{t('welcome.kbHelpWindows')}</li>
                <li>{t('welcome.kbHelpMac')}</li>
                <li>{t('welcome.kbHelpMobile')}</li>
              </ul>
            </details>
          </>
        )}

        {step === 2 && (
          <>
            <DialogTitle>{t('welcome.harakatTitle')}</DialogTitle>
            <p className="text-muted-foreground -mt-1 text-sm">{t('welcome.harakatIntro')}</p>
            <ChoiceList<HarakatMode>
              name="harakat"
              value={s.harakatMode}
              onChange={s.setHarakatMode}
              options={[
                {
                  value: 'none',
                  label: t('settings.harakat.none'),
                  desc: t('settings.harakat.noneDesc'),
                },
                {
                  value: 'important',
                  label: t('settings.harakat.important'),
                  desc: t('settings.harakat.importantDesc'),
                },
                {
                  value: 'all',
                  label: t('settings.harakat.all'),
                  desc: t('settings.harakat.allDesc'),
                },
              ]}
            />
          </>
        )}

        {step === 3 && (
          <>
            <DialogTitle>{t('goal.title')}</DialogTitle>
            <p className="text-muted-foreground -mt-1 text-sm">{t('goal.intro')}</p>
            <GoalEditor value={goalValue} onChange={s.setGoal} />
          </>
        )}

        <div className="welcome-nav mt-1 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              {t('welcome.back')}
            </Button>
          ) : (
            <span />
          )}
          <span className="welcome-dots flex gap-1.5">
            {Array.from({ length: STEPS }, (_, i) => i).map((i) => (
              <i
                key={i}
                className={cn(
                  'size-2 rounded-full transition-colors',
                  i === step ? 'on bg-primary' : 'bg-border'
                )}
              />
            ))}
          </span>
          {step < STEPS - 1 ? (
            <Button className="primary" onClick={() => setStep(step + 1)}>
              {t('welcome.next')}
            </Button>
          ) : (
            <Button className="primary" onClick={close}>
              {t('welcome.start')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
