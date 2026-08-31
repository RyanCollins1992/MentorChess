/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Every token below reads a CSS custom property (KnightPath's values,
        // see src/styles/knightpath.js, applied to :root by AppLayout.jsx)
        // instead of a static hex. Each reads the `<alpha-value>` placeholder
        // pattern (not the plain hex var) so opacity modifiers work —
        // bg-gold/10, text-danger/30 etc. Tailwind can't alpha-blend an
        // opaque var(--color-gold) hex string at build time, so it silently
        // dropped every /NN utility against these tokens app-wide until this
        // fix (2026-07-10, see project memory) — it needs the companion
        // --color-*-rgb "R G B" triplet vars set alongside the hex ones in
        // AppLayout.jsx/globals.css.
        bg:      'rgb(var(--color-bg-rgb) / <alpha-value>)',
        bg2:     'rgb(var(--color-bg2-rgb) / <alpha-value>)',
        bg3:     'rgb(var(--color-bg3-rgb) / <alpha-value>)',
        border:  'rgb(var(--color-border-rgb) / <alpha-value>)',
        gold:    'rgb(var(--color-gold-rgb) / <alpha-value>)',
        gold2:   'rgb(var(--color-gold2-rgb) / <alpha-value>)',
        accent:  'rgb(var(--color-accent-rgb) / <alpha-value>)',
        accent2: 'rgb(var(--color-accent2-rgb) / <alpha-value>)',
        muted:   'rgb(var(--color-muted-rgb) / <alpha-value>)',
        dim:     'rgb(var(--color-dim-rgb) / <alpha-value>)',
        text:    'rgb(var(--color-text-rgb) / <alpha-value>)',
        danger:  'rgb(var(--color-danger-rgb) / <alpha-value>)',
        // Overrides Tailwind's built-in "white" so raw text-white usages
        // (127 of them, hardcoded directly in components rather than routed
        // through a token) resolve to whichever value is correct for the
        // active theme — dark ink for the two light themes, warm off-white
        // for the six dark ones.
        white: 'rgb(var(--color-white-rgb) / <alpha-value>)',
        // Static (not theme-reactive) — the streak "flame" accent
        // (Sidebar.jsx, DashboardPage.jsx, ProgressPage.jsx) is deliberately
        // a fixed warm orange rather than the theme-aware gold/accent
        // tokens, so it still reads as "fire" regardless of accent color.
        orange: {
          400: '#cc7a35',
          600: '#a35f28',
          900: '#3d2410',
        },
      },
      fontFamily: {
        // Inter throughout — see src/styles/knightpath.js and AppLayout.jsx,
        // same --font-body mechanism as --font-heading below.
        sans: ['var(--font-body)', '-apple-system', 'sans-serif'],
        heading: ['var(--font-heading)', '-apple-system', 'sans-serif'],
        // Left as monospace so chess move notation stays aligned/legible.
        mono: ['JetBrains Mono', 'monospace'],
      },
      // A small, uniform ~4px radius (see globals.css) instead of Tailwind's
      // defaults (xl=12px, 2xl=16px, 3xl=24px) — sm/md/full are left at
      // their defaults. lg/xl/2xl/3xl read CSS custom properties so they
      // stay a single source of truth with globals.css's :root values.
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        // Tight, low-opacity elevation shadow for floating UI (toasts, the
        // coach panel) — replaces a much heavier, diffuse one.
        card: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
