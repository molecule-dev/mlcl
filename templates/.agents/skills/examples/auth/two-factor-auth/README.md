---
name: two-factor-auth
intent: |
  - "Two-factor authentication"
  - "2FA / MFA"
  - "TOTP / authenticator app"
  - "Make logins more secure"
  - "Require a code from Google Authenticator"
keywords: [2fa, mfa, totp, authenticator, security, second-factor]
---

# Two-factor authentication (TOTP)

**When to copy this example:** the user wants to add a second
authentication factor on top of email/password (or OAuth). Pairs
with `auth/email-password-login/` — read that first.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-two-factor @molecule/api-two-factor-otplib --workspace=api
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api   # brute-force cap on /verify
# No extra app package needed — the QR code data URL is generated server-side by @molecule/api-two-factor.
```

## Bond wiring (api/src/bonds/index.ts — call from setupBonds())

The `two-factor` bond is already wired in every scaffolded app, but a rate-limit
provider is NOT — wire one so the `consume()` calls on `/2fa/verify` and
`/2fa/disable` don't throw `Rate-limit provider not configured`:

```ts
import { setupRateLimitMemory } from '@molecule/api-bonds-default-express'

await setupRateLimitMemory() // a rate-limit provider must be bonded for consume()
```

## Files in this example

| Path                                | What it does                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `api/handlers/totp.ts`              | `POST /2fa/enroll` issues secret + QR; `POST /2fa/verify` validates code; `POST /2fa/disable` removes it. |
| `app/pages/EnableTwoFactorPage.tsx` | Renders QR + asks user to enter a code from their authenticator.                                          |
| `app/pages/LoginVerifyPage.tsx`     | After password OK, prompt for 6-digit code if 2FA enabled.                                                |

## Anti-patterns

- Do not store the TOTP secret unencrypted in the database. Encrypt
  with the `secrets` bond (`@molecule/api-secrets-env` ships an
  encryption helper) and decrypt at verify time.
- Do not invent `@molecule/api-auth-totp`, `@molecule/api-2fa`, or
  `@molecule/api-mfa`. The correct packages are `@molecule/api-two-factor`
  (core interface) + `@molecule/api-two-factor-otplib` (provider).
- Do not use the `qrcode` npm package in the app — `getUrls()` from
  `@molecule/api-two-factor` already returns a `QRImageUrl` data URL.
  Render it directly as `<img src={QRImageUrl} />`.
- Do not skip recovery codes. When users lose their phone, they
  need backup codes — generate 10 single-use codes at enrollment
  and let the user download them.
- Do not leave `/verify` un-rate-limited; a 6-digit code is only ~1M
  values, so an attacker with a session brute-forces it in a few
  windows. This example caps attempts per user with `consume()` from
  `@molecule/api-rate-limit` (tune the window/max on the provider, e.g.
  ≤5/min) and 429s past the cap.
- Do not skip replay protection. A TOTP code stays valid for ~30s, so
  the same code works twice unless you reject reuse. Pass the last
  accepted `timeStep` as `afterTimeStep` to `verify()` and persist the
  returned `timeStep` (this example stores `totp_last_time_step`); a
  `reason: 'replay'` result means the code was already used.

## Verify

User enables 2FA → scans QR with Google Authenticator → enters code
→ saved. Next login: password → "Enter code" page → enter the 6
digits → in. Wrong code → 401 with retry counter.
