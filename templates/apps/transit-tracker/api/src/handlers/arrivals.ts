import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { type SimulatedArrival, simulateNextArrivals } from '../lib/arrivals.js'
import {
  cumulativeOffsets,
  isLineKind,
  type LineSchedule,
  orderedStops,
  type StopPosition,
  type TransitLine,
} from '../lib/network.js'
import { ensureSeed } from './_seed.js'

const router = Router()

const arrivalsQuerySchema = z.object({
  count: z.string().optional(),
  line: z.string().min(1).max(8).optional(),
})

const stopParamSchema = z.object({
  code: z.string().min(1).max(8),
})

/** One board row: the simulated arrival + the UI-facing line metadata. */
export interface ArrivalRow extends SimulatedArrival {
  line: { code: string; name: string; kind: TransitLine['kind']; color: string }
  destinationName: string
}

/**
 * GET /arrivals/:stopCode — the live board. Merges the simulated next
 * arrivals of EVERY line+direction serving the stop, sorted soonest-first.
 * `?line=M1` scopes the board to one line. Deterministic: same clock in,
 * same board out (see lib/arrivals.ts for the simulation contract).
 *
 * The network is 36 stops / 6 lines — loading it whole per request is a
 * handful of rows and keeps this handler stateless (no cache bond needed).
 */
router.get(
  '/:code',
  validateParams(stopParamSchema),
  validateQuery(arrivalsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      await ensureSeed()
      const code = String(req.params.code).toUpperCase()
      const { count, line: lineFilter } = req.query as Record<string, string | undefined>
      const perService = Math.min(Math.max(Number(count) || 3, 1), 10)
      const boardLimit = Math.min(Math.max(Number(count) || 8, 1), 20)

      const [lineRows, positionRows, scheduleRows, stopRows, allStops] = await Promise.all([
        findMany<Record<string, unknown>>('transit_lines', {
          orderBy: [{ field: 'code', direction: 'asc' }],
        }),
        findMany<Record<string, unknown>>('transit_stop_positions', {
          orderBy: [
            { field: 'line_code', direction: 'asc' },
            { field: 'sequence', direction: 'asc' },
          ],
        }),
        findMany<Record<string, unknown>>('transit_schedules', {
          orderBy: [{ field: 'line_code', direction: 'asc' }],
        }),
        findMany<Record<string, unknown>>('transit_stops', {
          where: [{ field: 'code', operator: '=', value: code }],
        }),
        findMany<Record<string, unknown>>('transit_stops', {}),
      ])

      const stop = stopRows[0]
      if (!stop) {
        return res
          .status(404)
          .json({ error: t('stop.notFound', {}, { defaultValue: 'Stop not found' }) })
      }
      const stopName = new Map(allStops.map((s) => [String(s.code), String(s.name)]))

      const lines: TransitLine[] = lineRows.map((row) => ({
        code: String(row.code ?? ''),
        name: String(row.name ?? ''),
        kind: isLineKind(String(row.kind ?? 'bus')) ? (row.kind as TransitLine['kind']) : 'bus',
        color: String(row.color ?? '#000000'),
        polyline: Array.isArray(row.polyline) ? (row.polyline as Array<[number, number]>) : [],
      }))
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

      const now = new Date()
      const rows: ArrivalRow[] = []
      for (const line of lines) {
        if (lineFilter && line.code !== lineFilter.toUpperCase()) continue
        for (const direction of [0, 1] as const) {
          const stopOrder = orderedStops(positions, line.code, direction)
          if (!stopOrder.includes(code)) continue
          const offsets = cumulativeOffsets(positions, line.code, direction)
          const offset = offsets.get(code) ?? 0
          const schedule = schedules.find(
            (s) => s.line_code === line.code && s.direction === direction,
          )
          if (!schedule) continue
          for (const arrival of simulateNextArrivals({
            now,
            lineCode: line.code,
            direction,
            stopOrder,
            offsetSeconds: offset,
            schedule: {
              firstDeparture: schedule.first_departure,
              lastDeparture: schedule.last_departure,
              headwaySeconds: schedule.headway_seconds,
            },
            count: perService,
          })) {
            rows.push({
              ...arrival,
              line: { code: line.code, name: line.name, kind: line.kind, color: line.color },
              destinationName: stopName.get(arrival.destinationStop) ?? arrival.destinationStop,
            })
          }
        }
      }
      rows.sort((a, b) => a.arrivalEpochMs - b.arrivalEpochMs)

      res.json({
        stop: { code, name: String(stop.name ?? ''), hub: Boolean(stop.hub ?? false) },
        generated_at: now.toISOString(),
        arrivals: rows.slice(0, boardLimit),
      })
    } catch (err) {
      console.error('[arrivals.board] failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
