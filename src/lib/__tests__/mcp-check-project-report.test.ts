// @vitest-environment node
/**
 * `check_project` promises that a FAILED check still yields the report: the CLI
 * exits non-zero and `runCli` surfaces its stdout/stderr text, which the tool
 * turns back into the client's answer.
 *
 * That promise broke whenever the text is not JSON — a CLI crash, a usage
 * error, a project with no `check` script. `parseJsonOut` slices from the first
 * `{`/`[`, so with neither present it `JSON.parse`d the LAST character of the
 * message and threw a bare `SyntaxError` out of the handler: the client got
 * "Unexpected token" instead of the failing step, and the `parsed ? … : out`
 * fallback the code documents could never run.
 *
 * These tests drive the REAL stdio server through the REAL protocol layer (a
 * linked in-memory transport) with a stand-in `mlcl` on `$MOLECULE_MCP_CLI` that
 * exits 1 with a plain-text line, so the answer the client receives is the one
 * under test.
 *
 * @module
 */
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK + execa. */
const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

/** Every text block of a tool's answer, joined — the client-visible message. */
const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

const PLAIN_FAILURE = 'mlcl check could not start: no scripts in package.json'

let dir: string
let callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
let closeClient: () => Promise<void>

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-check-project-'))
  // A stand-in CLI: exits non-zero with a plain-text line (no JSON at all), the
  // shape a crashed or mis-invoked `mlcl check` produces. `CLI` is read at
  // module load, so the override must be set before the import below.
  const fakeCli = join(dir, 'fake-mlcl.mjs')
  writeFileSync(
    fakeCli,
    `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(PLAIN_FAILURE)} + '\\n')\nprocess.exit(1)\n`,
  )
  chmodSync(fakeCli, 0o755)
  process.env.MOLECULE_MCP_CLI = fakeCli
  process.env.DO_NOT_TRACK = '1'

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'check-project-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.DO_NOT_TRACK
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe('check_project — a non-JSON failure is the report, not a parse crash', () => {
  it('hands the CLI’s plain-text failure to the client instead of a SyntaxError', async (ctx) => {
    if (!existsSync(DEPS_MARKER)) {
      // Same one environment the sibling mcp suites skip in: an mlcl-only
      // checkout without mcp's own node_modules cannot start the server.
      console.warn(
        `[mcp-check-project] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
          'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
      )
      ctx.skip()
      return
    }

    const result = await callTool('check_project', { directory: dir })

    // The failure text reaches the client…
    expect(textOf(result)).toContain(PLAIN_FAILURE)
    // …and never as a JSON parse error (the pre-fix shape: the handler threw
    // out of `parseJsonOut` and the SDK reported the SyntaxError instead).
    expect(textOf(result)).not.toMatch(/Unexpected token|not valid JSON|SyntaxError/)
    expect(result.isError).toBeFalsy()
  })
})
