'use client';

import { useState } from 'react';
import { Header } from '@/components/shell/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ToolSidebar } from '@/components/tools/tool-sidebar';
import {
  getToolMeta,
  getToolName,
  getToolIcon,
} from '@/components/tools/tool-registry';
import { PlaceholderTool } from '@/components/tools/placeholder-tool';
import { RubberDuck } from '@/components/tools/rubber-duck';
import { ReverseCatalog } from '@/components/tools/reverse-catalog';
import { RecipeBuilder } from '@/components/tools/recipe-builder';
import { EditableProjectTitle } from './editable-project-title';
import { getScenario } from '@/lib/scenarios';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/lib/types';

export interface ProjectWorkspaceProps {
  project: Project;
  productCount: number;
  recipeCount: number;
}

export function ProjectWorkspace({
  project,
  productCount,
  recipeCount,
}: ProjectWorkspaceProps) {
  const scenario = getScenario(project.scenarioId);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  const activeMeta = activeToolId ? getToolMeta(activeToolId) : null;
  const color = scenario?.color ?? '#6B6B63';

  const isGeneral = scenario?.id === 'general';

  const renderTool = () => {
    if (!activeToolId || !activeMeta) {
      if (isGeneral && productCount === 0) return <GeneralEmptyState />;
      return <Overview />;
    }
    if (!activeMeta.functional)
      return <PlaceholderTool meta={activeMeta} />;

    switch (activeToolId) {
      case 'rubber-duck':
        return <RubberDuck project={project} />;
      case 'reverse-catalog':
        return <ReverseCatalog project={project} />;
      case 'recipe-builder':
        return <RecipeBuilder project={project} />;
      default:
        return <PlaceholderTool meta={activeMeta} />;
    }
  };

  function Overview() {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}1A`, color }}
            >
              <Icon name={scenario?.icon ?? 'HelpCircle'} className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {project.name}
              </h2>
              {scenario && (
                <p className="text-sm text-text-secondary">
                  {scenario.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Catalog items" value={productCount} />
            {scenario?.tools.includes('recipe-builder') && (
              <Stat label={isGeneral ? 'Lists' : 'Recipes'} value={recipeCount} />
            )}
            <Stat label="Tools" value={scenario?.tools.length ?? 0} />
          </div>

          <div className="mt-6 border-t border-border pt-4 text-xs text-text-tertiary">
            Created {formatDate(project.createdAt)} · Updated{' '}
            {formatDate(project.updatedAt)}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-text-secondary">
            Available tools
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {scenario?.tools.map((id) => {
              const meta = getToolMeta(id);
              if (!meta) return null;
              return (
                <button
                  key={id}
                  onClick={() => setActiveToolId(id)}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-text-secondary">
                    <Icon
                      name={getToolIcon(id, project.scenarioId)}
                      className="h-4 w-4"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      {getToolName(id, project.scenarioId)}
                      {!meta.functional && (
                        <Badge className="bg-accent-light text-accent">
                          Soon
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {meta.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function GeneralEmptyState() {
    const ideas = [
      'Track vintage camera lenses across eBay and local shops',
      'Build a home office piece by piece',
      'Plan a camping trip and source gear',
      'Hunt for vinyl records at fair prices',
      'Assemble a PC build with compatible parts',
    ];
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-16">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <Icon name={scenario?.icon ?? 'ShoppingBag'} className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-text-primary">
            What are you looking for?
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            This is your space. Some ideas:
          </p>
          <ul className="mt-4 space-y-2">
            {ideas.map((idea) => (
              <li
                key={idea}
                className="flex items-start gap-2.5 text-sm text-text-primary"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {idea}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-text-secondary">
            Start by adding a product to your catalog, or open the Rubber Duck to
            think it through.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setActiveToolId('reverse-catalog')}>
              <Icon name="Plus" className="h-4 w-4" />
              Add Product
            </Button>
            <Button
              variant="secondary"
              onClick={() => setActiveToolId('rubber-duck')}
            >
              <Icon name="MessageCircle" className="h-4 w-4" />
              Open Rubber Duck
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title={
          <EditableProjectTitle
            projectId={project.id}
            initialName={project.name}
          />
        }
        backHref="/"
        subtitle={
          scenario && (
            <span className="inline-flex items-center gap-2">
              <Badge color={color}>{scenario.name}</Badge>
            </span>
          )
        }
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ToolSidebar
          toolIds={scenario?.tools ?? []}
          scenarioId={project.scenarioId}
          activeToolId={activeToolId}
          onSelect={setActiveToolId}
          onOverview={() => setActiveToolId(null)}
          overviewActive={activeToolId === null}
        />
        <div className="min-w-0 flex-1 overflow-y-auto bg-bg">{renderTool()}</div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-hover px-4 py-3">
      <div className="text-2xl font-semibold text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}
