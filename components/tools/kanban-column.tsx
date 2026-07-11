'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProductCard } from './product-card';
import { BoughtCelebration } from './bought-celebration';
import { COLUMN_META, columnAggregate } from '@/lib/product-utils';
import { cn } from '@/lib/utils';
import type { Product, ProductStatus } from '@/lib/types';

export interface KanbanColumnProps {
  status: ProductStatus;
  products: Product[];
  scenarioSchema: { key: string; label: string }[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  /** Id of the card that just landed in Bought (drives the celebration). */
  celebratingId: string | null;
  /** When set, cards show a "Move to" menu (mobile cross-status affordance). */
  onMoveStatus?: (id: string, status: ProductStatus) => void;
}

/** One Kanban column: accent header, aggregates, sortable cards, empty state. */
export function KanbanColumn({
  status,
  products,
  scenarioSchema,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  celebratingId,
  onMoveStatus,
}: KanbanColumnProps) {
  const meta = COLUMN_META[status];
  const { line1, line2 } = columnAggregate(status, products);
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const celebrating = celebratingId !== null && products.some((p) => p.id === celebratingId);

  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-xl border border-border bg-bg/40">
      {/* 3px accent top border */}
      <div
        className="h-[3px] rounded-t-xl"
        style={{ backgroundColor: meta.accent }}
      />

      {/* Header */}
      <div className="px-3 pb-2 pt-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-primary">
          {meta.title}
          <span
            className={cn(
              'font-normal text-text-secondary',
              celebrating && 'inline-block animate-count-pop'
            )}
          >
            ({products.length})
          </span>
        </h3>
        <div className="mt-0.5 min-h-[16px] text-[11px] text-text-tertiary">
          {line1 && <div>{line1}</div>}
          {line2 && <div>{line2}</div>}
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 rounded-b-xl px-2 pb-3 pt-1 transition-colors',
          isOver && 'board-column-over'
        )}
      >
        <SortableContext
          items={products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {products.length === 0 ? (
            <EmptyColumn message={meta.emptyMessage} />
          ) : (
            products.map((p) => (
              <SortableBoardCard
                key={p.id}
                product={p}
                scenarioSchema={scenarioSchema}
                expanded={expandedId === p.id}
                celebrating={celebratingId === p.id}
                onToggle={() => onToggle(p.id)}
                onEdit={() => onEdit(p)}
                onDelete={() => onDelete(p.id)}
                onMoveStatus={
                  onMoveStatus ? (s) => onMoveStatus(p.id, s) : undefined
                }
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 text-center">
      <p className="text-xs italic text-text-tertiary">{message}</p>
    </div>
  );
}

function SortableBoardCard({
  product,
  scenarioSchema,
  expanded,
  celebrating,
  onToggle,
  onEdit,
  onDelete,
  onMoveStatus,
}: {
  product: Product;
  scenarioSchema: { key: string; label: string }[];
  expanded: boolean;
  celebrating: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveStatus?: (status: ProductStatus) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // The DragOverlay shows the moving card, so keep the source as an empty
    // slot (siblings still shift around it to preview the drop).
    opacity: isDragging ? 0 : undefined,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', celebrating && 'animate-bought-settle')}
    >
      {celebrating && <BoughtCelebration />}
      <ProductCard
        product={product}
        scenarioSchema={scenarioSchema}
        compact
        showStatusBadge={false}
        expanded={expanded}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveStatus={onMoveStatus}
        dragHandleProps={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  );
}
