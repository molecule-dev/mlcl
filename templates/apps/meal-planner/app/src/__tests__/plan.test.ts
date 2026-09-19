import { describe, expect, it } from 'vitest'

import {
  addWeeks,
  categoryLabel,
  dateOfDay,
  formatQuantity,
  formatQuantityWithUnit,
  formatWeekRange,
  isCurrentWeek,
  num,
  weekStartOf,
} from '../lib/plan.js'

// The week grid is the app's backbone: every page passes a Monday-ISO around,
// so the Monday convention and the day-index math are pinned here.

describe('weekStartOf', () => {
  // Constructed from LOCAL calendar parts so the expectations hold in any
  // host timezone — weekStartOf deliberately uses the local calendar date.
  it('returns the Monday of the same week', () => {
    expect(weekStartOf(new Date(2026, 8, 16, 15, 0))).toBe('2026-09-14') // Wednesday
    expect(weekStartOf(new Date(2026, 8, 14, 0, 0))).toBe('2026-09-14') // Monday itself
    expect(weekStartOf(new Date(2026, 8, 20, 23, 59))).toBe('2026-09-14') // Sunday night
  })

  it('crosses the month boundary correctly', () => {
    expect(weekStartOf(new Date(2026, 8, 1, 12, 0))).toBe('2026-08-31') // Tuesday
  })

  it('uses local calendar date, not UTC hour, so evenings stay in the right week', () => {
    expect(weekStartOf(new Date(2026, 8, 16, 23, 59))).toBe('2026-09-14')
  })
})

describe('addWeeks', () => {
  it('moves whole weeks forward and back', () => {
    expect(addWeeks('2026-09-14', 1)).toBe('2026-09-21')
    expect(addWeeks('2026-09-14', -1)).toBe('2026-09-07')
    expect(addWeeks('2026-09-14', 0)).toBe('2026-09-14')
  })

  it('crosses month boundaries', () => {
    expect(addWeeks('2026-09-28', 1)).toBe('2026-10-05')
  })
})

describe('dateOfDay', () => {
  it('day 0 is the Monday itself, day 6 the Sunday', () => {
    expect(dateOfDay('2026-09-14', 0)).toBe('2026-09-14')
    expect(dateOfDay('2026-09-14', 6)).toBe('2026-09-20')
  })
})

describe('isCurrentWeek', () => {
  it('matches the derived Monday of today and not a neighbor week', () => {
    expect(isCurrentWeek(weekStartOf())).toBe(true)
    expect(isCurrentWeek(addWeeks(weekStartOf(), 1))).toBe(false)
  })
})

describe('formatWeekRange', () => {
  it('renders start day – end day within one month', () => {
    expect(formatWeekRange('2026-09-14')).toBe('Sep 14 – 20')
  })

  it('includes the end month when the week crosses one', () => {
    expect(formatWeekRange('2026-09-28')).toBe('Sep 28 – Oct 4')
  })
})

describe('num / formatQuantity', () => {
  it('coerces pg numeric strings and treats missing as 0', () => {
    expect(num('2.50')).toBe(2.5)
    expect(num(null)).toBe(0)
    expect(num(undefined)).toBe(0)
  })

  it('drops trailing zeros without exponent notation', () => {
    expect(formatQuantity(2.5)).toBe('2.5')
    expect(formatQuantity(2)).toBe('2')
    expect(formatQuantity('0.33')).toBe('0.33')
    expect(formatQuantity(100)).toBe('100')
  })

  it('appends the unit only when present', () => {
    expect(formatQuantityWithUnit(2, 'tbsp')).toBe('2 tbsp')
    expect(formatQuantityWithUnit(3, '')).toBe('3')
  })
})

describe('categoryLabel', () => {
  it('maps known aisles and passes unknown ids through', () => {
    expect(categoryLabel('produce')).toBe('Produce')
    expect(categoryLabel('dairy')).toBe('Dairy & Eggs')
    expect(categoryLabel('mystery')).toBe('mystery')
  })
})
