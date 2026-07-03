import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
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
  RefreshCw,
  UserRoundCog,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuth, type SyncState } from '../store/auth';
import { useActiveProfile, useProfiles } from '../store/profiles';

const SYNC_ICONS: Record<SyncState, typeof Cloud> = {
  synced: Cloud,
  pending: RefreshCw,
  offline: CloudOff,
  error: CloudAlert,
};

/** Menu profil du header : statut, bascule rapide de profil, lien vers la page Profil */
export default function ProfileMenu() {
  const { t } = useTranslation();
  const { profiles, switchProfile } = useProfiles();
  const active = useActiveProfile();
  const { user, syncState } = useAuth();
  const [, navigate] = useLocation();

  const displayName = user
    ? ((user.user_metadata?.name as string | undefined) ?? user.email ?? '')
    : (active?.name ?? t('profile.guest'));
  const SyncIcon = SYNC_ICONS[syncState];

  return (
    <DropdownMenu>
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
        {user && (
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
                <SyncIcon className={`size-3.5 ${syncState === 'pending' ? 'animate-spin' : ''}`} />
                {t(`account.sync.${syncState}`)}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Bascule rapide de profil local (mode invité) */}
        {!user && profiles.length > 0 && (
          <>
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
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          className="popover-item accent text-primary focus:text-primary font-medium"
          onClick={() => navigate('/profile')}
        >
          <UserRoundCog className="text-primary" />
          {t('profile.manage')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
