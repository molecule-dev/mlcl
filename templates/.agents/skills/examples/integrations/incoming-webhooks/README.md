---
name: incoming-webhooks
intent: |
  - "Receive webhooks from Stripe / GitHub / Slack / etc"
  - "Integrate with third-party services"
  - "Listen for events from another app"
  - "Webhook endpoint"
keywords: [webhook, integration, stripe, github, callback, event]
---

# Incoming webhooks (verify signature → process → respond fast)

**When to copy this example:** the user wants to receive webhooks
from any third-party service. The `commerce/stripe-checkout/`
example has Stripe-specific webhooks; this one is generic.

## What you'll install

Nothing extra — webhook handlers are normal Express handlers + raw
body parsing + signature verification using the third-party's
recipe.

## Files in this example

| Path                              | What it does                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `api/handlers/webhooks/github.ts` | `POST /webhooks/github` — verifies HMAC-SHA256 signature, dispatches by event type, responds 200 within 1s. |
| `api/lib/webhook-verify.ts`       | Constant-time signature comparison helpers.                                                                 |

## Anti-patterns

- Do not trust the request body without verifying the signature.
  Anyone can POST to your endpoint.
- Do not use the JSON-parsed body for signature verification —
  most providers sign the raw bytes. Use Express
  `express.raw({ type: '*/*' })` for this route only.
- Do not do slow work synchronously in the webhook handler. The
  provider expects 200 within seconds — queue the work via
  `jobs/scheduled-tasks/`-style background job.
- Do not invent `@molecule/api-webhooks`. Webhooks are a normal
  handler with provider-specific signature logic.
- Do not skip idempotency. Most providers retry on non-2xx.
  Use the event ID to dedupe.

## Verify

GitHub webhook hits the endpoint → signature verified → event
processed → 200 returned in <1s → side effect visible (issue
synced, etc.).
