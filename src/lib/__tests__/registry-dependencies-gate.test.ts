/**
 * The drift gate (`scripts/check-registry-exports.mjs`) for a package's `runtimeDependencies`.
 *
 * `sync-registry --scan-exports` records every name in a package's `dependencies` and
 * `peerDependencies` as its `runtimeDependencies`: molecule-dev's install and plan guards map a
 * third-party library to the package that wraps it from that list, and the README's install line
 * prints it. On 2026-11-22 five framework bindings gained optional routing-bond peers, the gate
 * molecule's pre-commit runs did not compare this field, and the registry stayed stale until the
 * release's full `sync-registry --check` refused it.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { thirdPartyDependenciesOf } from '../third-party-record.js'

const root = join(import.meta.dirname, '..', '..', '..')
const packagePath = 'packages/app/core/dependencies-probe'
const packageName = '@molecule/app-dependencies-probe'
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-dependencies-'))
  mkdirSync(join(scratch, packagePath, 'src'), { recursive: true })
  writeFileSync(
    join(scratch, packagePath, 'src/index.ts'),
    '/** A probe. */\nexport const probe = 1\n',
  )
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

function runGate(
  manifest: {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    peerDependenciesMeta?: Record<string, { optional?: boolean }>
  },
  runtimeDependencies: string[] | undefined,
  // The record sync-registry writes from the manifest, unless a case says otherwise.
  thirdPartyDependencies: object | 'absent' | undefined = thirdPartyDependenciesOf(manifest),
): { status: number | null; output: string } {
  writeFileSync(
    join(scratch, packagePath, 'package.json'),
    JSON.stringify({ name: packageName, description: 'Probe interface', ...manifest }),
  )
  const meta = manifest.peerDependenciesMeta ?? {}
  const moleculePeers = Object.keys(manifest.peerDependencies ?? {})
    .filter((peer) => peer.startsWith('@molecule/') && meta[peer]?.optional !== true)
    .sort()
  const registry = join(scratch, 'registry.json')
  writeFileSync(
    registry,
    JSON.stringify({
      version: 1,
      packages: {
        [packageName]: {
          type: 'core',
          category: 'dependencies-probe',
          stack: 'app',
          label: 'Dependencies probe',
          description: 'Probe interface',
          path: packagePath,
          exports: ['probe'],
          moleculePeers,
          ...(runtimeDependencies === undefined ? {} : { runtimeDependencies }),
          ...(thirdPartyDependencies === undefined || thirdPartyDependencies === 'absent'
            ? {}
            : { thirdPartyDependencies }),
        },
      },
    }),
  )
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-registry-exports.mjs', packagePath],
    {
      cwd: root,
      env: {
        ...process.env,
        MLCL_REGISTRY_PATH: registry,
        MOLECULE_PACKAGES_DIR: join(scratch, 'packages'),
      },
      encoding: 'utf8',
      timeout: 20_000,
    },
  )
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

const routingPeers = {
  dependencies: { 'color-mix-lite': '1.0.0' },
  peerDependencies: {
    '@molecule/app-routing': '1.0.0',
    '@molecule/app-routing-react-router': '1.0.0',
  },
  peerDependenciesMeta: { '@molecule/app-routing-react-router': { optional: true } },
}

describe('registry runtime dependencies gate', () => {
  it('accepts a registry list naming every dependency and peer, in any order', () => {
    const result = runGate(routingPeers, [
      '@molecule/app-routing-react-router',
      'color-mix-lite',
      '@molecule/app-routing',
    ])
    expect(result.output).toContain('runtime dependencies')
    expect(result.status).toBe(0)
  })

  it('rejects a registry list missing an optional peer the package.json gained', () => {
    const result = runGate(routingPeers, ['@molecule/app-routing', 'color-mix-lite'])
    expect(result.status).toBe(1)
    expect(result.output).toContain('runtime dependencies are out of sync')
    expect(result.output).toContain(
      '@molecule/app-dependencies-probe: missing ["@molecule/app-routing-react-router"]',
    )
    expect(result.output).toContain('sync-registry --scan-exports')
  })

  it('rejects a registry list naming a dependency the package.json dropped', () => {
    const result = runGate({ dependencies: { 'color-mix-lite': '1.0.0' } }, [
      'color-mix-lite',
      'left-pad',
    ])
    expect(result.status).toBe(1)
    expect(result.output).toContain('@molecule/app-dependencies-probe: stale ["left-pad"]')
  })

  it('reads an absent list as empty, as sync-registry does', () => {
    expect(runGate({}, undefined).status).toBe(0)
    const result = runGate({ dependencies: { 'color-mix-lite': '1.0.0' } }, undefined)
    expect(result.status).toBe(1)
    expect(result.output).toContain('missing ["color-mix-lite"]')
  })
})

describe('registry third-party dependencies gate', () => {
  // mlcl add --inject declares these versions in the app before its one install, so a registry
  // copy older than the manifest installs the old version (OLD MUSTFAIL: the gate did not compare it).
  const names = ['@molecule/app-routing', '@molecule/app-routing-react-router', 'color-mix-lite']

  it('rejects a recorded version the package.json moved on from', () => {
    const result = runGate(routingPeers, names, {
      dependencies: { 'color-mix-lite': '0.9.0' },
      peerDependencies: {},
    })
    expect(result.status).toBe(1)
    expect(result.output).toContain('third-party dependencies are out of sync')
    expect(result.output).toContain(
      '@molecule/app-dependencies-probe: registry {"dependencies":{"color-mix-lite":"0.9.0"},"peerDependencies":{}}',
    )
  })

  it('rejects a missing record for a package with a third-party dependency', () => {
    const result = runGate(routingPeers, names, 'absent')
    expect(result.status).toBe(1)
    expect(result.output).toContain('third-party dependencies are out of sync')
  })

  it('counterexample: a package with only @molecule dependencies records none', () => {
    const manifest = { peerDependencies: { '@molecule/app-routing': '1.0.0' } }
    expect(runGate(manifest, ['@molecule/app-routing']).status).toBe(0)
  })
})
