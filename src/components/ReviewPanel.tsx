import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeStreak, duePages, toDay } from '../review/srs';
import type { ProgressData } from '../store/progress';

interface Props {
  open: boolean;
  onClose: () => void;
  progress: ProgressData;
  hasProfile: boolean;
  onGoToPage: (page: number) => void;
}

export default function ReviewPanel({ open, onClose, progress, hasProfile, onGoToPage }: Props) {
  const { t } = useTranslation();
  const today = toDay(new Date());

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

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('review.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('settings.close')}>
            ✕
          </button>
        </div>

        {!hasProfile && <p className="review-hint">{t('review.createProfileHint')}</p>}

        <div className="stat-tiles">
          <div className="stat-tile">
            <strong>{due.length}</strong>
            <span>{t('review.dueToday')}</span>
          </div>
          <div className="stat-tile">
            <strong>{streak}</strong>
            <span>{t('review.streak')}</span>
          </div>
          <div className="stat-tile">
            <strong>{learned}</strong>
            <span>{t('review.learned')}</span>
          </div>
          <div className="stat-tile">
            <strong>{avgAccuracy === null ? '—' : `${avgAccuracy}%`}</strong>
            <span>{t('review.avgAccuracy')}</span>
          </div>
        </div>

        <section className="review-section">
          <h3>{t('review.due')}</h3>
          {due.length === 0 ? (
            <p className="review-empty">{t('review.none')}</p>
          ) : (
            <div className="due-list">
              {due.map((card) => (
                <button
                  key={card.page}
                  type="button"
                  className="due-page"
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
            <h3>{t('review.recent')}</h3>
            <ul className="session-list">
              {recent.map((s, i) => (
                <li key={`${s.date}-${i}`}>
                  <span>
                    {t('nav.page')} {s.page}
                  </span>
                  <span className="muted">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className={s.accuracy >= 90 ? 'acc-good' : 'acc-low'}>
                    {s.accuracy}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
