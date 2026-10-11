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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SERVER_JS = join(MCP_DIR, 'dist', 'http.js')
const TEST_FILE = join(MCP_DIR, 'scripts', 'rate-limit.test.mjs')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'express', 'package.json')

/**
 * Newest mtime across the TypeScript sources under `dir`, recursively.
 *
 * The spawned suite drives the COMPILED server, so a `dist/http.js` built
 * before the last `mcp/src` edit would make every assertion below pass against
 * behavior that no longer exists — the same lie a stale mock tells, just
 * slower. Dist is not committed, so a fresh checkout has no mtime to compare;
 * "missing" is handled by the caller.
 *
 * @param dir - Directory to scan.
 * @returns The newest source mtime in milliseconds, 0 when the dir is empty.
 */
function newestSourceMtime(dir: string): number {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) newest = Math.max(newest, newestSourceMtime(full))
    else if (entry.name.endsWith('.ts')) newest = Math.max(newest, statSync(full).mtimeMs)
  }
  return newest
}

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
  // The body may rebuild mcp from scratch (a missing or source-stale dist) and
  // then drive six server spawns through real HTTP — a cold CI-shaped checkout
  // can exceed the 30 s default, and the guard must fail as a REGRESSION, not
  // as a vitest timeout that reads like one.
  it(
    'passes its rate-limit regression suite — rotated fly-client-ip headers cannot mint budgets',
    { timeout: 120_000 },
    async (ctx) => {
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
      // build, no network, the same command `npm run build` runs. A dist that
      // EXISTS but predates any mcp/src source is rebuilt too: the assertions
      // below are only honest when the compiled server is the current source.
      const distStale =
        !existsSync(SERVER_JS) ||
        statSync(SERVER_JS).mtimeMs < newestSourceMtime(join(MCP_DIR, 'src'))
      if (distStale) {
        const build = await run('npm', ['run', 'build'], MCP_DIR)
        expect(build.code, `mcp build failed:\n${build.output}`).toBe(0)
      }

      const result = await run(process.execPath, ['--test', TEST_FILE], MCP_DIR)
      expect(
        result.code,
        `mcp/scripts/rate-limit.test.mjs failed:\n${result.output.slice(-4000)}`,
      ).toBe(0)
      // The suite must actually have RUN. A count of executed tests is not
      // evidence: node's reporter prints `# tests 1 / # pass 1` for an EMPTY file
      // (the file itself counts as the test), so `/tests \d+/` matched the very
      // "matches no tests" case its comment named. The suite's own test names are
      // the honest signal — a renamed, emptied or truncated file loses them.
      expect(result.output).toContain(
        'rotating fly-client-ip headers cannot mint fresh rate budgets',
      )
      expect(result.output).toContain('falls back to the default instead of being mis-read')
      expect(result.output).toContain('a budget too large for an integer falls back to the default')
      expect(result.output).toContain(
        'a malformed MCP_RATE_MAX_BUCKETS falls back to the default cap and says so',
      )
      expect(result.output).toContain('the proxy-owned fly-client-ip is the rate key')
      expect(result.output).toContain(
        'a bucket map at its cap evicts the least-recently-seen address',
      )
      expect(result.output).toContain(
        'the cap evicts by when an address was last SEEN, not by insertion order',
      )
      expect(result.output).toContain('a body sent to a path with no handler is never parsed')
      expect(result.output).not.toMatch(/fail\s+[1-9]/)
      // …and they must have RUN. The names above are printed for a test that is
      // SKIPPED just as loudly as for one that passes (`﹣ name … # SKIP` in the
      // spec reporter, `ok 1 - name # SKIP` in TAP), and a fully-skipped file
      // exits 0 with `fail 0` — so every assertion above held while the whole
      // regression suite was disarmed, the one outcome this wrapper documents
      // ("a guard that never ran must not report a PASS"). Two assertions close
      // it: nothing carried the skip marker, and the number of tests node
      // reported passing is the number of `test(` calls the file declares.
      expect(result.output).not.toContain('# SKIP')
      const declared = (readFileSync(TEST_FILE, 'utf8').match(/^test\(/gm) ?? []).length
      expect(declared, 'the rate-limit suite should declare its tests').toBeGreaterThan(5)
      expect(
        result.output,
        `only some of the ${declared} rate-limit tests ran:\n${result.output.slice(-4000)}`,
      ).toMatch(new RegExp(`\\bpass ${declared}\\b`))
    },
  )
})
