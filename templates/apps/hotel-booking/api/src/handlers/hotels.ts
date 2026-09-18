import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

const router = Router()

const listQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  stars: z.coerce.number().int().min(1).max(5).optional(),
  min_price: z.coerce.number().int().nonnegative().optional(),
  max_price: z.coerce.number().int().nonnegative().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests: z.coerce.number().int().positive().optional(),
  sort_by: z.string().default('rating'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const roomsQuerySchema = z.object({
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests: z.coerce.number().int().positive().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, city, stars, min_price, max_price, rating, sort_by, page, limit } =
      req.query as unknown as z.infer<typeof listQuerySchema>

    if (q) {
      const filters: Record<string, unknown> = {}
      if (typeof stars === 'number') filters.stars = stars
      if (typeof min_price === 'number') filters.min_rate_gte = min_price
      if (typeof max_price === 'number') filters.min_rate_lte = max_price
      if (typeof rating === 'number') filters.rating_gte = rating

      const results = await search('hotels', {
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
    if (city) where.push({ field: 'city', operator: '=', value: city })
    if (typeof stars === 'number') where.push({ field: 'stars', operator: '=', value: stars })
    if (typeof rating === 'number') where.push({ field: 'rating', operator: '>=', value: rating })

    const hotels = await findMany('hotels', {
      where,
      orderBy: [{ field: sort_by, direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('hotels', where)
    res.json({ data: hotels, total, page, limit })
  } catch (error) {
    logger.error('hotels.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Owner-scoped listing — returns only hotels where owner_user_id matches the
// session userId. Multi-vendor support per inventory's "owner_user_id" notes;
// satisfies the no-IDOR ownership pattern.
router.get('/mine', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const owned = await findMany('hotels', {
      where: [{ field: 'owner_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(owned)
  } catch (error) {
    logger.error('hotels.mine', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const hotel = await findById('hotels', getParamId(req))
    if (!hotel) {
      res.status(404).json({ error: t('hotel.notFound', {}, { defaultValue: 'Hotel not found' }) })
      return
    }
    res.json(hotel)
  } catch (error) {
    logger.error('hotels.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get(
  '/:id/rooms',
  validateParams(idParamSchema),
  validateQuery(roomsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { guests } = req.query as unknown as z.infer<typeof roomsQuerySchema>
      const where: WhereCondition[] = [
        { field: 'hotel_id', operator: '=', value: getParamId(req) },
        { field: 'status', operator: '=', value: 'available' },
      ]
      // Honor the requested party size: only rooms that can seat the guests are available options.
      if (typeof guests === 'number') {
        where.push({ field: 'capacity', operator: '>=', value: guests })
      }
      const rooms = await findMany('rooms', {
        where,
        orderBy: [{ field: 'rate', direction: 'asc' }],
      })
      res.json(rooms)
    } catch (error) {
      logger.error('hotels.getRooms', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
