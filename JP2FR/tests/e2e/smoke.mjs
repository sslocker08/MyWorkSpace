// E2E smoke: LP → founders → product → add-to-cart → cart → checkout(503 expected in MVP)
// Run: node tests/e2e/smoke.mjs  (preview server must be running on :4321)
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const results = [];
const consoleErrors = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// Pre-installed browser (PLAYWRIGHT_BROWSERS_PATH env); pinned executablePath
// because the npm playwright version may expect a different browser build.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

// 1. LP loads, hero h1 visible immediately (LCP rule)
await page.goto(`${BASE}/fr/`, { waitUntil: 'domcontentloaded' });
const h1 = page.locator('[data-hero] h1');
check('LP /fr/ loads with hero h1 present', (await h1.count()) === 1);
const op = await h1.evaluate((el) => getComputedStyle(el).opacity);
check('hero h1 opacity=1 before JS motion (LCP rule)', op === '1', `opacity=${op}`);

// 2. intro overlay appears on first visit, skip works
await page.waitForLoadState('load');
await page.waitForTimeout(1200);
const intro = page.locator('[data-intro]');
const introShown = (await intro.count()) === 1 && (await intro.isVisible().catch(() => false));
check('intro overlay shows on first visit', introShown);
if (introShown) {
  await page.locator('[data-intro-skip]').click();
  await page.waitForTimeout(900);
  check('intro skip removes overlay', (await intro.count()) === 0 || !(await intro.isVisible()));
}

// 3. motion init loaded. Default headless chromium reports
// hardwareConcurrency=4, which trips isLowEndDevice() (<=4) — so the emaki
// pan runs in its static (unpinned) fallback here, same as it always did.
// This is fine: below is just the DOM-presence check; the actual pin count
// is asserted under the 10-core spoof in 3c, where the only pin left in the
// v2 markup (the founders rail pin is gone — carousel is a plain
// scroll-snap track, never pinned) is the emaki one.
await page.waitForTimeout(800);

// 3b. emaki track exists (the concept-section handscroll pan)
const emakiTrack = page.locator('[data-emaki-track]');
check('emaki track exists', (await emakiTrack.count()) === 1);

// 3c. emaki pan on capable hardware: spoof hardwareConcurrency=10 (so
// isLowEndDevice() reads false) in a fresh context, assert exactly the
// emaki pin is active (pins-spacer count === 1 — the old founders-rail pin
// no longer exists in the v2 markup), then scroll through the pinned
// concept section at 3 depths and assert the track's computed translateX
// differs at each — proof the scrub tween is actually live (replaces the
// old wave-canvas frame-hash check).
const emakiPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await emakiPage.addInitScript(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 10 });
});
await emakiPage.goto(`${BASE}/fr/`, { waitUntil: 'load' });
await emakiPage.waitForTimeout(1200);
const emakiIntro = emakiPage.locator('[data-intro]');
if ((await emakiIntro.count()) === 1 && (await emakiIntro.isVisible().catch(() => false))) {
  await emakiPage.locator('[data-intro-skip]').click().catch(() => {});
  await emakiPage.waitForTimeout(900);
}
const emakiPinCount = await emakiPage.locator('.pin-spacer').count();
check(
  'ScrollTrigger pins: exactly the emaki pin remains (10-core spoof, founders rail pin removed in v2)',
  emakiPinCount === 1,
  `pin-spacers=${emakiPinCount}`,
);
const readTrackX = async () =>
  emakiPage.locator('[data-emaki-track]').evaluate((el) => {
    const m = getComputedStyle(el).transform;
    if (m === 'none') return 0;
    const parts = /matrix\(([^)]+)\)/.exec(m)?.[1]?.split(',').map(Number);
    return parts?.[4] ?? 0;
  });
const sectionTop = await emakiPage
  .locator('[data-concept]')
  .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
await emakiPage.evaluate((y) => window.scrollTo(0, y), sectionTop);
await emakiPage.waitForTimeout(500);
const xAtStart = await readTrackX();
await emakiPage.evaluate((y) => window.scrollTo(0, y), sectionTop + 900);
await emakiPage.waitForTimeout(500);
const xAt900 = await readTrackX();
await emakiPage.evaluate((y) => window.scrollTo(0, y), sectionTop + 1800);
await emakiPage.waitForTimeout(500);
const xAt1800 = await readTrackX();
check(
  'emaki pan: track translateX differs across 3 scroll depths (10-core spoof)',
  xAtStart !== xAt900 && xAt900 !== xAt1800 && xAtStart !== xAt1800,
  `x0=${xAtStart} x900=${xAt900} x1800=${xAt1800}`,
);
await emakiPage.close();

