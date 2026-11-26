/**
 * `mlcl add` of a tooling package (the shared ESLint config) from a full-stack project root: the
 * package belongs in both workspaces' devDependencies, so the command names the per-folder
 * command instead of picking one workspace. Inside a workspace it is a devDependency without `--dev`.
 *
 * @module
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as prompts from '@clack/prompts'
import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Add from '../add.js'

vi.mock('@clack/prompts', async (original) => ({
  ...(await original<typeof prompts>()),
  cancel: vi.fn(),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const EMPTY = '{"name":"x","dependencies":{}}\n'

describe('mlcl add of a tooling package from a full-stack root', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-tooling-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    for (const sub of ['', 'api', 'app']) {
      mkdirSync(join(dir, sub), { recursive: true })
      writeFileSync(join(dir, sub, 'package.json'), EMPTY)
    }
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.clearAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  it('names the per-workspace command and writes nothing', async () => {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['@molecule/eslint-config', '--no-install'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await expect(cmd.run()).rejects.toThrow()
    expect(prompts.cancel).toHaveBeenCalledWith(
      '@molecule/eslint-config is dev tooling for both api/ and app/. Run `npx mlcl add @molecule/eslint-config` from inside each folder; it goes into devDependencies.',
    )
    for (const sub of ['', 'api', 'app'])
      expect(readFileSync(join(dir, sub, 'package.json'), 'utf8')).toBe(EMPTY)
  })

  it('writes it into devDependencies from inside a workspace, without --dev', async () => {
    process.chdir(join(dir, 'app'))
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['@molecule/eslint-config', '--no-install'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    await cmd.run()
    const pkg = JSON.parse(readFileSync(join(dir, 'app', 'package.json'), 'utf8'))
    expect(pkg.dependencies).toEqual({})
    expect(pkg.devDependencies).toHaveProperty('@molecule/eslint-config')
  })

  it('counterexample: an app package still goes to app/ by its stack', async () => {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['@molecule/app-i18n', '--no-install'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    await cmd.run()
    expect(prompts.cancel).not.toHaveBeenCalled()
    expect(
      JSON.parse(readFileSync(join(dir, 'app', 'package.json'), 'utf8')).dependencies,
    ).toHaveProperty('@molecule/app-i18n')
    expect(readFileSync(join(dir, 'api', 'package.json'), 'utf8')).toBe(EMPTY)
  })
})
