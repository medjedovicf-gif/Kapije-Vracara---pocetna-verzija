/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // Podrazumevano je 1 MB, što je premalo za fotografije kvara. Vercel prima
    // najviše 4.5 MB po zahtevu, pa ostajemo ispod toga (slike se smanjuju u browseru).
    serverActions: { bodySizeLimit: '4mb' },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
