import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Security regression test: the booking price must be computed SERVER-SIDE
// from the sitter's hourly rate × booked duration — never from a
// client-supplied `price_cents`. Trusting the client's price lets a caller
// book a $50/hr sitter for $1/hr (the audit's M6 class: client-trusted
// pricing). The create schema no longer accepts `price_cents`, and the
// handler ignores the key even if a client (or a passthrough validator)
// sends it.

// ---- Mock the molecule data layer the handler touches ---------------------
// findById serves the sitter lookup (and the per-pet ownership checks);
// create serves the booking insert (first call) + the notification (second).
const findById = vi.fn(async (table: string, _id: string) => {
  if (table === 'sitters') return { id: 'sitter-1', is_active: true, hourly_rate_cents: 5000 }
  if (table === 'pets') return { id: 'pet-1', owner_user_id: 'owner-1' }
  return null
})
const create = vi.fn(async (_table: string, _row?: unknown) => ({ data: { id: 'row-1' } }))

vi.mock('@molecule/api-database', () => ({
  count: vi.fn(async () => 0),
  create: (...a: unknown[]) => create(a[0] as string, a[1]),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  findMany: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  updateById: vi.fn(async () => ({ data: {} })),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

// The free-tier cap is orthogonal here — pass through untouched.
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

// Validation is orthogonal to the fix — pass bodies through untouched so the
// client-sent `price_cents` actually reaches the handler. This proves the
// handler itself ignores it (defense in depth), not just the zod schema
// (whose default object parse strips unknown keys in production).
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const bookings = (await import('../handlers/bookings.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/bookings', bookings)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
})

// Sitter rate is $50/hr (5000 cents). A 90-minute booking must cost exactly
// 5000 × 90 / 60 = 7500 cents — regardless of what the client claims.
const ninetyMinuteBody = (extra: Record<string, unknown> = {}) => ({
  sitter_id: 'sitter-1',
  pet_ids: ['pet-1'],
  service: 'dog walking',
  starts_at: '2026-10-04T10:00:00.000Z',
  ends_at: '2026-10-04T11:30:00.000Z',
  ...extra,
})

const postedBookingRow = () => {
  const calls = create.mock.calls.filter(([table]) => table === 'bookings')
  expect(calls.length).toBeGreaterThan(0)
  return calls[0][1] as Record<string, unknown>
}

describe('booking price is computed server-side (never client-trusted)', () => {
  it('ignores a lowballed client price_cents and stores rate × duration', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify(ninetyMinuteBody({ price_cents: 100 })), // malicious $1/hr claim
    })
    expect(res.status).toBe(201)
    expect(postedBookingRow().price_cents).toBe(7500)
  })

  it('ignores an inflated client price_cents the same way', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify(ninetyMinuteBody({ price_cents: 999999 })),
    })
    expect(res.status).toBe(201)
    expect(postedBookingRow().price_cents).toBe(7500)
  })

  it('computes the identical price when the client sends no price at all', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify(ninetyMinuteBody()),
    })
    expect(res.status).toBe(201)
    expect(postedBookingRow().price_cents).toBe(7500)
  })

  it('rounds a fractional duration price (45 min at 5000/hr → 3750)', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify(
        ninetyMinuteBody({
          starts_at: '2026-10-04T10:00:00.000Z',
          ends_at: '2026-10-04T10:45:00.000Z',
        }),
      ),
    })
    expect(res.status).toBe(201)
    expect(postedBookingRow().price_cents).toBe(3750)
  })

  it('prices a zero/negative duration window at 0 rather than trusting the client', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify(
        ninetyMinuteBody({
          starts_at: '2026-10-04T10:00:00.000Z',
          ends_at: '2026-10-04T10:00:00.000Z',
          price_cents: 12345,
        }),
      ),
    })
    expect(res.status).toBe(201)
    expect(postedBookingRow().price_cents).toBe(0)
  })

  it('prices from the sitter row, not the caller — a second sitter rate yields its own price', async () => {
    findById.mockImplementation(async (table: string) => {
      if (table === 'sitters') return { id: 'sitter-1', is_active: true, hourly_rate_cents: 9000 }
      if (table === 'pets') return { id: 'pet-1', owner_user_id: 'owner-1' }
      return null
    })
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify(ninetyMinuteBody({ price_cents: 100 })),
    })
    expect(res.status).toBe(201)
    expect(postedBookingRow().price_cents).toBe(13500) // 9000 × 90 / 60
  })
})
