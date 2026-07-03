import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_LABELS, LANGUAGES, type Language } from '../i18n';
import { useSettings } from '../store/settings';
import type { HarakatMode, KeyboardMode, SmallLettersMode, Theme } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Ouvre l'onboarding depuis les réglages */
  onShowWelcome: () => void;
}

interface RadioOption {
  value: string;
  label: string;
  desc: string;
}

function RadioSection({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">{legend}</h3>
      <RadioGroup value={value} onValueChange={onChange} className="gap-1.5">
        {options.map((o) => (
          <Label
            key={o.value}
            className="radio-row hover:bg-muted/60 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-accent/60 flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors"
          >
            <RadioGroupItem value={o.value} id={`${name}-${o.value}`} className="mt-0.5" />
            <span className="grid gap-0.5 font-normal">
              <span className="text-sm font-medium">{o.label}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">{o.desc}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </section>
  );
}

export default function SettingsPanel({ open, onClose, onShowWelcome }: Props) {
  const { t } = useTranslation();
  const s = useSettings();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88dvh] gap-5 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        {/* Langue */}
        <section>
          <h3 className="mb-2 text-[13px] font-semibold">{t('settings.language.label')}</h3>
          <Tabs value={s.language} onValueChange={(v) => s.setLanguage(v as Language)}>
            <TabsList className="grid w-full grid-cols-3">
              {LANGUAGES.map((l) => (
                <TabsTrigger key={l} value={l} className="theme-choice">
                  {LANGUAGE_LABELS[l]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </section>

        {/* Thème */}
        <section>
          <h3 className="mb-2 text-[13px] font-semibold">{t('settings.theme.label')}</h3>
          <Tabs value={s.theme} onValueChange={(v) => s.setTheme(v as Theme)}>
            <TabsList className="grid w-full grid-cols-3">
              {(['auto', 'light', 'dark'] as Theme[]).map((v) => (
                <TabsTrigger key={v} value={v} className="theme-choice">
                  {t(`settings.theme.${v}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </section>

        <RadioSection
          legend={t('settings.harakat.label')}
          name="harakat"
          value={s.harakatMode}
          onChange={(v) => s.setHarakatMode(v as HarakatMode)}
          options={[
            { value: 'none', label: t('settings.harakat.none'), desc: t('settings.harakat.noneDesc') },
            {
              value: 'important',
              label: t('settings.harakat.important'),
              desc: t('settings.harakat.importantDesc'),
            },
            { value: 'all', label: t('settings.harakat.all'), desc: t('settings.harakat.allDesc') },
          ]}
        />

        <RadioSection
          legend={t('settings.smallLetters.label')}
          name="small"
          value={s.smallLetters}
          onChange={(v) => s.setSmallLetters(v as SmallLettersMode)}
          options={[
            {
              value: 'flexible',
              label: t('settings.smallLetters.flexible'),
              desc: t('settings.smallLetters.flexibleDesc'),
            },
            {
              value: 'strict',
              label: t('settings.smallLetters.strict'),
              desc: t('settings.smallLetters.strictDesc'),
            },
          ]}
        />

        <RadioSection
          legend={t('settings.keyboard.label')}
          name="keyboard"
          value={s.keyboardMode}
          onChange={(v) => s.setKeyboardMode(v as KeyboardMode)}
          options={[
            {
              value: 'system',
              label: t('settings.keyboard.system'),
              desc: t('settings.keyboard.systemDesc'),
            },
            {
              value: 'custom',
              label: t('settings.keyboard.custom'),
              desc: t('settings.keyboard.customDesc'),
            },
          ]}
        />

        {/* Mode aveugle */}
        <section className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[13px] font-semibold">{t('settings.blind.label')}</h3>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {t('settings.blind.desc')}
            </p>
          </div>
          <Switch
            checked={s.blindMode}
            onCheckedChange={s.setBlindMode}
            aria-label={t('settings.blind.label')}
          />
        </section>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowWelcome}
          className="link-btn text-primary -mt-1 self-start px-2"
        >
          <CircleHelp />
          {t('welcome.help')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
