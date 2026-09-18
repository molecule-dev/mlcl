import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { distance, geocode } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { deleteDocument, index, search } from '@molecule/api-search'

import type { FoodDeliveryLimits } from '../tiers.js'
import { isOpenNow } from './_hours.js'

const router = Router()

const createRestaurantSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  cuisine: z.string().optional(),
  address: z.string().min(1),
  phone: z.string().optional(),
  opening_hours: z.record(z.string(), z.unknown()).optional(),
  minimum_order: z.number().nonnegative().optional(),
  estimated_delivery_min: z.number().int().positive().optional(),
})

const updateRestaurantSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  cuisine: z.string().optional(),
  address: z.string().min(1).optional(),
  phone: z.string().optional(),
  opening_hours: z.record(z.string(), z.unknown()).optional(),
  minimum_order: z.number().nonnegative().optional(),
  estimated_delivery_min: z.number().int().positive().optional(),
  status: z.enum(['active', 'archived']).optional(),
})

function decorateRestaurant(row: Record<string, unknown>): Record<string, unknown> {
  const cuisine = (row.cuisine as string | null) ?? null
  const deliveryFeeBase = parseInt(process.env.DELIVERY_FEE_BASE || '299', 10)
  return {
    ...row,
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    minimum_order_cents: Number(row.minimum_order ?? 0),
    delivery_fee_cents: deliveryFeeBase,
    estimated_delivery_min: Number(row.estimated_delivery_min ?? 30),
    category: cuisine,
    // Open = active AND within today's opening_hours window (when hours are configured). This was
    // hardcoded to `status === 'active'`, so every restaurant showed "Open" 24/7 and the stored
    // hours + the "Closed" badge were dead. isOpenNow returns null when hours are indeterminate, in
    // which case we fall back to status alone.
    open: row.status === 'active' && isOpenNow(row.opening_hours) !== false,
    tags: Array.isArray(row.tags) ? row.tags : [],
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { lat, lng, q, cuisine, limit = '20' } = req.query

    if (q) {
      try {
        const results = await search('restaurants', { text: String(q), perPage: Number(limit) })
        const hits = (results.hits ?? []) as Array<{ document?: Record<string, unknown> }>
        // Hydrate each hit's document from the DB to ensure all decorated
        // fields exist (the search index can be stale or partial).
        const ids = hits
          .map((h) => String((h.document?.id as string | undefined) ?? ''))
          .filter(Boolean)
        let docs: Array<Record<string, unknown>> = []
        if (ids.length > 0) {
          const rows = (await findMany<Record<string, unknown>>('restaurants', {
            where: [{ field: 'id', operator: 'in', value: ids }],
            limit: ids.length,
          })) as Array<Record<string, unknown>>
          // Preserve search ranking order
          const byId = new Map(rows.map((r) => [String(r.id), r]))
          docs = ids.map((id) => byId.get(id)).filter(Boolean) as Array<Record<string, unknown>>
        }
        if (docs.length === 0) {
          // Fallback: use the index documents if DB lookup yielded nothing
          docs = hits
            .map((h) => h.document ?? {})
            .filter((d) => Object.keys(d).length > 0) as Array<Record<string, unknown>>
        }
        res.json({ data: docs.map(decorateRestaurant) })
        return
      } catch (searchErr) {
        logger.warn?.(`restaurants search failed: ${(searchErr as Error).message}`)
      }
    }

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (cuisine) where.push({ field: 'cuisine', operator: '=', value: String(cuisine) })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const restaurants = (await findMany<Record<string, unknown>>('restaurants', {
      where,
      orderBy,
      limit: Number(limit),
    })) as Record<string, unknown>[]

    if (lat && lng) {
      const userLat = Number(lat)
      const userLng = Number(lng)
      const radiusKm = parseFloat(process.env.DELIVERY_RADIUS_KM || '15')
      const withDistance = await Promise.all(
        restaurants.map(async (r) => {
          const restLat = Number(r.latitude ?? 0)
          const restLng = Number(r.longitude ?? 0)
          let dist: number | null
          try {
            dist = distance({ lat: userLat, lng: userLng }, { lat: restLat, lng: restLng })
          } catch (_error) {
            // distance calculation failed (e.g. invalid coords); treat as unknown distance
            dist = null
          }
          return { ...r, distance: dist }
        }),
      )
      const nearby = withDistance.filter((r) => r.distance == null || r.distance <= radiusKm)
      res.json({ data: nearby.map(decorateRestaurant) })
      return
    }

    res.json({ data: restaurants.map(decorateRestaurant) })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/meta/cuisines', async (_req: Request, res: Response) => {
  try {
    const restaurants = (await findMany<Record<string, unknown>>('restaurants', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      limit: 1000,
    })) as Record<string, unknown>[]
    const seen = new Set<string>()
    for (const r of restaurants) {
      const c = r.cuisine as string | undefined
      if (c) seen.add(c)
    }
    res.json(Array.from(seen).sort())
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const restaurant = await findById<Record<string, unknown>>('restaurants', id)
    if (!restaurant) {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }
    const reviews = (await findMany<Record<string, unknown>>('restaurant_reviews', {
      where: [{ field: 'restaurant_id', operator: '=', value: id }],
      limit: 25,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })) as Record<string, unknown>[]
    res.json({ data: { ...decorateRestaurant(restaurant), reviews } })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier restaurant cap (tiers.ts maxRestaurants) — defined + advertised in Pricing but
// enforceLimit was never called, so any tier could create unlimited restaurants.
const enforceRestaurantLimit = enforceLimit<FoodDeliveryLimits>({
  limitType: 'maxRestaurants',
  getLimit: (limits) => limits.maxRestaurants,
  getCurrent: async (userId) =>
    count('restaurants', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceRestaurantLimit,
  validateBody(createRestaurantSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const {
        name,
        description,
        cuisine,
        address,
        phone,
        opening_hours,
        minimum_order,
        estimated_delivery_min,
      } = req.body

      let lat: number | null = null
      let lng: number | null = null
      try {
        const results = await geocode(address)
        if (results && results.length > 0) {
          lat = Number(results[0].lat)
          lng = Number(results[0].lng)
        }
      } catch (geocodeErr) {
        logger.warn?.(`geocode failed: ${(geocodeErr as Error).message}`)
      }

      const result = await create<Record<string, unknown>>('restaurants', {
        owner_id: userId,
        name,
        description: description || null,
        cuisine: cuisine || null,
        address,
        phone: phone || null,
        latitude: lat,
        longitude: lng,
        opening_hours: JSON.stringify(opening_hours ?? {}),
        minimum_order: Math.round(Number(minimum_order || 0) * 100),
        estimated_delivery_min: estimated_delivery_min || 30,
        rating: 0,
        review_count: 0,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      const restaurant = result.data as Record<string, unknown> | undefined
      if (restaurant?.id) {
        try {
          await index('restaurants', String(restaurant.id), restaurant)
        } catch (indexErr) {
          logger.warn?.(`restaurants index failed: ${(indexErr as Error).message}`)
        }
      }
      res.status(201).json(restaurant)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateRestaurantSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('restaurants', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    const body = req.body as Record<string, unknown>
    for (const k of [
      'name',
      'description',
      'cuisine',
      'phone',
      'estimated_delivery_min',
      'status',
    ]) {
      if (k in body) updates[k] = body[k]
    }
    if ('opening_hours' in body) {
      updates.opening_hours = JSON.stringify(body.opening_hours ?? {})
    }
    if (typeof body.minimum_order === 'number') {
      updates.minimum_order = Math.round(body.minimum_order * 100)
    }
    if (typeof body.address === 'string' && body.address) {
      updates.address = body.address
      try {
        const results = await geocode(body.address)
        if (results && results.length > 0) {
          updates.latitude = Number(results[0].lat)
          updates.longitude = Number(results[0].lng)
        }
      } catch (geocodeErr) {
        logger.warn?.(`geocode failed: ${(geocodeErr as Error).message}`)
      }
    }

    const result = await updateById<Record<string, unknown>>('restaurants', id, updates)
    const updated = result.data as Record<string, unknown> | undefined
    if (updated) {
      try {
        await index('restaurants', String(updated.id ?? id), updated)
      } catch (indexErr) {
        logger.warn?.(`restaurants index failed: ${(indexErr as Error).message}`)
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
    const existing = await findById<Record<string, unknown>>('restaurants', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }
    await updateById('restaurants', id, { status: 'archived', updated_at: new Date() })
    try {
      await deleteDocument('restaurants', id)
    } catch (indexErr) {
      logger.warn?.(`restaurants deleteDocument failed: ${(indexErr as Error).message}`)
    }
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Hard-delete row (used to clean up test fixtures); owner-scoped.
router.delete('/:id/hard', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('restaurants', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({
        error: t('restaurant.notFound', undefined, { defaultValue: 'Restaurant not found' }),
      })
      return
    }
    await deleteById('restaurants', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
