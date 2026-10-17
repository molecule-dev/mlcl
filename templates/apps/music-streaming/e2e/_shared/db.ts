/**
 * Shared E2E DB helpers — connect via `pg` to the running smoke-app Postgres,
 * truncate every non-migration / non-system table CASCADE, and re-seed.
 *
 * Connection precedence:
 *   1. process.env.DATABASE_URL (set by playwright.config.ts which loads
 *      `../api/.env` so the spec runner reuses the smoke-app's actual
 *      database — no convention drift).
 *   2. Per-field PG* env vars + dbName argument (legacy fallback).
 *
 * No raw SQL leaves these helpers — handlers use DataStore. SQL here is
 * test-infrastructure scaffolding, mirroring how the database bond's own
 * setup helpers work.
 */

import pg from 'pg'

const DEFAULT_HOST = process.env.PGHOST ?? 'localhost'
const DEFAULT_PORT = Number(process.env.PGPORT ?? 5432)
const DEFAULT_USER = process.env.PGUSER ?? 'molecule'
const DEFAULT_PASSWORD = process.env.PGPASSWORD ?? 'molecule'

/** Tables we never truncate — schema bookkeeping + extension-owned tables. */
const PROTECTED_TABLES = new Set([
  'pg_stat_statements',
  'schema_migrations',
  'flyway_schema_history',
])

interface ConnectOptions {
  host?: string
  port?: number
  user?: string
  password?: string
}

function buildClient(dbName: string, opts: ConnectOptions = {}): pg.Client {
  // Prefer DATABASE_URL when present so we always hit the same Postgres
  // database the smoke-app's API is talking to. The smoke-app convention
  // is `<slug_underscored>_test` (e.g. `music_streaming_test`), not the
  // older `flagship_<slug>` convention these helpers were written for.
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    return new pg.Client({ connectionString: databaseUrl })
  }
  return new pg.Client({
    host: opts.host ?? DEFAULT_HOST,
    port: opts.port ?? DEFAULT_PORT,
    user: opts.user ?? DEFAULT_USER,
    password: opts.password ?? DEFAULT_PASSWORD,
    database: dbName,
  })
}

/**
 * Connects to `flagship_<slug>` and TRUNCATEs every non-system table CASCADE.
 * Idempotent; safe to call before each test.
 */
export async function resetDb(dbName: string, opts: ConnectOptions = {}): Promise<void> {
  const client = buildClient(dbName, opts)
  await client.connect()
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename NOT LIKE 'pg_%'`,
    )
    const tables = rows.map((r) => r.tablename).filter((t) => !PROTECTED_TABLES.has(t))
    if (tables.length === 0) return
    const quoted = tables.map((t) => `"${t}"`).join(', ')
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
  } finally {
    await client.end()
  }
}

export interface SeedUser {
  id?: string
  email: string
  /** bcrypt hash; if omitted, callers should signup via the API instead. */
  passwordHash?: string
  name?: string
}

/**
 * Inserts a base user row directly. Most flows should prefer `signupAndLogin`
 * via the API; this is for cases where a fixture user must exist *before* any
 * HTTP call (e.g. seeding the DB for a read-only landing page).
 *
 * Callers must supply a real bcrypt hash if they intend the user to log in
 * later — bypassing the password hashing layer is forbidden.
 */
export async function seedBaseUser(
  dbName: string,
  user: SeedUser,
  opts: ConnectOptions = {},
): Promise<{ id: string }> {
  const client = buildClient(dbName, opts)
  await client.connect()
  try {
    const id = user.id ?? crypto.randomUUID()
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      [id, user.email, user.passwordHash ?? null, user.name ?? user.email.split('@')[0]],
    )
    return { id }
  } finally {
    await client.end()
  }
}

/** Convenience: connect, run a callback with a live client, disconnect. */
export async function withDb<T>(
  dbName: string,
  fn: (client: pg.Client) => Promise<T>,
  opts: ConnectOptions = {},
): Promise<T> {
  const client = buildClient(dbName, opts)
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/** Slug → underscored DB name (e.g. `personal-finance` → `flagship_personal_finance`). */
export function dbNameForSlug(slug: string): string {
  return `flagship_${slug.replace(/-/g, '_')}`
}

/**
 * The `payments` table comes from `@molecule/api-resource-payment`'s
 * `src/__setup__/payments.sql` rather than from per-app migrations. The flagship
 * baseline migrations don't include it. Specs that touch the payments
 * table (e.g. `billing-webhook.spec.ts`) call this once in `beforeAll`
 * so the table exists without requiring every flagship's 0010 migration
 * to be regenerated.
 */
export async function ensurePaymentsTable(
  dbName: string,
  opts: ConnectOptions = {},
): Promise<void> {
  await withDb(
    dbName,
    async (c) => {
      await c.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid UNIQUE PRIMARY KEY NOT NULL,
        "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
        "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
        "userId" uuid NOT NULL,
        "transactionId" text,
        "productId" text,
        "platformKey" text,
        "data" jsonb,
        "receipt" text
      );
      CREATE INDEX IF NOT EXISTS "payments_userId_index" ON "payments" ("userId");
      CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON "payments" ("transactionId");
      CREATE INDEX IF NOT EXISTS "payments_productId_index" ON "payments" ("productId");
      CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON "payments" ("platformKey");
    `)
    },
    opts,
  )
}
