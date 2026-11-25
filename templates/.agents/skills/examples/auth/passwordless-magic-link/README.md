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

| Role                                 | Package                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Token storage (issue + redeem)       | `@molecule/api-database`                                                                                             |
| Sending the email                    | `@molecule/api-emails` (provider: `@molecule/api-emails-mailgun`)                                                    |
| Rate-limiting the request endpoint   | `@molecule/api-rate-limit`                                                                                           |
| Logging the user in after redemption | `authorization.set()` from `@molecule/api-resource-user` and the device service from `@molecule/api-resource-device` |
| i18n                                 | `@molecule/api-i18n` (API), `@molecule/app-i18n-react-i18next` (app)                                                 |

The token is a cryptographically random 32-byte hex string that is
**SHA-256 hashed before storage** — so a leaked database does not let
attackers log in by replaying token hashes. The plaintext token is
what goes in the URL.

## What you'll install

Start with a working database and user resource. If your custom stack needs user
auth, add `@molecule/api-resource-user` and `@molecule/api-jwt-jsonwebtoken` with
`npx mlcl add @molecule/api-resource-user @molecule/api-jwt-jsonwebtoken --inject`.
The user resource brings in the device resource and mlcl wires its service. Run
the API's `npm run db:setup` to apply their resource migrations. Flagships with
login already have this session wiring.

From the project root, add the email transport, rate limiter and request validator
if they are missing.

```bash
npx mlcl add @molecule/api-emails-mailgun --inject
npx mlcl add @molecule/api-rate-limit-memory --inject
npx mlcl add @molecule/api-middleware-validation --inject
```

The handler calls `sendMail()` from `@molecule/api-emails` and `consume()` from
`@molecule/api-rate-limit`. It uses `get<DeviceService>('device')` to get the
device service and passes the returned device id to `authorization.set()`.

## Database migration

Add a `magic_link_tokens` migration for PostgreSQL or SQLite. The database
store supplies the token ID and the handler supplies both timestamps.

```sql
CREATE TABLE magic_link_tokens (
  id         UUID        PRIMARY KEY NOT NULL,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
```

## Wiring the routes (api/src/App/router.ts)

Copy the handler to `api/src/handlers/magic-link.ts` and mount it after the
user resource's `authorization.verifyMiddleware()`. The middleware sets the
session policy and lets anonymous requests reach both public routes. Enable
cookie sessions for this browser flow so the session survives the redirect.

```ts
import magicLinkRouter from '../handlers/magic-link.js'

router.use('/auth/magic-link', magicLinkRouter)
```

The emailed link points to `${SITE_ORIGIN}/api/auth/magic-link/verify?token=...`.

## Files in this example

| Path                           | What it does                                                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/magic-link.ts`   | `POST /auth/magic-link/request` sends the link and stores its token hash. `GET /auth/magic-link/verify?token=...` redeems the token, sets the user session, and redirects to `/`. |
| `app/pages/LoginPage.tsx`      | Email-only form. Submit shows "Check your email" — no password field.                                                                                                             |
| `app/locales/en/magic-link.ts` | English locale keys for the login page.                                                                                                                                           |

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
