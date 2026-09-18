import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const createLocationSchema = z.object({
  zone_id: z.string().nullable().optional(),
  code: z.string().min(1),
  bin_capacity: z.number().int().nonnegative().default(0),
  current_occupancy_pct: z.number().int().min(0).max(100).default(0),
})

const updateLocationSchema = z.object({
  zone_id: z.string().nullable().optional(),
  code: z.string().min(1).optional(),
  bin_capacity: z.number().int().nonnegative().optional(),
  current_occupancy_pct: z.number().int().min(0).max(100).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const rows = await findMany('locations', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'code', direction: 'asc' }],
      limit: 500,
    })
    res.json(rows)
  } catch (error) {
    logger.error('locations.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('locations', id)
    if (!row) {
      return res
        .status(404)
        .json({ error: t('locations.notFound', {}, { defaultValue: 'Location not found' }) })
    }
    if (row.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    res.json(row)
  } catch (error) {
    logger.error('locations.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = createLocationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const result = await create('locations', {
      user_id: userId,
      zone_id: parsed.data.zone_id ?? null,
      code: parsed.data.code,
      bin_capacity: parsed.data.bin_capacity,
      current_occupancy_pct: parsed.data.current_occupancy_pct,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('locations.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('locations', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('locations.notFound', {}, { defaultValue: 'Location not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateLocationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (parsed.data.zone_id !== undefined) updates.zone_id = parsed.data.zone_id
    if (parsed.data.code !== undefined) updates.code = parsed.data.code
    if (parsed.data.bin_capacity !== undefined) updates.bin_capacity = parsed.data.bin_capacity
    if (parsed.data.current_occupancy_pct !== undefined) {
      updates.current_occupancy_pct = parsed.data.current_occupancy_pct
    }

    const result = await updateById('locations', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('locations.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('locations', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('locations.notFound', {}, { defaultValue: 'Location not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    await deleteById('locations', id)
    res.status(204).end()
  } catch (error) {
    logger.error('locations.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
