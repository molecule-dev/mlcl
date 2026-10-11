// @vitest-environment node
/**
 * The pdf/image input caps are checked from the file's SIZE, never from the
 * bytes the server already allocated.
 *
 * `merge_pdfs` ("Up to 20 files, 8 MB each, 24 MB total"), `transform_image`
 * ("8 MB input") and `watermark_pdf` all read the whole local file with
 * `readFileSync` and checked `buf.length` AFTERWARDS — so the advertised limit
 * bounded what reached the hosted service, not what this process held: a path
 * far past the cap was buffered whole and the server died with an allocation
 * failure instead of reporting "the limit is 8 MB". Every sibling that caps an
 * input (transcribe_audio, extract_text, moderate_content) stats first.
 *
 * The assertions here are about the ORDER, not the arithmetic: a file whose
 * stat size is over the cap must be refused WITHOUT `readFileSync` ever being
 * called on it. The size is injected through the `statSync` double below (a
 * real 500 MB fixture would make this suite allocate 500 MB to prove the point,
 * and a sparse file of that size is read in full by the buggy version).
 *
 * @module
 */

import type * as NodeFs from 'node:fs'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK + execa. */
const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

/**
 * What the doubles saw: every path `readFileSync` was called with, and the
 * stat size to report for a path that does not exist on disk.
 */
const probe = vi.hoisted(() => ({
  reads: [] as string[],
  statSizes: new Map<string, number>(),
}))

