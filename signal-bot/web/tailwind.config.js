/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0d0d',
        surface: '#141414',
        border: '#1f1f1f',
        accent: '#22d3ee',    // cyan
        bull: '#10b981',      // emerald
        bear: '#ef4444',      // red
        warn: '#f59e0b',      // amber
        muted: '#6b7280',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
