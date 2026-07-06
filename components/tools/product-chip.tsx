'use client';

import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_NAME_LENGTH = 40;

export interface ProductChipProps {
  productId: string;
  productName: string;
  /** Whether this product id exists in the current catalog. */
  valid?: boolean;
  onClick?: (productId: string) => void;
}

/**
 * Inline pill that represents a product mentioned in chat. Flows within text
 * like a word and navigates to the product in the Reverse Catalog on click.
 *
 * When the referenced id isn't in the catalog (an LLM-invented reference), the
 * chip renders in a muted, non-interactive state.
 */
export function ProductChip({
  productId,
  productName,
  valid = true,
  onClick,
}: ProductChipProps) {
  const label =
    productName.length > MAX_NAME_LENGTH
      ? `${productName.slice(0, MAX_NAME_LENGTH - 1).trimEnd()}…`
      : productName;

  return (
    <button
      type="button"
      disabled={!valid}
      onClick={valid ? () => onClick?.(productId) : undefined}
      title={valid ? productName : `${productName} (not in catalog)`}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 align-baseline text-xs font-medium transition-colors',
        valid
          ? 'cursor-pointer bg-accent-light text-accent hover:bg-accent hover:text-white'
          : 'cursor-default bg-surface-hover text-text-tertiary'
      )}
    >
      <Package size={12} className="shrink-0" />
      {label}
    </button>
  );
}
