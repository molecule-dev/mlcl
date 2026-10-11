// @vitest-environment node
/**
 * The MCP domain tools advertise a contract the CLI they shell out to does not
 * honour — the shape of bug the sibling `parity-cli-commands` suite catches for
 * COMMAND names and flags, one level down at the ARGUMENT's meaning.
 *
 * `mlcl domain verify <domainId>` / `domain rm <domainId>` take the domain's ROW
 * ID: the CLI hands it straight to
 * `/projects/:id/domains/:domainId/verify|` and molecule-dev's `CustomDomain`
 * resource resolves the row with `{ field: 'id', operator: '=', value: … }`, so
 * an agent that follows the tool description ("The domain to verify") and passes
 * `app.example.com` gets a 404 "Domain not found" for a domain that exists.
 * The ids are not reachable from the CLI either — `mlcl domain list` prints
 * `<hostname>  verified|unverified` and nothing else — so the contract has to
 * say where the value comes from, or the tool is a dead end.
 *
 * The descriptions also promised output the CLI never prints: "learn the DNS
 * records to set" (`domain add` prints `Added <domain>`) and "their DNS state
 * and certificates" (`domain list` prints the hostname and verified/unverified).
 *
 * These assertions read the schema a CLIENT sees — the same surface
 * `mcp-tool-input-bounds.test.ts` pins bounds on — so removing the fix is a
 * visible regression.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

interface AdvertisedTool {
  name: string
  description?: string
  inputSchema?: { properties?: Record<string, { description?: string }> }
}

let tools: AdvertisedTool[] = []
let closeClient: (() => Promise<void>) | undefined

beforeAll(async () => {
  if (!existsSync(DEPS_MARKER)) return
  process.env.DO_NOT_TRACK = '1'

  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'domain-contract-test', version: '0.0.0' })
  await client.connect(clientTransport)
  tools = (await client.listTools()).tools as AdvertisedTool[]
  closeClient = () => client.close()
})

afterAll(async () => {
  if (closeClient) await closeClient()
  delete process.env.DO_NOT_TRACK
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    '[mcp-domain-contract] mcp/node_modules is not installed — SKIPPING. ' +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/** The advertised description of one tool argument — what a client reads. */
function argumentDoc(toolName: string, argument: string): string {
  const tool = tools.find((entry) => entry.name === toolName)
  if (!tool) throw new Error(`the server registers no ${toolName} tool`)
  return tool.inputSchema?.properties?.[argument]?.description ?? ''
}

/** The advertised description of the tool itself. */
function toolDoc(toolName: string): string {
  const tool = tools.find((entry) => entry.name === toolName)
  if (!tool) throw new Error(`the server registers no ${toolName} tool`)
  return tool.description ?? ''
}

describe('the MCP domain tools describe the CLI contract they call', () => {
  it('asks for the domain ROW ID wherever the CLI resolves by id', (ctx) => {
    if (skipped(ctx)) return
    for (const toolName of ['domain_verify', 'domain_remove']) {
      const described = argumentDoc(toolName, 'domain')
      expect(
        described,
        `${toolName}'s \`domain\` argument must name the row id the CLI resolves by`,
      ).toMatch(/row id/i)
      // The old text was "The domain to verify" / "The domain to remove" — a
      // hostname, which the CLI 404s on.
      expect(
        described,
        `${toolName} may not describe the value as the domain (hostname) itself`,
      ).not.toMatch(/^\s*the domain\b/i)
      // …and it must say where an id can be had, since the CLI's own list
      // prints hostnames only.
      expect(
        described,
        `${toolName} must say where the id comes from — the CLI prints no ids`,
      ).toMatch(/list/i)
    }
  })

  it('promises no output the CLI never prints', (ctx) => {
    if (skipped(ctx)) return
    // `mlcl domain list` → `  <hostname>  verified|unverified`; no certificates.
    expect(toolDoc('domain_list')).not.toMatch(/certificat/i)
    expect(toolDoc('domain_list'), 'the description must say what list actually prints').toMatch(
      /verified/i,
    )
    // `mlcl domain add` → `Added <domain>`; it never prints DNS records.
    expect(toolDoc('domain_add')).not.toMatch(/DNS records/i)
  })
})
