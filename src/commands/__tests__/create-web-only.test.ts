/**
 * `mlcl create` of a React Native app refuses a package that renders only in a browser, and a
 * package that requires one as a peer, before it writes anything. A React app is created with them.
 *
 * Runs the real oclif command against a temporary directory.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRawRegistry } from '../../lib/registry.js'
import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const CANVAS = '@molecule/app-feature-canvas-react'
const MIND_MAP = '@molecule/app-mind-map-canvas-react'

describe('mlcl create of a React Native app with a web-only package', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-web-only-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.restoreAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Runs `mlcl create proj --type app` non-interactively, without installing.
   *
   * @param framework - The app framework.
   * @param packages - The `--packages` list.
   * @returns What the command threw (null when it finished) and what it reported.
   */
  async function create(
    framework: string,
    packages: string,
  ): Promise<{ outcome: unknown; output: string }> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        'proj',
        '--type',
        'app',
        '--framework',
        framework,
        '--packages',
        packages,
        '--skip-install',
        '--no-interactive',
      ],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    const reported = vi.spyOn(cmd, 'error')
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
      return { outcome: null, output: reported.mock.calls.map((c) => String(c[0])).join('\n') }
    } catch (error) {
      return { outcome: error, output: reported.mock.calls.map((c) => String(c[0])).join('\n') }
    }
  }

  it('refuses a package that requires a web-only one, naming the chain, and writes nothing', async () => {
    const { outcome, output } = await create('react-native', MIND_MAP)
    const reason = getRawRegistry().packages[CANVAS]?.webOnlyReason
    expect(reason).toEqual(expect.any(String))
    expect(outcome).toBeTruthy()
    expect(output).toBe(
      `This project renders with React Native, and these packages render only in a browser, so the project was not created:\n  app-mind-map-canvas-react → app-feature-canvas-react: ${reason}`,
    )
    expect(existsSync(join(dir, 'proj'))).toBe(false)
  })

  it('counterexample: a React app passes the check', async () => {
    const { output } = await create('react', MIND_MAP)
    expect(output).not.toContain('render only in a browser')
    expect(existsSync(join(dir, 'proj', 'package.json'))).toBe(true)
  })
})
