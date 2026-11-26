---
name: bond-system
description: How the bond system works. Core interfaces, provider wiring, when and how to modify bonds, retrieval API, testing with bonds.
---

# Bond System

The bond system wires **providers** (implementations) to **core interfaces** (abstract APIs) at startup. Core packages define what you call in your code. Provider packages implement the actual behavior. Bond files in `bonds/` connect them.

```
Core Interface  ←──  Bond File (wiring)  ──→  Provider Package
(what you import)    (bonds/ directory)        (implementation)
```

## Scaffolded Bond Files

A flagship's `api/src/bonds/` files re-export setup functions for its bundled
providers. The flagship `api/src/bonds/database-postgresql.ts` is one line.

```typescript
export { setupDatabasePostgresql } from '@molecule/api-bonds-default-express' // Flagship API only
```

A custom stack (`npx mlcl create --packages …`) holds local `setup*()` functions in
`api/src/bonds/`, one file per provider. Each imports the selected provider or
factory and registers it with the core's setter or a named bond. The generated
`api/src/bonds/index.ts` imports those local functions and runs them from
`setupBonds()` at startup. Use `npx mlcl add @molecule/<provider> --inject` from the
project root to install and generate that wiring. Handlers call the core API.

On the app side, `app/src/bonds/index.ts` is the wiring entry point. Flagship React
apps can call `setupAllDefaultBonds()` from `@molecule/app-bonds-default-react` there.

## Two Wiring Patterns

These examples show the setup body for each kind of bond. Use the same shape if
you manage the wiring for a provider yourself.

### Singleton Bonds (Setter Functions)

For categories with exactly one provider (database, email, logger, cache):

```typescript
// api/src/bonds/database-postgresql.ts in a custom stack
import { setPool } from '@molecule/api-database'
import { pool } from '@molecule/api-database-postgresql'

export function setupDatabasePostgresql(): void {
  setPool(pool)
}
```

The setter function name varies by package: `setPool`, `setTransport`, `setProvider`, etc. Check the core package's README.md for the exact name.

Some providers export a **factory** `createProvider` instead of a ready `provider` instance (common for SMS, realtime, cron, video, and the sub-AI providers). CALL it when wiring — `setProvider(createProvider())`, WITH the `()` — never `setProvider(createProvider)`, which bonds the function itself so every provider call fails at runtime. The package's README.md `@example` shows the exact form.

**Multi-provider categories (e.g. AI) take a NAME.** The setter is still `setProvider`, but you pass a provider name first so several providers can register side by side:

```typescript
// api/src/bonds/ai-anthropic.ts
import { setProvider } from '@molecule/api-ai'
import { provider } from '@molecule/api-ai-anthropic'

export function setupAiAnthropic(): void {
  setProvider('anthropic', provider) // NAMED — retrieve with getProviderByName('anthropic')
}
```

