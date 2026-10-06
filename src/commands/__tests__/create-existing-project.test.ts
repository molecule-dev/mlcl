/**
 * `mlcl create` into a directory that already holds a project used to rewrite it silently and
 * exit 0: the user's code was replaced and `api/.env` was regenerated with a new JWT keypair and
 * their own keys blanked. It now refuses unless `--force` is passed.
 *
 * Runs the REAL oclif command against a temp directory.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl create into an existing project', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-existing-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  async function create(extra: string[] = []): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(['proj', '--template', 'blog', '--skip-install', ...extra], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
  }

  it('refuses, leaves the user’s edits and keys alone, and says how to override', async () => {
    await create()
    const envPath = join(dir, 'proj', 'api', '.env')
    const serverPath = join(dir, 'proj', 'api', 'src', 'server.ts')
    writeFileSync(envPath, `${readFileSync(envPath, 'utf8')}\nSTRIPE_SECRET_KEY=sk_test_mine\n`)
    writeFileSync(serverPath, `${readFileSync(serverPath, 'utf8')}\n// my edit\n`)
    const envBefore = readFileSync(envPath, 'utf8')
    const serverBefore = readFileSync(serverPath, 'utf8')

    await expect(create()).rejects.toThrow(/already holds a project.*--force/s)

    expect(readFileSync(envPath, 'utf8')).toBe(envBefore)
    expect(readFileSync(serverPath, 'utf8')).toBe(serverBefore)
  })
})
