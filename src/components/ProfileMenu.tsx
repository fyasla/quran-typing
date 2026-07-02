import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportProgress, importProgress } from '../store/progress';
import { useActiveProfile, useProfiles } from '../store/profiles';

interface Props {
  /** Appelé après un import de données réussi (recharge la progression) */
  onDataImported: () => void;
}

export default function ProfileMenu({ onDataImported }: Props) {
  const { t } = useTranslation();
  const { profiles, createProfile, switchProfile, deleteProfile } = useProfiles();
  const active = useActiveProfile();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const submitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProfile(trimmed);
    setName('');
    setCreating(false);
    setOpen(false);
  };

  const handleExport = () => {
    if (!active) return;
    const json = exportProgress(active.id, active.name);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quran-typing-${active.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !active) return;
    const ok = importProgress(active.id, await file.text());
    if (ok) {
      onDataImported();
      setOpen(false);
    } else {
      window.alert(t('profile.importError'));
    }
  };

  const handleDelete = () => {
    if (!active) return;
    if (window.confirm(t('profile.deleteConfirm', { name: active.name }))) {
      deleteProfile(active.id);
      setOpen(false);
    }
  };

  return (
    <div className="profile-menu">
      <button
        type="button"
        className="profile-btn"
        onClick={() => setOpen(!open)}
        title={t('profile.label')}
      >
        ◉ {active ? active.name : t('profile.guest')}
      </button>

      {open && (
        <>
          <div className="popover-backdrop" onClick={() => setOpen(false)} />
          <div className="popover">
            {profiles.length > 0 && (
              <div className="popover-section">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`popover-item${p.id === active?.id ? ' active' : ''}`}
                    onClick={() => {
                      switchProfile(p.id);
                      setOpen(false);
                    }}
                  >
                    {p.id === active?.id ? '✓ ' : ''}
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <div className="popover-section">
              {creating ? (
                <form
                  className="profile-create"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitCreate();
                  }}
                >
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('profile.namePlaceholder')}
                    maxLength={24}
                  />
                  <button type="submit" disabled={!name.trim()}>
                    ✓
                  </button>
                </form>
              ) : (
                <button type="button" className="popover-item" onClick={() => setCreating(true)}>
                  ＋ {t('profile.create')}
                </button>
              )}
            </div>

            {active && (
              <div className="popover-section">
                <button type="button" className="popover-item" onClick={handleExport}>
                  ⇩ {t('profile.export')}
                </button>
                <button
                  type="button"
                  className="popover-item"
                  onClick={() => fileRef.current?.click()}
                >
                  ⇧ {t('profile.import')}
                </button>
                <button type="button" className="popover-item danger" onClick={handleDelete}>
                  ✕ {t('profile.delete')}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  );
}
