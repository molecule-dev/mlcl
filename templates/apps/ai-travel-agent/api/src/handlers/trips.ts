/**
 * Trip handlers — what the agent booked, grouped per trip, with the bookings
 * and bill splits under each.
 */

import { Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { BookingRow, SplitRow, TripRow } from '../lib/booking.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const [trips, bookings] = await Promise.all([
      findMany<TripRow>('trips', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      findMany<BookingRow>('bookings', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'depart_at', direction: 'asc' }],
      }),
    ])
    res.json(
      trips.map((trip) => ({
        ...trip,
        bookings: bookings.filter((b) => b.trip_id === trip.id),
      })),
    )
  } catch (error) {
    logger.error('trips.list', error)
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
    const trip = await findById<TripRow>('trips', params.data.id)
    if (!trip || trip.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const bookings = await findMany<BookingRow>('bookings', {
      where: [{ field: 'trip_id', operator: '=', value: trip.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    const splits =
      bookings.length > 0
        ? await findMany<SplitRow>('bill_splits', {
            where: [{ field: 'booking_id', operator: 'in', value: bookings.map((b) => b.id) }],
            orderBy: [{ field: 'created_at', direction: 'asc' }],
          })
        : []
    res.json({
      ...trip,
      bookings: bookings.map((b) => ({
        ...b,
        splits: splits.filter((s) => s.booking_id === b.id && s.status !== 'replaced'),
      })),
    })
  } catch (error) {
    logger.error('trips.get', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
