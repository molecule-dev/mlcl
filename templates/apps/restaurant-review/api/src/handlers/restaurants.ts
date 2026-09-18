/**
 * Restaurants handler — catalog of restaurants for the discover/detail pages.
 *
 * Read access (`GET /` and `GET /:id`, `GET /:id/menu`) is public; write
 * access is owner-scoped. The inventory describes restaurants as
 * "admin-managed in v1", which we model uniformly via `owner_id`: anyone
 * can submit a listing they own; mutate / delete is gated on ownership.
 *
 * Validation: every body / query parameter goes through Zod via
 * `@molecule/api-middleware-validation`. No raw SQL — all reads/writes go
 * through the abstract `DataStore` (`@molecule/api-database`).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const priceLevel = z.coerce.number().int().min(1).max(4)

const createRestaurantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  cuisine: z.string().min(1).max(80),
  neighborhood: z.string().max(120).optional(),
  city: z.string().min(1).max(120),
  address: z.string().min(1).max(300),
  description: z.string().max(5000).optional().default(''),
  price_level: priceLevel.optional().default(2),
  thumbnail_url: z.string().url().optional(),
  gallery: z.array(z.string()).optional().default([]),
  badges: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  hours: z.record(z.string(), z.unknown()).optional().default({}),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
})

const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  status: z.enum(['active', 'closed', 'pending']).optional(),
})

const listRestaurantsQuery = z.object({
  q: z.string().optional(),
  cuisine: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  price_level: priceLevel.optional(),
  sort_by: z.enum(['rating', 'review_count', 'created_at']).optional().default('rating'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

// ---------------------------------------------------------------------------
// GET / — Public list / filter.
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listRestaurantsQuery), async (req: Request, res: Response) => {
  try {
    const { q, cuisine, neighborhood, city, price_level, sort_by, sort_order, page, limit } =
      req.query as unknown as z.infer<typeof listRestaurantsQuery>

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    // `q` is the free-text search box — match the restaurant name (case-insensitive substring).
    // `ilike` escapes wildcards + wraps %…%, so raw user input is injection-safe.
    if (q) where.push({ field: 'name', operator: 'ilike', value: q })
    if (cuisine) where.push({ field: 'cuisine', operator: '=', value: cuisine })
    if (neighborhood) where.push({ field: 'neighborhood', operator: '=', value: neighborhood })
    if (city) where.push({ field: 'city', operator: '=', value: city })
    if (price_level) where.push({ field: 'price_level', operator: '=', value: price_level })

    const restaurants = await findMany('restaurants', {
      where,
      orderBy: [{ field: sort_by, direction: sort_order }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('restaurants', where)
    res.json({ data: restaurants, total, page })
  } catch (error) {
    logger.error('restaurants.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Public read.
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await findById('restaurants', req.params.id as string)
    if (!restaurant) {
      return res
        .status(404)
        .json({ error: t('restaurant.notFound', {}, { defaultValue: 'Restaurant not found' }) })
    }
    res.json(restaurant)
  } catch (error) {
    logger.error('restaurants.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id/menu — Public read of available menu items.
// ---------------------------------------------------------------------------

router.get('/:id/menu', async (req: Request, res: Response) => {
  try {
    const items = await findMany('menu_items', {
      where: [
        { field: 'restaurant_id', operator: '=', value: req.params.id as string },
        { field: 'available', operator: '=', value: true },
      ],
      orderBy: [
        { field: 'category', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    })
    res.json({ data: items })
  } catch (error) {
    logger.error('restaurants.getMenu', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Authenticated create.
// ---------------------------------------------------------------------------

router.post('/', validateBody(createRestaurantSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const data = req.body as z.infer<typeof createRestaurantSchema>
    const result = await create('restaurants', {
      ...data,
      gallery: JSON.stringify(data.gallery ?? []),
      badges: JSON.stringify(data.badges ?? []),
      tags: JSON.stringify(data.tags ?? []),
      hours: JSON.stringify(data.hours ?? {}),
      owner_id: userId,
      latitude: data.latitude ?? 0,
      longitude: data.longitude ?? 0,
      status: 'active',
      rating: 0,
      review_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('restaurants.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// PUT /:id — Owner-only update.
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updateRestaurantSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('restaurants', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('restaurant.notFound', {}, { defaultValue: 'Restaurant not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as Partial<z.infer<typeof updateRestaurantSchema>>
    const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
    if (body.gallery !== undefined) updates.gallery = JSON.stringify(body.gallery)
    if (body.badges !== undefined) updates.badges = JSON.stringify(body.badges)
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
    if (body.hours !== undefined) updates.hours = JSON.stringify(body.hours)
    const result = await updateById('restaurants', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('restaurants.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Owner-only delete.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('restaurants', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('restaurant.notFound', {}, { defaultValue: 'Restaurant not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('restaurants', id)
    res.status(204).send()
  } catch (error) {
    logger.error('restaurants.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
