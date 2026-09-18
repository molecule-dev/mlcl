import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { distance } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireCourier } from '../middleware/require-courier.js'

const router = Router()

function getParamOrderId(req: Request): string {
  const id = req.params.orderId
  return Array.isArray(id) ? id[0] : id
}

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

/**
 * Project an open order down to only the fields a courier needs to DECIDE
 * whether to accept it — pickup restaurant, the courier's fee, and a COARSE
 * drop-off region/distance. The exact delivery_address / delivery_lat /
 * delivery_lng are deliberately omitted here and revealed only to the assigned
 * driver after /accept (the order's full row is returned by that handler, and
 * /location + /complete scope to driver_id === self). This stops the available
 * board from leaking strangers' precise home addresses.
 */
export function toCourierOffer(order: Record<string, unknown>): Record<string, unknown> {
  // Round the drop-off to ~0.1° (~10 km) so couriers can gauge area/distance
  // without pinpointing the customer's home.
  const dropLat =
    order.delivery_lat == null ? null : Math.round(Number(order.delivery_lat) * 10) / 10
  const dropLng =
    order.delivery_lng == null ? null : Math.round(Number(order.delivery_lng) * 10) / 10
  return {
    id: order.id,
    restaurant_id: order.restaurant_id,
    status: order.status,
    delivery_fee: order.delivery_fee,
    currency: order.currency,
    distance_km: order.distance_km,
    created_at: order.created_at,
    delivery_region_lat: dropLat,
    delivery_region_lng: dropLng,
  }
}

router.get('/available', requireCourier, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { lat, lng, page = '1', limit = '20' } = req.query
    const where: WhereCondition[] = [
      { field: 'status', operator: '=', value: 'ready' },
      { field: 'driver_id', operator: '=', value: null },
    ]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const offers = (await findMany<Record<string, unknown>>('orders', {
      where,
      orderBy,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })) as Record<string, unknown>[]

    if (lat && lng) {
      const driverLat = Number(lat)
      const driverLng = Number(lng)
      const decorated = await Promise.all(
        offers.map(async (order) => {
          const offer = toCourierOffer(order)
          const restaurant = await findById<Record<string, unknown>>(
            'restaurants',
            String(order.restaurant_id),
          )
          if (!restaurant) return { ...offer, pickup_distance: null }
          let dist: number | null = null
          try {
            dist = distance(
              { lat: driverLat, lng: driverLng },
              { lat: Number(restaurant.latitude ?? 0), lng: Number(restaurant.longitude ?? 0) },
            )
          } catch (geoErr) {
            logger.warn?.(`distance failed: ${(geoErr as Error).message}`)
          }
          return { ...offer, restaurant, pickup_distance: dist }
        }),
      )
      res.json(decorated)
      return
    }
    res.json(offers.map(toCourierOffer))
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/active', requireCourier, async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const orders = await findMany('orders', {
      where: [
        { field: 'driver_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'picked_up' },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(orders)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/history', requireCourier, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { page = '1', limit = '20' } = req.query
    const orders = await findMany('orders', {
      where: [
        { field: 'driver_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'delivered' },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    res.json(orders)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:orderId/accept', requireCourier, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const orderId = getParamOrderId(req)
    const order = await findById<Record<string, unknown>>('orders', orderId)
    if (!order) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    if (order.status !== 'ready' || order.driver_id) {
      res.status(400).json({
        error: t('delivery.alreadyAssigned', undefined, {
          defaultValue: 'Delivery already assigned to a driver',
        }),
      })
      return
    }
    const updated = await updateById('orders', orderId, {
      driver_id: userId,
      status: 'picked_up',
      updated_at: new Date(),
    })
    await create('delivery_tracking', {
      order_id: orderId,
      driver_id: userId,
      status: 'en_route',
      started_at: new Date(),
      updated_at: new Date(),
    })
    res.json(updated.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:orderId/location',
  requireCourier,
  validateBody(locationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const orderId = getParamOrderId(req)
      const { lat, lng } = req.body as { lat: number; lng: number }

      const order = await findById<Record<string, unknown>>('orders', orderId)
      if (!order || order.driver_id !== userId) {
        res.status(403).json({
          error: t('delivery.unauthorized', undefined, {
            defaultValue: 'Not authorized for this delivery',
          }),
        })
        return
      }

      let etaMinutes = 0
      try {
        const km = distance(
          { lat: Number(lat), lng: Number(lng) },
          { lat: Number(order.delivery_lat ?? 0), lng: Number(order.delivery_lng ?? 0) },
        )
        etaMinutes = Math.max(0, Math.round(km * 3))
      } catch (geoErr) {
        logger.warn?.(`distance failed: ${(geoErr as Error).message}`)
      }

      await create('driver_locations', {
        driver_id: userId,
        order_id: orderId,
        lat: Number(lat),
        lng: Number(lng),
        recorded_at: new Date(),
      })
      res.json({ etaMinutes })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/:orderId/complete', requireCourier, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const orderId = getParamOrderId(req)
    const order = await findById<Record<string, unknown>>('orders', orderId)
    if (!order || order.driver_id !== userId) {
      res.status(403).json({
        error: t('delivery.unauthorized', undefined, {
          defaultValue: 'Not authorized for this delivery',
        }),
      })
      return
    }
    if (order.status !== 'picked_up') {
      res.status(400).json({
        error: t('delivery.invalidState', undefined, { defaultValue: 'Invalid delivery state' }),
      })
      return
    }
    await updateById('orders', orderId, { status: 'delivered', updated_at: new Date() })
    res.json({
      message: t('delivery.completed', undefined, { defaultValue: 'Delivery completed' }),
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:orderId/eta', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const orderId = getParamOrderId(req)
    const order = await findById<Record<string, unknown>>('orders', orderId)
    if (!order || (order.customer_id !== userId && order.driver_id !== userId)) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    if (!order.driver_id) {
      const restaurant = await findById<Record<string, unknown>>(
        'restaurants',
        String(order.restaurant_id),
      )
      const prepTime = Number(restaurant?.estimated_delivery_min ?? 30)
      const distanceKm = Number(order.distance_km ?? 0)
      const deliveryMin = Math.max(0, Math.round(distanceKm * 3))
      res.json({ etaMinutes: prepTime + deliveryMin, hasDriver: false })
      return
    }
    const tracking = (await findMany<Record<string, unknown>>('driver_locations', {
      where: [{ field: 'order_id', operator: '=', value: orderId }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      limit: 1,
    })) as Record<string, unknown>[]
    const latest = tracking[0]
    res.json({
      etaMinutes: Number(latest?.eta_minutes ?? 0),
      hasDriver: true,
      driverLat: latest?.lat,
      driverLng: latest?.lng,
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
