'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, FileText, Link2, Loader2, Sparkles } from 'lucide-react';
import { ResizableDrawer } from '@/components/ui/resizable-drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDropZone } from './file-drop-zone';
import { RecipeForm, getLabels, type RecipeFormInitial } from './recipe-form';
import { cn } from '@/lib/utils';
import type { RecipeIngredient, ScenarioId } from '@/lib/types';

export type ImportMode = 'url' | 'file' | 'text';

export interface ImportRecipeDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  scenarioId: ScenarioId;
  initialMode: ImportMode;
  onRecipeCreated: () => void;
}

type Stage = 'input' | 'loading' | 'review';

type ExtractionMethod =
  | 'structured_data'
  | 'structured_data+llm'
  | 'llm_only';

interface ExtractedRecipe {
  name: string;
  description?: string | null;
  servings?: number | null;
  prepTime?: string | null;
  cookTime?: string | null;
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes?: string | null;
  image?: string | null;
  sourceUrl?: string | null;
}

interface ExtractResult {
  recipe: ExtractedRecipe;
  extraction_method: ExtractionMethod;
  raw_extracted: Record<string, unknown>;
  source_url: string;
}

const MODE_TITLE: Record<ImportMode, string> = {
  url: 'Import from URL',
  file: 'Import from File',
  text: 'Import from Text',
};

export function ImportRecipeDialog({
  open,
  onClose,
  projectId,
  scenarioId,
  initialMode,
  onRecipeCreated,
}: ImportRecipeDialogProps) {
  const labels = getLabels(scenarioId);
  const [mode, setMode] = useState<ImportMode>(initialMode);
  const [stage, setStage] = useState<Stage>('input');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [showSecondStep, setShowSecondStep] = useState(false);

  // Re-sync the input mode whenever the dialog is (re)opened from a menu choice.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setStage('input');
      setUrl('');
      setText('');
      setFile(null);
      setError(null);
      setResult(null);
      setShowSecondStep(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (stage !== 'loading' || mode !== 'url') return;
    const t = setTimeout(() => setShowSecondStep(true), 1200);
    return () => clearTimeout(t);
  }, [stage, mode]);

  const close = () => onClose();

  const canExtract =
    (mode === 'url' && url.trim().length > 0) ||
    (mode === 'text' && text.trim().length > 0) ||
    (mode === 'file' && file !== null);

  const extract = async () => {
    if (!canExtract) return;
    setError(null);
    setStage('loading');
    setShowSecondStep(false);

    try {
      let res: Response;
      if (mode === 'file' && file) {
        const form = new FormData();
        form.append('file', file);
        res = await fetch('/api/extract-recipe', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/extract-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'url'
              ? { source: 'url', url: url.trim() }
              : { source: 'text', text }
          ),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || errorForMode(mode));
        setStage('input');
        return;
      }

      const extracted = data as ExtractResult;

      // File/text can only succeed via the LLM. If it didn't run, tell the user.
      if (mode !== 'url' && extracted.extraction_method !== 'llm_only') {
        if (mode === 'file' && file?.type.startsWith('image/')) {
          setError(
            'Image extraction requires a vision-capable model. Try a text file or paste the recipe instead.'
          );
        } else {
          setError(
            'Recipe extraction requires an LLM. Set up Ollama in Settings.'
          );
        }
        setStage('input');
        return;
      }

      setResult(extracted);
      setStage('review');
    } catch {
      setError('Network error. Try again.');
      setStage('input');
    }
  };

  const initial: RecipeFormInitial | undefined = result
    ? {
        name: result.recipe.name,
        description: result.recipe.description ?? undefined,
        servings: result.recipe.servings ?? undefined,
        prepTime: result.recipe.prepTime ?? undefined,
        cookTime: result.recipe.cookTime ?? undefined,
        ingredients: result.recipe.ingredients ?? [],
        instructions: result.recipe.instructions ?? [],
        notes: result.recipe.notes ?? undefined,
      }
    : undefined;

  const title = stage === 'review' ? labels.importTitle : MODE_TITLE[mode];

  return (
    <ResizableDrawer
      open={open}
      onClose={close}
      title={title}
      storageKey="meshop_drawer_width"
    >
      {stage === 'input' && (
        <div className="space-y-4">
          {mode === 'url' && (
            <>
              <p className="text-sm text-text-secondary">
                Paste a recipe page URL and meShop will extract the recipe for
                you.
              </p>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && extract()}
                  placeholder="https://www.freshful.ro/retete/r/…"
                  className="pl-9"
                />
              </div>
            </>
          )}

          {mode === 'file' && (
            <>
              <p className="text-sm text-text-secondary">
                Upload a photo of a recipe, a PDF, or a text file.
              </p>
              <FileDropZone
                file={file}
                onFileChange={setFile}
                onError={(m) => setError(m || null)}
              />
            </>
          )}

          {mode === 'text' && (
            <>
              <p className="text-sm text-text-secondary">
                Paste a recipe — from a message, a note, or anywhere else.
              </p>
              <Textarea
                autoFocus
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your recipe here…"
                className="resize-y"
              />
            </>
          )}

          {error && <ErrorBox message={error} />}

          <div className="flex justify-end">
            <Button onClick={extract} disabled={!canExtract}>
              Extract
            </Button>
          </div>
        </div>
      )}

      {stage === 'loading' && (
        <div className="space-y-3 py-4">
          {mode === 'url' ? (
            <>
              <ProgressStep active label="Fetching page…" done={showSecondStep} />
              <ProgressStep
                active={showSecondStep}
                label="Extracting recipe…"
                done={false}
              />
            </>
          ) : (
            <ProgressStep active label="Extracting recipe…" done={false} />
          )}
        </div>
      )}

      {stage === 'review' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="inline-flex items-center gap-1 bg-accent-light text-accent">
              {badgeIsData(mode, result.extraction_method) ? (
                <FileText className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {badgeLabel(mode, result.extraction_method)}
            </Badge>
            <span className="text-xs text-text-tertiary">
              Review and edit before saving.
            </span>
          </div>

          <RecipeForm
            projectId={projectId}
            labels={labels}
            initial={initial}
            submitLabel={`Save ${labels.noun}`}
            onCancel={close}
            onCreated={() => {
              onRecipeCreated();
              close();
            }}
          />
        </div>
      )}
    </ResizableDrawer>
  );
}

function errorForMode(mode: ImportMode): string {
  if (mode === 'url')
    return "Couldn't fetch that page. Check the URL and try again.";
  return 'Could not extract the recipe. Try again.';
}

function badgeIsData(mode: ImportMode, method: ExtractionMethod): boolean {
  return mode === 'url' && method === 'structured_data';
}

function badgeLabel(mode: ImportMode, method: ExtractionMethod): string {
  if (mode === 'file') return 'Extracted from file';
  if (mode === 'text') return 'Extracted from text';
  // url
  return method === 'structured_data' ? 'From page data' : 'Extracted with AI';
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ProgressStep({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 text-sm',
        active ? 'text-text-primary' : 'text-text-tertiary'
      )}
    >
      {done ? (
        <Check className="h-4 w-4 text-accent" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-border" />
      )}
      {label}
    </div>
  );
}
