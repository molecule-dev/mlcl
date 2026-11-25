/**
 * `mlcl create --activity-capture` (molecule.dev's create) declares activity capture before its first
 * `npm install`, as one package: the generated bonds index awaits its setup call last. A create
 * without the flag declares none of it.
 *
 * Runs the REAL oclif command with `--skip-install`; the manifest is read at the moment inject
 * would run, which is right after the install.
 *
 * @module
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl create — activity capture packages', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-capture-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /** Create with the real command and return the api dependencies at the moment inject runs. */
  async function dependenciesAtInject(extra: string[]): Promise<string[]> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        'proj',
        '--type',
        'full-stack',
        '--framework',
        'react',
        '--packages',
        '@molecule/api-resource-user,@molecule/api-database-sqlite,@molecule/app-auth',
        '--no-interactive',
        '--skip-install',
        ...extra,
      ],
      config,
    )
    const atInstall: string[] = []
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
    vi.spyOn(
      cmd as unknown as { runInject: (path: string) => Promise<void> },
      'runInject',
    ).mockImplementation(async () => {
      if (atInstall.length > 0) return
      const manifest = JSON.parse(
        await readFile(join(dir, 'proj', 'api', 'package.json'), 'utf-8'),
      ) as { dependencies: Record<string, string> }
      atInstall.push(...Object.keys(manifest.dependencies))
    })
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }
    return atInstall
  }

  it('is one package in api/package.json before the install, with the cores it peers on', async () => {
    const atInstall = await dependenciesAtInject(['--activity-capture'])
    expect(atInstall).toContain('@molecule/api-activity-capture')
    // A core the package peers on, which --legacy-peer-deps would not install.
    expect(atInstall).toContain('@molecule/api-bond')
    // The packages it depends on come with it, not as the project's own.
    expect(atInstall.filter((name) => /-capture$/.test(name))).toEqual([
      '@molecule/api-activity-capture',
    ])
  })

  // A project made outside molecule.dev records nothing there, so it gets none of them.
  it('are not declared without --activity-capture', async () => {
    const atInstall = await dependenciesAtInject([])
    expect(atInstall.filter((name) => /^@molecule\/api-activity|-capture$/.test(name))).toEqual([])
  })
})
