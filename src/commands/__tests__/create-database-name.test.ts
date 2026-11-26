/**
 * Every scaffold names its local database after the project. A custom full-stack scaffold wrote
 * `DATABASE_URL=…/my_app` for every project, and the migration runner creates the database the URL
 * names, so two such projects on one Postgres shared one database and each other's tables.
 *
 * Drives the real oclif command (`--skip-install`, files only).
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-create-database-name-'))
  prevCwd = process.cwd()
  process.chdir(dir)
})

afterEach(async () => {
  process.chdir(prevCwd)
  await rm(dir, { recursive: true, force: true })
})

/** Run the real command with its output captured instead of printed. */
async function runCreate(argv: string[]): Promise<void> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(argv, config)
  vi.spyOn(cmd, 'log').mockImplementation(() => {})
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  await cmd.run()
}

/** The DATABASE_URL a `.env` file sets. */
function databaseUrl(file: string): string | undefined {
  return /^DATABASE_URL=(.*)$/m.exec(readFileSync(file, 'utf8'))?.[1]
}

describe('the scaffolded DATABASE_URL names the project', () => {
  it('in a custom full-stack scaffold', async () => {
    // OLD MUSTFAIL: the api/.env named every project's database my_app.
    await runCreate([
      'shop-one',
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-database-postgresql',
      '--skip-install',
      '--no-interactive',
    ])
    expect(databaseUrl(join(dir, 'shop-one', 'api', '.env'))).toMatch(/\/shop_one$/)
  })

  it('in a custom api-only scaffold', async () => {
    await runCreate([
      'shop-two',
      '--type',
      'api',
      '--packages',
      '@molecule/api-database-postgresql',
      '--skip-install',
      '--no-interactive',
    ])
    expect(databaseUrl(join(dir, 'shop-two', '.env'))).toMatch(/\/shop_two$/)
  })
})
