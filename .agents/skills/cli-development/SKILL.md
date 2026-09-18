---
name: cli-development
description: Guidelines for developing mlcl CLI commands. Centralized registry, AI-driven code generation, scanner behavior, and CLI-specific gotchas.
---

# CLI Development Guidelines

## Core Principle: Centralized Registry, CLI Reads

The CLI must NEVER hardcode stack-specific knowledge. All package metadata and framework configurations (API frameworks like Express, app frameworks like React/Vue/Svelte/Solid/Angular/React Native) live in the **centralized registry** (`mlcl/registry.json`) and are read by the CLI at runtime. Individual `package.json` files do NOT contain molecule metadata.

### How the CLI Uses the Registry

1. **Registry** (`registry.json`) is the single source of truth for all package metadata
2. **`loadRegistry()`** reads the registry and returns `InferredPackage[]`
3. **`create` command** loads the registry, groups providers by `category`/`implements`, builds feature menu dynamically
4. **Feature multi-select** determined by registry entry's `multiSelect` flag
5. **Secrets** collected from selected packages' `secrets` arrays in the registry
6. **Base packages** determined by registry entry's `alwaysInclude: true`
7. **SQL files** discovered by scanner from `setup/*.sql` or `src/__setup__/*.sql`
8. **Project templates** live in template files (`templates/`), not as string literals in code
9. **`mlcl init`** auto-creates registry entries when scaffolding new packages
10. **`mlcl sync-registry`** syncs toolchain versions, framework versions, and export lists with source packages
11. **API framework configs** (Express code-gen patterns, deps) read from `registry.apiFrameworks`
12. **App framework configs** (React/Vue/Svelte/Solid/Angular/React Native deps, tsconfig, vite/metro plugins) read from `registry.appFrameworks`
13. **`requirePackageByRole()`** used instead of `findPackageByRole() ?? '...'` for infrastructure packages — throws immediately if not found

### Anti-Pattern Examples (NEVER DO)

```typescript
// BAD — Hardcoded feature map
const FEATURES = { database: { packages: ['@molecule/api-database'] } }

// BAD — Hardcoded SQL mapping
const sqlMap = { '@molecule/api-resource-user': ['users'] }

// BAD — Hardcoded env defaults
switch (secret) {
  case 'DATABASE_URL':
    return 'postgres://...'
}

// BAD — Hardcoded base packages
const basePackages = ['@molecule/api-resource', '@molecule/api-logger']

// BAD — Project template as string literals
await writeFile('server.ts', `import express from 'express'\n...`)

// BAD — Looking for molecule metadata in package.json (it doesn't exist there)
const meta = packageJson.molecule // Use registry instead

// BAD — Hardcoded fallback for registry lookup
const pkg = findPackageByRole('api', 'infrastructure', 'bond') ?? '@molecule/api-bond'

// GOOD — Throws if not found
const pkg = requirePackageByRole('api', 'infrastructure', 'bond')
```

## AI-Driven Code Generation

The injector uses AI (Anthropic API via `src/lib/ai.ts`) for code generation with heuristic fallback.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  mlcl/registry.json  (centralized index)             │
│  Every package: name, type, category, exports, etc.  │
└──────────────────────┬──────────────────────────────┘
                       │ AI reads full registry
                       ▼
            ┌─────────────────────┐
            │  Phase 1: Planning  │  Registry context
            │  Select packages    │
            └──────────┬──────────┘
                       │ AI reads README.md for selected packages
                       ▼
            ┌─────────────────────┐
            │  Phase 2: Assembly  │  README.md context
            │  Generate wiring    │
            └──────────┬──────────┘
                       │ Template processing
                       ▼
            ┌─────────────────────┐
            │  Phase 3: Output    │  Write files
            └─────────────────────┘
