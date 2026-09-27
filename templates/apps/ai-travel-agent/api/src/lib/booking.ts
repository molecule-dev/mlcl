/**
 * Booking operations shared by the agent's tools, the HTTP handlers and the
 * delay watcher: book, rebook, split, notify.
 *
 * Persistence goes through `@molecule/api-database`'s DataStore; texts go
 * through the bonded `@molecule/api-sms` provider (Twilio, or the capture
 * provider when no Twilio credentials are set — then nothing leaves the
 * machine and the message is only recorded). Every user-facing event also
 * lands in `notifications`, so the UI shows it even without a phone number.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import { getProvider as getSmsProvider, hasProvider as hasSmsProvider } from '@molecule/api-sms'

import type { FlightOption } from './flights.js'
import { findFlights, getFlight } from './flights.js'

/** A row of `bookings`. */
export interface BookingRow {
  id: string
  user_id: string
  trip_id: string | null
  conversation_id: string | null
  flight_id: string | null
  source: string
  confirmation_code: string
  status: 'booked' | 'delayed' | 'rebooked' | 'cancelled'
  airline: string
  flight_number: string
  origin_iata: string
  destination_iata: string
  depart_at: string
  arrive_at: string
  cabin: string
  passenger_count: number
  traveler_names: string[]
  total_cents: number
  currency: string
  card_last4: string | null
  payment_intent_id: string | null
  delay_minutes: number
  rebooked_from_id: string | null
  rebooked_to_id: string | null
  booked_at: string
  created_at: string
  updated_at: string
}

/** A row of `bill_splits`. */
export interface SplitRow {
  id: string
  booking_id: string
  user_id: string
  name: string
  contact: string | null
  amount_cents: number
  currency: string
  // replaced: superseded by a later split of the same booking
  status: 'pending' | 'paid' | 'replaced'
  pay_token: string
  notified_at: string | null
  paid_at: string | null
  card_last4: string | null
  created_at: string
}

/** A row of `trips`. */
export interface TripRow {
  id: string
  user_id: string
  conversation_id: string | null
  title: string
  origin_iata: string | null
  destination_iata: string | null
  depart_date: string | null
  traveler_count: number
  status: 'planned' | 'booked' | 'rebooked' | 'cancelled'
  created_at: string
  updated_at: string
}

/** Delays at or above this many minutes trigger an automatic rebooking. */
export const REBOOK_DELAY_MINUTES = 60

/** Where pay links point. Set APP_URL in production; the dev default is the Vite port. */
export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

/**
 * An 8-character confirmation code from a CSPRNG (a code is a credential a
 * passenger presents, so it must not be guessable).
 */
export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const limit = 256 - (256 % chars.length)
  let result = ''
  while (result.length < 8) {
    const buf = randomBytes(16)
    for (let i = 0; i < buf.length && result.length < 8; i++) {
      const byte = buf[i]!
      if (byte < limit) result += chars.charAt(byte % chars.length)
    }
  }
  return result
}

/** A URL-safe pay-link token. */
export function generatePayToken(): string {
  return randomBytes(18).toString('base64url')
}

/** Format cents in a currency for messages the agent and texts show. */
export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100)
  } catch (_error) {
    // An unknown ISO code still formats as a number; the code is appended.
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

/** Record an in-app notification for the user. Never throws. */
export async function notify(
  userId: string,
  kind: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    await create('notifications', { user_id: userId, kind, title, body, link: link ?? null })
  } catch (error) {
    logger.warn('notifications.create failed', { error, userId, kind })
  }
}

/** Send a text through the bonded SMS provider. Returns false when no provider or no number. */
export async function sendText(to: string | null | undefined, message: string): Promise<boolean> {
  if (!to || !hasSmsProvider()) return false
  try {
    await getSmsProvider().send(to, message)
    return true
  } catch (error) {
    logger.warn('sms.send failed', { error, to })
    return false
  }
}

/** The phone number the user saved in Settings, if any. */
export async function userPhone(userId: string): Promise<string | null> {
  const user = await findById<{ oauthData: Record<string, unknown> | null }>('users', userId)
  const data = user?.oauthData
  const prefs =
    data && typeof data === 'object' ? (data.travelPreferences as { phone?: unknown }) : null
  const phone = prefs?.phone
  return typeof phone === 'string' && phone.trim() ? phone.trim() : null
}

export interface BookInput {
  userId: string
  flight: FlightOption
  passengers: number
  travelerNames?: string[]
  conversationId?: string | null
  tripId?: string | null
  cardLast4?: string | null
  rebookedFromId?: string | null
}

