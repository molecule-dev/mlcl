import { describe, expect, it } from 'vitest'

import {
  applyUpgrades,
  applyUpgradesToProjectPackageJson,
  buildUpgradeWorkList,
  collectUpgradeCandidates,
  compareVersions,
  type FetchResult,
  isNewerVersion,
  resolveMoleculeVersion,
  type UpgradeCandidate,
  type VersionFetcher,
} from '../package-upgrades.js'
import type { Registry } from '../schema.js'

/** Minimal registry fixture — only the fields the upgrade logic reads. */
function makeRegistry(overrides?: Partial<Registry>): Registry {
  return {
    version: 1,
    packages: {
      '@molecule/api-database': {},
      '@molecule/app-ui': {},
      '@molecule/api-logger': {},
    },
    toolchain: {
      shared: { typescript: '6.0.3', eslint: '10.4.1' },
      api: { tsx: '4.0.0' },
      app: {},
      moleculePackage: {},
    },
    moleculeVersions: { default: '1.0.0', overrides: {} },
    ...overrides,
  } as unknown as Registry
}

/**
 * Registry fixture that additionally pins the non-molecule framework deps every
 * scaffold ships — react is intentionally pinned by two appFrameworks so the
 * multi-occurrence handling (fetch de-dup + per-location writeback) is exercised.
 */
function makeRegistryWithFrameworks(): Registry {
  return makeRegistry({
    apiFrameworks: {
      express: {
        name: 'express',
        dependencies: { express: '5.2.1' },
        devDependencies: { '@types/express': '5.0.6' },
      },
    },
    appFrameworks: {
      react: {
        dependencies: { react: '19.2.7', 'react-dom': '19.2.7', 'react-router': '7.17.0' },
        devDependencies: { '@types/react': '19.2.17', '@vitejs/plugin-react': '6.0.2' },
      },
      'react-native-web': {
        dependencies: { react: '19.2.7', 'react-dom': '19.2.7' },
        devDependencies: { '@types/react': '19.2.17' },
      },
    },
  } as unknown as Partial<Registry>)
}

