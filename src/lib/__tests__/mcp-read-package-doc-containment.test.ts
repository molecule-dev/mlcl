// @vitest-environment node
/**
 * `read_package_doc` reads an INSTALLED `@molecule/<name>` package's README out
 * of node_modules (stdio server, `mcp/src/server.ts`). The name is client data
 * and is joined into that path, so the tool carries a path-join guard — but the
 * guard's character class admitted a bare `..` segment, and `join` resolves it:
 *
 *   join(dir, 'node_modules', '@molecule', '..', 'README.md')
 *     → <dir>/node_modules/README.md
 *   join(dir, 'node_modules', '@molecule', '..', 'dist', 'README.md')
 *     → <dir>/node_modules/dist/README.md
 *
 * So `name: '..'` left the `@molecule/<name>` directory the tool exists to read
 * and returned whatever sat one level up, presented as that package's doc — a
 * file belonging to no molecule package (the same escape shape the guard's
 * sibling in `injector.ts` refuses for metadata-declared paths).
 *
 * Driven through the REAL stdio server over a linked in-memory transport, with
 * a temp project on disk: `node_modules/README.md` (the escape target) next to a
 * real `node_modules/@molecule/api-demo/README.md` (the positive control, so the
 * suite cannot pass by the tool simply reading nothing).
 *
 * @module
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

/** Text only a file OUTSIDE `node_modules/@molecule/<name>/` carries. */
const OUTSIDE_SCOPE_MARKER = 'readme that lives outside the molecule scope directory'
/** The doc of the package the positive-control call asks for. */
const PKG_DOC_MARKER = 'the installed package doc'

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}

const textOf = (result: ToolResult): string =>
  (result.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

let project: string | null = null

beforeAll(() => {
  if (existsSync(DEPS_MARKER)) {
    project = mkdtempSync(join(tmpdir(), 'mlcl-mcp-doc-contain-'))
    const nm = join(project, 'node_modules')
    mkdirSync(nm, { recursive: true })
    // The escape targets: exactly what `join(…, '@molecule', '..', …)` resolves to.
    writeFileSync(join(nm, 'README.md'), OUTSIDE_SCOPE_MARKER)
    mkdirSync(join(nm, 'dist'), { recursive: true })
    writeFileSync(join(nm, 'dist', 'README.md'), OUTSIDE_SCOPE_MARKER)
    // The positive control: a real installed package.
    mkdirSync(join(nm, '@molecule', 'api-demo'), { recursive: true })
    writeFileSync(join(nm, '@molecule', 'api-demo', 'README.md'), PKG_DOC_MARKER)
  }
})

afterAll(() => {
  if (project) rmSync(project, { recursive: true, force: true })
  // The connect() below disables telemetry for the process (an emit would
  // otherwise leave the worker). Restore it: vitest reuses a worker across test
  // FILES, so a variable left set here changes what a later suite observes.
  delete process.env.DO_NOT_TRACK
})

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    `[mcp-read-package-doc-containment] ${MCP_DIR}/node_modules is not installed — SKIPPING. ` +
      'Install mcp’s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

async function connect(): Promise<{
  call: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
  close: () => Promise<void>
}> {
  process.env.DO_NOT_TRACK = '1'
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'read-package-doc-containment', version: '0.0.0' })
  await client.connect(clientTransport)
  return {
    call: (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>,
    close: () => client.close(),
  }
}

describe('read_package_doc stays inside the package it was asked for', () => {
  it('reads an installed package doc — the positive control', async (ctx) => {
    if (skipped(ctx)) return
    const { call, close } = await connect()
    try {
      const output = textOf(
        await call('read_package_doc', { name: 'api-demo', directory: project }),
      )
      expect(output, 'the installed package README is what the tool is for').toContain(
        PKG_DOC_MARKER,
      )
    } finally {
      await close()
    }
  })

  it('refuses a `..` name instead of reading one level above the package directory', async (ctx) => {
    if (skipped(ctx)) return
    const { call, close } = await connect()
    try {
      for (const name of ['..', '@molecule/..', '.']) {
        const output = textOf(await call('read_package_doc', { name, directory: project }))
        expect(
          output,
          `"${name}" must not resolve out of node_modules/@molecule/<name> — it read ${output.slice(0, 60)}`,
        ).not.toContain(OUTSIDE_SCOPE_MARKER)
        expect(output, `"${name}" is not a package name`).toContain('Invalid package name')
      }
    } finally {
      await close()
    }
  })
})
