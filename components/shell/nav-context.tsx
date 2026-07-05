'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface NavState {
  /** Whether the mobile navigation drawer is open. */
  open: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
}

const NavContext = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openNav = useCallback(() => setOpen(true), []);
  const closeNav = useCallback(() => setOpen(false), []);
  const toggleNav = useCallback(() => setOpen((o) => !o), []);

  const value = useMemo(
    () => ({ open, openNav, closeNav, toggleNav }),
    [open, openNav, closeNav, toggleNav]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavState {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within a NavProvider');
  return ctx;
}
