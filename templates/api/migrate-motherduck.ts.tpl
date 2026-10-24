/**
 * Database migration runner (MotherDuck, hosted DuckDB).
 *
 * MotherDuck is DuckDB against a HOSTED database — there is no local file and
 * no database-creation step. Delegates to the MotherDuck bond's `createMigrator`,
 * which applies each `*.sql` file in lexical order, one transaction per file,
 * with the DuckDB bond's ledger and DDL translation (`jsonb` → `json`, index
 * `USING <method>` dropped). Read connection settings from MOTHERDUCK_DATABASE
 * (an `md:` connection string) and MOTHERDUCK_TOKEN.
 *
 * Can be called programmatically (imported by server.ts on startup) or directly
 * via: npm run db:setup
 */

import { existsSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { createMigrator } from '@molecule/api-database-motherduck'

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
  await createMigrator(migrationsDir)()
  // Resource-package DDL after the app migrations. Only when __setup__/ holds SQL: an
  // empty one printed "No migration files found." on every healthy boot (X1 flash-m42).
  if (existsSync(setupDir) && readdirSync(setupDir).some((f) => f.endsWith('.sql'))) {
    await createMigrator(setupDir, { namespace: '__setup__' })()
  }
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
