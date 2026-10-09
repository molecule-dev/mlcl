/**
 * `executeInjection`'s `updatePackageJson` write used to sit OUTSIDE the
 * rollback set: every plan-file and migration write snapshots its target, but
 * the manifest was written bare. A write that fails mid-flight (a full disk)
 * leaves a CORRUPT package.json — and the rollback that restores everything
 * else repaired everything but the one file that now cannot be parsed, so the
 * failed inject left the project strictly worse (the policy the rollback
 * exists for: unchanged, never worse). The manifest is snapshotted like every
 * other write; this file pins that a failing manifest write rolls back to the
 * pre-injection bytes.
 *
 * The failure itself is simulated by intercepting `writeFile` for the
 * manifest: it truncates the file to garbage and THEN throws — the shape of a
 * short write on ENOSPC, and one no stub of `updatePackageJson`'s inputs can
 * produce (a manifest that fails to PARSE throws before any write, which is a
 * different, already-covered ordering).
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile as realWriteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { executeInjection, type InjectionPlan } from '../injector.js'

const intercept = vi.hoisted(() => ({ armed: false }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal()
  type WriteFileArgs = Parameters<(typeof actual)['writeFile']>
  return {
    ...actual,
    writeFile: async (
      path: WriteFileArgs[0],
      data: WriteFileArgs[1],
      options?: WriteFileArgs[2],
    ): Promise<void> => {
      if (intercept.armed && typeof path === 'string' && path.endsWith('package.json')) {
        // Partial write first, then the failure — the corrupt-manifest shape.
        // The intercept fires ONCE: the rollback's own restore write must go
        // through (a transient ENOSPC does not repeat).
        intercept.armed = false
        await actual.writeFile(path, '{ "corrupted')
        throw new Error('write failed mid-flight (simulated ENOSPC)')
      }
      return actual.writeFile(path, data, options)
    },
  }
})

let dir: string | null = null
afterEach(async () => {
  intercept.armed = false
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('executeInjection rolls back a failed manifest write', () => {
  it('restores the pre-injection package.json when its write fails mid-flight', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-injector-rollback-'))
    const manifestPath = join(dir, 'package.json')
    const original = JSON.stringify({ name: 'demo-api', dependencies: {} }, null, 2) + '\n'
    await realWriteFile(manifestPath, original)

    const plan: InjectionPlan = {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'utility',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [],
      dependencies: [{ name: 'left-pad', version: '1.3.0', type: 'dependency' }],
      routeWiring: [],
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }

    intercept.armed = true
    const result = await executeInjection(plan, dir, { autoInstall: false })

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    // The manifest is the pre-injection bytes again — not the corrupt
    // partial write the failing `writeFile` left behind.
    expect(await readFile(manifestPath, 'utf-8')).toBe(original)
  })
})
