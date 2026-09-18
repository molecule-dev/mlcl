/**
 * Wishlist handler.
 *
 * Persists `wishlists(user_id, product_id)` rows. The frontend WishlistPage
 * reads `/api/wishlist` and renders one card per row, hydrated with product
 * fields.
 */
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, deleteMany, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const addToWishlistSchema = z.object({
  productId: z.string().min(1),
})

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = await findMany<Record<string, unknown>>('wishlists', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const items = await Promise.all(
      rows.map(async (row) => {
        const product = await findById<Record<string, unknown>>(
          'products',
          row.product_id as string,
        )
        return { ...row, product }
      }),
    )

    res.json({ data: items, total: items.length })
  } catch (error) {
    logger.error('wishlist.handler', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(addToWishlistSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { productId } = req.body as { productId: string }

    const product = await findById('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const existing = await findMany<Record<string, unknown>>('wishlists', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: productId },
      ],
      limit: 1,
    })
    if (existing.length > 0) {
      return res.status(200).json(existing[0])
    }

    const result = await create<Record<string, unknown>>('wishlists', {
      user_id: userId,
      product_id: productId,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('wishlist.handler', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const id = req.params.id
    const row = await findById<Record<string, unknown>>('wishlists', id)
    if (!row) {
      return res.status(404).json({
        error: t('wishlist.notFound', {}, { defaultValue: 'Wishlist item not found' }),
      })
    }
    if (row.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('wishlist.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('wishlists', id)
    res.status(204).send()
  } catch (error) {
    logger.error('wishlist.handler', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/', async (_req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    await deleteMany('wishlists', [{ field: 'user_id', operator: '=', value: userId }])
    res.status(204).send()
  } catch (error) {
    logger.error('wishlist.handler', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/count', async (_req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const total = await count('wishlists', [{ field: 'user_id', operator: '=', value: userId }])
    res.json({ count: total })
  } catch (error) {
    logger.error('wishlist.handler', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
