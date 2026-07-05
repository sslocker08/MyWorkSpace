// critique: P4 H4 E4 S4 R4 V4
//
// Intro overlay — the emaki's "curtain rise" before the scroll begins.
// IntroOverlay.astro ships the static DOM only ([hidden] by default so
// no-JS visitors never see a stuck modal); this module owns the reveal,
// the once-per-session gate, and handing control back to hero.ts via the
// `jp2fr:introdone` event so the hero entrance never races the curtain.
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
  const message = overlay.querySelector<HTMLElement>('.intro-message');
  const band = overlay.querySelector<HTMLElement>('.intro-curtain-band');
  const root = document.documentElement;
  const previousOverflow = root.style.overflow;

  overlay.hidden = false;
  root.style.overflow = 'hidden';
  skipButton?.focus({ preventScroll: true });

  let split: SplitText | undefined;
  if (message) {
    split = new SplitText(message, { type: 'chars' });
    gsap.set(split.chars, { y: 24, opacity: 0 });
  }
  if (band) gsap.set(band, { scaleY: 0, transformOrigin: 'top' });

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

  if (band) {
    tl.to(band, { scaleY: 1, duration: 0.35, ease: EASE_MIE }, 0);
  }
  if (split?.chars.length) {
    tl.to(
      split.chars,
      { y: 0, opacity: 1, duration: 0.5, ease: EASE_MIE, stagger: 0.03 },
      0.2,
    );
  }
  tl.to({}, { duration: 0.6 }); // hold
  tl.to(overlay, { yPercent: -100, duration: 0.6, ease: 'power4.inOut' });

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
