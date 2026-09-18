import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The stock-valuation report is the money-precision-sensitive path: cost_price /
// sell_price are `numeric(12,2)` columns, and node-postgres returns `numeric` as a
// STRING (not a JS number). These tests feed prices AS STRINGS — exactly what the
// driver yields — and assert the handler's `Number(...)` coercion produces correct
// cost/sell/margin totals. (Before the column was `double precision`, a float that
// rounds money; the fix to numeric is what makes prices arrive as strings here.)

const db = { findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({
  seedDemoForUserSafe: vi.fn().mockResolvedValue(undefined),
}))

import router from '../handlers/reports.js'

function valuationHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/valuation' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /valuation not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}

function makeRes() {
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
  return res
}

const req = { query: {} } as unknown as Request

// findMany is called first for 'products', then 'stock_levels'. Route by table.
function mockData(products: unknown[], stockLevels: unknown[]) {
  db.findMany.mockImplementation((table: string) => {
    if (table === 'products') return Promise.resolve(products)
    if (table === 'stock_levels') return Promise.resolve(stockLevels)
    return Promise.resolve([])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('inventory valuation — numeric prices arrive as strings', () => {
  it('coerces string cost/sell prices and computes correct totals + margin', async () => {
    mockData(
      [
        {
          id: 'p1',
          name: 'Widget',
          sku: 'W1',
          cost_price: '42.53',
          sell_price: '79.99',
          user_id: 'user-1',
        },
      ],
      [{ product_id: 'p1', warehouse_id: 'w1', quantity: 3 }],
    )
    const res = makeRes()
    await valuationHandler()(req, res as unknown as Response)
    const body = res.body as {
      total_cost_value: number
      total_sell_value: number
      total_margin: number
      items: Array<{ cost_value: number; sell_value: number }>
    }
    expect(body.total_cost_value).toBeCloseTo(127.59, 2) // 3 × 42.53
    expect(body.total_sell_value).toBeCloseTo(239.97, 2) // 3 × 79.99
    expect(body.total_margin).toBeCloseTo(112.38, 2) // 239.97 − 127.59
    expect(body.items[0].cost_value).toBeCloseTo(127.59, 2)
    // A string price must never leak into arithmetic as concatenation.
    expect(typeof body.total_cost_value).toBe('number')
  })

  it('sums valuation across multiple products and stock rows', async () => {
    mockData(
      [
        {
          id: 'p1',
          name: 'A',
          sku: 'A1',
          cost_price: '10.00',
          sell_price: '15.00',
          user_id: 'user-1',
        },
        {
          id: 'p2',
          name: 'B',
          sku: 'B1',
          cost_price: '2.50',
          sell_price: '4.00',
          user_id: 'user-1',
        },
      ],
      [
        { product_id: 'p1', warehouse_id: 'w1', quantity: 4 }, // cost 40, sell 60
        { product_id: 'p2', warehouse_id: 'w1', quantity: 10 }, // cost 25, sell 40
      ],
    )
    const res = makeRes()
    await valuationHandler()(req, res as unknown as Response)
    const body = res.body as {
      total_cost_value: number
      total_sell_value: number
      total_margin: number
    }
    expect(body.total_cost_value).toBeCloseTo(65, 2)
    expect(body.total_sell_value).toBeCloseTo(100, 2)
    expect(body.total_margin).toBeCloseTo(35, 2)
  })

  it('short-circuits to zeros when the user has no products', async () => {
    mockData([], [])
    const res = makeRes()
    await valuationHandler()(req, res as unknown as Response)
    expect(res.body).toEqual({
      total_cost_value: 0,
      total_sell_value: 0,
      total_margin: 0,
      items: [],
    })
  })
})
