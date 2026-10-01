# AGENTS.md — AI Guidelines for molecule.dev Packages

> **Parallel-agent machine:** before a release, any `npm install`, or killing a
> process, register with the shared presence registry:
> `node ../scripts/agent-presence.mjs register --repo mlcl --work "<what>"`
> then `list` / `claim --exclusive release` / `verify --pid <pid>` — see
> `../docs/agent-presence.md`. Claude Code sessions are auto-registered by hook.

## The Decoupling Principle

Before writing any import, literal value, or function call, apply this test:

> **"If we swapped out the implementation behind this (different provider, different framework, different library, different database), would this line need to change?"**
>
> If yes → you are coupling to an implementation. Fix it:
>
> - **Importing a concrete driver in a handler?** → Use the abstract core interface instead.
> - **Hardcoding a value that belongs to another package?** → Read it from that package's metadata at runtime.
> - **Using a platform-specific API directly?** → Accept it as an injectable parameter.
> - **Writing CSS utility classes like `"flex p-4 text-sm"`?** → These are Tailwind. Use `getClassMap()` from `@molecule/app-ui` instead. The ONLY package that may contain Tailwind classes is `@molecule/app-ui-tailwind`.
> - **Writing raw SQL in handler code?** → Use the abstract `DataStore` methods.

This single principle generates every specific rule below. When in doubt, return to this test.

---

## Project Overview

The `mlcl` CLI manages `@molecule/*` packages — a modular, composable ecosystem for full-stack TypeScript apps. The architecture prioritizes **maximum composability and swappability** through abstract interfaces and runtime wiring.

- Backend packages: `@molecule/api-*`
- Frontend packages: `@molecule/app-*`
- Bond wiring: `import { bond } from '@molecule/api-bond'` → `bond('email', provider)` at startup (or `bond('ai', 'anthropic', provider)` for named multi-provider categories)
- Core packages define contracts (interfaces only, zero implementation)
- Provider/bond packages implement those contracts and are swappable

Repo layout beyond `src/` (agent-facing surfaces — keep their docs in sync):

- `mcp/` — the `molecule-mcp` package (own package.json, not an npm workspace
  member). stdio mode wraps this CLI; `remote.ts`/`http.ts` are the hosted
  read-only face, live at `https://mcp.molecule.dev/mcp` (Fly app `molecule-mcp`; deploy: mcp/DEPLOY.md).
  **Invariant:** `mcp/assets/conventions.md` is a copy of
  `templates/shared/agent-init-section.md.tpl` — update both together.
- `integrations/claude-code/` — the Claude Code plugin + marketplace skeleton;
  launch runbook in its README.
- `docs/` — user-facing guides (AGENTS-AND-HARNESSES, INTEGRATE-EXISTING-APP,
  FROM-VIBECODING, LISTINGS). These ship on GitHub and in the npm tarball (files array includes /docs) — no internal narrative.

---

## Dogfooding Principle

Molecule is a general-purpose composable platform — not limited to any specific type of application. Status pages, admin panels, CLI tools, microservices, edge workers: if it runs TypeScript, it should use @molecule packages.

When building any new tool, service, or project type within the Molecule ecosystem:

- **Always use existing @molecule packages** (database, i18n, bonds, config, secrets, etc.)
- **Create new @molecule packages** for missing capabilities rather than hardcoding one-off implementations
- **Never bypass the ecosystem** with standalone libraries that duplicate what a bond could provide
- If a package doesn't exist yet for a capability you need, that's a signal to create it — not to work around the ecosystem

This ensures every project type validates the architecture, surfaces missing features, and grows the ecosystem.

---

## Always-Follow Rules

These apply to EVERY task, regardless of what you're working on:

### 1. Centralized Registry, CLI Reads

The CLI must NEVER hardcode stack-specific knowledge. Package metadata (category, secrets, provider options, SQL files) and framework configurations (API frameworks like Express, app frameworks like React/Vue/Svelte/Solid/Angular/React Native) all live in the **centralized registry** (`mlcl/registry.json`) and are read by the CLI at runtime. The registry is auto-updated when packages are created via `mlcl init`. Adding a new package or framework should NEVER require modifying CLI source code. Individual `package.json` files do NOT contain molecule metadata — the registry is the single source of truth. Use `requirePackageByRole()` (not `findPackageByRole() ?? '...'`) to ensure lookup failures surface immediately.

