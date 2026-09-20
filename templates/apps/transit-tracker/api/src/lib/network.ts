/**
 * Pure transit-network types + graph helpers — no DB, no Express, no bonds.
 *
 * The database stores the MOCK GTFS network (lines / stops / stop_positions /
 * schedules, seeded from api/fixtures/network.json). This module turns those
 * flat rows into the shapes the arrivals simulation and the trip planner
 * consume: ordered stop lists per direction, cumulative travel-time offsets,
 * and an adjacency graph over stops.
 *
 * DIRECTION MODEL: `transit_stop_positions` stores direction 0 (the order the
 * fixture lists the stops in) ONLY. Direction 1 is the REVERSE order with the
 * SAME per-hop travel times — derived here, never stored twice. A schedule
 * row's `direction` therefore means "service running the stop list in order
 * (0)" or "in reverse (1)".
 *
 * Kept dependency-free so API handlers and vitest suites import the exact
 * same functions the runtime uses.
 *
 * @module
 */

/** Line mode. Stored as text with a CHECK constraint; parsed back here. */
export type LineKind = 'metro' | 'bus' | 'tram'

export function isLineKind(value: string): value is LineKind {
  return value === 'metro' || value === 'bus' || value === 'tram'
}

/** Row shape of `transit_lines` (+ the lines section of fixtures/network.json). */
export interface TransitLine {
  code: string
  name: string
  kind: LineKind
  color: string
  /** Ordered [lat, lng] points tracing the line — rendered as an SVG polyline. */
  polyline: Array<[number, number]>
}

/** Row shape of `transit_stops`. */
export interface TransitStop {
  code: string
  name: string
  lat: number
  lng: number
  /** True for interchange stops served by 2+ lines (drives the hub UI chip). */
  hub: boolean
}

/** Row shape of `transit_stop_positions`. */
export interface StopPosition {
  line_code: string
  stop_code: string
  /** 1-based position along DIRECTION 0 (the fixture's listed order). */
  sequence: number
  /** Ride time from the previous stop (0 for the first stop). */
  travel_seconds_from_prev: number
}

/** Row shape of `transit_schedules`. */
export interface LineSchedule {
  line_code: string
  direction: 0 | 1
  /** 'HH:MM' clock times; last_departure past midnight is written '00:xx'. */
  first_departure: string
  last_departure: string
  headway_seconds: number
}

/**
 * Ordered stop codes for a line in one direction.
 * Direction 0 = ascending sequence; direction 1 = reversed.
 */
export function orderedStops(
  positions: StopPosition[],
  lineCode: string,
  direction: 0 | 1,
): string[] {
  const rows = positions
    .filter((p) => p.line_code === lineCode)
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => p.stop_code)
  return direction === 0 ? rows : [...rows].reverse()
}

/**
 * Cumulative seconds from the direction's origin stop to each stop — the
 * "how long into the trip is this stop" offset the arrival simulation adds
 * to each departure. Direction 1 offsets are measured from the LAST stop of
 * direction 0 (the reverse trip's origin).
 */
export function cumulativeOffsets(
  positions: StopPosition[],
  lineCode: string,
  direction: 0 | 1,
): Map<string, number> {
  const rows = positions
    .filter((p) => p.line_code === lineCode)
    .sort((a, b) => a.sequence - b.sequence)
  const forward = new Map<string, number>()
  let acc = 0
  for (const row of rows) {
    acc += row.travel_seconds_from_prev
    forward.set(row.stop_code, acc)
  }
  if (direction === 0) return forward
  const total = acc
  const reverse = new Map<string, number>()
  for (const [stop, offset] of forward) {
    reverse.set(stop, total - offset)
  }
  return reverse
}

/** Total one-way ride time of a line in seconds (same both directions). */
export function lineRideSeconds(positions: StopPosition[], lineCode: string): number {
  return positions
    .filter((p) => p.line_code === lineCode)
    .reduce((sum, p) => sum + p.travel_seconds_from_prev, 0)
}

/**
 * Adjacency graph over stops for the trip planner: for every line, BOTH
 * directions contribute directed edges between adjacent stops weighted by
 * that hop's travel time. ~48 stored positions → ~84 directed edges.
 */
export interface RideEdge {
  from: string
  to: string
  lineCode: string
  direction: 0 | 1
  seconds: number
}

export function buildRideEdges(positions: StopPosition[]): RideEdge[] {
  const edges: RideEdge[] = []
  const byLine = new Map<string, StopPosition[]>()
  for (const p of positions) {
    const list = byLine.get(p.line_code) ?? []
    list.push(p)
    byLine.set(p.line_code, list)
  }
  for (const [lineCode, rows] of byLine) {
    rows.sort((a, b) => a.sequence - b.sequence)
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]
      const cur = rows[i]
      edges.push({
        from: prev.stop_code,
        to: cur.stop_code,
        lineCode,
        direction: 0,
        seconds: cur.travel_seconds_from_prev,
      })
      edges.push({
        from: cur.stop_code,
        to: prev.stop_code,
        lineCode,
        direction: 1,
        seconds: cur.travel_seconds_from_prev,
      })
    }
  }
  return edges
}

/**
 * Direction-agnostic headway for a line (the planner's transfer-wait
 * estimate). Falls back to a conservative default when the schedule is
 * missing rather than throwing — a headway gap should degrade the estimate,
 * not 500 the planner.
 */
export const DEFAULT_HEADWAY_SECONDS = 600

export function headwayFor(schedules: LineSchedule[], lineCode: string, direction: 0 | 1): number {
  const row = schedules.find((s) => s.line_code === lineCode && s.direction === direction)
  return row?.headway_seconds ?? DEFAULT_HEADWAY_SECONDS
}
