---
name: passwordless-magic-link
intent: |
  - "Passwordless login"
  - "Magic link login"
  - "Email me a login link"
  - "No-password sign-in"
  - "Login without remembering a password"
keywords: [passwordless, magic, link, email, otp, no-password]
---

# Passwordless / magic-link login

**When to copy this example:** the user wants login without
passwords — they enter their email, get a one-tap link, and they're
in. Less friction than email+password, no OAuth dependency.

## How it works

There is no single `@molecule/api-auth-magic-link` package. Magic-link
auth is composed from real packages:

| Role                                 | Package                                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token storage (issue + redeem)       | `@molecule/api-database`                                                                                                                                                         |
| Sending the email                    | `@molecule/api-emails` (provider: `@molecule/api-emails-mailgun`)                                                                                                                |
| Rate-limiting the request endpoint   | `@molecule/api-rate-limit`                                                                                                                                                       |
| Logging the user in after redemption | `@molecule/api-bonds-default-express` — `userAuthorization.set()` + the device bond issue the SAME session the rest of the app authenticates (do NOT hand-sign a bespoke cookie) |
| i18n                                 | `@molecule/api-i18n` (API), `@molecule/app-i18n-react-i18next` (app)                                                                                                             |

The token is a cryptographically random 32-byte hex string that is
**SHA-256 hashed before storage** — so a leaked database does not let
attackers log in by replaying token hashes. The plaintext token is
what goes in the URL.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-database --workspace=api
npm install @molecule/api-emails @molecule/api-emails-mailgun --workspace=api
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api
npm install @molecule/api-middleware-validation --workspace=api
```

The session itself is issued by the app's existing user-resource auth
(`@molecule/api-bonds-default-express` + the device bond) — already wired in any
app with login. The device id is minted through its typed accessor,
`get<DeviceService>('device')` — the `DeviceService` interface comes from
`@molecule/api-resource-device`, which the device bond already brings in — so
there is nothing extra to install for it.

## Database migration

Add a `magic_link_tokens` table (example for PostgreSQL / SQLite):

```sql
CREATE TABLE magic_link_tokens (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_magic_link_tokens_hash ON magic_link_tokens(token_hash);
```

## Wiring the routes (api/App/router.ts)

```ts
import magicLinkRouter from './handlers/magic-link.js'

// Mount before verifyMiddleware so unauthenticated users can request a link
router.use('/auth/magic-link', magicLinkRouter)
```

The `verify` route logs the user in through the app's user-resource session
(the device bond + `userAuthorization.set`), so the default user auth
(`mountDefaultUserAuthRoutes`) must be wired — it is, in any app with login.
The emailed link points straight at the API route:
`${SITE_ORIGIN}/api/auth/magic-link/verify?token=...`.

## Files in this example

| Path                           | What it does                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/magic-link.ts`   | `POST /auth/magic-link/request` — issues a hashed token and sends the email. `GET /auth/magic-link/verify?token=...` — validates, deletes (single-use), logs the user in via the app session (`userAuthorization.set`), redirects to `/`. |
| `app/pages/LoginPage.tsx`      | Email-only form. Submit shows "Check your email" — no password field.                                                                                                                                                                     |
| `app/locales/en/magic-link.ts` | English locale keys for the login page.                                                                                                                                                                                                   |

## Required env

```
MAILGUN_API_KEY=...   # from mailgun.com
MAILGUN_DOMAIN=...
SITE_ORIGIN=...       # e.g. https://yourapp.com — the app's public origin; used in the
                      # emailed link (same var the framework's password-reset emails use)
```

(The session's JWT keys are the app's existing auth keys — auto-generated if
unset; this feature does not add any of its own.)

## Anti-patterns

- Do not invent `@molecule/api-auth-magic-link`,
  `@molecule/api-auth-passwordless`, or `@molecule/api-magic-link` —
  none of these packages exist. The correct composition is
  `api-database` + `api-emails` + `api-rate-limit` + `api-jwt`.
- Do not make the link valid for more than 15 minutes. Enforce
  server-side via `expires_at`; do not rely only on the client.
- Do not allow the link to be reused. Delete the token row before
  issuing the session cookie — that way a second click is rejected
  even if the attacker intercepts the HTTP response mid-flight.
- Do not store the token plaintext. Hash with SHA-256 (or stronger)
  before writing to the database.
- Do not reveal whether an email address is registered. The request
  endpoint always returns 202 with the same message regardless.
- Do not skip rate-limiting on the request endpoint. Without it,
  the endpoint is a free tool to spam arbitrary email addresses.

## Verify

Enter email → "Check your email" message → email arrives with link →
click → set session cookie + redirect to `/`. Click the same link
again → `404 Link not found or already used`. Wait 15 min → `410
Link expired — request a new one`.
