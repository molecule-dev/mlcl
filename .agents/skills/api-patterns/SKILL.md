---
name: api-patterns
description: Backend architecture patterns for molecule API packages. DataStore abstraction, handler rules, resource structure, middleware, and database bond wiring.
---

# API (Backend) Patterns

## Database Abstraction Rules

NEVER write raw SQL/query strings in handlers or business logic. All database interactions in handler code MUST use the abstract DataStore interface from `@molecule/api-database`.

```typescript
// BAD — Raw SQL in a handler
const result = await query(`SELECT * FROM "users" WHERE "email" = $1`, [email])

// GOOD — Abstract DataStore methods
const user = await findOne<User>('users', [{ field: 'email', operator: '=', value: email }])
const result = await create<User>('users', { email, name, createdAt: new Date() })
await updateById('users', userId, { name: 'New Name' })
```

## DataStore Methods

| Method                           | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `findById(table, id)`            | Get single record by primary key        |
| `findOne(table, where)`          | Get first matching record               |
| `findMany(table, options)`       | Query with filters, sorting, pagination |
| `count(table, where)`            | Count matching records                  |
| `create(table, data)`            | Insert new record                       |
| `updateById(table, id, data)`    | Update by primary key                   |
| `updateMany(table, where, data)` | Update matching records                 |
| `deleteById(table, id)`          | Delete by primary key                   |
| `deleteMany(table, where)`       | Delete matching records                 |

## When Raw Queries Are Acceptable

1. **Database bond packages** (e.g., `@molecule/api-database-postgresql`) — they implement DataStore
2. **Migration scripts** (`__setup__/*.sql`) — schema definitions are inherently database-specific
3. **Complex queries** (JOINs, CTEs, aggregations, full-text search) — wrap in a dedicated function in the resource package, never inline in handlers

## WhereCondition Operators

| Operator             | SQL                 | MongoDB                | Description   |
| -------------------- | ------------------- | ---------------------- | ------------- |
| `=`                  | `WHERE "f" = $1`    | `{ f: v }`             | Equality      |
| `!=`                 | `WHERE "f" != $1`   | `{ f: { $ne: v } }`    | Not equal     |
| `>`, `<`, `>=`, `<=` | Standard comparison | `$gt`, `$lt`, etc.     | Comparison    |
| `in`                 | `ANY($1)`           | `{ f: { $in: v } }`    | In array      |
| `not_in`             | `!= ALL($1)`        | `{ f: { $nin: v } }`   | Not in array  |
| `like`               | `LIKE $1`           | `{ f: { $regex: v } }` | Pattern match |
| `is_null`            | `IS NULL`           | `{ f: null }`          | Null check    |
| `is_not_null`        | `IS NOT NULL`       | `{ f: { $ne: null } }` | Not null      |

## Bond Wiring in Handlers

Singleton bonds (database, email, logger, cache) are wired using **setter functions** from core interface packages — NOT the `bond()` function. Only named bonds (OAuth, payments) use `bond()`.

### Singleton Bond Wiring (Setter Pattern)

```typescript
// In bond setup file (src/bonds/database-postgresql.ts)
import { setPool } from '@molecule/api-database'
import { pool } from '@molecule/api-database-postgresql'

export function setupDatabasePostgresql(): void {
  setPool(pool)
}
```

### Named Bond Wiring (bond() Function)

```typescript
// In bond setup file (src/bonds/oauth-github.ts)
import { bond } from '@molecule/api-bond'
import { serverName, verify } from '@molecule/api-oauth-github'

export function setupOauthGithub(): void {
  bond('oauth', serverName, { serverName, verify })
}
```

Handlers never call `bond()` or setter functions directly — they consume providers via `get()`, `getAll()`, or `getLogger()` from `@molecule/api-bond`.

## Handler Rules

1. Handlers NEVER import concrete drivers — only abstract core interfaces
2. All data access uses DataStore — NEVER raw queries in handlers
3. Database schemas live in `__setup__/` files
4. Routes are declarative — `{ method, path, handler, middlewares }`
5. Optional features use `get<T>('category')` at request time (may return undefined)
6. Handler maps use `getAll<T>('category').size > 0` to conditionally include routes for named bond categories
7. Core packages export interface + singleton get/set + convenience wrappers
8. Logger access via `getLogger()` from `@molecule/api-bond` — never import `@molecule/api-logger` directly in handlers
9. Configuration via `get()` from `@molecule/api-config` — prefer over direct `process.env` access

## Resource Package Structure

