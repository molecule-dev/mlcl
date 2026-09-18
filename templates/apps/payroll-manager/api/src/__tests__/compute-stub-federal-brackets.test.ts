import { describe, expect, it } from 'vitest'

import { computeStub, type FederalBracket } from '../handlers/_seed.js'

// Federal tax was a flat FEDERAL_RATE (0.18) — the employee's tax_filing_status and
// the seeded IRS tax_brackets were never consumed, so married vs single at the same
// salary withheld identically. computeStub now applies the progressive filing-status
// schedule (annualize the taxable wage → progressive brackets → back to per-period).

// IRS-2025 brackets from the seed (0010 migration).
const SINGLE: FederalBracket[] = [
  { min_income: 0, max_income: 11925, rate: 0.1 },
  { min_income: 11925, max_income: 48475, rate: 0.12 },
  { min_income: 48475, max_income: 103350, rate: 0.22 },
  { min_income: 103350, max_income: 197300, rate: 0.24 },
  { min_income: 197300, max_income: 250525, rate: 0.32 },
  { min_income: 250525, max_income: 626350, rate: 0.35 },
  { min_income: 626350, max_income: null, rate: 0.37 },
]
const MARRIED: FederalBracket[] = [
  { min_income: 0, max_income: 23850, rate: 0.1 },
  { min_income: 23850, max_income: 96950, rate: 0.12 },
  { min_income: 96950, max_income: 206700, rate: 0.22 },
  { min_income: 206700, max_income: 394600, rate: 0.24 },
  { min_income: 394600, max_income: 501050, rate: 0.32 },
  { min_income: 501050, max_income: 751600, rate: 0.35 },
  { min_income: 751600, max_income: null, rate: 0.37 },
]

describe('computeStub applies progressive federal brackets by filing status', () => {
  it('single filer at $100k/yr weekly withholds the progressive amount, not flat 18%', () => {
    // annual tax = 11925*.10 + 36550*.12 + 51525*.22 = 16914 → /52 = 325.27
    const m = computeStub(100000, 'weekly', [], SINGLE)
    expect(m.federal_tax).toBeCloseTo(325.27, 2)
  })

  it('married filer at the same salary withholds less — filing status matters', () => {
    const single = computeStub(100000, 'weekly', [], SINGLE)
    const married = computeStub(100000, 'weekly', [], MARRIED)
    // married annual = 23850*.10 + 73100*.12 + 3050*.22 = 11828 → /52 = 227.46
    expect(married.federal_tax).toBeCloseTo(227.46, 2)
    expect(married.federal_tax).toBeLessThan(single.federal_tax)
  })

  it('falls back to the flat rate when no bracket schedule is supplied', () => {
    // 100000/52 * 0.18 = 346.15 (backward-compatible with the demo seed path)
    const m = computeStub(100000, 'weekly', [])
    expect(m.federal_tax).toBeCloseTo(346.15, 2)
  })

  it('an income entirely in the first bracket taxes at that marginal rate only', () => {
    // salary 10400/yr weekly → 200/period → annual 10400, all in the 10% band
    const m = computeStub(10400, 'weekly', [], SINGLE)
    expect(m.federal_tax).toBeCloseTo(20, 2) // 10400*.10 / 52 = 20
  })
})
