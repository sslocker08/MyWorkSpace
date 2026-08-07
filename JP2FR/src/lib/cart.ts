// critique: P4 H4 E4 S4 R4 V3
//
// Cart state store (nanostores + localStorage persistence).
//
// Single source of truth for "what's in the cart" across every island
// (CartBadge, AddToCart, CartPage). Keyed by product slug -> quantity.
// Unique (one-of-a-kind) items are capped at qty 1 by callers passing
// `{ unique: true }` to addToCart; stocked items are capped at 99.

import { persistentAtom } from '@nanostores/persistent';
import { computed } from 'nanostores';

/** slug -> quantity */
export type CartItems = Record<string, number>;

const MAX_QTY = 99;
const UNIQUE_MAX_QTY = 1;

export const cartItems = persistentAtom<CartItems>(
  'jp2fr:cart',
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);

/**
 * Add one unit of `slug` to the cart. Unique (one-of-a-kind) products are
 * capped at qty 1 regardless of how many times this is called; stocked
 * products are capped at 99. No-ops (does not notify subscribers) if the
 * item is already at its cap.
 */
export function addToCart(slug: string, opts?: { unique?: boolean }): void {
  const current = cartItems.get();
  const existingQty = current[slug] ?? 0;
  const cap = opts?.unique ? UNIQUE_MAX_QTY : MAX_QTY;
  const nextQty = Math.min(existingQty + 1, cap);
  if (nextQty === existingQty) return;
  cartItems.set({ ...current, [slug]: nextQty });
}

/** Remove `slug` entirely from the cart, regardless of quantity. */
export function removeFromCart(slug: string): void {
  const current = cartItems.get();
  if (!(slug in current)) return;
  const next = { ...current };
  delete next[slug];
  cartItems.set(next);
}

/**
 * Set the exact quantity for `slug`. `qty <= 0` removes the item; `qty` is
 * capped at 99 (callers rendering a unique product should not expose a
 * stepper past 1, but this function does not know about per-product
 * uniqueness -- that check lives in the UI layer, see AddToCart.ts).
 */
export function setQty(slug: string, qty: number): void {
  const clamped = Math.min(Math.trunc(qty), MAX_QTY);
  if (clamped <= 0) {
    removeFromCart(slug);
    return;
  }
  const current = cartItems.get();
  cartItems.set({ ...current, [slug]: clamped });
}

/** Empty the cart completely (used after a successful checkout redirect). */
export function clearCart(): void {
  cartItems.set({});
}

/** Total quantity across all line items, for the header badge. */
export const cartCount = computed(cartItems, (items) =>
  Object.values(items).reduce((sum, qty) => sum + qty, 0),
);
