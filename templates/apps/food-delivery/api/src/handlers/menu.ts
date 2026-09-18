import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { deleteDocument, index } from '@molecule/api-search'

const router = Router()

const createMenuItemSchema = z.object({
  restaurant_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  category: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  preparation_time: z.number().int().positive().optional(),
  sort_order: z.number().int().nonnegative().optional(),
})

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  category: z.string().optional(),
  dietary_tags: z.array(z.string()).optional(),
  preparation_time: z.number().int().positive().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  status: z.enum(['available', 'sold_out', 'archived']).optional(),
})

const availabilitySchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), status: z.string().min(1) })).min(1),
})

function decorateMenuItem(it: Record<string, unknown>): Record<string, unknown> {
  return {
    ...it,
    price_cents: Number(it.price ?? 0),
    section: String(it.category ?? 'Other'),
  }
}

router.get('/restaurant/:restaurantId', async (req: Request, res: Response) => {
  try {
    const rawRestaurantId = req.params.restaurantId
    const restaurantId = Array.isArray(rawRestaurantId) ? rawRestaurantId[0] : rawRestaurantId
    const restaurant = await findById<Record<string, unknown>>('restaurants', restaurantId)
    if (!restaurant) {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }
    const where: WhereCondition[] = [
      { field: 'restaurant_id', operator: '=', value: restaurantId },
      { field: 'status', operator: '=', value: 'available' },
    ]
    const orderBy: OrderBy[] = [
      { field: 'category', direction: 'asc' },
      { field: 'sort_order', direction: 'asc' },
    ]
    const items = (await findMany<Record<string, unknown>>('menu_items', {
      where,
      orderBy,
      limit: 200,
    })) as Record<string, unknown>[]

    const decorated = items.map(decorateMenuItem)
    const grouped: Record<string, Record<string, unknown>[]> = {}
    for (const item of decorated) {
      const cat = String(item.section)
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }
    const deliveryFeeBase = parseInt(process.env.DELIVERY_FEE_BASE || '299', 10)
    const decoratedRestaurant = {
      ...restaurant,
      rating: Number(restaurant.rating ?? 0),
      review_count: Number(restaurant.review_count ?? 0),
      minimum_order_cents: Number(restaurant.minimum_order ?? 0),
      delivery_fee_cents: deliveryFeeBase,
      estimated_delivery_min: Number(restaurant.estimated_delivery_min ?? 30),
    }
    res.json({ data: { restaurant: decoratedRestaurant, items: decorated, categories: grouped } })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('menu_items', id)
    if (!item) {
      res
        .status(404)
        .json({ error: t('menu.itemNotFound', undefined, { defaultValue: 'Menu item not found' }) })
      return
    }
    const modifiers = (await findMany<Record<string, unknown>>('menu_modifiers', {
      where: [{ field: 'menu_item_id', operator: '=', value: id }],
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })) as Record<string, unknown>[]
    res.json({ ...item, modifiers })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

async function requireOwnedRestaurant(
  res: Response,
  restaurantId: string,
  userId: string,
): Promise<boolean> {
  const restaurant = await findById<Record<string, unknown>>('restaurants', restaurantId)
  if (!restaurant) {
    res.status(404).json({
      error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
    })
    return false
  }
  if (restaurant.owner_id !== userId) {
    res.status(403).json({
      error: t('menu.unauthorized', undefined, {
        defaultValue: 'Not authorized for this restaurant',
      }),
    })
    return false
  }
  return true
}

router.post('/', validateBody(createMenuItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const {
      restaurant_id,
      name,
      description,
      price,
      category,
      dietary_tags,
      preparation_time,
      sort_order,
    } = req.body
    if (!(await requireOwnedRestaurant(res, restaurant_id, userId))) return

    const result = await create<Record<string, unknown>>('menu_items', {
      restaurant_id,
      name,
      description: description || null,
      price: Math.round(Number(price) * 100),
      category: category || 'Main',
      dietary_tags: JSON.stringify(dietary_tags ?? []),
      preparation_time: preparation_time || 15,
      sort_order: sort_order || 0,
      status: 'available',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const item = result.data as Record<string, unknown> | undefined
    if (item?.id) {
      try {
        await index('menu_items', String(item.id), item)
      } catch (indexErr) {
        logger.warn?.(`menu_items index failed: ${(indexErr as Error).message}`)
      }
    }
    res.status(201).json(item)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateMenuItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('menu_items', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('menu.itemNotFound', undefined, { defaultValue: 'Menu item not found' }) })
      return
    }
    if (!(await requireOwnedRestaurant(res, String(existing.restaurant_id), userId))) return

    const updates: Record<string, unknown> = { updated_at: new Date() }
    const body = req.body as Record<string, unknown>
    for (const k of [
      'name',
      'description',
      'category',
      'preparation_time',
      'sort_order',
      'status',
    ]) {
      if (k in body) updates[k] = body[k]
    }
    if ('dietary_tags' in body) {
      updates.dietary_tags = JSON.stringify(body.dietary_tags ?? [])
    }
    if (typeof body.price === 'number') {
      updates.price = Math.round(body.price * 100)
    }
    const result = await updateById<Record<string, unknown>>('menu_items', id, updates)
    const updated = result.data as Record<string, unknown> | undefined
    if (updated) {
      try {
        await index('menu_items', String(updated.id ?? id), updated)
      } catch (indexErr) {
        logger.warn?.(`menu_items index failed: ${(indexErr as Error).message}`)
      }
    }
    res.json(updated)
  } catch (_err) {
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
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('menu_items', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('menu.itemNotFound', undefined, { defaultValue: 'Menu item not found' }) })
      return
    }
    if (!(await requireOwnedRestaurant(res, String(existing.restaurant_id), userId))) return
    await deleteById('menu_items', id)
    try {
      await deleteDocument('menu_items', id)
    } catch (indexErr) {
      logger.warn?.(`menu_items deleteDocument failed: ${(indexErr as Error).message}`)
    }
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/availability',
  validateBody(availabilitySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const { items } = req.body as { items: Array<{ id: string; status: string }> }
      let updated = 0
      for (const { id, status } of items) {
        const existing = await findById<Record<string, unknown>>('menu_items', id)
        if (!existing) continue
        const restaurant = await findById<Record<string, unknown>>(
          'restaurants',
          String(existing.restaurant_id),
        )
        if (!restaurant || restaurant.owner_id !== userId) continue
        await updateById('menu_items', id, { status, updated_at: new Date() })
        updated++
      }
      res.json({ updated })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
