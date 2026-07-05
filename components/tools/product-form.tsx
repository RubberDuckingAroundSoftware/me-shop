'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getScenario } from '@/lib/scenarios';
import type {
  Product,
  ProductSource,
  ProductStatus,
  ScenarioId,
} from '@/lib/types';

const STATUSES: ProductStatus[] = ['hunting', 'found', 'bought', 'archived'];

export interface ProductFormProps {
  scenarioId: ScenarioId;
  // Partial so pre-filled data (e.g. from URL extraction) can seed the form
  // without constructing a full Product.
  initial?: Partial<Product>;
  onSubmit: (data: {
    name: string;
    description?: string;
    metadata: Record<string, unknown>;
    sources: ProductSource[];
    status: ProductStatus;
  }) => Promise<void> | void;
  onCancel: () => void;
  /** Label for the submit button. Defaults based on create vs. edit. */
  submitLabel?: string;
}

export function ProductForm({
  scenarioId,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: ProductFormProps) {
  const scenario = getScenario(scenarioId);
  const schema = scenario?.productSchema ?? [];

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<ProductStatus>(
    initial?.status ?? 'hunting'
  );
  const [metadata, setMetadata] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const f of schema) {
      const v = initial?.metadata?.[f.key];
      m[f.key] = v === undefined || v === null ? '' : String(v);
    }
    return m;
  });
  const [sources, setSources] = useState<ProductSource[]>(
    initial?.sources ?? []
  );
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: string, value: string) =>
    setMetadata((m) => ({ ...m, [key]: value }));

  const addSource = () =>
    setSources((s) => [...s, { url: '', storeName: '', currency: 'USD' }]);
  const updateSource = (i: number, patch: Partial<ProductSource>) =>
    setSources((s) => s.map((src, idx) => (idx === i ? { ...src, ...patch } : src)));
  const removeSource = (i: number) =>
    setSources((s) => s.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    // Drop empty metadata keys to keep records clean.
    const cleanMeta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metadata)) {
      if (v !== '') cleanMeta[k] = v;
    }
    const cleanSources = sources.filter((s) => s.url || s.storeName);
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      metadata: cleanMeta,
      sources: cleanSources,
      status,
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <Field label="Name">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you looking for?"
        />
      </Field>

      <Field label="Description">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short summary…"
        />
      </Field>

      <Field label="Status">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="border-t border-border pt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {scenario?.name} details
        </div>
        <div className="space-y-4">
          {schema.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === 'textarea' ? (
                <Textarea
                  rows={2}
                  value={metadata[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              ) : f.type === 'select' ? (
                <Select
                  value={metadata[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                >
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : f.type === 'currency' ? (
                <Input
                  type="number"
                  inputMode="decimal"
                  value={metadata[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder="0"
                />
              ) : (
                <Input
                  value={metadata[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.type === 'tags' ? 'comma, separated, tags' : ''}
                />
              )}
            </Field>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Sources
          </span>
          <Button variant="ghost" size="sm" onClick={addSource}>
            <Plus className="h-3.5 w-3.5" />
            Add source
          </Button>
        </div>
        <div className="space-y-3">
          {sources.length === 0 && (
            <p className="text-xs text-text-tertiary">
              No sources yet. Add stores where you might find this.
            </p>
          )}
          {sources.map((src, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={src.storeName}
                  onChange={(e) =>
                    updateSource(i, { storeName: e.target.value })
                  }
                  placeholder="Store name"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeSource(i)}
                  aria-label="Remove source"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={src.url}
                onChange={(e) => updateSource(i, { url: e.target.value })}
                placeholder="https://…"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={src.price ?? ''}
                  onChange={(e) =>
                    updateSource(i, {
                      price: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Price"
                />
                <Input
                  value={src.currency ?? ''}
                  onChange={(e) => updateSource(i, { currency: e.target.value })}
                  placeholder="USD"
                  className="max-w-[90px]"
                />
              </div>
              <Input
                value={src.notes ?? ''}
                onChange={(e) => updateSource(i, { notes: e.target.value })}
                placeholder="Notes (optional)"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!name.trim() || submitting}>
          {submitting
            ? 'Saving…'
            : submitLabel ?? (initial ? 'Save changes' : 'Add product')}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      {children}
    </div>
  );
}
