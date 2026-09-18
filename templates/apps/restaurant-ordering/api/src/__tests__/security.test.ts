import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Shared, controllable DataStore mock (configured per-test).
const db = vi.hoisted(() => ({
  findById: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(),
}))

vi.mock('@molecule/api-database', () => db)

// getUserId reads the session off res.locals (the real bond behavior); the
// test harness sets res.locals.session below to simulate auth.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals?: { session?: { userId?: string } } }) =>
    res.locals?.session?.userId ?? null,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Session injected per request by the harness middleware.
let currentSession: { userId: string } | undefined

let server: Server
let baseUrl: string

beforeAll(async () => {
  const guest = (await import('../handlers/guest.js')).default
  const tables = (await import('../handlers/tables.js')).default
  const orders = (await import('../handlers/orders.js')).default
  const kitchen = (await import('../handlers/kitchen.js')).default

  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    if (currentSession) res.locals.session = currentSession
    next()
  })
  app.use('/guest', guest)
  app.use('/tables', tables)
  app.use('/orders', orders)
  app.use('/kitchen', kitchen)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  currentSession = undefined
  db.findById.mockReset().mockResolvedValue(null)
  db.findOne.mockReset().mockResolvedValue(null)
  db.findMany.mockReset().mockResolvedValue([])
  db.create.mockReset().mockResolvedValue({ data: { id: 'order-1' }, affected: 1 })
  db.updateById.mockReset().mockResolvedValue({ data: {}, affected: 1 })
  db.deleteById.mockReset().mockResolvedValue({ data: null, affected: 0 })
  db.count.mockReset().mockResolvedValue(0)
})

describe('tables.ts — auth + tenant scoping', () => {
  it('GET /tables without a session returns 401 (no tenant leak)', async () => {
    const res = await fetch(`${baseUrl}/tables`)
    expect(res.status).toBe(401)
    // The unscoped query must never run when unauthenticated.
    expect(db.findMany).not.toHaveBeenCalled()
  })

  it('GET /tables always scopes the query to the authenticated owner', async () => {
    currentSession = { userId: 'owner-1' }
    db.findMany.mockResolvedValue([{ id: 't1', user_id: 'owner-1' }])

    const res = await fetch(`${baseUrl}/tables`)
    expect(res.status).toBe(200)

    const [, options] = db.findMany.mock.calls[0] as [string, { where: unknown[] }]
    expect(options.where).toContainEqual({
      field: 'user_id',
      operator: '=',
      value: 'owner-1',
    })
  })

  it("GET /tables/:id returns 403 for another tenant's table", async () => {
    currentSession = { userId: 'owner-1' }
    db.findById.mockResolvedValue({ id: 'tX', user_id: 'owner-2' })

    const res = await fetch(`${baseUrl}/tables/tX`)
    expect(res.status).toBe(403)
  })

  it('GET /tables/:id without a session returns 401', async () => {
    const res = await fetch(`${baseUrl}/tables/tX`)
    expect(res.status).toBe(401)
    expect(db.findById).not.toHaveBeenCalled()
  })
})

describe('orders.ts — auth + tenant scoping (TPL-002)', () => {
  it('GET /orders without a session returns 401 (no cross-tenant leak)', async () => {
    const res = await fetch(`${baseUrl}/orders`)
    expect(res.status).toBe(401)
    // The unscoped query must never run when unauthenticated.
    expect(db.findMany).not.toHaveBeenCalled()
    expect(db.count).not.toHaveBeenCalled()
  })

  it('GET /orders always scopes the list AND count to the authenticated owner', async () => {
    currentSession = { userId: 'owner-1' }
    db.findMany.mockResolvedValue([{ id: 'o1', user_id: 'owner-1' }])
    db.count.mockResolvedValue(1)

    const res = await fetch(`${baseUrl}/orders`)
    expect(res.status).toBe(200)

    const ownerFilter = { field: 'user_id', operator: '=', value: 'owner-1' }
    const [, options] = db.findMany.mock.calls[0] as [string, { where: unknown[] }]
    expect(options.where).toContainEqual(ownerFilter)
    const [, countWhere] = db.count.mock.calls[0] as [string, unknown[]]
    expect(countWhere).toContainEqual(ownerFilter)
  })

  it('GET /orders/:id without a session returns 401', async () => {
    const res = await fetch(`${baseUrl}/orders/oX`)
    expect(res.status).toBe(401)
    expect(db.findById).not.toHaveBeenCalled()
  })

  it("GET /orders/:id returns 404 (not 403) for another tenant's order", async () => {
    currentSession = { userId: 'owner-1' }
    db.findById.mockResolvedValue({ id: 'oX', user_id: 'owner-2' })

    const res = await fetch(`${baseUrl}/orders/oX`)
    // 404 so the id's existence isn't probeable.
    expect(res.status).toBe(404)
  })

  it("GET /orders/:id returns the owner's own order (legit flow preserved)", async () => {
    currentSession = { userId: 'owner-1' }
    db.findById.mockResolvedValue({ id: 'o1', user_id: 'owner-1' })
    db.findMany.mockResolvedValue([])

    const res = await fetch(`${baseUrl}/orders/o1`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string }
    expect(body.id).toBe('o1')
  })
})

