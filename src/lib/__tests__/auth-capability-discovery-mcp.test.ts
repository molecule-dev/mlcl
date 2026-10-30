// @vitest-environment node
/** Hosted-protocol coverage for the registry's existing React AuthGuard. */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const MCP_DIR = join(MLCL_ROOT, 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules/@modelcontextprotocol/sdk/dist/esm')
const AUTH_GUARD_OWNER = '@molecule/app-ui-react'
const ROUTING_OWNER = '@molecule/app-routing-react-router'
const originalFetch = globalThis.fetch
const oldRegistryFile = process.env.MOLECULE_REGISTRY_FILE
const oldOptOut = process.env.DO_NOT_TRACK
let close: (() => Promise<void>) | undefined
let callTool: (args: Record<string, unknown>) => Promise<{
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}>

interface Hit {
  name: string
  stack: 'api' | 'app'
}

/** Call the hosted search tool over an in-memory MCP client/server pair. */
async function call(query: string, stack?: 'api' | 'app'): Promise<Hit[]> {
  const result = await callTool({ query, ...(stack ? { stack } : {}) })
  expect(result.isError).not.toBe(true)
  const content = result.content as Array<{ type: string; text?: string }>
  return JSON.parse(
    content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n'),
  ) as Hit[]
}

beforeAll(async () => {
  if (!existsSync(join(SDK_ESM, 'client/index.js'))) {
    throw new Error(
      'Hosted MCP SDK is required; install the existing mcp dependencies before testing',
    )
  }
  // Respect the isolated bad/good registry supplied by the native control run;
  // otherwise exercise this checkout's real serving registry.
  process.env.MOLECULE_REGISTRY_FILE ??= join(MLCL_ROOT, 'registry.json')
  JSON.parse(readFileSync(process.env.MOLECULE_REGISTRY_FILE, 'utf8'))
  process.env.DO_NOT_TRACK = '1'
  globalThis.fetch = (() => {
    throw new Error('AuthGuard discovery controls must not make an outbound request')
  }) as typeof fetch
  const { buildRemoteServer, clearRemoteCaches } = await import('../../../mcp/src/remote.js')
  const clearCaches = clearRemoteCaches
  clearCaches()
  const { Client } = await import(join(SDK_ESM, 'client/index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await buildRemoteServer().connect(serverTransport)
  const client = new Client({ name: 'auth-capability-discovery', version: '0.0.0' })
  await client.connect(clientTransport)
  close = () => client.close()
  callTool = (args) =>
    client.callTool({ name: 'search_packages', arguments: args }) as ReturnType<typeof callTool>
})

afterAll(async () => {
  if (close) await close()
  globalThis.fetch = originalFetch
  if (oldRegistryFile === undefined) delete process.env.MOLECULE_REGISTRY_FILE
  else process.env.MOLECULE_REGISTRY_FILE = oldRegistryFile
  if (oldOptOut === undefined) delete process.env.DO_NOT_TRACK
  else process.env.DO_NOT_TRACK = oldOptOut
})

describe('hosted MCP search discovers the existing AuthGuard capability', () => {
  it.each([
    'protected route',
    'auth route guard',
    'protected admin route',
    'protected billing route',
    'protect admin and billing routes',
  ])('returns the shared owner for %s', async (query) => {
    expect((await call(query, 'app')).map((hit) => hit.name)).toContain(AUTH_GUARD_OWNER)
  })

  it('preserves exact-symbol, public-routing, and declared-stack counterexamples', async () => {
    expect((await call('AuthGuard', 'app')).map((hit) => hit.name)).toEqual([AUTH_GUARD_OWNER])
    expect((await call('public route', 'app')).map((hit) => hit.name)).toContain(ROUTING_OWNER)
    expect((await call('protected route', 'api')).map((hit) => hit.name)).not.toContain(
      AUTH_GUARD_OWNER,
    )
  })
})
