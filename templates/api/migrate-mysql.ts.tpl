/**
 * Database migration runner (MySQL).
 *
 * Delegates to the MySQL bond's `createMigrator`, which creates the database if
 * missing (CREATE DATABASE IF NOT EXISTS) and applies each `*.sql` file over a
 * multi-statement connection (so multi-statement migration files apply in one
 * query). Reads connection settings from MYSQL_URL or the discrete MYSQL_* env
 * vars.
 *
 * Can be called programmatically (imported by server.ts on startup) or directly
 * via: npm run db:setup
 */

import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

import { createMigrator } from '@molecule/api-database-mysql'

const here = new URL('.', import.meta.url).pathname
const migrationsDir = join(here, '../../migrations')
// `__setup__/` is populated at scaffold time from registry-known table SQL
// (see mlcl scaffold.ts copySqlSetupScripts) so resource packages bring their
// own DDL even when the squashed app migration omits it.
const setupDir = join(here, '../../__setup__')

export async function runMigrations(): Promise<void> {
  await createMigrator(migrationsDir)()
  // Resource-package DDL after the app migrations. Only when __setup__/ holds SQL: an
  // empty one printed "No migration files found." on every healthy boot (X1 flash-m42).
  if (existsSync(setupDir) && readdirSync(setupDir).some((f) => f.endsWith('.sql'))) {
    await createMigrator(setupDir)()
  }
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
