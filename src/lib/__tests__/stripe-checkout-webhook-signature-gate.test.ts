/**
 * The stripe-checkout example's webhook handler is the one endpoint that can
 * flip an order to `paid` — and it had NO test. The sibling checkout test
 * pins the session-creation ownership check; this pins the handler's own
 * gate, every branch of it, against the REAL exported router (only the Stripe
 * bond is mocked):
 *
 * - a request without `stripe-signature` is rejected before verification —
 *   and before any order write;
 * - a signed request whose raw body never made it to `req.rawBody` is
 *   rejected (the HMAC verifies the RAW bytes; verifying the parsed object
 *   would fail every legitimate delivery too — the handler must ask for the
 *   raw body, never silently verify the wrong bytes);
 * - a failed signature verification rejects as 400 and writes nothing (the
 *   forged "payment succeeded" the module doc opens with);
 * - a legitimate `checkout.session.completed` marks EXACTLY the metadata's
 *   order paid, by id — the wiring the session-creation ownership check
 *   authorizes;
 * - a completed session without `metadata.orderId` (a bare price checkout)
 *   writes nothing, and an unrelated event type writes nothing — both still
 *   200 `received` so Stripe does not retry them.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const stripe = vi.hoisted(() => ({ verifyWebhookSignature: vi.fn() }))
const database = vi.hoisted(() => ({ updateById: vi.fn() }))
// ONE stable logger object:  handed out a fresh one per call, so the
// 'stripe webhook ignored' trace the handler documents could not be inspected at
// all — the log IS the trace the module comment promises.
const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))

vi.mock('@molecule/api-payments-stripe', () => stripe)
vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-bond', () => ({ getLogger: () => logger }))

type Handle = (req: unknown, res: unknown, next?: () => void) => Promise<void>

/** The POST / middleware chain, straight off the real webhook router. */
const { webhookHandler } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/commerce/stripe-checkout/api/handlers/webhooks.js')) as {
      default: { stack: Array<{ route?: { stack: Array<{ handle: Handle }> } }> }
    }
  const layer = mod.default.stack.find((l) => l.route !== undefined)
  if (!layer?.route) throw new Error('webhooks router exported no routes')
  const handlers = layer.route.stack.map((l) => l.handle)
  if (handlers.length !== 1) throw new Error('expected the webhook route to carry one handler')
  return { webhookHandler: handlers[0] }
})()

interface Res {
  statusCode: number
  body: unknown
  sent: string | undefined
  status: (code: number) => Res
  json: (payload: unknown) => unknown
  send: (payload: string) => unknown
}

const makeRes = (): Res => {
  const res: Res = {
    statusCode: 0,
    body: undefined,
    sent: undefined,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
    send(payload: string) {
      res.sent = payload
      return res
    },
  }
  return res
}

const post = async (req: {
  headers?: Record<string, unknown>
  rawBody?: string
  body?: unknown
}): Promise<Res> => {
  const res = makeRes()
  await webhookHandler({ headers: {}, ...req }, res)
  return res
}

const rawBody = JSON.stringify({
  id: 'evt_1',
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_1', metadata: { orderId: 'order-1' } } },
})

beforeEach(() => {
  vi.clearAllMocks()
  stripe.verifyWebhookSignature.mockReturnValue(
    JSON.parse(rawBody) as { type: string; data: { object: unknown } },
  )
})

