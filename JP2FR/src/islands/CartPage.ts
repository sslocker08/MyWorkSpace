// critique: P4 H4 E3 S4 R3 V3
//
// Renders live cart contents into the /cart page and drives checkout.
//
// DOM contract this module expects the page (built separately) to provide,
// all inside a single `[data-cart-root]` container:
//   [data-cart-root]      root container; also carries the current-locale
//                         hint via `data-locale="fr|en|ja"` (falls back to
//                         `<html lang>`, then "fr", if absent)
//   #cart-catalog          <script type="application/json"> containing
//                         `Record<slug, { name, priceCents, image, unique,
//                         soldOut, founderName }>` for every published
//                         product, pre-localized to the current locale
//   [data-cart-rows]       empty container this module fills with one
//                         `.cart-row` element per cart line (see below for
//                         the emitted class contract)
//   [data-cart-empty]      pre-rendered empty-cart block; this module only
//                         toggles its `hidden` attribute, it does not fill
//                         in any text (that content is static/server-render)
//   [data-cart-subtotal]   element this module sets textContent on (the
//                         formatted subtotal)
//   [data-checkout]        the checkout <button>; enabled/disabled and its
//                         label are managed here
//   [data-cart-error]      element this module shows/hides + fills with an
//                         error message when checkout fails
//
// Emitted row markup (for the CSS-owning agent to style in global.css):
//   .cart-row, .cart-row__image, .cart-row__info, .cart-row__name,
//   .cart-row__founder, .cart-row__unit-price, .cart-row__qty,
//   .cart-row__qty-fixed (unique items), .cart-row__qty-btn[data-action],
//   .cart-row__qty-input, .cart-row__line-total, .cart-row__remove,
//   .cart-row__soldout-badge, and a `.is-soldout` modifier on the row.
//
// Prices are formatted with Intl.NumberFormat directly (not lib/format.ts)
// to avoid pulling a shared module into this vanilla-JS island; currency is
// assumed EUR site-wide (matches content schema + FR-only shipping -- see
// docs/LEGAL-OPEN-QUESTIONS.md if that assumption ever needs to change).

import { cartItems, removeFromCart, setQty } from '../lib/cart';
import { useT } from '../lib/i18n';
import type { Locale } from '../lib/i18n';

interface CatalogEntry {
  name: string;
  priceCents: number;
  image: string;
  unique: boolean;
  soldOut: boolean;
  founderName: string;
}

type Catalog = Record<string, CatalogEntry>;

type Translate = ReturnType<typeof useT>;

const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'en', 'ja'];
const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-IE',
  ja: 'ja-JP',
};
const TRANSIENT_MS = 1500;

declare global {
  interface Window {
    __jp2frCartPageBound?: boolean;
  }
}

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function resolveLocale(root: HTMLElement): Locale {
  const fromRoot = root.dataset.locale;
  if (isLocale(fromRoot)) return fromRoot;
  const fromHtml = document.documentElement.lang;
  if (isLocale(fromHtml)) return fromHtml;
  return 'fr';
}

