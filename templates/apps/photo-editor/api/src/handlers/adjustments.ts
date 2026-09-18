import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
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

const applyAdjustmentSchema = z.object({
  image_id: z.string().min(1),
  adjustment_type: z.enum([
    'brightness',
    'contrast',
    'saturation',
    'curves',
    'temperature',
    'tint',
    'highlights',
    'shadows',
    'exposure',
    'vibrance',
    'hue',
    'grain',
  ]),
  value: z.number(),
})

router.post(
  '/apply',
  validateBody(applyAdjustmentSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { image_id, adjustment_type, value } = req.body
    const image = await findById<Record<string, unknown>>('images', image_id)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('adjustments.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }
    const result = await create('adjustments', {
      user_id: userId,
      image_id,
      adjustment_type,
      value,
      created_at: new Date(),
    })
    const created = (result.data ?? result) as Record<string, unknown>
    res.status(201).json(coerceAdjustment(created))
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
      return res.status(400).json({
        error: t('adjustments.imageRequired', {}, { defaultValue: 'image_id is required' }),
      })
    }
    const image = await findById<Record<string, unknown>>('images', imageId)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('adjustments.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }
    const history = await findMany<Record<string, unknown>>('adjustments', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'image_id', operator: '=', value: imageId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const rows = Array.isArray(history)
      ? history
      : ((history as { data?: Record<string, unknown>[] }).data ?? [])
    res.json(rows.map(coerceAdjustment))
  }),
)

function coerceAdjustment(row: Record<string, unknown>): Record<string, unknown> {
  if (row && typeof row.value === 'string') {
    const n = Number(row.value)
    if (Number.isFinite(n)) return { ...row, value: n }
  }
  return row
}

export default router
