/**
 * The framework a package is written for comes from its dependencies, the same way
 * for every reader (search, the agent catalog, `mlcl create`'s menus, loadRegistry).
 *
 * Until 2026-11-14 only 1 of about 200 React feature packages declared a
 * `framework`, so search kept every framework's same-named hooks and the catalog
 * guessed from the package name (which marked the framework-neutral
 * `app-i18n-default-react` as React, and dropped React and react-native packages
 * from a react-native-web project's catalog).
 */
import { describe, expect, it } from 'vitest'

import { buildCatalog } from '../catalog-generator.js'
import { packageFramework } from '../package-search.js'
import { getRawRegistry, loadRegistry } from '../registry.js'
import type { RegistryEntry } from '../schema.js'

const registry = getRawRegistry()
const appFrameworks = registry.appFrameworks ?? {}
const entry = (name: string): RegistryEntry => {
  const found = registry.packages[name]
  if (!found) throw new Error(`no registry entry for ${name}`)
  return found
}

describe('packageFramework', () => {
  it.each([
    // peers react only (hooks): React
    ['@molecule/app-query-react', 'react'],
    // peers react + react-dom
    ['@molecule/app-ui-react', 'react'],
    // peers react + react-native (optional, so react-native-web can install it)
    ['@molecule/app-ui-react-native', 'react-native'],
    ['@molecule/app-routing-react-navigation', 'react-native'],
    ['@molecule/app-ui-vue', 'vue'],
    ['@molecule/app-svelte', 'svelte'],
  ])('%s is written for %s', (name, framework) => {
    expect(packageFramework({ ...entry(name), framework: undefined }, appFrameworks)).toBe(
      framework,
    )
  })

  it('counterexample: a package whose dependencies name no framework is framework-neutral', () => {
    expect(packageFramework(entry('@molecule/app-i18n-default-react'), appFrameworks)).toBe(
      undefined,
    )
    expect(packageFramework(entry('@molecule/app-query'), appFrameworks)).toBe(undefined)
    // An API package that peers react is not a React binding.
    expect(
      packageFramework({ stack: 'api', runtimeDependencies: ['react'] }, appFrameworks),
    ).toBeUndefined()
  })

  it("keeps the registry's framework for a bond whose dependencies name none", () => {
    const clipboard = entry('@molecule/app-clipboard-react-native')
    expect(packageFramework({ ...clipboard, framework: undefined }, appFrameworks)).toBe(undefined)
    expect(packageFramework(clipboard, appFrameworks)).toBe('react-native')
  })

  it('agrees with every framework the registry declares, and fits every package one framework only', () => {
    const disagree: string[] = []
    const ambiguous: string[] = []
    const runtimeDeps = new Set(
      Object.entries(appFrameworks)
        .filter(([key, fw]) => !fw.uiFramework || fw.uiFramework === key)
        .flatMap(([, fw]) => {
          const deps = Object.keys(fw.dependencies ?? {})
          return deps.length > 0 ? deps : Object.keys(fw.devDependencies ?? {})
        }),
    )
    for (const [name, e] of Object.entries(registry.packages)) {
      if (e.stack !== 'app') continue
      const derived = packageFramework({ ...e, framework: undefined }, appFrameworks)
      if (e.framework && derived && derived !== e.framework)
        disagree.push(`${name}: registry ${e.framework}, dependencies ${derived}`)
      if (!derived && (e.runtimeDependencies ?? []).some((dep) => runtimeDeps.has(dep)))
        ambiguous.push(`${name}: ${e.runtimeDependencies?.join(', ')}`)
    }
    expect(disagree).toEqual([])
    expect(ambiguous).toEqual([])
  })

  it('loadRegistry carries the derived framework without changing the raw registry', () => {
    const query = loadRegistry().find((pkg) => pkg.name === '@molecule/app-query-react')
    expect(query?.molecule?.framework).toBe('react')
    expect(registry.packages['@molecule/app-query-react']?.framework).toBeUndefined()
  })
})

describe('framework-scoped agent catalog', () => {
  it('lists React and react-native packages for a react-native-web project, and the i18n defaults for every framework', () => {
    const rnw = buildCatalog({ registry, framework: 'react-native-web', stack: 'app' })
    expect(rnw).toContain('@molecule/app-react`')
    expect(rnw).toContain('@molecule/app-routing-react-router`')
    expect(rnw).not.toContain('@molecule/app-vue`')
    const vue = buildCatalog({ registry, framework: 'vue', stack: 'app' })
    expect(vue).toContain('@molecule/app-i18n-default-react`')
    // Counterexample: React packages stay out of a Vue project's catalog.
    expect(vue).not.toContain('@molecule/app-query-react`')
    expect(vue).not.toContain('@molecule/app-routing-react-router`')
  })
})
