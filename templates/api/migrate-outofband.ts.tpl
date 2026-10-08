/**
 * Database migration runner (out-of-band provider).
 *
 * This project's database provider applies migrations OUT OF BAND: it runs on
 * a runtime with no filesystem for a runner to read `migrations/` from
 * (Cloudflare D1 on Workers — see @molecule/api-database-d1). Apply the files
 * in `migrations/` and `__setup__/` with the provider's own tooling instead
 * (`wrangler d1 migrations apply` for D1, from CI or a local shell). This
 * runner exists so `server.ts`'s boot import and the `db:setup` script keep
 * resolving: it imports no database package, verifies nothing and applies
 * nothing — it says so and returns, so a boot or CI step never crashes on a
 * migrator this runtime cannot have.
 *
 * Can be called programmatically (imported by server.ts on startup) or
 * directly via: npm run db:setup
 */

import { fileURLToPath } from 'url'

export async function runMigrations(): Promise<void> {
  console.log(
    'Migrations complete (out of band): this database provider applies them outside the app. ' +
      'Run them with the provider tooling (for D1: wrangler d1 migrations apply) — see the provider README.',
  )
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
