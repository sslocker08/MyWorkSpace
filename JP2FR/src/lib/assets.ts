// Asset indirection contract (DESIGN.md §8 — "アセット差し替え契約").
//
// MVP renders code-drawn visuals (SVG waves/patterns, procedural canvas).
// Production assets (public-domain ukiyo-e scans, AI-generated stills,
// image-to-video clips) must drop in as a pure path swap: every page/
// component reads asset paths from here, never hardcodes them inline.
// Swapping MVP -> production means editing only the string values below
// (and dropping the real files at those paths under public/) — no
// component or page code should need to change.

export interface HeroAssets {
  poster: string;
  videoWebm: string | null;
  videoMp4: string | null;
}

export const heroAssets: HeroAssets = {
  poster: '/media/hero/poster.svg',
  videoWebm: null,
  videoMp4: null,
};

export interface SectionAssets {
  kasumi: string;
  seigaiha: string;
  grain: string;
}

export const sectionAssets: SectionAssets = {
  kasumi: '/textures/kasumi.svg',
  seigaiha: '/textures/seigaiha.svg',
  grain: '/textures/washi-grain.svg',
};
