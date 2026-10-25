/**
 * `mlcl swap` away from MotherDuck must leave no DuckDB peer behind.
 *
 * `mlcl create` closes a MotherDuck manifest over the registry's `moleculePeers`
 * graph, and MotherDuck's peers include `@molecule/api-database-duckdb`. The
 * swap replaces ONE key (`--replace @molecule/api-database-motherduck`), so the
 * local DuckDB pin used to survive — and because every later render reads the
 * manifest, the leftover pin decided the migration runner and the dialect
 * header:
 *
 * - swap → PostgreSQL / PGlite rendered the DuckDB runner, which migrates a
 *   local `./data/app.duckdb` while the app reads an unmigrated PostgreSQL /
 *   PGlite database;
 * - swap → SQLite / MySQL rendered the right runner but stamped the DuckDB
 *   header on files written for another database, the exact wrong guidance the
 *   header exists to prevent.
 *
 * These run the REAL `Swap` command, the REAL `ensureMoleculePeerClosure` that
 * `mlcl create` runs, and the REAL runner/header helpers, and assert the
 * outcome a user gets. Every case fails on the source this candidate repairs.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import Swap from '../../commands/swap.js'
import { readMigrateRunnerForManifest } from '../migrate-runner.js'
import { migrationDialectHeader, projectDatabasePackage } from '../migration-dialect.js'
import { ensureMoleculePeerClosure } from '../scaffold.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const MOTHERDUCK = '@molecule/api-database-motherduck'
const DUCKDB = '@molecule/api-database-duckdb'
const POSTGRESQL = '@molecule/api-database-postgresql'
const PGLITE = '@molecule/api-database-pglite'
const SQLITE = '@molecule/api-database-sqlite'
const MYSQL = '@molecule/api-database-mysql'

// The database swap preflights the target's capabilities, read from the
// checked-in registry — which must carry the wave's `sqlCapabilities` delta
// (the preflight fails closed without it; that is the contract, not a fixture).
let config: Config
beforeAll(async () => {
  config = await Config.load({ root: MLCL_ROOT })
})

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

/** A custom-created MotherDuck api, closed the way `mlcl create` closes it. */
async function motherduckApp(extraDependencies: Record<string, string> = {}): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-swap-md-'))
  dirs.push(dir)
  await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'md-app',
        version: '1.0.0',
        type: 'module',
        molecule: { projectType: 'api' },
        dependencies: {
          '@molecule/api-database': '1.1.5',
          ...extraDependencies,
          [MOTHERDUCK]: '1.1.0',
        },
      },
      null,
      2,
    ) + '\n',
  )
  await writeFile(
    join(dir, 'src', 'bonds', 'database-motherduck.ts'),
    `import { setPool } from '@molecule/api-database'\n` +
      `import { pool } from '${MOTHERDUCK}'\n` +
      `export function setupDatabaseMotherduck(): void {\n  setPool(pool)\n}\n`,
  )
  await writeFile(
    join(dir, 'src', 'bonds', 'index.ts'),
    `import { resolveAll } from '@molecule/api-secrets'\n` +
      `import { setupDatabaseMotherduck } from './database-motherduck.js'\n\n` +
      `export async function setupBonds(): Promise<void> {\n` +
      `  await resolveAll()\n  setupDatabaseMotherduck()\n}\n`,
  )
  // What `mlcl create` does after injection: write the peers as direct pins,
  // then render the runner from the closed manifest.
  await ensureMoleculePeerClosure(dir)
  await writeFile(
    join(dir, 'src', 'scripts', 'migrate.ts'),
    await readMigrateRunnerForManifest(dir),
  )
  return dir
}

/** Run the real Swap command; returns the thrown exit error, if any. */
async function swap(dir: string, target: string, replace = MOTHERDUCK): Promise<unknown> {
  const original = process.cwd()
  process.chdir(dir)
  try {
    // The closed manifest declares BOTH database bonds, so the command demands
    // --replace ("Multiple providers for @molecule/api-database") — exactly the
    // invocation a user runs.
    await Swap.run(
      [target, '--replace', replace, '--no-interactive', '--no-install', '--no-format'],
      config,
    )
    return undefined
  } catch (error) {
    return error
  } finally {
    process.chdir(original)
  }
}

