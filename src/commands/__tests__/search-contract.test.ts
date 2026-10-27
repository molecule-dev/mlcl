/**
 * Command-level contract for `mlcl search` — the discovery surface the stdio
 * MCP forwards verbatim (`search_packages` → `search <q> --json --stack …`).
 *
 * These run the REAL oclif command against a throwaway registry, because the
 * defects this pins live in the OUTPUT CONTRACT and its ordering:
 *
 *  - `--stack` must be applied BEFORE ranking/truncation. On a crowded query
 *    the limit window is otherwise spent on the other stack's packages and a
 *    same-stack match that genuinely scored (here one api package among 25
 *    higher-scoring app packages) silently disappears;
 *  - every hit must carry `label` (the hosted MCP used to omit it, so a
 *    consumer reading `hit.label` got `undefined` over one transport);
 *  - exact-name queries still resolve to that package first.
 *
 * The hosted transport is compared against the same registry in
 * `src/lib/__tests__/mcp-search-relevance.test.ts`.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { format } from 'node:util'

import { Config } from '@oclif/core'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache } from '../../lib/registry.js'
import Search from '../search.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** Number of higher-scoring app packages that fill the default limit window. */
const APP_CROWD = 25
/** The one genuinely-matching api package the crowd would push past the cutoff. */
const API_TARGET = '@molecule/api-form-schema'

/** A registry entry that satisfies the loader's schema. */
function entry(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    language: 'typescript',
    runtime: 'node',
    type: 'feature',
    exports: [],
    secrets: [],
    intentHints: [],
    ...overrides,
  }
}

/**
 * A registry where "form" matches 25 app packages plus one api package.
 *
 * The app packages score 40 each (name + category + description + label +
 * hint). The api package scores 20 — only its name contains the token — so it
 * ranks last, exactly the shape a filter-after-truncation bug drops.
 */
function crowdedRegistry(): { version: number; packages: Record<string, unknown> } {
  const packages: Record<string, unknown> = {}
  for (let i = 0; i < APP_CROWD; i += 1) {
    const suffix = String(i).padStart(2, '0')
    packages[`@molecule/app-form-widget-${suffix}`] = entry({
      stack: 'app',
      category: 'forms',
      label: `Form Widget ${i}`,
      description: 'form widget for building forms',
      path: `packages/app/features/form-widget-${i}`,
      intentHints: ['form builder', 'form widget'],
    })
  }
  packages[API_TARGET] = entry({
    stack: 'api',
    category: 'validation',
    label: 'Schema',
    description: 'schema validation helpers',
    path: 'packages/api/features/form-schema',
    intentHints: [],
  })
  return { version: 1, packages }
}

let dir: string
let registryFile: string
let config: Config
let stdout = ''
let stderr = ''
let restoreStreams: () => void = () => {}
const oldRegistryPath = process.env.MLCL_REGISTRY_PATH
const oldOptOut = process.env.DO_NOT_TRACK

/** oclif writes stdout through `console.log`; capture it per call. */
function captureStreams(): void {
  const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    stdout += `${format(...args)}\n`
  })
  const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    stderr += `${format(...args)}\n`
  })
  restoreStreams = () => {
    log.mockRestore()
    error.mockRestore()
  }
}

interface Hit {
  name: string
  stack: 'api' | 'app'
  category: string
  label: string
  description: string
  install: string
}

/** Run the real command and parse its `--json` array. */
async function runJson(argv: string[]): Promise<Hit[]> {
  stdout = ''
  stderr = ''
  captureStreams()
  try {
    await Search.run([...argv, '--json'], config)
  } finally {
    restoreStreams()
  }
  const start = stdout.indexOf('[')
  expect(start, `search printed no JSON array:\n${stdout}\n${stderr}`).toBeGreaterThanOrEqual(0)
  return JSON.parse(stdout.slice(start)) as Hit[]
}

beforeAll(async () => {
  config = await Config.load(MLCL_ROOT)
})

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-search-contract-'))
  registryFile = join(dir, 'registry.json')
  writeFileSync(registryFile, JSON.stringify(crowdedRegistry()))
  process.env.MLCL_REGISTRY_PATH = registryFile
  process.env.DO_NOT_TRACK = '1'
  clearRegistryCache()
})

afterEach(() => {
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

afterAll(() => {
  if (oldRegistryPath === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = oldRegistryPath
  if (oldOptOut === undefined) delete process.env.DO_NOT_TRACK
  else process.env.DO_NOT_TRACK = oldOptOut
})

describe('mlcl search — discovery contract the stdio MCP forwards', () => {
  it('applies --stack before ranking/truncation on a crowded query', async () => {
    // Unfiltered countercase: the api package genuinely matches, but 25
    // higher-scoring app packages claim the default 20-result window.
    const unfiltered = await runJson(['form'])
    expect(unfiltered).toHaveLength(20)
    expect(unfiltered.map((hit) => hit.name)).not.toContain(API_TARGET)
    expect(unfiltered.every((hit) => hit.stack === 'app')).toBe(true)

    // Filtering first means the same query restricted to api KEEPS its match.
    const api = await runJson(['form', '--stack', 'api'])
    expect(api.map((hit) => hit.name)).toEqual([API_TARGET])
    expect(api[0].stack).toBe('api')
  })

  it('returns the shared DTO — including label — and no internal score', async () => {
    const hits = await runJson(['form', '--stack', 'api'])
    expect(hits).toHaveLength(1)
    const [hit] = hits
    expect(hit).toMatchObject({
      name: API_TARGET,
      stack: 'api',
      category: 'validation',
      label: 'Schema',
      description: 'schema validation helpers',
      install: `mlcl add ${API_TARGET} --inject`,
    })
    expect(Object.keys(hit).sort()).toEqual(
      ['category', 'description', 'install', 'label', 'name', 'stack'].sort(),
    )
  })

  it('respects --limit after the stack filter', async () => {
    expect(await runJson(['form', '--stack', 'app', '--limit', '1'])).toHaveLength(1)
    expect(await runJson(['form', '--stack', 'app', '--limit', '5'])).toHaveLength(5)
  })

  it('keeps exact-name results first (and only)', async () => {
    const hits = await runJson([API_TARGET])
    expect(hits.map((hit) => hit.name)).toEqual([API_TARGET])
    expect(hits[0].label).toBe('Schema')
  })

  it('refuses an unsupported stack instead of returning the wrong stack', async () => {
    stdout = ''
    stderr = ''
    captureStreams()
    try {
      await expect(Search.run(['form', '--stack', 'web'], config)).rejects.toThrow(/api|app/)
    } finally {
      restoreStreams()
    }
  })

  it('refuses an empty query', async () => {
    stdout = ''
    stderr = ''
    captureStreams()
    try {
      await expect(Search.run(['   '], config)).rejects.toThrow(/Provide a search query/)
    } finally {
      restoreStreams()
    }
  })
})
