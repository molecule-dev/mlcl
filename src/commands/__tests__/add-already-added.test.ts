/**
 * An add of a package an earlier add already declared and installed writes nothing and installs
 * nothing. Claude added `@molecule/api-uploads` and then `@molecule/api-uploads-filesystem`, the
 * provider the first add had already brought, and the second add reinstalled the project (harness
 * eval `add`, 2026-11-25). The inject handoff still runs: wiring is inject's to judge.
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Add from '../add.js'

vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '1.0.0\n' })),
}))

/** Stands in for `npm install`: every declared `@molecule/*` package lands in node_modules. */
const npmInstall = vi.hoisted(() =>
  vi.fn(async (root: string) => {
    const { readFileSync } = await import('node:fs')
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
      if (!name.startsWith('@molecule/')) continue
      const dir = join(root, 'node_modules', name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }))
    }
  }),
)
vi.mock('../../lib/npm-install.js', () => ({ npmInstall }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const UPLOADS = '@molecule/api-uploads'
const UPLOADS_FILESYSTEM = '@molecule/api-uploads-filesystem'

describe('mlcl add of a package already added', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-already-added-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify(
        {
          name: 'notes-api',
          version: '1.0.0',
          type: 'module',
          dependencies: { express: '5.3.0' },
          devDependencies: { typescript: '6.0.3' },
        },
        null,
        2,
      ) + '\n',
    )
    npmInstall.mockClear()
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Runs the real command with the inject handoff stubbed.
   *
   * @param argv - The command's arguments.
   * @returns The packages it handed to inject.
   */
  async function add(argv: string[]): Promise<string[]> {
    const config = await Config.load(MLCL_ROOT)
    const handoff = vi.fn(async () => undefined)
    vi.spyOn(config, 'runCommand').mockImplementation(handoff as never)
    const cmd = new Add(argv, config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }
    const args = (handoff.mock.calls[0]?.[1] ?? []) as string[]
    return args.flatMap((arg, i) => (args[i - 1] === '--molecule' ? [arg] : []))
  }

  it('installs once when the second add names the provider the first brought (OLD MUSTFAIL)', async () => {
    await add([UPLOADS, '--inject'])
    expect(npmInstall).toHaveBeenCalledTimes(1)
    const manifest = await readFile(join(dir, 'package.json'), 'utf8')
    expect(JSON.parse(manifest).dependencies[UPLOADS_FILESYSTEM]).toBeDefined()

    const wired = await add([UPLOADS_FILESYSTEM, '--inject'])

    expect(npmInstall, 'the second add must not reinstall').toHaveBeenCalledTimes(1)
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(manifest)
    expect(wired, 'inject still judges the wiring').toContain(UPLOADS_FILESYSTEM)
  })

  it('counterexample: a declared package that is not installed is installed', async () => {
    await add([UPLOADS, '--inject', '--no-install'])
    expect(npmInstall).not.toHaveBeenCalled()

    await add([UPLOADS_FILESYSTEM, '--inject'])

    expect(npmInstall).toHaveBeenCalledTimes(1)
  })
})
