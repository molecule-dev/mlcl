import { describe, expect, it } from 'vitest'

import { pickInitialSort, SORTS } from '../lib/feed-sort.js'

// The Feed page hardcoded 'hot' as the initial sort, ignoring the user's saved "Default sort"
// (Settings -> Feed preferences, served by GET /users/me/settings). pickInitialSort reads it.
describe('pickInitialSort', () => {
  it('returns the saved defaultSort when valid', () => {
    for (const s of SORTS) {
      expect(pickInitialSort({ feed: { defaultSort: s } })).toBe(s)
    }
  })

  it('unwraps the { data } envelope', () => {
    expect(pickInitialSort({ data: { feed: { defaultSort: 'top' } } })).toBe('top')
    expect(pickInitialSort({ data: { feed: { defaultSort: 'new' } } })).toBe('new')
  })

  it("falls back to 'hot' when the pref is unset, invalid, or the shape is unexpected", () => {
    expect(pickInitialSort({ feed: {} })).toBe('hot')
    expect(pickInitialSort({ feed: { defaultSort: 'controversial' } })).toBe('hot')
    expect(pickInitialSort({ feed: { defaultSort: 42 } })).toBe('hot')
    expect(pickInitialSort({})).toBe('hot')
    expect(pickInitialSort(null)).toBe('hot')
    expect(pickInitialSort(undefined)).toBe('hot')
    expect(pickInitialSort('nope')).toBe('hot')
  })
})
