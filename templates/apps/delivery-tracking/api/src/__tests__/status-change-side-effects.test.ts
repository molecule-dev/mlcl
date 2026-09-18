import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /:shipmentId/events (the status-transition handler) dropped two stored inputs:
//   1. shipments.delivered_at — dashboard/analytics gate delivered/on-time metrics on it, but the
//      transition never set it, so every real delivery recorded null.
//   2. notification_preferences.email_on_delivered / email_on_exception — stored + wired to Settings
//      toggles, but the delivered/exception email fired unconditionally.

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(async (..._a: unknown[]) => null as unknown),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals?: { session?: { userId?: string } } }) =>
    res.locals?.session?.userId ?? null,
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => ({ messageId: 'x' })) }))
vi.mock('@molecule/api-geolocation', () => ({ geocode: vi.fn(async () => []) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))

import { sendMail } from '@molecule/api-emails'

import router from '../handlers/tracking.js'

function eventHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:shipmentId/events' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:shipmentId/events not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  return {
    locals: { session: { userId: 'u1' } },
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
}
const shipmentUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'shipments')?.[2] as
    Record<string, unknown> | undefined
const run = (
  status: string,
  opts: { prefs?: Record<string, unknown> | null; existingDeliveredAt?: unknown } = {},
) => {
  db.findById.mockResolvedValue({
    user_id: 'u1',
    recipient_email: 'r@example.com',
    tracking_number: 'T1',
    delivered_at: opts.existingDeliveredAt ?? null,
  })
  db.findOne.mockResolvedValue(opts.prefs ?? null)
  db.create.mockResolvedValue({ data: { id: 'ev1' } })
  db.updateById.mockResolvedValue({ data: {} })
  const res = makeRes()
  const req = { params: { shipmentId: 's1' }, body: { status } } as unknown as Request
  return eventHandler()(req, res as unknown as Response).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('delivered_at is recorded on delivery', () => {
  it('stamps delivered_at when the status becomes delivered', async () => {
    await run('delivered')
    expect(shipmentUpdate()?.delivered_at).toBeInstanceOf(Date)
  })

  it('does not set delivered_at on a non-delivery transition (preserves existing)', async () => {
    await run('in_transit', { existingDeliveredAt: null })
    expect(shipmentUpdate()?.delivered_at).toBeNull()
  })
})

describe('status email honors notification preferences', () => {
  it('emails on delivered when no prefs row exists (default on)', async () => {
    await run('delivered')
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('suppresses the delivered email when email_on_delivered is false', async () => {
    await run('delivered', { prefs: { email_on_delivered: false } })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('suppresses the exception email when email_on_exception is false', async () => {
    await run('exception', { prefs: { email_on_exception: false } })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('still emails on exception when the pref is on', async () => {
    await run('exception', { prefs: { email_on_exception: true } })
    expect(sendMail).toHaveBeenCalledTimes(1)
  })
})
