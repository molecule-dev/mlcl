import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import {
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { resolveShipping } from '../lib/shipping.js'
import { resolveTaxRate } from '../lib/tax.js'

const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  variantId: z.string().optional(),
})

const updateCartItemSchema = z.object({
  quantity: z.number().int(),
})

const router = Router()

// Get current user's cart
router.get('/', async (_req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<Record<string, unknown>>('cart_items', { where })

    const hydrated = await Promise.all(
      items.map(async (item) => {
        const product = await findById<Record<string, unknown>>(
          'products',
          item.product_id as string,
        )
        return { ...item, product }
      }),
    )

    const subtotal = hydrated.reduce((sum: number, item: Record<string, unknown>) => {
      const price = (((item.product as Record<string, unknown>) ?? {}).price as number) || 0
      return sum + price * (item.quantity as number)
    }, 0)

    // Tax uses the store owner's configured rate (adminSettings.tax.taxRate) via
    // the same helper the order charge uses, so the cart total the shopper sees
    // matches what checkout charges. Previously the client hardcoded its own rate.
    const ownerId = (hydrated[0]?.product as Record<string, unknown> | undefined)?.user_id
    const owner = ownerId ? await findById<Record<string, unknown>>('users', String(ownerId)) : null
    const tax = Math.round(subtotal * resolveTaxRate(owner))
    // Shipping fee from the owner's configured adminSettings.shipping (free above the
    // threshold, else the standard rate) via the same helper the order charge uses, so
    // the cart total the shopper sees matches what checkout charges. Previously the cart
    // returned no shipping at all and the client fell back to a hardcoded rate.
    const shipping = resolveShipping(owner, subtotal)
    const total = subtotal + tax + shipping

    res.json({ items: hydrated, subtotal, tax, shipping, total })
  } catch (error) {
    logger.error('cart.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add item to cart
router.post('/items', validateBody(addToCartSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { productId, quantity = 1, variantId } = req.body

    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    // Only active products are purchasable. `status` gates catalog visibility (list/storefront filter
    // status='active') but was never checked here, so an archived product stayed add-to-cart-able via
    // its direct URL.
    if (product.status !== 'active') {
      return res
        .status(400)
        .json({ error: t('product.unavailable', {}, { defaultValue: 'Product is not available' }) })
    }

    // Check inventory
    const stock = await findOne<Record<string, unknown>>('inventory', [
      { field: 'product_id', operator: '=', value: productId },
    ])
    const available = (stock?.available as number) ?? 0
    if (available < quantity) {
      return res
        .status(400)
        .json({ error: t('cart.insufficientStock', {}, { defaultValue: 'Insufficient stock' }) })
    }

    // Check if item already in cart (merge duplicates)
    const existingWhere: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'product_id', operator: '=', value: productId },
    ]
    if (variantId) {
      existingWhere.push({ field: 'variant_id', operator: '=', value: variantId })
    }
    const existing = await findMany<Record<string, unknown>>('cart_items', {
      where: existingWhere,
      limit: 1,
    })

    if (existing.length > 0) {
      const item = existing[0]
      const result = await updateById<Record<string, unknown>>('cart_items', item.id as string, {
        quantity: (item.quantity as number) + quantity,
      })
      return res.json(result.data)
    }

    const result = await create<Record<string, unknown>>('cart_items', {
      user_id: userId,
      product_id: productId,
      variant_id: variantId || null,
      quantity,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('cart.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update cart item quantity
router.put('/items/:itemId', validateBody(updateCartItemSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const itemId = req.params.itemId as string
    const { quantity } = req.body

    if (quantity <= 0) {
      const existing = await findById<Record<string, unknown>>('cart_items', itemId)
      if (!existing) {
        return res
          .status(404)
          .json({ error: t('cart.itemNotFound', {}, { defaultValue: 'Cart item not found' }) })
      }
      if (existing.user_id !== userId) {
        return res
          .status(403)
          .json({ error: t('cart.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      await deleteById('cart_items', itemId)
      return res.status(204).send()
    }

    const item = await findById<Record<string, unknown>>('cart_items', itemId)
    if (!item) {
      return res
        .status(404)
        .json({ error: t('cart.itemNotFound', {}, { defaultValue: 'Cart item not found' }) })
    }

    if (item.user_id !== userId) {
      return res.status(403).json({ error: t('cart.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    // Check inventory
    const stock = await findOne<Record<string, unknown>>('inventory', [
      { field: 'product_id', operator: '=', value: item.product_id as string },
    ])
    const available = (stock?.available as number) ?? 0
    if (available < quantity) {
      return res
        .status(400)
        .json({ error: t('cart.insufficientStock', {}, { defaultValue: 'Insufficient stock' }) })
    }

    const result = await updateById<Record<string, unknown>>('cart_items', itemId, { quantity })
    res.json(result.data)
  } catch (error) {
    logger.error('cart.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Remove item from cart
router.delete('/items/:itemId', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const item = await findById<Record<string, unknown>>('cart_items', req.params.itemId)
    if (!item) {
      return res
        .status(404)
        .json({ error: t('cart.itemNotFound', {}, { defaultValue: 'Cart item not found' }) })
    }
    if (item.user_id !== userId) {
      return res.status(403).json({ error: t('cart.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    await deleteById('cart_items', req.params.itemId)
    res.status(204).send()
  } catch (error) {
    logger.error('cart.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Clear cart
router.delete('/', async (_req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    await deleteMany('cart_items', [{ field: 'user_id', operator: '=', value: userId }])
    res.status(204).send()
  } catch (error) {
    logger.error('cart.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
