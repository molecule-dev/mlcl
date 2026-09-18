---
name: contact-form
intent: |
  - "A contact form"
  - "Let people email me"
  - "A get-in-touch page"
  - "A support form"
  - "A simple form on the home page"
keywords: [contact, form, email, inquiry, message, support]
---

# Contact form (validates → emails the owner)

**When to copy this example:** the user wants any
"send-us-a-message" form whose result is an email to a known address.
Not for arbitrary form-builder UIs — that's a different ask.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-emails-mailgun --workspace=api  # or -sendgrid / -ses / -sendmail
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api  # block spam
```

## Bond wiring (api/src/bonds/index.ts — call from setupBonds())

The handler calls `consume()` to throttle submissions, but no rate-limit provider is
bonded by default — wire one or the route throws `Rate-limit provider not configured`:

```ts
import { setupRateLimitMemory } from '@molecule/api-bonds-default-express'

await setupRateLimitMemory() // a rate-limit provider must be bonded for consume()
```

## Files in this example

| Path                          | What it does                                                      |
| ----------------------------- | ----------------------------------------------------------------- |
| `api/bonds/emails-mailgun.ts` | Wires email send. Swap to any other provider with the same shape. |
| `api/handlers/contact.ts`     | `POST /contact` validates with zod, rate-limits, sends email.     |
| `app/pages/ContactPage.tsx`   | The form itself with name/email/message + success/error UI.       |

## Required env

```
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
CONTACT_TO=hello@your-domain.com
```

## Anti-patterns

- Do not POST without rate-limiting. Spammers WILL find this endpoint.
- Do not send the user's input straight into the email subject line —
  inject only into the body, escape HTML if rendering as HTML.
- Do not invent `@molecule/api-contact-form` — there is no such
  package. The composition is `api-emails-*` + a normal handler.
- Do not skip server-side validation; client-side `<input required>`
  can be bypassed.

## Verify

Submit the form → email lands at `CONTACT_TO`. Submit it 20× in
30 seconds → rate-limit returns 429.
