import { describe, expect, it } from 'vitest'

import { shouldEncryptEntry } from '../lib/encryption-pref.js'

// The entry write path used to encrypt whenever the AES provider was bonded, ignoring the user's
// privacy.encryption preference (default on) — so toggling encryption off did nothing, and plaintext
// was stored even while encrypting. shouldEncryptEntry gates encryption on both the provider AND the
// preference; callers store the body encrypted XOR plaintext based on it.

describe('shouldEncryptEntry', () => {
  it('never encrypts when the provider is not bonded', () => {
    expect(shouldEncryptEntry({ privacy: { encryption: true } }, false)).toBe(false)
    expect(shouldEncryptEntry({}, false)).toBe(false)
    expect(shouldEncryptEntry(null, false)).toBe(false)
  })

  it('encrypts by default when bonded and the preference is unset', () => {
    expect(shouldEncryptEntry(undefined, true)).toBe(true)
    expect(shouldEncryptEntry(null, true)).toBe(true)
    expect(shouldEncryptEntry({}, true)).toBe(true)
    expect(shouldEncryptEntry({ privacy: {} }, true)).toBe(true)
  })

  it('encrypts when bonded and the preference is explicitly on', () => {
    expect(shouldEncryptEntry({ privacy: { encryption: true } }, true)).toBe(true)
  })

  it('does not encrypt when the user turned encryption off (even if bonded)', () => {
    expect(shouldEncryptEntry({ privacy: { encryption: false } }, true)).toBe(false)
  })
})
