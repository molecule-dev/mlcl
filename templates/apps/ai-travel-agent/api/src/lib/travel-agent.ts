/**
 * The travel agent: the system prompt and the tools one conversation turn
 * runs with, on top of the bonded `@molecule/api-ai-agents` loop.
 *
 * Every tool closes over the authenticated user, so nothing the model says can
 * reach another user's bookings, and every tool returns plain JSON the model
 * reads back to the user. Tool errors are returned as `{ error }` (not thrown)
 * so the agent can explain and recover in the same turn.
 *
 * @module
 */

import type { AITool } from '@molecule/api-ai'

import {
  bookFlight,
  findOwnedBooking,
  formatMoney,
  parseNames,
  rebookBooking,
  splitBill,
  upcomingBookings,
} from './booking.js'
import { findFlights, type FlightOption, getFlight, normalizeCabin } from './flights.js'

/** The system prompt. Kept short: the reply is spoken back through TTS. */
export function systemPrompt(now = new Date()): string {
  return [
    'You are a travel agent that books flights by voice.',
    `Today is ${now.toISOString().slice(0, 10)}.`,
    'Keep replies to one or two short sentences: they are read aloud.',
    'Use the tools for anything about flights, bookings, delays or bills; never invent flight numbers, prices or confirmation codes.',
    'Before booking or splitting a bill, state the flight, the total and who pays, and book only when the user has confirmed.',
    'Airports are IATA codes; ask for the city when you are not sure which airport the user means.',
    'When a booked flight is delayed an hour or more, the app rebooks it automatically; tell the user what changed.',
  ].join(' ')
}

function shape(option: FlightOption): Record<string, unknown> {
  return {
    id: option.id,
    flight: option.flightNumber,
    airline: option.airline,
    from: option.origin,
    to: option.destination,
    departs: option.departAt,
    arrives: option.arriveAt,
    durationMinutes: option.durationMinutes,
    stops: option.stops,
    cabin: option.cabin,
    pricePerPerson: formatMoney(option.priceCents, option.currency),
    priceCents: option.priceCents,
    currency: option.currency,
    status: option.status,
    delayMinutes: option.delayMinutes,
  }
}

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Build the tool set for one user and conversation.
 *
 * @param userId - The authenticated user every tool is scoped to.
 * @param conversationId - Attached to bookings made in this session.
 */
