import { describe, expect, it } from 'vitest'

import { DAILY_GOAL_KEY, DEFAULT_DAILY_GOAL, readDailyGoal } from '../lib/goal.js'

// The daily word-count goal (Settings → Word goals, localStorage 'versal.dailyGoal') was persisted but
// the Editor progress card + Library manuscript-hero ring both hardcoded 2000, so a custom goal had no
// effect. readDailyGoal is the shared reader both surfaces now use.

const fakeStore = (val: string | null) => ({
  getItem: (k: string) => (k === DAILY_GOAL_KEY ? val : null),
})

describe('readDailyGoal', () => {
  it('returns the default when unavailable or unset', () => {
    expect(readDailyGoal(undefined)).toBe(DEFAULT_DAILY_GOAL)
    expect(readDailyGoal(fakeStore(null))).toBe(DEFAULT_DAILY_GOAL)
  })

  it('returns the stored positive integer', () => {
    expect(readDailyGoal(fakeStore('500'))).toBe(500)
    expect(readDailyGoal(fakeStore('5000'))).toBe(5000)
  })

  it('rounds to an integer', () => {
    expect(readDailyGoal(fakeStore('750.6'))).toBe(751)
  })

  it('falls back to the default on zero, negative, or non-numeric values', () => {
    expect(readDailyGoal(fakeStore('0'))).toBe(DEFAULT_DAILY_GOAL)
    expect(readDailyGoal(fakeStore('-5'))).toBe(DEFAULT_DAILY_GOAL)
    expect(readDailyGoal(fakeStore('abc'))).toBe(DEFAULT_DAILY_GOAL)
  })
})
