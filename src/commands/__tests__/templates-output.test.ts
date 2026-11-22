/**
 * `mlcl templates` without `--json`: the header names the custom-stack scaffold as well as the
 * template one. Agents often read only the first lines of this long list (`| head -40`), and one
 * that finds no close template must still learn that a new app starts with a scaffold rather than
 * a hand-built project.
 */
import { join } from 'node:path'
import { format } from 'node:util'

import { Config } from '@oclif/core'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import Templates from '../templates.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let config: Config

beforeAll(async () => {
  config = await Config.load(MLCL_ROOT)
})

/** Run the real command and return what it printed. */
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
  return stdout
}

describe('mlcl templates', () => {
  it('names both scaffolds in the first lines of the list', async () => {
    const top = (await run([])).split('\n').slice(0, 4).join('\n')
    expect(top).toContain('mlcl create <name> --template <slug>')
    expect(top).toMatch(
      /None close\? Scaffold a custom stack:.*mlcl create <name> --type full-stack --framework react --packages .* --no-interactive/,
    )
  })

  it('keeps the JSON listing to template entries', async () => {
    const entries = JSON.parse(await run(['--json'])) as { slug: string; create: string }[]
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every((entry) => entry.create.includes(`--template ${entry.slug}`))).toBe(true)
  })
})
