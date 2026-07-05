'use client';

import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.txt,.md';
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export interface FileDropZoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/** Drag-and-drop file input with click-to-browse fallback and size guard. */
export function FileDropZone({
  file,
  onFileChange,
  onError,
  disabled,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      onError?.('File must be under 10MB.');
      return;
    }
    onError?.('');
    onFileChange(f);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text-primary">
              {file.name}
            </div>
            <div className="text-xs text-text-tertiary">
              {formatSize(file.size)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFileChange(null)}
          disabled={disabled}
          aria-label="Remove file"
          className="rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        accept(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
        dragging
          ? 'border-accent bg-accent-light'
          : 'border-border hover:border-accent/60 hover:bg-surface-hover',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <UploadCloud className="h-8 w-8 text-text-tertiary" />
      <div className="text-sm text-text-primary">
        <span className="font-medium text-accent">Drop file here</span> or click
        to browse
      </div>
      <div className="text-xs text-text-tertiary">JPG, PNG, PDF, TXT · up to 10MB</div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          accept(e.target.files?.[0]);
          // Allow re-selecting the same file after removal.
          e.target.value = '';
        }}
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
