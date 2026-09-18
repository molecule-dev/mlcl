import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  trip_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createItineraryItemSchema = z.object({
  trip_id: z.string().optional(),
  kind: z.enum(['accommodation', 'transfer', 'activity', 'note']).default('note'),
  title: z.string().min(1).max(200),
  detail: z.string().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  cost_cents: z.coerce.number().int().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  vendor: z.string().max(200).optional(),
})

const updateItineraryItemSchema = createItineraryItemSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { trip_id, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    // Owner-scoped read — only items where user_id matches the session user.
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (trip_id) where.push({ field: 'trip_id', operator: '=', value: trip_id })

    const items = await findMany('itinerary_items', {
      where,
      orderBy: [{ field: 'start_at', direction: 'asc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: items, page, limit })
  } catch (error) {
    logger.error('itineraries.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const item = (await findById('itinerary_items', String(req.params.id))) as Record<
      string,
      unknown
    > | null
    if (!item) {
      res
        .status(404)
        .json({ error: t('itinerary.notFound', {}, { defaultValue: 'Itinerary item not found' }) })
      return
    }
    if (String(item.user_id ?? '') !== userId) {
      res
        .status(404)
        .json({ error: t('itinerary.notFound', {}, { defaultValue: 'Itinerary item not found' }) })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('itineraries.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createItineraryItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createItineraryItemSchema>
    const result = await create('itinerary_items', {
      ...body,
      user_id: userId,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('itineraries.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateItineraryItemSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const existing = (await findById('itinerary_items', String(req.params.id))) as Record<
        string,
        unknown
      > | null
      if (!existing) {
        res.status(404).json({
          error: t('itinerary.notFound', {}, { defaultValue: 'Itinerary item not found' }),
        })
        return
      }
      if (String(existing.user_id ?? '') !== userId) {
        res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
        return
      }
      const result = await updateById('itinerary_items', String(req.params.id), {
        ...(req.body as z.infer<typeof updateItineraryItemSchema>),
      })
      res.json(result.data)
    } catch (error) {
      logger.error('itineraries.update', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = (await findById('itinerary_items', String(req.params.id))) as Record<
      string,
      unknown
    > | null
    if (!existing) {
      res
        .status(404)
        .json({ error: t('itinerary.notFound', {}, { defaultValue: 'Itinerary item not found' }) })
      return
    }
    if (String(existing.user_id ?? '') !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    await deleteById('itinerary_items', String(req.params.id))
    res.status(204).send()
  } catch (error) {
    logger.error('itineraries.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
