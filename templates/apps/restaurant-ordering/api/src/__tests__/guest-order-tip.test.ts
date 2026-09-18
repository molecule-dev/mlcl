import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// GuestCart lets the guest pick a tip percentage and shows it in the total, but the tip was never
// sent or stored — the guest order handler computed total = subtotal + tax and dropped the tip.
// It now accepts tip_pct, applies it to the subtotal, includes it in the total, and stores it.

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
function makeRes(): { statusCode: number; body: unknown } & Pick<Response, 'status' | 'json'> {
  const res = {
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
  return res as unknown as { statusCode: number; body: unknown } & Pick<Response, 'status' | 'json'>
}
const ordersCreate = (): Record<string, unknown> | undefined =>
  db.create.mock.calls.find((c) => c[0] === 'orders')?.[1] as Record<string, unknown> | undefined
const run = (tipPct?: number): Promise<ReturnType<typeof makeRes>> => {
  const body = {
    owner_id: 'op-1',
    tip_pct: tipPct,
    items: [{ menu_item_id: 'item-1', quantity: 2 }],
  }
  const res = makeRes()
  return orderHandler()({ body } as unknown as Request, res as unknown as Response).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation((table: string, id: string) =>
    Promise.resolve(
      table === 'menu_items' ? { id, name: 'Ramen', price: 500, available: true } : null,
    ),
  )
  db.findOne.mockResolvedValue(null)
  db.create.mockResolvedValue({ data: { id: 'o1' } })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('guest order applies the chosen tip percentage', () => {
  it('adds an 18% tip to the subtotal, includes it in the total, and stores it', async () => {
    const res = await run(18)
    expect(res.statusCode).toBe(201)
    const order = ordersCreate()
    // 2 × 500 = 1000 subtotal, tax 0 (env unset), tip = 18% of 1000 = 180.
    expect(order?.subtotal).toBe(1000)
    expect(order?.tip).toBe(180)
    expect(order?.total).toBe(1180)
  })

  it('stores a zero tip when none is chosen', async () => {
    const res = await run(undefined)
    expect(res.statusCode).toBe(201)
    const order = ordersCreate()
    expect(order?.tip).toBe(0)
    expect(order?.total).toBe(1000)
  })
})
