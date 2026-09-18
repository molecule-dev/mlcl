import { describe, expect, it } from 'vitest'

import { DEFAULT_PREFERENCES, parsePreferences } from '../lib/preferences.js'

// Settings persists signature + defaultTone (localStorage), but Compose ignored them (hardcoded
// tone 'persuasive', never appended the signature). parsePreferences is the shared reader all three
// pages now use.

describe('parsePreferences', () => {
  it('returns defaults for null / empty / corrupted input', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('{not json')).toEqual(DEFAULT_PREFERENCES)
  })

  it('reads the stored signature and defaultTone', () => {
    const raw = JSON.stringify({ signature: 'Jane Doe\nAcme', defaultTone: 'formal' })
    const prefs = parsePreferences(raw)
    expect(prefs.signature).toBe('Jane Doe\nAcme')
    expect(prefs.defaultTone).toBe('formal')
  })

  it('fills missing fields with defaults (partial blob)', () => {
    const prefs = parsePreferences(JSON.stringify({ defaultTone: 'warm' }))
    expect(prefs.defaultTone).toBe('warm')
    expect(prefs.signature).toBe(DEFAULT_PREFERENCES.signature)
    expect(prefs.autoSummarize).toBe(DEFAULT_PREFERENCES.autoSummarize)
  })
})
