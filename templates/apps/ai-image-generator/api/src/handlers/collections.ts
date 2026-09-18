/**
 * Collections handler — owns user-curated mood-boards. Each collection
 * groups a set of generations under a user-named theme. Backed by
 * `public.collections` and `public.collection_images` (see migration 0010).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  is_public: z.boolean().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  is_public: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const collections = await findMany<Record<string, unknown>>('collections', {
      where,
      orderBy,
    })
    res.json(collections)
  } catch (error) {
    logger.error('collections.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const collection = await create('collections', {
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      is_public: body.is_public ?? false,
    })
    res.status(201).json(collection.data)
  } catch (error) {
    logger.error('collections.create', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const collection = await findById<Record<string, unknown>>('collections', id)
    if (!collection || (collection.user_id !== userId && collection.is_public !== true)) {
      return res.status(404).json({
        error: t('collections.notFound', {}, { defaultValue: 'Collection not found' }),
      })
    }
    res.json(collection)
  } catch (error) {
    logger.error('collections.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
        })
      }
      const id = String(req.params.id)
      const collection = await findById<Record<string, unknown>>('collections', id)
      if (!collection || collection.user_id !== userId) {
        return res.status(404).json({
          error: t('collections.notFound', {}, { defaultValue: 'Collection not found' }),
        })
      }
      const body = req.body as z.infer<typeof updateSchema>
      const updated = await updateById('collections', id, {
        ...body,
        updated_at: new Date(),
      })
      res.json(updated.data)
    } catch (error) {
      logger.error('collections.update', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/:id/share', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const collection = await findById<Record<string, unknown>>('collections', id)
    if (!collection || collection.user_id !== userId) {
      return res.status(404).json({
        error: t('collections.notFound', {}, { defaultValue: 'Collection not found' }),
      })
    }
    const updated = await updateById('collections', id, {
      is_public: !collection.is_public,
      updated_at: new Date(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('collections.share', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const collection = await findById<Record<string, unknown>>('collections', id)
    if (!collection || collection.user_id !== userId) {
      return res.status(404).json({
        error: t('collections.notFound', {}, { defaultValue: 'Collection not found' }),
      })
    }
    await deleteById('collections', id)
    res.status(204).end()
  } catch (error) {
    logger.error('collections.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/images', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const collection = await findById<Record<string, unknown>>('collections', id)
    if (!collection || (collection.user_id !== userId && collection.is_public !== true)) {
      return res.status(404).json({
        error: t('collections.notFound', {}, { defaultValue: 'Collection not found' }),
      })
    }
    const links = await findMany<Record<string, unknown>>('collection_images', {
      where: [{ field: 'collection_id', operator: '=', value: id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(links)
  } catch (error) {
    logger.error('collections.listImages', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
