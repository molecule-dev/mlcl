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
const database = vi.hoisted(() => ({ findById: vi.fn(), updateMany: vi.fn() }))

vi.mock('@molecule/api-payments-stripe', () => stripe)
vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))
// `@molecule/api-middleware-validation` is deliberately NOT mocked: the header
// above says the schema is the shipped code, and a validateBody that just
// called next() let the real zod schema drift (a stripped `orderId`, a loosened
// url/email check) invisibly — the handler's ownership check only ever saw the
// body the mock forwarded. The REAL middleware parses req.body with the
// handler's own schema and answers 400 on violation; the schema tests below
// pin that.

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

/**
 * Run the full middleware chain and await the terminal handler.
 *
 * Express middleware call `next()` WITHOUT awaiting the rest of the chain, so a
 * bare `await runNext()` resolved when the FIRST middleware returned — the
 * terminal handler was still running, and a test asserting on `res.statusCode`
 * read it mid-flight (exactly what the failure-path test below, whose handler
 * answer carries two extra awaits, raced into). The pending counter makes the
 * await cover the WHOLE chain: every `next()` increments it, every settled
 * handler decrements it, and the response is returned only when nothing is
 * running — the same settle condition whether the chain ended in `next()` or in
 * a middleware that answered and stopped.
 */
