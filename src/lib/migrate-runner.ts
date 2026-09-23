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
 * Read the migration-runner template for a project's packages.
 *
 * @param packageNames - The project's `@molecule/*` package names.
 * @returns The runner source.
 */
export async function readMigrateRunner(packageNames: readonly string[]): Promise<string> {
  return readFile(
    join(__dirname, '..', '..', 'templates', migrateTemplateFor(packageNames)),
    'utf-8',
  )
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
 * with no runner is left alone — it never had one to break.
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
  const next = await readMigrateRunner([newDatabasePackage])
  const current = await readFile(path, 'utf-8')
  if (current === next) return { path, updated: false }
  await writeFile(path, next, 'utf-8')
  return { path, updated: true }
}
