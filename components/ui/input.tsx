import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary',
      'placeholder:text-text-tertiary',
      'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
      'disabled:opacity-60',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