/**
 * Book a flight: snapshot the itinerary into `bookings`, attach it to a trip
 * (creating one when none is given), and confirm to the user.
 *
 * Payment: the total is recorded here. In this template the charge is
 * simulated (`cardLast4`), the same way the flight-search flagship does it;
 * wire `@molecule/api-payments` (for example Stripe's off-session charge
 * against the user's saved card) in place of the `card_last4` write when
 * real money should move.
 */
export async function bookFlight(input: BookInput): Promise<BookingRow> {
  const { flight } = input
  const passengers = Math.max(1, Math.floor(input.passengers))
  const totalCents = flight.priceCents * passengers
  let tripId = input.tripId ?? null
  if (!tripId) {
    const trip = await create<TripRow>('trips', {
      user_id: input.userId,
      conversation_id: input.conversationId ?? null,
      title: `${flight.origin} → ${flight.destination}`,
      origin_iata: flight.origin,
      destination_iata: flight.destination,
      depart_date: flight.departAt.slice(0, 10),
      traveler_count: passengers,
      status: 'booked',
    })
    if (!trip.data) throw new Error('trip was not created')
    tripId = trip.data.id
  } else {
    await updateById('trips', tripId, {
      status: input.rebookedFromId ? 'rebooked' : 'booked',
      updated_at: new Date(),
    })
  }
  const result = await create<BookingRow>('bookings', {
    user_id: input.userId,
    trip_id: tripId,
    conversation_id: input.conversationId ?? null,
    flight_id: flight.id,
    source: flight.source,
    confirmation_code: generateConfirmationCode(),
    status: 'booked',
    airline: flight.airline,
    flight_number: flight.flightNumber,
    origin_iata: flight.origin,
    destination_iata: flight.destination,
    depart_at: new Date(flight.departAt),
    arrive_at: new Date(flight.arriveAt),
    cabin: flight.cabin,
    passenger_count: passengers,
    traveler_names: JSON.stringify(input.travelerNames ?? []),
    total_cents: totalCents,
    currency: flight.currency,
    card_last4: input.cardLast4 ?? null,
    rebooked_from_id: input.rebookedFromId ?? null,
    booked_at: new Date(),
  })
  const booking = result.data
  if (!booking) throw new Error('booking was not created')
  if (flight.source === 'inventory') {
    // Keep the inventory honest: a booked seat is gone.
    try {
      const row = await findById<{ seats_left: number }>('flights', flight.id)
      if (row) {
        await updateById('flights', flight.id, {
          seats_left: Math.max(0, Number(row.seats_left) - passengers),
        })
      }
    } catch (error) {
      logger.warn('flights.seats update failed', { error, flightId: flight.id })
    }
  }
  await notify(
    input.userId,
    'booking',
    `Booked ${flight.flightNumber} ${flight.origin} → ${flight.destination}`,
    `Confirmation ${booking.confirmation_code}. ${formatMoney(totalCents, flight.currency)} for ${passengers} ${passengers === 1 ? 'traveler' : 'travelers'}.`,
    `/trips/${tripId}`,
  )
  return booking
}

/**
 * Find a later flight on the same route and day (or the next day) and move the
 * booking onto it. The old booking is kept as `rebooked` and linked both ways.
 *
 * @returns The new booking, or null when nothing later is available.
 */
export async function rebookBooking(
  booking: BookingRow,
  reason: 'delay' | 'request' = 'delay',
): Promise<BookingRow | null> {
  const departAt = new Date(booking.depart_at)
  const notBefore = new Date(departAt.getTime() + Math.max(booking.delay_minutes, 0) * 60_000)
  const sameDay = departAt.toISOString().slice(0, 10)
  let options = await findFlights({
    origin: booking.origin_iata,
    destination: booking.destination_iata,
    departureDate: sameDay,
    adults: booking.passenger_count,
    cabin: booking.cabin,
    notBefore,
  })
  options = options.filter((o) => o.id !== booking.flight_id && o.status !== 'cancelled')
  if (options.length === 0) {
    const next = new Date(departAt.getTime() + 24 * 60 * 60_000).toISOString().slice(0, 10)
    options = (
      await findFlights({
        origin: booking.origin_iata,
        destination: booking.destination_iata,
        departureDate: next,
        adults: booking.passenger_count,
        cabin: booking.cabin,
      })
    ).filter((o) => o.id !== booking.flight_id && o.status !== 'cancelled')
  }
  const replacement = options[0]
  if (!replacement) return null
  const fresh = (await getFlight(replacement.id, booking.cabin)) ?? replacement
  const next = await bookFlight({
    userId: booking.user_id,
    flight: fresh,
    passengers: booking.passenger_count,
    travelerNames: parseNames(booking.traveler_names),
    conversationId: booking.conversation_id,
    tripId: booking.trip_id,
    cardLast4: booking.card_last4,
    rebookedFromId: booking.id,
  })
  await updateById('bookings', booking.id, {
    status: 'rebooked',
    rebooked_to_id: next.id,
    updated_at: new Date(),
  })
  const when = new Date(fresh.departAt).toUTCString()
  const why = reason === 'delay' ? `${booking.flight_number} was delayed` : 'you asked to move'
  const text = `${why}, so you are now on ${fresh.flightNumber}, departing ${when}. New confirmation ${next.confirmation_code}.`
  await notify(
    booking.user_id,
    'rebooked',
    `Rebooked onto ${fresh.flightNumber}`,
    text,
    `/trips/${next.trip_id ?? ''}`,
  )
  await sendText(await userPhone(booking.user_id), text)
  return next
}

