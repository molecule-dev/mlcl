/** Exercise registry-scoped defaults through the commands and the manifest and injection callers. */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Config } from '@oclif/core'
import type * as execa from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type InjectionPlan, resolveDefaultProvidersFromPlans } from '../../lib/injector.js'
import { getRawRegistry, loadRegistry } from '../../lib/registry.js'
import { ensureMoleculePeerClosure, generateFontHtml } from '../../lib/scaffold.js'
import type { RegistryEntry } from '../../lib/schema.js'
import Add from '../add.js'
import Create from '../create.js'

vi.mock('execa', async (original) => ({
  ...(await original<typeof execa>()),
  execa: vi.fn(async () => ({ stdout: '', stderr: '' })),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const CHOOSER = '@molecule/app-fixture-chooser'
const DEVICE = '@molecule/app-fixture-chooser-device'
const ALTERNATE = '@molecule/app-fixture-chooser-alternate'
const VIEW = '@molecule/app-fixture-view'
const VUE = '@molecule/app-fixture-view-vue'
const PORTABLE = '@molecule/app-fixture-portable'
const GENERIC = '@molecule/app-fixture-portable-default'
const FEATURE = '@molecule/app-fixture-feature'
const BRIDGE = '@molecule/app-fixture-bridge'
const OWNER = '@molecule/app-fixture-owner'
const FONT_CORE = '@molecule/app-fixture-fonts'
const FONT_PROVIDER = '@molecule/app-fixture-fonts-vue'
const FONT_STYLESHEET = 'https://example.com/fixture-font.css'
const PRESET_THEME = '@molecule/app-theme-css-variables-liquid-glass'
const VENDOR_PEER = 'fixture-device-sdk'
const PIN = '1.2.3'
const CORES = [CHOOSER, VIEW, PORTABLE]
const PROVIDERS = [ALTERNATE, DEVICE, GENERIC, VUE].sort()

type Dependencies = Record<string, string>
type Manifest = {
  dependencies?: Dependencies
  devDependencies?: Dependencies
  molecule?: { framework?: string }
}

/** A registry entry with the fields shared by all packages in the fixture. */
function entry(name: string, metadata: Partial<RegistryEntry>): RegistryEntry {
  return {
    category: name,
    label: name,
    description: name,
    path: `packages/test/${name.slice('@molecule/'.length)}`,
    stack: 'app',
    type: 'core',
    language: 'typescript',
    runtime: 'node',
    secrets: [],
    exports: [],
    moleculePeers: [],
    ...metadata,
  }
}

const fixture: Record<string, RegistryEntry> = {
  [CHOOSER]: entry(CHOOSER, { label: 'Fixture Chooser', defaultProvider: DEVICE }),
  [DEVICE]: entry(DEVICE, {
    type: 'provider',
    implements: CHOOSER,
    framework: 'react-native',
    moleculePeers: [CHOOSER],
    thirdPartyDependencies: { dependencies: {}, peerDependencies: { [VENDOR_PEER]: PIN } },
  }),
  [ALTERNATE]: entry(ALTERNATE, {
    type: 'provider',
    implements: CHOOSER,
    framework: 'react',
    moleculePeers: [CHOOSER],
  }),
  [VIEW]: entry(VIEW, { defaultProvider: VUE }),
  [VUE]: entry(VUE, {
    type: 'provider',
    implements: VIEW,
    framework: 'vue',
    moleculePeers: [VIEW],
  }),
  [PORTABLE]: entry(PORTABLE, { defaultProvider: GENERIC }),
  [GENERIC]: entry(GENERIC, {
    type: 'provider',
    implements: PORTABLE,
    moleculePeers: [PORTABLE],
    runtimeDependencies: ['react'],
  }),
  [FEATURE]: entry(FEATURE, { type: 'feature', moleculePeers: CORES }),
  [BRIDGE]: entry(BRIDGE, { type: 'feature', moleculePeers: [OWNER] }),
  [OWNER]: entry(OWNER, { type: 'feature', moleculePeers: [ALTERNATE] }),
  [FONT_CORE]: entry(FONT_CORE, { category: 'fonts', defaultProvider: FONT_PROVIDER }),
  [FONT_PROVIDER]: entry(FONT_PROVIDER, {
    category: 'fonts',
    type: 'provider',
    implements: FONT_CORE,
    framework: 'vue',
    font: { role: 'sans', family: 'Fixture Sans', source: 'custom', url: FONT_STYLESHEET },
  }),
}

let dir: string
let previousCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-scoped-default-'))
  previousCwd = process.cwd()
  const registry = getRawRegistry()
  const file = join(dir, 'registry.json')
  await writeFile(
    file,
    JSON.stringify({
      ...registry,
      packages: { ...registry.packages, ...fixture },
      themePresets: {
        ...registry.themePresets,
        fixture: { label: 'Fixture', description: 'Fixture theme', themeProvider: PRESET_THEME },
      },
      moleculeVersions: {
        default: registry.moleculeVersions?.default ?? PIN,
        overrides: {
          ...registry.moleculeVersions?.overrides,
          ...Object.fromEntries(Object.keys(fixture).map((name) => [name, PIN])),
        },
      },
    }),
  )
  vi.stubEnv('MLCL_REGISTRY_PATH', file)
  process.chdir(dir)
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
})

afterEach(async () => {
  process.chdir(previousCwd)
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

async function readManifest(path: string): Promise<Manifest> {
  return JSON.parse(await readFile(join(path, 'package.json'), 'utf8'))
}

function fixtureProviders(names: readonly string[]): string[] {
  return PROVIDERS.filter((name) => names.includes(name))
}

function namesIn(manifest: Manifest): string[] {
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
}

async function create(framework: string, names: string[], flags: string[] = []): Promise<Manifest> {
  const cmd = new Create(
    [
      'project',
      '--type',
      'app',
      '--framework',
      framework,
      '--packages',
      names.join(','),
      '--skip-install',
      '--no-interactive',
      ...flags,
    ],
    await Config.load(MLCL_ROOT),
  )
  vi.spyOn(cmd, 'warn').mockImplementation((message) => message)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
  return readManifest(join(dir, 'project'))
}

async function add(
  manifest: Manifest,
  names: string[],
): Promise<{ manifest: Manifest; wired: string[] }> {
  await writeFile(join(dir, 'package.json'), JSON.stringify(manifest))
  const config = await Config.load(MLCL_ROOT)
  const inject = vi.spyOn(config, 'runCommand').mockResolvedValue(undefined)
  const cmd = new Add([...names, '--inject', '--no-install'], config)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
  expect(inject).toHaveBeenCalledTimes(1)
  const [command, args = []] = inject.mock.calls[0]
  expect(command).toBe('inject')
  const wired = args.filter((_, index) => args[index - 1] === '--molecule')
  return { manifest: await readManifest(dir), wired }
}

const frameworks = [
  { framework: 'react-native', providers: [DEVICE, GENERIC].sort() },
  { framework: 'react', providers: [GENERIC] },
  { framework: 'vue', providers: [GENERIC, VUE].sort() },
  { framework: 'react-native-web', providers: [GENERIC] },
]

describe('mlcl create framework-scoped defaults', () => {
  it.each(frameworks)('declares the correct providers for $framework', async (test) => {
    const manifest = await create(test.framework, [FEATURE])
    expect(namesIn(manifest)).toEqual(expect.arrayContaining(CORES))
    expect(fixtureProviders(namesIn(manifest))).toEqual(test.providers)
    expect(manifest.dependencies?.[VENDOR_PEER]).toBe(
      test.framework === 'react-native' ? PIN : undefined,
    )
  })

  it('honors the requested alternate on native even when a default matches', async () => {
    const manifest = await create('react-native', [FEATURE, ALTERNATE])
    expect(fixtureProviders(namesIn(manifest))).toEqual([ALTERNATE, GENERIC])
  })

  it('uses the requested theme preset instead of the automatic native theme', async () => {
    const manifest = await create('react-native', [FEATURE], ['--theme', 'fixture'])
    expect(namesIn(manifest)).toContain(PRESET_THEME)
    expect(namesIn(manifest)).not.toContain('@molecule/app-theme-nativewind')
  })
})

describe('mlcl add --inject framework-scoped defaults', () => {
  it.each(frameworks)('declares and wires the correct providers for $framework', async (test) => {
    const result = await add({ molecule: { framework: test.framework } }, [FEATURE])
    expect(namesIn(result.manifest)).toEqual(expect.arrayContaining(CORES))
    expect(fixtureProviders(namesIn(result.manifest))).toEqual(test.providers)
    expect(fixtureProviders(result.wired)).toEqual(test.providers)
    expect(result.manifest.dependencies?.[VENDOR_PEER]).toBe(
      test.framework === 'react-native' ? PIN : undefined,
    )
  })

  it('keeps a declared alternate in devDependencies and omits its default from inject', async () => {
    const result = await add(
      { dependencies: { react: PIN, 'react-native': PIN }, devDependencies: { [ALTERNATE]: PIN } },
      [FEATURE],
    )
    expect(fixtureProviders(namesIn(result.manifest))).toEqual([ALTERNATE, GENERIC])
    expect(result.manifest.devDependencies?.[ALTERNATE]).toBe(PIN)
    expect(fixtureProviders(result.wired)).toEqual([GENERIC])
  })

  it('wires the alternate named in the same request', async () => {
    const result = await add({ molecule: { framework: 'react-native' } }, [FEATURE, ALTERNATE])
    expect(fixtureProviders(namesIn(result.manifest))).toEqual([ALTERNATE, GENERIC])
    expect(fixtureProviders(result.wired)).toEqual([ALTERNATE, GENERIC])
  })

  it('finds an alternate in the required peer graph before adding any defaults', async () => {
    const result = await add({ molecule: { framework: 'react-native' } }, [CHOOSER, BRIDGE])
    expect(fixtureProviders(namesIn(result.manifest))).toEqual([ALTERNATE])
    expect(fixtureProviders(result.wired)).toEqual([ALTERNATE])
  })

  it('asks for a provider when a capability has no provider for this renderer', async () => {
    await expect(
      add({ dependencies: { vue: PIN } }, ['--capability', 'fixture chooser']),
    ).rejects.toMatchObject({ oclif: { exit: 1 } })
    expect(namesIn(await readManifest(dir))).toEqual(['vue'])
  })

  it('accepts a capability when the same request names its alternate provider', async () => {
    const result = await add({ dependencies: { react: PIN } }, [
      '--capability',
      'fixture chooser',
      ALTERNATE,
      VIEW,
    ])
    expect(namesIn(result.manifest)).toContain(CHOOSER)
    expect(fixtureProviders(namesIn(result.manifest))).toEqual([ALTERNATE])
    expect(fixtureProviders(result.wired)).toEqual([ALTERNATE])
  })

  it('recognizes a bare web renderer and keeps the native provider out', async () => {
    const result = await add({ dependencies: { react: PIN, 'react-native-web': PIN } }, [FEATURE])
    expect(fixtureProviders(namesIn(result.manifest))).toEqual([GENERIC])
    expect(fixtureProviders(result.wired)).toEqual([GENERIC])
  })
})

describe('standalone inject framework-scoped defaults', () => {
  it.each(frameworks)('chooses from the project manifest for $framework', async (test) => {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        molecule: { framework: test.framework },
        dependencies: { 'react-native': PIN },
      }),
    )
    for (const name of CORES) {
      const path = join(dir, 'node_modules', name, 'package.json')
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify({ name, version: PIN }))
    }
    const plan: InjectionPlan = {
      molecule: FEATURE,
      dependencies: CORES.map((name) => ({ name, version: PIN, type: 'peerDependency' })),
      files: [],
      migrations: [],
      conflicts: [],
    }
    const resolved = await resolveDefaultProvidersFromPlans([plan], [FEATURE], dir)
    expect(resolved.sort()).toEqual(test.providers)
  })
})

describe('scaffold manifest closure', () => {
  it('uses each workspace renderer and counts a provider declared as a dev dependency', async () => {
    const app = join(dir, 'app')
    const api = join(dir, 'api')
    await mkdir(app)
    await mkdir(api)
    const dependencies = Object.fromEntries(CORES.map((name) => [name, PIN]))
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        dependencies,
        devDependencies: { [ALTERNATE]: PIN },
        molecule: { framework: 'react-native' },
      }),
    )
    await writeFile(join(api, 'package.json'), JSON.stringify({ dependencies }))
    await ensureMoleculePeerClosure(dir)
    expect(fixtureProviders(namesIn(await readManifest(app)))).toEqual([ALTERNATE, GENERIC])
    expect(fixtureProviders(namesIn(await readManifest(api)))).toEqual([GENERIC])
  })

  it('only emits a default provider’s font assets on the matching renderer', () => {
    const packages = loadRegistry().filter(({ name }) => [FONT_CORE, FONT_PROVIDER].includes(name))
    expect(generateFontHtml([FONT_CORE], packages, 'copy', 'vue').html).toContain(FONT_STYLESHEET)
    expect(generateFontHtml([FONT_CORE], packages, 'copy', 'react').html).toBe('')
  })
})
