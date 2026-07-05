// critique: P4 H4 E4 S4 R4 V4
//
// Hardcoded copies of the oklch() values in src/styles/tokens.css, resolved
// once per canvas context into the fillStyle string this environment
// actually supports. Canvas 2D accepts oklch() directly in current
// Chromium/Safari/Firefox; the rgb fallbacks below are best-effort sRGB
// approximations of the same tokens for engines that don't (canvas
// fillStyle silently keeps its previous value on an unparsable string,
// which is what makes the runtime feature-detect below possible).
export interface ColorToken {
  readonly oklch: string;
  readonly fallbackRgb: string;
}

// Keep in sync with tokens.css §1. Do not read CSS custom properties at
// draw time (that would be a per-frame style recalculation) — these are the
// verbatim values, copied by hand.
export const TOKEN = {
  kinari: { oklch: 'oklch(0.955 0.012 95)', fallbackRgb: 'rgb(243, 239, 231)' },
  washi: { oklch: 'oklch(0.93 0.015 90)', fallbackRgb: 'rgb(233, 228, 216)' },
  sumi: { oklch: 'oklch(0.24 0.012 270)', fallbackRgb: 'rgb(51, 51, 58)' },
  ai: { oklch: 'oklch(0.4 0.095 255)', fallbackRgb: 'rgb(58, 90, 138)' },
  asagi: { oklch: 'oklch(0.63 0.075 230)', fallbackRgb: 'rgb(140, 178, 204)' },
  shu: { oklch: 'oklch(0.55 0.185 32)', fallbackRgb: 'rgb(196, 79, 46)' },
  // Not a token — a code-mixed "deep ai-sumi" for the front wave band only
  // (DESIGN.md §8: procedural placeholder, no new palette entry needed).
  aiSumiDeep: { oklch: 'oklch(0.32 0.05 260)', fallbackRgb: 'rgb(42, 50, 74)' },
} as const satisfies Record<string, ColorToken>;

let cachedSupportsOklch: boolean | undefined;

/** Feature-detects oklch() canvas fill support exactly once (module-level
 * cache) — never re-tested per frame. */
export function supportsOklchCanvas(ctx: CanvasRenderingContext2D): boolean {
  if (cachedSupportsOklch !== undefined) return cachedSupportsOklch;
  const before = ctx.fillStyle;
  ctx.fillStyle = '#000102';
  ctx.fillStyle = 'oklch(0.5 0.1 200)';
  cachedSupportsOklch = ctx.fillStyle !== '#000102';
  ctx.fillStyle = before;
  return cachedSupportsOklch;
}

/** Resolves every token to its final fillStyle string once (per renderer
 * setup), so the hot draw loop only ever reads plain strings. */
export function resolvePalette(ctx: CanvasRenderingContext2D): Record<keyof typeof TOKEN, string> {
  const useOklch = supportsOklchCanvas(ctx);
  const entries = Object.entries(TOKEN) as [keyof typeof TOKEN, ColorToken][];
  const resolved = {} as Record<keyof typeof TOKEN, string>;
  for (const [key, token] of entries) {
    resolved[key] = useOklch ? token.oklch : token.fallbackRgb;
  }
  return resolved;
}
