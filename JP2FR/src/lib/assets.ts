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
  // Real Hokusai "Great Wave" (The Met Open Access, CC0) — see assetgen/SOURCES.md.
  poster: '/media/hero/poster.avif',
  videoWebm: null,
  videoMp4: null,
};

// Hero print panel sources (real ukiyo-e, CC0). Consumed by Hero.astro.
export const heroWave = {
  src1200: '/media/hero/wave-1200.webp',
  srcFull: '/media/hero/wave-full.webp',
} as const;

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

// Concept-section emaki (絵巻) pan — three real ukiyo-e prints, all CC0 /
// The Met Open Access (see assetgen/SOURCES.md). `waveDetail` intentionally
// reuses heroWave.src1200 (same physical file as the hero panel's 1200w
// source) rather than duplicating the path, so the two components can never
// drift onto different crops of the same print.
export interface SectionPrints {
  bridge: string;
  crane: string;
  waveDetail: string;
}

export const sectionPrints: SectionPrints = {
  // Utagawa Hiroshige, "Morning View of Nihonbashi" (Tōkaidō gojūsan-tsugi).
  bridge: '/img/sections/bridge.webp',
  // Katsushika Hokusai, "Cranes on Branch of Snow-covered Pine".
  crane: '/img/sections/crane.webp',
  // Utagawa Hiroshige, "Arai: Ferryboats" (荒井 渡舟ノ図, Met 36953, CC0) —
  // crossing-the-water scene. Deliberately NOT the Great Wave: the hero
  // already shows it, and repeating one artwork twice on the LP dilutes both
  // (visual-gate decision 2026-07-05).
  waveDetail: '/img/sections/ferry.webp',
};
