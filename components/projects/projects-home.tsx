'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '@/components/shell/header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProjectCard } from './project-card';
import { CreateProjectDialog } from './create-project-dialog';
import type { Project } from '@/lib/types';
import { ShoppingBag } from 'lucide-react';

export interface ProjectsHomeProps {
  projects: (Project & { itemCount: number })[];
}

export function ProjectsHome({ projects }: ProjectsHomeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} itemCount={p.itemCount} />
            ))}

            <button
              onClick={() => setDialogOpen(true)}
              className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-5 text-text-tertiary transition-colors hover:border-accent hover:text-accent"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New Project</span>
            </button>
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
