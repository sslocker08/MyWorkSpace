// critique: P4 H4 E4 S4 R4 V4
//
// Motion layer entry point — side-effect module, dynamically imported once
// from LandingPage.astro after load. Owns:
//  - the prefers-reduced-motion split (gsap.matchMedia contexts, so every
//    tween/ScrollTrigger created inside a context is auto-reverted if the
//    media query stops matching — no manual gsap cleanup needed below);
//  - the desktop/mobile split nested inside the "motion ok" context;
//  - Lenis, wired only for desktop fine-pointer, via the standard gsap
//    ticker integration.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initIntro } from './intro';
import { initHero } from './hero';
import { initWaveSequence } from './waveSequence';
import { initFoundersRail } from './foundersRail';
import { initStagger, initFoundersRailMobileStagger } from './stagger';
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
 * than left in its server-rendered [hidden] state, and the wave canvas gets
 * a single static final-frame paint instead of staying blank behind the
 * seigaiha fallback. */
function applyReducedMotionState(): void {
  document.querySelector('[data-intro]')?.remove();
  initWaveSequence({ staticProgress: 1 });
}

function initMotion(): void {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    applyReducedMotionState();
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    initIntro();
    initHero();
    const cleanupWaveSequence = initWaveSequence();
    initStagger();

    const mmViewport = gsap.matchMedia();

    mmViewport.add(
      {
        isDesktop: '(min-width: 768px)',
        isDesktopFine: '(min-width: 768px) and (pointer: fine)',
        isMobile: '(max-width: 767.98px)',
      },
      (context) => {
        const conditions = context.conditions as { isDesktop: boolean; isDesktopFine: boolean; isMobile: boolean };
        const cleanups: Array<() => void> = [];

        if (conditions.isDesktop) {
          cleanups.push(initFoundersRail());
        }

        if (conditions.isDesktopFine) {
          cleanups.push(setupLenis());
          cleanups.push(initCursor());
        }

        if (conditions.isMobile) {
          initFoundersRailMobileStagger();
        }

        return () => {
          cleanups.forEach((cleanup) => cleanup());
        };
      },
    );

    return () => {
      mmViewport.revert();
      cleanupWaveSequence();
    };
  });
}

initMotion();
