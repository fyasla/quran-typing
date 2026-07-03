import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  CircleUserRound,
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
import { cloudEnabled } from '../lib/supabase';
import { useAuth, type SyncState } from '../store/auth';
import { exportProgress, importProgress } from '../store/progress';
import { useActiveProfile, useProfiles } from '../store/profiles';
import { cloudProfileId } from '../store/sync';
import AccountModal from './AccountModal';

interface Props {
  /** Appelé après un import de données réussi (recharge la progression) */
  onDataImported: () => void;
}

const SYNC_ICONS: Record<SyncState, typeof Cloud> = {
  synced: Cloud,
  pending: RefreshCw,
  offline: CloudOff,
  error: CloudAlert,
};

export default function ProfileMenu({ onDataImported }: Props) {
  const { t } = useTranslation();
  const { profiles, createProfile, switchProfile, deleteProfile } = useProfiles();
  const active = useActiveProfile();
  const { user, syncState, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Progression effective : compte connecté sinon profil local actif
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
    setMenuOpen(false);
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

  const handleDelete = () => {
    if (!active) return;
    if (window.confirm(t('profile.deleteConfirm', { name: active.name }))) {
      deleteProfile(active.id);
    }
  };

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(o) => {
          setMenuOpen(o);
          if (!o) setCreating(false);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="profile-btn text-foreground/80 max-w-40 sm:max-w-52"
            title={t('profile.label')}
          >
            <CircleUserRound />
            <span className="truncate">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* ===== Compte cloud ===== */}
          {cloudEnabled &&
            (user ? (
              <>
                <DropdownMenuLabel className="account-status">
                  <span className="block truncate text-[13px]">{user.email}</span>
                  <span
                    className={`sync-${syncState} mt-0.5 flex items-center gap-1.5 text-xs font-normal ${
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
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut />
                  {t('account.signOut')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : (
              <>
                <DropdownMenuItem
                  className="popover-item accent text-primary focus:text-primary font-medium"
                  onClick={() => setAccountOpen(true)}
                >
                  <Cloud className="text-primary" />
                  {t('account.signInOrCreate')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ))}

          {/* ===== Profils locaux (mode invité) ===== */}
          {!user && (
            <DropdownMenuGroup>
              {profiles.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className={`popover-item${p.id === active?.id ? ' active' : ''}`}
                  onClick={() => switchProfile(p.id)}
                >
                  <Check className={p.id === active?.id ? 'opacity-100' : 'opacity-0'} />
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
              {creating ? (
                <form
                  className="profile-create flex items-center gap-1.5 px-2 py-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitCreate();
                  }}
                >
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={t('profile.namePlaceholder')}
                    maxLength={24}
                    className="border-input bg-card h-8 min-w-0 flex-1 rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                  <Button type="submit" size="icon-sm" disabled={!name.trim()}>
                    <Check />
                  </Button>
                </form>
              ) : (
                <DropdownMenuItem
                  className="popover-item"
                  onSelect={(e) => {
                    e.preventDefault();
                    setCreating(true);
                  }}
                >
                  <Plus />
                  {t('profile.create')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          )}

          {/* ===== Export / import / suppression ===== */}
          {effectiveId && (
            <DropdownMenuGroup>
              <DropdownMenuItem className="popover-item" onClick={handleExport}>
                <Download />
                {t('profile.export')}
              </DropdownMenuItem>
              <DropdownMenuItem className="popover-item" onClick={() => fileRef.current?.click()}>
                <Upload />
                {t('profile.import')}
              </DropdownMenuItem>
              {!user && active && (
                <DropdownMenuItem className="popover-item danger" variant="destructive" onClick={handleDelete}>
                  <Trash2 />
                  {t('profile.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}
