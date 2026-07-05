// critique: P4 H4 E4 S4 R4 V4
//
// Below-fold reveals via ScrollTrigger.batch. Initial hidden state is set
// via gsap.set() immediately (synchronously, before any scroll can happen)
// so no-JS/reduced-motion visitors — who never run this module — always
// see the server-rendered, fully visible markup; JS only ever hides what it
// will later reveal itself.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_MIE } from './lib/ease';

gsap.registerPlugin(ScrollTrigger);

function revealOnScroll(items: HTMLElement[]): void {
  if (!items.length) return;
  gsap.set(items, { y: 24, autoAlpha: 0 });
  ScrollTrigger.batch(items, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        y: 0,
        autoAlpha: 1,
        duration: 0.6,
        ease: EASE_MIE,
        stagger: 0.15,
      });
    },
  });
}

/** [data-stagger-item] — the 4 featured product cards + the LP category
 * cards (ProductsSection.astro). Runs on both desktop and mobile (below-fold
 * reveal is not a breakpoint concern). v2: the founders carousel no longer
 * has a bespoke stagger path here — it's a plain scroll-snap track with its
 * own progressive-enhancement island (src/islands/Carousel.ts), not a
 * ScrollTrigger.batch reveal. */
export function initStagger(): void {
  revealOnScroll(gsap.utils.toArray<HTMLElement>('[data-stagger-item]'));
}
