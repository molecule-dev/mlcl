// @vitest-environment node
/**
 * `generate_image` with `n > 1` must either write the whole set or nothing.
 *
 * Only the base `output_file` was pre-checked; the suffixed paths (`-2`, `-3`,
 * `-4`) were checked INSIDE the write loop, so a call whose second path already
 * existed wrote image 1, then threw — the tool reported a failure (its contract
 * is that it never overwrites anything) while having left a partial set on disk
 * under the name the caller was told was refused. The paths are now all resolved
 * and checked before the first byte is written.
 *
 * These tests drive the REAL stdio server through a linked in-memory transport
 * with the hosted service stubbed, so the filesystem is the assertion.
 *
 * @module
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK + execa. */
const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

/** The hosted service's stand-in: two 1-byte png images, one call counted. */
const hosted = vi.hoisted(() => ({ calls: 0 }))

vi.mock('../../../mcp/src/services.js', () => ({
  /** A real class: `serviceResult` matches it with `instanceof`. */
  ServiceCallError: class ServiceCallError extends Error {},
  callHostedService: async () => {
    hosted.calls += 1
    return {
      images: [
        { base64: Buffer.from('one').toString('base64') },
        { base64: Buffer.from('two').toString('base64') },
      ],
    }
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

let dir: string
let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let closeClient: () => Promise<void>

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-generate-image-'))
  process.env.DO_NOT_TRACK = '1'

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'generate-image-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  delete process.env.DO_NOT_TRACK
  if (dir) rmSync(dir, { recursive: true, force: true })
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-generate-image] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

describe('generate_image — an n > 1 set lands whole or not at all', () => {
  it('writes NOTHING when a later image path already exists', async (ctx) => {
    if (skipped(ctx)) return

    const target = join(dir, 'collide.png')
    // The SECOND output's path is taken; the base name is fresh.
    writeFileSync(join(dir, 'collide-2.png'), 'already here')

    const result = await callTool('generate_image', {
      prompt: 'a logo',
      output_file: target,
      n: 2,
    })

    expect(result.isError, 'a colliding name is refused').toBe(true)
    expect(textOf(result)).toContain('already exists')
    // The refusal is whole: the first image must not have been written under a
    // name the caller was told was not used.
    expect(existsSync(target), 'no partial set behind a failed call').toBe(false)
    expect(existsSync(join(dir, 'collide-1.png'))).toBe(false)
    expect(hosted.calls, 'the service was still asked for the images').toBe(1)
  })

  it('writes the whole set when every path is free (no over-tightening)', async (ctx) => {
    if (skipped(ctx)) return

    const target = join(dir, 'fresh.png')
    const result = await callTool('generate_image', {
      prompt: 'a logo',
      output_file: target,
      n: 2,
    })

    expect(result.isError).toBeFalsy()
    expect(existsSync(target)).toBe(true)
    expect(existsSync(join(dir, 'fresh-2.png'))).toBe(true)
  })
})