/** A PostgreSQL app with one migration that cascades on delete. */
async function postgresAppWithCascadeMigration(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-swap-pg-'))
  dirs.push(dir)
  await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  await mkdir(join(dir, 'migrations'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'pg-app',
        version: '1.0.0',
        type: 'module',
        molecule: { projectType: 'api' },
        dependencies: { '@molecule/api-database': '1.1.5', [POSTGRESQL]: '1.3.2' },
      },
      null,
      2,
    ) + '\n',
  )
  await writeFile(
    join(dir, 'src', 'bonds', 'database-postgresql.ts'),
    `import { setPool } from '@molecule/api-database'\n` +
      `import { pool } from '${POSTGRESQL}'\n` +
      `export function setupDatabasePostgresql(): void {\n  setPool(pool)\n}\n`,
  )
  await writeFile(
    join(dir, 'src', 'bonds', 'index.ts'),
    `import { resolveAll } from '@molecule/api-secrets'\n` +
      `import { setupDatabasePostgresql } from './database-postgresql.js'\n\n` +
      `export async function setupBonds(): Promise<void> {\n` +
      `  await resolveAll()\n  setupDatabasePostgresql()\n}\n`,
  )
  // The app's own schema: legal on PostgreSQL, impossible on DuckDB.
  await writeFile(
    join(dir, 'migrations', '0001_posts.sql'),
    'CREATE TABLE posts (\n  id UUID PRIMARY KEY,\n' +
      '  parent_id UUID REFERENCES posts (id) ON DELETE CASCADE\n);\n',
  )
  await writeFile(
    join(dir, 'src', 'scripts', 'migrate.ts'),
    await readMigrateRunnerForManifest(dir),
  )
  return dir
}

/** The api manifest's dependency keys, unioned. */
async function dependencies(dir: string): Promise<Record<string, string>> {
  const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  return { ...manifest.dependencies, ...manifest.devDependencies }
}

/** A PostgreSQL api app whose `__setup__/` holds `files`, plus extra pins. */
async function postgresAppWithSetupSql(
  files: Record<string, string>,
  extraDependencies: Record<string, string> = {},
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-swap-setup-'))
  dirs.push(dir)
  await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  await mkdir(join(dir, '__setup__'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'pg-app',
        version: '1.0.0',
        type: 'module',
        molecule: { projectType: 'api' },
        dependencies: {
          '@molecule/api-database': '1.1.5',
          ...extraDependencies,
          [POSTGRESQL]: '1.3.2',
        },
      },
      null,
      2,
    ) + '\n',
  )
  await writeFile(
    join(dir, 'src', 'bonds', 'database-postgresql.ts'),
    `import { setPool } from '@molecule/api-database'\n` +
      `import { pool } from '${POSTGRESQL}'\n` +
      `export function setupDatabasePostgresql(): void {\n  setPool(pool)\n}\n`,
  )
  await writeFile(
    join(dir, 'src', 'bonds', 'index.ts'),
    `import { resolveAll } from '@molecule/api-secrets'\n` +
      `import { setupDatabasePostgresql } from './database-postgresql.js'\n\n` +
      `export async function setupBonds(): Promise<void> {\n` +
      `  await resolveAll()\n  setupDatabasePostgresql()\n}\n`,
  )
  for (const [name, sql] of Object.entries(files)) {
    await writeFile(join(dir, '__setup__', name), sql)
  }
  await writeFile(
    join(dir, 'src', 'scripts', 'migrate.ts'),
    await readMigrateRunnerForManifest(dir),
  )
  return dir
}

/** A non-unique partial index: the DuckDB bond translates it faithfully. */
const PARTIAL_INDEX_SQL = `CREATE TABLE IF NOT EXISTS "addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_shipping"
  ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;
`

