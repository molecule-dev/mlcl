// @vitest-environment node
/**
 * The remote MCP server's two registry-backed tools must RECOGNIZE the document
 * they fetched, not merely receive one.
 *
 * `fetchJson` refused a non-2xx answer, but a 2xx (or a readable override file)
 * proves only that bytes arrived: `{"version":1}`, a proxy's 200 error page, a
 * shrunken rewrite of the registry — each deserializes as happily as the real
 * document, was handed out as the caller's declared type, and was CACHED for 10
 * minutes. `search_packages` then died on `Object.entries(undefined)` — the
 * client's answer was the raw `TypeError` text "Cannot convert undefined or
 * null to object", naming neither the tool's input nor the upstream, and every
 * call for the next 10 minutes was served the same non-payload. Its sibling
 * `list_templates` swallowed the same shape into an EMPTY gallery (`t.templates
 * ?? {}`) — a wrong answer indistinguishable from "there are no templates".
 *
 * Both now pass a shape check to {@link fetchJson}, which reports the
 * unrecognized payload the way it reports a non-2xx one and caches NOTHING, so
 * the next call retries. These tests drive the REAL registered tools through
 * the REAL protocol layer (a linked in-memory transport) against the file
 * overrides, so the failure and the recovery are both observed from a client.
 *
 * @module
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
/**
 * mcp is not an npm workspace member, so `npm ci` in mlcl (which is how CI
 * builds this repo) never installs its deps. Without this marker the suite's
 * in-memory client cannot be imported and every test below ERRORS — a red suite
 * in a checkout where the sibling mcp suites correctly SKIP. Absent marker =
 * skip out loud.
 */
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

/** Skip this suite, out loud, in the one environment it cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-remote-registry-shape] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
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
let registryFile: string
let templatesFile: string
let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let closeClient: () => Promise<void>
/** The module's cache reset — see the `beforeEach` below for why the suite needs it. */
let clearCaches: (() => void) | null = null

/**
 * Where the fetched documents are cached, and why every test starts without one.
 *
 * `fetchJson` caches a SUCCESSFUL payload for ten minutes — that is the whole
 * point of it on the hosted server — so the state it holds survives into the
 * NEXT test in this file, which points the same override at a rewritten file
 * and then asserts the new bytes are read. Only a cold cache makes that
 * assertion true, and a suite that relied on its own declaration order to get
 * one passed under `vitest run` while failing under `--sequence.shuffle` (a
 * cached VALID registry answered for three tests that had each just written an
 * unrecognized one). The reset is therefore explicit, and the test below pins
 * that it actually drops a cached payload.
 */
beforeEach(() => {
  clearCaches?.()
})

/** Every text block of a tool's answer, joined — the client-visible message. */
const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

