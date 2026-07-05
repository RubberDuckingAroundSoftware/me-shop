'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

const DropdownCtx = createContext<{ close: () => void }>({ close: () => {} });

export interface DropdownMenuProps {
  /** Element rendered inside the trigger button. */
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  triggerClassName?: string;
  'aria-label'?: string;
}

/** Minimal accessible dropdown: outside-click + Escape to close. */
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  triggerClassName,
  'aria-label': ariaLabel,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownCtx.Provider value={{ close: () => setOpen(false) }}>
            {children}
          </DropdownCtx.Provider>
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps {
  onSelect: () => void;
  children: React.ReactNode;
  danger?: boolean;
  icon?: React.ReactNode;
}

export function DropdownItem({
  onSelect,
  children,
  danger,
  icon,
}: DropdownItemProps) {
  const { close } = useContext(DropdownCtx);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
        onSelect();
      }}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-text-primary hover:bg-surface-hover'
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
