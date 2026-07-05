'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsLeft,
  ChevronsRight,
  Home,
  LogOut,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useNav } from './nav-context';
import type { AuthUser } from '@/lib/types';

const nav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const COLLAPSE_KEY = 'meshop_sidebar_collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, closeNav } = useNav();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  };

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

  // Label visibility: hidden at md+ only when collapsed (mobile drawer always shows labels).
  const labelCls = cn(
    'transition-opacity duration-200',
    collapsed && 'md:hidden'
  );

  return (
    <>
      {/* Mobile overlay */}
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
          'flex w-64 max-w-[80vw] shrink-0 flex-col overflow-hidden border-r border-border bg-surface',
          'fixed inset-y-0 left-0 z-50 transition-[transform,width] duration-200 ease-out md:static md:z-auto md:max-w-none md:translate-x-0',
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full md:shadow-none',
          collapsed ? 'md:w-16' : 'md:w-60'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center px-5 py-5',
            collapsed ? 'md:justify-center md:px-3' : 'justify-between'
          )}
        >
          <Link
            href="/"
            onClick={closeNav}
            aria-label="meShop home"
            className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span
              className={cn(
                'text-lg font-semibold tracking-tight text-text-primary',
                labelCls
              )}
            >
              meShop
            </span>
          </Link>

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'hidden rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary md:block',
              collapsed && 'md:hidden'
            )}
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Mobile close */}
          <button
            onClick={closeNav}
            className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Expand button — only when collapsed (its own row so it's reachable) */}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="mx-3 mb-1 hidden items-center justify-center rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary md:flex"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            const link = (
              <Link
                href={href}
                onClick={closeNav}
                className={cn(
                  'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'md:justify-center md:px-2',
                  active
                    ? 'bg-accent-light text-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={labelCls}>{label}</span>
              </Link>
            );
            return (
              <Tooltip key={href} content={label} disabled={!collapsed}>
                {link}
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer: user, theme, sign out */}
        <div className="mt-auto border-t border-border p-3">
          {user ? (
            <div className="space-y-2">
              <div
                className={cn(
                  'flex items-center gap-3 px-2 py-1',
                  collapsed && 'md:justify-center md:px-0'
                )}
              >
                <Tooltip content={user.name} disabled={!collapsed}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold uppercase text-white">
                    {user.name.charAt(0) || '?'}
                  </div>
                </Tooltip>
                <div className={cn('min-w-0', labelCls)}>
                  <div className="truncate text-sm font-medium text-text-primary">
                    {user.name}
                  </div>
                  <div className="truncate text-xs text-text-tertiary">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className={cn(collapsed ? 'md:flex md:justify-center' : '')}>
                <ThemeToggle collapsed={collapsed} />
              </div>

              <Tooltip content="Sign out" disabled={!collapsed}>
                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className={cn(
                    'flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-60',
                    collapsed && 'md:justify-center md:px-2'
                  )}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className={labelCls}>
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </span>
                </button>
              </Tooltip>
            </div>
          ) : (
            <div className={cn('px-2 py-2 text-xs text-text-tertiary', labelCls)}>
              meShop v0.0.1
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
