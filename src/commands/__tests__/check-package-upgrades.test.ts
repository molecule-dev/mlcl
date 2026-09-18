/**
 * Command-level coverage for `mlcl check-package-upgrades`.
 *
 * The audit (PKG3) flagged that the command orchestration (`run()` +
 * `npmViewFetcher` classification) and the file-writing `--apply` path had ZERO
 * tests — which is exactly why the command silently never enumerated the api/app
 * framework deps every scaffold pins. These tests run the REAL oclif command
 * against a throwaway registry + project (no network), asserting:
 *
 *  - `--apply` writes the bumped framework pins back into registry.json
 *    (apiFrameworks.express.express + appFrameworks.react.react, including the
 *    SAME dep pinned by two frameworks), alongside molecule + toolchain pins;
 *  - `--apply` rewrites the matching deps in a project package.json in cwd,
 *    skipping file:/workspace: specifiers and unpublished packages;
 *  - `npmViewFetcher` maps an npm E404 to `unpublished` and a timeout to
 *    `unreachable` (the two distinct failure classes the report relies on).
 *
 * The fetcher is injected via the command's `fetcherFactory` seam and the
 * registry path via the `MLCL_REGISTRY_PATH` override, so nothing touches the
 * network or the real registry.json.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FetchResult, VersionFetcher } from '../../lib/package-upgrades.js'
import { clearRegistryCache } from '../../lib/registry.js'
import CheckPackageUpgrades, { npmViewFetcher } from '../check-package-upgrades.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** Registry shape with exactly the sections the upgrade pipeline reads. */
function registryFixture(): unknown {
  return {
    version: 1,
    packages: {
      '@molecule/api-database': {},
      '@molecule/app-ui': {},
    },
    toolchain: {
      shared: { typescript: '6.0.3', eslint: '10.4.1' },
      api: { tsx: '4.0.0' },
      app: {},
      moleculePackage: {},
    },
    moleculeVersions: { default: '1.0.0', overrides: {} },
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
  }
}

/** Deterministic, offline version answers for the scoped sweep. */
const fetch: VersionFetcher = async (name): Promise<FetchResult> => {
  const answers: Record<string, FetchResult> = {
    express: { ok: true, version: '5.3.0' }, // upgrade
    '@types/express': { ok: true, version: '5.0.6' }, // current
    react: { ok: true, version: '19.3.0' }, // upgrade (pinned by 2 frameworks)
    'react-dom': { ok: true, version: '19.2.7' }, // current
    'react-router': { ok: true, version: '7.17.0' }, // current
    '@types/react': { ok: true, version: '19.2.17' }, // current
    '@vitejs/plugin-react': { ok: true, version: '6.0.2' }, // current
    typescript: { ok: true, version: '6.1.0' }, // upgrade (toolchain.shared)
    eslint: { ok: true, version: '10.4.1' }, // current
    tsx: { ok: false, reason: 'unreachable' },
  }
  return answers[name] ?? { ok: false, reason: 'unpublished' } // @molecule/* etc.
}

