import { describe, expect, it } from 'vitest'

import { nextBillingDate } from '../handlers/subscriptions.js'

// The dashboard advertises each plan as `Every {interval_count} {interval}`, but nextBillingDate
// ignored interval_count — so a "every 2 months" plan scheduled the next box 1 month out. It now
// multiplies the interval by the count. (month=30d, quarter=91d, year=365d in this model.)

const daysOut = (iso: string): number =>
  Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)

describe('nextBillingDate honors interval_count', () => {
  it('defaults to one interval when count is omitted', () => {
    expect(daysOut(nextBillingDate('month'))).toBe(30)
    expect(daysOut(nextBillingDate('quarter'))).toBe(91)
    expect(daysOut(nextBillingDate('year'))).toBe(365)
  })

  it('multiplies the interval by the count', () => {
    expect(daysOut(nextBillingDate('month', 2))).toBe(60)
    expect(daysOut(nextBillingDate('month', 3))).toBe(90)
    expect(daysOut(nextBillingDate('quarter', 2))).toBe(182)
  })

  it('clamps a bad count to at least one interval', () => {
    expect(daysOut(nextBillingDate('month', 0))).toBe(30)
    expect(daysOut(nextBillingDate('month', Number.NaN))).toBe(30)
  })
})
