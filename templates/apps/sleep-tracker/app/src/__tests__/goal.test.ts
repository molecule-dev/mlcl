import { describe, expect, it } from 'vitest'

import { DEFAULT_GOALS, parseSleepGoals } from '../lib/goal.js'

// The Settings duration goal was pure local state and the recovery ring hardcoded 480 (8h), so the
// goal did nothing. parseSleepGoals is the shared reader Settings + the ring call sites now use.

describe('parseSleepGoals', () => {
  it('returns defaults for null / empty / corrupted input', () => {
    expect(parseSleepGoals(null)).toEqual(DEFAULT_GOALS)
    expect(parseSleepGoals('')).toEqual(DEFAULT_GOALS)
    expect(parseSleepGoals('{not json')).toEqual(DEFAULT_GOALS)
  })

  it('reads the stored goals', () => {
    const raw = JSON.stringify({ sleepGoalHours: 6, bedtimeGoal: '23:15', wakeGoal: '07:00' })
    expect(parseSleepGoals(raw)).toEqual({
      sleepGoalHours: 6,
      bedtimeGoal: '23:15',
      wakeGoal: '07:00',
    })
  })

  it('fills missing fields with defaults (partial blob)', () => {
    const g = parseSleepGoals(JSON.stringify({ sleepGoalHours: 9 }))
    expect(g.sleepGoalHours).toBe(9)
    expect(g.bedtimeGoal).toBe(DEFAULT_GOALS.bedtimeGoal)
    expect(g.wakeGoal).toBe(DEFAULT_GOALS.wakeGoal)
  })

  it('rejects a non-positive or non-numeric duration, falling back to 8h', () => {
    expect(parseSleepGoals(JSON.stringify({ sleepGoalHours: 0 })).sleepGoalHours).toBe(8)
    expect(parseSleepGoals(JSON.stringify({ sleepGoalHours: -3 })).sleepGoalHours).toBe(8)
    expect(parseSleepGoals(JSON.stringify({ sleepGoalHours: 'lots' })).sleepGoalHours).toBe(8)
  })
})
