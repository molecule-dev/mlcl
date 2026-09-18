/**
 * The dashboard's YTD revenue/expenses/profit must window from the company's
 * saved "Fiscal year starts" month (company_profile.fiscal_year_start), not a
 * hardcoded January 1. reports.ts:83 previously anchored to Jan 1, so a
 * non-January fiscal year produced wrong YTD figures.
 */
import type { Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fiscalYearStart } from '../lib/fiscal-year.js'

describe('fiscalYearStart', () => {
  it('defaults to January 1 of the current year for January/unknown/blank', () => {
    const now = new Date('2026-05-15T00:00:00Z')
    expect(fiscalYearStart(now, 'January').toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(fiscalYearStart(now, undefined).toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(fiscalYearStart(now, 'nonsense').toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('anchors to the fiscal start month in the current year when now is on/after it', () => {
    const sep = new Date('2026-09-10T00:00:00Z') // month 8 >= July (6)
    expect(fiscalYearStart(sep, 'July').toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })

  it('rolls back to the previous calendar year when now is before the fiscal start month', () => {
    const mar = new Date('2026-03-10T00:00:00Z') // month 2 < July (6)
    expect(fiscalYearStart(mar, 'July').toISOString()).toBe('2025-07-01T00:00:00.000Z')
  })

  it('is case-insensitive and trims whitespace', () => {
    const now = new Date('2026-08-01T00:00:00Z')
    expect(fiscalYearStart(now, '  july ').toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })
})

// ---- handler: dashboard_stats windows YTD from the fiscal-year start --------

const INVOICES = [
  { id: 'a', status: 'paid', paid_at: '2025-08-01T00:00:00Z', total_cents: 10000, due_date: null },
  { id: 'b', status: 'paid', paid_at: '2025-06-01T00:00:00Z', total_cents: 10000, due_date: null },
]
const findMany = vi.fn(async (table: string, _opts?: unknown) => {
  if (table === 'invoices') return INVOICES
  return []
})
const findOne = vi.fn(async (_table: string, _where: unknown) => ({ fiscal_year_start: 'July' }))

vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => findMany(a[0] as string, a[1]),
  findOne: (...a: unknown[]) => findOne(a[0] as string, a[1]),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

const { default: router } = await import('../handlers/reports.js')

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
}
function getHandler(path: string): (req: Request, res: Response) => Promise<unknown> {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack
  for (const l of stack) {
    if (l.route?.path === path && l.route.methods.get) {
      return l.route.stack[l.route.stack.length - 1].handle as (
        req: Request,
        res: Response,
      ) => Promise<unknown>
    }
  }
  throw new Error(`GET ${path} not found`)
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

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /dashboard_stats YTD respects the fiscal-year start', () => {
  it('counts only revenue on/after the July fiscal-year start (not Jan 1)', async () => {
    // March 2026 → a July fiscal year began July 1, 2025.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'))
    const res = mockRes()
    await getHandler('/dashboard_stats')({} as unknown as Request, res)
    const body = res.body as { ytd_revenue_cents: number }
    // Aug 2025 invoice is inside the FY (counts); June 2025 is before July 1 (excluded).
    // Under the old hardcoded Jan-1-2026 window, BOTH were excluded → 0.
    expect(body.ytd_revenue_cents).toBe(10000)
  })
})
