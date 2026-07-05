// critique: P4 H4 E3 S4 R4 V3
//
// Binds every `[data-add-to-cart]` button on the page (product cards, product
// detail page, etc).
//
// Expected attributes on each button (see docs/component-contract notes below
// -- this is the contract other agents' templates must emit):
//   data-add-to-cart        marks the element as a bindable button
//   data-slug               product slug (required)
//   data-unique             presence, or "true"/"false" -- one-of-a-kind item
//   data-soldout            presence, or "true"/"false" -- disables the button
//   data-label-added        label to show after a successful add (falls back
//                            to the button's own default text if omitted)
//   data-label-in-cart      label to show when a unique item is clicked again
//                            while already in the cart (falls back to
//                            data-label-added, then the default text)
//   data-qty-input          optional id of a sibling `<input type=number>`
//                            (the product-detail quantity stepper) whose
//                            value (clamped 1-9, defaults to 1) is added on
//                            top of whatever is already in the cart --
//                            never applies to unique items, which always
//                            add exactly 1 regardless of this attribute.
//
// State machine per button: default -> loading (>=300ms, disabled) ->
// success (label swapped to data-label-added / data-label-in-cart, 1.5s) or
// error (label reverts, 1.5s) -> back to default. Sold-out buttons are
// disabled up front and never bound to a click handler.

import { addToCart, cartItems, setQty } from '../lib/cart';

const SELECTOR = '[data-add-to-cart]';
const BOUND_ATTR = 'data-atc-bound';
const MIN_LOADING_MS = 300;
const TRANSIENT_MS = 1500;

function readBool(el: HTMLElement, attr: string): boolean {
  const value = el.getAttribute(attr);
  return value !== null && value !== 'false';
}

function bind(btn: HTMLButtonElement): void {
  if (btn.getAttribute(BOUND_ATTR) === 'true') return;
  btn.setAttribute(BOUND_ATTR, 'true');

  const slug = btn.dataset.slug;
  if (!slug) return;

  const unique = readBool(btn, 'data-unique');
  const soldOut = readBool(btn, 'data-soldout');

  if (soldOut) {
    btn.disabled = true;
    return;
  }

  const defaultLabel = btn.textContent?.trim() ?? '';
  const addedLabel = btn.getAttribute('data-label-added') ?? defaultLabel;
  const inCartLabel = btn.getAttribute('data-label-in-cart') ?? addedLabel;

  btn.addEventListener('click', () => {
    if (btn.disabled) return;

    const alreadyInCart = unique && (cartItems.get()[slug] ?? 0) > 0;

    btn.classList.remove('is-error', 'is-success');
    btn.classList.add('is-loading');
    btn.disabled = true;

    window.setTimeout(() => {
      btn.classList.remove('is-loading');

      let nextLabel = defaultLabel;
      let nextState: 'is-success' | 'is-error' = 'is-success';

      try {
        if (alreadyInCart) {
          nextLabel = inCartLabel;
        } else if (unique) {
          addToCart(slug, { unique });
          nextLabel = addedLabel;
        } else {
          const qtyInputId = btn.getAttribute('data-qty-input');
          const qtyInput = qtyInputId ? document.getElementById(qtyInputId) : null;
          const requestedQty =
            qtyInput instanceof HTMLInputElement
              ? Math.max(1, Math.min(9, Number.parseInt(qtyInput.value, 10) || 1))
              : 1;
          const existingQty = cartItems.get()[slug] ?? 0;
          setQty(slug, existingQty + requestedQty);
          nextLabel = addedLabel;
        }
      } catch (err) {
        console.error('[AddToCart] failed to add to cart', err);
        nextLabel = defaultLabel;
        nextState = 'is-error';
      }

      btn.textContent = nextLabel;
      btn.classList.add(nextState);

      window.setTimeout(() => {
        btn.classList.remove(nextState);
        btn.textContent = defaultLabel;
        btn.disabled = false;
      }, TRANSIENT_MS);
    }, MIN_LOADING_MS);
  });
}

function init(): void {
  document.querySelectorAll(SELECTOR).forEach((el) => {
    if (el instanceof HTMLButtonElement) bind(el);
  });
}

init();
