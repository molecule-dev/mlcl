import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Product availability (status='active' + attributes.in_stock) gated the Add button client-side and
// the serialized in_stock flag, but the server never enforced it — so an out-of-stock/archived
// product could be added to cart and charged at checkout. Both paths now reject/skip it.

const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-resource-order', () => ({ canDriveOrderLifecycle: vi.fn(() => true) }))

import cartRouter from '../handlers/cart.js'
import ordersRouter from '../handlers/orders.js'

function handle(router: { stack: unknown }, path: string, method: string) {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method} ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const cartAdd = () => handle(cartRouter, '/items', 'post')
const checkout = () => handle(ordersRouter, '/', 'post')
const makeRes = () => {
  const res = { statusCode: 0, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response & { statusCode: number; body: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'x' } })
  db.updateById.mockResolvedValue({ data: {} })
  db.findMany.mockResolvedValue([])
})

describe('add-to-cart enforces product availability', () => {
  const addProduct = async (product: Record<string, unknown>) => {
    db.findById.mockResolvedValue(product)
    const res = makeRes()
    await cartAdd()({ body: { productId: product.id, quantity: 1 } } as unknown as Request, res)
    return res
  }

  it('rejects an out-of-stock product (attributes.in_stock=false)', async () => {
    const res = await addProduct({
      id: 'p1',
      name: 'Almond Butter',
      status: 'active',
      attributes: { in_stock: false },
    })
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('rejects an archived product (status != active)', async () => {
    const res = await addProduct({ id: 'p1', name: 'Old SKU', status: 'archived', attributes: {} })
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows an active, in-stock product', async () => {
    const res = await addProduct({
      id: 'p1',
      name: 'Milk',
      status: 'active',
      attributes: { in_stock: true },
    })
    expect(db.create).toHaveBeenCalledWith(
      'cart_items',
      expect.objectContaining({ product_id: 'p1' }),
    )
    expect(res.statusCode).not.toBe(400)
  })
})

describe('checkout does not charge for an out-of-stock item', () => {
  it('400s (allItemsUnavailable) when the only cart item is out of stock — no order created', async () => {
    db.findById.mockImplementation((table: string) =>
      Promise.resolve(
        table === 'delivery_slots'
          ? { id: 's1', remaining_capacity: 10, fee_override: null }
          : {
              id: 'p1',
              price: 500,
              name: 'Almond Butter',
              status: 'active',
              attributes: { in_stock: false },
            },
      ),
    )
    db.findMany.mockResolvedValue([
      { product_id: 'p1', quantity: 2, substitution_preference: null, substitute_id: null },
    ])
    const res = makeRes()
    await checkout()(
      {
        body: {
          deliveryAddress: { line1: 'x', city: 'y', postal_code: 'z', country: 'US' },
          deliverySlotId: 's1',
          tip: 0,
          deliveryInstructions: '',
        },
      } as unknown as Request,
      res,
    )
    expect(res.statusCode).toBe(400)
    expect(db.create.mock.calls.some((c) => c[0] === 'orders')).toBe(false)
  })
})
