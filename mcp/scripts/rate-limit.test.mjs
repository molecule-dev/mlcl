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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

/** The server under test. Overridable per call so the harness's own failure paths can be driven. */
const DEFAULT_SERVER_JS = join(import.meta.dirname, '..', 'dist', 'http.js')

/** How long {@link startServer} waits for the port line before giving up. */
const PORT_REPORT_DEADLINE_MS = 10_000

async function waitHealthy(url, child) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode})`)
    try {
      const res = await fetch(`${url}/health`)
      if (res.ok) return
    } catch (_error) {
      // Not up yet — retry. The failure itself is the expected signal here, so
      // it is bound and dropped rather than logged (AGENTS Rule 14).
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
 *
 * `serverJs` and `portDeadlineMs` are per-call so the decoy test at the bottom
 * can drive the deadline path in 400 ms instead of 10 s.
 *
 * @param env - The child's environment.
 * @param options - Per-call overrides for the script to run and the port deadline.
 */
async function startServer(
  env,
  { serverJs = DEFAULT_SERVER_JS, portDeadlineMs = PORT_REPORT_DEADLINE_MS } = {},
) {
  const child = spawn(process.execPath, [serverJs], {
    env: { ...env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const onData = (chunk) => {
    output += chunk.toString()
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  // EVERY failure path below has to end this process before it throws. The
  // caller destructures `{ child }` from the await, so a rejection here means
  // the child is never handed to anyone and no `finally { stopServer(child) }`
  // can reach it — while this parent still holds both `pipe` stdio handles, so
  // the node:test runner keeps its event loop alive and the suite HANGS on a
  // server that started but never printed its port (the 10 s deadline path) or
  // one that wedged before it exited. A leaked child is invisible in the test
  // output and only shows up as a CI job that never finishes.
  const kill = async (error) => {
    await stopServer(child)
    throw error
  }
  const port = await new Promise((resolve, reject) => {
    const deadline = Date.now() + portDeadlineMs
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
  }).catch(kill)
  const base = `http://127.0.0.1:${port}`
  try {
    await waitHealthy(base, child)
  } catch (error) {
    await kill(error)
  }
  return { child, base, getOutput: () => output }
}

/**
 * End one spawned server and WAIT for it to be gone.
 *
 * SIGTERM first, then SIGKILL if it has not exited within the grace period:
 * the earlier shape resolved the wait on a 2 s `setTimeout` regardless of
 * whether the process actually died, so a server that ignored or outlived
 * SIGTERM (a wedged listen, a stuck handle) survived the suite with its stdio
 * pipes still attached to this parent — one leaked node process per test, and
 * a runner that cannot exit while they hold the loop open. The kill is only
 * escalated for a process still alive, so a clean SIGTERM exit never pays for
 * it, and a process already gone makes both branches no-ops.
 *
 * @param child - The spawned server.
 */
async function stopServer(child) {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  const exited = await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true)
      return
    }
    const timer = setTimeout(() => resolve(false), 2000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve(true)
    })
  })
  if (exited) return
  child.kill('SIGKILL')
  await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    child.once('exit', resolve)
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

    // …and the line must name a budget the bucket can actually count. Both
    // assertions above hold for a NaN budget too: `NaN < 1` is false, so every
    // request is allowed (no 429), and the warning still prints because
    // `NaN !== NaN` — the silent "no limit at all" http.ts's note says cannot
    // happen. So read the value the fallback used, and prove it bounds a burst
    // larger than the default.
    const used = getOutput().match(/using (\d+)\/min/)
    assert.ok(used, `the fallback must be a countable number, got: ${getOutput().trim()}`)

    for (let i = 0; i < 300; i++) {
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: INITIALIZE_BODY,
      })
      statuses.push(res.status)
      await res.arrayBuffer() // drain so the socket is reusable
    }
    assert.ok(
      statuses.includes(429),
      `the fallback budget (${used[1]}/min) must bound a burst, got no 429 in ${statuses.length} requests`,
    )
  } finally {
    await stopServer(child)
  }
})

test('a budget too large for an integer falls back to the default instead of raising the limit', async () => {
  // All-digits is not the same as usable: 400 digits overflow `Number` to
  // Infinity, which is `> 0`, is NOT caught by the "was it accepted?" comparison
  // (Infinity === Infinity, so no startup line is printed), and makes the
  // bucket's `Math.min(RATE_PER_MIN, …)` a no-op — every request allowed, for
  // ever, with /health green and nothing in the logs. The startup line naming
  // the variable is the observable: it only appears when the value was refused.
  const { child, getOutput } = await startServer({
    ...process.env,
    MCP_RATE_PER_MIN: '1'.repeat(400),
  })
  try {
    const deadline = Date.now() + 2000
    while (!getOutput().includes('MCP_RATE_PER_MIN') && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50))
    }
    assert.match(
      getOutput(),
      /MCP_RATE_PER_MIN/,
      'an unusable budget must be reported at startup, not silently accepted as Infinity',
    )
    // The warning alone does not say what was used: `NaN !== NaN` makes it print
    // for a NaN fallback as well, and a NaN budget allows every request. The
    // line names the value, so the fallback itself is what is pinned here.
    assert.match(
      getOutput(),
      /using \d+\/min/,
      'the startup line must name the budget actually in force, not NaN',
    )
  } finally {
    await stopServer(child)
  }
})

