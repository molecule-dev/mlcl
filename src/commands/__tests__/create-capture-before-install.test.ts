/**
 * `mlcl create` declares the activity-capture packages before its first `npm install`.
 *
 * The capture wiring runs after inject, which needs the install, and it declared its 7 packages
 * (plus the 6 cores they peer on) only then. create saw 13 new names and installed a second time,
 * downloading them (2026-11-23 scaffold eval: "Installing 37 packages declared after the first
 * install"). Declared before the install, the first one fetches them.
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

  it('are in api/package.json before the install, with the cores they peer on', async () => {
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

    for (const name of [
      '@molecule/api-activity',
      '@molecule/api-activity-http',
      '@molecule/api-emails-capture',
      '@molecule/api-push-capture',
      // A capture provider's core, which --legacy-peer-deps would not install.
      '@molecule/api-emails',
    ]) {
      expect(atInstall).toContain(name)
    }
  })
})
