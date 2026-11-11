import type { MetadataRoute } from 'next';

// Omogućava "Dodaj na početni ekran": ikonica, rad preko celog ekrana bez browser trake.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kapije Vračara',
    short_name: 'Kapije',
    description: 'Platforma za stanare, administratore i upravu zgrade.',
    lang: 'sr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F6F1E6',
    theme_color: '#10152A',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
