// @vitest-environment node
/**
 * The stdio MCP server's `read_package_doc` prints the same bounded README view `mlcl docs` does
 * (a long README as its overview and section index, or one `section`), and `find_example` runs
 * `mlcl examples`. Driven through the real server over an in-memory transport; `find_example`
 * runs against a stand-in CLI that prints the argv it was given.
 *
 * @module
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import { DOC_VIEW_MAX_CHARS } from '../package-doc-view.js'

const MCP_DIR = join(import.meta.dirname, '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

interface ToolResult {
  isError?: boolean
  content?: Array<{ type: string; text?: string }>
}
const textOf = (result: ToolResult): string =>
  (result.content ?? []).map((block) => block.text ?? '').join('\n')

const dirs: string[] = []
const originalCli = process.env.MOLECULE_MCP_CLI
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  if (originalCli === undefined) delete process.env.MOLECULE_MCP_CLI
  else process.env.MOLECULE_MCP_CLI = originalCli
  delete process.env.DO_NOT_TRACK
})
const temp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-docs-examples-'))
  dirs.push(dir)
  return dir
}

/** Skip out loud in the one environment this suite cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(`[mcp-docs-and-examples] ${MCP_DIR}/node_modules is not installed — SKIPPING.`)
  ctx.skip()
  return true
}

/** The real stdio server, behind `cli` when given (read at module load, so re-imported). */
async function connect(
  cli?: string,
): Promise<(name: string, args?: Record<string, unknown>) => Promise<ToolResult>> {
  process.env.DO_NOT_TRACK = '1'
  if (cli) process.env.MOLECULE_MCP_CLI = cli
  vi.resetModules()
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'docs-and-examples', version: '0.0.0' })
  await client.connect(clientTransport)
  return (name, args = {}) => client.callTool({ name, arguments: args }) as Promise<ToolResult>
}

describe('read_package_doc', () => {
  it('prints a long README as its overview and index, and one section in full', async (ctx) => {
    if (skipped(ctx)) return
    const root = temp()
    const pkg = join(root, 'node_modules', '@molecule', 'api-demo')
    mkdirSync(pkg, { recursive: true })
    const filler = `${'z'.repeat(300)}\n`.repeat(Math.ceil((DOC_VIEW_MAX_CHARS * 2) / 300))
    writeFileSync(
      join(pkg, 'README.md'),
      `# @molecule/api-demo\n\nDemo overview.\n\n## API\n\n### Functions\n\n#### \`demoQuery(table)\`\n\nRuns the demo query.\n\n## Injection Notes\n\n${filler}`,
    )
    const call = await connect()
    const whole = textOf(await call('read_package_doc', { name: 'api-demo', directory: root }))
    expect(whole.length).toBeLessThan(DOC_VIEW_MAX_CHARS)
    expect(whole).toContain('Demo overview.')
    expect(whole).toContain('    demoQuery')
    expect(whole).toContain('read_package_doc with section: "<heading>"')
    const one = textOf(
      await call('read_package_doc', { name: 'api-demo', directory: root, section: 'demoQuery' }),
    )
    expect(one).toContain('Runs the demo query.')
    expect(one).not.toContain('zzz')
    const both = textOf(
      await call('read_package_doc', {
        name: 'api-demo',
        directory: root,
        section: 'API',
        search: 'demo',
      }),
    )
    expect(both).toBe('Use either search or section, not both.')
  })

  // Harness eval `docs`, 2026-11-23: in a project without the package, the tool answered "No local
  // README found" and both Claude Code and Codex went on to fetch molecule.dev pages and unpack npm
  // tarballs for the README that `mlcl docs` reads from npm.
  describe('a package that is not installed', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    })

    it('is read from npm, and says so', async (ctx) => {
      if (skipped(ctx)) return
      const asked: string[] = []
      vi.stubGlobal('fetch', async (url: string) => {
        asked.push(String(url))
        return new Response(
          JSON.stringify({ readme: '# @molecule/api-remote\n\nRemote overview.\n' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      })
      vi.stubEnv('npm_config_registry', '')
      const call = await connect()
      const doc = textOf(await call('read_package_doc', { name: 'api-remote', directory: temp() }))
      expect(doc).toContain('Remote overview.')
      expect(doc).toContain('Published README from npm')
      expect(asked).toEqual(['https://registry.npmjs.org/@molecule%2Fapi-remote'])
      const found = textOf(
        await call('read_package_doc', {
          name: 'api-remote',
          directory: temp(),
          search: 'overview',
        }),
      )
      expect(found).toContain('Remote overview.')
    })

    it('asks the registry npm is configured with', async (ctx) => {
      if (skipped(ctx)) return
      const asked: string[] = []
      vi.stubGlobal('fetch', async (url: string) => {
        asked.push(String(url))
        return new Response(JSON.stringify({ readme: '# @molecule/api-mirror\n\nMirrored.\n' }))
      })
      vi.stubEnv('npm_config_registry', 'https://npm.example.com/repository/npm/')
      const call = await connect()
      const doc = textOf(await call('read_package_doc', { name: 'api-mirror', directory: temp() }))
      expect(doc).toContain('Mirrored.')
      expect(asked).toEqual(['https://npm.example.com/repository/npm/@molecule%2Fapi-mirror'])
    })

    it('points to search_packages when npm has no README', async (ctx) => {
      if (skipped(ctx)) return
      vi.stubGlobal('fetch', async () => new Response('{"error":"Not found"}', { status: 404 }))
      const call = await connect()
      const doc = textOf(await call('read_package_doc', { name: 'api-nothing', directory: temp() }))
      expect(doc).toContain('No README found for @molecule/api-nothing')
      expect(doc).toContain('search_packages')
    })
  })
})

describe('find_example', () => {
  /** A stand-in CLI that prints its argv as JSON. */
  function echoCli(): string {
    const script = join(temp(), 'echo-mlcl.mjs')
    writeFileSync(
      script,
      '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)))\n',
    )
    chmodSync(script, 0o755)
    return script
  }

  it('runs mlcl examples with the query after --, so a leading dash stays part of it', async (ctx) => {
    if (skipped(ctx)) return
    const call = await connect(echoCli())
    expect(
      JSON.parse(textOf(await call('find_example', { query: '--all of the things' }))),
    ).toEqual(['examples', '--json', '--', '--all of the things'])
    expect(JSON.parse(textOf(await call('find_example', {})))).toEqual(['examples', '--json'])
  })

  it('prints a slice, or one of its files', async (ctx) => {
    if (skipped(ctx)) return
    const call = await connect(echoCli())
    expect(
      JSON.parse(
        textOf(
          await call('find_example', {
            slice: 'auth/oauth-google-login',
            file: 'api/bonds/oauth-google.ts',
          }),
        ),
      ),
    ).toEqual([
      'examples',
      '--json',
      '--file',
      'api/bonds/oauth-google.ts',
      '--',
      'auth/oauth-google-login',
    ])
  })

  it('refuses a slice that is not a <category>/<name> slug, and a file without a slice', async (ctx) => {
    if (skipped(ctx)) return
    const call = await connect(echoCli())
    expect((await call('find_example', { slice: '../../etc' })).isError).toBe(true)
    expect(textOf(await call('find_example', { file: 'a.ts' }))).toContain('Pass slice with file')
  })
})
