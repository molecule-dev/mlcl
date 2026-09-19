/**
 * molecule-mcp HTTP entry — serves the REMOTE (read-only) server over the MCP
 * Streamable HTTP transport at /mcp. Deploy behind TLS as
 * https://mcp.molecule.dev/mcp so URL-based clients (Lovable connectors,
 * v0, bolt.new, `claude mcp add --transport https`) can reach it.
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
