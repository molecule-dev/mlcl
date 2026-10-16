/**
 * `mlcl inject` writes ONE migration per table even when two installed packages
 * ship that table's setup SQL.
 *
 * Every plan is built before any of them is executed, so the per-package check
 * against `migrations/` sees an empty folder and both packages pass it: the
 * scaffold shipped two byte-identical files for `follows` (and for `reactions`)
 * to a Conduit app, and the reviewer's model answered by deleting BOTH copies
 * (X0 flash-m93, 2026-10-16). This runs the REAL oclif command over a temp
 * project whose two resource packages declare one table each, so it proves the
 * command actually applies the cross-plan dedupe — not just that the function
 * works when called.
 *
 * @module
 */
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const FOLLOWS_SQL = `CREATE TABLE IF NOT EXISTS "follows" (
  "id" uuid PRIMARY KEY,
  "followerId" uuid NOT NULL,
  "followingId" uuid NOT NULL
);
`

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/** A resource package in the project's node_modules that ships one table. */
async function writePackage(name: string, table: string, sql: string): Promise<void> {
  const pkgDir = join(dir as string, 'node_modules', ...name.split('/'))
  await mkdir(join(pkgDir, 'src', '__setup__'), { recursive: true })
  await writeFile(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      molecule: {
        type: 'resource',
        category: 'test',
        label: name,
        tables: [{ name: table, sqlFile: `src/__setup__/${table}.sql` }],
      },
    }),
  )
  await writeFile(join(pkgDir, 'src', '__setup__', `${table}.sql`), sql)
}

describe('mlcl inject with two packages shipping one table', () => {
  it('writes a single migration for the table', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-dedupe-'))
    const alpha = '@molecule/api-resource-dedupe-alpha'
    const beta = '@molecule/api-resource-dedupe-beta'
    await writePackage(alpha, 'follows', FOLLOWS_SQL)
    await writePackage(beta, 'follows', FOLLOWS_SQL)
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: { [alpha]: '1.0.0', [beta]: '1.0.0' },
      }),
    )

    const config = await Config.load(MLCL_ROOT)
    const cmd = new Inject(
      ['-p', dir, '--no-install', '--no-test', '--no-format', '--no-ai'],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run().catch(() => undefined)

    const migrations = (await readdir(join(dir, 'migrations'))).filter((f) =>
      f.endsWith('_create_follows_table.sql'),
    )
    expect(migrations).toHaveLength(1)
  })
})
