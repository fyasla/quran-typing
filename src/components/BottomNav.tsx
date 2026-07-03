import { cn } from '@/lib/utils';
import { BookOpen, BookOpenCheck, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onOpenReview: () => void;
  onOpenSettings: () => void;
  /** Pages dues aujourd'hui (pastille sur l'onglet Révision) */
  dueCount: number;
  /** Vrai si un panneau est ouvert (l'onglet Lire est alors inactif) */
  reviewOpen: boolean;
  settingsOpen: boolean;
  onRead: () => void;
}

/** Barre d'onglets mobile (masquée ≥ md) */
export default function BottomNav({
  onOpenReview,
  onOpenSettings,
  dueCount,
  reviewOpen,
  settingsOpen,
  onRead,
}: Props) {
  const { t } = useTranslation();
  const readActive = !reviewOpen && !settingsOpen;

  const tabs = [
    {
      key: 'read',
      label: t('nav.read'),
      icon: BookOpen,
      active: readActive,
      onClick: onRead,
      badge: 0,
    },
    {
      key: 'review',
      label: t('review.title'),
      icon: BookOpenCheck,
      active: reviewOpen,
      onClick: onOpenReview,
      badge: dueCount,
    },
    {
      key: 'settings',
      label: t('nav.settings'),
      icon: Settings,
      active: settingsOpen,
      onClick: onOpenSettings,
      badge: 0,
    },
  ];

  return (
    <nav
      className="border-border/70 bg-card/90 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label={t('nav.settings')}
    >
      <div className="grid grid-cols-3">
        {tabs.map(({ key, label, icon: Icon, active, onClick, badge }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={cn(
              `bn-${key} relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors`,
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {badge > 0 && (
                <span className="bg-destructive absolute -top-1.5 -end-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
