import {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
  Router,
} from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PhotoEditorLimits } from '../tiers.js'

const router = Router()

// Enforce the per-tier image cap (tiers.ts maxImages) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited images (via create OR duplicate).
const enforceImageLimit = enforceLimit<PhotoEditorLimits>({
  limitType: 'maxImages',
  getLimit: (limits) => limits.maxImages,
  getCurrent: async (userId) =>
    count('images', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

const createImageSchema = z.object({
  name: z.string().min(1),
  original_url: z.string().min(1),
  current_url: z.string().optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  album_id: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
})

const updateImageSchema = z.object({
  name: z.string().min(1).optional(),
  current_url: z.string().min(1).optional(),
  album_id: z.string().nullable().optional(),
  edit_history: z.array(z.unknown()).optional(),
  is_public: z.boolean().optional(),
})

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const images = await findMany('images', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    })
    res.json(images)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const image = await findById<Record<string, unknown>>('images', id)
    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('images.notFound', {}, { defaultValue: 'Image not found' }) })
    }
    res.json(image)
  }),
)

router.post(
  '/',
  enforceImageLimit,
  validateBody(createImageSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { name, original_url, current_url, width, height, album_id, is_public } = req.body
    const result = await create('images', {
      user_id: userId,
      name,
      original_url,
      current_url: current_url ?? original_url,
      width: width ?? 0,
      height: height ?? 0,
      album_id: album_id ?? null,
      edit_history: JSON.stringify([]),
      is_public: is_public ?? false,
      created_at: new Date(),
      updatedAt: new Date(),
    })
    res.status(201).json(result.data ?? result)
  }),
)

router.put(
  '/:id',
  validateBody(updateImageSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('images', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('images.notFound', {}, { defaultValue: 'Image not found' }) })
    }
    const { name, current_url, album_id, edit_history, is_public } = req.body
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) updates.name = name
    if (current_url !== undefined) updates.current_url = current_url
    if (album_id !== undefined) updates.album_id = album_id
    if (edit_history !== undefined) updates.edit_history = JSON.stringify(edit_history)
    if (is_public !== undefined) updates.is_public = is_public
    const result = await updateById('images', id, updates)
    res.json(result.data ?? result)
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
    const existing = await findById<Record<string, unknown>>('images', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('images.notFound', {}, { defaultValue: 'Image not found' }) })
    }
    await deleteById('images', id)
    res.status(204).end()
  }),
)

router.post(
  '/:id/duplicate',
  enforceImageLimit,
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const source = await findById<Record<string, unknown>>('images', id)
    if (!source || source.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('images.notFound', {}, { defaultValue: 'Image not found' }) })
    }
    const result = await create('images', {
      user_id: userId,
      name: `${source.name as string} (Copy)`,
      original_url: source.original_url,
      current_url: source.current_url,
      width: source.width,
      height: source.height,
      album_id: source.album_id ?? null,
      edit_history: JSON.stringify([]),
      is_public: false,
      created_at: new Date(),
      updatedAt: new Date(),
    })
    res.status(201).json(result.data ?? result)
  }),
)

export default router
