'use client';

import { useState } from 'react';
import { Dialog } from './dialog';
import { Button } from './button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** Reusable confirmation dialog with an async-aware confirm button. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className="text-sm text-text-secondary">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            onClick={confirm}
            disabled={busy}
            className={
              danger ? 'bg-danger text-white hover:bg-danger/90' : undefined
            }
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