export function buildTools(userId: string, conversationId: string | null): AITool[] {
  const search: AITool = {
    name: 'search_flights',
    description:
      'Search flights for a route on a date. Returns up to 10 options, cheapest first, with ids to book.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'IATA airport code, e.g. JFK' },
        destination: { type: 'string', description: 'IATA airport code, e.g. LHR' },
        departure_date: { type: 'string', description: 'YYYY-MM-DD' },
        adults: { type: 'integer', description: 'Passengers, default 1' },
        cabin: {
          type: 'string',
          enum: ['economy', 'premium-economy', 'business', 'first'],
        },
      },
      required: ['origin', 'destination', 'departure_date'],
    },
    execute: async (input) => {
      const i = input as Record<string, unknown>
      const origin = str(i.origin).toUpperCase()
      const destination = str(i.destination).toUpperCase()
      const departureDate = str(i.departure_date)
      if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
        return { error: 'origin and destination must be 3-letter IATA codes' }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
        return { error: 'departure_date must be YYYY-MM-DD' }
      }
      const options = await findFlights({
        origin,
        destination,
        departureDate,
        adults: num(i.adults, 1),
        cabin: normalizeCabin(str(i.cabin) || undefined),
      })
      return { count: options.length, flights: options.slice(0, 10).map(shape) }
    },
  }

  const book: AITool = {
    name: 'book_flight',
    description:
      'Book a flight by the id returned from search_flights, for a number of passengers. Only call after the user confirmed the flight and total.',
    parameters: {
      type: 'object',
      properties: {
        flight_id: { type: 'string' },
        passengers: { type: 'integer', description: 'Number of travelers, default 1' },
        traveler_names: { type: 'array', items: { type: 'string' } },
        cabin: { type: 'string' },
      },
      required: ['flight_id'],
    },
    execute: async (input) => {
      const i = input as Record<string, unknown>
      const flight = await getFlight(str(i.flight_id), normalizeCabin(str(i.cabin) || undefined))
      if (!flight) return { error: 'That flight is no longer available; search again.' }
      if (flight.status === 'cancelled') return { error: 'That flight is cancelled.' }
      const passengers = num(i.passengers, 1)
      const names = Array.isArray(i.traveler_names) ? i.traveler_names.map(String) : []
      const booking = await bookFlight({
        userId,
        flight,
        passengers,
        travelerNames: names,
        conversationId,
      })
      return {
        bookingId: booking.id,
        confirmationCode: booking.confirmation_code,
        tripId: booking.trip_id,
        flight: shape(flight),
        passengers,
        total: formatMoney(booking.total_cents, booking.currency),
        totalCents: booking.total_cents,
      }
    },
  }

  const status: AITool = {
    name: 'check_flight_status',
    description: 'Check the status and any delay of one of the user’s bookings.',
    parameters: {
      type: 'object',
      properties: {
        booking: { type: 'string', description: 'A booking id or confirmation code' },
      },
      required: ['booking'],
    },
    execute: async (input) => {
      const booking = await findOwnedBooking(
        userId,
        str((input as Record<string, unknown>).booking),
      )
      if (!booking) return { error: 'No such booking.' }
      const flight = booking.flight_id ? await getFlight(booking.flight_id, booking.cabin) : null
      return {
        confirmationCode: booking.confirmation_code,
        flight: booking.flight_number,
        from: booking.origin_iata,
        to: booking.destination_iata,
        departs: booking.depart_at,
        bookingStatus: booking.status,
        flightStatus: flight?.status ?? 'unknown',
        delayMinutes: flight?.delayMinutes ?? booking.delay_minutes,
        rebookedTo: booking.rebooked_to_id,
      }
    },
  }

  const rebook: AITool = {
    name: 'rebook_flight',
    description:
      'Move a booking to the next available flight on the same route (same day, else the next day). Use when the user asks to rebook, or when a flight is delayed or cancelled.',
    parameters: {
      type: 'object',
      properties: {
        booking: { type: 'string', description: 'A booking id or confirmation code' },
      },
      required: ['booking'],
    },
    execute: async (input) => {
      const booking = await findOwnedBooking(
        userId,
        str((input as Record<string, unknown>).booking),
      )
      if (!booking) return { error: 'No such booking.' }
      if (booking.status === 'rebooked' || booking.status === 'cancelled') {
        return { error: `That booking is already ${booking.status}.` }
      }
      const next = await rebookBooking(booking, 'request')
      if (!next) return { error: 'No later flight is available on that route yet.' }
      return {
        newBookingId: next.id,
        confirmationCode: next.confirmation_code,
        flight: next.flight_number,
        departs: next.depart_at,
        arrives: next.arrive_at,
        total: formatMoney(next.total_cents, next.currency),
      }
    },
  }

  const split: AITool = {
    name: 'split_bill',
    description:
      'Split a booking’s total evenly between people and text each one a pay link. List everyone who pays a share, including the user if they pay too.',
    parameters: {
      type: 'object',
      properties: {
        booking: { type: 'string', description: 'A booking id or confirmation code' },
        people: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              contact: { type: 'string', description: 'Phone in E.164 (+15551234567) or email' },
            },
            required: ['name'],
          },
        },
      },
      required: ['booking', 'people'],
    },
    execute: async (input) => {
      const i = input as Record<string, unknown>
      const booking = await findOwnedBooking(userId, str(i.booking))
      if (!booking) return { error: 'No such booking.' }
      const people = Array.isArray(i.people)
        ? i.people
            .map((p) => {
              const person = p as Record<string, unknown>
              return { name: str(person.name), contact: str(person.contact) || null }
            })
            .filter((p) => p.name)
        : []
      if (people.length === 0) return { error: 'Give at least one person to split with.' }
      const rows = await splitBill(booking, people)
      return {
        total: formatMoney(booking.total_cents, booking.currency),
        shares: rows.map((r) => ({
          name: r.name,
          amount: formatMoney(r.amount_cents, r.currency),
          notified: Boolean(r.notified_at),
          status: r.status,
        })),
      }
    },
  }

  const trips: AITool = {
    name: 'list_bookings',
    description: 'List the user’s upcoming bookings, soonest first.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      const rows = await upcomingBookings(userId)
      return {
        bookings: rows.map((b) => ({
          confirmationCode: b.confirmation_code,
          flight: b.flight_number,
          from: b.origin_iata,
          to: b.destination_iata,
          departs: b.depart_at,
          status: b.status,
          passengers: b.passenger_count,
          travelers: parseNames(b.traveler_names),
          total: formatMoney(b.total_cents, b.currency),
        })),
      }
    },
  }

  return [search, book, status, rebook, split, trips]
}
