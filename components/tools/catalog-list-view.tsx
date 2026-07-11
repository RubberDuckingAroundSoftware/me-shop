'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProductCard } from './product-card';
import type { Product } from '@/lib/types';

export interface CatalogListViewProps {
  products: Product[];
  scenarioSchema: { key: string; label: string }[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  /** Persist a new full ordering (the reordered product ids). */
  onReorder: (orderedIds: string[]) => void;
}

/** The vertical list view, with drag-to-reorder across all statuses. */
export function CatalogListView({
  products,
  scenarioSchema,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: CatalogListViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(products, oldIndex, newIndex);
    onReorder(reordered.map((p) => p.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={products.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {products.map((p) => (
            <SortableListCard
              key={p.id}
              product={p}
              scenarioSchema={scenarioSchema}
              expanded={expandedId === p.id}
              onToggle={() => onToggle(p.id)}
              onEdit={() => onEdit(p)}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableListCard({
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
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProductCard
        product={product}
        scenarioSchema={scenarioSchema}
        showStatusBadge
        expanded={expanded}
        dragging={isDragging}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  );
}
