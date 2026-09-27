/**
 * Seeds the flight inventory the agent searches when no flights provider is
 * bonded. Idempotent: it runs only while the `flights` table is empty, so a
 * restart never duplicates rows. Called at the end of `setupBonds()`.
 *
 * The routes and carriers are demo data; replace them, or bond
 * `@molecule/api-flights-amadeus`, and this seed is never consulted.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface Route {
  origin: string
  originCity: string
  destination: string
  destinationCity: string
  minutes: number
  baseCents: number
}

const ROUTES: Route[] = [
  {
    origin: 'JFK',
    originCity: 'New York',
    destination: 'LHR',
    destinationCity: 'London',
    minutes: 430,
    baseCents: 48900,
  },
  {
    origin: 'LHR',
    originCity: 'London',
    destination: 'JFK',
    destinationCity: 'New York',
    minutes: 490,
    baseCents: 51900,
  },
  {
    origin: 'JFK',
    originCity: 'New York',
    destination: 'CDG',
    destinationCity: 'Paris',
    minutes: 445,
    baseCents: 45900,
  },
  {
    origin: 'CDG',
    originCity: 'Paris',
    destination: 'JFK',
    destinationCity: 'New York',
    minutes: 500,
    baseCents: 47900,
  },
  {
    origin: 'SFO',
    originCity: 'San Francisco',
    destination: 'JFK',
    destinationCity: 'New York',
    minutes: 325,
    baseCents: 27900,
  },
  {
    origin: 'JFK',
    originCity: 'New York',
    destination: 'SFO',
    destinationCity: 'San Francisco',
    minutes: 385,
    baseCents: 28900,
  },
  {
    origin: 'LAX',
    originCity: 'Los Angeles',
    destination: 'NRT',
    destinationCity: 'Tokyo',
    minutes: 700,
    baseCents: 79900,
  },
  {
    origin: 'NRT',
    originCity: 'Tokyo',
    destination: 'LAX',
    destinationCity: 'Los Angeles',
    minutes: 590,
    baseCents: 76900,
  },
  {
    origin: 'LAX',
    originCity: 'Los Angeles',
    destination: 'SFO',
    destinationCity: 'San Francisco',
    minutes: 85,
    baseCents: 9900,
  },
  {
    origin: 'SFO',
    originCity: 'San Francisco',
    destination: 'LAX',
    destinationCity: 'Los Angeles',
    minutes: 90,
    baseCents: 9900,
  },
  {
    origin: 'ORD',
    originCity: 'Chicago',
    destination: 'MIA',
    destinationCity: 'Miami',
    minutes: 190,
    baseCents: 15900,
  },
  {
    origin: 'MIA',
    originCity: 'Miami',
    destination: 'ORD',
    destinationCity: 'Chicago',
    minutes: 200,
    baseCents: 15900,
  },
]

const CARRIERS: Array<{ code: string; name: string }> = [
  { code: 'NS', name: 'Northstar' },
  { code: 'VA', name: 'Veridia Air' },
  { code: 'AS', name: 'Aeroflot Skyline' },
  { code: 'BL', name: 'Bluelane' },
]

/** Departure hours for the three daily flights on every route. */
const DEPARTURES = [7, 13, 19]

/** How many days of inventory to seed, starting today. */
export const SEED_DAYS = 45

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Deterministic pseudo-random in [0, 1) from a string, so reseeds match. */
function hash01(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

/** Build the rows for one day of one route. */
export function flightsForDay(route: Route, day: Date): Array<Record<string, unknown>> {
  const date = day.toISOString().slice(0, 10)
  return DEPARTURES.map((hour, i) => {
    const carrier =
      CARRIERS[(hash01(`${route.origin}${route.destination}${i}`) * CARRIERS.length) | 0]!
    const number = 100 + ((hash01(`${route.origin}${route.destination}${hour}`) * 800) | 0)
    const depart = new Date(
      `${date}T${pad(hour)}:${pad(((hash01(date + String(hour)) * 4) | 0) * 15)}:00Z`,
    )
    const arrive = new Date(depart.getTime() + route.minutes * 60_000)
    const swing = 0.85 + hash01(date + route.origin + String(i)) * 0.4
    const stops = hash01(`${date}${route.destination}${i}`) < 0.2 ? 1 : 0
    return {
      id: `${carrier.code}${number}-${date}`,
      airline: carrier.name,
      airline_code: carrier.code,
      flight_number: `${carrier.code} ${number}`,
      origin_iata: route.origin,
      origin_city: route.originCity,
      destination_iata: route.destination,
      destination_city: route.destinationCity,
      depart_date: date,
      depart_at: depart,
      arrive_at: new Date(arrive.getTime() + stops * 75 * 60_000),
      duration_minutes: route.minutes + stops * 75,
      stops,
      stop_airports: JSON.stringify(stops ? ['DEN'] : []),
      cabin: 'economy',
      price_cents: Math.round((route.baseCents * swing) / 100) * 100,
      currency: 'USD',
      seats_left: 4 + ((hash01(`${date}${number}`) * 6) | 0),
      status: 'scheduled',
      delay_minutes: 0,
    }
  })
}

/**
 * Seed the inventory once.
 *
 * @returns How many rows were written (0 when the table already had data).
 */
export async function seedGlobalFlightsIfEmpty(): Promise<number> {
  const existing = await count('flights')
  if (existing > 0) return 0
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  let written = 0
  for (let d = 0; d < SEED_DAYS; d++) {
    const day = new Date(today.getTime() + d * 24 * 60 * 60_000)
    for (const route of ROUTES) {
      for (const row of flightsForDay(route, day)) {
        await create('flights', row)
        written += 1
      }
    }
  }
  logger.info('seeded flight inventory', { rows: written, days: SEED_DAYS })
  return written
}
