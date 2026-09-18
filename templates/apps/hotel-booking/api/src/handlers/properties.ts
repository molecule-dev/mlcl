/**
 * `/api/properties` — view-shaped alias of `/api/hotels`. The frontend
 * (SearchResults, PropertyDetail, BookingCheckout) was authored against
 * the property-shaped fixture contract; this handler decorates raw
 * `hotels` rows into that shape so handlers, tests, and UI all agree
 * on field names like `price_per_night_cents` and `gallery: string[]`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import {
  decorateProperties,
  decorateProperty,
  decorateReviews,
  decorateRooms,
} from './_decorate.js'

const router = Router()

const listQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  stars: z.coerce.number().int().min(1).max(5).optional(),
  sort_by: z.enum(['rating', 'min_rate', 'created_at']).default('rating'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const { q, city, stars, sort_by, page, limit } = req.query as unknown as z.infer<
    typeof listQuerySchema
  >

  const where: Array<{ field: string; operator: string; value: unknown }> = [
    { field: 'status', operator: '=', value: 'active' },
  ]
  if (city) where.push({ field: 'city', operator: '=', value: city })
  if (typeof stars === 'number') where.push({ field: 'stars', operator: '=', value: stars })

  const rows = await findMany<Record<string, unknown>>('hotels', {
    where: where as never,
    orderBy: [{ field: sort_by, direction: 'desc' }],
    limit,
    offset: (page - 1) * limit,
  })

  let decorated = await decorateProperties(rows)
  if (q) {
    // Tokenize so "City, Country" queries (e.g. from the landing page's
    // featured-destination cards) match "… City Country …" haystacks.
    const tokens = q
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean)
    decorated = decorated.filter((p) => {
      const haystack = `${p.name} ${p.city} ${p.country} ${p.description}`.toLowerCase()
      return tokens.every((token) => haystack.includes(token))
    })
  }

  res.json({ data: decorated, total: decorated.length, page, limit })
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const hotel = await findById<Record<string, unknown>>('hotels', getParamId(req))
  if (!hotel) {
    res.status(404).json({ error: t('hotel.notFound', {}, { defaultValue: 'Property not found' }) })
    return
  }
  res.json(await decorateProperty(hotel))
})

router.get('/:id/rooms', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const rooms = await findMany<Record<string, unknown>>('rooms', {
    where: [
      { field: 'hotel_id', operator: '=', value: getParamId(req) },
      { field: 'status', operator: '=', value: 'available' },
    ],
    orderBy: [{ field: 'rate', direction: 'asc' }],
  })
  res.json({ data: decorateRooms(rooms) })
})

router.get('/:id/reviews', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const reviews = await findMany<Record<string, unknown>>('reviews', {
    where: [
      { field: 'resourceType', operator: '=', value: 'hotel' },
      { field: 'resourceId', operator: '=', value: getParamId(req) },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 50,
  })
  res.json({ data: await decorateReviews(reviews) })
})

export default router
