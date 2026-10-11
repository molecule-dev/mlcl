// @vitest-environment node
/**
 * `getRawRegistry` caches the parsed registry per (path, file IDENTITY).
 *
 * The identity is the nanosecond mtime, the size and the inode
 * (`registryCacheKey`), so neither of the two ways the file changes in
 * practice is invisible: a rename-in publish moves a new inode into place
 * (even when the bytes are the same length and the millisecond is the same)
 * and an in-place rewrite bumps the mtime.
 *
 * Every framework/toolchain/version accessor funnels through it —
 * `getMoleculeVersion` among them, which scaffold and inject call once per
 * dependency — and before the cache each call re-read and re-parsed the whole
 * 1.5 MB registry file (~27 ms; a scaffold pays that dozens of times over,
 * scaling with the fleet rather than with the work). The cache must still
 * honor an edit made OUTSIDE this process (molecule's pre-commit doc regen
 * writes registry.json), which is what the identity key buys.
 *
 * The read-count assertions below fail against an uncached getRawRegistry:
 * a second call with the file untouched must not hit the disk again.
 *
 * @module
 */
import { mkdtempSync, renameSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  clearRegistryCache,
  getRawRegistry,
  loadRegistry,
  RAW_REGISTRY_CACHE_LIMIT,
} from '../../lib/registry.js'

/**
 * Count (and pass through) readFileSync calls that hit the temp registries —
 * hoisted so registry.ts binds the counting wrapper before its own import.
 * `scope` covers every registry file the suite creates under the temp dir, so
 * a test can count reads across SEVERAL registry paths (the eviction pin).
 */
const reads = vi.hoisted(() => ({ registryPath: '', scope: '', count: 0 }))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realReadFileSync = actual.readFileSync as (p: unknown, ...rest: unknown[]) => string
  return {
    ...actual,
    readFileSync(path: unknown, ...rest: unknown[]): string {
      const at = String(path)
      if (at === reads.registryPath || (reads.scope !== '' && at.startsWith(reads.scope)))
        reads.count++
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

// The two contents also differ in SIZE, which is belt-and-braces rather than
// the mechanism: the key is the file's identity (nanosecond mtime, size and
// inode — see `registryCacheKey`), so a same-length rewrite is still a miss.
// The third test below pins that with a rename at a pinned timestamp.
const FIRST = 'one'
const SECOND = 'two-with-a-different-length'

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string
let registryPath: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-raw-registry-cache-'))
  registryPath = join(dir, 'registry.json')
  reads.registryPath = registryPath
  reads.scope = dir
  process.env.MLCL_REGISTRY_PATH = registryPath
})

afterAll(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
})

afterEach(() => {
  // Two tests below point the override at OTHER paths — the eviction pin walks
  // one path per cache slot, and the missing-file case points at a path that
  // does not exist — and neither restores it, so without this every test that
  // ran AFTER them read a different registry than the one it wrote
  // (`getRawRegistry` answered the other file's, or an absent file's,
  // contents). The suite's assertions then held or failed purely on the order
  // it happened to run in. The path is this suite's shared input, so it is
  // re-asserted here rather than left to declaration order.
  process.env.MLCL_REGISTRY_PATH = registryPath
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
    // doc regen case): the identity key must miss and re-read.
    writeFileSync(registryPath, marker(SECOND))
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe(SECOND)
  })

  it('sees a same-size publish that landed in the same millisecond', () => {
    // A publish replaces the file by RENAME (`writeRegistry`'s own shape), and
    // these two states are the same LENGTH. With an (mtimeMs, size) key they are
    // indistinguishable inside one millisecond, so the process kept serving the
    // first parse — stale for every accessor that funnels through
    // getRawRegistry (`getMoleculeVersion`, frameworks, toolchain) — until the
    // file happened to change size. `utimesSync` pins the timestamp, so the
    // collision is the point of the test rather than a race it would only
    // sometimes exercise. The identity now carries the inode (and nanoseconds),
    // and a rename brings a new inode into place.
    const first = marker('one')
    const second = marker('two')
    expect(first.length, 'the two states must be the same size to collide').toBe(second.length)
    const instant = new Date(1_700_000_000_000) // whole milliseconds — ns part 0

    writeFileSync(registryPath, first)
    utimesSync(registryPath, instant, instant)
    clearRegistryCache()
    expect(getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label).toBe('one')

    const temp = `${registryPath}.rival.tmp`
    writeFileSync(temp, second)
    utimesSync(temp, instant, instant)
    renameSync(temp, registryPath)

    expect(
      getRawRegistry().packages['@molecule/test-raw-cache-probe']?.label,
      'a same-size publish at the same millisecond is still a change',
    ).toBe('two')
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

  it('evicts the oldest path once the cache passes its path limit', () => {
    // The map "holds at most RAW_REGISTRY_CACHE_LIMIT paths — never a growth
    // surface". The eviction branch is otherwise dead in the suite (no test
    // loaded a fifth path), so raising the limit, removing it, or evicting the
    // NEW entry instead of the oldest all passed silently. Reads are the
    // observable: an unmodified path answered from the cache does not hit the
    // disk; an evicted one re-reads.
    const paths = Array.from({ length: RAW_REGISTRY_CACHE_LIMIT + 1 }, (_unused, index) =>
      join(dir, `registry-${index}.json`),
    )
    clearRegistryCache()
    reads.count = 0
    for (const path of paths) {
      writeFileSync(path, marker(FIRST))
      process.env.MLCL_REGISTRY_PATH = path
      getRawRegistry()
    }
    expect(reads.count).toBe(paths.length)

    // The FIRST-loaded path is the one the cap evicted: asking again re-reads.
    process.env.MLCL_REGISTRY_PATH = paths[0]
    getRawRegistry()
    expect(reads.count, 'the oldest path must have been evicted at the cap').toBe(paths.length + 1)

    // The last-loaded path is still cached: no additional read.
    process.env.MLCL_REGISTRY_PATH = paths[paths.length - 1]
    getRawRegistry()
    expect(reads.count, 'the newest path must still be cached').toBe(paths.length + 1)
  })

  it('loadRegistry throws for a MISSING registry file while getRawRegistry answers empty', () => {
    // The two readers split on `present` on purpose: an empty package list is
    // a VALID registry, so getRawRegistry's accessors may answer an empty
    // section — but loadRegistry must not confuse "no fleet" with "no registry
    // file", or every resolution failure becomes silent "nothing to do".
    const missing = join(dir, 'no-such-registry.json')
    process.env.MLCL_REGISTRY_PATH = missing
    clearRegistryCache()
    expect(() => loadRegistry()).toThrow(new RegExp(`Registry not found: ${missing}`))
    expect(getRawRegistry()).toEqual({ version: 1, packages: {} })
  })
})
