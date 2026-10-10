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
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, server: 'molecule-mcp-remote' }))

// The hosted server is public and unauthenticated, so each client address gets
// a request budget: MCP_RATE_PER_MIN per minute (default 120 — a harness makes a
// few calls a turn). The budget keys on the REAL client address: on a Fly
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
// with /health still green and nothing in the logs. Only a plain integer is
// accepted; anything else uses the default, with one startup line naming the
// variable.
const rawRatePerMin = process.env.MCP_RATE_PER_MIN
const trimmedRatePerMin = rawRatePerMin?.trim()
const parsedRatePerMin =
  trimmedRatePerMin !== undefined && /^\d+$/.test(trimmedRatePerMin)
    ? Number(trimmedRatePerMin)
    : Number.NaN
const RATE_PER_MIN = parsedRatePerMin > 0 ? parsedRatePerMin : 120
if (rawRatePerMin !== undefined && RATE_PER_MIN !== parsedRatePerMin) {
  console.warn(
    `[mcp] MCP_RATE_PER_MIN="${rawRatePerMin}" is not a positive integer — using ${RATE_PER_MIN}/min`,
  )
}
const MAX_BUCKETS = 10_000
const ON_FLY = process.env.FLY_MACHINE_ID !== undefined || process.env.FLY_APP_NAME !== undefined
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
  if (!b && buckets.size >= MAX_BUCKETS) {
    sweep()
    if (buckets.size >= MAX_BUCKETS) {
      // Every live bucket is younger than the sweep horizon here, so evict the
      // least-recently-seen one — the only fair order once the cap is hit.
      let oldestKey: string | null = null
      let oldestAt = Infinity
      for (const [key, bucket] of buckets) {
        if (bucket.at < oldestAt) {
          oldestAt = bucket.at
          oldestKey = key
        }
      }
      if (oldestKey !== null) buckets.delete(oldestKey)
    }
  }
  if (!b) {
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
