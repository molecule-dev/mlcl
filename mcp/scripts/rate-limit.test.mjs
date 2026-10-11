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

test('an over-budget request is rejected before the body parser parses it', async () => {
  // The budget exists to protect the work a request costs, and the 1 MB JSON
  // parse is that work. Mounted after the parser, the budget never guarded it:
  // every flooded request was parsed IN FULL and only then 429'd. A malformed
  // body is the black-box probe for the order — the parser answers it 400, the
  // budget answers it 429, so whichever status comes back names the winner.
  const env = { ...process.env, MCP_RATE_PER_MIN: '2' }
  delete env.FLY_MACHINE_ID
  delete env.FLY_APP_NAME
  const { child, base } = await startServer(env)
  try {
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // The transport answers 406 without both content types accepted.
          accept: 'application/json, text/event-stream',
        },
        body: INITIALIZE_BODY,
      })
      assert.equal(res.status, 200)
      await res.arrayBuffer() // drain so the socket is reusable
    }
    // The budget is spent. A malformed body must meet the BUDGET (429), not
    // the parser (400).
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"malformed',
    })
    assert.equal(
      res.status,
      429,
      'an over-budget request must be rejected by the budget before the body parser can answer it 400',
    )
    const payload = await res.json()
    assert.equal(payload.error?.code, -32000)
  } finally {
    await stopServer(child)
  }
})

test('an in-budget malformed body still reaches the parser (400, not 429)', async () => {
  // The other half of the ordering: for a request the budget ALLOWS, the parser
  // must still run — the limiter must not stand in for body parsing.
  const env = { ...process.env, MCP_RATE_PER_MIN: '5' }
  delete env.FLY_MACHINE_ID
  delete env.FLY_APP_NAME
  const { child, base } = await startServer(env)
  try {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"malformed',
    })
    assert.equal(res.status, 400, 'an in-budget malformed body must be answered by the parser')
  } finally {
    await stopServer(child)
  }
})

test('on Fly, the proxy-owned fly-client-ip is the rate key', async () => {
  // The other half of the keying the first test pins: on a Fly machine the
  // platform proxy OVERWRITES fly-client-ip, so the header is the honest
  // per-client key there (the socket would key every client on the proxy).
  // With FLY_MACHINE_ID set, seven rotated headers must each draw on their OWN
  // budget — under socket keying they would share one 5-request budget and the
  // 6th and 7th would 429. A deploy that trusts the header WITHOUT a proxy in
  // front is the off-Fly test's subject, not this one.
  const env = { ...process.env, MCP_RATE_PER_MIN: '5', FLY_MACHINE_ID: 'rate-limit-test-machine' }
  delete env.FLY_APP_NAME
  const { child, base } = await startServer(env)
  try {
    const statuses = []
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // The transport answers 406 without both content types accepted.
          accept: 'application/json, text/event-stream',
          'fly-client-ip': `10.98.${Math.floor(i / 250)}.${(i % 250) + 1}`,
        },
        body: INITIALIZE_BODY,
      })
      statuses.push(res.status)
      await res.arrayBuffer() // drain so the socket is reusable
    }
    assert.ok(
      statuses.every((s) => s === 200),
      `on Fly each distinct client address carries its own budget, got ${statuses.join(',')}`,
    )
  } finally {
    await stopServer(child)
  }
})

