import { cn } from '@/lib/utils';
import { ArrowBigUp, ChevronDown } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE, KEY_ROWS, SHIFT } from '../typing/keymap';

interface Props {
  onText: (text: string) => void;
  onHide: () => void;
  /** Mesure de la hauteur (élément `fixed`, hors du flux normal) */
  ref?: React.Ref<HTMLDivElement>;
}

/** Marques combinantes rendues sur porteuse tatweel (comme les capuchons réels) */
function keycap(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  const combining =
    (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670 || (cp >= 0x06d6 && cp <= 0x06ed);
  return combining && ch.length === 1 ? `ـ${ch}` : ch;
}

/** Barre Coran : marques et lettres spéciales fréquentes, un tap sans Maj */
const QURAN_BAR = [
  'َ', // فتحة
  'ً', // فتحتان
  'ُ', // ضمة
  'ٌ', // ضمتان
  'ِ', // كسرة
  'ٍ', // كسرتان
  'ّ', // شدة
  'ْ', // سكون
  'ٰ', // ألف خنجرية
  'ۥ', // واو صغيرة
  'ۦ', // ياء صغيرة
  'ٱ',
  'آ',
  'أ',
  'إ',
  'ء',
];

type ShiftState = 'off' | 'once' | 'locked';

/**
 * Clavier arabe virtuel : disposition Arabic 101 fidèle aux vrais claviers
 * (mêmes positions, keycaps base + Maj) + barre de caractères du Coran.
 */
export default function VirtualKeyboard({ onText, onHide, ref }: Props) {
  const { t } = useTranslation();
  const [shift, setShift] = useState<ShiftState>('off');
  const lastShiftTap = useRef(0);

  const emit = useCallback(
    (ch: string) => {
      onText(ch);
      navigator.vibrate?.(8);
      setShift((s) => (s === 'once' ? 'off' : s));
    },
    [onText]
  );

  const tapShift = useCallback(() => {
    const now = Date.now();
    if (now - lastShiftTap.current < 350) {
      setShift('locked');
    } else {
      setShift((s) => (s === 'off' ? 'once' : 'off'));
    }
    lastShiftTap.current = now;
    navigator.vibrate?.(8);
  }, []);

  const shifted = shift !== 'off';

  const key = (
    content: React.ReactNode,
    onTap: () => void,
    opts: { className?: string; label?: string; active?: boolean } = {}
  ) => (
    <button
      type="button"
      aria-label={opts.label}
      className={cn(
        'vk-key bg-card active:bg-accent flex h-11 min-w-0 flex-1 items-center justify-center rounded-md border shadow-xs transition-colors select-none sm:h-12',
        opts.active && 'bg-accent border-primary/50 text-accent-foreground',
        opts.className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
    >
      {content}
    </button>
  );

  return (
    <div
      ref={ref}
      className="virtual-keyboard border-border/70 bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      dir="ltr"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-1 px-1.5 py-1.5 sm:gap-1.5 sm:px-3 sm:py-2">
        {/* Barre Coran : harakats et lettres spéciales en un tap */}
        <div className="vk-quran-bar flex gap-1 overflow-x-auto sm:gap-1.5">
          {QURAN_BAR.map((ch) => (
            <button
              key={ch}
              type="button"
              aria-label={ch}
              className="vk-qkey bg-muted/70 text-primary active:bg-accent brand-glyph flex h-9 min-w-9 flex-1 items-center justify-center rounded-md text-lg transition-colors select-none"
              onPointerDown={(e) => {
                e.preventDefault();
                emit(ch);
              }}
            >
              {keycap(ch)}
            </button>
          ))}
        </div>

        {/* Rangées Arabic 101 */}
        {KEY_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1 sm:gap-1.5">
            {ri === 2 && (
              <button
                type="button"
                aria-label={t('vk.shift')}
                aria-pressed={shifted}
                className={cn(
                  'vk-shift bg-card active:bg-accent flex h-11 max-w-14 min-w-0 flex-[1.4] items-center justify-center rounded-md border shadow-xs transition-colors select-none sm:h-12',
                  shifted && 'bg-accent border-primary/50 text-accent-foreground'
                )}
                onPointerDown={(e) => {
                  e.preventDefault();
                  tapShift();
                }}
              >
                <ArrowBigUp className={cn('size-5', shift === 'locked' && 'fill-current')} />
              </button>
            )}
            {row.map((code) => {
              const base = BASE[code];
              const alt = SHIFT[code];
              const ch = shifted ? (alt ?? base) : base;
              if (!base) return null;
              return key(
                <span className="relative flex w-full items-center justify-center">
                  <span className="brand-glyph text-xl leading-none">{keycap(ch)}</span>
                  {alt && (
                    <span className="text-muted-foreground absolute -top-1 right-1 text-[10px] leading-none">
                      {keycap(shifted ? base : alt)}
                    </span>
                  )}
                </span>,
                () => emit(ch),
                { label: ch, className: `vk-${code}` }
              );
            })}
            {ri === 2 &&
              key(<ChevronDown className="size-5" />, onHide, {
                className: 'vk-hide max-w-14 grow-[1.4] text-muted-foreground',
                label: t('vk.hide'),
              })}
          </div>
        ))}

        {/* Espace */}
        <div className="flex gap-1 sm:gap-1.5">
          <div className="flex-[1]" />
          {key(<span className="text-muted-foreground text-xs">{t('vk.space')}</span>, () => emit(' '), {
            className: 'vk-space flex-[6]',
            label: t('vk.space'),
          })}
          <div className="flex-[1]" />
        </div>
      </div>
    </div>
  );
}
