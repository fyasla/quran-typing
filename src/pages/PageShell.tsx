import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/** Gabarit commun des pages (Stats, Profil, Réglages) */
export default function PageShell({ title, subtitle, children, className }: Props) {
  return (
    <div className={`page-shell mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 ${className ?? ''}`}>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
