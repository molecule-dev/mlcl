import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// A deal's `starts_at` (activation time) was stored but never gated: the list paths filtered only
// `expires_at`, and the purchase path checked only status + expiry. So a deal scheduled for the
// future was publicly listed AND purchasable before it went live. The list now hides not-yet-started
// deals (alongside expired ones) and the purchase path rejects them.

const PAST = '2000-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'
const FAR_FUTURE = '2999-02-01T00:00:00.000Z'

const DEALS: Array<Record<string, unknown>> = [
  { id: 'live', status: 'active', starts_at: null, expires_at: FUTURE },
  { id: 'not-started', status: 'active', starts_at: FUTURE, expires_at: FAR_FUTURE },
  { id: 'expired', status: 'active', starts_at: null, expires_at: PAST },
]

const findById = vi.fn(async (_table: string, id: string) => {
  if (id === 'not-started')
    return {
      id,
      status: 'active',
      starts_at: FUTURE,
      expires_at: FAR_FUTURE,
      remaining_quantity: 10,
    }
  return null
})
const findMany = vi.fn(async (table: string) => (table === 'deals' ? DEALS : []))
const findOne = vi.fn(async () => null)
const create = vi.fn(async () => ({ data: { ok: true } }))
const updateById = vi.fn(async () => ({ data: {} }))
const query = vi.fn(async () => [])
const count = vi.fn(async () => 0)

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  findMany: (...a: unknown[]) => findMany(a[0] as string),
  findOne: () => findOne(),
  create: () => create(),
  updateById: () => updateById(),
  query: () => query(),
  count: () => count(),
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
  t: (k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
// Decorate is orthogonal — pass the filtered rows straight through so the test sees exactly which
// deals survived the activation-window filter.
vi.mock('../handlers/_decorate.js', () => ({
  decorateDeal: (d: unknown) => d,
  decorateDeals: (rows: unknown) => rows,
}))
vi.mock('../middleware/require-admin.js', () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const deals = (await import('../handlers/deals.js')).default
  const redemptions = (await import('../handlers/redemptions.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/deals', deals)
  app.use('/redemptions', redemptions)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => vi.clearAllMocks())

describe('deal activation window (starts_at) is honored', () => {
  it('the deal list hides not-yet-started and expired deals', async () => {
    const res = await fetch(`${baseUrl}/deals`, { headers: { 'x-test-user': 'u1' } })
    expect(res.status).toBe(200)
    const ids = ((await res.json()) as Array<{ id: string }>).map((d) => d.id)
    expect(ids).toEqual(['live'])
  })

  it('purchasing a not-yet-started deal is rejected (no coupon issued)', async () => {
    const res = await fetch(`${baseUrl}/redemptions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'u1' },
      body: JSON.stringify({ deal_id: 'not-started', quantity: 1 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('deal.notYetActive')
    expect(query).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})
