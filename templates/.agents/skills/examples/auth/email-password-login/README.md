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

| Role                                           | Package                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| User records, signup, login and password reset | `@molecule/api-resource-user`                                 |
| Password hashing                               | `@molecule/api-password` with `@molecule/api-password-bcrypt` |
| JWT signing and verification                   | `@molecule/api-jwt` with `@molecule/api-jwt-jsonwebtoken`     |

## What you'll install

From the root of a custom stack with a database provider, add the pieces your
API still needs.

```bash
npx mlcl add @molecule/api-resource-user @molecule/api-password-bcrypt @molecule/api-jwt-jsonwebtoken --inject
npx mlcl add @molecule/api-emails-mailgun --inject
npx mlcl add @molecule/api-rate-limit-memory --inject
```

Run `npm run db:setup` in the API workspace to apply the user and device resource
migrations (`users.sql`, `usersSecrets.sql`, and `devices.sql`). A flagship with
user auth already mounts its user routes. Use its email and rate-limit bonds if
they are wired.

## Wiring the routes

mlcl mounts `authorization.verifyMiddleware()` and the user resource's routes in
`api/src/App/router.ts`. The generated signup, login, logout, and profile routes
come from `@molecule/api-resource-user`. The email transport enables the
forgot-password and reset-password routes. Use these generated mounts in a
custom scaffold.

If you manage your own router, mount `authorization.verifyMiddleware()` from
`@molecule/api-resource-user` before the user routes. The resource's
`createRequestHandlerMap(createRequestHandler)` supplies handlers and guards,
using the wrapper from `@molecule/api-resource`. Use `rateLimitAuth` on login
and password-reset routes and `authSelf` on `/users/:id` routes. The example
below shows how to mount the reset route in a manually managed router that
needs one. Copy `api/handlers/auth.ts` as `api/src/handlers/reset-password.ts`.

```ts
// api/src/App/router.ts
import resetPasswordRouter from '../handlers/reset-password.js'

router.use('/users', resetPasswordRouter)
```

## Files in this example

| Path                      | What it does                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/auth.ts`    | Example mount for the resource's rate-limited `POST /users/reset-password` handler in a manually managed API router. |
| `app/pages/LoginPage.tsx` | Login form. Posts to `/api/users/log-in`, redirects on success.                                                      |
| `app/locales/en/login.ts` | English locale keys for the login page.                                                                              |

## Required env

```
JWT_PRIVATE_KEY=...   # RSA private key (PEM). Generate with: node -e "const {generateKeyPairSync}=require('@molecule/api-jwt');const kp=generateKeyPairSync();console.log(kp.privateKey)"
JWT_PUBLIC_KEY=...    # Matching RSA public key (PEM)
MAILGUN_API_KEY=...   # for verification + reset emails
MAILGUN_DOMAIN=...
SITE_ORIGIN=...       # the app's public origin; the framework's reset email link uses it
```

## Anti-patterns

- Use the user resource to validate and hash passwords and store account
  credentials. The reset handler verifies the emailed token against its stored
  hash and consumes it when it changes the password.
- Do not invent `@molecule/api-auth-email-password`, `@molecule/api-auth-jwt`,
  or `@molecule/api-bcrypt` — none exist. The real packages are
  `@molecule/api-password-bcrypt` and `@molecule/api-jwt-jsonwebtoken`.
- Do not write your own JWT layer. Sessions are managed by the bonded
  `@molecule/api-jwt` provider + cookie/Bearer middleware in
  `authorization.verifyMiddleware()` from `@molecule/api-resource-user`.
- Do not skip rate-limiting login attempts. Wire `@molecule/api-rate-limit`
  with the chosen provider so the resource's `rateLimitAuth` middleware can
  throttle login and password-reset requests.

## Verify

Sign up: `POST /api/users` `{ email, password }` → user row in DB, `201`.
Log in: `POST /api/users/log-in` `{ email, password }` → JWT cookie set.
Auth check: `GET /api/users/:id` with cookie → returns user record.
Forgot password: `POST /api/users/forgot-password` `{ email }` → reset email sent.
Reset: `POST /api/users/reset-password` `{ token, password }` → `{ success: true }`.
