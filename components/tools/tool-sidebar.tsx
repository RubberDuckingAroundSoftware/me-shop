'use client';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { getToolMeta } from './tool-registry';

export interface ToolSidebarProps {
  toolIds: string[];
  activeToolId: string | null;
  onSelect: (id: string | null) => void;
  /** Label for the "overview" (no tool selected) entry. */
  onOverview: () => void;
  overviewActive: boolean;
}

export function ToolSidebar({
  toolIds,
  activeToolId,
  onSelect,
  onOverview,
  overviewActive,
}: ToolSidebarProps) {
  const itemBase =
    'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors md:w-full';

  return (
    // Horizontal, scrollable tab strip on mobile; vertical rail from md up.
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface p-2 md:w-[200px] md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:p-3">
      <button
        onClick={onOverview}
        className={cn(
          itemBase,
          overviewActive
            ? 'bg-accent-light text-accent'
            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
        )}
      >
        <Icon name="Home" className="h-4 w-4 shrink-0" />
        Overview
      </button>

      <div className="my-2 hidden px-3 text-xs font-medium uppercase tracking-wide text-text-tertiary md:block">
        Tools
      </div>

      {toolIds.map((id) => {
        const meta = getToolMeta(id);
        if (!meta) return null;
        const active = activeToolId === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              itemBase,
              active
                ? 'bg-accent-light text-accent'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            <Icon name={meta.icon} className="h-4 w-4 shrink-0" />
            <span className="truncate">{meta.name}</span>
            {!meta.functional && (
              <span className="text-[10px] text-text-tertiary md:ml-auto">
                soon
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
