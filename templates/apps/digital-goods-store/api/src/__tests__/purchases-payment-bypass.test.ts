/**
 * Regression for [RVALL-1] — POST /api/purchases payment bypass.
 *
 * This route does NOT process payment; it previously minted a 'completed' purchase
 * + active license from a bare productId, letting any user acquire any PAID product
 * for free. It must now fail closed: a priced product → 402 (use checkout), and only
 * a genuinely free (price 0) product may be acquired here.
 */
import express from 'express'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const PRICED = '11111111-1111-1111-1111-111111111111'
const FREE = '22222222-2222-2222-2222-222222222222'

const createMock = vi.fn(async () => ({ data: { id: 'row-1' } }))

vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'buyer-1' }))

vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(async (table: string, id: string) => {
    if (table !== 'products') return null
    if (id === PRICED)
      return { id, name: 'Premium', price: 4999, currency: 'USD', status: 'active' }
    if (id === FREE) return { id, name: 'Freebie', price: 0, currency: 'USD', status: 'active' }
    return null
  }),
  findMany: vi.fn(async () => []),
  create: (...a: unknown[]) => createMock(...(a as [])),
  updateById: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: express.Request, _res: express.Response, next: () => void) => next(),
  validateQuery: () => (_req: express.Request, _res: express.Response, next: () => void) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const { default: purchasesRouter } = await import('../handlers/purchases.js')
  const app = express()
  app.use(express.json())
  app.use('/api/purchases', purchasesRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => server?.close())
beforeEach(() => createMock.mockClear())

const buy = (productId: string) =>
  fetch(`${baseUrl}/api/purchases`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId }),
  })

describe('[RVALL-1] POST /api/purchases payment bypass', () => {
  it('rejects a PRICED product with 402 and mints no purchase/license', async () => {
    const res = await buy(PRICED)
    expect(res.status).toBe(402)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('allows a genuinely FREE product (201)', async () => {
    const res = await buy(FREE)
    expect(res.status).toBe(201)
    expect(createMock).toHaveBeenCalled()
  })
})
