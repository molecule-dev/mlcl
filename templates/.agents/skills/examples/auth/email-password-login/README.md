---
name: email-password-login
intent: |
  - "Let people sign up with an email and password"
  - "Account creation with a password"
  - "Login form with email + password"
  - "Forgot password / password reset"
keywords: [email, password, signup, login, auth, register, account]
---

# Email + password authentication

**When to copy this example:** the user wants classic email/password
sign-up + log-in. If they specifically asked for "Google login" use
`auth/oauth-google-login/` instead. If they want **both**, copy
both — they coexist on the same login page.

## How it works

There is no single `@molecule/api-auth-email-password` package. Email +
password auth is composed from three real packages:

| Role                                                | Package                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| User record + signup/login/forgot-password handlers | `@molecule/api-resource-user`                                        |
| Password hashing (bcrypt)                           | `@molecule/api-password` (provider: `@molecule/api-password-bcrypt`) |
| JWT signing + verification                          | `@molecule/api-jwt` (provider: `@molecule/api-jwt-jsonwebtoken`)     |

The route-mounting helpers live in `@molecule/api-bonds-default-express`.

## What you'll install

```bash
cd /workspace
# The resource + default Express wiring (includes password-bcrypt, jwt-jsonwebtoken)
npm install @molecule/api-bonds-default-express --workspace=api
npm install @molecule/api-resource-user --workspace=api
npm install @molecule/api-password @molecule/api-password-bcrypt --workspace=api
npm install @molecule/api-jwt @molecule/api-jwt-jsonwebtoken --workspace=api
npm install @molecule/api-middleware-validation --workspace=api   # validateBody() in the handler
npm install @molecule/api-emails-mailgun --workspace=api   # for verification + reset emails
```

Run the user resource's `src/__setup__/users.sql` and `src/__setup__/usersSecrets.sql` migrations through the app's migration runner before mounting these routes. A scaffold that already includes the user resource has these migrations; preserve its existing copies.

## Wiring the routes (App/router.ts)

```ts
import {
  mountDefaultUserAuthRoutes,
  mountDefaultUserCrudRoutes,
  mountDefaultUserResetPasswordRoute,
  userAuthorization,
  userRequestHandlerMap as User,
} from '@molecule/api-bonds-default-express'

// JWT verification middleware — must run before any authenticated handler
router.use(userAuthorization.verifyMiddleware())

// Public auth endpoints
mountDefaultUserAuthRoutes(router, User) // POST /users (signup), /users/log-in, /users/forgot-password
mountDefaultUserResetPasswordRoute(router, User) // POST /users/reset-password (only if the resource ships it)
mountDefaultUserCrudRoutes(router, User) // GET /users/:id, PATCH /users/:id, DELETE /users/:id
```

If the resource does not ship a standalone reset-password handler, add the
custom one from `api/handlers/auth.ts` in this example:

```ts
import customResetPasswordRouter from './handlers/auth.js'
router.use('/users', customResetPasswordRouter)
```

## Files in this example

| Path                      | What it does                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/auth.ts`    | Custom `POST /users/reset-password` endpoint (token → new password hash). The signup/login/forgot-password routes come from `mountDefaultUserAuthRoutes`. |
| `app/pages/LoginPage.tsx` | Login form. Posts to `/api/users/log-in`, redirects on success.                                                                                           |
| `app/locales/en/login.ts` | English locale keys for the login page.                                                                                                                   |

## Required env

```
JWT_PRIVATE_KEY=...   # RSA private key (PEM). Generate with: node -e "const {generateKeyPairSync}=require('@molecule/api-jwt');const kp=generateKeyPairSync();console.log(kp.privateKey)"
JWT_PUBLIC_KEY=...    # Matching RSA public key (PEM)
MAILGUN_API_KEY=...   # for verification + reset emails
MAILGUN_DOMAIN=...
SITE_ORIGIN=...       # the app's public origin; the framework's reset email link uses it
```

## Anti-patterns

- Do not store passwords as plain text. Hash with `hash(password)` from
  `@molecule/api-password`; compare with `compare(plain, hash)`. Never pass
  plaintext to `create('users', ...)` directly.
- Do not invent `@molecule/api-auth-email-password`, `@molecule/api-auth-jwt`,
  or `@molecule/api-bcrypt` — none exist. The real packages are
  `@molecule/api-password-bcrypt` and `@molecule/api-jwt-jsonwebtoken`.
- Do not write your own JWT layer. Sessions are managed by the bonded
  `@molecule/api-jwt` provider + cookie/Bearer middleware in
  `userAuthorization.verifyMiddleware()`.
- Do not skip rate-limiting login attempts. Wire `@molecule/api-rate-limit`
  in front of `/users/log-in` and `/users/forgot-password`.

## Verify

Sign up: `POST /api/users` `{ email, password }` → user row in DB, `201`.
Log in: `POST /api/users/log-in` `{ email, password }` → JWT cookie set.
Auth check: `GET /api/users/:id` with cookie → returns user record.
Forgot password: `POST /api/users/forgot-password` `{ email }` → reset email sent.
Reset: `POST /api/users/reset-password` `{ token, password }` → `{ success: true }`.
