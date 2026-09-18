import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { ModelViewerLimits } from '../tiers.js'

const router = Router()

const createModelSchema = z.object({
  name: z.string().min(1),
  file_url: z.string().min(1),
  format: z.enum(['glb', 'gltf', 'obj', 'fbx', 'stl']).default('glb'),
  thumbnail_url: z.string().nullable().optional(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('private'),
  polygon_count: z.number().int().nonnegative().default(0),
  file_size: z.number().int().nonnegative().default(0),
  environment: z.string().default('studio'),
  camera_position: z.record(z.string(), z.unknown()).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

const updateModelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  thumbnail_url: z.string().nullable().optional(),
  polygon_count: z.number().int().nonnegative().optional(),
  file_size: z.number().int().nonnegative().optional(),
  environment: z.string().optional(),
  camera_position: z.record(z.string(), z.unknown()).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const models = await findMany('models', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })

  res.json(models)
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req)
  const model = await findById<Record<string, unknown>>('models', id)

  if (!model) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }

  const userId = getUserId(res)
  const visibility = model.visibility as string
  const ownerId = model.user_id as string

  // Visibility gating: public/unlisted readable by anyone (unlisted needs
  // id-knowledge); private only by owner. Always require auth for owner-only data.
  if (visibility !== 'public' && visibility !== 'unlisted') {
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    if (ownerId !== userId) {
      return res
        .status(404)
        .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
    }
  }

  res.json(model)
})

// Free-tier model cap (maxModels) — defined in tiers.ts + shown on the pricing page, but the
// entitlements provider was wired at boot and read by no handler. Gate create on the tier limit.
const enforceModelLimit = enforceLimit<ModelViewerLimits>({
  limitType: 'maxModels',
  getLimit: (limits) => limits.maxModels,
  getCurrent: async (userId) =>
    count('models', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceModelLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const parsed = createModelSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const data = parsed.data
  const result = await create('models', {
    user_id: userId,
    name: data.name,
    description: data.description ?? null,
    file_url: data.file_url,
    format: data.format,
    thumbnail_url: data.thumbnail_url ?? null,
    polygon_count: data.polygon_count,
    file_size: data.file_size,
    visibility: data.visibility,
    environment: data.environment,
    category: data.category ?? null,
    tags: data.tags ?? [],
    camera_position: JSON.stringify(data.camera_position ?? { x: 0, y: 1, z: 3 }),
    created_at: new Date(),
  })

  // Record an "uploaded" activity event so the dashboard feed shows it.
  await create('activity_feed', {
    user_id: userId,
    model_id: (result.data as { id?: string })?.id ?? null,
    action: 'uploaded',
    metadata: JSON.stringify({ name: data.name, format: data.format }),
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
  const existing = await findById<Record<string, unknown>>('models', id)

  if (!existing) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const parsed = updateModelSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
      details: parsed.error.issues,
    })
  }

  const updates: Record<string, unknown> = { updated_at: new Date() }
  const data = parsed.data
  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (data.visibility !== undefined) updates.visibility = data.visibility
  if (data.thumbnail_url !== undefined) updates.thumbnail_url = data.thumbnail_url
  if (data.polygon_count !== undefined) updates.polygon_count = data.polygon_count
  if (data.file_size !== undefined) updates.file_size = data.file_size
  if (data.environment !== undefined) updates.environment = data.environment
  if (data.camera_position !== undefined)
    updates.camera_position = JSON.stringify(data.camera_position)
  if (data.category !== undefined) updates.category = data.category
  if (data.tags !== undefined) updates.tags = data.tags

  const result = await updateById('models', id, updates)

  await create('activity_feed', {
    user_id: userId,
    model_id: id,
    action: 'updated',
    metadata: JSON.stringify({ name: existing.name }),
    created_at: new Date(),
  })

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
  const existing = await findById<Record<string, unknown>>('models', id)

  if (!existing) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  await deleteById('models', id)
  await create('activity_feed', {
    user_id: userId,
    model_id: null,
    action: 'deleted',
    metadata: JSON.stringify({ name: existing.name }),
    created_at: new Date(),
  })
  res.status(204).end()
})

// Render-counter endpoint: any reader (including anon-allowed by visibility)
// hitting the model in the viewer pings this so the "Views This Month" card
// has data to surface.
router.post('/:id/render', async (req: Request, res: Response) => {
  const id = getParamId(req)
  const model = await findById<Record<string, unknown>>('models', id)
  if (!model) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }

  const visibility = model.visibility as string
  const ownerId = model.user_id as string
  const viewerId = getUserId(res)

  if (visibility !== 'public' && visibility !== 'unlisted') {
    if (!viewerId || viewerId !== ownerId) {
      return res
        .status(403)
        .json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
  }

  // Always credit the owner's activity feed; "viewed by self" is fine and
  // lets owners see their own preview activity in the dashboard timeline.
  await create('activity_feed', {
    user_id: ownerId,
    model_id: id,
    action: 'rendered',
    metadata: JSON.stringify({ viewer_id: viewerId ?? null }),
    created_at: new Date(),
  })

  res.json({ ok: true })
})

// Publish endpoint: the owner makes a model public so it's shareable/embeddable.
// "Publish" == set `visibility` to 'public'; owner-scoped, and records a
// 'published' activity row so the dashboard feed reflects it. The viewer's
// "Publish Model" button (ViewerSideNav) posts here.
router.post('/:id/publish', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('models', id)

  if (!existing) {
    return res
      .status(404)
      .json({ error: t('models.notFound', {}, { defaultValue: 'Model not found' }) })
  }
  if (existing.user_id !== userId) {
    return res.status(403).json({ error: t('models.forbidden', {}, { defaultValue: 'Forbidden' }) })
  }

  const result = await updateById('models', id, {
    visibility: 'public',
    updated_at: new Date(),
  })

  await create('activity_feed', {
    user_id: userId,
    model_id: id,
    action: 'published',
    metadata: JSON.stringify({ name: existing.name }),
    created_at: new Date(),
  })

  res.json(result.data)
})

export default router
