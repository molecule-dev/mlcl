/**
 * Trip planner over the mock network — no DB, no Express, no bonds.
 *
 * ALGORITHM, documented once (per the template spec): Dijkstra over a
 * state graph of (stop × line × direction) nodes.
 *
 *   node  = "riding line L in direction D, positioned at stop S"
 *   edge  = one adjacent-stop hop (network.buildRideEdges); riding it costs
 *           hop.seconds
 *   board = switching onto a DIFFERENT line at an interchange costs, on top
 *           of the hop, an expected wait of headway(L,D)/2 — the average
 *           wait for a passenger arriving at a random moment. Same-line
 *           continuation costs no extra wait.
 *   start = a virtual origin node whose every outgoing edge is a boarding.
 *   goal  = any node positioned at the destination stop.
 *
 * Two optimizations are run and returned alongside any direct (0-transfer)
 * line: fastest overall (pure time) and fewest transfers (lexicographic
 * (transfers, time) Dijkstra). Duplicate itineraries (same leg sequence)
 * collapse; the handler returns up to three ranked options.
 *
 * TIMELINE: leg clock times are anchored with the arrivals module — each
 * leg boards the next actual scheduled departure after the previous leg's
 * arrival (nextDepartureAfter), so depart/arrive timestamps are the SAME
 * deterministic schedule the live boards show, not invented numbers.
 *
 * The graph is ~36 stops × 6 lines → at most a few hundred nodes; Dijkstra
 * runs in microseconds and needs no caching.
 *
 * @module
 */

import { nextDepartureAfter } from './arrivals.js'
import {
  buildRideEdges,
  cumulativeOffsets,
  headwayFor,
  type LineSchedule,
  orderedStops,
  type RideEdge,
  type StopPosition,
} from './network.js'

/** One ride segment: same vehicle (line+direction) from board to alight. */
export interface PlannerLeg {
  lineCode: string
  direction: 0 | 1
  boardStop: string
  alightStop: string
  /** Pure in-vehicle time for this leg. */
  rideSeconds: number
  /** Stops passed between board and alight (excludes both endpoints). */
  intermediateStops: string[]
}

export interface PlannedItinerary {
  legs: PlannerLeg[]
  transfers: number
  rideSeconds: number
  waitSeconds: number
  departEpochMs: number
  arriveEpochMs: number
  totalSeconds: number
  /** 'fastest' | 'fewest-transfers' | 'direct' — first strategy that found it. */
  strategy: string
}

export interface PlanTripInput {
  origin: string
  destination: string
  now: Date
  positions: StopPosition[]
  schedules: LineSchedule[]
  maxOptions?: number
}

interface QueueItem {
  node: string
  stop: string
  line: string | null
  direction: 0 | 1 | null
  /** Primary cost: seconds (incl. waits) or transfers, per run mode. */
  costA: number
  /** Secondary cost: seconds for the transfers-first run, else 0. */
  costB: number
}

function scheduleFor(
  schedules: LineSchedule[],
  lineCode: string,
  direction: 0 | 1,
): { firstDeparture: string; lastDeparture: string; headwaySeconds: number } | null {
  const row = schedules.find((s) => s.line_code === lineCode && s.direction === direction)
  if (!row) return null
  return {
    firstDeparture: row.first_departure,
    lastDeparture: row.last_departure,
    headwaySeconds: row.headway_seconds,
  }
}

