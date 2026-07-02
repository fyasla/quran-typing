import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../store/settings';
import type { HarakatMode, KeyboardMode } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Onboarding en 3 étapes : principe, choix du clavier, niveau de difficulté */
export default function WelcomeModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const s = useSettings();
  const [step, setStep] = useState(0);

  if (!open) return null;

  const close = () => {
    setStep(0);
    onClose();
  };

  const keyboardChoices: { value: KeyboardMode; label: string; desc: string }[] = [
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
  ];

  const harakatChoices: { value: HarakatMode; label: string; desc: string }[] = [
    { value: 'none', label: t('settings.harakat.none'), desc: t('settings.harakat.noneDesc') },
    {
      value: 'important',
      label: t('settings.harakat.important'),
      desc: t('settings.harakat.importantDesc'),
    },
    { value: 'all', label: t('settings.harakat.all'), desc: t('settings.harakat.allDesc') },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal welcome-modal" onClick={(e) => e.stopPropagation()}>
        {step === 0 && (
          <>
            <div className="welcome-icon">قٓ</div>
            <h2>{t('welcome.title')}</h2>
            <p>{t('welcome.intro1')}</p>
            <p>{t('welcome.intro2')}</p>
          </>
        )}

        {step === 1 && (
          <>
            <h2>{t('welcome.kbTitle')}</h2>
            <p>{t('welcome.kbIntro')}</p>
            {keyboardChoices.map((o) => (
              <label key={o.value} className="radio-row">
                <input
                  type="radio"
                  name="welcome-kb"
                  checked={s.keyboardMode === o.value}
                  onChange={() => s.setKeyboardMode(o.value)}
                />
                <span>
                  <strong>{o.label}</strong>
                  <small>{o.desc}</small>
                </span>
              </label>
            ))}
            <details className="welcome-help">
              <summary>{t('welcome.kbHelpTitle')}</summary>
              <ul>
                <li>{t('welcome.kbHelpWindows')}</li>
                <li>{t('welcome.kbHelpMac')}</li>
                <li>{t('welcome.kbHelpMobile')}</li>
              </ul>
            </details>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t('welcome.harakatTitle')}</h2>
            <p>{t('welcome.harakatIntro')}</p>
            {harakatChoices.map((o) => (
              <label key={o.value} className="radio-row">
                <input
                  type="radio"
                  name="welcome-harakat"
                  checked={s.harakatMode === o.value}
                  onChange={() => s.setHarakatMode(o.value)}
                />
                <span>
                  <strong>{o.label}</strong>
                  <small>{o.desc}</small>
                </span>
              </label>
            ))}
          </>
        )}

        <div className="welcome-nav">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)}>
              {t('welcome.back')}
            </button>
          ) : (
            <span />
          )}
          <span className="welcome-dots">
            {[0, 1, 2].map((i) => (
              <i key={i} className={i === step ? 'on' : ''} />
            ))}
          </span>
          {step < 2 ? (
            <button type="button" className="primary" onClick={() => setStep(step + 1)}>
              {t('welcome.next')}
            </button>
          ) : (
            <button type="button" className="primary" onClick={close}>
              {t('welcome.start')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
