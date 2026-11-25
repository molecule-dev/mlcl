/**
 * The PWA package (and with it vite-plugin-pwa and workbox, about 190 packages) is installed for
 * web push, not for every app with a framework binding.
 *
 * `@molecule/app-push` required `@molecule/app-pwa-default`, and `@molecule/app-react`,
 * `@molecule/app-platform` and `@molecule/app-settings-panel-react` require `@molecule/app-push`,
 * so every React scaffold installed the service worker toolchain: 187 of the 2026-11-23 scaffold
 * eval's packages (24.9 MB) and a registered worker in an app that sends no push. The PWA package is
 * an optional peer of the push package now; `mlcl create --packages` and `mlcl add` naming push add
 * it, the peer walk does not.
 *
 * Runs the REAL oclif commands against a temp directory, with `--skip-install` / `--no-install` and
 * the inject child replaced.
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { serviceWorkerPackageFor } from '../../lib/peer-closure.js'
import Add from '../add.js'
import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const PUSH = '@molecule/app-push'
const PWA = '@molecule/app-pwa-default'

/**
 * The dependency names an `app/package.json` declares.
 *
 * @param path - The manifest's path.
 * @returns Its `dependencies` and `devDependencies` names.
 */
async function declared(path: string): Promise<string[]> {
  const manifest = JSON.parse(await readFile(path, 'utf-8')) as Record<string, object | undefined>
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]
}

describe('the service worker comes with push, not with every framework binding', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-push-worker-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Scaffold a React app with the given packages.
   *
   * @param packages - The `--packages` list.
   * @returns The names `app/package.json` declares.
   */
  async function create(packages: string[]): Promise<string[]> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        'proj',
        '--type',
        'app',
        '--framework',
        'react',
        '--packages',
        packages.join(','),
        '--no-interactive',
        '--skip-install',
      ],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
    vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject').mockResolvedValue(
      undefined,
    )
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }
    return declared(join(dir, 'proj', 'package.json'))
  }

  it('keeps the PWA out of a React app that did not ask for push', async () => {
    const deps = await create(['@molecule/app-auth'])

    // The framework binding still brings the push interface, which costs nothing.
    expect(deps).toContain('@molecule/app-react')
    expect(deps).not.toContain(PWA)
    expect(deps).not.toContain('vite-plugin-pwa')
  })

  it('adds the PWA when the selection names push', async () => {
    const deps = await create(['@molecule/app-auth', PUSH])

    expect(deps).toContain(PUSH)
    expect(deps).toContain(PWA)
  })

  it('mlcl add of push declares the PWA and its own peers', async () => {
    mkdirSync(join(dir, 'app'))
    writeFileSync(
      join(dir, 'app', 'package.json'),
      `${JSON.stringify({ name: 'x', dependencies: { [PUSH]: '1.0.0' } })}\n`,
    )
    process.chdir(join(dir, 'app'))
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add([PUSH, '--no-install'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()

    const deps = await declared(join(dir, 'app', 'package.json'))
    expect(deps).toContain(PWA)
    // The worker package's own required peers are closed over too.
    expect(deps).toContain('@molecule/app-version')
  })

  it('names the PWA only for a package that needs a push worker', () => {
    expect(serviceWorkerPackageFor([PUSH])).toBe(PWA)
    expect(
      serviceWorkerPackageFor(['@molecule/app-react', '@molecule/app-version']),
    ).toBeUndefined()
  })
})
