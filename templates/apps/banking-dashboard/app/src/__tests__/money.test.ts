import { describe, expect, it } from 'vitest'

import { formatMoney } from '../lib/money.js'

// Each account row carries its own `currency`, but the per-account displays hardcoded a `$`/USD
// formatter, so a non-USD account showed the wrong symbol. formatMoney reads the account's currency.

describe('formatMoney', () => {
  it('defaults to USD when no currency is given', () => {
    expect(formatMoney(123456)).toBe('$1,234.56')
    expect(formatMoney(500)).toBe('$5.00')
  })

  it('renders the given currency symbol', () => {
    expect(formatMoney(500, 'EUR')).toBe('€5.00')
    expect(formatMoney(500, 'GBP')).toBe('£5.00')
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
  })

  it('keeps the sign for negative balances', () => {
    expect(formatMoney(-1250, 'GBP')).toBe('-£12.50')
    expect(formatMoney(-123456)).toBe('-$1,234.56')
  })

  it('degrades gracefully for an invalid currency code', () => {
    // A malformed code makes Intl throw; we fall back to "<code> <amount>" rather than crash.
    expect(formatMoney(500, 'US')).toBe('US 5.00')
    expect(formatMoney(-500, 'BADCODE')).toBe('-BADCODE 5.00')
  })
})
