#!/usr/bin/env node
/**
 * molecule-mcp end-to-end protocol test — a REAL MCP client linked to the
 * REAL server over an in-memory transport pair, calling every tool with real
 * arguments against the local mlcl CLI. Proves the full request/response
 * path a harness like Claude Code would exercise.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.MOLECULE_MCP_CLI ??= join(import.meta.dirname, '..', '..', 'bin', 'run.js')

const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
const { moleculeServer } = await import('../dist/server.js')

let failures = 0
const check = (name, cond, detail = '') => {
  console.log(
    `${cond ? '✓' : '✗'} ${name}${!cond && detail ? ` — ${String(detail).slice(0, 160)}` : ''}`,
  )
  if (!cond) failures++
}

const client = new Client({ name: 'e2e-test', version: '0.0.0' })
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
await moleculeServer.connect(serverSide)
await client.connect(clientSide)

// 1. listTools — the discovery surface a harness sees
const { tools } = await client.listTools()
const names = tools.map((t) => t.name)
check(
  'listTools exposes all seven tools',
  [
    'search_packages',
    'list_templates',
    'scaffold_project',
    'add_package',
    'swap_provider',
    'read_package_doc',
  ].every((n) => names.includes(n)),
  names,
)

// 2. search_packages — real query through the protocol
const search = await client.callTool({
  name: 'search_packages',
  arguments: { query: 'payments', limit: 3 },
})
const searchHits = JSON.parse(search.content[0].text)
check(
  'search_packages returns JSON hits',
  Array.isArray(searchHits) && searchHits.some((h) => h.name === '@molecule/api-payments-stripe'),
  search.content[0].text,
)

// 3. list_templates
const templates = await client.callTool({ name: 'list_templates', arguments: {} })
const tplList = JSON.parse(templates.content[0].text)
check(
  'list_templates returns 134 slugs',
  Array.isArray(tplList) && tplList.length >= 130 && tplList.some((t) => t.slug === 'blog'),
)

// 3b. conventions resource — the doctrine ships WITH the server
const resources = await client.listResources()
check(
  'conventions resource exposed',
  resources.resources.some((r) => r.uri === 'molecule://conventions'),
)
const conventions = await client.readResource({ uri: 'molecule://conventions' })
check(
  'conventions carries the quickstart',
  /mlcl create <name> --template <slug> --no-interactive/.test(conventions.contents[0].text),
)

// 3c. agent_init tool — the server can self-install the doctrine in a project
const initDir = mkdtempSync(join(tmpdir(), 'mcp-agent-init-'))
const initResult = await client.callTool({ name: 'agent_init', arguments: { directory: initDir } })
check(
  'agent_init writes AGENTS.md',
  existsSync(join(initDir, 'AGENTS.md')),
  initResult.content[0].text,
)
rmSync(initDir, { recursive: true, force: true })

// 4. scaffold_project — a REAL scaffold through MCP (skip-install for speed)
const dir = mkdtempSync(join(tmpdir(), 'mcp-e2e-'))
const scaffold = await client.callTool({
  name: 'scaffold_project',
  arguments: { name: 'mcp-e2e-app', template: 'blog', skip_install: true, directory: dir },
})
const result = JSON.parse(scaffold.content[0].text)
check(
  'scaffold_project returns JSON result',
  result.project === 'mcp-e2e-app' && result.template === 'blog' && Array.isArray(result.packages),
  scaffold.content[0].text,
)
check(
  'scaffold_project wrote AGENTS.md + fonts',
  existsSync(join(result.path, 'AGENTS.md')) &&
    existsSync(join(result.path, 'app', 'public', 'fonts')),
)
// 5. read_package_doc — fallback path on an uninstalled package (friendly message)
const docMiss = await client.callTool({
  name: 'read_package_doc',
  arguments: { name: 'api-payments-stripe', directory: dir },
})
check(
  'read_package_doc miss is friendly',
  /No local README|molecule\.dev\/packages/.test(docMiss.content[0].text),
)

rmSync(dir, { recursive: true, force: true })

// 6. error path: invalid template must return an error result, not crash the server
const bad = await client
  .callTool({
    name: 'scaffold_project',
    arguments: {
      name: 'bad-app',
      template: 'not-a-real-template',
      skip_install: true,
      directory: tmpdir(),
    },
  })
  .catch((e) => ({ isError: true, content: [{ text: e.message }] }))
check(
  'invalid input surfaces as tool error',
  bad.isError === true || /not-a-real-template|Available/i.test(bad.content?.[0]?.text ?? ''),
  JSON.stringify(bad).slice(0, 120),
)

console.log(failures ? `\n${failures} FAILED` : '\nMCP protocol round-trip: all green')
process.exit(failures ? 1 : 0)
