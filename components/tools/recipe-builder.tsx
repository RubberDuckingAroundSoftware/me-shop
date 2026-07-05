'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Clock,
  Plus,
  Trash2,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { Recipe, RecipeIngredient } from '@/lib/types';
import type { ToolProps } from './tool-registry';

/**
 * The Recipe Builder doubles as a generic "List Builder" in the General
 * Shopping scenario — same data model, different vocabulary. Labels are chosen
 * by scenario so a single component serves both contexts.
 */
interface BuilderLabels {
  toolName: string;
  addButton: string;
  addTitle: string;
  nameField: string;
  namePlaceholder: string;
  itemsField: string;
  itemField: string;
  foundField: string;
  noun: string; // singular, e.g. "recipe" / "list"
  nounPlural: string;
  itemNoun: string; // singular, e.g. "ingredient" / "item"
  itemNounPlural: string;
  emptyTitle: string;
  emptyDescription: string;
}

const GENERAL_LABELS: BuilderLabels = {
  toolName: 'List Builder',
  addButton: 'Add List',
  addTitle: 'Add list',
  nameField: 'List Name',
  namePlaceholder: 'e.g. Cable Management Kit',
  itemsField: 'Items',
  itemField: 'Item',
  foundField: 'Sourced',
  noun: 'list',
  nounPlural: 'lists',
  itemNoun: 'item',
  itemNounPlural: 'items',
  emptyTitle: 'No lists yet',
  emptyDescription: 'Build a list and check off items as you source them.',
};

const RECIPE_LABELS: BuilderLabels = {
  toolName: 'Recipe Builder',
  addButton: 'Add Recipe',
  addTitle: 'Add recipe',
  nameField: 'Recipe Name',
  namePlaceholder: 'e.g. Cacio e Pepe',
  itemsField: 'Ingredients',
  itemField: 'Ingredient',
  foundField: 'Found',
  noun: 'recipe',
  nounPlural: 'recipes',
  itemNoun: 'ingredient',
  itemNounPlural: 'ingredients',
  emptyTitle: 'No recipes yet',
  emptyDescription: "Add a recipe and track which ingredients you've sourced.",
};

function getLabels(scenarioId: string): BuilderLabels {
  return scenarioId === 'general' ? GENERAL_LABELS : RECIPE_LABELS;
}

export function RecipeBuilder({ project }: ToolProps) {
  const labels = getLabels(project.scenarioId);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

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
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {labels.addButton}
        </Button>
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

function emptyIngredient(): RecipeIngredient {
  return { name: '', quantity: '', unit: '', found: false };
}

function RecipeForm({
  projectId,
  labels,
  onCancel,
  onCreated,
}: {
  projectId: string;
  labels: BuilderLabels;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    emptyIngredient(),
  ]);
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateIng = (i: number, patch: Partial<RecipeIngredient>) =>
    setIngredients((list) =>
      list.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing))
    );
  const addIng = () => setIngredients((l) => [...l, emptyIngredient()]);
  const removeIng = (i: number) =>
    setIngredients((l) => l.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const payload = {
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      servings: servings ? Number(servings) : undefined,
      prepTime: prepTime.trim() || undefined,
      cookTime: cookTime.trim() || undefined,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ ...i, name: i.name.trim() })),
      instructions: instructions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
    };
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    onCreated();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          {labels.nameField}
        </label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Servings
          </label>
          <Input
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Prep time
          </label>
          <Input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Cook time
          </label>
          <Input value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">
            {labels.itemsField}
          </span>
          <Button variant="ghost" size="sm" onClick={addIng}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={ing.name}
                onChange={(e) => updateIng(i, { name: e.target.value })}
                placeholder={labels.itemField}
                className="flex-1"
              />
              <Input
                value={ing.quantity}
                onChange={(e) => updateIng(i, { quantity: e.target.value })}
                placeholder="Qty"
                className="max-w-[70px]"
              />
              <Input
                value={ing.unit ?? ''}
                onChange={(e) => updateIng(i, { unit: e.target.value })}
                placeholder="Unit"
                className="max-w-[70px]"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeIng(i)}
                aria-label="Remove ingredient"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Instructions
        </label>
        <Textarea
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="One step per line…"
        />
        <p className="mt-1 text-xs text-text-tertiary">One instruction per line.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Notes
        </label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!name.trim() || submitting}>
          {submitting ? 'Saving…' : labels.addButton}
        </Button>
      </div>
    </div>
  );
}
