/**
 * `mlcl add` run from a full-stack project root must not treat the root as the project: the
 * package belongs in `api/` or `app/` by its own stack. (It used to land in the root
 * package.json and `--inject` scaffolded a phantom second project there.)
 *
 * @module
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Add from '../add.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl add from a full-stack project root', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-ws-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    for (const sub of ['', 'api', 'app']) {
      mkdirSync(join(dir, sub), { recursive: true })
      writeFileSync(join(dir, sub, 'package.json'), '{"name":"x","dependencies":{}}\n')
    }
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  it('refuses a package whose stack it cannot tell, and writes nothing', async () => {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['left-pad', '--no-install'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await expect(cmd.run()).rejects.toThrow()
    for (const sub of ['', 'api', 'app']) {
      expect(readFileSync(join(dir, sub, 'package.json'), 'utf8')).toBe(
        '{"name":"x","dependencies":{}}\n',
      )
    }
  })
})
