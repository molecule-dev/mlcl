// @vitest-environment node
/**
 * The stdio server's `search_packages` runs in its own process over the registry file of the CLI
 * it runs, and answers exactly what `mlcl search --json` prints.
 *
 * It used to spawn `mlcl search --json` for every call: about 0.8 s of CLI start-up at a load
 * average of 19, for a search that takes about 40 ms in process (2026-11-23). These cases pin the
 * three things the change must keep: which registry file is read (the CLI's own, or none, so the
 * tool spawns the CLI as before), byte-identical output to the CLI over the real registry, and the
 * real server taking the in-process path without starting the CLI.
 *
 * @module
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { format } from 'node:util'

import { Config } from '@oclif/core'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { CliCommand } from '../../../mcp/src/cli-command.js'
import {
  type CliRegistryDeps,
  cliRegistryPath,
  searchLocalRegistry,
} from '../../../mcp/src/local-search.js'
import type * as Remote from '../../../mcp/src/remote.js'
import Search from '../../commands/search.js'
import { clearRegistryCache } from '../registry.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const REGISTRY = join(MLCL_ROOT, 'registry.json')
const MCP_DIR = join(MLCL_ROOT, 'mcp')
const SDK_ESM = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm')
const DEPS_MARKER = join(MCP_DIR, 'node_modules', 'execa', 'package.json')

const dirs: string[] = []
const oldRegistryPath = process.env.MLCL_REGISTRY_PATH
let config: Config

beforeAll(async () => {
  delete process.env.MLCL_REGISTRY_PATH
  process.env.DO_NOT_TRACK = '1'
  clearRegistryCache()
  config = await Config.load(MLCL_ROOT)
})

afterEach(() => {
  vi.resetModules()
})

afterAll(() => {
  delete process.env.MOLECULE_MCP_CLI
  delete process.env.DO_NOT_TRACK
  if (oldRegistryPath !== undefined) process.env.MLCL_REGISTRY_PATH = oldRegistryPath
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A fake filesystem: `files` maps each path to its text, `links` each symlink to its target. */
function fakeDeps(
  files: Record<string, string>,
  links: Record<string, string> = {},
  env: NodeJS.ProcessEnv = {},
): CliRegistryDeps {
  return {
    env,
    exists: (file) => file in files || file in links,
    realpath: (file) => links[file] ?? file,
    readFile: (file) => {
      if (!(file in files)) throw new Error(`ENOENT ${file}`)
      return files[file]
    },
  }
}

const MLCL_MANIFEST = JSON.stringify({ name: 'mlcl', version: '2.0.0' })

describe('the registry file the stdio server searches', () => {
  it('is the registry inside the npx-cached mlcl package its bin links into', () => {
    const bin = '/home/u/.npm/_npx/abc/node_modules/.bin/mlcl'
    const root = '/home/u/.npm/_npx/abc/node_modules/mlcl'
    const deps = fakeDeps(
      {
        [`${root}/bin/run.js`]: '',
        [`${root}/package.json`]: MLCL_MANIFEST,
        [`${root}/registry.json`]: '{}',
      },
      { [bin]: `${root}/bin/run.js` },
    )
    const cli: CliCommand = { file: bin, prefix: [], source: 'npx' }
    expect(cliRegistryPath(cli, deps)).toBe(`${root}/registry.json`)
  })

  it('follows a global mlcl through the PATH entry the resolver found', () => {
    const root = '/usr/lib/node_modules/mlcl'
    const deps = fakeDeps(
      {
        [`${root}/bin/run.js`]: '',
        [`${root}/package.json`]: MLCL_MANIFEST,
        [`${root}/registry.json`]: '{}',
      },
      { '/usr/bin/mlcl': `${root}/bin/run.js` },
    )
    const cli: CliCommand = { file: 'mlcl', prefix: [], source: 'path', path: '/usr/bin/mlcl' }
    expect(cliRegistryPath(cli, deps)).toBe(`${root}/registry.json`)
  })

  it('reads MLCL_REGISTRY_PATH when the CLI would, and only for a real mlcl', () => {
    const root = '/work/mlcl'
    const files = {
      [`${root}/bin/run.js`]: '',
      [`${root}/package.json`]: MLCL_MANIFEST,
      [`${root}/registry.json`]: '{}',
      '/alt/registry.json': '{}',
    }
    const deps = fakeDeps(files, {}, { MLCL_REGISTRY_PATH: '/alt/registry.json' })
    const cli: CliCommand = { file: `${root}/bin/run.js`, prefix: [], source: 'override' }
    expect(cliRegistryPath(cli, deps)).toBe('/alt/registry.json')
  })

  it('is none for a wrapper script, the per-call npx form or a missing file, so the CLI runs', () => {
    const deps = fakeDeps({
      '/tmp/x/fake-mlcl.mjs': '',
      '/tmp/x/package.json': JSON.stringify({ name: 'some-app' }),
      '/tmp/y/fake-mlcl.mjs': '',
    })
    const override = (file: string): CliCommand => ({ file, prefix: [], source: 'override' })
    expect(cliRegistryPath(override('/tmp/x/fake-mlcl.mjs'), deps)).toBeUndefined()
    expect(cliRegistryPath(override('/tmp/y/fake-mlcl.mjs'), deps)).toBeUndefined()
    expect(cliRegistryPath(override('/nowhere/mlcl'), deps)).toBeUndefined()
    expect(
      cliRegistryPath({ file: 'npx', prefix: ['--yes', 'mlcl'], source: 'npx' }, deps),
    ).toBeUndefined()
  })
})