describe('stripe-checkout webhook — the paid-flip is signature-gated end to end', () => {
  it('rejects a request with no stripe-signature header before verifying or writing', async () => {
    const res = await post({ rawBody })
    expect(res.statusCode).toBe(400)
    expect(res.sent).toBe('Missing signature')
    expect(stripe.verifyWebhookSignature).not.toHaveBeenCalled()
    expect(database.updateById).not.toHaveBeenCalled()
  })

  it('rejects a signed request with no raw body — verification must see the RAW bytes', async () => {
    const res = await post({ headers: { 'stripe-signature': 'sig_1' }, body: JSON.parse(rawBody) })
    expect(res.statusCode).toBe(400)
    expect(res.sent).toBe('Missing raw body for webhook verification')
    expect(stripe.verifyWebhookSignature).not.toHaveBeenCalled()
    expect(database.updateById).not.toHaveBeenCalled()
  })

  it('rejects a failed verification as 400 and writes nothing', async () => {
    stripe.verifyWebhookSignature.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature')
    })
    const res = await post({ headers: { 'stripe-signature': 'forged' }, rawBody })
    expect(res.statusCode).toBe(400)
    expect(res.sent).toBe('Invalid signature')
    expect(database.updateById).not.toHaveBeenCalled()
  })

  it('verifies the RAW body bytes, not the parsed req.body object', async () => {
    await post({ headers: { 'stripe-signature': 'sig_1' }, rawBody, body: JSON.parse(rawBody) })
    expect(stripe.verifyWebhookSignature).toHaveBeenCalledTimes(1)
    const [verified, signature] = stripe.verifyWebhookSignature.mock.calls[0] as [Buffer, string]
    expect(Buffer.isBuffer(verified)).toBe(true)
    expect(verified.toString('utf8')).toBe(rawBody)
    expect(signature).toBe('sig_1')
  })

  it('marks the metadata order paid on checkout.session.completed', async () => {
    const res = await post({ headers: { 'stripe-signature': 'sig_1' }, rawBody })
    expect(res.statusCode).toBe(0)
    expect(res.body).toEqual({ received: true })
    expect(database.updateById).toHaveBeenCalledTimes(1)
    expect(database.updateById).toHaveBeenCalledWith('orders', 'order-1', { status: 'paid' })
  })

  it('writes nothing for a completed session without an orderId (bare price checkout)', async () => {
    stripe.verifyWebhookSignature.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_2' } },
    })
    const res = await post({
      headers: { 'stripe-signature': 'sig_1' },
      rawBody: JSON.stringify({
        id: 'evt_2',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_2' } },
      }),
    })
    expect(res.body).toEqual({ received: true })
    expect(database.updateById).not.toHaveBeenCalled()
  })

  it('writes nothing for other event types — and still acknowledges them', async () => {
    stripe.verifyWebhookSignature.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { id: 'in_1' } },
    })
    const res = await post({
      headers: { 'stripe-signature': 'sig_1' },
      rawBody: JSON.stringify({
        id: 'evt_3',
        type: 'invoice.paid',
        data: { object: { id: 'in_1' } },
      }),
    })
    expect(res.body).toEqual({ received: true })
    expect(database.updateById).not.toHaveBeenCalled()
    // The ignored event is LOGGED: the module's own comment calls that line "the
    // only trace a misconfigured webhook endpoint leaves", and nothing asserted
    // it — the logger double handed out a fresh object per call, so the trace
    // was unobservable by construction.
    expect(logger.info).toHaveBeenCalledWith('stripe webhook ignored', { type: 'invoice.paid' })
  })

  it('a subscription event takes its own branch — acknowledged, no order write, NOT logged as ignored', async () => {
    // `customer.subscription.updated` / `.deleted` have their own (no-op) case:
    // falling through to the default would be behaviourally identical but would
    // log a deliberately handled event as unhandled, which is the signal an
    // operator reads to find a genuinely unknown type.
    for (const type of ['customer.subscription.updated', 'customer.subscription.deleted']) {
      logger.info.mockClear()
      stripe.verifyWebhookSignature.mockReturnValue({
        type,
        data: { object: { id: 'sub_1' } },
      })
      const res = await post({
        headers: { 'stripe-signature': 'sig_1' },
        rawBody: JSON.stringify({ id: 'evt_4', type, data: { object: { id: 'sub_1' } } }),
      })

      expect(res.body, `${type} must still be acknowledged`).toEqual({ received: true })
      expect(database.updateById, `${type} must not touch orders`).not.toHaveBeenCalled()
      expect(logger.info, `${type} is handled, not ignored`).not.toHaveBeenCalled()
    }
  })
})
