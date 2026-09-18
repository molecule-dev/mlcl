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

import type { PropertyListingLimits } from '../tiers.js'

const router = Router()

/**
 * Build the structured `where` filters shared by the plain-list and text-search
 * paths. Both must apply the same status/owner/type/price/beds/baths/sqft
 * filters — the text-search path previously dropped all of them.
 */
export function buildPropertyFilters(
  q: {
    status?: string
    type?: string
    min_price?: number
    max_price?: number
    bedrooms?: number
    bathrooms?: number
    min_sqft?: number
    max_sqft?: number
  },
  scopedOwnerId: string | undefined,
): WhereCondition[] {
  const where: WhereCondition[] = []
  // Status: default = active for public browse; when scoping to the owner,
  // default = all so the agent sees pending/sold too.
  if (q.status && q.status !== 'all') {
    where.push({ field: 'status', operator: '=', value: q.status })
  } else if (!q.status && !scopedOwnerId) {
    where.push({ field: 'status', operator: '=', value: 'active' })
  }
  if (scopedOwnerId) where.push({ field: 'owner_id', operator: '=', value: scopedOwnerId })
  if (q.type) where.push({ field: 'property_type', operator: '=', value: q.type })
  if (q.min_price) where.push({ field: 'price', operator: '>=', value: q.min_price })
  if (q.max_price) where.push({ field: 'price', operator: '<=', value: q.max_price })
  if (q.bedrooms) where.push({ field: 'bedrooms', operator: '>=', value: q.bedrooms })
  if (q.bathrooms) where.push({ field: 'bathrooms', operator: '>=', value: q.bathrooms })
  if (q.min_sqft) where.push({ field: 'square_feet', operator: '>=', value: q.min_sqft })
  if (q.max_sqft) where.push({ field: 'square_feet', operator: '<=', value: q.max_sqft })
  return where
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const propertyTypeEnum = z.enum(['house', 'condo', 'townhouse', 'apartment', 'land'])

const createPropertySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip_code: z.string().min(1),
  price: z.number().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  square_feet: z.number().positive(),
  lot_size: z.number().positive().optional(),
  year_built: z.number().int().min(1800).max(2100).optional(),
  property_type: propertyTypeEnum,
  photos: z.array(z.string()).optional().default([]),
  features: z.array(z.string()).optional().default([]),
  agent_id: z.string().optional(),
})

const updatePropertySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  square_feet: z.number().positive().optional(),
  lot_size: z.number().positive().optional(),
  year_built: z.number().int().min(1800).max(2100).optional(),
  property_type: propertyTypeEnum.optional(),
  photos: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  status: z.enum(['active', 'pending', 'sold', 'inactive']).optional(),
})

const listPropertiesQuery = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  min_sqft: z.coerce.number().optional(),
  max_sqft: z.coerce.number().optional(),
  // owner_id=me restricts to listings owned by the authenticated user
  // (powers the /admin/listings agent view). owner_id=<uuid> is rejected
  // — we don't want one agent enumerating another agent's catalogue.
  owner_id: z.string().optional(),
  status: z.enum(['active', 'pending', 'sold', 'inactive', 'all']).optional(),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})

