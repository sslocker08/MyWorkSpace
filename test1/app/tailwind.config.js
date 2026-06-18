/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivoire: '#F8F4EE',
        encre: '#1C1714',
        argile: '#B8714A',
        vert: '#3C5C41',
        brume: '#B3ADA4',
      },
      fontFamily: {
        cormorant: ['var(--font-cormorant)', 'Georgia', 'serif'],
        dm: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        shippori: ['var(--font-shippori)', 'serif'],
      },
      transitionTimingFunction: {
        kanmi: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        350: '350ms',
        450: '450ms',
      },
      aspectRatio: {
        '3/4': '3 / 4',
      },
    },
  },
  plugins: [],
}
