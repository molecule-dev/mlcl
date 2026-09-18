import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// menu_items.available (the sold-out flag — a real column with an index, a write path, a list
// filter, and an "Unavailable" UI overlay) was enforced nowhere in order creation. The public
// guest order loop skipped missing/foreign-owner items but priced sold-out items straight in, so
// a guest could order an item the operator had marked unavailable. The loop now skips
// available === false, and an order left with no valid items is rejected.

const db = {
  findById: vi.fn(),
  findOne: vi.fn(async (..._a: unknown[]) => null as unknown),
  create: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/guest.js'

function orderHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/orders' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /orders not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
}
const MENU: Record<string, Record<string, unknown>> = {
  'item-1': { id: 'item-1', name: 'Ramen', price: 500, available: true },
  'item-2': { id: 'item-2', name: 'Sold Out Special', price: 999, available: false },
}
const ordersCreate = () =>
  db.create.mock.calls.find((c) => c[0] === 'orders')?.[1] as Record<string, unknown> | undefined
const run = (items: Array<{ menu_item_id: string; quantity: number }>) => {
  const body = { owner_id: 'op-1', items }
  const res = makeRes()
  return orderHandler()({ body } as unknown as Request, res as unknown as Response).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation((table: string, id: string) =>
    Promise.resolve(table === 'menu_items' ? (MENU[id] ?? null) : null),
  )
  db.findOne.mockResolvedValue(null)
  db.create.mockResolvedValue({ data: { id: 'o1' } })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('order creation enforces menu_items.available', () => {
  it('skips a sold-out item and prices only the available ones', async () => {
    const res = await run([
      { menu_item_id: 'item-1', quantity: 2 },
      { menu_item_id: 'item-2', quantity: 1 },
    ])
    expect(res.statusCode).toBe(201)
    // subtotal is 2×500 only — the sold-out item-2 (999) is excluded.
    expect(ordersCreate()?.subtotal).toBe(1000)
  })

  it('rejects an order whose only item is sold out (400, no order created)', async () => {
    const res = await run([{ menu_item_id: 'item-2', quantity: 1 }])
    expect(res.statusCode).toBe(400)
    expect(ordersCreate()).toBeUndefined()
  })

  it('creates normally when every item is available', async () => {
    const res = await run([{ menu_item_id: 'item-1', quantity: 3 }])
    expect(res.statusCode).toBe(201)
    expect(ordersCreate()?.subtotal).toBe(1500)
  })
})
