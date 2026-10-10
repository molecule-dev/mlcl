// @vitest-environment node
/**
 * `writeRegistry` publishes registry.json by rename from a temp file in the
 * same directory — never by an in-place `writeFileSync`, which TRUNCATES the
 * fleet's single source of truth first and then writes: a crash (or a full
 * disk) between the two leaves a truncated registry.json that every mlcl
 * command's parse fails on, with no backup. The pid in the temp name keeps
 * parallel mlcl processes from renaming each other's half-written file.
 *
 * The load-bearing assertion below — `writeFileSync` is NEVER called with the
 * registry path itself — fails against the old in-place write; the
 * content-unchanged-on-failure assertions hold both before and after and pin
 * the restore behavior.
 *
 * @module
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/** Every writeFileSync target, in order, plus a per-test failure predicate. */
const writes = vi.hoisted(() => ({
  paths: [] as string[],
  /** When set, writeFileSync throws for paths containing this fragment. */
  failOnFragment: null as string | null,
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realWriteFileSync = actual.writeFileSync as (path: unknown, ...rest: unknown[]) => void
  return {
    ...actual,
    writeFileSync(path: unknown, ...rest: unknown[]): void {
      const p = typeof path === 'string' ? path : String(path)
      writes.paths.push(p)
      if (writes.failOnFragment !== null && p.includes(writes.failOnFragment)) {
        throw new Error(`ENOSPC: simulated full disk writing ${p}`)
      }
      return realWriteFileSync(path, ...rest)
    },
  }
})

import { clearRegistryCache, updateRegistryEntry } from '../../lib/registry.js'

const entry = (): {
  type: 'core'
  category: string
  stack: 'api'
  label: string
  description: string
  path: string
} => ({
  type: 'core' as const,
  category: 'test',
  stack: 'api' as const,
  label: 'Write probe',
  description: 'registry write atomicity probe',
  path: 'packages/api/core/test',
})

const marker = (label: string): string =>
  JSON.stringify({
    version: 1,
    packages: {
      '@molecule/test-write-probe': {
        type: 'core',
        category: 'test',
        stack: 'api',
        label,
        description: 'registry write atomicity probe',
        path: 'packages/api/core/test',
      },
    },
  })

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string
let registryPath: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-write-'))
  registryPath = join(dir, 'registry.json')
  process.env.MLCL_REGISTRY_PATH = registryPath
})

afterAll(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
})

beforeEach(() => {
  writes.paths.length = 0
  writes.failOnFragment = null
  writeFileSync(registryPath, marker('before'))
  // The seed write goes through the same mocked writeFileSync — clear it so
  // the recording holds only what writeRegistry itself did this test.
  writes.paths.length = 0
  clearRegistryCache()
})

describe('writeRegistry — atomic publication', () => {
  it('updates the entry and leaves a parseable registry behind', () => {
    updateRegistryEntry('@molecule/test-write-probe', entry())
    const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, { label: string }>
    }
    expect(parsed.packages['@molecule/test-write-probe']?.label).toBe('Write probe')
  })

  it('never truncates the registry in place, and a failed publish leaves the original bytes', () => {
    // Fail the TEMP write (a full disk during publication); the temp name
    // carries `.tmp`, the registry path never does.
    writes.failOnFragment = '.tmp'
    expect(() => updateRegistryEntry('@molecule/test-write-probe', entry())).toThrow(
      /simulated full disk/,
    )
    // The registry file itself was never the target of a destructive
    // in-place write — content is published by rename from the temp file.
    expect(writes.paths).not.toContain(registryPath)
    // And the original bytes are exactly what the failed run started with.
    expect(readFileSync(registryPath, 'utf-8')).toBe(marker('before'))
  })
})
