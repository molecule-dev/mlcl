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
