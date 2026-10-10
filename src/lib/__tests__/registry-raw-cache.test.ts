// @vitest-environment node
/**
 * `getRawRegistry` caches the parsed registry per (path, mtime, size).
 *
 * Every framework/toolchain/version accessor funnels through it —
 * `getMoleculeVersion` among them, which scaffold and inject call once per
 * dependency — and before the cache each call re-read and re-parsed the whole
 * 1.5 MB registry file (~27 ms; a scaffold pays that dozens of times over,
 * scaling with the fleet rather than with the work). The cache must still
 * honor an edit made OUTSIDE this process (molecule's pre-commit doc regen
 * writes registry.json), which is what the mtime/size key buys.
 *
 * The read-count assertions below fail against an uncached getRawRegistry:
 * a second call with the file untouched must not hit the disk again.
 *
 * @module
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache, getRawRegistry } from '../../lib/registry.js'

/**
 * Count (and pass through) readFileSync calls that hit the temp registry —
 * hoisted so registry.ts binds the counting wrapper before its own import.
 */
const reads = vi.hoisted(() => ({ registryPath: '', count: 0 }))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realReadFileSync = actual.readFileSync as (p: unknown, ...rest: unknown[]) => string
  return {
    ...actual,
    readFileSync(path: unknown, ...rest: unknown[]): string {
      if (path === reads.registryPath) reads.count++
      return realReadFileSync(path, ...rest)
    },
  }
})

const marker = (label: string): string =>
  JSON.stringify({
    version: 1,
    packages: {
      '@molecule/test-raw-cache-probe': {
        type: 'core',
        category: 'test',
        stack: 'api',
        label,
        description: 'raw-registry cache probe',
        path: 'packages/api/core/test',
      },
    },
  })

// The two contents must differ in SIZE, not just mtime: filesystems with
// coarse mtime granularity would make same-size rewrites look untouched.
const FIRST = 'one'
const SECOND = 'two-with-a-different-length'

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string
let registryPath: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-raw-registry-cache-'))
  registryPath = join(dir, 'registry.json')
  reads.registryPath = registryPath
  process.env.MLCL_REGISTRY_PATH = registryPath
})

afterAll(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
})

afterEach(() => {
  clearRegistryCache()
  reads.count = 0
})

describe('getRawRegistry — parsed-registry cache', () => {
  it('parses an untouched file once, not once per call', () => {
    writeFileSync(registryPath, marker(FIRST))
    clearRegistryCache()

    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(FIRST)
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(FIRST)
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(FIRST)
    // Three accessor calls, ONE read of the registry file.
    expect(reads.count).toBe(1)
  })

  it('sees an edit another process made to the file', () => {
    writeFileSync(registryPath, marker(FIRST))
    clearRegistryCache()
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(FIRST)

    // External write (no clearRegistryCache in this process — the pre-commit
    // doc regen case): the mtime/size key must miss and re-read.
    writeFileSync(registryPath, marker(SECOND))
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(SECOND)
  })

  it('honors clearRegistryCache as a forced invalidation', () => {
    writeFileSync(registryPath, marker(FIRST))
    clearRegistryCache()
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(FIRST)
    expect(reads.count).toBe(1)

    clearRegistryCache()
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(FIRST)
    expect(reads.count).toBe(2)
  })
})