describe('kitchen.ts — auth + tenant scoping (TPL-003)', () => {
  it('GET /kitchen without a session returns 401 (no cross-tenant leak)', async () => {
    const res = await fetch(`${baseUrl}/kitchen`)
    expect(res.status).toBe(401)
    expect(db.findMany).not.toHaveBeenCalled()
  })

  it('GET /kitchen always scopes the query to the authenticated owner', async () => {
    currentSession = { userId: 'owner-1' }
    db.findMany.mockResolvedValue([])

    const res = await fetch(`${baseUrl}/kitchen`)
    expect(res.status).toBe(200)

    const [, options] = db.findMany.mock.calls[0] as [string, { where: unknown[] }]
    expect(options.where).toContainEqual({ field: 'user_id', operator: '=', value: 'owner-1' })
  })

  it('GET /kitchen/:id without a session returns 401', async () => {
    const res = await fetch(`${baseUrl}/kitchen/oX`)
    expect(res.status).toBe(401)
    expect(db.findById).not.toHaveBeenCalled()
  })

  it("GET /kitchen/:id returns 404 (not 403) for another tenant's order", async () => {
    currentSession = { userId: 'owner-1' }
    db.findById.mockResolvedValue({ id: 'oX', user_id: 'owner-2' })

    const res = await fetch(`${baseUrl}/kitchen/oX`)
    expect(res.status).toBe(404)
  })
})

describe('guest.ts — POST /orders table_id tenant scoping', () => {
  const order = (tableId: string): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      owner_id: 'owner-1',
      table_id: tableId,
      items: [{ menu_item_id: 'm1', quantity: 1 }],
    }),
  })

  it("ignores a foreign table_id (does not seat another tenant's table)", async () => {
    // Menu item belongs to owner-1.
    db.findById.mockResolvedValue({ id: 'm1', user_id: 'owner-1', name: 'Burger', price: 10 })
    // The foreign table_id is NOT owned by owner-1 → scoped lookup returns null.
    db.findOne.mockResolvedValue(null)

    const res = await fetch(`${baseUrl}/guest/orders`, order('foreign-table'))
    expect(res.status).toBe(201)

    // The order is filed with table_id null — the foreign id was discarded.
    const ordersCreate = db.create.mock.calls.find((c) => c[0] === 'orders') as
      [string, Record<string, unknown>] | undefined
    expect(ordersCreate).toBeDefined()
    expect(ordersCreate?.[1].table_id).toBeNull()

    // And the foreign table's status was never flipped to 'occupied'.
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('seats a table_id that belongs to the operator (legit flow preserved)', async () => {
    db.findById.mockResolvedValue({ id: 'm1', user_id: 'owner-1', name: 'Burger', price: 10 })
    db.findOne.mockResolvedValue({ id: 'own-table', user_id: 'owner-1', table_number: 5 })

    const res = await fetch(`${baseUrl}/guest/orders`, order('own-table'))
    expect(res.status).toBe(201)

    const ordersCreate = db.create.mock.calls.find((c) => c[0] === 'orders') as
      [string, Record<string, unknown>] | undefined
    expect(ordersCreate?.[1].table_id).toBe('own-table')
    expect(db.updateById).toHaveBeenCalledWith('tables', 'own-table', { status: 'occupied' })
  })
})
