// The machine-readable Brand System contract (brand-guidelines skill, "DESIGN.md
// パターン"). Each product owns one DESIGN.md serialized to this shape; the UI
// primitives read only the SEMANTIC CSS variables it implies, never raw values.
// Swapping a product's brand = swapping its DesignContract → generated token CSS.

export type OKLCH = `oklch(${string})`;

export interface PaletteContract {
  /** Brand hue (0–360) and chroma — the primitive-ramp swap points. */
  brandHue: number;
  brandChroma: number;
  /** Semantic role → OKLCH (overrides for the generated semantic layer). */
  semantic: Partial<Record<SemanticColorRole, OKLCH>>;
  /** Audited foreground/background pairs (anti-slop: contrast is proven, not assumed). */
  contrastAudit: Array<{ fg: string; bg: string; ratio: number; level: "AA" | "AAA" }>;
}

export type SemanticColorRole =
  | "bg"
  | "bg-subtle"
  | "bg-muted"
  | "surface"
  | "fg"
  | "fg-muted"
  | "border"
  | "accent"
  | "accent-fg"
  | "success"
  | "warning"
  | "error"
  | "info";

export interface TypeContract {
  display: { family: string; weights: number[]; italic: boolean };
  body: { family: string; weights: number[]; lineHeight: number };
  mono: { family: string };
  scale: { base: string; ratio: number };
}

export interface SpacingContract {
  baseUnit: 4 | 8;
  scale: number[];
}

export interface LayoutContract {
  breakpoints: Record<"mobile" | "tablet" | "desktop" | "wide", string>;
  gridCols: number;
  containerMax: string;
}

export interface ComponentContract {
  name: string;
  /** All interactive primitives must enumerate the 8 states they ship. */
  states: ComponentState[];
}

export type ComponentState =
  | "default"
  | "hover"
  | "focus"
  | "active"
  | "disabled"
  | "loading"
  | "error"
  | "success";

export interface MotionContract {
  durations: Record<"micro" | "standard" | "reveal", string>;
  easings: Record<string, string>;
  /** Anti-slop: only transform/opacity may animate. */
  animatableProps: ReadonlyArray<"transform" | "opacity">;
}

export interface VoiceContract {
  personality: string[];
  rules: string[];
}

export interface BrandContract {
  mission: string;
  signature?: string;
  /** Accessibility floor. */
  a11y: { contrastFloor: "AA" | "AAA"; minTouchTargetPx: number; reducedMotion: boolean };
}

/** The 9-section DESIGN.md contract. */
export interface DesignContract {
  name: string;
  version: string;
  updated: string;
  palette: PaletteContract; // 1
  type: TypeContract; // 2
  spacing: SpacingContract; // 3
  layout: LayoutContract; // 4
  components: ComponentContract[]; // 5
  motion: MotionContract; // 6
  voice: VoiceContract; // 7
  brand: BrandContract; // 8
  antiPatterns: string[]; // 9
}

/** The 8 states every interactive primitive must implement. */
export const REQUIRED_STATES: readonly ComponentState[] = [
  "default",
  "hover",
  "focus",
  "active",
  "disabled",
  "loading",
  "error",
  "success",
] as const;

/** Default Studio house contract — products clone and re-tune this. */
export const studioDesign: DesignContract = {
  name: "studio-default",
  version: "0.1.0",
  updated: "2026-06-21",
  palette: {
    brandHue: 264,
    brandChroma: 0.13,
    semantic: {},
    contrastAudit: [
      { fg: "--color-fg", bg: "--color-bg", ratio: 14.8, level: "AAA" },
      { fg: "--color-accent-fg", bg: "--color-accent", ratio: 6.1, level: "AA" },
      { fg: "--color-fg-muted", bg: "--color-bg", ratio: 4.7, level: "AA" },
    ],
  },
  type: {
    display: { family: "Inter", weights: [600, 700], italic: false },
    body: { family: "Inter", weights: [400, 500, 600], lineHeight: 1.6 },
    mono: { family: "ui-monospace" },
    scale: { base: "1rem", ratio: 1.25 },
  },
  spacing: { baseUnit: 4, scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96] },
  layout: {
    breakpoints: { mobile: "375px", tablet: "768px", desktop: "1024px", wide: "1440px" },
    gridCols: 12,
    containerMax: "1200px",
  },
  components: [
    { name: "Button", states: [...REQUIRED_STATES] },
    { name: "Input", states: [...REQUIRED_STATES] },
    { name: "Badge", states: ["default", "hover", "focus", "disabled"] },
    { name: "Card", states: ["default", "hover", "focus"] },
  ],
  motion: {
    durations: { micro: "150ms", standard: "250ms", reveal: "600ms" },
    easings: { standard: "cubic-bezier(0.4,0,0.2,1)", out: "cubic-bezier(0,0,0.2,1)" },
    animatableProps: ["transform", "opacity"],
  },
  voice: {
    personality: ["direct", "clear", "human", "not corporate"],
    rules: ["sentence case", "active voice", "no fake metrics", "no marketing jargon"],
  },
  brand: {
    mission: "AIの力で最高品質のニッチ・プロダクトを量産する",
    a11y: { contrastFloor: "AA", minTouchTargetPx: 48, reducedMotion: true },
  },
  antiPatterns: [
    "no pure #000/#fff backgrounds (use oklch near-black/near-white)",
    "no italic display headings",
    "no inline hex/rgb colors or font-family — CSS variables only",
    "no layout animation — transform/opacity only",
    "image grids use minmax(0,1fr), never bare 1fr",
    "every interactive component ships all 8 states",
    "no fake metrics / fake browser chrome / invented testimonials",
  ],
};

/** Guard: an interactive component must cover all 8 required states. */
export function hasAllRequiredStates(c: ComponentContract): boolean {
  return REQUIRED_STATES.every((s) => c.states.includes(s));
}
