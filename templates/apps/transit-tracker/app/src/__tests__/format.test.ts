import { describe, expect, it } from 'vitest'

import {
  formatClockTime,
  formatCountdown,
  formatDuration,
  formatHeadway,
  projectToSvg,
} from '../lib/format.js'

describe('formatCountdown', () => {
  it('marks sub-minute arrivals as due', () => {
    expect(formatCountdown(0)).toBe('due')
    expect(formatCountdown(59)).toBe('due')
    expect(formatCountdown(60)).toBe('1 min')
    expect(formatCountdown(125)).toBe('2 min')
  })
})

describe('formatClockTime', () => {
  it('formats an epoch as a locale clock time', () => {
    const epoch = new Date(2026, 0, 15, 14, 5, 0).getTime()
    expect(formatClockTime(epoch)).toMatch(/14:05|2:05/)
  })
})

describe('formatDuration', () => {
  it('renders minutes under an hour and h+min above', () => {
    expect(formatDuration(18 * 60)).toBe('18 min')
    expect(formatDuration(59 * 60)).toBe('59 min')
    expect(formatDuration(60 * 60)).toBe('1 h')
    expect(formatDuration(65 * 60)).toBe('1 h 05 min')
    expect(formatDuration(125 * 60)).toBe('2 h 05 min')
  })
})

describe('formatHeadway', () => {
  it('rounds to whole minutes with a floor of one', () => {
    expect(formatHeadway(360)).toBe('6 min')
    expect(formatHeadway(660)).toBe('11 min')
    expect(formatHeadway(30)).toBe('1 min')
  })
})

describe('projectToSvg', () => {
  it('places points inside the viewBox with north up', () => {
    // Two stops: first further north+west than the second.
    const pts = projectToSvg(
      [
        [44.9, -93.5],
        [44.8, -93.4],
      ],
      400,
      300,
    )
    expect(pts[0].x).toBeLessThan(pts[1].x) // west → left
    expect(pts[0].y).toBeLessThan(pts[1].y) // north → up
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(400)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(300)
    }
  })

  it('returns [] for empty input and centers a single point', () => {
    expect(projectToSvg([], 100, 100)).toEqual([])
    const [only] = projectToSvg([[44.86, -93.34]], 100, 100)
    expect(only.x).toBe(50)
    expect(only.y).toBe(50)
  })
})
