/**
 * Deterministic "live" arrival simulation — no DB, no Express, no bonds.
 *
 * THE SIMULATION, documented once (per the template spec): transit-tracker
 * has no real-time vehicle feed. Arrivals are COMPUTED server-side from the
 * seeded schedule + the request clock:
 *
 *   service runs from first_departure to last_departure every headway_seconds
 *   (a departure at D reaches stop S after its cumulative travel offset O(S))
 *   ⇒ arrival(S, k) = first + k·headway + O(S)     for k = 0, 1, 2, …
 *
 * The next N arrivals at a stop are the first N k-values whose arrival is
 * still in the future. Pure function of `now` — no randomness anywhere near
 * zero, no polling feed, no websocket: two requests a second apart show
 * countdowns exactly one second apart. "Live" = recomputed per request.
 *
 * CLOCK CONVENTIONS: all arithmetic is in seconds-since-UTC-midnight of the
 * request instant. A `last_departure` at/below `first_departure` (e.g.
 * '00:40' after '05:10') means service past midnight and is shifted by +24h,
 * so late-evening boards correctly show post-midnight arrivals as next-day
 * timestamps. The fictional network has no real timezone; the UI renders
 * clock times in the browser's locale from the epoch milliseconds returned.
 *
 * @module
 */

/** 'HH:MM' (or 'HH:MM:SS') → seconds since midnight. */
export function parseClock(value: string): number {
  const parts = value.split(':').map((n) => Number.parseInt(n, 10))
  const [h = 0, m = 0, s = 0] = parts
  return h * 3600 + m * 60 + s
}

/** UTC seconds-since-midnight of a Date (the simulation's "now" axis). */
export function secondsSinceUtcMidnight(now: Date): number {
  return now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()
}

export interface ScheduleWindow {
  firstDeparture: string
  lastDeparture: string
  headwaySeconds: number
}

/** Expanded service window in seconds since midnight, with past-midnight fix-up. */
export function serviceWindow(schedule: ScheduleWindow): { first: number; last: number } {
  const first = parseClock(schedule.firstDeparture)
  let last = parseClock(schedule.lastDeparture)
  if (last <= first) last += 86_400
  return { first, last }
}

/** One simulated vehicle arrival at a stop. */
export interface SimulatedArrival {
  /** Line serving the arrival. */
  lineCode: string
  direction: 0 | 1
  /** Final stop of the trip — the "toward" destination on the board. */
  destinationStop: string
  /** Absolute arrival time (epoch ms) — renderable as a clock time. */
  arrivalEpochMs: number
  /** arrivalEpochMs − now, in seconds. Board countdowns derive from this. */
  secondsUntil: number
}

export interface SimulateArrivalsInput {
  now: Date
  lineCode: string
  direction: 0 | 1
  /** Ordered stop codes for THIS direction (network.orderedStops). */
  stopOrder: string[]
  /** Cumulative travel offset of the boarding stop (network.cumulativeOffsets). */
  offsetSeconds: number
  schedule: ScheduleWindow
  /** How many upcoming arrivals to return. */
  count: number
}

/**
 * The next `count` arrivals at one stop on one line+direction. Empty when
 * service has ended for the day (after the last vehicle passes the stop).
 */
export function simulateNextArrivals(input: SimulateArrivalsInput): SimulatedArrival[] {
  const { now, lineCode, direction, stopOrder, offsetSeconds, schedule, count } = input
  if (count <= 0 || stopOrder.length === 0) return []
  const { first, last } = serviceWindow(schedule)
  const headway = schedule.headwaySeconds
  if (headway <= 0) return []

  const nowSec = secondsSinceUtcMidnight(now)
  const dayStartMs = now.getTime() - nowSec * 1000
  const destinationStop = stopOrder[stopOrder.length - 1]

  // Smallest departure index whose arrival at this stop is still ahead.
  let k = Math.ceil((nowSec - first - offsetSeconds) / headway)
  if (k < 0) k = 0

  const arrivals: SimulatedArrival[] = []
  while (arrivals.length < count) {
    const departure = first + k * headway
    if (departure > last) break // service over for the day
    const arrivalSec = departure + offsetSeconds
    const arrivalEpochMs = dayStartMs + arrivalSec * 1000
    if (arrivalEpochMs > now.getTime()) {
      arrivals.push({
        lineCode,
        direction,
        destinationStop,
        arrivalEpochMs,
        secondsUntil: Math.round((arrivalEpochMs - now.getTime()) / 1000),
      })
    }
    k++
  }
  return arrivals
}

/**
 * Next departure (epoch ms) of a line+direction from a boarding stop at or
 * after `notBefore` — the trip planner uses it to anchor each leg's clock
 * time. Null when no further vehicle departs today (service window closed).
 */
export function nextDepartureAfter(
  now: Date,
  offsetSeconds: number,
  schedule: ScheduleWindow,
  notBeforeMs: number,
): number | null {
  const { first, last } = serviceWindow(schedule)
  const headway = schedule.headwaySeconds
  if (headway <= 0) return null
  const nowSec = secondsSinceUtcMidnight(now)
  const dayStartMs = now.getTime() - nowSec * 1000
  // Departure must put the vehicle at the boarding stop no earlier than
  // notBefore: departure + offset >= notBefore.
  const notBeforeSec = (notBeforeMs - dayStartMs) / 1000
  let k = Math.ceil((notBeforeSec - first - offsetSeconds) / headway)
  if (k < 0) k = 0
  const departure = first + k * headway
  if (departure > last) return null
  return dayStartMs + departure * 1000
}

/** Board-facing countdown label source: 0-59s → 'due', else whole minutes. */
export function minutesLabel(secondsUntil: number): 'due' | number {
  if (secondsUntil < 60) return 'due'
  return Math.floor(secondsUntil / 60)
}
