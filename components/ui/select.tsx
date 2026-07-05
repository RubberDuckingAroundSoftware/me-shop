import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-9 text-sm text-text-primary',
        'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
        'disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
  </div>
));
Select.displayName = 'Select';
