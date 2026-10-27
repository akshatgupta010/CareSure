import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          app: 'hsl(var(--bg-app) / <alpha-value>)',
          surface: 'hsl(var(--bg-surface) / <alpha-value>)',
          subtle: 'hsl(var(--bg-subtle) / <alpha-value>)',
          elevated: 'hsl(var(--bg-elevated) / <alpha-value>)',
        },
        border: {
          subtle: 'hsl(var(--border-subtle) / <alpha-value>)',
          strong: 'hsl(var(--border-strong) / <alpha-value>)',
        },
        text: {
          main: 'hsl(var(--text-primary) / <alpha-value>)',
          secondary: 'hsl(var(--text-secondary) / <alpha-value>)',
          muted: 'hsl(var(--text-muted) / <alpha-value>)',
          onbrand: 'hsl(var(--text-on-brand) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand-primary) / <alpha-value>)',
          hover: 'hsl(var(--brand-hover) / <alpha-value>)',
          subtle: 'hsl(var(--brand-subtle) / <alpha-value>)',
          accent: 'hsl(var(--brand-accent) / <alpha-value>)',
        },
        risk: {
          low: {
            bg: 'hsl(var(--risk-low-bg) / <alpha-value>)',
            text: 'hsl(var(--risk-low-text) / <alpha-value>)',
          },
          med: {
            bg: 'hsl(var(--risk-med-bg) / <alpha-value>)',
            text: 'hsl(var(--risk-med-text) / <alpha-value>)',
          },
          high: {
            bg: 'hsl(var(--risk-high-bg) / <alpha-value>)',
            text: 'hsl(var(--risk-high-text) / <alpha-value>)',
          },
        },
        sidebar: {
          bg: 'hsl(var(--sidebar-bg) / <alpha-value>)',
          border: 'hsl(var(--sidebar-border) / <alpha-value>)',
          text: 'hsl(var(--sidebar-text) / <alpha-value>)',
          active: 'hsl(var(--sidebar-active) / <alpha-value>)',
        },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
