import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

const applyFilterSchema = z.object({
  image_id: z.string().min(1),
  filter_type: z.string().min(1),
  intensity: z.number().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
})

const createPresetSchema = z.object({
  name: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()),
})

router.get(
  '/presets',
  asyncHandler(async (_req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const builtIns = await findMany<Record<string, unknown>>('filter_presets', {
      where: [{ field: 'user_id', operator: 'is_null', value: null }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const userPresets = await findMany<Record<string, unknown>>('filter_presets', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const builtInRows = unwrapRows(builtIns)
    const userRows = unwrapRows(userPresets)
    res.json([...builtInRows, ...userRows].map(coercePreset))
  }),
)

router.post(
  '/presets',
  validateBody(createPresetSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { name, parameters } = req.body
    const result = await create('filter_presets', {
      user_id: userId,
      name,
      parameters: JSON.stringify(parameters ?? {}),
      created_at: new Date(),
    })
    res.status(201).json(coercePreset((result.data ?? result) as Record<string, unknown>))
  }),
)

router.delete(
  '/presets/:id',
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('filter_presets', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('filters.presetNotFound', {}, { defaultValue: 'Preset not found' }) })
    }
    await deleteById('filter_presets', id)
    res.status(204).end()
  }),
)

router.post(
  '/apply',
  validateBody(applyFilterSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { image_id, filter_type, intensity, parameters } = req.body
    const image = await findById<Record<string, unknown>>('images', image_id)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('filters.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }
    const result = await create('filter_applications', {
      user_id: userId,
      image_id,
      filter_type,
      intensity: intensity ?? 1,
      parameters: JSON.stringify(parameters ?? {}),
      created_at: new Date(),
    })
    res
      .status(201)
      .json(coerceFilterApplication((result.data ?? result) as Record<string, unknown>))
  }),
)

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const imageId = req.query.image_id as string | undefined
    if (!imageId) {
      return res
        .status(400)
        .json({ error: t('filters.imageRequired', {}, { defaultValue: 'image_id is required' }) })
    }
    const image = await findById<Record<string, unknown>>('images', imageId)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('filters.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'image_id', operator: '=', value: imageId },
    ]
    const history = await findMany<Record<string, unknown>>('filter_applications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(unwrapRows(history).map(coerceFilterApplication))
  }),
)

function unwrapRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: Record<string, unknown>[] }).data
  }
  return []
}

function coerceJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (_error) {
      // Not valid JSON — return raw string as-is
      return value
    }
  }
  return value
}

function coercePreset(row: Record<string, unknown>): Record<string, unknown> {
  if (!row) return row
  return { ...row, parameters: coerceJson(row.parameters) }
}

function coerceFilterApplication(row: Record<string, unknown>): Record<string, unknown> {
  if (!row) return row
  const out: Record<string, unknown> = { ...row, parameters: coerceJson(row.parameters) }
  if (typeof out.intensity === 'string') {
    const n = Number(out.intensity)
    if (Number.isFinite(n)) out.intensity = n
  }
  return out
}

export default router
