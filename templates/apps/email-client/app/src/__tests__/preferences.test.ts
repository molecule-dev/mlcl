import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_PREFS, PREFS_KEY, readPrefs, withSignature } from '../lib/preferences.js'

// The saved signature (Settings → Signatures) was persisted to localStorage but Compose never
// appended it to the message body. withSignature is the pure composition helper Compose now uses;
// readPrefs is the shared reader (also used by Settings) so both read the same key + shape.

const REPLY_QUOTE = '\n\nOn Jan 1, Alice wrote:\n> hello'

describe('withSignature', () => {
  it('returns the base body unchanged when no signature is set', () => {
    expect(withSignature('', '')).toBe('')
    expect(withSignature(REPLY_QUOTE, '   ')).toBe(REPLY_QUOTE)
  })

  it('seeds a brand-new (empty) body with the signature below the cursor', () => {
    expect(withSignature('', 'Jane Doe\nAcme')).toBe('\n\nJane Doe\nAcme')
  })

  it('places the signature above a quoted reply/forward block', () => {
    // [your text] → signature → quoted original
    expect(withSignature(REPLY_QUOTE, 'Jane Doe')).toBe(`\n\nJane Doe${REPLY_QUOTE}`)
  })

  it('trims surrounding whitespace from the signature', () => {
    expect(withSignature('', '  Jane Doe  ')).toBe('\n\nJane Doe')
  })
})

describe('readPrefs', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const setStore = (store: Record<string, string> | null) => {
    if (store === null) {
      Reflect.deleteProperty(globalThis as object, 'localStorage')
      return
    }
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (k: string) => store[k] ?? null, setItem: () => {} },
    })
  }
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis as object, 'localStorage')
  })

  it('falls back to defaults when unset or unavailable', () => {
    setStore(null)
    expect(readPrefs()).toEqual(DEFAULT_PREFS)
    setStore({})
    expect(readPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('merges the stored blob over the defaults', () => {
    setStore({ [PREFS_KEY]: JSON.stringify({ signature: 'Jane Doe' }) })
    expect(readPrefs().signature).toBe('Jane Doe')
    expect(readPrefs().preview).toBe(DEFAULT_PREFS.preview) // untouched default preserved
  })

  it('falls back to defaults on corrupted JSON', () => {
    setStore({ [PREFS_KEY]: '{not json' })
    expect(readPrefs()).toEqual(DEFAULT_PREFS)
  })

  // The inbox reads `preview` (show the inline reading pane) and `compact` (thread-row density)
  // from here — both were persisted + shown in Settings but ignored by the always-on two-pane
  // layout until wired up. Lock the reader contract those consumers depend on.
  it('defaults preview on and compact off', () => {
    setStore({})
    expect(readPrefs().preview).toBe(true)
    expect(readPrefs().compact).toBe(false)
  })

  it('reads back the stored preview + compact reading-view prefs', () => {
    setStore({ [PREFS_KEY]: JSON.stringify({ preview: false, compact: true }) })
    const prefs = readPrefs()
    expect(prefs.preview).toBe(false)
    expect(prefs.compact).toBe(true)
  })
})
