// @vitest-environment node
/**
 * The tools a coding agent calls first are loaded into Claude Code's prompt up front
 * (`_meta["anthropic/alwaysLoad"]`), on both servers, and the rest stay deferred behind its
 * ToolSearch. In the 2026-11-23 find eval Claude Code spent a ToolSearch turn before its first
 * `search_packages` call.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package; its own node_modules holds the MCP SDK. */
const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

vi.mock('../../../mcp/src/services.js', () => ({
  ServiceCallError: class ServiceCallError extends Error {},
  callHostedService: async () => {
    throw new Error('no hosted service in this test')
  },
  createApiKeyIntoEnv: async () => ({}),
  listProjects: async () => [],
}))

interface ListedTool {
  name: string
  _meta?: Record<string, unknown>
}

let stdioTools: ListedTool[] = []
let remoteTools: ListedTool[] = []
const closers: Array<() => Promise<void>> = []

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  process.env.DO_NOT_TRACK = '1'
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { buildRemoteServer } = await import('../../../mcp/src/remote.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const list = async (server: {
    connect: (transport: unknown) => Promise<void>
  }): Promise<ListedTool[]> => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'tool-loading-test', version: '0.0.0' })
    await client.connect(clientTransport)
    closers.push(() => client.close())
    return ((await client.listTools()) as { tools: ListedTool[] }).tools
  }
  stdioTools = await list(moleculeServer)
  remoteTools = await list(buildRemoteServer())
})

afterAll(async () => {
  for (const close of closers) await close()
  delete process.env.DO_NOT_TRACK
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    '[mcp-tool-loading] mcp/node_modules is not installed: SKIPPING (cd mcp && npm install).',
  )
  ctx.skip()
  return true
}

const upFront = (tools: ListedTool[]): string[] =>
  tools
    .filter((tool) => tool._meta?.['anthropic/alwaysLoad'] === true)
    .map((tool) => tool.name)
    .sort()

describe('the tools Claude Code loads before the first turn', () => {
  it('are the first-step tools on the stdio server, and only those', async (ctx) => {
    if (skipped(ctx)) return
    const { UP_FRONT_TOOLS } = await import('../../../mcp/src/tool-loading.js')
    expect(upFront(stdioTools)).toEqual(
      [
        'add_package',
        'check_project',
        'list_templates',
        'read_package_doc',
        'scaffold_project',
        'search_packages',
      ].sort(),
    )
    expect(upFront(stdioTools)).toEqual([...UP_FRONT_TOOLS].sort())
    // Everything else stays deferred: dozens of platform tools would otherwise fill every prompt.
    expect(stdioTools.length).toBeGreaterThan(UP_FRONT_TOOLS.length * 5)
  })

  it('are every first-step tool the hosted server has', async (ctx) => {
    if (skipped(ctx)) return
    const { UP_FRONT_TOOLS } = await import('../../../mcp/src/tool-loading.js')
    const hosted = remoteTools.map((tool) => tool.name)
    expect(upFront(remoteTools)).toEqual(
      UP_FRONT_TOOLS.filter((name) => hosted.includes(name)).sort(),
    )
    expect(upFront(remoteTools)).toEqual(['list_templates', 'read_package_doc', 'search_packages'])
  })
})

// Codex reads no per-tool hint: setup registers the server twice, one table exposing these tools up
// front and one the rest (CODEX_UP_FRONT_TOOLS), so its list must name the same tools.
describe('the tools Codex loads before the first turn', () => {
  it('are the tools the stdio server loads up front for Claude Code', async (ctx) => {
    if (skipped(ctx)) return
    const { CODEX_UP_FRONT_TOOLS } = await import('../agent-harnesses.js')
    expect([...CODEX_UP_FRONT_TOOLS].sort()).toEqual(upFront(stdioTools))
    const names = stdioTools.map((tool) => tool.name)
    for (const name of CODEX_UP_FRONT_TOOLS) expect(names).toContain(name)
  })
})
