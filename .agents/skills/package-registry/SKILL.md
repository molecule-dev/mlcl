---
name: package-registry
description: Look up existing molecule packages, check what exists in a category, or find package locations. Uses the centralized registry (mlcl/registry.json).
---

# Molecule Package Registry

**Source of truth: `mlcl/registry.json`** — the centralized registry file that contains metadata for all molecule packages. The CLI reads this file at runtime via `src/lib/registry.ts`.

To look up packages programmatically, use `loadRegistry('api' | 'app')` which returns `InferredPackage[]` from the registry. Use `getRawRegistry()` to get the raw `Registry` object.

To validate package placement: `npx tsx scripts/validate-packages.ts`

## Registry Structure

```json
{
  "version": 1,
  "packages": {
    "@molecule/api-database": {
      "language": "typescript",
      "runtime": "node",
      "type": "core",
      "category": "database",
      "label": "Database",
      "description": "Abstract database interface",
      "stack": "api",
      "defaultProvider": "@molecule/api-database-postgresql",
      "alwaysInclude": true,
      "exports": ["query", "setProvider", "getProvider"],
      "secrets": [],
      "path": "packages/api/core/database"
    }
  }
}
```

## Key Fields

| Field          | Purpose                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `language`     | `"typescript"`, `"python"`, `"go"`, etc.                                                                                                                 |
| `runtime`      | `"node"`, `"python"`, `"go"`, `"deno"`, `"bun"`                                                                                                          |
| `type`         | **Required.** `"core"`, `"provider"`, `"resource"`, `"middleware"`, `"utility"`, `"infrastructure"`, `"framework"`, `"feature"`, `"native"`, `"locales"` |
| `category`     | **Required.** Feature group: `database`, `payments`, `auth`, etc.                                                                                        |
| `stack`        | **Required.** `"api"` or `"app"` — which stack this package belongs to                                                                                   |
| `label`        | **Required.** Human-readable name for UI menus                                                                                                           |
| `description`  | **Required.** Short description for UI hints                                                                                                             |
| `path`         | **Required.** Relative path within the molecule monorepo                                                                                                 |
| `exports`      | **Required.** Named exports from the package                                                                                                             |
| `secrets`      | **Required.** `{ name, required, default? }[]` (empty array if none)                                                                                     |
| `implements`   | Providers only. Which core interface this implements                                                                                                     |
| `bondWiring`   | `{ type: "named", bondCategory: "oauth" }` — named bond metadata                                                                                         |
| `buildTooling` | Build tool configuration for the package                                                                                                                 |
| `appBondSetup` | App-side bond setup configuration                                                                                                                        |

## Registry Management

- **`mlcl init`** — auto-creates a registry entry when scaffolding a new package
- **`mlcl sync-registry`** — syncs toolchain versions, framework versions, and export lists
- **`updateRegistryEntry(name, entry)`** — programmatically add/update an entry
- **`removeRegistryEntry(name)`** — programmatically remove an entry
- **`requirePackageByRole(stack, type, category)`** — looks up infrastructure packages, throws if not found (replaces `findPackageByRole() ?? '...'`)
- **`loadApiFrameworks()`** — returns API framework configurations from registry
- **`loadAppFrameworks()`** — returns app framework configurations from registry

Individual `package.json` files do NOT contain molecule metadata. The registry is the single source of truth. Every entry MUST include `type`, `category`, `stack` (`"api"` or `"app"`), `label`, `description`, `language`, `runtime`, and `path`.

## Package Lookup Examples

```typescript
import { loadRegistry, getRawRegistry } from '../lib/registry.js'

// Load all packages, optionally filtered by stack
const allPackages = loadRegistry()
const apiPackages = loadRegistry('api')

// Filter by type
const cores = allPackages.filter((p) => p.type === 'core')
const providers = allPackages.filter((p) => p.type === 'provider')

// Find providers for a core interface
const emailProviders = allPackages.filter((p) => p.molecule?.implements === '@molecule/api-emails')

// Direct registry access
const registry = getRawRegistry()
const entry = registry.packages['@molecule/api-database']

// Look up infrastructure packages (throws on missing)
const bondPkg = requirePackageByRole('api', 'infrastructure', 'bond')

// Load framework configs
const apiFrameworks = loadApiFrameworks() // { express: { ... } }
const appFrameworks = loadAppFrameworks() // { react: { ... }, vue: { ... }, ... }
```

## Package Categories (stable structure)

| Type                | Directory                           | Prefix                  | Example                                |
| ------------------- | ----------------------------------- | ----------------------- | -------------------------------------- |
| API Core Interface  | `api/core/`                         | `api-`                  | `@molecule/api-emails`                 |
| API Bond (Provider) | `api/bonds/{category}/{impl}/`      | `api-{category}-{impl}` | `@molecule/api-emails-sendgrid`        |
| API Infrastructure  | `api/infrastructure/`               | `api-`                  | `@molecule/api-bond`                   |
| API Resource        | `api/resources/`                    | `api-resource-`         | `@molecule/api-resource-user`          |
| API Middleware      | `api/middleware/`                   | `api-middleware-`       | `@molecule/api-middleware-cors`        |
| API Utility         | `api/utilities/`                    | `api-utilities-`        | `@molecule/api-utilities-validation`   |
| API Testing/CI      | `api/testing/`, `api/ci/`           | `api-`                  | `@molecule/api-testing`                |
| API Staging         | `api/core/staging/`, `api/staging/` | `api-staging-`          | `@molecule/api-staging-docker-compose` |
| App Core Interface  | `app/core/`                         | `app-`                  | `@molecule/app-state`                  |
| App Bond (Provider) | `app/bonds/{category}/{impl}/`      | `app-{category}-{impl}` | `@molecule/app-state-zustand`          |
| App Feature         | `app/features/`                     | `app-`                  | `@molecule/app-rich-text`              |
| App Native          | `app/native/`                       | `app-`                  | `@molecule/app-haptics`                |
| App Framework       | `app/frameworks/`                   | `app-`                  | `@molecule/app-react`, `app-ui-react`  |

## Directory Layout

```
packages/
├── api/
│   ├── core/           # Abstract interfaces (types only)
│   ├── bonds/          # Provider implementations (grouped by category)
│   ├── infrastructure/ # bond, resource, push-notifications
│   ├── resources/      # Business logic resources (user, device, etc.)
│   ├── middleware/      # Express middleware
│   ├── utilities/      # Utility packages
│   ├── testing/        # Testing utilities
│   ├── ci/             # CI/CD utilities
│   └── staging/        # Staging driver implementations
└── app/
    ├── core/           # Frontend abstract interfaces
    ├── bonds/          # Frontend provider implementations
    ├── features/       # Domain-specific libraries (IDE, charts, maps)
    ├── frameworks/     # Framework bindings + UI (react, vue, svelte, solid, angular, react-native)
    └── native/         # Native capability packages (23 packages)
```

## Framework Configurations

The registry also contains `apiFrameworks` and `appFrameworks` sections that define framework-specific code generation patterns, dependencies, and build configurations. These replace hardcoded maps in CLI code.

- `apiFrameworks` — Express (and future frameworks): router/server imports, middleware types, dependencies
- `appFrameworks` — React/Vue/Svelte/Solid/Angular/React Native Web: runtime deps, dev deps, tsconfig overrides, Vite plugin configs
