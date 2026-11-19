import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { describe, expect, it } from 'vitest'

import { searchPackages } from '../../lib/package-search.js'
import { getRawRegistry } from '../../lib/registry.js'
import SyncRegistry from '../sync-registry.js'

const registry = getRawRegistry()
const entries = Object.entries(registry.packages).map(([name, entry]) => ({ name, ...entry }))
const searchOptions = {
  stack: 'app',
  framework: 'react',
  appFrameworks: registry.appFrameworks,
  limit: 10,
} as const

describe('authored registry intent hints', () => {
  it('passes the same intent-hint validation CI runs', async () => {
    const config = await Config.load(join(import.meta.dirname, '..', '..', '..'))
    await expect(SyncRegistry.run(['--check-intent-hints'], config)).resolves.toBeUndefined()
  })

  // The release moves a pending declaration into `packages` once npm serves it, so a hint it
  // breaks must be caught before that release, not during it.
  it('holds a declaration awaiting its first release to the same rules (OLD MUSTFAIL: passed)', async () => {
    const config = await Config.load(join(import.meta.dirname, '..', '..', '..'))
    const dir = mkdtempSync(join(tmpdir(), 'pending-hints-'))
    const check = (intentHints: string[]): Promise<unknown> => {
      const fixture = structuredClone(registry)
      fixture.pendingPackages = {
        ...fixture.pendingPackages,
        '@molecule/app-pending-fixture-vue': {
          ...registry.packages['@molecule/app-tag-input-react'],
          intentHints,
        },
      }
      const path = join(dir, `registry-${intentHints.length}.json`)
      writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`)
      process.env.MLCL_REGISTRY_PATH = path
      return SyncRegistry.run(['--check-intent-hints'], config)
    }
    const hints = Array.from({ length: 9 }, (_, i) => `pending fixture hint ${'abcdefghi'[i]}`)
    try {
      await expect(check(hints)).rejects.toThrow(/EEXIT: 1/)
      // Counterexample: the same declaration within the cap passes.
      await expect(check(hints.slice(0, 8))).resolves.toBeUndefined()
    } finally {
      delete process.env.MLCL_REGISTRY_PATH
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it.each([
    ['follow unfollow API client', '@molecule/app-query'],
    ['favorite unfavorite API client', '@molecule/app-query'],
    ['tags input', '@molecule/app-tag-input-react'],
    ['tag input', '@molecule/app-tag-input-react'],
    ['add tags', '@molecule/app-tag-input-react'],
    ['labels input', '@molecule/app-tag-input-react'],
    ['keywords input', '@molecule/app-tag-input-react'],
    ['chip input', '@molecule/app-tag-input-react'],
    ['token input', '@molecule/app-tag-input-react'],
    ['tag editor', '@molecule/app-tag-input-react'],
    ['display tags', '@molecule/app-tag-input-react'],
    ['saved tags', '@molecule/app-tag-input-react'],
    ['show saved tags on the record detail', '@molecule/app-tag-input-react'],
    ['read-only tags', '@molecule/app-tag-input-react'],
    ['modal dialog', '@molecule/app-ui-react'],
    ['toast notification', '@molecule/app-ui-react'],
    ['alert banner', '@molecule/app-ui-react'],
    ['toggle switch', '@molecule/app-ui-react'],
    ['protected route', '@molecule/app-ui-react'],
    ['auth route guard', '@molecule/app-ui-react'],
    ['authenticated route', '@molecule/app-ui-react'],
    ['protect routes', '@molecule/app-ui-react'],
    ['protect admin and billing routes', '@molecule/app-ui-react'],
    ['protected billing route', '@molecule/app-ui-react'],
    ['favorite unfavorite button', '@molecule/app-ui-react'],
    ['watch unwatch button', '@molecule/app-ui-react'],
    ['stateful action label', '@molecule/app-ui-react'],
  ])('finds %s in the registry', (query, expected) => {
    const hits = searchPackages(entries, query, searchOptions)
    expect(hits.map((hit) => hit.name)).toContain(expected)
  })
})