async function post(args: {
  userId?: string
  body: Record<string, unknown>
}): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  if (args.userId !== undefined) res.locals.session = { userId: args.userId }
  const req = { body: args.body }
  let index = 0
  let pending = 1
  let resolveDone: () => void = () => {}
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })
  const runNext = async (): Promise<void> => {
    const handle = sessionMiddlewares[index++]
    try {
      await handle(req, res, () => {
        pending++
        void runNext()
      })
    } finally {
      pending--
      if (pending === 0) resolveDone()
    }
  }
  void runNext()
  await done
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
  // The MutationResult shape for the claim: `affected: 1` = this caller won it.
  database.updateMany.mockResolvedValue({ data: null, affected: 1 })
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
    // The friendly pre-check fires before the claim: a paid order is refused
    // with "already paid", not with the claim's "in progress" sentence.
    expect(database.updateMany).not.toHaveBeenCalled()
  })

  it('claims the order with an atomic compare-and-set before minting the session', async () => {
    // Two concurrent POSTs for the same unpaid order used to both pass the
    // `paid` read and both mint live Stripe sessions — a customer completing
    // both was charged twice for one order. The session is now minted only by
    // the caller that wins ONE database-judged claim: the WHERE carries the
    // claim column still NULL and not paid, so the winner is decided by the
    // store, never by two reads that raced.
    database.findById.mockResolvedValue(order())
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_1',
        orderId: 'order-1',
        successUrl: 'https://a.test/ok',
        cancelUrl: 'https://a.test/no',
      },
    })
    expect(res.statusCode).toBe(0)
    expect(database.updateMany).toHaveBeenCalledTimes(1)
    expect(database.updateMany).toHaveBeenCalledWith(
      'orders',
      [
        { field: 'id', operator: '=', value: 'order-1' },
        { field: 'checkout_attempt', operator: 'is_null' },
        { field: 'status', operator: '!=', value: 'paid' },
      ],
      { checkout_attempt: expect.any(String) },
    )
    // The winner's nonce rides the session metadata — webhooks.ts needs it to
    // release the claim when the session expires.
    const arg = stripe.createCheckoutSession.mock.calls[0][0] as {
      metadata: Record<string, string>
    }
    expect(arg.metadata.orderId).toBe('order-1')
    expect(typeof arg.metadata.checkoutAttempt).toBe('string')
  })

  it('refuses to mint a second session when a concurrent request holds the claim', async () => {
    // `affected: 0` = another caller claimed (or paid) the order between the
    // read and the claim. Minting the session anyway is the double-charge the
    // claim exists to prevent.
    database.findById.mockResolvedValue(order())
    database.updateMany.mockResolvedValue({ data: null, affected: 0 })
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

  it('releases the claim when the session mint fails — no session means no expired event ever comes', async () => {
    // A mint that throws (a bad price id, a Stripe outage) leaves no Stripe
    // session, so `checkout.session.expired` — the release path webhooks.ts
    // owns — can never fire. Without a release here the order's
    // `checkout_attempt` stayed set for ever and every later POST /session was
    // refused 409 "checkout in progress": one failed call wedged the order's
    // checkout permanently.
    database.findById.mockResolvedValue(order())
    stripe.createCheckoutSession.mockRejectedValue(new Error('Stripe: Invalid price id'))
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_bad',
        orderId: 'order-1',
        successUrl: 'https://a.test/ok',
        cancelUrl: 'https://a.test/no',
      },
    })
    expect(res.statusCode).toBe(500)
    // The claim (call 1) plus the release (call 2).
    expect(database.updateMany).toHaveBeenCalledTimes(2)
    const claimedNonce = (database.updateMany.mock.calls[0][2] as { checkout_attempt: string })
      .checkout_attempt
    expect(database.updateMany).toHaveBeenLastCalledWith(
      'orders',
      [
        { field: 'id', operator: '=', value: 'order-1' },
        // Conditional on THIS request's nonce — a claim already replaced by
        // someone else is left alone (the same shape webhooks.ts releases with).
        { field: 'checkout_attempt', operator: '=', value: claimedNonce },
      ],
      { checkout_attempt: null },
    )
  })

  it('a refused claim (409) holds nothing and performs no release', async () => {
    database.findById.mockResolvedValue(order())
    database.updateMany.mockResolvedValue({ data: null, affected: 0 })
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
    expect(database.updateMany).toHaveBeenCalledTimes(1)
  })

  it('a failed bare-price mint (no orderId) performs no release — no claim was taken', async () => {
    stripe.createCheckoutSession.mockRejectedValue(new Error('Stripe: down'))
    const res = await post({
      userId: 'user-1',
      body: { priceId: 'price_1', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' },
    })
    expect(res.statusCode).toBe(500)
    expect(database.updateMany).not.toHaveBeenCalled()
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
      // The two REQUIRED redirect URLs. A `vi.fn()` resolves whatever it is
      // handed, so they were the one part of this call no assertion covered:
      // dropping (or typo'ing) either one kept every test green while every real
      // Stripe call failed — the provider's `createCheckoutSession` needs them
      // to build the redirect, so the reader would never reach a pay page.
      successUrl: 'https://a.test/ok',
      cancelUrl: 'https://a.test/no',
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

  it('the SHIPPED schema rejects a body missing its required fields — before any session or lookup', async () => {
    // The schema is the first middleware: a body without priceId/successUrl/
    // cancelUrl never reaches the handler, so it can create no session and
    // touch no order — the 400 (not 401) also proves the real zod validation
    // ran, not a pass-through stand-in.
    const res = await post({ userId: 'user-1', body: {} })
    expect(res.statusCode).toBe(400)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
    expect(database.findById).not.toHaveBeenCalled()
  })

  it('the SHIPPED schema rejects a non-URL successUrl and a malformed email', async () => {
    const res = await post({
      userId: 'user-1',
      body: {
        priceId: 'price_1',
        successUrl: 'not a url',
        cancelUrl: 'https://a.test/no',
        customerEmail: 'not-an-email',
      },
    })
    expect(res.statusCode).toBe(400)
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled()
    const payload = res.body as { errors?: Array<{ field?: string }> }
    const fields = (payload.errors ?? []).map((e) => e.field)
    expect(fields).toContain('successUrl')
    expect(fields).toContain('customerEmail')
  })

  it('the SHIPPED schema still accepts a valid bare checkout', async () => {
    // The other half of the pin: the 400s above prove the schema RUNS — this
    // proves it did not over-tighten into rejecting the documented happy path.
    const res = await post({
      userId: 'user-1',
      body: { priceId: 'price_1', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' },
    })
    expect(res.statusCode).toBe(0)
    expect(stripe.createCheckoutSession).toHaveBeenCalledTimes(1)
  })
})
