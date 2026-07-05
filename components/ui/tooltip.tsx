'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  /** Only right is supported (sidebar sits on the left). */
  side?: 'right';
  /** Disable the tooltip (e.g. when the sidebar is expanded). */
  disabled?: boolean;
}

/** Minimal hover tooltip — inverted colors, right side, 300ms delay. */
export function Tooltip({ content, children, disabled }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    if (disabled) return;
    timer.current = setTimeout(() => setShow(true), 300);
  };
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setShow(false);
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      {show && !disabled && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap',
            'rounded-md px-2 py-1 text-xs font-medium shadow-md',
            'bg-text-primary text-bg'
          )}
        >
          {/* left-pointing arrow */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[color:var(--color-text-primary)]" />
          {content}
        </span>
      )}
    </span>
  );
}
