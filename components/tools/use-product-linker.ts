'use client';

import { useCallback } from 'react';
import type { Product } from '@/lib/types';

/** Matches a complete product reference token: [[product:id|name]]. */
const PRODUCT_REF = /\[\[product:[^\]]+\]\]/g;

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Escape a string for safe use inside a double-quoted HTML attribute. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Scan assistant text for product-name mentions and wrap them in the
 * [[product:id|name]] reference syntax — a fallback for when the LLM doesn't
 * emit the syntax itself.
 *
 * Longer names are matched first ("Air Max 1 x Patta" before "Air Max 1"), and
 * text already inside a reference token is never touched, so re-linking can't
 * corrupt an existing reference.
 */
export function autoLinkProducts(text: string, products: Product[]): string {
  if (!text || products.length === 0) return text;

  const sorted = [...products].sort((a, b) => b.name.length - a.name.length);

  // Work over a list of segments where each segment is either free text
  // (linkable) or a locked reference token (never re-scanned).
  let segments: { text: string; locked: boolean }[] = splitLocked(text);

  for (const product of sorted) {
    if (!product.name.trim()) continue;
    const regex = new RegExp(`(${escapeRegExp(product.name)})`, 'gi');
    const next: typeof segments = [];

    for (const seg of segments) {
      if (seg.locked) {
        next.push(seg);
        continue;
      }
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((match = regex.exec(seg.text)) !== null) {
        if (match.index > lastIndex) {
          next.push({ text: seg.text.slice(lastIndex, match.index), locked: false });
        }
        next.push({
          text: `[[product:${product.id}|${match[1]}]]`,
          locked: true,
        });
        lastIndex = match.index + match[0].length;
        // Guard against zero-length matches (empty product name already filtered).
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }
      if (lastIndex < seg.text.length) {
        next.push({ text: seg.text.slice(lastIndex), locked: false });
      }
    }
    segments = next;
  }

  return segments.map((s) => s.text).join('');
}

/** Split text into locked reference tokens and free text between them. */
function splitLocked(text: string): { text: string; locked: boolean }[] {
  const segments: { text: string; locked: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  PRODUCT_REF.lastIndex = 0;
  while ((match = PRODUCT_REF.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), locked: false });
    }
    segments.push({ text: match[0], locked: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), locked: false });
  }
  return segments;
}

/**
 * Convert [[product:id|name]] tokens into <product-ref> HTML elements that
 * react-markdown (with rehype-raw) renders via a custom component. The name is
 * carried in a data attribute so Markdown syntax inside it is never parsed.
 *
 * Only complete tokens are converted; a partial `[[product:` mid-stream is left
 * as plain text until its closing `]]` arrives.
 */
export function preprocessProductSyntax(text: string): string {
  return text.replace(
    /\[\[product:([^|\]]+)\|([^\]]+)\]\]/g,
    (_full, id: string, name: string) =>
      `<product-ref data-id="${escapeAttr(id)}" data-name="${escapeAttr(name)}"></product-ref>`
  );
}

/**
 * Hook returning a stable transform that runs the full text pipeline for a
 * message: auto-link product mentions, then convert reference syntax to
 * <product-ref> elements. User messages skip auto-linking (their words are
 * left untouched) but still render any reference syntax they typed.
 */
export function useProductLinker(products: Product[]) {
  return useCallback(
    (text: string, { autoLink }: { autoLink: boolean }) => {
      const linked = autoLink ? autoLinkProducts(text, products) : text;
      return preprocessProductSyntax(linked);
    },
    [products]
  );
}
