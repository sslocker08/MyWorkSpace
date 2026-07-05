// critique: P4 H4 E4 S4 R4 V4
//
// Founders rail — desktop upgrade of the native overflow-x/scroll-snap rail
// (FoundersSection.astro) into a pinned horizontal scrub. Only called from
// init.ts's desktop matchMedia branch; mobile keeps the native rail
// untouched (this module is simply never invoked there). Style toggles
// (overflow/scroll-snap) are applied as inline styles rather than a
// stylesheet class so this stays a pure src/motion/** concern with no
// second .astro edit.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { debounce } from './lib/dom';

gsap.registerPlugin(ScrollTrigger);

export function initFoundersRail(): () => void {
  const section = document.querySelector<HTMLElement>('[data-founders-rail]');
  const rail = section?.querySelector<HTMLElement>('[data-rail]');
  const track = section?.querySelector<HTMLElement>('[data-rail-track]');
  if (!section || !rail || !track) return () => {};

  let scrollTrigger: ScrollTrigger | undefined;

  const teardown = (): void => {
    scrollTrigger?.kill();
    scrollTrigger = undefined;
    rail.style.overflow = '';
    rail.style.scrollSnapType = '';
    gsap.set(track, { clearProps: 'x' });
  };

  const setup = (): void => {
    teardown();
    const delta = track.scrollWidth - rail.clientWidth;
    if (delta <= 0) return; // nothing to pin-scrub if it already fits.

    rail.style.overflow = 'visible';
    rail.style.scrollSnapType = 'none';

    const scrubTween = gsap.to(track, { x: -delta, ease: 'none' });
    scrollTrigger = ScrollTrigger.create({
      trigger: section,
      pin: true,
      scrub: 1,
      start: 'top top',
      end: `+=${delta}`,
      animation: scrubTween,
    });
  };

  setup();

  const onResize = debounce(() => {
    setup();
    ScrollTrigger.refresh();
  }, 200);
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    teardown();
  };
}