```
src/types.ts               → Resource types
src/schema.ts              → Validation schemas
src/routes.ts              → Declarative route definitions
src/requestHandlerMap.ts   → Maps names → handlers, conditional on bonds
src/handlers/              → DataStore methods, never raw queries
src/authorizers/           → Auth middleware
setup/                     → SQL from resource packages (legacy: src/__setup__/)
README.md / package.json
```

## API Interface Reference

Interface definitions live in the actual package source code. To look up a core API interface, read its `src/types.ts` in the molecule repo:

```
~/Repos/molecule-workspace/molecule/packages/api/core/{name}/src/types.ts
```

---

## Route Definition Pattern

Routes are declared as a plain array of objects exported from `src/routes.ts`. Each route object specifies the HTTP method, path, middleware names, and handler name. The injection engine reads this array at startup to wire Express routes automatically.

### Route Object Shape

```typescript
{
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,            // Express-style path with :params
  middlewares: string[],   // Names of middleware from the handler map
  handler: string,         // Name of the handler in the handler map
  optional?: string,       // Bond key — route is skipped if this bond is not available
}
```

### Real Example (User Resource)

```typescript
// src/routes.ts
export const routes = [
  // Public — no middleware
  { method: 'post' as const, path: '/users', middlewares: [], handler: 'create' },
  { method: 'post' as const, path: '/users/log-in', middlewares: [], handler: 'logIn' },

  // OAuth — only registered if the 'oauth' bond is available
  {
    method: 'post' as const,
    path: '/users/log-in/oauth',
    middlewares: [],
    handler: 'logInOAuth',
    optional: 'oauth',
  },

  // Authenticated CRUD — authSelf middleware checks session matches :id
  { method: 'get' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'read' },
  { method: 'patch' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'update' },
  { method: 'delete' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'del' },

  // Payment routes — optional, only if the specific payment bond exists
  {
    method: 'get' as const,
    path: '/users/:id/verify-stripe-subscription',
    middlewares: [],
    handler: 'verifyStripeSubscription',
    optional: 'stripe',
  },
]
```

### Key Rules

1. **`method` uses `as const`** — TypeScript narrows the string literal for type safety.
2. **`middlewares` is an array of names** — not function references. Names are resolved from the handler map at wiring time.
3. **`optional` marks bond-dependent routes** — the injection engine silently skips routes whose `optional` key has no bonded provider. This keeps route declarations complete while making features opt-in.
4. **Handler names must match keys in the request handler map** — `handler: 'create'` resolves to `map.create` in `requestHandlerMap.ts`.

---

## RequestHandlerMap Pattern

The request handler map (`src/requestHandlerMap.ts`) is a factory function that builds a `Record<string, MoleculeRequestHandler>`. It maps handler names (matching `routes.ts`) to actual middleware and request handlers. Optional features are conditionally included using `getAll()` checks at startup time.

### Structure

```typescript
import type {
  createRequestHandler as CreateRequestHandler,
  MoleculeRequestHandler,
} from '@molecule/api-resource'
import { getAll } from '@molecule/api-bond'
import type { PaymentProvider } from '@molecule/api-payments'
import * as authorizers from './authorizers/index.js'
import * as handlers from './handlers/index.js'
import { resource } from './resource.js'

type RequestHandlerCreator = typeof CreateRequestHandler

export const createRequestHandlerMap = (
  createRequestHandler: RequestHandlerCreator,
): Record<string, MoleculeRequestHandler> => {
  const map: Record<string, MoleculeRequestHandler> = {
    // Authorizers — middleware referenced by name in routes.ts
    auth: authorizers.auth(),
    authSelf: authorizers.authSelf(),

    // Core handlers — always available
    create: createRequestHandler(handlers.create(resource)),
    logIn: createRequestHandler(handlers.logIn(resource)),
    read: createRequestHandler(handlers.read(resource)),
    update: createRequestHandler(handlers.update(resource)),
    del: createRequestHandler(handlers.del(resource)),
  }

  // Payment handlers — generic handlers that work with ANY bonded payment provider.
  // The provider name comes from the :provider route parameter at request time.
  // Adding a new payment provider requires only a new bond package — no source changes here.
  const paymentProviders = getAll<PaymentProvider>('payments')
  if (paymentProviders.size > 0) {
    map.verifyPayment = createRequestHandler(handlers.verifyPayment(resource))
    map.handlePaymentNotification = createRequestHandler(
      handlers.handlePaymentNotification(resource),
    )
  }

  return map
}
```

