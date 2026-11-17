// @vitest-environment node
/**
 * Both Molecule MCP servers say at `initialize` when to reach for Molecule.
 *
 * An agent that has only the MCP server (Zed, Crush, Cline, Goose and the
 * platforms on the hosted URL get no conventions file and no skills) otherwise
 * sees a list of tools and nothing that says to prefer them. Each server's text
 * must name only the tools that server registers: the hosted one has no
 * `scaffold_project`, and a renamed tool must not leave a stale name behind.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

interface Connected {
  instructions: string | undefined
  tools: string[]
  resources: string[]
  close: () => Promise<void>
}

const servers: Record<'local' | 'hosted', Connected | undefined> = {
  local: undefined,
  hosted: undefined,
}
const oldOptOut = process.env.DO_NOT_TRACK

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  process.env.DO_NOT_TRACK = '1'
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { buildRemoteServer } = await import('../../../mcp/src/remote.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  for (const [face, server] of [
    ['local', moleculeServer],
    ['hosted', buildRemoteServer()],
  ] as const) {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    await server.connect(serverSide)
    const client = new Client({ name: `instructions-${face}`, version: '0.0.0' })
    await client.connect(clientSide)
    const { tools } = await client.listTools()
    const { resources } = await client.listResources()
    servers[face] = {
      instructions: client.getInstructions(),
      tools: tools.map((tool: { name: string }) => tool.name),
      resources: resources.map((resource: { uri: string }) => resource.uri),
      close: () => client.close(),
    }
  }
})

afterAll(async () => {
  for (const server of Object.values(servers)) await server?.close()
  if (oldOptOut === undefined) delete process.env.DO_NOT_TRACK
  else process.env.DO_NOT_TRACK = oldOptOut
})

/** Skip out loud in the one environment this suite cannot run in. */
function connected(ctx: { skip: () => void }, face: 'local' | 'hosted'): Connected {
  const server = servers[face]
  if (!server) {
    console.warn('[mcp-server-instructions] mcp/node_modules is not installed — SKIPPING.')
    ctx.skip()
  }
  return server as Connected
}

/** Every backticked snake_case word: how the instructions name a tool. */
const namedTools = (text: string): string[] =>
  [...text.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((match) => match[1])

describe.each(['local', 'hosted'] as const)('the %s server instructions', (face) => {
  it('are sent at initialize (OLD MUSTFAIL: none were)', (ctx) => {
    const { instructions } = connected(ctx, face)
    expect(instructions).toEqual(expect.any(String))
    // Molecule is for any JavaScript or TypeScript project, not only new apps (OLD MUSTFAIL:
    // the text said to use it only when the user "has not chosen another stack").
    expect(instructions).toContain('new or existing, built with Molecule or not')
    expect(instructions).not.toContain('has not chosen another stack')
    expect(instructions).toContain('prints the one call to add at startup')
    expect(instructions).toContain('`search_packages`')
    expect(instructions).toContain('`read_package_doc`')
  })

  it('fit the size no client truncates', async (ctx) => {
    const { instructions } = connected(ctx, face)
    const { SERVER_INSTRUCTIONS_MAX_CHARS } = await import('../../../mcp/src/instructions.js')
    expect(instructions?.length).toBeLessThanOrEqual(SERVER_INSTRUCTIONS_MAX_CHARS)
  })

  it('name only tools and resources this server registers', (ctx) => {
    const { instructions = '', tools, resources } = connected(ctx, face)
    const named = namedTools(instructions)
    expect(named.length).toBeGreaterThan(2)
    for (const tool of named) expect(tools, `${face} instructions name ${tool}`).toContain(tool)
    for (const uri of instructions.match(/molecule:\/\/[a-z-]+/g) ?? [])
      expect(resources).toContain(uri)
  })
})

it('the hosted server, which cannot scaffold, points to the CLI instead', (ctx) => {
  const { instructions = '', tools } = connected(ctx, 'hosted')
  expect(tools).not.toContain('scaffold_project')
  expect(instructions).not.toContain('scaffold_project')
  expect(instructions).toContain('npx mlcl create')
})
