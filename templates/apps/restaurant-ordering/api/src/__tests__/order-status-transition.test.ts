import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A restaurant order status machine: pending → preparing → ready → served → paid, or
// → cancelled. Kitchen progression between the working states stays flexible for staff
// corrections, but the terminal states (paid, cancelled) must not be reopened via a status
// change — a paid order can't be un-paid and a cancelled order can't be resurrected.

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'x' }) }))

import router from '../handlers/orders.js'

function statusHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/status' && l.route.methods.put)
  if (!layer?.route) throw new Error('PUT /:id/status not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
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
  return res
}
const order = (status: string) => ({ id: 'o1', status, user_id: 'u1', table_id: null })
const run = (current: string, next: string, res: ReturnType<typeof makeRes>) => {
  db.findById.mockResolvedValue(order(current))
  return statusHandler()(
    { params: { id: 'o1' }, body: { status: next } } as unknown as Request,
    res as unknown as Response,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: { id: 'o1' } })
})

describe('restaurant order status transitions', () => {
  it('409s un-paying a paid order (no write)', async () => {
    const res = makeRes()
    await run('paid', 'pending', res)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('409s resurrecting a cancelled order', async () => {
    const res = makeRes()
    await run('cancelled', 'ready', res)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('allows a working-state transition (preparing → ready)', async () => {
    const res = makeRes()
    await run('preparing', 'ready', res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith('orders', 'o1', { status: 'ready' })
  })

  it('allows setting the same terminal status (idempotent no-op)', async () => {
    const res = makeRes()
    await run('paid', 'paid', res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalled()
  })
})
