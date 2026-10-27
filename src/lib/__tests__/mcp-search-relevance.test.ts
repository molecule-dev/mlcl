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
/** One hosted hit as a client reads it (the JSON text the tool returns). */
interface HostedHit {
  name: string
  stack: 'api' | 'app'
  category: string
  label: string
  description: string
  install: string
}
interface CallArgs {
  query: string
  stack?: 'api' | 'app'
  limit?: number
}
let callHits: (args: CallArgs) => Promise<HostedHit[]>
let callTool: (args: Record<string, unknown>) => Promise<{
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}>
let close: () => Promise<void>
const call = async (query: string): Promise<string[]> =>
  (await callHits({ query })).map((hit) => hit.name)

/**
 * The CLI pipeline the hosted transport must reproduce, computed independently
 * of the hosted server: `loadRegistry(<stack>)`'s declared-stack filter, the
 * canonical scorer, then ranking and the limit window.
 */
function expected(
  pool: InferredPackage[],
  query: string,
  options: { stack?: 'api' | 'app'; limit?: number } = {},
): string[] {
  return pool
    .filter((pkg) => !options.stack || pkg.molecule?.stack === options.stack)
    .map((pkg) => ({ name: pkg.name, score: scorePackage(pkg, query) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, options.limit ?? 20)
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
  callTool = (args) =>
    client.callTool({ name: 'search_packages', arguments: args }) as ReturnType<typeof callTool>
  callHits = async (args) => {
    const result = await callTool(args)
    expect(result.isError).not.toBe(true)
    const content = result.content as Array<{ type: string; text?: string }>
    return JSON.parse(
      content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n'),
    ) as HostedHit[]
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

  it('applies stack before ranking and truncation on a crowded query', async () => {
    // 25 app packages that score 40 for "form" (name + category + hint +
    // description + label), plus one api package that scores 20 (name only) —
    // a genuine same-stack match ranked past the default 20-result cutoff.
    const pool: InferredPackage[] = []
    for (let i = 0; i < 25; i += 1) {
      const suffix = String(i).padStart(2, '0')
      pool.push({
        ...seed,
        name: `@molecule/app-form-widget-${suffix}`,
        description: 'form widget for building forms',
        exports: [],
        molecule: {
          ...seed.molecule!,
          stack: 'app',
          category: 'forms',
          label: `Form Widget ${i}`,
          intentHints: ['form builder', 'form widget'],
        },
      })
    }
    pool.push({
      ...seed,
      name: '@molecule/api-form-schema',
      description: 'schema validation helpers',
      exports: [],
      molecule: {
        ...seed.molecule!,
        stack: 'api',
        category: 'validation',
        label: 'Schema',
        intentHints: [],
      },
    })
    useRegistry(pool)

    // Countercase: unfiltered, the api match is genuinely pushed out by the
    // limit window — the CLI drops it too, so this is the starting point both
    // transports share, not a hosted-only defect.
    const unfiltered = await callHits({ query: 'form' })
    expect(unfiltered.map((hit) => hit.name)).toEqual(expected(pool, 'form'))
    expect(unfiltered).toHaveLength(20)
    expect(unfiltered.map((hit) => hit.name)).not.toContain('@molecule/api-form-schema')

    // Filtering FIRST keeps the same-stack match the limit window would hide.
    const api = await callHits({ query: 'form', stack: 'api' })
    expect(api.map((hit) => hit.name)).toEqual(['@molecule/api-form-schema'])
    expect(api.map((hit) => hit.name)).toEqual(expected(pool, 'form', { stack: 'api' }))
    expect(api[0]).toMatchObject({
      stack: 'api',
      category: 'validation',
      label: 'Schema',
      description: 'schema validation helpers',
      install: 'npx mlcl add @molecule/api-form-schema --inject',
    })
    expect(api[0]).not.toHaveProperty('score')

    // The app side is filtered before the cutoff as well, and the limit applies
    // after it.
    const app = await callHits({ query: 'form', stack: 'app', limit: 5 })
    expect(app.map((hit) => hit.name)).toEqual(expected(pool, 'form', { stack: 'app', limit: 5 }))
    expect(app.every((hit) => hit.stack === 'app')).toBe(true)
  })

  it('returns the CLI/stdio DTO — label included — from the real registry', async () => {
    writeFileSync(registryFile, JSON.stringify(registry))
    clearCaches()
    const target = '@molecule/api-activity-console'
    const entry = registry.packages[target] as {
      label: string
      category: string
      description: string
    }
    const hits = await callHits({ query: target })
    expect(hits.map((hit) => hit.name)).toEqual([target])
    expect(hits[0]).toMatchObject({
      name: target,
      stack: 'api',
      category: entry.category,
      label: entry.label,
      description: entry.description,
      install: `npx mlcl add ${target} --inject`,
    })
    expect(Object.keys(hits[0]).sort()).toEqual(
      ['name', 'stack', 'category', 'label', 'description', 'install'].sort(),
    )
  })

  it('refuses invalid stack/limit inputs and still serves a valid call', async () => {
    writeFileSync(registryFile, JSON.stringify(registry))
    clearCaches()
    const refused = (args: Record<string, unknown>): Promise<boolean> =>
      callTool(args)
        .then((result) => result.isError === true)
        // Some SDK versions reject an input-schema violation instead of
        // returning `isError` — either is a refusal.
        .catch(() => true)

    expect(await refused({ query: 'payments', stack: 'web' })).toBe(true)
    expect(await refused({ query: 'payments', limit: 0 })).toBe(true)
    expect(await refused({ query: 'payments', limit: 101 })).toBe(true)
    expect(await refused({ query: 'payments '.repeat(30) })).toBe(true)

    // …and an ordinary call still works (the bounds are not over-tight).
    expect((await callHits({ query: 'payments', limit: 1 })).length).toBe(1)
  })
})
