// @vitest-environment node
/**
 * `rawRegistryAt` decides whether the registry FILE exists for every
 * `getRawRegistry` accessor — `loadToolchain`, `loadAppFrameworks`,
 * `getMoleculeVersion`, `loadStagingDrivers`, `loadThemePresets`.
 *
 * Its stat catch answered EVERY failure with "absent" — an empty registry —
 * without testing `ENOENT`, the exact defect `registryStamp` (the write path's
 * equivalent) was fixed for: a symlinked registry whose target cannot be
 * resolved (`ELOOP`), a transient `EIO`, an `EMFILE` under fd pressure. The
 * read accessors then silently scaffold without toolchain pins and resolve
 * every `getMoleculeVersion` to the 1.0.0 fallback, while `loadRegistry` — the
 * one accessor that DOES check `present` — reports the misleading "Registry not
 * found: <path>" for a file that is right there.
 *
 * `ELOOP` is the reproducible trigger, the same one the write-path guard's
 * suite uses. Every test here points `MLCL_REGISTRY_PATH` at its own throwaway
 * path.
 *
 * @module
 */
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clearRegistryCache, getRawRegistry, loadToolchain } from '../registry.js'

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-raw-stat-guard-'))
  clearRegistryCache()
})

afterEach(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

describe('rawRegistryAt — a stat failure that is not ENOENT is not "no registry"', () => {
  it('getRawRegistry fails with the stat error, never an empty registry', () => {
    const registryPath = join(dir, 'unstatable.json')
    // A self-referential symlink: statSync throws ELOOP.
    symlinkSync('unstatable.json', registryPath)
    process.env.MLCL_REGISTRY_PATH = registryPath

    expect(() => getRawRegistry()).toThrowError(expect.objectContaining({ code: 'ELOOP' }) as Error)
  })

  it('loadToolchain fails with the stat error instead of answering no pins', () => {
    const registryPath = join(dir, 'unstatable-toolchain.json')
    symlinkSync('unstatable-toolchain.json', registryPath)
    process.env.MLCL_REGISTRY_PATH = registryPath

    expect(() => loadToolchain()).toThrowError(expect.objectContaining({ code: 'ELOOP' }) as Error)
  })

  it('still answers the empty registry for a path that genuinely does not exist', () => {
    // Non-vacuousness for the guard above: ENOENT must keep meaning "no file
    // yet" — a fresh checkout before any registry exists.
    process.env.MLCL_REGISTRY_PATH = join(dir, 'absent.json')

    expect(Object.keys(getRawRegistry().packages)).toEqual([])
    expect(loadToolchain()).toEqual({ shared: {}, api: {}, app: {}, moleculePackage: {} })
  })
})
