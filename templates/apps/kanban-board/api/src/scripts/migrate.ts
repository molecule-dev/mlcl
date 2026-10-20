/**
 * Database migration runner.
 * Creates the database if it doesn't exist, then runs all migrations.
 *
 * Can be called programmatically (imported by server.ts on startup)
 * or directly via: npm run db:setup
 */

import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { createMigrator, createMigratorPglite } from '@molecule/api-bonds-default-express'

// Resolve assets from the API package, independent of the compiler's rootDir.
// fileURLToPath also preserves spaces and URL-significant characters in paths.
let apiDir = dirname(fileURLToPath(import.meta.url))
while (!existsSync(join(apiDir, 'package.json'))) {
  const parent = dirname(apiDir)
  if (parent === apiDir) throw new Error('Cannot locate the API package.json for migrations')
  apiDir = parent
}

const migrationsDir = join(apiDir, 'migrations')
const setupDir = join(new URL('.', import.meta.url).pathname, '../../__setup__')

// MOL_BOND_PROFILE=browser (see bonds/index.ts) applies the same migrations,
// then any scaffold-time __setup__/ resource DDL, to the in-process PGlite
// database instead of a Postgres server.
export const runMigrations =
  process.env.MOL_BOND_PROFILE === 'browser'
    ? createMigratorPglite(migrationsDir, setupDir)
    : createMigrator(migrationsDir)

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
