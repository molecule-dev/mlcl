import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { ModelViewerLimits } from '../tiers.js'

const router = Router()

const createEmbedSchema = z.object({
  model_id: z.string().min(1),
  width: z.number().int().positive().default(800),
  height: z.number().int().positive().default(600),
  auto_rotate: z.boolean().default(true),
  show_annotations: z.boolean().default(true),
  theme: z.enum(['light', 'dark']).default('light'),
})

const updateEmbedSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  auto_rotate: z.boolean().optional(),
  show_annotations: z.boolean().optional(),
  theme: z.enum(['light', 'dark']).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const modelId = (req.query.model_id ?? req.query.modelId) as string | undefined
  if (modelId) {
    const model = await findById<Record<string, unknown>>('models', modelId)
    if (!model) {
      return res
        .status(404)
        .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
    }
    if (model.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const embeds = await findMany('embeds', {
      where: [{ field: 'model_id', operator: '=', value: modelId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    return res.json(embeds)
  }

  const embeds = await findMany('embeds', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json(embeds)
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req)
  const embed = await findById<Record<string, unknown>>('embeds', id)
  if (!embed) {
    return res
      .status(404)
      .json({ error: t('embeds.notFound', {}, { defaultValue: 'Embed not found' }) })
  }

  // Embeds are publicly readable by token (the id IS the token); the
  // surrounding model's visibility decides whether the iframe page can
  // actually render the model.
  res.json(embed)
})

// Free-tier embed cap (maxEmbeds) — defined in tiers.ts + shown on the pricing page, but enforced
// by no handler. Gate create on the tier limit.
const enforceEmbedLimit = enforceLimit<ModelViewerLimits>({
  limitType: 'maxEmbeds',
  getLimit: (limits) => limits.maxEmbeds,
  getCurrent: async (userId) =>
    count('embeds', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceEmbedLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const parsed = createEmbedSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const data = parsed.data

  const model = await findById<Record<string, unknown>>('models', data.model_id)
  if (!model) {
    return res
      .status(404)
      .json({ error: t('embeds.modelNotFound', {}, { defaultValue: 'Model not found' }) })
  }
  if (model.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const result = await create('embeds', {
    user_id: userId,
    model_id: data.model_id,
    width: data.width,
    height: data.height,
    auto_rotate: data.auto_rotate,
    show_annotations: data.show_annotations,
    theme: data.theme,
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
  const existing = await findById<Record<string, unknown>>('embeds', id)
  if (!existing) {
    return res
      .status(404)
      .json({ error: t('embeds.notFound', {}, { defaultValue: 'Embed not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const parsed = updateEmbedSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  const data = parsed.data
  if (data.width !== undefined) updates.width = data.width
  if (data.height !== undefined) updates.height = data.height
  if (data.auto_rotate !== undefined) updates.auto_rotate = data.auto_rotate
  if (data.show_annotations !== undefined) updates.show_annotations = data.show_annotations
  if (data.theme !== undefined) updates.theme = data.theme

  const result = await updateById('embeds', id, updates)
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
  const existing = await findById<Record<string, unknown>>('embeds', id)
  if (!existing) {
    return res
      .status(404)
      .json({ error: t('embeds.notFound', {}, { defaultValue: 'Embed not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  await deleteById('embeds', id)
  res.status(204).end()
})

export default router
