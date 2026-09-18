import { describe, expect, it } from 'vitest'

import { computeStub } from '../handlers/_seed.js'

// The tax_withholdings resource (W-4 allowances, additional withholding, exempt) was inert: the
// pay-run process never loaded it and computeStub had no withholding param, so an exempt employee
// still had full federal tax withheld and allowance/extra settings did nothing. computeStub now
// applies the config. gross = 130000 / 26 = 5000; flat rates fed .18, state .05, fica .062,
// medicare .0145; each allowance excludes 4300 of ANNUAL wages (4300 / 26 = 165.3846 per period).

describe('computeStub applies W-4 tax withholdings', () => {
  it('with no withholding config: full federal tax (backward compatible)', () => {
    const m = computeStub(130000, 'biweekly')
    expect(m.federal_tax).toBe(900) // 5000 * .18
    expect(m.state_tax).toBe(250)
    expect(m.net).toBe(3467.5)
  })

  it('exempt withholds no federal income tax (FICA/Medicare/state unchanged)', () => {
    const m = computeStub(130000, 'biweekly', [], [], { exempt: true })
    expect(m.federal_tax).toBe(0)
    expect(m.state_tax).toBe(250)
    expect(m.fica).toBe(310)
    expect(m.medicare).toBe(72.5)
    expect(m.net).toBe(4367.5) // 5000 - 0 - 250 - 310 - 72.5
  })

  it('additional_withholding adds a flat amount to federal tax every period', () => {
    const m = computeStub(130000, 'biweekly', [], [], { additional_withholding: 100 })
    expect(m.federal_tax).toBe(1000) // 900 + 100
    expect(m.net).toBe(3367.5) // 5000 - 1000 - 250 - 310 - 72.5
  })

  it('federal_allowances reduce the federal taxable base', () => {
    const m = computeStub(130000, 'biweekly', [], [], { federal_allowances: 1 })
    expect(m.federal_tax).toBe(870.23) // (5000 - 4300/26) * .18
    expect(m.state_tax).toBe(250) // state base unaffected by federal allowances
  })

  it('state_allowances reduce the state taxable base independently', () => {
    const m = computeStub(130000, 'biweekly', [], [], { state_allowances: 2 })
    expect(m.state_tax).toBe(233.46) // (5000 - 8600/26) * .05
    expect(m.federal_tax).toBe(900) // federal base unaffected by state allowances
  })

  it('exempt overrides additional_withholding (no federal tax at all)', () => {
    const m = computeStub(130000, 'biweekly', [], [], { exempt: true, additional_withholding: 100 })
    expect(m.federal_tax).toBe(0)
  })
})
