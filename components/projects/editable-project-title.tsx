'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Double-click-to-edit project title for the workspace header. */
export function EditableProjectTitle({
  projectId,
  initialName,
}: {
  projectId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(name);
    setEditing(true);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === name) {
      setDraft(name);
      return;
    }
    setName(trimmed);
    await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => {});
    router.refresh();
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        className="w-full max-w-full rounded-md border border-border bg-surface px-1.5 py-0.5 text-xl font-semibold tracking-tight text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-2xl"
      />
    );
  }

  return (
    <span
      onDoubleClick={startEdit}
      className="cursor-text"
      title="Double-click to rename"
    >
      {name}
    </span>
  );
}
