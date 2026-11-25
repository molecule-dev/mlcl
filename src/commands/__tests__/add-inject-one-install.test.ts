/**
 * `mlcl add <pkg> --inject` installs once: everything the inject handoff declares is already in
 * the manifest add installed from.
 *
 * inject declares each package it wires with that package's own third-party dependencies and
 * required peers (`busboy` for the Express body parser), from the package's manifest, and sorts
 * both dependency maps. When add had not, inject's declaration changed the install inputs after
 * add's install and inject installed a second time (the add eval, 2026-11-24). This runs the REAL
 * command, then applies inject's own declaration step, with the plan it builds from each wired
 * package's manifest, to what add wrote: it must change nothing.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { declareDependencies, type DependencyChange } from '../../lib/injector.js'
import { getRawRegistry } from '../../lib/registry.js'
import Add from '../add.js'

vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '1.0.0\n' })),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const MOLECULE_ROOT = join(MLCL_ROOT, '..', 'molecule')
const UPLOADS_FILESYSTEM = '@molecule/api-uploads-filesystem'

type Manifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [field: string]: unknown
}

/**
 * The dependency changes inject plans for a wired package, built as `planInjection` builds them:
 * the package's non-`@molecule` dependencies and its required peers, from its own manifest.
 *
 * @param name - A wired `@molecule/*` package.
 * @returns Its dependency changes.
 */
function injectPlan(name: string): DependencyChange[] {
  const path = getRawRegistry().packages[name]?.path
  if (!path) throw new Error(`${name} is not in the registry`)
  const manifest = JSON.parse(readFileSync(join(MOLECULE_ROOT, path, 'package.json'), 'utf8')) as {
    version: string
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    peerDependenciesMeta?: Record<string, { optional?: boolean }>
  }
  const optional = manifest.peerDependenciesMeta ?? {}
  return [
    ...Object.entries(manifest.dependencies ?? {})
      .filter(([dep]) => !dep.startsWith('@molecule/'))
      .map(([dep, version]): DependencyChange => ({ name: dep, version, type: 'dependency' })),
    ...Object.entries(manifest.peerDependencies ?? {})
      .filter(([dep]) => optional[dep]?.optional !== true)
      .map(([dep, version]): DependencyChange => ({ name: dep, version, type: 'peerDependency' })),
  ]
}

describe('mlcl add --inject — one install', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-add-one-install-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    // An existing Express API, as the add eval's fixture is.
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
   * @returns The manifest it wrote and the packages it handed to inject.
   */
  async function add(argv: string[]): Promise<{ manifest: Manifest; wired: string[] }> {
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
    const argvOfInject = (handoff.mock.calls[0]?.[1] ?? []) as string[]
    const wired = argvOfInject.flatMap((arg, i) =>
      argvOfInject[i - 1] === '--molecule' ? [arg] : [],
    )
    return {
      manifest: JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as Manifest,
      wired,
    }
  }

  it('declares everything inject declares before its install (OLD MUSTFAIL)', async () => {
    const { manifest, wired } = await add([UPLOADS_FILESYSTEM, '--inject', '--no-install'])
    expect(wired).toContain(UPLOADS_FILESYSTEM)
    // The Express body parser the uploads route needs brings busboy.
    expect(manifest.dependencies?.busboy).toMatch(/^\d+\.\d+\.\d+$/)

    const afterInject = structuredClone(manifest)
    for (const name of wired) declareDependencies(afterInject, injectPlan(name), name)
    // Byte for byte, key order included: inject compares the install inputs as JSON.
    expect(JSON.stringify(afterInject, null, 2)).toBe(JSON.stringify(manifest, null, 2))
  })

  // Counterexample: without --inject, add declares only the packages and their @molecule peers.
  it('declares no third-party dependency without --inject', async () => {
    const { manifest, wired } = await add([UPLOADS_FILESYSTEM, '--no-install'])
    expect(wired).toEqual([])
    expect(manifest.dependencies?.[UPLOADS_FILESYSTEM]).toBeDefined()
    expect(manifest.dependencies?.busboy).toBeUndefined()
  })
})
