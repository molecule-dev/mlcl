// @vitest-environment node
/**
 * ONE read+parse of the registry per process, not one per READER.
 *
 * `loadRegistry` (every scaffold / inject / resolution path) and
 * `getRawRegistry` (every framework / toolchain / version accessor —
 * `getMoleculeVersion` among them) each parsed the 1.5 MB registry file
 * themselves, behind two independent caches. A single `mlcl inject` populates
 * BOTH (it calls `loadRegistry()` and then `loadAppFrameworks()` /
 * `getMoleculeVersion`), so it paid the read, the `JSON.parse` and the zod
 * validation (~27 ms of the fleet-sized file, per the raw-cache test) twice,
 * with the cost growing with the fleet and not with the work.
 *
 * The derived `InferredPackage[]` is still cached (same array object between
 * calls), but it is now derived FROM the shared raw cache, so a second reader
 * adds no second read — and, because the raw cache is keyed by (path, mtime,
 * size), `loadRegistry` also sees an edit another process made instead of
 * serving a stale parse forever.
 *
 * @module
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache, getRawRegistry, loadRegistry } from '../registry.js'

/** Count (and pass through) reads of the temp registry — one read == one parse. */
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

const registryWith = (label: string): string =>
  JSON.stringify({
    version: 1,
    packages: {
      '@molecule/test-single-parse-probe': {
        type: 'core',
        category: 'test',
        stack: 'api',
        label,
        description: 'single-parse probe',
        path: 'packages/api/core/test',
      },
    },
  })

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string
let registryPath: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-single-parse-'))
  registryPath = join(dir, 'registry.json')
  reads.registryPath = registryPath
  process.env.MLCL_REGISTRY_PATH = registryPath
})

afterAll(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

afterEach(() => {
  clearRegistryCache()
  reads.count = 0
})

describe('the registry file is read+parsed once, not once per reader', () => {
  it('serves getRawRegistry from loadRegistry’s parse', () => {
    writeFileSync(registryPath, registryWith('First'))
    clearRegistryCache()

    expect(loadRegistry().map((p) => p.name)).toContain('@molecule/test-single-parse-probe')
    expect(getRawRegistry().packages['@molecule/test-single-parse-probe']?.label).toBe('First')
    // Two readers, ONE read of the registry file.
    expect(reads.count).toBe(1)
  })

  it('serves loadRegistry from getRawRegistry’s parse', () => {
    writeFileSync(registryPath, registryWith('Second'))
    clearRegistryCache()

    expect(getRawRegistry().packages['@molecule/test-single-parse-probe']?.label).toBe('Second')
    expect(loadRegistry().map((p) => p.name)).toContain('@molecule/test-single-parse-probe')
    expect(reads.count).toBe(1)
  })

  it('still caches the derived packages between calls', () => {
    writeFileSync(registryPath, registryWith('Third'))
    clearRegistryCache()

    const first = loadRegistry()
    const second = loadRegistry()
    expect(second).toBe(first)
    expect(reads.count).toBe(1)
  })

  it('sees an external edit instead of serving the first parse forever', () => {
    writeFileSync(registryPath, registryWith('Before'))
    clearRegistryCache()
    expect(loadRegistry().map((p) => p.name)).toContain('@molecule/test-single-parse-probe')

    // Another process rewrites the registry (molecule's pre-commit doc regen,
    // mlcl sync-registry in a sibling invocation). Both readers must see it —
    // neither may serve the parse it took before the edit.
    //
    // The rewritten document must differ in SIZE, not only in mtime: the cache
    // key is (mtimeMs, size), and a filesystem with coarse timestamp
    // granularity reports the same mtime for two writes inside one tick — so a
    // same-length rewrite would be invisible, and this test would fail on a
    // machine whose filesystem is coarser than this one's (the sibling
    // raw-cache suite states and follows the same rule).
    writeFileSync(registryPath, registryWith('After-the-edit'))
    expect(getRawRegistry().packages['@molecule/test-single-parse-probe']?.label).toBe(
      'After-the-edit',
    )
    expect(loadRegistry()[0]?.molecule?.label).toBe('After-the-edit')
  })
})
