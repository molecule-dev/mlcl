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

import { closeMoleculePeers, missingMoleculePeers, moleculesToInject } from '../peer-closure.js'
import { getMoleculeVersion } from '../registry.js'

describe('closeMoleculePeers', () => {
  it('declares the cores a provider requires, at the registry pins, sorted', () => {
    const manifest = {
      name: 'x-api',
      dependencies: { zod: '4.1.12', '@molecule/api-emails-mailgun': '1.0.0' },
    }
    const added = closeMoleculePeers(manifest)
    expect(added).toContain('@molecule/api-emails')
    expect(added).toContain('@molecule/api-bond')
    for (const name of added) expect(manifest.dependencies[name]).toBe(getMoleculeVersion(name))
    // Declared pins are kept as written.
    expect(manifest.dependencies['@molecule/api-emails-mailgun']).toBe('1.0.0')
    expect(manifest.dependencies.zod).toBe('4.1.12')
    const keys = Object.keys(manifest.dependencies)
    expect(keys).toEqual([...keys].sort())
    expect(missingMoleculePeers(keys)).toEqual([])
  })

  // A capture provider imports only its core's types, so the core is an optional peer.
  it('leaves out a peer the package marks optional', () => {
    const added = missingMoleculePeers(['@molecule/api-emails-capture'])
    expect(added).toContain('@molecule/api-activity')
    expect(added).not.toContain('@molecule/api-emails')
  })

  it('changes nothing in a manifest that is already closed', () => {
    const manifest = { dependencies: { '@molecule/api-emails-mailgun': '1.0.0' } }
    closeMoleculePeers(manifest)
    const closed = JSON.stringify(manifest)
    expect(closeMoleculePeers(manifest)).toEqual([])
    expect(JSON.stringify(manifest)).toBe(closed)
  })

  it('never re-declares a peer that devDependencies already holds', () => {
    const manifest = {
      dependencies: { '@molecule/api-emails-mailgun': '1.0.0' },
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

describe('moleculesToInject', () => {
  it('wires the providers and locale bonds declared with a package, never its cores', () => {
    // `mlcl add @molecule/api-uploads-filesystem --inject` injected the provider alone, and the
    // first upload failed with "No upload parser factory has been bonded" (harness eval add).
    const named = '@molecule/api-uploads-filesystem'
    const declared = missingMoleculePeers([named])
    expect(declared).toContain('@molecule/api-middleware-body-parser-express')
    const injected = moleculesToInject(named, declared)
    expect(injected[0]).toBe(named)
    expect(injected).toContain('@molecule/api-middleware-body-parser-express')
    expect(injected).toContain('@molecule/api-locales-uploads')
    for (const quiet of [
      '@molecule/api-uploads',
      '@molecule/api-middleware-body-parser',
      '@molecule/api-bond',
      '@molecule/api-i18n',
    ])
      expect(injected, quiet).not.toContain(quiet)
  })

  it('wires the service worker push brings', () => {
    const worker = '@molecule/app-pwa-default'
    const declared = [worker, ...missingMoleculePeers(['@molecule/app-push', worker])]
    expect(moleculesToInject('@molecule/app-push', declared)).toContain(worker)
  })

  it('injects a package alone when nothing was declared with it', () => {
    expect(moleculesToInject('@molecule/api-cache-memory', [])).toEqual([
      '@molecule/api-cache-memory',
    ])
  })
})