/** What the real `mlcl search <argv> --json` command prints, run in process. */
async function cliJson(argv: string[]): Promise<string> {
  let out = ''
  const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    out += `${format(...args)}\n`
  })
  try {
    await Search.run([...argv, '--json'], config)
  } finally {
    log.mockRestore()
  }
  return out.trimEnd()
}

describe('the in-process search over the real registry', () => {
  it.each([
    { query: 'file uploads' },
    { query: 'payments', stack: 'api' as const },
    { query: 'auth', framework: 'vue' },
    { query: 'useProfileForm' },
    { query: 'email', limit: 50 },
    { query: 'chat', framework: 'react-native-web' },
    { query: 'i18n default react' },
  ])('prints what mlcl search --json prints: %j', async (input) => {
    const argv = [input.query]
    if (input.stack) argv.push('--stack', input.stack)
    if (input.framework) argv.push('--framework', input.framework)
    if (input.limit) argv.push('--limit', String(input.limit))
    const empty = mkdtempSync(join(tmpdir(), 'mlcl-local-search-'))
    dirs.push(empty)
    expect(searchLocalRegistry(REGISTRY, input, empty)).toBe(await cliJson(argv))
  })

  it("reads the default framework from the project's app manifest", async () => {
    const project = mkdtempSync(join(tmpdir(), 'mlcl-local-search-'))
    dirs.push(project)
    mkdirSync(join(project, 'app'))
    writeFileSync(
      join(project, 'app', 'package.json'),
      JSON.stringify({ name: 'app', molecule: { framework: 'vue' } }),
    )
    expect(searchLocalRegistry(REGISTRY, { query: 'auth' }, project)).toBe(
      await cliJson(['auth', '--framework', 'vue']),
    )
  })

  it('refuses a framework the registry does not list, with the CLI’s message', () => {
    expect(() =>
      searchLocalRegistry(REGISTRY, { query: 'auth', framework: 'qwik' }, tmpdir()),
    ).toThrow(/^Unknown framework "qwik"\. Known: react, /)
  })
})

/**
 * A stand-in mlcl package: its bin prints `marker` as one hit, so a spawned CLI is visible in the
 * tool's answer. `name` is its package.json name; only `mlcl` is the CLI's own package.
 */
function standIn(name: string, marker: string): string {
  const root = mkdtempSync(join(tmpdir(), 'mlcl-local-search-cli-'))
  dirs.push(root)
  mkdirSync(join(root, 'bin'))
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name, version: '0.0.0' }))
  writeFileSync(
    join(root, 'registry.json'),
    JSON.stringify({
      packages: {
        '@molecule/api-uploads': {
          stack: 'api',
          category: 'uploads',
          label: 'Uploads',
          description: 'file uploads',
        },
      },
      appFrameworks: { react: {} },
    }),
  )
  const bin = join(root, 'bin', 'run.js')
  writeFileSync(bin, `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(marker)})\n`)
  chmodSync(bin, 0o755)
  return bin
}