### 2. Module Organization

Split code into logical modules. NEVER put implementation code in `index.ts`.

```
src/
├── types.ts        # Types, interfaces, enums only
├── provider.ts     # setProvider/getProvider/hasProvider
├── [feature].ts    # Feature-specific logic
├── utilities.ts    # Helper functions
└── index.ts        # ONLY `export * from './module.js'` — no named re-exports, no implementation
```

**Rule:** Always `export * from './module.js'` in barrel files. Never `export { name } from` or `export type { Name } from`.

### 3. ESM with .js Extensions

All imports MUST use `.js` extensions. TypeScript, ES2022, NodeNext module resolution.

### 4. Typed Provider Exports

Every provider MUST export a typed constant: `export const provider: InterfaceType = { ... }`. Never omit the type annotation. Core interface is always a `peerDependency`.

### 5. No Concrete Dependencies in Core Packages

Core packages (`api/core/`, `app/core/`) contain ONLY interfaces and types. Zero implementation code, zero concrete library imports.

### 6. Zero Tailwind Outside the Tailwind Bond

The string `"flex"`, `"p-4"`, `"text-sm"`, `"items-center"`, or ANY Tailwind utility class must NEVER appear in any package except `@molecule/app-ui-tailwind` (the ClassMap bond). This includes templates, components, tests, and generated code. If you are writing a `className` with utility classes, you are coupling to Tailwind. Use `getClassMap()` from `@molecule/app-ui` instead. If swapping Tailwind for Bootstrap, only the ClassMap bond should change — nothing else.

### 7. No Raw SQL in Handlers

Handler code uses abstract DataStore methods (`findOne`, `create`, `updateById`). Raw SQL only in database bond packages, migration scripts, or complex queries wrapped in dedicated functions.

### 8. No Hardcoded Storage

Never use `localStorage`/`sessionStorage`/`AsyncStorage` directly. Accept `StorageAdapter` as a parameter. Default to in-memory, not localStorage.

### 9. Package Naming

- Backend: `@molecule/api-*`, Frontend: `@molecule/app-*`
- Names must be specific enough to be unambiguous. Ask: "Could this name mean something else?" If yes, add a qualifier (e.g., `app-ai-chat` not `app-chat`).

### 10. Registry Entry (Required for Every Package)

Every package must have an entry in `mlcl/registry.json` with at minimum: `type`, `category`, `stack` (`"api"` or `"app"`), `label`, `description`, `language`, `runtime`, `path`. Providers also need `implements` and `secrets`. (Locale bonds carry no special field — the feature they translate is inferred from the package name, see `inferTranslatedPackage` in `docs-generator.ts`.) The `mlcl init` command auto-creates registry entries. Individual `package.json` files do NOT contain molecule metadata — the registry is the single source of truth.

### 11. Exact Dependency Pinning

All versions in `dependencies`, `devDependencies`, and `optionalDependencies` must be **exact** — no `^`, `~`, `*`, `>=`, or ranges. The only exception is `peerDependencies` (which may use ranges for npm compatibility). This applies to:

- All `@molecule/*` package.json files
- Generated project package.json files (molecule-dev, scaffolded projects)
- mlcl's own package.json
- CLI code that writes versions (injector, scaffold, swap, add commands)

Enforced by `.npmrc` with `save-exact=true`. When writing code that touches dependency versions, always verify pinning. Never prefix versions with `^` or `~`.

### 12. All UI Text Through i18n

Never hardcode user-visible strings (labels, placeholders, messages, aria-labels) in components or templates. Use `t('key', values, { defaultValue: 'English fallback' })` from `@molecule/app-i18n` or the framework-specific `useTranslation()` hook. Translations live in **companion locale bond packages** (`@molecule/{stack}-locales-{name}`), NOT embedded in feature packages. Each locale bond provides type-safe translations in 79 languages. UI primitives accept optional string props with English defaults. Templates include `locales/` with all translations.

