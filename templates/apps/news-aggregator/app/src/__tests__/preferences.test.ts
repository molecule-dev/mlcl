import { describe, expect, it } from 'vitest'

import { resolveShowBiasMeters } from '../lib/preferences.js'

// The "Show bias meters" toggle persists showBiasMeters into oauthData.preferences, but the story
// list rendered the bias meter unconditionally. resolveShowBiasMeters is the shared reader the feed
// pages now consult; it defaults to true (meters shown) so the meter only hides when explicitly off.
describe('resolveShowBiasMeters', () => {
  it('defaults to true when the user, blob, or key is absent', () => {
    expect(resolveShowBiasMeters(null)).toBe(true)
    expect(resolveShowBiasMeters(undefined)).toBe(true)
    expect(resolveShowBiasMeters({})).toBe(true)
    expect(resolveShowBiasMeters({ oauthData: {} })).toBe(true)
    expect(resolveShowBiasMeters({ oauthData: { preferences: {} } })).toBe(true)
  })

  it('honors the stored preference when set', () => {
    expect(resolveShowBiasMeters({ oauthData: { preferences: { showBiasMeters: false } } })).toBe(
      false,
    )
    expect(resolveShowBiasMeters({ oauthData: { preferences: { showBiasMeters: true } } })).toBe(
      true,
    )
  })
})
