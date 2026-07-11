'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { ProductCard } from './product-card';
import { BOARD_STATUSES, COLUMN_META } from '@/lib/product-utils';
import { cn } from '@/lib/utils';
import type { Product, ProductStatus } from '@/lib/types';

type Columns = Record<ProductStatus, Product[]>;

// Mobile tab headers double as droppable targets. Their ids are prefixed so
// they don't collide with the rendered column's droppable id (a bare status).
const TAB_DROP_PREFIX = 'tab-';

/**
 * A tab header sits directly above the large column droppable, so corner-based
 * detection (closestCorners) lets the wide card's corners favor the column (or
 * only the edge-aligned tab). Detect tab drops by the pointer being *within*
 * the tab instead; fall back to closestCorners for in-column sorting. On
 * desktop there are no tab droppables, so this always falls through unchanged.
 */
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const tabHit = pointerWithin(args).find((c) =>
    String(c.id).startsWith(TAB_DROP_PREFIX)
  );
  if (tabHit) return [tabHit];
  return closestCorners(args);
};

export interface CatalogBoardViewProps {
  products: Product[];
  projectId: string;
  scenarioSchema: { key: string; label: string }[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  /** Persist a full ordering (all product ids in their new global order). */
  onReorder: (orderedIds: string[]) => void;
  /** Persist a single product's status change. */
  onStatusChange: (id: string, status: ProductStatus) => void;
}

// The width needed to show all four columns side by side without overflow:
// 4 columns × 280px min + 3 × 12px gaps (gap-3). Below this, the board would
// need a horizontal scrollbar, so we switch to the tabbed layout instead.
const MIN_BOARD_WIDTH = 4 * 280 + 3 * 12;

/**
 * Track whether the board's own available width can fit all columns. This is
 * container-based (not viewport-based) so a narrow content area — e.g. an
 * expanded sidebar — collapses to tabs rather than showing a scrollbar.
 */
function useCompactBoard(
  ref: React.RefObject<HTMLElement>
): boolean {
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setCompact(el.getBoundingClientRect().width < MIN_BOARD_WIDTH);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return compact;
}

/** Group a flat, globally-ordered product list into per-status columns. */
function group(products: Product[]): Columns {
  const cols = {
    hunting: [],
    found: [],
    bought: [],
    archived: [],
  } as Columns;
  for (const p of products) cols[p.status].push(p);
  return cols;
}

/** Flatten columns back to a single global order (fixed column sequence). */
function flatten(cols: Columns): Product[] {
  return BOARD_STATUSES.flatMap((s) => cols[s]);
}

export function CatalogBoardView({
  products,
  projectId,
  scenarioSchema,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
  onStatusChange,
}: CatalogBoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const compact = useCompactBoard(containerRef);

  const [columns, setColumns] = useState<Columns>(() => group(products));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<ProductStatus>('hunting');

  // Re-sync from props whenever the source data changes and we're not mid-drag.
  useEffect(() => {
    if (activeId) return;
    setColumns(group(products));
  }, [products, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = useCallback(
    (id: string): ProductStatus | null => {
      if ((BOARD_STATUSES as string[]).includes(id)) return id as ProductStatus;
      return (
        BOARD_STATUSES.find((s) => columns[s].some((p) => p.id === id)) ?? null
      );
    },
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // Live preview: move the dragged card between columns as it hovers.
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const moving = activeItems.find((p) => p.id === active.id);
      if (!moving) return prev;

      const overIsColumn = (BOARD_STATUSES as string[]).includes(
        String(over.id)
      );
      const overIndex = overItems.findIndex((p) => p.id === over.id);
      const insertAt = overIsColumn || overIndex < 0 ? overItems.length : overIndex;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((p) => p.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, insertAt),
          { ...moving, status: overContainer },
          ...overItems.slice(insertAt),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const id = String(active.id);
    const originalStatus = products.find((p) => p.id === id)?.status ?? null;

    if (!over) {
      setActiveId(null);
      setColumns(group(products)); // cancelled — resync
      return;
    }

    // Mobile: dropping a card onto a tab header moves it to that status.
    // The other columns aren't rendered on mobile, so the tabs are the only
    // cross-status drop targets.
    if (String(over.id).startsWith(TAB_DROP_PREFIX)) {
      const target = String(over.id).slice(TAB_DROP_PREFIX.length) as ProductStatus;
      const from = findContainer(id);
      const moving = from ? columns[from].find((p) => p.id === id) : undefined;
      if (from && moving && target !== from) {
        const next: Columns = {
          ...columns,
          [from]: columns[from].filter((p) => p.id !== id),
          [target]: [...columns[target], { ...moving, status: target }],
        };
        setColumns(next);
        onStatusChange(id, target);
        if (target === 'bought') {
          setCelebratingId(id);
          setTimeout(() => setCelebratingId(null), 700);
        }
        onReorder(flatten(next).map((p) => p.id));
        setMobileTab(target); // follow the card so the user sees where it went
      }
      setActiveId(null);
      return;
    }

    const overContainer = findContainer(String(over.id));
    if (!overContainer) {
      setActiveId(null);
      return;
    }

    // Reorder within the destination column.
    const items = columns[overContainer];
    const activeIndex = items.findIndex((p) => p.id === id);
    const overIsColumn = (BOARD_STATUSES as string[]).includes(String(over.id));
    const overIndex = overIsColumn
      ? items.length - 1
      : items.findIndex((p) => p.id === over.id);

    let next = columns;
    if (activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex) {
      next = { ...columns, [overContainer]: arrayMove(items, activeIndex, overIndex) };
      setColumns(next);
    }

    const statusChanged = originalStatus !== null && originalStatus !== overContainer;

    // Persist: status change first (if any), then the full ordering.
    if (statusChanged) {
      onStatusChange(id, overContainer);
      if (overContainer === 'bought') {
        setCelebratingId(id);
        setTimeout(() => setCelebratingId(null), 700);
      }
    }
    onReorder(flatten(next).map((p) => p.id));

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setColumns(group(products));
  };

  // Mobile cross-status move (menu-driven, no drag).
  const handleMoveStatus = (id: string, status: ProductStatus) => {
    onStatusChange(id, status);
    if (status === 'bought') {
      setCelebratingId(id);
      setTimeout(() => setCelebratingId(null), 700);
    }
  };

  const dndProps = {
    sensors,
    collisionDetection: collisionDetectionStrategy,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  };

  const columnProps = (status: ProductStatus) => ({
    status,
    products: columns[status],
    scenarioSchema,
    expandedId,
    onToggle,
    onEdit,
    onDelete,
    celebratingId,
  });

  // A portal-rendered clone that follows the pointer. It's independent of the
  // list DOM, so the dragged card stays visible through cross-column moves and
  // while overlapping tab headers — where the source node unmounts/remounts.
  const activeProduct = activeId
    ? products.find((p) => p.id === activeId) ?? null
    : null;
  const dragOverlay = (
    <DragOverlay dropAnimation={null}>
      {activeProduct ? (
        <div className="rotate-1 cursor-grabbing opacity-90 shadow-lg">
          <ProductCard
            product={activeProduct}
            scenarioSchema={scenarioSchema}
            compact
            showStatusBadge={false}
            expanded={false}
            onToggle={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
      ) : null}
    </DragOverlay>
  );

  // The ref must always be mounted so the width can be measured before we
  // decide which layout to render — hence the wrapper around both branches.
  return (
    <div ref={containerRef}>
      <DndContext {...dndProps}>
        {compact ? (
          <>
            <MobileTabs
              columns={columns}
              active={mobileTab}
              onSelect={setMobileTab}
              dragging={activeId !== null}
            />
            <KanbanColumn
              {...columnProps(mobileTab)}
              onMoveStatus={handleMoveStatus}
            />
          </>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {BOARD_STATUSES.map((status) => (
              <KanbanColumn key={status} {...columnProps(status)} />
            ))}
          </div>
        )}
        {dragOverlay}
      </DndContext>
    </div>
  );
}

function MobileTabs({
  columns,
  active,
  onSelect,
  dragging,
}: {
  columns: Columns;
  active: ProductStatus;
  onSelect: (status: ProductStatus) => void;
  /** True while a card is being dragged — surfaces the tabs as drop targets. */
  dragging: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 mb-3 flex gap-1 overflow-x-auto border-b border-border bg-bg">
      {BOARD_STATUSES.map((status) => (
        <MobileTab
          key={status}
          status={status}
          count={columns[status].length}
          isActive={status === active}
          dragging={dragging}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function MobileTab({
  status,
  count,
  isActive,
  dragging,
  onSelect,
}: {
  status: ProductStatus;
  count: number;
  isActive: boolean;
  dragging: boolean;
  onSelect: (status: ProductStatus) => void;
}) {
  const meta = COLUMN_META[status];
  const { setNodeRef, isOver } = useDroppable({
    id: `${TAB_DROP_PREFIX}${status}`,
  });

  return (
    <button
      ref={setNodeRef}
      onClick={() => onSelect(status)}
      style={isOver ? { borderColor: meta.accent } : undefined}
      className={cn(
        'shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
        isActive
          ? 'border-accent text-text-primary'
          : 'border-transparent text-text-secondary hover:text-text-primary',
        // While dragging, hint that inactive tabs accept a drop.
        dragging && !isActive && 'rounded-t-md bg-surface-hover',
        isOver && 'bg-accent-light text-accent'
      )}
    >
      {meta.title} ({count})
    </button>
  );
}
