'use client';

import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';
import { ProductChip } from './product-chip';

export interface MarkdownComponentOptions {
  /** User bubbles invert link colors to read against the accent background. */
  isUser?: boolean;
  /** Product ids present in the current catalog — used to mute invalid chips. */
  validIds: Set<string>;
  onProductClick?: (productId: string) => void;
}

/** Inline Markdown allowed inside user messages — no block-level elements. */
export const USER_ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'del',
  'a',
  'code',
  'br',
  'product-ref',
];

/**
 * Build the custom react-markdown renderers for a chat bubble. These scale
 * headings down, tighten spacing, and wrap [[product:]] references (converted
 * to <product-ref> elements upstream) in clickable ProductChips.
 */
export function createMarkdownComponents({
  isUser,
  validIds,
  onProductClick,
}: MarkdownComponentOptions): Components {
  // Typed as Components so every standard renderer's props are inferred.
  const base: Components = {
    // Links open in a new tab. User bubbles get inverted (white) link styling.
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'underline underline-offset-2',
          isUser
            ? 'text-white hover:text-white/80'
            : 'text-accent hover:text-accent-hover'
        )}
      >
        {children}
      </a>
    ),

    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-lg bg-surface-hover p-3 text-xs">
        {children}
      </pre>
    ),

    // Inline code carries no className; code inside a <pre> block does.
    code: ({ className, children }) => {
      if (className) return <code className={className}>{children}</code>;
      return (
        <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs">
          {children}
        </code>
      );
    },

    ul: ({ children }) => (
      <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>
    ),

    p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,

    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-accent pl-3 italic text-text-secondary">
        {children}
      </blockquote>
    ),

    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-xs">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-surface-hover px-2 py-1 text-left font-medium">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-2 py-1">{children}</td>
    ),

    // Scale headings down — inside a bubble an h2 shouldn't dominate.
    h1: ({ children }) => (
      <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>
    ),
    h2: ({ children }) => (
      <h4 className="mb-1 mt-2.5 text-sm font-semibold first:mt-0">{children}</h4>
    ),
    h3: ({ children }) => (
      <h5 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h5>
    ),
  };

  // Custom element emitted by preprocessProductSyntax → clickable chip. It isn't
  // part of react-markdown's known-element map, so it's attached separately.
  const productRef = ({
    node,
  }: {
    node?: { properties?: Record<string, unknown> };
  }) => {
    const props = node?.properties ?? {};
    const id = String(props.dataId ?? '');
    const name = String(props.dataName ?? '');
    return (
      <ProductChip
        productId={id}
        productName={name}
        valid={validIds.has(id)}
        onClick={onProductClick}
      />
    );
  };

  return { ...base, 'product-ref': productRef } as Components;
}
