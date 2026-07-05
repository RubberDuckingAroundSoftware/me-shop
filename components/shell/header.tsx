import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export interface HeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional back link (e.g. back to Home from a project). */
  backHref?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, backHref, actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
      <div className="flex items-center gap-2 min-w-0 sm:gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 text-sm text-text-secondary">{subtitle}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
