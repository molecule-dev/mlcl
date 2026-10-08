/**
 * The API's migration runner (`src/scripts/migrate.ts`) is written for ONE
 * database: each template imports that database bond's `createMigrator` (and
 * the Postgres one its driver). So the runner has to follow the database bond —
 * at `mlcl inject` time, and again when `mlcl swap` changes the database, or the
 * swapped project imports a package it no longer has and fails at boot.
 *
 * The runner is rendered from the target project's own api manifest, not from
 * whatever package list the caller happens to hold: the PGlite branch is
 * reachable only when the manifest declares the PGlite bond, and the Postgres
 * machinery is emitted only when the manifest declares the PostgreSQL bond (a
 * PGlite-only manifest gets a PGlite-only runner). A manifest's `dependencies`
 * AND `devDependencies` both count: `mlcl swap` writes the new database into
 * the same dep key the old one occupied, which can be `devDependencies`, and a
 * production-only reader would then see NEITHER database — keeping the imports
 * of the very bond the swap just removed. Whatever the render, the package the
 * runner statically imports its PGlite migrator from is declared too — see
 * {@link ensureMigrateRunnerImports}.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getMoleculeVersion } from './registry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * The database providers {@link syncMigrateRunner} re-renders a runner for.
 * PGlite ships no template of its own — it shares the Postgres runner, whose
 * browser-profile branch migrates PGlite. Every database PROVIDER in the
 * registry must be listed here: a swap onto an unlisted provider returns null
 * and strands the old database's runner, whose imports the swap just removed
 * from the manifest (TS2307 / ERR_MODULE_NOT_FOUND on a real install). The
 * test suite pins this against the registry.
 */
export const MIGRATE_RUNNER_PROVIDERS: readonly string[] = [
  '@molecule/api-database-postgresql',
  '@molecule/api-database-pglite',
  '@molecule/api-database-sqlite',
  '@molecule/api-database-mysql',
  '@molecule/api-database-d1',
]

/**
 * Providers whose bond runs where no filesystem migrator can (Workers): they
 * apply migrations OUT OF BAND with their own tooling (D1: `wrangler d1
 * migrations apply` — see the bond's README), so their runner is a guidance
 * no-op that imports no database package at all. Keeping server.ts's boot
 * import and `db:setup` resolving is the point — a runner that crashed, or one
 * still importing the provider the swap removed, would take the API down.
 */
const OUT_OF_BAND_TEMPLATE_PROVIDERS: readonly string[] = ['@molecule/api-database-d1']

/** The providers rendered from the Postgres template (PGlite included, via its browser branch). */
const POSTGRES_TEMPLATE_PROVIDERS: readonly string[] = [
  '@molecule/api-database-postgresql',
  '@molecule/api-database-pglite',
]

const POSTGRES_PACKAGE = '@molecule/api-database-postgresql'

/** The bond whose browser-profile branch the Postgres runner migrates PGlite through. */
const PGLITE_PACKAGE = '@molecule/api-database-pglite'

/**
 * The bond-setup package the Postgres runner statically imports its PGlite
 * migrator (`createMigratorPglite`) from. Every api manifest that carries that
 * runner must declare it — see {@link ensureMigrateRunnerImports}.
 */
export const MIGRATE_RUNNER_BONDS_PACKAGE = '@molecule/api-bonds-default-express'

/** What the target manifest says about the two Postgres-flavored bonds. */
export interface MigrateRunnerRender {
  /**
   * Whether the manifest declares the PGlite bond (either dependency key — a
   * `mlcl swap` lands the new database in whatever key the old one occupied).
   */
  pgliteDeclared: boolean
  /**
   * Whether the manifest declares the PostgreSQL bond. Omitted when unknown —
   * the Postgres machinery is then kept, which is the safe default shape (the
   * browser branch stays gated by the flag either way).
   */
  postgresDeclared?: boolean
}

/** Opens a block of Postgres-only machinery in the runner template. */
const SECTION_OPEN = '{{#MIGRATE_POSTGRES}}'
/** Closes a block of Postgres-only machinery in the runner template. */
const SECTION_CLOSE = '{{/MIGRATE_POSTGRES}}'

