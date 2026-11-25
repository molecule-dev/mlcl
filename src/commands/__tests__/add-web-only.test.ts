/**
 * `mlcl add` in a React Native project refuses a package that renders only in a browser, and a
 * package that requires one as a peer, before it writes the manifest. A browser project adds them.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as prompts from '@clack/prompts'
import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRawRegistry } from '../../lib/registry.js'
import Add from '../add.js'

vi.mock('@clack/prompts', async (original) => ({
  ...(await original<typeof prompts>()),
  cancel: vi.fn(),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const CANVAS = '@molecule/app-feature-canvas-react'
const MIND_MAP = '@molecule/app-mind-map-canvas-react'

/**
 * A project manifest that renders with the given framework.
 *
 * @param framework - The framework `mlcl create` records.
 * @returns The manifest text.
 */
const manifest = (framework: string): string =>
  `${JSON.stringify({ name: 'x', molecule: { framework }, dependencies: {} }, null, 2)}\n`

describe('mlcl add of a web-only package', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-web-only-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    vi.clearAllMocks()
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Runs `mlcl add <name> --no-install` in the temporary project.
   *
   * @param name - The package to add.
   * @returns The command's run.
   */
  async function add(name: string): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Add([name, '--no-install'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    await cmd.run()
  }

  it('refuses a package that requires a web-only one in a React Native project, naming the chain', async () => {
    writeFileSync(join(dir, 'package.json'), manifest('react-native'))
    await expect(add(MIND_MAP)).rejects.toThrow()
    const reason = getRawRegistry().packages[CANVAS]?.webOnlyReason
    expect(reason).toEqual(expect.any(String))
    expect(prompts.cancel).toHaveBeenCalledWith(
      `This project renders with React Native, and these packages render only in a browser, so nothing was added:\n  app-mind-map-canvas-react → app-feature-canvas-react: ${reason}`,
    )
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe(manifest('react-native'))
  })

  it('counterexample: a browser project adds it', async () => {
    writeFileSync(join(dir, 'package.json'), manifest('react'))
    await add(MIND_MAP)
    expect(prompts.cancel).not.toHaveBeenCalled()
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg.dependencies).toHaveProperty(MIND_MAP)
    expect(pkg.dependencies).toHaveProperty(CANVAS)
  })

  it('counterexample: a React Native project adds a feature that renders on a device', async () => {
    writeFileSync(join(dir, 'package.json'), manifest('react-native'))
    await add('@molecule/app-sparkline-react')
    expect(prompts.cancel).not.toHaveBeenCalled()
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg.dependencies).toHaveProperty('@molecule/app-sparkline-react')
  })
})