// 4. hreflang cluster
const hreflangs = await page.locator('link[rel="alternate"][hreflang]').count();
check('hreflang links = 4 (fr/en/ja/x-default)', hreflangs === 4, `found=${hreflangs}`);

// 4b. LP category cards (ProductsSection.astro) link with ?cat= so the
// founders/products filter island (FilterChips.ts) preselects a chip on
// arrival.
const catLinks = await page.locator('a[href*="?cat="]').count();
check('LP category card links contain ?cat=', catLinks > 0, `links=${catLinks}`);

// 4c. founders carousel (FoundersSection.astro + islands/Carousel.ts):
// clicking the next arrow scrolls the track (scrollLeft increases). Still
// on the LP page, which has 15 founders — comfortably wider than the
// 1280px viewport, so the track always overflows and the arrow is enabled.
const carouselTrack = page.locator('[data-carousel-track]');
const carouselTrackFound = (await carouselTrack.count()) === 1;
if (carouselTrackFound) {
  const scrollBefore = await carouselTrack.evaluate((el) => el.scrollLeft);
  await page.locator('[data-carousel-next]').click();
  await page.waitForTimeout(500);
  const scrollAfter = await carouselTrack.evaluate((el) => el.scrollLeft);
  check(
    'founders carousel: next arrow scrolls track',
    scrollAfter > scrollBefore,
    `before=${scrollBefore} after=${scrollAfter}`,
  );
} else {
  check('founders carousel: next arrow scrolls track', false, 'carousel track not found on LP');
}

// 5. founders index → filter chips → detail
await page.goto(`${BASE}/fr/founders/`, { waitUntil: 'load' });
const founderCards = await page.locator('a[href*="/founders/"]').count();
check('founders index lists cards', founderCards >= 15, `links=${founderCards}`);

// 5b. filter chips (islands/FilterChips.ts): clicking a craft chip narrows
// the visible card count and updates the aria-live count text.
const filterCountEl = page.locator('[data-filter-count]');
const countTextBefore = (await filterCountEl.textContent().catch(() => null))?.trim() ?? '';
const visibleBefore = await page.locator('[data-filter-grid] > :not([hidden])').count();
await page.locator('[data-filter-chip]').nth(1).click();
await page.waitForTimeout(300);
const visibleAfter = await page.locator('[data-filter-grid] > :not([hidden])').count();
const countTextAfter = (await filterCountEl.textContent().catch(() => null))?.trim() ?? '';
check(
  'founders filter chips: category chip narrows visible cards & updates count text',
  visibleAfter < visibleBefore && countTextAfter !== countTextBefore,
  `before=${visibleBefore} (${countTextBefore}) after=${visibleAfter} (${countTextAfter})`,
);
await page.locator('[data-filter-chip]').first().click(); // reset to "all" before continuing
await page.waitForTimeout(300);

const firstFounder = await page
  .locator('a[href*="/founders/"]:not([href$="/founders/"])')
  .first()
  .getAttribute('href');
await page.goto(`${BASE}${firstFounder}`, { waitUntil: 'load' });
const founderOk = await page.locator('h1').first().isVisible().catch(() => false);
check('founder detail renders', founderOk, firstFounder ?? '');

// 6. product detail: tabs + add to cart
await page.goto(`${BASE}/fr/products/`, { waitUntil: 'load' });
const firstProduct = await page.locator('a[href*="/products/"]:not([href$="/products/"])').first().getAttribute('href');
await page.goto(`${BASE}${firstProduct}`, { waitUntil: 'load' });
const atc = page.locator('[data-add-to-cart]');
check('product detail has AddToCart button', (await atc.count()) === 1, firstProduct ?? '');
const priceVisible = await page.locator('.product-price').first().textContent();
check('price shows € (fr format)', /€/.test(priceVisible ?? ''), (priceVisible ?? '').trim());

// 6b. product detail tabs (APG tabs pattern): 3 tabs, clicking the 2nd
// selects it and reveals its panel (the other two panels get `hidden`).
const tabs = page.locator('[role="tab"]');
const tabCount = await tabs.count();
check('product detail: 3 tabs present', tabCount === 3, `tabs=${tabCount}`);
await tabs.nth(1).click();
await page.waitForTimeout(200);
const secondTabSelected = await tabs.nth(1).getAttribute('aria-selected');
const secondPanelId = await tabs.nth(1).getAttribute('aria-controls');
const secondPanelVisible = secondPanelId
  ? await page.locator(`#${secondPanelId}`).isVisible().catch(() => false)
  : false;
check(
  'product detail: clicking 2nd tab selects it & reveals its panel',
  secondTabSelected === 'true' && secondPanelVisible,
  `aria-selected=${secondTabSelected} panelVisible=${secondPanelVisible}`,
);

