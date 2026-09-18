/**
 * Listings handler — host-owned rental units (Airbnb-style).
 *
 * GET /listings                   — public list / search (Meilisearch with
 *                                     DataStore fallback)
 * GET /listings/:id               — public detail
 * POST /listings                  — auth + tier-gated create (host posts)
 * PUT /listings/:id               — auth + ownership (host updates own)
 * DELETE /listings/:id            — auth + ownership (host removes own)
 * GET /listings/:id/availability  — public availability lookup
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
import { deleteDocument, index, search } from '@molecule/api-search'
import { getProvider as getUploadProvider } from '@molecule/api-uploads'

import type { RentalMarketplaceLimits } from '../tiers.js'
import { decorateListing, decorateListings, parseJsonArray } from './_decorate.js'

const propertyTypeEnum = z.enum([
  'apartment',
  'house',
  'condo',
  'cabin',
  'villa',
  'loft',
  'room',
  'other',
])

const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  property_type: propertyTypeEnum.optional().default('apartment'),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  max_guests: z.number().int().positive().optional().default(1),
  bedrooms: z.number().int().nonnegative().optional().default(0),
  beds: z.number().int().nonnegative().optional().default(0),
  bathrooms: z.number().nonnegative().optional().default(0),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  thumbnails: z.array(z.string()).optional().default([]),
  price_per_night: z.number().nonnegative(),
  cleaning_fee: z.number().nonnegative().optional().default(0),
  service_fee_rate: z.number().min(0).max(1).optional().default(0.12),
  currency: z.string().optional().default('USD'),
})

const updateListingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  property_type: propertyTypeEnum.optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  max_guests: z.number().int().positive().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  beds: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  thumbnails: z.array(z.string()).optional(),
  price_per_night: z.number().nonnegative().optional(),
  cleaning_fee: z.number().nonnegative().optional(),
  service_fee_rate: z.number().min(0).max(1).optional(),
  currency: z.string().optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
})

const listListingsQuery = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  city: z.string().optional(),
  guests: z.coerce.number().int().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  amenities: z.string().optional(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  host: z.string().optional(),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const router = Router()

router.get('/', validateQuery(listListingsQuery), async (req: Request, res: Response) => {
  try {
    const { q, type, city, guests, min_price, max_price, host, sort_by, sort_order, page, limit } =
      req.query as unknown as z.infer<typeof listListingsQuery>
    const sessionUserId = res.locals.session?.userId as string | undefined

    if (q) {
      try {
        const results = await search('listings', {
          text: q,
          page,
          perPage: limit,
        })
        const docs = results.hits.map((h) => h.document as Record<string, unknown>)
        const decorated = await decorateListings(docs)
        return res.json({
          data: decorated,
          total: results.total,
          page,
          limit,
        })
      } catch (_error) {
        // Search bond not configured — fall through to DataStore.
      }
    }

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (type) where.push({ field: 'property_type', operator: '=', value: type })
    if (city) where.push({ field: 'city', operator: '=', value: city })
    if (guests) where.push({ field: 'max_guests', operator: '>=', value: guests })
    if (min_price) where.push({ field: 'price_per_night', operator: '>=', value: min_price })
    if (max_price) where.push({ field: 'price_per_night', operator: '<=', value: max_price })
    if (host) {
      // `host=me` resolves to the current session user; otherwise the
      // value is treated as a host_id literal so /api/listings?host=:id
      // also works as a public read.
      const hostId = host === 'me' ? sessionUserId : host
      if (host === 'me' && !hostId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      // SECURITY: only the OWNER may see their paused/archived rows. Compare
      // the RESOLVED id (not the literal `me`) so an owner passing their own
      // UUID still gets all statuses, while a public read of ANOTHER host's
      // id stays scoped to status='active' — otherwise the `host` filter would
      // expose every host's paused/archived listings. Mirrors the active-only
      // hosts.ts /:id/listings behaviour.
      if (hostId === sessionUserId) {
        // owner viewing own dashboard — include paused/archived
        where.length = 0
        where.push({ field: 'host_id', operator: '=', value: hostId })
      } else {
        // public read of another host — keep status='active', just scope by host
        where.push({ field: 'host_id', operator: '=', value: hostId })
      }
    }

    const options: FindManyOptions = {
      where,
      orderBy: [{ field: sort_by, direction: sort_order }],
      limit,
      offset: (page - 1) * limit,
    }
    const [rows, total] = await Promise.all([
      findMany<Record<string, unknown>>('listings', options),
      count('listings', where),
    ])
    const data = await decorateListings(rows)
    res.json({ data, total, page, limit })
  } catch (err) {
    console.error('[listings.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const listing = await findById<Record<string, unknown>>('listings', id)
    if (!listing) {
      return res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    }
    const decorated = await decorateListing(listing)
    res.json(decorated)
  } catch (error) {
    logger.error('listings.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<RentalMarketplaceLimits>({
    limitType: 'maxListings',
    getLimit: (limits) => limits.maxListings,
    getCurrent: async (userId) =>
      count('listings', [{ field: 'host_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createListingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const body = req.body as z.infer<typeof createListingSchema>

      // Best-effort geocode; never fatal — listing still gets stored at 0,0.
      let latitude = 0
      let longitude = 0
      try {
        const results = await geocode(
          `${body.address}, ${body.city}, ${body.state ?? ''} ${body.postal_code ?? ''} ${body.country ?? ''}`,
        )
        const first = Array.isArray(results) ? results[0] : results
        if (first) {
          latitude = (first as { lat?: number }).lat ?? 0
          longitude = (first as { lng?: number }).lng ?? 0
        }
      } catch (_error) {
        // Geocoding failure is non-fatal — listing still stored at 0,0.
      }

      const insertData: Record<string, unknown> = {
        host_id: userId,
        user_id: userId,
        title: body.title,
        description: body.description,
        property_type: body.property_type,
        address: body.address,
        city: body.city,
        state: body.state ?? null,
        country: body.country ?? null,
        postal_code: body.postal_code ?? null,
        latitude,
        longitude,
        max_guests: body.max_guests,
        bedrooms: body.bedrooms,
        beds: body.beds,
        bathrooms: body.bathrooms,
        price_per_night: body.price_per_night,
        cleaning_fee: body.cleaning_fee,
        service_fee_rate: body.service_fee_rate ?? 0.12,
        currency: body.currency,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // JSONB columns must be JSON-stringified before binding as pg
        // parameters — pg converts JS arrays to Postgres array literals
        // (`{...}`) by default, which fails on JSONB columns expecting
        // valid JSON. Mirrors the venue-booking + multi-vendor pattern.
        amenities: JSON.stringify(body.amenities),
        images: JSON.stringify(body.images),
        thumbnails: JSON.stringify(body.thumbnails),
      }

      const result = await create<Record<string, unknown>>('listings', insertData)
      const listing = result.data as Record<string, unknown> | null
      if (listing) {
        try {
          await index('listings', String(listing.id), listing)
        } catch (_error) {
          // best-effort: search bond not configured or unavailable.
        }
      }
      const decorated = listing ? await decorateListing(listing) : null
      res.status(201).json(decorated ?? listing)
    } catch (err) {
      console.error('[listings.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateListingSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('listings', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    }
    if (existing.host_id !== userId && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const body = req.body as z.infer<typeof updateListingSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of [
      'title',
      'description',
      'property_type',
      'address',
      'city',
      'state',
      'country',
      'postal_code',
      'max_guests',
      'bedrooms',
      'beds',
      'bathrooms',
      'price_per_night',
      'cleaning_fee',
      'service_fee_rate',
      'currency',
      'status',
    ] as const) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
    if (body.amenities !== undefined) updates.amenities = JSON.stringify(body.amenities)
    if (body.images !== undefined) updates.images = JSON.stringify(body.images)
    if (body.thumbnails !== undefined) updates.thumbnails = JSON.stringify(body.thumbnails)

    const result = await updateById<Record<string, unknown>>('listings', id, updates)
    if (result.data) {
      try {
        await index('listings', id, result.data as Record<string, unknown>)
      } catch (_error) {
        // best-effort: search bond not configured or unavailable.
      }
    }
    const decorated = result.data
      ? await decorateListing(result.data as Record<string, unknown>)
      : null
    res.json(decorated ?? result.data)
  } catch (err) {
    console.error('[listings.update]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

const UPLOADS_PREFIX = '/api/uploads/'
/** Extract the uploads-row id from a stored image URL (`/api/uploads/<id>`), or null. */
function uploadIdFromImageUrl(url: string): string | null {
  const idx = url.indexOf(UPLOADS_PREFIX)
  if (idx === -1) return null
  const id = url.slice(idx + UPLOADS_PREFIX.length).split(/[?#/]/)[0]
  return id || null
}

/**
 * Best-effort cleanup of a listing's photo storage on delete. Each image is a
 * `/api/uploads/<id>` proxy URL backed by an `uploads` row that holds the real S3
 * `file_id`, so we delete the blob then the row — otherwise a removed listing orphans
 * both. External/non-proxied URLs are skipped. Failures are logged, never fatal: the
 * listing row (source of truth) is already gone.
 */
async function cleanupListingImages(images: unknown): Promise<void> {
  const ids = parseJsonArray(images)
    .map(uploadIdFromImageUrl)
    .filter((v): v is string => v !== null)
  if (ids.length === 0) return
  // No initializer: both branches below assign it.
  let provider: ReturnType<typeof getUploadProvider> | null
  try {
    provider = getUploadProvider()
  } catch (_error) {
    // No uploads bond is wired; the loop below skips file cleanup when the provider is null.
    provider = null
  }
  for (const uploadId of ids) {
    try {
      const row = (await findById<{ id: string; file_id?: string }>('uploads', uploadId)) ?? null
      if (row?.file_id && provider) await provider.deleteFile(row.file_id)
      await deleteById('uploads', uploadId)
    } catch (error) {
      logger.error('listings.delete: image cleanup failed', { uploadId, error })
    }
  }
}

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('listings', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
    }
    if (existing.host_id !== userId && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('listings', id)
    await cleanupListingImages(existing.images)
    try {
      await deleteDocument('listings', id)
    } catch (_error) {
      // best-effort: search bond not configured or unavailable.
    }
    res.status(204).send()
  } catch (error) {
    logger.error('listings.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

const availabilityQuery = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

router.get(
  '/:id/availability',
  validateQuery(availabilityQuery),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id)
      const { start_date, end_date } = req.query as unknown as z.infer<typeof availabilityQuery>

      // Confirmed bookings whose date-range overlaps [start_date, end_date]
      // block availability. Bookings live in the canonical
      // `@molecule/api-resource-booking` table — listing identity is
      // (resourceType='listing', resourceId=<listing-id>) and dates are
      // startTime/endTime.
      const where: WhereCondition[] = [
        { field: 'resourceType', operator: '=', value: 'listing' },
        { field: 'resourceId', operator: '=', value: id },
        { field: 'status', operator: '=', value: 'confirmed' },
      ]
      const blocked = await findMany<Record<string, unknown>>('bookings', { where, limit: 500 })
      const overlap = blocked.filter((b) => {
        if (!start_date || !end_date) return true
        const bStart = b.startTime ? new Date(String(b.startTime)).getTime() : 0
        const bEnd = b.endTime ? new Date(String(b.endTime)).getTime() : 0
        const qStart = new Date(start_date).getTime()
        const qEnd = new Date(end_date).getTime()
        return bStart < qEnd && bEnd > qStart
      })
      res.json({ available: overlap.length === 0, blocked_dates: overlap })
    } catch (error) {
      logger.error('listings.availability', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
