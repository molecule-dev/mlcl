---
name: sms-alerts
intent: |
  - "Send SMS"
  - "Text message notifications"
  - "SMS alerts / reminders"
  - "Text the user"
  - "Twilio / Vonage SMS"
keywords: [sms, text, twilio, vonage, notification, alert, reminder, phone, message]
---

# SMS alerts (text a user via Twilio/Vonage)

**When to copy this example:** the app needs to send a text message — an alert,
reminder, confirmation, or "text me" action. For SMS-based one-time-code login,
combine this with `@molecule/api-two-factor` (the OTP round-trip) instead.

## What you'll install

```bash
cd /workspace
# SMS core interface + the Twilio provider (swap for @molecule/api-sms-vonage):
npm install @molecule/api-sms @molecule/api-sms-twilio --workspace=api
# Throttle the metered send (any bond works; memory is fine for one node):
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api
```

## Files in this example

| Path                              | What it does                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/lib/send-sms.ts`             | `sendSms(to, message)` — the single reusable send path: validates E.164, throttles per recipient, sends via the `@molecule/api-sms` bond, returns `{ ok, id?, error? }`. Call it from any feature that texts a user. |
| `api/handlers/sms.ts`             | `POST /notify-me { message }` — texts the SIGNED-IN user, resolving the number from their OWN record server-side (never the request body) so it can't be used as an open relay.                                      |
| `app/components/TextMeButton.tsx` | A "text me a test alert" button. Sends no phone number to the API — the server resolves the signed-in user's own number.                                                                                             |

## Required env

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15551234567   # a Twilio-provisioned sender number (E.164)
```

## Prerequisite: store the recipient's number

The framework `users` table has no `phone` column. Add one (E.164) and — for a
real product — a `phone_verified` flag set only after an OTP round-trip
(`@molecule/api-two-factor`), and text only verified numbers. The handler reads
`user.phone` / `user.phone_verified`.

## Bond wiring (api/bonds.ts or api/index.ts)

```typescript
import { setProvider } from '@molecule/api-sms'
import { createProvider } from '@molecule/api-sms-twilio'
import { setupRateLimitMemory } from '@molecule/api-bonds-default-express'

setProvider(createProvider()) // reads TWILIO_* env
await setupRateLimitMemory() // a rate-limit provider must be bonded for consume()
```

Mount the handler under `/api/sms` so the route is `/api/sms/notify-me`.

## Anti-patterns

- **Never send `to` from the request body.** Resolve the recipient number from
  your own server-side data (the authenticated user's stored number, a record's
  contact you authorize). A caller-supplied `to` is an open SMS relay — anyone
  can text any number on your dime (spam + cost abuse). This is the #1 SMS
  vulnerability.
- Do not call Twilio/Vonage from the browser or import the vendor SDK in a
  handler. Go through the `@molecule/api-sms` bond so the provider is swappable
  and the credentials stay server-side. The packages are `@molecule/api-sms` +
  `@molecule/api-sms-twilio` / `@molecule/api-sms-vonage` — don't invent
  `@molecule/api-twilio`.
- Numbers must be E.164 (`+<country><number>`). Validate before sending (the
  wrapper does) so a bad number fails fast, not as an opaque provider error.
- Do not leave the send unthrottled. SMS is billed per message — a loop or abuse
  runs up real money. Rate-limit per recipient (and per user for a UI trigger).
  For a hard per-plan cap, wrap the route in `enforceLimit` from
  `@molecule/api-entitlements`.
- Honor consent + opt-out. Only text users who opted in, and stop on STOP —
  sending without consent is illegal in many places (TCPA/GDPR). Never text an
  unverified number (it may belong to someone else).
- Do not assume `getStatus()` works on every provider. Twilio supports polling;
  Vonage does NOT (it throws) — Vonage reports delivery via DLR webhooks, so pass
  `options.callbackUrl` to `send()` and handle the receipt on that endpoint.
- Never put a secret or one-time code you also store in plaintext into the
  message body beyond what the user needs.

## Verify

Signed-in user with a saved, verified number clicks **Text me a test alert** →
the message reaches their phone (in the sandbox, read it with the `read_activity`
tool, filter type `sms`). A rapid burst is rate-limited. No endpoint accepts a
caller-supplied destination number.
