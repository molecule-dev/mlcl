/**
 * Declining `mlcl inject`'s confirmation releases the project lock. The command ended with
 * `process.exit(0)` inside the lock, so the lock's `finally` never ran and the file stayed for the
 * next command to wait on (project-lock security review, 2026-11-25, L3).
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as Prompts from '@clack/prompts'
import { Config, Errors } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { projectLockPath } from '../../lib/project-lock.js'
import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
vi.mock('@clack/prompts', async (original) => ({
  ...(await original<typeof Prompts>()),
  confirm: vi.fn(async () => false),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const WORKSPACE_MODULES = dirname(
  dirname(fileURLToPath(import.meta.resolve('vitest/package.json'))),
)

let dir = ''
let wasTTY: boolean | undefined

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-declined-'))
  await symlink(WORKSPACE_MODULES, join(dir, 'node_modules'))
  await writeFile(
    join(dir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        molecule: { projectType: 'api' },
        dependencies: { '@molecule/api-cache-memory': '1.0.0' },
      },
      null,
      2,
    )}\n`,
  )
  await mkdir(join(dir, 'src', 'bonds'), { recursive: true })
  await writeFile(join(dir, 'src', 'server.ts'), '// the project server\n')
  wasTTY = process.stdin.isTTY
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
})

afterEach(async () => {
  Object.defineProperty(process.stdin, 'isTTY', { value: wasTTY, configurable: true })
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

/**
 * The pid the project's lock file names, if there is one.
 *
 * @returns Its content, or undefined.
 */
function lockContent(): string | undefined {
  try {
    return readFileSync(projectLockPath(dir), 'utf8')
  } catch (_error) {
    return undefined
  }
}

describe('mlcl inject, declined at the confirmation', () => {
  it('exits through oclif and leaves no lock behind (OLD MUSTFAIL)', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code}) skips the lock release`)
    })
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Inject(
      ['-m', '@molecule/api-cache-memory', '-p', dir, '--no-install', '--no-test', '--no-ai'],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)

    const error = await cmd.run().catch((caught: unknown) => caught)

    expect(Prompts.confirm, 'it reached the confirmation').toHaveBeenCalledTimes(1)
    expect(exit).not.toHaveBeenCalled()
    expect(error).toBeInstanceOf(Errors.ExitError)
    expect((error as Errors.ExitError).oclif.exit).toBe(0)
    // Shared node_modules (the workspace's) may hold another test's lock, never this process's.
    expect(lockContent()).not.toBe(`${process.pid}\n`)
  }, 60_000)
})