### Key Rules

1. **Return type is `Record<string, MoleculeRequestHandler>`** — imported from `@molecule/api-resource`, NOT `express.RequestHandler`.
2. **`createRequestHandler` is injected** — the factory receives it as a parameter, keeping the resource decoupled from the Express wiring layer.
3. **Use `getAll<T>('category')` for named bond categories** — returns a `Map<string, T>`. Check `.size > 0` to conditionally register handlers.
4. **Generic handler pattern** — payment/OAuth handlers are registered once and dispatch to the correct provider at request time via route parameters (e.g., `:provider`). One handler works with stripe, apple, google — no per-provider conditionals.
5. **Handler factories receive the resource object** — `handlers.create(resource)` returns the actual handler function. The resource provides `name`, `tableName`, and `schema`.
6. **Authorizer names in `routes.ts` must match handler map keys** — `middlewares: ['authSelf']` resolves to `map.authSelf`.

---

## Schema Validation Pattern

Schemas use Zod and follow a layered pattern: a base props schema from `@molecule/api-resource/schema`, extended per-resource, then narrowed into operation-specific schemas via `.pick()` and `.partial()`. Types are inferred from schemas using `z.infer<>`, never hand-written.

### Base Schema (from `@molecule/api-resource`)

```typescript
import { z } from 'zod'

export const basePropsSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type BaseProps = z.infer<typeof basePropsSchema>
```

All resource schemas extend this base to inherit `id`, `createdAt`, and `updatedAt`.

### Resource Props Schema

```typescript
import { z } from 'zod'
import { basePropsSchema } from '@molecule/api-resource/schema'

// Full props schema — extends base with resource-specific fields
export const propsSchema = basePropsSchema.extend({
  username: z.string(),
  name: z.string().optional(),
  email: z.email().nullable().optional(),
  twoFactorEnabled: z.boolean().optional(),
  planKey: z.string().optional(),
})

// Type is always inferred, never hand-written
export type Props = z.infer<typeof propsSchema>
```

### Operation-Specific Schemas

Derived from the full `propsSchema` using `.pick()` and `.partial()`:

```typescript
// Create — pick only the fields accepted during creation
export const createPropsSchema = propsSchema.pick({
  username: true,
  name: true,
  email: true,
})
export type CreateProps = z.infer<typeof createPropsSchema>

// Update — pick allowed fields, then make them all optional
export const updatePropsSchema = propsSchema
  .pick({
    username: true,
    name: true,
    email: true,
  })
  .partial()
export type UpdateProps = z.infer<typeof updatePropsSchema>
```

### Secret Props Schema

Sensitive fields (passwords, tokens) live in a separate schema and separate database table (`{tableName}Secrets`):

```typescript
export const secretPropsSchema = z.object({
  id: z.string().uuid(),
  passwordHash: z.string().optional(),
  passwordResetToken: z.string().optional(),
  twoFactorSecret: z.string().optional(),
})
export type SecretProps = z.infer<typeof secretPropsSchema>
```

### Configurable Schemas with `createSchema()`

When a schema needs to accept constrained values (e.g., specific OAuth servers or plan keys), use a factory:

```typescript
export const createSchema = <
  OAuthServers extends readonly [string, ...string[]] | undefined = undefined,
>(options?: {
  oauthServers?: OAuthServers
}) => {
  return basePropsSchema.extend({
    oauthServer: options?.oauthServers
      ? z.enum(options.oauthServers).optional()
      : z.string().optional(),
  })
}

// Default (unconstrained)
export const propsSchema = createSchema()
```

### Key Rules

1. **Types are ALWAYS inferred from schemas** — `export type Props = z.infer<typeof propsSchema>`. Never define types by hand and then write a matching schema.
2. **One source of truth** — the full `propsSchema` is the canonical definition. Operation schemas derive from it via `.pick()` and `.partial()`.
3. **Secret props are always separate** — passwords, tokens, and secrets get their own schema, type, and database table.
4. **`z` is re-exported** from the schema module for consumer convenience — `export { z }`.
5. **Base schema is imported from `@molecule/api-resource/schema`** — never redeclare `id`, `createdAt`, `updatedAt`.

---

## Authorizer Pattern

Authorizers are Express middleware functions that gate access to routes. They are defined in `src/authorizers/`, exported via barrel file, and referenced by name in both `routes.ts` and the request handler map.

### Structure

Each authorizer is a factory function that returns a `MoleculeRequestHandler`. The factory pattern allows authorizers to accept configuration if needed (even if the current implementation takes no arguments).

