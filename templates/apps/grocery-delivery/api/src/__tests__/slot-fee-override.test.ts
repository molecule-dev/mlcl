import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Checkout hardcoded the flat env delivery fee and ignored the chosen delivery_slots.fee_override —
// even though the Cart prices the order with the slot's fee. A slot with an explicit fee_override
// must charge that fee; slots without one fall back to the env fee (with the free-delivery threshold).

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

import router from '../handlers/orders.js'

function checkout(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const orderDeliveryFee = () =>
  (db.create.mock.calls.find((c) => c[0] === 'orders')?.[1] as { delivery_fee?: number })
    ?.delivery_fee

/** Run checkout: slot fee_override + a cart whose subtotal is unitPrice*2. */
const run = (feeOverride: number | null, unitPrice: number) => {
  db.findById.mockImplementation((table: string) =>
    Promise.resolve(
      table === 'delivery_slots'
        ? { id: 's1', remaining_capacity: 10, fee_override: feeOverride }
        : { id: 'p1', price: unitPrice, name: 'Milk', status: 'active' },
    ),
  )
  db.findMany.mockResolvedValue([
    { product_id: 'p1', quantity: 2, substitution_preference: null, substitute_id: null },
  ])
  const body = {
    deliveryAddress: { line1: 'x', city: 'y', postal_code: 'z', country: 'US' },
    deliverySlotId: 's1',
    tip: 0,
    deliveryInstructions: '',
  }
  return checkout()({ body } as unknown as Request, makeRes())
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'o1' } })
  db.updateById.mockResolvedValue({ data: {} })
  db.deleteById.mockResolvedValue({ data: {} })
})

describe('checkout honors the slot fee_override', () => {
  it('charges the slot override even above the free-delivery threshold', async () => {
    await run(799, 2500) // subtotal 5000 >= 3500, but override wins
    expect(orderDeliveryFee()).toBe(799)
  })

  it('falls back to free delivery above the threshold when no override', async () => {
    await run(null, 2500) // subtotal 5000 >= 3500
    expect(orderDeliveryFee()).toBe(0)
  })

  it('falls back to the env fee below the threshold when no override', async () => {
    await run(null, 500) // subtotal 1000 < 3500 → env default 499
    expect(orderDeliveryFee()).toBe(499)
  })
})
