import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Config } from '@oclif/core'
import semver from 'semver'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { scaffoldNodePinMetadata } from '../../lib/scaffold-node-metadata.js'
import { scaffoldNodeEngineManifests } from '../../lib/scaffold-node-range.js'
import { Registry } from '../../lib/schema.js'
import Create from '../create.js'

const cliRoot = join(import.meta.dirname, '../../..')
const declarations = z.record(z.string(), z.string()).default({})
const packageJson = z.object({
  engines: declarations,
  dependencies: declarations,
  devDependencies: declarations,
})
let scratch: string
let originalCwd: string

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value))
}

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-node-engine-'))
  originalCwd = process.cwd()
  vi.stubEnv('DO_NOT_TRACK', '1')
})

afterEach(async () => {
  process.chdir(originalCwd)
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  await rm(scratch, { recursive: true })
})

it('takes the Node range from each workspace and intersects them at the root', async () => {
  const catalog = join(scratch, 'catalog.json')
  const appRange = '^22.22.3 || ^24.15.0 || >=26.0.0'
  await writeJson(catalog, {
    version: 1,
    packages: {},
    toolchainEngines: {
      pins: {
        'api-tool@1.0.0': '>=20',
        'app-tool@1.0.0': appRange,
        'app-tool@2.0.0': '>=28',
        'package-without-engines@1.0.0': null,
      },
    },
  })
  vi.stubEnv('MLCL_REGISTRY_PATH', catalog)
  await writeJson(join(scratch, 'package.json'), { workspaces: ['api', 'app'] })
  await writeJson(join(scratch, 'api/package.json'), {
    dependencies: { 'api-tool': '1.0.0', 'package-without-engines': '1.0.0' },
  })
  await writeJson(join(scratch, 'app/package.json'), {
    devDependencies: { 'app-tool': '1.0.0' },
    engines: { npm: '>=11' },
  })

  const planned = new Map(
    (await scaffoldNodeEngineManifests(scratch)).map(({ path, contents }) => [
      path,
      packageJson.parse(JSON.parse(contents)).engines,
    ]),
  )
  const api = planned.get(join(scratch, 'api/package.json'))
  const app = planned.get(join(scratch, 'app/package.json'))
  const root = planned.get(join(scratch, 'package.json'))
  expect(api?.node).toBe('>=20.0.0')
  expect(app?.npm).toBe('>=11')
  expect(app?.node).toBe(root?.node)
  for (const version of [
    '22.22.2',
    '22.22.3',
    '23.0.0',
    '24.14.9',
    '24.15.0',
    '25.0.0',
    '26.0.0',
  ]) {
    expect(semver.satisfies(version, app?.node ?? '')).toBe(semver.satisfies(version, appRange))
  }
})

it.each(['default registry', 'detached registry'] as const)(
  'refreshes exact pin metadata for the CLI bundle with a %s',
  async (location) => {
    await writeJson(join(scratch, 'package-lock.json'), {
      packages: {
        'node_modules/different-lock-version': { version: '2.0.0', engines: { node: '>=24' } },
        'node_modules/local-pin': { version: '1.0.0', engines: { node: '>=22' } },
      },
    })
    await writeJson(join(scratch, 'templates/apps/fixture/api/package.json'), {
      dependencies: { 'template-pin': '1.0.0' },
    })
    const replies = new Map([
      ['different-lock-version', { name: 'different-lock-version', version: '1.0.0' }],
      ['template-pin', { name: 'template-pin', version: '1.0.0', engines: { node: '>=20' } }],
    ])
    const request = vi.fn(async (url: string) => {
      const name = new URL(url).pathname.split('/').at(-2) ?? ''
      return Response.json(replies.get(name), { status: replies.has(name) ? 200 : 404 })
    })
    vi.stubGlobal('fetch', request)
    const registry = Registry.parse({
      version: 1,
      packages: {},
      toolchain: { api: { 'local-pin': '1.0.0', 'different-lock-version': '1.0.0' } },
    })
    const registryRoot = location === 'detached registry' ? join(scratch, 'registry-only') : scratch
    await writeJson(join(registryRoot, 'registry.json'), registry)
    const pins = await scaffoldNodePinMetadata(registry, scratch, { registryRoot })
    expect(pins).toEqual({
      'different-lock-version@1.0.0': null,
      'local-pin@1.0.0': '>=22',
      'template-pin@1.0.0': '>=20',
    })
    expect(request).toHaveBeenCalledTimes(2)
    request.mockClear()
    expect(
      await scaffoldNodePinMetadata({ ...registry, toolchainEngines: { pins } }, scratch, {
        registryRoot,
      }),
    ).toEqual(pins)
    expect(request).not.toHaveBeenCalled()
  },
)

const scaffolds = [
  ['React', ['--type', 'app', '--framework', 'react'], ['package.json']],
  ['Angular', ['--type', 'app', '--framework', 'angular'], ['package.json']],
  ['API-only', ['--type', 'api', '--packages', '@molecule/api-database-sqlite'], ['package.json']],
  ['flagship', ['--template', 'blog'], ['package.json', 'api/package.json', 'app/package.json']],
] as const

it.each(scaffolds)(
  'declares the generated Node ranges for a %s project',
  async (_kind, args, paths) => {
    process.chdir(scratch)
    const config = await Config.load(cliRoot)
    const command = new Create(
      ['node-project', '--skip-install', '--no-interactive', ...args],
      config,
    )
    vi.spyOn(command, 'warn').mockImplementation((input) => input)
    vi.spyOn(command, 'log').mockImplementation(() => undefined)
    await command.run()

    const registry = Registry.parse(
      JSON.parse(await readFile(join(cliRoot, 'registry.json'), 'utf8')),
    )
    const pins = registry.toolchainEngines?.pins
    expect(pins).toBeDefined()
    const project = join(scratch, 'node-project')
    const parsed = await Promise.all(
      paths.map(async (path) =>
        packageJson.parse(JSON.parse(await readFile(join(project, path), 'utf8'))),
      ),
    )
    const cli = packageJson.parse(JSON.parse(await readFile(join(cliRoot, 'package.json'), 'utf8')))
    const sources = parsed.map((manifest) =>
      [manifest.dependencies, manifest.devDependencies]
        .flatMap((deps) => Object.entries(deps))
        .map(([name, version]) => pins?.[name + '@' + version])
        .filter((range) => range !== null && range !== undefined),
    )
    expect(sources.flat().length).toBeGreaterThan(0)
    for (const [index, { engines }] of parsed.entries()) {
      expect(engines.node, paths[index]).toBeTruthy()
      const constraints = index === 0 ? [cli.engines.node, ...sources.flat()] : sources[index]
      for (const version of [
        '20.19.0',
        '22.0.0',
        '22.13.0',
        '22.22.2',
        '22.22.3',
        '23.0.0',
        '24.0.0',
        '24.15.0',
        '25.0.0',
        '26.0.0',
      ]) {
        expect(semver.satisfies(version, engines.node), paths[index] + ': ' + version).toBe(
          constraints.every((range) => semver.satisfies(version, range)),
        )
      }
    }
  },
)
