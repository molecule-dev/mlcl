/**
 * The dialect the scaffold's migration files are in, and the header that says so.
 *
 * Every `@molecule/api-resource-*` package publishes its setup SQL per table —
 * usually one file per table, and one file for several related tables
 * (`articles.sql` creates `articles` and `article_tags`; `tags.sql` creates
 * `tags` and `resource_tags`), each written once as a migration — authored in
 * Postgres dialect (`uuid`, `timestamptz`, `DEFAULT now()`,
 * `gen_random_uuid()`), and the DATABASE BONDS are what make it portable: the
 * migrator of each non-Postgres bond rewrites the Postgres constructs as it
 * applies every file (`translateDdlToSqlite` in `@molecule/api-database-sqlite`,
 * `translateDdlToMysql` in `@molecule/api-database-mysql`). Postgres is the
 * canonical authoring dialect by design — PGlite runs the same dialect with no
 * translation at all — so one published file serves every bond.
 *
 * What the scaffold writes is that file verbatim, so the file an agent opens in a
 * scaffolded app carries no sign of the app's database. X1 flash-m69 read a
 * package's `src/__setup__/articles.sql` in a SQLite-bonded app, concluded
 * "`gen_random_uuid()` … which SQLite rejects. I need SQLite-safe versions",
 * re-transcribed four packages' schemas by hand, and shipped DDL that drifted
 * from the schema their own queries expect — while spending the run's schema
 * budget doing it. The same run wrote its own tables in Postgres dialect because
 * the migrations already in the folder are Postgres dialect.
 *
 * So every migration the scaffold writes for a NON-Postgres bond carries a
 * header naming the app's database, the constructs that database rejects, and
 * the fact that the published SQL below it applies as it is. A Postgres (or
 * PGlite) bond gets no header: the published dialect IS its dialect, and the
 * file already reads correctly.
 *
 * @module
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** A database dialect a scaffolded migration's SQL has to run on. */
export type MigrationDialect = 'sqlite' | 'postgresql' | 'mysql'

/**
 * The dialect each registry database provider runs.
 *
 * PGlite is Postgres compiled to wasm, so it shares the Postgres dialect and
 * needs no translation; D1 is SQLite (Cloudflare's distributed SQLite) and its
 * bond applies migrations out of band, but a file it applies is still SQLite
 * DDL. Both are covered by the registry test in
 * `src/lib/__tests__/migration-dialect.test.ts`: a database provider added to
 * the registry without a dialect here would otherwise ship scaffolded SQL
 * written for the wrong database, silently.
 */
export const DATABASE_DIALECTS: ReadonlyMap<string, MigrationDialect> = new Map([
  ['@molecule/api-database-sqlite', 'sqlite'],
  ['@molecule/api-database-postgresql', 'postgresql'],
  ['@molecule/api-database-pglite', 'postgresql'],
  ['@molecule/api-database-mysql', 'mysql'],
  ['@molecule/api-database-d1', 'sqlite'],
])

/**
 * The dialect a database bond package runs.
 *
 * @param name - A `@molecule/api-database-*` package name, or null.
 * @returns Its dialect, or null when the name is none of the known providers.
 */
export function dialectOfDatabasePackage(name: string | null): MigrationDialect | null {
  return name ? (DATABASE_DIALECTS.get(name) ?? null) : null
}

