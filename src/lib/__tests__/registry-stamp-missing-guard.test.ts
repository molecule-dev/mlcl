/**
 * `registryStamp` decides whether the registry file EXISTS, and its answer
 * decides whether {@link readRegistryWithStamp} reads the file at all.
 *
 * The old body caught EVERY stat error and returned `null` — "no registry file
 * at this path" — without ever testing `ENOENT`, unlike every comparable guard
 * in this codebase (`writeMigrateRunnerGuarded`, `ensureMigrateRunnerImports`,
 * `snapshotForRollback` all rethrow a non-ENOENT read failure). A non-ENOENT
 * stat failure therefore did not fail the update: `readRegistryWithStamp`
 * answered an EMPTY registry (`{ version: 1, packages: {} }`), never reading the
 * file on disk, `updateRegistryEntry` added its one entry to that empty
 * registry, and the publish step's `null → null` comparison read as "unchanged"
 * — so the rename replaced the registry with a document holding ONE package.
 * Every other entry in the fleet is gone.
 *
 * `ELOOP` is the reproducible trigger: `registry.json` as a symlink whose target
 * cannot be resolved makes `statSync` throw while `renameSync` still succeeds
 * (it replaces the link itself, it does not follow it). A transient `EIO` or
 * `EMFILE` on the stat is the same shape one tick later.
 *
 * Every test here points `MLCL_REGISTRY_PATH` at its own throwaway file — a
 * mistake in that setup writes into mlcl's real `registry.json`.
 *
 * @module
 */
import { lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clearRegistryCache, updateRegistryEntry } from '../registry.js'
import type { RegistryEntry } from '../schema.js'

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
let dir: string

const probeEntry: RegistryEntry = {
  language: 'typescript',
  runtime: 'node',
  type: 'core',
  category: 'test',
  label: 'Stamp guard probe',
  description: 'registry stamp-guard probe',
  stack: 'api',
  path: 'packages/api/core/test',
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-stamp-guard-'))
  clearRegistryCache()
})

afterEach(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

describe('updateRegistryEntry — a stat failure that is not ENOENT is not "no registry"', () => {
  it('refuses to publish over a registry path it could not stat', () => {
    const registryPath = join(dir, 'unstatable.json')
    // A self-referential symlink: `statSync` throws ELOOP, while a rename onto
    // the path still succeeds (it replaces the link, never following it).
    symlinkSync('unstatable.json', registryPath)
    process.env.MLCL_REGISTRY_PATH = registryPath

    let thrown: unknown
    try {
      updateRegistryEntry('@molecule/probe-unstatable', probeEntry)
    } catch (error) {
      thrown = error
    }

    // The failure must be the stat error itself — NOT a silent success.
    expect(
      (thrown as NodeJS.ErrnoException | undefined)?.code,
      'a registry path that cannot be stat\'ed must fail the update, not answer "no registry file"',
    ).toBe('ELOOP')
    // …and nothing may have been published over it: the path is still the
    // symlink it was, not a one-entry registry.json.
    expect(
      lstatSync(registryPath).isSymbolicLink(),
      'the unreadable registry path must be left exactly as it was',
    ).toBe(true)
  })

  it('still creates a registry at a path that genuinely does not exist', () => {
    // Non-vacuousness for the guard above: ENOENT must keep meaning "no file
    // yet" — the first `updateRegistryEntry` of a fresh install has to work.
    const registryPath = join(dir, 'fresh.json')
    process.env.MLCL_REGISTRY_PATH = registryPath

    updateRegistryEntry('@molecule/probe-fresh', probeEntry)

    const written = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, unknown>
    }
    expect(Object.keys(written.packages)).toEqual(['@molecule/probe-fresh'])
  })
})
