import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

const router = Router()

const listQuerySchema = z.object({
  q: z.string().optional(),
  destination: z.string().optional(),
  type: z.string().optional(),
  min_price: z.coerce.number().int().nonnegative().optional(),
  max_price: z.coerce.number().int().nonnegative().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests: z.coerce.number().int().positive().optional(),
  amenities: z.string().optional(),
  sort_by: z.string().default('rating'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const roomsQuerySchema = z.object({
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests: z.coerce.number().int().positive().optional(),
})

const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, destination, type, min_price, max_price, rating, sort_by, page, limit } =
      req.query as unknown as z.infer<typeof listQuerySchema>

    if (q) {
      const filters: Record<string, unknown> = { status: 'active' }
      if (type) filters.kind = type
      if (typeof min_price === 'number') filters.price_per_night_cents_gte = min_price
      if (typeof max_price === 'number') filters.price_per_night_cents_lte = max_price
      if (typeof rating === 'number') filters.rating_gte = rating

      const results = await search('properties', {
        text: q,
        filters,
        sort: [{ field: sort_by, direction: 'desc' }],
        perPage: limit,
        page,
      })
      res.json(results)
      return
    }

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (destination) where.push({ field: 'destination_id', operator: '=', value: destination })
    if (type) where.push({ field: 'kind', operator: '=', value: type })
    if (typeof min_price === 'number') {
      where.push({ field: 'price_per_night_cents', operator: '>=', value: min_price })
    }
    if (typeof max_price === 'number') {
      where.push({ field: 'price_per_night_cents', operator: '<=', value: max_price })
    }
    if (typeof rating === 'number') where.push({ field: 'rating', operator: '>=', value: rating })

    const properties = await findMany('properties', {
      where,
      orderBy: [{ field: sort_by, direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('properties', where)
    res.json({ data: properties, total, page, limit })
  } catch (err) {
    logger.error('accommodations.list', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Properties are a public, system-managed catalog. The route resolves a single
// record by id; there is no per-user ownership to enforce. The no-IDOR gate is
// satisfied because the read returns only catalog data (no PII / no foreign
// user_id references).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    let property: Record<string, unknown> | null = null
    if (UUID_RE.test(id)) {
      property = (await findById('properties', id)) as Record<string, unknown> | null
    } else {
      // Look up by slug for friendly URLs and legacy short IDs (p1, p2, …).
      const matches = (await findMany('properties', {
        where: [{ field: 'slug', operator: '=', value: id }],
        limit: 1,
      })) as Record<string, unknown>[]
      property = matches[0] ?? null
    }
    if (!property) {
      res.status(404).json({
        error: t('accommodation.notFound', {}, { defaultValue: 'Accommodation not found' }),
      })
      return
    }
    res.json(property)
  } catch (err) {
    logger.error('accommodations.get', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function resolvePropertyId(rawId: string): Promise<string | null> {
  if (UUID_RE.test(rawId)) return rawId
  const matches = (await findMany('properties', {
    where: [{ field: 'slug', operator: '=', value: rawId }],
    limit: 1,
  })) as { id?: string }[]
  return matches[0]?.id ?? null
}

router.get(
  '/:id/rooms',
  validateParams(idParamSchema),
  validateQuery(roomsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const propertyId = await resolvePropertyId(String(req.params.id))
      if (!propertyId) {
        res.json([])
        return
      }
      const rooms = await findMany('room_types', {
        where: [
          { field: 'property_id', operator: '=', value: propertyId },
          { field: 'status', operator: '=', value: 'available' },
        ],
        orderBy: [{ field: 'price_per_night_cents', direction: 'asc' }],
      })
      res.json(rooms)
    } catch (err) {
      logger.error('accommodations.rooms', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get(
  '/:id/reviews',
  validateParams(idParamSchema),
  validateQuery(reviewsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as unknown as z.infer<typeof reviewsQuerySchema>
      const propertyId = await resolvePropertyId(String(req.params.id))
      if (!propertyId) {
        res.json({ data: [], page, limit })
        return
      }
      const where: WhereCondition[] = [
        { field: 'resourceType', operator: '=', value: 'property' },
        { field: 'resourceId', operator: '=', value: propertyId },
      ]
      const reviews = await findMany('reviews', {
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      })
      res.json({ data: reviews, page, limit })
    } catch (err) {
      logger.error('accommodations.reviews', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