### `auth` — Requires Any Authenticated Session

```typescript
import type { MoleculeRequestHandler } from '@molecule/api-resource'
import { t } from '@molecule/api-i18n'

export const auth = (): MoleculeRequestHandler => (req, res, next) => {
  try {
    const { session } = res.locals
    if (session?.userId) {
      return next()
    }
  } catch (error) {}
  return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
}
```

Checks that `res.locals.session` exists and has a `userId`. This is set by the JWT/session middleware earlier in the chain.

### `authSelf` — Requires Authenticated User Matches `:id` Param

```typescript
import type { MoleculeRequestHandler } from '@molecule/api-resource'
import { t } from '@molecule/api-i18n'

export const authSelf = (): MoleculeRequestHandler => (req, res, next) => {
  try {
    const { session } = res.locals
    if (session?.userId && session.userId === req.params.id) {
      return next()
    }
  } catch (error) {}
  return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
}
```

Extends `auth` by also checking the session `userId` equals the `:id` route param. **This only fits routes where `:id` IS a user id** (`/users/:id`, `/users/:id/settings`) — NOT a resource owned by a user.

### Object Ownership — when `:id` is a RESOURCE, not a user

For a resource that is owned by a user but has its OWN id (`/contracts/:id`, `/projects/:id`, `/documents/:id`), `authSelf` is the WRONG tool — it compares the _resource_ id to the user id and denies everyone. Using only `auth` (any logged-in user) is worse: it's a textbook **IDOR** (broken object-level authorization — the #1 API vulnerability), letting any authenticated user read/update/**delete** anyone else's record by changing the id in the URL.

An authorizer middleware can't do this cleanly (it would need to know the table and hit the DB), so enforce ownership **in the handler, before the mutation**: load the record, compare its owner column to the session user, and **404 (not 403)** if it isn't theirs — a 403 confirms the id exists, letting an attacker enumerate. Do this on **every** read/update/delete of a user-owned resource:

```typescript
router.delete('/:id', async (req, res) => {
  const userId = res.locals.session?.userId
  if (!userId)
    return res
      .status(401)
      .json({ error: t('common.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
  const row = await findById<ContractRow>('contracts', req.params.id)
  // 404 (not 403) so callers can't probe which ids exist.
  if (!row || row.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('contract.notFound', undefined, { defaultValue: 'Not found' }) })
  }
  await deleteById('contracts', req.params.id)
  return res.status(204).end()
})
```

Extract it to a `requireOwned(table, id, userId, res)` helper (→ the row, or `null` after sending 404) and reuse it across the resource's routes so no route forgets. For **shared/collaborative** resources widen the check to membership (owner OR a `<resource>_members` row) — the write-path authz must match the read-path (and realtime join-guard) authz. **Global/admin-managed** resources (a shared catalog, plans) use a `requireAdmin`-style role authorizer instead.

### Wiring

Authorizers are included in the handler map alongside handlers:

```typescript
// In requestHandlerMap.ts
const map: Record<string, MoleculeRequestHandler> = {
  auth: authorizers.auth(),
  authSelf: authorizers.authSelf(),
  create: createRequestHandler(handlers.create(resource)),
  // ...
}
```

And referenced by name in route definitions:

```typescript
// In routes.ts
{ method: 'get' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'read' },
```

### Key Rules

1. **Authorizers are factories** — always `export const authSelf = (): MoleculeRequestHandler => ...`, not a bare middleware function. This keeps the API consistent and allows future parameterization.
2. **Session lives in `res.locals`** — the JWT/session middleware populates `res.locals.session` before authorizers run.
3. **Fail by calling `next(error)`** — pass a translated error to `next()` using `t()`. This lets the error-handling middleware produce a consistent error format.
4. **Authorizers are exported via barrel file** — `src/authorizers/index.ts` uses `export * from './auth.js'` following standard module organization.
5. **Authorizer names in `routes.ts` must match handler map keys** — `middlewares: ['authSelf']` resolves to `map.authSelf`.

---

## Logger Access in Handlers

All handlers access the logger via `getLogger()` from `@molecule/api-bond`. This lazy proxy falls back to console if no logger is bonded.

```typescript
import { getLogger } from '@molecule/api-bond'

const logger = getLogger()

// In handler:
logger.error('Something went wrong:', error)
logger.info('Operation completed')
```

Never import from `@molecule/api-logger` directly in handler code.

---

## Error Handling Pattern

