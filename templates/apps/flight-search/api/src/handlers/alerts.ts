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
  active: z.string().optional(),
})

const createAlertSchema = z.object({
  origin_iata: z.string().min(2).max(8),
  origin_city: z.string().optional(),
  destination_iata: z.string().min(2).max(8),
  destination_city: z.string().optional(),
  target_price_cents: z.number().int().min(0),
  current_lowest_cents: z.number().int().min(0).optional(),
  departure_date: z.string().optional(),
  return_date: z.string().optional(),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
})

const updateAlertSchema = createAlertSchema.partial().extend({
  active: z.boolean().optional(),
  current_lowest_cents: z.number().int().min(0).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { active } = req.query as Record<string, string | undefined>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (active === 'true') where.push({ field: 'active', operator: '=', value: true })
    if (active === 'false') where.push({ field: 'active', operator: '=', value: false })
    const alerts = await findMany('price_alerts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(alerts)
  } catch (err) {
    logger.error('alerts.list', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('price_alerts', id)
    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alert.notFound', {}, { defaultValue: 'Alert not found' }) })
    }
    res.json(alert)
  } catch (err) {
    logger.error('alerts.get', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const result = await create<Record<string, unknown>>('price_alerts', {
      ...req.body,
      user_id: userId,
      active: true,
      history: [],
      cabin: req.body.cabin ?? 'economy',
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('alerts.create', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('price_alerts', id)
      if (!existing || existing.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('alert.notFound', {}, { defaultValue: 'Alert not found' }) })
      }
      const result = await updateById('price_alerts', id, {
        ...req.body,
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('alerts.update', err)
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
    const existing = await findById<Record<string, unknown>>('price_alerts', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('alert.notFound', {}, { defaultValue: 'Alert not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('alert.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('price_alerts', id)
    res.status(204).end()
  } catch (err) {
    logger.error('alerts.delete', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
