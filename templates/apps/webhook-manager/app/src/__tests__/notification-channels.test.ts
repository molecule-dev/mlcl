import { describe, expect, it } from 'vitest'

import { CHANNEL_DEFS, resolveChannelPrefs } from '../lib/notification-channels.js'

// The Settings page saves the per-channel toggles into
// preferences.notification_channels, but hydrate used to read them from a
// separate top-level `notification_prefs` column that nothing ever wrote — so
// every saved toggle reverted to its default on reload. resolveChannelPrefs
// now reads back from the SAME key it is saved under.

const defaults = Object.fromEntries(CHANNEL_DEFS.map((c) => [c.id, c.defaultEnabled]))

describe('resolveChannelPrefs', () => {
  it('falls back to the channel defaults when nothing is stored', () => {
    expect(resolveChannelPrefs(undefined)).toEqual(defaults)
    expect(resolveChannelPrefs({})).toEqual(defaults)
    expect(resolveChannelPrefs({ workspace: { region: 'eu-west' } })).toEqual(defaults)
  })

  it('reads saved toggles back from preferences.notification_channels (the save key)', () => {
    // exactly the shape save() writes: preferences = { ...prefs, notification_channels }
    const preferences = { notification_channels: { email: false, webhook: true } }
    const resolved = resolveChannelPrefs(preferences)
    expect(resolved.email).toBe(false) // explicit false preserved, not defaulted to true
    expect(resolved.webhook).toBe(true) // explicit true over the false default
    // untouched channels keep their defaults
    expect(resolved.slack).toBe(true)
    expect(resolved.pagerduty).toBe(true)
  })

  it('ignores the vestigial notification_prefs shape (proves the read key changed)', () => {
    // A value under the OLD wrong location must NOT be read.
    const resolved = resolveChannelPrefs({ notification_prefs: { email: false } })
    expect(resolved.email).toBe(true) // still the default — old key is not consulted
  })

  it('parses a JSON string (JSONB may arrive unparsed from the API)', () => {
    const resolved = resolveChannelPrefs(
      JSON.stringify({ notification_channels: { pagerduty: false } }),
    )
    expect(resolved.pagerduty).toBe(false)
    expect(resolved.email).toBe(true)
  })
})
