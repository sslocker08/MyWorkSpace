// critique: P4 H4 E4 S4 R4 V4
//
// Shared 見得(mie) ease — DESIGN.md §4: `--ease-mie: cubic-bezier(0.16, 1, 0.3, 1)`.
// Registered once as a named CustomEase so every entrance tween in the
// motion layer references the exact brand curve instead of an
// approximation (`expo.out` etc). CustomEase ships free in this gsap
// install (all plugins bundled), so there is no reason to approximate.
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

/** Exact match for --ease-mie. Use for entrance/reveal tweens (never for
 * scrub tweens, which must stay `ease: 'none'` per DESIGN.md §4). */
export const EASE_MIE = CustomEase.create('jp2fr-mie', '0.16, 1, 0.3, 1');

/** Seconds, mirroring tokens.css (which expresses these in ms). */
export const DURATION_UI_FAST = 0.15;
export const DURATION_UI = 0.25;
export const DURATION_UI_SLOW = 0.4;
export const DURATION_SCENE = 0.55;
