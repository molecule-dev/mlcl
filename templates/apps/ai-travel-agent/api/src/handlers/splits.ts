/**
 * Bill-split handlers.
 *
 *   GET  /splits            the owner's splits across all bookings (auth)
 *   GET  /pay/:token        what one person owes — public, the pay link's target
 *   POST /pay/:token/pay    settle a share — public
 *
 * The pay token is the only credential a payer has, so the public routes
 * expose nothing but that share: the amount, the flight and the payer's name.
 * Settlement is simulated with the card's last four digits, the same way the
 * booking itself is charged in this template; wire `@molecule/api-payments`
 * here when real money should move.
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { type BookingRow, notify, type SplitRow } from '../lib/booking.js'

export const splitsRouter = Router()
export const payRouter = Router()

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/)
const paySchema = z.object({ card_last4: z.string().regex(/^\d{4}$/) })

async function findByToken(token: string): Promise<SplitRow | null> {
  const rows = await findMany<SplitRow>('bill_splits', {
    where: [{ field: 'pay_token', operator: '=', value: token }],
    limit: 1,
  })
  return rows[0] ?? null
}

splitsRouter.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const [splits, bookings] = await Promise.all([
      findMany<SplitRow>('bill_splits', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'status', operator: 'in', value: ['pending', 'paid'] },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      findMany<BookingRow>('bookings', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
    ])
    const byId = new Map(bookings.map((b) => [b.id, b]))
    res.json(
      splits.map((s) => {
        const b = byId.get(s.booking_id)
        return {
          ...s,
          booking: b
            ? {
                id: b.id,
                trip_id: b.trip_id,
                flight_number: b.flight_number,
                origin_iata: b.origin_iata,
                destination_iata: b.destination_iata,
                depart_at: b.depart_at,
                total_cents: b.total_cents,
                currency: b.currency,
              }
            : null,
        }
      }),
    )
  } catch (error) {
    logger.error('splits.list', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

payRouter.get('/:token', async (req, res) => {
  try {
    const token = tokenSchema.safeParse(req.params.token)
    if (!token.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const split = await findByToken(token.data)
    if (!split || split.status === 'replaced') {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const booking = await findById<BookingRow>('bookings', split.booking_id)
    res.json({
      name: split.name,
      amount_cents: split.amount_cents,
      currency: split.currency,
      status: split.status,
      paid_at: split.paid_at,
      flight: booking
        ? {
            flight_number: booking.flight_number,
            origin_iata: booking.origin_iata,
            destination_iata: booking.destination_iata,
            depart_at: booking.depart_at,
          }
        : null,
    })
  } catch (error) {
    logger.error('pay.get', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

payRouter.post('/:token/pay', validateBody(paySchema), async (req, res) => {
  try {
    const token = tokenSchema.safeParse(req.params.token)
    if (!token.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const split = await findByToken(token.data)
    if (!split || split.status === 'replaced') {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    if (split.status === 'paid') {
      res.json({ status: 'paid', paid_at: split.paid_at })
      return
    }
    const body = req.body as z.infer<typeof paySchema>
    const paidAt = new Date()
    await updateById('bill_splits', split.id, {
      status: 'paid',
      paid_at: paidAt,
      card_last4: body.card_last4,
    })
    const booking = await findById<BookingRow>('bookings', split.booking_id)
    await notify(
      split.user_id,
      'paid',
      `${split.name} paid their share`,
      booking
        ? `${booking.flight_number} ${booking.origin_iata} → ${booking.destination_iata}`
        : '',
      '/bills',
    )
    res.json({ status: 'paid', paid_at: paidAt })
  } catch (error) {
    logger.error('pay.settle', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})
