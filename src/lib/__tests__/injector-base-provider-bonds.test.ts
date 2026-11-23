/**
 * A provider installed because another provider of its core builds on it gets no bond.
 *
 * `@molecule/app-ui-nativewind` builds its ClassMap on `@molecule/app-ui-tailwind`'s and
 * declares it as a peer, so a React Native app installs both. Inject used to give each one a
 * bond, and `setupProviders()` ran `setupAppUiNativewind()` then `setupAppUiTailwind()`: two
 * `setClassMap` calls for one singleton core, the web ClassMap last, so it won (2026-11-23,
 * a fresh `mlcl create --framework react-native`). The web glass ClassMap has the same shape
 * and was right only because its file name sorts after the base's.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { InjectionPlan } from '../injector.js'
import { synthesizeAppProjectFiles, withholdBaseProviderBonds } from '../injector.js'
import { loadRegistry } from '../registry.js'

const PROJECT = '/tmp/base-provider-bonds-app'

/**
 * A provider plan as planInjection writes it: the bond file, its bonds/index export, and the
 * bond setup.
 *
 * @param provider - The provider package.
 * @param core - The core it implements.
 * @param peers - The provider's peer dependencies.
 * @returns The plan.
 */
function providerPlan(provider: string, core: string, peers: string[]): InjectionPlan {
  const bondName = provider.replace('@molecule/', '')
  const setupCode = `// setup for ${provider}\n`
  return {
    molecule: provider,
    moleculePackage: {
      name: provider,
      version: '1.0.0',
      type: 'provider',
      routes: [],
      tables: [],
      exports: [],
      path: `/node_modules/${provider}`,
      dependencies: {},
      peerDependencies: Object.fromEntries(peers.map((peer) => [peer, '^1.0.0'])),
    } as InjectionPlan['moleculePackage'],
    files: [
      {
        action: 'create',
        targetPath: `${PROJECT}/src/bonds/${bondName}.ts`,
        content: setupCode,
        description: 'bond',
      },
      {
        action: 'modify',
        targetPath: `${PROJECT}/src/bonds/index.ts`,
        content: `export * from './${bondName}.js'\n`,
        description: 'index export',
      },
    ],
    dependencies: [{ name: provider, version: '1.0.0', type: 'dependency' }],
    migrations: [],
    bondSetup: {
      providerPackage: provider,
      interfacePackage: core,
      interfaceType: 'ClassMap',
      setupCode,
    },
    conflicts: [],
  }
}

const NATIVEWIND = '@molecule/app-ui-nativewind'
const TAILWIND = '@molecule/app-ui-tailwind'
const UI = '@molecule/app-ui'

describe('withholdBaseProviderBonds', () => {
  it('wires only the provider that builds on another provider of the same core', () => {
    const nativewind = providerPlan(NATIVEWIND, UI, [UI, TAILWIND, '@molecule/app-styling'])
    const tailwind = providerPlan(TAILWIND, UI, [UI, '@molecule/app-styling'])
    const plans = [nativewind, tailwind]

    expect(withholdBaseProviderBonds(plans)).toEqual([{ base: TAILWIND, extendedBy: NATIVEWIND }])
    expect(tailwind.bondSetup).toBeNull()
    expect(tailwind.files).toEqual([])
    // Still installed: its dependency entry stays.
    expect(tailwind.dependencies).toEqual([
      { name: TAILWIND, version: '1.0.0', type: 'dependency' },
    ])
    expect(nativewind.bondSetup?.providerPackage).toBe(NATIVEWIND)
    expect(nativewind.files).toHaveLength(2)

    const index = synthesizeAppProjectFiles(
      plans,
      [UI, NATIVEWIND, TAILWIND],
      PROJECT,
      loadRegistry(),
    ).find((file) => file.targetPath === `${PROJECT}/src/bonds/index.ts`)
    expect(index?.content).toContain('setupAppUiNativewind()')
    expect(index?.content).not.toContain('setupAppUiTailwind')
  })

  it('keeps every bond when no provider of a core names another as a peer', () => {
    const localStorage = providerPlan(
      '@molecule/app-storage-localstorage',
      '@molecule/app-storage',
      ['@molecule/app-storage'],
    )
    const asyncStorage = providerPlan(
      '@molecule/app-storage-async-storage',
      '@molecule/app-storage',
      ['@molecule/app-storage'],
    )
    expect(withholdBaseProviderBonds([localStorage, asyncStorage])).toEqual([])
    expect(localStorage.bondSetup).not.toBeNull()
    expect(asyncStorage.bondSetup).not.toBeNull()
  })

  it('keeps a peer that implements a different core', () => {
    // The styling bond peers on the ClassMap bond, but they set different cores.
    const styling = providerPlan('@molecule/app-styling-tailwind', '@molecule/app-styling', [
      '@molecule/app-styling',
      TAILWIND,
    ])
    const tailwind = providerPlan(TAILWIND, UI, [UI])
    expect(withholdBaseProviderBonds([styling, tailwind])).toEqual([])
    expect(tailwind.bondSetup).not.toBeNull()
  })

  it('keeps both when two providers of one core name each other', () => {
    const a = providerPlan('@molecule/app-ui-a', UI, [UI, '@molecule/app-ui-b'])
    const b = providerPlan('@molecule/app-ui-b', UI, [UI, '@molecule/app-ui-a'])
    expect(withholdBaseProviderBonds([a, b])).toEqual([])
  })
})
