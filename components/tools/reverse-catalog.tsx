'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Library,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { ResizableDrawer } from '@/components/ui/resizable-drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductForm } from './product-form';
import { ImportUrlDialog } from './import-url-dialog';
import { getScenario } from '@/lib/scenarios';
import { cn, formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';
import type { ToolProps } from './tool-registry';

export interface ReverseCatalogProps extends ToolProps {
  /** Product to scroll to and highlight (set when arriving from a chat chip). */
  focusProductId?: string | null;
  /** Bumps on each navigation request so repeat clicks re-trigger the focus. */
  focusNonce?: number;
}

export function ReverseCatalog({
  project,
  focusProductId,
  focusNonce,
}: ReverseCatalogProps) {
  const scenario = getScenario(project.scenarioId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/products?projectId=${project.id}`);
    const { products } = await res.json();
    setProducts(products);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // When navigated here from a chat product chip, expand, scroll to, and
  // briefly highlight the referenced product once it's in the DOM.
  const handledFocus = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (loading || focusNonce === undefined) return;
    if (handledFocus.current === focusNonce) return;
    if (!focusProductId) return;
    if (!products.some((p) => p.id === focusProductId)) return;
    handledFocus.current = focusNonce;

    setExpanded(focusProductId);
    requestAnimationFrame(() => {
      const el = document.getElementById(`product-${focusProductId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-accent');
      setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2000);
    });
  }, [focusProductId, focusNonce, loading, products]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Parameters<
    React.ComponentProps<typeof ProductForm>['onSubmit']
  >[0]) => {
    if (editing) {
      await fetch(`/api/products/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, ...data }),
      });
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Reverse Catalog
          </h2>
          <p className="text-sm text-text-secondary">
            {products.length} {products.length === 1 ? 'item' : 'items'} you're
            tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Link2 className="h-4 w-4" />
            Import from URL
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-text-tertiary">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Your catalog is empty"
          description="Add the first thing you're hunting for — track where to find it and how much it costs."
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Link2 className="h-4 w-4" />
                Import from URL
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              scenarioSchema={scenario?.productSchema ?? []}
              expanded={expanded === p.id}
              onToggle={() =>
                setExpanded((cur) => (cur === p.id ? null : p.id))
              }
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      <ResizableDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit product' : 'Add product'}
        storageKey="meshop_drawer_width"
      >
        {scenario && (
          <ProductForm
            scenarioId={scenario.id}
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        )}
      </ResizableDrawer>

      {scenario && (
        <ImportUrlDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          projectId={project.id}
          scenarioId={scenario.id}
          onProductCreated={load}
        />
      )}
    </div>
  );
}

function ProductRow({
  product,
  scenarioSchema,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  product: Product;
  scenarioSchema: { key: string; label: string }[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      id={`product-${product.id}`}
      className="scroll-mt-6 rounded-xl border border-border bg-surface shadow-sm transition-shadow"
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-text-primary">
            {product.name}
          </div>
          {product.description && (
            <div className="truncate text-xs text-text-secondary">
              {product.description}
            </div>
          )}
        </div>
        <span className="text-xs text-text-tertiary">
          {product.sources.length}{' '}
          {product.sources.length === 1 ? 'source' : 'sources'}
        </span>
        <StatusBadge status={product.status} />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4">
          {/* Scenario-specific metadata */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {scenarioSchema.map((f) => {
              const v = product.metadata?.[f.key];
              if (v === undefined || v === null || v === '') return null;
              return (
                <div key={f.key} className="text-sm">
                  <dt className="text-xs text-text-tertiary">{f.label}</dt>
                  <dd className="text-text-primary">{String(v)}</dd>
                </div>
              );
            })}
          </dl>

          {/* Sources */}
          {product.sources.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Sources
              </div>
              <div className="space-y-2">
                {product.sources.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <a
                        href={s.url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'inline-flex items-center gap-1 font-medium',
                          s.url
                            ? 'text-accent hover:underline'
                            : 'text-text-primary'
                        )}
                      >
                        {s.storeName || s.url}
                        {s.url && <ExternalLink className="h-3 w-3" />}
                      </a>
                      {s.notes && (
                        <div className="truncate text-xs text-text-secondary">
                          {s.notes}
                        </div>
                      )}
                    </div>
                    {s.price !== undefined && (
                      <span className="shrink-0 font-medium text-text-primary">
                        {formatPrice(s.price, s.currency)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
