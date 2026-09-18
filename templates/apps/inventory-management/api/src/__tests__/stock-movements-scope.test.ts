import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for [TPL-1] cross-tenant IDOR in GET /stock/movements.
// Before the fix the handler queried `stock_movements` with NO ownership
// scoping, so any authenticated caller could read every tenant's inventory
// activity (the table has no owner column). The fix scopes the query to the
// caller's products (product_id IN owned) and validates client-supplied
// product_id / warehouse_id filters against ownership (404 on a foreign id).

// ---- Mock the molecule data layer the handler touches ----------------------
// products: drives the owner-scope set (user_id === caller).
// warehouses: drives ensureWarehouseOwned's fetch-and-404 check.
// stock_movements: the protected table — capture the where clause it's called with.
const OWNER = 'owner-1'
const OWNED_PRODUCT = '00000000-0000-0000-0000-0000000000a1'
const OWNED_PRODUCT_2 = '00000000-0000-0000-0000-0000000000a2'
const FOREIGN_PRODUCT = '00000000-0000-0000-0000-0000000000b9'
const OWNED_WAREHOUSE = '00000000-0000-0000-0000-0000000000c1'
const FOREIGN_WAREHOUSE = '00000000-0000-0000-0000-0000000000d9'

const findMany = vi.fn(async (table: string, _opts?: unknown) => {
  if (table === 'products') {
    return [{ id: OWNED_PRODUCT }, { id: OWNED_PRODUCT_2 }]
  }
  if (table === 'stock_movements') {
    return [{ id: 'mv-1', product_id: OWNED_PRODUCT, quantity_change: 5 }]
  }
  return []
})
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'warehouses') {
    if (id === OWNED_WAREHOUSE) return { id, user_id: OWNER }
    if (id === FOREIGN_WAREHOUSE) return { id, user_id: 'someone-else' }
    return null
  }
  return null
})

vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => findMany(a[0] as string, a[1]),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  findOne: vi.fn(async () => null),
  create: vi.fn(async () => ({ data: { ok: true } })),
  updateById: vi.fn(async () => ({ data: { ok: true } })),
  count: vi.fn(async () => 0),
}))

// getUserId reads res.locals.session?.userId — replicate the real behaviour.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))

// Validation is orthogonal — pass query through but coerce page/limit defaults
// like the real zod schema so the handler's pagination math doesn't NaN.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (req: Request, _res: Response, next: NextFunction) => {
    req.query.page = (req.query.page ?? 1) as never
    req.query.limit = (req.query.limit ?? 50) as never
    next()
  },
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const stock = (await import('../handlers/stock.js')).default
  const app = express()
  app.use(express.json())
  // Test auth shim: map X-Test-User onto res.locals.session, as the real JWT
  // auth middleware would.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/stock', stock)

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
})

const get = (path: string, user?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { ...(user ? { 'x-test-user': user } : {}) },
  })

const movementsWhere = (): Array<{ field: string; operator: string; value: unknown }> => {
  const call = findMany.mock.calls.find((c) => c[0] === 'stock_movements')
  expect(call, 'stock_movements should have been queried').toBeDefined()
  return (call![1] as { where: Array<{ field: string; operator: string; value: unknown }> }).where
}

describe('GET /stock/movements is owner-scoped (TPL-1 cross-tenant IDOR fix)', () => {
  it('rejects an unauthenticated caller with 401 and never queries movements', async () => {
    const res = await get('/stock/movements')
    expect(res.status).toBe(401)
    expect(findMany).not.toHaveBeenCalledWith('stock_movements', expect.anything())
  })

  it('always scopes the query to the caller-owned product ids (the leak fix)', async () => {
    const res = await get('/stock/movements', OWNER)
    expect(res.status).toBe(200)
    const where = movementsWhere()
    // The owner scope is the FIRST, non-optional condition.
    expect(where[0]).toEqual({
      field: 'product_id',
      operator: 'in',
      value: [OWNED_PRODUCT, OWNED_PRODUCT_2],
    })
  })

  it('returns [] (no movements query) when the caller owns no products', async () => {
    findMany.mockImplementationOnce(async (table: string) => {
      if (table === 'products') return []
      return []
    })
    const res = await get('/stock/movements', 'no-products-user')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    expect(findMany).not.toHaveBeenCalledWith('stock_movements', expect.anything())
  })

  it('404s a client-supplied product_id outside the owned set (no existence probe, no leak)', async () => {
    const res = await get(`/stock/movements?product_id=${FOREIGN_PRODUCT}`, OWNER)
    expect(res.status).toBe(404)
    // The protected table is never reached for a foreign id.
    expect(findMany).not.toHaveBeenCalledWith('stock_movements', expect.anything())
  })

  it('honours a client-supplied product_id that IS owned (functionality preserved)', async () => {
    const res = await get(`/stock/movements?product_id=${OWNED_PRODUCT}`, OWNER)
    expect(res.status).toBe(200)
    const where = movementsWhere()
    expect(where[0]).toEqual({
      field: 'product_id',
      operator: 'in',
      value: [OWNED_PRODUCT, OWNED_PRODUCT_2],
    })
    expect(where).toContainEqual({ field: 'product_id', operator: '=', value: OWNED_PRODUCT })
  })

  it('404s a client-supplied warehouse_id the caller does not own', async () => {
    const res = await get(`/stock/movements?warehouse_id=${FOREIGN_WAREHOUSE}`, OWNER)
    expect(res.status).toBe(404)
    expect(findMany).not.toHaveBeenCalledWith('stock_movements', expect.anything())
  })

  it('honours a client-supplied warehouse_id the caller owns (functionality preserved)', async () => {
    const res = await get(`/stock/movements?warehouse_id=${OWNED_WAREHOUSE}`, OWNER)
    expect(res.status).toBe(200)
    const where = movementsWhere()
    expect(where[0].operator).toBe('in')
    expect(where).toContainEqual({
      field: 'warehouse_id',
      operator: '=',
      value: OWNED_WAREHOUSE,
    })
  })
})
