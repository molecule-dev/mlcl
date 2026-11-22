---
name: auth
description: Authentication and authorization patterns. Session access, ownership scoping, role checks, OAuth.
---

# Authentication & Authorization

## Auth Is Already Wired Globally — Never Import a Per-Route Auth Package

When the project includes the default user resource, auth is applied ONCE in
`api/src/App/router.ts` via `router.use(userAuthorization.verifyMiddleware())`.
That middleware decodes the JWT and populates `res.locals.session` for every
request. **Never `import` a `requireAuth` (or any auth middleware) from a
package** — there is no `@molecule/api-auth` package and nothing that exports
one; an invented import breaks the build. To gate a route you have two equivalent
options, both correct: (a) read the current user inside the handler and bail if
there isn't one (the dominant fleet convention), or (b) define a tiny LOCAL
`requireAuth` middleware in the handler file and chain it onto routes — this is
what the example slices do (`find_example`, or `npx mlcl examples <query>`), and it also keeps the handler safe if global
auth isn't wired. The only hard rule is that `requireAuth` is something you write
locally, never something you import from `@molecule/*`.

## Accessing the Current User — getUserId(res)

Get the authenticated user's id with `getUserId(res)` from
`@molecule/api-bonds-default-express` (it reads `res.locals.session.userId`).
Note it takes `res`, NOT `req`. Returns `string | null`:

```typescript
import { Router, type Request, type Response } from 'express'
import { findMany } from '@molecule/api-database'
import { getUserId } from '@molecule/api-bonds-default-express'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  // Always scope every query by the owner's user_id — no IDOR.
  const items = await findMany('todos', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  res.json(items)
})

export default router
```

This is the canonical handler shape — same as the `api-patterns` skill. Features
are Express `Router`s in `api/src/handlers/<name>.ts`, not classes with static
`list`/`add` methods.

## The Session Object — res.locals.session

`getUserId(res)` reads from `res.locals.session`. Read other session fields the
same way for role/admin checks:

```typescript
const session = res.locals.session as { userId?: string; role?: string } | undefined
// session?.userId — the authenticated user's id (prefer getUserId(res))
// session?.role   — the user's role, when present
```

## Ownership Scoping (the #1 rule)

Every read and write MUST be scoped to the current user so one user can never
touch another's rows. For lists, filter by `user_id`. For single-row routes,
load the row and 404 if it isn't owned (404 not 403, so existence isn't leaked):

```typescript
import { findById, deleteMany } from '@molecule/api-database'
import { getUserId } from '@molecule/api-bonds-default-express'

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  const id = String(req.params.id)
  const existing = await findById<Record<string, unknown>>('todos', id)
  if (!existing || existing.user_id !== userId) {
    res.status(404).json({ error: 'Todo not found.' })
    return
  }
  await deleteMany('todos', [{ field: 'id', operator: '=', value: id }])
  res.status(204).end()
})
```

## Role-Based / Admin Access

For admin-only actions, read the role off the session and 403 if it doesn't match:

```typescript
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  const session = res.locals.session as { role?: string } | undefined
  if (session?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' })
    return
  }
  // ... admin-only work ...
})
```

## OAuth

OAuth providers (GitHub, Google, GitLab, Twitter) are wired as named bonds. Check availability:

```typescript
import { isBonded } from '@molecule/api-bond'

if (isBonded('oauth', 'github')) {
  // GitHub OAuth is available
}
```

**Use the pre-built OAuth flow** unless the user needs a provider or flow it lacks —
then write one, keeping the two-step state check below. On the app side, drive login
with `useOAuth()` from `@molecule/app-react`: `const { redirect } = useOAuth({ baseURL:
'/api', oauthProviders: ['google', 'github'], oauthEndpoint: '/users/oauth' })`, then
`onClick={() => redirect('google')}`. That one call runs the WHOLE server-side dance
(see the `oauth-google-login` example slice: `find_example`, or
`npx mlcl examples oauth-google-login`). The frontend never POSTs an OAuth
body by hand.

OAuth login is a TWO-step server flow in the pre-built `@molecule/api-resource-user`,
and BOTH halves are required:

1. `GET /users/oauth/:provider` — initiation. Sets the `oauth_state` CSRF cookie + PKCE
   verifier, then 302s to the provider. Skip it and the state cookie is never set, so
   step 2 always rejects.
2. `POST /users/log-in/oauth` — accepts `{ server, code, state, codeVerifier }` (NOT just
   `{ server, code }`), validates `state` against the cookie from step 1 (MANDATORY CSRF
   protection), and returns a session token.

The common trap: POSTing `{ server, code }` straight to `/users/log-in/oauth` without the
initiation step. It compiles, but the login ALWAYS fails the state check and no one is
ever logged in. Let `useOAuth().redirect()` drive both halves.

## JWT/Session

The project uses JWT for stateless sessions. This is auto-configured:

- Tokens are created on login and returned to the client
- The global `verifyMiddleware` decodes the token and sets `res.locals.session` on each request
- Token refresh is automatic based on `JWT_REFRESH_TIME` env var
- No session store needed — everything is in the JWT

You don't manage JWT directly — just call `getUserId(res)` in your handlers and
scope every query by the returned `user_id`.

## Server-Side Secrets & Two-Factor (2FA)

A secret the server uses to prove identity — a TOTP secret, a private key, a webhook
signing secret — is a SERVER-SIDE secret. It must NEVER be sent to, stored by, or read
from the browser AFTER setup. At verify/login time the frontend sends only a token/code
and gets back a boolean — it never sends the secret and never re-fetches it.

For 2FA with `@molecule/api-two-factor` (read its docs: `read_molecule_doc`, or `npx mlcl docs @molecule/api-two-factor`),
the API OWNS the whole lifecycle and state (secret + `enabled` + `last_time_step`) and
exposes `status` / `setup` / `enable` / `verify` / `disable` endpoints. Two rules keep it
safe: (1) `verify()` is stateless — YOU load the STORED secret server-side and pass it in
(with `afterTimeStep` = the last accepted step, so a code can't be replayed); NEVER accept
a secret from the client. (2) The secret is shown EXACTLY ONCE, at `setup`/`enroll`, to the
authenticated user setting it up: return the QR (`getUrls()`) AND the raw secret key so
they can EITHER scan OR type it into their authenticator (both encode the same seed; manual
entry is a required accessibility fallback, not a leak). After that it is never returned
again — `status` and every other endpoint must NEVER echo it back.

**Bringing a server-side capability into an app that has its OWN client database
(Supabase / Firebase):** the API owns that capability's table via a SERVICE-ROLE (admin)
client. A `supabase.from('user_2fa')` read/write from the BROWSER (the anon client) is
the wrong, insecure pattern — it exposes the secret and bypasses the server. Route ALL of
the capability's reads AND writes through the API endpoints and DELETE the client-side DB
calls for it; a leftover browser DB call (e.g. a 2FA status check hitting `user_2fa`
directly) is a bug, not a shortcut.
