/**
 * `ensureMigrateRunnerImports` must move EVERY database bond the runner
 * imports STATICALLY into `dependencies`.
 *
 * The runner is `server.ts`'s boot import, and a production deploy prunes
 * `devDependencies` (`--omit=dev`) while the workspace's hoisted node_modules
 * hides the hole locally — so a runner whose bond sits on a dev pin builds in
 * the workspace and dies (`ERR_MODULE_NOT_FOUND`; TS2307 before that) on a real
 * install. The Postgres/PGlite branches were hardened for exactly this; the
 * SQLite and MySQL runners import their OWN bond the same way at the top level
 * (`import { createMigrator } from '@molecule/api-database-sqlite'` — see
 * templates/api/migrate-sqlite.ts.tpl, migrate-mysql.ts.tpl) and were never
 * promoted, so a swap (which lands the new database in the dependency KEY the
 * old one occupied) or `mlcl add <database> --dev --inject` left them unbacked.
 *
 * These tests render the REAL templates through `readMigrateRunner` and drive
 * the REAL `ensureMigrateRunnerImports`, so they fail against the sqlite/mysql
 * gap and pass only when every statically imported bond is promoted.
 *
 * @module
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ensureMigrateRunnerImports, readMigrateRunner } from '../migrate-runner.js'

let dir: string | null = null

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/** A project holding `runner` at src/scripts/migrate.ts and `manifest` as its package.json. */
async function projectWith(runner: string, manifest: unknown): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-migrate-promote-'))
  await mkdir(join(dir, 'src', 'scripts'), { recursive: true })
  await writeFile(join(dir, 'src', 'scripts', 'migrate.ts'), runner)
  await writeFile(join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return dir
}

/** The project's parsed manifest. */
async function manifestOf(project: string): Promise<{
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}> {
  return JSON.parse(await readFile(join(project, 'package.json'), 'utf-8')) as never
}

describe('ensureMigrateRunnerImports — a statically imported bond is promoted', () => {
  it('moves the SQLite bond out of devDependencies', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-sqlite'])
    // Non-vacuous: the template under test really does import its own bond.
    expect(runner).toContain("from '@molecule/api-database-sqlite'")
    const project = await projectWith(runner, {
      devDependencies: { '@molecule/api-database-sqlite': '1.2.3' },
    })

    const gained = await ensureMigrateRunnerImports(project)

    expect(gained).toContain('@molecule/api-database-sqlite')
    const manifest = await manifestOf(project)
    // The pin MOVES (same version, production key) rather than being re-pinned.
    expect(manifest.dependencies?.['@molecule/api-database-sqlite']).toBe('1.2.3')
    expect(manifest.devDependencies ?? {}).not.toHaveProperty(['@molecule/api-database-sqlite'])
  })

  it('moves the MySQL bond out of devDependencies', async () => {
    const runner = await readMigrateRunner(['@molecule/api-database-mysql'])
    expect(runner).toContain("from '@molecule/api-database-mysql'")
    const project = await projectWith(runner, {
      devDependencies: { '@molecule/api-database-mysql': '2.0.1' },
    })

    const gained = await ensureMigrateRunnerImports(project)

    expect(gained).toContain('@molecule/api-database-mysql')
    const manifest = await manifestOf(project)
    expect(manifest.dependencies?.['@molecule/api-database-mysql']).toBe('2.0.1')
    expect(manifest.devDependencies ?? {}).not.toHaveProperty(['@molecule/api-database-mysql'])
  })

  it('keeps promoting the PostgreSQL bond the Postgres render imports, and nothing more', async () => {
    // The pre-existing behaviour the generalization must not lose: the Postgres
    // runner imports the PostgreSQL bond (`deriveSsl`) at the top level. It no
    // longer imports the bond bundle's `createMigratorPglite`, so a bundle pin
    // in devDependencies is left where it is.
    const runner = await readMigrateRunner(['@molecule/api-database-postgresql'])
    const project = await projectWith(runner, {
      devDependencies: {
        '@molecule/api-database-postgresql': '1.0.5',
        '@molecule/api-bonds-default-express': '1.1.0',
      },
    })

    const gained = await ensureMigrateRunnerImports(project)

    const manifest = await manifestOf(project)
    expect(gained).toEqual(['@molecule/api-database-postgresql'])
    expect(manifest.dependencies?.['@molecule/api-database-postgresql']).toBe('1.0.5')
    expect(manifest.devDependencies?.['@molecule/api-bonds-default-express']).toBe('1.1.0')
  })

  it('promotes the bond bundle for a runner rendered before, which still imports its wrapper', async () => {
    const runner = [
      "import { createMigratorPglite } from '@molecule/api-bonds-default-express'",
      'export async function runMigrations(): Promise<void> {',
      '  await createMigratorPglite("migrations")()',
      '}',
      '',
    ].join('\n')
    const project = await projectWith(runner, {
      devDependencies: { '@molecule/api-bonds-default-express': '1.1.0' },
    })
    expect(await ensureMigrateRunnerImports(project)).toEqual([
      '@molecule/api-bonds-default-express',
    ])
    expect((await manifestOf(project)).dependencies?.['@molecule/api-bonds-default-express']).toBe(
      '1.1.0',
    )
  })

  it('leaves an out-of-band runner (which imports no bond) untouched', async () => {
    // D1's runner is a guidance no-op that imports no database package, so there
    // is nothing to declare — the promotion must not invent a pin for it.
    const runner = await readMigrateRunner(['@molecule/api-database-d1'])
    const manifest = { devDependencies: { '@molecule/api-database-d1': '1.0.0' } }
    const project = await projectWith(runner, manifest)

    expect(await ensureMigrateRunnerImports(project)).toEqual([])
    expect(await manifestOf(project)).toEqual(manifest)
  })
})
