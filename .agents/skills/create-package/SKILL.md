---
name: create-package
description: Create new @molecule/* packages. Naming rules, directory placement, module organization, registry entries, code templates, and documentation checklists.
---

# Creating Molecule Packages

## Package Naming

### The Specificity Test

**"If someone saw only the package name, would they know exactly what it does?"**

- If the answer is "it could be several things" → too generic → add a qualifier
- If the answer is "obviously X" → the name is fine

### BAD vs GOOD Examples

| BAD (ambiguous)           | GOOD (specific)              | Why                                   |
| ------------------------- | ---------------------------- | ------------------------------------- |
| `@molecule/app-chat`      | `@molecule/app-ai-chat`      | "chat" could be messaging UI          |
| `@molecule/app-editor`    | `@molecule/app-code-editor`  | "editor" could be rich text           |
| `@molecule/api-sandbox`   | `@molecule/api-code-sandbox` | "sandbox" could mean Stripe test mode |
| `@molecule/app-workspace` | `@molecule/app-ide`          | "workspace" is vague                  |
| `@molecule/app-preview`   | `@molecule/app-live-preview` | "preview" is vague                    |

### When Generic Names ARE Fine

These are naturally unambiguous:

- `@molecule/app-auth` — authentication is a clear concept
- `@molecule/api-database` — everyone knows what a database is
- `@molecule/app-routing` — routing is specific
- `@molecule/app-theme` — theming is well-understood
- `@molecule/api-payments` — payments is unambiguous
- `@molecule/app-biometrics` — biometrics means one thing

### Naming Patterns

| Type            | Pattern                           | Example                              |
| --------------- | --------------------------------- | ------------------------------------ |
| API Core        | `@molecule/api-[category]`        | `@molecule/api-emails`               |
| API Provider    | `@molecule/api-[category]-[impl]` | `@molecule/api-emails-sendgrid`      |
| API Resource    | `@molecule/api-resource-[name]`   | `@molecule/api-resource-user`        |
| API Utility     | `@molecule/api-utilities-[name]`  | `@molecule/api-utilities-validation` |
| API Middleware  | `@molecule/api-middleware-[name]` | `@molecule/api-middleware-cors`      |
| App Core        | `@molecule/app-[category]`        | `@molecule/app-state`                |
| App Provider    | `@molecule/app-[category]-[impl]` | `@molecule/app-state-zustand`        |
| App UI          | `@molecule/app-ui-[framework]`    | `@molecule/app-ui-react`             |
| API Locale Bond | `@molecule/api-locales-[feature]` | `@molecule/api-locales-user`         |
| App Locale Bond | `@molecule/app-locales-[feature]` | `@molecule/app-locales-forms`        |

**Backend = `api-` prefix. Frontend = `app-` prefix. No exceptions.**

### Naming Decision Checklist

1. Write down the name without context
2. List 3+ different things that name could refer to
3. If you can list multiple → add a qualifier
4. Qualifier = most distinguishing characteristic (e.g., "ai-", "code-", "live-")

## Directory Placement

| Type                | Directory                                   | Example                                  |
| ------------------- | ------------------------------------------- | ---------------------------------------- |
| API Core Interface  | `packages/api/core/[name]/`                 | `packages/api/core/search/`              |
| API Provider (Bond) | `packages/api/bonds/[category]/[provider]/` | `packages/api/bonds/emails/resend/`      |
| API Infrastructure  | `packages/api/infrastructure/[name]/`       | `packages/api/infrastructure/scheduler/` |
| API Resource        | `packages/api/resources/[name]/`            | `packages/api/resources/organization/`   |
| API Middleware      | `packages/api/middleware/[name]/`           | `packages/api/middleware/rate-limit/`    |
| API Utility         | `packages/api/utilities/[name]/`            | `packages/api/utilities/crypto/`         |
| API Staging Driver  | `packages/api/staging/[driver]/`            | `packages/api/staging/docker-compose/`   |
| App Core Interface  | `packages/app/core/[name]/`                 | `packages/app/core/storage/`             |
| App Provider (Bond) | `packages/app/bonds/[category]/[provider]/` | `packages/app/bonds/state/zustand/`      |
| App Feature         | `packages/app/features/[name]/`             | `packages/app/features/charts/`          |
| App Native          | `packages/app/native/[name]/`               | `packages/app/native/haptics/`           |
| App Framework       | `packages/app/frameworks/[name]/`           | `packages/app/frameworks/react/`         |
| API Locale Bond     | `packages/api/locales/[name]/`              | `packages/api/locales/user/`             |
| App Locale Bond     | `packages/app/locales/[name]/`              | `packages/app/locales/forms/`            |

## Module Organization (MANDATORY)

```
src/
├── types.ts           # All type definitions, interfaces, enums
├── provider.ts        # setProvider/getProvider/hasProvider functions
├── constants.ts       # Constants, default values, configuration
├── [feature].ts       # Feature-specific logic
├── utilities.ts       # Utility/helper functions
└── index.ts           # ONLY re-exports - NO implementation code
```

### index.ts Rules

- ONLY `export * from './module.js'` statements
- NEVER `export { name } from './module.js'`
- NEVER `export type { Name } from './module.js'`
- NEVER any implementation code

### Module Responsibilities

| File           | Contains                               | Does NOT Contain                 |
| -------------- | -------------------------------------- | -------------------------------- |
| `types.ts`     | Interfaces, types, enums, type aliases | Functions, classes, runtime code |
| `provider.ts`  | setProvider, getProvider, hasProvider  | Business logic                   |
| `constants.ts` | Default values, configuration objects  | Functions                        |
| `[feature].ts` | Feature-specific functions and logic   | Types (import from types.ts)     |
| `utilities.ts` | Helper functions, pure utilities       | Provider state                   |
| `index.ts`     | `export * from` statements only        | ANY implementation code          |

## Registry Entry (Required for Every Package)

Every package must have an entry in the centralized registry (`mlcl/registry.json`). The `mlcl init` command auto-creates this entry. Individual `package.json` files do NOT contain molecule metadata.

### Registry Entry Fields

**Required for ALL packages:**

| Field         | Purpose                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `type`        | `core`, `provider`, `resource`, `middleware`, `utility`, `infrastructure`, `framework`, `feature`, `native`, `locales` |
| `category`    | Feature group: `database`, `payments`, `auth`, etc.                                                                    |
| `stack`       | `"api"` or `"app"` — which stack the package belongs to                                                                |
| `label`       | Human-readable name for UI menus                                                                                       |
| `description` | Short description for UI hints                                                                                         |
| `language`    | `typescript`, `python`, `go`, etc. (default: `typescript`)                                                             |
| `runtime`     | `node`, `python`, `go`, `deno`, `bun` (default: `node`)                                                                |
| `path`        | Relative path within the molecule monorepo                                                                             |
| `exports`     | Named exports from the package                                                                                         |
| `secrets`     | `{ name, required, default? }[]` (empty array if none)                                                                 |

**Conditional fields:**

| Field                 | When                       | Purpose                                                                           |
| --------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `implements`          | Providers                  | Which core interface this implements                                              |
| `multiSelect`         | Core interfaces            | Whether users can pick multiple providers                                         |
| `alwaysInclude`       | Core/infra                 | Auto-included in every project                                                    |
| `defaultProvider`     | Core interfaces            | Default provider to auto-include                                                  |
| `runtimeDependencies` | Providers                  | Non-molecule npm packages needed                                                  |
| `translates`          | Locales                    | Which feature package this locale bond provides translations for                  |
| `bondWiring`          | Named bond providers       | `{ type: "named", bondCategory: "oauth" }` — identifies named bond categories     |
| `buildTooling`        | Providers                  | Build tool configuration (e.g., Tailwind PostCSS config)                          |
| `appBondSetup`        | App providers              | App-side bond setup configuration                                                 |
| `egressHosts`         | Bonds dialing a vendor API | Hostnames the package dials at runtime — merged into the sandbox egress allowlist |

### Example Registry Entry

```json
{
  "@molecule/api-emails-sendgrid": {
    "language": "typescript",
    "runtime": "node",
    "type": "provider",
    "category": "emails",
    "label": "SendGrid",
    "description": "SendGrid email provider",
    "stack": "api",
    "implements": "@molecule/api-emails",
    "exports": ["provider", "createProvider"],
    "secrets": [{ "name": "SENDGRID_API_KEY", "required": true }],
    "path": "packages/api/bonds/emails/sendgrid",
    "egressHosts": ["api.eu.sendgrid.com", "api.sendgrid.com"]
  }
}
```

### `egressHosts` — required for any bond that dials an external API

A sandbox denies every outbound destination that is not on its egress allowlist, and molecule-dev merges each installed package's `egressHosts` into the project's allowlist. Leave it off a bond that dials a vendor and the vendor call is dropped at the network layer with **no denial signal** — the request just hangs.

- **Verify at the source**: the bond's own `DEFAULT_BASE_URL` / `this.baseUrl = … ?? 'https://…'` literal, or the vendor SDK's default endpoint. Never a doc page, never the `helpUrl` next to it in `secrets.ts`, never a guess.
- **Hostnames only** — no scheme, path, port, whitespace or uppercase (`api.stripe.com`, not `https://api.stripe.com/v1`).
- **`*.apex` is the only wildcard shape.** A middle wildcard (`email.*.amazonaws.com`) is compared as an exact string, so it silently never matches.
- **Never list a dashboard, console or docs host** — those are browser destinations, not hosts the server dials.
- **Omit it** when the destination is entirely user-supplied (self-hosted endpoint, arbitrary webhook, localhost default) — that host belongs in the project's allowlist.

`src/lib/__tests__/egress-hosts.test.ts` enforces both the shape and the coverage (a bond whose source declares a literal base URL must declare hosts).

### Managing Registry Entries Programmatically

```typescript
import { updateRegistryEntry, removeRegistryEntry } from '../lib/registry.js'

// Add or update an entry
updateRegistryEntry('@molecule/api-cache-redis', {
  language: 'typescript',
  runtime: 'node',
  type: 'provider',
  category: 'cache',
  stack: 'api',
  label: 'Redis',
  description: 'Redis cache provider',
  implements: '@molecule/api-cache',
  exports: ['provider'],
  secrets: [{ name: 'REDIS_URL', required: true }],
  runtimeDependencies: [],
  path: 'packages/api/bonds/cache/redis',
})

// Remove an entry
removeRegistryEntry('@molecule/api-cache-redis')
```

## Starting Version — always `1.0.0`

A brand-new package starts at **`1.0.0`**, never at whatever the fleet happens to
be on. It has no history, so there is nothing for a higher number to describe.

This is not cosmetic, because it cannot be undone. On 2026-08-07 the five
`@molecule/api-git-provider*` packages were created at `1.0.2` to "match the
fleet". npm will not accept a version BELOW a package's latest, and unpublishing
is limited to a 72-hour window and burns the name — so `1.0.0` and `1.0.1` can
never exist for those five. Their history now starts mid-sentence, permanently.

Fleet-wide version alignment is not a thing worth having: every package is
versioned independently, consumers pin exact versions, and a shared number
communicates nothing. `mlcl init` writes `1.0.0`; if you are hand-writing a
`package.json`, write `1.0.0` too.

## First Publish — the package must exist before it can be trusted

A new package cannot be published by CI on its own. npm's trust endpoint
requires `"Package MUST exist"`, and its OIDC exchange looks up a package's trust
config — so a name with neither gets
`404 OIDC token exchange error - package not found`, and the release skips it
with a bare `ENEEDAUTH` that reads like an unrelated auth problem.

So a new package needs ONE local publish plus a trust config, both requiring a
2FA code, after which CI owns it forever over OIDC. `npm run trust:new` (in
`molecule/`) does both and the pre-push hook runs it, so this is normally
invisible — but budget for it when adding a package, and do not read that first
`ENEEDAUTH` as a broken pipeline.

(This changed under us: on 2026-08-05 the identical request DID trust unpublished
names — a 910-package sweep reported `not-yet-published: 0` and CI then created
seven of them over OIDC. The same code returned 404 the next day. If a future npm
release restores it, the bootstrap publish can go.)

## Package Structure by Type

### Core Package

```
src/types.ts       → Interface definition
src/provider.ts    → Singleton getter/setter
src/index.ts       → Re-exports only
README.md        → Documents the contract
package.json       → Standard npm fields (no molecule metadata)
```

### Bond Package

```
src/types.ts       → Config types for this implementation
src/provider.ts    → Factory that creates the provider
src/index.ts       → Re-exports
README.md        → Documents secrets, setup steps, bond wiring
package.json       → Standard npm fields with peerDeps
```

### Resource Package

```
src/types.ts               → Resource types
src/schema.ts              → Validation schemas
src/routes.ts              → Declarative route definitions
src/requestHandlerMap.ts   → Maps names → handlers
src/handlers/              → DataStore methods, never raw queries
src/authorizers/           → Auth middleware
setup/                     → SQL migrations (or src/__setup__/ legacy)
README.md / package.json
```

### Locale Bond Package

```
src/types.ts       → Translation key type union + translations record type
src/en.ts          → English translations
src/es.ts          → Spanish translations (... 79 language files total)
src/index.ts       → Re-exports all language files + types
README.md        → Documents languages and translation keys
package.json       → Standard npm fields
```

## Code Templates

### Core Interface

```typescript
// src/types.ts
export interface [Name]Provider {
  // Define methods
}

// src/provider.ts
import type { [Name]Provider } from './types.js'
let currentProvider: [Name]Provider | null = null
export const setProvider = (provider: [Name]Provider): void => { currentProvider = provider }
export const getProvider = (): [Name]Provider => {
  if (!currentProvider) throw new Error('[Name] provider not configured.')
  return currentProvider
}
export const hasProvider = (): boolean => currentProvider !== null

// src/index.ts
export * from './types.js'
export * from './provider.js'
```

### Provider (Bond) — Simple Singleton

```typescript
// src/provider.ts
import type { [Interface] } from '@molecule/api-[category]'

export const provider: [Interface] = {
  // All required interface methods
}

// src/index.ts
export * from './types.js'
export * from './provider.js'
```

### Provider (Bond) — Factory with Lazy Initialization

For providers that need configuration or async connections (database, cache, etc.):

```typescript
// src/provider.ts
import type { [Interface] } from '@molecule/api-[category]'
import type { ProviderOptions } from './types.js'

export const createProvider = (options?: ProviderOptions): [Interface] => ({
  // All required interface methods using options
})

// Lazy-initialized via Proxy — defers createProvider() until first method call
let _provider: [Interface] | null = null
export const provider: [Interface] = new Proxy({} as [Interface], {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})

// src/index.ts
export * from './types.js'
export * from './provider.js'
```

### Provider (Bond) — Adapter Wrapping External SDK

For providers that wrap an external library into the molecule interface:

```typescript
// src/provider.ts — raw SDK functions
export const doSomething = async (opts: SdkOptions) => { /* SDK call */ }
export const doSomethingElse = async (id: string) => { /* SDK call */ }

