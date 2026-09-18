import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
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

const createLayerSchema = z.object({
  image_id: z.string().min(1),
  kind: z.enum(['filter', 'adjustment', 'text', 'mask', 'crop']),
  parameters: z.record(z.string(), z.unknown()).optional(),
  opacity: z.number().min(0).max(1).optional(),
  blend_mode: z.string().optional(),
  z_index: z.number().int().optional(),
  hidden: z.boolean().optional(),
})

const updateLayerSchema = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
  opacity: z.number().min(0).max(1).optional(),
  blend_mode: z.string().optional(),
  z_index: z.number().int().optional(),
  hidden: z.boolean().optional(),
})

router.get(
  '/',
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
        .json({ error: t('layers.imageRequired', {}, { defaultValue: 'image_id is required' }) })
    }
    const image = await findById<Record<string, unknown>>('images', imageId)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }
    const result = await findMany<Record<string, unknown>>('layers', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'image_id', operator: '=', value: imageId },
      ],
      orderBy: [{ field: 'z_index', direction: 'asc' }],
    })
    const rows = Array.isArray(result)
      ? result
      : ((result as { data?: Record<string, unknown>[] }).data ?? [])
    res.json(rows.map(coerceLayer))
  }),
)

router.post(
  '/',
  validateBody(createLayerSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { image_id, kind, parameters, opacity, blend_mode, z_index, hidden } = req.body
    const image = await findById<Record<string, unknown>>('images', image_id)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }
    const result = await create('layers', {
      user_id: userId,
      image_id,
      kind,
      parameters: JSON.stringify(parameters ?? {}),
      opacity: opacity ?? 1,
      blend_mode: blend_mode ?? 'normal',
      z_index: z_index ?? 0,
      hidden: hidden ?? false,
      created_at: new Date(),
      updatedAt: new Date(),
    })
    res.status(201).json(coerceLayer((result.data ?? result) as Record<string, unknown>))
  }),
)

router.put(
  '/:id',
  validateBody(updateLayerSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('layers', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of ['parameters', 'opacity', 'blend_mode', 'z_index', 'hidden'] as const) {
      if (req.body[k] !== undefined) {
        updates[k] = k === 'parameters' ? JSON.stringify(req.body[k]) : req.body[k]
      }
    }
    const result = await updateById('layers', id, updates)
    res.json(coerceLayer((result.data ?? result) as Record<string, unknown>))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('layers', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
    }
    await deleteById('layers', id)
    res.status(204).end()
  }),
)

function coerceLayer(row: Record<string, unknown>): Record<string, unknown> {
  if (!row) return row
  const out: Record<string, unknown> = { ...row }
  if (typeof out.opacity === 'string') {
    const n = Number(out.opacity)
    if (Number.isFinite(n)) out.opacity = n
  }
  if (typeof out.parameters === 'string') {
    try {
      out.parameters = JSON.parse(out.parameters as string)
    } catch (_error) {
      // Not valid JSON — leave as-is
    }
  }
  return out
}

export default router
