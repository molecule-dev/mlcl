import { describe, expect, it } from 'vitest'

import { buildCapabilityMap, renderCapabilityMap } from '../capability-map.js'
import { searchPackages } from '../package-search.js'
import { getRawRegistry } from '../registry.js'

const registry = getRawRegistry()
const entries = Object.entries(registry.packages).map(([name, entry]) => ({ name, ...entry }))

describe('server-backed action capability discovery', () => {
  it.each(['favorite unfavorite button', 'watch unwatch button'])(
    'finds the two-label UI for %s',
    (query) => {
      const hits = searchPackages(entries, query, {
        stack: 'app',
        framework: 'react',
        appFrameworks: registry.appFrameworks,
        limit: 3,
      })
      const ui = hits.find((hit) => hit.name === '@molecule/app-ui-react')
      expect(ui, JSON.stringify(hits)).toBeDefined()
      expect(ui?.configuration?.join('\n')).toContain('OptimisticToggleButton')
    },
  )

  it('finds the existing resource method for a follow/unfollow API client', () => {
    const hits = searchPackages(entries, 'follow unfollow API client', {
      stack: 'app',
      framework: 'react',
      appFrameworks: registry.appFrameworks,
      limit: 3,
    })
    const resource = hits.find((hit) => hit.name === '@molecule/app-query')
    expect(resource, JSON.stringify(hits)).toBeDefined()
    expect(resource?.configuration?.join('\n')).toContain('.toggle(')
  })

  it('puts the declared APIs beside a non-X1 equipment project before local implementation', () => {
    const text = renderCapabilityMap(
      buildCapabilityMap(registry, [
        { name: '@molecule/app-query', workspace: 'app' },
        { name: '@molecule/app-ui-react', workspace: 'app' },
      ]),
    )
    for (const symbol of [
      'createQueryResource',
      '.toggle(',
      'OptimisticToggleButton',
      'activeLabel',
      'inactiveLabel',
    ]) {
      expect(text).toContain(symbol)
    }
  })

  it('leaves local-only controls and undeclared resource APIs out of the capability map', () => {
    const text = renderCapabilityMap(buildCapabilityMap(registry, ['@molecule/app-routing']))
    expect(text).not.toContain('OptimisticToggleButton')
    expect(text).not.toContain('createQueryResource')
  })
})
