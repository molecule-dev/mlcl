---
name: bond-system
description: The bond wiring system that bridges API and app packages. Runtime provider registration/retrieval, interface conformance rules, provider creation templates, and testing patterns.
---

# Bond System (API ↔ App Bridge)

The bond system is how molecule wires providers to interfaces at runtime. It works on both backend (API) and frontend (app) packages. Core packages define interfaces; bond packages implement them; the bond system connects them at startup.

## How It Works

```
Core Interface (types only)  ←──peerDep──  Bond Package (implementation)
       ↕ setProvider/getProvider                    ↕ exports provider
       Bond wiring at startup: bond('category', provider)
```

## Wiring Patterns

There are two wiring patterns. The pattern depends on whether the bond category supports multiple providers (named) or just one (singleton).

### Singleton Bonds (Setter Functions)

Singleton bonds like database, email, logger, cache, and AI are wired using **setter functions** exported from the core interface package:

```typescript
// Database
import { setPool } from '@molecule/api-database'
import { pool } from '@molecule/api-database-postgresql'
setPool(pool)

// Email
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-sendgrid'
setTransport(provider)

// Logger
import { setProvider } from '@molecule/api-logger'
import { provider } from '@molecule/api-logger-console'
setProvider(provider)
```

The setter function name varies by package (`setPool`, `setTransport`, `setProvider`). The CLI auto-discovers it by scanning exports matching `/^(set|register)[A-Z]/`.

### Named Bonds (bond() Function)

Named bond categories (oauth, payments, queue) support multiple providers bonded under different names. They use the `bond()` function from `@molecule/api-bond` or `@molecule/app-bond`:

```typescript
import { bond } from '@molecule/api-bond'

// OAuth — multiple providers by server name
bond('oauth', 'github', { serverName: 'github', verify: githubVerify })
bond('oauth', 'google', { serverName: 'google', verify: googleVerify })

// Payments — multiple providers by platform
bond('payments', 'stripe', stripeProvider)
bond('payments', 'apple', appleProvider)
```

The `bond()` function also supports singleton usage (`bond('category', provider)`) but the codebase convention is to use setter functions for singleton bonds.

The app-side bond (`@molecule/app-bond`) has an identical API:

```typescript
import { bond } from '@molecule/app-bond'

bond('ui', provider)
bond('i18n', provider)
bond('storage', 'local', provider)
```

## Retrieval API

```typescript
import { get, require as bondRequire, isBonded, unbond, unbondAll, getAll } from '@molecule/api-bond'

// get — returns undefined if not bonded
const email = get<EmailTransport>('email')
const github = get<OAuthProvider>('oauth', 'github')

// require (aliased as bondRequire to avoid conflict with Node's require) — throws if not bonded
const email = bondRequire<EmailTransport>('email')
const stripe = bondRequire<PaymentProvider>('payments', 'stripe')

// isBonded — boolean check (use in handler maps to conditionally include routes)
if (isBonded('email')) { ... }
if (isBonded('oauth', 'github')) { ... }

// unbond — remove a specific provider (useful in tests)
unbond('email')
unbond('oauth', 'github')

// unbondAll — remove ALL providers of a named category
unbondAll('payments')    // removes stripe, paypal, etc.

// getAll — get all named providers of a category
const allPayments = getAll<PaymentProvider>('payments')
// Returns Map<string, PaymentProvider> or similar iterable
```

**Note on `require`:** Since `require` conflicts with Node.js/CommonJS globals, always alias it on import: `import { require as bondRequire } from '@molecule/api-bond'`. In app-side code (`@molecule/app-bond`), the same alias pattern applies.

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
```

For named providers in tests:

```typescript
import { bond, unbond, unbondAll } from '@molecule/api-bond'

beforeEach(() => {
  bond('payments', 'stripe', mockStripe)
  bond('payments', 'paypal', mockPaypal)
})

