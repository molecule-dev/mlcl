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
import { readProjectCapabilityMap, renderCapabilityMap } from '../../lib/capability-map.js'
import { missingMoleculePeers } from '../../lib/peer-closure.js'
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

  it('lists the added package in the AGENTS.md capability map', async () => {
    writeFileSync(
      join(dir, 'app', 'package.json'),
      `${JSON.stringify({ name: 'x', dependencies: { '@molecule/app-auth': '1.0.0' } })}\n`,
    )
    const map = renderCapabilityMap(await readProjectCapabilityMap(dir))
    writeFileSync(join(dir, 'AGENTS.md'), `# Project\n\n${map}\n`)
    expect(map).not.toContain('`@molecule/app-http`')
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['@molecule/app-http', '--no-install'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('`@molecule/app-http`')
    expect(agents).toContain('`@molecule/app-auth`')
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
      `${JSON.stringify({ name: 'x', dependencies: { '@molecule/api-bond': '1.0.0' } })}\n`,
    )
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add(['@molecule/api-emails-mailgun', '--no-install', '--dev'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    const log = vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    const manifest = JSON.parse(readFileSync(join(dir, 'api', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect(manifest.devDependencies['@molecule/api-emails-mailgun']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(manifest.devDependencies['@molecule/api-emails']).toMatch(/^\d+\.\d+\.\d+$/)
    // Already declared: kept where it is, at the version the project pins.
    expect(manifest.dependencies).toEqual({ '@molecule/api-bond': '1.0.0' })
    expect(manifest.devDependencies['@molecule/api-bond']).toBeUndefined()
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

  it('--inject wires the providers it declared with the package', async () => {
    const config = await Config.load(MLCL_ROOT)
    vi.spyOn(config, 'runCommand').mockResolvedValue(undefined)
    const cmd = new Add(['@molecule/api-uploads-filesystem', '--no-install', '--inject'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    const [command, args] = vi.mocked(config.runCommand).mock.calls[0] as [string, string[]]
    expect(command).toBe('inject')
    const molecules = args.filter((_arg, i) => args[i - 1] === '--molecule')
    expect(molecules[0]).toBe('@molecule/api-uploads-filesystem')
    expect(molecules).toContain('@molecule/api-middleware-body-parser-express')
    expect(molecules).not.toContain('@molecule/api-uploads')
    // inject prints how to call the added package before its next steps, so the steps end the output.
    expect(args.filter((_arg, i) => args[i - 1] === '--guide')).toEqual([
      '@molecule/api-uploads-filesystem',
    ])
  })

  it('adds several packages in one call, with one inject per workspace (OLD MUSTFAIL)', async () => {
    // `mlcl add a b --inject`, as with `npm install a b`, exited 2 on the second name; agents
    // then re-ran it one name at a time (harness eval `add`, 3 of 5 Codex runs).
    const config = await Config.load(MLCL_ROOT)
    vi.spyOn(config, 'runCommand').mockResolvedValue(undefined)
    const cmd = new Add(
      [
        '@molecule/api-uploads-filesystem',
        '@molecule/api-emails-resend',
        '@molecule/app-i18n-default',
        '--no-install',
        '--inject',
      ],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    const api = JSON.parse(readFileSync(join(dir, 'api', 'package.json'), 'utf8')).dependencies
    const app = JSON.parse(readFileSync(join(dir, 'app', 'package.json'), 'utf8')).dependencies
    expect(api).toHaveProperty('@molecule/api-uploads-filesystem')
    expect(api).toHaveProperty('@molecule/api-emails-resend')
    expect(app).toHaveProperty('@molecule/app-i18n-default')
    expect(app).not.toHaveProperty('@molecule/api-emails-resend')
    const calls = vi.mocked(config.runCommand).mock.calls as [string, string[]][]
    expect(calls).toHaveLength(2)
    const injected = (args: string[]): string[] =>
      args.filter((_arg, i) => args[i - 1] === '--molecule')
    const apiCall = calls.find(([, args]) => args.includes(join(dir, 'api')))![1]
    expect(injected(apiCall)).toEqual(
      expect.arrayContaining(['@molecule/api-uploads-filesystem', '@molecule/api-emails-resend']),
    )
    expect(new Set(injected(apiCall)).size).toBe(injected(apiCall).length)
    const appCall = calls.find(([, args]) => args.includes(join(dir, 'app')))![1]
    expect(injected(appCall)[0]).toBe('@molecule/app-i18n-default')
  })

  it('counterexample: one name still runs exactly one inject', async () => {
    const config = await Config.load(MLCL_ROOT)
    vi.spyOn(config, 'runCommand').mockResolvedValue(undefined)
    const cmd = new Add(['@molecule/api-emails-resend', '--no-install', '--inject'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    expect(vi.mocked(config.runCommand).mock.calls).toHaveLength(1)
  })
})