/** What a migration file for each non-Postgres bond is preceded by. */
const HEADERS: ReadonlyMap<MigrationDialect, (database: string) => string> = new Map([
  [
    'sqlite',
    (database) =>
      `-- This app's database is SQLite (\`${database}\`), and this file is a migration it runs.\n` +
      '-- Write DDL SQLite accepts: `TEXT PRIMARY KEY`, `TEXT`, `TEXT NOT NULL DEFAULT current_timestamp`.\n' +
      "-- SQLite rejects `gen_random_uuid()`, a bare `DEFAULT now()`, `E'…'`, `ILIKE`, `interval '…'`,\n" +
      '-- `::casts`, `USING <method>` and `ADD COLUMN IF NOT EXISTS`; it takes `uuid`, `timestamptz` and\n' +
      '-- `jsonb` as plain type names, so leave those alone.\n' +
      "-- The statements below are a package's own setup SQL, authored in Postgres dialect and rewritten\n" +
      '-- by the SQLite bond as it applies this file, so they apply here unchanged. Copy a package schema\n' +
      '-- as it is — never hand-write a SQLite version of it: a typed-out copy drifts from the schema\n' +
      '-- its own queries expect.\n',
  ],
  [
    'mysql',
    (database) =>
      `-- This app's database is MySQL (\`${database}\`), and this file is a migration it runs.\n` +
      '-- Write DDL MySQL accepts: it is strict about types, functions and index keys — no `uuid`,\n' +
      "-- `timestamptz`, `jsonb`, `gen_random_uuid()`, `E'…'`, `interval '…'`, `::casts`, `USING <method>`,\n" +
      '-- and no index on a JSON or long TEXT column without a prefix length.\n' +
      "-- The statements below are a package's own setup SQL, authored in Postgres dialect and rewritten\n" +
      '-- by the MySQL bond as it applies this file, so they apply here unchanged. Copy a package schema\n' +
      '-- as it is — never hand-write a MySQL version of it: a typed-out copy drifts from the schema\n' +
      '-- its own queries expect.\n',
  ],
])

/**
 * Headers for a database whose behaviour differs from its dialect's bond.
 *
 * D1 is Cloudflare's SQLite, so {@link DATABASE_DIALECTS} is right about the
 * dialect — but it is the one database provider with NO in-app migrator: its
 * runtime has no filesystem for a runner, so `mlcl` renders
 * `migrate-outofband.ts.tpl` and the files are applied by the provider's own
 * tooling. Nothing therefore rewrites a Postgres construct on the way in, and the
 * dialect header for the SQLite bond — "the bond rewrites it as it applies this
 * file" — would be a lie in a D1 app, sending the agent to copy Postgres DDL that
 * nothing will translate.
 */
const DATABASE_HEADERS: ReadonlyMap<string, (database: string) => string> = new Map([
  [
    '@molecule/api-database-d1',
    (database) =>
      `-- This app's database is SQLite, on Cloudflare D1 (\`${database}\`). Migrations here are\n` +
      '-- applied OUT OF BAND (`wrangler d1 migrations apply`, from CI or a shell — see\n' +
      '-- api/src/scripts/migrate.ts), so nothing rewrites Postgres syntax on the way in: write\n' +
      '-- DDL SQLite accepts — `TEXT PRIMARY KEY`, `TEXT`, `TEXT NOT NULL DEFAULT current_timestamp`.\n' +
      "-- SQLite rejects `gen_random_uuid()`, a bare `DEFAULT now()`, `E'…'`, `ILIKE`, `interval '…'`,\n" +
      '-- `::casts`, `USING <method>` and `ADD COLUMN IF NOT EXISTS`; it takes `uuid`, `timestamptz`\n' +
      '-- and `jsonb` as plain type names, so leave those alone. A `@molecule/api-resource-*`\n' +
      "-- package's `src/__setup__/*.sql` is Postgres dialect and no bond translates it for D1 —\n" +
      '-- write its columns as SQLite DDL in a new migration file.\n',
  ],
])

/**
 * The comment block a scaffolded migration file for this database starts with.
 *
 * Empty for a Postgres database (and for a project whose database is unknown):
 * the published SQL is already in that dialect, so there is nothing to warn
 * about — a header there would be noise on every file of every template.
 *
 * @param database - The project's `@molecule/api-database-*` package, or null.
 * @returns SQL comment lines ending in a newline, or `''`.
 */
