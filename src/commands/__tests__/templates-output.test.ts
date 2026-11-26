/**
 * `mlcl templates` is where a harness decides how a new app starts. Its header carries the
 * starting-point rules (a template only when one covers the core of the request, otherwise a
 * custom stack), because agents often read only the first lines of this long list (`| head -40`).
 * `mlcl templates <slug>` prints that template's catalog, the document the rules say to judge fit
 * on.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { format, stripVTControlCharacters } from 'node:util'

import { Config } from '@oclif/core'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { STARTING_POINT_LEAD, startingPointRules } from '../../lib/starting-point.js'
import Templates from '../templates.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let config: Config

beforeAll(async () => {
  config = await Config.load(MLCL_ROOT)
})

/** Run the real command and return what it printed, with terminal colours removed. */
async function run(argv: string[]): Promise<string> {
  let stdout = ''
  const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    stdout += `${format(...args)}\n`
  })
  try {
    await Templates.run(argv, config)
  } finally {
    log.mockRestore()
  }
  return stripVTControlCharacters(stdout)
}

describe('mlcl templates', () => {
  it('puts the starting-point rules in the lines an agent reads first', async () => {
    const rules = startingPointRules()
    const top = (await run([])).split('\n').slice(0, rules.length + 3)
    expect(top.join('\n')).toContain('npx mlcl create <name> --template <slug>')
    expect(top).toContain(STARTING_POINT_LEAD)
    for (const rule of rules) expect(top).toContain(`  • ${rule}`)
    expect(top.join('\n')).toMatch(
      /npx mlcl create <name> --type full-stack --framework react --packages .* --no-interactive/,
    )
    expect(top.join('\n')).not.toMatch(/closest template|None close/i)
  })

  it('prints a template catalog for a slug, then the command that scaffolds it', async () => {
    const out = await run(['online-store'])
    expect(out).toContain('## Data model')
    expect(out).toContain('## API surface (handlers)')
    expect(out).toContain('npx mlcl create <name> --template online-store --no-interactive')
  })

  it('returns the catalog in the JSON form too', async () => {
    const entry = JSON.parse(await run(['online-store', '--json'])) as {
      slug: string
      catalog: string | null
      packages: string[]
      create: string
    }
    expect(entry.slug).toBe('online-store')
    expect(entry.catalog).toContain('## Data model')
    expect(entry.packages.length).toBeGreaterThan(0)
    expect(entry.create).toBe('npx mlcl create <name> --template online-store --no-interactive')
  })

  it('refuses a slug that is not a template, including an inherited object key', async () => {
    await expect(run(['no-such-template'])).rejects.toThrow(/No template "no-such-template"/)
    await expect(run(['constructor'])).rejects.toThrow(/No template "constructor"/)
  })

  // The list is read before every new app: as JSON it was 49 KB (each slug repeated as a label and
  // a create command), and the text form gave each template a second line for its label.
  it('lists each template on one line: its slug and its description (OLD MUSTFAIL)', async () => {
    const registry = JSON.parse(
      readFileSync(join(MLCL_ROOT, 'templates', 'apps', 'registry.json'), 'utf8'),
    ) as { templates: Record<string, { label?: string; description?: string; type?: string }> }
    const lines = (await run([])).split('\n')
    const listed = lines.filter((line) => /^ {2}[a-z0-9-]+ +\S/.test(line))
    expect(listed).toHaveLength(Object.keys(registry.templates).length)
    for (const [slug, entry] of Object.entries(registry.templates)) {
      const line = listed.find((candidate) => candidate.trimStart().startsWith(`${slug} `))
      expect(line, slug).toContain(entry.description ?? '')
      if (entry.type && entry.type !== 'full-stack') expect(line).toContain(`(${entry.type})`)
      else expect(line).not.toContain('(full-stack)')
    }
    // No line holds a label alone, as the old second line per template did.
    expect(lines.some((line) => line.trim() === '3D Model Viewer (full-stack)')).toBe(false)
  })

  it('keeps the JSON listing to template entries', async () => {
    const entries = JSON.parse(await run(['--json'])) as { slug: string; create: string }[]
    expect(entries.length).toBeGreaterThan(0)
    for (const { create, slug } of entries) {
      expect(create).toBe(`npx mlcl create my-app --template ${slug} --no-interactive`)
    }
  })

  it('gives the same runnable command to an MCP list_templates caller', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mlcl-mcp-templates-'))
    const cli = join(dir, 'cli.mjs')
    const moduleUrl = pathToFileURL(join(MLCL_ROOT, 'src', 'commands', 'templates.ts')).href
    const tsx = import.meta.resolve('tsx/esm/api')
    writeFileSync(
      cli,
      '#!/usr/bin/env node\n' +
        `import { register } from ${JSON.stringify(tsx)}\n` +
        'register()\n' +
        `const { default: Templates } = await import(${JSON.stringify(moduleUrl)})\n` +
        `await Templates.run(process.argv.slice(3), ${JSON.stringify(MLCL_ROOT)})\n`,
      { mode: 0o755 },
    )
    vi.stubEnv('MOLECULE_MCP_CLI', cli)
    vi.stubEnv('DO_NOT_TRACK', '1')
    const sdk = join(
      MLCL_ROOT,
      'mcp',
      'node_modules',
      '@modelcontextprotocol',
      'sdk',
      'dist',
      'esm',
    )
    try {
      const { moleculeServer } = await import('../../../mcp/src/server.js')
      const { Client } = await import(join(sdk, 'client', 'index.js'))
      const { InMemoryTransport } = await import(join(sdk, 'inMemory.js'))
      const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
      await moleculeServer.connect(serverSide)
      const client = new Client({ name: 'templates-test', version: '0.0.0' })
      try {
        await client.connect(clientSide)
        const reply = await client.callTool({ name: 'list_templates', arguments: {} })
        expect(reply.isError).toBeFalsy()
        expect(reply.content).toEqual([
          {
            type: 'text',
            text: expect.stringContaining('npx mlcl create <name> --template <slug>'),
          },
        ])
      } finally {
        await client.close()
        await moleculeServer.close()
      }
    } finally {
      vi.unstubAllEnvs()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
