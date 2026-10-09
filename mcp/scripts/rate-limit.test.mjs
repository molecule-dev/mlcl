#!/usr/bin/env node
/**
 * Rate-limit regression test for the HTTP (remote) server — run with
 * `node --test scripts/rate-limit.test.mjs` AFTER `npm run build` (it spawns
 * the compiled dist/http.js).
 *
 * The budget must key on the REAL client address when no Fly proxy is in
 * front: off Fly (no platform-injected FLY_MACHINE_ID/FLY_APP_NAME), a client
 * can send any `fly-client-ip` header value it likes, so trusting the header
 * lets one caller mint a fresh budget per request — and one bucket per value,
 * unbounded — exactly the failure this test pins. On a Fly machine the proxy
 * overwrites the header, so the trust flip is safe there (untestable here —
 * the assertion below is the OFF-Fly half).
 */
import { once } from 'node:events'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const SERVER_JS = join(import.meta.dirname, '..', 'dist', 'http.js')

/** Grab a free TCP port the way the server will too: bind :0, read, release. */
async function freePort() {
  const srv = createServer()
  srv.listen(0, '127.0.0.1')
  await once(srv, 'listening')
  const port = srv.address().port
  await new Promise((resolve) => srv.close(resolve))
  return port
}

async function waitHealthy(url, child) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode})`)
    try {
      const res = await fetch(`${url}/health`)
      if (res.ok) return
    } catch {
      // not up yet — retry
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('server never became healthy')
}

test('off Fly, rotating fly-client-ip headers cannot mint fresh rate budgets', async () => {
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  // Unset every Fly marker: this is the local-dev / non-Fly-host posture in
  // which the header is client-controlled and must be ignored.
  const env = { ...process.env, PORT: String(port), MCP_RATE_PER_MIN: '5' }
  delete env.FLY_MACHINE_ID
  delete env.FLY_APP_NAME
  delete env.MOLECULE_REGISTRY_FILE
  const child = spawn(process.execPath, [SERVER_JS], { env, stdio: 'ignore' })
  try {
    await waitHealthy(base, child)

    const initialize = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'rate-limit-test', version: '0.0.0' },
      },
    })
    const statuses = []
    for (let i = 0; i < 7; i++) {
      // A DIFFERENT spoofed address on every request: under the old
      // header-always-wins keying each one opened a fresh full budget, so the
      // run never saw a 429. Keyed on the socket, budget 5 runs out on #6.
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'fly-client-ip': `10.99.${Math.floor(i / 250)}.${(i % 250) + 1}`,
        },
        body: initialize,
      })
      statuses.push(res.status)
      await res.arrayBuffer() // drain so the socket is reusable
    }
    assert.equal(
      statuses.filter((s) => s === 429).length,
      2,
      `expected the 6th and 7th requests to be rate limited, got ${statuses.join(',')}`,
    )
    assert.ok(
      statuses.slice(0, 5).every((s) => s !== 429),
      `the first five requests must be within budget, got ${statuses.join(',')}`,
    )
  } finally {
    if (child.exitCode === null) child.kill('SIGTERM')
    await new Promise((resolve) => {
      child.once('exit', resolve)
      setTimeout(resolve, 2000).unref()
    })
  }
})