export function migrationDialectHeader(database: string | null): string {
  if (!database) return ''
  const byDatabase = DATABASE_HEADERS.get(database)
  if (byDatabase) return byDatabase(database)
  const dialect = dialectOfDatabasePackage(database)
  if (!dialect || dialect === 'postgresql') return ''
  return (HEADERS.get(dialect) ?? (() => ''))(database)
}

/**
 * Prepend the dialect header to every migration already written into a directory.
 *
 * The template `--template` fast path copies a whole packed template, so its
 * `api/migrations/*.sql` files reach the project through a tree copy — there is no
 * plan to stamp at write time, the way {@link migrationDialectHeader} is used by
 * the injector and by `copySqlSetupScripts` (which compute the content they write).
 * This is the same header from the same source, applied to files that already exist.
 *
 * Idempotent: a file that already carries the header is left alone, so calling it
 * twice (or over a tree a previous version already stamped) cannot stack two.
 * A no-op for a Postgres project, whose published dialect IS the app's.
 *
 * @param dir - The `api/migrations/` directory to stamp. A missing directory is
 *   not an error — a project with no migrations has nothing to say.
 * @param database - The project's `@molecule/api-database-*` package, or null.
 * @returns The number of files stamped.
 */
export async function stampMigrationDialect(dir: string, database: string | null): Promise<number> {
  const header = migrationDialectHeader(database)
  if (!header) return 0
  let stamped = 0
  let files: string[]
  try {
    files = await readdir(dir)
  } catch (_error) {
    // No migrations directory: nothing to stamp. An unreadable one is the same
    // outcome as an absent one here, and the copy that produced it already
    // reported its own failure.
    return 0
  }
  for (const file of files) {
    if (!file.endsWith('.sql')) continue
    const path = join(dir, file)
    const sql = await readFile(path, 'utf-8')
    if (sql.startsWith(header)) continue
    await writeFile(path, `${header}${sql}`)
    stamped++
  }
  return stamped
}

/**
 * The database bond a set of package names includes.
 *
 * When several are present the one whose dialect is NOT Postgres wins: that is
 * the app whose migrations need the header, and the one a mixed set's `migrations/`
 * files are written for. A set naming only Postgres — every flagship template —
 * returns that provider, whose header is empty.
 *
 * @param names - `@molecule/*` package names (the selection, or a manifest's keys).
 * @returns The database package name, or null when the set names none.
 */
export function databasePackageOf(names: Iterable<string>): string | null {
  const providers = [...names].filter((name) => DATABASE_DIALECTS.has(name))
  return (
    providers.find((name) => dialectOfDatabasePackage(name) !== 'postgresql') ??
    providers[0] ??
    null
  )
}

/** The dependency keys of an api manifest, unioned — either one may hold the database. */
const MANIFEST_DEPENDENCY_KEYS = ['dependencies', 'devDependencies'] as const

/**
 * The database bond a scaffolded app's api manifest declares.
 *
 * The manifest is the truth about a scaffolded app — not the caller's package
 * list, which on the `--template` fast path is the template's own manifest and
 * on `mlcl add` holds only what is being added. Both keys count: `mlcl swap`
 * writes the new database into whichever key the old one occupied, so a
 * `dependencies`-only reader can miss it entirely (the same rule
 * `readMigrateRunnerForManifest` follows when it renders the runner).
 *
 * @param apiDir - The app's `api/` directory (the one holding `package.json`).
 * @returns The database package name, or null when the manifest names none.
 */
export async function projectDatabasePackage(apiDir: string): Promise<string | null> {
  try {
    const manifest = JSON.parse(await readFile(join(apiDir, 'package.json'), 'utf-8')) as Record<
      string,
      Record<string, string> | undefined
    >
    return databasePackageOf(
      MANIFEST_DEPENDENCY_KEYS.flatMap((key) => Object.keys(manifest[key] ?? {})),
    )
  } catch (_error) {
    // No manifest (or an unreadable one): nothing names a database, so nothing
    // is known to be foreign and no header is written. The write itself is
    // unaffected — this function only decides a comment.
    return null
  }
}