// src/bondAdapter.ts — adapts SDK to molecule interface
import type { [Interface] } from '@molecule/api-[category]'
import { doSomething, doSomethingElse } from './provider.js'

export const paymentProvider: [Interface] = {
  providerName: '[impl]',
  async method(args) { return doSomething(args) },
  async otherMethod(id) { return doSomethingElse(id) },
}

// src/index.ts
export * from './types.js'
export * from './provider.js'
export * from './bondAdapter.js'
```

### Locale Bond

```typescript
// src/types.ts
export type FormsTranslationKey = 'forms.required' | 'forms.min' | 'forms.max'
export type FormsTranslations = Record<FormsTranslationKey, string>

// src/en.ts
import type { FormsTranslations } from './types.js'
export const en: FormsTranslations = {
  'forms.required': 'This field is required',
  'forms.min': 'Must be at least {{min}}',
  'forms.max': 'Must be at most {{max}}',
}

// src/index.ts
export * from './types.js'
export * from './en.js'
export * from './es.js'
// ... all 79 languages
```

### API Locale Registration (in resource packages)

Each resource package that uses translations creates `src/i18n.ts` to register its locale bond at startup:

```typescript
// src/i18n.ts — in the resource package (e.g., @molecule/api-resource-user)
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-user'
registerLocaleModule(locales)
export const i18nRegistered = true
```

Export from the barrel file: `export * from './i18n.js'`

For resources with multiple locale bonds (e.g., user + user-payments):

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as userLocales from '@molecule/api-locales-user'
import * as paymentLocales from '@molecule/api-locales-user-payments'
registerLocaleModule(userLocales)
registerLocaleModule(paymentLocales)
export const i18nRegistered = true
```

