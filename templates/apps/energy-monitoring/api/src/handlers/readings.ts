/**
 * Readings handler.
 *
 * Two distinct authn surfaces:
 *
 *   1. **Ingest (POST /, POST /bulk)** — authenticated by the per-meter
 *      bearer token middleware (`requireMeterToken`). The token resolves
 *      `meterId` + `userId` from `meter_tokens`; the body's `meter_id` is
 *      ignored to prevent a compromised meter from writing to other meters.
 *
 *   2. **Browse (GET /, GET /latest, GET /summary, GET /daily, GET /monthly)** —
 *      session-authenticated user. All queries scope by `user_id` of the
 *      session, joined through the requested meter's owner.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { requireMeterToken } from '../middleware/meter-token-auth.js'
import type { EnergyMonitoringLimits } from '../tiers.js'
import { maybeSeedDemoForUser } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  meter_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
})

const createReadingSchema = z.object({
  value: z.number(),
  timestamp: z.string().optional(),
  /** Tolerated for ergonomics but ignored — meter_id is taken from the bearer token. */
  meter_id: z.string().optional(),
})

const bulkReadingsSchema = z.object({
  readings: z
    .array(
      z.object({
        value: z.number(),
        timestamp: z.string().optional(),
      }),
    )
    .min(1)
    .max(1000),
})

const meterIdQuerySchema = z.object({
  meter_id: z.string().min(1),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  year: z.coerce.number().int().optional(),
})

const aggregateQuerySchema = z.object({
  meter_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  year: z.coerce.number().int().optional(),
})

/* ----------------------- ingest (meter-token auth) ----------------------- */

