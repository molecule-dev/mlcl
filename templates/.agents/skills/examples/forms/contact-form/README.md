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
npx mlcl add @molecule/api-emails-mailgun --inject
npx mlcl add @molecule/api-rate-limit-memory --inject
```

Run these from the project root to wire missing providers in `api/src/bonds/`.
Use the email and rate-limit bonds already wired in your app if available. The
handler sends through `sendMail()` from `@molecule/api-emails` and throttles
submissions through `consume()` from `@molecule/api-rate-limit`.

## Files in this example

| Path                          | What it does                                                    |
| ----------------------------- | --------------------------------------------------------------- |
| `api/bonds/emails-mailgun.ts` | Mailgun wiring reference for an API that manages bonds by hand. |
| `api/handlers/contact.ts`     | `POST /contact` validates with zod, rate-limits, sends email.   |
| `app/pages/ContactPage.tsx`   | The form itself with name/email/message + success/error UI.     |

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
