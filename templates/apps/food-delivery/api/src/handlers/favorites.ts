import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createFavoriteSchema = z.object({
  restaurant_id: z.string().min(1),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const favorites = (await findMany<Record<string, unknown>>('favorites', {
      where,
      orderBy,
      limit: 200,
    })) as Record<string, unknown>[]
    const decorated = await Promise.all(
      favorites.map(async (f) => {
        const restaurant = await findById<Record<string, unknown>>(
          'restaurants',
          String(f.restaurant_id),
        )
        return {
          id: f.id,
          restaurant_id: f.restaurant_id,
          created_at: f.created_at,
          restaurant: restaurant
            ? {
                id: restaurant.id,
                name: restaurant.name,
                cuisine: restaurant.cuisine,
                rating: Number(restaurant.rating ?? 0),
                review_count: Number(restaurant.review_count ?? 0),
                estimated_delivery_min: Number(restaurant.estimated_delivery_min ?? 30),
                thumbnail_url: restaurant.thumbnail_url ?? null,
              }
            : null,
        }
      }),
    )
    res.json({ data: { restaurants: decorated, dishes: [] } })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createFavoriteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { restaurant_id } = req.body as { restaurant_id: string }
    const restaurant = await findById('restaurants', restaurant_id)
    if (!restaurant) {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }
    const result = await create('favorites', {
      user_id: userId,
      restaurant_id,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
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
    const existing = await findById<Record<string, unknown>>('favorites', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('favorites.notFound', undefined, { defaultValue: 'Favorite not found' }) })
      return
    }
    await deleteById('favorites', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
