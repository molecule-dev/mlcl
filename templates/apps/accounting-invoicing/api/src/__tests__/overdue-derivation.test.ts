import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Nothing ever writes status='overdue' (the app has no scheduler), so an invoice's overdue state
// must be derived from its due_date at read time. Previously due_date was stored but never compared,
// so the dashboard overdue_cents KPI was always 0 and the status badge never showed 'overdue'.

vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
const db = { findMany: vi.fn(), findOne: vi.fn(async (..._a: unknown[]) => null) }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
}))

import reportsRouter from '../handlers/reports.js'
import { isInvoiceOverdue, serializeInvoice } from '../lib/serialize.js'

const PAST = '2000-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'
type RawArg = Parameters<typeof serializeInvoice>[0]
const raw = (status: string, due: string | null, paid: string | null): RawArg =>
  ({ id: 'i1', user_id: 'u1', status, due_date: due, paid_at: paid }) as unknown as RawArg

describe('isInvoiceOverdue derivation', () => {
  it('a sent, unpaid, past-due invoice is overdue', () => {
    expect(isInvoiceOverdue({ status: 'sent', due_date: PAST, paid_at: null })).toBe(true)
  })
  it('a sent invoice not yet due is not overdue', () => {
    expect(isInvoiceOverdue({ status: 'sent', due_date: FUTURE, paid_at: null })).toBe(false)
  })
  it('a paid invoice is never overdue', () => {
    expect(isInvoiceOverdue({ status: 'sent', due_date: PAST, paid_at: PAST })).toBe(false)
  })
  it('a draft invoice is not overdue even if past its date', () => {
    expect(isInvoiceOverdue({ status: 'draft', due_date: PAST, paid_at: null })).toBe(false)
  })
})

describe('serializeInvoice reflects the derived overdue status', () => {
  it('marks a sent past-due invoice as overdue', () => {
    expect(serializeInvoice(raw('sent', PAST, null)).status).toBe('overdue')
  })
  it('leaves a sent not-yet-due invoice as sent', () => {
    expect(serializeInvoice(raw('sent', FUTURE, null)).status).toBe('sent')
  })
})

describe('dashboard overdue_cents derives from due_date', () => {
  function dashboardHandler(): (req: Request, res: Response) => Promise<void> {
    const layer = (
      reportsRouter.stack as Array<{
        route?: {
          path: string
          methods: Record<string, boolean>
          stack: Array<{ handle: unknown }>
        }
      }>
    ).find((l) => l.route?.path === '/dashboard_stats' && l.route.methods.get)
    if (!layer?.route) throw new Error('GET /dashboard_stats not found')
    const s = layer.route.stack
    return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
  }
  const makeRes = () => {
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
    return res as unknown as Response & { body: unknown }
  }

  beforeEach(() => vi.clearAllMocks())

  it('counts a sent, past-due invoice in overdue_cents (was always 0)', async () => {
    db.findMany.mockImplementation(async (table: string) =>
      table === 'invoices'
        ? [
            {
              id: 'i1',
              status: 'sent',
              due_date: PAST,
              paid_at: null,
              total_cents: 5000,
              amount_cents: 5000,
            },
          ]
        : [],
    )
    const res = makeRes()
    await dashboardHandler()({} as Request, res)
    expect((res.body as { overdue_cents: number }).overdue_cents).toBe(5000)
  })

  it('does not count a not-yet-due sent invoice as overdue', async () => {
    db.findMany.mockImplementation(async (table: string) =>
      table === 'invoices'
        ? [
            {
              id: 'i1',
              status: 'sent',
              due_date: FUTURE,
              paid_at: null,
              total_cents: 5000,
              amount_cents: 5000,
            },
          ]
        : [],
    )
    const res = makeRes()
    await dashboardHandler()({} as Request, res)
    expect((res.body as { overdue_cents: number }).overdue_cents).toBe(0)
  })
})
