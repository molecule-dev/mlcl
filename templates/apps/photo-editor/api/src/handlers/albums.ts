import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
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

const createAlbumSchema = z.object({
  name: z.string().min(1),
  cover_image_id: z.string().nullable().optional(),
})

const updateAlbumSchema = z.object({
  name: z.string().min(1).optional(),
  cover_image_id: z.string().nullable().optional(),
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
    const albums = await findMany('albums', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(albums)
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
    const album = await findById<Record<string, unknown>>('albums', id)
    if (!album || album.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    }
    res.json(album)
  }),
)

router.post(
  '/',
  validateBody(createAlbumSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { name, cover_image_id } = req.body
    const result = await create('albums', {
      user_id: userId,
      name,
      cover_image_id: cover_image_id ?? null,
      created_at: new Date(),
      updatedAt: new Date(),
    })
    res.status(201).json(result.data ?? result)
  }),
)

router.put(
  '/:id',
  validateBody(updateAlbumSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('albums', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.cover_image_id !== undefined) updates.cover_image_id = req.body.cover_image_id
    const result = await updateById('albums', id, updates)
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
    const existing = await findById<Record<string, unknown>>('albums', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('albums.notFound', {}, { defaultValue: 'Album not found' }) })
    }
    const remaining = await count('images', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'album_id', operator: '=', value: id },
    ])
    if (remaining > 0) {
      return res.status(400).json({
        error: t('albums.notEmpty', {}, { defaultValue: 'Album must be empty before delete' }),
      })
    }
    await deleteById('albums', id)
    res.status(204).end()
  }),
)

export default router
