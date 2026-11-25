# AGENTS.md

This project was scaffolded with [mlcl](https://molecule.dev) — the Molecule.dev CLI. It is a conventional TypeScript project you fully own; these notes tell any AI agent (or human) how it is put together so changes stay idiomatic.

## The molecule way

- **Capabilities come from `@molecule/*` packages behind swappable bonds.** Before hand-rolling a feature, check for a package: `npx mlcl search <capability>` (or browse <https://www.molecule.dev/packages>). Install and wire one with `npx mlcl add @molecule/<name> --inject`.
- **Project skills live in `.agents/skills/`** (the table under "Skills" says when to read each). Read `capability-first` before building a capability — it is the inspect → reuse → adapt → create order — `molecule-packages` for this project's package catalog, and the skill for the kind of code you are about to write (`api-patterns` for an endpoint, `database` for a query or migration, `styling` for a component) before writing it.
- **Provider wiring lives in `src/bonds/`** (`api/src/bonds/`, `app/src/bonds/`): one file per wired package, named after it (`database-sqlite.ts`, `app-ui-tailwind.ts`), and `<category>-default.ts` for a core configured in place rather than swapped (`auth-default.ts` holds the auth client's options). The capability map below names each one's file (`Wired bond:`). Swap a provider (PostgreSQL → MySQL, Mailgun → SES, one OAuth provider for another) with `npx mlcl swap @molecule/<new-provider>` (pass `-r @molecule/<old-provider-package>` when the category has several wired), or by editing the one bond file. Vendor SDKs normally live inside a bond, which keeps the app swappable; an SDK imported elsewhere works, it just ties that code to the vendor.
- **Read a package's docs before using it:** `npx mlcl docs @molecule/<name>`. Every `@molecule/*` package ships a generated README with its API, examples and wiring; a long one prints its overview and an index of its sections and exported names, `--section <name>` prints one in full, and `--search <term>` finds a literal in the README and type declarations.
- **Styling** in the scaffolded components goes through the ClassMap bond — `getClassMap()` from `@molecule/app-ui` and its framework bindings — so a styling-library swap only touches that bond. Your own CSS and utility classes work too (pass raw classes through `cm.cn(...)`); they just won't follow a ClassMap swap.
- **All user-facing text through i18n** — `t('key', values, { defaultValue })` with translations in the locale bonds; never hardcode strings in components.
- **Database tables** are timestamped `.sql` files in `api/migrations/` (an `api/`-shaped project). Add a new migration; never edit one that has run. Write migrations for **rolling deploys** (expand/contract): add a column/table, ship code that works with BOTH the old and new shape, backfill if needed, and only drop/rename in a LATER migration after every instance runs the new code. A `DROP COLUMN`, `DROP TABLE`, `RENAME`, or a `NOT NULL` column without a default in the same migration that introduces it breaks the old instances still serving traffic — the deploy replaces them one at a time, not all at once.
- **New API endpoints** are one `.ts` per feature in `api/src/handlers/`, registered in `api/src/handlers/index.ts`. Mirror an existing handler's shape.
- **Health endpoints are already wired.** `GET /health/live` stays 200 while the process is alive; `GET /health/ready` answers 503 while draining (so a load balancer stops routing) and 200 once boot finished, the boot warm-up settled, two consecutive probes passed, and every critical readiness check passes. Register a dependency check with `registerReadinessCheck` from `@molecule/api-process-lifecycle`, long boot work with `registerWarmupStep` (readiness stays 503 until it settles), and close what the process owns (database pool, Redis, queue) with `registerShutdownHook` — SIGTERM drains in-flight requests (bound `SHUTDOWN_TIMEOUT_MS`, default 25 s) and runs those hooks in order before exiting 0.
- **Rolling deploys need the load balancer's check cadence declared.** Set `LB_HEALTHCHECK_INTERVAL_MS` and `LB_HEALTHCHECK_TIMEOUT_MS` in the deploy environment (Fly keeps `[http_service.checks]` to itself, so the app cannot read them). The shutdown flip window then defaults to `3 x interval + timeout + 2 s`; it must be at least `2 x interval + timeout` or the proxy keeps routing here after readiness turns 503 and a rolling restart drops requests — the app logs one warning at boot when it is too short, and `SHUTDOWN_LB_FLIP_WAIT_MS` overrides it.

## Quick Reference

**Styling cheat sheet** (read `styling` skill for full reference):
```tsx
const cm = getClassMap()   // inside the component body, never at module scope (that blanks the app)
cm.sp('p', 4)                                              // spacing
cm.flex({ direction: 'row', align: 'center', gap: 'sm' })  // flex layout
cm.textSize('lg')   // xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl
cm.fontWeight('bold')                                       // normal|medium|semibold|bold|extrabold
cm.cn(cm.surface, cm.borderAll, 'rounded-md')              // surface + border + rounding (raw 'rounded-*' string)
cm.cn(cm.sp('p', 4), cm.textSize('sm'), cm.surface)        // combine
```

**Database** (read `database` skill for full reference):
```typescript
import { findMany, create, updateById, deleteById } from '@molecule/api-database'
const items = await findMany('todos', { where: [...], orderBy: [...], limit: 50 })
```

**Auth** (read `auth` skill for full reference):
```typescript
import { getUserId } from '@molecule/api-bonds-default-express'
// Auth is applied globally in App/router.ts; each handler just reads the user:
const userId = getUserId(res) // takes res (not req); return 401 if missing
```

**Logging — bind every caught error (never a bindingless `} catch {}`):**
```typescript
// api/ handlers — api-logger exports `logger` (there is NO getLogger here):
import { logger } from '@molecule/api-logger'
try { /* ... */ } catch (error) { logger.error('handler.action', error) }
// app/ components:
import { error as logError } from '@molecule/app-logger'
try { /* ... */ } catch (error) { logError('context', error) }
```

**ESM — always use .js extensions in imports:**
```typescript
import { MyComponent } from './MyComponent.js'   // ✓ correct
import { MyComponent } from './MyComponent'       // ✗ wrong
```

## Dev loop

```bash
npm run dev     # api + app dev servers (or the single one this shape has)
npm run build   # type-check + compile
npm test        # vitest suites
```

`.env` files hold provider credentials (see `.env.example` / the keys the scaffold printed). Secrets never go in code.

The project-root `.npmrc` sets `legacy-peer-deps=true` on purpose (one pinned
dev dependency's peer range lags the toolchain; the file's comment says when
to delete it) — do not "clean it up".

## Verifying a change

- **Run the e2e specs** — every scaffold ships `app/e2e/` (or `e2e/`) with a
  working `playwright.config.ts` and a real browser via
  `@molecule/app-e2e-playwright` (`npx mlcl check --steps e2e` installs Chromium
  on a machine without it; no preview tab needed — the runner starts the dev
  server, and the API beside it, when nothing answers yet, or uses a running one):
  `npx playwright test e2e/<file>.spec.ts`. A requirement about an
  interaction or a painted state (hover, focus, scroll, a sticky bar, a
  phone-width layout) is proven only by driving the interaction and measuring
  the paint (`getComputedStyle`, `boundingBox`) — reading the component's
  source or its class names proves nothing.
- **See the render, not just the DOM.** For anything visual (overlap,
  clipping, a phone-width overflow, a broken image, contrast), take a
  screenshot with the same Playwright (`page.screenshot({ path, fullPage:
  true })` at the right viewport — mobile is 390×844), then LOOK at the image
  before concluding. The workflow for a visual bug: screenshot before, fix,
  screenshot the same path+viewport after, and compare. Specs remain the tool
  for assertions; screenshots are judgment evidence.
- `npx mlcl check` runs typecheck, lint and build at once — discovered from
  this project's own scripts — and prints one compact report with the first
  actionable errors. `npx mlcl check --steps unit,e2e` runs the
  tests. Use both before handing work back. The project is installed: a
  reinstall (`npm install`, `npm ci`) proves nothing these do not, and is needed
  only after a dependency changes (`npx mlcl add` installs what it adds).
- When you stop, the project's stop hook runs typecheck and lint if files
  changed and hands any errors back to you, up to three rounds. Fix them at
  their cause. Claude Code and Cursor run it; Codex runs it only after the user
  trusts it in `/hooks`, so in Codex run `npx mlcl check` yourself.
- **The tests that came with the template are the app's rules.** When one
  fails after your change, fix the code — do not edit, invert or delete the
  test to match what you built. Change a shipped test only when the user asks
  for different behavior, and say which test you changed and why.
  - The exception is the scaffold's generated smoke tests —
    `api/src/__tests__/routes.test.ts` and `api/src/__tests__/server.test.ts`,
    whose first line is `// GENERATED SCAFFOLDING`. They pin the STARTER's
    resources and routes, so the moment your app owns the route table they are
    testing the wrong app. Rewrite them for your own routes or delete them —
    that is not "editing a test to match what you built", and hand-repairing
    their starter expectations is wasted work.
