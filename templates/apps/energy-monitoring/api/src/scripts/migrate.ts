/**
 * Database migration runner.
 * Creates the database if it doesn't exist, then runs all migrations.
 *
 * Can be called programmatically (imported by server.ts on startup)
 * or directly via: npm run db:setup
 */

import { join } from 'path'
import { fileURLToPath } from 'url'

import { createMigrator } from '@molecule/api-bonds-default-express'

const migrationsDir = join(new URL('.', import.meta.url).pathname, '../../migrations')

export const runMigrations = createMigrator(migrationsDir)

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
