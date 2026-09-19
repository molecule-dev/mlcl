/**
 * `/api/rate-plans` — CRUD for the pricing adjustments layered on a room
 * type's base rate (weekday/weekend percent + optional date-bounded
 * seasonal override). Rate computation itself lives in `lib/pms.ts`.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  room_type_id: z.string().uuid().optional(),
})

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    room_type_id: z.string().uuid(),
    weekday_adjustment_percent: z.coerce.number().int().min(-90).max(400).default(0),
    weekend_adjustment_percent: z.coerce.number().int().min(-90).max(400).default(0),
    seasonal_override_cents: z.coerce.number().int().min(0).nullable().optional(),
    seasonal_start: dateSchema.nullable().optional(),
    seasonal_end: dateSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.seasonal_override_cents === null ||
      v.seasonal_override_cents === undefined ||
      (v.seasonal_start !== null &&
        v.seasonal_start !== undefined &&
        v.seasonal_end !== null &&
        v.seasonal_end !== undefined),
    { message: 'A seasonal override needs both seasonal_start and seasonal_end' },
  )

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  room_type_id: z.string().uuid().optional(),
  weekday_adjustment_percent: z.coerce.number().int().min(-90).max(400).optional(),
  weekend_adjustment_percent: z.coerce.number().int().min(-90).max(400).optional(),
  seasonal_override_cents: z.coerce.number().int().min(0).nullable().optional(),
  seasonal_start: dateSchema.nullable().optional(),
  seasonal_end: dateSchema.nullable().optional(),
  active: z.boolean().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { room_type_id } = req.query as unknown as z.infer<typeof listQuerySchema>
    const rows = await findMany('rate_plans', {
      orderBy: [{ field: 'name', direction: 'asc' }],
      ...(room_type_id
        ? { where: [{ field: 'room_type_id', operator: '=', value: room_type_id }] }
        : {}),
    })
    res.json({ data: rows })
  } catch (error) {
    logger.error('rate-plans.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('rate_plans', {
      name: body.name,
      room_type_id: body.room_type_id,
      weekday_adjustment_percent: body.weekday_adjustment_percent,
      weekend_adjustment_percent: body.weekend_adjustment_percent,
      seasonal_override_cents: body.seasonal_override_cents ?? null,
      seasonal_start: body.seasonal_start ?? null,
      seasonal_end: body.seasonal_end ?? null,
      active: body.active ?? true,
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('rate-plans.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      if (!getUserId(res)) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const result = await updateById('rate_plans', getParamId(req), body)
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('rate-plans.update', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    await deleteById('rate_plans', getParamId(req))
    res.status(204).end()
  } catch (error) {
    logger.error('rate-plans.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
