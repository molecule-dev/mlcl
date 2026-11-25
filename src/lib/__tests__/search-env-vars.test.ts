/**
 * A search hit names the environment variables its package reads. Asked which email package to use
 * and how to send one, Codex searched, then read the provider's README only for those names: one
 * more tool call than answering needed (harness eval `find`, 2026-11-24).
 */
import { describe, expect, it } from 'vitest'

import { toSearchEntry } from '../../commands/search.js'
import { envVarsOf, searchPackages, type SearchSourceEntry } from '../package-search.js'
import { getRawRegistry, loadRegistry } from '../registry.js'

const rawEntries = (): SearchSourceEntry[] =>
  Object.entries(getRawRegistry().packages).map(([name, entry]) => ({ ...entry, name }))

describe('search hits name the environment variables', () => {
  it('lists a provider’s variables, optional ones marked (OLD MUSTFAIL)', () => {
    const hit = searchPackages(rawEntries(), 'resend', { limit: 5 }).find(
      (candidate) => candidate.name === '@molecule/api-emails-resend',
    )
    expect(hit?.envVars).toEqual(['RESEND_API_KEY', 'RESEND_FROM (optional)'])
  })

  it('gives the CLI the same names as the MCP servers', async () => {
    const packages = await loadRegistry()
    const entries = packages.map((pkg) => toSearchEntry(pkg))
    const fromCli = searchPackages(entries, 'resend', { limit: 5 })
    const fromRaw = searchPackages(rawEntries(), 'resend', { limit: 5 })
    expect(fromCli.map((hit) => hit.envVars)).toEqual(fromRaw.map((hit) => hit.envVars))
  })

  it('counterexample: a core that reads none carries no envVars field', () => {
    const hit = searchPackages(rawEntries(), 'transactional email', { limit: 10 }).find(
      (candidate) => candidate.name === '@molecule/api-emails',
    )
    expect(hit).toBeDefined()
    expect(hit).not.toHaveProperty('envVars')
  })

  it('skips a malformed secret instead of throwing', () => {
    expect(envVarsOf([{ name: 'A' }, { name: 3 }, {}, { name: 'B', required: false }])).toEqual([
      'A',
      'B (optional)',
    ])
    expect(envVarsOf(undefined)).toEqual([])
  })
})
