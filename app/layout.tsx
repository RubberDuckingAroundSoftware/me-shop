import type { Metadata, Viewport } from 'next';
import { AppFrame } from '@/components/shell/app-frame';
import './globals.css';

export const metadata: Metadata = {
  title: 'meShop',
  description: 'Your personal shopping system.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
