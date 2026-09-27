/**
 * The delay watcher: every few minutes, look at bookings departing soon, and
 * when the flight is delayed past {@link REBOOK_DELAY_MINUTES}, rebook.
 *
 * Where delays come from: the seeded inventory carries a `status` and
 * `delay_minutes` per flight. The `@molecule/api-flights` contract is search
 * and pricing only — it has no flight-status call — so with a live provider
 * the app still reads delays from its own inventory rows (the place a status
 * feed or an airline webhook would write them). `simulateDelay()` is that
 * write, exposed as `POST /flights/:id/delay` so the flow can be driven from
 * the UI and the e2e specs.
 *
 * Registered with the bonded `@molecule/api-cron` provider at startup; also
 * runnable on demand through `POST /bookings/check-delays`.
 *
 * @module
 */

import { schedule } from '@molecule/api-cron'
import { findById, findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import {
  type BookingRow,
  notify,
  REBOOK_DELAY_MINUTES,
  rebookBooking,
  sendText,
  userPhone,
} from './booking.js'
import type { FlightRow } from './flights.js'

/** How far ahead the watcher looks. */
const LOOKAHEAD_HOURS = 36

/** Mark an inventory flight delayed (or back on time with 0 minutes). */
export async function simulateDelay(flightId: string, minutes: number): Promise<FlightRow | null> {
  const row = await findById<FlightRow>('flights', flightId)
  if (!row) return null
  const delay = Math.max(0, Math.floor(minutes))
  await updateById('flights', flightId, {
    status: delay > 0 ? 'delayed' : 'scheduled',
    delay_minutes: delay,
  })
  return { ...row, status: delay > 0 ? 'delayed' : 'scheduled', delay_minutes: delay }
}

export interface DelayCheckResult {
  checked: number
  delayed: number
  rebooked: string[]
}

/**
 * One pass over upcoming bookings. Safe to run repeatedly: a booking is
 * rebooked at most once (its status leaves `booked`), and a small delay only
 * updates `delay_minutes` and tells the user.
 *
 * @param userId - Limit the pass to one user's bookings (the on-demand route).
 */
export async function checkDelays(userId?: string): Promise<DelayCheckResult> {
  const now = new Date()
  const horizon = new Date(now.getTime() + LOOKAHEAD_HOURS * 60 * 60_000)
  const bookings = await findMany<BookingRow>('bookings', {
    where: [
      { field: 'status', operator: 'in', value: ['booked', 'delayed'] },
      { field: 'depart_at', operator: '<=', value: horizon },
      ...(userId ? [{ field: 'user_id', operator: '=' as const, value: userId }] : []),
    ],
    orderBy: [{ field: 'depart_at', direction: 'asc' }],
    limit: 200,
  })
  const result: DelayCheckResult = { checked: bookings.length, delayed: 0, rebooked: [] }
  for (const booking of bookings) {
    if (!booking.flight_id) continue
    const flight = await findById<FlightRow>('flights', booking.flight_id)
    if (!flight) continue
    const delay = flight.status === 'delayed' ? Number(flight.delay_minutes ?? 0) : 0
    if (delay <= 0) continue
    result.delayed += 1
    if (delay >= REBOOK_DELAY_MINUTES) {
      await updateById('bookings', booking.id, {
        status: 'delayed',
        delay_minutes: delay,
        updated_at: now,
      })
      const next = await rebookBooking(
        { ...booking, status: 'delayed', delay_minutes: delay },
        'delay',
      )
      if (next) result.rebooked.push(next.id)
      else {
        const text = `${booking.flight_number} is delayed ${delay} minutes and no later flight is available yet. I will keep looking.`
        await notify(
          booking.user_id,
          'delay',
          `${booking.flight_number} delayed`,
          text,
          `/trips/${booking.trip_id ?? ''}`,
        )
        await sendText(await userPhone(booking.user_id), text)
      }
    } else if (booking.delay_minutes !== delay) {
      await updateById('bookings', booking.id, {
        status: 'delayed',
        delay_minutes: delay,
        updated_at: now,
      })
      await notify(
        booking.user_id,
        'delay',
        `${booking.flight_number} delayed ${delay} minutes`,
        `Still within the ${REBOOK_DELAY_MINUTES}-minute window, so your booking stands.`,
        `/trips/${booking.trip_id ?? ''}`,
      )
    }
  }
  return result
}

/** Register the watcher with the bonded cron provider. */
export async function scheduleDelayWatch(): Promise<void> {
  await schedule('delay-watch', '*/10 * * * *', async () => {
    try {
      const outcome = await checkDelays()
      if (outcome.rebooked.length > 0) logger.info('delay-watch rebooked', outcome)
    } catch (error) {
      logger.error('delay-watch failed', { error })
    }
  })
}
