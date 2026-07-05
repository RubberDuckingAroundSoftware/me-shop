'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Render as a right-hand slide-over panel instead of a centered modal. */
  variant?: 'modal' | 'slideover';
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  variant = 'modal',
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const isSlideover = variant === 'slideover';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex bg-black/30',
        isSlideover ? 'justify-end' : 'items-center justify-center p-4'
      )}
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'flex max-h-full flex-col bg-surface shadow-xl',
          isSlideover
            ? 'h-full w-full max-w-md rounded-l-xl'
            : 'w-full max-w-lg rounded-xl',
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
