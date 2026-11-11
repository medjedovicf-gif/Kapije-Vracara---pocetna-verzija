import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Kapije Vračara — Resident Hub',
  description: 'Platforma za stanare, administratore i upravu zgrade.',
  applicationName: 'Kapije Vračara',
  icons: {
    icon: [
      { url: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/apple-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Kapije',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

// Ponašanje kao aplikacija: bez pinch/double-tap zoom-a i bez auto-zoom-a na poljima za unos (iOS).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F6F1E6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