/** Dijkstra core; `mode` picks fastest (false) vs fewest-transfers (true). */
function search(
  origin: string,
  destination: string,
  edges: RideEdge[],
  schedules: LineSchedule[],
  transfersFirst: boolean,
): Array<{ edge: RideEdge; waitSeconds: number }> | null {
  const edgesFrom = new Map<string, RideEdge[]>()
  for (const e of edges) {
    const list = edgesFrom.get(e.from) ?? []
    list.push(e)
    edgesFrom.set(e.from, list)
  }

  const best = new Map<string, { costA: number; costB: number }>()
  const prev = new Map<string, { node: string; edge: RideEdge; waitSeconds: number }>()
  const originNode = `${origin}||`
  best.set(originNode, { costA: 0, costB: 0 })

  const queue: QueueItem[] = [
    { node: originNode, stop: origin, line: null, direction: null, costA: 0, costB: 0 },
  ]
  const settled = new Set<string>()
  let goalNode: string | null = null

  while (queue.length > 0) {
    queue.sort((a, b) => a.costA - b.costA || a.costB - b.costB)
    const cur = queue.shift() as QueueItem
    if (settled.has(cur.node)) continue
    settled.add(cur.node)
    if (cur.stop === destination && cur.line !== null) {
      goalNode = cur.node
      break
    }
    for (const edge of edgesFrom.get(cur.stop) ?? []) {
      const boarding = cur.line !== edge.lineCode
      const wait = boarding
        ? Math.round(headwayFor(schedules, edge.lineCode, edge.direction) / 2)
        : 0
      const rideA = transfersFirst ? (boarding ? 1 : 0) : edge.seconds + wait
      const rideB = transfersFirst ? edge.seconds : 0
      const nextCost = {
        costA: cur.costA + rideA,
        costB: cur.costB + rideB,
      }
      const nextNode = `${edge.to}|${edge.lineCode}|${edge.direction}`
      const known = best.get(nextNode)
      if (
        known &&
        (known.costA < nextCost.costA ||
          (known.costA === nextCost.costA && known.costB <= nextCost.costB))
      ) {
        continue
      }
      best.set(nextNode, nextCost)
      prev.set(nextNode, { node: cur.node, edge, waitSeconds: wait })
      queue.push({
        node: nextNode,
        stop: edge.to,
        line: edge.lineCode,
        direction: edge.direction,
        costA: nextCost.costA,
        costB: nextCost.costB,
      })
    }
  }

  if (!goalNode) return null
  const path: Array<{ edge: RideEdge; waitSeconds: number }> = []
  let node: string | null = goalNode
  while (node && node !== originNode) {
    const step = prev.get(node)
    if (!step) break
    path.unshift({ edge: step.edge, waitSeconds: step.waitSeconds })
    node = step.node
  }
  return path
}

/** Collapse a hop path into legs (consecutive same line+direction hops). */
function toLegs(path: Array<{ edge: RideEdge }>, positions: StopPosition[]): PlannerLeg[] {
  const legs: PlannerLeg[] = []
  for (const { edge } of path) {
    const last = legs[legs.length - 1]
    if (
      last &&
      last.lineCode === edge.lineCode &&
      last.direction === edge.direction &&
      last.alightStop === edge.from
    ) {
      last.alightStop = edge.to
      last.rideSeconds += edge.seconds
      last.intermediateStops.push(edge.from)
    } else {
      legs.push({
        lineCode: edge.lineCode,
        direction: edge.direction,
        boardStop: edge.from,
        alightStop: edge.to,
        rideSeconds: edge.seconds,
        intermediateStops: [],
      })
    }
  }
  // intermediateStops should exclude board+alight (already true) — but the
  // collapse above pushed the leg's own continuation hops; assert-free trim:
  for (const leg of legs) {
    leg.intermediateStops = leg.intermediateStops.filter((s) => s !== leg.alightStop)
  }
  void positions
  return legs
}

/**
 * Anchor a leg sequence to the real schedule clock: each leg boards the
 * next departure after the previous leg's arrival. Returns null when the
 * day's service can no longer serve the plan (post-midnight tail).
 */
