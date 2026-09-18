import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  order_id: z.string().optional(),
})
const createRefundSchema = z.object({
  order_id: z.string().min(1),
  reason: z.string().min(1),
})
const updateRefundSchema = z.object({
  status: z.enum(['approved', 'declined', 'processed']),
  stripe_refund_id: z.string().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const { order_id } = req.query as Record<string, string | undefined>
    if (order_id) where.push({ field: 'order_id', operator: '=', value: order_id })
    const refunds = await findMany('order_refunds', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(refunds)
  } catch (err) {
    logger.error('refunds GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createRefundSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const order = await findById<Record<string, unknown>>('orders', req.body.order_id)
    if (!order || order.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    const result = await create('order_refunds', {
      user_id: userId,
      order_id: req.body.order_id,
      requested_by: userId,
      reason: req.body.reason,
      status: 'requested',
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('refunds POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateRefundSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const refund = await findById<Record<string, unknown>>('order_refunds', id)
      if (!refund) {
        return res
          .status(404)
          .json({ error: t('refund.notFound', {}, { defaultValue: 'Refund not found' }) })
      }
      // Status mutation: organizer-of-event only.
      const order = await findById<Record<string, unknown>>('orders', String(refund.order_id))
      if (!order) {
        return res
          .status(404)
          .json({ error: t('refund.notFound', {}, { defaultValue: 'Refund not found' }) })
      }
      const event = await findById<Record<string, unknown>>('events', String(order.event_id))
      const isOrganizer = event && (event.organizer_user_id === userId || event.user_id === userId)
      if (!isOrganizer) {
        return res
          .status(403)
          .json({ error: t('refund.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      const update: Record<string, unknown> = {
        status: req.body.status,
        updated_at: new Date(),
      }
      if (req.body.status === 'processed') {
        update.processed_at = new Date()
        update.stripe_refund_id = req.body.stripe_refund_id ?? null
      }
      const result = await updateById('order_refunds', id, update)
      res.json(result.data)
    } catch (err) {
      logger.error('refunds PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
