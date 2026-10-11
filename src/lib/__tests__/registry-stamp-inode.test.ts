/**
 * `mutateRegistry`'s optimistic-concurrency gate is only as good as the file
 * state it compares, and that state used to be `(mtimeNs, size)`.
 *
 * `writeRegistry` publishes by RENAME, which brings a NEW inode into place — so
 * two same-length documents written inside one clock tick are indistinguishable
 * by timestamp and size alone (Linux file timestamps come from the coarse
 * clock, so `mtimeNs` is not finer than a tick). A rival writer's publish in
 * that window read as "unchanged", the rename went through, and the rival's
 * entry was silently dropped — the exact failure the stamp exists to catch.
 *
 * `registryCacheKey` already carries the inode for the identical reason, and
 * `registry-raw-cache.test.ts` pins the collision on the READ side by renaming a
 * same-size, same-timestamp file into place. This is the WRITE side:
 * `statSync` is driven so the read-stamp stat and the publish-check stat report
 * the same `mtimeNs` and `size` and a different inode — the state a rename
 * produces — and the publish must be refused.
 *
 * @module
 */
import type * as NodeFs from 'node:fs'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Alternates the inode on every bigint `statSync` of the registry path: the
 * stat taken before the read (the stamp) and the stat taken before the publish
 * therefore never agree, which is what a rename between them produces.
 */
const statState = vi.hoisted(() => ({ calls: 0 }))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>()
  type StatSync = typeof actual.statSync
  return {
    ...actual,
    statSync: ((path: unknown, options?: unknown) => {
      const bigintMode = (options as { bigint?: boolean } | undefined)?.bigint === true
      if (bigintMode && String(path).endsWith('registry.json')) {
        statState.calls += 1
        // Same state by timestamp and length; only the inode moves — exactly
        // what `renameSync` of an equal-length document produces.
        return {
          mtimeNs: 1_700_000_000_000_000_000n,
          size: 42n,
          ino: statState.calls % 2 === 1 ? 1n : 2n,
        }
      }
      return (actual.statSync as StatSync)(path as never, options as never)
    }) as StatSync,
  }
})

import { clearRegistryCache, updateRegistryEntry } from '../registry.js'

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-stamp-inode-'))
  statState.calls = 0
})

afterEach(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

describe('updateRegistryEntry — the publish stamp is a file IDENTITY', () => {
  it('refuses a publish whose only difference is the inode', () => {
    const registryPath = join(dir, 'registry.json')
    writeFileSync(registryPath, `${JSON.stringify({ version: 1, packages: {} })}\n`)
    process.env.MLCL_REGISTRY_PATH = registryPath
    clearRegistryCache()

    expect(
      () =>
        updateRegistryEntry('@molecule/probe-inode', {
          language: 'typescript',
          runtime: 'node',
          type: 'core',
          category: 'test',
          label: 'Inode probe',
          description: 'registry stamp-inode probe',
          stack: 'api',
          path: 'packages/api/core/test',
        }),
      'a publish that replaced the file (new inode, same mtime/size) must be refused, not renamed over',
    ).toThrow(/kept changing/)
  })
})
