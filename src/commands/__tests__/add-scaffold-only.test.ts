/**
 * `mlcl add` of a bundle only the scaffolds choose (`selection: 'scaffold-only'`, such as the
 * flagship templates' Express bond bundle): it requires every provider it wires (45 packages, from
 * Stripe to S3), so the command refuses it by name before writing anything and names the other
 * packages to add. A core the create menu hides (`@molecule/api-config`) and the PWA defaults,
 * which a custom Vite build uses, stay addable.
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

describe('mlcl add of a bundle only the scaffolds choose', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-scaffold-only-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), EMPTY)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.clearAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  async function add(argv: string[]): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add([...argv, '--no-install'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    await cmd.run()
  }

  it('refuses the bundle and writes nothing (OLD MUSTFAIL)', async () => {
    await expect(add(['@molecule/api-bonds-default-express'])).rejects.toThrow()
    expect(prompts.cancel).toHaveBeenCalledWith(
      'Only the scaffolds choose @molecule/api-bonds-default-express: naming one installs every provider it wires. Nothing was added. Add the capability you need instead (`mlcl search <words>` finds it).',
    )
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe(EMPTY)
  })

  it('refuses a versioned bundle beside another package, and names the add for the other (OLD MUSTFAIL)', async () => {
    await expect(
      add(['@molecule/api-server-default-express@1.0.0', '@molecule/api-config']),
    ).rejects.toThrow()
    expect(prompts.cancel).toHaveBeenCalledWith(
      'Only the scaffolds choose @molecule/api-server-default-express: naming one installs every provider it wires. Nothing was added. Run `mlcl add @molecule/api-config` for the others.',
    )
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe(EMPTY)
  })

  it('counterexample: adds a core the create menu hides', async () => {
    await add(['@molecule/api-config'])
    expect(prompts.cancel).not.toHaveBeenCalled()
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies).toHaveProperty(
      '@molecule/api-config',
    )
  })

  it('counterexample: adds the PWA defaults', async () => {
    await add(['@molecule/app-pwa-default'])
    expect(prompts.cancel).not.toHaveBeenCalled()
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies).toHaveProperty(
      '@molecule/app-pwa-default',
    )
  })
})
