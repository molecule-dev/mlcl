import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Security regression test (2026-10-04 audit): POST /flights/:id/delay
// mutates SHARED inventory — a flight row every traveler sees, and delaying
// it forces every booking on that flight through the automatic rebooking
// flow. A valid session alone must NOT be enough: the route is gated behind
// requireAdmin (role = 'admin', or an ADMIN_EMAILS-designated owner lazily
// promoted). Non-admin → 403 without touching inventory; admin → works.

// ADMIN_EMAILS is read at module load — set it BEFORE importing the router.
process.env.ADMIN_EMAILS = 'owner@wayfarer.example'

const db = {
  findById: vi.fn(),
  updateById: vi.fn(async () => ({})),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const delayWatch = {
  simulateDelay: vi.fn(async () => ({ id: 'F1', delay_minutes: 90 })),
  checkDelays: vi.fn(async () => ({ rebooked: 0, notices: [] })),
}
vi.mock('../lib/delay-watch.js', () => ({
  simulateDelay: (...a: unknown[]) => delayWatch.simulateDelay(...(a as [])),
  checkDelays: (...a: unknown[]) => delayWatch.checkDelays(...(a as [])),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const flights = (await import('../handlers/flights.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/flights', flights)

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
  // Default: a plain user row (role 'user', not allow-listed).
  db.findById.mockImplementation(async (_table: string, id: string) => ({
    id,
    email: 'traveler@example.com',
    role: 'user',
  }))
})

const post = (user?: string) =>
  fetch(`${baseUrl}/flights/F1/delay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': user } : {}),
    },
    body: JSON.stringify({ minutes: 90 }),
  })

describe('POST /flights/:id/delay requires an inventory operator', () => {
  it('403s a signed-in non-admin and never touches shared inventory', async () => {
    const res = await post('traveler-1')
    expect(res.status).toBe(403)
    expect(delayWatch.simulateDelay).not.toHaveBeenCalled()
    expect(delayWatch.checkDelays).not.toHaveBeenCalled()
  })

  it('401s an anonymous caller', async () => {
    const res = await post()
    expect(res.status).toBe(401)
    expect(delayWatch.simulateDelay).not.toHaveBeenCalled()
  })

  it('lets a role=admin user delay the flight and runs their delay watcher', async () => {
    db.findById.mockImplementation(async (_table: string, id: string) => ({
      id,
      email: 'ops@wayfarer.example',
      role: 'admin',
    }))
    const res = await post('ops-1')
    expect(res.status).toBe(200)
    expect(delayWatch.simulateDelay).toHaveBeenCalledWith('F1', 90)
    expect(delayWatch.checkDelays).toHaveBeenCalledWith('ops-1')
    const body = (await res.json()) as Record<string, unknown>
    expect((body.flight as Record<string, unknown>).delay_minutes).toBe(90)
  })

  it('lazily promotes an ADMIN_EMAILS-designated owner (durable role write) and lets them through', async () => {
    db.findById.mockImplementation(async (_table: string, id: string) => ({
      id,
      email: 'owner@wayfarer.example', // on the ADMIN_EMAILS allow-list, role still 'user'
      role: 'user',
    }))
    const res = await post('owner-1')
    expect(res.status).toBe(200)
    expect(delayWatch.simulateDelay).toHaveBeenCalledWith('F1', 90)
    expect(db.updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
  })
})
