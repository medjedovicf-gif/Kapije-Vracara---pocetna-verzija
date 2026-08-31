import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#10152A',
          900: '#161D38',
          800: '#1E2748',
        },
        cream: {
          DEFAULT: '#F6F1E6',
          2: '#EFE7D6',
        },
        ink: {
          DEFAULT: '#1B1F2A',
          soft: '#6B7080',
          faint: '#9A9DA8',
        },
        gold: {
          DEFAULT: '#E4B23C',
          dark: '#C0912A',
        },
        sage: {
          DEFAULT: '#6F9C87',
          soft: '#E4EFE9',
          dark: '#3E6857',
        },
        brick: {
          DEFAULT: '#B96A4A',
          soft: '#F3E4DD',
          dark: '#9C5439',
        },
        line: '#E7E0D2',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      borderRadius: {
        lg: '26px',
        md: '18px',
        sm: '12px',
      },
      boxShadow: {
        card: '0 10px 25px -18px rgba(16,21,42,0.28)',
        soft: '0 20px 45px -25px rgba(16,21,42,0.35)',
      },
    },
  },
  plugins: [],
};
export default config;
