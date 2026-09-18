---
name: stripe-checkout
intent: |
  - "Accept credit cards / let people pay"
  - "Stripe checkout"
  - "Subscription billing"
  - "One-time payment for a digital product"
  - "Take payments online"
  - "Charge customers for X"
keywords: [stripe, checkout, payments, subscription, billing, charge, pay]
---

# Stripe checkout (one-time + subscriptions)

**When to copy this example:** the user wants to accept money. Stripe
covers one-time payments AND recurring subscriptions through the same
package — choose between them at the API level by which Stripe API call
you make (`paymentIntents` vs `subscriptions`).

## What you'll install

```bash
cd /workspace
npm install @molecule/api-payments-stripe --workspace=api
npm install @molecule/api-middleware-validation --workspace=api   # validateBody() in the handler
```

(Frontend uses `@stripe/stripe-js` from npm directly — there's no
@molecule/* wrapper for the Stripe.js library since it's a thin SDK.)

## Files in this example

| Path                           | What it does                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `api/bonds/payments-stripe.ts` | Backend bond — wires Stripe into the `payments` registry under name `'stripe'`.                                                      |
| `api/handlers/checkout.ts`     | `POST /checkout/session` creates a Stripe Checkout session and returns its URL. The frontend redirects to it.                        |
| `api/handlers/webhooks.ts`     | `POST /webhooks/stripe` receives Stripe events (payment succeeded, subscription updated). HMAC-verifies via Stripe's signing secret. |

## Required env vars

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...   # exposed to frontend
```

Plus per-product price IDs (e.g. `STRIPE_PRO_PRICE_ID=price_...`) you create
in the Stripe dashboard.

## How to adapt

1. Copy all three files. `checkout.ts` / `webhooks.ts` call the stripe
   package's DIRECT exports — `createCheckoutSession(...)` and
   `verifyWebhookSignature(...)`, imported straight from
   `@molecule/api-payments-stripe`. There is NO `createSession` bond method:
   `bond('payments', 'stripe', paymentProvider)` (in `payments-stripe.ts`)
   registers the provider for the platform's payment-VERIFY flow
   (`get('payments', 'stripe')` → `verifySubscription`, to confirm a
   subscription server-side) — keep the name `'stripe'` so that resolves.
2. Wire `setupPaymentsStripe()` from `api/src/bonds/index.ts`.
3. From your frontend, POST `/checkout/session` with the price ID, then
   `window.location = response.url`.
4. Webhook URL goes in the Stripe dashboard. For local dev use `stripe listen`.

## Anti-patterns (do NOT do these)

- Do not handle credit card numbers in your own code. Always redirect
  to Stripe Checkout. PCI compliance is theirs, not yours.
- Do not skip webhook signature verification. Spoofed webhooks can
  mark unpaid orders as paid.
- Do not assume a webhook fires exactly once. Stripe delivers events
  **at-least-once** — it retries on any non-2xx and can re-send. The
  fulfillment shown, `updateById('orders', id, { status: 'paid' })`, is
  safe on re-delivery because setting a field to a fixed value is
  idempotent. If you adapt it to a NON-idempotent action (credit a balance
  `+= amount`, ship an order, grant access, send a receipt email), a
  re-delivered event DOUBLE-fulfills — first dedupe on `event.id` (persist
  processed ids, skip if already seen) or keep the action idempotent.
- Do not read `STRIPE_SECRET_KEY` directly — go through
  `@molecule/api-config` so it's normalized across environments.
- Do not invent `@molecule/api-stripe`, `@molecule/api-checkout`, or
  any other made-up package — only `@molecule/api-payments-stripe` is real.

## Verify it works

```bash
cd /workspace && npm run build
# Test card: 4242 4242 4242 4242, any future date, any CVC.
# Webhook event arrives → DB row marked paid.
```
