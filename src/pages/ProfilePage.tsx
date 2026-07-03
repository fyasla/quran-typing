import { Button } from '@/components/ui/button';
import {
  Check,
  Cloud,
  CloudAlert,
  CloudOff,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AccountModal from '../components/AccountModal';
import { cloudEnabled } from '../lib/supabase';
import { useAuth, type SyncState } from '../store/auth';
import { exportProgress, importProgress } from '../store/progress';
import { useActiveProfile, useProfiles } from '../store/profiles';
import { cloudProfileId } from '../store/sync';
import PageShell from './PageShell';

interface Props {
  onDataImported: () => void;
}

const SYNC_ICONS: Record<SyncState, typeof Cloud> = {
  synced: Cloud,
  pending: RefreshCw,
  offline: CloudOff,
  error: CloudAlert,
};

export default function ProfilePage({ onDataImported }: Props) {
  const { t } = useTranslation();
  const { profiles, createProfile, switchProfile, deleteProfile } = useProfiles();
  const active = useActiveProfile();
  const { user, syncState, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveId = user ? cloudProfileId(user.id) : (active?.id ?? null);
  const displayName = user
    ? ((user.user_metadata?.name as string | undefined) ?? user.email ?? '')
    : (active?.name ?? t('profile.guest'));
  const SyncIcon = SYNC_ICONS[syncState];

  const submitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProfile(trimmed);
    setName('');
    setCreating(false);
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
    if (ok) onDataImported();
    else window.alert(t('profile.importError'));
  };

  return (
    <PageShell
      title={t('profile.title')}
      subtitle={t('profile.subtitle')}
      className="profile-page"
    >
      {/* ===== Compte cloud ===== */}
      {cloudEnabled && (
        <section className="bg-card rounded-xl border px-4 py-4">
          <h3 className="mb-2 text-[13px] font-semibold">{t('profile.cloudTitle')}</h3>
          {user ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="account-status min-w-0">
                <p className="truncate text-sm font-medium">{user.email}</p>
                <p
                  className={`mt-0.5 flex items-center gap-1.5 text-xs ${
                    syncState === 'error'
                      ? 'text-destructive'
                      : syncState === 'synced'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  <SyncIcon
                    className={`size-3.5 ${syncState === 'pending' ? 'animate-spin' : ''}`}
                  />
                  {t(`account.sync.${syncState}`)}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => signOut()}>
                <LogOut />
                {t('account.signOut')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground max-w-xs text-[13px] leading-relaxed">
                {t('profile.cloudDesc')}
              </p>
              <Button
                size="sm"
                className="popover-item accent"
                onClick={() => setAccountOpen(true)}
              >
                <Cloud />
                {t('account.signInOrCreate')}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ===== Profils locaux (mode invité) ===== */}
      {!user && (
        <section className="bg-card rounded-xl border px-4 py-4">
          <h3 className="mb-1 text-[13px] font-semibold">{t('profile.localTitle')}</h3>
          <p className="text-muted-foreground mb-3 text-[13px] leading-relaxed">
            {t('profile.localDesc')}
          </p>
          <ul className="divide-border/70 divide-y">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  className={`popover-item${p.id === active?.id ? ' active' : ''} flex flex-1 items-center gap-2 text-start text-sm`}
                  onClick={() => switchProfile(p.id)}
                >
                  <Check
                    className={`text-primary size-4 ${p.id === active?.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className={p.id === active?.id ? 'font-medium' : ''}>{p.name}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t('profile.delete')}
                  onClick={() => {
                    if (window.confirm(t('profile.deleteConfirm', { name: p.name }))) {
                      deleteProfile(p.id);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          {creating ? (
            <form
              className="profile-create mt-2 flex items-center gap-1.5"
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
                className="border-input bg-card h-9 min-w-0 flex-1 rounded-md border px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
              <Button type="submit" size="icon-sm" disabled={!name.trim()}>
                <Check />
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="popover-item mt-2"
              onClick={() => setCreating(true)}
            >
              <Plus />
              {t('profile.create')}
            </Button>
          )}
        </section>
      )}

      {/* ===== Données ===== */}
      {effectiveId && (
        <section className="bg-card rounded-xl border px-4 py-4">
          <h3 className="mb-1 text-[13px] font-semibold">{t('profile.dataTitle')}</h3>
          <p className="text-muted-foreground mb-3 text-[13px] leading-relaxed">
            {t('profile.dataDesc')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download />
              {t('profile.export')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload />
              {t('profile.import')}
            </Button>
          </div>
        </section>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </PageShell>
  );
}
