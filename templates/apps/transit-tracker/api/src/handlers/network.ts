import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import {
  cumulativeOffsets,
  isLineKind,
  type LineSchedule,
  orderedStops,
  type StopPosition,
  type TransitLine,
  type TransitStop,
} from '../lib/network.js'
import { ensureSeed } from './_seed.js'

const router = Router()

const stopsQuerySchema = z.object({
  q: z.string().min(1).optional(),
  limit: z.string().optional(),
})

const lineParamSchema = z.object({
  code: z.string().min(1).max(8),
})

const stopParamSchema = z.object({
  code: z.string().min(1).max(8),
})

async function loadLines(): Promise<TransitLine[]> {
  const rows = await findMany<Record<string, unknown>>('transit_lines', {
    orderBy: [{ field: 'code', direction: 'asc' }],
  })
  return rows.map((row) => ({
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    kind: isLineKind(String(row.kind ?? 'bus')) ? (row.kind as TransitLine['kind']) : 'bus',
    color: String(row.color ?? '#000000'),
    polyline: Array.isArray(row.polyline) ? (row.polyline as Array<[number, number]>) : [],
  }))
}

async function loadStops(): Promise<TransitStop[]> {
  const rows = await findMany<Record<string, unknown>>('transit_stops', {
    orderBy: [{ field: 'name', direction: 'asc' }],
  })
  return rows.map((row) => ({
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    hub: Boolean(row.hub ?? false),
  }))
}

async function loadPositions(): Promise<StopPosition[]> {
  const rows = await findMany<Record<string, unknown>>('transit_stop_positions', {
    orderBy: [
      { field: 'line_code', direction: 'asc' },
      { field: 'sequence', direction: 'asc' },
    ],
  })
  return rows.map((row) => ({
    line_code: String(row.line_code ?? ''),
    stop_code: String(row.stop_code ?? ''),
    sequence: Number(row.sequence ?? 0),
    travel_seconds_from_prev: Number(row.travel_seconds_from_prev ?? 0),
  }))
}

async function loadSchedules(): Promise<LineSchedule[]> {
  const rows = await findMany<Record<string, unknown>>('transit_schedules', {
    orderBy: [{ field: 'line_code', direction: 'asc' }],
  })
  return rows.map((row) => ({
    line_code: String(row.line_code ?? ''),
    direction: Number(row.direction) === 1 ? 1 : 0,
    first_departure: String(row.first_departure ?? '06:00'),
    last_departure: String(row.last_departure ?? '22:00'),
    headway_seconds: Number(row.headway_seconds ?? 600),
  }))
}

/** Lines serving each stop code, derived from the positions table. */
function linesByStop(positions: StopPosition[], lines: TransitLine[]): Map<string, TransitLine[]> {
  const map = new Map<string, TransitLine[]>()
  for (const p of positions) {
    const line = lines.find((l) => l.code === p.line_code)
    if (!line) continue
    const list = map.get(p.stop_code) ?? []
    if (!list.some((l) => l.code === line.code)) list.push(line)
    map.set(p.stop_code, list)
  }
  return map
}

