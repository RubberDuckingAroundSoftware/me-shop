'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType, Product } from '@/lib/types';
import { autoLinkProducts, preprocessProductSyntax } from './use-product-linker';
import {
  createMarkdownComponents,
  USER_ALLOWED_ELEMENTS,
} from './markdown-components';

export interface ChatMessageProps {
  message: ChatMessageType;
  products: Product[];
  onProductClick?: (productId: string) => void;
  /** Streaming placeholder before the first token arrives. */
  pending?: boolean;
}

/**
 * A single chat bubble. Assistant messages render full Markdown with product
 * auto-linking; user messages render limited inline Markdown and are never
 * auto-linked (their words are left as typed).
 */
export function ChatMessage({
  message,
  products,
  onProductClick,
  pending,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  const validIds = useMemo(
    () => new Set(products.map((p) => p.id)),
    [products]
  );

  const components = useMemo(
    () => createMarkdownComponents({ isUser, validIds, onProductClick }),
    [isUser, validIds, onProductClick]
  );

  // Assistant messages get auto-linking; user messages keep their exact words
  // but still render any [[product:]] syntax they typed.
  const content = useMemo(() => {
    const linked = isUser
      ? message.content
      : autoLinkProducts(message.content, products);
    return preprocessProductSyntax(linked);
  }, [isUser, message.content, products]);

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-xl px-4 py-2.5 text-sm',
          isUser
            ? 'max-w-[75%] bg-accent text-white'
            : 'max-w-[85%] border border-border bg-surface text-text-primary'
        )}
      >
        {pending ? (
          <span className="flex gap-1 py-1">
            <span className="h-1.5 w-1.5 animate-dot rounded-full bg-text-tertiary" />
            <span
              className="h-1.5 w-1.5 animate-dot rounded-full bg-text-tertiary"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="h-1.5 w-1.5 animate-dot rounded-full bg-text-tertiary"
              style={{ animationDelay: '0.3s' }}
            />
          </span>
        ) : (
          <div className="break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={components}
              allowedElements={isUser ? USER_ALLOWED_ELEMENTS : undefined}
              unwrapDisallowed={isUser}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
