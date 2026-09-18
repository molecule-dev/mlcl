import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// requireAdmin reads ADMIN_EMAILS at module-eval time — set before SUT import.
process.env.ADMIN_EMAILS = 'owner@coupons.com'

// ---- Mock the molecule data layer the handlers + middleware touch ----------
// users: drives requireAdmin's role lookup. merchants/deals: drive the
// ownership + existence checks in the deal/merchant handlers.
const DEAL_ID = '00000000-0000-0000-0000-0000000000d1'
const MERCHANT_ID = '00000000-0000-0000-0000-0000000000m1'

const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'someone@example.com', role: 'admin' }
    if (id === 'owner-1') return { id, email: 'Owner@Coupons.com', role: 'user' }
    if (id === 'merchant-user') return { id, email: 'merchant@example.com', role: 'user' }
    if (id === 'user-1') return { id, email: 'customer@example.com', role: 'user' }
    return null
  }
  if (table === 'deals') {
    if (id === DEAL_ID)
      return { id, merchant_id: MERCHANT_ID, featured: false, original_price: 1000 }
    return null
  }
  if (table === 'merchants') {
    if (id === MERCHANT_ID) return { id, user_id: 'merchant-user', status: 'approved' }
    return { id, user_id: 'merchant-user' }
  }
  return { id }
})
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'x', featured: true } }))
const create = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [])
const findOne = vi.fn(async (..._a: unknown[]) => null)
const count = vi.fn(async (..._a: unknown[]) => 0)

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  updateById: (...a: unknown[]) => updateById(...a),
  create: (...a: unknown[]) => create(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findOne: (...a: unknown[]) => findOne(...a),
  count: (...a: unknown[]) => count(...a),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Decorators are presentation-only; stub to identity so handlers respond.
vi.mock('../handlers/_decorate.js', () => ({
  decorateDeal: (row: unknown) => row,
  decorateDeals: (rows: unknown) => rows,
  decorateMerchant: (row: unknown) => row,
  decorateMerchants: (rows: unknown) => rows,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const merchants = (await import('../handlers/merchants.js')).default
  const deals = (await import('../handlers/deals.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/merchants', merchants)
  app.use('/deals', deals)

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

const call = (method: string, path: string, user?: string, body?: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': user } : {}),
    },
    body: JSON.stringify(body ?? {}),
  })

// ---- TPL-001: merchant status transitions are admin-gated -------------------
describe('PUT /merchants/:id/status is admin-gated (TPL-001)', () => {
  const path = `/merchants/${MERCHANT_ID}/status`
  const body = { status: 'approved' }

  it('→ 401 with no session', async () => {
    const res = await call('PUT', path, undefined, body)
    expect(res.status).toBe(401)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('→ 403 for an ordinary authenticated (non-admin) user — no self-approval', async () => {
    const res = await call('PUT', path, 'merchant-user', body)
    expect(res.status).toBe(403)
    // The status transition never happened.
    expect(updateById).not.toHaveBeenCalled()
  })

  it('→ succeeds for an admin user', async () => {
    const res = await call('PUT', path, 'admin-1', body)
    expect(res.status).toBe(200)
    expect(updateById).toHaveBeenCalledWith(
      'merchants',
      MERCHANT_ID,
      expect.objectContaining({ status: 'approved' }),
    )
  })
})

// ---- TPL-003: featured is not merchant-settable; admin toggle only ----------
describe('deal featured flag is not merchant mass-assignable (TPL-003)', () => {
  it('PUT /deals/:id by owning merchant ignores body.featured', async () => {
    const res = await call('PUT', `/deals/${DEAL_ID}`, 'merchant-user', {
      title: 'New title',
      featured: true,
    })
    expect(res.status).toBe(200)
    // The merchant edit path applied the title but NEVER the curation flag.
    const updateCall = updateById.mock.calls.find((c) => c[0] === 'deals')
    expect(updateCall).toBeDefined()
    const updates = updateCall![2] as Record<string, unknown>
    expect(updates.title).toBe('New title')
    expect(updates).not.toHaveProperty('featured')
  })

  it('POST /deals/:id/feature → 401 with no session', async () => {
    const res = await call('POST', `/deals/${DEAL_ID}/feature`)
    expect(res.status).toBe(401)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('POST /deals/:id/feature → 403 for a non-admin (incl. owning merchant)', async () => {
    const res = await call('POST', `/deals/${DEAL_ID}/feature`, 'merchant-user')
    expect(res.status).toBe(403)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('POST /deals/:id/feature → admin toggles featured server-side', async () => {
    const res = await call('POST', `/deals/${DEAL_ID}/feature`, 'admin-1')
    expect(res.status).toBe(200)
    expect(updateById).toHaveBeenCalledWith(
      'deals',
      DEAL_ID,
      expect.objectContaining({ featured: true }),
    )
  })
})
