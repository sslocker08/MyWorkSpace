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
        washi:  '#F5F0E8',  // 和紙
        sumi:   '#12100E',  // 墨
        ai:     '#1C3A5E',  // 藍
        shu:    '#C94B2A',  // 朱
        kin:    '#B8960C',  // 金
        asagi:  '#4A8BA8',  // 浅葱
        beni:   '#9B2335',  // 紅
        moku:   '#6B5744',  // 木
        kiri:   '#C8C4BC',  // 霧
      },
      fontFamily: {
        zen:      ['var(--font-zen)', 'serif'],
        shippori: ['var(--font-shippori)', 'serif'],
        dm:       ['var(--font-dm-sans)', 'sans-serif'],
        noto:     ['var(--font-noto)', 'serif'],
      },
      transitionDuration: {
        '350': '350ms',
      },
    },
  },
  plugins: [],
};
export default config;
