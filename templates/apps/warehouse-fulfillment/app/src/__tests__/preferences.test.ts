import { describe, expect, it } from 'vitest'

import { resolveDefaultCarrier } from '../lib/preferences.js'

// The Settings "Default carrier" preference (oauthData.warehousePrefs.defaultCarrier) was persisted
// and displayed, but the new-shipment form hardcoded 'usps'. resolveDefaultCarrier is the shared
// reader that seeds the carrier now; it defaults to 'usps' and rejects unknown carrier values.
describe('resolveDefaultCarrier', () => {
  it('defaults to usps when the user, blob, or preference is absent', () => {
    expect(resolveDefaultCarrier(null)).toBe('usps')
    expect(resolveDefaultCarrier(undefined)).toBe('usps')
    expect(resolveDefaultCarrier({})).toBe('usps')
    expect(resolveDefaultCarrier({ oauthData: {} })).toBe('usps')
    expect(resolveDefaultCarrier({ oauthData: { warehousePrefs: {} } })).toBe('usps')
  })

  it('honors a stored known carrier', () => {
    expect(
      resolveDefaultCarrier({ oauthData: { warehousePrefs: { defaultCarrier: 'fedex' } } }),
    ).toBe('fedex')
    expect(
      resolveDefaultCarrier({ oauthData: { warehousePrefs: { defaultCarrier: 'dhl' } } }),
    ).toBe('dhl')
  })

  it('falls back to usps for an unknown carrier value', () => {
    expect(
      resolveDefaultCarrier({ oauthData: { warehousePrefs: { defaultCarrier: 'pigeon' } } }),
    ).toBe('usps')
  })
})
