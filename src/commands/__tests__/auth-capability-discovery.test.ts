/** Real-command coverage for discovering the already-shared React AuthGuard. */
import { join } from 'node:path'
import { format } from 'node:util'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache, getRawRegistry } from '../../lib/registry.js'
import Search from '../search.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const AUTH_GUARD_OWNER = '@molecule/app-ui-react'
const ROUTING_OWNER = '@molecule/app-routing-react-router'

interface Hit {
  name: string
  stack: 'api' | 'app'
}

let config: Config
let output = ''
let restoreStreams: () => void = () => {}

/** Run the actual oclif command and parse its public JSON DTO. */
async function runJson(query: string, stack?: 'api' | 'app'): Promise<Hit[]> {
  output = ''
  const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    output += `${format(...args)}\n`
  })
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  restoreStreams = () => {
    log.mockRestore()
    error.mockRestore()
  }
  try {
    await Search.run([query, ...(stack ? ['--stack', stack] : []), '--json'], config)
  } finally {
    restoreStreams()
    restoreStreams = () => {}
  }
  const start = output.indexOf('[')
  expect(start, `search printed no JSON array: ${output}`).toBeGreaterThanOrEqual(0)
  return JSON.parse(output.slice(start)) as Hit[]
}

beforeAll(async () => {
  config = await Config.load(MLCL_ROOT)
})

afterEach(() => {
  restoreStreams()
  clearRegistryCache()
})

describe('mlcl search discovers the existing AuthGuard capability', () => {
  it.each([
    'protected route',
    'auth route guard',
    'protected admin route',
    'protected billing route',
    'protect admin and billing routes',
  ])('returns the shared owner for %s', async (query) => {
    const hits = await runJson(query, 'app')
    expect(hits.map((hit) => hit.name)).toContain(AUTH_GUARD_OWNER)
  })

  it('preserves exact-symbol, public-routing, and declared-stack counterexamples', async () => {
    // An exact symbol returns exactly the app packages that export it: React's, plus every
    // framework UI bond that has reached parity with it, and nothing fuzzier.
    const exporters = Object.entries(getRawRegistry().packages)
      .filter(([, entry]) => entry.stack === 'app' && (entry.exports ?? []).includes('AuthGuard'))
      .map(([name]) => name)
    expect(exporters).toContain(AUTH_GUARD_OWNER)
    expect((await runJson('AuthGuard', 'app')).map((hit) => hit.name).sort()).toEqual(
      exporters.sort(),
    )

    const publicHits = await runJson('public route', 'app')
    expect(publicHits.map((hit) => hit.name)).toContain(ROUTING_OWNER)
    expect(publicHits.every((hit) => hit.stack === 'app')).toBe(true)

    expect((await runJson('protected route', 'api')).map((hit) => hit.name)).not.toContain(
      AUTH_GUARD_OWNER,
    )
  })
})
