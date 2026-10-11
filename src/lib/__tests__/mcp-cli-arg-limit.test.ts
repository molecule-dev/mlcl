// @vitest-environment node
/**
 * A tool argument too long for the operating system to pass to the CLI must be
 * reported as WHAT it is — an over-long argument — not as execa's raw
 * `spawn E2BIG`.
 *
 * Every tool that shells out hands its caller-supplied strings straight into the
 * child's argv, and several of them are unbounded on purpose: `db query`'s SQL
 * statement, `set_env_var`'s value, `scaffold_project`'s comma-separated package
 * list, `import_transcripts`' paths (that one caps its LIST for exactly this
 * reason). Linux refuses ONE argument at 32 pages — 131072 bytes — so a request
 * the schema accepts reaches execa, the child never starts, and execa resolves
 * `{ failed: true, originalMessage: 'spawn E2BIG' }` with no exit code and
 * empty stdout/stderr.
 *
 * `runCli` special-cased only the sibling spawn failure (ENOENT, "the CLI is not
 * installed") and otherwise fell through to `originalMessage`, so the caller was
 * handed the bare string `spawn E2BIG`: no command, no cause, no fix. This pins
 * the actionable answer, and that it is keyed on the SPAWN failure rather than
 * applied to every failure.
 *
 * The CLI is pointed at `process.execPath` — a binary that exists everywhere —
 * because execve resolves the program BEFORE it measures the argument list: a
 * nonexistent binary answers ENOENT and never reaches the E2BIG path the fix
 * lives on.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

/**
 * Linux's per-argument ceiling is 32 pages (131072 bytes) — the shortest single
 * argument that is REFUSED. Twice that, so the measurement is never near the
 * boundary on any platform.
 */
const OVER_LONG_ARG = 'x'.repeat(200_000)

/** The original `MOLECULE_MCP_CLI`, restored so the suite leaves no trace. */
const originalCli = process.env.MOLECULE_MCP_CLI

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
let closeClient: () => Promise<void>

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  process.env.DO_NOT_TRACK = '1'
  // A real binary whose argv can be refused — see the module note.
  process.env.MOLECULE_MCP_CLI = process.execPath

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'cli-arg-limit-test', version: '0.0.0' })
  await client.connect(clientTransport)
  callTool = (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  if (originalCli === undefined) delete process.env.MOLECULE_MCP_CLI
  else process.env.MOLECULE_MCP_CLI = originalCli
  delete process.env.DO_NOT_TRACK
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    '[mcp-cli-arg-limit] mcp/node_modules is not installed — SKIPPING. ' +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

describe('an argument the OS refuses as too long is reported actionably', () => {
  it('answers an E2BIG spawn with the command and the cause, never the bare `spawn E2BIG`', async (ctx) => {
    if (skipped(ctx)) return
    // `db_query.sql` is unbounded and rides the argv verbatim — the statement
    // below is what a client can send today (the schema caps nothing).
    const text = await callText(callTool, 'db_query', {
      project_id: 'p1',
      sql: `-- arg-limit-probe\n${OVER_LONG_ARG}`,
    })

    // The execa default this replaces: no command, no cause, no fix.
    expect(text, 'the raw execa message is the defect').not.toBe('spawn E2BIG')
    expect(text, 'the refusal names the failure the OS reported').toContain('E2BIG')
    expect(text, 'the caller is told which command could not start').toContain('mlcl db')
    expect(text, 'the message must say what to change, not only what failed').toMatch(/shorten/i)
    // The offending value is by definition enormous; only the command is named.
    expect(text, 'an over-long argument is never echoed back').not.toContain(OVER_LONG_ARG)
  })

  it('does not claim E2BIG for a call the OS could start', async (ctx) => {
    if (skipped(ctx)) return
    // The branch keys on the SPAWN failure, not on "the call failed": a short
    // statement is accepted by the OS and the child runs (here it is Node with a
    // script that does not exist, so the failure is the CLI's own — never the
    // argument-list refusal).
    const text = await callText(callTool, 'db_query', { project_id: 'p1', sql: 'select 1' })

    expect(text, 'a startable call must not read as an over-long argument').not.toMatch(
      /could not start/i,
    )
  })

  it('keeps a secret value out of the message when its own length is what refused it', async (ctx) => {
    if (skipped(ctx)) return
    // `set_env_var` passes the value as an argv word, so a too-long value is the
    // argument that fails — and the whole point of that tool's `label` is that
    // the value never reaches a message. The refusal names `mlcl env` only.
    const secret = `sk-live-${OVER_LONG_ARG}`
    const text = await callText(callTool, 'set_env_var', {
      key: 'STRIPE_SECRET_KEY',
      value: secret,
    })

    expect(text, 'the refusal is the argument-list one').toContain('E2BIG')
    expect(text, 'the value must not be echoed, however it failed').not.toContain('sk-live-')
    expect(text).not.toContain(OVER_LONG_ARG)
  })
})
