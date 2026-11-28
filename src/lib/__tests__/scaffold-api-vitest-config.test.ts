/**
 * The custom `mlcl create` API skeleton wrote no `vitest.config.ts`, while every flagship API carries
 * one. Vitest then takes the nearest config ABOVE the project: in a repo whose root has a vitest
 * config, the project's `npm test` ran that repo's suites instead of its own (the workspace's
 * scaffold gate, 2026-11-27, ran `scripts/__tests__` from a scaffolded API). Pins the skeleton's
 * config to the flagships' so the two cannot drift.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { createApiProject } from '../scaffold.js'

const TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'templates',
  'apps',
)

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('scaffolded API vitest config', () => {
  it('the api skeleton writes the vitest config most flagship APIs carry', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-api-vitest-'))
    await createApiProject(dir, 'demo-api')
    const scaffolded = await readFile(join(dir, 'vitest.config.ts'), 'utf-8')

    const counts = new Map<string, number>()
    for (const name of readdirSync(TEMPLATES_DIR)) {
      let config: string
      try {
        config = readFileSync(join(TEMPLATES_DIR, name, 'api', 'vitest.config.ts'), 'utf-8')
      } catch (_error) {
        continue // A template without an API.
      }
      counts.set(config, (counts.get(config) ?? 0) + 1)
    }
    const [common] = [...counts].sort((a, b) => b[1] - a[1])[0]!
    expect(scaffolded).toBe(common)
  })

  // A `beforeAll` that creates the server and migrates does a test's work. Tests had 30 s and hooks
  // vitest's 10 s default, so an agent's server hook timed out under `mlcl check`'s parallel steps
  // (harness smoke run 4, 2026-11-28) while the same tests passed once fewer steps ran.
  it('gives hooks the time it gives tests, in the skeleton and every flagship API', async () => {
    for (const [name, config] of await apiVitestConfigs()) {
      const test = /testTimeout:\s*([\d_]+)/.exec(config)?.[1]
      expect(test, `${name} sets a test timeout`).toBeDefined()
      expect(/hookTimeout:\s*([\d_]+)/.exec(config)?.[1], `${name} hook timeout`).toBe(test)
    }
  })

  // The API's `tsc` build compiles src/__tests__ into dist/, and vitest 4's default exclude is only
  // node_modules and .git, so after a build `npm test` ran every test twice, once compiled (harness
  // smoke run 4, 2026-11-28: "Test Files 6 passed (6)" for an API with three).
  it('leaves the build output out of the test run, in the skeleton and every flagship API', async () => {
    for (const [name, config] of await apiVitestConfigs())
      expect(config, `${name} excludes dist`).toContain(
        "exclude: [...configDefaults.exclude, '**/dist/**']",
      )
  })
})

/**
 * Read the API vitest config a custom scaffold writes and every flagship API's.
 *
 * @returns Each config with the name of what carries it.
 */
async function apiVitestConfigs(): Promise<[string, string][]> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-api-vitest-'))
  await createApiProject(dir, 'demo-api')
  const configs: [string, string][] = [
    ['the api skeleton', await readFile(join(dir, 'vitest.config.ts'), 'utf-8')],
  ]
  for (const name of readdirSync(TEMPLATES_DIR)) {
    try {
      configs.push([
        name,
        readFileSync(join(TEMPLATES_DIR, name, 'api', 'vitest.config.ts'), 'utf-8'),
      ])
    } catch (_error) {
      continue // A template without an API.
    }
  }
  expect(configs.length).toBeGreaterThan(100)
  return configs
}