(The no-name `setProvider(provider)` form registers a permanent default that always wins; prefer the named form so adding a second AI provider doesn't silently override the first.)

### Named Bonds (bond() Function)

For categories with multiple providers (OAuth, payments):

```typescript
// api/src/bonds/oauth-github.ts
import { bond } from '@molecule/api-bond'
import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-github'

export function setupOauthGithub(): void {
  // getAuthorizeUrl powers the GET /users/oauth/:provider initiation
  // redirect; verify powers the POST /users/log-in/oauth code exchange.
  // Wire BOTH — without getAuthorizeUrl the initiation endpoint 404s for
  // this provider and the login buttons dead-end.
  bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
}
```

```typescript
// api/src/bonds/payments-stripe.ts
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
```

### bonds/index.ts

All bond setup functions are imported and called in `bonds/index.ts`:

```typescript
// api/src/bonds/index.ts
import { setupDatabasePostgresql } from './database-postgresql.js'
import { setupOauthGithub } from './oauth-github.js'

export function setupBonds(): void {
  setupDatabasePostgresql()
  setupOauthGithub()
}
```

## When to Modify Bonds

**DO modify bonds/ when:**

- Wiring a provider that your project manages manually
- Swapping a provider (change the import in the existing bond file)
- Removing a provider (delete the bond file + remove from index.ts)

**bonds/ is not where feature code goes:**

- Handler code imports from core packages, never from bonds/
- UI components use hooks/utilities from core packages

## How to Add a New Bond

Run `npx mlcl add @molecule/<provider> --inject` to add the provider and wire its
bond. If you manage wiring by hand, read the provider's README for its setup,
create a bond file, and call it from `src/bonds/index.ts`.

```typescript
// api/src/bonds/payments-stripe.ts
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
```

Call the local setup from the bonds index.

```typescript
import { setupPaymentsStripe } from './payments-stripe.js'

export function setupBonds(): void {
  // ... existing bonds ...
  setupPaymentsStripe()
}
```

**If `setupBonds()` ends with `await setupActivityCapture()`, add your new bond
ABOVE that call.** It routes the capturable categories (email / sms / push / webhook /
channel) through capture providers so `read_activity` can read them in the IDE; a bond
added below it re-bonds the real provider afterwards, so its sends are NOT
captured (they'd really send, and `read_activity` shows nothing). Keep
`setupActivityCapture()` last.

**Capture has two modes, and the platform picks which one via
`MOLECULE_ACTIVITY_MODE`.** In a dev sandbox it is `intercept`: the real provider is
REPLACED, so a send is recorded and nothing is delivered. In a production deploy it is
`tee`: the real provider is WRAPPED, so the send really goes out AND is recorded —
a deployed app must actually email its users.

If a production deploy logs "Activity capture is off for this deploy: the app's capture
module predates tee mode", this project was scaffolded before tee mode existed and its
`api/src/bonds/_activity-capture.ts` intercepts whenever the activity URL is set. The
platform withholds that URL so real sends still go out. To restore production capture,
replace that file with the current generated version — read the header of
`api/src/bonds/_activity-capture.ts` (its "Updating this file" section) and rewrite the
module so it reads `process.env.MOLECULE_ACTIVITY_MODE` and, when the value is
`'tee'`, wraps the already-bonded provider from `get(category)` with the capture
package's `create*CaptureProvider(realProvider)` factory instead of bonding its
intercept-only `provider` export.

## Writing a Custom Provider (rare)

Only when NO `@molecule/*` provider exists for what you need (check `find_package`
first). The provider must satisfy the CORE package's interface exactly:

```typescript
import type { EmailTransport } from '@molecule/api-emails'

// The explicit type annotation is what catches a wrong shape at compile time.
export const provider: EmailTransport = {
  async sendMail(options) {
    /* ... */
  },
}
```

Common mistakes — each looks fine but breaks the bond:

- **Loose functions instead of a typed `provider` object** — `export const sendMail = ...` can't be bonded.
- **Missing the type annotation** — `export const provider = { ... }` hides interface mismatches until runtime.
- **Return types must match EXACTLY** — `Promise<T>` not `T`. Check the core interface in its docs (`read_molecule_doc`, or `npx mlcl docs <core package>`).
- **Method-style bond calls** — `bond.email(provider)` is wrong; every bond call is string-based: `bond('email', provider)`.

## How to Swap a Provider

Change the provider import in its bond file — the setter call stays the same, because
every provider for a category exports the same interface:

```typescript
// Before: Mailgun
import { provider } from '@molecule/api-emails-mailgun'

// After: SendGrid
import { provider } from '@molecule/api-emails-sendgrid'
```

`setTransport(provider)` is unchanged. The same one-line swap works for any
multi-provider category (email, sms, payments, uploads, ai, …).

**The database swaps too — with its migrations.** Migrations are written in the
current dialect (SQLite / PostgreSQL / MySQL), so switching the
`@molecule/api-database-*` bond means converting every migration to the new
dialect, pointing `DATABASE_URL` at the new database, and moving any rows worth
keeping. The platform provisions PostgreSQL; SQLite needs no server; another engine
needs a server URL the user provides in the Environment panel.

## Retrieval API

In your handler and component code, access bonded providers via the retrieval API:

```typescript
import { get, isBonded, getAll } from '@molecule/api-bond'
// (or from '@molecule/app-bond' on the frontend)

// get — returns undefined if not bonded
const email = get<EmailTransport>('email')
if (email) {
  await email.sendMail({ to, subject, text })
}

// isBonded — boolean check
if (isBonded('oauth', 'github')) {
  // GitHub OAuth is available
}

// getAll — all named providers in a category
const allPayments = getAll<PaymentProvider>('payments')
// Returns Map<string, PaymentProvider>
```

**Important:** Always import from the **core** package (`@molecule/api-database`, `@molecule/app-ui`), never from a provider package (`@molecule/api-database-postgresql`). Providers are only imported in bond files.

## Testing with Bonds

```typescript
import { bond, unbond } from '@molecule/api-bond'

const mockEmail = {
  sendMail: vi.fn().mockResolvedValue({ accepted: ['test@test.com'] }),
}

beforeEach(() => {
  bond('email', mockEmail)
})

afterEach(() => {
  unbond('email')
})

// For named providers:
beforeEach(() => {
  bond('payments', 'stripe', mockStripe)
})
afterEach(() => {
  unbondAll('payments')
})
```

## Full Retrieval API Reference

| Function    | Singleton             | Named                       | Description      |
| ----------- | --------------------- | --------------------------- | ---------------- |
| `bond`      | `bond(cat, provider)` | `bond(cat, name, provider)` | Register         |
| `get`       | `get<T>(cat)`         | `get<T>(cat, name)`         | Get or undefined |
| `require`   | `bondRequire<T>(cat)` | `bondRequire<T>(cat, name)` | Get or throw     |
| `isBonded`  | `isBonded(cat)`       | `isBonded(cat, name)`       | Check            |
| `unbond`    | `unbond(cat)`         | `unbond(cat, name)`         | Remove one       |
| `unbondAll` | `unbondAll(cat)`      | —                           | Remove all named |
| `getAll`    | `getAll<T>(cat)`      | —                           | Get all named    |

**Note:** `require` conflicts with Node globals — alias on import: `import { require as bondRequire } from '@molecule/api-bond'`