// ---------------------------------------------------------------------------
// GET / — List / search properties
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listPropertiesQuery), async (req: Request, res: Response) => {
  try {
    const {
      q,
      type,
      min_price,
      max_price,
      bedrooms,
      bathrooms,
      min_sqft,
      max_sqft,
      owner_id,
      status,
      sort_by,
      sort_order,
      page,
      limit,
    } = req.query as unknown as z.infer<typeof listPropertiesQuery>

    // Restrict /properties?owner_id=me to the authenticated user.
    // Anonymous + status=all => 401. Other owner_id values rejected.
    const userId = res.locals.session?.userId as string | undefined
    let scopedOwnerId: string | undefined
    if (owner_id === 'me') {
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      scopedOwnerId = userId
    } else if (owner_id) {
      return res.status(400).json({
        error: t('property.ownerScopeOnly', {}, { defaultValue: 'owner_id must be "me"' }),
      })
    }

    const baseFilters = buildPropertyFilters(
      { status, type, min_price, max_price, bedrooms, bathrooms, min_sqft, max_sqft },
      scopedOwnerId,
    )

    // Text search composes with the structured filters + sort. The search index
    // only supports equality filters (and previously the text path dropped every
    // filter + sort), so match text first, then apply the SAME filters + sort via
    // the DB, restricted to the matched ids.
    if (q) {
      const results = await search('properties', { text: q, page: 1, perPage: 1000 })
      const ids = results.hits
        .map((h) => String((h.document as { id?: unknown }).id ?? ''))
        .filter(Boolean)
      if (ids.length === 0) return res.json({ data: [], total: 0, page })
      const where: WhereCondition[] = [{ field: 'id', operator: 'in', value: ids }, ...baseFilters]
      const options: FindManyOptions = {
        where,
        orderBy: [{ field: sort_by!, direction: sort_order! }],
        limit,
        offset: (page! - 1) * limit!,
      }
      const properties = await findMany('properties', options)
      const total = await count('properties', where)
      return res.json({ data: properties, total, page })
    }

    const options: FindManyOptions = {
      where: baseFilters,
      orderBy: [{ field: sort_by!, direction: sort_order! }],
      limit,
      offset: (page! - 1) * limit!,
    }
    const properties = await findMany('properties', options)
    const total = await count('properties', baseFilters)
    res.json({ data: properties, total, page })
  } catch (error) {
    logger.error('properties.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Get property detail
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const property = await findById('properties', id)
    if (!property) {
      return res
        .status(404)
        .json({ error: t('property.notFound', {}, { defaultValue: 'Property not found' }) })
    }
    res.json(property)
  } catch (error) {
    logger.error('properties.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Create property (auth required)
// ---------------------------------------------------------------------------

router.post(
  '/',
  enforceLimit<PropertyListingLimits>({
    limitType: 'maxListings',
    getLimit: (limits) => limits.maxListings,
    getCurrent: async (userId) =>
      count('properties', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPropertySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }

      const { address, city, state, zip_code } = req.body

      let latitude = 0
      let longitude = 0
      try {
        const results = await geocode(`${address}, ${city}, ${state} ${zip_code}`)
        if (results.length > 0) {
          latitude = results[0].lat
          longitude = results[0].lng
        }
      } catch (_error) {
        // Geocoding failure is non-fatal; property is saved without coordinates
      }

      // JSONB columns must be pre-stringified — pg encodes raw JS arrays as
      // Postgres ARRAY literals (`{...}`) which the JSONB parser then either
      // rejects (non-empty) or coerces into the empty object `{}`.
      const { photos, features, ...rest } = req.body as Record<string, unknown>
      const result = await create('properties', {
        ...rest,
        photos: JSON.stringify(Array.isArray(photos) ? photos : []),
        features: JSON.stringify(Array.isArray(features) ? features : []),
        latitude,
        longitude,
        status: 'active',
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const property = result.data
      if (property) {
        try {
          await index(
            'properties',
            String((property as Record<string, unknown>).id),
            property as Record<string, unknown>,
          )
        } catch (_error) {
          // Search indexing failure is non-fatal; property is saved without search index
        }
      }

      res.status(201).json(property)
    } catch (error) {
      logger.error('properties.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// ---------------------------------------------------------------------------
// PUT /:id — Update property (auth required)
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updatePropertySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('properties', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('property.notFound', {}, { defaultValue: 'Property not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    // JSONB columns: stringify arrays only when they're present in the
    // partial body. Otherwise omit entirely so the existing column value
    // is preserved.
    const { photos, features, ...rest } = req.body as Record<string, unknown>
    const patch: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    }
    if (Array.isArray(photos)) patch.photos = JSON.stringify(photos)
    if (Array.isArray(features)) patch.features = JSON.stringify(features)

    const result = await updateById('properties', id, patch)

    res.json(result.data)
  } catch (error) {
    logger.error('properties.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Delete property (auth required)
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('properties', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('property.notFound', {}, { defaultValue: 'Property not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    await deleteById('properties', id)
    try {
      await deleteDocument('properties', id)
    } catch (_error) {
      // Search deletion failure is non-fatal; property is removed from DB regardless
    }
    res.status(204).send()
  } catch (error) {
    logger.error('properties.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id/similar — Get similar properties
// ---------------------------------------------------------------------------

router.get('/:id/similar', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const property = await findById<Record<string, unknown>>('properties', id)
    if (!property) {
      return res
        .status(404)
        .json({ error: t('property.notFound', {}, { defaultValue: 'Property not found' }) })
    }

    const price = Number(property.price)
    const where: WhereCondition[] = [
      { field: 'property_type', operator: '=', value: property.property_type },
      { field: 'status', operator: '=', value: 'active' },
      { field: 'price', operator: '>=', value: price * 0.8 },
      { field: 'price', operator: '<=', value: price * 1.2 },
    ]

    const similar = await findMany('properties', { where, limit: 6 })
    const filtered = similar.filter((p: unknown) => (p as Record<string, unknown>).id !== id)
    res.json(filtered)
  } catch (error) {
    logger.error('properties.similar', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
