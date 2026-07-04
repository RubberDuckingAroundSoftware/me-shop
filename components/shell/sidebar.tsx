'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LogOut, Settings, ShoppingBag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNav } from './nav-context';
import type { AuthUser } from '@/lib/types';

const nav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, closeNav } = useNav();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const signOut = async () => {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile overlay — dims content behind the drawer */}
      <div
        onClick={closeNav}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden
      />

      <aside
        className={cn(
          'flex w-64 max-w-[80vw] shrink-0 flex-col border-r border-border bg-surface',
          // Off-canvas drawer on mobile, static rail from md up.
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out md:static md:z-auto md:w-56 md:max-w-none md:translate-x-0',
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full md:shadow-none'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-text-primary">
              meShop
            </span>
          </div>
          {/* Close affordance — mobile only */}
          <button
            onClick={closeNav}
            className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeNav}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent-light text-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-3">
          {user ? (
            <div>
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold uppercase text-white">
                  {user.name.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text-primary">
                    {user.name}
                  </div>
                  <div className="truncate text-xs text-text-tertiary">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={signOut}
                disabled={signingOut}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <div className="px-2 py-2 text-xs text-text-tertiary">meShop v0.0.1</div>
          )}
        </div>
      </aside>
    </>
  );
}
