/**
 * `mlcl templates` is where a harness decides how a new app starts. Its header carries the
 * starting-point rules (a template only when one covers the core of the request, otherwise a
 * custom stack), because agents often read only the first lines of this long list (`| head -40`).
 * `mlcl templates <slug>` prints that template's catalog, the document the rules say to judge fit
 * on.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
    const rules = startingPointRules('mlcl')
    const top = (await run([])).split('\n').slice(0, rules.length + 3)
    expect(top.join('\n')).toContain('mlcl create <name> --template <slug>')
    expect(top).toContain(STARTING_POINT_LEAD)
    for (const rule of rules) expect(top).toContain(`  • ${rule}`)
    expect(top.join('\n')).toMatch(
      /mlcl create <name> --type full-stack --framework react --packages .* --no-interactive/,
    )
    expect(top.join('\n')).not.toMatch(/closest template|None close/i)
  })

  it('prints a template catalog for a slug, then the command that scaffolds it', async () => {
    const out = await run(['online-store'])
    expect(out).toContain('## Data model')
    expect(out).toContain('## API surface (handlers)')
    expect(out).toContain('mlcl create <name> --template online-store --no-interactive')
  })

  it('returns the catalog in the JSON form too', async () => {
    const entry = JSON.parse(await run(['online-store', '--json'])) as {
      slug: string
      catalog: string | null
      packages: string[]
    }
    expect(entry.slug).toBe('online-store')
    expect(entry.catalog).toContain('## Data model')
    expect(entry.packages.length).toBeGreaterThan(0)
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
    expect(entries.every((entry) => entry.create.includes(`--template ${entry.slug}`))).toBe(true)
  })
})
