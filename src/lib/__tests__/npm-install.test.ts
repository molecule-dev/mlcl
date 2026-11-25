/**
 * Every `npm install` mlcl runs skips npm's audit and funding notice: mlcl captures npm's output,
 * so neither reaches anyone, and the audit finished last — 12.6 s of a cold `mlcl create`'s 47 s
 * install (npm's timing log, 2026-11-23).
 */
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

const { execaMock } = vi.hoisted(() => ({ execaMock: vi.fn() }))
vi.mock('execa', () => ({ execa: execaMock }))

const { npmInstall, npmInstallArgs } = await import('../npm-install.js')

const SRC = join(import.meta.dirname, '..', '..')

/** Every non-test TypeScript file under `dir`. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path)
    return name.endsWith('.ts') && !name.endsWith('.d.ts') ? [path] : []
  })
}

/** A direct `npm install` call: `execa('npm', ['install' …`, `spawn(…)`, `exec('npm install …')`. */
const DIRECT_INSTALL =
  /\b(?:execa|spawn|execFile|execFileSync|spawnSync)\(\s*'npm',\s*\[\s*'install'|\bexec(?:Async|Sync)?\(\s*['`]npm install/

afterEach(() => execaMock.mockReset())

describe('npm install as mlcl runs it', () => {
  it('skips the audit and the funding notice, and reuses the cache when asked', () => {
    expect(npmInstallArgs()).toEqual(['install', '--no-audit', '--no-fund'])
    expect(npmInstallArgs({ preferOffline: true })).toEqual([
      'install',
      '--no-audit',
      '--no-fund',
      '--prefer-offline',
    ])
  })

  it('runs npm in the given directory with its output captured', async () => {
    execaMock.mockResolvedValue({ stdout: '' })
    await npmInstall('/work/app', { preferOffline: true })
    expect(execaMock).toHaveBeenCalledWith(
      'npm',
      ['install', '--no-audit', '--no-fund', '--prefer-offline'],
      { cwd: '/work/app', stdio: 'pipe' },
    )
  })

  /** A project whose lock has esbuild, where the install adds puppeteer (its Chrome download must run). */
  function addsPuppeteer(root: string): unknown[] {
    writeFileSync(join(root, 'package.json'), '{ "name": "proj" }')
    writeFileSync(
      join(root, 'package-lock.json'),
      JSON.stringify({ packages: { 'node_modules/esbuild': { hasInstallScript: true } } }),
    )
    const seen: unknown[] = []
    execaMock.mockImplementation(async (_cmd: string, args: string[]) => {
      seen.push([args[0], JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))])
      if (args[0] === 'install') {
        writeFileSync(
          join(root, 'package-lock.json'),
          JSON.stringify({
            packages: {
              'node_modules/esbuild': { hasInstallScript: true },
              'node_modules/puppeteer': { hasInstallScript: true },
            },
          }),
        )
        mkdirSync(join(root, 'node_modules', 'puppeteer'), { recursive: true })
        writeFileSync(join(root, 'node_modules', 'puppeteer', 'package.json'), '{}')
      }
      return { stdout: '' }
    })
    return seen
  }

  it('in an app mlcl did not just create, decides only for the packages the install adds', async () => {
    // `mlcl add` gave an Express app's own esbuild a decision, and Codex spent a reinstall taking
    // it back out (harness eval `add`, 2026-11-25).
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-install-'))
    try {
      const seen = addsPuppeteer(root)
      await npmInstall(root)
      expect(seen).toEqual([
        ['install', { name: 'proj' }],
        ['rebuild', { name: 'proj', allowScripts: { puppeteer: true } }],
      ])
      expect(execaMock).toHaveBeenLastCalledWith('npm', ['rebuild', 'puppeteer'], {
        cwd: root,
        stdio: 'pipe',
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('in a project it just created, decides install scripts before the install, and runs an approved one it skipped', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-install-'))
    try {
      const seen = addsPuppeteer(root)
      await npmInstall(root, { wholeTree: true })
      expect(seen).toEqual([
        ['install', { name: 'proj', allowScripts: { esbuild: false } }],
        ['rebuild', { name: 'proj', allowScripts: { esbuild: false, puppeteer: true } }],
      ])
      expect(execaMock).toHaveBeenLastCalledWith('npm', ['rebuild', 'puppeteer'], {
        cwd: root,
        stdio: 'pipe',
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('is the only way mlcl source runs npm install', () => {
    const files = sources(SRC)
    expect(files.length).toBeGreaterThan(100)
    const direct = files
      .filter((file) => !file.endsWith(join('lib', 'npm-install.ts')))
      .filter((file) => DIRECT_INSTALL.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file))
    expect(direct, 'run npmInstall / npmInstallArgs from lib/npm-install.ts instead').toEqual([])
  })
})
