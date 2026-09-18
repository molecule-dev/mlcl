import { beforeEach, describe, expect, it } from 'vitest'

import { resolveTaxRate } from '../lib/tax.js'

// The admin "Tax Rate (%)" field (oauthData.adminSettings.tax.taxRate) was
// ignored — checkout charged a flat env/8%. resolveTaxRate is the shared helper
// the cart total (display) and the order total (charge) now both use.

beforeEach(() => {
  delete process.env.STORE_TAX_RATE
})

describe('resolveTaxRate', () => {
  it('reads the admin tax rate (a percent) as a fraction', () => {
    expect(
      resolveTaxRate({ oauthData: { adminSettings: { tax: { taxRate: 8.25 } } } }),
    ).toBeCloseTo(0.0825, 6)
  })

  it('parses a JSON-string oauthData (JSONB round-trips as text)', () => {
    const owner = { oauthData: JSON.stringify({ adminSettings: { tax: { taxRate: 20 } } }) }
    expect(resolveTaxRate(owner)).toBeCloseTo(0.2, 6)
  })

  it('preserves a valid 0% rate rather than treating it as unset', () => {
    expect(resolveTaxRate({ oauthData: { adminSettings: { tax: { taxRate: 0 } } } })).toBe(0)
  })

  it('falls back to 8% when the owner is unknown or has no configured rate', () => {
    expect(resolveTaxRate(null)).toBe(0.08)
    expect(resolveTaxRate({ oauthData: {} })).toBe(0.08)
    expect(resolveTaxRate({ oauthData: { adminSettings: { tax: {} } } })).toBe(0.08)
    expect(resolveTaxRate({ oauthData: 'not-json' })).toBe(0.08)
  })

  it('honors the STORE_TAX_RATE env as the fallback', () => {
    process.env.STORE_TAX_RATE = '0.05'
    expect(resolveTaxRate(null)).toBe(0.05)
  })
})
