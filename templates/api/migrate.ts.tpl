/**
 * Database migration runner.
 * Creates the database if it doesn't exist, then runs all migrations.
 *
 * Can be called programmatically (imported by server.ts on startup)
 * or directly via: npm run db:setup
 */

import { existsSync } from 'fs'
{{#MIGRATE_POSTGRES}}
import { readdirSync, readFileSync } from 'fs'
{{/MIGRATE_POSTGRES}}
import { dirname, join } from 'path'
{{#MIGRATE_POSTGRES}}
import pg from 'pg'
{{/MIGRATE_POSTGRES}}
import { fileURLToPath } from 'url'

import { createMigratorPglite } from '@molecule/api-bonds-default-express'
{{#MIGRATE_POSTGRES}}
import { deriveSsl } from '@molecule/api-database-postgresql'
{{/MIGRATE_POSTGRES}}

// Resolve assets from the API package, independent of the compiler's rootDir.
// fileURLToPath also preserves spaces and URL-significant characters in paths.
let apiDir = dirname(fileURLToPath(import.meta.url))
while (!existsSync(join(apiDir, 'package.json'))) {
  const parent = dirname(apiDir)
  if (parent === apiDir) throw new Error('Cannot locate the API package.json for migrations')
  apiDir = parent
}
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
  const candidates = [join(process.cwd(), '.env'), join(apiDir, '.env')]
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
    } catch (_error) {
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
{{#MIGRATE_POSTGRES}}

/**
 * Redact credentials from a connection string before logging it. CI and
 * deploy logs are retained and read broadly, and the connect-failure hint
 * below is the one place the URL would otherwise reach them. Keeps the
 * protocol, username, host and database name — the parts that make the
 * hint diagnosable — and drops everything after the password marker.
 */
function redactDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw)
    const userInfo = url.username ? `${url.username}:***@` : ''
    return `${url.protocol}//${userInfo}${url.host}${url.pathname}`
  } catch (_error) {
    // Not a parseable URL — say so without echoing any part of it.
    return '(unparseable DATABASE_URL)'
  }
}
{{/MIGRATE_POSTGRES}}
{{#MIGRATE_POSTGRES}}

/**
 * Whether a failed migration query is safe to continue past. Every boot
 * re-runs every migration file, so an already-applied file fails again — and
 * that failure class is wider than duplicate objects: a bare `ADD COLUMN`
 * re-run raises 42701, and an already-applied `ADD CONSTRAINT ... PRIMARY KEY`
 * raises 42P16 (Postgres checks "does this table already have a primary key"
 * BEFORE the constraint name, so the pg_dump-shaped statement most schemas
 * ship reports "multiple primary keys", not 42710). Codes and message
 * fallback are kept IDENTICAL to the PostgreSQL bond's migrator
 * (molecule/packages/api/bonds/database/postgresql/src/migrator.ts): this
 * rendered runner replaced the frozen delegates to that bond's
 * `createMigrator`, and a narrower predicate boot-looped templates whose
 * second boot raised 42701/42P16 — the app started once, then refused to boot
 * ever again against a persistent database.
 *
 * The cost of that parity, stated plainly: a recognized SQLSTATE returns true
 * BEFORE the message is read, and these codes name whole error CLASSES, not
 * just their re-run members — 42P16 is invalid_table_definition as a whole,
 * 42701 any duplicate column. A FIRST-run migration failing with one of them
 * (a partitioned-table primary key that omits the partition column; two
 * migrations adding the same column name) is therefore logged as "already
 * applied", the run exits 0, and the server boots on the broken schema the
 * error described. Tightening this gate starts in the bond migrator
 * (message-confirm 42701/42P16 there first, then let the drift guard carry
 * the change here) — narrowing it in this template alone re-creates the boot
 * loop the parity exists to prevent. Anything outside the recognized classes
 * (a syntax error, a missing permission, a mid-file error: each file runs as
 * ONE query, so the whole file rolled back) must fail the run — reporting
 * success and exiting 0 on a broken schema ships the failure to runtime as a
 * "relation does not exist" far from the cause.
 */
function isBenignMigrationError(err: unknown): boolean {
  // Inline on purpose: the render and the test suite execute this helper as a
  // self-contained unit.
  const IDEMPOTENT_PG_CODES = new Set([
    '42P07', // duplicate_table
    '42701', // duplicate_column — whole class, code-only match (see above)
    '42710', // duplicate_object
    '42P06', // duplicate_schema
    '42P04', // duplicate_database
    '42723', // duplicate_function
    '42P16', // invalid_table_definition — whole class, code-only match (see above)
  ])
  const code =
    typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string'
      ? err.code
      : undefined
  if (code && IDEMPOTENT_PG_CODES.has(code)) return true
  // Message fallback: hand-written migrations that wrap the pg error (or trip
  // no recognized code) are still matched by their "already applied" phrasing.
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /already exists/i.test(msg) ||
    /duplicate (column|key|object) name/i.test(msg) ||
    /multiple primary keys for table/i.test(msg)
  )
}
{{/MIGRATE_POSTGRES}}

// MOL_BOND_PROFILE=browser runs the app on in-process PGlite (no Postgres server, no DATABASE_URL): the
// migrations below are applied to that database instead (see runMigrations).
// The MIGRATE_BROWSER_PROFILE scaffold placeholder is substituted by mlcl with the COMPLETE right-hand
// side of the line, so what is emitted is always ONE expression:
//   - `false` for an app whose api manifest does not declare @molecule/api-database-pglite (either
//     dependency key) — the browser branch is then unreachable code instead of an
//     ERR_MODULE_NOT_FOUND crash waiting on an env var;
//   - `process.env.MOL_BOND_PROFILE === 'browser'` for one that declares BOTH databases;
//   - a bare `true` for one that declares PGlite but NOT @molecule/api-database-postgresql, because
//     mlcl also strips the whole Postgres machinery at render time for it: PGlite is then the app's
//     only database, so the runner migrates it in every profile and no `pg` / postgres-bond import
//     remains for a swap to prune.
// A literal joined to the rest with `&&` (`true && …` / `false && …`) is a
// `no-constant-binary-expression` error under the eslint config this project ships, so a generated
// runner would fail its own `npm run lint`.
const BROWSER_PROFILE = {{MIGRATE_BROWSER_PROFILE}}
{{#MIGRATE_POSTGRES}}

const DATABASE_URL = BROWSER_PROFILE ? '' : resolveDatabaseUrl()
{{/MIGRATE_POSTGRES}}
const migrationsDir = join(apiDir, 'migrations')
// `__setup__/` is populated at scaffold time from registry-known table SQL
// (see mlcl scaffold.ts copySqlSetupScripts) so resource packages bring
// their own DDL even when the squashed app migration forgets to include it.
const setupDir = join(apiDir, '__setup__')
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
} catch (_error) {
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

  // Step 1: Try to create the database (connects to 'postgres' db as admin).
  // The admin connection is closed on EVERY path (finally): an open socket
  // keeps the Node event loop alive, so a failed pg_database probe or CREATE
  // DATABASE (the role lacks CREATEDB; a duplicate-database race between two
  // simultaneously booting replicas) used to leave `npm run db:setup` hanging
  // forever after printing "Migrations complete." — and left one idle
  // connection per server boot.
  let adminClient: pg.Client | null = null
  try {
    const adminUrl = new URL(DATABASE_URL)
    adminUrl.pathname = '/postgres'
    adminClient = new pg.Client({
      connectionString: adminUrl.toString(),
      ssl: sslConfig,
    })
    await adminClient.connect()

    const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ])
    if (rows.length === 0) {
      // The name is DATA (it came out of DATABASE_URL's path), so it is quoted
      // as a Postgres IDENTIFIER — and inside those quotes an embedded `"` must
      // be DOUBLED, which is the only escaping a quoted identifier has.
      // Unescaped, a name containing `"` ends the identifier early and
      // everything after it is parsed as SQL; this connection runs statements
      // as the app's own role and the simple query protocol accepts several per
      // call, so the escaping is what keeps this ONE `CREATE DATABASE`.
      await adminClient.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`)
      console.log(`✓ Created database '${dbName}'`)
    } else {
      console.log(`✓ Database '${dbName}' already exists`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`⚠ Could not auto-create database: ${msg}`)
    console.warn(`  If '${dbName}' doesn't exist, run: createdb ${dbName}`)
  } finally {
    if (adminClient) {
      try {
        await adminClient.end()
      } catch (_error) {
        // The real failure (if any) is already reported above; this cleanup
        // must never throw on its way out — not even when connect() itself
        // failed and end() has no connection to close.
      }
    }
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
    console.error(`  Check DATABASE_URL in .env: ${redactDatabaseUrl(DATABASE_URL)}`)
    throw err
  }

  // The migration connection is closed on EVERY path (finally), the same
  // policy as the admin connection above: a non-benign migration failure used
  // to rethrow with the socket still open — an open socket keeps the Node
  // event loop alive, so a boot supervisor that catches the rejection and
  // retries leaked one idle connection per attempt, and `npm run db:setup`
  // could hang at exit instead of reporting the failure.
  try {
    // A missing `migrations/` counts as empty, exactly like `__setup__/` below:
    // this runner ships for any project that has a database package, and a
    // project scaffolded without a resource package never creates the directory
    // (only an injected resource migration does). `readdirSync` on it throws
    // ENOENT — and from server.ts's boot-time `await runMigrations()` that is
    // an API that cannot start, while `npm run db:setup` reports a raw stack
    // trace instead of the empty-state line below.
    const sqlFiles = existsSync(migrationsDir)
      ? readdirSync(migrationsDir)
          .filter((f) => f.endsWith('.sql'))
          .sort()
      : []

    // Each file runs once: `_molecule_migrations` records it (the same table the database
    // bonds keep), so a DROP or a backfill in a migration never repeats on a later boot. A
    // database migrated before this record existed is adopted: its files are recorded on
    // the first boot that finds them already applied.
    const ledger = '"_molecule_migrations"'
    const hadLedger =
      (await client.query(`SELECT to_regclass('${ledger}') AS t`))?.rows?.[0]?.t != null
    const otherTables = Number(
      (
        await client.query(
          "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'",
        )
      )?.rows?.[0]?.n ?? 0,
    )
    const adopting = !hadLedger && otherTables > 0
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${ledger} ("file" TEXT PRIMARY KEY, "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now())`,
    )
    const applied = new Set(
      ((await client.query(`SELECT "file" FROM ${ledger}`))?.rows ?? []).map((r) => String(r.file)),
    )
    const recordSql = `INSERT INTO ${ledger} ("file") VALUES ($1) ON CONFLICT DO NOTHING`

    if (sqlFiles.length === 0) {
      console.log('No migration files found.')
    } else {
      for (const file of sqlFiles) {
        if (applied.has(file)) continue
        const sql = readFileSync(join(migrationsDir, file), 'utf-8')
        try {
          await client.query(sql)
          await client.query(recordSql, [file])
          console.log(`✓ ${file}`)
        } catch (err) {
          // An already-applied migration fails its re-run with one of the
          // idempotency codes (or message phrasings) isBenignMigrationError
          // recognizes — that re-run is benign and the run continues.
          // Everything else fails the run (see isBenignMigrationError): a
          // swallowed failure here used to print "Migrations complete." and
          // exit 0 with the schema broken.
          if (!isBenignMigrationError(err)) throw err
          const msg = err instanceof Error ? err.message : String(err)
          if (adopting) {
            await client.query(recordSql, [file])
            console.warn(`⚠ ${file}: ${msg} (applied before; now recorded)`)
          } else {
            // The file ran as one transaction and rolled back; not recorded, so it is retried.
            console.warn(
              `⚠ ${file}: ${msg} — nothing in this file was applied; an object it creates already exists, so remove that statement or move the rest to a new migration file`,
            )
          }
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
        const key = `__setup__/${file}`
        if (applied.has(key)) continue
        const sql = readFileSync(join(setupDir, file), 'utf-8')
        try {
          await client.query(sql)
          await client.query(recordSql, [key])
          console.log(`✓ __setup__/${file}`)
        } catch (err) {
          // Same gate as step 2 (see isBenignMigrationError): an already-applied
          // error is the expected re-run here — the squashed app migration may
          // already own these tables — so it is logged and skipped. Anything
          // else (the app role lacks CREATE on the schema, a typo, a
          // referenced-but-absent enum) must fail the run: a swallowed failure
          // printed "Migrations complete.", exited 0, and the server booted to
          // 500 on every request with "relation does not exist", far from the
          // cause.
          if (!isBenignMigrationError(err)) throw err
          const msg = err instanceof Error ? err.message : String(err)
          // The app migration may already own these tables: the setup file's end state holds.
          await client.query(recordSql, [key])
          console.warn(`⚠ __setup__/${file}: ${msg} (already applied — recorded)`)
        }
      }
    }
  } finally {
    try {
      await client.end()
    } catch (_error) {
      // The real failure (if any) is rethrown above; this cleanup must never
      // throw over it — not even when the failure already broke the
      // connection and end() has nothing left to close.
    }
  }

  console.log('Migrations complete.')
{{/MIGRATE_POSTGRES}}
}

// Allow running directly: npm run db:setup
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations()
}
