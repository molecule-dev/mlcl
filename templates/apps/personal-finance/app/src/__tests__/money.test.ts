import { describe, expect, it } from 'vitest'

import { formatMoney } from '../lib/money.js'

// Per-account surfaces (the account-detail balance + its transaction rows) hardcoded USD and dropped
// the account's stored currency. formatMoney is the shared reader they use now — the account's own
// currency, USD only as a fallback.
describe('formatMoney', () => {
  it('formats in the given currency', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatMoney(1234.5, 'EUR')).toBe('€1,234.50')
    expect(formatMoney(1234.5, 'GBP')).toBe('£1,234.50')
  })

  it('defaults to USD when the code is missing', () => {
    expect(formatMoney(10, undefined)).toBe('$10.00')
    expect(formatMoney(10, null)).toBe('$10.00')
    expect(formatMoney(10, '')).toBe('$10.00')
    expect(formatMoney(10, '   ')).toBe('$10.00')
  })

  it('falls back to USD for an unknown/invalid currency code', () => {
    expect(formatMoney(10, 'NOTACODE')).toBe('$10.00')
  })
})