**Error vs content translation:**

- **Errors** — `{ error: t(key), errorKey: key }` — English on server, app translates via key
- **Emails/notifications** — `t(key, values, { locale: userLocale })` — server-side translation using user's locale

### package.json (No molecule metadata)

Package.json files contain standard npm fields only. All molecule metadata lives in the centralized registry (`mlcl/registry.json`).

```json
{
  "name": "@molecule/api-[name]",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": { "build": "tsc", "test": "vitest run" },
  "devDependencies": { "@types/node": "^22.14.0", "typescript": "^5.8.3", "vitest": "^3.0.7" }
}
```

For providers, add `peerDependencies`:

```json
{
  "peerDependencies": { "@molecule/api-[category]": "^1.0.0" }
}
```

## Parallel Creation

When creating multiple packages (e.g., a core interface + its providers, or multiple resources), use parallel subagents — one per package. Each package is independent and can be scaffolded simultaneously.

## Checklist for New Packages

- [ ] Name passes specificity test
- [ ] **`"version": "1.0.0"`** — never the fleet's current number. A package with no history has nothing for a higher version to describe, and it is unfixable: npm refuses a version below a package's latest, so the five `api-git-provider*` packages created at `1.0.2` can never have a `1.0.0`.
- [ ] Core interface defined (if new category)
- [ ] `provider` export has explicit type annotation
- [ ] All required interface methods implemented
- [ ] Peer dependencies declared (core interface as peerDependency)
- [ ] All imports use `.js` extension
- [ ] Registry entry created (via `mlcl init` or `updateRegistryEntry()`)
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Tests written
- [ ] Feature packages with user-visible text: companion locale bond package created (see `/app-patterns` i18n section)
- [ ] Run `mlcl sync-registry` — syncs exports, toolchain, and frameworks into registry.json
- [ ] Run `mlcl sync-docs` — generates/validates README.md from source + registry (never edit README.md manually)
- [ ] **Module-level `@remarks` covers usage gotchas** — README.md is read by molecule.dev's weak executor (Synthase) via `read_molecule_doc`, so the module `@remarks` in `src/index.ts` is where the _negative_ rules a weak model breaks (wrong method names, bare-key filters, top-level bond calls, AUTOINCREMENT PKs) must live. Fix executor misuse HERE, not in molecule-dev's system prompt. (See workspace `AGENTS.md` → "Where executor-facing guidance lives".)
- [ ] PLAN.md updated
- [ ] **First publish + trust** — a new package cannot be published by CI on its own: npm's trust endpoint requires the package to exist, and its OIDC exchange 404s without a trust config, so the release skips it with a bare `ENEEDAUTH`. Run `npm run trust:new` in `molecule/` (the pre-push hook also does) — it publishes once and trusts, after which CI owns every later version over OIDC with no code.
