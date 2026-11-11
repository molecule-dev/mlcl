/**
 * `closeMoleculePeers` declares what an install with `--legacy-peer-deps` (every scaffold's
 * `.npmrc`) would otherwise leave out: the registry `moleculePeers` + `defaultProvider` closure
 * of the declared `@molecule/*` packages, at the registry pins. An X1 export whose model had
 * hand-added four packages (l2160) declared none of the twenty packages they require, and
 * crashed on start outside the platform. Runs against the real registry.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { closeMoleculePeers, missingMoleculePeers } from '../peer-closure.js'
import { getMoleculeVersion } from '../registry.js'

describe('closeMoleculePeers', () => {
  it('declares the cores a capture provider requires, at the registry pins, sorted', () => {
    const manifest = {
      name: 'x-api',
      dependencies: { zod: '4.1.12', '@molecule/api-emails-capture': '1.0.0' },
    }
    const added = closeMoleculePeers(manifest)
    expect(added).toContain('@molecule/api-emails')
    expect(added).toContain('@molecule/api-activity')
    for (const name of added) expect(manifest.dependencies[name]).toBe(getMoleculeVersion(name))
    // Declared pins are kept as written.
    expect(manifest.dependencies['@molecule/api-emails-capture']).toBe('1.0.0')
    expect(manifest.dependencies.zod).toBe('4.1.12')
    const keys = Object.keys(manifest.dependencies)
    expect(keys).toEqual([...keys].sort())
    expect(missingMoleculePeers(keys)).toEqual([])
  })

  it('changes nothing in a manifest that is already closed', () => {
    const manifest = { dependencies: { '@molecule/api-emails-capture': '1.0.0' } }
    closeMoleculePeers(manifest)
    const closed = JSON.stringify(manifest)
    expect(closeMoleculePeers(manifest)).toEqual([])
    expect(JSON.stringify(manifest)).toBe(closed)
  })

  it('never re-declares a peer that devDependencies already holds', () => {
    const manifest = {
      dependencies: { '@molecule/api-emails-capture': '1.0.0' },
      devDependencies: { '@molecule/api-emails': '1.0.0' },
    }
    expect(closeMoleculePeers(manifest)).not.toContain('@molecule/api-emails')
    expect(manifest.dependencies).not.toHaveProperty('@molecule/api-emails')
  })

  it('adds no default provider for a core whose provider is declared', () => {
    // api-database's default bond is not wanted next to an explicit database provider.
    const withProvider = missingMoleculePeers([
      '@molecule/api-database',
      '@molecule/api-database-sqlite',
    ])
    expect(withProvider).not.toContain('@molecule/api-database-postgresql')
    expect(missingMoleculePeers(['@molecule/api-database'])).toContain(
      '@molecule/api-database-postgresql',
    )
  })

  it('leaves names outside the registry alone', () => {
    const manifest = { dependencies: { 'left-pad': '1.3.0', '@molecule/not-a-package': '1.0.0' } }
    expect(closeMoleculePeers(manifest)).toEqual([])
    expect(manifest).toEqual({
      dependencies: { 'left-pad': '1.3.0', '@molecule/not-a-package': '1.0.0' },
    })
  })
})
