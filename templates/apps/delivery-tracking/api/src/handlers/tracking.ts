import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { geocode } from '@molecule/api-geolocation'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

const createEventSchema = z.object({
  status: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timestamp: z.string().optional(),
})

// Public — by tracking number; returns a stripped view (no PII fields).
router.get('/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const shipments = await findMany<Record<string, unknown>>('shipments', {
      where: [{ field: 'tracking_number', operator: '=', value: req.params.trackingNumber }],
      limit: 1,
    })
    if (shipments.length === 0) {
      res.status(404).json({
        error: t('tracking.notFound', undefined, { defaultValue: 'Tracking number not found' }),
      })
      return
    }
    const shipment = shipments[0]
    const events = await findMany('tracking_events', {
      where: [{ field: 'shipment_id', operator: '=', value: shipment.id as string }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
    })
    res.json({
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      carrier: shipment.carrier_id,
      origin: shipment.origin,
      destination: shipment.destination,
      expected_delivery: shipment.expected_delivery,
      events,
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Authenticated — owner-only event creation. Webhook ingestion uses a
// separate signed-payload route under /webhooks/* (see webhooks.ts).
router.post(
  '/:shipmentId/events',
  validateBody(createEventSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const { status, description, location, latitude, longitude, timestamp } = req.body

      const shipmentId = paramStr(req.params.shipmentId)
      const shipment = await findById<Record<string, unknown>>('shipments', shipmentId)
      if (!shipment || shipment.user_id !== userId) {
        res.status(404).json({
          error: t('shipments.notFound', undefined, { defaultValue: 'Shipment not found' }),
        })
        return
      }

      let lat = latitude
      let lng = longitude
      if (location && lat == null && lng == null) {
        try {
          const matches = await geocode(location)
          if (Array.isArray(matches) && matches.length > 0) {
            lat = matches[0].lat
            lng = matches[0].lng
          }
        } catch (geoErr) {
          logger.warn?.(`geocode failed: ${(geoErr as Error).message}`)
        }
      }

      const result = await create<Record<string, unknown>>('tracking_events', {
        shipment_id: shipmentId,
        status,
        description: description || '',
        location: location || null,
        latitude: lat ?? null,
        longitude: lng ?? null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      })

      await updateById('shipments', shipmentId, {
        status,
        current_location: location || (shipment.current_location as string | null),
        current_latitude: lat ?? (shipment.current_latitude as number | null),
        current_longitude: lng ?? (shipment.current_longitude as number | null),
        // Stamp the delivery time when the shipment reaches 'delivered'. Dashboard/analytics gate
        // delivered_today, on-time rate, and transit-hours on delivered_at, but the status
        // transition never set it — so every real delivery recorded null and those metrics silently
        // counted only seeded demo data. Preserve any existing value on other transitions.
        delivered_at:
          status === 'delivered'
            ? new Date()
            : ((shipment.delivered_at as Date | string | null | undefined) ?? null),
        updated_at: new Date(),
      })

      // realtime-public: shipment tracking is PUBLIC — GET /:trackingNumber is
      // unauthenticated and returns the same stripped status/location view (no PII),
      // so the `shipment:<id>` room deliberately has NO onJoinRequest guard. The
      // payload carries only public tracking fields (status, location, tracking_number).
      try {
        await broadcast(`shipment:${shipmentId}`, 'tracking:update', {
          shipment_id: shipmentId,
          tracking_number: shipment.tracking_number,
          status,
          location,
        })
      } catch (rtErr) {
        logger.warn?.(`realtime broadcast failed: ${(rtErr as Error).message}`)
      }

      // Honor the shipment owner's notification preferences: email_on_delivered / email_on_exception
      // gate the delivered / exception emails (default on when no row exists); out_for_delivery has no
      // toggle so it stays on. These prefs are set on the Settings page but were stored and never
      // consulted, so muting a type still emailed the recipient.
      let emailAllowed = ['out_for_delivery', 'delivered', 'exception'].includes(status)
      if (emailAllowed && (status === 'delivered' || status === 'exception')) {
        const prefs = await findOne<Record<string, unknown>>('notification_preferences', [
          { field: 'user_id', operator: '=', value: shipment.user_id },
        ])
        emailAllowed =
          status === 'delivered'
            ? prefs?.email_on_delivered !== false
            : prefs?.email_on_exception !== false
      }
      if (shipment.recipient_email && emailAllowed) {
        try {
          await sendMail({
            from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
            to: String(shipment.recipient_email),
            subject: t(
              'tracking.statusUpdateSubject',
              { status },
              { defaultValue: 'Delivery Update: {{status}}' },
            ),
            text: t(
              'tracking.statusUpdateBody',
              { tracking: shipment.tracking_number as string, status, location: location ?? '' },
              {
                defaultValue:
                  'Your shipment {{tracking}} is now {{status}}. Location: {{location}}',
              },
            ),
          })
        } catch (mailErr) {
          logger.warn?.(`email send failed: ${(mailErr as Error).message}`)
        }
      }

      res.status(201).json(result.data)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:shipmentId/locations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const shipmentId = paramStr(req.params.shipmentId)
    const shipment = await findById<Record<string, unknown>>('shipments', shipmentId)
    if (!shipment || shipment.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('shipments.notFound', undefined, { defaultValue: 'Shipment not found' }) })
      return
    }
    const events = await findMany<Record<string, unknown>>('tracking_events', {
      where: [{ field: 'shipment_id', operator: '=', value: shipmentId }],
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
    })
    const locations = events
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        latitude: e.latitude,
        longitude: e.longitude,
        location: e.location,
        status: e.status,
        timestamp: e.timestamp,
      }))
    res.json(locations)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
