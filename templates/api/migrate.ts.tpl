/**
 * Database migration runner.
 * Creates the database if it doesn't exist, then runs all migrations.
 *
 * Can be called programmatically (imported by server.ts on startup)
 * or directly via: npm run db:setup
 */

{{#MIGRATE_POSTGRES}}
import { existsSync, readFileSync, readdirSync } from 'fs'
{{/MIGRATE_POSTGRES}}
import { join } from 'path'
import { fileURLToPath } from 'url'
{{#MIGRATE_POSTGRES}}

import pg from 'pg'

{{/MIGRATE_POSTGRES}}
import { createMigratorPglite } from '@molecule/api-bonds-default-express'
{{#MIGRATE_POSTGRES}}
import { deriveSsl } from '@molecule/api-database-postgresql'
{{/MIGRATE_POSTGRES}}
{{#MIGRATE_POSTGRES}}

/**
 * Resolve DATABASE_URL: process.env first, then read the project's `.env`
 * file directly. The sandbox (and many deployments) keep DATABASE_URL in
 * `.env` but don't export it into process.env, and the secrets bond the
 * running app uses isn't wired up yet when migrations run at boot. We
 * deliberately do NOT fall back to localhost — a reachable-looking default
 * silently connects to a non-existent DB and crashes the server at boot with
 * ECONNREFUSED, which is far harder to diagnose than failing loudly here.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const candidates = [
    join(process.cwd(), '.env'),
    join(new URL('.', import.meta.url).pathname, '../../.env'),
  ]
  for (const envPath of candidates) {
    try {
      const line = readFileSync(envPath, 'utf8')
        .split('\n')
        .find((l) => l.trimStart().startsWith('DATABASE_URL='))
      if (line) {
        return line
          .slice(line.indexOf('=') + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
      }
    } catch {
      // try the next candidate path
    }
  }
  console.error(
    '[migrate] DATABASE_URL is not set (checked process.env and .env). ' +
      'Refusing to default to localhost — set DATABASE_URL and retry.',
  )
  process.exit(1)
}
{{/MIGRATE_POSTGRES}}

// MOL_BOND_PROFILE=browser runs the app on in-process PGlite (no Postgres server, no DATABASE_URL): the
// migrations below are applied to that database instead (see runMigrations). The MIGRATE_PGLITE scaffold flag
// is substituted by mlcl with `true` only when the app's api manifest declares
// @molecule/api-database-pglite as a production dependency — every other app gets `false`, so the
// browser branch below is unreachable code instead of an ERR_MODULE_NOT_FOUND crash waiting on an
// env var. Production deploys prune devDependencies, so a devDependencies-only pin is NOT enough.
// When the manifest declares PGlite but NOT @molecule/api-database-postgresql, mlcl also strips the
// whole Postgres machinery at render time: PGlite is then the app's only database, so the runner
// migrates it in every profile (the gate renders as a bare `true` and no `pg` / postgres-bond
// import remains for a swap to prune).
const BROWSER_PROFILE = {{MIGRATE_PGLITE}}{{MIGRATE_PROFILE_GATE}}
{{#MIGRATE_POSTGRES}}

const DATABASE_URL = BROWSER_PROFILE ? '' : resolveDatabaseUrl()
{{/MIGRATE_POSTGRES}}
const migrationsDir = join(new URL('.', import.meta.url).pathname, '../../migrations')
// `__setup__/` is populated at scaffold time from registry-known table SQL
// (see mlcl scaffold.ts copySqlSetupScripts) so resource packages bring
// their own DDL even when the squashed app migration forgets to include it.
const setupDir = join(new URL('.', import.meta.url).pathname, '../../__setup__')
{{#MIGRATE_POSTGRES}}

// SSL is verify-by-default via the postgresql bond's shared `deriveSsl` helper:
// local connections skip TLS, remote connections verify the server certificate
// against the system CA store, and verification is relaxed ONLY on an explicit
// operator opt-out (DATABASE_SSL_REJECT_UNAUTHORIZED=false / sslmode=no-verify),
// with PGSSLROOTCERT supported for private-CA managed providers. Reusing the
// bond helper keeps the secure default in one place for every scaffolded app.
const sslConfig = BROWSER_PROFILE ? false : deriveSsl(DATABASE_URL)

// Extract database name from URL
let dbName = 'myapp'
try {
  dbName = new URL(DATABASE_URL).pathname.replace(/^\//, '') || 'myapp'
} catch {
  // fallback
}
{{/MIGRATE_POSTGRES}}

export async function runMigrations(): Promise<void> {
  if (BROWSER_PROFILE) {
    // The same migrations, then the scaffold-time __setup__/ DDL (a missing directory counts as
    // empty), on the pglite bond's default pool — the one the app is bonded to, so an in-memory
    // database is shared. createMigratorPglite keeps the lazy @molecule/api-database-pglite import
    // behind its optional peer, so tsc never demands the package from non-browser scaffolds.
    await createMigratorPglite(migrationsDir, setupDir)()
    console.log('Migrations complete (PGlite).')
    return
  }
{{#MIGRATE_POSTGRES}}

  // Step 1: Try to create the database (connects to 'postgres' db as admin)
  try {
    const adminUrl = new URL(DATABASE_URL)
    adminUrl.pathname = '/postgres'
    const adminClient = new pg.Client({
      connectionString: adminUrl.toString(),
      ssl: sslConfig,
    })
    await adminClient.connect()

    const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ])
    if (rows.length === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`)
      console.log(`✓ Created database '${dbName}'`)
    } else {
      console.log(`✓ Database '${dbName}' already exists`)
    }

    await adminClient.end()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`⚠ Could not auto-create database: ${msg}`)
    console.warn(`  If '${dbName}' doesn't exist, run: createdb ${dbName}`)
  }

  // Step 2: Run migrations
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: sslConfig,
  })

  try {
    await client.connect()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`✗ Could not connect to database: ${msg}`)
    console.error(`  Check DATABASE_URL in .env: ${DATABASE_URL}`)
    throw err
  }

  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (sqlFiles.length === 0) {
    console.log('No migration files found.')
  } else {
    for (const file of sqlFiles) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      try {
        await client.query(sql)
        console.log(`✓ ${file}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // IF NOT EXISTS tables are idempotent — log but don't fail
        console.warn(`⚠ ${file}: ${msg}`)
      }
    }
  }

  // Step 3: Run idempotent __setup__/*.sql so resource-package DDL (e.g.
  // payments.sql from @molecule/api-resource-payment) is always present
  // even if the squashed app migration omits it.
  if (existsSync(setupDir)) {
    const setupFiles = readdirSync(setupDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const file of setupFiles) {
      const sql = readFileSync(join(setupDir, file), 'utf-8')
      try {
        await client.query(sql)
        console.log(`✓ __setup__/${file}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`⚠ __setup__/${file}: ${msg}`)
      }
    }
  }

  await client.end()
  console.log('Migrations complete.')
{{/MIGRATE_POSTGRES}}
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
