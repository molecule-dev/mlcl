---
name: email-verification
intent: |
  - "Verify email address"
  - "Confirm email after signup"
  - "Click the link to activate"
  - "Email verification token"
  - "Make sure the email is real"
keywords: [verify, email, confirm, activation, token, double-opt-in]
---

# Email verification (double-opt-in)

**When to copy this example:** the user wants to confirm a new
account's email is real — required for most B2B apps, anti-spam
on B2C apps. Different from `auth/email-password-login/`'s
forgot-password (which uses a similar token mechanism but for a
different purpose).

## What you'll install

```bash
cd /workspace
# Already covered by the auth + emails examples; no new packages to install.
# The sendMail core (@molecule/api-emails) arrives transitively with whatever
# emails provider those examples install (e.g. @molecule/api-emails-mailgun).
```

## Bond wiring (api/src/bonds/index.ts — call from setupBonds())

`/verify/request` calls `consume()` to throttle resends, so a rate-limit provider
must be bonded (it isn't by default) or the route throws `Rate-limit provider not
configured`:

```ts
import { setupRateLimitMemory } from '@molecule/api-bonds-default-express'

await setupRateLimitMemory() // a rate-limit provider must be bonded for consume()
```

## Files in this example

| Path                            | What it does                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/handlers/verify-email.ts`  | `POST /verify/request` issues a token and sends it via the `emails` bond. `GET /verify?token=...` validates and sets the framework's `users.emailVerified` boolean (no new column needed). |
| `app/pages/VerifyEmailPage.tsx` | Landing for the GET link; shows success or "link expired" with a Resend button.                                                                                                            |

## Anti-patterns

- Do not gate critical-path features behind verification. Lock
  destructive actions (sending invites, posting publicly) but let
  users use the basic app — high-friction verification kills
  signup conversion.
- Do not invent `@molecule/api-email-verify`. Composition is a
  `tokens` table + the `emails` bond + a handler.
- Do not let unverified accounts accumulate forever. After 7 days,
  prompt them on every page load; after 30, soft-delete.
- Do not store the token plaintext in the database. Hash it
  (SHA-256 is fine for short-lived tokens) so a leaked DB doesn't
  let attackers verify any address.
- Do not skip rate-limiting `/verify/request`. Otherwise it's a
  free email-bombing tool.

## Verify

User signs up → receives email with link → clicks → page says
"Email verified" → `users.emailVerified` is now `true` (the same flag
login/UI already read). User clicks
the same link 24h later → page says "Link expired" with a
Resend button.