// A pass-through wrapper, so the numbers the caps are compared against can be
// injected without materialising the files. Everything else about `node:fs` is
// the real module, for this test file's whole module graph.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>()
  return {
    ...actual,
    statSync: ((path: unknown, options?: unknown) => {
      const injected = probe.statSizes.get(String(path))
      if (injected !== undefined) return { size: injected }
      return (actual.statSync as (p: unknown, o?: unknown) => unknown)(path, options)
    }) as typeof actual.statSync,
    readFileSync: ((path: unknown, ...rest: unknown[]) => {
      probe.reads.push(String(path))
      return (actual.readFileSync as (p: unknown, ...r: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFileSync,
  }
})

vi.mock('../../../mcp/src/services.js', () => ({
  ServiceCallError: class ServiceCallError extends Error {},
  callHostedService: async () => {
    throw new Error('the hosted service must not be reached by a refused input')
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

let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let listTools: () => Promise<{ tools: Array<{ name: string; inputSchema?: unknown }> }>
let closeClient: () => Promise<void>

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  process.env.DO_NOT_TRACK = '1'

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'input-cap-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  listTools = () => client.listTools() as ReturnType<typeof listTools>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  delete process.env.DO_NOT_TRACK
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-input-cap] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/** A path that is over every cap, existing nowhere on disk. */
const oversized = (name: string, bytes: number): string => {
  const path = join(tmpdir(), `mlcl-mcp-input-cap-${name}`)
  probe.statSizes.set(path, bytes)
  return path
}

describe('an input over the advertised cap is refused from its size', () => {
  it('merge_pdfs refuses a file over 8 MB without reading it', async (ctx) => {
    if (skipped(ctx)) return
    const huge = oversized('big.pdf', 500 * 1024 * 1024)

    const result = await callTool('merge_pdfs', {
      input_files: [huge],
      output_file: join(tmpdir(), 'mlcl-mcp-input-cap-merged.pdf'),
    })

    expect(result.isError, 'an over-size input is refused').toBe(true)
    expect(textOf(result)).toContain('the limit is 8 MB per file')
    expect(probe.reads, 'the refusal must not need the file’s bytes').not.toContain(huge)
  })

  it('merge_pdfs refuses an over-total SET without reading the file that tips it', async (ctx) => {
    if (skipped(ctx)) return
    // Four 7 MB PDFs: each is under the per-file cap, so only the TOTAL cap can
    // refuse this, and the fourth file is what tips it — it must never be read.
    // These are real files (a size-injected path would be read next and fail on
    // ENOENT before the total cap could be reached).
    const dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-input-cap-total-'))
    const files = ['a', 'b', 'c', 'd'].map((name) => {
      const path = join(dir, `${name}.pdf`)
      writeFileSync(path, Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(7 * 1024 * 1024 - 5)]))
      return path
    })
    try {
      const result = await callTool('merge_pdfs', {
        input_files: files,
        output_file: join(tmpdir(), 'mlcl-mcp-input-cap-merged-total.pdf'),
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('the limit is 24 MB')
      expect(probe.reads, 'the file that tips the total is refused unread').not.toContain(files[3])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('transform_image refuses an image over 8 MB without reading it', async (ctx) => {
    if (skipped(ctx)) return
    const huge = oversized('big.png', 300 * 1024 * 1024)

    const result = await callTool('transform_image', {
      input_file: huge,
      output_file: join(tmpdir(), 'mlcl-mcp-input-cap-transformed.png'),
      ops: [{ op: 'resize', width: 10 }],
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('the limit is 8 MB')
    expect(probe.reads, 'the refusal must not need the file’s bytes').not.toContain(huge)
  })

  it('watermark_pdf refuses a PDF over 8 MB without reading it', async (ctx) => {
    if (skipped(ctx)) return
    const huge = oversized('big-watermark.pdf', 300 * 1024 * 1024)

    const result = await callTool('watermark_pdf', {
      input_file: huge,
      text: 'CONFIDENTIAL',
      output_file: join(tmpdir(), 'mlcl-mcp-input-cap-watermarked.pdf'),
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('the limit is 8 MB')
    expect(probe.reads, 'the refusal must not need the file’s bytes').not.toContain(huge)
  })

  it('translate refuses an over-budget input without reaching the metered call', async (ctx) => {
    if (skipped(ctx)) return
    // `translate` advertises "Up to 200 texts / 50,000 characters per call" —
    // and the input IS the metered work (billed per character) and the body of
    // the outbound request, so an unenforced cap is unbounded billing and an
    // unbounded buffer. 60 × 1,000 characters is under the count cap, so only
    // the TOTAL can refuse it; the mock's `callHostedService` throws, so a
    // handler that reached it reports that instead of the cap.
    const result = await callTool('translate', {
      text: Array.from({ length: 60 }, () => 'x'.repeat(1000)),
      target_lang: 'de',
    })

    expect(result.isError, 'an over-budget input is refused').toBe(true)
    expect(textOf(result)).toContain('translate accepts up to 50000 characters')
    // …and the same bound holds for the one-string shape of the same input.
    const single = await callTool('translate', { text: 'x'.repeat(60_000), target_lang: 'de' })
    expect(single.isError).toBe(true)
    expect(textOf(single)).toContain('translate accepts up to 50000 characters')
  })

  it('translate does NOT refuse an input exactly at the advertised budget', async (ctx) => {
    if (skipped(ctx)) return
    // The bound must not be one character tighter than the description: at
    // exactly 50,000 characters the call belongs to the service, so what comes
    // back is the mocked service's own error, never the budget refusal.
    const result = await callTool('translate', { text: 'x'.repeat(50_000), target_lang: 'de' })

    expect(textOf(result)).not.toContain('translate accepts up to 50000 characters')
  })

  it('a missing file is still reported as unreadable, not as over-size', async (ctx) => {
    if (skipped(ctx)) return
    // No injected size: the stat itself fails, and the caller must get the
    // readable "Cannot read" refusal every one of these tools has always given.
    const missing = join(tmpdir(), 'mlcl-mcp-input-cap-does-not-exist.pdf')

    const result = await callTool('merge_pdfs', {
      input_files: [missing],
      output_file: join(tmpdir(), 'mlcl-mcp-input-cap-missing-out.pdf'),
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain(`Cannot read ${missing}`)
  })
})

describe('the argument bounds are declared on the wire', () => {
  it('bounds search_packages.query and import_transcripts.files', async (ctx) => {
    if (skipped(ctx)) return
    // Both are unbounded user input that turns into unbounded work: the query
    // is scored against every fleet package once per whitespace token, and
    // every files path is spread into a child process's argv. The bound is
    // asserted where a client sees it (the advertised JSON Schema), so removing
    // it is a visible regression rather than an untested intention.
    const tools = (await listTools()).tools
    const query = (
      tools.find((tool) => tool.name === 'search_packages')?.inputSchema as {
        properties?: { query?: { maxLength?: number } }
      }
    )?.properties?.query?.maxLength
    expect(query, 'search_packages.query must carry a length cap').toBe(200)

    const files = (
      tools.find((tool) => tool.name === 'import_transcripts')?.inputSchema as {
        properties?: { files?: { maxItems?: number } }
      }
    )?.properties?.files?.maxItems
    expect(files, 'import_transcripts.files must carry a count cap').toBe(200)
  })

  it('bounds translate.text at the advertised 200 texts', async (ctx) => {
    if (skipped(ctx)) return
    // The other half of the same class: `translate` advertises "Up to 200 texts
    // / 50,000 characters per call" while its schema accepted an unbounded list
    // — the one advertised cap in this file that nothing applied. The count
    // bound is asserted where a client sees it (the advertised JSON Schema);
    // the character total is refused in the handler (see the test above).
    const tools = (await listTools()).tools
    const schema = (
      tools.find((tool) => tool.name === 'translate')?.inputSchema as {
        properties?: { text?: unknown }
      }
    )?.properties?.text
    expect(schema, 'translate.text must carry a schema').toBeDefined()
    expect(
      numericBounds(schema, 'maxItems'),
      'translate.text must declare the advertised 200-text cap',
    ).toContain(200)
  })
})

/**
 * Every numeric value of a JSON-Schema keyword anywhere inside `schema`.
 *
 * The `text` schema is a UNION (a single string, or a list of them), so which
 * node carries the bound is the schema library's business — the assertion is
 * about the bound existing, not about where in the tree it lands. The same
 * reason the sibling test reads `maxLength`/`maxItems` directly: the client's
 * advertised contract is the thing that must not silently lose the cap.
 *
 * @param schema - A JSON-Schema fragment.
 * @param keyword - The schema keyword to collect (e.g. `maxItems`).
 * @returns The numeric values found for that keyword, in walk order.
 */
function numericBounds(schema: unknown, keyword: string): number[] {
  const found: number[] = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry)
      return
    }
    if (typeof node !== 'object' || node === null) return
    for (const [key, value] of Object.entries(node)) {
      if (key === keyword && typeof value === 'number') found.push(value)
      else walk(value)
    }
  }
  walk(schema)
  return found
}
