---
name: using-mlcl
description: Using the mlcl CLI to create projects, inject packages, swap providers, and manage the registry. Command reference, auto-resolution rules, generated project structure, and operational pitfalls.
---

# Using the mlcl CLI

## Quick Reference

| Command              | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `mlcl create`        | Scaffold a new project (API, app, or full-stack)                         |
| `mlcl inject`        | Run injection on an existing project (regenerate wiring)                 |
| `mlcl add`           | Add a molecule package to an existing project                            |
| `mlcl swap`          | Replace a provider with another implementing the same interface          |
| `mlcl search`        | Search @molecule/* packages by name or capability                        |
| `mlcl templates`     | List the flagship app templates                                          |
| `mlcl agent init`    | Make a coding agent molecule-aware (AGENTS.md + harness files)           |
| `mlcl mcp install`   | Register the molecule MCP server with a coding agent                     |
| `mlcl init`          | Scaffold a new `@molecule/*` package and register it                     |
| `mlcl sync-registry` | Sync registry.json with source packages (exports, toolchain, frameworks) |
| `mlcl sync-docs`     | Generate/validate README.md files from source + registry                 |
| `mlcl validate`      | Validate a molecule package structure and conventions                    |
| `mlcl stage up`      | Deploy a staging environment for the current branch                      |
| `mlcl stage down`    | Tear down a staging environment                                          |
| `mlcl stage list`    | List all active staging environments                                     |
| `mlcl stage status`  | Show status and health of a staging environment                          |
| `mlcl stage logs`    | Show logs from a staging environment                                     |

**Build before using:** mlcl uses oclif — always `cd mlcl && npm run build` before running commands. Test with `node bin/run.js <command>`.

---

## `mlcl create`

Scaffolds a complete project with all wiring, bonds, middleware, routes, tests, and config files.

```bash
mlcl create <NAME> --type <api|app|full-stack> [--framework <react|vue|svelte|solid|angular|react-native-web>] [--packages <comma-list>] [--no-interactive] [--skip-install]
```

### Flags

| Flag               | Required                 | Description                                                      |
| ------------------ | ------------------------ | ---------------------------------------------------------------- |
| `NAME`             | Yes                      | Project directory name (relative to cwd)                         |
| `--type`           | Yes (non-interactive)    | `api`, `app`, or `full-stack`                                    |
| `--framework`      | App/full-stack only      | `react`, `vue`, `svelte`, `solid`, `angular`, `react-native-web` |
| `--packages`       | No                       | Comma-separated `@molecule/*` package names to include           |
| `--no-interactive` | For AI use               | Skip all prompts; requires `--type` and `NAME`                   |
| `--skip-install`   | Recommended in workspace | Skip `npm install` (run it from workspace root instead)          |

### Package Auto-Resolution

You do NOT need to list every package. The CLI auto-resolves several categories:

| Category              | Rule                                                                          | Example                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **alwaysInclude**     | Packages with `alwaysInclude: true` in registry                               | `@molecule/api-bond`, `@molecule/api-logger`, `@molecule/api-resource`, `@molecule/app-auth`, `@molecule/app-http`, etc.                           |
| **defaultProvider**   | When a core package has `defaultProvider` set, that provider is auto-included | `@molecule/api-jwt` auto-includes `@molecule/api-jwt-jsonwebtoken`                                                                                 |
| **templateRequires**  | Framework packages list required dependencies                                 | `@molecule/app-react` auto-includes `@molecule/app-i18n`, `@molecule/app-ui`, `@molecule/app-ui-react`, `@molecule/app-routing-react-router`, etc. |
| **Companion locales** | Locale bonds for included feature/resource packages are auto-detected         | Including `@molecule/api-resource-user` auto-includes `@molecule/api-locales-user`                                                                 |
| **Core interfaces**   | When a provider is included, its core interface is auto-included              | `@molecule/api-database-postgresql` auto-includes `@molecule/api-database`                                                                         |

**What to pass in `--packages`:** Only the explicitly chosen providers, resources, and features. For the current demo set, read `molecule-dev/{api,app}/package.json` — the manifests are the source of truth (the dependency set grows with the platform). A representative slice:

```
@molecule/api-database-postgresql,@molecule/api-emails-mailgun,@molecule/api-oauth-github,@molecule/api-payments-stripe,@molecule/api-resource-user,@molecule/app-auth,@molecule/app-i18n-react-i18next,@molecule/app-state-zustand
```

### Workspace Usage

In the molecule-workspace, `@molecule/*` packages resolve locally via npm workspaces. The workflow is:

```bash
# From mlcl/ directory (NAME is relative to cwd, so ../molecule-dev targets workspace root)
node bin/run.js create ../molecule-dev --type full-stack --framework react --no-interactive --skip-install --packages <list>

# Then install from workspace root (NOT from molecule-dev/)
cd ~/Repos/molecule-workspace && npm install
```

`--skip-install` matters in the workspace because `npm install` inside the created
project directory would resolve the PUBLISHED `@molecule/*` versions from npm,
shadowing the workspace's local links to `molecule/packages/*/dist` — uncommitted
local package changes would silently not apply. Installing from the workspace
root keeps everything resolving through the workspace.

---

## `mlcl inject`

Re-runs the injector on an existing project. Regenerates bonds, routes, middleware, resource wrappers, and tests from the project's current `@molecule/*` dependencies.

```bash
mlcl inject [--dry-run] [--force] [--molecule <name>] [--path <dir>] [--install] [--test]
```

| Flag                         | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `--dry-run`                  | Preview what would change without writing files |
| `--force` / `-f`             | Overwrite existing files and skip confirmation  |
| `--molecule` / `-m`          | Inject only a specific molecule package         |
| `--path` / `-p`              | Target project path (default: `.`)              |
| `--install` / `--no-install` | Run npm install after injection                 |
| `--test` / `--no-test`       | Run smoke tests after injection                 |

### What inject generates

| File                           | Content                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `src/bonds/index.ts`           | Secret resolution + all `setupXxx()` calls              |
| `src/bonds/*.ts`               | Individual bond setup files (setter + provider import)  |
| `src/App/router.ts`            | Route wiring from all resource packages                 |
| `src/App/Resource/*/index.ts`  | Resource wrappers (re-export requestHandlerMap)         |
| `src/server.ts`                | Express app with middleware, bonds, error handling      |
| `src/middleware/*.ts`          | Middleware setup files                                  |
| `src/__tests__/routes.test.ts` | Route smoke tests with vi.mock for all @molecule/* deps |
| `src/__tests__/server.test.ts` | Server startup smoke test                               |

---

## `mlcl add`

Adds a molecule package to an existing project's `package.json` and triggers injection.

```bash
mlcl add @molecule/api-resource-organization [--no-install] [-D]
```

---

## `mlcl swap`

Replaces one provider with another that implements the same core interface.

```bash
mlcl swap @molecule/api-database-mysql [--replace @molecule/api-database-postgresql] [--no-interactive] [--install] [--format]
```

For categories with a single provider, `--replace` is auto-detected. For multi-provider categories (oauth, payments), specify `--replace` to indicate which provider to swap out.

---

## `mlcl init`

Scaffolds a new `@molecule/*` package with proper directory structure, boilerplate files, and registry entry.

```bash
mlcl init --name api-cache-redis --type provider --category cache --description "Redis cache" --implements @molecule/api-cache --stack api --no-interactive
```

Auto-creates the registry entry in `registry.json`. See the `/create-package` skill for full details on package types, naming, and conventions.

---

## `mlcl sync-registry`

Syncs `registry.json` with the actual source packages.

```bash
mlcl sync-registry                 # Run all syncs
mlcl sync-registry --scan-exports  # Refresh export lists from source
mlcl sync-registry --sync-toolchain  # Sync dev dependency versions
mlcl sync-registry --sync-frameworks # Sync framework dep versions
mlcl sync-registry --check         # CI: exit non-zero if out of sync
mlcl sync-registry --dry-run       # Preview changes
```

**When to run:**

- After adding/removing/renaming exports in any molecule package → `--scan-exports`
- After upgrading dependencies in `mlcl/package.json` or molecule packages → `--sync-toolchain`
- After upgrading framework dependencies → `--sync-frameworks`
- Before committing, as a safety check → `--check`

---

## `mlcl sync-docs`

Generates README.md documentation files from source code + registry.

```bash
mlcl sync-docs --generate                          # Generate all README.md files
mlcl sync-docs --generate -p @molecule/api-logger  # Single package
mlcl sync-docs --check                             # CI: exit non-zero if stale
mlcl sync-docs --fix                               # Auto-fix mechanical sections
```

**When to run:** After modifying exports, JSDoc, registry metadata, or peer dependencies. See the README.md Generation section in `mlcl/AGENTS.md` for details.

---

## `mlcl stage up`

Deploys a staging environment for the current branch (or a specified branch). Uses the staging driver system — an abstract `StagingDriver` interface with swappable implementations (currently Docker Compose).

```bash
mlcl stage up                          # Deploy for current git branch
mlcl stage up --branch feature/login   # Deploy for a specific branch
mlcl stage up --skip-build             # Skip pre-build step
mlcl stage up --driver docker-compose  # Specify driver (default: first available)
mlcl stage up --project-path ../myapp  # Specify project root
```

### What it does

1. Detects git branch (or uses `--branch`)
2. Generates a URL-safe slug from the branch name
3. Loads the staging driver from the registry (`stagingDrivers` section)
4. Checks driver prerequisites (e.g., Docker installed)
5. Allocates unique ports for API, app, and database
6. Builds the project (skipped if driver has `handlesBuilds: true`)
7. Deploys via the driver (generates Dockerfiles, compose file, starts containers)
8. Saves environment state to `.molecule/staging/state.json`
9. Reports URLs for API and app

### Docker Compose driver details

The Docker Compose driver generates all deployment artifacts in `.molecule/staging/`:

- `Dockerfile.api` — Multi-stage Node.js build + runtime
- `Dockerfile.app` — Multi-stage Node.js build + Nginx serve (uses Docker `ARG` for Vite build-time env vars)
- `nginx.conf` — SPA-compatible config with `try_files` and static asset caching
- `docker-compose.staging-{slug}.yml` — Compose file with API, app, and database services
- `.env.staging.{slug}` — Environment-specific variables (layered with `.env` and `.env.staging`)

**Vite env vars**: The app Dockerfile uses `ARG VITE_API_URL` → `ENV VITE_API_URL=$VITE_API_URL` before `RUN npm run build`, ensuring Vite inlines the correct value at build time. The compose file passes this via `build.args`.

---

## `mlcl stage down`

Tears down a staging environment.

```bash
mlcl stage down                          # Tear down current branch's environment
mlcl stage down --branch feature/login   # Tear down specific branch
mlcl stage down --all                    # Tear down all staging environments
```

Stops containers, removes compose file, Dockerfiles, nginx.conf, and env files. Updates state.

---

## `mlcl stage list`

Lists all active staging environments with their status, ports, and URLs.

```bash
mlcl stage list
mlcl stage list --project-path ../myapp
```

---

## `mlcl stage status`

Shows detailed status and health of a staging environment.

```bash
mlcl stage status                          # Status for current branch
mlcl stage status --branch feature/login   # Status for specific branch
```

Runs driver health checks (e.g., hits `/health` endpoint) and reports service status.

---

## `mlcl stage logs`

Shows logs from a staging environment's services.

```bash
mlcl stage logs                          # Logs for current branch
mlcl stage logs --branch feature/login   # Logs for specific branch
mlcl stage logs --service api            # Logs from specific service
mlcl stage logs --follow                 # Follow logs (tail -f)
```

---

## Generated Project Structure

After `mlcl create my-project --type full-stack --framework react`:

```
my-project/
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.ts              # Express app: middleware → bonds → routes → listen
│   │   ├── bonds/
│   │   │   ├── index.ts           # resolveAll(secrets) + all setup calls
│   │   │   ├── ai-anthropic.ts    # setupAiAnthropic: setProvider(provider)
│   │   │   ├── database-postgresql.ts
│   │   │   ├── emails-mailgun.ts
│   │   │   └── ...                # One file per bond
│   │   ├── middleware/
│   │   │   ├── cors.ts            # export const corsMiddleware: RequestHandler
│   │   │   ├── body-parser.ts
│   │   │   └── cookie-parser.ts
│   │   ├── App/
│   │   │   ├── router.ts          # All resource routes wired to Express Router
│   │   │   └── Resource/
│   │   │       ├── User/index.ts       # Re-exports from @molecule/api-resource-user
│   │   │       ├── Device/index.ts
│   │   │       ├── Project/index.ts
│   │   │       └── Conversation/index.ts
│   │   └── __tests__/
│   │       ├── routes.test.ts     # Resource handler smoke tests
│   │       └── server.test.ts     # Server startup smoke test
│   └── setup/
│       └── *.sql                  # Database migrations from resource packages
├── app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html                 # Meta tags (title, description, OG, theme-color)
│   ├── scripts/
│   │   └── generate-icons.mjs     # Regenerates icons + meta from logo.svg + branding.ts
│   ├── public/
│   │   ├── logo.svg               # Single-source logo (replace this to rebrand)
│   │   ├── favicon.svg            # Copy of logo.svg (generated)
│   │   ├── og-image.svg           # Social preview image (generated)
│   │   └── icons/
│   │       ├── icon-192.svg       # PWA icon (generated)
│   │       ├── icon-512.svg       # PWA icon (generated)
│   │       └── splash-*.svg       # 7 Apple splash screens (generated)
│   └── src/
│       ├── main.tsx               # App entry point
│       ├── branding.ts            # APP_NAME, LOGO_SIZE, WEBSITE_URL, APP_DESCRIPTION, BRAND_COLOR
│       ├── bonds.ts               # App-side bond wiring
│       ├── App.tsx                # Root component
│       └── ...
├── .env.example
└── .editorconfig
```

### Bond Setup File Pattern

Each bond file in `src/bonds/` follows this pattern:

```typescript
// src/bonds/database-postgresql.ts
import { setPool } from '@molecule/api-database'
import { pool } from '@molecule/api-database-postgresql'

export function setupDatabasePostgresql(): void {
  setPool(pool)
}
```

The setter is auto-discovered from the core interface package's exports (matching `/^(set|register)[A-Z]/`), and the provider export is auto-discovered from the bond package (priority: `provider` > setter-derived name > well-known names).

### Resource Wrapper Pattern

Each resource in `src/App/Resource/*/index.ts` re-exports from the molecule package:

```typescript
export { requestHandlerMap } from '@molecule/api-resource-project'
```

Or for resources with factory-created handler maps:

```typescript
export { requestHandlerMap } from '@molecule/api-resource-device'
// (device exports requestHandlerMap via createRequestHandlerMap)
```

---

## Operational Pitfalls

### Workspace links lost / wrong versions after npm install

**Cause:** Running `npm install` inside `molecule-dev/api` or `molecule-dev/app` instead of the workspace root — the nested install resolves published registry copies instead of the workspace links (and can shadow them).
**Fix:** Always `cd ~/Repos/molecule-workspace && npm install`.

### TypeScript errors after mlcl create

**Cause:** molecule packages not built before running create, or stale builds.
**Fix:** Rebuild in order: `cd molecule && npm run build`, then `cd mlcl && npm run build`, then retry.

### Bond type mismatch (e.g., "Middleware is not assignable to JsonParserFactory")

**Cause:** The injector picked the wrong setter/provider pair. This happens when a core interface has multiple setters.
**Fix:** Check `findSetterExport()` logic in `mlcl/src/lib/injector.ts`. When `provider` is in the bond's exports, the injector should pick the "simple" setter (whose derived name doesn't match a specific bond export). See the `/cli-development` skill for the full algorithm.

### Missing requestHandlerMap in generated resource wrappers

**Cause:** The resource package's `src/index.ts` doesn't re-export from `./requestHandlerMap.js`.
**Fix:** Add `export * from './requestHandlerMap.js'` and `export * from './routes.js'` to the resource package's index.ts, then run `mlcl sync-registry --scan-exports`.

### sync-registry --check fails in CI

**Cause:** Exports, toolchain versions, or framework versions drifted.
**Fix:** Run `mlcl sync-registry` (no flags = run all syncs), then commit the updated `registry.json`.

### README.md generation shows wrong exports

**Cause:** Registry's export list is stale.
**Fix:** `mlcl sync-registry --scan-exports` first, then `mlcl sync-docs --generate`.

### Tests time out (5s) in generated smoke tests

**Cause:** `vi.importActual` bypasses mocks and loads real `@molecule/*` modules with heavy dependencies.
**Fix:** Use regular `import` (which uses mocked modules) instead of `vi.importActual` in generated test files.

### "No test files found" exits with code 1

**Cause:** App project has no test files but vitest runs with `vitest run`.
**Fix:** Use `vitest run --passWithNoTests` in the app's test script (this is handled by the scaffold).

---

## Post-Create Workflow

After creating a project:

1. **Install dependencies** — from workspace root: `npm install`
2. **Build** — `cd molecule-dev/api && npm run build` and `cd molecule-dev/app && npm run build`
3. **Test** — `cd molecule-dev/api && npm test` and `cd molecule-dev/app && npm test`
4. **Configure .env** — Copy `.env.example` to `.env` and fill in secret values (API keys, database URL, etc.)
5. **Run database migrations** — Execute SQL files in `api/migrations/` (resource DDL in `api/__setup__/`) against your database
6. **Start dev server** — `cd molecule-dev && npm run dev` (or run api and app separately)

### Customizing branding

Edit `app/src/branding.ts` to set `APP_NAME`, `APP_DESCRIPTION`, `WEBSITE_URL`, and `BRAND_COLOR`. To replace the logo:

1. Replace `app/public/logo.svg` with a custom SVG (32×32 viewBox recommended)
2. Run `cd app && npm run generate-icons`

This regenerates 12 files: favicon, 2 PWA icons, 7 splash screens, OG image, and index.html meta tags. The display name (`APP_NAME`) is used at runtime via i18n interpolation in the header, footer, auth pages, and privacy policy — no need to re-scaffold.

### Adding packages to an existing project

```bash
cd molecule-dev/api
mlcl add @molecule/api-resource-organization
# This adds the dep to package.json and triggers injection to wire it in
```

Or manually: add the dependency to `package.json`, then run `mlcl inject` to regenerate bonds/routes/tests.

### Swapping providers

```bash
cd molecule-dev/api
mlcl swap @molecule/api-database-mysql
# Replaces @molecule/api-database-postgresql with @molecule/api-database-mysql
# Updates package.json, bonds, and .env
```