/**
 * Keep or drop the `{{#MIGRATE_POSTGRES}} … {{/MIGRATE_POSTGRES}}` blocks of
 * the runner template. Markers always stand alone on their own line (never
 * nested, never inline), so processing is line-wise: marker lines disappear,
 * body lines survive only when the block is kept.
 *
 * @param raw - Template source, section markers intact.
 * @param include - Whether the Postgres machinery should remain in the output.
 * @returns The template with every section either kept (markers removed) or
 *   dropped (markers and body removed).
 */
function renderPostgresSections(raw: string, include: boolean): string {
  const out: string[] = []
  let skipping = false
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === SECTION_OPEN) {
      skipping = !include
      continue
    }
    if (trimmed === SECTION_CLOSE) {
      skipping = false
      continue
    }
    if (skipping) continue
    out.push(line)
  }
  return out.join('\n')
}

/**
 * Substitute the scaffold placeholders in a migration-runner template.
 *
 * `{{MIGRATE_PGLITE}}` decides whether the emitted runner's
 * `MOL_BOND_PROFILE=browser` branch is reachable at all: only an app whose api
 * manifest declares the PGlite bond may run it. Everyone else gets `false &&
 * …` — unreachable code instead of a deferred `ERR_MODULE_NOT_FOUND` (the
 * browser-profile bonds lazily import the package at call time; see
 * templates/api/migrate.ts.tpl).
 *
 * A manifest that declares PGlite but NOT the PostgreSQL bond gets a
 * PGlite-only runner: the Postgres machinery (driver import, DATABASE_URL
 * resolution, CREATE DATABASE, the SQL steps) is stripped and the gate renders
 * as a bare `true`, because PGlite is that app's only database — a swapped-in
 * PGlite must not keep importing a PostgreSQL bond the swap just removed.
 *
 * @param raw - Template source, `{{…}}` placeholders intact.
 * @param render - What the target manifest declares.
 * @returns The runner source, ready to write into a project.
 */
export function renderMigrateRunner(raw: string, render: MigrateRunnerRender): string {
  const postgresMachinery = render.postgresDeclared ?? true
  const pgliteOnly = render.pgliteDeclared && !postgresMachinery
  return renderPostgresSections(raw, !pgliteOnly)
    .replaceAll('{{MIGRATE_PGLITE}}', render.pgliteDeclared ? 'true' : 'false')
    .replaceAll(
      '{{MIGRATE_PROFILE_GATE}}',
      pgliteOnly ? '' : " && process.env.MOL_BOND_PROFILE === 'browser'",
    )
}

/**
 * Read the `dependencies` names of a manifest.
 *
 * Production-only on purpose: {@link manifestDeclaresPglite} uses it to pin
 * the browser-profile deployment rule (production deploys prune
 * devDependencies, so a `dependencies` pin is what makes the branch safe to
 * reach). The runner RENDER must not use it — see
 * {@link manifestDeclaredPackages}.
 *
 * @param manifestPath - Path to the api workspace's package.json.
 * @returns The declared production dependency names, or null when the manifest
 *   is missing or unparseable.
 */
async function manifestDependencies(manifestPath: string): Promise<Set<string> | null> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
      dependencies?: Record<string, string>
    }
    return new Set(Object.keys(manifest.dependencies ?? {}))
  } catch (_error) {
    // A missing or unparseable manifest declares nothing — callers treat that
    // as "not declared" (the conservative answer for both readers here).
    return null
  }
}

/**
 * Whether a manifest declares the PGlite bond as a production dependency.
 *
 * Only `dependencies` counts: devDependencies are pruned from production
 * deploy trees, so the browser-profile branch must not rely on them.
 *
 * @param manifestPath - Path to the api workspace's package.json.
 * @returns True when `dependencies` carries the PGlite bond.
 */
export async function manifestDeclaresPglite(manifestPath: string): Promise<boolean> {
  return (await manifestDependencies(manifestPath))?.has(PGLITE_PACKAGE) ?? false
}

/**
 * Read every package name a manifest declares in `dependencies` OR
 * `devDependencies`.
 *
 * Both keys count for the runner render: `applyBondSwap` (`mlcl swap`) writes
 * the new database into the SAME key the old one occupied, which can be
 * `devDependencies`, and the injector's `mlcl add --inject` flow honors the
 * caller's `--dev` the same way. A production-only reader would then see
 * neither the old nor the new database and render a runner whose imports the
 * manifest no longer backs.
 *
 * @param manifestPath - Path to the api workspace's package.json.
 * @returns The declared package names across both dependency keys, or null
 *   when the manifest is missing or unparseable.
 */
