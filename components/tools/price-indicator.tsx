'use client';

import type { Product } from '@/lib/types';
import { getPriceSignal, type PriceSignalTone } from '@/lib/product-utils';
import { cn } from '@/lib/utils';

// Fixed mid-tones that read on both the warm-light and dark backgrounds.
// (The app themes via [data-theme], not Tailwind's `dark:` variant.)
const toneClasses: Record<PriceSignalTone, string> = {
  green: 'text-green-600',
  amber: 'text-amber-600',
  'amber-red': 'text-orange-600',
  gray: 'text-text-tertiary',
  muted: 'text-text-secondary',
};

export interface PriceIndicatorProps {
  product: Product;
  className?: string;
}

/**
 * The price-vs-budget signal shown on board cards: ✓ under budget, 🔥 close,
 * ⚠ over, 💤 no leads. Renders the icon + label in the matching tone.
 */
export function PriceIndicator({ product, className }: PriceIndicatorProps) {
  const { icon, tone, label } = getPriceSignal(product);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        toneClasses[tone],
        className
      )}
    >
      {icon && <span aria-hidden>{icon}</span>}
      <span>{label}</span>
    </span>
  );
}
