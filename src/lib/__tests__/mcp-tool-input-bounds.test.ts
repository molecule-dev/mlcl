// @vitest-environment node
/**
 * The tool arguments that turn into outbound/metered WORK are bounded where a
 * client sees the bound.
 *
 * `search_packages`' query and `import_transcripts`' files were bounded for
 * exactly this reason ("unbounded input to work proportional to their length");
 * the arguments pinned here are the remaining members of that class:
 *
 * - `read_package_doc`'s name is interpolated into the outbound npm registry
 *   URL (remote — a public, unauthenticated server whose budget is per address)
 *   and echoed verbatim into the tool result (stdio), on both servers.
 * - `translate`'s protect list rides the SAME metered outbound body the text
 *   budget caps — the budget said nothing while the array stayed unbounded.
 * - `ai_decision`'s questions are one METERED AI decision per entry, and the
 *   record's entry COUNT was the one input of that tool with no bound.
 * - `moderate_content`'s categories and `create_api_key`'s scopes ride their
 *   outbound bodies verbatim.
 *
 * Schema-level bounds are asserted on the advertised JSON Schema (what a client
 * sees — removing one is a visible regression); the question cap is enforced in
 * the handler before the metered call, so it is asserted behaviorally against a
 * service double that fails loudly if it is ever reached.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

/**
 * The hosted-service double fails LOUDLY: a bound that let an over-cap input
 * through reaches this and the test reads the mock's marker instead of the cap
 * refusal — the same shape the sibling input-cap suite uses.
 */
const METERED_MARKER = 'the metered hosted service was reached'
vi.mock('../../../mcp/src/services.js', () => ({
  ServiceCallError: class ServiceCallError extends Error {},
  callHostedService: async () => {
    throw new Error(METERED_MARKER)
  },
  createApiKeyIntoEnv: async () => ({}),
  listProjects: async () => [],
}))

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

