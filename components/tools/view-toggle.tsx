'use client';

import { List, LayoutGrid } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type CatalogView = 'list' | 'board';

export interface ViewToggleProps {
  view: CatalogView;
  onChange: (view: CatalogView) => void;
}

/** List/Board toggle pill for the Reverse Catalog header. */
export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      <ToggleButton
        active={view === 'list'}
        label="List view"
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4" />
      </ToggleButton>
      <ToggleButton
        active={view === 'board'}
        label="Board view"
        onClick={() => onChange('board')}
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors',
          active
            ? 'bg-accent-light text-accent'
            : 'bg-transparent text-text-secondary hover:text-text-primary'
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
