import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { RestaurantOrderingLimits } from '../tiers.js'

const router = Router()

const createMenuItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  price: z.number().positive(),
  category: z.string().min(1),
  image_url: z.string().nullable().optional(),
  dietary_tags: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

const updateMenuItemSchema = createMenuItemSchema.partial()

/** Pull the operator (restaurant owner) from the verified session middleware. */

// List menu items (public — used by QR order page; scoped to operator when provided)
router.get('/', async (req, res) => {
  try {
    const { category, available, owner } = req.query
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100))

    const where: WhereCondition[] = []
    if (category) where.push({ field: 'category', operator: '=', value: String(category) })
    if (available !== undefined) {
      where.push({ field: 'available', operator: '=', value: String(available) === 'true' })
    }
    if (owner) where.push({ field: 'user_id', operator: '=', value: String(owner) })

    const items = await findMany<Record<string, unknown>>('menu_items', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })
    const total = await count('menu_items', where)
    res.json({ data: items, total, page, limit })
  } catch (error) {
    logger.error('menu.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get menu categories
router.get('/categories', async (_req, res) => {
  try {
    const items = await findMany<Record<string, unknown>>('menu_items', { limit: 1000 })
    const categoryMap = new Map<string, number>()
    for (const item of items) {
      const cat = item.category as string
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
    }
    res.json(Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count })))
  } catch (error) {
    logger.error('menu.categories', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const item = await findById<Record<string, unknown>>('menu_items', req.params.id)
    if (!item) {
      return res
        .status(404)
        .json({ error: t('menu.itemNotFound', {}, { defaultValue: 'Menu item not found' }) })
    }
    res.json(item)
  } catch (error) {
    logger.error('menu.getItem', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create menu item (admin / operator only — must be authenticated, scoped to user_id)
router.post(
  '/',
  enforceLimit<RestaurantOrderingLimits>({
    limitType: 'maxMenu',
    getLimit: (limits) => limits.maxMenu,
    getCurrent: async (userId) =>
      count('menu_items', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as RequestHandler,
  validateBody(createMenuItemSchema) as RequestHandler,
  async (req, res) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      }
      const body = req.body as z.infer<typeof createMenuItemSchema>
      const result = await create<Record<string, unknown>>('menu_items', {
        user_id: userId,
        name: body.name,
        description: body.description,
        price: Math.round(Number(body.price) * 100) / 100,
        category: body.category,
        image_url: body.image_url ?? null,
        dietary_tags: JSON.stringify(body.dietary_tags ?? []),
        available: body.available !== false,
        sort_order: body.sort_order ?? 0,
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('menu.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update menu item (operator only — owner_id must match)
router.put('/:id', validateBody(updateMenuItemSchema) as RequestHandler, async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('menu_items', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('menu.itemNotFound', {}, { defaultValue: 'Menu item not found' }) })
    }
    if (existing.user_id && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as z.infer<typeof updateMenuItemSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.price !== undefined) updates.price = Math.round(Number(body.price) * 100) / 100
    if (body.category !== undefined) updates.category = body.category
    if (body.image_url !== undefined) updates.image_url = body.image_url
    if (body.dietary_tags !== undefined) updates.dietary_tags = JSON.stringify(body.dietary_tags)
    if (body.available !== undefined) updates.available = body.available
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order

    const result = await updateById<Record<string, unknown>>('menu_items', id, updates)
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('menu.itemNotFound', {}, { defaultValue: 'Menu item not found' }) })
    }
    res.json(result.data)
  } catch (error) {
    logger.error('menu.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete menu item (operator only — owner check by user_id)
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('menu_items', id)
    if (!existing) return res.status(204).end()
    if (existing.user_id && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('menu_items', id)
    res.status(204).end()
  } catch (error) {
    logger.error('menu.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
