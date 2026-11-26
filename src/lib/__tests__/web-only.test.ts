/**
 * Web-only packages: which projects render with React Native, which requests reach a web-only
 * package through their required peers, and that the registry keeps the reason.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { getRawRegistry, serializeRegistry } from '../registry.js'
import type { InferredPackage } from '../schema.js'
import {
  describeWebOnlyChains,
  rendersOnReactNative,
  unrefusedOnReactNative,
  webOnlyChains,
} from '../web-only.js'

/**
 * A registry package with only the fields the walk reads.
 *
 * @param name - The package name.
 * @param moleculePeers - Its required `@molecule` peers.
 * @param webOnlyReason - Why it renders only in a browser, if it does.
 * @returns The package.
 */
function pkg(name: string, moleculePeers: string[], webOnlyReason?: string): InferredPackage {
  return {
    name,
    version: '0.0.0',
    dependencies: {},
    peerDependencies: {},
    type: 'feature',
    routes: [],
    tables: [],
    exports: [],
    path: name,
    molecule: {
      type: 'feature',
      category: 'feature',
      label: name,
      description: name,
      secrets: [],
      runtimeDependencies: [],
      moleculePeers,
      ...(webOnlyReason ? { webOnlyReason } : {}),
    },
  }
}

const registry = new Map(
  [
    pkg('@molecule/app-mind-map', ['@molecule/app-canvas', '@molecule/app-ui']),
    pkg('@molecule/app-canvas', ['@molecule/app-ui'], 'a pan-and-zoom editing surface'),
    pkg('@molecule/app-ui', []),
    pkg('@molecule/app-sparkline', ['@molecule/app-ui']),
    pkg('@molecule/app-a', ['@molecule/app-b']),
    pkg('@molecule/app-b', ['@molecule/app-a', '@molecule/app-canvas']),
  ].map((p) => [p.name, p]),
)

describe('rendersOnReactNative', () => {
  it("follows the framework mlcl create records, whatever the project's dependencies", () => {
    expect(rendersOnReactNative({ molecule: { framework: 'react-native' } })).toBe(true)
    expect(
      rendersOnReactNative({
        molecule: { framework: 'react-native-web' },
        dependencies: { 'react-native': '0.79.6' },
      }),
    ).toBe(false)
    expect(rendersOnReactNative({ molecule: { framework: 'react' } })).toBe(false)
  })

  it('reads a react-native dependency in a project mlcl did not create', () => {
    expect(rendersOnReactNative({ dependencies: { 'react-native': '0.79.6' } })).toBe(true)
    expect(rendersOnReactNative({ devDependencies: { 'react-native': '0.79.6' } })).toBe(true)
    expect(rendersOnReactNative({ dependencies: { react: '19.2.4', 'react-dom': '19.2.4' } })).toBe(
      false,
    )
  })
})

describe('webOnlyChains', () => {
  it('finds a web-only package requested directly', () => {
    expect(webOnlyChains(['@molecule/app-canvas'], registry)).toEqual([
      { chain: ['@molecule/app-canvas'], reason: 'a pan-and-zoom editing surface' },
    ])
  })

  it('finds one a request requires as a peer, with the chain to it', () => {
    expect(webOnlyChains(['@molecule/app-mind-map'], registry)).toEqual([
      {
        chain: ['@molecule/app-mind-map', '@molecule/app-canvas'],
        reason: 'a pan-and-zoom editing surface',
      },
    ])
  })

  it('walks a peer cycle once and still reports the chain', () => {
    expect(webOnlyChains(['@molecule/app-a'], registry)).toEqual([
      {
        chain: ['@molecule/app-a', '@molecule/app-b', '@molecule/app-canvas'],
        reason: 'a pan-and-zoom editing surface',
      },
    ])
  })

  it('reports each web-only package once, by the first request that reaches it', () => {
    expect(
      webOnlyChains(
        ['@molecule/app-mind-map', '@molecule/app-canvas', '@molecule/app-a'],
        registry,
      ),
    ).toEqual([
      {
        chain: ['@molecule/app-mind-map', '@molecule/app-canvas'],
        reason: 'a pan-and-zoom editing surface',
      },
    ])
  })

  it('counterexample: a package whose peers all render on a device finds nothing', () => {
    expect(webOnlyChains(['@molecule/app-sparkline', '@molecule/app-unknown'], registry)).toEqual(
      [],
    )
  })

  it('prints each chain without the scope', () => {
    expect(describeWebOnlyChains(webOnlyChains(['@molecule/app-mind-map'], registry))).toBe(
      '  app-mind-map → app-canvas: a pan-and-zoom editing surface',
    )
  })
})

describe('unrefusedOnReactNative', () => {
  it('keeps only the packages nothing refuses: no reason of their own and no web-only peer', () => {
    expect(
      unrefusedOnReactNative(
        [
          '@molecule/app-sparkline',
          '@molecule/app-canvas',
          '@molecule/app-mind-map',
          '@molecule/app-a',
        ],
        registry,
      ),
    ).toEqual(['@molecule/app-sparkline'])
  })

  it('judges each package by itself, even after another package reported the same web-only peer', () => {
    // webOnlyChains reports app-canvas once, for app-mind-map; app-a still reaches it.
    expect(unrefusedOnReactNative(['@molecule/app-mind-map', '@molecule/app-a'], registry)).toEqual(
      [],
    )
  })
})

describe('the registry', () => {
  it('keeps webOnlyReason when it stores an entry', () => {
    const raw = getRawRegistry()
    const name = '@molecule/app-feature-canvas-react'
    const stored = JSON.parse(serializeRegistry(raw)).packages[name]
    expect(stored.webOnlyReason).toBe(raw.packages[name]?.webOnlyReason)
    expect(stored.webOnlyReason).toEqual(expect.any(String))
  })
})
