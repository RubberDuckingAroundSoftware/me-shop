import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary',
      'placeholder:text-text-tertiary',
      'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
      'resize-y disabled:opacity-60',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
