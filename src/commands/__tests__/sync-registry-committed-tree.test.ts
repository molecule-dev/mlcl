/**
 * `sync-registry` reads a molecule git checkout at HEAD, and the working tree only for the package
 * directories it is given.
 *
 * The molecule working tree is shared by every session on a machine. On 2026-11-25 an unscoped sync
 * of it recorded exports and UI kit peers that only other sessions' uncommitted edits had (mlcl
 * 14d45864c4, and again in 2762518da2), and the release's registry gate, which reads molecule at a
 * pinned commit, refused the release. These tests run the REAL oclif command against a throwaway
 * registry and a throwaway molecule git checkout.
 */
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearRegistryCache } from '../../lib/registry.js'
import { Registry } from '../../lib/schema.js'
import SyncRegistry from '../sync-registry.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const A = 'packages/api/utilities/probe-a'
const B = 'packages/api/utilities/probe-b'

/** A valid utility entry at `path` that exports `probe`. */
function entry(path: string, label: string): Record<string, unknown> {
  return {
    language: 'typescript',
    runtime: 'node',
    type: 'utility',
    category: label.toLowerCase().replace(/ /g, '-'),
    label,
    description: label,
    stack: 'api',
    exports: ['probe'],
    path,
    intentHints: [label.toLowerCase()],
  }
}

const source = (...names: string[]): string =>
  names.map((name) => `/** ${name}. */\nexport const ${name} = 1\n`).join('\n')

describe('sync-registry reads molecule HEAD unless package directories are named', () => {
  let config: Config
  let tmp: string
  let molecule: string
  let registryPath: string
  const origRegistryEnv = process.env.MLCL_REGISTRY_PATH
  const origPackagesEnv = process.env.MOLECULE_PACKAGES_DIR

  const git = (...args: string[]): string =>
    execFileSync(
      'git',
      ['-C', molecule, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
      {
        encoding: 'utf8',
      },
    )
  const exportsOf = async (name: string): Promise<string[]> =>
    [...JSON.parse(await readFile(registryPath, 'utf-8')).packages[name].exports].sort()

  beforeAll(async () => {
    config = await Config.load({ root: MLCL_ROOT })
  })

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'mlcl-sync-head-'))
    molecule = join(tmp, 'molecule')
    for (const [path, name] of [
      [A, '@molecule/api-probe-a'],
      [B, '@molecule/api-probe-b'],
    ]) {
      await mkdir(join(molecule, path, 'src'), { recursive: true })
      await writeFile(
        join(molecule, path, 'package.json'),
        `${JSON.stringify({ name, version: '1.0.0', description: name }, null, 2)}\n`,
      )
      await writeFile(join(molecule, path, 'src', 'index.ts'), source('probe'))
    }
    git('init', '-q')
    git('add', '-A')
    git('commit', '-qm', 'probes')
    registryPath = join(tmp, 'registry.json')
    const fixture = {
      version: 1,
      packages: {
        '@molecule/api-probe-a': entry(A, 'Probe A'),
        '@molecule/api-probe-b': entry(B, 'Probe B'),
      },
    }
    await writeFile(registryPath, JSON.stringify(Registry.parse(fixture), null, 2) + '\n')
    // Both packages gain an export in the working tree only: another session's work in flight.
    await writeFile(join(molecule, A, 'src', 'index.ts'), source('probe', 'later'))
    await writeFile(join(molecule, B, 'src', 'index.ts'), source('probe', 'theirs'))
    process.env.MLCL_REGISTRY_PATH = registryPath
    process.env.MOLECULE_PACKAGES_DIR = join(molecule, 'packages')
    clearRegistryCache()
  })

  afterEach(async () => {
    if (origRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
    else process.env.MLCL_REGISTRY_PATH = origRegistryEnv
    if (origPackagesEnv === undefined) delete process.env.MOLECULE_PACKAGES_DIR
    else process.env.MOLECULE_PACKAGES_DIR = origPackagesEnv
    clearRegistryCache()
    await rm(tmp, { recursive: true, force: true })
  })

  it('records no uncommitted export from an unscoped sync, and leaves no export behind', async () => {
    await SyncRegistry.run(['--scan-exports'], config)
    expect(await exportsOf('@molecule/api-probe-a')).toEqual(['probe'])
    expect(await exportsOf('@molecule/api-probe-b')).toEqual(['probe'])
    expect((await readdir(tmp)).filter((name) => name.startsWith('.sync-registry-head-'))).toEqual(
      [],
    )
    expect(process.env.MOLECULE_PACKAGES_DIR).toBe(join(molecule, 'packages'))
  })

  it('records a committed export from an unscoped sync', async () => {
    git('add', A)
    git('commit', '-qm', 'later')
    await SyncRegistry.run(['--scan-exports'], config)
    expect(await exportsOf('@molecule/api-probe-a')).toEqual(['later', 'probe'])
    expect(await exportsOf('@molecule/api-probe-b')).toEqual(['probe'])
  })

  it('updates only the named package, from the working tree', async () => {
    await SyncRegistry.run(['--scan-exports', A], config)
    expect(await exportsOf('@molecule/api-probe-a')).toEqual(['later', 'probe'])
    expect(await exportsOf('@molecule/api-probe-b')).toEqual(['probe'])
  })

  it('refuses a package directory in another shape instead of updating nothing', async () => {
    await expect(SyncRegistry.run(['--scan-exports', join(molecule, A)], config)).rejects.toThrow(
      /relative to the molecule root/,
    )
    expect(await exportsOf('@molecule/api-probe-a')).toEqual(['probe'])
  })

  it('counterexample: reads a tree that is not a git checkout as it is', async () => {
    await rm(join(molecule, '.git'), { recursive: true, force: true })
    await SyncRegistry.run(['--scan-exports'], config)
    expect(await exportsOf('@molecule/api-probe-a')).toEqual(['later', 'probe'])
    expect(await exportsOf('@molecule/api-probe-b')).toEqual(['probe', 'theirs'])
  })
})
