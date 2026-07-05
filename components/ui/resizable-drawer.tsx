'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResizableDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number; // absolute px; defaults to 70% of viewport
  storageKey?: string;
}

export function ResizableDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  defaultWidth = 480,
  minWidth = 360,
  maxWidth,
  storageKey,
}: ResizableDrawerProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [resizing, setResizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Restore persisted width on mount.
  useEffect(() => {
    setMounted(true);
    if (storageKey) {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved && !Number.isNaN(saved)) setWidth(saved);
    }
  }, [storageKey]);

  // Lock body scroll + Escape to close while open.
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

  const resolvedMax = () =>
    maxWidth ?? Math.round((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.7);

  const clamp = (w: number) => Math.min(resolvedMax(), Math.max(minWidth, w));

  const onHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setResizing(true);

    const onMove = (ev: MouseEvent) => {
      // Drawer is anchored right, so dragging left widens it.
      const delta = startX - ev.clientX;
      setWidth(clamp(startWidth + delta));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      setResizing(false);
      setWidth((w) => {
        if (storageKey) localStorage.setItem(storageKey, String(w));
        return w;
      });
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onMouseDown={onClose} />

      {/* Drawer */}
      <aside
        className={cn(
          'absolute inset-y-0 right-0 flex flex-col bg-surface shadow-xl',
          // Only animate the slide-in, never during an active drag.
          !resizing && mounted && 'transition-transform duration-200 ease-out',
          'w-full max-w-full sm:w-auto'
        )}
        style={{ width: `min(${width}px, 100%)` }}
      >
        {/* Resize handle (hidden on narrow screens where the drawer is full width) */}
        <div
          onMouseDown={onHandleMouseDown}
          className="group absolute left-0 top-0 z-10 hidden h-full w-1.5 cursor-col-resize sm:block"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize drawer"
        >
          <div className="absolute left-0 top-0 h-full w-px bg-border transition-colors group-hover:bg-accent" />
          <div className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors group-hover:bg-accent" />
        </div>

        {/* Sticky header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 border-t border-border px-5 py-4">{footer}</div>
        )}
      </aside>
    </div>
  );
}