---

## Anti-Patterns (Never Do These)

1. Concrete dependencies in core packages
2. Returning raw provider types instead of normalized interfaces
3. Skipping peer dependencies for interfaces
4. Hardcoded configuration instead of env vars via `@molecule/api-config`
5. Implementation leakage — exposing provider internals in public API
6. Hardcoded stack knowledge in CLI code (feature maps, secret lists, SQL mappings) — use the centralized registry
7. Non-conformant provider exports (loose functions instead of typed `provider` object)
8. Async-only providers without synchronous lazy-initialized export
9. Named re-exports in barrel files (`export { X } from`) instead of `export * from`
10. Tailwind classes (`"flex"`, `"p-4"`, `"text-sm"`, etc.) in ANY package other than `@molecule/app-ui-tailwind`
11. Hardcoded UI text — English strings directly in JSX/templates instead of `t('key')` calls
12. Embedding translations in feature packages — translations belong in companion locale bond packages (`@molecule/{stack}-locales-{name}`), not in the feature package's `translations.ts`
13. Unpinned dependency versions — writing `^1.0.0` or `~2.3.0` in dependencies/devDependencies instead of exact `1.0.0` or `2.3.0`

---

## Sync Requirement

After creating or modifying packages, **always run the CLI sync commands** — never manually edit `registry.json` exports or README.md files:

```bash
cd mlcl && npm run build
node bin/run.js sync-registry    # Sync exports, routes, tables, toolchain, frameworks
node bin/run.js sync-docs        # Regenerate/validate all README.md files
```

Also update the plan doc in the workspace `internal/mlcl/plans/` to mark completed items.

### Why this is easy to forget — and what guards it

`registry.json` lives in **mlcl**, but a package's exports (the source of truth)
live in the **molecule** repo. They are separate repos: a changed export drifts
the registry silently, mlcl's CI never checks out molecule, and nothing reconciles
them but a manual `sync-registry --scan-exports`. (This is how the then-815-package fleet' export
lists went stale once — every component package's `.tsx` re-exports recorded as a
bare `"*"`.)

A resource's declarative **`routes`** (`src/routes.ts`) drift the same way, and
there the registry copy is load-bearing rather than a cache: a published package
ships only `dist/`, so when a scaffold runs against npm-installed packages (every
production sandbox) there is no `routes.ts` to scan and the registry is the ONLY
source of routes — a stale entry wires stale routes and an absent entry wires
none. `routes` used to be written once at `mlcl init` and then hand-edited:
project's entry carried `authenticate` (the global auth marker, applied app-wide
via `verifyMiddleware()` — not a key of project's `requestHandlerMap`) for
months, so every scaffold emitted `Project.authenticate` (TS2339), and 47 of 53
route-eligible entries had no routes at all. `sync-registry --scan-routes` (part
of the default sync) now derives them from source through the scanner, whose
handler-map filter is what keeps `Resource.<unknown>` out of the generated
router. The filter is by map MEMBERSHIP, never by name — grade keys its own
`authenticate` authorizer and keeps it. Guards, in order of when they fire:

- **molecule pre-commit** (`molecule/.husky/pre-commit`) — the primary gate. When
  you commit a change under any `packages/*/src/`, it runs the scoped export- and
  route-drift check (only the staged packages, so it stays fast under parallel
  agents) and fails the commit if `registry.json` is stale, naming the fix. Runs
  via tsx against mlcl source — no build needed. Skips gracefully if mlcl is
  absent or its deps aren't installed (e.g. a standalone molecule clone).
- **`npm run verify:registry-exports`** (mlcl or workspace root) — run the same
  check manually over the whole fleet (`mlcl/scripts/check-registry-exports.mjs`,
  via tsx; pass package paths to scope it). Build-independent: the scanner subgraph
  imports no `@molecule/*` packages, so it works even in a checkout without the
  sibling `molecule` repo present (the published fleet covers the imports).
