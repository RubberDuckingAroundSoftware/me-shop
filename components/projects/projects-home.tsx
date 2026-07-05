'use client';

import { useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Header } from '@/components/shell/header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProjectCard } from './project-card';
import { CreateProjectDialog } from './create-project-dialog';
import type { Project } from '@/lib/types';

type CardProject = Project & { itemCount: number };

export interface ProjectsHomeProps {
  projects: CardProject[];
}

export function ProjectsHome({ projects: initial }: ProjectsHomeProps) {
  const [projects, setProjects] = useState<CardProject[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRename = async (id: string, name: string) => {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered); // optimistic
    await fetch('/api/projects/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds: reordered.map((p) => p.id) }),
    }).catch(() => {});
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    setConfirmTarget(null);
    setDeletingId(id); // trigger fade-out
    await new Promise((r) => setTimeout(r, 200));
    await fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => {});
    setProjects((ps) => ps.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  return (
    <>
      <Header
        title="Your Projects"
        subtitle="Shopping projects, organized by what you're after."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {projects.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No projects yet"
            description="Create your first shopping project to start tracking the things you're hunting for."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create your first shopping project
              </Button>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SortableContext
                items={projects.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                {projects.map((p) => (
                  <SortableProjectCard
                    key={p.id}
                    project={p}
                    itemCount={p.itemCount}
                    deleting={deletingId === p.id}
                    onRename={handleRename}
                    onRequestDelete={setConfirmTarget}
                  />
                ))}
              </SortableContext>

              {/* New Project card — always last, not sortable */}
              <button
                onClick={() => setDialogOpen(true)}
                className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-5 text-text-tertiary transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">New Project</span>
              </button>
            </div>
          </DndContext>
        )}
      </div>

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
        title="Delete project?"
        confirmLabel="Delete"
        danger
      >
        <p>
          &ldquo;{confirmTarget?.name}&rdquo; and all its products, recipes, and
          conversations will be permanently deleted.
        </p>
        <p className="mt-2 font-medium text-text-primary">
          This cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

function SortableProjectCard({
  project,
  itemCount,
  deleting,
  onRename,
  onRequestDelete,
}: {
  project: CardProject;
  itemCount: number;
  deleting: boolean;
  onRename: (id: string, name: string) => Promise<void> | void;
  onRequestDelete: (p: Project) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectCard
        project={project}
        itemCount={itemCount}
        deleting={deleting}
        dragging={isDragging}
        onRename={onRename}
        onRequestDelete={onRequestDelete}
        dragHandleProps={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  );
}
