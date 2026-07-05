'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Link2,
  Loader2,
  Sparkles,
  FileText,
} from 'lucide-react';
import { ResizableDrawer } from '@/components/ui/resizable-drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductForm } from './product-form';
import { cn } from '@/lib/utils';
import type { Product, ProductSource, ScenarioId } from '@/lib/types';

export interface ImportUrlDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  scenarioId: ScenarioId;
  onProductCreated: () => void;
}

type Stage = 'idle' | 'loading' | 'review' | 'saving';

type ExtractionMethod =
  | 'structured_data'
  | 'structured_data+llm'
  | 'llm_only';

interface ExtractedProduct {
  name: string;
  description?: string | null;
  metadata: Record<string, unknown>;
  sources: ProductSource[];
  status?: Product['status'];
  image?: string | null;
}

interface ExtractResult {
  product: ExtractedProduct;
  extraction_method: ExtractionMethod;
  raw_extracted: Record<string, unknown>;
  source_url: string;
}

const METHOD_LABEL: Record<ExtractionMethod, string> = {
  structured_data: 'From page data',
  'structured_data+llm': 'Page data + AI',
  llm_only: 'Extracted with AI',
};

export function ImportUrlDialog({
  open,
  onClose,
  projectId,
  scenarioId,
  onProductCreated,
}: ImportUrlDialogProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  // Cosmetic: reveal the second progress step shortly after fetch starts.
  const [showSecondStep, setShowSecondStep] = useState(false);

  const reset = () => {
    setStage('idle');
    setUrl('');
    setError(null);
    setResult(null);
    setShowSecondStep(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (stage !== 'loading') return;
    const t = setTimeout(() => setShowSecondStep(true), 1200);
    return () => clearTimeout(t);
  }, [stage]);

  const extract = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setStage('loading');
    setShowSecondStep(false);
    try {
      const res = await fetch('/api/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not extract from that URL.');
        setStage('idle');
        return;
      }
      setResult(data as ExtractResult);
      setStage('review');
    } catch {
      setError('Network error. Try again.');
      setStage('idle');
    }
  };

  const save = async (data: {
    name: string;
    description?: string;
    metadata: Record<string, unknown>;
    sources: ProductSource[];
    status: Product['status'];
  }) => {
    setStage('saving');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...data }),
      });
      if (!res.ok) throw new Error('save failed');
      onProductCreated();
      close();
    } catch {
      setError('Could not save the product. Try again.');
      setStage('review');
    }
  };

  // Seed the product form from the extracted data.
  const initial: Partial<Product> | undefined = result
    ? {
        name: result.product.name,
        description: result.product.description ?? undefined,
        metadata: result.product.metadata ?? {},
        sources: result.product.sources ?? [],
        status: result.product.status ?? 'hunting',
      }
    : undefined;

  return (
    <ResizableDrawer
      open={open}
      onClose={close}
      title="Import from URL"
      storageKey="meshop_drawer_width"
    >
      {stage === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Paste a product page URL and meShop will extract the details for you.
          </p>
          <div>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && extract()}
                placeholder="https://www.abebooks.com/…"
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={extract} disabled={!url.trim()}>
              Extract
            </Button>
          </div>
        </div>
      )}

      {stage === 'loading' && (
        <div className="space-y-3 py-4">
          <ProgressStep active label="Fetching page…" done={showSecondStep} />
          <ProgressStep
            active={showSecondStep}
            label="Extracting product data…"
            done={false}
          />
        </div>
      )}

      {(stage === 'review' || stage === 'saving') && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="inline-flex items-center gap-1 bg-accent-light text-accent">
              {result.extraction_method === 'structured_data' ? (
                <FileText className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {METHOD_LABEL[result.extraction_method]}
            </Badge>
            <span className="text-xs text-text-tertiary">
              Review and edit before saving.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <ProductForm
            scenarioId={scenarioId}
            initial={initial}
            onSubmit={save}
            onCancel={close}
            submitLabel="Save to catalog"
          />
        </div>
      )}
    </ResizableDrawer>
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
