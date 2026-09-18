import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// GET /api/cart previously returned only { items, subtotal } with no tax, so the
// client hardcoded its own rate and the store owner's configured
// adminSettings.tax.taxRate was ignored. The cart now returns `tax` computed
// from the owner's rate (the same helper the order charge uses).

const findById = vi.fn()
const findMany = vi.fn()
const findOne = vi.fn()
const create = vi.fn()
const updateById = vi.fn()
const deleteMany = vi.fn()
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findOne: (...a: unknown[]) => findOne(...a),
  create: (...a: unknown[]) => create(...a),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteMany: (...a: unknown[]) => deleteMany(...a),
}))
vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: unknown, _s: unknown, next: () => void) => next(),
}))

import cartRouter from '../handlers/cart.js'

function cartGet(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    cartRouter.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = (): Response & {
  statusCode: number
  body: { subtotal?: number; tax?: number }
} => {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(b: unknown) {
      res.body = b
      return res
    },
  }) as unknown as Response & { statusCode: number; body: { subtotal?: number; tax?: number } }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.STORE_TAX_RATE
})

describe('GET /cart applies the store owner tax rate', () => {
  it("returns tax from the owner's configured adminSettings.tax.taxRate (20%)", async () => {
    findMany.mockResolvedValue([{ product_id: 'p1', quantity: 2 }]) // cart_items
    findById.mockImplementation((table: string, id: string) => {
      if (table === 'products') return Promise.resolve({ id: 'p1', price: 1000, user_id: 'owner1' })
      if (table === 'users' && id === 'owner1')
        return Promise.resolve({
          id: 'owner1',
          oauthData: { adminSettings: { tax: { taxRate: 20 } } },
        })
      return Promise.resolve(null)
    })
    const res = makeRes()
    await cartGet()({} as unknown as Request, res)
    expect(res.body.subtotal).toBe(2000) // 1000 × 2
    expect(res.body.tax).toBe(400) // 2000 × 0.20
  })

  it('falls back to 8% when the owner has no configured rate', async () => {
    findMany.mockResolvedValue([{ product_id: 'p1', quantity: 1 }])
    findById.mockImplementation((table: string) => {
      if (table === 'products') return Promise.resolve({ id: 'p1', price: 5000, user_id: 'owner1' })
      return Promise.resolve({ id: 'owner1', oauthData: {} }) // no adminSettings
    })
    const res = makeRes()
    await cartGet()({} as unknown as Request, res)
    expect(res.body.tax).toBe(400) // 5000 × 0.08
  })
})
