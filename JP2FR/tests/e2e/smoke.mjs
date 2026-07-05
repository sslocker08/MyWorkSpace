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

// 3. motion init loaded, ScrollTrigger pins exist
await page.waitForTimeout(800);
const pinCount = await page.locator('.pin-spacer').count();
check('ScrollTrigger pins active (wave-seq + rail)', pinCount >= 1, `pin-spacers=${pinCount}`);

// 4. hreflang cluster
const hreflangs = await page.locator('link[rel="alternate"][hreflang]').count();
check('hreflang links = 4 (fr/en/ja/x-default)', hreflangs === 4, `found=${hreflangs}`);

// 5. founders → detail
await page.goto(`${BASE}/fr/founders/`, { waitUntil: 'load' });
const founderCards = await page.locator('a[href*="/founders/"]').count();
check('founders index lists cards', founderCards >= 15, `links=${founderCards}`);
const firstFounder = await page
  .locator('a[href*="/founders/"]:not([href$="/founders/"])')
  .first()
  .getAttribute('href');
await page.goto(`${BASE}${firstFounder}`, { waitUntil: 'load' });
const founderOk = await page.locator('h1').first().isVisible().catch(() => false);
check('founder detail renders', founderOk, firstFounder ?? '');

// 6. product detail + add to cart
await page.goto(`${BASE}/fr/products/`, { waitUntil: 'load' });
const firstProduct = await page.locator('a[href*="/products/"]:not([href$="/products/"])').first().getAttribute('href');
await page.goto(`${BASE}${firstProduct}`, { waitUntil: 'load' });
const atc = page.locator('[data-add-to-cart]');
check('product detail has AddToCart button', (await atc.count()) === 1, firstProduct ?? '');
const priceVisible = await page.locator('.product-price').first().textContent();
check('price shows € (fr format)', /€/.test(priceVisible ?? ''), (priceVisible ?? '').trim());
await atc.click();
await page.waitForTimeout(600);
const cartRaw = await page.evaluate(() => localStorage.getItem('jp2fr:cart'));
check('add-to-cart persists to localStorage', !!cartRaw && cartRaw !== '{}', cartRaw ?? 'null');

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
