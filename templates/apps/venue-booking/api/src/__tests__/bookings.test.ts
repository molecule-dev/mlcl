/**
 * Bookings handler — broken-access-control regression tests.
 *
 * Boots just the bookings express router with a mocked DataStore / i18n /
 * entitlements / validation so the real branch logic runs without Postgres.
 * Focus: GET / must (a) reject anonymous callers with 401 and (b) only ever
 * return rows the caller owns — a guest sees their own bookings, and a
 * `venue_id` filter is honored only after verifying the caller owns that venue
 * (host viewing their venue's bookings), otherwise it falls back to
 * own-bookings scoping. This guards against the prior bug where the list had
 * no auth gate and only conditionally scoped by userId, allowing anonymous /
 * cross-tenant reads of all bookings.
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
  count: vi.fn() as ReturnType<typeof vi.fn>,
}))

vi.mock('@molecule/api-database', () => dbMock)
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
// enforceLimit + validation middleware are exercised elsewhere; here they are
// pass-through so the handler's own authz/scoping logic is what's under test.
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit:
    () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction): void =>
      next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody:
    () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction): void =>
      next(),
  validateQuery:
    () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction): void =>
      next(),
}))

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

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.findMany.mockImplementation(async () => [])
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

describe('bookings GET / list', () => {
  it('returns 401 when there is no session (no anonymous read)', async () => {
    const router = (await import('../handlers/bookings.js')).default
    const url = await listen(router, null)
    const res = await fetch(`${url}/`)
    expect(res.status).toBe(401)
    expect(dbMock.findMany).not.toHaveBeenCalled()
  })

  it('scopes the list to the calling user by default', async () => {
    const router = (await import('../handlers/bookings.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`)
    expect(res.status).toBe(200)
    expect(dbMock.findMany).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({
        where: [{ field: 'userId', operator: '=', value: 'u1' }],
      }),
    )
  })

  it('ignores a venue_id filter for a venue the caller does NOT own (falls back to own-bookings scoping)', async () => {
    // Caller u1 asks for venue v1's bookings, but v1 is owned by someone else.
    dbMock.findById.mockImplementation(async () => ({
      id: 'v1',
      owner_id: 'u-other',
      host_user_id: 'u-other',
    }))
    const router = (await import('../handlers/bookings.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/?venue_id=v1`)
    expect(res.status).toBe(200)
    // Must NOT scope by resourceId (which would expose another host's
    // bookings) — must fall back to the caller's own userId.
    expect(dbMock.findMany).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({
        where: [{ field: 'userId', operator: '=', value: 'u1' }],
      }),
    )
  })

  it('honors a venue_id filter only when the caller owns that venue (host view)', async () => {
    dbMock.findById.mockImplementation(async () => ({
      id: 'v1',
      owner_id: 'u1',
      host_user_id: 'u1',
    }))
    const router = (await import('../handlers/bookings.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/?venue_id=v1`)
    expect(res.status).toBe(200)
    expect(dbMock.findMany).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({
        where: [
          { field: 'resourceType', operator: '=', value: 'venue' },
          { field: 'resourceId', operator: '=', value: 'v1' },
        ],
      }),
    )
  })
})

describe('bookings transition validity (confirm/cancel state machine)', () => {
  const asOwner = (booking: Record<string, unknown>, venueOwner = 'owner') => {
    dbMock.findById.mockImplementation(async (table: string) =>
      table === 'bookings' ? booking : { id: 'v1', owner_id: venueOwner },
    )
    dbMock.updateById.mockImplementation(
      async (_t: string, _id: string, data: Record<string, unknown>) => ({
        data: { id: 'b1', ...data },
      }),
    )
  }
  const put = async (action: 'confirm' | 'cancel', userId: string) => {
    const router = (await import('../handlers/bookings.js')).default
    const url = await listen(router, userId)
    return fetch(`${url}/b1/${action}`, { method: 'PUT' })
  }

  it('confirm rejects a cancelled booking (409) — no resurrection', async () => {
    asOwner({ id: 'b1', status: 'cancelled', resourceId: 'v1', userId: 'guest' })
    const res = await put('confirm', 'owner')
    expect(res.status).toBe(409)
    expect(dbMock.updateById).not.toHaveBeenCalled()
  })

  it('confirm transitions a pending booking to confirmed (200)', async () => {
    asOwner({ id: 'b1', status: 'pending', resourceId: 'v1', userId: 'guest' })
    const res = await put('confirm', 'owner')
    expect(res.status).toBe(200)
    expect(dbMock.updateById).toHaveBeenCalledWith(
      'bookings',
      'b1',
      expect.objectContaining({ status: 'confirmed' }),
    )
  })

  it('confirm is idempotent for an already-confirmed booking (200, no write)', async () => {
    asOwner({ id: 'b1', status: 'confirmed', resourceId: 'v1', userId: 'guest' })
    const res = await put('confirm', 'owner')
    expect(res.status).toBe(200)
    expect(dbMock.updateById).not.toHaveBeenCalled()
  })

  it('cancel rejects a completed booking (409) — terminal', async () => {
    asOwner({ id: 'b1', status: 'completed', resourceId: 'v1', userId: 'guest' })
    const res = await put('cancel', 'owner')
    expect(res.status).toBe(409)
    expect(dbMock.updateById).not.toHaveBeenCalled()
  })
})

describe('venue double-booking guard (create)', () => {
  const createBooking = async (userId: string) => {
    const router = (await import('../handlers/bookings.js')).default
    const url = await listen(router, userId)
    return fetch(`${url}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        venue_id: 'v1',
        start_at: '2026-08-01T10:00:00.000Z',
        end_at: '2026-08-01T12:00:00.000Z',
      }),
    })
  }

  it('409s when the venue is already booked for an overlapping window (no create)', async () => {
    dbMock.findById.mockResolvedValue({ id: 'v1', hourly_rate: 100, host_user_id: 'owner' })
    dbMock.findMany.mockResolvedValue([{ id: 'existing', resourceId: 'v1' }])
    const res = await createBooking('u1')
    expect(res.status).toBe(409)
    expect(dbMock.create).not.toHaveBeenCalled()
  })

  it('creates a pending booking when the venue is free (201)', async () => {
    dbMock.findById.mockResolvedValue({ id: 'v1', hourly_rate: 100, host_user_id: 'owner' })
    dbMock.findMany.mockResolvedValue([])
    dbMock.create.mockResolvedValue({ data: { id: 'b1' } })
    const res = await createBooking('u1')
    expect(res.status).toBe(201)
    expect(dbMock.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ resourceId: 'v1', status: 'pending' }),
    )
  })
})
