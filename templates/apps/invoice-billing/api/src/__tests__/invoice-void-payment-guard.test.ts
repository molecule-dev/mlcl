import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Void/payment lifecycle invariant: a voided invoice is terminal and holds no payments.
// (1) The payment handler must refuse to record a payment against a void invoice — doing so
// would resurrect it (status flips back to paid/partial) AND book money against a cancelled
// invoice. (2) The void handler must refuse to void an invoice that already has recorded
// payments — that would orphan the payment ledger rows.

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
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
vi.mock('../handlers/_decorate.js', () => ({
  decoratePayment: (x: unknown) => x,
  decorateInvoice: (x: unknown) => x,
}))
vi.mock('../handlers/_seed.js', () => ({ ensureDemoSeeded: vi.fn().mockResolvedValue(undefined) }))

import invoicesRouter from '../handlers/invoices.js'
import paymentsRouter from '../handlers/payments.js'

function lastHandler(
  router: { stack: unknown[] },
  path: string,
): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods.post)
  if (!layer?.route) throw new Error(`POST ${path} not found`)
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

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'pay-1' } })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('payment cannot be recorded against a voided invoice', () => {
  const pay = lastHandler(paymentsRouter as never, '/')
  const call = (invoice: Record<string, unknown>) => {
    db.findById.mockResolvedValue(invoice)
    const res = makeRes()
    return pay(
      { body: { invoice_id: 'inv-1', amount: 50, method: 'manual' } } as unknown as Request,
      res as unknown as Response,
    ).then(() => res)
  }

  it('409s a payment on a void invoice and records nothing', async () => {
    const res = await call({
      id: 'inv-1',
      user_id: 'user-1',
      status: 'void',
      total: 100,
      amount_paid: 0,
    })
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('records a payment against a sent invoice (201)', async () => {
    const res = await call({
      id: 'inv-1',
      user_id: 'user-1',
      status: 'sent',
      total: 100,
      amount_paid: 0,
    })
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'invoice_payments',
      expect.objectContaining({ amount: 50 }),
    )
  })
})

describe('invoice with payments cannot be voided', () => {
  const voidInvoice = lastHandler(invoicesRouter as never, '/:id/void')
  const call = (invoice: Record<string, unknown>) => {
    db.findById.mockResolvedValue(invoice)
    const res = makeRes()
    return voidInvoice(
      { params: { id: 'inv-1' } } as unknown as Request,
      res as unknown as Response,
    ).then(() => res)
  }

  it('409s voiding an invoice that has recorded payments', async () => {
    const res = await call({ id: 'inv-1', user_id: 'user-1', status: 'partial', amount_paid: 40 })
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('voids a draft invoice with no payments (200)', async () => {
    const res = await call({ id: 'inv-1', user_id: 'user-1', status: 'draft', amount_paid: 0 })
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith('invoices', 'inv-1', { status: 'void' })
  })
})
