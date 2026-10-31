import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildCapabilityMap,
  readProjectCapabilityMap,
  renderCapabilityMap,
  stampCapabilityBondHeaders,
} from '../capability-map.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { getRawRegistry, loadRegistry } from '../registry.js'

const registry = getRawRegistry()
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-capability-map-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('declared capability map', () => {
  it('names only declared guided packages and carries their common API configuration', () => {
    const entries = buildCapabilityMap(registry, [
      { name: '@molecule/app-react', workspace: 'app' },
      { name: '@molecule/app-auth', workspace: 'app' },
      { name: '@molecule/app-http', workspace: 'app' },
    ])

    expect(entries.map((entry) => entry.name)).toEqual(['@molecule/app-auth', '@molecule/app-http'])
    const text = renderCapabilityMap(entries)
    expect(text).toContain('## Declared capability map')
    expect(text).toContain('`@molecule/app-auth`')
    expect(text).toContain('`@molecule/app-http`')
    expect(text).not.toContain('Wired bond:')
    expect(text).toContain('not using @molecule/<name> because')
    for (const config of [
      "authScheme: 'Bearer'",
      "authScheme: 'Token'",
      'tokenKey',
      'mapAuthResponse',
      'currentUserEndpoint',
      'profileUpdateMethod',
      "storage: 'memory'",
      'withCredentials: true',
    ]) {
      expect(text).toContain(config)
    }
  })

  it('returns no auth or HTTP entry for a project that does not declare them', () => {
    expect(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-react', workspace: 'app' },
        { name: '@molecule/api-database', workspace: 'api' },
      ]),
    ).toEqual([])
    expect(renderCapabilityMap([])).toBe('')
  })

  it('reads root and workspace manifests rather than a hand-kept project list', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '1.0.0' } }))
    await mkdir(join(dir, 'app'), { recursive: true })
    await writeFile(
      join(dir, 'app', 'package.json'),
      JSON.stringify({
        dependencies: { '@molecule/app-auth': '1.0.0', '@molecule/app-http': '1.0.0' },
      }),
    )

    const entries = await readProjectCapabilityMap(dir, registry)
    expect(entries.map((entry) => [entry.name, entry.workspaces])).toEqual([
      ['@molecule/app-auth', ['app']],
      ['@molecule/app-http', ['app']],
    ])
  })

  it('puts the same configuration next to generated auth and HTTP wiring', () => {
    const files = synthesizeAppProjectFiles(
      [],
      ['@molecule/app-auth', '@molecule/app-http'],
      '/tmp/test-app',
      loadRegistry(),
    )
    for (const bond of ['auth-default.ts', 'http-default.ts']) {
      const content = files.find((file) => file.targetPath.endsWith(`bonds/${bond}`))?.content
      expect(content, bond).toContain('Declared capability:')
      expect(content, bond).toContain('Configuration by API shape:')
      expect(content, bond).toContain("authScheme: 'Bearer'")
    }
    const auth = files.find((file) => file.targetPath.endsWith('bonds/auth-default.ts'))!.content
    expect(auth).toContain("authScheme: 'Token'")
    expect(auth).toContain('mapAuthResponse')
    expect(auth).toContain('currentUserEndpoint')
    expect(auth).toContain('profileUpdateMethod')
    expect(auth).toContain("storage: 'memory'")
  })

  it('stamps a copied flagship bond once and preserves Bearer and cookie configuration', async () => {
    const bondPath = join(dir, 'app', 'src', 'bonds', 'auth-default.ts')
    const configPath = join(dir, 'app', 'src', 'config.ts')
    await mkdir(join(dir, 'app', 'src', 'bonds'), { recursive: true })
    await writeFile(
      join(dir, 'app', 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/app-auth': '1.0.0' } }),
    )
    await writeFile(
      bondPath,
      "import { createJWTAuthClient, setClient } from '@molecule/app-auth'\n" +
        "import { authConfig } from '../config.js'\n" +
        'setClient(createJWTAuthClient(authConfig))\n',
    )
    const config =
      "export const authConfig = { authScheme: 'Bearer', storage: 'memory' as const }\n"
    await writeFile(configPath, config)

    await stampCapabilityBondHeaders(dir, registry)
    const first = await readFile(bondPath, 'utf8')
    await stampCapabilityBondHeaders(dir, registry)

    expect(await readFile(bondPath, 'utf8')).toBe(first)
    expect(first).toContain('Declared capability:')
    expect(first).toContain("authScheme: 'Token'")
    expect(first).toContain("storage: 'memory'")
    expect(await readFile(configPath, 'utf8')).toBe(config)
  })
})
