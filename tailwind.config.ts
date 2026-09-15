import type { Config } from 'tailwindcss';

/**
 * Design tokens are CSS variables (see src/styles/globals.css) so the hub
 * can flip light/dark without re-rendering. Every color below resolves to
 * `rgb(var(--x) / <alpha>)`, so `bg-panel/60` and friends work.
 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic (theme-aware)
        bg: v('bg'),
        panel: v('panel'),
        panel2: v('panel2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        input: v('input'),
        // Brand
        navy: { DEFAULT: '#05102a', 2: '#081840', 3: '#0c2060' },
        gold: { DEFAULT: '#d4a017', 2: '#f0c040', 3: '#ffe176', ink: v('gold-ink') },
        // Status
        ok: v('ok'),
        warn: v('warn'),
        info: v('info'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'Outfit', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.125rem',
        xl3: '1.5rem',
      },
      boxShadow: {
        panel: '0 10px 28px rgb(0 0 0 / 0.22)',
        gold: '0 12px 30px rgb(212 160 23 / 0.35)',
        glow: '0 0 0 3px rgb(212 160 23 / 0.18)',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pulseDot: {
          '0%': { boxShadow: '0 0 0 0 rgb(95 211 154 / 0.55)' },
          '70%': { boxShadow: '0 0 0 10px rgb(95 211 154 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(95 211 154 / 0)' },
        },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        pulseDot: 'pulseDot 1.6s infinite',
        fadeUp: 'fadeUp .5s ease-out both',
      },
      maxWidth: { site: '1200px', hub: '1040px', prose: '68ch' },
    },
  },
  plugins: [],
} satisfies Config;
