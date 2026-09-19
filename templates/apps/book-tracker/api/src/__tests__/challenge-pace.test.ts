import { describe, expect, it } from 'vitest'

// Challenge pace is the Challenge page's load-bearing computation: the ring
// percent, the on-pace flag, and the "books behind" + per-week catch-up
// numbers users plan their year around. Pin them to concrete calendar cases.
import { computeChallengeProgress, parseGenres } from '../handlers/_reading.js'

const jan = (day: number) => new Date(2026, 0, day, 12, 0, 0)
const midYear = new Date(2026, 5, 15, 12, 0, 0) // Jun 15 — day 166 of 365
const dec31 = new Date(2026, 11, 31, 23, 0, 0)

describe('computeChallengeProgress', () => {
  it('derives day-of-year bookkeeping from the calendar (2026 is not a leap year)', () => {
    const p = computeChallengeProgress(2026, 24, 0, midYear)
    expect(p.day_of_year).toBe(166)
    expect(p.days_in_year).toBe(365)
  })

  it('percent is capped at 1 and rounded from real division', () => {
    const p = computeChallengeProgress(2026, 24, 15, midYear)
    expect(p.percent).toBeCloseTo(0.625, 5)
    expect(computeChallengeProgress(2026, 10, 11, midYear).percent).toBe(1)
  })

  it('on pace: exactly the elapsed share of the goal', () => {
    // Elapsed share of 24 at day 166/365 ≈ 10.9 → floor 10; 11 read is ahead.
    expect(computeChallengeProgress(2026, 24, 11, midYear).on_pace).toBe(true)
  })

  it('behind pace flags and counts the shortfall', () => {
    const p = computeChallengeProgress(2026, 24, 4, midYear)
    expect(p.on_pace).toBe(false)
    expect(p.books_behind).toBe(7) // round(10.9) − 4
  })

  it('a zero goal is trivially on pace with zero percent (the "set a goal" state)', () => {
    const p = computeChallengeProgress(2026, 0, 0, midYear)
    expect(p.on_pace).toBe(true)
    expect(p.percent).toBe(0)
  })

  it('pace_needed_per_week spreads the remainder over the weeks left', () => {
    // Day 166 → 199 days left = 28.43 weeks; 24 − 15 = 9 books to go.
    const p = computeChallengeProgress(2026, 24, 15, midYear)
    expect(p.pace_needed_per_week).toBeCloseTo(0.3, 1)
  })

  it('at year end, on pace only if the goal was met, and no division by zero', () => {
    expect(computeChallengeProgress(2026, 24, 24, dec31).on_pace).toBe(true)
    expect(computeChallengeProgress(2026, 24, 23, dec31).on_pace).toBe(false)
    expect(computeChallengeProgress(2026, 24, 23, dec31).pace_needed_per_week).toBe(0)
  })

  it('a challenge year other than the current one still computes (day clamped to the year)', () => {
    const p = computeChallengeProgress(2025, 12, 12, midYear)
    expect(p.day_of_year).toBe(365)
    expect(p.on_pace).toBe(true) // finished year, goal met
  })

  it('Jan 1 with nothing read is on pace (nothing expected yet)', () => {
    expect(computeChallengeProgress(2026, 52, 0, jan(1)).on_pace).toBe(true)
  })
})

describe('parseGenres', () => {
  it('accepts the JSONB-parsed array, the stringified array, and garbage', () => {
    expect(parseGenres(['fiction', 'sci-fi'])).toEqual(['fiction', 'sci-fi'])
    expect(parseGenres('["fiction"]')).toEqual(['fiction'])
    expect(parseGenres('garbage')).toEqual([])
    expect(parseGenres(null)).toEqual([])
  })
})
