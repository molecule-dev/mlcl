import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { LineSchedule, StopPosition } from '../lib/network.js'
import { planTrip } from '../lib/trip-planner.js'
import { ensureSeed } from './_seed.js'

const router = Router()

const planSchema = z.object({
  origin: z.string().min(1).max(8),
  destination: z.string().min(1).max(8),
})

/**
 * POST /trips/plan — origin stop code → destination stop code → up to three
 * ranked itineraries (fastest / fewest-transfers / direct when it exists).
 * Legs are enriched with stop names + line metadata for the itinerary cards;
 * clock times come from the same schedule the live boards simulate against
 * (see lib/trip-planner.ts for the algorithm).
 */
router.post('/plan', validateBody(planSchema), async (req: Request, res: Response) => {
  try {
    await ensureSeed()
    const { origin, destination } = req.body as z.infer<typeof planSchema>
    const originCode = origin.toUpperCase()
    const destinationCode = destination.toUpperCase()

    const [positionRows, scheduleRows, lineRows, stopRows] = await Promise.all([
      findMany<Record<string, unknown>>('transit_stop_positions', {
        orderBy: [
          { field: 'line_code', direction: 'asc' },
          { field: 'sequence', direction: 'asc' },
        ],
      }),
      findMany<Record<string, unknown>>('transit_schedules', {}),
      findMany<Record<string, unknown>>('transit_lines', {}),
      findMany<Record<string, unknown>>('transit_stops', {}),
    ])

    const stopName = new Map(stopRows.map((s) => [String(s.code), String(s.name)]))
    const known = new Set(stopName.keys())
    for (const code of [originCode, destinationCode]) {
      if (!known.has(code)) {
        return res
          .status(404)
          .json({ error: t('stop.notFound', {}, { defaultValue: 'Stop not found' }) })
      }
    }

    const positions: StopPosition[] = positionRows.map((row) => ({
      line_code: String(row.line_code ?? ''),
      stop_code: String(row.stop_code ?? ''),
      sequence: Number(row.sequence ?? 0),
      travel_seconds_from_prev: Number(row.travel_seconds_from_prev ?? 0),
    }))
    const schedules: LineSchedule[] = scheduleRows.map((row) => ({
      line_code: String(row.line_code ?? ''),
      direction: Number(row.direction) === 1 ? 1 : 0,
      first_departure: String(row.first_departure ?? '06:00'),
      last_departure: String(row.last_departure ?? '22:00'),
      headway_seconds: Number(row.headway_seconds ?? 600),
    }))
    const lineByCode = new Map(
      lineRows.map((row) => [
        String(row.code ?? ''),
        {
          code: String(row.code ?? ''),
          name: String(row.name ?? ''),
          kind: String(row.kind ?? 'bus'),
          color: String(row.color ?? '#000000'),
        },
      ]),
    )

    const options = planTrip({
      origin: originCode,
      destination: destinationCode,
      now: new Date(),
      positions,
      schedules,
    })

    res.json({
      origin: { code: originCode, name: stopName.get(originCode) ?? originCode },
      destination: {
        code: destinationCode,
        name: stopName.get(destinationCode) ?? destinationCode,
      },
      options: options.map((option) => ({
        strategy: option.strategy,
        transfers: option.transfers,
        ride_seconds: option.rideSeconds,
        wait_seconds: option.waitSeconds,
        total_seconds: option.totalSeconds,
        depart_at: new Date(option.departEpochMs).toISOString(),
        arrive_at: new Date(option.arriveEpochMs).toISOString(),
        legs: option.legs.map((leg) => ({
          line: lineByCode.get(leg.lineCode) ?? {
            code: leg.lineCode,
            name: leg.lineCode,
            kind: 'bus',
            color: '#000000',
          },
          direction: leg.direction,
          board_stop: { code: leg.boardStop, name: stopName.get(leg.boardStop) ?? leg.boardStop },
          alight_stop: {
            code: leg.alightStop,
            name: stopName.get(leg.alightStop) ?? leg.alightStop,
          },
          intermediate_stops: leg.intermediateStops.map((code) => ({
            code,
            name: stopName.get(code) ?? code,
          })),
          ride_seconds: leg.rideSeconds,
        })),
      })),
    })
  } catch (err) {
    logger.error('trips.plan', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
