import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import Create from '../create.js'
import SyncRegistry from '../sync-registry.js'

const MLCL_ROOT = join(import.meta.dirname, '../../..')
let root: string
let before: string

function readNodeRange(path: string): string | undefined {
  const pkg = JSON.parse(readFileSync(path, 'utf8')) as { engines?: { node?: string } }
  return pkg.engines?.node
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-node-engines-'))
  before = process.cwd()
  vi.stubEnv('DO_NOT_TRACK', '1')
})

afterEach(() => {
  process.chdir(before)
  vi.unstubAllEnvs()
  rmSync(root, { recursive: true, force: true })
})

const scaffolds = [
  [
    'custom stack',
    ['--type', 'full-stack', '--framework', 'react', '--packages', '@molecule/api-database-sqlite'],
  ],
  ['flagship template', ['--template', 'blog']],
] as const

it.each(scaffolds)('declares the Node range in every manifest of a %s', async (_kind, args) => {
  process.chdir(root)
  const config = await Config.load(MLCL_ROOT)
  const command = new Create(
    ['node-project', '--skip-install', '--no-interactive', ...args],
    config,
  )
  vi.spyOn(command, 'warn').mockImplementation((input) => input)
  vi.spyOn(command, 'log').mockImplementation(() => undefined)
  await command.run()

  const registry = JSON.parse(readFileSync(join(MLCL_ROOT, 'registry.json'), 'utf8')) as {
    toolchainEngines?: { node?: string }
  }
  const project = join(root, 'node-project')
  for (const path of ['package.json', 'api/package.json', 'app/package.json']) {
    const range = readNodeRange(join(project, path))
    expect(range, path).toEqual(expect.stringMatching(/^>=\d+\.\d+\.\d+$/))
    expect(range, path).toBe(registry.toolchainEngines?.node)
  }
  expect(readFileSync(join(project, 'README.md'), 'utf8')).toContain(
    `Node.js \`${registry.toolchainEngines?.node}\``,
  )
})

it('syncs the common Node floor across installed disjunctions and packages with no engines', async () => {
  function write(path: string, value: object): void {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value))
  }
  const registryPath = join(root, 'registry.json')
  write(registryPath, {
    version: 1,
    packages: {},
    toolchain: { app: { 'fixture-vite': '7.0.0', 'fixture-no-engines': '1.0.0' } },
  })
  write(join(root, 'node_modules/fixture-vite/package.json'), {
    name: 'fixture-vite',
    version: '7.0.0',
    engines: { node: '^20.19.0 || >=22.12.0' },
  })
  write(join(root, 'node_modules/fixture-no-engines/package.json'), {
    name: 'fixture-no-engines',
    version: '1.0.0',
  })
  vi.stubEnv('MLCL_REGISTRY_PATH', registryPath)
  vi.stubEnv('MOLECULE_PACKAGES_DIR', join(root, 'packages'))
  const config = await Config.load(MLCL_ROOT)
  await new SyncRegistry(['--sync-toolchain'], config).run()
  const result = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    toolchainEngines?: { node?: string }
  }
  expect(result.toolchainEngines?.node).toBe('>=22.12.0')
})

it('advertises the scaffold Node floor in the MCP tool list', async () => {
  const sdk = join(MLCL_ROOT, 'mcp', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(sdk, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(sdk, 'inMemory.js'))
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverSide)
  const client = new Client({ name: 'scaffold-engines-test', version: '0.0.0' })
  try {
    await client.connect(clientSide)
    const { tools } = await client.listTools()
    const description = tools.find(
      (tool: { name: string }) => tool.name === 'scaffold_project',
    )?.description
    const range = /Requires Node (>=\d+\.\d+\.\d+)\./.exec(description ?? '')?.[1]
    expect(range).toBeTypeOf('string')
    const registry = JSON.parse(readFileSync(join(MLCL_ROOT, 'registry.json'), 'utf8')) as {
      toolchainEngines?: { node?: string }
    }
    expect(range).toBe(registry.toolchainEngines?.node)
  } finally {
    await client.close()
    await moleculeServer.close()
  }
})
