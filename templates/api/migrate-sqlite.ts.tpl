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

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { createMigrator } from '@molecule/api-database-sqlite'

// Resolve assets from the API package, independent of the compiler's rootDir.
// fileURLToPath also preserves spaces and URL-significant characters in paths.
let apiDir = dirname(fileURLToPath(import.meta.url))
while (!existsSync(join(apiDir, 'package.json'))) {
  const parent = dirname(apiDir)
  if (parent === apiDir) throw new Error('Cannot locate the API package.json for migrations')
  apiDir = parent
}

const migrationsDir = join(apiDir, 'migrations')
// `__setup__/` is populated at scaffold time from registry-known table SQL
// (see mlcl scaffold.ts copySqlSetupScripts) so resource packages bring their
// own DDL even when the squashed app migration omits it.
const setupDir = join(apiDir, '__setup__')

export async function runMigrations(): Promise<void> {
  await createMigrator(migrationsDir, { legacyDirectories: [setupDir] })()
  // Resource-package DDL after the app migrations. Only when __setup__/ holds SQL: an
  // empty one printed "No migration files found." on every healthy boot (X1 flash-m42).
  if (existsSync(setupDir) && readdirSync(setupDir).some((f) => f.endsWith('.sql'))) {
    await createMigrator(setupDir, {
      namespace: '__setup__',
      legacyDirectories: [migrationsDir],
    })()
  }
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Build verification uses the same runner and bond as boot, against an empty private file.
  // A dev ledger can hide a broken edited seed. Never reset or touch that database to check it.
  const verifyFresh = process.argv.includes('--verify-fresh')
  const temporary = verifyFresh ? mkdtempSync(join(tmpdir(), 'molecule-migrations-')) : null
  const previousPath = process.env.SQLITE_PATH
  if (temporary) process.env.SQLITE_PATH = join(temporary, 'verify.db')
  try {
    await runMigrations()
  } finally {
    if (temporary) {
      if (previousPath === undefined) delete process.env.SQLITE_PATH
      else process.env.SQLITE_PATH = previousPath
      rmSync(temporary, { recursive: true, force: true })
    }
  }
}
