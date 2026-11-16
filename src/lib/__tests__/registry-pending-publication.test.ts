/** Pending catalog declarations survive writers but never enter package discovery. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import {
  clearRegistryCache,
  getRawRegistry,
  loadRegistry,
  serializeRegistry,
  writeRegistryFile,
} from '../registry.js'
import { Registry } from '../schema.js'

it('preserves first-publish declarations through the real registry writer and excludes them from discovery', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-pending-publication-'))
  const previous = process.env.MLCL_REGISTRY_PATH
  process.env.MLCL_REGISTRY_PATH = join(dir, 'registry.json')
  const entry = {
    type: 'core',
    category: 'test',
    stack: 'app',
    label: 'Widget',
    description: 'Pending widget',
    path: 'packages/app/core/widget',
    exports: ['Widget'],
  }
  try {
    const registry = Registry.parse({
      version: 1,
      packages: { '@molecule/existing': entry },
      pendingPackages: { '@molecule/new-widget': entry },
    })
    writeRegistryFile(process.env.MLCL_REGISTRY_PATH, registry)
    expect(getRawRegistry().pendingPackages?.['@molecule/new-widget'].exports).toEqual(['Widget'])
    expect(loadRegistry().map((p) => p.name)).toEqual(['@molecule/existing'])
    expect(readFileSync(process.env.MLCL_REGISTRY_PATH, 'utf8')).toBe(serializeRegistry(registry))
    const restored = Registry.parse({
      ...registry,
      packages: { ...registry.packages, ...registry.pendingPackages },
      pendingPackages: undefined,
    })
    writeRegistryFile(process.env.MLCL_REGISTRY_PATH, restored)
    expect(loadRegistry().map((p) => p.name)).toEqual([
      '@molecule/existing',
      '@molecule/new-widget',
    ])
  } finally {
    if (previous === undefined) delete process.env.MLCL_REGISTRY_PATH
    else process.env.MLCL_REGISTRY_PATH = previous
    clearRegistryCache()
    rmSync(dir, { recursive: true, force: true })
  }
})
