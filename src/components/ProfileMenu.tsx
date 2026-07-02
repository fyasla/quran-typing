import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cloudEnabled } from '../lib/supabase';
import { useAuth } from '../store/auth';
import { exportProgress, importProgress } from '../store/progress';
import { useActiveProfile, useProfiles } from '../store/profiles';
import { cloudProfileId } from '../store/sync';
import AccountModal from './AccountModal';

interface Props {
  /** Appelé après un import de données réussi (recharge la progression) */
  onDataImported: () => void;
}

export default function ProfileMenu({ onDataImported }: Props) {
  const { t } = useTranslation();
  const { profiles, createProfile, switchProfile, deleteProfile } = useProfiles();
  const active = useActiveProfile();
  const { user, syncState, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Progression effective : compte connecté sinon profil local actif
  const effectiveId = user ? cloudProfileId(user.id) : (active?.id ?? null);
  const displayName = user
    ? ((user.user_metadata?.name as string | undefined) ?? user.email ?? '')
    : (active?.name ?? t('profile.guest'));

  const submitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProfile(trimmed);
    setName('');
    setCreating(false);
    setOpen(false);
  };

  const handleExport = () => {
    if (!effectiveId) return;
    const json = exportProgress(effectiveId, displayName);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quran-typing-${displayName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !effectiveId) return;
    const ok = importProgress(effectiveId, await file.text());
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
        ◉ {displayName}
      </button>

      {open && (
        <>
          <div className="popover-backdrop" onClick={() => setOpen(false)} />
          <div className="popover">
            {/* ===== Compte cloud ===== */}
            {cloudEnabled && (
              <div className="popover-section">
                {user ? (
                  <>
                    <div className="account-status">
                      <strong>{user.email}</strong>
                      <small className={`sync-${syncState}`}>
                        {t(`account.sync.${syncState}`)}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="popover-item"
                      onClick={() => {
                        signOut();
                        setOpen(false);
                      }}
                    >
                      ⎋ {t('account.signOut')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="popover-item accent"
                    onClick={() => {
                      setAccountOpen(true);
                      setOpen(false);
                    }}
                  >
                    ☁ {t('account.signInOrCreate')}
                  </button>
                )}
              </div>
            )}

            {/* ===== Profils locaux (mode invité) ===== */}
            {!user && profiles.length > 0 && (
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

            {!user && (
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
                  <button
                    type="button"
                    className="popover-item"
                    onClick={() => setCreating(true)}
                  >
                    ＋ {t('profile.create')}
                  </button>
                )}
              </div>
            )}

            {/* ===== Export / import / suppression ===== */}
            {effectiveId && (
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
                {!user && active && (
                  <button type="button" className="popover-item danger" onClick={handleDelete}>
                    ✕ {t('profile.delete')}
                  </button>
                )}
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

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
