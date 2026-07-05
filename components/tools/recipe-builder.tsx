'use client';

import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Link2,
  Plus,
  Trash2,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { DropdownMenu, DropdownItem } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/lib/types';
import type { ToolProps } from './tool-registry';
import { RecipeForm, getLabels, type BuilderLabels } from './recipe-form';
import { ImportRecipeDialog, type ImportMode } from './import-recipe-dialog';

export function RecipeBuilder({ project }: ToolProps) {
  const labels = getLabels(project.scenarioId);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/recipes?projectId=${project.id}`);
    const { recipes } = await res.json();
    setRecipes(recipes);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  const toggleIngredient = async (recipe: Recipe, index: number) => {
    const ingredients = recipe.ingredients.map((ing, i) =>
      i === index ? { ...ing, found: !ing.found } : ing
    );
    // Optimistic update
    setRecipes((rs) =>
      rs.map((r) => (r.id === recipe.id ? { ...r, ingredients } : r))
    );
    await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    });
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm(`Delete this ${labels.noun}?`)) return;
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    await load();
  };

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-text-tertiary">Loading…</p>
    );
  }

  if (selected) {
    return (
      <RecipeDetail
        recipe={selected}
        labels={labels}
        onBack={() => setSelectedId(null)}
        onToggle={(i) => toggleIngredient(selected, i)}
        onDelete={() => deleteRecipe(selected.id)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {labels.toolName}
          </h2>
          <p className="text-sm text-text-secondary">
            {recipes.length}{' '}
            {recipes.length === 1 ? labels.noun : labels.nounPlural}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu
            align="right"
            aria-label="Import options"
            triggerClassName="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
            trigger={
              <>
                <Download className="h-4 w-4" />
                Import
                <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
              </>
            }
          >
            <DropdownItem
              icon={<Link2 className="h-4 w-4" />}
              onSelect={() => setImportMode('url')}
            >
              From URL
            </DropdownItem>
            <DropdownItem
              icon={<FileText className="h-4 w-4" />}
              onSelect={() => setImportMode('file')}
            >
              From File
            </DropdownItem>
            <DropdownItem
              icon={<Plus className="h-4 w-4" />}
              onSelect={() => setImportMode('text')}
            >
              From Text
            </DropdownItem>
          </DropdownMenu>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {labels.addButton}
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={labels.emptyTitle}
          description={labels.emptyDescription}
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              {labels.addButton}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => {
            const found = r.ingredients.filter((i) => i.found).length;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">{r.name}</div>
                  {r.description && (
                    <div className="truncate text-xs text-text-secondary">
                      {r.description}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-text-tertiary">
                  <div>
                    {r.ingredients.length}{' '}
                    {r.ingredients.length === 1
                      ? labels.itemNoun
                      : labels.itemNounPlural}
                  </div>
                  <div className="text-accent">
                    {found}/{r.ingredients.length} sourced
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={labels.addTitle}
        variant="slideover"
      >
        <RecipeForm
          projectId={project.id}
          labels={labels}
          onCancel={() => setFormOpen(false)}
          onCreated={async () => {
            setFormOpen(false);
            await load();
          }}
        />
      </Dialog>

      <ImportRecipeDialog
        open={importMode !== null}
        initialMode={importMode ?? 'url'}
        onClose={() => setImportMode(null)}
        projectId={project.id}
        scenarioId={project.scenarioId}
        onRecipeCreated={load}
      />
    </div>
  );
}

function RecipeDetail({
  recipe,
  labels,
  onBack,
  onToggle,
  onDelete,
}: {
  recipe: Recipe;
  labels: BuilderLabels;
  onBack: () => void;
  onToggle: (index: number) => void;
  onDelete: () => void;
}) {
  const found = recipe.ingredients.filter((i) => i.found).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Back to {labels.nounPlural}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <h2 className="text-2xl font-semibold text-text-primary">
        {recipe.name}
      </h2>
      {recipe.description && (
        <p className="mt-1 text-sm text-text-secondary">{recipe.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-tertiary">
        {recipe.servings !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings} servings
          </span>
        )}
        {recipe.prepTime && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Prep {recipe.prepTime}
          </span>
        )}
        {recipe.cookTime && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Cook {recipe.cookTime}
          </span>
        )}
      </div>

      {/* Ingredients checklist */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">
            {labels.itemsField}
          </h3>
          <span className="text-xs text-accent">
            {found}/{recipe.ingredients.length} sourced
          </span>
        </div>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
                <input
                  type="checkbox"
                  checked={ing.found}
                  onChange={() => onToggle(i)}
                  className="mt-0.5 h-4 w-4 accent-[color:var(--color-accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'text-sm',
                      ing.found
                        ? 'text-text-tertiary line-through'
                        : 'text-text-primary'
                    )}
                  >
                    <span className="font-medium">{ing.name}</span>
                    {(ing.quantity || ing.unit) && (
                      <span className="text-text-secondary">
                        {' '}
                        — {ing.quantity}
                        {ing.unit ? ` ${ing.unit}` : ''}
                      </span>
                    )}
                  </span>
                  {ing.notes && (
                    <span className="block text-xs text-text-tertiary">
                      {ing.notes}
                    </span>
                  )}
                  {ing.found && ing.sourceStore && (
                    <span className="block text-xs text-accent">
                      Sourced from {ing.sourceStore}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Instructions */}
      {recipe.instructions.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-text-primary">
            Instructions
          </h3>
          <ol className="space-y-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-light text-xs font-medium text-accent">
                  {i + 1}
                </span>
                <span className="text-text-primary">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recipe.notes && (
        <div className="mt-6 rounded-xl border border-border bg-accent-light/40 p-5">
          <h3 className="mb-1 text-sm font-semibold text-text-primary">Notes</h3>
          <p className="text-sm text-text-secondary">{recipe.notes}</p>
        </div>
      )}
    </div>
  );
}
