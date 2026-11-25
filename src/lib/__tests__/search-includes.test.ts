/**
 * A search hit says what one add of it also installs: a provider's interface, or an interface's
 * default provider. Both hits printed their own add command, and on the CLI path Claude ran one add
 * for `@molecule/api-uploads` and another for `@molecule/api-uploads-filesystem`, the second a no-op
 * (harness eval `add`, 2026-11-25: every CLI-path run).
 */
import { describe, expect, it } from 'vitest'

import { toSearchEntry } from '../../commands/search.js'
import {
  type SearchHit,
  searchPackages,
  searchResultsJson,
  type SearchSourceEntry,
} from '../package-search.js'
import { getRawRegistry, loadRegistry } from '../registry.js'

const rawEntries = (): SearchSourceEntry[] =>
  Object.entries(getRawRegistry().packages).map(([name, entry]) => ({ ...entry, name }))

const hitOf = (entries: SearchSourceEntry[], query: string, name: string): SearchHit | undefined =>
  searchPackages(entries, query, { stack: 'api', limit: 20 }).find((hit) => hit.name === name)

describe('search hits say what one add includes', () => {
  it('a provider includes the interface it implements (OLD MUSTFAIL)', () => {
    const hit = hitOf(rawEntries(), 'file uploads', '@molecule/api-uploads-filesystem')
    expect(hit?.includes).toMatch(/^@molecule\/api-uploads, its interface .*one add installs both/)
  })

  it('an interface includes its default provider (OLD MUSTFAIL)', () => {
    const hit = hitOf(rawEntries(), 'file uploads', '@molecule/api-uploads')
    expect(hit?.includes).toMatch(
      /^@molecule\/api-uploads-filesystem, its default provider, unless the project has a provider/,
    )
  })

  it('the CLI and the MCP servers say the same', () => {
    const fromCli = searchPackages(loadRegistry().map(toSearchEntry), 'file uploads', {
      stack: 'api',
      limit: 10,
    })
    const fromRaw = searchPackages(rawEntries(), 'file uploads', { stack: 'api', limit: 10 })
    expect(fromCli.map((hit) => hit.includes)).toEqual(fromRaw.map((hit) => hit.includes))
  })

  it('the JSON puts includes after the install command', () => {
    const [hit] = JSON.parse(
      searchResultsJson(searchPackages(rawEntries(), 'resend', { stack: 'api', limit: 1 })),
    ) as Record<string, unknown>[]
    const keys = Object.keys(hit)
    expect(keys.indexOf('includes')).toBe(keys.indexOf('install') + 1)
  })

  it('counterexample: an interface with no default provider includes nothing', () => {
    const hit = hitOf(rawEntries(), 'transactional email', '@molecule/api-emails')
    expect(hit).toBeDefined()
    expect(hit).not.toHaveProperty('includes')
  })

  it('counterexample: a provider that does not declare its interface claims nothing', () => {
    const entries: SearchSourceEntry[] = [
      {
        name: '@molecule/api-widgets-acme',
        stack: 'api',
        type: 'provider',
        implements: '@molecule/api-widgets',
        moleculePeers: ['@molecule/api-bond'],
        label: 'Acme widgets',
        description: 'Widgets from Acme',
      },
    ]
    expect(hitOf(entries, 'acme widgets', '@molecule/api-widgets-acme')).not.toHaveProperty(
      'includes',
    )
  })
})
