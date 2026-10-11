// @vitest-environment node
/**
 * A failing `mlcl` run and a MISSING `mlcl` are different failures, and the
 * server used to report both with the second one's message: it tested
 * `/ENOENT/` against the command's own stdout/stderr, and mlcl reports a missing
 * project file as `ENOENT: no such file or directory, open '…/package.json'`.
 * So a real, fixable failure came back to the agent as "The mlcl CLI was not
 * found on PATH. Install it with `npm install -g mlcl`" — an install hint for a
 * CLI that had just run.
 *
 * The distinction the fix keys on is execa's: a cannot-spawn failure resolves
 * with `failed: true`, NO exit code and its own `spawn <bin> ENOENT` in
 * `originalMessage` (verified against execa 10), while a CLI that ran always
 * carries an exit code and its real output.
 *
 * Both halves are driven through the REAL stdio server over a linked in-memory
 * transport, with `MOLECULE_MCP_CLI` pointed at a stand-in binary.
 *
 * @module
 */
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

let dir: string | null = null

afterAll(() => {
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.DO_NOT_TRACK
  if (dir) rmSync(dir, { recursive: true, force: true })
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-cli-failure] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/** A stand-in CLI that fails the way `mlcl` does on a missing project file. */
function fakeCli(): string {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-cli-'))
  const script = join(dir, 'fake-mlcl.mjs')
  writeFileSync(
    script,
    '#!/usr/bin/env node\n' +
      'process.stderr.write("ENOENT: no such file or directory, open \'/tmp/absent/package.json\'\\n")\n' +
      'process.exit(1)\n',
  )
  chmodSync(script, 0o755)
  return script
}

/**
 * Import the server with `MOLECULE_MCP_CLI` set to `cli` and connect a client.
 *
 * The CLI path is read once at module load, so each case needs a fresh module
 * registry — hence `vi.resetModules()` + the dynamic import.
 */
async function connect(cli: string): Promise<{
  call: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
  close: () => Promise<void>
}> {
  process.env.DO_NOT_TRACK = '1'
  process.env.MOLECULE_MCP_CLI = cli
  vi.resetModules()
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'cli-diagnosis-test', version: '0.0.0' })
  await client.connect(clientTransport)
  return {
    call: (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>,
    close: () => client.close(),
  }
}

describe('a failing mlcl run is reported as itself', () => {
  it('reports the CLI’s own ENOENT output, not an install hint for a CLI that ran', async (ctx) => {
    if (skipped(ctx)) return
    const { call, close } = await connect(fakeCli())
    try {
      const result = await call('search_packages', { query: 'payments' })

      expect(result.isError, 'a failed CLI run fails the tool call').toBe(true)
      const message = textOf(result)
      expect(message, 'the CLI’s own failure is surfaced').toContain(
        "ENOENT: no such file or directory, open '/tmp/absent/package.json'",
      )
      expect(
        message,
        'a CLI that RAN is never reported as a CLI that is not on PATH',
      ).not.toContain('was not found on PATH')
    } finally {
      await close()
    }
  })

  it('reports a genuinely missing CLI as the fixable setup step it is', async (ctx) => {
    if (skipped(ctx)) return
    const { call, close } = await connect(join(tmpdir(), 'mlcl-does-not-exist-9f3a'))
    try {
      const result = await call('search_packages', { query: 'payments' })

      expect(result.isError, 'a missing CLI fails the tool call').toBe(true)
      expect(textOf(result)).toContain('was not found on PATH')
    } finally {
      await close()
    }
  })
})
