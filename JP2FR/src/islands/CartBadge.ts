// critique: P4 H4 E4 S4 R4 V3
//
// Header cart-count badge. Loaded via a <script type="module"> tag placed in
// Header (desktop + mobile nav may each render their own [data-cart-badge]
// element pointing at the same underlying cart store).
//
// Idempotent by design: a module-scope import is only ever executed once per
// resolved URL by the browser, but in case this file ends up bundled/inlined
// into more than one script tag (e.g. duplicated markup in desktop + mobile
// nav partials), guard the actual subscription with a global flag so we never
// attach two listeners that both re-render the same elements.

import { cartCount } from '../lib/cart';

declare global {
  interface Window {
    __jp2frCartBadgeBound?: boolean;
  }
}

const SELECTOR = '[data-cart-badge]';

function renderBadge(el: Element, count: number): void {
  el.textContent = count > 0 ? String(count) : '';
  if (count > 0) {
    el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');
  } else {
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
  }
}

function renderAll(count: number): void {
  document.querySelectorAll(SELECTOR).forEach((el) => renderBadge(el, count));
}

function init(): void {
  if (window.__jp2frCartBadgeBound) return;
  window.__jp2frCartBadgeBound = true;

  renderAll(cartCount.get());
  cartCount.subscribe((count) => renderAll(count));
}

init();
