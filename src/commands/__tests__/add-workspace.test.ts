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

import { AUTH_PRECONFIGURATION_GUIDANCE } from '../../lib/auth-contract.js'
import { missingMoleculePeers } from '../../lib/scaffold.js'
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

  it('declares the @molecule packages the added one requires, once', async () => {
    // Scaffolds install with --legacy-peer-deps, which installs no peers: a provider
    // added alone left its core out of node_modules.
    writeFileSync(
      join(dir, 'api', 'package.json'),
      `${JSON.stringify({ name: 'x', dependencies: { '@molecule/api-activity': '1.0.0' } })}\n`,
    )
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['@molecule/api-emails-capture', '--no-install', '--dev'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    const log = vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    const manifest = JSON.parse(readFileSync(join(dir, 'api', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect(manifest.devDependencies['@molecule/api-emails-capture']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(manifest.devDependencies['@molecule/api-emails']).toMatch(/^\d+\.\d+\.\d+$/)
    // Already declared: kept where it is, at the version the project pins.
    expect(manifest.dependencies).toEqual({ '@molecule/api-activity': '1.0.0' })
    expect(manifest.devDependencies['@molecule/api-activity']).toBeUndefined()
    expect(
      missingMoleculePeers([
        ...Object.keys(manifest.dependencies),
        ...Object.keys(manifest.devDependencies),
      ]),
    ).toEqual([])
    expect(log).toHaveBeenCalledWith(expect.stringContaining('@molecule/api-emails'))
  })

  it('writes only the package when its peers are already declared', async () => {
    const config = await Config.load(MLCL_ROOT)
    const first = new Add(['@molecule/api-emails-capture', '--no-install'], config)
    vi.spyOn(first, 'warn').mockImplementation((input) => input)
    vi.spyOn(first, 'log').mockImplementation(() => undefined)
    await first.run()
    const before = JSON.parse(readFileSync(join(dir, 'api', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const second = new Add(['@molecule/api-sms-capture', '--no-install'], config)
    vi.spyOn(second, 'warn').mockImplementation((input) => input)
    vi.spyOn(second, 'log').mockImplementation(() => undefined)
    await second.run()
    const after = JSON.parse(readFileSync(join(dir, 'api', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const added = Object.keys(after.dependencies).filter((n) => !(n in before.dependencies))
    expect(added).toContain('@molecule/api-sms-capture')
    expect(added).not.toContain('@molecule/api-activity')
    expect(missingMoleculePeers(Object.keys(after.dependencies))).toEqual([])
  })

  it('prints the keep-the-configured-bond guidance returned to CLI and MCP add callers', async () => {
    const config = await Config.load(MLCL_ROOT)
    vi.spyOn(config, 'runCommand').mockResolvedValue(undefined)
    const cmd = new Add(['@molecule/app-auth', '--no-install', '--inject'], config)
    const log = vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    expect(log).toHaveBeenCalledWith(AUTH_PRECONFIGURATION_GUIDANCE)
    expect(config.runCommand).toHaveBeenCalledWith(
      'inject',
      expect.arrayContaining(['--molecule', '@molecule/app-auth']),
    )
  })
})
