/**
 * The remote MCP server's cache RESET must cover the work that is in flight
 * when it runs, not only the maps it clears.
 *
 * `clearRemoteCaches` exists because the two caches are process-global: a suite
 * that points the server at a rewritten registry file has to say "forget what
 * you read before" out loud, or it depends on the order its tests happen to run
 * in. A fetch parked at that moment defeated the reset twice over — the
 * post-reset caller was handed the PRE-reset promise (`inFlight` was cleared,
 * but the key matched again immediately, so the next caller re-found the old
 * entry only in the version below), and the orphan settling a moment later wrote
 * the bytes it had read BEFORE the reset into the map the reset had just
 * emptied. Both leave the caller after a reset reading the world as the caller
 * BEFORE it saw it, which is exactly what the reset promises not to do.
 *
 * Driven against a real local HTTP server that delivers its answer only when the
 * test says so, so "in flight when the reset runs" is a fact rather than a race.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { type AddressInfo, createServer, type Server, type ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
/**
 * mcp is not an npm workspace member, so `npm ci` in mlcl never installs its
 * deps, and the module under test imports the SDK at its top — the same
 * loud-skip contract the sibling mcp suites keep.
 */
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

/** Skip this suite, out loud, in the one environment it cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    '[mcp-remote-cache-reset-inflight] mcp/node_modules is not installed — SKIPPING. ' +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

let server: Server | null = null

afterEach(async () => {
  vi.unstubAllGlobals()
  if (server) {
    server.closeAllConnections()
    await new Promise((resolve) => server!.close(resolve))
    server = null
  }
})

/** A promise plus the function that settles it. */
function deferred(): { promise: Promise<void>; settle: () => void } {
  let settle: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

/** Yield until `check` holds, or the budget runs out — never hangs on a bug. */
async function until(check: () => boolean, budgetMs = 2_000): Promise<void> {
  const deadline = Date.now() + budgetMs
  while (!check() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

describe('mcp remote cache reset — work in flight is part of the state', () => {
  it('a post-reset caller starts its own fetch, and the orphan never republishes', async (ctx) => {
    if (skipped(ctx)) return
    const { clearRemoteCaches, fetchJson } = await import('../../../mcp/src/remote.js')

    // Every answer is held on its OWN gate — the pre-reset fetch is provably
    // still in flight across the reset, with no reliance on timing, and the two
    // answers are ordered by the test rather than by the network.
    const gates: Array<{ promise: Promise<void>; settle: () => void }> = []
    const bodies: string[] = []
    server = createServer((_req, res: ServerResponse) => {
      const body = `{"packages":{"hit-${bodies.length + 1}":{}}}`
      bodies.push(body)
      const gate = deferred()
      gates.push(gate)
      void gate.promise.then(() => {
        res.setHeader('content-type', 'application/json')
        res.end(body)
      })
    })
    await new Promise((resolve) => server!.listen(0, '127.0.0.1', resolve))
    const url = `http://127.0.0.1:${(server!.address() as AddressInfo).port}/registry.json`

    // Start the fetch that the reset has to account for, and wait until the
    // server has actually received it.
    const first = fetchJson<{ packages: Record<string, unknown> }>(url, undefined, 5_000)
    await until(() => bodies.length === 1)
    expect(bodies.length, 'the pre-reset request must have reached the server').toBe(1)

    clearRemoteCaches()

    // The caller AFTER the reset must not be handed the pre-reset request: it
    // issues its own, which is the assertion below (one request, not two, means
    // it was served from work that began before the reset).
    const second = fetchJson<{ packages: Record<string, unknown> }>(url, undefined, 5_000)
    await until(() => bodies.length === 2, 250)
    expect(
      bodies.length,
      'a post-reset call must dial the network again, not share the pre-reset promise',
    ).toBe(2)

    // The POST-reset answer lands first, so the cache holds it…
    gates[1]!.settle()
    expect(Object.keys((await second).packages)).toEqual(['hit-2'])
    // …and THEN the orphan settles, carrying the bytes it read before the reset.
    gates[0]!.settle()
    expect(Object.keys((await first).packages)).toEqual(['hit-1'])

    // The orphan's late settle must not undo the reset: the cache still holds
    // what the post-reset call read, so a third call is served from it unchanged.
    const third = await fetchJson<{ packages: Record<string, unknown> }>(url, undefined, 5_000)
    expect(Object.keys(third.packages), 'the cache must hold the post-reset payload').toEqual([
      'hit-2',
    ])
    expect(bodies.length, 'the third call must be served from the cache').toBe(2)
  })

  it('a package-doc lookup in flight across the reset is not republished either', async (ctx) => {
    if (skipped(ctx)) return
    const { clearRemoteCaches, fetchPackageReadme } = await import('../../../mcp/src/remote.js')

    /** One entry per request: settle it to hand that request its answer. */
    const releases: Array<() => void> = []
    const stub = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          const hit = releases.length + 1
          releases.push(() =>
            resolve(
              new Response(JSON.stringify({ readme: `readme-${hit}` }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              }),
            ),
          )
        }),
    )
    vi.stubGlobal('fetch', stub)
    const name = `reset-inflight-probe-${process.pid}`

    const first = fetchPackageReadme(name, 5_000)
    await until(() => releases.length === 1)
    clearRemoteCaches()
    const second = fetchPackageReadme(name, 5_000)
    await until(() => releases.length === 2, 250)
    expect(
      releases.length,
      'the post-reset lookup must issue its own request, not await the pre-reset one',
    ).toBe(2)

    for (const release of releases) release()
    expect(await first).toBe('readme-1')
    expect(await second).toBe('readme-2')

    // The orphan (which read `readme-1` before the reset) must not have written
    // the cache the post-reset call filled.
    expect(await fetchPackageReadme(name, 5_000), 'the cache must hold the post-reset doc').toBe(
      'readme-2',
    )
    expect(stub, 'the third lookup must come from the cache').toHaveBeenCalledTimes(2)
  })
})
