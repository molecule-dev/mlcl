import { describe, expect, it } from 'vitest'

import { computeStub } from '../handlers/_seed.js'

// The deductions resource (pre/post-tax benefits + garnishments) was inert: computeStub hardcoded
// deductions_total = 0, so every stub showed $0 deductions and overstated net pay. computeStub now
// applies the employee's deductions — pre-tax lowers the income-tax base, all reduce net.
// gross = 130000 / 26 = 5000; rates: fed .18, state .05, fica .062, medicare .0145.

describe('computeStub applies employee deductions', () => {
  it('with no deductions: deductions_total 0, taxes on gross (backward compatible)', () => {
    const m = computeStub(130000, 'biweekly')
    expect(m.gross).toBe(5000)
    expect(m.federal_tax).toBe(900)
    expect(m.state_tax).toBe(250)
    expect(m.deductions_total).toBe(0)
    expect(m.net).toBe(3467.5)
  })

  it('a post-tax fixed deduction reduces net but not taxes', () => {
    const m = computeStub(130000, 'biweekly', [
      { amount: 200, is_percentage: false, is_pretax: false },
    ])
    expect(m.federal_tax).toBe(900) // still on gross
    expect(m.deductions_total).toBe(200)
    expect(m.net).toBe(3267.5) // 3467.5 - 200
  })

  it('a pre-tax fixed deduction lowers the income-tax base (fed/state) but not FICA/Medicare', () => {
    const m = computeStub(130000, 'biweekly', [
      { amount: 500, is_percentage: false, is_pretax: true },
    ])
    expect(m.federal_tax).toBe(810) // 4500 * .18
    expect(m.state_tax).toBe(225) // 4500 * .05
    expect(m.fica).toBe(310) // still on gross
    expect(m.medicare).toBe(72.5) // still on gross
    expect(m.deductions_total).toBe(500)
    expect(m.net).toBe(3082.5) // 5000 - 810 - 225 - 310 - 72.5 - 500
  })

  it('a percentage deduction is computed off gross', () => {
    const m = computeStub(130000, 'biweekly', [
      { amount: 10, is_percentage: true, is_pretax: true },
    ])
    expect(m.deductions_total).toBe(500) // 10% of 5000
  })
})
