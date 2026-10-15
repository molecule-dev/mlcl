/**
 * `resolveTransitivePeers` holds back a transitive PROVIDER peer whose core
 * the selection already provides. `@molecule/api-bonds-default-express`
 * peers on every default provider it re-exports, so a selection that chose
 * SQLite also gained Postgres — and the scaffold then wired BOTH database
 * bonds, the last setup call winning the pool while the platform's env still
 * advertised a Postgres `DATABASE_URL` (X0 run xr-molecule-flash-m23: the
 * agent spent ~3 of its 25 minutes deciding which database was real). Runs
 * against the real registry.
 */
import { describe, expect, it } from 'vitest'

import { resolveTransitivePeers } from '../features.js'
import { loadRegistry } from '../registry.js'

const registry = loadRegistry()

describe('resolveTransitivePeers and duplicate providers', () => {
  it('adds no second database provider to a selection that already has one', () => {
    const peers = resolveTransitivePeers(
      ['@molecule/api-bonds-default-express', '@molecule/api-database-sqlite'],
      registry,
    )
    expect(peers).not.toContain('@molecule/api-database-postgresql')
  })

  it('dedups the same overlap for search and uploads', () => {
    const peers = resolveTransitivePeers(
      [
        '@molecule/api-bonds-default-express',
        '@molecule/api-search-meilisearch',
        '@molecule/api-uploads-s3',
      ],
      registry,
    )
    expect(peers).not.toContain('@molecule/api-search-postgres')
    expect(peers).not.toContain('@molecule/api-uploads-filesystem')
  })

  it('still adds a provider peer when the core has no provider yet', () => {
    const peers = resolveTransitivePeers(['@molecule/api-bonds-default-express'], registry)
    // The aggregate's own default database — nothing else provides the core.
    expect(peers).toContain('@molecule/api-database-postgresql')
  })

  it('keeps framework bindings flowing (they implement a core but are not bonds)', () => {
    const peers = resolveTransitivePeers(['@molecule/app-achievement-card-react'], registry)
    expect(peers).toContain('@molecule/app-ui-react')
  })
})
