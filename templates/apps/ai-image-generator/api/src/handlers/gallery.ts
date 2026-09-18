import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
})

router.get('/public', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>
    const limitNum = Number(limit) || 20
    const pageNum = Number(page) || 1
    const where: WhereCondition[] = [{ field: 'is_public', operator: '=', value: true }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const images = await findMany<Record<string, unknown>>('generations', {
      where,
      orderBy,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    })
    res.json(images)
  } catch (error) {
    logger.error('gallery.listPublic', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/favorites', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_favorite', operator: '=', value: true },
    ]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const images = await findMany<Record<string, unknown>>('generations', {
      where,
      orderBy,
    })
    res.json(images)
  } catch (error) {
    logger.error('gallery.listFavorites', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id/favorite', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const image = await findById<Record<string, unknown>>('generations', id)
    if (!image || image.user_id !== userId) {
      return res.status(404).json({
        error: t('gallery.notFound', {}, { defaultValue: 'Image not found' }),
      })
    }
    const updated = await updateById('generations', id, {
      is_favorite: !image.is_favorite,
      updated_at: new Date(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('gallery.toggleFavorite', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id/visibility',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
      }
      const id = String(req.params.id)
      const image = await findById<Record<string, unknown>>('generations', id)
      if (!image || image.user_id !== userId) {
        return res.status(404).json({
          error: t('gallery.notFound', {}, { defaultValue: 'Image not found' }),
        })
      }
      const updated = await updateById('generations', id, {
        is_public: !image.is_public,
        updated_at: new Date(),
      })
      res.json(updated.data)
    } catch (error) {
      logger.error('gallery.toggleVisibility', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const image = await findById<Record<string, unknown>>('generations', id)
    if (!image || image.user_id !== userId) {
      return res.status(404).json({
        error: t('gallery.notFound', {}, { defaultValue: 'Image not found' }),
      })
    }
    await deleteById('generations', id)
    res.status(204).end()
  } catch (error) {
    logger.error('gallery.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