- **`npm test`** (mlcl) — `registry.test.ts` carries the same two drift guards
  as unit tests (tables, routes), so a stale registry fails the suite.
- **`npm run registry:check`** (mlcl) / **`npm run verify:registry`** (workspace
  root) — the comprehensive `sync-registry --check`: exports, routes **and** tables,
  toolchain, frameworks. Needs a full build; the published fleet installs fine in
  an mlcl-only checkout now that `@molecule/*` is on npm, but the full
  molecule-side build is still workspace-only.
- **mlcl CI `registry-sync` job** (`.github/workflows/ci.yml`) — the only gate that
  catches drift introduced from the molecule side without an mlcl commit. It checks
  out **both** repos as siblings and runs `verify:registry-exports` (the tsx,
  build-free export check) on every push/PR. Inert until enabled: set the repo
  **variable** `REGISTRY_SYNC_CHECK=true`. `molecule` is a public repo, so no
  token/secret is needed (the default `GITHUB_TOKEN` checks it out anonymously).
  Once a full molecule build works in mlcl CI, this can be upgraded to the
  comprehensive `registry:check`.

When any of these fail, the fix is always: `node bin/run.js sync-registry
--scan-exports` / `--scan-routes` (in mlcl; the failure names which) then commit
the updated `registry.json`.

## README.md Generation

README.md files are **100% auto-generated** from source code + registry metadata. **Never edit them manually.**

### How it works

`mlcl sync-docs --generate` generates every README.md deterministically from:

| Source                               | Generates                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Module-level JSDoc in `src/index.ts` | Description, Usage (`@example`), Injection notes (`@remarks`), E2E Tests (`@e2e`) |
| Export-level JSDoc on public exports | API section (interfaces, types, functions, constants)                             |
| `registry.json`                      | Title, Type, Category, Stack, provider relationships                              |
| `package.json`                       | Installation section, peer dependency requirements                                |
| `en.ts` + language file scan         | Translation keys + language list (locale packages)                                |

### Key files

| File                        | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `src/lib/api-extractor.ts`  | ts-morph-based extraction of exports + JSDoc from source     |
| `src/lib/docs-generator.ts` | Generates complete README.md from extracted API + registry   |
| `src/commands/sync-docs.ts` | CLI command with `--generate`, `--check`, `--fix` flags      |
| `src/lib/docs-validator.ts` | Validates README.md against source (legacy, used by `--fix`) |

### Commands

```bash
node bin/run.js sync-docs --generate                            # Generate all README.md files (~5 min)
node bin/run.js sync-docs --generate -p @molecule/api-logger    # Single package
node bin/run.js sync-docs --check                               # CI: fail if any README.md != generated
npm run sync-docs:changed                                       # Scoped: only packages with uncommitted
                                                                # molecule changes (~0.4s/package, via tsx —
                                                                # no build needed)
```

### When to regenerate

