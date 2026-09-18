import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The budget rollup summed income/spending over ALL transactions, ignoring the account's on_budget
// flag — so off-budget (tracking) accounts like investments/loans wrongly polluted the budget
// totals. month_summary income/spent now count only transactions in on-budget accounts, while net
// worth still spans every account.

const db = { findMany: vi.fn(), findById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
// Treat test amounts/balances as already-in-cents integers for simple assertions.
vi.mock('../lib/decorate.js', () => ({ toCents: (v: unknown) => Number(v ?? 0) }))

import router from '../handlers/reports.js'

function monthSummaryHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/month_summary' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /month_summary not found')
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

beforeEach(() => vi.clearAllMocks())

describe('month_summary excludes off-budget accounts from the budget totals', () => {
  it('counts income/spent only from on-budget accounts, but net worth from all', async () => {
    const accounts = [
      { id: 'acc-on', on_budget: true, balance: 1000 },
      { id: 'acc-off', on_budget: false, balance: 5000 },
    ]
    const txs = [
      { account_id: 'acc-on', amount: 100, category_id: 'c1' }, // on-budget income
      { account_id: 'acc-on', amount: -30, category_id: 'c1' }, // on-budget spend
      { account_id: 'acc-off', amount: 200, category_id: 'c1' }, // off-budget → excluded from budget
      { account_id: 'acc-off', amount: -500, category_id: 'c1' }, // off-budget → excluded from budget
    ]
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'budget_accounts') return accounts
      if (table === 'budget_transactions') return txs
      return [] // envelopes
    })

    const res = makeRes()
    await monthSummaryHandler()({ query: {} } as unknown as Request, res as unknown as Response)
    const body = res.body as Record<string, number>

    expect(body.income_cents).toBe(100) // off-budget +200 excluded
    expect(body.spent_cents).toBe(30) // off-budget 500 excluded
    expect(body.net_worth_cents).toBe(6000) // all accounts (1000 + 5000)
    // net_worth_change_30d spans all transactions (a net-worth metric, not a budget metric)
    expect(body.net_worth_change_30d_cents).toBe(-230) // 100 - 30 + 200 - 500
  })
})
