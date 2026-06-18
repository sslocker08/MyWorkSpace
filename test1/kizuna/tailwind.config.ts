import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        washi:  '#F2EBE0',
        sumi:   '#1A1612',
        beni:   '#C4464A',
        kon:    '#2C4470',
        kincha: '#C08228',
        take:   '#4A7C59',
        brume:  '#A9A49C',
      },
      fontFamily: {
        cormorant: ['var(--font-cormorant)', 'Georgia', 'serif'],
        dm:        ['var(--font-dm-sans)', 'sans-serif'],
        noto:      ['var(--font-noto)', 'serif'],
      },
      transitionDuration: {
        '350': '350ms',
      },
    },
  },
  plugins: [],
};
export default config;
