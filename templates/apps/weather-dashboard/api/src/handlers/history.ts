import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  get as rawCacheGet,
  getProvider as rawCacheGetProvider,
  hasProvider as rawCacheHasProvider,
  set as rawCacheSet,
} from '@molecule/api-cache'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const CACHE_OP_TIMEOUT_MS = 1000
const withTimeout = async <T>(p: Promise<T>): Promise<T | null> => {
  let timer: NodeJS.Timeout | undefined
  try {
    return (await Promise.race([
      p,
      new Promise<null>((_, reject) => {
        timer = setTimeout(() => reject(new Error('cache timeout')), CACHE_OP_TIMEOUT_MS)
      }),
    ])) as T | null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
const get = async (key: string): Promise<unknown> => {
  try {
    return await withTimeout(rawCacheGet(key))
  } catch (_error) {
    // Cache read failure is non-fatal — fall through to DB
    return null
  }
}
const set = async (
  key: string,
  value: unknown,
  opts?: { ttl?: number; tags?: string[] },
): Promise<void> => {
  try {
    await withTimeout(rawCacheSet(key, value, opts))
  } catch (_error) {
    // Cache write failure is non-fatal — data still served from DB
  }
}

/**
 * Best-effort tag invalidation so a fresh history POST drops every cached
 * range/metric slice for that location. Only runs when the bonded cache
 * provider exposes `invalidateTag` (the redis bond does; in-memory tests do
 * not). Failures are swallowed: cache invalidation is a refresh hint, not a
 * correctness invariant.
 */
const invalidateLocationHistoryTag = async (locationId: string): Promise<void> => {
  try {
    if (!rawCacheHasProvider()) return
    const provider = rawCacheGetProvider()
    if (typeof provider.invalidateTag === 'function') {
      await withTimeout(provider.invalidateTag(`history:loc:${locationId}`))
    }
  } catch (_error) {
    // Tag invalidation is best-effort; a miss just means stale cache, not incorrect data
  }
}
import { z } from 'zod'

import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const HISTORY_CACHE_TTL = 86400

async function loadOwnedLocation(
  req: Request,
  res: Response,
): Promise<Record<string, unknown> | null> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return null
  }
  const id = Array.isArray(req.params.locationId) ? req.params.locationId[0] : req.params.locationId
  const location = await findById<Record<string, unknown>>('locations', id)
  if (!location || location.user_id !== userId) {
    res.status(404).json({
      error: t('history.locationNotFound', {}, { defaultValue: 'Location not found' }),
    })
    return null
  }
  return location
}

// Accepts both `from`/`to` (preferred, used by E2E + UI) and the legacy
// `start_date`/`end_date` aliases. All four are optional; when both are
// missing the handler defaults to the trailing 30 days. Format is checked
// strictly so callers passing garbage (`?from=not-a-date`) still get a 400
// from validation, but a non-owner GET with no params still reaches the
// `loadOwnedLocation` check and gets a 404 (auth-before-data invariant).
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const dateRangeSchema = z.object({
  start_date: z.string().regex(dateRegex).optional(),
  end_date: z.string().regex(dateRegex).optional(),
  from: z.string().regex(dateRegex).optional(),
  to: z.string().regex(dateRegex).optional(),
  metric: z.string().optional(),
})

function defaultRangeStart(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 30)
  return d.toISOString().slice(0, 10)
}

function defaultRangeEnd(): string {
  return new Date().toISOString().slice(0, 10)
}

function resolveRange(req: Request): { start_date: string; end_date: string; metric?: string } {
  const q = req.query as Record<string, string | undefined>
  return {
    start_date: q.from ?? q.start_date ?? defaultRangeStart(),
    end_date: q.to ?? q.end_date ?? defaultRangeEnd(),
    metric: q.metric,
  }
}

