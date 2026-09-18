---
name: outbound-webhooks
intent: |
  - "Send webhooks to my users' URLs"
  - "Let users subscribe to events / register a webhook endpoint"
  - "Notify external systems when something happens"
  - "Zapier-style / outgoing integrations"
  - "Deliver events to a customer-provided URL"
keywords: [webhook, outbound, outgoing, deliver, subscribe, zapier, integration, callback, ssrf]
---

# Outbound webhooks (register URL → deliver signed events → SSRF-safe)

**When to copy this example:** the user wants THEIR app to send
webhooks OUT to endpoints their customers register (the opposite of
`integrations/incoming-webhooks/`, which receives them).

**There is a real bond for this — use it, don't hand-roll.**
`@molecule/api-webhook` (core) + `@molecule/api-webhook-http`
(HTTP delivery with HMAC signing, retries, and an **SSRF-safe
`safeFetch`**) already exist. `@molecule/api-webhook-queue` adds async
delivery + backoff, `@molecule/api-webhook-capture` captures instead of
sending (tests), and `@molecule/app-webhook-inspector-react` is a
ready-made delivery-inspection UI. The polished
`mlcl/templates/apps/webhook-manager/` flagship is the full reference.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-webhook @molecule/api-webhook-http --workspace=api
```

## Files in this example

| Path                         | What it does                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/lib/deliver-webhook.ts` | Thin wrapper: HMAC-signs the body and delivers via `safeFetch` from `@molecule/api-webhook-http`. The SSRF guard is the bond's — not reimplemented here.                                                                                                                                                   |
| `api/handlers/webhooks.ts`   | `POST /webhooks` register (returns the signing secret ONCE), `GET /webhooks` list (owner-scoped, no secret), `DELETE /webhooks/:id`. Endpoints persist in a `webhook_endpoints` table (user-scoped). Exports `dispatchEvent(userId, event, data)` to fan an event out to that user's subscribed endpoints. |

## The SSRF trap (why `safeFetch` exists)

The destination URL is **user-supplied**. A naive `fetch(url)` lets a
user point a webhook at your own infrastructure:

- `http://169.254.169.254/…` — the cloud metadata endpoint → steal
  instance credentials.
- `http://127.0.0.1/…` / `localhost` — internal admin panels.
- `http://10.0.0.5/…`, `192.168.*`, `172.16-31.*` — your private network.

Blocking by **hostname** doesn't work — an attacker points `evil.com`
at `127.0.0.1`, uses **DNS rebinding** (public IP for the check,
private for the connect), a **literal-IP** host (which skips the DNS
hook entirely), or an **IPv4-mapped IPv6** literal
(`[::ffff:169.254.169.254]`, which the URL parser normalizes to a hex
form). `safeFetch` handles all of these: it validates the **resolved
IP** inside the connect-time lookup, checks literal-IP hosts up front,
and uses `redirect: 'manual'`. This is exactly why you don't write it
yourself.

## Two ways to deliver

- **This example** persists endpoints in your own table (user-scoped +
  survives restart + you own the schema/logs) and delivers with
  `safeFetch`. Best when you need a management UI + per-user scoping —
  see the `webhook-manager` flagship.
- **`@molecule/api-webhook` core** gives you higher-level
  `register()` / `dispatch(event, payload)` / `getDeliveryLog()` /
  `retry()`. Note its state is in-memory — persist registrations and
  re-`register()` at startup — and `dispatch` fires by event globally,
  so scope per-user yourself.

## Anti-patterns

- Do not `fetch(userUrl)` directly. Use `safeFetch` from
  `@molecule/api-webhook-http` — the SSRF guard is the whole point.
- Do not reimplement the IP allow/deny logic. It has sharp edges
  (literal IPs skip the DNS hook; IPv4-mapped IPv6 normalizes to hex);
  the bond already gets them right.
- Do not deliver over plain `http`. Require `https` at registration so
  events aren't sent in cleartext.
- Do not skip signing. Sign with a per-endpoint secret
  (`X-Webhook-Signature: sha256=…`) so the receiver can verify it's you.
- Do not deliver inline on the request that produced the event. A slow
  or hostile receiver stalls your handler; use `@molecule/api-webhook-queue`
  or a background job (`jobs/scheduled-tasks/`) with retries + backoff.
- Do not return the signing secret more than once — show it at
  registration (like an API key) and never again.

## Verify

User registers `https://example.com/hook` for `order.paid` → gets a
secret once → an order is paid → `dispatchEvent(userId, 'order.paid',
{...})` delivers a signed POST → receiver verifies the signature.
Registering `http://169.254.169.254/` (or any private/loopback host)
fails at delivery — `safeFetch` refuses to open the socket — and the
delivery is recorded as failed.
