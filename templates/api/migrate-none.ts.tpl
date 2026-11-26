/**
 * Database migration runner (no database provider).
 *
 * This project's api manifest declares the database interface but no provider bond for it, so
 * there is no database to migrate yet. This runner exists so `server.ts`'s boot import and the
 * `db:setup` script keep resolving: it imports no database package and applies nothing. Add a
 * provider (`{{CLI_COMMAND}} add @molecule/api-database-postgresql`, or the SQLite, MySQL or PGlite bond) and
 * mlcl writes that provider's runner here.
 *
 * Can be called programmatically (imported by server.ts on startup) or
 * directly via: npm run db:setup
 */

import { fileURLToPath } from 'url'

export async function runMigrations(): Promise<void> {
  console.log(
    'No migrations ran: this project has no database provider. Add one with {{CLI_COMMAND}} add (for example @molecule/api-database-postgresql).',
  )
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
