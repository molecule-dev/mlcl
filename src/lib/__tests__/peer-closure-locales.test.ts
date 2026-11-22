/**
 * The peer closure declares each package's companion locale bonds too.
 *
 * `mlcl inject` plans the locale bond of every `@molecule` package a manifest declares
 * (`resolveLocalePackages`) and refuses one that is not installed. The closure used to add
 * `moleculePeers` and default providers only, so every full-stack scaffold declared
 * `@molecule/api-uploads` (a peer of `@molecule/api-bonds-default-express`) without
 * `@molecule/api-locales-uploads`, and after `npm install`, `mlcl inject -p api` exited 1 with
 * "Could not resolve @molecule/api-locales-uploads" (mlcl 2.1.81, 2026-11-15).
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { resolveLocalePackages } from '../features.js'
import { closeMoleculePeers, missingMoleculePeers } from '../peer-closure.js'
import { loadRegistry } from '../registry.js'

const registry = loadRegistry()
const byName = new Map(registry.map((pkg) => [pkg.name, pkg]))

describe('missingMoleculePeers and companion locales', () => {
  it('adds the locale bond of a peer it adds (api-bonds-default-express → api-uploads)', () => {
    const missing = missingMoleculePeers(['@molecule/api-bonds-default-express'], byName)
    expect(missing).toContain('@molecule/api-uploads')
    expect(missing).toContain('@molecule/api-locales-uploads')
  })

  it('adds the locale bond of a package the set already declares', () => {
    expect(missingMoleculePeers(['@molecule/api-uploads'], byName)).toContain(
      '@molecule/api-locales-uploads',
    )
  })

  it('leaves out a locale bond another package owns (control: secrets → not secrets-doppler)', () => {
    expect(byName.has('@molecule/api-locales-secrets-doppler')).toBe(true)
    expect(missingMoleculePeers(['@molecule/api-secrets'], byName)).not.toContain(
      '@molecule/api-locales-secrets-doppler',
    )
  })

  it('closes every registry package under the locale rule inject plans with', () => {
    const open: string[] = []
    for (const pkg of registry) {
      if (!pkg.name.startsWith('@molecule/')) continue
      const closed = [pkg.name, ...missingMoleculePeers([pkg.name], byName)]
      const unplanned = resolveLocalePackages(closed, registry).filter(
        (name) => !closed.includes(name),
      )
      if (unplanned.length > 0) open.push(`${pkg.name}: ${unplanned.join(', ')}`)
    }
    expect(open).toEqual([])
    // Every registry package closed in turn: about 20 s alone, past vitest's 30 s default when
    // the whole suite shares the machine (2026-11-22).
  }, 120_000)
})

describe('closeMoleculePeers', () => {
  it('declares the added locale bond at its registry pin', () => {
    const manifest: { dependencies?: Record<string, string> } = {
      dependencies: { '@molecule/api-uploads': '1.1.1' },
    }
    const added = closeMoleculePeers(manifest)
    expect(added).toContain('@molecule/api-locales-uploads')
    expect(manifest.dependencies?.['@molecule/api-locales-uploads']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(
      Object.keys(manifest.dependencies ?? {}).sort(),
    )
  })
})
