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

/** [data-stagger-item] — currently the 4 featured product cards. Runs on
 * both desktop and mobile (below-fold reveal is not a breakpoint concern). */
export function initStagger(): void {
  revealOnScroll(gsap.utils.toArray<HTMLElement>('[data-stagger-item]'));
}

/** Mobile-only: the founders rail keeps its native overflow-x/scroll-snap
 * behavior (foundersRail.ts's pinned scrub is desktop-only), so its cards
 * get the same vertical reveal-on-scroll treatment instead. Call this only
 * from the mobile matchMedia branch — on desktop the cards are handled by
 * the horizontal pin scrub and should not also fade in vertically. */
export function initFoundersRailMobileStagger(): void {
  revealOnScroll(gsap.utils.toArray<HTMLElement>('[data-founders-rail] .rail-item'));
}
