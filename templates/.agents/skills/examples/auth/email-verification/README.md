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

Start with the user and email wiring from `auth/email-password-login`. From the
project root, add the providers your app still needs.

```bash
npx mlcl add @molecule/api-rate-limit-memory --inject
npx mlcl add @molecule/app-routing-react-router --inject
```

mlcl wires the rate-limit provider in `api/src/bonds/`. The handler throttles
resends with `consume()` from `@molecule/api-rate-limit` and sends the link with
`sendMail()` from `@molecule/api-emails`. Reuse those bonds if your flagship
already configures them.

## Wiring

Mount the example router at `/verify` under `/api` after session middleware.
Serve `VerifyEmailPage` at `/verify` on the frontend and set `SITE_ORIGIN` to
that frontend's public origin. Set `EMAIL_FROM` to a verified sender for the
email provider. The resend route uses the signed-in user's account.

Add this migration for PostgreSQL or SQLite.

```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
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

A signed-in user requests a link and opens it. The page shows success, the
handler sets `users.emailVerified` to `true`, and a second visit normally sees
an invalid link because the token was removed. Opening an unused link after
24 hours shows the expired state.
