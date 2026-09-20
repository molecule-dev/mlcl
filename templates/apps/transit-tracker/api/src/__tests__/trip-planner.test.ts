import { describe, expect, it } from 'vitest'

import { buildRideEdges, type LineSchedule, type StopPosition } from '../lib/network.js'
import { planTrip } from '../lib/trip-planner.js'

// Two lines crossing at HUB, mirroring the fixture's interchange shape:
//   L1 (metro): A → HUB → B      hops 100s / 100s
//   L2 (bus):   C → HUB → D      hops 200s / 200s
const POSITIONS: StopPosition[] = [
  { line_code: 'L1', stop_code: 'AAA', sequence: 1, travel_seconds_from_prev: 0 },
  { line_code: 'L1', stop_code: 'HUB', sequence: 2, travel_seconds_from_prev: 100 },
  { line_code: 'L1', stop_code: 'BBB', sequence: 3, travel_seconds_from_prev: 100 },
  { line_code: 'L2', stop_code: 'CCC', sequence: 1, travel_seconds_from_prev: 0 },
  { line_code: 'L2', stop_code: 'HUB', sequence: 2, travel_seconds_from_prev: 200 },
  { line_code: 'L2', stop_code: 'DDD', sequence: 3, travel_seconds_from_prev: 200 },
]
const SCHEDULES: LineSchedule[] = [
  {
    line_code: 'L1',
    direction: 0,
    first_departure: '06:00',
    last_departure: '23:00',
    headway_seconds: 300,
  },
  {
    line_code: 'L1',
    direction: 1,
    first_departure: '06:00',
    last_departure: '23:00',
    headway_seconds: 300,
  },
  {
    line_code: 'L2',
    direction: 0,
    first_departure: '06:00',
    last_departure: '23:00',
    headway_seconds: 900,
  },
  {
    line_code: 'L2',
    direction: 1,
    first_departure: '06:00',
    last_departure: '23:00',
    headway_seconds: 900,
  },
]

const NOW = new Date(Date.UTC(2026, 0, 15, 10, 0, 0))

function plan(origin: string, destination: string) {
  return planTrip({ origin, destination, now: NOW, positions: POSITIONS, schedules: SCHEDULES })
}

describe('buildRideEdges', () => {
  it('creates directed edges for both directions of every hop', () => {
    const edges = buildRideEdges(POSITIONS)
    expect(edges).toHaveLength(8) // 4 hops × 2 directions
    expect(edges.filter((e) => e.direction === 1).every((e) => e.seconds > 0)).toBe(true)
  })
})

describe('planTrip', () => {
  it('plans a same-line trip as a single direct leg', () => {
    const options = plan('AAA', 'BBB')
    expect(options.length).toBeGreaterThan(0)
    const direct = options.find((o) => o.transfers === 0)
    expect(direct).toBeDefined()
    expect(direct?.legs).toHaveLength(1)
    expect(direct?.legs[0]).toMatchObject({ lineCode: 'L1', boardStop: 'AAA', alightStop: 'BBB' })
    expect(direct?.rideSeconds).toBe(200)
  })

  it('transfers at the interchange for a cross-line trip', () => {
    const options = plan('AAA', 'DDD')
    expect(options.length).toBeGreaterThan(0)
    const best = options[0]
    expect(best.transfers).toBe(1)
    expect(best.legs).toHaveLength(2)
    expect(best.legs[0]).toMatchObject({ lineCode: 'L1', alightStop: 'HUB' })
    expect(best.legs[1]).toMatchObject({ lineCode: 'L2', boardStop: 'HUB', alightStop: 'DDD' })
    expect(best.rideSeconds).toBe(300) // AAA→HUB 100s ride, then HUB→DDD 200s ride
  })

  it('anchors the timeline to real departures: arrival = departure + ride', () => {
    const options = plan('AAA', 'DDD')
    const best = options[0]
    expect(best.departEpochMs).toBeGreaterThan(NOW.getTime() - 1)
    expect(best.arriveEpochMs).toBeGreaterThan(best.departEpochMs)
    // First leg rides 200s from its departure; wait counted separately.
    const firstLegRideMs = best.legs[0].rideSeconds * 1000
    const secondDep = best.arriveEpochMs - best.legs[1].rideSeconds * 1000
    expect(secondDep - (best.departEpochMs + firstLegRideMs)).toBeGreaterThan(0) // transfer wait
    expect(best.totalSeconds).toBe(Math.round((best.arriveEpochMs - NOW.getTime()) / 1000))
  })

  it('returns [] for identical origin and destination', () => {
    expect(plan('HUB', 'HUB')).toEqual([])
  })

  it('returns [] for unknown stops', () => {
    expect(plan('AAA', 'ZZZ')).toEqual([])
    expect(plan('ZZZ', 'AAA')).toEqual([])
  })

  it('dedupes identical strategies and caps the option list', () => {
    // Same-line both directions: only the correct direction is reachable.
    const options = plan('BBB', 'AAA')
    expect(options.length).toBeLessThanOrEqual(3)
    const signatures = new Set(
      options.map((o) => o.legs.map((l) => `${l.lineCode}${l.boardStop}${l.alightStop}`).join('|')),
    )
    expect(signatures.size).toBe(options.length)
  })

  it('produces deterministic results across runs', () => {
    expect(JSON.stringify(plan('CCC', 'BBB'))).toBe(JSON.stringify(plan('CCC', 'BBB')))
  })
})
