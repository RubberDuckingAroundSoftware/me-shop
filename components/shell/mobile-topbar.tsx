'use client';

import { Menu, ShoppingBag } from 'lucide-react';
import { useNav } from './nav-context';

/** Slim top bar shown only on mobile — hosts the hamburger that opens the nav drawer. */
export function MobileTopBar() {
  const { toggleNav } = useNav();

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
      <button
        onClick={toggleNav}
        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight text-text-primary">
          meShop
        </span>
      </div>
    </div>
  );
}
