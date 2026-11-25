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
npx mlcl add @molecule/api-two-factor-otplib --inject
npx mlcl add @molecule/api-rate-limit-memory --inject
```

Run these from the project root to wire any missing providers in `api/src/bonds/`.
`@molecule/api-resource-user` owns both enrollment and login. With a two-factor
provider bonded, its generated router mounts `POST /api/users/:id/verify-two-factor`
behind `authSelf` and `rateLimitTwoFactor`: `{ action: 'setup' }` returns the
`secret` and `QRImageUrl`, `{ action: 'enable', token }` turns the second factor
on, and `{ action: 'disable', token }` turns it off. These write the state the
log-in route reads (`usersSecrets` and `users.twoFactorEnabled`), so this example
ships no API code.

## Files in this example

| Path                                | What it does                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `app/pages/EnableTwoFactorPage.tsx` | Takes the signed-in user's `userId`, posts `setup`, shows the QR and the manual secret, then posts `enable`. |
| `app/pages/LoginVerifyPage.tsx`     | After the password is accepted, asks for the 6-digit code and resubmits the log-in with it.                     |

## Anti-patterns

- Do not write your own enroll or verify routes, or keep the secret in other
  columns: the log-in route checks only `users.twoFactorEnabled` and the secret
  in `usersSecrets`, so an enrollment stored anywhere else never asks for a code.
- Do not invent `@molecule/api-auth-totp`, `@molecule/api-2fa`, or
  `@molecule/api-mfa`. The correct packages are `@molecule/api-two-factor`
  (core interface) + `@molecule/api-two-factor-otplib` (provider).
- Do not use the `qrcode` npm package in the app — the setup response already
  carries `QRImageUrl`, a data URL. Render it directly as `<img src={QRImageUrl} />`.
- Show recovery codes only if your API implements both their issuance and
  single-use redemption. The user resource issues none.
- Do not send the secret back to the server or read it again after setup: `enable`
  and the log-in send only the code.

## Verify

After enrollment, `POST /api/users/log-in` with the password returns 206 and
`twoFactorRequired: true`. Resubmit with `twoFactorToken`. A valid code completes
the login. The resource's challenge response and rate limit govern retries.
