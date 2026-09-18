import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { ModelViewerLimits } from '../tiers.js'

const router = Router()

const createAnnotationSchema = z.object({
  model_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
  camera_position: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().nonnegative().default(0),
})

const updateAnnotationSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
  resolved: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const modelId = (req.query.model_id ?? req.query.modelId) as string | undefined
  if (!modelId) {
    return res.status(400).json({
      error: t('annotations.modelRequired', {}, { defaultValue: 'Model ID is required' }),
    })
  }

  // Visibility-aware list: only owner of the model OR public/unlisted models.
  const model = await findById<Record<string, unknown>>('models', modelId)
  if (!model) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }
  const visibility = model.visibility as string
  if (visibility !== 'public' && visibility !== 'unlisted' && model.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const annotations = await findMany('annotations', {
    where: [{ field: 'model_id', operator: '=', value: modelId }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })

  res.json(annotations)
})

// Free-tier annotation cap (maxAnnotations) — defined in tiers.ts + shown on the pricing page, but
// enforced by no handler. Gate create on the tier limit.
const enforceAnnotationLimit = enforceLimit<ModelViewerLimits>({
  limitType: 'maxAnnotations',
  getLimit: (limits) => limits.maxAnnotations,
  getCurrent: async (userId) =>
    count('annotations', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceAnnotationLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const parsed = createAnnotationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const data = parsed.data

  // Authorize: only the owner of the model may add annotations.
  const model = await findById<Record<string, unknown>>('models', data.model_id)
  if (!model) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }
  if (model.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const result = await create('annotations', {
    user_id: userId,
    model_id: data.model_id,
    title: data.title,
    description: data.description ?? '',
    x: data.x,
    y: data.y,
    z: data.z,
    camera_position: JSON.stringify(data.camera_position ?? {}),
    position: data.position,
    created_at: new Date(),
  })

  await create('activity_feed', {
    user_id: userId,
    model_id: data.model_id,
    action: 'commented',
    metadata: JSON.stringify({ title: data.title }),
    created_at: new Date(),
  })

  res.status(201).json(result.data)
})

router.put('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('annotations', id)
  if (!existing) {
    return res
      .status(404)
      .json({ error: t('annotations.notFound', {}, { defaultValue: 'Annotation not found' }) })
  }
  if (existing.user_id !== userId) {
    return res
      .status(403)
      .json({ error: t('annotations.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const parsed = updateAnnotationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  const data = parsed.data
  if (data.title !== undefined) updates.title = data.title
  if (data.description !== undefined) updates.description = data.description
  if (data.x !== undefined) updates.x = data.x
  if (data.y !== undefined) updates.y = data.y
  if (data.z !== undefined) updates.z = data.z
  if (data.resolved !== undefined) updates.resolved = data.resolved
  if (data.position !== undefined) updates.position = data.position

  const result = await updateById('annotations', id, updates)
  res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('annotations', id)
  if (!existing) {
    return res
      .status(404)
      .json({ error: t('annotations.notFound', {}, { defaultValue: 'Annotation not found' }) })
  }
  if (existing.user_id !== userId) {
    return res
      .status(403)
      .json({ error: t('annotations.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  await deleteById('annotations', id)
  res.status(204).end()
})

export default router
