import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const cancelSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
})

interface BookingRow {
  id: string
  user_id: string
  property_id: string | null
  room_type_id: string
  check_in: string
  check_out: string
  guests: number
  nights: number
  subtotal_cents: number
  taxes_cents: number
  total_cents: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  stripe_payment_intent_id: string | null
  confirmation_code: string | null
  special_requests: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

interface PropertyRow {
  id: string
  name: string
  city: string
  country: string
  address: string | null
  thumbnail_url: string | null
  gallery: string[] | null
}

function deriveStatus(b: BookingRow): 'upcoming' | 'in_progress' | 'completed' | 'cancelled' {
  if (b.status === 'cancelled') return 'cancelled'
  if (b.status === 'completed') return 'completed'
  const now = Date.now()
  const ci = new Date(b.check_in).getTime()
  const co = new Date(b.check_out).getTime()
  if (now < ci) return 'upcoming'
  if (now >= ci && now < co) return 'in_progress'
  return 'completed'
}

async function countHostMessages(tripId: string): Promise<number> {
  const items = (await findMany('itinerary_items', {
    where: [
      { field: 'trip_id', operator: '=', value: tripId },
      { field: 'kind', operator: '=', value: 'note' },
    ],
    limit: 1000,
  })) as Array<{ id: string }>
  return Array.isArray(items) ? items.length : 0
}

async function shape(b: BookingRow): Promise<Record<string, unknown>> {
  const [property, hostMessageCount] = await Promise.all([
    b.property_id != null
      ? (findById('properties', b.property_id) as Promise<PropertyRow | null>)
      : Promise.resolve(null),
    countHostMessages(b.id),
  ])
  return {
    id: b.id,
    property_id: b.property_id,
    property_name: property?.name ?? 'Booking',
    city: property?.city ?? '',
    country: property?.country ?? '',
    address: property?.address ?? '',
    thumbnail_url: property?.thumbnail_url ?? null,
    gallery: Array.isArray(property?.gallery) ? property.gallery : [],
    check_in_iso: new Date(b.check_in).toISOString(),
    check_out_iso: new Date(b.check_out).toISOString(),
    guests: b.guests,
    nights: b.nights,
    status: deriveStatus(b),
    subtotal_cents: b.subtotal_cents,
    taxes_cents: b.taxes_cents,
    total_cents: b.total_cents,
    currency: b.currency,
    confirmation_code: b.confirmation_code,
    special_requests: b.special_requests,
    cancelled_at: b.cancelled_at,
    cancellation_reason: b.cancellation_reason,
    host_name: 'Sojourn host',
    host_message_count: hostMessageCount,
    cancellable: deriveStatus(b) === 'upcoming',
    modifiable: deriveStatus(b) === 'upcoming',
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const bookings = (await findMany('travel_bookings', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'check_in', direction: 'desc' }],
    limit: 100,
  })) as BookingRow[]
  const data: Array<Record<string, unknown>> = []
  for (const b of bookings) data.push(await shape(b))
  res.json({ data })
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  const booking = (await findById('travel_bookings', id)) as BookingRow | null
  if (!booking) {
    res.status(404).json({ error: t('booking.notFound', {}, { defaultValue: 'Trip not found' }) })
    return
  }
  if (booking.user_id !== userId) {
    res.status(404).json({ error: t('booking.notFound', {}, { defaultValue: 'Trip not found' }) })
    return
  }
  res.json(await shape(booking))
})

router.put(
  '/:id/cancel',
  validateParams(idParamSchema),
  validateBody(cancelSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = String(req.params.id)
    const existing = (await findById('travel_bookings', id)) as BookingRow | null
    if (!existing) {
      res.status(404).json({ error: t('booking.notFound', {}, { defaultValue: 'Trip not found' }) })
      return
    }
    if (existing.user_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    if (existing.status === 'cancelled') {
      res.json(await shape(existing))
      return
    }
    const body = req.body as z.infer<typeof cancelSchema>
    await updateById('travel_bookings', id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: body.reason ?? null,
    })
    const fresh = (await findById('travel_bookings', id)) as BookingRow | null
    res.json(fresh ? await shape(fresh) : { id, status: 'cancelled' })
  },
)

const noteSchema = z.object({ message: z.string().min(1).max(2000) })

router.post(
  '/:id/host-message',
  validateParams(idParamSchema),
  validateBody(noteSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = String(req.params.id)
    const existing = (await findById('travel_bookings', id)) as BookingRow | null
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('booking.notFound', {}, { defaultValue: 'Trip not found' }) })
      return
    }
    const { message } = req.body as z.infer<typeof noteSchema>
    // Persist the host message as an itinerary_item (kind=note) attached to
    // the trip. Single-direction note proves the message is durable and
    // visible in the trip's itinerary list.
    const item = await create('itinerary_items', {
      user_id: userId,
      trip_id: id,
      kind: 'note',
      title: 'Message to host',
      detail: message,
      cost_cents: 0,
      currency: 'USD',
    })
    res.status(201).json({
      data: {
        id: (item.data as { id?: string })?.id ?? null,
        trip_id: id,
        message,
      },
    })
  },
)

export default router
