'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { scenarioList } from '@/lib/scenarios';
import { cn } from '@/lib/utils';
import type { ScenarioId } from '@/lib/types';

export interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setScenarioId(null);
    setError(null);
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!name.trim() || !scenarioId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scenarioId }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const { project } = await res.json();
      reset();
      onClose();
      router.push(`/projects/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title="New shopping project">
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Project name
          </label>
          <Input
            autoFocus
            placeholder="e.g. Rare Sci-Fi Collection"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim() && scenarioId) submit();
            }}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Choose a scenario
          </label>
          <div className="grid grid-cols-1 gap-2">
            {scenarioList.map((s) => {
              const selected = scenarioId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenarioId(s.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-accent bg-accent-light'
                      : 'border-border hover:bg-surface-hover'
                  )}
                >
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${s.color}1A`, color: s.color }}
                  >
                    <Icon name={s.icon} className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {s.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {s.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!name.trim() || !scenarioId || submitting}
          >
            {submitting ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