describe('check-package-upgrades command — --apply writes framework + toolchain pins', () => {
  let config: Config
  let tmp: string
  let registryPath: string
  let projectDir: string
  const origCwd = process.cwd()
  const origFetcherFactory = CheckPackageUpgrades.fetcherFactory
  const origRegistryEnv = process.env.MLCL_REGISTRY_PATH

  beforeAll(async () => {
    config = await Config.load({ root: MLCL_ROOT })
  })

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'mlcl-pkgupgrade-'))
    registryPath = join(tmp, 'registry.json')
    await writeFile(registryPath, JSON.stringify(registryFixture(), null, 2) + '\n')
    process.env.MLCL_REGISTRY_PATH = registryPath
    clearRegistryCache()

    projectDir = join(tmp, 'scaffolded-app')
    await mkdir(projectDir, { recursive: true })
    await writeFile(
      join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'scaffolded-app',
          version: '1.0.0',
          type: 'module',
          dependencies: {
            react: '19.2.7',
            express: '5.2.1',
            '@molecule/api-database': '1.0.0',
            '@molecule/app-ui': 'file:../molecule/packages/app/core/ui',
          },
          devDependencies: { '@types/react': '19.2.17', typescript: '6.0.3' },
        },
        null,
        2,
      ) + '\n',
    )

    CheckPackageUpgrades.fetcherFactory = () => fetch
    process.chdir(projectDir)
  })

  afterEach(async () => {
    process.chdir(origCwd)
    CheckPackageUpgrades.fetcherFactory = origFetcherFactory
    if (origRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
    else process.env.MLCL_REGISTRY_PATH = origRegistryEnv
    clearRegistryCache()
    await rm(tmp, { recursive: true, force: true })
  })

  it('rewrites every framework dep occurrence in registry.json, plus molecule + toolchain', async () => {
    await CheckPackageUpgrades.run(['--apply', '--concurrency', '4'], config)

    const registry = JSON.parse(await readFile(registryPath, 'utf-8')) as {
      apiFrameworks: Record<
        string,
        { dependencies: Record<string, string>; devDependencies: Record<string, string> }
      >
      appFrameworks: Record<string, { dependencies: Record<string, string> }>
      toolchain: { shared: Record<string, string> }
    }

    // framework pins bumped at their exact locations
    expect(registry.apiFrameworks.express.dependencies.express).toBe('5.3.0')
    expect(registry.appFrameworks.react.dependencies.react).toBe('19.3.0')
    // the SAME dep pinned by a second framework is bumped too (no orphan stale pin)
    expect(registry.appFrameworks['react-native-web'].dependencies.react).toBe('19.3.0')
    // a current framework dep is left alone (no spurious churn)
    expect(registry.apiFrameworks.express.devDependencies['@types/express']).toBe('5.0.6')

    // toolchain still works alongside the new framework path
    expect(registry.toolchain.shared.typescript).toBe('6.1.0')
  })

  it('rewrites matching deps in the cwd project package.json, skipping file:/unpublished', async () => {
    await CheckPackageUpgrades.run(['--apply', '--concurrency', '4'], config)

    const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    // framework runtime deps in the scaffold get bumped
    expect(pkg.dependencies.react).toBe('19.3.0')
    expect(pkg.dependencies.express).toBe('5.3.0')
    expect(pkg.devDependencies.typescript).toBe('6.1.0')
    // current dep untouched
    expect(pkg.devDependencies['@types/react']).toBe('19.2.17')
    // unpublished @molecule dep untouched
    expect(pkg.dependencies['@molecule/api-database']).toBe('1.0.0')
    // file: specifier never rewritten
    expect(pkg.dependencies['@molecule/app-ui']).toBe('file:../molecule/packages/app/core/ui')
  })
})

describe('npmViewFetcher — failure classification', () => {
  beforeEach(() => execaMock.mockReset())

  it('returns ok with the parsed version on success', async () => {
    // Test-only: shape just the `stdout` field npmViewFetcher reads.
    execaMock.mockResolvedValueOnce({
      stdout: '19.3.0',
    } as unknown as Awaited<ReturnType<typeof execa>>)
    expect(await npmViewFetcher()('react')).toEqual({ ok: true, version: '19.3.0' })
  })

  it('maps an npm E404 to unpublished', async () => {
    execaMock.mockRejectedValueOnce(
      Object.assign(new Error('failed'), {
        stderr: "npm error code E404\nnpm error 404 '@molecule/api-x@*' is not in this registry.",
      }),
    )
    expect(await npmViewFetcher()('@molecule/api-x')).toEqual({ ok: false, reason: 'unpublished' })
  })

  it('maps a timeout (no E404) to unreachable', async () => {
    execaMock.mockRejectedValueOnce(
      Object.assign(new Error('Command timed out after 20000 ms'), {
        timedOut: true,
        shortMessage: 'Command timed out after 20000 ms',
      }),
    )
    expect(await npmViewFetcher()('react')).toEqual({ ok: false, reason: 'unreachable' })
  })
})
