// @vitest-environment node
/**
 * The MCP server must run its CLI-backed tools on a machine that has no global
 * `mlcl`.
 *
 * Every documented install line starts the server without installing the CLI —
 * `npx -y molecule-mcp` (the one-line `claude mcp add` / `codex mcp add`
 * entries), the entry `mlcl setup` writes, and the Claude Code plugin's
 * `.mcp.json`. The server used to spawn `mlcl` from PATH only, so in a fresh
 * home `list_templates` and `search_packages` both answered "The mlcl CLI was
 * not found on PATH" (2026-11-21, a sandboxed fresh home with only
 * `npx -y molecule-mcp`), and an agent that meets that error writes the feature
 * by hand instead.
 *
 * The resolver tests pin the order (override, PATH, the published CLI through
 * npx) and that npx is asked for the binary once per process. The server test
 * runs the real tool with a PATH that holds only a stand-in `npx`, which hands
 * back a stand-in `mlcl`: the tool must answer with that CLI's output.
 *
 * @module
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { type CliResolverDeps, createCliResolver } from '../../../mcp/src/cli-command.js'

const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

/** Resolver dependencies with a fake filesystem and a recorded runner. */
function deps(options: {
  env?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
  files?: string[]
  probe?: string | null
}): CliResolverDeps & { runs: string[][] } {
  const runs: string[][] = []
  const files = new Set(options.files ?? [])
  return {
    runs,
    env: options.env ?? { PATH: '/usr/bin:/bin' },
    platform: options.platform ?? 'linux',
    exists: (file) => files.has(file),
    run: async (file, args) => {
      runs.push([file, ...args])
      return options.probe ?? null
    },
  }
}

describe('which mlcl the MCP server runs', () => {
  it('runs an explicit MOLECULE_MCP_CLI without looking further', async () => {
    const d = deps({ env: { MOLECULE_MCP_CLI: '/work/mlcl/bin/run.js', PATH: '/usr/bin' } })
    expect(await createCliResolver(d).command()).toEqual({
      file: '/work/mlcl/bin/run.js',
      prefix: [],
      source: 'override',
    })
    expect(d.runs).toEqual([])
  })

  it('runs a global mlcl from PATH without asking npx', async () => {
    const d = deps({ env: { PATH: '/opt/node/bin:/usr/bin' }, files: ['/opt/node/bin/mlcl'] })
    expect(await createCliResolver(d).command()).toEqual({
      file: 'mlcl',
      prefix: [],
      source: 'path',
    })
    expect(d.runs).toEqual([])
  })

  it('runs the published CLI from npx’s cache when none is installed, asking npx once', async () => {
    const cached = '/home/u/.npm/_npx/1822799d76ff4f47/node_modules/.bin/mlcl'
    const d = deps({ files: [cached], probe: `${cached}\n` })
    const resolver = createCliResolver(d)
    resolver.warm()
    const [first, second] = await Promise.all([resolver.command(), resolver.command()])
    expect(first).toEqual({ file: cached, prefix: [], source: 'npx' })
    expect(second).toEqual(first)
    expect(d.runs).toEqual([['npx', '--yes', '--package', 'mlcl@latest', '-c', 'command -v mlcl']])
  })

  it('runs each call through npx when the cached path cannot be read', async () => {
    for (const probe of [null, '', '/nowhere/mlcl']) {
      const command = await createCliResolver(deps({ probe })).command()
      expect(command, `probe answered ${JSON.stringify(probe)}`).toEqual({
        file: 'npx',
        prefix: ['--yes', 'mlcl@latest'],
        source: 'npx',
      })
    }
  })

  it('goes straight to per-call npx on Windows, where the shell probe cannot run', async () => {
    const d = deps({ platform: 'win32', env: { PATH: 'C:\\node' } })
    expect((await createCliResolver(d).command()).prefix).toEqual(['--yes', 'mlcl@latest'])
    expect(d.runs).toEqual([])
  })

  it('finds a global install on Windows by its .cmd shim', async () => {
    const d = deps({
      platform: 'win32',
      env: { Path: 'C:\\Windows;C:\\Users\\u\\AppData\\Roaming\\npm' },
      files: ['C:\\Users\\u\\AppData\\Roaming\\npm\\mlcl.cmd'],
    })
    expect((await createCliResolver(d).command()).source).toBe('path')
  })
})

/** A connected client over a fresh import of the server, after `env` is applied. */
async function connectServer(
  env: Record<string, string | undefined>,
): Promise<{ call: (name: string) => Promise<string[]>; close: () => Promise<void> }> {
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  vi.resetModules()
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'npx-fallback-test', version: '0.0.0' })
  await client.connect(clientTransport)
  return {
    call: async (name) => {
      const result = await client.callTool({ name, arguments: {} })
      const text = (result.content ?? [])
        .map((block: { text?: string }) => block.text ?? '')
        .join('\n')
      return [result.isError ? 'error' : 'ok', text]
    },
    close: () => client.close(),
  }
}

/** Write an executable stand-in script. */
function script(file: string, body: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `#!/bin/sh\n${body}\n`)
  chmodSync(file, 0o755)
}

/** A stand-in for the published CLI as npx caches it: answers `templates --json`. */
const fakeMlcl = (file: string, template: string): void =>
  script(file, `echo '{"templates":[{"name":"${template}"}]}'`)

describe('a CLI-backed tool on a machine with no global mlcl', () => {
  const saved = { PATH: process.env.PATH, MOLECULE_MCP_CLI: process.env.MOLECULE_MCP_CLI }
  const installed = existsSync(DEPS_MARKER)
  let dir = ''
  let server: Awaited<ReturnType<typeof connectServer>> | undefined

  beforeAll(async () => {
    if (!installed) {
      console.warn('[mcp-cli-npx-fallback] mcp/node_modules is not installed — SKIPPING.')
      return
    }
    dir = mkdtempSync(join(tmpdir(), 'mcp-npx-fallback-'))
    fakeMlcl(join(dir, 'cache-1', 'mlcl'), 'stand-in-template')
    writeFileSync(join(dir, 'where'), join(dir, 'cache-1', 'mlcl'))
    // npx: prints the cached binary's path for the probe (shell builtins only: PATH holds nothing else).
    script(
      join(dir, 'bin', 'npx'),
      `case "$*" in *"command -v mlcl"*) read -r p < "${join(dir, 'where')}"; echo "$p" ;; *) exit 9 ;; esac`,
    )
    process.env.DO_NOT_TRACK = '1'
    // Only the stand-in npx is reachable: no real mlcl, no real npx.
    server = await connectServer({ PATH: join(dir, 'bin'), MOLECULE_MCP_CLI: undefined })
  })

  afterAll(async () => {
    await server?.close()
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    delete process.env.DO_NOT_TRACK
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it.skipIf(!installed)(
    'answers list_templates with the CLI npx provides, not "not found"',
    async () => {
      const [status, text] = await server!.call('list_templates')
      expect(text).not.toMatch(/not found on PATH|could not be started/)
      expect(status).toBe('ok')
      expect(text).toContain('stand-in-template')
    },
  )

  it.skipIf(!installed)('asks npx again when the cache entry it resolved is removed', async () => {
    rmSync(join(dir, 'cache-1'), { recursive: true })
    fakeMlcl(join(dir, 'cache-2', 'mlcl'), 'reinstalled-template')
    writeFileSync(join(dir, 'where'), join(dir, 'cache-2', 'mlcl'))
    const [status, text] = await server!.call('list_templates')
    expect(status).toBe('ok')
    expect(text).toContain('reinstalled-template')
  })
})
