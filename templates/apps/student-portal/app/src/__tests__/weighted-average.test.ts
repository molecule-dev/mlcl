import { describe, expect, it } from 'vitest'

import { type ApiGrade, weightedAverage } from '../lib/format.js'

// A course's "current grade" must be a weighted average honoring each grade's stored `weight`.
// CourseDetail used a flat mean, dropping the weight, so it disagreed with the backend GPA /
// report-card and the Grades page for the same data.

const g = (score: number | string | null, weight?: number | string | null): ApiGrade =>
  ({ id: 'x', user_id: 'u', score, weight, graded_at: '2026-01-01' }) as ApiGrade

describe('weightedAverage', () => {
  it('weights by the stored weight, not a flat mean', () => {
    // (86·1 + 92·0.5) / 1.5 = 88.0 — a flat mean would give 89.0
    expect(weightedAverage([g(86, 1), g(92, 0.5)])).toBeCloseTo(88.0, 5)
    expect(weightedAverage([g(86, 1), g(92, 0.5)])).not.toBeCloseTo(89.0, 5)
  })

  it('defaults a missing/null weight to 1 (equals a flat mean when all weights are 1)', () => {
    expect(weightedAverage([g(80), g(90)])).toBeCloseTo(85, 5)
    expect(weightedAverage([g(80, null), g(90, undefined)])).toBeCloseTo(85, 5)
  })

  it('coerces string score/weight (numeric columns arrive as strings)', () => {
    expect(weightedAverage([g('86', '1'), g('92', '0.5')])).toBeCloseTo(88.0, 5)
  })

  it('returns 0 for an empty set or when all weights are 0', () => {
    expect(weightedAverage([])).toBe(0)
    expect(weightedAverage([g(90, 0), g(80, 0)])).toBe(0)
  })
})
