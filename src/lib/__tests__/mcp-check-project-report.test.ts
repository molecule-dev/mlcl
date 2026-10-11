// @vitest-environment node
/**
 * `check_project` promises that the check's report reaches the client whatever
 * the CLI answered: `mlcl check --json` prints the report on STDOUT (and exits
 * 0 even when a step failed), while a CLI that cannot get that far — a usage
 * error, a crash, a project with no `check` script — exits non-zero and `runCli`
 * surfaces that text instead. Either way the text IS the answer.
 *
 * That promise broke twice over. With no `{`/`[` in the text at all,
 * `parseJsonOut` sliced the LAST character and `JSON.parse`d it, so the handler
 * threw a bare `SyntaxError` and the `parsed ? … : out` fallback the code
 * documents could never run. And with JSON that is NOT the report — a wrapper's
 * notice line (`{"notice":"index refreshed"}`, the shape the sibling env tools'
 * own suite pins as realistic), a shim's error envelope — the parse SUCCEEDED,
 * `parsed.results` was `undefined`, and the client received literally
 * `FAILED\nundefined`: no step, no error, and no trace of what the CLI said.
 *
 * These tests drive the REAL stdio server through the REAL protocol layer (a
 * linked in-memory transport) with a stand-in `mlcl` on `$MOLECULE_MCP_CLI`, so
 * what the client receives is the one thing under test.
 *
 * @module
 */
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

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

/** Every stand-in CLI root this file created — one per {@link connect} call. */
const dirs: string[] = []

afterAll(() => {
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.DO_NOT_TRACK
  for (const created of dirs.splice(0)) rmSync(created, { recursive: true, force: true })
})

afterEach(() => {
  vi.resetModules()
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-check-project] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/**
 * A stand-in CLI whose stdout is `stdout`, exiting with `exitCode`.
 *
 * `MOLECULE_MCP_CLI` is read at module load, so each case gets its own server
 * instance ({@link connect} re-imports the module after setting the override).
 *
 * @param stdout - What the stand-in writes to stdout.
 * @param exitCode - The exit code it finishes with.
 * @returns The stand-in script's path.
 */
function fakeCli(stdout: string, exitCode: number): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-check-project-'))
  dirs.push(dir)
  const script = join(dir, 'fake-mlcl.mjs')
  writeFileSync(
    script,
    '#!/usr/bin/env node\n' +
      `process.stdout.write(${JSON.stringify(stdout)})\n` +
      `process.exit(${exitCode})\n`,
  )
  chmodSync(script, 0o755)
  return script
}

/** Start the real stdio server behind a stand-in CLI and return a `callTool`. */
async function connect(
  cli: string,
): Promise<{ callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult> }> {
  process.env.DO_NOT_TRACK = '1'
  process.env.MOLECULE_MCP_CLI = cli
  vi.resetModules()

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'check-project-test', version: '0.0.0' })
  await client.connect(clientTransport)
  return {
    callTool: (name, args = {}) =>
      client.callTool({ name, arguments: args }) as Promise<ToolResult>,
  }
}

/** A `mlcl check --json` report, as the CLI prints it (stdout, exit 0). */
const report = (ok: boolean, results: unknown[]): string =>
  `${JSON.stringify({ ok, results }, null, 2)}\n`

describe('check_project — the CLI’s answer is the report, whatever shape it takes', () => {
  it('hands the CLI’s plain-text failure to the client instead of a SyntaxError', async (ctx) => {
    if (skipped(ctx)) return
    const { callTool } = await connect(fakeCli(`${PLAIN_FAILURE}\n`, 1))

    const result = await callTool('check_project', { directory: tmpdir() })

    // The failure text reaches the client…
    expect(textOf(result)).toContain(PLAIN_FAILURE)
    // …and never as a JSON parse error (the pre-fix shape: the handler threw
    // out of `parseJsonOut` and the SDK reported the SyntaxError instead).
    expect(textOf(result)).not.toMatch(/Unexpected token|not valid JSON|SyntaxError/)
    expect(result.isError).toBeFalsy()
  })

  it('a JSON answer that is NOT the report is the CLI’s text, never "FAILED undefined"', async (ctx) => {
    if (skipped(ctx)) return
    // A valid JSON document with no `ok`/`results` pair — a wrapper's notice
    // line, a shim's error envelope. `parseJsonOut` is an `as T` CAST, so it
    // came back as the report and the client read `FAILED\nundefined`: the
    // reason the run failed was dropped in favour of the word "undefined".
    const notice = '{"notice":"index refreshed before checking"}'
    const { callTool } = await connect(fakeCli(`${notice}\n`, 1))

    const result = await callTool('check_project', { directory: tmpdir() })

    expect(textOf(result), 'the CLI’s own words must survive').toContain('index refreshed')
    expect(
      textOf(result),
      'an answer that is not the report must not be rendered as one',
    ).not.toContain('undefined')
  })

  it('reports a FAILED check from the --json answer, which the CLI prints on stdout and exits 0 for', async (ctx) => {
    if (skipped(ctx)) return
    // The real shape of a failed step: the report is on stdout and the CLI
    // exits 0, so no throw ever carries it — reading it out of the output is
    // what keeps a failed check visible to the client.
    const results = [
      { kind: 'typecheck', status: 'failed', errors: ['TS2307: cannot find module'] },
    ]
    const { callTool } = await connect(fakeCli(report(false, results), 0))

    const text = textOf(await callTool('check_project', { directory: tmpdir() }))

    expect(text, 'a failed check must be reported as FAILED').toContain('FAILED')
    expect(text, 'the failing step must ride the report').toContain('typecheck')
  })

  it('reports a PASSED check (the positive twin)', async (ctx) => {
    if (skipped(ctx)) return
    const { callTool } = await connect(
      fakeCli(report(true, [{ kind: 'build', status: 'passed' }]), 0),
    )

    const text = textOf(await callTool('check_project', { directory: tmpdir() }))

    expect(text).toContain('PASSED')
    expect(text).toContain('build')
  })
})
