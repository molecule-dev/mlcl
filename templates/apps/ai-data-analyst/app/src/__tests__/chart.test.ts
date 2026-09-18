import { describe, expect, it } from 'vitest'

import { chartLinePoints } from '../lib/chart.js'

// QueryEditor ignored the server-chosen chart_type and always drew bars; line/scatter results now
// render a line chart from these points (mirroring the report chart). Lock the geometry: x spans the
// 200-wide viewBox, the series min sits at the bottom (y=80) and the max near the top (y=8).
describe('chartLinePoints', () => {
  it('returns an empty string for no values', () => {
    expect(chartLinePoints([])).toBe('')
  })

  it('maps min to the bottom and max to the top across the full width', () => {
    expect(chartLinePoints([0, 10])).toBe('0.0,80.0 200.0,8.0')
  })

  it('places a single point at the left edge', () => {
    expect(chartLinePoints([5])).toBe('0.0,8.0')
  })

  it('spreads N points evenly along x', () => {
    const xs = chartLinePoints([1, 2, 3])
      .split(' ')
      .map((p) => p.split(',')[0])
    expect(xs).toEqual(['0.0', '100.0', '200.0'])
  })
})
