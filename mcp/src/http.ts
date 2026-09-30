/**
 * molecule-mcp HTTP entry — serves the REMOTE (read-only) server over the MCP
 * Streamable HTTP transport at /mcp. Deploy behind TLS as
 * https://mcp.molecule.dev/mcp so URL-based clients (Lovable connectors,
 * v0, bolt.new, `claude mcp add --transport http molecule <url>`) can reach it.
 *
 * Stateless mode: every POST gets a fresh transport/server pair (the SDK's
 * documented pattern for serverless-style deployments).
 */
import express from 'express'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import { buildRemoteServer } from './remote.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

const app = express()
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, server: 'molecule-mcp-remote' }))

// The hosted server is public and unauthenticated, so each client address gets
// a request budget: MCP_RATE_PER_MIN per minute (default 120 — a harness makes a
// few calls a turn). Fly puts the caller in Fly-Client-IP; elsewhere the socket.
const RATE_PER_MIN = parseInt(process.env.MCP_RATE_PER_MIN ?? '120', 10)
const buckets = new Map<string, { tokens: number; at: number }>()
const allow = (ip: string): boolean => {
  const now = Date.now()
  const b = buckets.get(ip) ?? { tokens: RATE_PER_MIN, at: now }
  b.tokens = Math.min(RATE_PER_MIN, b.tokens + ((now - b.at) / 60_000) * RATE_PER_MIN)
  b.at = now
  if (b.tokens < 1) {
    buckets.set(ip, b)
    return false
  }
  b.tokens -= 1
  buckets.set(ip, b)
  return true
}
setInterval(() => {
  const stale = Date.now() - 10 * 60_000
  for (const [ip, b] of buckets) if (b.at < stale) buckets.delete(ip)
}, 60_000).unref()
app.use('/mcp', (req, res, next) => {
  const ip = String(req.headers['fly-client-ip'] ?? req.socket.remoteAddress ?? 'unknown')
  if (allow(ip)) return next()
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

app.listen(PORT, () => {
  process.stdout.write(`molecule-mcp remote (HTTP) listening on :${PORT}/mcp\n`)
})
