import { cn } from '@/lib/utils';
import type { ProductStatus } from '@/lib/types';

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  /** Optional explicit hex color (used for scenario badges). */
  color?: string;
}

/** Generic pill badge. Pass `color` for a tinted scenario badge. */
export function Badge({ children, className, color }: BadgeProps) {
  const style = color
    ? { backgroundColor: `${color}1A`, color }
    : undefined;
  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        !color && 'bg-surface-hover text-text-secondary',
        className
      )}
    >
      {children}
    </span>
  );
}

const statusStyles: Record<ProductStatus, string> = {
  hunting: 'bg-amber-100 text-amber-800',
  found: 'bg-blue-100 text-blue-800',
  bought: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}
