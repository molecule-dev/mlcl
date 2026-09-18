/**
 * Cart handler — per-user cart_items CRUD with per-line substitution
 * preferences. Every read/write is scoped by `user_id` from the
 * authenticated session — no IDOR.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function getParamId(req: Request, name: string = 'itemId'): string {
  const v = req.params[name]
  return Array.isArray(v) ? v[0] : v
}

const SUB_PREFS = ['best_match', 'specific', 'remove', 'contact_me'] as const

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  substitutionPreference: z.enum(SUB_PREFS).default('best_match'),
  substituteId: z.string().nullable().optional(),
  notes: z.string().default(''),
})

const updateItemSchema = z.object({
  quantity: z.number().int().nonnegative().optional(),
  substitutionPreference: z.enum(SUB_PREFS).optional(),
  substituteId: z.string().nullable().optional(),
  notes: z.string().optional(),
})

interface CartItemRow {
  id: string
  user_id: string
  product_id: string
  quantity: number
  substitution_preference: string
  substitute_id: string | null
  notes: string
  created_at?: string
}

interface ProductLite {
  id: string
  name: string
  brand?: string | null
  unit_size?: string | null
  price?: number
  image_url?: string | null
  attributes?: Record<string, unknown> | null
  tags?: unknown
  status?: string
}

/**
 * Flatten a cart_items row + hydrated product onto a frontend-friendly
 * shape. Mirrors what the products handler does for catalogue rows so
 * Cart.tsx and OrderSummaryCard.tsx don't need to know about the DB
 * column layout (price → price_cents, image_url → thumbnail_url, etc.).
 */
function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch (_error) {
      // invalid JSON; return the caller-supplied fallback
      return fallback
    }
  }
  return raw as T
}

