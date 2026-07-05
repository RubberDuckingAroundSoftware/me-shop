'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RecipeIngredient } from '@/lib/types';

/**
 * Shared vocabulary for the Recipe Builder, which doubles as a generic "List
 * Builder" in the General Shopping scenario — same data model, different words.
 * Centralized here so the builder, its detail view, and the import dialog all
 * speak the same language for a given scenario.
 */
export interface BuilderLabels {
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
  importTitle: string; // dialog title, e.g. "Import Recipe" / "Import List"
}

export const GENERAL_LABELS: BuilderLabels = {
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
  importTitle: 'Import List',
};

export const RECIPE_LABELS: BuilderLabels = {
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
  importTitle: 'Import Recipe',
};

export function getLabels(scenarioId: string): BuilderLabels {
  return scenarioId === 'general' ? GENERAL_LABELS : RECIPE_LABELS;
}

export function emptyIngredient(): RecipeIngredient {
  return { name: '', quantity: '', unit: '', found: false };
}

/** Values used to pre-fill the form (e.g. from an extracted recipe). */
export interface RecipeFormInitial {
  name?: string;
  description?: string;
  servings?: number | null;
  prepTime?: string | null;
  cookTime?: string | null;
  ingredients?: RecipeIngredient[];
  instructions?: string[];
  notes?: string | null;
}

export function RecipeForm({
  projectId,
  labels,
  initial,
  submitLabel,
  onCancel,
  onCreated,
}: {
  projectId: string;
  labels: BuilderLabels;
  initial?: RecipeFormInitial;
  submitLabel?: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [servings, setServings] = useState(
    initial?.servings != null ? String(initial.servings) : ''
  );
  const [prepTime, setPrepTime] = useState(initial?.prepTime ?? '');
  const [cookTime, setCookTime] = useState(initial?.cookTime ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()]
  );
  const [instructions, setInstructions] = useState(
    initial?.instructions?.length ? initial.instructions.join('\n') : ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
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
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) onCreated();
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
                aria-label={`Remove ${labels.itemNoun}`}
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
          {submitting ? 'Saving…' : submitLabel ?? labels.addButton}
        </Button>
      </div>
    </div>
  );
}
