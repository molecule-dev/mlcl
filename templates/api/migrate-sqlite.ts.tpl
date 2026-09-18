/**
 * Database migration runner (SQLite).
 *
 * SQLite has no server-side database to create — the file is created on first
 * open — so unlike the Postgres runner there is no database-creation step.
 * Delegates to the SQLite bond's `createMigrator`, which applies each `*.sql`
 * file with better-sqlite3's `exec()` (so multi-statement migration files work).
 *
 * Can be called programmatically (imported by server.ts on startup) or directly
 * via: npm run db:setup
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

import { createMigrator } from '@molecule/api-database-sqlite'

const here = new URL('.', import.meta.url).pathname
const migrationsDir = join(here, '../../migrations')
// `__setup__/` is populated at scaffold time from registry-known table SQL
// (see mlcl scaffold.ts copySqlSetupScripts) so resource packages bring their
// own DDL even when the squashed app migration omits it.
const setupDir = join(here, '../../__setup__')

export async function runMigrations(): Promise<void> {
  await createMigrator(migrationsDir)()
  // Replay idempotent resource-package DDL after the app migrations.
  if (existsSync(setupDir)) {
    await createMigrator(setupDir)()
  }
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
