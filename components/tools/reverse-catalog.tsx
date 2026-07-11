'use client';

import { useEffect, useRef, useState } from 'react';
import { Library, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizableDrawer } from '@/components/ui/resizable-drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductForm } from './product-form';
import { ImportUrlDialog } from './import-url-dialog';
import { ViewToggle, type CatalogView } from './view-toggle';
import { CatalogListView } from './catalog-list-view';
import { CatalogBoardView } from './catalog-board-view';
import { getScenario } from '@/lib/scenarios';
import type { Product, ProductStatus } from '@/lib/types';
import type { ToolProps } from './tool-registry';

const VIEW_STORAGE_KEY = 'meshop_catalog_view';

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
  const scenarioSchema = scenario?.productSchema ?? [];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [view, setView] = useState<CatalogView>('list');
  // Read the persisted view after mount to keep SSR/first paint deterministic.
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY) as CatalogView | null;
    if (saved === 'list' || saved === 'board') setView(saved);
  }, []);
  const switchView = (v: CatalogView) => {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  };

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

    setExpandedId(focusProductId);
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
  const toggleExpanded = (id: string) =>
    setExpandedId((cur) => (cur === id ? null : id));

  const handleSubmit = async (
    data: Parameters<React.ComponentProps<typeof ProductForm>['onSubmit']>[0]
  ) => {
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
    setProducts((ps) => ps.filter((p) => p.id !== id)); // optimistic
    await fetch(`/api/products/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Persist a new global ordering (shared by both views). Reorders the local
  // array to match so list and board stay windows onto the same data.
  const handleReorder = (orderedIds: string[]) => {
    setProducts((ps) => {
      const byId = new Map(ps.map((p) => [p.id, p]));
      const next = orderedIds
        .map((id) => byId.get(id))
        .filter((p): p is Product => p !== undefined);
      return next.length === ps.length ? next : ps;
    });
    fetch('/api/products/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, productIds: orderedIds }),
    }).catch(() => {});
  };

  // Persist a single product's status change (board cross-column drag / move).
  const handleStatusChange = (id: string, status: ProductStatus) => {
    setProducts((ps) =>
      ps.map((p) => (p.id === id ? { ...p, status } : p))
    );
    fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  const actions = (
    <div className="flex items-center gap-2">
      <ViewToggle view={view} onChange={switchView} />
      <Button variant="secondary" onClick={() => setImportOpen(true)}>
        <Link2 className="h-4 w-4" />
        Import from URL
      </Button>
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4" />
        Add Product
      </Button>
    </div>
  );

  return (
    <div
      className={
        view === 'board'
          ? 'mx-auto max-w-7xl px-4 py-6 sm:px-8'
          : 'mx-auto max-w-3xl px-4 py-6 sm:px-8'
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Reverse Catalog
          </h2>
          <p className="text-sm text-text-secondary">
            {products.length} {products.length === 1 ? 'item' : 'items'} you're
            tracking.
          </p>
        </div>
        {actions}
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
      ) : view === 'list' ? (
        <CatalogListView
          products={products}
          scenarioSchema={scenarioSchema}
          expandedId={expandedId}
          onToggle={toggleExpanded}
          onEdit={openEdit}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      ) : (
        <CatalogBoardView
          products={products}
          projectId={project.id}
          scenarioSchema={scenarioSchema}
          expandedId={expandedId}
          onToggle={toggleExpanded}
          onEdit={openEdit}
          onDelete={handleDelete}
          onReorder={handleReorder}
          onStatusChange={handleStatusChange}
        />
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
