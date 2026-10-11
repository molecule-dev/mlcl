/**
 * molecule-mcp HTTP entry — serves the REMOTE (read-only) server over the MCP
 * Streamable HTTP transport at /mcp. Deploy behind TLS as
 * https://mcp.molecule.dev/mcp so URL-based clients (Lovable connectors,
 * v0, bolt.new, `claude mcp add --transport http molecule <url>`) can reach it.
 *
 * Stateless mode: every POST gets a fresh transport/server pair (the SDK's
 * documented pattern for serverless-style deployments).
 */
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'

import { buildRemoteServer } from './remote.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

const app = express()

// The hosted server is public and unauthenticated, so each client address gets
// a request budget: MCP_RATE_PER_MIN per minute (default 120 — a harness makes a
// few calls a turn). It is mounted BEFORE the body parser on purpose: a request
// the budget rejects must not cost the 1 MB JSON parse, or a flood pays the
// parse on every request the budget never allows.
//
// The budget keys on the REAL client address: on a Fly
// machine the platform proxy puts it in Fly-Client-IP (a client-supplied value
// is overwritten), so the header is trusted only when the platform-injected
// FLY_MACHINE_ID/FLY_APP_NAME are present; anywhere else — local dev, a host
// behind no Fly proxy — a client can send any header value it likes, so the
// socket address is the only honest key. Buckets are capped so even a flood of
// distinct addresses (a botnet, or a header-rotating client on an unguarded
// proxy) cannot grow the map without bound; the sweeper prunes idle buckets
// every minute.
//
// The budget itself is validated before it is used. `parseInt` reads a typo'd
// secret by prefix ("2x" → 2, "1e3" → 1, "12 0" → 12) and yields NaN for
// anything it cannot start with ("one hundred", "unlimited", a stray quote) —
// and a NaN budget is not a small budget: `NaN < 1` is false, so the bucket
// never reports "out of budget" and EVERY request is allowed. A typo silently
// either tightened the limit to a number nobody chose or removed it entirely,
// with /health still green and nothing in the logs. Only a plain, exactly
// representable integer is accepted; anything else — including a digit run long
// enough to overflow to `Infinity` — uses the default, with one startup line
// naming the variable.
/** A plain positive integer from the environment, or NaN for anything else. */
const positiveInt = (raw: string | undefined): number => {
  const trimmed = raw?.trim()
  if (trimmed === undefined || !/^\d+$/.test(trimmed)) return Number.NaN
  // All-digits is not enough. A long enough run of digits overflows `Number` to
  // Infinity, which passes `> 0`, is NEVER reported by the "was it accepted?"
  // comparison below (Infinity === Infinity, so the warning does not fire), and
  // makes the bucket's `Math.min(RATE_PER_MIN, …)` a no-op — i.e. the silent
  // no-limit the note above says cannot happen, with /health green and nothing
  // logged. Only an integer the bucket arithmetic can count is a budget.
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : Number.NaN
}

