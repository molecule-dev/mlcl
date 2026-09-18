/**
 * The company's saved "Default tax rate" (Settings → company_profile.
 * default_tax_rate_pct) must seed a new invoice's tax when the request omits a
 * rate. The create path previously hardcoded `tax_rate_pct ?? 0`, so the saved
 * default influenced nothing. These cover the pure resolver + the wired handler.
 */
import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { resolveInvoiceTotals } from '../lib/invoice-totals.js'

describe('resolveInvoiceTotals', () => {
  it('defaults tax from the company rate when the body omits it', () => {
    expect(resolveInvoiceTotals({ subtotal_cents: 10000 }, 20)).toEqual({
      subtotal_cents: 10000,
      tax_rate_pct: 20,
      tax_cents: 2000,
      total_cents: 12000,
      amount_cents: 12000,
    })
  })

  it('honors an explicit client breakdown (client always wins)', () => {
    const body = {
      subtotal_cents: 10000,
      tax_rate_pct: 5,
      tax_cents: 500,
      total_cents: 10500,
      amount_cents: 10500,
    }
    expect(resolveInvoiceTotals(body, 20)).toEqual(body)
  })

  it('keeps an explicit 0% (nullish default only, never overrides a real 0)', () => {
    expect(resolveInvoiceTotals({ subtotal_cents: 10000, tax_rate_pct: 0 }, 20).tax_rate_pct).toBe(
      0,
    )
  })

  it('treats a non-positive/invalid company default as no default → 0', () => {
    expect(resolveInvoiceTotals({ subtotal_cents: 10000 }, 0).tax_rate_pct).toBe(0)
    expect(resolveInvoiceTotals({ subtotal_cents: 10000 }, Number.NaN).tax_cents).toBe(0)
  })
})

// ---- handler: POST /invoices seeds tax from company_profile -----------------

const create = vi.fn(async (_t: string, payload: Record<string, unknown>) => ({
  data: { id: 'inv1', ...payload },
}))
const findOne = vi.fn(async (_t: string, _w: unknown) => ({ default_tax_rate_pct: 20 }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(a[0] as string, a[1] as Record<string, unknown>),
  findOne: (...a: unknown[]) => findOne(a[0] as string, a[1]),
  findMany: (...a: unknown[]) => findMany(...a),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: NextFunction) => n(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('../lib/serialize.js', () => ({ serializeInvoice: (row: unknown) => row }))

const { default: router } = await import('../handlers/invoices.js')

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
}
function postHandler(): (req: Request, res: Response) => Promise<unknown> {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack
  for (const l of stack) {
    if (l.route?.path === '/' && l.route.methods.post) {
      return l.route.stack[l.route.stack.length - 1].handle as (
        req: Request,
        res: Response,
      ) => Promise<unknown>
    }
  }
  throw new Error('POST / not found')
}
function mockRes() {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response & { statusCode: number; body: unknown }
}

describe('POST /invoices seeds tax from the company default', () => {
  it('applies default_tax_rate_pct when the body omits tax_rate_pct', async () => {
    create.mockClear()
    const res = mockRes()
    await postHandler()(
      {
        body: {
          customer_name: 'Acme',
          issue_date: '2026-01-01',
          subtotal_cents: 10000,
          line_items: [],
        },
        params: {},
      } as unknown as Request,
      res,
    )
    expect(res.statusCode).toBe(201)
    const [, payload] = create.mock.calls[0]
    expect(payload.tax_rate_pct).toBe(20)
    expect(payload.tax_cents).toBe(2000)
    expect(payload.total_cents).toBe(12000)
    expect(payload.amount_cents).toBe(12000)
  })
})
