'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GripVertical } from 'lucide-react';
import type {
  DraggableAttributes,
} from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { ProjectContextMenu } from './project-context-menu';
import { getScenario } from '@/lib/scenarios';
import { cn, formatDate } from '@/lib/utils';
import type { Project } from '@/lib/types';

export interface ProjectCardProps {
  project: Project;
  itemCount: number;
  onRename: (id: string, name: string) => Promise<void> | void;
  onRequestDelete: (project: Project) => void;
  deleting?: boolean;
  dragging?: boolean;
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: SyntheticListenerMap;
    setActivatorNodeRef?: (el: HTMLElement | null) => void;
  };
}

export function ProjectCard({
  project,
  itemCount,
  onRename,
  onRequestDelete,
  deleting,
  dragging,
  dragHandleProps,
}: ProjectCardProps) {
  const scenario = getScenario(project.scenarioId);
  const color = scenario?.color ?? '#6B6B63';

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(project.name), [project.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setName(project.name);
    setEditing(true);
  };

  const commit = async () => {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === project.name) {
      setName(project.name); // revert empty / unchanged
      return;
    }
    await onRename(project.id, trimmed);
  };

  const cancel = () => {
    setName(project.name);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        // pl-9 reserves a left gutter for the drag handle so it never overlaps content.
        'group relative flex flex-col rounded-xl border border-border bg-surface py-5 pl-9 pr-5 shadow-sm transition-all duration-200',
        !dragging && !editing && 'hover:-translate-y-0.5 hover:shadow-md',
        dragging && 'opacity-75 shadow-lg',
        deleting && 'pointer-events-none scale-95 opacity-0'
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Stretched navigation link (disabled while editing) */}
      <Link
        href={`/projects/${project.id}`}
        aria-label={`Open ${project.name}`}
        className={cn(
          'absolute inset-0 z-0 rounded-xl',
          editing && 'pointer-events-none'
        )}
      />

      {/* Grip handle — occupies the full-height left gutter, clear of content */}
      <button
        ref={dragHandleProps?.setActivatorNodeRef}
        {...(dragHandleProps?.attributes ?? {})}
        {...(dragHandleProps?.listeners ?? {})}
        aria-label="Drag to reorder"
        className="absolute inset-y-0 left-0 z-10 flex w-8 cursor-grab touch-none items-center justify-center rounded-l-xl text-text-tertiary opacity-100 transition-opacity hover:text-text-secondary active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon name={scenario?.icon ?? 'HelpCircle'} className="h-5 w-5" />
        </div>

        <div className="relative z-10 flex items-center gap-1">
          {scenario && <Badge color={color}>{scenario.name}</Badge>}
          <ProjectContextMenu
            onRename={startEdit}
            onDelete={() => onRequestDelete(project)}
          />
        </div>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 mt-4 w-full rounded-md border border-border bg-surface px-2 py-1 text-lg font-semibold text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      ) : (
        // No z-index: sits below the stretched navigation link so clicking the
        // title opens the project. Renaming is available via the ⋯ menu.
        <h3 className="mt-4 w-fit text-lg font-semibold text-text-primary group-hover:text-accent">
          {project.name}
        </h3>
      )}

      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-text-tertiary">
        <span>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <span>Updated {formatDate(project.updatedAt)}</span>
      </div>
    </div>
  );
}