/** `traveler_names` comes back as JSON from Postgres; tolerate a string too. */
export function parseNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // Not JSON: no names were stored.
      return []
    }
  }
  return []
}

export interface SplitPerson {
  name: string
  contact?: string | null
}

/**
 * Split a booking's total evenly across `people` (the owner included when
 * listed) and text each person who has a phone number a pay link.
 *
 * Existing pending splits for the booking are replaced, so calling this twice
 * never double-bills anyone.
 */
export async function splitBill(booking: BookingRow, people: SplitPerson[]): Promise<SplitRow[]> {
  const names = people.map((p) => p.name.trim()).filter(Boolean)
  if (names.length === 0) return []
  const existing = await findMany<SplitRow>('bill_splits', {
    where: [{ field: 'booking_id', operator: '=', value: booking.id }],
  })
  const paid = existing.filter((s) => s.status === 'paid')
  const unpaidCents = booking.total_cents - paid.reduce((sum, s) => sum + s.amount_cents, 0)
  const share = Math.floor(unpaidCents / names.length)
  let remainder = unpaidCents - share * names.length
  const rows: SplitRow[] = []
  for (const person of people) {
    const name = person.name.trim()
    if (!name) continue
    const amount = share + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    const contact = person.contact?.trim() || null
    const result = await create<SplitRow>('bill_splits', {
      booking_id: booking.id,
      user_id: booking.user_id,
      name,
      contact,
      amount_cents: amount,
      currency: booking.currency,
      status: 'pending',
      pay_token: generatePayToken(),
    })
    const row = result.data
    if (!row) throw new Error('bill split was not created')
    const link = `${appUrl()}/pay/${row.pay_token}`
    if (contact && /^\+?[0-9][0-9\s-]{6,}$/.test(contact)) {
      const sent = await sendText(
        contact,
        `${name}, your share of ${booking.flight_number} ${booking.origin_iata} → ${booking.destination_iata} is ${formatMoney(amount, booking.currency)}. Pay here: ${link}`,
      )
      if (sent) await updateById('bill_splits', row.id, { notified_at: new Date() })
    }
    rows.push(row)
  }
  for (const old of existing) {
    if (old.status === 'pending') {
      await updateById('bill_splits', old.id, { status: 'replaced' })
    }
  }
  await notify(
    booking.user_id,
    'split',
    `Split ${formatMoney(booking.total_cents, booking.currency)} ${names.length} ways`,
    `${names.join(', ')} each got a pay link for ${formatMoney(share, booking.currency)}.`,
    `/bills`,
  )
  return rows
}

/** Upcoming bookings for a user, soonest first. */
export async function upcomingBookings(userId: string): Promise<BookingRow[]> {
  const rows = await findMany<BookingRow>('bookings', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: 'in', value: ['booked', 'delayed'] },
    ],
    orderBy: [{ field: 'depart_at', direction: 'asc' }],
    limit: 20,
  })
  return rows
}

/** Look a booking up by id or confirmation code, scoped to its owner. */
export async function findOwnedBooking(userId: string, ref: string): Promise<BookingRow | null> {
  const trimmed = ref.trim()
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
    const row = await findById<BookingRow>('bookings', trimmed)
    return row && row.user_id === userId ? row : null
  }
  const rows = await findMany<BookingRow>('bookings', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'confirmation_code', operator: '=', value: trimmed.toUpperCase() },
    ],
    limit: 1,
  })
  return rows[0] ?? null
}

/** How many bookings a user holds — used by the tier limit. */
export async function bookingCount(userId: string): Promise<number> {
  return count('bookings', [{ field: 'user_id', operator: '=', value: userId }])
}
