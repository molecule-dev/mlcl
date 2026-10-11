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
 *   budget caps — the budget said nothing while the array stayed unbounded, and
 *   its `context` plus the two language codes rode it with no bound at all.
 * - `ai_decision`'s questions are one METERED AI decision per entry, and the
 *   record's entry COUNT was the one input of that tool with no bound.
 * - `moderate_content`'s categories and `create_api_key`'s scopes ride their
 *   outbound bodies verbatim.
 * - `transform_image`'s background color and `push_send`'s three subscription
 *   fields (endpoint URL, p256dh key, auth secret) ride their metered outbound
 *   bodies verbatim, where the sibling tools bound the same shapes.
 * - `embed_text`'s input IS the metered embeddings work (billed per token) and
 *   the outbound body; the hosted service refuses past its own limits
 *   (256 texts / 32,000 characters each / 400,000 in total), so the tool
 *   enforces exactly those before the call instead of shipping a doomed
 *   round trip.
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

  it('bounds the translate fields that ride the body without being billed', async (ctx) => {
    if (skipped(ctx)) return
    // `text` is covered by the character budget and `protect` by its own caps
    // (below) — these three were the only strings on this call with NO bound:
    // a free-text `context` (and either language code) sized the metered
    // outbound body by whatever the caller sent, up to the 1 MB JSON body cap,
    // while every sibling field of that shape carries one.
    const tools = (await listTools()).tools
    expect(
      await schemaBound(tools, 'translate', 'target_lang', 'maxLength'),
      'translate.target_lang must carry a length cap',
    ).toBe(35)
    expect(
      await schemaBound(tools, 'translate', 'source_lang', 'maxLength'),
      'translate.source_lang must carry a length cap',
    ).toBe(35)
    expect(
      await schemaBound(tools, 'translate', 'context', 'maxLength'),
      'translate.context must carry a length cap',
    ).toBe(500)
  })

  it('refuses an over-cap translate context before the metered call', async (ctx) => {
    if (skipped(ctx)) return
    // The schema bound is the contract; this is the behavior, through the same
    // path a client takes. `text` is well inside its budget, so only the
    // context cap can refuse — and the refusal must precede the hosted call.
    const text = await callText(callTool, 'translate', {
      text: 'hello',
      target_lang: 'de',
      context: 'c'.repeat(501),
    })
    expect(text, 'an over-cap context must be refused').toMatch(/500|too_big|max/i)
    expect(text, 'the refusal precedes the metered call').not.toContain(METERED_MARKER)
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

  it('bounds transform_image.background — the metered transform body’s color field', async (ctx) => {
    if (skipped(ctx)) return
    const schema = (await listTools()).tools.find((tool) => tool.name === 'transform_image')
      ?.inputSchema as
      | {
          properties?: {
            ops?: { items?: { properties?: { background?: Record<string, unknown> } } }
          }
        }
      | undefined
    // `background` is per-operation, so its cap sits in the `ops` item schema —
    // one level deeper than schemaBound's top-level lookup reaches.
    const bound = schema?.properties?.ops?.items?.properties?.background?.maxLength
    // The sibling cap watermark_pdf declares for its own CSS color — a color is
    // a few dozen characters, so the two tools must not disagree.
    expect(bound, 'transform_image ops[].background must carry a length cap').toBe(40)
  })

  it('bounds the three push_send subscription fields that ride the outbound body', async (ctx) => {
    if (skipped(ctx)) return
    const tools = (await listTools()).tools
    expect(
      await schemaBound(tools, 'push_send', 'endpoint', 'maxLength'),
      'push_send.endpoint must carry a length cap',
    ).toBe(2048)
    expect(
      await schemaBound(tools, 'push_send', 'p256dh', 'maxLength'),
      'push_send.p256dh must carry a length cap',
    ).toBe(200)
    expect(
      await schemaBound(tools, 'push_send', 'auth', 'maxLength'),
      'push_send.auth must carry a length cap',
    ).toBe(200)
  })

  it('bounds embed_text.input — the metered embeddings body its siblings all cap', async (ctx) => {
    if (skipped(ctx)) return
    // `input` is a union (string | array), so the caps sit in the anyOf
    // branches one level below the top-level lookup the other assertions use.
    const schema = (await listTools()).tools.find((tool) => tool.name === 'embed_text')
      ?.inputSchema as
      { properties?: { input?: { anyOf?: Array<Record<string, unknown>> } } } | undefined
    const branches = schema?.properties?.input?.anyOf ?? []
    const stringBranch = branches.find((b) => b.type === 'string')
    const arrayBranch = branches.find((b) => b.type === 'array')
    expect(
      stringBranch?.maxLength,
      'embed_text must cap the single-string form at the service per-text limit',
    ).toBe(32_000)
    expect(
      arrayBranch?.maxItems,
      'embed_text must cap the list form at the service count limit',
    ).toBe(256)
    const items = (arrayBranch?.items ?? {}) as Record<string, unknown>
    expect(items.maxLength, 'each embedded text must carry the per-text cap').toBe(32_000)
  })

  it('refuses an embed_text list past the count cap before the metered call', async (ctx) => {
    if (skipped(ctx)) return
    const text = await callText(callTool, 'embed_text', {
      input: Array.from({ length: 257 }, (_unused, i) => `t${i}`),
    })
    expect(text).toContain('256')
    expect(text, 'the refusal is the cap, not the service').not.toContain(METERED_MARKER)
  })

  it('refuses an EMPTY embed_text list before the metered call', async (ctx) => {
    if (skipped(ctx)) return
    // The array branch carried `.max` but no `.min`, so `[]` passed the schema
    // AND the handler's total-character check (it carries none) and reached the
    // hosted service — the same doomed round trip the string branch's `.min(1)`
    // already refuses at the schema. The refusal is the schema's own, so the
    // assertion is that the metered service is never reached and the caller is
    // told the list must carry at least one text.
    const text = await callText(callTool, 'embed_text', { input: [] })
    expect(text, 'an empty list must be refused').toMatch(/at least 1|>=\s*1|empty/i)
    expect(text, 'the refusal precedes the metered call').not.toContain(METERED_MARKER)
  })
})

describe('embed_text refuses more characters than the service accepts', () => {
  it('refuses a total past the budget before the metered call', async (ctx) => {
    if (skipped(ctx)) return
    // Inside the per-text (32,000) and count (256) caps the schema enforces,
    // over the 400,000 total only the handler checks: 13 × 32,000 = 416,000.
    const input = Array.from({ length: 13 }, () => 'a'.repeat(32_000))
    const text = await callText(callTool, 'embed_text', { input })
    // Raw digits, the same unseparated form translate's budget refusal names.
    expect(text).toContain('400000')
    expect(text, 'the budget refusal precedes the metered call').not.toContain(METERED_MARKER)
  })

  it('admits a call at both caps the schema enforces', async (ctx) => {
    if (skipped(ctx)) return
    // The bound must not be tighter than the service's: 256 texts inside the
    // per-text cap whose total stays within 400,000 reaches the service.
    const input = Array.from({ length: 256 }, () => 'a'.repeat(1_500))
    const text = await callText(callTool, 'embed_text', { input })
    expect(text, 'the caps admit the batch the service accepts').toContain(METERED_MARKER)
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