```

### Key Modules

- **`src/lib/ai.ts`** — Anthropic client wrapper. `isAIAvailable()`, `generateCode()`, `generateCodeBatch()`
- **`src/lib/ai-context.ts`** — Context builders:
  - `buildRegistryContext(registry)` — compact text of full registry (~200 bytes/package)
  - `buildPackageContext(packages)` — detailed README.md for selected packages
  - `loadMoleculeMd(pkg)` / `loadMoleculeMdBatch(packages)` — on-demand README.md loading
- **`src/lib/registry.ts`** — Registry I/O: `loadRegistry()`, `getRawRegistry()`, `updateRegistryEntry()`, `removeRegistryEntry()`, `requirePackageByRole()` (throws on missing, replaces `findPackageByRole() ?? '...'`), `loadApiFrameworks()`, `loadAppFrameworks()`

### Dispatch Pattern

Each generation function in the injector checks for AI availability:

```typescript
if (isAIAvailable()) {
  return generateBondSetupCodeAI(...)
}
return generateBondSetupCodeHeuristic(...)
```

The `*Heuristic()` functions contain the deterministic fallback logic. The AI functions read README.md for context-aware code generation.

## AI-First CLI UX

1. Interactive commands ask at most ONE open-ended question
2. All metadata MUST be derivable from description + registry — ZERO manual entry
3. Every parameter has a `--flag` equivalent for programmatic use
4. AI assistants should use `--no-interactive` with full flags
5. Confirmation step shows inferred metadata before proceeding

## Separation of Concerns for Generated Packages

1. Handlers NEVER import concrete drivers — only abstract core interfaces
2. All data access uses DataStore — NEVER raw queries in handlers
3. Database schemas live in `setup/` or `__setup__/` files
4. Routes are declarative — `{ method, path, handler, middlewares }`
5. Optional features use `get.xxx()` at request time (may return undefined)
6. Handler maps use `isBonded.xxx()` at startup to conditionally include routes
7. Core packages export interface + singleton get/set + convenience wrappers

## Scanner Output

The scanner produces `InferredPackage` objects. All metadata comes from the centralized registry (`registry.json`):

```typescript
interface InferredPackage {
  name: string
  type: PackageType
  routes: InferredRoute[] // from routes.ts or registry
  tables: InferredTable[] // from setup/*.sql or registry
  exports: string[] // from index.ts or registry
  moleculeMd: string | undefined
  molecule: RegistryEntry // from registry.json (canonical metadata)
  dependencies: Record<string, string>
  peerDependencies: Record<string, string>
}
```

The injector (`src/lib/injector.ts`) takes `InferredPackage[]` and generates:

- `src/App/router.ts` — routes wired from all resource packages
- `src/server.ts` — Express app with middleware, bonds, error handling
- `src/bonds/index.ts` — provider wiring from detected bond packages
- `src/App/Resource/*/index.ts` — resource wrappers with factory calls
- `src/__tests__/*.test.ts` — smoke tests for server and routes

### Locale Bond Packages

Locale bond packages (`type: "locales"`) are translation data packages. The registry's `translates` field associates them with their feature package. When the CLI scaffolds a project that includes a feature package with translations, it should also suggest/include the companion locale bond.

### Named Bond Categories

The registry's `bondWiring` field on provider entries identifies named-bond categories (like oauth, payments). When `bondWiring.type === 'named'`, the CLI groups providers by `bondWiring.bondCategory` for display and code generation. This replaces hardcoded category checks like `category === 'oauth'`.

## CLI Build Gotchas

- **mlcl uses oclif with `dist/` directory** — ALWAYS run `npm run build` after editing source before testing
- Test with `node bin/run.js`
- **New commands** require running `npx oclif manifest` to regenerate the oclif manifest
- `--force` flag in `inject` only works if conflicting files are in BOTH `plan.conflicts` AND `plan.files`
- `planBondInjection` and `planMiddlewareInjection` must add files to `plan.files` even with conflicts
- Scanner `scanExports()` catches `interface`/`type` keywords — filter PascalCase exports in resource wrapper fallback
- `@molecule/app-ui` has BOTH `setProvider` and `setClassMap` — `findSetterExport` uses bond exports to disambiguate
- Middleware generator adds `RequestHandler` type annotation to avoid TS2742 portability errors
- Service worker needs typed destructuring: `({ url }: { url: URL })` not `({ url })`

## Bond Auto-Wiring

The injector (`src/lib/injector.ts`) automatically discovers and wires bonds without hardcoding any package-specific logic.

### Setter Discovery (`findSetterExport`)

Scans a core interface package's exports for functions starting with `set` or `register` (regex: `/^(set|register)[A-Z]/`).

**Single setter** — uses it directly. No ambiguity.

**Multiple setters** — disambiguates by matching against the bond package's exports. For each setter, it derives the expected export name by stripping the `set`/`register` prefix and lowercasing the first character:

```
setter: "setClassMap" → derived export: "classMap"
setter: "setProvider" → derived export: "provider"
```

If the bond package exports a name matching one of the derived names, that setter wins. Example: `@molecule/app-ui` exports both `setProvider` and `setClassMap`. When wiring `@molecule/app-ui-tailwind` (which exports `classMap`), the injector picks `setClassMap` because `classMap` matches the derived export name.

**No match** — falls back to the first setter in the list.

The function signature: `findSetterExport(interfacePackagePath, bondExports?) → string | null`

### Provider Export Discovery (`findProviderExport`)

Scans a bond package's exports to find the value to pass to the setter. Uses strict priority order:

1. **`provider`** — always wins. This is the modern convention where bond packages export a typed `provider` constant conforming to the core interface.
2. **Setter-derived name** — if a setter name is known, the derived export is tried next (e.g., setter `setClassMap` → looks for `classMap` export).
3. **Well-known names** — in order: `pool`, `logger`, `client`, `transport`. These are legacy/specialized names for specific bond categories.

If none are found, returns `null` and the generated code falls back to importing `provider`.

The function signature: `findProviderExport(bondPackagePath, setterName?) → string | null`

### Named vs Singleton Bond Categories

The injector handles two bond patterns differently in `generateBondSetupCode`:

- **Named bonds** (`@molecule/api-oauth`, `@molecule/api-payments`): Use the `bond()` function — `bond('oauth', serverName, { serverName, verify })` or `bond('payments', 'stripe', paymentProvider)`. The provider name is extracted from the package name suffix or from a `nameExport` field in the registry.
- **Singleton bonds** (everything else): Use the setter/provider pattern — `setTransport(provider)`. The setter is discovered from the interface package by scanning for exports matching `/^(set|register)[A-Z]/`; the provider is discovered from the bond package.

## File Transformation System

The injector uses `FileTransformation` to modify file contents when copying source files to a target project.

### FileTransformation Interface

```typescript
interface FileTransformation {
  type: 'replace-import' | 'replace-path' | 'replace-string'
  from: string // exact string to find (escaped for regex)
  to: string // replacement string
}
```

### Transformation Types

All three types (`replace-import`, `replace-path`, `replace-string`) currently use the same mechanism: a global regex replacement of `from` with `to` via `content.replace(new RegExp(escapeRegExp(from), 'g'), to)`. The distinct type names exist for semantic clarity in injection plans:

- **`replace-import`** — rewrite an import specifier (e.g., `@molecule/api-resource` → `../../resource.js`)
- **`replace-path`** — rewrite a file path reference within generated code
- **`replace-string`** — general-purpose string replacement

### How Transformations Are Applied

During `executeInjection`, file operations with `action: 'copy'` or `action: 'transform'` run `applyTransformation` on the source content for each transformation in the `transformations` array before writing to the target path. The function `escapeRegExp` ensures special regex characters in `from` strings are escaped safely.

### Rollback Safety

The injector tracks all created files in `rollbackFiles`. If any operation throws during execution, all previously created files are deleted via `rm(file, { force: true })`.

## Template Variable Substitution

Template files (`.tpl`) drive project scaffolding and package generation without hardcoding file contents in source code.

### Template Location

Templates live in `mlcl/templates/`, organized by context:

- `templates/api/` — API project skeleton files (server.ts, router.ts, bonds-index.ts, etc.)
- `templates/app/` — App project files, subdivided by framework (`react/`, `vue/`, `svelte/`, `solid/`, `angular/`, `react-native-web/`) and `shared/`
- `templates/package/` — Package scaffolding files, subdivided by type (`core/`, `provider/`, `resource/`, `middleware/`, `utility/`, `framework/`, `feature/`, `native/`)
- `templates/shared/` — Config files shared across project types (eslint, editorconfig)

### Placeholder Syntax

Templates use `{{KEY}}` double-brace placeholders. The `processTemplate` function replaces all occurrences via `content.replaceAll(`{{${key}}}`, value)`.

### Core Functions

- **`processTemplate(content, vars)`** — takes raw template content and a `Record<string, string>` of variables, returns processed content with all placeholders replaced.
- **`loadTemplate(relativePath, vars?)`** — reads a `.tpl` file from `getTemplatesDir()` and runs `processTemplate` on it. Combines file I/O and substitution in one call.
- **`getTemplatesDir()`** — resolves to `templates/` at the repo root (via `__dirname` relative path: `join(__dirname, '..', '..', 'templates')`).
- **`copyTemplateDir(srcDir, destDir, vars)`** — recursively copies a template directory, processing `.tpl` files through `processTemplate` and stripping the `.tpl` extension from output filenames.
- **`copyTemplateFiles(templateDir, targetDir, vars, extraVars?)`** — copies template files with variable substitution; `extraVars` allows passing additional template variables (e.g., `OAUTH_PROVIDERS`).

### Common Template Variables

**Package scaffolding** (`templates/package/`):

- `{{PASCAL_NAME}}` — PascalCase package name (e.g., `EmailTransport`, `AiChat`)
- `{{CLEAN_NAME}}` — kebab-case name without stack/structural prefixes (e.g., `email-transport`)
- `{{TABLE_NAME}}` — SQL table name for resource packages (e.g., `users`, `devices`)
- `{{PROVIDER_PASCAL}}` — PascalCase of provider portion (e.g., `Sendgrid`, `Redis`)
- `{{CATEGORY_PASCAL}}` — PascalCase of category portion (e.g., `Email`, `Cache`)
- `{{PROVIDER_LABEL}}` — lowercase provider identifier (e.g., `sendgrid`, `redis`)
- `{{IMPLEMENTS_IMPORT}}` — conditional import line for core interface (empty string if none)
- `{{IMPLEMENTS_CLAUSE}}` — conditional ` implements XxxProvider` class clause
- `{{PROCESS_ENV_INTERFACE}}` — generated ProcessEnv interface from secrets

**README.md** (`templates/package/README.md.tpl`):

- `{{FULL_NAME}}` — scoped package name (e.g., `@molecule/api-cache-redis`)
- `{{DESCRIPTION}}` — package description
- `{{TYPE}}` — package type (core, provider, resource, etc.)
- `{{IMPLEMENTS_SECTION}}` — optional "Implements" markdown section
- `{{SECRETS_LIST}}` — bullet list of required/optional secrets

**App project** (`templates/app/`):

- `{{PROJECT_NAME}}` — project directory name (used in HTML title, PWA manifest, branding.ts default APP_NAME, og-image)
- `{{OAUTH_PROVIDERS}}` — dynamically derived from selected OAuth packages (e.g., `'github', 'google'`)
- `{{VITE_PLUGIN_IMPORT}}` — framework-specific Vite plugin import line
- `{{VITE_PLUGINS}}` — comma-separated Vite plugin list
- `{{MAIN_ENTRY}}` — entry point path (e.g., `/src/main.tsx`)
- `{{NM_PREFIX}}` — relative path prefix to node_modules (e.g., `..` or `../..` for workspaces)
- `{{FRAMEWORK}}` — framework identifier (react, vue, svelte, solid, angular, react-native-web)
- `{{BRANDING_IMPORT}}` — path to branding.js (e.g., `./src/branding.js` or `./src/lib/branding.js` for Svelte)
- `{{BRANDING_PATH}}` — path to branding.ts for generate-icons script (e.g., `src/branding.ts` or `src/lib/branding.ts`)

**SVG icon/splash templates** (`templates/app/shared/`):

- `{{SIZE}}`, `{{RADIUS}}`, `{{PADDING}}` — PWA icon dimensions (icon.svg.tpl)
- `{{WIDTH}}`, `{{HEIGHT}}` — splash screen dimensions (splash.svg.tpl)
- `{{LOGO_SIZE}}`, `{{LOGO_X}}`, `{{LOGO_Y}}` — logo positioning within icons/splashes
- `{{LOGO_CONTENT}}` — inner SVG content extracted from logo.svg.tpl (used in icon, splash, og-image templates)

**Branding system** (`templates/app/shared/`):

- `branding.ts.tpl` — centralized branding config (APP_NAME, LOGO_SIZE, WEBSITE_URL, APP_DESCRIPTION, BRAND_COLOR). Scaffolded to `src/branding.ts` (or `src/lib/branding.ts` for Svelte).
- `logo.svg.tpl` — default 32x32 Molecule logo. Scaffolded to `public/logo.svg` as the single source. Replace this file + run `npm run generate-icons` to rebrand.
- `generate-icons.mjs.tpl` — regeneration script. Reads `logo.svg` + `branding.ts`, generates 12 files: favicon, 2 PWA icons, 7 splash screens, OG image, and index.html meta tags.
- Locale templates use `{{appName}}` (camelCase = i18n runtime interpolation), not `{{PROJECT_NAME}}` (UPPER_SNAKE = scaffold-time), so the display name comes from branding.ts at runtime.

## Middleware Injection

The injector handles middleware packages as a distinct type alongside resources and bonds.

### How `planMiddlewareInjection` Works

When `planInjection` encounters a package with `type: 'middleware'`, it calls `planMiddlewareInjection`, which:

1. **Extracts the middleware name** from the package name by stripping the `@molecule/api-middleware-` prefix (e.g., `@molecule/api-middleware-cors` becomes `cors`).
2. **Creates a setup file** at `src/middleware/{name}.ts` in the target project.
3. **Checks for conflicts** — if the file already exists, adds a `Conflict` entry with `resolution: 'skip'`. The file operation is always added to `plan.files` so `--force` can overwrite.

### Generated Middleware Setup

The `generateMiddlewareSetup` function scans the package's exports (via `scanExportsFromPath`) and picks one of two patterns:

**Pre-built instance** — if the package exports a name matching the middleware's camelCase name (e.g., `cors`) or `{name}Middleware` (e.g., `corsMiddleware`), it generates a direct re-export:

```typescript
import type { RequestHandler } from 'express'
import { cors } from '@molecule/api-middleware-cors'

export const corsMiddleware: RequestHandler = cors
export { corsMiddleware as default }
```

**Factory function** — otherwise, looks for an export matching `create*` (e.g., `createCorsMiddleware`) and generates a factory call:

```typescript
import type { RequestHandler } from 'express'
import { createCorsMiddleware } from '@molecule/api-middleware-cors'

export const corsMiddleware: RequestHandler = createCorsMiddleware()
export { corsMiddleware as default }
```

The `RequestHandler` type annotation is always included to prevent TypeScript TS2742 portability errors.

### Server Integration

Middleware is wired into the generated server entry point by `generateServerContent`. It dynamically detects middleware packages from the selected molecules and generates the corresponding imports and `app.use()` calls. Middleware ordering follows the natural order: CORS first, then cookie parser, then body parser.

### Ordering Considerations

- CORS middleware must come before route handlers to set proper headers on preflight requests.
- Cookie parser must come before handlers that read `req.cookies`.
- Body parser (or `express.json()` fallback) must come before handlers that read `req.body`.
- If no body parser middleware is installed, the server falls back to `express.json()`.
