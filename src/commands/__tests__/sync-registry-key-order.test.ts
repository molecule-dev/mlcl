/**
 * Every `sync-registry` writer stores registry.json in schema key order.
 *
 * A refresher that sets a key an entry did not have yet (`responseRecord` on a resource that
 * never declared one) and stringifies the parsed object directly stores that key LAST. The file
 * then no longer matches the order `Registry.parse` emits, `registry-schema.test.ts` fails, and
 * the next writer of any other field moves the key, so its diff carries entries it never touched.
 *
 * These tests run the REAL oclif command against a throwaway registry and molecule tree (the
 * `MLCL_REGISTRY_PATH` and `MOLECULE_PACKAGES_DIR` overrides), so nothing touches the real files.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearRegistryCache, serializeRegistry } from '../../lib/registry.js'
import { Registry } from '../../lib/schema.js'
import SyncRegistry from '../sync-registry.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** A valid resource entry with no `responseRecord`, so the scan has to ADD the key. */
function resourceEntry(): Record<string, unknown> {
  return {
    language: 'typescript',
    runtime: 'node',
    type: 'resource',
    category: 'notes',
    label: 'Notes',
    description: 'Notes resource',
    stack: 'api',
    exports: ['Note'],
    routes: [
      { method: 'post', path: '/notes', handler: 'create', middlewares: [] },
      { method: 'get', path: '/notes', handler: 'list', middlewares: [] },
      { method: 'get', path: '/notes/:id', handler: 'read', middlewares: [] },
    ],
    path: 'packages/api/resources/note',
    intentHints: ['notes'],
  }
}

/** Names of entries whose stored key order differs from what `Registry.parse` emits. */
function entriesOutOfSchemaOrder(raw: {
  packages: Record<string, Record<string, unknown>>
}): string[] {
  const parsed = Registry.parse(raw) as { packages: Record<string, Record<string, unknown>> }
  return Object.entries(raw.packages)
    .filter(
      ([name, entry]) => Object.keys(entry).join() !== Object.keys(parsed.packages[name]).join(),
    )
    .map(([name]) => name)
}

describe('sync-registry stores schema key order', () => {
  let config: Config
  let tmp: string
  let registryPath: string
  const origRegistryEnv = process.env.MLCL_REGISTRY_PATH
  const origPackagesEnv = process.env.MOLECULE_PACKAGES_DIR

  beforeAll(async () => {
    config = await Config.load({ root: MLCL_ROOT })
  })

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'mlcl-sync-order-'))
    const src = join(tmp, 'molecule', 'packages', 'api', 'resources', 'note', 'src')
    await mkdir(src, { recursive: true })
    await writeFile(
      join(src, 'types.ts'),
      'export interface Note {\n  id: string\n  title: string\n  body: string | null\n}\n',
    )
    registryPath = join(tmp, 'registry.json')
    const fixture = { version: 1, packages: { '@molecule/api-resource-note': resourceEntry() } }
    await writeFile(registryPath, JSON.stringify(Registry.parse(fixture), null, 2) + '\n')
    process.env.MLCL_REGISTRY_PATH = registryPath
    process.env.MOLECULE_PACKAGES_DIR = join(tmp, 'molecule', 'packages')
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

  it('--scan-records stores an added responseRecord in schema position', async () => {
    await SyncRegistry.run(['--scan-records'], config)

    const raw = JSON.parse(await readFile(registryPath, 'utf-8'))
    const entry = raw.packages['@molecule/api-resource-note']
    expect(entry.responseRecord?.name).toBe('Note')
    expect(entry.responseRecord.fields.map((f: { name: string }) => f.name)).toEqual([
      'id',
      'title',
      'body',
    ])
    expect(entriesOutOfSchemaOrder(raw)).toEqual([])
  })

  it('a scan that adds nothing leaves the bytes unchanged', async () => {
    await SyncRegistry.run(['--scan-records'], config)
    const first = await readFile(registryPath, 'utf-8')
    clearRegistryCache()
    await SyncRegistry.run(['--scan-records'], config)
    expect(await readFile(registryPath, 'utf-8')).toBe(first)
  })
})

describe('serializeRegistry', () => {
  it('moves a key appended to an entry into schema position and sorts packages', () => {
    const entry = resourceEntry()
    const { intentHints, ...rest } = entry
    // `intentHints` first and `language` last: the reverse of schema order for those two.
    const shuffled = { intentHints, ...rest }
    const registry = Registry.parse({
      version: 1,
      packages: { '@molecule/b': resourceEntry(), '@molecule/a': resourceEntry() },
    })
    ;(registry.packages as Record<string, unknown>)['@molecule/a'] = shuffled

    const out = JSON.parse(serializeRegistry(registry))
    expect(Object.keys(out.packages)).toEqual(['@molecule/a', '@molecule/b'])
    expect(entriesOutOfSchemaOrder(out)).toEqual([])
    expect(Object.keys(out)).toEqual(['version', 'packages'])
  })

  it('refuses a registry the schema rejects instead of writing it', () => {
    expect(() => serializeRegistry({ version: 2, packages: {} } as never)).toThrow()
  })
})