/** A registry document that satisfies the shape both readers require. */
const registryWith = (label: string): string =>
  JSON.stringify({
    version: 1,
    packages: {
      '@molecule/api-probe-payments': {
        type: 'bond',
        category: 'payments',
        stack: 'api',
        label,
        description: 'payments probe',
      },
    },
  })

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-registry-shape-'))
  registryFile = join(dir, 'registry.json')
  templatesFile = join(dir, 'templates.json')
  // Read at MODULE LOAD, so both overrides are set before the import below.
  process.env.MOLECULE_REGISTRY_FILE = registryFile
  process.env.MOLECULE_TEMPLATES_FILE = templatesFile

  const { buildRemoteServer, clearRemoteCaches } = await import('../../../mcp/src/remote.js')
  clearCaches = clearRemoteCaches
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await buildRemoteServer().connect(serverTransport)
  const client = new Client({ name: 'registry-shape-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  delete process.env.MOLECULE_REGISTRY_FILE
  delete process.env.MOLECULE_TEMPLATES_FILE
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe('remote registry-backed tools — an unrecognized payload is reported, not crashed on', () => {
  it('search_packages names the unreadable registry instead of throwing a raw TypeError', async (ctx) => {
    if (skipped(ctx)) return
    writeFileSync(registryFile, JSON.stringify({ version: 1 }))

    const result = await callTool('search_packages', { query: 'payments' })

    expect(result.isError, 'a non-registry payload must fail the call').toBe(true)
    const message = textOf(result)
    expect(message).toContain('did not return the expected payload')
    // The source is named, so the failure is actionable (the override file the
    // operator set, or the URL the server fetched).
    expect(message).toContain(registryFile)
    // …and the client is never handed the internal dereference failure.
    expect(message).not.toContain('Cannot convert undefined or null to object')
  })

  it('caches nothing for that payload, so the next call retries and recovers', async (ctx) => {
    if (skipped(ctx)) return
    // The first call sees the non-registry document (the state a poisoned cache
    // used to make permanent for 10 minutes)…
    writeFileSync(registryFile, JSON.stringify({ version: 1 }))
    const failed = await callTool('search_packages', { query: 'payments' })
    expect(failed.isError).toBe(true)

    // …the operator fixes the source, and the VERY NEXT call must read it again
    // rather than being served the cached non-payload.
    writeFileSync(registryFile, registryWith('Payments (fixed)'))
    const recovered = await callTool('search_packages', { query: 'payments' })
    expect(recovered.isError).toBeFalsy()
    expect(textOf(recovered)).toContain('@molecule/api-probe-payments')
  })

  it('list_templates reports an index with no templates instead of an empty gallery', async (ctx) => {
    if (skipped(ctx)) return
    // `t.templates ?? {}` answered this payload with `[]` — "there are no
    // templates", a wrong answer that also outlived the response by 10 minutes.
    writeFileSync(templatesFile, JSON.stringify({ version: 1 }))

    const result = await callTool('list_templates')

    expect(result.isError, 'an unrecognized templates index must fail the call').toBe(true)
    const message = textOf(result)
    expect(message).toContain('did not return the expected payload')
    // …and names the source the operator can fix, like its `search_packages`
    // twin above. (The old line here was `expect(textOf(result)).not.toBe('[]')`,
    // which the containment assertion above already implies — a string carrying
    // "did not return the expected payload" can never equal `[]`, so it could
    // never be the assertion that failed.)
    expect(message).toContain(templatesFile)
  })

  it('serves the real documents when the payloads are the documents they claim (positive twin)', async (ctx) => {
    if (skipped(ctx)) return
    writeFileSync(registryFile, registryWith('Payments'))
    writeFileSync(
      templatesFile,
      JSON.stringify({ templates: { blog: { label: 'Blog', packages: [] } } }),
    )

    const search = await callTool('search_packages', { query: 'payments' })
    expect(search.isError).toBeFalsy()
    expect(textOf(search)).toContain('"name": "@molecule/api-probe-payments"')

    const templates = await callTool('list_templates')
    expect(templates.isError).toBeFalsy()
    expect(textOf(templates)).toContain('"slug": "blog"')
  })

  it('refuses a query long enough to make the scoring pass scale with its tokens', async (ctx) => {
    if (skipped(ctx)) return
    writeFileSync(registryFile, registryWith('Payments'))

    // The scoring pass runs once over EVERY fleet package per whitespace token
    // in the query, so an unbounded query is unbounded work on this public,
    // single-threaded server — a per-address rate budget bounds requests, not
    // the work one allowed request may do. ~10 000 words is the shape of the
    // abuse; a capability query is a phrase.
    const longQuery = 'payments '.repeat(10_000)
    const refused = await callTool('search_packages', { query: longQuery })
      .then((result) => result.isError === true)
      // Some SDK versions answer an input-schema violation by rejecting the
      // call instead of returning `isError` — either is a refusal.
      .catch(() => true)
    expect(refused, 'an over-long query must be refused, not scored').toBe(true)

    // …and an ordinary query still works (the bound is not over-tight).
    const ok = await callTool('search_packages', { query: 'payments' })
    expect(ok.isError).toBeFalsy()
    expect(textOf(ok)).toContain('@molecule/api-probe-payments')
  })

  it('the cache reset drops a cached payload — what keeps the suite order-independent', async (ctx) => {
    if (skipped(ctx)) return
    writeFileSync(registryFile, registryWith('Cached'))

    const served = await callTool('search_packages', { query: 'payments' })
    expect(served.isError).toBeFalsy()
    expect(textOf(served)).toContain('@molecule/api-probe-payments')

    // Within the TTL the CACHED document is still what the tool reads, even
    // after the source is rewritten into one it must refuse. That is the
    // cache's contract on the hosted server — and the reason every other test
    // in this file (which rewrites the file and then asserts the new bytes)
    // means something only from a cold cache.
    writeFileSync(registryFile, JSON.stringify({ version: 1 }))
    expect(
      (await callTool('search_packages', { query: 'payments' })).isError,
      'a cached payload is served until it is dropped',
    ).toBeFalsy()

    // The reset is what makes the rewrite visible — exactly the state the
    // `beforeEach` above hands every other test in this file.
    clearCaches?.()
    const afterReset = await callTool('search_packages', { query: 'payments' })
    expect(afterReset.isError, 'a reset must drop the cached payload').toBe(true)
    expect(textOf(afterReset)).toContain('did not return the expected payload')
  })
})
