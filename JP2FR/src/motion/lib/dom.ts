// critique: P4 H4 E4 S4 R4 V4
//
// Small DOM/perf helpers shared across motion features. Kept dependency-free
// (no gsap import) so it can be used from anywhere without ordering concerns.

/** Debounce a handler — used for resize listeners so layout is re-measured
 * once after the user stops resizing, not on every intermediate frame. */
export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  }) as T;
}

/** Cheap, conservative proxy for "mobile-low-end" hardware — used to gate
 * the emaki pan (src/motion/emakiPan.ts) per the brief (skip pin+scrub,
 * show a single static scene instead). Any environment that doesn't expose
 * `hardwareConcurrency` is treated as capable (fails open). */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency;
  return typeof cores === 'number' && cores <= 4;
}
