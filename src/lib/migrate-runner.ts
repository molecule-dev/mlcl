/**
 * The API's migration runner (`src/scripts/migrate.ts`) is written for ONE
 * database: each template imports that database bond's `createMigrator` (and
 * the Postgres one its driver). So the runner has to follow the database bond —
 * at `mlcl inject` time, and again when `mlcl swap` changes the database, or the
 * swapped project imports a package it no longer has and fails at boot.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** The database providers that ship their own migration-runner template. */
export const MIGRATE_RUNNER_PROVIDERS: readonly string[] = [
  '@molecule/api-database-postgresql',
  '@molecule/api-database-sqlite',
  '@molecule/api-database-mysql',
]

/** The optional peer the Postgres runner's browser-profile branch lazily imports. */
const PGLITE_PACKAGE = '@molecule/api-database-pglite'

/**
 * Substitute the scaffold placeholders in a migration-runner template.
 *
 * `{{MIGRATE_PGLITE}}` decides whether the emitted runner's
 * `MOL_BOND_PROFILE=browser` branch is reachable at all: only an app whose api
 * manifest declares the PGlite bond as a production dependency may run it.
 * Everyone else gets `false && …` — unreachable code instead of a deferred
 * `ERR_MODULE_NOT_FOUND` (production deploys run `npm prune --omit=dev`, so a
 * devDependencies-only pin is not enough; see templates/api/migrate.ts.tpl).
 *
 * @param raw - Template source, `{{…}}` placeholders intact.
 * @param pgliteDeclared - Whether the target app declares the PGlite bond in
 *   `dependencies`.
 * @returns The runner source, ready to write into a project.
 */
export function renderMigrateRunner(raw: string, pgliteDeclared: boolean): string {
  return raw.replaceAll('{{MIGRATE_PGLITE}}', pgliteDeclared ? 'true' : 'false')
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
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
      dependencies?: Record<string, string>
    }
    return Boolean(manifest.dependencies?.[PGLITE_PACKAGE])
  } catch (_error) {
    // A missing or unparseable manifest declares nothing — the conservative
    // `false` keeps the browser branch unreachable, never a broken import.
    return false
  }
}

/**
 * Pick the migration-runner template for a project's packages. The default is
 * Postgres (pg.Client + CREATE DATABASE); SQLite needs no server-side database
 * and applies files via better-sqlite3 `exec()`; MySQL creates the schema and
 * applies files over a multi-statement connection. Each delegates to its bond's
 * `createMigrator`.
 *
 * @param packageNames - The project's `@molecule/*` package names.
 * @returns The template path, relative to mlcl's `templates/` directory.
 */
export function migrateTemplateFor(packageNames: readonly string[]): string {
  if (packageNames.includes('@molecule/api-database-sqlite')) return 'api/migrate-sqlite.ts.tpl'
  if (packageNames.includes('@molecule/api-database-mysql')) return 'api/migrate-mysql.ts.tpl'
  return 'api/migrate.ts.tpl'
}

/**
 * Read the migration-runner template for a project's packages, with the
 * `{{MIGRATE_PGLITE}}` placeholder substituted.
 *
 * @param packageNames - The project's `@molecule/*` package names; the PGlite
 *   bond among them enables the browser-profile branch.
 * @returns The runner source.
 */
export async function readMigrateRunner(packageNames: readonly string[]): Promise<string> {
  const raw = await readFile(
    join(__dirname, '..', '..', 'templates', migrateTemplateFor(packageNames)),
    'utf-8',
  )
  return renderMigrateRunner(raw, packageNames.includes(PGLITE_PACKAGE))
}

/**
 * Read the default (Postgres) migration runner for an EXISTING project,
 * substituting `{{MIGRATE_PGLITE}}` from the project's own api manifest — the
 * scaffold refresh and database-swap paths, where the package list that drove
 * the original scaffold is no longer the truth.
 *
 * @param apiDir - The api workspace (the directory holding package.json).
 * @returns The runner source.
 */
export async function readMigrateRunnerForManifest(apiDir: string): Promise<string> {
  const raw = await readFile(
    join(__dirname, '..', '..', 'templates', 'api/migrate.ts.tpl'),
    'utf-8',
  )
  return renderMigrateRunner(raw, await manifestDeclaresPglite(join(apiDir, 'package.json')))
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
 * with no runner is left alone — it never had one to break. The PGlite flag is
 * re-derived from the project's own manifest so a browser-profile app keeps
 * its branch across a swap to another Postgres provider.
 *
 * @param projectPath - The API workspace (the directory holding package.json).
 * @param newDatabasePackage - The database provider swapped in.
 * @returns What was done, or null when the project has no runner or the new
 *   provider ships no runner template.
 */
export async function syncMigrateRunner(
  projectPath: string,
  newDatabasePackage: string,
): Promise<MigrateRunnerSync | null> {
  if (!MIGRATE_RUNNER_PROVIDERS.includes(newDatabasePackage)) return null
  const path = join(projectPath, 'src', 'scripts', 'migrate.ts')
  if (!existsSync(path)) return null
  const next =
    newDatabasePackage === '@molecule/api-database-postgresql'
      ? await readMigrateRunnerForManifest(projectPath)
      : await readMigrateRunner([newDatabasePackage])
  const current = await readFile(path, 'utf-8')
  if (current === next) return { path, updated: false }
  await writeFile(path, next, 'utf-8')
  return { path, updated: true }
}
