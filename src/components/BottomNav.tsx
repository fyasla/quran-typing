import { cn } from '@/lib/utils';
import { BookOpen, ChartColumn, CircleUserRound, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';

interface Props {
  /** Pages dues aujourd'hui (pastille sur l'onglet Stats) */
  dueCount: number;
}

/** Barre d'onglets mobile (masquée ≥ md) : navigation entre les pages */
export default function BottomNav({ dueCount }: Props) {
  const { t } = useTranslation();
  const [location] = useLocation();

  const tabs = [
    { key: 'read', href: '/', label: t('nav.read'), icon: BookOpen, badge: 0 },
    { key: 'stats', href: '/stats', label: t('nav.stats'), icon: ChartColumn, badge: dueCount },
    { key: 'profile', href: '/profile', label: t('profile.label'), icon: CircleUserRound, badge: 0 },
    { key: 'settings', href: '/settings', label: t('nav.settings'), icon: Settings, badge: 0 },
  ];

  return (
    <nav
      className="border-border/70 bg-card/90 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label={t('nav.settings')}
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ key, href, label, icon: Icon, badge }) => {
          const active = location === href;
          return (
            <Link
              key={key}
              href={href}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