test('a bucket map at its cap evicts the least-recently-seen address', async () => {
  // The map of per-address buckets is capped so a flood of distinct addresses
  // cannot grow it without bound; at the cap the least-recently-seen bucket is
  // evicted. MCP_RATE_MAX_BUCKETS shrinks the cap to a size the suite can
  // reach: budget 2, cap 3 — exhaust address a1, let two more addresses in,
  // force a fourth (the eviction), then ask a1 again: its bucket was evicted,
  // so it draws a FRESH budget (200) instead of staying drained (429).
  const env = {
    ...process.env,
    MCP_RATE_PER_MIN: '2',
    MCP_RATE_MAX_BUCKETS: '3',
    FLY_MACHINE_ID: 'rate-limit-test-machine',
  }
  delete env.FLY_APP_NAME
  const { child, base } = await startServer(env)
  try {
    const ask = async (ip) => {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // The transport answers 406 without both content types accepted.
          accept: 'application/json, text/event-stream',
          'fly-client-ip': ip,
        },
        body: INITIALIZE_BODY,
      })
      await res.arrayBuffer() // drain so the socket is reusable
      return res.status
    }
    // a1 draws twice (budget spent), a2 and a3 fill the map to the cap.
    assert.equal(await ask('10.97.0.1'), 200)
    assert.equal(await ask('10.97.0.1'), 200)
    assert.equal(await ask('10.97.0.1'), 429)
    assert.equal(await ask('10.97.0.2'), 200)
    assert.equal(await ask('10.97.0.3'), 200)
    // A fourth address at the cap: evicts a1 (least recently seen), then passes.
    assert.equal(await ask('10.97.0.4'), 200, 'the cap must evict, not reject the new address')
    // a1 is back with a fresh budget — the observable eviction.
    assert.equal(
      await ask('10.97.0.1'),
      200,
      'an evicted address must draw a fresh budget, not stay drained',
    )
  } finally {
    await stopServer(child)
  }
})

test('the cap evicts by when an address was last SEEN, not by insertion order', async () => {
  // The eviction victim is "least recently seen" — the same victim whether the
  // implementation scans the buckets for the smallest `at` or keeps the map in
  // access order and takes its first key (mcp/src/http.ts does the latter, so a
  // request from each address costs one step instead of a pass over the map).
  // This pins the ORDER, which the map-order implementation relies on: reusing
  // an address must refresh it. Budget 2, cap 3 — exhaust a1/a2/a3, touch a1
  // again (which moves it to the end of the access order), then let a4 evict:
  // a2 is now the least recently seen, so a2 draws a FRESH budget while a3 —
  // seen after a2 — is still drained. An insertion-order (FIFO) eviction picks
  // a1 instead, and then a2 is still present and still drained.
  const env = {
    ...process.env,
    MCP_RATE_PER_MIN: '2',
    MCP_RATE_MAX_BUCKETS: '3',
    FLY_MACHINE_ID: 'rate-limit-test-machine',
  }
  delete env.FLY_APP_NAME
  const { child, base } = await startServer(env)
  try {
    const ask = async (ip) => {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'fly-client-ip': ip,
        },
        body: INITIALIZE_BODY,
      })
      await res.arrayBuffer() // drain so the socket is reusable
      return res.status
    }
    for (const ip of ['10.96.0.1', '10.96.0.2', '10.96.0.3']) {
      assert.equal(await ask(ip), 200, `${ip} must draw its first token`)
      assert.equal(await ask(ip), 200, `${ip} must draw its second token`)
      assert.equal(await ask(ip), 429, `${ip} must be drained after its budget`)
    }
    // a1 is seen last of the three, so it is no longer the eviction candidate.
    assert.equal(await ask('10.96.0.1'), 429, 'a1 is still drained')
    // a4 arrives at the cap: a2 was seen least recently, so a2 makes room.
    assert.equal(await ask('10.96.0.4'), 200)
    // …which both halves of the order prove: a1 SURVIVED a2 (a FIFO eviction
    // would have taken a1, the first-INSERTED bucket, and a1 would be fresh
    // here)…
    assert.equal(
      await ask('10.96.0.1'),
      429,
      'a1 was seen after a2, so the newest eviction must not have taken it',
    )
    // …and a2 was the address EVICTED (a FIFO/LRU-by-insertion eviction left it
    // in the map, still drained).
    assert.equal(
      await ask('10.96.0.2'),
      200,
      'a2 was seen least recently, so a4 evicted IT — a2 must draw a fresh budget',
    )
  } finally {
    await stopServer(child)
  }
})
