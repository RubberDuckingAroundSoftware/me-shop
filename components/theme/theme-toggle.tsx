'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { useTheme, type Theme } from './theme-provider';

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

/** Segmented Light / Dark / System control. Compact and icon-only. */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-border bg-surface p-0.5',
        collapsed ? 'flex-col gap-0.5' : 'gap-0.5'
      )}
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        const button = (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center justify-center rounded-md transition-colors',
              collapsed ? 'h-7 w-7' : 'h-7 flex-1 px-2',
              active
                ? 'bg-accent-light text-accent'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
        return collapsed ? (
          <Tooltip key={value} content={label}>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}