**Commits are covered automatically.** molecule's pre-commit hook
(`molecule/.husky/pre-commit`) regenerates README.md for every staged package
(plus cross-doc dependents: a core's providers inherit its `@e2e`, a provider's
core lists its providers, a new locale's feature gains a companion-locale
section, a package re-exporting another's API embeds its docs) and stages the
result into the same commit — via
`mlcl/scripts/regen-molecule-docs.mjs`, run with tsx against mlcl source (no
build needed; skips gracefully when mlcl deps aren't installed). Both callers
share `src/lib/docs-sync.ts` with the `sync-docs` command, so output is
byte-identical. Consequently there is no need to run a full
`sync-docs --generate` "just in case" — committed docs are already in sync.

Run regeneration yourself only for:

- Uncommitted work you want reflected immediately: `npm run sync-docs:changed`
- Direct `registry.json` metadata edits (type, category, label, description,
  implements, secrets) — nothing changes in the molecule worktree, so no scope
  can see it: `node bin/run.js sync-docs --generate` (optionally `-p`)
- Changes to the doc generator itself (`docs-generator.ts`,
  `api-extractor.ts`, `docs-sync.ts`): full `--generate`

### How to add documentation for a package

1. Edit the **module-level JSDoc** in `src/index.ts`:
   - Description (first line of JSDoc)
   - `@example` block with realistic usage code
   - `@remarks` for unique developer notes (only what can't be auto-derived)
   - `@e2e` for the general user-visible functionality an AI executor should
     drive end-to-end to verify the package is properly integrated (renders as
     a top-level `## E2E Tests` section). Write it as a **markdown checklist**
     (`- [ ]` items) the executor adapts to the particular app and checks off
     one by one — behavioral checkpoints ("a signed-up user can log out and
     log back in"), not implementation detail. A box that can't be checked is
     an integration bug to fix, not a skip.
     Author it on the **core** package — provider bonds without their own
     `@e2e` automatically inherit the core's text into their README.md, so
     the guidance stays provider-agnostic and is written once per category.
     Resources and feature packages author their own.
     **Include the COUNTERPARTY recipe** whenever verifying the flow requires
     an out-of-band artifact the executor must produce or retrieve — the "how
     do I play the authenticator app / inbox / phone / webhook sender" step.
     Compute-derivable artifacts get the exact command (e.g. two-factor: the
     TOTP secret is shown on screen during setup; `node -e` + the preinstalled
     `otplib` generates the current code). Captured artifacts (emails, SMS,
     push, webhooks) get "read it with the `read_activity` tool — the sandbox
     captures instead of sending." Without this line, a weak executor invents
     its own path to the artifact — a live run modified production code to
     leak the TOTP secret from an endpoint because the recipe wasn't in front
     of it.
   - `@module` tag (required)
2. Edit **export-level JSDoc** on individual exports (`@param`, `@returns`, description)
3. Run `node bin/run.js sync-docs --generate -p @molecule/package-name`
4. Commit both source and generated README.md

> **README.md is read by molecule.dev's weak executor** (Synthase) via
> `read_molecule_doc`, so it is the place to teach a weak model how to USE the
> package correctly — _especially the negative gotchas_ it gets wrong (wrong
> method names, bare-key filters, top-level bond calls, AUTOINCREMENT PKs, etc.).
> Put those in the **module-level `@remarks`** (per-export `@remarks`/`@example`
> are dropped — see below). When a weak executor misuses a package, fix it HERE,
> not by bolting another rule onto molecule-dev's `system-prompt.ts`. See the
> workspace `AGENTS.md` → "Where executor-facing guidance lives" for the full
> routing (package JSDoc vs scaffold self-doc header vs skill vs prompt).

### What is and isn't captured per-export

For individual functions, classes, and interfaces, the generator renders:

| JSDoc tag                            | Rendered?                                           |
| ------------------------------------ | --------------------------------------------------- |
| Description text (before any `@tag`) | ✅ Yes                                              |
| `@param name - description`          | ✅ Yes                                              |
| `@returns description`               | ✅ Yes                                              |
| `@deprecated`                        | ✅ Yes (badge)                                      |
| `@example`                           | ❌ **No** — silently dropped for individual exports |
| `@remarks`                           | ❌ **No** — only used at module level               |

**Consequence:** Anti-pattern warnings, usage notes, and anything beyond a simple description must go in the description text itself — not in `@example` blocks. `@example` is only rendered when placed in the module-level `@module` JSDoc in `src/index.ts`.

### Auto-derived sections (no manual input needed)

- **Injection Notes > Requirements** — from `peerDependencies` in `package.json`
- **Injection Notes > Environment Variables** — from `secrets` in `registry.json`
- **Available Providers** — from registry scan of packages with matching `implements`
- **Core Interface** — from `implements` field on provider entries in registry
- **Translations** — from companion locale package detected in registry
- **Languages + Translation Keys** — from source file scan (locale packages only)

## Parallel Subagents

ALWAYS use parallel subagents (Task tool) when work can be split across independent packages or files. Launch one agent per package/file and run them simultaneously — never do batch operations sequentially.

Common parallelizable tasks:

- Creating/modifying multiple packages → one agent per package
- Updating README.md files across packages → one agent per file
- Working across frameworks (React/Vue/Svelte/Solid/Angular/React Native) → one agent per framework
- Creating multiple providers for the same interface → one agent per provider
- Fixing tests or code across multiple packages → one agent per package

---

## Skills — On-Demand Context

Detailed guidelines are available as skills. Claude will auto-invoke these when the task matches, or you can invoke manually:

| Skill               | When to Use                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/using-mlcl`       | Using the CLI: create projects, inject, swap, add packages, sync registry/docs, auto-resolution rules, generated project structure, operational pitfalls |
| `/api-patterns`     | Backend: DataStore, handler rules, routes, schemas, authorizers, resource structure                                                                      |
| `/app-patterns`     | Frontend: three-layer architecture, UIClassMap, framework swapping, storage, native, features                                                            |
| `/bond-system`      | The bridge: bond wiring API, provider conformance, API + app interface reference tables                                                                  |
| `/create-package`   | Creating any new package: naming, placement, module org, metadata, templates                                                                             |
| `/template-styling` | Working on app templates (ClassMap rules, no raw Tailwind)                                                                                               |
| `/testing`          | Testing: vitest setup, mock factories, bond mocking, fixtures, handler testing, anti-patterns                                                            |
| `/cli-development`  | CLI internals: scanner, injector, AI code gen, registry I/O, oclif gotchas (for modifying mlcl itself)                                                   |
| `/package-registry` | Looking up existing packages, directory layout, category structure                                                                                       |

---

## Centralized Registry (`registry.json`)

The single source of truth for all molecule package metadata and framework configurations. Located at `mlcl/registry.json`.

```json
{
  "version": 1,
  "apiFrameworks": {
    "express": {
      "name": "express",
      "routerImport": "import { Router } from 'express'",
      "routerCreate": "Router()",
      "serverImport": "import express from 'express'",
      "serverCreate": "express()",
      "dependencies": { "express": "5.2.1" },
      "devDependencies": { "@types/express": "5.0.6" }
    }
  },
  "appFrameworks": {
    "react": {
      "dependencies": { "react": "19.2.4", "react-dom": "19.2.4" },
      "devDependencies": { "@vitejs/plugin-react": "5.1.4" },
      "tsconfig": { "jsx": "react-jsx" },
      "vitePlugin": { "import": "import react from '@vitejs/plugin-react'", "usage": "react()" }
    },
    "react-native-web": {
      "uiFramework": "react-native",
      "dependencies": { "react": "19.2.4", "react-dom": "19.2.4" },
      "devDependencies": { "@vitejs/plugin-react": "5.1.4" },
      "templateRequires": ["@molecule/app-ui", "@molecule/app-ui-react-native", "..."],
      "excludePeerDependencies": ["react-native"]
    }
  },
  "packages": {
    "@molecule/api-database": {
      "language": "typescript",
      "runtime": "node",
      "type": "core",
      "category": "database",
      "label": "Database",
      "stack": "api",
      "path": "packages/api/core/database",
      "exports": ["query", "setProvider", "getProvider"],
      "secrets": []
    }
  }
}
```

**Required fields**: `type`, `category`, `stack` (`"api"` or `"app"`), `label`, `description`. Providers also need `implements`. **Defaulted fields** (auto-filled if omitted): `language` (`"typescript"`), `runtime` (`"node"`), `exports` (`[]`), `secrets` (`[]`). Optional: `bondWiring`, `buildTooling`, `appBondSetup`, `defaultProvider`, `alwaysInclude`, `multiSelect`, `egressHosts`.

**Framework fields**: `apiFrameworks` — code-gen patterns + dependencies for API frameworks. `appFrameworks` — dependencies, devDependencies, tsconfig overrides, and vite plugin configs for app frameworks. Additional appFramework fields: `uiFramework` (which UI package set to use, e.g. `"react-native"` for react-native-web), `templateRequires` (packages auto-included during scaffolding when no framework package exists to declare them), `excludePeerDependencies` (peer dep names filtered from injection plans, e.g. `["react-native"]` to avoid adding the native runtime to web builds), `viteExtraConfig` (extra Vite resolve.alias entries, e.g. aliasing `react-native` to a DOM shim).

**Auto-updated by**: `mlcl init` (creates entry), `mlcl sync-registry --scan-exports` (refreshes export lists), `mlcl sync-registry --sync-toolchain` (syncs dependency versions), `mlcl sync-registry --sync-frameworks` (syncs framework dep versions from molecule packages).

**Read by**: `loadRegistry()` returns `InferredPackage[]`. `requirePackageByRole()` looks up infrastructure packages (throws on missing). `loadApiFrameworks()` and `loadAppFrameworks()` return framework configs. `getAppFrameworkDeps()` returns all npm package names that identify app projects (derived from registry, never hardcoded). `loadToolchain()` returns pinned dev dependency versions for scaffolding. All in `src/lib/registry.ts`.

**Workflow for new packages**: Use `mlcl init` to create a package skeleton and auto-add its registry entry. For existing packages that need registry entries, `init --force` will add the entry without overwriting existing source files (it skips files that already exist). After init, run `sync-registry --scan-exports` to populate the exports array from actual source. Fields that init doesn't set (like `framework`, `templateRequires`, `bondWiring`) must be added manually to registry.json.

**Path convention**: Registry `path` values are relative to the molecule monorepo root (e.g., `packages/app/core/ui`), NOT relative to the workspace root.

**Egress hosts** (`egressHosts`): Optional array of the outbound API hostnames a package DIALS at runtime. A sandbox denies every destination that is not on its egress allowlist, and molecule-dev merges the `egressHosts` of every installed package into the project's allowlist — so a project that installs `@molecule/api-payments-stripe` gets `api.stripe.com` without anyone asking. Both failure modes are silent: a MISSING host means the vendor call is dropped at the network layer with no denial signal to read, and a WRONG host means exactly the same thing while looking correct in review.

- **Verify at the source.** Read the bond's own `src/` — the `DEFAULT_BASE_URL` / `this.baseUrl = … ?? 'https://…'` literal — or, for an SDK-backed bond, that SDK's default endpoint. Never a doc page, never a `helpUrl`, never a guess (Rules 10 and 18b).
- **Hostnames only**: no scheme, path, port, whitespace or uppercase. The matcher (`hostMatchesPattern` in molecule-dev's `api/src/sandbox/egress-policy.ts`) compares a normalized HOST.
- **`*.apex` is the ONLY wildcard shape.** A leading `*.` suffix-matches the apex; every other pattern falls through to an exact string compare, so a middle wildcard like `email.*.amazonaws.com` silently never matches anything.
- **Dashboards, consoles and docs sites are not dialed.** `dashboard.stripe.com` and `platform.openai.com` are the `helpUrl` values sitting next door in `secrets.ts`, not API hosts — listing them widens sandbox egress for nothing.
- **Omit it when the destination is entirely user-supplied** (a self-hosted node, an arbitrary webhook, a localhost default like `@molecule/api-ai-local`): that host belongs in the project's allowlist, not in the package.

Gated by `src/lib/__tests__/egress-hosts.test.ts` — shape rules on every declared host, plus a coverage scan of the molecule bond sources that fails when a bond declaring a literal base URL declares no hosts.

**Toolchain**: The `toolchain` section of `registry.json` holds pinned dev dependency versions used when scaffolding new projects and packages. When upgrading dependencies in `mlcl/package.json` or molecule packages, run `mlcl sync-registry --sync-toolchain` to keep these in sync. Tests in `toolchain.test.ts` catch drift — including `packages.*.buildTooling.devDependencies` vs the template fleet's pins (buildTooling is what `mlcl create` writes into a CUSTOM app's package.json; a fleet-wide dep bump that sweeps the templates but not buildTooling ships a version split that broke custom-app previews on 2026-08-01).

## AI-Driven Code Generation

The injector uses AI (Anthropic API) for code generation when `ANTHROPIC_API_KEY` is set, with heuristic fallback otherwise.

- **`src/lib/ai.ts`** — Anthropic client wrapper (`generateCode()`, `generateCodeBatch()`)
- **`src/lib/ai-context.ts`** — Tiered context builders:
  - Phase 1: `buildRegistryContext(registry)` — compact text of full registry for package selection
  - Phase 2: `buildPackageContext(packages)` — detailed README.md for selected packages
- **Dispatch pattern**: Each generation function checks `isAIAvailable()`, falls back to `*Heuristic()` functions

---

## Key Design Patterns (Brief)

**Interface Injection:** Core defines interface → Provider implements it → App wires via `bond('category', provider)` (singleton) or `bond('category', 'name', provider)` (named) at startup → Consumer calls `require('category')` or `get('category', 'name')` anywhere.

**Normalization:** All providers for a category return the SAME types. `sendMail()` returns `EmailSendResult` regardless of Sendgrid/Mailgun/SES.

**Peer Dependencies:** Providers declare core interfaces as `peerDependencies`, preventing version conflicts and enabling interface upgrades.

**Three-Layer Frontend:** Layer 1 (framework-agnostic interfaces) → Layer 2 (framework bindings: React/Vue/Angular/React Native/etc.) → Layer 3 (library providers). Swap entire framework stack by changing Layer 2+3.

**UIClassMap N+M:** Framework UI packages × styling libraries collapsed via `getClassMap()`. Adding a styling lib = 1 ClassMap implementation. All framework packages work unchanged.

**Locale Bonds:** Every package with user-facing text has a companion locale bond (`@molecule/{stack}-locales-{name}`) providing translations in 79 languages. Feature packages use `t(key, values, { defaultValue })` with English inline fallbacks. Locale bonds are pure data packages — swap one to override all translations for that feature.

**Content Auto-Reload:** Lazily-loaded content (privacy policy, terms, etc.) registers with the provider via `registerContent(module, loader)`. During `setLocale()`, all registered loaders are called BEFORE `changeLanguage`/`notify()` fires — so UI components get correct content on first re-render with zero flash. Components call `loadContent(module)` once; the provider handles all subsequent locale-change reloads automatically.

**Framework Reactive Translations:** Each framework wraps `provider.t()` with an internal version counter (React `forceUpdate`, Vue/Solid `translationVersion` ref/signal, Svelte `derived` store from `_version` readable) that bumps on every `onLocaleChange` callback. This ensures re-render even when `addTranslations()` adds keys for the current locale without changing the locale string itself.

---

## Agent Behavioral Rules

Hard-won lessons. Violating any of these wastes time.

1. **Never stop partway through a task.** Before starting batch work, create a complete checklist. Process every item exhaustively. Track remaining items in a persistent file (workspace `internal/mlcl/plans/`) so the next session can resume. "Done" means every item is checked off.

2. **Verify assumptions before building on them.** When debugging, log actual input values at the entry point FIRST. Do not build logic based on what you THINK a parameter contains. One `console.log` beats 30 minutes of guessing. Start from the call site and work inward.

3. **Always rebuild after editing source files.** The dev server runs compiled JS from `dist/`. After editing `molecule/packages/*/src/*` or `mlcl/src/*`, immediately rebuild. Do not skip this step.

4. **Skip design ceremony for straightforward features.** When the design is clear from conversation, just build it. Don't write spec documents or ask repeated confirmation questions. Reserve full spec processes for genuinely ambiguous architectural work.

5. **Respect ClassMap architecture in templates.** All page styling uses `getClassMap()` + `cm.*` methods. NEVER replace ClassMap with inline styles or raw Tailwind. Inline styles are only allowed for things ClassMap can't express (colored border accents, specific widths, SVG attributes).

6. **All project knowledge lives in the repo.** Agent guidelines, pitfalls, debugging lessons, and behavioral rules must be committed to version-controlled files (AGENTS.md, workspace `internal/mlcl/plans/`, code comments). Never store project knowledge in `~/.claude/` — it's invisible to other developers and machines.

7. **Injector `projectPath` is the workspace path.** In `src/lib/injector.ts`, `projectPath` is the workspace directory (e.g., `blog/app`), NOT the project root (`blog`). Use `join(projectPath, '..')` to access project-level files like `theme.css`. See Pitfall #15 in the workspace `internal/mlcl/plans/flagship-pitfalls.md`.
