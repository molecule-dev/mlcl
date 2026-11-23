/**
 * `mlcl create` installs what its own steps declare after the first `npm install`.
 *
 * The install runs before inject, because inject plans against the installed copies, and inject
 * then declares the third-party packages its bond files import. Packages declared after the
 * install were never installed, so a custom full-stack scaffold handed back an API whose first
 * build stopped at TS2307 until someone ran `npm install`; on 2026-11-23 Claude Code and Codex
 * both did. (The activity-capture packages were the first such case; they are declared before the
 * install now: `create-capture-before-install.test.ts`.)
 *
 * Runs the REAL oclif command against a temp directory. Only the children are replaced: `npm
 * install` records what the manifests declare when it runs, and inject writes the bonds file the
 * real one generates.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** The bonds file inject generates for an API workspace, reduced to what the capture wiring reads. */
const BONDS_INDEX = `import { bond } from '@molecule/api-bond'

export async function setupBonds(): Promise<void> {
  bond('logger', console)
}
`

describe('mlcl create — packages declared after the first install', () => {
  let dir: string
  let prevCwd: string
  /** The api manifest's dependency names at each `npm install`. */
  let installs: string[][]

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-late-declarations-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    installs = []
    execaMock.mockReset()
    execaMock.mockImplementation((async (
      file: string,
      args: readonly string[],
      options?: { cwd?: string },
    ) => {
      if (file === 'npm' && args[0] === 'install') {
        const manifest = JSON.parse(
          await readFile(join(options?.cwd ?? dir, 'api', 'package.json'), 'utf-8'),
        ) as { dependencies?: Record<string, string> }
        installs.push(Object.keys(manifest.dependencies ?? {}))
        return { exitCode: 0, stdout: '', stderr: '' }
      }
      // The smoke test and the formatter: nothing installed to run, so report success.
      return { exitCode: 0, stdout: 'Tests  1 passed (1)', stderr: '' }
    }) as unknown as typeof execa)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Run `mlcl create proj` for a full-stack React app, with install.
   *
   * @param bonds - Whether the inject child writes the API's bonds file, as the real one does.
   * @param declares - Dependencies the inject child adds to the API manifest, as the real one adds
   *   the packages its bond files import.
   * @returns The warnings it printed.
   */
  async function create(bonds: boolean, declares: Record<string, string> = {}): Promise<string[]> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      ['proj', '--type', 'full-stack', '--framework', 'react', '--no-interactive'],
      config,
    )
    const warnings: string[] = []
    vi.spyOn(cmd, 'warn').mockImplementation((input) => {
      warnings.push(String(input))
      return input
    })
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(
      cmd as unknown as { runInject: (path: string) => Promise<void> },
      'runInject',
    ).mockImplementation(async (path: string) => {
      if (!bonds || basename(path) !== 'api') return
      await mkdir(join(path, 'src', 'bonds'), { recursive: true })
      await writeFile(join(path, 'src', 'bonds', 'index.ts'), BONDS_INDEX)
      const manifestPath = join(path, 'package.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
        dependencies?: Record<string, string>
      }
      manifest.dependencies = { ...manifest.dependencies, ...declares }
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    })
    await cmd.run()
    return warnings
  }

  it('installs again once inject has declared a package the install did not see', async () => {
    await create(true, { 'late-dependency': '1.0.0' })

    const api = JSON.parse(await readFile(join(dir, 'proj', 'api', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(api.dependencies['late-dependency']).toBeDefined()
    expect(installs).toHaveLength(2)
    expect(installs[0]).not.toContain('late-dependency')
    // The last install saw every package the project declares.
    expect(installs[1]).toEqual(Object.keys(api.dependencies))
  })

  it('installs once when nothing is declared after the install, the capture wiring included', async () => {
    await create(true)

    const api = JSON.parse(await readFile(join(dir, 'proj', 'api', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(installs.at(-1)).toEqual(Object.keys(api.dependencies))
    expect(installs).toHaveLength(1)
  })
})
