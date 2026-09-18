/**
 * Regression test for [TPL-002] — checkout price tampering.
 *
 * POST /api/checkout/create-session must ALWAYS charge the server-side listed
 * product price. A client-supplied `amountCents` must never influence the Stripe
 * `unit_amount` that is actually charged (and later recorded as the purchase
 * amount via the webhook). Before the fix the handler honored
 * `amountCents > 0 ? amountCents : productPriceCents`, letting a buyer underpay.
 */
import express from 'express'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

const LISTED_PRICE_CENTS = 4999

type SessionCreateArg = { line_items: Array<{ price_data: { unit_amount: number } }> }

// Capture the args the handler passes to Stripe.
const sessionsCreate = vi.fn(async (_arg: SessionCreateArg) => ({
  id: 'cs_test_123',
  url: 'https://stripe.test/cs_test_123',
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'buyer-1',
}))

vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(async (table: string, id: string) => {
    if (table === 'products' && id === '11111111-1111-1111-1111-111111111111') {
      return {
        id,
        name: 'Premium Pack',
        slug: 'premium-pack',
        price: LISTED_PRICE_CENTS,
        currency: 'USD',
        status: 'active',
      }
    }
    return null
  }),
  findMany: vi.fn(async () => []),
  create: vi.fn(async () => ({ data: { id: 'purchase-1' } })),
  updateById: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-payments-stripe', () => ({
  getClient: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
  verifyWebhookSignature: vi.fn(),
}))

// Run the real schema so we also assert it strips an unknown client `amountCents`.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody:
    (schema: z.ZodTypeAny) => (req: express.Request, _res: express.Response, next: () => void) => {
      req.body = schema.parse(req.body)
      next()
    },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const { default: checkoutRouter } = await import('../handlers/checkout.js')
  const app = express()
  app.use(express.json())
  app.use('/api/checkout', checkoutRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server?.close()
})

beforeEach(() => {
  sessionsCreate.mockClear()
})

describe('[TPL-002] checkout create-session price integrity', () => {
  const productId = '11111111-1111-1111-1111-111111111111'

  it('charges the server-side listed price, ignoring a client-supplied amountCents', async () => {
    const res = await fetch(`${baseUrl}/api/checkout/create-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Attacker tries to underpay: 1 cent for a $49.99 product.
      body: JSON.stringify({ productId, amountCents: 1 }),
    })
    expect(res.status).toBe(200)
    expect(sessionsCreate).toHaveBeenCalledTimes(1)
    const arg = sessionsCreate.mock.calls[0]![0]
    // The amount charged MUST be the listed price, never the client's 1 cent.
    expect(arg.line_items[0]!.price_data.unit_amount).toBe(LISTED_PRICE_CENTS)
  })

  it('charges the listed price even with no amount in the body (normal flow still works)', async () => {
    const res = await fetch(`${baseUrl}/api/checkout/create-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    expect(res.status).toBe(200)
    const arg = sessionsCreate.mock.calls[0]![0]
    expect(arg.line_items[0]!.price_data.unit_amount).toBe(LISTED_PRICE_CENTS)
  })
})
