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

import type * as Execa from 'execa'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { execaMock } = vi.hoisted(() => ({ execaMock: vi.fn() }))
vi.mock('execa', () => ({ execa: execaMock }))

const { npmFailureDetail, npmInstall, npmInstallArgs } = await import('../npm-install.js')

/** Relay the real npm streams through ordinary shell pipes in restricted test runners. */
const npmPipeArgs = (file: string, args: string[]): string[] => [
  '-c',
  '"$@" > >(cat) 2> >(cat >&2)',
  '--',
  file,
  ...args,
]

/** npm 11's stderr for the failed SQLite build of harness eval scaffold, 2026-11-25. */
const GYP_FAILURE = [
  'npm error code 1',
  'npm error path /work/proj/node_modules/better-sqlite3',
  'npm error command failed',
  'npm error command sh -c node-gyp rebuild',
  'npm error gyp info it worked if it ends with ok',
  'npm error gyp info using node-gyp@12.4.0',
  'npm error gyp http GET https://nodejs.org/download/release/v26.12.1/node-v26.12.1-headers.tar.gz',
  'npm error gyp WARN install got an error, rolling back install',
  'npm error gyp ERR! configure error ',
  'npm error gyp ERR! stack Error: getaddrinfo EAI_AGAIN nodejs.org',
  'npm error gyp ERR! stack at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)',
  'npm error gyp ERR! System Linux 6.8.0-147-generic',
  'npm error gyp ERR! cwd /work/proj/node_modules/better-sqlite3',
  'npm error gyp ERR! not ok',
  'npm error A complete log of this run can be found in: /home/u/.npm/_logs/2026-11-25T20_08_21_964Z-debug-0.log',
].join('\n')

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

afterEach(() => {
  execaMock.mockReset()
  vi.unstubAllEnvs()
})

