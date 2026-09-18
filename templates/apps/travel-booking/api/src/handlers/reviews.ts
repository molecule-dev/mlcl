import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  property_id: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

const createReviewSchema = z.object({
  property_id: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const { property_id, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
  const where: WhereCondition[] = []
  if (property_id) {
    where.push({ field: 'resourceType', operator: '=', value: 'property' })
    where.push({ field: 'resourceId', operator: '=', value: property_id })
  }
  const reviews = await findMany('reviews', {
    where,
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit,
    offset: (page - 1) * limit,
  })
  const total = where.length > 0 ? await count('reviews', where) : reviews.length
  res.json({ data: reviews, total, page, limit })
})

router.post('/', validateBody(createReviewSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { property_id, rating, title, body } = req.body as z.infer<typeof createReviewSchema>
  const result = await create('reviews', {
    resourceType: 'property',
    resourceId: property_id,
    userId,
    rating,
    title,
    body,
  })
  res.status(201).json(result.data)
})

export default router
