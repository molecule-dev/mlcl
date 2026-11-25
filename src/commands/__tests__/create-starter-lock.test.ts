/**
 * An installed custom `mlcl create` installs from mlcl's resolved lock, and the project has its
 * AGENTS.md before the install starts.
 *
 * r19 harness eval (2026-11-24): a custom full-stack create spent most of its time in `npm install`
 * resolving the tree from nothing, and Codex, reading the project meanwhile, listed AGENTS.md a
 * minute before create wrote it. Runs the REAL oclif command with the install and inject replaced;
 * the install records what the project held when it started.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import type * as Execa from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as NpmInstall from '../../lib/npm-install.js'

const installs = vi.hoisted(() => [] as Array<{ lockEntries: number; agentsMd: boolean }>)

vi.mock('../../lib/npm-install.js', async (importOriginal) => ({
  ...(await importOriginal<typeof NpmInstall>()),
  npmInstall: vi.fn(async (cwd: string) => {
    const lock = join(cwd, 'package-lock.json')
    installs.push({
      lockEntries: existsSync(lock)
        ? Object.keys(JSON.parse(readFileSync(lock, 'utf8')).packages ?? {}).length
        : 0,
      agentsMd: existsSync(join(cwd, 'AGENTS.md')),
    })
  }),
}))
vi.mock('execa', async (importOriginal) => ({
  ...(await importOriginal<typeof Execa>()),
  execa: vi.fn(async () => ({ stdout: 'Tests  2 passed (2)', stderr: '' })),
}))

const { default: Create } = await import('../create.js')

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-create-starter-lock-'))
  prevCwd = process.cwd()
  process.chdir(dir)
  installs.length = 0
})

afterEach(async () => {
  process.chdir(prevCwd)
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

/** Run a create (install and inject replaced). */
async function create(extra: string[]): Promise<void> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(
    [
      'proj',
      '--packages',
      '@molecule/api-resource-user,@molecule/api-database-sqlite',
      '--no-interactive',
      '--json',
      '--no-verify',
      ...extra,
    ],
    config,
  )
  vi.spyOn(cmd as never, 'runInject').mockResolvedValue(undefined as never)
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
}

describe('mlcl create installs from the shipped lock', () => {
  it('writes the lock and AGENTS.md before a full-stack install', async () => {
    await create(['--type', 'full-stack', '--framework', 'react'])
    expect(installs[0]?.lockEntries).toBeGreaterThan(100)
    expect(installs[0]?.agentsMd).toBe(true)
    expect(existsSync(join(dir, 'proj', 'AGENTS.md'))).toBe(true)
  }, 120_000)

  it('gives an API-only project a lock too', async () => {
    await create(['--type', 'api'])
    expect(installs[0]?.lockEntries).toBeGreaterThan(100)
  }, 120_000)

  // Counterexample: no install, no lock (molecule.dev sandboxes install from their own cache). The
  // project's own install still gets the install-script decisions of the starter tree.
  it('writes no lock with --skip-install, but the install-script decisions', async () => {
    await create(['--type', 'full-stack', '--framework', 'react', '--skip-install'])
    expect(installs).toEqual([])
    expect(existsSync(join(dir, 'proj', 'package-lock.json'))).toBe(false)
    const { allowScripts } = JSON.parse(readFileSync(join(dir, 'proj', 'package.json'), 'utf8'))
    expect(allowScripts).toMatchObject({ bcrypt: false, esbuild: false })
  }, 120_000)
})
