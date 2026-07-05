// critique: P4 H4 E4 S4 R4 V3
//
// POST /api/checkout
// Body: { items: Array<{ slug: string; qty: number }>, locale: 'fr'|'en'|'ja' }
// -> 200 { url: string } | 4xx/5xx { error: string }
//
// Validates the cart against server-side product data (never trusts client
// prices), then creates a Stripe Checkout Session. MVP note: every product's
// `stripe.priceId` in content is the placeholder "price_PLACEHOLDER" until
// real Stripe Prices are created, so we fall back to inline `price_data`
// built from the product's own `price.amount`/`price.currency` + localized
// name. Once real price IDs are wired up, this route picks them up
// automatically (see the `priceId` branch below) with no other changes.
//
// prerendered: false because this needs to run per-request (reads the
// request body, talks to Stripe). See astro.config.mjs: adapter stays
// Cloudflare so this + the webhook route can opt into SSR while the rest of
// the site is static.

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import Stripe from 'stripe';

export const prerender = false;

const SUPPORTED_LOCALES = ['fr', 'en', 'ja'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

interface CheckoutItemInput {
  slug: string;
  qty: number;
}

interface CheckoutRequestBody {
  items: CheckoutItemInput[];
  locale: SupportedLocale;
}

function isCheckoutItemInput(value: unknown): value is CheckoutItemInput {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === 'string' &&
    item.slug.length > 0 &&
    typeof item.qty === 'number' &&
    Number.isInteger(item.qty) &&
    item.qty >= 1 &&
    item.qty <= 99
  );
}

function parseRequestBody(value: unknown): CheckoutRequestBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  if (!isSupportedLocale(body.locale)) return null;
  if (!Array.isArray(body.items)) return null;
  if (body.items.length < 1 || body.items.length > 50) return null;
  if (!body.items.every(isCheckoutItemInput)) return null;
  return { items: body.items as CheckoutItemInput[], locale: body.locale };
}

/**
 * Minimal shape this route relies on from the `products` content collection.
 * Defined locally (rather than importing whatever zod schema the content
 * config ends up with) so this file doesn't hard-depend on the exact
 * collection schema shape being finalized by the time this is type-checked;
 * the real JSON content already matches this shape (see src/content/products/*.json).
 */
interface ProductRecord {
  slug: string;
  founder: string;
  published?: boolean;
  name: Record<SupportedLocale, string>;
  price: { amount: number; currency: string };
  stripe: { productId: string; priceId: string };
  images: string[];
  stock: { kind: 'unique' | 'stocked'; soldOut: boolean };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * `App.Locals` has no ambient `runtime` shape yet (no env.d.ts declaring the
 * @astrojs/cloudflare Runtime<Env> augmentation exists in this repo at the
 * time this file was written). Narrow-cast through `unknown` rather than
 * widen the shared `Locals` interface from this file -- if/when env.d.ts
 * adds the proper augmentation, this still works unchanged.
 */
function readRuntimeEnv(locals: unknown): Record<string, string | undefined> | undefined {
  const withRuntime = locals as { runtime?: { env?: Record<string, string | undefined> } };
  return withRuntime.runtime?.env;
}

function resolveStripeSecretKey(locals: unknown): string | undefined {
  const fromRuntime = readRuntimeEnv(locals)?.STRIPE_SECRET_KEY;
  if (fromRuntime) return fromRuntime;
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>).STRIPE_SECRET_KEY;
  return fromImportMeta || undefined;
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const body = parseRequestBody(payload);
  if (!body) {
    return jsonResponse(400, { error: 'invalid_request' });
  }

  // MVP allows a missing key (payments not configured yet in this environment).
  const secretKey = resolveStripeSecretKey(locals);
  if (!secretKey) {
    return jsonResponse(503, { error: 'payments_not_configured' });
  }

  try {
    const products = await getCollection('products');
    const bySlug = new Map<string, ProductRecord>();
    for (const entry of products) {
      const data = entry.data as unknown as ProductRecord;
      bySlug.set(data.slug, data);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of body.items) {
      const product = bySlug.get(item.slug);

      if (!product || product.published === false) {
        return jsonResponse(400, { error: 'unknown_product', slug: item.slug });
      }
      if (product.stock.soldOut) {
        return jsonResponse(400, { error: 'sold_out', slug: item.slug });
      }
      if (product.stock.kind === 'unique' && item.qty > 1) {
        return jsonResponse(400, { error: 'invalid_quantity', slug: item.slug });
      }

      const priceId = product.stripe.priceId;
      if (priceId.startsWith('price_') && priceId !== 'price_PLACEHOLDER') {
        lineItems.push({ price: priceId, quantity: item.qty });
      } else {
        lineItems.push({
          quantity: item.qty,
          price_data: {
            currency: product.price.currency.toLowerCase(),
            unit_amount: product.price.amount,
            product_data: { name: product.name[body.locale] },
          },
        });
      }
    }

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2025-02-24.acacia',
    });

    const clientReferenceId = crypto.randomUUID();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        success_url: `${url.origin}/${body.locale}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${url.origin}/${body.locale}/checkout/cancel/`,
        client_reference_id: clientReferenceId,
        expires_at: nowSeconds + 30 * 60,
        locale: body.locale,
        // TODO enable after VAT/IOSS registration decision (see docs/LEGAL-OPEN-QUESTIONS.md)
        automatic_tax: { enabled: false },
        shipping_address_collection: { allowed_countries: ['FR'] },
      },
      { idempotencyKey: clientReferenceId },
    );

    if (!session.url) {
      return jsonResponse(500, { error: 'session_missing_url' });
    }

    return jsonResponse(200, { url: session.url });
  } catch (err) {
    console.error('[api/checkout] failed to create checkout session', err);
    return jsonResponse(500, { error: 'checkout_failed' });
  }
};
