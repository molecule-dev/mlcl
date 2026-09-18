/**
 * Tracking events list endpoint used by the TrackingDetail / Shipments
 * pages. Returns rows from `tracking_events` filtered by `?shipment_id=`,
 * scoped to the authenticated user's shipments.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface ShipmentRow {
  id: string
  user_id: string
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const shipmentId = typeof req.query.shipment_id === 'string' ? req.query.shipment_id : null
    if (!shipmentId) {
      res.json([])
      return
    }
    const ship = await findById<ShipmentRow>('shipments', shipmentId)
    if (!ship || ship.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('errors.notFound', undefined, { defaultValue: 'Not found' }) })
      return
    }
    const events = await findMany<{
      id: string
      shipment_id: string
      status: string
      description?: string | null
      location?: string | null
      timestamp: string
    }>('tracking_events', {
      where: [{ field: 'shipment_id', operator: '=', value: shipmentId }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
      limit: 200,
    })
    res.json(events)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
