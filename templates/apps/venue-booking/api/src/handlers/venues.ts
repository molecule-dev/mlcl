/**
 * Venues handler — venue marketplace listings owned by hosts.
 *
 * GET /venues       — public list / search (Meilisearch fallback to DataStore)
 * GET /venues/:id   — public detail (published venues are publicly readable)
 * POST /venues      — auth + tier-gated create (host posts a listing)
 * PUT /venues/:id   — auth + ownership (host updates own listing)
 * DELETE /venues/:id — auth + ownership (host removes own listing)
 * GET /venues/:id/availability — public availability lookup for booking calendar
 */
import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { geocode } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import type { SearchQuery } from '@molecule/api-search'
import { deleteDocument, index, search } from '@molecule/api-search'

import type { VenueBookingLimits } from '../tiers.js'
import { decorateVenue, decorateVenues } from './_decorate.js'

const router = Router()

// Postgres uuid columns reject non-uuid strings with SQLSTATE 22P02, which
// used to surface as an unhandled 500. Treat any malformed id as
// "not found" instead (URLs are user-editable).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const venueTypeEnum = z.enum([
  'studio',
  'loft',
  'rooftop',
  'garden',
  'banquet',
  'workshop',
  'other',
])

const createVenueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().optional(),
  venue_type: venueTypeEnum,
  address: z.string().min(1),
  city: z.string().min(1),
  region: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  capacity: z.number().int().positive(),
  square_feet: z.number().positive().optional(),
  hourly_rate: z.number().nonnegative().optional(),
  hourly_rate_cents: z.number().int().nonnegative().optional(),
  daily_rate_cents: z.number().int().nonnegative().optional(),
  currency: z.string().optional().default('USD'),
  photos: z.array(z.string()).optional().default([]),
  amenities: z.array(z.string()).optional().default([]),
  house_rules: z.string().optional(),
})

const updateVenueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  category: z.string().optional(),
  venue_type: venueTypeEnum.optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  square_feet: z.number().positive().optional(),
  hourly_rate: z.number().nonnegative().optional(),
  hourly_rate_cents: z.number().int().nonnegative().optional(),
  daily_rate_cents: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  photos: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  house_rules: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused']).optional(),
})

const listVenuesQuery = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  city: z.string().optional(),
  capacity_min: z.coerce.number().optional(),
  capacity_max: z.coerce.number().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  amenities: z.string().optional(),
  sort_by: z.string().optional().default('rating'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})

router.get('/', validateQuery(listVenuesQuery), async (req: Request, res: Response) => {
  try {
    const { q, type, city, capacity_min, min_price, max_price, sort_by, sort_order, page, limit } =
      req.query as unknown as z.infer<typeof listVenuesQuery>

    if (q) {
      const query: SearchQuery = {
        text: q,
        page: page!,
        perPage: limit!,
      }
      try {
        const results = await search('venues', query)
        const decorated = await decorateVenues(
          results.hits.map((h) => h.document) as Record<string, unknown>[],
        )
        return res.json({ data: decorated, total: results.total, page })
      } catch (_error) {
        // Search failure — fall through to DataStore.
      }
    }

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (type) where.push({ field: 'venue_type', operator: '=', value: type })
    if (city) where.push({ field: 'city', operator: '=', value: city })
    if (capacity_min) where.push({ field: 'capacity', operator: '>=', value: capacity_min })
    if (min_price) where.push({ field: 'hourly_rate', operator: '>=', value: min_price })
    if (max_price) where.push({ field: 'hourly_rate', operator: '<=', value: max_price })

    const options: FindManyOptions = {
      where,
      orderBy: [{ field: sort_by!, direction: sort_order! }],
      limit: limit!,
      offset: (page! - 1) * limit!,
    }
    const venues = await findMany<Record<string, unknown>>('venues', options)
    const decorated = await decorateVenues(venues)
    res.json({ data: decorated, page })
  } catch (error) {
    logger.error('venues.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    if (!UUID_RE.test(id)) {
      return res
        .status(404)
        .json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
    }
    const venue = await findById<Record<string, unknown>>('venues', id)
    if (!venue) {
      return res
        .status(404)
        .json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
    }
    const decorated = await decorateVenue(venue)
    res.json(decorated)
  } catch (error) {
    logger.error('venues.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<VenueBookingLimits>({
    limitType: 'maxVenues',
    getLimit: (limits) => limits.maxVenues,
    getCurrent: async (userId) =>
      count('venues', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createVenueSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }

      const { address, city, region, postal_code } = req.body as Record<string, string | undefined>
      let latitude = 0
      let longitude = 0
      try {
        const results = await geocode(`${address}, ${city}, ${region ?? ''} ${postal_code ?? ''}`)
        if (results.length > 0) {
          latitude = results[0].lat
          longitude = results[0].lng
        }
      } catch (_error) {
        // Geocoding failure is non-fatal — listing still gets stored at 0,0.
      }

      const body = req.body as Record<string, unknown>
      const insertData: Record<string, unknown> = {
        ...body,
        latitude,
        longitude,
        host_user_id: userId,
        owner_id: userId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      // JSONB columns must be JSON-stringified before binding as pg parameters
      // — pg converts JS arrays to Postgres array literals (`{...}`) by
      // default, which fails on JSONB columns expecting valid JSON.
      if (Array.isArray(insertData.photos)) insertData.photos = JSON.stringify(insertData.photos)
      if (Array.isArray(insertData.amenities))
        insertData.amenities = JSON.stringify(insertData.amenities)

      const result = await create('venues', insertData)
      const venue = result.data as Record<string, unknown> | null
      if (venue) {
        try {
          await index('venues', String(venue.id), venue)
        } catch (_error) {
          // Search indexing failure is non-fatal.
        }
      }
      res.status(201).json(venue)
    } catch (err) {
      // Surface the underlying error to the API logs so failures are
      // diagnosable from the verify-script smoke logs without manual
      // re-instrumentation.
      logger.error('venues.create', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateVenueSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('venues', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const updateData: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    }
    if (Array.isArray(updateData.photos)) updateData.photos = JSON.stringify(updateData.photos)
    if (Array.isArray(updateData.amenities))
      updateData.amenities = JSON.stringify(updateData.amenities)
    const result = await updateById('venues', id, updateData)
    res.json(result.data)
  } catch (err) {
    logger.error('venues.update', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('venues', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('venues', id)
    try {
      await deleteDocument('venues', id)
    } catch (_error) {
      // Search deletion failure is non-fatal.
    }
    res.status(204).send()
  } catch (error) {
    logger.error('venues.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const availabilities = await findMany('availabilities', {
      where: [{ field: 'venue_id', operator: '=', value: id }],
      orderBy: [{ field: 'day_of_week', direction: 'asc' }],
    })
    res.json({ data: availabilities })
  } catch (error) {
    logger.error('venues.availability', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
