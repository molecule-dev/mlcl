// @vitest-environment node
/**
 * The hosted `search_packages` tool filters by the project's app framework the way
 * `mlcl search` does: against the fetched registry's `appFrameworks`.
 *
 * Its input used to be a fixed list of package frameworks, so a react-native-web
 * project could only say `react-native` and lost every React package it imports,
 * and a framework the registry adds needed a server change. It is now any
 * `appFrameworks` key, checked against the registry it fetched.
 *
 * @module
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadAppFrameworks } from '../registry.js'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
/** mcp is not an npm workspace member; without its deps this suite skips out loud. */
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-remote-search-framework] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

let dir: string
let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let closeClient: () => Promise<void>
const originalFetch = globalThis.fetch

const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

/** One probe package per framework, all exporting the same hook. */
const probe = (framework?: string): Record<string, unknown> => ({
  type: 'feature',
  category: 'probe',
  stack: 'app',
  label: `Probe ${framework ?? 'neutral'}`,
  description: 'probe',
  exports: ['useProbeWidget'],
  ...(framework ? { framework } : {}),
})

const names = async (args: Record<string, unknown>): Promise<string[]> => {
  const result = await callTool('search_packages', { query: 'useProbeWidget', ...args })
  expect(result.isError, textOf(result)).toBeFalsy()
  return (JSON.parse(textOf(result)) as Array<{ name: string }>).map((hit) => hit.name).sort()
}

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-search-framework-'))
  const registryFile = join(dir, 'registry.json')
  writeFileSync(
    registryFile,
    JSON.stringify({
      version: 1,
      appFrameworks: loadAppFrameworks(),
      packages: {
        '@molecule/app-probe-react': probe('react'),
        '@molecule/app-probe-vue': probe('vue'),
        '@molecule/app-probe-react-native': probe('react-native'),
        '@molecule/app-probe': probe(),
      },
    }),
  )
  process.env.MOLECULE_REGISTRY_FILE = registryFile
  process.env.DO_NOT_TRACK = '1'
  globalThis.fetch = (() => {
    throw new Error('this suite must not make an outbound request')
  }) as unknown as typeof globalThis.fetch

  const { buildRemoteServer, clearRemoteCaches } = await import('../../../mcp/src/remote.js')
  clearRemoteCaches()
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await buildRemoteServer().connect(serverTransport)
  const client = new Client({ name: 'search-framework-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  globalThis.fetch = originalFetch
  delete process.env.DO_NOT_TRACK
  delete process.env.MOLECULE_REGISTRY_FILE
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe('hosted search_packages framework filter', () => {
  it('keeps React and react-native packages for a react-native-web project', async (ctx) => {
    if (skipped(ctx)) return
    expect(await names({ framework: 'react-native-web' })).toEqual([
      '@molecule/app-probe',
      '@molecule/app-probe-react',
      '@molecule/app-probe-react-native',
    ])
  })

  it('counterexample: a React project and a native project each keep only their own', async (ctx) => {
    if (skipped(ctx)) return
    expect(await names({ framework: 'react' })).toEqual([
      '@molecule/app-probe',
      '@molecule/app-probe-react',
    ])
    expect(await names({ framework: 'react-native' })).toEqual([
      '@molecule/app-probe',
      '@molecule/app-probe-react-native',
    ])
    expect((await names({})).length).toBe(4)
  })

  it('names the known frameworks for one the registry does not have', async (ctx) => {
    if (skipped(ctx)) return
    const result = await callTool('search_packages', { query: 'probe', framework: 'qwik' })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('Unknown framework "qwik"')
    expect(textOf(result)).toContain('react-native-web')
  })

  it('refuses a value that is not a framework key', async (ctx) => {
    if (skipped(ctx)) return
    const result = await callTool('search_packages', { query: 'probe', framework: '--json' })
    expect(result.isError).toBe(true)
  })
})
