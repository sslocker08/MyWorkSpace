// critique: P4 H4 E4 S4 R4 V4
//
// Motion layer entry point — side-effect module, dynamically imported once
// from LandingPage.astro after load. Owns:
//  - the prefers-reduced-motion split (gsap.matchMedia contexts, so every
//    tween/ScrollTrigger created inside a context is auto-reverted if the
//    media query stops matching — no manual gsap cleanup needed below);
//  - the desktop-fine-pointer split nested inside the "motion ok" context
//    (Lenis + the custom cursor — both a poor fit for touch/coarse input);
//  - Lenis, wired only for desktop fine-pointer, via the standard gsap
//    ticker integration.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initIntro } from './intro';
import { initHero } from './hero';
import { initEmakiPan } from './emakiPan';
import { initStagger } from './stagger';
import { initCursor } from './cursor';

gsap.registerPlugin(ScrollTrigger);

/** Standard gsap-ticker Lenis integration. Returns a cleanup function that
 * removes the exact ticker callback added here and destroys the Lenis
 * instance — needed because gsap.ticker.remove() requires the same function
 * reference that was passed to .add(). */
function setupLenis(): () => void {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number): void => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

/** prefers-reduced-motion: reduce — show final states only, no tweens, no
 * pin/scrub. DESIGN.md §4: "全演出停止"; intro is removed outright rather
 * than left in its server-rendered [hidden] state, and the emaki track gets
 * a single static scene-1 frame with every concept line already visible,
 * instead of pinning + panning. */
function applyReducedMotionState(): void {
  document.querySelector('[data-intro]')?.remove();
  initEmakiPan({ static: true });
}

function initMotion(): void {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    applyReducedMotionState();
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    initIntro();
    initHero();
    const cleanupEmakiPan = initEmakiPan();
    initStagger();

    // v2: the founders section is now a plain arrow carousel
    // (src/islands/Carousel.ts, progressive enhancement loaded from
    // FoundersSection.astro itself, outside this motion layer) — there is no
    // more desktop pin-scrub / mobile rail-stagger split to gate here, so
    // isDesktopFine (Lenis + custom cursor) is the only viewport condition
    // this module still needs.
    const mmViewport = gsap.matchMedia();

    mmViewport.add('(min-width: 768px) and (pointer: fine)', () => {
      const cleanups: Array<() => void> = [setupLenis(), initCursor()];

      return () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    });

    return () => {
      mmViewport.revert();
      cleanupEmakiPan();
    };
  });
}

initMotion();
