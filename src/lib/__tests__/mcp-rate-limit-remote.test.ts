/**
 * The remote MCP server's rate limit (mcp/src/http.ts) keys its budget on the
 * REAL client address when no Fly proxy is in front — off Fly, a client can
 * send any `fly-client-ip` header value it likes, so trusting the header lets
 * one caller mint a fresh full budget (and one bucket per value, unbounded)
 * per request.
 *
 * The regression suite for that is `mcp/scripts/rate-limit.test.mjs` — a
 * node:test file that spawns the COMPILED server and drives it over real HTTP,
 * the only honest way to exercise express's socket address. It was wired into
 * nothing: mlcl's vitest include is `src/**`, mcp/package.json has no test
 * script, and no CI step installs mcp or builds it — so the guard could never
 * fail, because it never ran. This wrapper runs the node:test file inside the
 * normal `npm test` path: a regression in the keying, the bucket cap or the
 * 429 shape fails here like any other unit test.
 *
 * mcp is its own package (not an npm workspace member), so an mlcl-only
 * checkout without mcp's node_modules cannot start the server it spawns — that
 * one environment skips, out loud, until mcp's deps are installed (wiring mcp
 * into CI's install is the CI workflow's file, not this test's).
 *
 * @module
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SERVER_JS = join(MCP_DIR, 'dist', 'http.js')
const TEST_FILE = join(MCP_DIR, 'scripts', 'rate-limit.test.mjs')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'express', 'package.json')

/** Run a child to completion, returning its exit code and captured output. */
function run(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{
  code: number | null
  output: string
}> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, output }))
  })
}

describe('molecule-mcp remote rate limit', () => {
  it('passes its rate-limit regression suite — rotated fly-client-ip headers cannot mint budgets', async (ctx) => {
    if (!existsSync(DEPS_MARKER)) {
      // The one environment this suite cannot run in: mcp's own dependencies
      // (express, the MCP SDK) are absent, so the server the node:test file
      // spawns would exit before binding. Mark the test SKIPPED (not passed) and
      // say why out loud: a `return` here reported a PASS for a guard that never
      // ran, which is the failure mode this wrapper exists to close.
      console.warn(
        `[mcp-rate-limit] ${MCP_DIR}/node_modules is not installed — SKIPPING the rate-limit ` +
          `regression suite. Install mcp's deps (cd mcp && npm install) so the suite runs.`,
      )
      ctx.skip()
      return
    }

    // The node:test file spawns dist/http.js. dist is not committed, so a
    // fresh-but-installed mcp checkout builds it here — a plain local tsc
    // build, no network, the same command `npm run build` runs.
    if (!existsSync(SERVER_JS)) {
      const build = await run('npm', ['run', 'build'], MCP_DIR)
      expect(build.code, `mcp build failed:\n${build.output}`).toBe(0)
    }

    const result = await run(process.execPath, ['--test', TEST_FILE], MCP_DIR)
    expect(
      result.code,
      `mcp/scripts/rate-limit.test.mjs failed:\n${result.output.slice(-4000)}`,
    ).toBe(0)
    // The suite must actually have run — a file that matches no tests (a
    // renamed/deleted path) exits 0 with zero tests executed.
    expect(result.output).toMatch(/tests\s+\d+/)
    expect(result.output).not.toMatch(/fail\s+[1-9]/)
  })
})
