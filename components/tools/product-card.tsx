'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { DropdownMenu, DropdownItem } from '@/components/ui/dropdown-menu';
import { PriceIndicator } from './price-indicator';
import { cn, formatPrice } from '@/lib/utils';
import { BOARD_STATUSES, COLUMN_META, huntDurationDays } from '@/lib/product-utils';
import type { Product, ProductStatus } from '@/lib/types';

export interface DragHandleProps {
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
}

export interface ProductCardProps {
  product: Product;
  scenarioSchema: { key: string; label: string }[];
  /** Board view renders the narrow price-signal card; list view the full row. */
  compact?: boolean;
  /** List view shows the status badge; the board column IS the status. */
  showStatusBadge?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dragHandleProps?: DragHandleProps;
  dragging?: boolean;
  /**
   * When provided, the compact card shows a "Move to" menu — the mobile
   * substitute for dragging a card across columns.
   */
  onMoveStatus?: (status: ProductStatus) => void;
}

/**
 * Single source of truth for a product's visual representation. The card
 * doesn't know which view it lives in — the parent passes `compact` to switch
 * between the full-width list row and the narrow board card. Both expand to
 * the same shared detail panel.
 */
export function ProductCard(props: ProductCardProps) {
  const { compact, dragging } = props;
  return (
    <div
      id={`product-${props.product.id}`}
      className={cn(
        'group scroll-mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow',
        dragging && 'opacity-75 shadow-lg'
      )}
    >
      {compact ? <CompactFace {...props} /> : <ListFace {...props} />}
      {props.expanded && (
        <ProductDetail
          product={props.product}
          scenarioSchema={props.scenarioSchema}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      )}
    </div>
  );
}

/** Drag handle, visible on hover. Wires the dnd-kit activator. */
function DragHandle({ handle }: { handle?: DragHandleProps }) {
  if (!handle) return null;
  return (
    <button
      ref={handle.setActivatorNodeRef}
      {...handle.attributes}
      {...handle.listeners}
      aria-label="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 cursor-grab touch-none text-text-tertiary opacity-0 transition-opacity hover:text-text-secondary group-hover:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

// ----- List view face (full-width, current design) -----

function ListFace({
  product,
  expanded,
  showStatusBadge = true,
  onToggle,
  dragHandleProps,
}: ProductCardProps) {
  return (
    <div className="flex w-full items-center gap-2 p-4 text-left">
      <DragHandle handle={dragHandleProps} />
      <button
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
        <span className="shrink-0 text-xs text-text-tertiary">
          {product.sources.length}{' '}
          {product.sources.length === 1 ? 'source' : 'sources'}
        </span>
        {showStatusBadge && <StatusBadge status={product.status} />}
      </button>
    </div>
  );
}

// ----- Board view face (narrow, compact) -----

function CompactFace({
  product,
  onToggle,
  dragHandleProps,
  onMoveStatus,
}: ProductCardProps) {
  const days = huntDurationDays(product);
  return (
    <div className="relative w-full p-3">
      <div className="flex items-start gap-1.5">
        <span className="pt-0.5">
          <DragHandle handle={dragHandleProps} />
        </span>
        <button
          onClick={onToggle}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text-primary"
        >
          {product.name}
        </button>
        {onMoveStatus && (
          <MoveMenu currentStatus={product.status} onMoveStatus={onMoveStatus} />
        )}
      </div>
      <button
        onClick={onToggle}
        className="mt-2 block w-full pl-[22px] text-left"
      >
        <PriceIndicator product={product} />
        <div className="mt-1 text-xs text-text-tertiary">
          {product.sources.length}{' '}
          {product.sources.length === 1 ? 'source' : 'sources'} · {days}d
        </div>
      </button>
    </div>
  );
}

/** Cross-status move menu (mobile stand-in for cross-column drag). */
function MoveMenu({
  currentStatus,
  onMoveStatus,
}: {
  currentStatus: ProductStatus;
  onMoveStatus: (status: ProductStatus) => void;
}) {
  return (
    <DropdownMenu
      aria-label="Move to"
      triggerClassName="shrink-0 rounded-md p-0.5 text-text-tertiary hover:text-text-secondary"
      trigger={<MoreVertical className="h-4 w-4" />}
    >
      {BOARD_STATUSES.filter((s) => s !== currentStatus).map((s) => (
        <DropdownItem key={s} onSelect={() => onMoveStatus(s)}>
          Move to {COLUMN_META[s].title}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}

// ----- Shared expanded detail -----

function ProductDetail({
  product,
  scenarioSchema,
  onEdit,
  onDelete,
}: {
  product: Product;
  scenarioSchema: { key: string; label: string }[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-t border-border px-4 py-4">
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
  );
}
