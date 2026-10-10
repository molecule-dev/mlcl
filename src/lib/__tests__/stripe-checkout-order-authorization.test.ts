/**
 * The stripe-checkout example's `POST /checkout/session` accepts an optional
 * `orderId` that `webhooks.ts` turns into `updateById('orders', metadata.orderId,
 * { status: 'paid' })` when the checkout completes. The webhook's signature
 * check only proves STRIPE sent the event — the orderId itself is chosen by
 * whoever POSTs to /checkout/session — so the session-creation path is the
 * authorization point: without an ownership check there, any user could mark
 * ANY user's order paid by completing a checkout of any price with the
 * victim's order id in the metadata.
 *
 * This drives the REAL exported router (only the @molecule bonds are mocked —
 * the auth guard, the schema and the order validation are the shipped code):
 * unauthenticated → 401, another user's order → 403, unknown → 404, already
 * paid → 409, own unpaid order → the session is created with that orderId.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const stripe = vi.hoisted(() => ({ createCheckoutSession: vi.fn() }))
const database = vi.hoisted(() => ({ findById: vi.fn() }))

vi.mock('@molecule/api-payments-stripe', () => stripe)
vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody:
    () =>
    (_req: unknown, _res: unknown, next: () => void): void =>
      next(),
}))

type Handle = (req: unknown, res: unknown, next?: () => void) => Promise<void> | void

/** The POST /session middleware chain, in order, straight off the real router. */
const { sessionMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/commerce/stripe-checkout/api/handlers/checkout.js')) as {
      default: { stack: Array<{ route?: { stack: Array<{ handle: Handle }> } }> }
    }
  const layer = mod.default.stack.find((l) => l.route !== undefined)
  if (!layer?.route) throw new Error('checkout router exported no routes')
  return { sessionMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

const makeRes = (): {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status: (code: number) => unknown
  json: (payload: unknown) => unknown
} => {
  const res = {
    locals: {} as { session?: { userId: string } },
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

/** Run the full middleware chain and await the terminal handler. */
async function post(args: {
  userId?: string
  body: Record<string, unknown>
}): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  if (args.userId !== undefined) res.locals.session = { userId: args.userId }
  const req = { body: args.body }
  let index = 0
  const runNext = async (): Promise<void> => {
    const handle = sessionMiddlewares[index++]
    await handle(req, res, () => void runNext())
  }
  await runNext()
  return res
}

const order = (
  over: Partial<{ id: string; user_id: string; status: string }> = {},
): {
  id: string
  user_id: string
  status: string
} => ({ id: 'order-1', user_id: 'user-1', status: 'pending', ...over })

beforeEach(() => {
  vi.clearAllMocks()
  stripe.createCheckoutSession.mockResolvedValue({ url: 'https://checkout.test/x', id: 'cs_1' })
})

describe('stripe-checkout POST /session — orderId is ownership-checked at session creation', () => {
  it('rejects an unauthenticated caller before creating any session', async () => {
    const res = await post({
      body: { priceId: 'price_1', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' },
    })
    expect(res.statusCode).toBe(401)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses another user’s order id — it must never reach the webhook metadata', async () => {
    database.findById.mockResolvedValue(order({ user_id: 'user-2' }))
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_1',
        orderId: 'order-1',
        successUrl: 'https://a.test/ok',
        cancelUrl: 'https://a.test/no',
      },
    })
    expect(res.statusCode).toBe(403)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses an unknown order id', async () => {
    database.findById.mockResolvedValue(null)
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_1',
        orderId: 'missing',
        successUrl: 'https://a.test/ok',
        cancelUrl: 'https://a.test/no',
      },
    })
    expect(res.statusCode).toBe(404)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('refuses a second checkout for an already-paid order', async () => {
    database.findById.mockResolvedValue(order({ status: 'paid' }))
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_1',
        orderId: 'order-1',
        successUrl: 'https://a.test/ok',
        cancelUrl: 'https://a.test/no',
      },
    })
    expect(res.statusCode).toBe(409)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('creates the session with the caller’s OWN unpaid order in the metadata', async () => {
    database.findById.mockResolvedValue(order())
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_1',
        orderId: 'order-1',
        customerEmail: 'buyer@test.dev',
        successUrl: 'https://a.test/ok',
        cancelUrl: 'https://a.test/no',
      },
    })
    expect(res.statusCode).toBe(0)
    expect(database.findById).toHaveBeenCalledWith('orders', 'order-1')
    expect(stripe.createCheckoutSession).toHaveBeenCalledTimes(1)
    expect(stripe.createCheckoutSession.mock.calls[0][0]).toMatchObject({
      priceId: 'price_1',
      metadata: { orderId: 'order-1', customerEmail: 'buyer@test.dev' },
    })
  })

  it('still creates a bare price checkout with no metadata and no order lookup', async () => {
    const res = await post({
      userId: 'user-1',
      body: { priceId: 'price_1', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' },
    })
    expect(res.statusCode).toBe(0)
    expect(database.findById).not.toHaveBeenCalled()
    const arg = stripe.createCheckoutSession.mock.calls[0][0] as Record<string, unknown>
    expect(arg.metadata).toBeUndefined()
  })
})
