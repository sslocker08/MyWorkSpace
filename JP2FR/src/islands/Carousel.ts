// critique: P4 H4 E4 S4 R4 V4
//
// Vanilla-TS progressive enhancement for [data-carousel] regions (today:
// FoundersSection's founder carousel; the contract below is generic so any
// future arrow-carousel can reuse it). The unenhanced baseline is a plain
// overflow-x:auto + scroll-snap-x track — this island only layers
// arrow-button scrolling + disabled-at-ends state on top; nothing here is
// required for the carousel to be usable (mouse wheel / trackpad / touch /
// native keyboard scroll all work without this module ever loading).
//
// Data-attribute API (per instance, root = [data-carousel]):
//   [data-carousel]         region root — every one on the page gets bound
//   [data-carousel-track]   the scrollable flex + scroll-snap-x container;
//                           its direct children are the "cards" used for
//                           the one-card scroll-step distance
//   [data-carousel-prev]    button — scrolls back one card, disabled at start
//   [data-carousel-next]    button — scrolls forward one card, disabled at end
//
// Binding is idempotent (dataset flag) so re-running initCarousels() after
// e.g. an astro:page-load navigation never double-attaches listeners.

const END_EPSILON = 4; // px slack for sub-pixel scroll-position rounding

function cardStep(track: HTMLElement): number {
  const first = track.firstElementChild as HTMLElement | null;
  if (!first) return track.clientWidth;
  const style = getComputedStyle(track);
  const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
  return first.getBoundingClientRect().width + gap;
}

function updateEnds(
  track: HTMLElement,
  prevBtn: HTMLButtonElement | null,
  nextBtn: HTMLButtonElement | null,
): void {
  const maxScroll = track.scrollWidth - track.clientWidth;
  const atStart = track.scrollLeft <= END_EPSILON;
  const atEnd = track.scrollLeft >= maxScroll - END_EPSILON;
  if (prevBtn) prevBtn.disabled = atStart;
  // A track that doesn't overflow at all (e.g. very wide viewport, few
  // cards) has maxScroll <= 0 — both arrows read as "at the end" then,
  // which is the correct disabled-disabled state for "nothing to scroll".
  if (nextBtn) nextBtn.disabled = maxScroll <= END_EPSILON || atEnd;
}

function bindCarousel(root: HTMLElement): void {
  if (root.dataset.carouselBound === 'true') return;
  root.dataset.carouselBound = 'true';

  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  if (!track) return;

  const prevBtn = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-carousel-next]');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

  const scrollByStep = (direction: 1 | -1): void => {
    track.scrollBy({ left: direction * cardStep(track), behavior });
  };

  prevBtn?.addEventListener('click', () => scrollByStep(-1));
  nextBtn?.addEventListener('click', () => scrollByStep(1));

  let ticking = false;
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateEnds(track, prevBtn, nextBtn);
      ticking = false;
    });
  };
  track.addEventListener('scroll', onScroll, { passive: true });

  const syncEnds = (): void => updateEnds(track, prevBtn, nextBtn);
  syncEnds();
  // Card width / track width / visible-card-count all change across
  // breakpoints, so the disabled-at-ends state needs re-checking on resize.
  window.addEventListener('resize', syncEnds);
}

function initCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(bindCarousel);
}

initCarousels();

export {};
