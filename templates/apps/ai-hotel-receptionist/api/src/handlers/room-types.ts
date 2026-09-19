/**
 * `/api/room-types` — CRUD for the sellable room categories.
 *
 * Single-property PMS: rows belong to the property, not to one user, so
 * every route requires an authenticated session but none filters by
 * user_id (see migration header note).
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
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  occupancy: z.coerce.number().int().min(1).max(12).default(2),
  base_rate_cents: z.coerce.number().int().min(0),
  amenities: z.array(z.string().max(60)).max(24).optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await findMany('room_types', {
      orderBy: [{ field: 'base_rate_cents', direction: 'asc' }],
    })
    res.json({ data: rows })
  } catch (error) {
    logger.error('room-types.list', error)
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
    const result = await create('room_types', {
      name: body.name,
      description: body.description ?? null,
      occupancy: body.occupancy,
      base_rate_cents: body.base_rate_cents,
      amenities: JSON.stringify(body.amenities ?? []),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('room-types.create', error)
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
      const patch: Record<string, unknown> = {}
      if (body.name !== undefined) patch.name = body.name
      if (body.description !== undefined) patch.description = body.description
      if (body.occupancy !== undefined) patch.occupancy = body.occupancy
      if (body.base_rate_cents !== undefined) patch.base_rate_cents = body.base_rate_cents
      if (body.amenities !== undefined) patch.amenities = JSON.stringify(body.amenities)
      const result = await updateById('room_types', getParamId(req), patch)
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('room-types.update', error)
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
    await deleteById('room_types', getParamId(req))
    res.status(204).end()
  } catch (error) {
    logger.error('room-types.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
