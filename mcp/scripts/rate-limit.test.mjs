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
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const SERVER_JS = join(import.meta.dirname, '..', 'dist', 'http.js')

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

/**
 * Start the server on an OS-assigned port and return its base URL and output.
 *
 * PORT=0 and the server's own `listening on :<port>` line are the whole point:
 * picking a free port here (`bind :0`, read it, `close`) and handing the number
 * to the child leaves that port UNHELD between our close() and the child's
 * listen() — any other process on the machine can take it in that window, and
 * the child then dies with EADDRINUSE (a spurious "server exited early").
 */
async function startServer(env) {
  const child = spawn(process.execPath, [SERVER_JS], {
    env: { ...env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const onData = (chunk) => {
    output += chunk.toString()
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  const port = await new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000
    const poll = setInterval(() => {
      const match = output.match(/listening on :(\d+)\/mcp/)
      if (match) {
        clearInterval(poll)
        resolve(Number(match[1]))
        return
      }
      if (child.exitCode !== null) {
        clearInterval(poll)
        reject(new Error(`server exited early (${child.exitCode})\n${output}`))
        return
      }
      if (Date.now() > deadline) {
        clearInterval(poll)
        reject(new Error(`server never reported its port\n${output}`))
      }
    }, 25)
    poll.unref()
  })
  const base = `http://127.0.0.1:${port}`
  try {
    await waitHealthy(base, child)
  } catch (error) {
    if (child.exitCode === null) child.kill('SIGTERM')
    throw error
  }
  return { child, base, getOutput: () => output }
}

async function stopServer(child) {
  if (child.exitCode === null) child.kill('SIGTERM')
  await new Promise((resolve) => {
    child.once('exit', resolve)
    setTimeout(resolve, 2000).unref()
  })
}

const INITIALIZE_BODY = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'rate-limit-test', version: '0.0.0' },
  },
})

test('off Fly, rotating fly-client-ip headers cannot mint fresh rate budgets', async () => {
  // Unset every Fly marker: this is the local-dev / non-Fly-host posture in
  // which the header is client-controlled and must be ignored.
  const env = { ...process.env, MCP_RATE_PER_MIN: '5' }
  delete env.FLY_MACHINE_ID
  delete env.FLY_APP_NAME
  delete env.MOLECULE_REGISTRY_FILE
  const { child, base } = await startServer(env)
  try {
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
        body: INITIALIZE_BODY,
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
    await stopServer(child)
  }
})

test('a malformed MCP_RATE_PER_MIN falls back to the default instead of being mis-read', async () => {
  // `parseInt` reads a typo'd Fly secret by PREFIX ("2x" → 2) and returns NaN
  // for anything it cannot start with — and a NaN budget is not a small budget:
  // `NaN < 1` is false, so the bucket never reports "out of budget" and the
  // public endpoint is left with NO limit at all, while /health stays green and
  // nothing is logged. A malformed value must use the default and say so.
  const { child, base, getOutput } = await startServer({
    ...process.env,
    MCP_RATE_PER_MIN: '2x',
  })
  try {
    const statuses = []
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: INITIALIZE_BODY,
      })
      statuses.push(res.status)
      await res.arrayBuffer() // drain so the socket is reusable
    }
    // "2x" used to become a budget of 2 — three requests then 429. The default
    // (120/min) is not reached by five requests.
    assert.ok(
      statuses.every((s) => s !== 429),
      `a malformed budget must fall back to the default, got ${statuses.join(',')}`,
    )

    const deadline = Date.now() + 2000
    while (!getOutput().includes('MCP_RATE_PER_MIN') && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50))
    }
    assert.match(getOutput(), /MCP_RATE_PER_MIN/, 'the invalid value must be reported at startup')
  } finally {
    await stopServer(child)
  }
})
