import { ShoppingBag } from 'lucide-react';

/** Full-page centered layout for the login & register screens (no sidebar). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">{footer}</p>
      </div>
    </div>
  );
}
