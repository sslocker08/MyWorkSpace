/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Color names resolve through OKLCH tokens (app/tokens.css). Existing
      // utility classes (bg-bg, text-bull, border-border, ...) keep working
      // but now flow through the single token source. Do not inline hex here.
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',    // cyan
        bull: 'var(--color-bull)',        // emerald — long / safe
        bear: 'var(--color-bear)',        // red — short / danger
        warn: 'var(--color-warn)',        // amber — caution
        muted: 'var(--color-muted)',
        focus: 'var(--color-focus)',
        'cb-positive': 'var(--color-cb-positive)',
        'cb-negative': 'var(--color-cb-negative)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
