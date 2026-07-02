import { useTranslation } from 'react-i18next';
import { TOTAL_PAGES, useSettings } from '../store/settings';
import type { Chapter } from '../types';
import ProfileMenu from './ProfileMenu';

interface Props {
  chapters: Chapter[];
  currentSurah: number | null;
  onOpenSettings: () => void;
  onOpenReview: () => void;
  /** Nombre de pages dues aujourd'hui (badge sur le bouton Révision) */
  dueCount: number;
  onDataImported: () => void;
}

export default function TopBar({
  chapters,
  currentSurah,
  onOpenSettings,
  onOpenReview,
  dueCount,
  onDataImported,
}: Props) {
  const { t } = useTranslation();
  const { page, setPage, blindMode, setBlindMode } = useSettings();

  const handleSurahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const chapter = chapters.find((c) => c.id === id);
    if (chapter) setPage(chapter.pages[0]);
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{t('app.title')}</h1>
      </div>

      <div className="topbar-nav">
        <label className="field">
          <span>{t('nav.surah')}</span>
          <select value={currentSurah ?? ''} onChange={handleSurahChange}>
            <option value="" disabled>
              —
            </option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}. {c.nameSimple} — {c.nameArabic}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t('nav.page')}</span>
          <input
            type="number"
            min={1}
            max={TOTAL_PAGES}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          />
          <span className="muted">/ {TOTAL_PAGES}</span>
        </label>

        <div className="nav-buttons">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            title={t('nav.prevPage')}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= TOTAL_PAGES}
            title={t('nav.nextPage')}
          >
            ›
          </button>
        </div>
      </div>

      <div className="topbar-actions">
        <label className="toggle">
          <input
            type="checkbox"
            checked={blindMode}
            onChange={(e) => setBlindMode(e.target.checked)}
          />
          <span>{t('settings.blind.label')}</span>
        </label>
        <button type="button" className="review-btn" onClick={onOpenReview}>
          {t('review.title')}
          {dueCount > 0 && <span className="due-badge">{dueCount}</span>}
        </button>
        <ProfileMenu onDataImported={onDataImported} />
        <button type="button" className="settings-btn" onClick={onOpenSettings}>
          ⚙ {t('nav.settings')}
        </button>
      </div>
    </header>
  );
}
