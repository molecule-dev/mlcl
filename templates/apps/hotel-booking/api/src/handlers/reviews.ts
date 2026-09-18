import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  hotel_id: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

const createReviewSchema = z.object({
  hotel_id: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { hotel_id, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (hotel_id) {
      where.push({ field: 'resourceType', operator: '=', value: 'hotel' })
      where.push({ field: 'resourceId', operator: '=', value: hotel_id })
    }
    const reviews = await findMany('reviews', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = where.length > 0 ? await count('reviews', where) : reviews.length
    res.json({ data: reviews, total, page, limit })
  } catch (error) {
    logger.error('reviews.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { hotel_id, rating, title, body } = req.body as z.infer<typeof createReviewSchema>
    const result = await create('reviews', {
      resourceType: 'hotel',
      resourceId: hotel_id,
      userId,
      rating,
      title,
      body,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('reviews.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
