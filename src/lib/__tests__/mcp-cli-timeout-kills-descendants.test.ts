// @vitest-environment node
/**
 * A `mlcl` run that is killed at its timeout must take its DESCENDANTS with it.
 *
 * `runCli` bounds every CLI invocation with `timeout` (ten minutes in
 * production), and the CLI is a wrapper: `mlcl add` shells out to `npm install`,
 * the smoke step shells out to the test runner, `mlcl db` opens a connection.
 * execa's default kill signals the direct child only, so a CLI killed at the
 * timeout left its grandchild RUNNING — reparented to init, still mutating the
 * project's `node_modules` — while the tool had already answered "timed out" and
 * the client was free to retry and race a second install against it.
 *
 * `killDescendants: true` spawns the child as its own process-group leader and
 * signals the GROUP (execa 10), which is what this pins: the stand-in CLI spawns
 * a real grandchild and hangs, `MOLECULE_MCP_CLI_TIMEOUT_MS` shortens the bound
 * to under a second (the production bound is ten minutes away), and the
 * assertion is that the grandchild is GONE when the tool call settles.
 *
 * @module
 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

/** Every temp dir this suite made, so each one is removed. */
const dirs: string[] = []

/** A fresh temp dir, tracked for cleanup. */
function tempDir(prefix: string): string {
  const made = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(made)
  return made
}

afterAll(() => {
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.MOLECULE_MCP_CLI_TIMEOUT_MS
  delete process.env.DO_NOT_TRACK
  for (const made of dirs) rmSync(made, { recursive: true, force: true })
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-cli-timeout] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/**
 * A stand-in CLI that spawns a long-lived GRANDCHILD (recording its pid), then
 * hangs — the shape of `mlcl add` parked inside `npm install`.
 *
 * @returns The script path and the file the grandchild's pid lands in.
 */
function fakeCliWithGrandchild(): { cli: string; pidFile: string } {
  const dir = tempDir('mlcl-mcp-cli-timeout-')
  const pidFile = join(dir, 'grandchild.pid')
  const script = join(dir, 'fake-mlcl.mjs')
  writeFileSync(
    script,
    '#!/usr/bin/env node\n' +
      "import { spawn } from 'node:child_process'\n" +
      "import { writeFileSync } from 'node:fs'\n" +
      "const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {\n" +
      "  stdio: 'ignore',\n" +
      '})\n' +
      `writeFileSync(${JSON.stringify(pidFile)}, String(child.pid))\n` +
      'setInterval(() => {}, 1000)\n',
  )
  chmodSync(script, 0o755)
  return { cli: script, pidFile }
}

/** Whether a pid is still alive (`ESRCH` means it is gone). */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}

/**
 * Import the server with the stand-in CLI + a sub-second timeout and connect a
 * client. Both values are read once at module load, hence `vi.resetModules()`
 * and the dynamic import (the same shape the sibling CLI suites use).
 */
async function connect(cli: string): Promise<{
  call: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
  close: () => Promise<void>
}> {
  process.env.DO_NOT_TRACK = '1'
  process.env.MOLECULE_MCP_CLI = cli
  process.env.MOLECULE_MCP_CLI_TIMEOUT_MS = '800'
  vi.resetModules()
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'cli-timeout-test', version: '0.0.0' })
  await client.connect(clientTransport)
  return {
    call: (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>,
    close: () => client.close(),
  }
}

describe('a timed-out mlcl run kills the whole process tree', () => {
  it('leaves no grandchild running after the CLI is killed at its timeout', async (ctx) => {
    if (skipped(ctx)) return
    const { cli, pidFile } = fakeCliWithGrandchild()
    const { call, close } = await connect(cli)
    let grandchild: number | null = null
    try {
      const result = await call('search_packages', { query: 'payments' })

      expect(result.isError, 'a timed-out CLI fails the tool call').toBe(true)
      // The pid the CLI recorded: without it nothing here is provable, so a
      // missing file is a failure, not a skip.
      grandchild = Number(readFileSync(pidFile, 'utf8'))
      expect(Number.isInteger(grandchild) && grandchild > 0).toBe(true)

      // The signal is delivered asynchronously, so give the group a moment to
      // die rather than racing it — but only a moment.
      const deadline = Date.now() + 5_000
      while (alive(grandchild) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      expect(
        alive(grandchild),
        `the grandchild the CLI spawned (pid ${grandchild}) must not outlive the timeout — ` +
          'an orphaned descendant keeps mutating the project after the tool answered',
      ).toBe(false)
    } finally {
      await close()
      // Never leak the child this suite spawned if an assertion failed early.
      if (grandchild !== null && alive(grandchild)) process.kill(grandchild, 'SIGKILL')
    }
  })
})

/** The text the CLI's own failure carries, for the non-vacuousness check below. */
describe('the timeout seam does not replace the ordinary failure path', () => {
  it('still reports a failing CLI that EXITS, not as a timeout', async (ctx) => {
    if (skipped(ctx)) return
    const script = join(tempDir('mlcl-mcp-cli-exit-'), 'failing-mlcl.mjs')
    writeFileSync(
      script,
      '#!/usr/bin/env node\n' +
        'process.stderr.write("the CLI said no\\n")\n' +
        'process.exit(1)\n',
    )
    chmodSync(script, 0o755)
    const { call, close } = await connect(script)
    try {
      const result = await call('search_packages', { query: 'payments' })

      expect(result.isError).toBe(true)
      expect(textOf(result), 'the CLI’s own output is still surfaced').toContain('the CLI said no')
    } finally {
      await close()
    }
  })
})
