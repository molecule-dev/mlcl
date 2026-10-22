// @vitest-environment node
/** Hosted discovery must preserve the canonical CLI's public search contract. */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { scorePackage } from '../../commands/search.js'
import { loadRegistry } from '../registry.js'
import type { InferredPackage } from '../schema.js'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules/@modelcontextprotocol/sdk/dist/esm')
const available = existsSync(join(MCP_DIR, 'node_modules/@modelcontextprotocol/sdk/package.json'))
const packages = loadRegistry()
const registry = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../../registry.json'), 'utf8'),
)
const seed = packages.find((pkg) => pkg.name === '@molecule/app-react')!
const originalFetch = globalThis.fetch
const oldFile = process.env.MOLECULE_REGISTRY_FILE
const oldOptOut = process.env.DO_NOT_TRACK
let dir: string
let registryFile: string
let clearCaches: () => void
let call: (query: string) => Promise<string[]>
let close: () => Promise<void>

function expected(pool: InferredPackage[], query: string): string[] {
  return pool
    .map((pkg) => ({ name: pkg.name, score: scorePackage(pkg, query) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 20)
    .map((hit) => hit.name)
}

function useRegistry(pool: InferredPackage[]): void {
  writeFileSync(
    registryFile,
    JSON.stringify({
      packages: Object.fromEntries(
        pool.map((pkg) => [
          pkg.name,
          { ...pkg.molecule, description: pkg.description, exports: pkg.exports },
        ]),
      ),
    }),
  )
  clearCaches()
}

beforeAll(async () => {
  if (!available) {
    console.warn('[mcp-search-relevance] MCP SDK is absent; skipping in-memory protocol controls')
    return
  }
  dir = mkdtempSync(join(tmpdir(), 'mcp-search-relevance-'))
  registryFile = join(dir, 'registry.json')
  process.env.MOLECULE_REGISTRY_FILE = registryFile
  process.env.DO_NOT_TRACK = '1'
  globalThis.fetch = (() => {
    throw new Error('discovery parity controls must not make an outbound request')
  }) as typeof fetch
  const { buildRemoteServer, clearRemoteCaches } = await import('../../../mcp/src/remote.js')
  clearCaches = clearRemoteCaches
  const { Client } = await import(join(SDK_ESM, 'client/index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [a, b] = InMemoryTransport.createLinkedPair()
  await buildRemoteServer().connect(b)
  const client = new Client({ name: 'search-relevance-controls', version: '0.0.0' })
  await client.connect(a)
  close = () => client.close()
  call = async (query) => {
    const result = await client.callTool({ name: 'search_packages', arguments: { query } })
    expect(result.isError).not.toBe(true)
    const content = result.content as Array<{ type: string; text?: string }>
    return (
      JSON.parse(
        content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n'),
      ) as Array<{ name: string }>
    ).map((hit) => hit.name)
  }
})

afterAll(async () => {
  if (close) await close()
  globalThis.fetch = originalFetch
  if (oldFile === undefined) delete process.env.MOLECULE_REGISTRY_FILE
  else process.env.MOLECULE_REGISTRY_FILE = oldFile
  if (oldOptOut === undefined) delete process.env.DO_NOT_TRACK
  else process.env.DO_NOT_TRACK = oldOptOut
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe.skipIf(!available)('hosted MCP search — actual protocol parity with the CLI', () => {
  it.each([
    'profile settings form',
    'edit profile',
    'list pagination URL state',
    'URL pagination filters',
    'useProfileForm',
    'useProfileForm()',
    'useListRoute',
    'query',
    '@molecule/app-react',
    'postgres',
    'useProfileFormState',
  ])('uses canonical scoring with the real registry for %s', async (query) => {
    // Use the actual raw entry shape, not a fixture that hides missing exports.
    writeFileSync(registryFile, JSON.stringify(registry))
    clearCaches()
    expect(await call(query)).toEqual(expected(packages, query))
  })

  it('preserves phrase and category boundaries and rejects invented/partial symbols generically', async () => {
    const fixture = (name: string, hints: string[], exports: string[]): InferredPackage => ({
      ...seed,
      name,
      description: '',
      exports,
      molecule: { ...seed.molecule!, label: name, category: 'example', intentHints: hints },
    })
    const pool = [
      fixture('@molecule/app-bindings', ['account editor'], ['useRecordEditor', '$']),
      fixture('@molecule/app-account-editorial', [], ['account_editor']),
      fixture('@molecule/app-different', ['account editorial'], ['*']),
    ]
    useRegistry(pool)
    for (const query of [
      'account editor',
      'Account-Editor',
      'account editorial',
      'account-editorial',
      'useRecordEditor',
      'useRecordEditor()',
      'useRecordEditorState',
      'use',
      '*',
      '!!!',
      '$',
    ]) {
      expect(await call(query), query).toEqual(expected(pool, query))
    }
    expect(await call('account editor')).toEqual([
      '@molecule/app-bindings',
      '@molecule/app-account-editorial',
      '@molecule/app-different',
    ])
    expect(await call('useRecordEditorState')).toEqual([])
    expect(await call('use')).toEqual([])
  })

  it('does not interpret unrecognized export metadata as a symbol or crash discovery', async () => {
    writeFileSync(
      registryFile,
      JSON.stringify({
        packages: {
          '@molecule/app-records': { description: 'record tools', exports: 'useRecordEditor' },
          '@molecule/app-documents': { description: 'document tools', exports: [null, 42] },
        },
      }),
    )
    clearCaches()
    expect(await call('useRecordEditor')).toEqual([])
    expect(await call('record')).toEqual(['@molecule/app-records'])
    expect(await call('document')).toEqual(['@molecule/app-documents'])
  })
})