test('a malformed MCP_RATE_MAX_BUCKETS falls back to the default cap and says so', async () => {
  // The bucket map's own cap is validated by the same rule as the budget above,
  // and it fails differently when the validation is lost: a NaN cap makes every
  // `buckets.size >= NaN` comparison false, so the map grows without bound —
  // the memory-growth failure the cap exists to prevent — while /health stays
  // green. A garbage value is the same typo class the budget tests pin ("2x",
  // "unlimited"), and the startup line is again the observable: with the
  // fallback gone, `MAX_BUCKETS === parsedMaxBuckets` (both NaN) and the line
  // is never printed.
  const { child, getOutput } = await startServer({
    ...process.env,
    MCP_RATE_MAX_BUCKETS: 'unlimited',
  })
  try {
    const deadline = Date.now() + 2000
    while (!getOutput().includes('MCP_RATE_MAX_BUCKETS') && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50))
    }
    assert.match(
      getOutput(),
      /MCP_RATE_MAX_BUCKETS/,
      'an unusable bucket cap must be reported at startup, not silently accepted as NaN',
    )
    // The line names the cap actually in force — the 10 000 default, so the
    // fallback itself (not merely the warning) is what is pinned.
    assert.match(
      getOutput(),
      /using 10000\b/,
      'the startup line must name the default cap the limiter fell back to',
    )
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

test('a body sent to a path with no handler is never parsed', async () => {
  // The budget is mounted on /mcp alone, and the parser used to sit at the ROOT
  // where it ran for every request: a POST to any other path was buffered in
  // full (up to the 1 MB cap) and only then 404'd, at whatever rate the caller
  // liked — the exact work the budget's own note says a flood must not be able
  // to pay, reached by changing the path. Nothing outside the /mcp handler ever
  // reads `req.body`, so the observable difference is the responder: a path
  // with no handler is answered by the ROUTER (404), never by the parser's
  // payload-too-large (413). The over-cap body is what tells the two apart —
  // an unparsed request never notices its own size.
  const { child, base } = await startServer({ ...process.env })
  try {
    const huge = JSON.stringify({ pad: 'x'.repeat(2 * 1024 * 1024) })
    for (const path of ['/not-a-route', '/health']) {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: huge,
      })
      assert.equal(res.status, 404, `${path} must be routed, not body-parsed`)
      await res.arrayBuffer() // drain so the socket is reusable
    }
    // …and the parser still runs where its output IS read: the /mcp handler
    // needs `req.body`, so the cap is enforced there as before.
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: huge,
    })
    assert.equal(res.status, 413, 'POST /mcp must still enforce the body cap')
    await res.arrayBuffer()
  } finally {
    await stopServer(child)
  }
})

test('a server that never reports its port is killed before startServer rejects', async () => {
  // This pins the HARNESS, not the server: `startServer` hands the child to its
  // caller only by RETURNING it, so a rejection from inside the helper leaves
  // the process owned by nobody — no `finally { stopServer(child) }` can reach
  // it. A `pipe` stdio child keeps this parent's event loop alive, so a leaked
  // one makes the whole `node --test` run hang instead of failing. The decoy
  // below never prints the `listening on :<port>` line (the deadline path) and
  // records its pid, so the test can ask the OS whether it is really gone.
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-rate-limit-decoy-'))
  try {
    const pidFile = join(dir, 'pid')
    const decoy = join(dir, 'decoy.mjs')
    writeFileSync(
      decoy,
      `import { writeFileSync } from 'node:fs'\n` +
        `writeFileSync(${JSON.stringify(pidFile)}, String(process.pid))\n` +
        `setInterval(() => {}, 1000)\n`,
    )
    await assert.rejects(
      startServer({ ...process.env }, { serverJs: decoy, portDeadlineMs: 400 }),
      /never reported its port/,
      'a server that never reports its port must fail the startup helper',
    )
    const pid = Number(readFileSync(pidFile, 'utf8'))
    assert.ok(Number.isInteger(pid) && pid > 0, 'the decoy must have recorded its pid')
    // ESRCH means the decoy is gone. Without the kill-before-rethrow the decoy
    // is still running here (and holding this parent's pipes).
    assert.throws(
      () => process.kill(pid, 0),
      (error) => error.code === 'ESRCH',
      `the abandoned server (pid ${pid}) must not outlive the helper's rejection`,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
