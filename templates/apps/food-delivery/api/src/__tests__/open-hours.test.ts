import { describe, expect, it } from 'vitest'

import { isOpenNow } from '../handlers/_hours.js'

// The restaurant `open` flag was hardcoded to `status === 'active'`, so every restaurant showed
// "Open" 24/7 and orders were accepted at any hour. isOpenNow evaluates the stored opening_hours
// (a { mon: 'HH:MM-HH:MM', … } map) against the current weekday + time.

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const at = (h: number, m = 0) => new Date(2026, 4, 18, h, m, 0) // fixed calendar day, varying time
const allDays = (window: string) =>
  Object.fromEntries(DAY_KEYS.map((k) => [k, window])) as Record<string, string>

describe('isOpenNow', () => {
  it('is open within the day window', () => {
    expect(isOpenNow(allDays('10:00-22:00'), at(12))).toBe(true)
  })

  it('is closed before opening and at/after closing', () => {
    expect(isOpenNow(allDays('10:00-22:00'), at(9, 30))).toBe(false)
    expect(isOpenNow(allDays('10:00-22:00'), at(22))).toBe(false) // closing is exclusive
    expect(isOpenNow(allDays('10:00-22:00'), at(23))).toBe(false)
  })

  it('uses only the current weekday window', () => {
    const now = at(12)
    const todayKey = DAY_KEYS[now.getDay()]
    // Only today has hours → open; drop today's key → indeterminate (null).
    expect(isOpenNow({ [todayKey]: '10:00-22:00' }, now)).toBe(true)
    const otherDay = { [DAY_KEYS[(now.getDay() + 1) % 7]]: '10:00-22:00' }
    expect(isOpenNow(otherDay, now)).toBeNull()
  })

  it('parses opening_hours delivered as a JSON string', () => {
    expect(isOpenNow(JSON.stringify(allDays('10:00-22:00')), at(12))).toBe(true)
  })

  it('returns null (fall back to status) when hours are missing or unparseable', () => {
    expect(isOpenNow({}, at(12))).toBeNull()
    expect(isOpenNow(null, at(12))).toBeNull()
    expect(isOpenNow('not json', at(12))).toBeNull()
  })
})
