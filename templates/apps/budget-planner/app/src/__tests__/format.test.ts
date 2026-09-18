import { describe, expect, it } from 'vitest'

import { formatDate, formatMoney } from '../lib/format.js'

// Every money formatter across the app previously hardcoded `$`, ignoring the
// stored preferences.currency. formatMoney is the shared, currency-aware helper
// they now delegate to. (Assertions target the numeric/sign structure so they
// hold regardless of the runtime's default locale.)

describe('formatMoney', () => {
  it('formats USD cents with grouping + 2 decimals by default', () => {
    const out = formatMoney(123456, 'USD')
    expect(out).toContain('1,234.56')
    expect(out).toContain('$')
  })

  it('honors grouping: false (the toFixed-style formatters)', () => {
    expect(formatMoney(123456, 'USD', { grouping: false })).toContain('1234.56')
  })

  it('honors fractionDigits: 0 (whole-dollar cards)', () => {
    const out = formatMoney(123456, 'USD', { fractionDigits: 0 })
    expect(out).toContain('1,235') // rounds
    expect(out).not.toContain('.')
  })

  it('renders the chosen non-USD currency, not $', () => {
    const eur = formatMoney(100000, 'EUR')
    expect(eur).toMatch(/€|EUR/)
    expect(eur).not.toContain('$')
    const gbp = formatMoney(100000, 'GBP')
    expect(gbp).toMatch(/£|GBP/)
  })

  it('shows a minus for negatives, no plus by default', () => {
    expect(formatMoney(-500, 'USD')).toMatch(/-/)
    expect(formatMoney(500, 'USD')).not.toContain('+')
  })

  it('shows a leading + for positives when signed', () => {
    expect(formatMoney(500, 'USD', { signed: true })).toContain('+')
    expect(formatMoney(-500, 'USD', { signed: true })).toMatch(/-/)
  })

  it('falls back to a plain number for an invalid currency code (no throw)', () => {
    const out = formatMoney(500, 'NOTACURRENCY')
    expect(out).toContain('5.00')
  })
})

// The Settings "Date format" preference (free-text, e.g. MMM d, yyyy) was stored
// but every full-date display hardcoded its toLocaleDateString options. formatDate
// renders an ISO date per the token pattern so the preference takes effect. Dates
// are built via the local Date constructor so the assertions are timezone-stable.
describe('formatDate', () => {
  const iso = new Date(2025, 2, 3, 12, 0, 0).toISOString() // Mar 3, 2025, local noon

  it('renders the default "MMM d, yyyy" pattern (matches the prior output)', () => {
    expect(formatDate(iso, 'MMM d, yyyy')).toBe('Mar 3, 2025')
  })

  it('supports numeric day/month/year patterns', () => {
    expect(formatDate(iso, 'MM/dd/yyyy')).toBe('03/03/2025')
    expect(formatDate(iso, 'dd/MM/yyyy')).toBe('03/03/2025')
    expect(formatDate(iso, 'yyyy-MM-dd')).toBe('2025-03-03')
    expect(formatDate(iso, 'M/d/yy')).toBe('3/3/25')
  })

  it('supports the full month name', () => {
    const dec = new Date(2025, 11, 25, 12, 0, 0).toISOString()
    expect(formatDate(dec, 'MMMM d, yyyy')).toBe('December 25, 2025')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not-a-date', 'MMM d, yyyy')).toBe('')
  })
})
