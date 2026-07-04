import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { getScenario } from '@/lib/scenarios';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/lib/types';

export interface ProjectCardProps {
  project: Project;
  itemCount: number;
}

export function ProjectCard({ project, itemCount }: ProjectCardProps) {
  const scenario = getScenario(project.scenarioId);
  const color = scenario?.color ?? '#6B6B63';

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon name={scenario?.icon ?? 'HelpCircle'} className="h-5 w-5" />
        </div>
        {scenario && <Badge color={color}>{scenario.name}</Badge>}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-text-primary group-hover:text-accent">
        {project.name}
      </h3>

      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-text-tertiary">
        <span>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <span>Updated {formatDate(project.updatedAt)}</span>
      </div>
    </Link>
  );
}