describe('mlcl swap — MotherDuck’s DuckDB peer does not outrank the swapped-in database', () => {
  it('keeps MotherDuck’s own runner and header before any swap', async () => {
    const dir = await motherduckApp()
    // Premise of every case below: the closure really does pin the local bond.
    expect((await dependencies(dir))[DUCKDB]).toBeDefined()

    const runner = await readFile(join(dir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    expect(runner).toContain(`from '${MOTHERDUCK}'`)
    expect(runner).not.toContain(`from '${DUCKDB}'`)

    // The header names the database the app actually runs, not the peer.
    const database = await projectDatabasePackage(dir)
    expect(database).toBe(MOTHERDUCK)
    expect(migrationDialectHeader(database)).toContain(MOTHERDUCK)
  })

  for (const target of [POSTGRESQL, PGLITE]) {
    it(`swap → ${target}: no DuckDB pin, DuckDB runner or DuckDB header survives`, async () => {
      const dir = await motherduckApp()
      expect(await swap(dir, target)).toBeUndefined()

      const deps = await dependencies(dir)
      expect(deps[MOTHERDUCK]).toBeUndefined()
      expect(deps[target]).toBeDefined()
      // The leftover peer is what decided the runner; it must be gone.
      expect(deps[DUCKDB]).toBeUndefined()

      const runner = await readFile(join(dir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
      expect(runner).not.toContain(`from '${DUCKDB}'`)
      if (target === PGLITE) {
        // The PGlite-only render migrates through the bond-setup wrapper's
        // lazy PGlite branch and carries no Postgres machinery at all — what
        // proves it is not still the DuckDB runner is its absence plus this.
        expect(runner).toContain('createMigratorPglite')
        expect(runner).not.toContain("from 'pg'")
        expect(runner).not.toContain(`from '${POSTGRESQL}'`)
      } else {
        expect(runner).toContain(`from '${target}'`)
      }

      const database = await projectDatabasePackage(dir)
      expect(database).toBe(target)
      // Postgres dialect: the published SQL IS the app's, so no header at all.
      expect(migrationDialectHeader(database)).toBe('')
    })
  }

  for (const target of [SQLITE, MYSQL]) {
    it(`swap → ${target}: the header names ${target}, not the leftover DuckDB peer`, async () => {
      const dir = await motherduckApp()
      expect(await swap(dir, target)).toBeUndefined()

      const deps = await dependencies(dir)
      expect(deps[MOTHERDUCK]).toBeUndefined()
      expect(deps[target]).toBeDefined()
      expect(deps[DUCKDB]).toBeUndefined()

      const runner = await readFile(join(dir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
      expect(runner).toContain(`from '${target}'`)
      expect(runner).not.toContain(`from '${DUCKDB}'`)

      const database = await projectDatabasePackage(dir)
      expect(database).toBe(target)
      const header = migrationDialectHeader(database)
      expect(header).toContain(target)
      expect(header).not.toContain(DUCKDB)
    })
  }

  it('a swap onto DuckDB itself keeps the DuckDB pin (the target is never an orphan)', async () => {
    // MotherDuck's peer IS the swap target here: dropping it as a "peer of the
    // replaced provider" would delete the package the command was asked to
    // install. The closure contract excludes the target from the candidate set.
    const dir = await motherduckApp()
    expect(await swap(dir, DUCKDB)).toBeUndefined()

    const deps = await dependencies(dir)
    expect(deps[DUCKDB]).toBeDefined()
    expect(deps[MOTHERDUCK]).toBeUndefined()
    const runner = await readFile(join(dir, 'src', 'scripts', 'migrate.ts'), 'utf-8')
    expect(runner).toContain(`from '${DUCKDB}'`)
  })

  it('a swap onto a database that cannot run the app’s own migrations is refused untouched', async () => {
    // The runner the swap re-renders replays `migrations/` — the app's own
    // schema, not a package's — so the TARGET database must be able to run it.
    // DuckDB rejects the referential action; PostgreSQL applies it as written.
    const dir = await postgresAppWithCascadeMigration()
    const before = await readFile(join(dir, 'package.json'), 'utf-8')

    const error = await swap(dir, DUCKDB, POSTGRESQL)
    expect(error).toBeDefined()
    expect((error as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)
    // Nothing was swapped: no DuckDB pin, no DuckDB bond file, manifest intact.
    const deps = await dependencies(dir)
    expect(deps[DUCKDB]).toBeUndefined()
    expect(deps[POSTGRESQL]).toBeDefined()
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(before)
    expect(existsSync(join(dir, 'src', 'bonds', 'database-duckdb.ts'))).toBe(false)
  })

  it('the same migrations are accepted by a database that applies them', async () => {
    const dir = await postgresAppWithCascadeMigration()
    expect(await swap(dir, SQLITE, POSTGRESQL)).toBeUndefined()
    const deps = await dependencies(dir)
    expect(deps[SQLITE]).toBeDefined()
    expect(deps[POSTGRESQL]).toBeUndefined()
  })

  it('a package the app still needs is never removed with the replaced provider', async () => {
    // The cleanup is scoped to the OLD provider's `moleculePeers` — an
    // unrelated direct dependency, and a peer another installed package still
    // requires, both stay exactly where they are.
    const dir = await motherduckApp({
      '@molecule/api-resource-tag': '1.0.7',
      '@molecule/api-bond': '1.0.3',
    })
    expect(await swap(dir, POSTGRESQL)).toBeUndefined()

    const deps = await dependencies(dir)
    expect(deps['@molecule/api-resource-tag']).toBe('1.0.7')
    // `@molecule/api-bond` is a peer of MotherDuck AND of PostgreSQL, so the
    // remaining provider keeps it required.
    expect(deps['@molecule/api-bond']).toBe('1.0.3')
    expect(deps[DUCKDB]).toBeUndefined()
  })

  it('judges the SQL on disk, not a manifest key whose SQL was never copied', async () => {
    // A manifest carries transitive peer pins (`api-workflow-database` ships an
    // `ON DELETE CASCADE` schema) whose setup SQL is not in this project's
    // `__setup__/`. Judging every key refused a swap over SQL nothing replays.
    const dir = await postgresAppWithSetupSql(
      { 'addresses.sql': PARTIAL_INDEX_SQL },
      { '@molecule/api-workflow-database': '1.0.4' },
    )
    expect(await swap(dir, DUCKDB, POSTGRESQL)).toBeUndefined()
    expect((await dependencies(dir))[DUCKDB]).toBeDefined()
  })

  it('refuses a swap onto a database that cannot run the __setup__ copy', async () => {
    const dir = await postgresAppWithSetupSql({
      'posts.sql':
        'CREATE TABLE posts (\n  id UUID PRIMARY KEY,\n' +
        '  parent_id UUID REFERENCES posts (id) ON DELETE CASCADE\n);\n',
    })
    const before = await readFile(join(dir, 'package.json'), 'utf-8')

    const error = await swap(dir, DUCKDB, POSTGRESQL)
    expect(error).toBeDefined()
    expect((error as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)
    expect(await readFile(join(dir, 'package.json'), 'utf-8')).toBe(before)
    expect(existsSync(join(dir, 'src', 'bonds', 'database-duckdb.ts'))).toBe(false)
  })
})
