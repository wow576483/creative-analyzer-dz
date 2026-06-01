import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#8F2F38', dark: '#6E1F26' },
        gold: { DEFAULT: '#C9A14A', light: '#E2C77C' },
        cream: { DEFAULT: '#FFF8EC', dark: '#F5E6BE' },
        ink: '#2A1B1F',
      },
      fontFamily: {
        head: ['var(--font-head)', 'Playfair Display', 'serif'],
        ar: ['var(--font-ar)', 'Cairo', 'sans-serif'],
        ui: ['var(--font-ui)', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        luxe: '0 10px 40px -12px rgba(143,47,56,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
