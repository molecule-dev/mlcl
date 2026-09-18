import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Paying an order must record the visit against the customer's loyalty stats
// (customers.total_visits / total_spent / last_visit_at). These columns were displayed (stat cards +
// VIP badge) but never updated, so every customer stayed at 0 visits / $0 spent while their orders
// showed on the same screen. The already-paid guard means each order counts exactly once.

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
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'operator-1' }))
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

function payHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/pay' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/pay not found')
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
const custUpdate = () => db.updateById.mock.calls.find((c) => c[0] === 'customers')
const run = (order: Record<string, unknown>, customer?: Record<string, unknown>) => {
  db.findById.mockImplementation((table: string) =>
    Promise.resolve(table === 'orders' ? order : table === 'customers' ? (customer ?? null) : null),
  )
  const res = makeRes()
  return payHandler()(
    { params: { id: 'o1' }, body: {} } as unknown as Request,
    res as unknown as Response,
  ).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
  db.findMany.mockResolvedValue([])
})

describe('customer loyalty stats on payment', () => {
  it('increments visits/spend and stamps last visit for the order customer', async () => {
    await run(
      {
        id: 'o1',
        status: 'served',
        total: 50,
        customer_id: 'cust-1',
        table_id: null,
        user_id: null,
      },
      { id: 'cust-1', total_visits: 2, total_spent: 100 },
    )
    const call = custUpdate()
    expect(call?.[1]).toBe('cust-1')
    expect(call?.[2]).toMatchObject({ total_visits: 3, total_spent: 150 })
    expect((call?.[2] as { last_visit_at?: string }).last_visit_at).toBeTruthy()
  })

  it('does not touch customers for an order with no customer_id', async () => {
    await run({
      id: 'o1',
      status: 'served',
      total: 50,
      customer_id: null,
      table_id: null,
      user_id: null,
    })
    expect(custUpdate()).toBeUndefined()
  })

  it('does not double-count an already-paid order', async () => {
    const res = await run(
      { id: 'o1', status: 'paid', total: 50, customer_id: 'cust-1', table_id: null },
      { id: 'cust-1', total_visits: 5, total_spent: 250 },
    )
    expect(res.statusCode).toBe(400)
    expect(custUpdate()).toBeUndefined()
  })
})
