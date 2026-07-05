// critique: P4 H4 E4 S4 R4 V4
//
// Intro overlay — v2 「闇から浮かぶ」("emerging from the dark") choreography
// (ART-DIRECTION-LP-V2.md §1, DESIGN.md v2 §4). IntroOverlay.astro ships the
// static DOM only ([hidden] by default so no-JS visitors never see a stuck
// modal, and the overlay is server-visible — never CSS-hidden — for every
// element this module animates); this module owns the reveal, the
// once-per-session gate, and handing control back to hero.ts via the
// `jp2fr:introdone` event so the hero entrance never races the curtain.
//
// Choreography (all tweens are JS `.from()` on server-visible markup, never
// CSS-authored initial states — DESIGN.md v2 §4 / AD v2 "禁止事項の再掲"):
//   (a) [data-intro-art]   — the ōkubi-e print emerges from the kon ground
//   (d) .intro-sun         — the shu sun disc glows in alongside it
//   (b) [data-intro-title] — "JP2FR" wordmark, SplitText chars stagger in
//   (c) .intro-message     — tagline settles in under the wordmark
//   hold, then (e) the whole overlay rises away like a curtain lifting.
// Total runtime budget: <=2.5s (reduced-motion visitors never reach this
// code at all — src/motion/init.ts's matchMedia branch removes [data-intro]
// outright instead of calling initIntro()).
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { EASE_MIE } from './lib/ease';

gsap.registerPlugin(SplitText);

const SESSION_KEY = 'jp2fr:introSeen';
export const INTRO_DONE_EVENT = 'jp2fr:introdone';

function dispatchIntroDone(): void {
  window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT));
}

/** Moves focus to the hero h1 (temporarily focusable) so keyboard/AT users
 * land back where the page's reading order naturally continues; falls back
 * to <body> if the hero hasn't rendered for some reason. */
function returnFocusAfterIntro(): void {
  const heroTitle = document.querySelector<HTMLElement>('[data-hero] .hero-title');
  if (heroTitle) {
    const hadTabIndex = heroTitle.hasAttribute('tabindex');
    if (!hadTabIndex) {
      heroTitle.setAttribute('tabindex', '-1');
      heroTitle.addEventListener('blur', () => heroTitle.removeAttribute('tabindex'), { once: true });
    }
    heroTitle.focus({ preventScroll: true });
    return;
  }
  document.body.setAttribute('tabindex', '-1');
  document.body.focus({ preventScroll: true });
  document.body.removeAttribute('tabindex');
}

export function initIntro(): void {
  const overlay = document.querySelector<HTMLElement>('[data-intro]');
  if (!overlay) {
    dispatchIntroDone();
    return;
  }

  if (sessionStorage.getItem(SESSION_KEY)) {
    overlay.remove();
    dispatchIntroDone();
    return;
  }

  const skipButton = overlay.querySelector<HTMLButtonElement>('[data-intro-skip]');
  const art = overlay.querySelector<HTMLElement>('[data-intro-art]');
  const title = overlay.querySelector<HTMLElement>('[data-intro-title]');
  const message = overlay.querySelector<HTMLElement>('.intro-message');
  const sun = overlay.querySelector<HTMLElement>('.intro-sun');
  const root = document.documentElement;
  const previousOverflow = root.style.overflow;

  overlay.hidden = false;
  root.style.overflow = 'hidden';
  skipButton?.focus({ preventScroll: true });

  // Only the wordmark is char-split in v2 (the tagline moves as one block —
  // AD v2 §1's copy block reads as a single settling motion under the
  // staggered title, not a second stagger of its own).
  let split: SplitText | undefined;
  if (title) {
    split = new SplitText(title, { type: 'chars' });
  }

  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    root.style.overflow = previousOverflow;
    sessionStorage.setItem(SESSION_KEY, '1');
    document.removeEventListener('keydown', onKeydown);
    skipButton?.removeEventListener('click', onSkip);
    split?.revert();
    overlay.remove();
    dispatchIntroDone();
    returnFocusAfterIntro();
  };

  const tl = gsap.timeline({ onComplete: finish });

  // (a) the ōkubi-e print bleeds in from the dark — slight scale + drift so
  // it reads as emerging rather than merely appearing.
  if (art) {
    tl.from(art, { autoAlpha: 0, scale: 1.06, xPercent: -4, duration: 0.9, ease: 'power2.out' }, 0);
  }

  // (d) the shu sun disc glows in alongside the print (same window as (a),
  // slightly delayed so it doesn't read as simultaneous/mechanical).
  if (sun) {
    tl.from(sun, { autoAlpha: 0, scale: 0.85, duration: 0.6, ease: 'power2.out' }, 0.1);
  }

  // (b) the JP2FR wordmark, char-by-char, overlapping the tail of the art
  // reveal so the scene never feels like discrete sequential steps.
  if (split?.chars.length) {
    tl.from(
      split.chars,
      { yPercent: 18, autoAlpha: 0, duration: 0.45, ease: EASE_MIE, stagger: 0.04 },
      '-=0.5',
    );
  }

  // (c) the tagline settles in under the wordmark.
  if (message) {
    tl.from(message, { autoAlpha: 0, y: 12, duration: 0.45, ease: EASE_MIE }, '-=0.3');
  }

  tl.to({}, { duration: 0.65 }); // hold — let the scene breathe before the curtain lifts

  // (e) exit: the whole overlay rises away like a curtain.
  tl.to(overlay, { yPercent: -100, duration: 0.65, ease: 'power4.inOut' });

  const onSkip = (): void => {
    tl.progress(1); // jumps to end state and fires onComplete -> finish()
    tl.kill();
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') onSkip();
  };

  skipButton?.addEventListener('click', onSkip);
  document.addEventListener('keydown', onKeydown);
}