describe('npm install as mlcl runs it', () => {
  it('skips the audit and the funding notice, and reuses the cache when asked', () => {
    expect(npmInstallArgs()).toEqual(['install', '--no-audit', '--no-fund', '--loglevel=notice'])
    expect(npmInstallArgs({ preferOffline: true })).toEqual([
      'install',
      '--no-audit',
      '--no-fund',
      '--loglevel=notice',
      '--prefer-offline',
    ])
  })

  it('runs npm in the given directory with its output captured', async () => {
    execaMock.mockResolvedValue({ stdout: '' })
    await npmInstall('/work/app', { preferOffline: true })
    expect(execaMock).toHaveBeenCalledWith(
      'npm',
      ['install', '--no-audit', '--no-fund', '--loglevel=notice', '--prefer-offline'],
      { cwd: '/work/app', stdio: 'pipe' },
    )
  })

  type Manifest = { name: string; allowScripts?: Record<string, boolean> }
  const manifestOf = (root: string): Manifest =>
    JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Manifest

  /**
   * A project whose lock has esbuild, where the install adds puppeteer (its Chrome download must
   * run) and better-sqlite3 (which must not compile). better-sqlite3's lock entry names no script,
   * as npm writes it for a package with `gypfile: false`.
   */
  function installAdds(root: string, { fails = false } = {}): [string, Manifest][] {
    writeFileSync(join(root, 'package.json'), '{ "name": "proj" }')
    writeFileSync(
      join(root, 'package-lock.json'),
      JSON.stringify({ packages: { 'node_modules/esbuild': { hasInstallScript: true } } }),
    )
    const seen: [string, Manifest][] = []
    execaMock.mockImplementation(async (_cmd: string, args: string[]) => {
      seen.push([args[0], manifestOf(root)])
      if (args[0] === 'install') {
        if (fails) throw new Error('npm ERR! code E404')
        writeFileSync(
          join(root, 'package-lock.json'),
          JSON.stringify({
            packages: {
              'node_modules/esbuild': { hasInstallScript: true },
              'node_modules/puppeteer': { hasInstallScript: true },
              'api/node_modules/better-sqlite3': { version: '13.0.3' },
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

  it('in a project it just created, decides every install script before npm runs, and keeps the decisions of what the install brought', async () => {
    // From mlcl's starter lock, npm read better-sqlite3 from its lock entry, which carries no
    // `gypfile: false`, and compiled SQLite: the decision was written only after the install,
    // because the entry has no `hasInstallScript`. Every SQLite create compiled it and fetched
    // Node's headers from nodejs.org (harness eval scaffold, 2026-11-25).
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-install-'))
    try {
      const seen = installAdds(root)
      await npmInstall(root, { wholeTree: true })
      expect(seen.map(([command]) => command)).toEqual(['install'])
      expect(seen[0][1].allowScripts).toEqual(
        expect.objectContaining({ 'better-sqlite3': false, esbuild: false, puppeteer: true }),
      )
      expect(manifestOf(root)).toEqual({
        name: 'proj',
        allowScripts: { 'better-sqlite3': false, esbuild: false, puppeteer: true },
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('in an app mlcl did not just create, decides only for the packages its lock does not hold', async () => {
    // `mlcl add` gave an Express app's own esbuild a decision, and Codex spent a reinstall taking
    // it back out (harness eval `add`, 2026-11-25).
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-install-'))
    try {
      const seen = installAdds(root)
      await npmInstall(root)
      expect(seen[0][1].allowScripts).toEqual(
        expect.objectContaining({ 'better-sqlite3': false, puppeteer: true }),
      )
      expect(seen[0][1].allowScripts).not.toHaveProperty('esbuild')
      expect(manifestOf(root)).toEqual({
        name: 'proj',
        allowScripts: { 'better-sqlite3': false, puppeteer: true },
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('takes its entries back out when the install fails', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-install-'))
    try {
      installAdds(root, { fails: true })
      await expect(npmInstall(root, { wholeTree: true })).rejects.toThrow('E404')
      expect(manifestOf(root)).toEqual({ name: 'proj', allowScripts: { esbuild: false } })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('runs the script of an approved package installed before its entry was written', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-install-'))
    try {
      const seen = installAdds(root)
      mkdirSync(join(root, 'node_modules', 'puppeteer'), { recursive: true })
      writeFileSync(join(root, 'node_modules', 'puppeteer', 'package.json'), '{}')
      await npmInstall(root, { wholeTree: true })
      expect(seen.map(([command]) => command)).toEqual(['install', 'rebuild'])
      expect(execaMock).toHaveBeenLastCalledWith(
        'npm',
        ['rebuild', 'puppeteer', '--loglevel=notice'],
        {
          cwd: root,
          stdio: 'pipe',
        },
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports why an install failed in npm’s own words, without its progress, trace and log lines', () => {
    expect(npmFailureDetail({ shortMessage: 'Command failed', stderr: GYP_FAILURE })).toBe(
      [
        'npm error code 1',
        'npm error path /work/proj/node_modules/better-sqlite3',
        'npm error command failed',
        'npm error command sh -c node-gyp rebuild',
        'npm error gyp ERR! configure error',
        'npm error gyp ERR! stack Error: getaddrinfo EAI_AGAIN nodejs.org',
      ].join('\n'),
    )
    expect(npmFailureDetail({ stderr: 'npm ERR! code E404\nnpm ERR! 404 Not Found - GET x' })).toBe(
      'npm ERR! code E404\nnpm ERR! 404 Not Found - GET x',
    )
    expect(
      npmFailureDetail({
        stderr: '',
        shortMessage: 'Command failed with exit code 1: npm install',
      }),
    ).toBe('Command failed with exit code 1: npm install')
    expect(npmFailureDetail(new Error('spawn npm ENOENT\nmore'))).toBe('spawn npm ENOENT')
  })

  it('reports the same real npm install error under a silent parent', async () => {
    const { execa } = await vi.importActual<typeof Execa>('execa')
    execaMock.mockImplementation((file, args, options) =>
      execa('bash', npmPipeArgs(file, args), options),
    )
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-diagnostic-'))
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ name: 'proj', dependencies: { 'invalid name': '1.0.0' } }),
      )
      vi.stubEnv('npm_config_cache', join(root, 'cache'))
      vi.stubEnv('npm_config_offline', 'true')
      vi.stubEnv('npm_config_loglevel', 'notice')
      const normal = await npmInstall(root).then(() => '', npmFailureDetail)
      expect(normal).toContain('EINVALIDPACKAGENAME')
      vi.stubEnv('npm_config_loglevel', 'silent')
      await expect(npmInstall(root).then(() => '', npmFailureDetail)).resolves.toBe(normal)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports the same real npm rebuild error under a silent parent', async () => {
    const { execa } = await vi.importActual<typeof Execa>('execa')
    const root = mkdtempSync(join(tmpdir(), 'mlcl-npm-rebuild-'))
    try {
      const installed = join(root, 'node_modules', 'puppeteer')
      mkdirSync(installed, { recursive: true })
      const manifest = JSON.stringify({
        name: 'puppeteer',
        version: '1.0.0',
        scripts: { install: 'exit 27' },
      })
      writeFileSync(join(installed, 'package.json'), manifest)
      vi.stubEnv('npm_config_cache', join(root, 'cache'))
      vi.stubEnv('npm_config_offline', 'true')
      vi.stubEnv('npm_config_logs_max', '0')
      const run = async (level: string): Promise<string> => {
        // The fixture models an already installed package. Rebuild its failing script with npm.
        installAdds(root)
        const install = execaMock.getMockImplementation()
        execaMock.mockImplementation(async (file, args, options) => {
          if (args[0] === 'rebuild') return execa('bash', npmPipeArgs(file, args), options)
          const result = await install?.(file, args, options)
          writeFileSync(join(installed, 'package.json'), manifest)
          return result
        })
        vi.stubEnv('npm_config_loglevel', level)
        return npmInstall(root, { wholeTree: true }).then(() => '', npmFailureDetail)
      }
      const normal = await run('notice')
      expect(normal).toContain('npm error code 27')
      expect(await run('silent')).toBe(normal)
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
