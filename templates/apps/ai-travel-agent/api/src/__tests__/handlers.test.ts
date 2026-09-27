/**
 * Per-app handler and library tests: the agent turn (conversations), booking,
 * rebooking, bill splitting, the delay watcher and the inventory seed.
 *
 * Each test boots just the express handler under test with a mocked
 * DataStore, agent, flights and SMS providers, so it asserts real branch logic
 * (validation, IDOR scoping, persistence shape, the rebook decision) without
 * Postgres or a network. No supertest: an ephemeral `http.createServer` on
 * port 0 plus global `fetch`.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  findById: vi.fn() as ReturnType<typeof vi.fn>,
  findMany: vi.fn() as ReturnType<typeof vi.fn>,
  create: vi.fn() as ReturnType<typeof vi.fn>,
  updateById: vi.fn() as ReturnType<typeof vi.fn>,
  deleteById: vi.fn() as ReturnType<typeof vi.fn>,
  count: vi.fn() as ReturnType<typeof vi.fn>,
}))

const agentsMock = vi.hoisted(() => ({
  run: vi.fn() as ReturnType<typeof vi.fn>,
}))

const flightsProviderMock = vi.hoisted(() => ({
  has: false,
  searchFlights: vi.fn() as ReturnType<typeof vi.fn>,
  getOffer: vi.fn() as ReturnType<typeof vi.fn>,
}))

const smsMock = vi.hoisted(() => ({
  send: vi.fn() as ReturnType<typeof vi.fn>,
}))

vi.mock('@molecule/api-database', () => dbMock)
vi.mock('@molecule/api-ai-agents', () => ({
  requireProvider: () => ({ name: 'mock', run: agentsMock.run }),
}))
vi.mock('@molecule/api-flights', () => ({
  hasProvider: () => flightsProviderMock.has,
  searchFlights: flightsProviderMock.searchFlights,
  getOffer: flightsProviderMock.getOffer,
}))
vi.mock('@molecule/api-sms', () => ({
  hasProvider: () => true,
  getProvider: () => ({ send: smsMock.send }),
}))
vi.mock('@molecule/api-cron', () => ({
  schedule: vi.fn(async () => 'job'),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@molecule/api-entitlements', () => ({
  getEffectiveTier: vi.fn(async () => ({
    planKey: 'free',
    category: 'free',
    name: 'Free',
    limits: { maxBookings: 3, maxConversations: 20 },
  })),
  defineTiers: vi.fn(() => ({ tiers: {} })),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import { flightsForDay, seedGlobalFlightsIfEmpty } from '../handlers/_seed.js'
import bookingsRouter from '../handlers/bookings.js'
import conversationsRouter from '../handlers/conversations.js'
import preferencesRouter from '../handlers/preferences.js'
import { payRouter } from '../handlers/splits.js'
import { rebookBooking } from '../lib/booking.js'
import { checkDelays } from '../lib/delay-watch.js'
import { findFlights } from '../lib/flights.js'

// A cold import of the handler graph can take a few seconds on a fresh scaffold.
vi.setConfig({ testTimeout: 30_000 })

interface SessionLocals {
  session?: { userId?: string }
}

let server: http.Server | null = null
async function listen(handler: express.Router, userId: string | null): Promise<string> {
  const app = express()
  app.use(express.json())
  app.use((_req, res: express.Response & { locals: SessionLocals }, next) => {
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use(handler)
  server = http.createServer(app)
  await new Promise<void>((resolve) => server?.listen(0, resolve))
  const addr = server?.address() as AddressInfo
  return `http://127.0.0.1:${String(addr.port)}`
}

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const CONV = '33333333-3333-4333-8333-333333333333'
const BOOKING = '44444444-4444-4444-8444-444444444444'
const TRIP = '55555555-5555-4555-8555-555555555555'

const inventoryRow = (over: Record<string, unknown> = {}) => ({
  id: 'NS101-2030-01-10',
  airline: 'Northstar',
  airline_code: 'NS',
  flight_number: 'NS 101',
  origin_iata: 'JFK',
  destination_iata: 'LHR',
  depart_date: '2030-01-10',
  depart_at: '2030-01-10T07:00:00.000Z',
  arrive_at: '2030-01-10T14:10:00.000Z',
  duration_minutes: 430,
  stops: 0,
  cabin: 'economy',
  price_cents: 48900,
  currency: 'USD',
  seats_left: 5,
  status: 'scheduled',
  delay_minutes: 0,
  ...over,
})

const bookingRow = (over: Record<string, unknown> = {}) => ({
  id: BOOKING,
  user_id: U1,
  trip_id: TRIP,
  conversation_id: null,
  flight_id: 'NS101-2030-01-10',
  source: 'inventory',
  confirmation_code: 'ABCD2345',
  status: 'booked',
  airline: 'Northstar',
  flight_number: 'NS 101',
  origin_iata: 'JFK',
  destination_iata: 'LHR',
  depart_at: '2030-01-10T07:00:00.000Z',
  arrive_at: '2030-01-10T14:10:00.000Z',
  cabin: 'economy',
  passenger_count: 2,
  traveler_names: ['Ana', 'Ben'],
  total_cents: 97800,
  currency: 'USD',
  card_last4: '4242',
  payment_intent_id: null,
  delay_minutes: 0,
  rebooked_from_id: null,
  rebooked_to_id: null,
  booked_at: '2029-12-01T00:00:00.000Z',
  created_at: '2029-12-01T00:00:00.000Z',
  updated_at: '2029-12-01T00:00:00.000Z',
  ...over,
})

beforeEach(() => {
  vi.resetAllMocks()
  flightsProviderMock.has = false
  dbMock.findMany.mockImplementation(async () => [])
  dbMock.count.mockImplementation(async () => 0)
  dbMock.updateById.mockImplementation(async (_t: string, id: string, patch: unknown) => ({
    data: { id, ...(patch as object) },
  }))
  dbMock.deleteById.mockImplementation(async () => ({}))
  let n = 0
  dbMock.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => ({
    data: { id: `${_table}-${String(++n)}`, ...data },
  }))
  smsMock.send.mockResolvedValue({ id: 'sms-1', status: 'sent', to: '+15550001111' })
})

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })
  server = null
})

describe('conversations handler', () => {
  it('rejects unauthenticated callers', async () => {
    const router = conversationsRouter
    const base = await listen(router, null)
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(401)
  })

  it('refuses to read another user’s conversation', async () => {
    dbMock.findById.mockResolvedValue({ id: CONV, user_id: U2, title: 't' })
    const router = conversationsRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/${CONV}`)
    expect(res.status).toBe(404)
  })

  it('runs the agent with the travel tools and stores the tool calls on the reply', async () => {
    dbMock.findById.mockResolvedValue({
      id: CONV,
      user_id: U1,
      title: 'New trip',
      message_count: 0,
    })
    dbMock.findMany.mockImplementation(async (table: string) =>
      table === 'messages'
        ? [{ id: 'm1', role: 'user', content: 'JFK to London on Jan 10', type: 'voice' }]
        : [],
    )
    agentsMock.run.mockResolvedValue({
      output: 'NS 101 leaves at 7am for $489. Book it?',
      steps: [
        {
          text: '',
          toolCalls: [
            { id: 'c1', name: 'search_flights', input: { origin: 'JFK' }, result: { count: 3 } },
          ],
        },
      ],
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    const router = conversationsRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/${CONV}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'JFK to London on Jan 10',
        type: 'voice',
        duration_ms: 2400,
      }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      assistantMessage: { content: string; tool_calls: Array<{ name: string }> }
    }
    expect(body.assistantMessage.content).toMatch(/NS 101/)
    expect(body.assistantMessage.tool_calls.map((c) => c.name)).toEqual(['search_flights'])

    const runInput = agentsMock.run.mock.calls[0]![0] as {
      tools: Array<{ name: string }>
      system: string
      messages: Array<{ role: string }>
    }
    expect(runInput.tools.map((t) => t.name)).toEqual([
      'search_flights',
      'book_flight',
      'check_flight_status',
      'rebook_flight',
      'split_bill',
      'list_bookings',
    ])
    expect(runInput.system).toMatch(/travel agent/i)
    expect(runInput.messages[0]?.role).toBe('user')

    // The voice turn's seconds land on the conversation.
    const update = dbMock.updateById.mock.calls.find((c) => c[0] === 'conversations')
    expect(update?.[2]).toMatchObject({ total_seconds_spoken: 2 })
  })
})

describe('bookings handler', () => {
  it('books a searched inventory flight for the caller and opens a trip', async () => {
    dbMock.findById.mockImplementation(async (table: string) =>
      table === 'flights' ? inventoryRow() : null,
    )
    const router = bookingsRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flight_id: 'NS101-2030-01-10', passengers: 2, card_last4: '4242' }),
    })
    expect(res.status).toBe(201)
    const booking = (await res.json()) as Record<string, unknown>
    expect(booking.user_id).toBe(U1)
    expect(booking.total_cents).toBe(97800)
    expect(String(booking.confirmation_code)).toMatch(/^[A-Z2-9]{8}$/)
    const trip = dbMock.create.mock.calls.find((c) => c[0] === 'trips')
    expect(trip?.[1]).toMatchObject({ user_id: U1, origin_iata: 'JFK', destination_iata: 'LHR' })
    // A booked seat leaves the inventory.
    const seats = dbMock.updateById.mock.calls.find((c) => c[0] === 'flights')
    expect(seats?.[2]).toMatchObject({ seats_left: 3 })
  })

  it('enforces the plan’s booking limit', async () => {
    dbMock.count.mockResolvedValue(3)
    const router = bookingsRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flight_id: 'NS101-2030-01-10' }),
    })
    expect(res.status).toBe(403)
  })

  it('refuses to split another user’s booking', async () => {
    dbMock.findById.mockResolvedValue(bookingRow({ user_id: U2 }))
    const router = bookingsRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/${BOOKING}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ people: [{ name: 'Ana' }] }),
    })
    expect(res.status).toBe(404)
  })

  it('splits the total evenly and texts everyone with a phone number', async () => {
    dbMock.findById.mockResolvedValue(bookingRow())
    const router = bookingsRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/${BOOKING}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        people: [
          { name: 'Ana', contact: '+15550001111' },
          { name: 'Ben', contact: 'ben@example.com' },
          { name: 'Cy' },
        ],
      }),
    })
    expect(res.status).toBe(201)
    const rows = (await res.json()) as Array<{ name: string; amount_cents: number }>
    expect(rows.map((r) => r.amount_cents).reduce((a, b) => a + b, 0)).toBe(97800)
    expect(rows.map((r) => r.amount_cents)).toEqual([32600, 32600, 32600])
    expect(smsMock.send).toHaveBeenCalledTimes(1)
    expect(smsMock.send.mock.calls[0]![0]).toBe('+15550001111')
    expect(String(smsMock.send.mock.calls[0]![1])).toMatch(/\/pay\//)
  })
})

describe('rebooking', () => {
  it('moves a delayed booking to the next flight on the route and links both rows', async () => {
    const later = inventoryRow({
      id: 'VA300-2030-01-10',
      flight_number: 'VA 300',
      airline: 'Veridia Air',
      depart_at: '2030-01-10T13:00:00.000Z',
      arrive_at: '2030-01-10T20:10:00.000Z',
      price_cents: 51000,
    })
    dbMock.findMany.mockImplementation(async (table: string) =>
      table === 'flights' ? [inventoryRow(), later] : [],
    )
    dbMock.findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'flights') return id === later.id ? later : inventoryRow()
      if (table === 'users')
        return { id: U1, oauthData: { travelPreferences: { phone: '+15550009999' } } }
      return null
    })
    const next = await rebookBooking(
      bookingRow({ status: 'delayed', delay_minutes: 90 }) as never,
      'delay',
    )
    expect(next).not.toBeNull()
    expect(next?.flight_id).toBe('VA300-2030-01-10')
    expect(next?.rebooked_from_id).toBe(BOOKING)
    expect(next?.passenger_count).toBe(2)
    const old = dbMock.updateById.mock.calls.find((c) => c[0] === 'bookings' && c[1] === BOOKING)
    expect(old?.[2]).toMatchObject({ status: 'rebooked' })
    expect(smsMock.send).toHaveBeenCalledWith('+15550009999', expect.stringMatching(/VA 300/))
  })

  it('returns null when nothing later flies', async () => {
    dbMock.findMany.mockImplementation(async (table: string) =>
      table === 'flights' ? [inventoryRow()] : [],
    )
    expect(await rebookBooking(bookingRow() as never, 'request')).toBeNull()
  })
})

describe('delay watcher', () => {
  it('rebooks only bookings whose flight is delayed past the threshold', async () => {
    const delayed = inventoryRow({ status: 'delayed', delay_minutes: 120 })
    const later = inventoryRow({
      id: 'VA300-2030-01-10',
      flight_number: 'VA 300',
      depart_at: '2030-01-10T13:00:00.000Z',
      arrive_at: '2030-01-10T20:10:00.000Z',
    })
    dbMock.findMany.mockImplementation(async (table: string) => {
      if (table === 'bookings') return [bookingRow()]
      if (table === 'flights') return [delayed, later]
      return []
    })
    dbMock.findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'flights') return id === later.id ? later : delayed
      return null
    })
    const result = await checkDelays(U1)
    expect(result).toMatchObject({ checked: 1, delayed: 1 })
    expect(result.rebooked).toHaveLength(1)
  })

  it('records a short delay without rebooking', async () => {
    const slightly = inventoryRow({ status: 'delayed', delay_minutes: 25 })
    dbMock.findMany.mockImplementation(async (table: string) =>
      table === 'bookings' ? [bookingRow()] : [],
    )
    dbMock.findById.mockResolvedValue(slightly)
    const result = await checkDelays(U1)
    expect(result).toMatchObject({ checked: 1, delayed: 1, rebooked: [] })
    const patch = dbMock.updateById.mock.calls.find((c) => c[0] === 'bookings')
    expect(patch?.[2]).toMatchObject({ status: 'delayed', delay_minutes: 25 })
  })
})

describe('flight lookup', () => {
  it('maps provider offers when a flights provider is bonded', async () => {
    flightsProviderMock.has = true
    flightsProviderMock.searchFlights.mockResolvedValue([
      {
        id: 'offer-1',
        price: 512.5,
        currency: 'EUR',
        duration: 'PT7H10M',
        segments: [
          {
            departure: { airport: 'JFK', at: '2030-01-10T07:00:00-05:00' },
            arrival: { airport: 'LHR', at: '2030-01-10T19:10:00+00:00' },
            carrier: 'BA',
            flightNumber: '112',
          },
        ],
      },
    ])
    const options = await findFlights({
      origin: 'jfk',
      destination: 'lhr',
      departureDate: '2030-01-10',
    })
    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      id: 'offer-1',
      source: 'provider',
      flightNumber: 'BA 112',
      priceCents: 51250,
      currency: 'EUR',
      durationMinutes: 430,
      stops: 0,
    })
    expect(dbMock.findMany).not.toHaveBeenCalled()
  })

  it('reads the seeded inventory when no provider is bonded', async () => {
    dbMock.findMany.mockResolvedValue([inventoryRow()])
    const options = await findFlights({
      origin: 'JFK',
      destination: 'LHR',
      departureDate: '2030-01-10',
    })
    expect(options[0]).toMatchObject({
      source: 'inventory',
      flightNumber: 'NS 101',
      priceCents: 48900,
    })
  })
})

describe('inventory seed', () => {
  it('writes nothing when flights already exist', async () => {
    dbMock.count.mockResolvedValue(12)
    expect(await seedGlobalFlightsIfEmpty()).toBe(0)
    expect(dbMock.create).not.toHaveBeenCalled()
  })

  it('seeds three flights per route per day, deterministically', async () => {
    const route = {
      origin: 'JFK',
      originCity: 'New York',
      destination: 'LHR',
      destinationCity: 'London',
      minutes: 430,
      baseCents: 48900,
    }
    const day = new Date('2030-01-10T00:00:00Z')
    const a = flightsForDay(route, day)
    const b = flightsForDay(route, day)
    expect(a).toHaveLength(3)
    expect(a).toEqual(b)
    expect(a[0]).toMatchObject({
      origin_iata: 'JFK',
      destination_iata: 'LHR',
      depart_date: '2030-01-10',
    })
  })
})

describe('preferences handler', () => {
  it('returns defaults when nothing stored yet', async () => {
    dbMock.findById.mockResolvedValue({ id: U1, oauthData: null })
    const router = preferencesRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      voice: 'alloy',
      phone: '',
      voicePlaybackEnabled: true,
    })
  })

  it('persists the phone the agent texts into users.oauthData.travelPreferences', async () => {
    dbMock.findById.mockResolvedValue({ id: U1, oauthData: { profile: { bio: 'x' } } })
    const router = preferencesRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+15550001111', homeAirport: 'jfk' }),
    })
    expect(res.status).toBe(200)
    const call = dbMock.updateById.mock.calls[0]!
    expect(call[2]).toMatchObject({
      oauthData: {
        profile: { bio: 'x' },
        travelPreferences: { phone: '+15550001111', homeAirport: 'JFK' },
      },
    })
  })

  it('rejects unknown keys (strict schema)', async () => {
    dbMock.findById.mockResolvedValue({ id: U1, oauthData: null })
    const router = preferencesRouter
    const base = await listen(router, U1)
    const res = await fetch(`${base}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nope: true }),
    })
    expect(res.status).toBe(400)
  })
})

describe('pay link', () => {
  it('settles a share once and tells the owner', async () => {
    const split = {
      id: 's1',
      booking_id: BOOKING,
      user_id: U1,
      name: 'Ana',
      amount_cents: 32600,
      currency: 'USD',
      status: 'pending',
      pay_token: 'tok_abcdefghij',
      paid_at: null,
    }
    dbMock.findMany.mockImplementation(async (table: string) =>
      table === 'bill_splits' ? [split] : [],
    )
    dbMock.findById.mockResolvedValue(bookingRow())
    const base = await listen(payRouter, null)
    const shown = await fetch(`${base}/tok_abcdefghij`)
    expect(shown.status).toBe(200)
    expect(await shown.json()).toMatchObject({
      name: 'Ana',
      amount_cents: 32600,
      status: 'pending',
    })
    const paid = await fetch(`${base}/tok_abcdefghij/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_last4: '4242' }),
    })
    expect(paid.status).toBe(200)
    expect(await paid.json()).toMatchObject({ status: 'paid' })
    const patch = dbMock.updateById.mock.calls.find((c) => c[0] === 'bill_splits')
    expect(patch?.[2]).toMatchObject({ status: 'paid', card_last4: '4242' })
    const note = dbMock.create.mock.calls.find((c) => c[0] === 'notifications')
    expect(note?.[1]).toMatchObject({ user_id: U1, kind: 'paid' })
  })
})
