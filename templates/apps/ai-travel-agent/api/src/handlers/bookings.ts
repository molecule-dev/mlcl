/**
 * Booking handlers — the same operations the agent performs, reachable from
 * the UI: book a searched flight, cancel, rebook, split the bill, and run the
 * delay check on demand.
 *
 * Every per-id route scopes by `user_id`; the tier limit on bookings is
 * enforced here and in the agent's `book_flight` tool alike.
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import {
  bookFlight,
  bookingCount,
  type BookingRow,
  rebookBooking,
  splitBill,
  type SplitRow,
} from '../lib/booking.js'
import { checkDelays } from '../lib/delay-watch.js'
import { getFlight, normalizeCabin } from '../lib/flights.js'
import type { AiTravelAgentLimits } from '../tiers.js'

const router = Router()

const createSchema = z.object({
  flight_id: z.string().min(1).max(200),
  passengers: z.number().int().min(1).max(9).optional(),
  traveler_names: z.array(z.string().min(1).max(120)).max(9).optional(),
  cabin: z.string().max(20).optional(),
  card_last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  conversation_id: z.string().uuid().optional(),
})

const splitSchema = z.object({
  people: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        contact: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(12),
})

async function owned(userId: string, id: string): Promise<BookingRow | null> {
  const row = await findById<BookingRow>('bookings', id)
  return row && row.user_id === userId ? row : null
}

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const rows = await findMany<BookingRow>('bookings', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'depart_at', direction: 'asc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('bookings.list', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/check-delays', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    res.json(await checkDelays(userId))
  } catch (error) {
    logger.error('bookings.checkDelays', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const booking = await owned(userId, params.data.id)
    if (!booking) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const splits = await findMany<SplitRow>('bill_splits', {
      where: [{ field: 'booking_id', operator: '=', value: booking.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json({ ...booking, splits: splits.filter((s) => s.status !== 'replaced') })
  } catch (error) {
    logger.error('bookings.get', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const tier = await getEffectiveTier<AiTravelAgentLimits>(res)
    if ((await bookingCount(userId)) >= tier.limits.maxBookings) {
      res.status(403).json({
        error: t(
          'bookings.limitReached',
          { max: tier.limits.maxBookings },
          { defaultValue: 'Your plan allows {{max}} bookings. Upgrade to book more.' },
        ),
        code: 'limit_reached',
      })
      return
    }
    const flight = await getFlight(body.flight_id, normalizeCabin(body.cabin))
    if (!flight || flight.status === 'cancelled') {
      res.status(409).json({
        error: t(
          'bookings.unavailable',
          {},
          { defaultValue: 'That flight is no longer available.' },
        ),
      })
      return
    }
    const booking = await bookFlight({
      userId,
      flight,
      passengers: body.passengers ?? 1,
      travelerNames: body.traveler_names,
      conversationId: body.conversation_id ?? null,
      cardLast4: body.card_last4 ?? null,
    })
    res.status(201).json(booking)
  } catch (error) {
    logger.error('bookings.create', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.put('/:id/cancel', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const booking = await owned(userId, params.data.id)
    if (!booking) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const result = await updateById<BookingRow>('bookings', booking.id, {
      status: 'cancelled',
      updated_at: new Date(),
    })
    if (booking.trip_id) {
      await updateById('trips', booking.trip_id, { status: 'cancelled', updated_at: new Date() })
    }
    res.json(result.data)
  } catch (error) {
    logger.error('bookings.cancel', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/:id/rebook', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const booking = await owned(userId, params.data.id)
    if (!booking) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    if (booking.status === 'rebooked' || booking.status === 'cancelled') {
      res.status(409).json({
        error: t('bookings.alreadyMoved', {}, { defaultValue: 'That booking was already moved.' }),
      })
      return
    }
    const next = await rebookBooking(booking, 'request')
    if (!next) {
      res.status(409).json({
        error: t(
          'bookings.noLaterFlight',
          {},
          { defaultValue: 'No later flight is available yet.' },
        ),
      })
      return
    }
    res.status(201).json(next)
  } catch (error) {
    logger.error('bookings.rebook', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/:id/split', validateBody(splitSchema), async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const booking = await owned(userId, params.data.id)
    if (!booking) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const body = req.body as z.infer<typeof splitSchema>
    const rows = await splitBill(booking, body.people)
    res.status(201).json(rows)
  } catch (error) {
    logger.error('bookings.split', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
