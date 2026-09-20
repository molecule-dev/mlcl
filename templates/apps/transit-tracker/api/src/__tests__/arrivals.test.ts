import { describe, expect, it } from 'vitest'

import {
  minutesLabel,
  nextDepartureAfter,
  parseClock,
  serviceWindow,
  simulateNextArrivals,
} from '../lib/arrivals.js'
import { cumulativeOffsets, orderedStops, type StopPosition } from '../lib/network.js'

// A toy line matching the fixture shape: A → B → C, 60s then 120s hops.
const LINE = 'T9'
const POSITIONS: StopPosition[] = [
  { line_code: LINE, stop_code: 'AAA', sequence: 1, travel_seconds_from_prev: 0 },
  { line_code: LINE, stop_code: 'BBB', sequence: 2, travel_seconds_from_prev: 60 },
  { line_code: LINE, stop_code: 'CCC', sequence: 3, travel_seconds_from_prev: 120 },
]
const SCHEDULE = { firstDeparture: '06:00', lastDeparture: '23:00', headwaySeconds: 600 }

const at = (h: number, m: number, s = 0): Date => new Date(Date.UTC(2026, 0, 15, h, m, s))

describe('parseClock / serviceWindow', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(parseClock('06:00')).toBe(21_600)
    expect(parseClock('00:40')).toBe(2400)
    expect(parseClock('23:00:30')).toBe(82_830)
  })

  it('shifts a past-midnight last departure by +24h', () => {
    const window = serviceWindow({
      firstDeparture: '05:10',
      lastDeparture: '00:40',
      headwaySeconds: 360,
    })
    expect(window.first).toBe(18_600)
    expect(window.last).toBe(88_800)
  })
})

describe('simulateNextArrivals', () => {
  it('returns the next headway-spaced arrivals at a mid-line stop', () => {
    // Direction 0 offsets: AAA=0, BBB=60, CCC=180. Departures 06:00, 06:10…
    // At 07:07 the 07:10 departure reaches BBB at 07:11.
    const arrivals = simulateNextArrivals({
      now: at(7, 7),
      lineCode: LINE,
      direction: 0,
      stopOrder: orderedStops(POSITIONS, LINE, 0),
      offsetSeconds: cumulativeOffsets(POSITIONS, LINE, 0).get('BBB') ?? 0,
      schedule: SCHEDULE,
      count: 3,
    })
    expect(arrivals).toHaveLength(3)
    expect(arrivals[0].secondsUntil).toBe(4 * 60)
    expect(arrivals[1].secondsUntil).toBe(14 * 60)
    expect(arrivals[2].secondsUntil).toBe(24 * 60)
    expect(arrivals[0].destinationStop).toBe('CCC')
  })

  it('is deterministic — same clock in, same board out', () => {
    const run = (): number[] =>
      simulateNextArrivals({
        now: at(9, 30),
        lineCode: LINE,
        direction: 0,
        stopOrder: orderedStops(POSITIONS, LINE, 0),
        offsetSeconds: 0,
        schedule: SCHEDULE,
        count: 4,
      }).map((a) => a.secondsUntil)
    expect(run()).toEqual(run())
  })

  it('shows the first morning vehicle before service starts', () => {
    const arrivals = simulateNextArrivals({
      now: at(5, 30),
      lineCode: LINE,
      direction: 0,
      stopOrder: orderedStops(POSITIONS, LINE, 0),
      offsetSeconds: 60,
      schedule: SCHEDULE,
      count: 2,
    })
    // First departure 06:00 reaches BBB at 06:01 — 31 minutes out.
    expect(arrivals[0].secondsUntil).toBe(31 * 60)
  })

  it('returns nothing once the last vehicle has passed the stop', () => {
    const arrivals = simulateNextArrivals({
      now: at(23, 50),
      lineCode: LINE,
      direction: 0,
      stopOrder: orderedStops(POSITIONS, LINE, 0),
      offsetSeconds: 0,
      schedule: SCHEDULE,
      count: 3,
    })
    expect(arrivals).toEqual([])
  })

  it('serves post-midnight arrivals as next-day timestamps', () => {
    // Service until 00:40 past midnight; at 23:55 the board still shows the
    // 00:00 departure reaching BBB at 00:01.
    const arrivals = simulateNextArrivals({
      now: at(23, 55),
      lineCode: LINE,
      direction: 0,
      stopOrder: orderedStops(POSITIONS, LINE, 0),
      offsetSeconds: 60,
      schedule: { firstDeparture: '06:00', lastDeparture: '00:40', headwaySeconds: 600 },
      count: 1,
    })
    expect(arrivals).toHaveLength(1)
    expect(arrivals[0].secondsUntil).toBe(6 * 60)
    const arrivalUtcHour = new Date(arrivals[0].arrivalEpochMs).getUTCHours()
    expect(arrivalUtcHour).toBe(0)
  })

  it('uses reversed stop order + reverse offsets for direction 1', () => {
    const arrivals = simulateNextArrivals({
      now: at(12, 0),
      lineCode: LINE,
      direction: 1,
      stopOrder: orderedStops(POSITIONS, LINE, 1),
      offsetSeconds: cumulativeOffsets(POSITIONS, LINE, 1).get('BBB') ?? 0,
      schedule: SCHEDULE,
      count: 1,
    })
    expect(arrivals[0].destinationStop).toBe('AAA')
    // Direction-1 offset of BBB = total(180) − forward(60) = 120.
    expect(cumulativeOffsets(POSITIONS, LINE, 1).get('BBB')).toBe(120)
  })
})

describe('nextDepartureAfter', () => {
  it('finds the first departure putting the vehicle at the stop not-before the anchor', () => {
    const departure = nextDepartureAfter(at(8, 0), 60, SCHEDULE, at(8, 5).getTime())
    // Departures every 10 min from 06:00; the 08:10 departure puts the
    // vehicle at BBB (60s offset) at 08:11 — the first one not before 08:05.
    expect(new Date(departure as number).getUTCHours()).toBe(8)
    expect(new Date(departure as number).getUTCMinutes()).toBe(10)
  })

  it('returns null after the last departure', () => {
    const departure = nextDepartureAfter(at(23, 30), 0, SCHEDULE, at(23, 30).getTime())
    expect(departure).toBeNull()
  })
})

describe('minutesLabel', () => {
  it('marks sub-minute arrivals as due', () => {
    expect(minutesLabel(42)).toBe('due')
    expect(minutesLabel(59)).toBe('due')
    expect(minutesLabel(60)).toBe(1)
    expect(minutesLabel(599)).toBe(9)
  })
})
