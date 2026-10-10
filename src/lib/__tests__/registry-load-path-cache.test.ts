/**
 * `MLCL_REGISTRY_PATH` is documented as resolved PER CALL — "so an override set
 * after module load is respected" — and `getRawRegistry` honours it (its cache
 * key is the path plus mtime/size). `loadRegistry`, the reader every scaffold,
 * inject and resolution path actually uses, cached the parsed packages behind a
 * bare `InferredPackage[] | null`: once anything had loaded the FIRST registry,
 * a reader pointed at an alternate registry silently got the first one's
 * packages.
 *
 * The cache is now keyed by the path it was parsed from, the same contract.
 *
 * `MOLECULE_PACKAGES_DIR` gets the same treatment: the derived entries carry
 * `path: join(moleculeDir, entry.path)`, and `resolveMoleculeDir()` reads that
 * env var PER CALL, so a cache keyed on the registry path alone handed the
 * second caller the FIRST packages directory's paths.
 *
 * @module
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { clearRegistryCache, loadRegistry } from '../registry.js'

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
const originalPackagesDir = process.env.MOLECULE_PACKAGES_DIR
let dir: string

const registryWith = (name: string, label: string): string =>
  JSON.stringify({
    version: 1,
    packages: {
      [name]: {
        type: 'core',
        category: 'test',
        stack: 'api',
        label,
        description: 'registry path-cache probe',
        path: 'packages/api/core/test',
      },
    },
  })

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-path-cache-'))
})

afterAll(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  if (originalPackagesDir === undefined) delete process.env.MOLECULE_PACKAGES_DIR
  else process.env.MOLECULE_PACKAGES_DIR = originalPackagesDir
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

afterEach(() => {
  if (originalPackagesDir === undefined) delete process.env.MOLECULE_PACKAGES_DIR
  else process.env.MOLECULE_PACKAGES_DIR = originalPackagesDir
  clearRegistryCache()
})

describe('loadRegistry — the parsed cache is keyed by the registry path', () => {
  it('answers from the registry the override currently points at', () => {
    const first = join(dir, 'first.json')
    const second = join(dir, 'second.json')
    writeFileSync(first, registryWith('@molecule/probe-first', 'First'))
    writeFileSync(second, registryWith('@molecule/probe-second', 'Second'))

    process.env.MLCL_REGISTRY_PATH = first
    expect(loadRegistry().map((p) => p.name)).toContain('@molecule/probe-first')

    // Point every reader at an alternate registry — the multi-registry
    // workflow the override exists for. The cached packages of `first` must not
    // be handed back for `second`.
    process.env.MLCL_REGISTRY_PATH = second
    const names = loadRegistry().map((p) => p.name)
    expect(names).toContain('@molecule/probe-second')
    expect(names).not.toContain('@molecule/probe-first')
  })

  it('still answers the same registry from cache across calls', () => {
    const only = join(dir, 'only.json')
    writeFileSync(only, registryWith('@molecule/probe-only', 'Only'))

    process.env.MLCL_REGISTRY_PATH = only
    const a = loadRegistry()
    const b = loadRegistry()
    expect(a.map((p) => p.name)).toEqual(['@molecule/probe-only'])
    // Same parse, same objects — the path key must not defeat the cache.
    expect(b).toBe(a)
  })

  it('derives the entry paths from the packages dir the environment names now', () => {
    const only = join(dir, 'packages-dir.json')
    writeFileSync(only, registryWith('@molecule/probe-only', 'Only'))
    process.env.MLCL_REGISTRY_PATH = only

    // A first load under the default (no override) resolves the monorepo next to
    // mlcl. `entries[].path` is `join(moleculeDir, entry.path)`.
    delete process.env.MOLECULE_PACKAGES_DIR
    const before = loadRegistry()[0]?.path ?? ''
    expect(before.endsWith(join('molecule', 'packages', 'api', 'core', 'test'))).toBe(true)

    // Point the packages dir elsewhere and read again: the derivation reads this
    // env var PER CALL, so the second reader must not be handed the first
    // directory's path (the same "asked one file, got another's answer" the
    // registry-path key exists to prevent).
    process.env.MOLECULE_PACKAGES_DIR = join(dir, 'elsewhere', 'packages')
    expect(loadRegistry()[0]?.path).toBe(join(dir, 'elsewhere', 'packages', 'api', 'core', 'test'))
  })
})