function buildTimeline(
  legs: PlannerLeg[],
  now: Date,
  positions: StopPosition[],
  schedules: LineSchedule[],
): Omit<PlannedItinerary, 'legs' | 'transfers' | 'strategy'> | null {
  let boardAt = now.getTime()
  let waitTotal = 0
  let departEpochMs = 0
  let arriveEpochMs = 0
  for (const leg of legs) {
    const schedule = scheduleFor(schedules, leg.lineCode, leg.direction)
    if (!schedule) return null
    const offsets = cumulativeOffsets(positions, leg.lineCode, leg.direction)
    const offset = offsets.get(leg.boardStop)
    if (offset === undefined) return null
    const vehicleOriginDeparture = nextDepartureAfter(now, offset, schedule, boardAt)
    if (vehicleOriginDeparture === null) return null
    // The passenger boards when the VEHICLE reaches their stop — the origin
    // departure plus the leg's boarding offset.
    const boardsAt = vehicleOriginDeparture + offset * 1000
    const wait = Math.max(0, boardsAt - boardAt)
    waitTotal += wait
    if (departEpochMs === 0) departEpochMs = boardsAt
    arriveEpochMs = boardsAt + leg.rideSeconds * 1000
    boardAt = arriveEpochMs
  }
  return {
    rideSeconds: legs.reduce((sum, l) => sum + l.rideSeconds, 0),
    waitSeconds: waitTotal,
    departEpochMs,
    arriveEpochMs,
    totalSeconds: Math.round((arriveEpochMs - now.getTime()) / 1000),
  }
}

function signature(itinerary: PlannedItinerary): string {
  return itinerary.legs
    .map((l) => `${l.lineCode}:${l.direction}:${l.boardStop}>${l.alightStop}`)
    .join('|')
}

/**
 * Plan origin→destination. Returns up to `maxOptions` (default 3) DISTINCT
 * itineraries, best first. Empty array when origin === destination or no
 * path exists (disconnected stops / service window closed).
 */
export function planTrip(input: PlanTripInput): PlannedItinerary[] {
  const { origin, destination, now, positions, schedules, maxOptions = 3 } = input
  if (origin === destination) return []
  const stops = new Set(positions.map((p) => p.stop_code))
  if (!stops.has(origin) || !stops.has(destination)) return []

  const edges = buildRideEdges(positions)
  const results: PlannedItinerary[] = []
  const seen = new Set<string>()

  const push = (path: Array<{ edge: RideEdge }>, strategy: string): void => {
    const legs = toLegs(path, positions)
    if (legs.length === 0) return
    const timeline = buildTimeline(legs, now, positions, schedules)
    if (!timeline) return
    const itinerary: PlannedItinerary = {
      legs,
      transfers: legs.length - 1,
      ...timeline,
      strategy,
    }
    const sig = signature(itinerary)
    if (seen.has(sig)) return
    seen.add(sig)
    results.push(itinerary)
  }

  // 1. Fastest overall.
  const fastest = search(origin, destination, edges, schedules, false)
  if (fastest) push(fastest, 'fastest')

  // 2. Fewest transfers (may coincide with fastest — deduped by signature).
  const fewest = search(origin, destination, edges, schedules, true)
  if (fewest) push(fewest, 'fewest-transfers')

  // 3. Any direct line (0 transfers) in either direction.
  const linesThroughOrigin = [
    ...new Set(positions.filter((p) => p.stop_code === origin).map((p) => p.line_code)),
  ]
  for (const lineCode of linesThroughOrigin) {
    for (const direction of [0, 1] as const) {
      const order = orderedStops(positions, lineCode, direction)
      const from = order.indexOf(origin)
      const to = order.indexOf(destination)
      if (from === -1 || to === -1 || to <= from) continue
      const hops: Array<{ edge: RideEdge; waitSeconds: number }> = []
      for (let i = from; i < to; i++) {
        hops.push({
          edge: edges.find(
            (e) =>
              e.from === order[i] &&
              e.to === order[i + 1] &&
              e.lineCode === lineCode &&
              e.direction === direction,
          ) as RideEdge,
          waitSeconds: 0,
        })
      }
      if (hops.every((h) => h.edge)) push(hops, 'direct')
    }
  }

  results.sort((a, b) => a.totalSeconds - b.totalSeconds || a.transfers - b.transfers)
  return results.slice(0, maxOptions)
}