/**
 * Start the real stdio server on a CLI and call `search_packages` once, from `cwd` (an empty
 * directory by default), with npm's README reader replaced by `npmReadme`.
 */
async function searchThroughServer(
  cli: string,
  query: string,
  { cwd = emptyDir(), npmReadme = async (): Promise<string | undefined> => undefined } = {},
): Promise<string> {
  process.env.MOLECULE_MCP_CLI = cli
  vi.resetModules()
  vi.doMock('../../../mcp/src/remote.js', async (importOriginal) => ({
    ...(await importOriginal<typeof Remote>()),
    fetchPackageReadme: npmReadme,
  }))
  const before = process.cwd()
  process.chdir(cwd)
  const { moleculeServer } = await import('../../../mcp/src/server.js')
  const { Client } = await import(join(SDK_ESM, 'client', 'index.js'))
  const { InMemoryTransport } = await import(join(SDK_ESM, 'inMemory.js'))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await moleculeServer.connect(serverTransport)
  const client = new Client({ name: 'local-search-test', version: '0.0.0' })
  await client.connect(clientTransport)
  try {
    const result = (await client.callTool({ name: 'search_packages', arguments: { query } })) as {
      content?: Array<{ text?: string }>
    }
    return (result.content ?? []).map((block) => block.text ?? '').join('\n')
  } finally {
    await client.close()
    process.chdir(before)
    vi.doUnmock('../../../mcp/src/remote.js')
  }
}

/** A new empty directory, removed after the run. */
function emptyDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-local-search-cwd-'))
  dirs.push(dir)
  return dir
}

describe('the stdio search_packages tool', () => {
  it('searches the CLI package’s registry without starting the CLI', async (ctx) => {
    if (!existsSync(DEPS_MARKER)) return ctx.skip()
    const bin = standIn('mlcl', 'SPAWNED')
    const answer = await searchThroughServer(bin, 'file uploads')
    expect(answer).not.toContain('SPAWNED')
    expect(JSON.parse(answer)).toEqual([
      {
        name: '@molecule/api-uploads',
        stack: 'api',
        category: 'uploads',
        label: 'Uploads',
        description: 'file uploads',
        install: 'npx mlcl add @molecule/api-uploads --inject',
      },
    ])
  })

  it('gives the first hits their Quick Start, from the installed README or npm (OLD MUSTFAIL)', async (ctx) => {
    if (!existsSync(DEPS_MARKER)) return ctx.skip()
    const bin = standIn('mlcl', 'SPAWNED')
    const quickStart = "import { receiveUploads } from '@molecule/api-uploads'"
    const readme = `# @molecule/api-uploads\n\n## Quick Start\n\n\`\`\`ts\n${quickStart}\n\`\`\`\n`
    const project = emptyDir()
    mkdirSync(join(project, 'node_modules', '@molecule', 'api-uploads'), { recursive: true })
    writeFileSync(join(project, 'node_modules', '@molecule', 'api-uploads', 'README.md'), readme)
    const installed = await searchThroughServer(bin, 'file uploads', { cwd: project })
    expect(JSON.parse(installed)[0].quickStart).toBe(quickStart)
    const asked: string[] = []
    const fromNpm = await searchThroughServer(bin, 'file uploads', {
      npmReadme: async (short: string) => (asked.push(short), readme),
    })
    expect(asked).toEqual(['api-uploads'])
    expect(JSON.parse(fromNpm)[0].quickStart).toBe(quickStart)
  })

  it('starts the CLI when the command is not an mlcl package', async (ctx) => {
    if (!existsSync(DEPS_MARKER)) return ctx.skip()
    const bin = standIn('wrapper', 'SPAWNED')
    expect(await searchThroughServer(bin, 'file uploads')).toBe('SPAWNED')
  })
})