const parsedRatePerMin = positiveInt(process.env.MCP_RATE_PER_MIN)
const RATE_PER_MIN = parsedRatePerMin > 0 ? parsedRatePerMin : 120
if (process.env.MCP_RATE_PER_MIN !== undefined && RATE_PER_MIN !== parsedRatePerMin) {
  console.warn(
    `[mcp] MCP_RATE_PER_MIN="${process.env.MCP_RATE_PER_MIN}" is not a positive integer — using ${RATE_PER_MIN}/min`,
  )
}
// The bucket map's own bound. Overridable for the rate-limit regression suite
// (which proves the eviction at a tiny cap instead of flooding 10 000
// addresses) and for an operator under memory pressure; same validation rule.
const parsedMaxBuckets = positiveInt(process.env.MCP_RATE_MAX_BUCKETS)
const MAX_BUCKETS = parsedMaxBuckets > 0 ? parsedMaxBuckets : 10_000
if (process.env.MCP_RATE_MAX_BUCKETS !== undefined && MAX_BUCKETS !== parsedMaxBuckets) {
  console.warn(
    `[mcp] MCP_RATE_MAX_BUCKETS="${process.env.MCP_RATE_MAX_BUCKETS}" is not a positive integer — using ${MAX_BUCKETS}`,
  )
}
const ON_FLY = process.env.FLY_MACHINE_ID !== undefined || process.env.FLY_APP_NAME !== undefined
// The map is held in ACCESS order — first key = least recently seen — which is
// what makes the cap-eviction below a single step. A Map keeps insertion order,
// and re-setting an existing key does NOT move it, so a hit re-inserts its
// bucket (delete + set) to keep that order honest; see `allow`.
const buckets = new Map<string, { tokens: number; at: number }>()
const sweep = (): void => {
  const stale = Date.now() - 10 * 60_000
  for (const [ip, b] of buckets) if (b.at < stale) buckets.delete(ip)
}
setInterval(sweep, 60_000).unref()
const clientAddress = (req: express.Request): string => {
  if (ON_FLY) {
    const header = req.headers['fly-client-ip']
    const ip = Array.isArray(header) ? header[0] : header
    if (ip) return ip
  }
  return req.socket.remoteAddress ?? 'unknown'
}
const allow = (ip: string): boolean => {
  const now = Date.now()
  let b = buckets.get(ip)
  if (b) {
    // Move this address to the END of the map's order ("seen last"), so the
    // eviction below picks the least-recently-seen bucket. Evicting by a SCAN
    // for the minimum `at` instead made every request expensive in proportion
    // to the map: at the default cap of 10 000, one request from each of a
    // flood's distinct addresses — exactly the traffic the cap exists to
    // survive — paid two passes over every bucket (the sweep plus the scan),
    // so the flood's own defence became its amplifier. Deleting and re-adding
    // on each hit is O(1) and keeps the order the eviction reads.
    buckets.delete(ip)
    buckets.set(ip, b)
  } else {
    if (buckets.size >= MAX_BUCKETS) {
      // The cap is reached. The first key is the least-recently-seen bucket —
      // the scan's victim, taken in one step.
      //
      // The victim is the least recently SEEN, not the oldest by the sweeper's
      // clock: a bucket dropped here may have been exhausted seconds ago, so
      // dropping it DOES hand that address a fresh budget (the sweeper below is
      // what eventually makes eviction harmless, by converging the map on
      // recently-seen addresses only). That is the deliberate trade: filling a
      // per-address map past its cap means an address flood, and refusing the
      // NEW address would let whoever floods the map deny service to everyone
      // else. A per-address budget never stops a flood large enough to fill the
      // map anyway — each address brings its own — so the eviction keeps
      // legitimate new clients working and leaves the flood to the platform's
      // own network-level controls.
      const oldestKey = buckets.keys().next().value
      if (oldestKey !== undefined) buckets.delete(oldestKey)
    }
    b = { tokens: RATE_PER_MIN, at: now }
    buckets.set(ip, b)
  }
  b.tokens = Math.min(RATE_PER_MIN, b.tokens + ((now - b.at) / 60_000) * RATE_PER_MIN)
  b.at = now
  if (b.tokens < 1) return false
  b.tokens -= 1
  return true
}
app.use('/mcp', (req, res, next) => {
  if (allow(clientAddress(req))) return next()
  res.status(429).json({
    jsonrpc: '2.0',
    id: null,
    error: { code: -32000, message: 'rate limited — retry in a minute' },
  })
})

// Body parsing sits BELOW the budget: the parser's output is only needed by the
// POST handler, and a request the budget rejected must not be parsed first.
//
// It is also mounted on /mcp ONLY, for the same reason one step further out.
// Mounted at the root, the parser ran for EVERY request — but the budget runs
// on /mcp alone, so a POST to any other path was parsed in full (up to the 1 MB
// cap) and only then 404'd, at whatever rate the caller liked: the very work
// the budget's own note says a flood must not be able to pay, reached by
// changing the path. Nothing outside the /mcp handler ever reads `req.body`,
// so nothing outside it needs to be parsed.
app.use('/mcp', express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, server: 'molecule-mcp-remote' }))

app.post('/mcp', async (req, res) => {
  const server = buildRemoteServer()
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

// Stateless servers answer 405 on GET/DELETE per the MCP spec.
app.get('/mcp', (_req, res) => res.status(405).json({ error: 'stateless server — POST only' }))
app.delete('/mcp', (_req, res) => res.status(405).json({ error: 'stateless server — POST only' }))

const server = app.listen(PORT, () => {
  // Print the port the socket is ACTUALLY bound to, not the PORT value: with
  // PORT=0 (how the regression suite asks the OS for a free port instead of
  // racing to take one) the literal is 0, and a client reading the startup line
  // would be told a port nothing is listening on.
  const address = server.address()
  const boundPort = typeof address === 'object' && address !== null ? address.port : PORT
  process.stdout.write(`molecule-mcp remote (HTTP) listening on :${boundPort}/mcp\n`)
})
