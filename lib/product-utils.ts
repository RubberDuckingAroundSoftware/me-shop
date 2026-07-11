import type { Product, ProductSource, ProductStatus } from './types';
import { formatPrice } from './utils';

/**
 * Reverse Catalog helpers shared by the list and Kanban board views:
 * best-price resolution, the price-vs-budget signal, hunt duration, the
 * Hunting-column auto-sort, and per-column aggregates.
 */

// ----- Column metadata -----

export const BOARD_STATUSES: ProductStatus[] = [
  'hunting',
  'found',
  'bought',
  'archived',
];

export interface ColumnMeta {
  status: ProductStatus;
  title: string;
  /** Accent hex used for the 3px top border and count pulse. */
  accent: string;
  emptyMessage: string;
}

export const COLUMN_META: Record<ProductStatus, ColumnMeta> = {
  hunting: {
    status: 'hunting',
    title: 'Hunting',
    accent: '#D97706',
    emptyMessage: 'Add a product to start the hunt.',
  },
  found: {
    status: 'found',
    title: 'Found',
    accent: '#2563EB',
    emptyMessage: 'Nothing here yet. Drag a product over when you find it.',
  },
  bought: {
    status: 'bought',
    title: 'Bought',
    accent: '#16A34A',
    emptyMessage: 'Nothing purchased yet. The hunt continues.',
  },
  archived: {
    status: 'archived',
    title: 'Archived',
    accent: '#6B7280',
    emptyMessage: 'Nothing archived.',
  },
};

// ----- Price resolution -----

/** The lowest priced source, or null when no source carries a price. */
export function getBestPrice(sources: ProductSource[]): number | null {
  const prices = (sources ?? [])
    .map((s) => s.price)
    .filter((p): p is number => typeof p === 'number' && !Number.isNaN(p));
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

/** Currency of the cheapest source (defaults to USD). */
export function getBestPriceCurrency(sources: ProductSource[]): string {
  const priced = (sources ?? []).filter(
    (s) => typeof s.price === 'number' && !Number.isNaN(s.price)
  );
  if (priced.length === 0) return 'USD';
  const cheapest = priced.reduce((a, b) =>
    (a.price as number) <= (b.price as number) ? a : b
  );
  return cheapest.currency || 'USD';
}

/** Parse a product's budget (max_price metadata) into a number, or null. */
export function getBudget(product: Product): number | null {
  const raw = product.metadata?.max_price;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isNaN(n) || n <= 0 ? null : n;
}

// ----- Price-vs-budget signal -----

export type PriceSignalTone =
  | 'green'
  | 'amber'
  | 'amber-red'
  | 'gray'
  | 'muted';

export interface PriceSignal {
  icon: string;
  tone: PriceSignalTone;
  label: string;
}

/**
 * The at-a-glance signal shown on board cards: how the best available price
 * compares to the product's budget. See the spec table for the thresholds.
 */
export function getPriceSignal(product: Product): PriceSignal {
  const bestPrice = getBestPrice(product.sources);
  const budget = getBudget(product);
  const currency = getBestPriceCurrency(product.sources);

  if (bestPrice === null) {
    return { icon: '💤', tone: 'gray', label: 'no leads' };
  }

  const price = formatPrice(bestPrice, currency);

  if (budget === null) {
    return { icon: '', tone: 'muted', label: price };
  }

  const ratio = bestPrice / budget;
  if (ratio <= 1.0) return { icon: '✓', tone: 'green', label: price };
  if (ratio <= 1.1) return { icon: '🔥', tone: 'amber', label: `${price} · close!` };
  return { icon: '⚠', tone: 'amber-red', label: price };
}

// ----- Hunt duration -----

/** Whole days since the product was created (its hunt duration). */
export function huntDurationDays(product: Product): number {
  const created = new Date(product.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const ms = Date.now() - created;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// ----- Column aggregates -----

export interface ColumnAggregate {
  line1: string | null;
  line2: string | null;
}

/** Sum of budgets (max_price) across the given products. */
function sumBudgets(products: Product[]): number {
  return products.reduce((acc, p) => acc + (getBudget(p) ?? 0), 0);
}

/** Sum of best source prices across the given products. */
function sumBestPrices(products: Product[]): number {
  return products.reduce((acc, p) => acc + (getBestPrice(p.sources) ?? 0), 0);
}

/** The two aggregate lines shown under each column header. */
export function columnAggregate(
  status: ProductStatus,
  products: Product[]
): ColumnAggregate {
  const count = products.length;
  switch (status) {
    case 'hunting': {
      const budget = sumBudgets(products);
      const avg =
        count > 0
          ? Math.round(
              products.reduce((a, p) => a + huntDurationDays(p), 0) / count
            )
          : 0;
      return {
        line1: budget > 0 ? `Total budget: ${formatPrice(budget)}` : null,
        line2: count > 0 ? `Avg hunt: ${avg} days` : null,
      };
    }
    case 'found': {
      const value = sumBestPrices(products);
      return {
        line1: value > 0 ? `Total value: ${formatPrice(value)}` : null,
        line2: count > 0 ? 'Ready to buy' : null,
      };
    }
    case 'bought': {
      const spent = sumBestPrices(products);
      return {
        line1: spent > 0 ? `Spent: ${formatPrice(spent)}` : null,
        line2: count > 0 ? `${count} ${count === 1 ? 'item' : 'items'} purchased` : null,
      };
    }
    case 'archived':
      return {
        line1: count > 0 ? `${count} archived` : null,
        line2: null,
      };
  }
}
