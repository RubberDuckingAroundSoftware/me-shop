import type { Metadata, Viewport } from 'next';
import { AppFrame } from '@/components/shell/app-frame';
import { ThemeProvider } from '@/components/theme/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'meShop',
  description: 'Your personal shopping system.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Set data-theme before first paint to avoid a flash of the wrong theme.
const noFlashScript = `(function(){try{var t=localStorage.getItem('meshop_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AppFrame>{children}</AppFrame>
        </ThemeProvider>
      </body>
    </html>
  );
}
