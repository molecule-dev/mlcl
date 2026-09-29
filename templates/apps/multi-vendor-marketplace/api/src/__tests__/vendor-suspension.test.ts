import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A suspended/pending vendor's products were still served + purchasable — the catalog/detail/cart/
// checkout only filtered products.status='active' and never joined the owning vendor's status. Now
// the vendor status is honored: this covers the pure helper + the product-detail 404 guard.

const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(async (..._a: unknown[]) => null),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-image', () => ({ resize: vi.fn(), thumbnail: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('@molecule/api-search', () => ({ deleteDocument: vi.fn(), index: vi.fn() }))

import router from '../handlers/products.js'
import { vendorIsActive } from '../lib/vendor-status.js'

describe('vendorIsActive', () => {
  it('is true for an active vendor, false for suspended/pending', () => {
    expect(vendorIsActive('v1', { status: 'active' })).toBe(true)
    expect(vendorIsActive('v1', { status: 'suspended' })).toBe(false)
    expect(vendorIsActive('v1', { status: 'pending' })).toBe(false)
    expect(vendorIsActive('v1', null)).toBe(false) // vendor missing → treat as inactive
  })
  it('is true when the product has no vendor', () => {
    expect(vendorIsActive(null, null)).toBe(true)
  })
})

function detailHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response & { statusCode: number }
}
// The detail handler 404s any non-UUID id before touching the store, and its
// vendor lookup reads the vendors row by the product's vendor_id — the mocks
// below must use a real UUID-shaped id and key the vendor row on that id.
const PRODUCT_ID = '3f1d2c4a-9b0e-4f7a-8c1d-2e3b4a5c6d7e'

const runDetail = (vendorStatus: string) => {
  db.findById.mockImplementation((table: unknown, _id: unknown) => {
    if (table === 'products') {
      return Promise.resolve({ id: PRODUCT_ID, vendor_id: 'v1', name: 'Widget' })
    }
    if (table === 'vendors') {
      return Promise.resolve({ id: 'v1', status: vendorStatus })
    }
    return Promise.resolve(null)
  })
  const res = makeRes() as Response & { statusCode: number }
  return detailHandler()({ params: { id: PRODUCT_ID } } as unknown as Request, res).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('GET /products/:id honors vendor status', () => {
  it('404s a product whose vendor is suspended', async () => {
    const res = await runDetail('suspended')
    expect(res.statusCode).toBe(404)
  })
  it('serves a product whose vendor is active', async () => {
    const res = await runDetail('active')
    expect(res.statusCode).toBe(200)
  })
})