async function manifestDeclaredPackages(manifestPath: string): Promise<Set<string> | null> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    return new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ])
  } catch (_error) {
    // A missing or unparseable manifest declares nothing — callers fall back
    // to the conservative render (no PGlite branch, Postgres machinery kept).
    return null
  }
}

/**
 * Pick the migration-runner template for a project's packages. The default is
 * Postgres (pg.Client + CREATE DATABASE); SQLite needs no server-side database
 * and applies files via better-sqlite3 `exec()`; MySQL creates the schema and
 * applies files over a multi-statement connection. PGlite shares the Postgres
 * template — its browser-profile branch is the PGlite half. An out-of-band
 * provider (D1) wins over everything: its bond runs where no filesystem
 * migrator exists, so it must not inherit a runner that opens a local driver.
 * Each of the others delegates to its bond's `createMigrator`.
 *
 * @param packageNames - The project's `@molecule/*` package names.
 * @returns The template path, relative to mlcl's `templates/` directory.
 */
export function migrateTemplateFor(packageNames: readonly string[]): string {
  if (OUT_OF_BAND_TEMPLATE_PROVIDERS.some((p) => packageNames.includes(p))) {
    return 'api/migrate-outofband.ts.tpl'
  }
  if (packageNames.includes('@molecule/api-database-sqlite')) return 'api/migrate-sqlite.ts.tpl'
  if (packageNames.includes('@molecule/api-database-mysql')) return 'api/migrate-mysql.ts.tpl'
  return 'api/migrate.ts.tpl'
}

/**
 * Read the migration-runner template for a project's packages, placeholders
 * substituted from what the project will actually declare: the manifest's own
 * entries UNION the caller's list.
 *
 * The caller's list is additive evidence, never subtractive — on every inject
 * flow the target manifest already declares the injected packages (`mlcl add`
 * writes the dependency before handing off; a bare `mlcl inject` reads its
 * pending molecules FROM the manifest; `mlcl create` runs addPackages first),
 * but it also declares everything the project had BEFORE this injection. A
 * render from the list alone would decide, from one injected package, that the
 * project's other database does not exist: injecting PGlite into a Postgres
 * project shipped a PGlite-only runner that silently stopped migrating the
 * real database, and injecting PostgreSQL into a browser-profile (PGlite-only)
 * project dead-gated its only database's branch.
 *
 * @param packageNames - The `@molecule/*` package names being injected.
 * @param apiDir - The api workspace receiving them (the directory holding
 *   package.json). Omitted by callers with no target manifest (the swap path
 *   for single-provider templates), which renders from the list alone.
 * @returns The runner source.
 */
export async function readMigrateRunner(
  packageNames: readonly string[],
  apiDir?: string,
): Promise<string> {
  const declared = apiDir ? await manifestDeclaredPackages(join(apiDir, 'package.json')) : null
  const render = declared ? [...new Set([...declared, ...packageNames])] : [...packageNames]
  const raw = await readFile(
    join(__dirname, '..', '..', 'templates', migrateTemplateFor(render)),
    'utf-8',
  )
  return renderMigrateRunner(raw, {
    pgliteDeclared: render.includes(PGLITE_PACKAGE),
    postgresDeclared: render.includes(POSTGRES_PACKAGE),
  })
}

/**
 * Read the default (Postgres) migration runner for an EXISTING project,
 * substituting both render inputs from the project's own api manifest (both
 * dependency keys — see {@link manifestDeclaredPackages}) — the scaffold
 * refresh and database-swap paths, where the package list that drove the
 * original scaffold is no longer the truth.
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @returns The runner source.
 */
export async function readMigrateRunnerForManifest(apiDir: string): Promise<string> {
  const raw = await readFile(
    join(__dirname, '..', '..', 'templates', 'api/migrate.ts.tpl'),
    'utf-8',
  )
  const deps = await manifestDeclaredPackages(join(apiDir, 'package.json'))
  return renderMigrateRunner(raw, {
    pgliteDeclared: deps?.has(PGLITE_PACKAGE) ?? false,
    postgresDeclared: deps === null ? true : deps.has(POSTGRES_PACKAGE),
  })
}

