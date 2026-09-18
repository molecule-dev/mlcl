/**
 * Watchlist handlers — saved products per user. Owner-scoped via `user_id`
 * with a unique `(user_id, product_id)` constraint enforced at the DB layer.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PriceComparisonLimits } from '../tiers.js'

const router = Router()

const addItemSchema = z.object({
  productId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const items = await findMany<Record<string, unknown>>('watchlist_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })

    const enriched = await Promise.all(
      items.map(async (item) => ({
        ...item,
        product: await findById('products', item.product_id as string),
      })),
    )

    res.json(enriched)
  } catch (error) {
    logger.error('watchlist.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<PriceComparisonLimits>({
    limitType: 'maxProducts',
    getLimit: (limits) => limits.maxProducts,
    getCurrent: async (userId) =>
      count('watchlist_items', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(addItemSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { productId, notes } = req.body as z.infer<typeof addItemSchema>

      const product = await findById('products', productId)
      if (!product) {
        return res
          .status(404)
          .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
      }

      const existing = await findMany<Record<string, unknown>>('watchlist_items', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'product_id', operator: '=', value: productId },
        ],
        limit: 1,
      })
      if (existing.length > 0) {
        return res.status(409).json({
          error: t('watchlist.duplicate', {}, { defaultValue: 'Product already on watchlist' }),
        })
      }

      const result = await create('watchlist_items', {
        user_id: userId,
        product_id: productId,
        notes: notes ?? null,
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('watchlist.add', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('watchlist_items', id)

    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('watchlist.notFound', {}, { defaultValue: 'Watchlist item not found' }) })
    }

    await deleteById('watchlist_items', id)
    res.status(204).end()
  } catch (error) {
    logger.error('watchlist.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
