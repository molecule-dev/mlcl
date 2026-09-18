import { describe, expect, it } from 'vitest'

import { dosingDaysPerWeek, parseDaysOfWeek } from '../lib/cadence.js'

describe('parseDaysOfWeek', () => {
  it('parses a JSON-string array of weekday ints', () => {
    expect(parseDaysOfWeek('[1,3,5]')).toEqual([1, 3, 5])
  })
  it('accepts a real array and drops out-of-range / non-int values', () => {
    expect(parseDaysOfWeek([0, 6, 7, -1, 2.5, 'x'])).toEqual([0, 6])
  })
  it('returns [] for junk / non-arrays', () => {
    expect(parseDaysOfWeek('not json')).toEqual([])
    expect(parseDaysOfWeek(null)).toEqual([])
    expect(parseDaysOfWeek({})).toEqual([])
  })
})

describe('dosingDaysPerWeek', () => {
  it('daily and x_per_day dose every day (7)', () => {
    expect(dosingDaysPerWeek('daily', [], 1)).toBe(7)
    expect(dosingDaysPerWeek('x_per_day', [], 1)).toBe(7)
  })
  it('weekly counts only the listed days', () => {
    expect(dosingDaysPerWeek('weekly', [1, 3, 5], 1)).toBe(3)
    expect(dosingDaysPerWeek('weekly', [2], 1)).toBe(1)
  })
  it('weekly with no explicit days degrades to daily (7)', () => {
    expect(dosingDaysPerWeek('weekly', [], 1)).toBe(7)
  })
  it('cycle doses every interval_days (7 / interval)', () => {
    expect(dosingDaysPerWeek('cycle', [], 2)).toBe(3.5)
    expect(dosingDaysPerWeek('cycle', [], 7)).toBe(1)
    expect(dosingDaysPerWeek('cycle', [], 0)).toBe(7) // clamped to a 1-day floor
  })
  it('as_needed has no fixed cadence (0)', () => {
    expect(dosingDaysPerWeek('as_needed', [], 1)).toBe(0)
  })
  it('an unknown kind falls back to daily (7)', () => {
    expect(dosingDaysPerWeek('whatever', [], 1)).toBe(7)
  })
})
