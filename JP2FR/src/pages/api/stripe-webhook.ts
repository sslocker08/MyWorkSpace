// critique: P4 H4 E4 S4 R4 V3
//
// POST /api/stripe-webhook
// Verifies the `stripe-signature` header against the raw request body using
// the SubtleCrypto-based verifier (required -- Cloudflare Workers has no
// Node `crypto` module), dedupes by event id, and logs a structured summary
// on `checkout.session.completed`.
//
// Signature verification is a local HMAC check, so no Stripe API key /
// client instantiation is needed here -- only STRIPE_WEBHOOK_SECRET.

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const DEDUP_TTL_SECONDS = 60 * 60 * 24; // 24h

/** Minimal KV subset this route needs (get/put). Avoids depending on the
 * ambient Cloudflare `KVNamespace` global type being available. */
interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface WorkerEnv {
  STRIPE_WEBHOOK_SECRET?: string;
  ORDERS_KV?: KVLike;
}

/** See checkout.ts for why this narrow-casts through `unknown` instead of
 * widening `App.Locals`. */
function readRuntimeEnv(locals: unknown): WorkerEnv | undefined {
  const withRuntime = locals as { runtime?: { env?: WorkerEnv } };
  return withRuntime.runtime?.env;
}

function resolveWebhookSecret(locals: unknown): string | undefined {
  const fromRuntime = readRuntimeEnv(locals)?.STRIPE_WEBHOOK_SECRET;
  if (fromRuntime) return fromRuntime;
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>).STRIPE_WEBHOOK_SECRET;
  return fromImportMeta || undefined;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dedupKey(eventId: string): string {
  return `stripe-event:${eventId}`;
}

// Fallback dedup store when no ORDERS_KV binding is configured (local dev,
// or before it's wired up in wrangler.toml). Per-isolate memory only -- NOT
// durable across requests/restarts in production; configure ORDERS_KV for
// real dedup guarantees.
const processedEventIdsFallback = new Set<string>();

async function isDuplicateEvent(eventId: string, kv: KVLike | undefined): Promise<boolean> {
  if (kv) {
    const existing = await kv.get(dedupKey(eventId));
    return existing !== null;
  }
  return processedEventIdsFallback.has(eventId);
}

async function markEventProcessed(eventId: string, kv: KVLike | undefined): Promise<void> {
  if (kv) {
    await kv.put(dedupKey(eventId), '1', { expirationTtl: DEDUP_TTL_SECONDS });
    return;
  }
  processedEventIdsFallback.add(eventId);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const webhookSecret = resolveWebhookSecret(locals);
  if (!webhookSecret) {
    return jsonResponse(503, { error: 'webhook_not_configured' });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return jsonResponse(400, { error: 'missing_signature' });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await Stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error('[api/stripe-webhook] signature verification failed', err);
    return jsonResponse(400, { error: 'invalid_signature' });
  }

  const kv = readRuntimeEnv(locals)?.ORDERS_KV;

  if (await isDuplicateEvent(event.id, kv)) {
    return jsonResponse(200, { received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    // `event.data.object` is typed as an empty interface upstream (Stripe's
    // generated types don't discriminate `Event` by `type`); narrow-cast to
    // the concrete resource for this event type.
    const session = event.data.object as Stripe.Checkout.Session;
    console.log(
      JSON.stringify({
        event: 'checkout.session.completed',
        sessionId: session.id,
        clientReferenceId: session.client_reference_id,
        amountTotal: session.amount_total,
        currency: session.currency,
      }),
    );
    // TODO (post-MVP): mark unique items soldOut in content/CMS + notify founders.
  }

  await markEventProcessed(event.id, kv);

  return jsonResponse(200, { received: true });
};
