/**
 * Each query binding's recipe, which the generated AGENTS.md quotes under "Configuration by API
 * shape", names the three states a list renders outside its items. It said "with status/error
 * outside the item list", and in harness smoke run 4 (2026-11-28) claude-molecule rendered the
 * error and empty states of all three lists and no loading state.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { getRawRegistry } from '../registry.js'

const BINDINGS = ['angular', 'react', 'solid', 'svelte', 'vue'] as const

describe('query recipes', () => {
  it.each(BINDINGS)('@molecule/app-query-%s names the loading, error and empty states', (name) => {
    const recipe =
      getRawRegistry().packages[`@molecule/app-query-${name}`]?.decisionGuide?.configuration?.[0]
    expect(recipe).toBeDefined()
    expect(recipe).toContain(`role="status" line while its status is 'idle' or 'loading'`)
    expect(recipe).toContain(`role="alert" line when it is 'error'`)
    expect(recipe).toContain('the empty state when the list is empty')
  })
})
