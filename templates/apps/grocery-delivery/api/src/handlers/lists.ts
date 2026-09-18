/**
 * Shopping lists handler — per-user CRUD over `shopping_lists` and
 * `shopping_list_items`. Every read/write is scoped by `user_id` from
 * the authenticated session.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createListSchema = z.object({
  name: z.string().min(1),
})

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
})

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
})

interface ListRow {
  id: string
  user_id: string
  name: string
  created_at?: string
}

interface ListItemRow {
  id: string
  list_id: string
  product_id: string
  quantity: number
}

interface ProductLite {
  id: string
  name: string
  brand?: string | null
  unit_size?: string | null
  price?: number
  image_url?: string | null
  attributes?: Record<string, unknown> | null
}

async function hydrateListItems(
  list: ListRow,
): Promise<{ items: Array<Record<string, unknown>>; itemCount: number; totalCents: number }> {
  const itemRows = await findMany<ListItemRow>('shopping_list_items', {
    where: [{ field: 'list_id', operator: '=', value: list.id }],
  })
  const items: Array<Record<string, unknown>> = []
  let itemCount = 0
  let totalCents = 0
  for (const it of itemRows) {
    const product = await findById<ProductLite>('products', it.product_id)
    if (!product) continue
    const qty = Number(it.quantity)
    itemCount += qty
    const price = Number(product.price ?? 0)
    totalCents += price * qty
    items.push({
      id: it.id,
      product_id: it.product_id,
      quantity: it.quantity,
      qty: it.quantity,
      name: product.name,
      brand: product.brand ?? '',
      size: product.unit_size ?? '',
      price_cents: price,
      thumbnail_url: product.image_url ?? null,
    })
  }
  return { items, itemCount, totalCents }
}

interface OrderRow {
  id: string
  user_id: string
  created_at?: string
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  quantity: number
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
    const rawLists = await findMany<ListRow>('shopping_lists', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const lists: Array<Record<string, unknown>> = []
    for (const list of rawLists) {
      const { items, itemCount, totalCents } = await hydrateListItems(list)
      lists.push({
        id: list.id,
        name: list.name,
        created_at: list.created_at,
        items,
        item_count: itemCount,
        total_cents: totalCents,
      })
    }
    // Build smart_reorder_due from the user's recent order history. Surface
    // products that show up across multiple past orders, ordered by recency,
    // so repeat customers see a one-tap re-add path on the Lists page.
    const recentOrders = await findMany<OrderRow>('orders', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 5,
    })
    const productCounts = new Map<string, { count: number; lastSeen: number }>()
    for (let i = 0; i < recentOrders.length; i++) {
      const order = recentOrders[i]
      const items = await findMany<OrderItemRow>('order_items', {
        where: [{ field: 'order_id', operator: '=', value: order.id }],
      })
      for (const it of items) {
        const prev = productCounts.get(it.product_id) ?? { count: 0, lastSeen: -1 }
        productCounts.set(it.product_id, {
          count: prev.count + 1,
          lastSeen: prev.lastSeen === -1 ? i : Math.min(prev.lastSeen, i),
        })
      }
    }
    const sortedProductIds = Array.from(productCounts.entries())
      .sort((a, b) => b[1].count - a[1].count || a[1].lastSeen - b[1].lastSeen)
      .slice(0, 6)
      .map(([id]) => id)
    const smartReorderDue: Array<Record<string, unknown>> = []
    for (const pid of sortedProductIds) {
      const product = await findById<ProductLite>('products', pid)
      if (!product) continue
      smartReorderDue.push({
        product_id: pid,
        name: product.name,
        brand: product.brand ?? '',
        size: product.unit_size ?? '',
        price_cents: Number(product.price ?? 0),
        thumbnail_url: product.image_url ?? null,
      })
    }
    const envelope = {
      lists,
      staples: [] as Array<Record<string, unknown>>,
      smart_reorder_due: smartReorderDue,
    }
    res.json({ data: envelope, ...envelope })
  } catch (error) {
    logger.error('lists.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const list = await findById<ListRow>('shopping_lists', getParamId(req))
    if (!list || list.user_id !== userId) {
      res.status(404).json({
        error: t('lists.notFound', undefined, { defaultValue: 'Shopping list not found' }),
      })
      return
    }
    const { items, itemCount, totalCents } = await hydrateListItems(list)
    res.json({ data: { ...list, items, item_count: itemCount, total_cents: totalCents } })
  } catch (error) {
    logger.error('lists.getById', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createListSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createListSchema>
    const result = await create<ListRow>('shopping_lists', { user_id: userId, name: body.name })
    res.status(201).json({ data: { ...result.data, items: [], item_count: 0, total_cents: 0 } })
  } catch (error) {
    logger.error('lists.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateListSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const list = await findById<ListRow>('shopping_lists', getParamId(req))
    if (!list || list.user_id !== userId) {
      res.status(404).json({
        error: t('lists.notFound', undefined, { defaultValue: 'Shopping list not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateListSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) updates.name = body.name
    const result = await updateById<ListRow>('shopping_lists', getParamId(req), updates)
    res.json(result.data)
  } catch (error) {
    logger.error('lists.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const list = await findById<ListRow>('shopping_lists', getParamId(req))
    if (!list || list.user_id !== userId) {
      res.status(404).json({
        error: t('lists.notFound', undefined, { defaultValue: 'Shopping list not found' }),
      })
      return
    }
    const items = await findMany<ListItemRow>('shopping_list_items', {
      where: [{ field: 'list_id', operator: '=', value: list.id }],
    })
    for (const it of items) await deleteById('shopping_list_items', it.id)
    await deleteById('shopping_lists', list.id)
    res.status(204).end()
  } catch (error) {
    logger.error('lists.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/items', validateBody(addItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const list = await findById<ListRow>('shopping_lists', getParamId(req))
    if (!list || list.user_id !== userId) {
      res.status(404).json({
        error: t('lists.notFound', undefined, { defaultValue: 'Shopping list not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof addItemSchema>
    const result = await create<ListItemRow>('shopping_list_items', {
      list_id: list.id,
      product_id: body.productId,
      quantity: body.quantity,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('lists.addItem', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const list = await findById<ListRow>('shopping_lists', getParamId(req))
    if (!list || list.user_id !== userId) {
      res.status(404).json({
        error: t('lists.notFound', undefined, { defaultValue: 'Shopping list not found' }),
      })
      return
    }
    await deleteById('shopping_list_items', getParamId(req, 'itemId'))
    res.status(204).end()
  } catch (error) {
    logger.error('lists.deleteItem', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