Handlers use a two-tier try/catch pattern: an **outer** catch for critical failures and **inner** catches for non-critical optional features.

### Outer Try/Catch — Critical Failures

Every handler wraps its entire body in a try/catch. The catch block logs the error via `logger.error(error)` and returns a 500 response with a handler-specific message.

```typescript
import { getLogger } from '@molecule/api-bond'
import type { MoleculeRequest } from '@molecule/api-resource'

const logger = getLogger()

export const read = ({ name, tableName, schema }: types.Resource) => {
  return async (req: MoleculeRequest, res: express.Response) => {
    try {
      // ... entire handler logic ...

      return { statusCode: 200, body: { props: user } }
    } catch (error) {
      logger.error(error)
      return { statusCode: 500, body: { error: `Failed to read ${name}.` } }
    }
  }
}
```

The error message is specific to the handler: `'Failed to read ${name}.'`, `'Login failed.'`, `'Failed to process password reset.'`, `'Two-factor operation failed.'`, etc.

### Inner Try/Catch — Non-Critical Features

When a handler includes optional behavior that should not break the main flow, wrap it in a nested try/catch. The inner catch either silently swallows the error or logs it without returning an error response.

**Silent catch** (feature is purely supplementary):

```typescript
// From read handler — reading two-factor secrets is optional
if (session?.userId === id) {
  try {
    const secrets = await findById<types.SecretProps>(`${tableName}Secrets`, id)

    if (secrets) {
      body.twoFactorEnabled = user.twoFactorEnabled || false
      body.hasPendingTwoFactor = Boolean(secrets.pendingTwoFactorSecret)
    }
  } catch (error) {
    // Non-critical.
  }
}
```

**Logged catch** (failure is worth recording but should not block the response):

```typescript
// From forgotPassword handler — email sending is optional
try {
  const emailProvider = get<EmailTransport>('email')
  if (emailProvider) {
    await emailProvider.sendMail({/* ... */})
  }
} catch (error) {
  logger.error('Failed to send password reset email:', error)
}
```

### Multi-Phase Handlers

Complex handlers like `create` use multiple sequential try/catch blocks, each guarding a distinct phase. Early phases may return 400-level errors, while later phases return 500s:

```typescript
export const create = ({ name, tableName, schema }: types.Resource) => {
  return async (req: CreateRequest, res: express.Response) => {
    // Phase 1: Input validation
    try {
      // Parse and validate req.body ...
    } catch (error) {
      return { statusCode: 400, body: { error: 'Bad request.' } }
    }

    // Phase 2: Uniqueness checks
    try {
      // Check username/email availability ...
    } catch (error) {
      logger.error(error)
    }

    // Phase 3: Password hashing
    try {
      const passwordHash = await hash(body.password!)
      // Insert into secrets table ...
    } catch (error) {
      logger.error(error)
      return { statusCode: 500, body: { error: 'Failed to hash password.' } }
    }

    // Phase 4: Session creation (post-create)
    // ...
  }
}
```

### Key Rules

1. **Always log before returning 500** — `logger.error(error)` must precede every `{ statusCode: 500, ... }` return.
2. **Error messages are handler-specific** — never use a generic `'Internal server error'`. Each handler describes what failed: `'Failed to read user.'`, `'Login failed.'`, `'Failed to create session.'`.
3. **Non-critical features get nested try/catch** — optional features (two-factor info, email sending, notifications) must never cause a 500 on the main operation.
4. **Silent catches must be commented** — use `// Non-critical.` to explain why the error is intentionally swallowed.
5. **Fire-and-forget operations use `.catch(() => {})`** — e.g., `notify({ ... }).catch(() => {})` for notifications that should not block the response.
6. **User-facing error messages should use `t()`** — use `t('resource.error.notFound', undefined, { defaultValue: 'Not found' })` instead of hardcoded English. Translations live in companion locale bond packages (e.g., `@molecule/api-locales-user`).

---

## API i18n & Error Responses

`@molecule/api-i18n` mirrors `@molecule/app-i18n` — same types, same provider pattern, same `t()` function. Key difference: `t()` accepts an optional `locale` parameter for per-request translation (avoids global state race conditions on the server).

### Error Response Pattern

API errors return both human-readable text AND a translation key. The app translates client-side via the key.

```typescript
import { t } from '@molecule/api-i18n'

// Error responses — always English on server, app translates via errorKey
const key = 'user.error.notFound'
return { statusCode: 404, body: { error: t(key), errorKey: key } }
```