/** All lines with their direction-0 stop code list (map + overview shapes). */
router.get('/lines', async (_req: Request, res: Response) => {
  try {
    await ensureSeed()
    const [lines, positions] = await Promise.all([loadLines(), loadPositions()])
    res.json(
      lines.map((line) => ({
        ...line,
        stops: orderedStops(positions, line.code, 0),
      })),
    )
  } catch (err) {
    logger.error('network.lines', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/lines/:code', validateParams(lineParamSchema), async (req: Request, res: Response) => {
  try {
    await ensureSeed()
    const code = String(req.params.code).toUpperCase()
    const lines = await loadLines()
    const line = lines.find((l) => l.code === code)
    if (!line) {
      return res
        .status(404)
        .json({ error: t('line.notFound', {}, { defaultValue: 'Line not found' }) })
    }
    const [positions, schedules, stops] = await Promise.all([
      loadPositions(),
      loadSchedules(),
      loadStops(),
    ])
    const byCode = new Map(stops.map((s) => [s.code, s]))
    const order0 = orderedStops(positions, code, 0)
    const offsets0 = cumulativeOffsets(positions, code, 0)
    const offsets1 = cumulativeOffsets(positions, code, 1)
    const stopRows = order0.map((stopCode, index) => {
      const stop = byCode.get(stopCode)
      return {
        ...stop,
        code: stopCode,
        sequence: index + 1,
        offset_seconds_0: offsets0.get(stopCode) ?? 0,
        offset_seconds_1: offsets1.get(stopCode) ?? 0,
      }
    })
    const lineSchedules = schedules
      .filter((s) => s.line_code === code)
      .map((s) => ({
        direction: s.direction,
        first_departure: s.first_departure,
        last_departure: s.last_departure,
        headway_seconds: s.headway_seconds,
      }))
    res.json({ line, stops: stopRows, schedules: lineSchedules })
  } catch (err) {
    logger.error('network.lineDetail', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Stop list for the Nearby page + stop pickers. `q` filters name/code
 * substring (case-insensitive); without it every stop returns, hubs first —
 * the "nearby-ish" default board for a fictional city with no geolocation.
 */
router.get('/stops', validateQuery(stopsQuerySchema), async (req: Request, res: Response) => {
  try {
    await ensureSeed()
    const { q, limit } = req.query as Record<string, string | undefined>
    const cap = Math.min(Math.max(Number(limit) || 100, 1), 200)
    const where: WhereCondition[] = []
    if (q) {
      // findMany WHERE is AND-only, so like the donor's airport search we
      // fan out one ilike per field and union client-side.
      const fields = ['name', 'code'] as const
      const results = await Promise.all(
        fields.map((field) =>
          findMany<Record<string, unknown>>('transit_stops', {
            where: [{ field, operator: 'ilike', value: q }],
            orderBy: [{ field: 'name', direction: 'asc' }],
            limit: cap,
          }),
        ),
      )
      const seen = new Set<string>()
      const stops: Array<Record<string, unknown>> = []
      for (const list of results) {
        for (const row of list) {
          const code = String(row.code ?? '')
          if (code && !seen.has(code)) {
            seen.add(code)
            stops.push(row)
          }
        }
      }
      stops.sort((a, b) => Number(b.hub ?? false) - Number(a.hub ?? false))
      return res.json(stops.slice(0, cap))
    }
    where.push({ field: 'hub', operator: '=', value: true })
    const [hubs, all] = await Promise.all([
      findMany<Record<string, unknown>>('transit_stops', {
        where,
        orderBy: [{ field: 'name', direction: 'asc' }],
      }),
      findMany<Record<string, unknown>>('transit_stops', {
        orderBy: [{ field: 'name', direction: 'asc' }],
      }),
    ])
    const hubCodes = new Set(hubs.map((h) => String(h.code)))
    const ordered = [...hubs, ...all.filter((s) => !hubCodes.has(String(s.code)))]
    res.json(ordered.slice(0, cap))
  } catch (err) {
    logger.error('network.stops', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/stops/:code', validateParams(stopParamSchema), async (req: Request, res: Response) => {
  try {
    await ensureSeed()
    const code = String(req.params.code).toUpperCase()
    const stops = await loadStops()
    const stop = stops.find((s) => s.code === code)
    if (!stop) {
      return res
        .status(404)
        .json({ error: t('stop.notFound', {}, { defaultValue: 'Stop not found' }) })
    }
    const [lines, positions] = await Promise.all([loadLines(), loadPositions()])
    const serving = (linesByStop(positions, lines).get(code) ?? []).map((line) => ({
      ...line,
      stops: orderedStops(positions, line.code, 0),
    }))
    res.json({ stop, lines: serving })
  } catch (err) {
    logger.error('network.stopDetail', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