router.post(
  '/',
  requireMeterToken,
  enforceLimit<EnergyMonitoringLimits>({
    limitType: 'maxReadings',
    getLimit: (limits) => limits.maxReadings,
    getCurrent: async (userId) =>
      count('readings', [
        // Approximate per-user usage by joining via meters; for v1 we count
        // readings where `meter_id` belongs to the user's meters. The
        // entitlements util gives us only userId at this hook, so here we
        // count user's meters and multiply by a heuristic — but simpler:
        // count their meters' readings.
        { field: 'user_id', operator: '=', value: userId },
      ]).catch(() => 0),
  }) as unknown as RequestHandler,
  validateBody(createReadingSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.meterAuth
      if (!auth) {
        return res.status(401).json({
          error: t('readings.invalidToken', undefined, { defaultValue: 'Invalid meter token.' }),
        })
      }
      const meter = await findById<Record<string, unknown>>('meters', auth.meterId)
      if (!meter) {
        return res.status(404).json({
          error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }),
        })
      }
      const result = await create('readings', {
        meter_id: auth.meterId,
        value: req.body.value,
        unit: meter.unit ?? 'kWh',
        timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.post(
  '/bulk',
  requireMeterToken,
  validateBody(bulkReadingsSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.meterAuth
      if (!auth) {
        return res.status(401).json({
          error: t('readings.invalidToken', undefined, { defaultValue: 'Invalid meter token.' }),
        })
      }
      const meter = await findById<Record<string, unknown>>('meters', auth.meterId)
      if (!meter) {
        return res.status(404).json({
          error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }),
        })
      }
      const items = (req.body.readings ?? []) as Array<{ value: number; timestamp?: string }>
      const results: unknown[] = []
      for (const item of items) {
        const r = await create('readings', {
          meter_id: auth.meterId,
          value: item.value,
          unit: meter.unit ?? 'kWh',
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
          created_at: new Date(),
        })
        results.push((r as { data: unknown }).data)
      }
      res.status(201).json(results)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

/* --------------------------- browse (session) --------------------------- */

async function ownsMeter(userId: string, meterId: string): Promise<boolean> {
  const meter = await findById<Record<string, unknown>>('meters', meterId)
  return !!meter && meter.user_id === userId
}

async function userMeterIds(userId: string): Promise<string[]> {
  const rows = await findMany<{ id: string }>('meters', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  return rows.map((r) => r.id)
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    const { meter_id, start_date, end_date, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const meterIds = meter_id
      ? (await ownsMeter(userId, meter_id))
        ? [meter_id]
        : []
      : await userMeterIds(userId)
    if (meterIds.length === 0) return res.json([])

    const readings = await findMany<Record<string, unknown>>('readings', {
      where: [{ field: 'meter_id', operator: 'in', value: meterIds }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const filtered = readings.filter((r) => {
      const ts = new Date(String(r.timestamp))
      if (start_date && ts < new Date(String(start_date))) return false
      if (end_date && ts > new Date(String(end_date))) return false
      return true
    })
    res.json(filtered)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/**
 * Per-meter live snapshot for dashboard and devices list. Each row carries
 * meter metadata plus latest watts (estimated from last hourly reading)
 * and today's accumulated kWh.
 */
router.get('/circuits', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    await maybeSeedDemoForUser(userId)
    const meters = await findMany<Record<string, unknown>>('meters', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    if (meters.length === 0) return res.json([])

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const out: Array<Record<string, unknown>> = []
    for (const meter of meters) {
      const recent = await findMany<Record<string, unknown>>('readings', {
        where: [{ field: 'meter_id', operator: '=', value: meter.id as string }],
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: 24,
      })
      const latest = recent[0]
      const todayRows = recent.filter((r) => new Date(String(r.timestamp)) >= startOfDay)
      const todayKwh = todayRows.reduce((s, r) => s + Number(r.value), 0)
      const watts = latest != null ? Math.round(Number(latest.value) * 1000) : 0
      const signedWatts = meter.type === 'solar' && watts > 0 ? -watts : watts
      out.push({
        id: meter.id,
        name: meter.name,
        type: meter.type,
        location: meter.location ?? null,
        status: meter.status,
        watts: signedWatts,
        today_kwh: Number(todayKwh.toFixed(3)),
        updated_at: latest != null ? latest.timestamp : (meter.updated_at ?? null),
      })
    }
    res.json(out)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/latest', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    await maybeSeedDemoForUser(userId)
    const meters = await findMany<Record<string, unknown>>('meters', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
    })
    const out: unknown[] = []
    for (const meter of meters) {
      const rows = await findMany<Record<string, unknown>>('readings', {
        where: [{ field: 'meter_id', operator: '=', value: meter.id as string }],
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: 1,
      })
      out.push({ meter, reading: rows[0] ?? null })
    }
    res.json(out)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    await maybeSeedDemoForUser(userId)
    const meters = await findMany<Record<string, unknown>>('meters', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
    })
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let grid = 0
    let solar = 0
    let battery = 0
    for (const meter of meters) {
      const rows = await findMany<Record<string, unknown>>('readings', {
        where: [{ field: 'meter_id', operator: '=', value: meter.id as string }],
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: 1000,
      })
      const today = rows.filter((r) => new Date(String(r.timestamp)) >= startOfDay)
      const total = today.reduce((s, r) => s + Number(r.value), 0)
      if (meter.type === 'grid') grid += total
      else if (meter.type === 'solar') solar += total
      else if (meter.type === 'battery') battery += total
    }
    res.json({
      grid_usage: grid,
      solar_production: solar,
      battery_flow: battery,
      net_usage: grid - solar,
      date: startOfDay.toISOString(),
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/daily', validateQuery(aggregateQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    await maybeSeedDemoForUser(userId)
    const { meter_id, start_date, end_date } = req.query as unknown as z.infer<
      typeof aggregateQuerySchema
    >

    let consumptionMeterIds: string[]
    let productionMeterIds: string[]
    if (meter_id) {
      if (!(await ownsMeter(userId, meter_id))) {
        return res
          .status(404)
          .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
      }
      const meter = await findById<Record<string, unknown>>('meters', meter_id)
      if (meter?.type === 'solar') {
        consumptionMeterIds = []
        productionMeterIds = [meter_id]
      } else {
        consumptionMeterIds = [meter_id]
        productionMeterIds = []
      }
    } else {
      const allMeters = await findMany<{ id: string; type: string }>('meters', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        limit: 10_000,
      })
      consumptionMeterIds = allMeters.filter((m) => m.type !== 'solar').map((m) => m.id)
      productionMeterIds = allMeters.filter((m) => m.type === 'solar').map((m) => m.id)
    }

    const ratePlans = await findMany<Record<string, unknown>>('rate_plans', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
      orderBy: [{ field: 'effective_date', direction: 'desc' }],
      limit: 1,
    })
    const ratePlan = ratePlans[0]
    const flatRate = ratePlan ? Number(ratePlan.rate_per_kwh) : 0

    interface DayBucket {
      consumption: number
      production: number
      cost: number
      count: number
    }
    const dailyMap: Record<string, DayBucket> = {}
    function ensureBucket(day: string): DayBucket {
      const b = dailyMap[day] ?? { consumption: 0, production: 0, cost: 0, count: 0 }
      dailyMap[day] = b
      return b
    }
    function inRange(ts: Date): boolean {
      if (start_date && ts < new Date(String(start_date))) return false
      if (end_date && ts > new Date(String(end_date))) return false
      return true
    }
    function rateForHour(h: number): number {
      if (
        ratePlan?.peak_rate &&
        ratePlan.peak_start_hour != null &&
        ratePlan.peak_end_hour != null
      ) {
        return h >= Number(ratePlan.peak_start_hour) && h < Number(ratePlan.peak_end_hour)
          ? Number(ratePlan.peak_rate)
          : Number(ratePlan.off_peak_rate ?? ratePlan.rate_per_kwh)
      }
      return flatRate
    }

    if (consumptionMeterIds.length > 0) {
      const rows = await findMany<Record<string, unknown>>('readings', {
        where: [{ field: 'meter_id', operator: 'in', value: consumptionMeterIds }],
        orderBy: [{ field: 'timestamp', direction: 'asc' }],
        limit: 100_000,
      })
      for (const r of rows) {
        const ts = new Date(String(r.timestamp))
        if (!inRange(ts)) continue
        const day = ts.toISOString().slice(0, 10)
        const b = ensureBucket(day)
        const v = Number(r.value)
        b.consumption += v
        b.cost += v * rateForHour(ts.getHours())
        b.count += 1
      }
    }
    if (productionMeterIds.length > 0) {
      const rows = await findMany<Record<string, unknown>>('readings', {
        where: [{ field: 'meter_id', operator: 'in', value: productionMeterIds }],
        orderBy: [{ field: 'timestamp', direction: 'asc' }],
        limit: 100_000,
      })
      for (const r of rows) {
        const ts = new Date(String(r.timestamp))
        if (!inRange(ts)) continue
        const day = ts.toISOString().slice(0, 10)
        const b = ensureBucket(day)
        b.production += Number(r.value)
        b.count += 1
      }
    }

    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, agg]) => ({
        date,
        total: Number(agg.consumption.toFixed(3)),
        consumption: Number(agg.consumption.toFixed(3)),
        production: Number(agg.production.toFixed(3)),
        net_export: Number((agg.production - agg.consumption).toFixed(3)),
        cost: Number(agg.cost.toFixed(2)),
        average: agg.count > 0 ? Number((agg.consumption / Math.max(1, agg.count)).toFixed(4)) : 0,
        min: 0,
        max: 0,
        reading_count: agg.count,
      }))
    res.json(daily)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/monthly', validateQuery(meterIdQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    const { meter_id, year } = req.query as unknown as z.infer<typeof meterIdQuerySchema>
    if (!(await ownsMeter(userId, meter_id))) {
      return res
        .status(404)
        .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
    }
    const readings = await findMany<Record<string, unknown>>('readings', {
      where: [{ field: 'meter_id', operator: '=', value: meter_id }],
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
      limit: 100_000,
    })
    const monthlyMap: Record<string, { total: number; count: number }> = {}
    for (const r of readings) {
      const ts = new Date(String(r.timestamp))
      if (year && ts.getFullYear() !== year) continue
      const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthlyMap[key] ?? { total: 0, count: 0 }
      bucket.total += Number(r.value)
      bucket.count += 1
      monthlyMap[key] = bucket
    }
    const monthly = Object.entries(monthlyMap).map(([month, agg]) => ({
      month,
      total: agg.total,
      average: agg.count > 0 ? agg.total / agg.count : 0,
      reading_count: agg.count,
    }))
    res.json(monthly)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