afterEach(() => {
  unbondAll('payments') // clean up all named providers at once
})
```

## Provider (Bond) Conformance Rules

1. **Every provider MUST export a typed `provider` object** satisfying the core interface
2. **All required interface methods MUST be implemented** — optional methods may be omitted
3. **Return types MUST match exactly** — `Promise<T>` not `T`, `void` not `undefined`
4. **Core interface package MUST be a `peerDependency`**, not a regular dependency
5. **Must export a pre-built `provider` constant** for bond wiring (factory functions fine internally)
6. **Async-only providers** must use lazy initialization for a synchronous `provider` export

## Locale Bonds

Locale bonds are a special bond type: **pure translation data packages** that provide type-safe translations for a feature package in 79 languages.

**Key differences from regular bonds:**

- Locale bonds do NOT use `setProvider`/`getProvider` — they export named language constants
- They are consumed by importing language exports and registering them with the i18n provider
- Each locale bond has a `molecule.translates` field pointing to the feature package it translates

**Naming:** `@molecule/{stack}-locales-{feature}` (e.g., `@molecule/app-locales-forms`, `@molecule/api-locales-user`)

**Directory:** `packages/{stack}/locales/{name}/` (e.g., `packages/app/locales/forms/`)

**App-side consumption** (individual imports):

```typescript
import { en, es, fr } from '@molecule/app-locales-forms'
provider.addTranslations('en', en)
provider.addTranslations('es', es)
provider.addTranslations('fr', fr)
```

**API-side consumption** (bulk registration via `registerLocaleModule`):

```typescript
// In src/i18n.ts of each resource package
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-user'
registerLocaleModule(locales)
export const i18nRegistered = true
```

`registerLocaleModule()` iterates all named exports from the locale bond, maps camelCase names to locale codes (`zhTW` → `zh-TW`), and calls `addTranslations()` for each. Auto-creates locale configs that don't exist yet.

**API error key forwarding:** API handlers return `{ error: t(key), errorKey: key }`. The `errorKey` allows the app to translate the error client-side using the user's locale. Server-side email/notification content uses `t(key, values, { locale: userLocale })` for per-request translation.

**Conformance:** Each language file exports a typed constant matching the feature's translation key type (e.g., `export const es: FormsTranslations = { ... }`). TypeScript enforces completeness — missing keys cause build errors.

## Common Mistakes

1. **Exporting only loose functions** — BAD: `export const sendMail = ...`; GOOD: `export const provider: EmailTransport = { sendMail }`
2. **Raw library types leaking** — BAD: `export const pool: pg.Pool`; GOOD: `export const pool: DatabasePool = wrapPool(pgPool)`
3. **Only exporting async factory** — Must ALSO export synchronous `provider`
4. **Missing `?.` on optional methods** — In lazy proxies: `p.optionalMethod?.()` not `p.optionalMethod()`
5. **Missing type annotation** — BAD: `export const provider = { ... }`; GOOD: `export const provider: CacheProvider = { ... }`
6. **Using method-style bond calls** — BAD: `bond.email(provider)`; GOOD: `bond('email', provider)` — all bond functions are string-based

## Interface Reference

To look up a core interface's required export, methods, and provider pattern, read its README.md and `src/types.ts`:

```
# API core interfaces
~/molecule-workspace/molecule/packages/api/core/{name}/README.md
~/molecule-workspace/molecule/packages/api/core/{name}/src/types.ts

# App core interfaces
~/molecule-workspace/molecule/packages/app/core/{name}/README.md
~/molecule-workspace/molecule/packages/app/core/{name}/src/types.ts
```

Each README.md documents the interface, required export shape, provider pattern (`setProvider`/`getProvider`/`hasProvider`), and available methods. Always read the source — don't rely on cached summaries.

## CLI Auto-Wiring

When the CLI injects bonds into a project, it auto-discovers setter and provider exports. For details on the discovery algorithm (setter disambiguation, provider export priority rules), see the `cli-development` skill.

## Synchronous Provider Template

```typescript
import type { [Interface] } from '@molecule/api-[category]'

export const createProvider = (options?: ProviderOptions): [Interface] => ({
  // All required interface methods
})

export const provider: [Interface] = createProvider()
```

## Async Provider Template (Lazy Initialization)

```typescript
import type { [Interface] } from '@molecule/api-[category]'

export const createProvider = async (options?: ProviderOptions): Promise<[Interface]> => {
  const connection = await connectToService(options)
  return { /* methods using connection */ }
}

export const provider: [Interface] = (() => {
  let real: [Interface] | null = null
  let pending: Promise<[Interface]> | null = null
  const ensure = async (): Promise<[Interface]> => {
    if (real) return real
    if (!pending) pending = createProvider().then((p) => { real = p; return p })
    return pending
  }
  return {
    async requiredMethod(args) { return (await ensure()).requiredMethod(args) },
    async optionalMethod?(args) { return (await ensure()).optionalMethod?.(args) },
  }
})()
```

## Parallel Provider Creation

When creating multiple providers for the same interface (e.g., `api-cache-redis` + `api-cache-memcached`), or multiple bonds across categories, use parallel subagents — one per provider package. Each bond is independent and can be scaffolded simultaneously.

## Full API Reference

| Function    | Singleton Signature        | Named Signature                  | Description                            |
| ----------- | -------------------------- | -------------------------------- | -------------------------------------- |
| `bond`      | `bond(category, provider)` | `bond(category, name, provider)` | Register a provider                    |
| `get`       | `get<T>(category)`         | `get<T>(category, name)`         | Get provider or `undefined`            |
| `require`   | `bondRequire<T>(category)` | `bondRequire<T>(category, name)` | Get provider or throw                  |
| `isBonded`  | `isBonded(category)`       | `isBonded(category, name)`       | Check if bonded                        |
| `unbond`    | `unbond(category)`         | `unbond(category, name)`         | Remove specific provider               |
| `unbondAll` | `unbondAll(category)`      | —                                | Remove all named providers in category |
| `getAll`    | `getAll<T>(category)`      | —                                | Get all named providers in category    |

All functions use overloaded signatures — TypeScript infers the correct overload from the number of string arguments.

## Provider Checklist

- [ ] Imports interface type from core package
- [ ] Exports `provider` with explicit type annotation
- [ ] All REQUIRED methods implemented
- [ ] Return types match exactly (check Promise wrapping)
- [ ] Core interface in peerDependencies
- [ ] `npx tsc --noEmit` passes
- [ ] `bond('category', provider)` works without type errors
