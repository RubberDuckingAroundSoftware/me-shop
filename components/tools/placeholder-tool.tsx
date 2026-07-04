import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import type { ToolMeta } from './tool-registry';

export function PlaceholderTool({ meta }: { meta: ToolMeta }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-hover text-text-secondary">
          <Icon name={meta.icon} className="h-7 w-7" />
        </div>
        <div className="mb-3 flex justify-center">
          <Badge className="bg-accent-light text-accent">Coming Soon</Badge>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">{meta.name}</h2>
        <p className="mt-2 text-sm text-text-secondary">{meta.description}</p>
      </div>
    </div>
  );
}
