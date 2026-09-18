import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  event_id: z.string().min(1),
})

const createTierSchema = z.object({
  event_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price_cents: z.number().int().min(0),
  quantity_total: z.number().int().min(0),
})

const updateTierSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price_cents: z.number().int().min(0).optional(),
  quantity_total: z.number().int().min(0).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { event_id } = req.query as { event_id: string }
    const where: WhereCondition[] = [{ field: 'event_id', operator: '=', value: event_id }]
    const tiers = await findMany('ticket_tiers', {
      where,
      orderBy: [{ field: 'price_cents', direction: 'asc' }],
    })
    res.json(tiers)
  } catch (err) {
    logger.error('ticket-tiers GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const tier = await findById<Record<string, unknown>>('ticket_tiers', id)
    if (!tier) {
      return res
        .status(404)
        .json({ error: t('ticket.tierNotFound', {}, { defaultValue: 'Ticket tier not found' }) })
    }
    res.json(tier)
  } catch (err) {
    logger.error('ticket-tiers GET :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTierSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    // Authorize: caller must own the parent event.
    const event = await findById<Record<string, unknown>>('events', req.body.event_id)
    if (!event || (event.organizer_user_id !== userId && event.user_id !== userId)) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    const result = await create('ticket_tiers', {
      ...req.body,
      user_id: userId,
      quantity_sold: 0,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('ticket-tiers POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTierSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('ticket_tiers', id)
      if (!existing || existing.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket tier not found' }) })
      }
      const result = await updateById('ticket_tiers', id, {
        ...req.body,
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('ticket-tiers PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('ticket_tiers', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket tier not found' }) })
    }
    await deleteById('ticket_tiers', id)
    res.status(204).end()
  } catch (err) {
    logger.error('ticket-tiers DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
