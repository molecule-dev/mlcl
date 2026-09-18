import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { WarehouseFulfillmentLimits } from '../tiers.js'

const router = Router()

const createZoneSchema = z.object({
  name: z.string().min(1),
  kind: z
    .enum(['receiving', 'storage', 'picking', 'packing', 'shipping', 'returns'])
    .default('storage'),
  description: z.string().optional(),
})

const updateZoneSchema = z.object({
  name: z.string().min(1).optional(),
  kind: z.enum(['receiving', 'storage', 'picking', 'packing', 'shipping', 'returns']).optional(),
  description: z.string().optional(),
})

const createBinSchema = z.object({
  zone_id: z.string().nullable().optional(),
  code: z.string().min(1),
  bin_capacity: z.number().int().nonnegative().default(0),
  current_occupancy_pct: z.number().int().min(0).max(100).default(0),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const zones = await findMany('zones', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 200,
    })
    res.json(zones)
  } catch (error) {
    logger.error('zones.handler', error)
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
    const zone = await findById<Record<string, unknown>>('zones', id)
    if (!zone) {
      return res
        .status(404)
        .json({ error: t('zones.notFound', {}, { defaultValue: 'Zone not found' }) })
    }
    if (zone.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const bins = await findMany('locations', {
      where: [{ field: 'zone_id', operator: '=', value: id }],
      orderBy: [{ field: 'code', direction: 'asc' }],
    })
    res.json({ ...zone, bins })
  } catch (error) {
    logger.error('zones.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier zone cap (tiers.ts maxZones) — defined + advertised in Pricing but enforceLimit
// was never called, so any tier could create unlimited zones. (maxOrders/maxPicks/maxShipments/
// maxPacking are accumulating transaction logs, not bounded entities — not enforced.)
const enforceZoneLimit = enforceLimit<WarehouseFulfillmentLimits>({
  limitType: 'maxZones',
  getLimit: (limits) => limits.maxZones,
  getCurrent: async (userId) =>
    count('zones', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceZoneLimit, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = createZoneSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const result = await create('zones', {
      user_id: userId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      description: parsed.data.description ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('zones.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/bins', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const zone = await findById<Record<string, unknown>>('zones', id)
    if (!zone) {
      return res
        .status(404)
        .json({ error: t('zones.notFound', {}, { defaultValue: 'Zone not found' }) })
    }
    if (zone.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = createBinSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const result = await create('locations', {
      user_id: userId,
      zone_id: id,
      code: parsed.data.code,
      bin_capacity: parsed.data.bin_capacity,
      current_occupancy_pct: parsed.data.current_occupancy_pct,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('zones.handler', error)
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
    const existing = await findById<Record<string, unknown>>('zones', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('zones.notFound', {}, { defaultValue: 'Zone not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateZoneSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.kind !== undefined) updates.kind = parsed.data.kind
    if (parsed.data.description !== undefined) updates.description = parsed.data.description

    const result = await updateById('zones', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('zones.handler', error)
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
    const existing = await findById<Record<string, unknown>>('zones', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('zones.notFound', {}, { defaultValue: 'Zone not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    await deleteById('zones', id)
    res.status(204).end()
  } catch (error) {
    logger.error('zones.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
