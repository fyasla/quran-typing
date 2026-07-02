import { useTranslation } from 'react-i18next';
import { LANGUAGE_LABELS, LANGUAGES } from '../i18n';
import { useSettings } from '../store/settings';
import type { HarakatMode, KeyboardMode, SmallLettersMode, Theme } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Ouvre l'onboarding depuis les réglages */
  onShowWelcome: () => void;
}

export default function SettingsPanel({ open, onClose, onShowWelcome }: Props) {
  const { t } = useTranslation();
  const s = useSettings();

  if (!open) return null;

  const harakatOptions: { value: HarakatMode; label: string; desc: string }[] = [
    { value: 'none', label: t('settings.harakat.none'), desc: t('settings.harakat.noneDesc') },
    {
      value: 'important',
      label: t('settings.harakat.important'),
      desc: t('settings.harakat.importantDesc'),
    },
    { value: 'all', label: t('settings.harakat.all'), desc: t('settings.harakat.allDesc') },
  ];

  const smallOptions: { value: SmallLettersMode; label: string; desc: string }[] = [
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
  ];

  const keyboardOptions: { value: KeyboardMode; label: string; desc: string }[] = [
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
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('settings.close')}>
            ✕
          </button>
        </div>

        <fieldset>
          <legend>{t('settings.harakat.label')}</legend>
          {harakatOptions.map((o) => (
            <label key={o.value} className="radio-row">
              <input
                type="radio"
                name="harakat"
                checked={s.harakatMode === o.value}
                onChange={() => s.setHarakatMode(o.value)}
              />
              <span>
                <strong>{o.label}</strong>
                <small>{o.desc}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t('settings.smallLetters.label')}</legend>
          {smallOptions.map((o) => (
            <label key={o.value} className="radio-row">
              <input
                type="radio"
                name="small"
                checked={s.smallLetters === o.value}
                onChange={() => s.setSmallLetters(o.value)}
              />
              <span>
                <strong>{o.label}</strong>
                <small>{o.desc}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t('settings.keyboard.label')}</legend>
          {keyboardOptions.map((o) => (
            <label key={o.value} className="radio-row">
              <input
                type="radio"
                name="keyboard"
                checked={s.keyboardMode === o.value}
                onChange={() => s.setKeyboardMode(o.value)}
              />
              <span>
                <strong>{o.label}</strong>
                <small>{o.desc}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t('settings.language.label')}</legend>
          <div className="theme-row">
            {LANGUAGES.map((l) => (
              <label key={l} className={`theme-choice${s.language === l ? ' on' : ''}`}>
                <input
                  type="radio"
                  name="language"
                  checked={s.language === l}
                  onChange={() => s.setLanguage(l)}
                />
                {LANGUAGE_LABELS[l]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('settings.theme.label')}</legend>
          <div className="theme-row">
            {(['auto', 'light', 'dark'] as Theme[]).map((v) => (
              <label key={v} className={`theme-choice${s.theme === v ? ' on' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  checked={s.theme === v}
                  onChange={() => s.setTheme(v)}
                />
                {t(`settings.theme.${v}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('settings.blind.label')}</legend>
          <label className="radio-row">
            <input
              type="checkbox"
              checked={s.blindMode}
              onChange={(e) => s.setBlindMode(e.target.checked)}
            />
            <span>
              <small>{t('settings.blind.desc')}</small>
            </span>
          </label>
        </fieldset>

        <button type="button" className="link-btn" onClick={onShowWelcome}>
          {t('welcome.help')}
        </button>
      </div>
    </div>
  );
}
