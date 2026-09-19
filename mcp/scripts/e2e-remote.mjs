#!/usr/bin/env node
/**
 * molecule-mcp REMOTE mode end-to-end — the hosted, read-only server that
 * URL-based clients (Lovable/v0/bolt connectors, `claude mcp add --transport
 * https`) will talk to. Exercises it TWO ways:
 *
 *   1. in-memory client↔server protocol round-trip (local file overrides for
 *      registry/templates — no network for the catalog itself);
 *   2. a real HTTP round-trip: boot dist/http.js on a local port, connect a
 *      Streamable HTTP client, call a tool, hit /health.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MLCL = join(import.meta.dirname, '..', '..')
process.env.MOLECULE_REGISTRY_FILE = join(MLCL, 'registry.json')
process.env.MOLECULE_TEMPLATES_FILE = join(MLCL, 'templates', 'apps', 'registry.json')

let failures = 0
const check = (name, cond, detail = '') => {
  console.log(
    `${cond ? '✓' : '✗'} ${name}${!cond && detail ? ` — ${String(detail).slice(0, 160)}` : ''}`,
  )
  if (!cond) failures++
}

// ── 1. in-memory round-trip ──────────────────────────────────────────────
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
const { buildRemoteServer } = await import('../dist/remote.js')

const client = new Client({ name: 'remote-e2e', version: '0' })
const [a, b] = InMemoryTransport.createLinkedPair()
await buildRemoteServer().connect(b)
await client.connect(a)

const tools = await client.listTools()
check(
  'remote exposes read-only tools',
  ['search_packages', 'list_templates', 'read_package_doc'].every((n) =>
    tools.tools.some((t) => t.name === n),
  ),
  tools.tools.map((t) => t.name),
)

const search = await client.callTool({
  name: 'search_packages',
  arguments: { query: 'payments', limit: 3 },
})
const hits = JSON.parse(search.content[0].text)
check(
  'remote search finds stripe',
  hits.some((h) => h.name === '@molecule/api-payments-stripe'),
  search.content[0].text,
)

const templates = await client.callTool({ name: 'list_templates', arguments: {} })
const tpls = JSON.parse(templates.content[0].text)
check('remote templates list (134)', tpls.length >= 130 && tpls.some((t) => t.slug === 'blog'))

const conventions = await client.readResource({ uri: 'molecule://conventions' })
check('remote conventions resource', /mlcl create <name>/.test(conventions.contents[0].text))

// read_package_doc needs network (npm registry) — assert shape only when online.
try {
  const doc = await client.callTool({ name: 'read_package_doc', arguments: { name: 'api-bond' } })
  check('remote doc fetch returns markdown', /^(#|<!--)|Doc not fetched/.test(doc.content[0].text))
} catch (_error) {
  console.log('- remote doc fetch skipped (offline)')
}

// ── 2. real HTTP round-trip ──────────────────────────────────────────────
const PORT = 3789
const proc = spawn(process.execPath, [join(MLCL, 'mcp', 'dist', 'http.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
await new Promise((r) => setTimeout(r, 800))

try {
  const health = await (await fetch(`http://127.0.0.1:${PORT}/health`)).json()
  check('HTTP /health', health.ok === true)

  const { StreamableHTTPClientTransport } =
    await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  const http = new Client({ name: 'http-e2e', version: '0' })
  await http.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${PORT}/mcp`)))
  const httpTools = await http.listTools()
  check('HTTP client lists tools', httpTools.tools.length >= 3)
  const httpSearch = await http.callTool({ name: 'search_packages', arguments: { query: 'email' } })
  check('HTTP search works', JSON.parse(httpSearch.content[0].text).length > 0)
  await http.close()
} catch (e) {
  check('HTTP round-trip', false, e.message)
} finally {
  proc.kill()
}

console.log(failures ? `\n${failures} FAILED` : '\nremote MCP (in-memory + HTTP): all green')
process.exit(failures ? 1 : 0)
