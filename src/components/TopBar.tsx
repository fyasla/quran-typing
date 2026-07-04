import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartColumn, ChevronLeft, ChevronRight, Flame, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { TOTAL_PAGES, useSettings } from '../store/settings';
import type { Chapter } from '../types';
import ProfileMenu from './ProfileMenu';

interface Props {
  chapters: Chapter[];
  currentSurah: number | null;
  /** Jours d'affilée avec au moins une page écrite (flamme) */
  streak: number;
}

export default function TopBar({ chapters, currentSurah, streak }: Props) {
  const { t } = useTranslation();
  const { page, setPage } = useSettings();

  const handleSurahChange = (value: string) => {
    const chapter = chapters.find((c) => c.id === Number(value));
    if (chapter) setPage(chapter.pages[0]);
  };

  const pageControls = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
        aria-label={t('nav.prevPage')}
        className="text-muted-foreground"
      >
        <ChevronLeft className="rtl:rotate-180" />
      </Button>
      <input
        type="number"
        min={1}
        max={TOTAL_PAGES}
        value={page}
        onChange={(e) => setPage(Number(e.target.value))}
        aria-label={t('nav.page')}
        className="border-input bg-card h-8 w-14 rounded-md border text-center text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      <span className="text-muted-foreground hidden text-xs sm:inline">/ {TOTAL_PAGES}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setPage(page + 1)}
        disabled={page >= TOTAL_PAGES}
        aria-label={t('nav.nextPage')}
        className="text-muted-foreground"
      >
        <ChevronRight className="rtl:rotate-180" />
      </Button>
    </div>
  );

  return (
    <header className="border-border/70 bg-card/85 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        {/* Marque */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="brand-glyph text-primary text-2xl leading-none" aria-hidden="true">
            قٓ
          </span>
          <h1 className="hidden text-[15px] font-semibold tracking-tight lg:block">
            Quran Typing
          </h1>
        </Link>

        {/* Navigation sourate / page */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Select value={currentSurah ? String(currentSurah) : ''} onValueChange={handleSurahChange}>
            <SelectTrigger
              size="sm"
              className="bg-card w-full max-w-56 sm:max-w-64"
              aria-label={t('nav.surah')}
            >
              <SelectValue placeholder={t('nav.surah')} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {chapters.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  <span className="tabular-nums">{c.id}.</span> {c.nameSimple}
                  <span className="text-muted-foreground ms-1">{c.nameArabic}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="hidden md:block">{pageControls}</div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="review-btn text-foreground/80 relative hidden md:inline-flex"
          >
            <Link href="/stats">
              <ChartColumn />
              {t('nav.stats')}
              {streak > 0 && (
                <Badge className="streak-badge bg-gold/30 text-trophy gap-0.5 border-0 px-1.5 py-0 text-[11px] font-semibold">
                  <Flame className="size-3" />
                  {streak}
                </Badge>
              )}
            </Link>
          </Button>
          <ProfileMenu />
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label={t('nav.settings')}
            className="settings-btn text-muted-foreground hidden md:inline-flex"
          >
            <Link href="/settings">
              <Settings />
            </Link>
          </Button>
        </div>
      </div>

      {/* Contrôles de page sur mobile (le header desktop les a déjà) */}
      <div className="border-border/60 flex items-center justify-center border-t py-1 md:hidden">
        {pageControls}
      </div>
    </header>
  );
}