await atc.click();
await page.waitForTimeout(600);
const cartRaw = await page.evaluate(() => localStorage.getItem('jp2fr:cart'));
check('add-to-cart persists to localStorage', !!cartRaw && cartRaw !== '{}', cartRaw ?? 'null');

// 6c. qty stepper (a stocked, non-unique product): +1 (qty=2) then
// AddToCart → cart quantity is 2. Runs in its own browser context so it
// never touches `page`'s single-item cart (check 7 below asserts exactly
// one row there). bamboo-basket is a known stocked/non-unique product
// (src/content/products/bamboo-basket.json).
const qtyPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await qtyPage.goto(`${BASE}/fr/products/bamboo-basket/`, { waitUntil: 'load' });
const qtyIncrement = qtyPage.locator('[data-qty-action="increment"]');
if ((await qtyIncrement.count()) === 1) {
  await qtyIncrement.click();
  await qtyPage.waitForTimeout(200);
  await qtyPage.locator('[data-add-to-cart]').click();
  await qtyPage.waitForTimeout(600);
  const qtyCartRaw = await qtyPage.evaluate(() => localStorage.getItem('jp2fr:cart'));
  const qtyCart = qtyCartRaw ? JSON.parse(qtyCartRaw) : {};
  check(
    'qty stepper: +1 then AddToCart → cart qty = 2',
    qtyCart['bamboo-basket'] === 2,
    JSON.stringify(qtyCart),
  );
} else {
  check('qty stepper: +1 then AddToCart → cart qty = 2', false, 'qty stepper not found on bamboo-basket');
}
await qtyPage.close();

// 7. cart page renders row + subtotal + checkout error state (Stripe unconfigured → 503)
await page.goto(`${BASE}/fr/cart/`, { waitUntil: 'load' });
await page.waitForTimeout(600);
const rows = await page.locator('.cart-row').count();
check('cart page renders 1 row from store', rows === 1, `rows=${rows}`);
const subtotal = await page.locator('[data-cart-subtotal]').textContent();
check('subtotal formatted', /€/.test(subtotal ?? ''), (subtotal ?? '').trim());
await page.locator('[data-checkout]').click();
await page.waitForTimeout(1500);
const errVisible = await page.locator('[data-cart-error]').isVisible().catch(() => false);
check('checkout without Stripe key → visible error state (expected MVP)', errVisible);

// 8. legal pages + 404 + ja/en spot check
for (const p of ['/fr/legal/cgv/', '/fr/legal/tokushoho/', '/ja/', '/en/products/']) {
  const resp = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  check(`page ${p} → 200`, resp?.status() === 200, `status=${resp?.status()}`);
}
const resp404 = await page.goto(`${BASE}/fr/nonexistent-xyz/`, { waitUntil: 'domcontentloaded' });
check('unknown path → 404 page', resp404?.status() === 404 || (await page.locator('text=404').count()) > 0, `status=${resp404?.status()}`);

// 9. reduced-motion: intro must not trap
const rmPage = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
await rmPage.goto(`${BASE}/fr/`, { waitUntil: 'load' });
await rmPage.waitForTimeout(1000);
const rmIntroVisible = await rmPage.locator('[data-intro]').isVisible().catch(() => false);
check('reduced-motion: intro not shown/stuck', !rmIntroVisible);
const rmH1 = await rmPage.locator('[data-hero] h1').evaluate((el) => getComputedStyle(el).opacity).catch(() => '0');
check('reduced-motion mobile: hero visible', rmH1 === '1');
// mobile horizontal scroll check @390px
const noHScroll = await rmPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
check('mobile 390px: no horizontal scroll', noHScroll);
await rmPage.close();

// 10. console errors (filter out expected 503 fetch noise)
// dev-toolbar audit noise ("%cAstro … audit's match function") is dev-server-only, not app code
const realErrors = consoleErrors.filter(
  (e) => !/503|payments_not_configured|Failed to load resource|%cAstro|audit's match function/.test(e),
);
check('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

// screenshots for the user
await page.goto(`${BASE}/fr/`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tests/e2e/shot-lp-hero.png' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
await page.waitForTimeout(1000);
await page.screenshot({ path: 'tests/e2e/shot-lp-concept.png' });
await page.goto(`${BASE}/fr/founders/`, { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tests/e2e/shot-founders.png' });
await page.goto(`${BASE}/fr/cart/`, { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tests/e2e/shot-cart.png' });

await browser.close();
const fails = results.filter((r) => !r.ok);
console.log(`\n=== SMOKE: ${results.length - fails.length}/${results.length} passed ===`);
process.exit(fails.length ? 1 : 0);