/**
 * Declare {@link MIGRATE_RUNNER_BONDS_PACKAGE} in an api manifest whose
 * migration runner statically imports it.
 *
 * The Postgres-flavor runner imports `createMigratorPglite` from
 * `@molecule/api-bonds-default-express` unconditionally, so any project that
 * carries the runner must declare the package — otherwise `tsc` fails TS2307
 * and `db:setup` dies with ERR_MODULE_NOT_FOUND on a real install (the
 * workspace's hoisted node_modules hides exactly this class of hole). The
 * flagship templates declare it in their manifests; this closes the custom
 * `mlcl create` and `mlcl swap` paths the same way. Idempotent.
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @returns The dependency names added (empty when nothing needed doing).
 */
export async function ensureMigrateRunnerImports(apiDir: string): Promise<string[]> {
  let runner: string
  try {
    runner = await readFile(join(apiDir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
  } catch (_error) {
    // No runner on disk — a database-less project never gets one, so there is
    // nothing whose imports need declaring.
    return []
  }
  if (!runner.includes(`from '${MIGRATE_RUNNER_BONDS_PACKAGE}'`)) {
    // A SQLite/MySQL runner (or a hand-written one) does not import it.
    return []
  }
  const manifestPath = join(apiDir, 'package.json')
  let manifest: { dependencies?: Record<string, string> }
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as typeof manifest
  } catch (error) {
    console.warn(
      `[migrate-runner] ${manifestPath} is missing or unparseable — cannot declare ` +
        `${MIGRATE_RUNNER_BONDS_PACKAGE}, which src/scripts/migrate.ts imports: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    )
    return []
  }
  const deps = manifest.dependencies ?? {}
  if (deps[MIGRATE_RUNNER_BONDS_PACKAGE]) return []
  deps[MIGRATE_RUNNER_BONDS_PACKAGE] = getMoleculeVersion(MIGRATE_RUNNER_BONDS_PACKAGE)
  manifest.dependencies = Object.fromEntries(
    Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)),
  )
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return [MIGRATE_RUNNER_BONDS_PACKAGE]
}

/** What {@link syncMigrateRunner} did. */
export interface MigrateRunnerSync {
  /** The runner's path. */
  path: string
  /** True when the file was rewritten for the new database. */
  updated: boolean
}

/**
 * After a database swap, rewrite `src/scripts/migrate.ts` for the new database
 * when the project has one and it differs from the matching template. A project
 * with no runner is left alone — it never had one to break. Both render inputs
 * are re-derived from the project's own (already-swapped) manifest, so a swap
 * ONTO PGlite emits the PGlite-only runner (no imports of the PostgreSQL bond
 * the swap just removed) and a swap onto PostgreSQL keeps a browser-profile
 * app's PGlite branch. The bond-setup package the runner imports is declared
 * either way (see {@link ensureMigrateRunnerImports}).
 *
 * @param projectPath - The API workspace (the directory holding package.json).
 * @param newDatabasePackage - The database provider swapped in.
 * @returns What was done, or null when the project has no runner or the new
 *   provider ships no runner template.
 *
 * A swap onto an out-of-band provider (D1) swaps in the guidance no-op runner:
 * the alternative — leaving the old provider's runner — keeps imports of a
 * bond the swap just removed from the manifest, so `tsc` and `db:setup` break
 * on a real install.
 */
export async function syncMigrateRunner(
  projectPath: string,
  newDatabasePackage: string,
): Promise<MigrateRunnerSync | null> {
  if (!MIGRATE_RUNNER_PROVIDERS.includes(newDatabasePackage)) return null
  const path = join(projectPath, 'src', 'scripts', 'migrate.ts')
  if (!existsSync(path)) return null
  const next = POSTGRES_TEMPLATE_PROVIDERS.includes(newDatabasePackage)
    ? await readMigrateRunnerForManifest(projectPath)
    : await readMigrateRunner([newDatabasePackage])
  const current = await readFile(path, 'utf-8')
  if (current !== next) await writeFile(path, next, 'utf-8')
  // Even an unchanged runner must have its imports declared — a swap target
  // that never declared the bond-setup package gets it now.
  await ensureMigrateRunnerImports(projectPath)
  return { path, updated: current !== next }
}
