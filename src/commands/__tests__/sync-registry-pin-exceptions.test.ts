/**
 * `sync-registry` keeps the pins `REGISTRY_PIN_EXCEPTIONS` lists, and moves every other framework
 * and toolchain pin to the version molecule's packages pin.
 *
 * The framework sync takes one version per dependency from molecule's packages. Without the
 * ledger, a framework that has to pin another version (React Native 0.79 needs react 19.0.0, the
 * version Expo SDK 53 installs) is moved back to molecule's react on every sync, and
 * `sync-registry --check` refuses the registry the toolchain test accepts.
 *
 * These tests run the REAL oclif command against a throwaway registry and molecule tree (the
 * `MLCL_REGISTRY_PATH` and `MOLECULE_PACKAGES_DIR` overrides), so nothing touches the real files.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearRegistryCache } from '../../lib/registry.js'
import { REGISTRY_PIN_EXCEPTIONS } from '../../lib/registry-pin-exceptions.js'
import SyncRegistry from '../sync-registry.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('sync-registry keeps the pins the exception ledger lists', () => {
  let config: Config
  let tmp: string
  let registryPath: string
  const origRegistryEnv = process.env.MLCL_REGISTRY_PATH
  const origPackagesEnv = process.env.MOLECULE_PACKAGES_DIR

  beforeAll(async () => {
    config = await Config.load({ root: MLCL_ROOT })
  })

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'mlcl-sync-pins-'))
    const pkg = join(tmp, 'molecule', 'packages', 'app', 'frameworks', 'react')
    await mkdir(pkg, { recursive: true })
    await writeFile(
      join(pkg, 'package.json'),
      JSON.stringify({
        name: '@molecule/app-react',
        version: '1.0.0',
        devDependencies: { react: '19.3.1', 'react-dom': '19.3.1' },
      }),
    )
    registryPath = join(tmp, 'registry.json')
    const fixture = {
      version: 1,
      appFrameworks: {
        react: { label: 'React', dependencies: { react: '19.0.0', 'react-dom': '19.0.0' } },
        'react-native': {
          label: 'React Native',
          dependencies: { react: '19.0.0', 'react-dom': '19.0.0' },
        },
      },
      packages: {},
    }
    await writeFile(registryPath, JSON.stringify(fixture, null, 2) + '\n')
    process.env.MLCL_REGISTRY_PATH = registryPath
    process.env.MOLECULE_PACKAGES_DIR = join(tmp, 'molecule', 'packages')
    clearRegistryCache()
  })

  afterEach(async () => {
    if (origRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
    else process.env.MLCL_REGISTRY_PATH = origRegistryEnv
    if (origPackagesEnv === undefined) delete process.env.MOLECULE_PACKAGES_DIR
    else process.env.MOLECULE_PACKAGES_DIR = origPackagesEnv
    clearRegistryCache()
    await rm(tmp, { recursive: true, force: true })
  })

  it('the ledger lists the react-native react pins this test relies on', () => {
    expect(REGISTRY_PIN_EXCEPTIONS['appFrameworks.react-native.dependencies react']).toBeTruthy()
    expect(
      REGISTRY_PIN_EXCEPTIONS['appFrameworks.react-native.dependencies react-dom'],
    ).toBeTruthy()
  })

  it('--sync-frameworks keeps a listed pin and moves an unlisted one to molecule’s version', async () => {
    await SyncRegistry.run(['--sync-frameworks'], config)

    const raw = JSON.parse(await readFile(registryPath, 'utf-8'))
    expect(raw.appFrameworks['react-native'].dependencies).toEqual({
      react: '19.0.0',
      'react-dom': '19.0.0',
    })
    expect(raw.appFrameworks.react.dependencies).toEqual({ react: '19.3.1', 'react-dom': '19.3.1' })
  })
})
