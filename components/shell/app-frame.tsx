'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileTopBar } from './mobile-topbar';
import { NavProvider } from './nav-context';

const BARE_ROUTES = ['/login', '/register'];

/**
 * Chooses the chrome for the current route: auth screens render full-page
 * (no sidebar); everything else gets the app shell.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname.startsWith(r));

  if (bare) {
    return <>{children}</>;
  }

  return (
    <NavProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileTopBar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </NavProvider>
  );
}
