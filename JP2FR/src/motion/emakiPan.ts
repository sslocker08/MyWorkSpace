// critique: P4 H4 E4 S4 R4 V4
//
// SIGNATURE moment — an 絵巻 (handscroll) pan through three real ukiyo-e
// prints, pinned and scroll-scrubbed. Replaces the previous procedural
// wave-canvas placeholder module (deleted) now that real prints exist
// under public/img/sections + public/media/hero (DESIGN.md §8 asset-swap
// contract — image URLs live in src/lib/assets.ts / ConceptSection.astro,
// never here; this file only reads the DOM structure).
//
// Much simpler than the old canvas module: no rAF drawing loop, no
// ImageBitmap, no per-frame allocation discipline to maintain — the track
// is a single gsap.to() tween of a `transform: translateX`, and resize is
// handled by a function-based tween value + ScrollTrigger's
// invalidateOnRefresh (re-evaluated automatically, no manual rebuild).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { debounce, isLowEndDevice } from './lib/dom';

gsap.registerPlugin(ScrollTrigger);

export interface EmakiPanOptions {
  /** Skip the pin/scrub entirely and show scene 1 (track at x=0) with every
   * concept line already visible — used for prefers-reduced-motion and
   * low-end mobile. Mirrors the `staticProgress` escape hatch the old
   * canvas module took, but the emaki has no continuous frame to paint, so
   * this is a plain flag rather than a numeric progress. */
  static?: boolean;
}

/** Returns a cleanup function for the one manual (non-gsap) side effect this
 * feature owns — the window resize listener. The pin/scrub timeline itself
 * is captured by the enclosing gsap.matchMedia context and reverts
 * automatically — no manual gsap cleanup needed here. */
export function initEmakiPan(options: EmakiPanOptions = {}): () => void {
  const noop = (): void => {};
  const section = document.querySelector<HTMLElement>('[data-concept]');
  const viewport = document.querySelector<HTMLElement>('[data-emaki]');
  const track = document.querySelector<HTMLElement>('[data-emaki-track]');
  if (!section || !viewport || !track) return noop;

  const lines = Array.from(section.querySelectorAll<HTMLElement>('[data-concept-line]'));

  const showStatic = (): void => {
    gsap.set(track, { x: 0 });
    if (lines.length) gsap.set(lines, { autoAlpha: 1, y: 0 });
  };

  const isStatic = options.static ?? isLowEndDevice();
  const delta = track.scrollWidth - viewport.clientWidth;

  // Guard: nothing to pan (track no wider than the viewport) — skip the pin
  // rather than pin with a no-op scrub.
  if (isStatic || delta <= 0) {
    showStatic();
    return noop;
  }

  gsap.set(track, { x: 0 });
  if (lines.length) gsap.set(lines, { autoAlpha: 0, y: 24 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      pin: true,
      start: 'top top',
      end: '+=250%',
      scrub: 1,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        track.style.willChange = self.isActive ? 'transform' : 'auto';
      },
    },
  });

  // Function-based value: re-evaluated on every ScrollTrigger.refresh()
  // (invalidateOnRefresh above), so resize just needs a refresh call, not a
  // full teardown/rebuild of the timeline.
  tl.to(track, { x: () => -Math.max(0, track.scrollWidth - viewport.clientWidth), ease: 'none' }, 0);

  const revealAt = [0.05, 0.4, 0.75];
  const durations = [0.1, 0.1, 0.2];
  lines.forEach((line, index) => {
    const at = revealAt[index];
    const duration = durations[index];
    if (at === undefined || duration === undefined) return;
    tl.fromTo(
      line,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration, ease: 'none', immediateRender: false },
      at,
    );
  });

  const onResize = debounce(() => {
    ScrollTrigger.refresh();
  }, 200);
  window.addEventListener('resize', onResize);

  return () => window.removeEventListener('resize', onResize);
}