function serializeCartItem(
  it: CartItemRow,
  product: ProductLite | null,
  substitute: ProductLite | null,
): Record<string, unknown> {
  const attrs = parseJson<Record<string, unknown>>(product?.attributes, {})
  const tagsRaw = parseJson<unknown>(product?.tags, [])
  return {
    id: it.id,
    product_id: it.product_id,
    quantity: it.quantity,
    qty: it.quantity,
    substitution_preference: it.substitution_preference,
    substitution_pref: it.substitution_preference,
    substitute_id: it.substitute_id,
    notes: it.notes,
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    size: product?.unit_size ?? '',
    price_cents: Number(product?.price ?? 0),
    thumbnail_url: product?.image_url ?? null,
    in_stock: product?.status === 'active' && attrs.in_stock !== false,
    badges: Array.isArray(tagsRaw) ? (tagsRaw as string[]) : [],
    substitute: substitute
      ? {
          id: substitute.id,
          name: substitute.name,
          brand: substitute.brand ?? '',
          size: substitute.unit_size ?? '',
          price_cents: Number(substitute.price ?? 0),
          thumbnail_url: substitute.image_url ?? null,
        }
      : null,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const rawItems = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    const items: Record<string, unknown>[] = []
    let subtotal = 0
    for (const it of rawItems) {
      const product = await findById<ProductLite>('products', it.product_id)
      const substitute = it.substitute_id
        ? await findById<ProductLite>('products', it.substitute_id)
        : null
      items.push(serializeCartItem(it, product, substitute))
      subtotal += Number(product?.price ?? 0) * it.quantity
    }

    const deliveryFee = Number(process.env.DELIVERY_FEE ?? '499')
    const freeThreshold = Number(process.env.FREE_DELIVERY_THRESHOLD ?? '3500')
    const appliedDeliveryFee = subtotal >= freeThreshold ? 0 : deliveryFee

    const subtotalNum = Number(subtotal)
    res.json({
      data: items,
      items,
      subtotal: subtotalNum,
      subtotal_cents: subtotalNum,
      delivery_fee: appliedDeliveryFee,
      delivery_fee_cents: appliedDeliveryFee,
      free_delivery_threshold: freeThreshold,
      total: subtotalNum + appliedDeliveryFee,
      total_cents: subtotalNum + appliedDeliveryFee,
    })
  } catch (error) {
    logger.error('cart.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/items', validateBody(addItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof addItemSchema>

    const product = await findById<ProductLite>('products', body.productId)
    if (!product) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    // Availability (status active + attributes.in_stock) gated the Add button client-side and the
    // serialized `in_stock` flag, but the server never enforced it — so a direct POST could cart an
    // out-of-stock/archived product. Reject it (same predicate as the serializer).
    const productAttrs = (product.attributes ?? {}) as Record<string, unknown>
    if (product.status !== 'active' || productAttrs.in_stock === false) {
      res.status(400).json({
        error: t('product.unavailable', undefined, {
          defaultValue: 'This product is currently unavailable',
        }),
      })
      return
    }

    // Idempotent add — if the user already has the same product line, bump
    // quantity instead of creating a duplicate row.
    const existing = await findMany<CartItemRow>('cart_items', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: body.productId },
      ],
      limit: 1,
    })

    if (existing[0]) {
      const merged = await updateById<CartItemRow>('cart_items', existing[0].id, {
        quantity: existing[0].quantity + body.quantity,
        substitution_preference: body.substitutionPreference,
        substitute_id: body.substituteId ?? null,
        notes: body.notes,
        updated_at: new Date(),
      })
      const sub = body.substituteId
        ? await findById<ProductLite>('products', body.substituteId)
        : null
      res.json(merged.data ? serializeCartItem(merged.data, product, sub) : null)
      return
    }

    const result = await create<CartItemRow>('cart_items', {
      user_id: userId,
      product_id: body.productId,
      quantity: body.quantity,
      substitution_preference: body.substitutionPreference,
      substitute_id: body.substituteId ?? null,
      notes: body.notes,
    })
    const sub = body.substituteId
      ? await findById<ProductLite>('products', body.substituteId)
      : null
    res.status(201).json(result.data ? serializeCartItem(result.data, product, sub) : null)
  } catch (error) {
    logger.error('cart.addItem', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/items/:itemId',
  validateBody(updateItemSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const itemId = getParamId(req)
      const item = await findById<CartItemRow>('cart_items', itemId)
      if (!item) {
        res.status(404).json({
          error: t('cart.itemNotFound', undefined, { defaultValue: 'Cart item not found' }),
        })
        return
      }
      if (item.user_id !== userId) {
        res.status(403).json({
          error: t('cart.unauthorized', undefined, {
            defaultValue: 'You can only edit your own cart',
          }),
        })
        return
      }

      const body = req.body as z.infer<typeof updateItemSchema>

      if (body.quantity !== undefined && body.quantity === 0) {
        await deleteById('cart_items', itemId)
        res.status(204).end()
        return
      }

      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.quantity !== undefined) updates.quantity = body.quantity
      if (body.substitutionPreference !== undefined)
        updates.substitution_preference = body.substitutionPreference
      if (body.substituteId !== undefined) updates.substitute_id = body.substituteId
      if (body.notes !== undefined) updates.notes = body.notes

      const result = await updateById<CartItemRow>('cart_items', itemId, updates)
      if (!result.data) {
        res.status(500).json({
          error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
        })
        return
      }
      const product = await findById<ProductLite>('products', result.data.product_id)
      const sub = result.data.substitute_id
        ? await findById<ProductLite>('products', result.data.substitute_id)
        : null
      res.json(serializeCartItem(result.data, product, sub))
    } catch (error) {
      logger.error('cart.updateItem', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const itemId = getParamId(req)
    const item = await findById<CartItemRow>('cart_items', itemId)
    if (!item) {
      res
        .status(404)
        .json({ error: t('cart.itemNotFound', undefined, { defaultValue: 'Cart item not found' }) })
      return
    }
    if (item.user_id !== userId) {
      res.status(403).json({
        error: t('cart.unauthorized', undefined, {
          defaultValue: 'You can only edit your own cart',
        }),
      })
      return
    }
    await deleteById('cart_items', itemId)
    res.status(204).end()
  } catch (error) {
    logger.error('cart.deleteItem', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const items = await findMany<CartItemRow>('cart_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    for (const it of items) {
      await deleteById('cart_items', it.id)
    }
    res.status(204).end()
  } catch (error) {
    logger.error('cart.clearCart', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