describe('package-upgrades', () => {
  describe('compareVersions / isNewerVersion', () => {
    it('orders by major, minor, patch', () => {
      expect(compareVersions('1.2.3', '1.2.2')).toBe(1)
      expect(compareVersions('1.2.3', '1.3.0')).toBe(-1)
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    })

    it('treats a final release as newer than a prerelease of the same core', () => {
      expect(compareVersions('1.0.0', '1.0.0-beta.1')).toBe(1)
      expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1)
    })

    it('strips leading range operators before comparing', () => {
      expect(compareVersions('^1.2.0', '1.2.0')).toBe(0)
      expect(isNewerVersion('1.2.1', '^1.2.0')).toBe(true)
    })

    it('isNewerVersion is strict', () => {
      expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false)
      expect(isNewerVersion('1.2.1', '1.2.0')).toBe(true)
      expect(isNewerVersion('1.1.9', '1.2.0')).toBe(false)
    })
  })

  describe('resolveMoleculeVersion', () => {
    it('returns the default when there is no override', () => {
      expect(resolveMoleculeVersion(makeRegistry(), '@molecule/app-ui')).toBe('1.0.0')
    })

    it('prefers an override over the default', () => {
      const registry = makeRegistry({
        moleculeVersions: { default: '1.0.0', overrides: { '@molecule/app-ui': '1.2.0' } },
      })
      expect(resolveMoleculeVersion(registry, '@molecule/app-ui')).toBe('1.2.0')
      expect(resolveMoleculeVersion(registry, '@molecule/api-database')).toBe('1.0.0')
    })
  })

  describe('buildUpgradeWorkList', () => {
    it('includes every @molecule package and every toolchain dep', () => {
      const work = buildUpgradeWorkList(makeRegistry())
      const molecule = work.filter((w) => w.kind === 'molecule')
      const toolchain = work.filter((w) => w.kind === 'toolchain')
      expect(molecule.map((w) => w.name).sort()).toEqual([
        '@molecule/api-database',
        '@molecule/api-logger',
        '@molecule/app-ui',
      ])
      expect(toolchain.find((w) => w.name === 'typescript')?.section).toBe('shared')
      expect(toolchain.find((w) => w.name === 'tsx')?.section).toBe('api')
      expect(molecule.every((w) => w.current === '1.0.0')).toBe(true)
    })

    it('enumerates every api/app framework dependency with its writeback location', () => {
      const work = buildUpgradeWorkList(makeRegistryWithFrameworks())
      const framework = work.filter((w) => w.kind === 'framework')

      // express runtime dep + its @types devDep, located precisely.
      expect(framework).toContainEqual({
        name: 'express',
        kind: 'framework',
        family: 'apiFrameworks',
        framework: 'express',
        field: 'dependencies',
        current: '5.2.1',
      })
      expect(framework).toContainEqual({
        name: '@types/express',
        kind: 'framework',
        family: 'apiFrameworks',
        framework: 'express',
        field: 'devDependencies',
        current: '5.0.6',
      })

      // react-dom / react-router / @vitejs/plugin-react are all enumerated.
      const appDepNames = framework
        .filter((w) => w.family === 'appFrameworks' && w.framework === 'react')
        .map((w) => w.name)
        .sort()
      expect(appDepNames).toEqual([
        '@types/react',
        '@vitejs/plugin-react',
        'react',
        'react-dom',
        'react-router',
      ])

      // react is pinned by BOTH appFrameworks → one work item per occurrence,
      // each carrying its own framework location for precise writeback.
      const reactItems = framework.filter((w) => w.name === 'react')
      expect(reactItems.map((w) => w.framework).sort()).toEqual(['react', 'react-native-web'])
    })
  })

  describe('collectUpgradeCandidates', () => {
    it('classifies upgrade / current / unpublished / unreachable', async () => {
      const fetch: VersionFetcher = async (name): Promise<FetchResult> => {
        if (name === 'typescript') return { ok: true, version: '6.1.0' } // upgrade
        if (name === 'eslint') return { ok: true, version: '10.4.1' } // current
        if (name === 'tsx') return { ok: false, reason: 'unreachable' }
        return { ok: false, reason: 'unpublished' } // all @molecule packages
      }

      const candidates = await collectUpgradeCandidates({ registry: makeRegistry(), fetch })
      const byName = Object.fromEntries(candidates.map((c) => [c.name, c]))

      expect(byName['typescript'].status).toBe('upgrade')
      expect(byName['typescript'].latest).toBe('6.1.0')
      expect(byName['eslint'].status).toBe('current')
      expect(byName['tsx'].status).toBe('unreachable')
      expect(byName['@molecule/app-ui'].status).toBe('unpublished')
      expect(byName['@molecule/app-ui'].latest).toBeNull()
    })

    it('treats a throwing fetcher as unreachable (never propagates)', async () => {
      const fetch: VersionFetcher = async (): Promise<FetchResult> => {
        throw new Error('network down')
      }
      const candidates = await collectUpgradeCandidates({ registry: makeRegistry(), fetch })
      expect(candidates.every((c) => c.status === 'unreachable')).toBe(true)
    })

    it('queries each package name only once even when pinned by several frameworks', async () => {
      const calls = new Map<string, number>()
      const fetch: VersionFetcher = async (name): Promise<FetchResult> => {
        calls.set(name, (calls.get(name) ?? 0) + 1)
        return { ok: false, reason: 'unpublished' }
      }
      const candidates = await collectUpgradeCandidates({
        registry: makeRegistryWithFrameworks(),
        fetch,
      })

      // react / react-dom / @types/react each appear under TWO appFrameworks, so
      // there are two candidates apiece — but the fetcher must be hit once per name.
      expect(candidates.filter((c) => c.name === 'react').length).toBe(2)
      expect(calls.get('react')).toBe(1)
      expect(calls.get('react-dom')).toBe(1)
      expect(calls.get('@types/react')).toBe(1)
    })
  })

  describe('applyUpgrades', () => {
    const upgrade = (
      name: string,
      kind: 'molecule' | 'toolchain',
      current: string,
      latest: string,
      section?: string,
    ): UpgradeCandidate => ({ name, kind, section, current, latest, status: 'upgrade' })

    it('bumps a toolchain pin in its section without mutating the input', () => {
      const registry = makeRegistry()
      const result = applyUpgrades(registry, [
        upgrade('typescript', 'toolchain', '6.0.3', '6.1.0', 'shared'),
      ])
      expect(result.toolchainChanged).toBe(1)
      expect(
        (result.registry.toolchain as Record<string, Record<string, string>>).shared.typescript,
      ).toBe('6.1.0')
      // input untouched
      expect((registry.toolchain as Record<string, Record<string, string>>).shared.typescript).toBe(
        '6.0.3',
      )
    })

    it('collapses a uniform @molecule bump to a single default with no overrides', () => {
      const registry = makeRegistry()
      const result = applyUpgrades(registry, [
        upgrade('@molecule/api-database', 'molecule', '1.0.0', '1.1.0'),
        upgrade('@molecule/app-ui', 'molecule', '1.0.0', '1.1.0'),
        upgrade('@molecule/api-logger', 'molecule', '1.0.0', '1.1.0'),
      ])
      expect(result.moleculeChanged).toBe(3)
      expect(result.registry.moleculeVersions?.default).toBe('1.1.0')
      expect(result.registry.moleculeVersions?.overrides).toEqual({})
    })

    it('records a divergent @molecule package as an override and keeps the majority default', () => {
      const registry = makeRegistry()
      const result = applyUpgrades(registry, [
        upgrade('@molecule/app-ui', 'molecule', '1.0.0', '2.0.0'),
      ])
      // Two packages stay at 1.0.0 (majority → default), one diverges → override.
      expect(result.registry.moleculeVersions?.default).toBe('1.0.0')
      expect(result.registry.moleculeVersions?.overrides).toEqual({ '@molecule/app-ui': '2.0.0' })
      expect(result.moleculeChanged).toBe(1)
    })

    it('is a no-op when there are no upgrade candidates', () => {
      const registry = makeRegistry()
      const result = applyUpgrades(registry, [])
      expect(result.moleculeChanged).toBe(0)
      expect(result.toolchainChanged).toBe(0)
      expect(result.frameworkChanged).toBe(0)
      expect(result.registry.moleculeVersions?.default).toBe('1.0.0')
    })

    const fwUpgrade = (
      name: string,
      family: 'apiFrameworks' | 'appFrameworks',
      framework: string,
      field: 'dependencies' | 'devDependencies',
      current: string,
      latest: string,
    ): UpgradeCandidate => ({
      name,
      kind: 'framework',
      family,
      framework,
      field,
      current,
      latest,
      status: 'upgrade',
    })

    it('writes a framework pin back to its exact family/framework/field location', () => {
      const registry = makeRegistryWithFrameworks()
      const result = applyUpgrades(registry, [
        fwUpgrade('express', 'apiFrameworks', 'express', 'dependencies', '5.2.1', '5.3.0'),
        fwUpgrade(
          '@types/express',
          'apiFrameworks',
          'express',
          'devDependencies',
          '5.0.6',
          '5.0.7',
        ),
        fwUpgrade(
          '@vitejs/plugin-react',
          'appFrameworks',
          'react',
          'devDependencies',
          '6.0.2',
          '6.1.0',
        ),
      ])
      expect(result.frameworkChanged).toBe(3)

      const fw = result.registry as unknown as {
        apiFrameworks: Record<
          string,
          { dependencies: Record<string, string>; devDependencies: Record<string, string> }
        >
        appFrameworks: Record<
          string,
          { dependencies: Record<string, string>; devDependencies: Record<string, string> }
        >
      }
      expect(fw.apiFrameworks.express.dependencies.express).toBe('5.3.0')
      expect(fw.apiFrameworks.express.devDependencies['@types/express']).toBe('5.0.7')
      expect(fw.appFrameworks.react.devDependencies['@vitejs/plugin-react']).toBe('6.1.0')

      // input untouched
      const before = makeRegistryWithFrameworks() as unknown as {
        apiFrameworks: Record<string, { dependencies: Record<string, string> }>
      }
      const orig = registry as unknown as {
        apiFrameworks: Record<string, { dependencies: Record<string, string> }>
      }
      expect(orig.apiFrameworks.express.dependencies.express).toBe(
        before.apiFrameworks.express.dependencies.express,
      )
    })

    it('updates EVERY occurrence of a dep pinned by multiple frameworks', () => {
      const registry = makeRegistryWithFrameworks()
      // react is pinned by appFrameworks.react AND appFrameworks.react-native-web.
      const result = applyUpgrades(registry, [
        fwUpgrade('react', 'appFrameworks', 'react', 'dependencies', '19.2.7', '19.3.0'),
        fwUpgrade('react', 'appFrameworks', 'react-native-web', 'dependencies', '19.2.7', '19.3.0'),
      ])
      expect(result.frameworkChanged).toBe(2)
      const fw = result.registry as unknown as {
        appFrameworks: Record<string, { dependencies: Record<string, string> }>
      }
      expect(fw.appFrameworks.react.dependencies.react).toBe('19.3.0')
      expect(fw.appFrameworks['react-native-web'].dependencies.react).toBe('19.3.0')
    })

    it('does not add a framework dep that is not already pinned', () => {
      const registry = makeRegistryWithFrameworks()
      const result = applyUpgrades(registry, [
        fwUpgrade('not-pinned', 'appFrameworks', 'react', 'dependencies', '1.0.0', '2.0.0'),
      ])
      expect(result.frameworkChanged).toBe(0)
      const fw = result.registry as unknown as {
        appFrameworks: Record<string, { dependencies: Record<string, string> }>
      }
      expect('not-pinned' in fw.appFrameworks.react.dependencies).toBe(false)
    })
  })

  describe('applyUpgradesToProjectPackageJson', () => {
    it('updates matching deps and devDeps but never adds new ones', () => {
      const pkg = {
        dependencies: { '@molecule/api-database': '1.0.0', 'other-lib': '2.0.0' },
        devDependencies: { typescript: '6.0.3' },
      }
      const changed = applyUpgradesToProjectPackageJson(pkg, [
        {
          name: '@molecule/api-database',
          kind: 'molecule',
          current: '1.0.0',
          latest: '1.1.0',
          status: 'upgrade',
        },
        {
          name: 'typescript',
          kind: 'toolchain',
          section: 'shared',
          current: '6.0.3',
          latest: '6.1.0',
          status: 'upgrade',
        },
        {
          name: 'not-installed',
          kind: 'toolchain',
          current: '1.0.0',
          latest: '2.0.0',
          status: 'upgrade',
        },
      ])
      expect(changed).toBe(2)
      expect(pkg.dependencies['@molecule/api-database']).toBe('1.1.0')
      expect(pkg.devDependencies.typescript).toBe('6.1.0')
      expect(pkg.dependencies['other-lib']).toBe('2.0.0')
      expect('not-installed' in pkg.dependencies).toBe(false)
    })

    it('skips file:/link:/workspace: specifiers', () => {
      const pkg = {
        dependencies: { '@molecule/app-ui': 'file:../molecule/packages/app/core/ui' },
      }
      const changed = applyUpgradesToProjectPackageJson(pkg, [
        {
          name: '@molecule/app-ui',
          kind: 'molecule',
          current: '1.0.0',
          latest: '1.1.0',
          status: 'upgrade',
        },
      ])
      expect(changed).toBe(0)
      expect(pkg.dependencies['@molecule/app-ui']).toBe('file:../molecule/packages/app/core/ui')
    })
  })
})
