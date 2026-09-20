import { describe, expect, it, vi } from 'vitest'

// _decorate imports api-database at module load; stub it so this pure-function test imports cleanly.
vi.mock('@molecule/api-database', () => ({ findMany: vi.fn() }))

// The no-double-booking rule, the overnight-shift rollover, and the SOFT
// availability warning are the load-bearing scheduling invariants — every
// write path (shift create/update, swap approval, claim approval) routes
// through shiftsOverlap / findOverlappingShifts, so these pure functions
// are tested directly.
import {
  addWeeks,
  availabilityWarning,
  combineShiftTimes,
  shiftHours,
  shiftsOverlap,
  weekStartOf,
} from '../handlers/_decorate.js'

describe('shiftsOverlap (no-double-booking rule)', () => {
  const existing = {
    starts_at: '2026-10-05T14:00:00.000Z',
    ends_at: '2026-10-05T22:00:00.000Z',
  }

  it('flags a fully-contained shift', () => {
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-05T15:00:00.000Z',
        ends_at: '2026-10-05T16:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('flags a partial overlap on either side', () => {
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-05T12:00:00.000Z',
        ends_at: '2026-10-05T15:00:00.000Z',
      }),
    ).toBe(true)
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-05T21:00:00.000Z',
        ends_at: '2026-10-05T23:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('flags an engulfing shift', () => {
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-05T08:00:00.000Z',
        ends_at: '2026-10-06T02:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('allows back-to-back shifts (touching edges are not a conflict)', () => {
    // A closing shift that ends 22:00 and a closing-clean shift starting 22:00.
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-05T22:00:00.000Z',
        ends_at: '2026-10-06T02:00:00.000Z',
      }),
    ).toBe(false)
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-05T06:00:00.000Z',
        ends_at: '2026-10-05T14:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('allows shifts on other days', () => {
    expect(
      shiftsOverlap(existing, {
        starts_at: '2026-10-06T14:00:00.000Z',
        ends_at: '2026-10-06T22:00:00.000Z',
      }),
    ).toBe(false)
  })
})

describe('combineShiftTimes', () => {
  it('builds plain same-day ranges', () => {
    const { starts_at, ends_at } = combineShiftTimes('2026-10-05', '09:00', '17:00')
    expect(starts_at.toISOString()).toBe('2026-10-05T09:00:00.000Z')
    expect(ends_at.toISOString()).toBe('2026-10-05T17:00:00.000Z')
  })

  it('rolls an end-before-start (overnight closing) to the next day', () => {
    const { starts_at, ends_at } = combineShiftTimes('2026-10-05', '20:00', '02:00')
    expect(starts_at.toISOString()).toBe('2026-10-05T20:00:00.000Z')
    expect(ends_at.toISOString()).toBe('2026-10-06T02:00:00.000Z')
  })

  it('rejects zero-length ranges by rolling them forward a day (guarded upstream)', () => {
    const { starts_at, ends_at } = combineShiftTimes('2026-10-05', '09:00', '09:00')
    expect(ends_at.getTime()).toBeGreaterThan(starts_at.getTime())
  })
})

describe('availabilityWarning (soft — allowed but flagged)', () => {
  // Tuesday, 2026-10-06T18:00Z.
  const eveningShift = { starts_at: '2026-10-06T18:00:00.000Z' }

  it('returns null when the start falls inside a declared window', () => {
    const windows = [{ weekday: 2, start_time: '12:00', end_time: '22:00' }]
    expect(availabilityWarning(eveningShift, windows, [])).toBeNull()
  })

  it('flags outside_availability when no window covers the day/time', () => {
    const windows = [{ weekday: 2, start_time: '06:00', end_time: '16:00' }]
    expect(availabilityWarning(eveningShift, windows, [])).toBe('outside_availability')
  })

  it('flags outside_availability when the weekday has no windows at all', () => {
    const windows = [{ weekday: 5, start_time: '06:00', end_time: '16:00' }]
    expect(availabilityWarning(eveningShift, windows, [])).toBe('outside_availability')
  })

  it('treats no declared windows as fully flexible (no warning)', () => {
    expect(availabilityWarning(eveningShift, [], [])).toBeNull()
  })

  it('flags blackout_date even when the window covers the time', () => {
    const windows = [{ weekday: 2, start_time: '12:00', end_time: '22:00' }]
    const blackouts = [{ date: '2026-10-06' }]
    expect(availabilityWarning(eveningShift, windows, blackouts)).toBe('blackout_date')
  })

  it('does not flag a blackout on a different date', () => {
    const windows = [{ weekday: 2, start_time: '12:00', end_time: '22:00' }]
    const blackouts = [{ date: '2026-10-07' }]
    expect(availabilityWarning(eveningShift, windows, blackouts)).toBeNull()
  })
})

describe('week math', () => {
  it('weekStartOf snaps any day back to its Monday', () => {
    expect(weekStartOf('2026-10-06')).toBe('2026-10-05') // Tuesday
    expect(weekStartOf('2026-10-11')).toBe('2026-10-05') // Sunday → previous Monday
    expect(weekStartOf('2026-10-05')).toBe('2026-10-05') // Monday itself
  })

  it('addWeeks moves whole weeks', () => {
    expect(addWeeks('2026-10-05', 1)).toBe('2026-10-12')
    expect(addWeeks('2026-10-05', -2)).toBe('2026-09-21')
  })
})

describe('shiftHours', () => {
  it('computes decimal hours', () => {
    expect(
      shiftHours({ starts_at: '2026-10-05T09:00:00.000Z', ends_at: '2026-10-05T17:30:00.000Z' }),
    ).toBe(8.5)
  })

  it('handles overnight ranges', () => {
    expect(
      shiftHours({ starts_at: '2026-10-05T20:00:00.000Z', ends_at: '2026-10-06T02:00:00.000Z' }),
    ).toBe(6)
  })
})