function formatPriceCents(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function readCatalog(): Catalog {
  const el = document.getElementById('cart-catalog');
  if (!el || !el.textContent) return {};
  try {
    return JSON.parse(el.textContent) as Catalog;
  } catch (err) {
    console.error('[CartPage] failed to parse cart-catalog JSON', err);
    return {};
  }
}

function queryEl(root: ParentNode, selector: string): HTMLElement | null {
  const el = root.querySelector(selector);
  return el instanceof HTMLElement ? el : null;
}

function queryButton(root: ParentNode, selector: string): HTMLButtonElement | null {
  const el = root.querySelector(selector);
  return el instanceof HTMLButtonElement ? el : null;
}

function buildRow(slug: string, qty: number, entry: CatalogEntry, locale: Locale, t: Translate): HTMLElement {
  const row = document.createElement('div');
  row.className = entry.soldOut ? 'cart-row is-soldout' : 'cart-row';
  row.dataset.slug = slug;

  const img = document.createElement('img');
  img.className = 'cart-row__image';
  img.src = entry.image;
  img.alt = entry.name;
  img.width = 96;
  img.height = 96;
  img.loading = 'lazy';
  row.appendChild(img);

  const info = document.createElement('div');
  info.className = 'cart-row__info';

  const name = document.createElement('p');
  name.className = 'cart-row__name';
  name.textContent = entry.name;
  info.appendChild(name);

  const founder = document.createElement('p');
  founder.className = 'cart-row__founder';
  founder.textContent = entry.founderName;
  info.appendChild(founder);

  const unitPrice = document.createElement('p');
  unitPrice.className = 'cart-row__unit-price';
  unitPrice.textContent = formatPriceCents(entry.priceCents, locale);
  info.appendChild(unitPrice);

  if (entry.soldOut) {
    const badge = document.createElement('span');
    badge.className = 'cart-row__soldout-badge';
    badge.textContent = t('products.soldOut');
    info.appendChild(badge);
  }

  row.appendChild(info);

  const qtyWrap = document.createElement('div');
  qtyWrap.className = 'cart-row__qty';

  if (entry.unique) {
    const fixed = document.createElement('span');
    fixed.className = 'cart-row__qty-fixed';
    fixed.textContent = t('products.unique');
    qtyWrap.appendChild(fixed);
  } else {
    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'cart-row__qty-btn';
    decBtn.dataset.action = 'decrement';
    decBtn.textContent = '−';
    decBtn.setAttribute('aria-label', t('cart.quantity'));
    decBtn.addEventListener('click', () => setQty(slug, qty - 1));

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'cart-row__qty-input';
    input.min = '1';
    input.max = '99';
    input.step = '1';
    input.value = String(qty);
    input.setAttribute('aria-label', t('cart.quantity'));
    input.addEventListener('change', () => {
      const next = Number.parseInt(input.value, 10);
      setQty(slug, Number.isFinite(next) ? next : qty);
    });

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'cart-row__qty-btn';
    incBtn.dataset.action = 'increment';
    incBtn.textContent = '+';
    incBtn.setAttribute('aria-label', t('cart.quantity'));
    incBtn.addEventListener('click', () => setQty(slug, qty + 1));

    qtyWrap.append(decBtn, input, incBtn);
  }

  row.appendChild(qtyWrap);

  const lineTotal = document.createElement('p');
  lineTotal.className = 'cart-row__line-total';
  lineTotal.textContent = formatPriceCents(entry.priceCents * qty, locale);
  row.appendChild(lineTotal);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'cart-row__remove';
  removeBtn.textContent = t('cart.remove');
  removeBtn.setAttribute('aria-label', `${t('cart.remove')} — ${entry.name}`);
  removeBtn.addEventListener('click', () => removeFromCart(slug));
  row.appendChild(removeBtn);

  return row;
}

async function handleCheckout(
  checkoutBtn: HTMLButtonElement,
  locale: Locale,
  t: Translate,
  errorBox: HTMLElement | null,
): Promise<void> {
  const items = Object.entries(cartItems.get())
    .filter(([, qty]) => qty > 0)
    .map(([slug, qty]) => ({ slug, qty }));

  if (items.length === 0) return;

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  const defaultLabel = checkoutBtn.textContent?.trim() ?? t('cart.checkout');
  checkoutBtn.classList.remove('is-error');
  checkoutBtn.classList.add('is-loading');
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = t('cart.processing');

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, locale }),
    });

    const data = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !data.url) {
      throw new Error(data.error ?? 'checkout_failed');
    }

    window.location.href = data.url;
  } catch (err) {
    console.error('[CartPage] checkout request failed', err);
    checkoutBtn.classList.remove('is-loading');
    checkoutBtn.classList.add('is-error');
    checkoutBtn.textContent = defaultLabel;
    checkoutBtn.disabled = false;

    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = t('cart.error');
    }

    window.setTimeout(() => checkoutBtn.classList.remove('is-error'), TRANSIENT_MS);
  }
}

function init(): void {
  if (window.__jp2frCartPageBound) return;

  const root = document.querySelector('[data-cart-root]');
  if (!(root instanceof HTMLElement)) return;

  window.__jp2frCartPageBound = true;

  const locale = resolveLocale(root);
  const t = useT(locale);
  const catalog = readCatalog();

  const rowsContainer = queryEl(root, '[data-cart-rows]');
  const emptyBlock = queryEl(root, '[data-cart-empty]');
  const subtotalEl = queryEl(root, '[data-cart-subtotal]');
  const errorBox = queryEl(root, '[data-cart-error]');
  const checkoutBtn = queryButton(root, '[data-checkout]');

  function render(): void {
    const items = cartItems.get();
    const slugs = Object.keys(items);

    // Self-heal: a long-lived localStorage cart may reference a slug that
    // no longer exists / was unpublished since the last visit. Drop it
    // rather than crash or show a broken row.
    const staleSlugs = slugs.filter((slug) => !catalog[slug]);
    if (staleSlugs.length > 0) {
      staleSlugs.forEach((slug) => removeFromCart(slug));
      return; // removeFromCart -> cartItems.subscribe -> render() again
    }

    if (rowsContainer) rowsContainer.replaceChildren();

    let subtotalCents = 0;
    let hasSoldOut = false;

    for (const slug of slugs) {
      const qty = items[slug] ?? 0;
      const entry = catalog[slug];
      if (!entry || qty <= 0) continue;

      subtotalCents += entry.priceCents * qty;
      if (entry.soldOut) hasSoldOut = true;
      if (rowsContainer) rowsContainer.appendChild(buildRow(slug, qty, entry, locale, t));
    }

    const isEmpty = slugs.length === 0;
    if (emptyBlock) emptyBlock.hidden = !isEmpty;
    if (rowsContainer) rowsContainer.hidden = isEmpty;
    if (subtotalEl) subtotalEl.textContent = formatPriceCents(subtotalCents, locale);
    if (checkoutBtn) checkoutBtn.disabled = isEmpty || hasSoldOut;
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      void handleCheckout(checkoutBtn, locale, t, errorBox);
    });
  }

  render();
  cartItems.subscribe(() => render());
}

init();