/** The refusal text whether the SDK rejects (a schema violation) or resolves. */
const callText = async (
  call: (name: string, args: Record<string, unknown>) => Promise<ToolResult>,
  name: string,
  args: Record<string, unknown>,
): Promise<string> => {
  try {
    return textOf(await call(name, args))
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let listTools: () => Promise<{ tools: Array<{ name: string; inputSchema?: unknown }> }>
let listRemoteTools: () => Promise<{ tools: Array<{ name: string; inputSchema?: unknown }> }>
let closeClient: () => Promise<void>
let closeRemote: () => Promise<void>

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  process.env.DO_NOT_TRACK = '1'

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { buildRemoteServer } = await import('../../../mcp/src/remote.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'input-bounds-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  listTools = () => client.listTools() as ReturnType<typeof listTools>
  closeClient = () => client.close()

  const [remoteTransport, remoteServerTransport] = InMemoryTransport.createLinkedPair()
  await buildRemoteServer().connect(remoteServerTransport)
  const remoteClient = new Client({ name: 'input-bounds-remote-test', version: '0.0.0' })
  await remoteClient.connect(remoteTransport)
  listRemoteTools = () => remoteClient.listTools() as ReturnType<typeof listRemoteTools>
  closeRemote = () => remoteClient.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  if (closeRemote) await closeRemote()
  delete process.env.DO_NOT_TRACK
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    '[mcp-input-bounds] mcp/node_modules is not installed — SKIPPING. ' +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/** The advertised bound for one tool argument, from the JSON Schema a client sees. */
async function schemaBound(
  tools: Array<{ name: string; inputSchema?: unknown }>,
  tool: string,
  arg: string,
  keyword: 'maxLength' | 'maxItems',
): Promise<number | undefined> {
  const schema = tools.find((entry) => entry.name === tool)?.inputSchema as
    { properties?: Record<string, Record<string, unknown>> } | undefined
  return schema?.properties?.[arg]?.[keyword] as number | undefined
}

describe('tool arguments that become outbound work carry a client-visible bound', () => {
  it('bounds read_package_doc.name on the stdio server', async (ctx) => {
    if (skipped(ctx)) return
    const bound = await schemaBound(
      (await listTools()).tools,
      'read_package_doc',
      'name',
      'maxLength',
    )
    expect(bound, 'read_package_doc.name must carry a length cap').toBe(200)
  })

  it('bounds read_package_doc.name on the remote (public) server', async (ctx) => {
    if (skipped(ctx)) return
    const bound = await schemaBound(
      (await listRemoteTools()).tools,
      'read_package_doc',
      'name',
      'maxLength',
    )
    expect(bound, 'the remote read_package_doc.name must carry a length cap').toBe(200)
  })

  it('refuses an over-cap name on the remote server without an outbound fetch', async (ctx) => {
    if (skipped(ctx)) return
    // The schema refusal above is the contract; this is the behavior: a name
    // past the cap must never become the outbound registry URL. The global
    // fetch is stubbed to fail the test if it is called at all.
    const fetchSpy = vi.fn(async () => {
      throw new Error('an over-cap name must not reach the network')
    })
    vi.stubGlobal('fetch', fetchSpy)
    try {
      const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
      const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
      const { buildRemoteServer } = await import('../../../mcp/src/remote.js')
      const [t, s] = InMemoryTransport.createLinkedPair()
      await buildRemoteServer().connect(s)
      const client = new Client({ name: 'input-bounds-fetch-test', version: '0.0.0' })
      await client.connect(t)
      const text = await callText(
        (name, args) => client.callTool({ name, arguments: args }) as Promise<ToolResult>,
        'read_package_doc',
        { name: 'a'.repeat(201) },
      )
      await client.close()
      expect(text).toContain('200')
      expect(fetchSpy, 'the refusal is local — nothing dials the registry').not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('bounds translate.protect — the other half of the metered translate body', async (ctx) => {
    if (skipped(ctx)) return
    const tools = (await listTools()).tools
    expect(
      await schemaBound(tools, 'translate', 'protect', 'maxItems'),
      'translate.protect must carry a count cap',
    ).toBe(50)
    const items = tools.find((tool) => tool.name === 'translate')?.inputSchema as {
      properties?: { protect?: { items?: Record<string, unknown> } }
    }
    expect(
      items?.properties?.protect?.items?.maxLength,
      'each protect entry must carry a length cap',
    ).toBe(200)
  })

  it('refuses a protect list past the cap before the metered call', async (ctx) => {
    if (skipped(ctx)) return
    const text = await callText(callTool, 'translate', {
      text: 'hello', // well inside the text budget — only the protect cap can refuse
      target_lang: 'de',
      protect: Array.from({ length: 51 }, (_unused, i) => `p${i}`),
    })
    expect(text).toContain('50')
    expect(text, 'the refusal is the cap, not the service').not.toContain(METERED_MARKER)
  })

  it('bounds moderate_content.categories', async (ctx) => {
    if (skipped(ctx)) return
    const bound = await schemaBound(
      (await listTools()).tools,
      'moderate_content',
      'categories',
      'maxItems',
    )
    expect(bound, 'moderate_content.categories must carry a count cap').toBe(50)
  })

  it('bounds create_api_key.scopes', async (ctx) => {
    if (skipped(ctx)) return
    const bound = await schemaBound(
      (await listTools()).tools,
      'create_api_key',
      'scopes',
      'maxItems',
    )
    expect(bound, 'create_api_key.scopes must carry a count cap').toBe(50)
  })
})

describe('ai_decision refuses more questions than it meters', () => {
  it('refuses 51 questions before the metered call', async (ctx) => {
    if (skipped(ctx)) return
    const questions = Object.fromEntries(
      Array.from({ length: 51 }, (_unused, i) => [
        `q${i}`,
        { type: 'yesNo', instructions: `Is ${i} even?` },
      ]),
    )
    const text = await callText(callTool, 'ai_decision', { state: 'some state', questions })
    expect(text).toContain('ai_decision accepts up to 50')
    expect(text, 'the cap refusal precedes the metered call').not.toContain(METERED_MARKER)
  })

  it('lets exactly 50 questions through to the service', async (ctx) => {
    if (skipped(ctx)) return
    // The bound must not be one question tighter than the description: at the
    // cap the call belongs to the service, so the answer here is the mock's
    // marker — anything else means the cap silently shrank.
    const questions = Object.fromEntries(
      Array.from({ length: 50 }, (_unused, i) => [
        `q${i}`,
        { type: 'yesNo', instructions: `Is ${i} even?` },
      ]),
    )
    const text = await callText(callTool, 'ai_decision', { state: 'some state', questions })
    expect(text, 'the cap admits the batch it advertises').toContain(METERED_MARKER)
  })
})
