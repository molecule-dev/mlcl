/**
 * Favorites handler — bookmarks of restaurants per user.
 *
 * The molecule `@molecule/api-resource-bookmark` package provides a generic
 * bookmark resource keyed on (resourceType, resourceId). We maintain an
 * app-specific `restaurant_favorites` table because the favorites list page
 * needs to JOIN against `restaurants` and the simpler dedicated table keeps
 * the discover/RestaurantDetail "is this in my favorites?" check fast.
 *
 * All routes are owner-scoped; a user can only see / modify their own
 * favorites. UNIQUE(owner_id, restaurant_id) enforces the "one bookmark
 * per restaurant" inventory rule.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const createFavoriteSchema = z.object({
  restaurant_id: z.string().min(1),
})

const listFavoritesQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

// ---------------------------------------------------------------------------
// GET / — Owner-only: list MY favorites.
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listFavoritesQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listFavoritesQuery>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const favorites = await findMany('restaurant_favorites', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('restaurant_favorites', where)
    res.json({ data: favorites, total, page })
  } catch (error) {
    logger.error('favorites.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Owner-only: bookmark a restaurant.
// ---------------------------------------------------------------------------

router.post('/', validateBody(createFavoriteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { restaurant_id } = req.body as z.infer<typeof createFavoriteSchema>
    const existing = await findOne('restaurant_favorites', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'restaurant_id', operator: '=', value: restaurant_id },
    ])
    if (existing) {
      return res.status(200).json(existing)
    }
    const result = await create('restaurant_favorites', {
      owner_id: userId,
      restaurant_id,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('favorites.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Owner-only: remove a favorite.
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
    const existing = await findOne<Record<string, unknown>>('restaurant_favorites', [
      { field: 'id', operator: '=', value: id },
    ])
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('favorite.notFound', {}, { defaultValue: 'Favorite not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('restaurant_favorites', id)
    res.status(204).send()
  } catch (error) {
    logger.error('favorites.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