### Locale-Aware Content (Emails, Notifications)

Content sent directly to users (emails, push notifications) is translated server-side using the user's preferred locale.

```typescript
import { t } from '@molecule/api-i18n'

const subject = t('user.email.resetSubject', { appName }, { locale: user.locale || 'en' })
const body = t('user.email.resetBody', { link, appName }, { locale: user.locale || 'en' })
```

### Locale Registration at Startup

Each resource package registers its locale bond translations in `src/i18n.ts`:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-user'
registerLocaleModule(locales)
export const i18nRegistered = true
```

`registerLocaleModule()` iterates named exports (e.g., `en`, `es`, `zhTW`), maps camelCase to locale codes (`zhTW` → `zh-TW`), and calls `addTranslations()` for each. Locales are auto-created if they don't exist.

### Import Pattern

Handlers import `t` directly from `@molecule/api-i18n` — no bridge files, no `translations.ts`:

```typescript
import { t } from '@molecule/api-i18n'
```

### Core Provider Errors

Core packages (database, cache, emails, etc.) use `t()` with `defaultValue` for "not configured" errors:

```typescript
import { t } from '@molecule/api-i18n'

export const getProvider = (): EmailTransport => {
  if (!currentProvider) {
    throw new Error(
      t('emails.error.noProvider', undefined, {
        defaultValue: 'Email transport not configured. Call setTransport() first.',
      }),
    )
  }
  return currentProvider
}
```

---

## Environment Variable Usage

Handlers can access configuration via `get()` from `@molecule/api-config`, which wraps the config provider bond. Some handlers use `process.env` directly with fallback defaults as a simpler alternative. Both patterns exist in the codebase.

### Config Provider Pattern

```typescript
import { get as getConfig } from '@molecule/api-config'

const appName = getConfig('APP_NAME', 'App')
const siteOrigin = getConfig('SITE_ORIGIN', '')
```

### String Values with Fallback

```typescript
const appName = process.env.APP_NAME || 'App'
const siteOrigin = process.env.SITE_ORIGIN || ''
const emailFrom = process.env.EMAIL_FROM || 'noreply@example.com'
```

### Numeric Values with Parsing

```typescript
const JWT_REFRESH_TIME = Number(process.env.JWT_REFRESH_TIME) || 1000 * 60 * 30 // 30 minutes
```

Bond providers use `parseInt` with a string fallback for port numbers:

```typescript
const port = parseInt(process.env.REDIS_PORT ?? '6379', 10)
```

### Common Environment Variables

| Variable           | Default                   | Used In                                                 |
| ------------------ | ------------------------- | ------------------------------------------------------- |
| `APP_NAME`         | `'App'`                   | Two-factor setup (QR code service name), email subjects |
| `SITE_ORIGIN`      | `''`                      | Password reset links, email bodies                      |
| `EMAIL_FROM`       | `'noreply@example.com'`   | Sender address for transactional emails                 |
| `JWT_REFRESH_TIME` | `1000 * 60 * 30` (30 min) | Token refresh threshold in authorization middleware     |

### Real Example (forgotPassword handler)

```typescript
try {
  const emailProvider = get<EmailTransport>('email')
  if (emailProvider) {
    const appName = process.env.APP_NAME || 'App'
    const siteOrigin = process.env.SITE_ORIGIN || ''

    await emailProvider.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: `${appName} - Password Reset`,
      text:
        `Your password reset token is: ${passwordResetToken}\n\n` +
        (siteOrigin
          ? `Reset your password at: ${siteOrigin}/reset-password?token=${passwordResetToken}`
          : ''),
    })
  }
} catch (error) {
  logger.error('Failed to send password reset email:', error)
}
```

### Key Rules

1. **Always provide sensible defaults** — never let a missing env var crash a handler. Use `|| 'default'` for strings, `Number(...) || default` for numbers.
2. **Read env vars at the point of use** — inside the handler or at module scope. Do not create a centralized config object within resource packages.
3. **Empty string is a valid default** — `process.env.SITE_ORIGIN || ''` means "feature disabled" when the origin is not set (e.g., password reset links are omitted).
4. **For centralized config, use `@molecule/api-config`** — the `ConfigProvider` interface (`get`/`getRequired`/`has`) is available as a bond. But direct `process.env` with fallbacks is the standard pattern in handler code where simplicity wins.
5. **Secrets declared in the registry** — env vars that a package requires are listed in its `secrets` field in `mlcl/registry.json` so the CLI can prompt for them during setup.
