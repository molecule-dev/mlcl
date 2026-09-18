import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Product `status` gates catalog visibility (list + storefront filter status='active') but was never
// re-checked on the purchase path, so an archived product stayed add-to-cart-able and checkout-able
// via its direct URL. Both cart-add and checkout now reject a non-active product.

const findById = vi.fn()
const findOne = vi.fn()
const findMany = vi.fn()
const create = vi.fn()
const updateById = vi.fn()
const query = vi.fn()
const count = vi.fn()
const connect = vi.fn()
const deleteMany = vi.fn()
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...a),
  findOne: (...a: unknown[]) => findOne(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  create: (...a: unknown[]) => create(...a),
  updateById: (...a: unknown[]) => updateById(...a),
  query: (...a: unknown[]) => query(...a),
  count: (...a: unknown[]) => count(...a),
  connect: (...a: unknown[]) => connect(...a),
  deleteMany: (...a: unknown[]) => deleteMany(...a),
}))
vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({}) }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: unknown, _s: unknown, next: () => void) => next(),
}))

import cartRouter from '../handlers/cart.js'
import ordersRouter from '../handlers/orders.js'

function lastHandle(
  router: { stack: unknown },
  path: string,
  method: string,
): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method} ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const cartAdd = () => lastHandle(cartRouter, '/items', 'post')
const checkout = () => lastHandle(ordersRouter, '/', 'post')

const mockReq = (overrides: Record<string, unknown> = {}): Request =>
  ({ params: {}, body: {}, query: {}, ...overrides }) as unknown as Request
const mockRes = (userId?: string) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    locals: { session: userId ? { userId } : undefined },
  }
  return res as unknown as Response & { status: ReturnType<typeof vi.fn> }
}

beforeEach(() => vi.resetAllMocks())

describe('archived products are not purchasable', () => {
  it('cart add rejects an archived product (400, no cart write)', async () => {
    findById.mockResolvedValue({ id: 'p1', status: 'archived' })
    const res = mockRes('buyer-1')
    await cartAdd()(mockReq({ body: { productId: 'p1', quantity: 1 } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('cart add allows an active product (reaches inventory + creates the line)', async () => {
    findById.mockResolvedValue({ id: 'p1', status: 'active' })
    findOne.mockResolvedValue({ available: 5 })
    findMany.mockResolvedValue([]) // no existing cart line
    create.mockResolvedValue({ data: { id: 'ci1' } })
    const res = mockRes('buyer-1')
    await cartAdd()(mockReq({ body: { productId: 'p1', quantity: 1 } }), res)
    expect(create).toHaveBeenCalled()
  })

  it('checkout rejects a carted product that is now archived (400, no order/query)', async () => {
    findMany.mockImplementation((table: string) =>
      table === 'cart_items'
        ? Promise.resolve([{ product_id: 'p1', quantity: 1, variant_id: null }])
        : Promise.resolve([]),
    )
    findById.mockResolvedValue({ id: 'p1', status: 'archived', name: 'Widget', price: 100 })
    const res = mockRes('buyer-1')
    await checkout()(mockReq({ body: { shippingAddress: {} } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })
})
