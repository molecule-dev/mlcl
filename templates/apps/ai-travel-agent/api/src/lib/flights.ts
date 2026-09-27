/**
 * Flight lookup for the agent and the UI.
 *
 * Two sources, one shape:
 *   - the bonded `@molecule/api-flights` provider (Amadeus when
 *     AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET are set) — live offers;
 *   - the seeded `flights` inventory table — what a fresh scaffold, a sandbox
 *     and the e2e specs run against, and where a delay can be simulated.
 *
 * Provider offer ids are short-lived and must not be replayed later, so a
 * booking copies every field it needs out of the {@link FlightOption} at
 * booking time (see `travel-agent.ts`).
 *
 * @module
 */

import { findById, findMany } from '@molecule/api-database'
import type { FlightOffer } from '@molecule/api-flights'
import { getOffer, hasProvider, searchFlights } from '@molecule/api-flights'

/** One bookable flight, whichever source it came from. */
export interface FlightOption {
  id: string
  source: 'inventory' | 'provider'
  airline: string
  airlineCode: string
  flightNumber: string
  origin: string
  destination: string
  departAt: string
  arriveAt: string
  durationMinutes: number
  stops: number
  cabin: string
  priceCents: number
  currency: string
  status: 'scheduled' | 'delayed' | 'cancelled'
  delayMinutes: number
}

export interface FlightQuery {
  origin: string
  destination: string
  departureDate: string
  adults?: number
  cabin?: string
  /** Only flights departing at or after this instant (used when rebooking). */
  notBefore?: Date
}

/** A row of the seeded `flights` table. */
export interface FlightRow {
  id: string
  airline: string
  airline_code: string
  flight_number: string
  origin_iata: string
  destination_iata: string
  depart_date: string
  depart_at: string
  arrive_at: string
  duration_minutes: number
  stops: number
  cabin: string
  price_cents: number
  currency: string
  seats_left: number
  status: string
  delay_minutes: number
}

const CABINS = new Set(['economy', 'premium-economy', 'business', 'first'])

/** `PT2H30M` → 150. Unknown or missing durations count as 0. */
export function isoDurationToMinutes(value: string | null | undefined): number {
  if (!value) return 0
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(value)
  if (!match) return 0
  const [, d, h, m] = match
  return Number(d ?? 0) * 24 * 60 + Number(h ?? 0) * 60 + Number(m ?? 0)
}

/** Normalise a cabin string from a user or the UI to what the inventory stores. */
export function normalizeCabin(cabin?: string | null): string {
  const c = (cabin ?? 'economy').toLowerCase().replace(/[_\s]+/g, '-')
  return CABINS.has(c) ? c : 'economy'
}

/** Map a seeded inventory row to the shared shape. */
export function rowToOption(row: FlightRow): FlightOption {
  const status =
    row.status === 'delayed' || row.status === 'cancelled' ? row.status : ('scheduled' as const)
  return {
    id: String(row.id),
    source: 'inventory',
    airline: row.airline,
    airlineCode: row.airline_code,
    flightNumber: row.flight_number,
    origin: row.origin_iata,
    destination: row.destination_iata,
    departAt: new Date(row.depart_at).toISOString(),
    arriveAt: new Date(row.arrive_at).toISOString(),
    durationMinutes: Number(row.duration_minutes),
    stops: Number(row.stops),
    cabin: row.cabin,
    priceCents: Number(row.price_cents),
    currency: row.currency,
    status,
    delayMinutes: Number(row.delay_minutes ?? 0),
  }
}

/** Map a provider offer to the shared shape. */
export function offerToOption(offer: FlightOffer, cabin: string): FlightOption {
  const first = offer.segments[0]
  const last = offer.segments[offer.segments.length - 1]
  const carrier = first?.carrier ?? ''
  return {
    id: offer.id,
    source: 'provider',
    airline: carrier,
    airlineCode: carrier,
    flightNumber: `${carrier} ${first?.flightNumber ?? ''}`.trim(),
    origin: first?.departure.airport ?? '',
    destination: last?.arrival.airport ?? '',
    departAt: first?.departure.at ?? '',
    arriveAt: last?.arrival.at ?? '',
    durationMinutes: isoDurationToMinutes(offer.duration),
    stops: Math.max(0, offer.segments.length - 1),
    cabin,
    priceCents: Math.round(offer.price * 100),
    currency: offer.currency,
    status: 'scheduled',
    delayMinutes: 0,
  }
}

/**
 * Search flights for a route and date, cheapest first.
 *
 * @param query - Route, date, passengers and cabin.
 * @returns Up to 10 options; empty when nothing flies that day.
 */
export async function findFlights(query: FlightQuery): Promise<FlightOption[]> {
  const origin = query.origin.toUpperCase()
  const destination = query.destination.toUpperCase()
  const cabin = normalizeCabin(query.cabin)
  let options: FlightOption[]
  if (hasProvider()) {
    const offers = await searchFlights({
      origin,
      destination,
      departureDate: query.departureDate,
      adults: query.adults ?? 1,
      cabin: cabin as 'economy' | 'premium-economy' | 'business' | 'first',
      maxResults: 10,
    })
    options = offers.map((offer) => offerToOption(offer, cabin))
  } else {
    const rows = await findMany<FlightRow>('flights', {
      where: [
        { field: 'origin_iata', operator: '=', value: origin },
        { field: 'destination_iata', operator: '=', value: destination },
        { field: 'depart_date', operator: '=', value: query.departureDate },
        { field: 'cabin', operator: '=', value: cabin },
        { field: 'status', operator: '!=', value: 'cancelled' },
      ],
      orderBy: [{ field: 'price_cents', direction: 'asc' }],
      limit: 10,
    })
    options = rows.map(rowToOption)
  }
  if (query.notBefore) {
    const floor = query.notBefore.getTime()
    options = options.filter((o) => new Date(o.departAt).getTime() >= floor)
  }
  return options.sort((a, b) => a.priceCents - b.priceCents)
}

/**
 * Fetch one flight by id, from whichever source issued the id.
 *
 * @param id - An inventory row id or a provider offer id.
 * @returns The option, or null when the id is unknown or expired.
 */
export async function getFlight(id: string, cabin = 'economy'): Promise<FlightOption | null> {
  const row = await findById<FlightRow>('flights', id)
  if (row) return rowToOption(row)
  if (!hasProvider()) return null
  try {
    const offer = await getOffer(id)
    return offerToOption(offer, normalizeCabin(cabin))
  } catch (_error) {
    // An expired provider offer id: the caller re-searches instead of replaying it.
    return null
  }
}
