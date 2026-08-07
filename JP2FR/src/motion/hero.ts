// critique: P4 H4 E4 S4 R4 V4
//
// Hero entrance + parallax. DESIGN.md §4 hard rule: the hero <h1> is the LCP
// element and must never carry an opacity:0 initial state — so its entrance
// below is transform-only (y), while the subtitle/scroll-cue (non-LCP) get
// the full y+opacity treatment. Waits for the intro's `jp2fr:introdone`
// event when the intro overlay is still present, otherwise runs at once.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_MIE } from './lib/ease';
import { INTRO_DONE_EVENT } from './intro';

gsap.registerPlugin(ScrollTrigger);

const ENTRANCE_DURATION = 0.9;
const ENTRANCE_Y = 28;

// [data-hero-bg]'s media (img/video) — .hero-media in Hero.astro's CSS —
// ships at CSS `scale: 1.08` (parallax headroom so its edges never show
// while [data-parallax] translates it). This is a one-time settle from that
// baked-in scale down to 1.0, tweening the same `scale` property CSS already
// set rather than fighting it with a transform. Transform-only, no layout
// impact (DESIGN.md §4).
const BG_REVEAL_DURATION = 1.6;

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const title = hero.querySelector<HTMLElement>('.hero-title');
  const subtitle = hero.querySelector<HTMLElement>('.hero-subtitle');
  const scrollCue = hero.querySelector<HTMLElement>('[data-scroll-cue]');
  const bgMedia = hero.querySelector<HTMLElement>('[data-hero-bg] .hero-media');

  const runEntrance = (): void => {
    const tl = gsap.timeline();
    if (title) {
      tl.from(title, { y: ENTRANCE_Y, duration: ENTRANCE_DURATION, ease: EASE_MIE }, 0);
    }
    if (subtitle) {
      tl.from(
        subtitle,
        { y: ENTRANCE_Y, opacity: 0, duration: ENTRANCE_DURATION, ease: EASE_MIE },
        0.15,
      );
    }
    if (scrollCue) {
      tl.from(
        scrollCue,
        { y: ENTRANCE_Y, opacity: 0, duration: ENTRANCE_DURATION, ease: EASE_MIE },
        0.3,
      );
    }
  };

  const runBgReveal = (): void => {
    if (!bgMedia) return;
    gsap.to(bgMedia, { scale: 1, duration: BG_REVEAL_DURATION, ease: 'power2.out' });
  };

  const boot = (): void => {
    runEntrance();
    runBgReveal();
  };

  // If the intro overlay is still in the DOM, it hasn't finished (or was
  // never checked) yet — wait for it. intro.ts runs its own sessionStorage
  // check and removes the overlay synchronously before this file's
  // initHero() is called by init.ts, so this read is race-free.
  if (document.querySelector('[data-intro]')) {
    window.addEventListener(INTRO_DONE_EVENT, boot, { once: true });
  } else {
    boot();
  }

  const parallaxLayers = hero.querySelectorAll<SVGElement>('[data-parallax]');
  parallaxLayers.forEach((layer) => {
    const speed = Number(layer.dataset.parallax ?? '0');
    // Standard background-parallax formula: a layer at speed 1 tracks the
    // page at full rate (appears nearest); a layer at speed 0 fully cancels
    // scroll (appears to stand still, i.e. farthest). Distance is always
    // <=100% of the scroll range, honoring DESIGN.md's parallax <=1x rule.
    const distance = (1 - speed) * 100;
    gsap.to(layer, {
      yPercent: distance,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  });

  if (scrollCue) {
    gsap.to(scrollCue, {
      autoAlpha: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '20% top',
        scrub: true,
      },
    });
  }
}