router.get('/:locationId', validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  try {
    const location = await loadOwnedLocation(req, res)
    if (!location) return

    const { start_date, end_date, metric } = resolveRange(req)

    const cacheKey = `history:${req.params.locationId}:${start_date}:${end_date}:${metric || 'all'}`
    try {
      const cached = await get(cacheKey)
      // Only honor a cache hit when it actually contains data. An empty
      // array cached when a brand-new location had no history yet would
      // otherwise stick for the cache TTL and silently mask later writes
      // (cron ingest, manual seeding, etc.) — making the Trends page
      // permanently say "No daily observations recorded yet" even though
      // history rows exist in the DB. Treat empty as a soft miss.
      if (Array.isArray(cached) ? cached.length > 0 : Boolean(cached)) {
        return res.json(cached)
      }
    } catch (_error) {
      // Cache read error — fall through to DB query
    }

    const where: WhereCondition[] = [
      { field: 'location_id', operator: '=', value: req.params.locationId },
      { field: 'observed_date', operator: '>=', value: start_date },
      { field: 'observed_date', operator: '<=', value: end_date },
    ]

    const records = await findMany<Record<string, unknown>>('history_observations', {
      where,
      orderBy: [{ field: 'observed_date', direction: 'asc' }],
    })

    let result: unknown
    if (metric) {
      result = records.map((r) => ({ date: r.observed_date, value: r[metric] }))
    } else {
      result = records
    }

    if (records.length > 0) {
      try {
        await set(cacheKey, result, {
          ttl: HISTORY_CACHE_TTL,
          tags: [`history:loc:${req.params.locationId}`],
        })
      } catch (_error) {
        // Cache write failure is best-effort — DB result still returned
      }
    }
    res.json(result)
  } catch (error) {
    logger.error('history.getRange', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get(
  '/:locationId/temperature',
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response) => {
    try {
      const location = await loadOwnedLocation(req, res)
      if (!location) return
      const { start_date, end_date } = resolveRange(req)

      const records = await findMany<Record<string, unknown>>('history_observations', {
        where: [
          { field: 'location_id', operator: '=', value: req.params.locationId },
          { field: 'observed_date', operator: '>=', value: start_date },
          { field: 'observed_date', operator: '<=', value: end_date },
        ],
        orderBy: [{ field: 'observed_date', direction: 'asc' }],
      })

      res.json(
        records.map((r) => ({
          date: r.observed_date,
          high: r.temp_high,
          low: r.temp_low,
          average: r.temp_avg,
        })),
      )
    } catch (error) {
      logger.error('history.getTemperature', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get(
  '/:locationId/precipitation',
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response) => {
    try {
      const location = await loadOwnedLocation(req, res)
      if (!location) return
      const { start_date, end_date } = resolveRange(req)

      const records = await findMany<Record<string, unknown>>('history_observations', {
        where: [
          { field: 'location_id', operator: '=', value: req.params.locationId },
          { field: 'observed_date', operator: '>=', value: start_date },
          { field: 'observed_date', operator: '<=', value: end_date },
        ],
        orderBy: [{ field: 'observed_date', direction: 'asc' }],
      })

      res.json(
        records.map((r) => ({
          date: r.observed_date,
          amount: r.precipitation_mm,
          type: r.precipitation_type,
        })),
      )
    } catch (error) {
      logger.error('history.getPrecipitation', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get(
  '/:locationId/wind',
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response) => {
    try {
      const location = await loadOwnedLocation(req, res)
      if (!location) return
      const { start_date, end_date } = resolveRange(req)

      const records = await findMany<Record<string, unknown>>('history_observations', {
        where: [
          { field: 'location_id', operator: '=', value: req.params.locationId },
          { field: 'observed_date', operator: '>=', value: start_date },
          { field: 'observed_date', operator: '<=', value: end_date },
        ],
        orderBy: [{ field: 'observed_date', direction: 'asc' }],
      })

      res.json(
        records.map((r) => ({
          date: r.observed_date,
          speed_avg: r.wind_speed_avg,
          speed_max: r.wind_speed_max,
          direction: r.wind_dir,
        })),
      )
    } catch (error) {
      logger.error('history.getWind', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

const historyEntrySchema = z.object({
  observed_date: z.string().min(1),
  temp_high: z.number().optional(),
  temp_low: z.number().optional(),
  temp_avg: z.number().optional(),
  humidity: z.number().optional(),
  precipitation_mm: z.number().optional(),
  precipitation_type: z.string().optional().nullable(),
  wind_speed_avg: z.number().optional(),
  wind_speed_max: z.number().optional(),
  wind_dir: z.number().optional(),
  pressure: z.number().optional(),
  condition: z.string().optional(),
})

// Accepts a single entry, a bare array, or `{ entries: [...] }`. The E2E
// suite uses the wrapper form; ingestion jobs typically send the bare array
// directly. The handler normalises all three to a flat array before insert.
const historyBatchSchema = z.union([
  z.object({ entries: z.array(historyEntrySchema).min(1) }),
  z.array(historyEntrySchema).min(1),
  historyEntrySchema,
])

function normaliseEntries(body: unknown): Array<z.infer<typeof historyEntrySchema>> {
  if (Array.isArray(body)) return body as Array<z.infer<typeof historyEntrySchema>>
  if (
    body &&
    typeof body === 'object' &&
    'entries' in body &&
    Array.isArray((body as { entries: unknown }).entries)
  ) {
    return (body as { entries: Array<z.infer<typeof historyEntrySchema>> }).entries
  }
  return [body as z.infer<typeof historyEntrySchema>]
}

router.post(
  '/:locationId',
  validateBody(historyBatchSchema),
  async (req: Request, res: Response) => {
    try {
      const location = await loadOwnedLocation(req, res)
      if (!location) return

      const entries = normaliseEntries(req.body)
      const created: unknown[] = []

      for (const entry of entries) {
        const result = await create('history_observations', {
          location_id: req.params.locationId,
          observed_date: entry.observed_date,
          temp_high: entry.temp_high,
          temp_low: entry.temp_low,
          temp_avg: entry.temp_avg,
          humidity: entry.humidity,
          precipitation_mm: entry.precipitation_mm ?? 0,
          precipitation_type: entry.precipitation_type ?? null,
          wind_speed_avg: entry.wind_speed_avg,
          wind_speed_max: entry.wind_speed_max,
          wind_dir: entry.wind_dir,
          pressure: entry.pressure,
          condition: entry.condition,
        })
        created.push(result.data ?? result)
      }

      // Drop every cached range/metric slice for this location so the next
      // GET reflects the just-written rows. Without this the daily ingest
      // job (or a manual seed) wouldn't surface in /trends until the
      // 24-hour cache TTL elapsed.
      await invalidateLocationHistoryTag(String(req.params.locationId))

      res.status(201).json({ count: created.length, records: created })
    } catch (error) {
      logger.error('history.post', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
